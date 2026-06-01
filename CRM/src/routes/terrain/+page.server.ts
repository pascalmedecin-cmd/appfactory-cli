import type { PageServerLoad } from './$types';
import { ETAPES_PIPELINE_CLOSED } from '$lib/schemas';

/**
 * Onglet « À faire » (AC-003) : relances dues réelles = opportunités dont
 * `date_relance_prevue <= today` et l'étape n'est pas close. Cap 15.
 * Réutilise la requête relances du desktop (`crm/+page.server.ts`) en y
 * ajoutant la raison sociale de l'entreprise (embed) pour l'affichage terrain.
 * Aucune donnée inventée : empty state honnête si la requête ne renvoie rien.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const today = new Date().toISOString().split('T')[0];

	const { data, error } = await locals.supabase
		.from('opportunites')
		.select('id, titre, etape_pipeline, date_relance_prevue, entreprise_id, entreprises(raison_sociale)')
		.lte('date_relance_prevue', today)
		.or(`etape_pipeline.is.null,etape_pipeline.not.in.(${ETAPES_PIPELINE_CLOSED.join(',')})`)
		.order('date_relance_prevue', { ascending: true })
		.limit(15);

	if (error) {
		console.error('[terrain/a-faire]', error.message);
		return { relances: [], loadError: true };
	}

	const relances = (data ?? []).map((r) => {
		const ent = r.entreprises as { raison_sociale: string } | { raison_sociale: string }[] | null;
		const raison_sociale = Array.isArray(ent) ? (ent[0]?.raison_sociale ?? null) : (ent?.raison_sociale ?? null);
		return {
			id: r.id,
			titre: r.titre,
			date_relance_prevue: r.date_relance_prevue,
			entreprise_id: r.entreprise_id,
			raison_sociale,
		};
	});

	return { relances, loadError: false };
};
