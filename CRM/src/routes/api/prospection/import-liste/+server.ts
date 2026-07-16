import { json, type RequestEvent } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { ImportListeSchema } from '$lib/schemas';
import { isProspectionSourceEnabled } from '$lib/prospection-flags';
import { isImportFieldKey, applyMapping, type ImportFieldKey } from '$lib/prospection/import-mapping';
import { npaToCanton, extractNpa4 } from '$lib/prospection/npa-canton';
import { detectSecteur } from '$lib/prospection/secteurs';
import { calculerScore } from '$lib/scoring';
import { fetchLeadDedupSets } from '$lib/server/prospection/import-dedup-server';
import { dedupCandidates, type LeadDedupInput, type DedupAxis } from '$lib/server/prospection/import-dedup';
import type { Canton } from '$lib/schemas';

/**
 * POST /api/prospection/import-liste — import d'une liste (source 'manuel', Run 3 Atelier 209).
 *
 * Deux modes (comme les endpoints source) : `preview:true` = parse mappé + dédup, renvoie stats +
 * échantillon SANS insert ; sinon = insère les nouveaux (re-dédup TOCTOU au moment réel + upsert
 * idempotent sur l'index unique (marque,'manuel',source_id)). Tout compte connecté peut importer.
 *
 * RÈGLE DURE : le client parse le fichier, mais le serveur ne lui fait AUCUNE confiance - il
 * re-mappe (mapping assaini), déduplique (multi-axes marque-scopé), dérive le canton du NPA,
 * détecte le secteur (source unique marque-aware) et re-score. Import TOUJOURS dans `locals.marque`
 * (étanchéité : jamais de fuite entre FilmPro et LED).
 */

/** Ligne d'import normalisée : clés de dédup + champs d'insert/affichage. */
interface ImportRow extends LeadDedupInput {
	line: number; // 1-based (1 = 1re ligne de données, après l'en-tête)
	npa: string | null; // NPA canonique (extractNpa4) : dédup ET stockage - jamais undefined
	adresse: string | null;
	canton: Canton | null;
	rawSecteur: string | null; // catégorie brute du fichier (affichage)
}

type PreviewState = 'new' | 'duplicate' | 'invalid';
interface PreviewRow {
	line: number;
	raison_sociale: string;
	secteur: string | null;
	localite: string | null;
	npa: string | null;
	state: PreviewState;
	axis?: DedupAxis;
}

const SAMPLE_CAP = 200;

function nn(v: string | undefined): string | null {
	const s = (v ?? '').trim();
	return s.length > 0 ? s : null;
}

export const POST = async ({ request, locals }: RequestEvent) => {
	const { session } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });

	// Gate flag (defense-in-depth) : la source 'manuel' doit être active.
	if (!isProspectionSourceEnabled('manuel')) {
		return json({ error: 'Import de liste désactivé.' }, { status: 403 });
	}

	const raw = await request.json().catch(() => null);
	const parsed = ImportListeSchema.safeParse(raw);
	if (!parsed.success) {
		const msg = parsed.error.issues.map((i) => i.message).join(', ');
		return json({ error: `Import invalide : ${msg}` }, { status: 400 });
	}
	const { preview, columns, mapping, rows: rawRows } = parsed.data;

	// Mapping assaini : toute valeur qui n'est pas une clé de champ CRM connue → colonne ignorée.
	const cleanMapping: (ImportFieldKey | null)[] = mapping.map((m) => (isImportFieldKey(m) ? m : null));

	// Le champ requis 'raison_sociale' doit être mappé à au moins une colonne, sinon rien n'entre.
	if (!cleanMapping.includes('raison_sociale')) {
		return json({ error: 'Associez une colonne à la « Raison sociale » avant de continuer.' }, { status: 400 });
	}

	// Reconstruction des lignes normalisées (mapping appliqué + canton déduit du NPA).
	// NPA canonique (`extractNpa4`) calculé UNE fois : même valeur pour la dédup (repli localité)
	// ET pour le stockage → la clé nom+localité ronde-trip via la base (anti aperçu-trompeur).
	const rows: ImportRow[] = rawRows.map((cells, idx) => {
		const f = applyMapping(cells, cleanMapping);
		const npa4 = extractNpa4(f.npa);
		return {
			line: idx + 1,
			raison_sociale: (f.raison_sociale ?? '').trim(),
			localite: nn(f.localite),
			npa: npa4, // canonique (4 chiffres ou null) : dédup ET stockage partagent cette valeur
			telephone: nn(f.telephone),
			email: nn(f.email),
			site_web: nn(f.site_web),
			adresse: nn(f.adresse),
			canton: npaToCanton(npa4),
			rawSecteur: nn(f.secteur_detecte),
		};
	});

	// Dédup multi-axes vs les leads EXISTANTS de la marque (chargés au moment réel = TOCTOU-safe)
	// + intra-payload. Fonctions pures stress-testées ; l'I/O est marque-scopée.
	const existing = await fetchLeadDedupSets(locals.supabase, locals.marque);
	const result = dedupCandidates(rows, existing);

	if (preview) {
		// État par-ligne (identité d'objet) pour un échantillon en ORDRE DE FICHIER.
		const stateByRow = new Map<ImportRow, { state: PreviewState; axis?: DedupAxis }>();
		for (const t of result.toImport) stateByRow.set(t.row, { state: 'new' });
		for (const d of result.duplicates) stateByRow.set(d.row, { state: 'duplicate', axis: d.axis });
		for (const i of result.invalid) stateByRow.set(i.row, { state: 'invalid' });

		const sample: PreviewRow[] = rows.slice(0, SAMPLE_CAP).map((r) => {
			const st = stateByRow.get(r) ?? { state: 'new' as PreviewState };
			return {
				line: r.line,
				raison_sociale: r.raison_sociale || `Ligne ${r.line}`,
				secteur: r.rawSecteur ?? detectSecteur(r.raison_sociale, locals.marque),
				localite: r.localite ?? r.npa,
				npa: r.npa,
				state: st.state,
				...(st.axis ? { axis: st.axis } : {}),
			};
		});

		return json({
			stats: result.stats,
			sample,
			sampleTruncated: rows.length > SAMPLE_CAP,
		});
	}

	// -- Mode import : insère les nouveaux (re-dédup déjà faite ci-dessus au moment réel). --
	const now = new Date().toISOString();
	const inserts = result.toImport.map(({ row, sourceId }) => {
		const secteur = detectSecteur([row.raison_sociale, row.rawSecteur ?? ''].join(' '), locals.marque);
		const score = calculerScore({
			canton: row.canton,
			description: null,
			raison_sociale: row.raison_sociale,
			secteur_detecte: secteur,
			source: 'manuel',
			date_publication: null,
			telephone: row.telephone,
			montant: null,
			intelligenceSignal: null,
		}).total;
		return {
			id: randomUUID(),
			marque: locals.marque,
			source: 'manuel',
			source_id: sourceId,
			source_url: null,
			raison_sociale: row.raison_sociale,
			nom_contact: null,
			adresse: row.adresse,
			npa: row.npa,
			localite: row.localite,
			canton: row.canton,
			telephone: row.telephone,
			site_web: row.site_web,
			email: row.email,
			secteur_detecte: secteur,
			description: null,
			google_types: null,
			montant: null,
			date_publication: null,
			score_pertinence: score,
			statut: 'vide',
			date_import: now,
			date_modification: now,
			source_intelligence_id: null,
			source_intelligence_term: null,
		};
	});

	let imported = 0;
	if (inserts.length > 0) {
		// upsert idempotent : l'index unique (marque,'manuel',source_id) absorbe une éventuelle course
		// (2 imports concurrents de la même liste) sans erreur ; `.select()` ne renvoie que les insérés.
		const { data, error } = await locals.supabase
			.from('prospect_leads')
			.upsert(inserts as never, { onConflict: 'marque,source,source_id', ignoreDuplicates: true })
			.select('id');
		if (error) {
			console.error(`import-liste insert error: ${error.message}`);
			return json({ error: 'Erreur lors de l’enregistrement des prospects. Réessayez.' }, { status: 500 });
		}
		imported = (data ?? []).length;
	}

	const dup = result.stats.duplicates;
	const inv = result.stats.invalid;
	const raced = result.toImport.length - imported; // insérés < prévus = course (déjà présents)
	const bits: string[] = [
		imported > 0
			? `${imported} prospect${imported > 1 ? 's' : ''} importé${imported > 1 ? 's' : ''}`
			: 'Aucun prospect importé',
	];
	if (dup + raced > 0) bits.push(`${dup + raced} doublon${dup + raced > 1 ? 's' : ''} ignoré${dup + raced > 1 ? 's' : ''}`);
	if (inv > 0) bits.push(`${inv} ligne${inv > 1 ? 's' : ''} à corriger (ignorée${inv > 1 ? 's' : ''})`);

	return json({
		imported,
		duplicates: dup + raced,
		invalid: inv,
		message: bits.join(', ') + '.',
	});
};
