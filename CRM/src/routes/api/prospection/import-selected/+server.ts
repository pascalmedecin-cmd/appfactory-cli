import { json, type RequestEvent } from '@sveltejs/kit';
import { isProspectionSourceEnabled } from '$lib/prospection-flags';
import { ImportSelectedSchema, CandidateImportSchema, type CandidateImport, type LeadPreviewSource } from '$lib/schemas';
import { fetchIntelligenceSignalLookup } from '$lib/server/intelligence/signal-lookup';
import { linkImportSignals } from '$lib/server/intelligence/link-import-signal';
import {
	type CandidateCore,
	fetchDedupSets,
	isImportable,
	statusFor,
	scoreCandidate,
	candidateToInsertRow,
} from '$lib/server/prospection/candidate';
import { assignCampagnesToLeads } from '$lib/server/campagnes';
import { isCampagnesEnabled } from '$lib/server/feature-gate';

/**
 * POST /api/prospection/import-selected — écriture sélective du flux aperçu → cocher → importer (P3).
 *
 * RÈGLE DURE : le payload client n'est JAMAIS fait confiance (spec P3 §1.2). Pour chaque candidat :
 *  - validation Zod stricte (champs bornés, enum, formats),
 *  - RE-score serveur (jamais le score client, qui n'est même pas accepté par le schéma),
 *  - RE-dédup serveur au moment réel de l'insert (TOCTOU : un autre admin a pu importer entre
 *    l'aperçu et le clic) + dédup intra-payload (un source_id ne peut être inséré qu'une fois).
 *
 * N'appelle AUCUNE API externe (le quota Google a déjà été débité à l'aperçu).
 */
export const POST = async ({ request, locals }: RequestEvent) => {
	const { session, user } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });

	const raw = await request.json().catch(() => null);
	const parsed = ImportSelectedSchema.safeParse(raw);
	if (!parsed.success) {
		const msg = parsed.error.issues.map((i) => i.message).join(', ');
		return json({ error: `Sélection invalide : ${msg}` }, { status: 400 });
	}
	const { source, candidates, from_intelligence, from_term, from_item_rank, campagneIds } = parsed.data;

	// Gate flag : une source désactivée (config.prospection.sources.*) ne peut rien écrire
	// (defense-in-depth, même si l'UI ne propose plus la source).
	if (!isProspectionSourceEnabled(source)) {
		return json({ error: 'Source désactivée.' }, { status: 403 });
	}

	// Validation stricte PAR LIGNE (jamais en bloc) : un candidat mal formé est ignoré et compté,
	// il ne fait pas échouer toute la sélection (anti all-or-nothing). La garde sécu tient : seules
	// les lignes qui passent `CandidateImportSchema` sont candidates à l'insert (score/statut/id
	// reconstruits serveur ensuite). Dédup intra-payload dans la foulée (même source_id 2× = 1).
	const seen = new Set<string>();
	const unique: CandidateImport[] = [];
	let rejected = 0;
	for (const raw of candidates) {
		const r = CandidateImportSchema.safeParse(raw);
		if (!r.success) {
			rejected++;
			continue;
		}
		const c = r.data;
		if (seen.has(c.source_id)) continue;
		seen.add(c.source_id);
		unique.push(c);
	}

	// RE-dédup serveur au moment de l'insert (TOCTOU) : leads déjà présents + écartés/transférés.
	const dedup = await fetchDedupSets(locals.supabase, source as LeadPreviewSource, unique.map((c) => c.source_id));

	// Signal Veille source (optionnel) pour le RE-score serveur + la liaison post-insert.
	const signalLookup = from_intelligence
		? await fetchIntelligenceSignalLookup(locals.supabase, from_intelligence, from_item_rank ?? null)
		: null;
	const intelligenceSignal = signalLookup?.forScoring ?? null;

	const now = new Date().toISOString();
	const inserts: Array<Record<string, unknown>> = [];
	let skipped = 0;

	for (const c of unique) {
		// Statut serveur (ignore tout status_hint client). exists/dismissed → jamais inséré.
		const status = statusFor(c.source_id, dedup);
		if (!isImportable(status)) {
			skipped++;
			continue;
		}
		// Reconstruction serveur de la ligne (id/dates/statut serveur) + RE-score serveur.
		const core: CandidateCore = {
			source: source as LeadPreviewSource,
			source_id: c.source_id,
			source_url: c.source_url ?? null,
			raison_sociale: c.raison_sociale,
			adresse: c.adresse ?? null,
			npa: c.npa ?? null,
			localite: c.localite ?? null,
			canton: c.canton ?? null,
			telephone: c.telephone ?? null,
			site_web: c.site_web ?? null,
			email: c.email ?? null,
			secteur_detecte: c.secteur_detecte ?? null,
			description: c.description ?? null,
			date_publication: c.date_publication ?? null,
		};
		const score = scoreCandidate(core, { intelligenceSignal });
		inserts.push(candidateToInsertRow(core, score, { now, fromIntelligence: from_intelligence ?? null, fromTerm: from_term ?? null }));
	}

	let imported = 0;
	if (inserts.length > 0) {
		const { error } = await locals.supabase.from('prospect_leads').insert(inserts as never);
		if (error) {
			console.error(`import-selected insert error: ${error.message}`);
			return json({ error: 'Erreur lors de l’enregistrement des leads. Réessayez.', imported: 0, skipped, rejected }, { status: 500 });
		}
		imported = inserts.length;

		// Vague 3.2 : étiquetage campagne du lot (best-effort, après l'insert des leads). Un échec
		// d'assignation n'annule pas l'import : les leads sont la sortie primaire. Les ids sont
		// re-validés par la FK serveur (un id inexistant -> 23503 traduit, jamais une 500 opaque).
		// Gate premium : hors ffCrmListesV2, on ignore silencieusement campagneIds (l'import lui-même
		// reste autorisé ; l'assignation suit le même gate que le reste de la surface Campagnes).
		if (campagneIds && campagneIds.length > 0 && isCampagnesEnabled(user)) {
			const { error: campErr } = await assignCampagnesToLeads(
				locals.supabase,
				inserts.map((i) => i.id as string),
				campagneIds,
			);
			if (campErr) console.warn(`[import-selected] assignation campagnes échouée: ${campErr.message}`);
		}
	}

	// Liaison signal Veille → leads (optionnel, best-effort).
	if (signalLookup && from_intelligence && from_item_rank && inserts.length > 0) {
		await linkImportSignals(locals.supabase, {
			leadIds: inserts.map((i) => i.id as string),
			reportId: from_intelligence,
			itemRank: from_item_rank,
			fromTerm: from_term ?? null,
			maturity: signalLookup.snapshot.maturity,
			complianceTag: signalLookup.snapshot.complianceTag,
			signalGeneratedAt: signalLookup.snapshot.generatedAt,
		});
	}

	const bits: string[] = [];
	bits.push(imported > 0 ? `${imported} entreprise${imported > 1 ? 's' : ''} importée${imported > 1 ? 's' : ''}` : 'Aucune entreprise importée');
	if (skipped > 0) bits.push(`${skipped} déjà présente${skipped > 1 ? 's' : ''} ignorée${skipped > 1 ? 's' : ''}`);
	if (rejected > 0) bits.push(`${rejected} entrée${rejected > 1 ? 's' : ''} ignorée${rejected > 1 ? 's' : ''} (données incomplètes)`);

	return json({ imported, skipped, rejected, message: bits.join(', ') + '.' });
};
