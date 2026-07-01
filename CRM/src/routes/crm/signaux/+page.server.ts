import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { SignalUpdateStatutSchema, SignalDeleteSchema, SignalBatchDeleteSchema, extractForm, validate } from '$lib/schemas';
import { dbFail } from '$lib/server/db-helpers';
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

// Rescoring rétroactif : recalcule score_pertinence pour les signaux de la file
// active (`nouveau` = à trier, `a_suivre` = retenus) avec la liste de mots-clés
// courante. Ne touche pas les `archive` (rangés). Bulk UPDATE en parallèle
// (~430 entrées actives en BDD, plafond opérationnel ~500 avant bascule async).
async function rescoreActiveSignaux(supabase: App.Locals['supabase'], keywords: KeywordRow[]): Promise<void> {
	const { data: rows, error } = await supabase
		.from('signaux_affaires')
		.select('id, canton, description_projet, maitre_ouvrage, source_officielle, date_publication, statut_traitement')
		.in('statut_traitement', ['nouveau', 'a_suivre']);
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
		// score sur les signaux de la file active (`nouveau` + `a_suivre`).
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

	// Bouton Statut du slide-out : trie un signal (nouveau -> a_suivre / archive,
	// ou restaure archive -> a_suivre). Simple update, borné par le CHECK DB à
	// ('nouveau','a_suivre','archive') et par SignalUpdateStatutSchema (Zod).
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
};
