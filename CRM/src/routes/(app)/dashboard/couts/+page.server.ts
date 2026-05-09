import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	aggregateByWeek,
	computeKpis,
	type CostRun,
	type WeekAggregate,
	type CostKpi
} from '$lib/utils/coutsFormat';

/**
 * Charge les runs des 84 derniers jours (~12 semaines + marge) pour alimenter
 * le dashboard /dashboard/couts. Tous les calculs (KPI, agrégation hebdo) sont
 * pré-calculés côté serveur ; la liste brute n'est pas retournée au client
 * (page UI = KPI + chart uniquement, voir spec S177 simplification post-audit
 * factuel : seule la veille hebdo consomme la clé Claude API aujourd'hui).
 *
 * Auth : route protégée par +layout.server.ts (auth gate global +
 * locals.supabase). RLS : policy `cost_audit_runs_select_authenticated` autorise
 * tout user authentifié.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const { session } = await locals.safeGetSession();
	if (!session) {
		throw error(401, 'Authentification requise');
	}

	const since = new Date();
	since.setUTCDate(since.getUTCDate() - 84);

	const { data, error: dbError } = await locals.supabase
		.from('cost_audit_runs')
		.select(
			'id, started_at, feature, status, total_eur, total_usd'
		)
		.gte('started_at', since.toISOString())
		.order('started_at', { ascending: false })
		.limit(500);

	if (dbError) {
		console.error(`[dashboard-couts] DB error: ${dbError.message}`);
		throw error(500, 'Erreur lecture coûts API');
	}

	const runs = (data ?? []) as CostRun[];
	const now = new Date();
	const weeks: WeekAggregate[] = aggregateByWeek(runs, 12, now);
	const kpi: CostKpi = computeKpis(runs, now);

	return {
		weeks,
		kpi
	};
};
