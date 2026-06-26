import type { PageServerLoad } from './$types';
import { config } from '$lib/config';
import { ETAPES_PIPELINE_CLOSED } from '$lib/schemas';
import { firstNameFromEmail } from '$lib/utils/dateFormat';
import { readFeatureFlags } from '$lib/types/feature-flags';
import { endOfWeekIso, nextDayIso, type TacheDue } from '$lib/utils/dashboardTemporel';

export const load: PageServerLoad = async ({ locals }) => {
	const today = new Date().toISOString().split('T')[0];
	const nowIso = new Date().toISOString();

	const { user } = await locals.safeGetSession();
	const firstName = firstNameFromEmail(user?.email ?? null);

	// Dashboard temporel (Vague 3.3, flag ffCrmListesV2) : on ne charge les « tâches dues »
	// (relances jusqu'à la fin de semaine) que pour les utilisateurs premium → zéro coût
	// supplémentaire pour la vue OFF, qui ne lit pas ce champ (rendu byte-identique).
	const premium = readFeatureFlags(
		(user?.app_metadata ?? undefined) as Record<string, unknown> | undefined
	).ffCrmListesV2 === true;
	const weekEnd = endOfWeekIso(today);

	// Phase 1 widget triage matin : queue de leads à fort potentiel non touchés.
	// Critères : statut=nouveau ET score>=config.scoring.triage.scoreMin (5)
	// ET (triage_snoozed_until IS NULL OR <= now()).
	// Ordre : score DESC puis date_import DESC. Cap (config.scoring.triage.queueCap = 25).
	// La colonne triage_snoozed_until est apportée par migration 20260501_001_triage_snoozed_until.sql.
	const triageQuery = locals.supabase
		.from('prospect_leads')
		.select('id, raison_sociale, score_pertinence, statut, source, source_id, source_url, canton, localite, adresse, npa, telephone, email, nom_contact, site_web, secteur_detecte, description, date_publication, montant', { count: 'exact' })
		.eq('statut', 'nouveau')
		.gte('score_pertinence', config.scoring.triage.scoreMin)
		.or(`triage_snoozed_until.is.null,triage_snoozed_until.lte.${nowIso}`)
		.order('score_pertinence', { ascending: false })
		.order('date_import', { ascending: false })
		.limit(config.scoring.triage.queueCap);

	// Tâches dues pour le dashboard temporel : relances <= fin de semaine, deals clos exclus,
	// nom d'entreprise joint (FK unique → pas d'ambiguïté PostgREST), triées par échéance.
	const tachesQuery = premium
		? locals.supabase
				.from('opportunites')
				.select(
					'id, titre, etape_pipeline, date_relance_prevue, entreprise:entreprises!opportunites_entreprise_id_fkey(raison_sociale)'
				)
				.lt('date_relance_prevue', nextDayIso(weekEnd))
				.or(`etape_pipeline.is.null,etape_pipeline.not.in.(${ETAPES_PIPELINE_CLOSED.join(',')})`)
				.order('date_relance_prevue', { ascending: true })
				.limit(30)
		: null;

	const [contactsRes, entreprisesRes, opportunitesRes, relancesRes, activitesRes, signauxRes, alertesRes, triageRes, tachesRes] = await Promise.all([
		locals.supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('statut_archive', false),
		// Aligné sur l'invariant « les accès métier excluent les archivés » (comme
		// le compteur contacts ci-dessus) : le cron nettoyage-crm archive les
		// entreprises radiées/dissoutes → elles ne doivent pas gonfler le KPI.
		// NB : opportunites/signaux n'ont PAS de colonne statut_archive (ne pas filtrer).
		locals.supabase.from('entreprises').select('*', { count: 'exact', head: true }).eq('statut_archive', false),
		locals.supabase.from('opportunites').select('*', { count: 'exact', head: true }),
		// Audit 360 M-06 : exclure les deals clos (gagné/perdu) des relances en retard.
		// `etape_pipeline` est nullable : `NOT IN (...)` exclurait les NULL en logique
		// ternaire SQL → on inclut explicitement `etape_pipeline IS NULL` (deal pas
		// encore qualifié mais relance en retard = pertinent à afficher).
		locals.supabase.from('opportunites')
			.select('id, titre, etape_pipeline, date_relance_prevue, entreprise_id')
			.lte('date_relance_prevue', today)
			.or(`etape_pipeline.is.null,etape_pipeline.not.in.(${ETAPES_PIPELINE_CLOSED.join(',')})`)
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
		tachesQuery ?? Promise.resolve({ data: [], error: null }),
	]);

	// Si la migration n'a pas été appliquée (colonne triage_snoozed_until absente),
	// Postgrest renvoie une erreur. On dégrade gracefully en queue vide pour ne pas
	// casser le dashboard, MAIS on log côté serveur pour signaler le faux empty state.
	if (triageRes.error) {
		console.error('[dashboard.triage] query failed (likely missing migration):', triageRes.error.message ?? triageRes.error);
	}
	const triageLeads = triageRes.error ? [] : (triageRes.data ?? []);
	const triageTotal = triageRes.error ? 0 : (triageRes.count ?? triageLeads.length);

	// Normalise l'embed entreprise (objet to-one, mais l'inférence de type peut le voir en
	// tableau) vers la forme attendue par le dashboard temporel. Dégrade en [] sur erreur.
	if (tachesRes.error) {
		console.error('[dashboard.taches] query failed:', tachesRes.error.message ?? tachesRes.error);
	}
	const taches: TacheDue[] = tachesRes.error
		? []
		: ((tachesRes.data ?? []) as unknown[]).map((row) => {
				const r = row as {
					id: string;
					titre: string | null;
					etape_pipeline: string | null;
					date_relance_prevue: string | null;
					entreprise: { raison_sociale: string | null } | { raison_sociale: string | null }[] | null;
				};
				const ent = Array.isArray(r.entreprise) ? (r.entreprise[0] ?? null) : r.entreprise;
				return {
					id: r.id,
					titre: r.titre,
					etape_pipeline: r.etape_pipeline,
					date_relance_prevue: r.date_relance_prevue,
					entreprise: ent ? { raison_sociale: ent.raison_sociale ?? null } : null,
				};
			});

	return {
		firstName,
		todayIso: today,
		taches,
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
