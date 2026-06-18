import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { SignalUpdateSchema, SignalUpdateStatutSchema, SignalDeleteSchema, SignalBatchDeleteSchema, SignalCreateOpportuniteSchema, SIGNAL_FIELDS, extractForm, validate } from '$lib/schemas';
import { dbFail, newId, now } from '$lib/server/db-helpers';
import { isAdminEmail } from '$lib/feedback/admin';
import { POIDS_PAR_CATEGORIE, type KeywordRow } from '$lib/scoring/keywords';
import { calculerScore } from '$lib/scoring';
import { normalizeNFDTrim } from '$lib/utils/text-normalize';

// Schemas Zod pour les form actions admin du panneau de mots-clés.
const KeywordAddSchema = z.object({
	terme: z.string().trim().min(2, 'Mot-clé trop court (2 chars min)').max(50, 'Mot-clé trop long (50 chars max)'),
	categorie: z.enum(['coeur', 'bonus', 'eviter']),
});
const KeywordRemoveSchema = z.object({
	id: z.string().uuid('ID invalide'),
});

// Rescoring rétroactif : recalcule score_pertinence pour tous les signaux à statut
// `nouveau` ou `en_analyse` avec la liste de mots-clés courante. Ne touche pas les
// archivés (`converti`, `ecarte`) — cohérent spec critère 12. Bulk UPDATE en parallèle
// (131 entrées en BDD aujourd'hui, plafond opérationnel ~500 avant bascule async).
async function rescoreActiveSignaux(supabase: App.Locals['supabase'], keywords: KeywordRow[]): Promise<void> {
	const { data: rows, error } = await supabase
		.from('signaux_affaires')
		.select('id, canton, description_projet, maitre_ouvrage, source_officielle, date_publication, statut_traitement')
		.in('statut_traitement', ['nouveau', 'en_analyse']);
	if (error || !rows) return;

	const updates = rows.map(async (s) => {
		const score = calculerScore(
			{
				canton: s.canton,
				description: s.description_projet,
				raison_sociale: s.maitre_ouvrage,
				secteur_detecte: null,
				source: s.source_officielle ?? '',
				date_publication: s.date_publication,
				telephone: null,
				montant: null,
			},
			keywords,
		);
		await supabase
			.from('signaux_affaires')
			.update({
				score_pertinence: score.total,
				notes_libres: score.criteres.join(', ') || null,
			})
			.eq('id', s.id);
	});
	await Promise.all(updates);
}

export const load: PageServerLoad = async ({ locals, url }) => {
	// V5 (2026-06-07) : par défaut on EXCLUT les fiches archivées (les ~1227 Zefix soft-archivées
	// + tout futur archivage). Elles restent consultables via `?vue=archivees`. Évite d'envoyer
	// 1500+ lignes au client (le « mur » qui décourageait l'usage) — radar centré SIMAP.
	const showArchived = url.searchParams.get('vue') === 'archivees';
	const SELECT = '*, contacts:contact_maitre_ouvrage_id(id, nom, prenom)';
	const signauxQuery = showArchived
		? locals.supabase.from('signaux_affaires').select(SELECT).eq('statut_traitement', 'archive').order('date_detection', { ascending: false })
		: locals.supabase.from('signaux_affaires').select(SELECT).neq('statut_traitement', 'archive').order('date_detection', { ascending: false });

	const [signauxRes, keywordsRes, sessionRes, archivedCountRes] = await Promise.all([
		signauxQuery,
		locals.supabase
			.from('signaux_mots_cles' as never)
			.select('id, terme, terme_norm, categorie, poids')
			.order('cree_le', { ascending: false }),
		locals.safeGetSession(),
		locals.supabase
			.from('signaux_affaires')
			.select('*', { count: 'exact', head: true })
			.eq('statut_traitement', 'archive'),
	]);

	if (signauxRes.error) {
		console.error('Erreur chargement signaux:', signauxRes.error.message);
	}
	if (keywordsRes.error) {
		console.error('Erreur chargement mots-clés:', keywordsRes.error.message);
	}

	const keywords = (keywordsRes.data ?? []) as KeywordRow[];
	const canEditKeywords = isAdminEmail(sessionRes.user?.email ?? null);

	return {
		signaux: signauxRes.data ?? [],
		keywords,
		canEditKeywords,
		showArchived,
		archivedCount: archivedCountRes.count ?? 0,
	};
};

export const actions: Actions = {
	// Note : la form action `create` a été supprimée le 2026-05-13 (décision Pascal,
	// refonte signaux V2). La saisie manuelle d'un signal n'avait aucun intérêt usage,
	// les imports automatiques Zefix + SIMAP (cron 6h) remplissent la page.

	addKeyword: async ({ request, locals }) => {
		const session = await locals.safeGetSession();
		if (!isAdminEmail(session.user?.email ?? null)) {
			return fail(403, { error: 'Réservé aux admins FilmPro' });
		}
		const form = await request.formData();
		const parsed = KeywordAddSchema.safeParse({
			terme: form.get('terme'),
			categorie: form.get('categorie'),
		});
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Données invalides' });
		}
		const terme = parsed.data.terme;
		const termeNorm = normalizeNFDTrim(terme);
		if (termeNorm.length < 2) {
			return fail(400, { error: 'Mot-clé trop court après normalisation' });
		}
		const poids = POIDS_PAR_CATEGORIE[parsed.data.categorie];

		const { error: insertError } = await locals.supabase
			.from('signaux_mots_cles' as never)
			.insert({
				terme,
				terme_norm: termeNorm,
				categorie: parsed.data.categorie,
				poids,
				cree_par: session.user?.id ?? null,
				cree_par_email: session.user?.email ?? 'unknown',
			} as never);

		if (insertError) {
			// Code postgres 23505 = unique_violation (terme_norm déjà présent).
			if (insertError.code === '23505') {
				return fail(409, { error: `« ${terme} » est déjà dans la liste` });
			}
			return fail(500, { error: insertError.message });
		}

		// Rescoring rétroactif synchrone : on relit la liste à jour et on rejoue le
		// score sur les signaux actifs (`nouveau` + `en_analyse`).
		const { data: kwData } = await locals.supabase
			.from('signaux_mots_cles' as never)
			.select('id, terme, terme_norm, categorie, poids');
		await rescoreActiveSignaux(locals.supabase, (kwData ?? []) as KeywordRow[]);

		return { success: true };
	},

	removeKeyword: async ({ request, locals }) => {
		const session = await locals.safeGetSession();
		if (!isAdminEmail(session.user?.email ?? null)) {
			return fail(403, { error: 'Réservé aux admins FilmPro' });
		}
		const form = await request.formData();
		const parsed = KeywordRemoveSchema.safeParse({ id: form.get('id') });
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'ID invalide' });
		}

		const { error } = await locals.supabase
			.from('signaux_mots_cles' as never)
			.delete()
			.eq('id', parsed.data.id);

		if (error) return fail(500, { error: error.message });

		// Rescoring rétroactif après suppression.
		const { data: kwData } = await locals.supabase
			.from('signaux_mots_cles' as never)
			.select('id, terme, terme_norm, categorie, poids');
		await rescoreActiveSignaux(locals.supabase, (kwData ?? []) as KeywordRow[]);

		return { success: true };
	},

	update: async ({ request, locals }) => {
		const form = await request.formData();
		const raw = extractForm(form, ['id', ...SIGNAL_FIELDS, 'statut_traitement']);
		const parsed = validate(SignalUpdateSchema, raw);
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('signaux_affaires')
			.update({
				type_signal: parsed.data.type_signal || null,
				description_projet: parsed.data.description_projet || null,
				maitre_ouvrage: parsed.data.maitre_ouvrage || null,
				architecte_bureau: parsed.data.architecte_bureau || null,
				canton: parsed.data.canton || null,
				commune: parsed.data.commune || null,
				source_officielle: parsed.data.source_officielle || null,
				date_publication: parsed.data.date_publication || null,
				notes_libres: parsed.data.notes_libres || null,
				responsable_filmpro: parsed.data.responsable_filmpro || null,
				statut_traitement: parsed.data.statut_traitement || null,
			})
			.eq('id', parsed.data.id);

		return dbFail(error) ?? { success: true };
	},

	updateStatut: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = validate(SignalUpdateStatutSchema, extractForm(form, ['id', 'statut_traitement']));
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('signaux_affaires')
			.update({ statut_traitement: parsed.data.statut_traitement })
			.eq('id', parsed.data.id);

		return dbFail(error) ?? { success: true };
	},

	delete: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = validate(SignalDeleteSchema, extractForm(form, ['id']));
		if (!parsed.success) return fail(400, { error: parsed.error });

		const { error } = await locals.supabase
			.from('signaux_affaires')
			.delete()
			.eq('id', parsed.data.id);

		return dbFail(error) ?? { success: true };
	},

	// Audit 360 H-14 : ActionResult discriminated union (`success: true|false`).
	deleteBatch: async ({ request, locals }) => {
		const form = await request.formData();
		const raw = extractForm(form, ['ids']);
		const parsed = validate(SignalBatchDeleteSchema, raw);
		if (!parsed.success) return fail(400, { success: false as const, error: parsed.error });

		const ids = parsed.data.ids;

		const { error } = await locals.supabase
			.from('signaux_affaires')
			.delete()
			.in('id', ids);

		return dbFail(error) ?? { success: true as const, deleted: ids.length };
	},

	// Audit 360 H-14 : ActionResult discriminated union (`success: true|false`).
	createOpportunite: async ({ request, locals }) => {
		const form = await request.formData();
		const parsed = validate(SignalCreateOpportuniteSchema, extractForm(form, ['signal_id', 'titre', 'entreprise_id']));
		if (!parsed.success) return fail(400, { success: false as const, error: parsed.error });

		const ts = now();
		const oppId = newId();

		// Idempotence serveur : on RÉSERVE d'abord le signal via un UPDATE conditionnel
		// (le filtre `.is('opportunite_associee_id', null)` joue le rôle de verrou
		// logique). Si 0 ligne revient, le signal est déjà converti (double-clic, page
		// stale, requête forgée) → on s'arrête AVANT tout insert, donc aucune
		// opportunité orpheline n'est créée.
		const { data: reserved, error: lockError } = await locals.supabase
			.from('signaux_affaires')
			.update({
				statut_traitement: 'converti',
				opportunite_associee_id: oppId,
			})
			.eq('id', parsed.data.signal_id)
			.is('opportunite_associee_id', null)
			.select('id');

		const lockFail = dbFail(lockError);
		if (lockFail) return lockFail;

		if (!reserved || reserved.length === 0) {
			// Déjà converti : réponse idempotente (pas une erreur), on renvoie au pipeline.
			return { success: true as const, redirectTo: '/crm/pipeline', alreadyConverted: true as const };
		}

		const { error: oppError } = await locals.supabase.from('opportunites').insert({
			id: oppId,
			titre: parsed.data.titre,
			entreprise_id: parsed.data.entreprise_id || null,
			etape_pipeline: 'identification',
			signal_affaires_id: parsed.data.signal_id,
			lie_signal_affaires: true,
			date_creation: ts,
			date_derniere_modification: ts,
		});

		const oppFail = dbFail(oppError);
		if (oppFail) {
			// L'insert a échoué après la réservation : on libère le signal pour qu'un
			// nouvel essai soit possible (sinon il pointerait vers un oppId inexistant).
			await locals.supabase
				.from('signaux_affaires')
				.update({ statut_traitement: 'en_analyse', opportunite_associee_id: null })
				.eq('id', parsed.data.signal_id)
				.eq('opportunite_associee_id', oppId);
			return oppFail;
		}

		return { success: true as const, redirectTo: '/crm/pipeline' };
	},
};
