import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const today = new Date().toISOString().split('T')[0];

	const [contactsRes, entreprisesRes, opportunitesRes, relancesRes, activitesRes, signauxRes] = await Promise.all([
		locals.supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('statut_archive', false),
		locals.supabase.from('entreprises').select('*', { count: 'exact', head: true }),
		locals.supabase.from('opportunites').select('*', { count: 'exact', head: true }),
		locals.supabase.from('opportunites')
			.select('id, titre, etape_pipeline, date_relance_prevue, entreprise_id')
			.lte('date_relance_prevue', today)
			.order('date_relance_prevue', { ascending: true })
			.limit(10),
		locals.supabase.from('activites')
			.select('id, type_activite, resume_contenu, date_heure, contact_id')
			.order('date_heure', { ascending: false })
			.limit(5),
		locals.supabase.from('signaux_affaires')
			.select('*', { count: 'exact', head: true })
			.eq('statut_traitement', 'nouveau'),
	]);

	return {
		stats: {
			contacts: contactsRes.count ?? 0,
			entreprises: entreprisesRes.count ?? 0,
			opportunites: opportunitesRes.count ?? 0,
			signaux: signauxRes.count ?? 0,
		},
		relances: relancesRes.data ?? [],
		activitesRecentes: activitesRes.data ?? [],
	};
};
