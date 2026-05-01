import type { PageServerLoad } from './$types';
import { config } from '$lib/config';

export const load: PageServerLoad = async ({ locals }) => {
	const today = new Date().toISOString().split('T')[0];
	const nowIso = new Date().toISOString();

	// Phase 1 widget triage matin : queue de leads à fort potentiel non touchés.
	// Critères : statut=nouveau ET score>=config.scoring.triage.scoreMin (5)
	// ET (triage_snoozed_until IS NULL OR <= now()).
	// Ordre : score DESC puis date_import DESC. Cap (config.scoring.triage.queueCap = 25).
	// La colonne triage_snoozed_until est apportée par migration 20260501_001_triage_snoozed_until.sql.
	const triageQuery = locals.supabase
		.from('prospect_leads')
		.select('id, raison_sociale, score_pertinence, source, canton, localite, adresse, telephone, description, date_publication, montant', { count: 'exact' })
		.eq('statut', 'nouveau')
		.gte('score_pertinence', config.scoring.triage.scoreMin)
		.or(`triage_snoozed_until.is.null,triage_snoozed_until.lte.${nowIso}`)
		.order('score_pertinence', { ascending: false })
		.order('date_import', { ascending: false })
		.limit(config.scoring.triage.queueCap);

	const [contactsRes, entreprisesRes, opportunitesRes, relancesRes, activitesRes, signauxRes, alertesRes, triageRes] = await Promise.all([
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
		locals.supabase.from('recherches_sauvegardees')
			.select('nom, nb_nouveaux, frequence_alerte')
			.eq('alerte_active', true)
			.gt('nb_nouveaux', 0),
		triageQuery,
	]);

	// Si la migration n'a pas été appliquée (colonne triage_snoozed_until absente),
	// Postgrest renvoie une erreur. On dégrade gracefully en queue vide pour ne pas
	// casser le dashboard, MAIS on log côté serveur pour signaler le faux empty state.
	if (triageRes.error) {
		console.error('[dashboard.triage] query failed (likely missing migration):', triageRes.error.message ?? triageRes.error);
	}
	const triageLeads = triageRes.error ? [] : (triageRes.data ?? []);
	const triageTotal = triageRes.error ? 0 : (triageRes.count ?? triageLeads.length);

	return {
		stats: {
			contacts: contactsRes.count ?? 0,
			entreprises: entreprisesRes.count ?? 0,
			opportunites: opportunitesRes.count ?? 0,
			signaux: signauxRes.count ?? 0,
		},
		relances: relancesRes.data ?? [],
		activitesRecentes: activitesRes.data ?? [],
		alertes: alertesRes.data ?? [],
		triage: {
			leads: triageLeads,
			total: triageTotal,
		},
	};
};
