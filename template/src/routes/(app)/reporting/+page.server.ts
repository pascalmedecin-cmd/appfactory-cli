import type { PageServerLoad } from './$types';
import {
	aggregatePipelineByEtape,
	aggregateActivity,
	aggregateMonthlyPipeline,
	computeConversionRate,
	type PipelineRow,
	type CountByDateRow
} from '$lib/server/reporting';

/**
 * Agrégations server-side pour la page /reporting.
 * Requêtes SELECT légères (projections minimales) + mémoire des transformations.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const [{ data: opps }, { data: contacts }, { data: entreprises }, { data: leads }] =
		await Promise.all([
			locals.supabase
				.from('opportunites')
				.select('etape_pipeline, montant_estime, date_creation, date_cloture_effective'),
			locals.supabase.from('contacts').select('date_creation'),
			locals.supabase.from('entreprises').select('date_creation'),
			locals.supabase.from('prospect_leads').select('statut, created_at')
		]);

	const opportunites = (opps ?? []) as PipelineRow[];
	const contactRows = (contacts ?? []) as CountByDateRow[];
	const entrepriseRows = (entreprises ?? []) as CountByDateRow[];
	const leadRows = (leads ?? []) as Array<{ statut: string | null; created_at: string | null }>;

	const pipelineEtape = aggregatePipelineByEtape(opportunites);
	const activityContacts = aggregateActivity(contactRows);
	const activityEntreprises = aggregateActivity(entrepriseRows);
	const activityOpportunites = aggregateActivity(
		opportunites.map((o) => ({ date_creation: o.date_creation }))
	);
	const monthlyPipeline = aggregateMonthlyPipeline(opportunites, 12);

	// Taux de conversion : heuristique = opportunités / total leads « traités »
	// (statut 'transfere_crm' = leads qui ont été promus dans le CRM).
	const totalLeads = leadRows.length;
	const leadsTransferes = leadRows.filter((l) => l.statut === 'transfere_crm').length;
	const conversion = computeConversionRate(totalLeads, leadsTransferes);

	// Somme totale pipeline actif (exclut gagne/perdu).
	const CLOSED = new Set(['gagne', 'perdu']);
	const pipelineActif = pipelineEtape
		.filter((p) => !CLOSED.has(p.etape))
		.reduce((s, p) => s + p.montant_total, 0);

	return {
		pipelineEtape,
		activityContacts,
		activityEntreprises,
		activityOpportunites,
		monthlyPipeline,
		conversion,
		pipelineActifTotal: pipelineActif
	};
};
