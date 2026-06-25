import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { CRM_BASE } from '$lib/config';
import { listCampagnes } from '$lib/server/campagnes';

/**
 * Écran dédié « Campagnes » (Vague 3.2). Premium uniquement : sans le flag ffCrmListesV2, la
 * route redirige vers le dashboard (cohérent avec « OFF byte-identique » : aucune surface
 * Campagnes accessible). Charge les campagnes (actives + archivées) + 3 stats globales.
 */
export const load: PageServerLoad = async ({ locals, parent }) => {
	const { featureFlags } = await parent();
	if (featureFlags?.ffCrmListesV2 !== true) throw redirect(307, CRM_BASE);

	const [campagnesRes, taggedRes, totalRes] = await Promise.all([
		listCampagnes(locals.supabase, { includeArchived: true }),
		// Leads distincts portant ≥1 campagne : dédup en mémoire (volume mono-tenant borné).
		locals.supabase.from('prospect_lead_campagnes').select('lead_id'),
		locals.supabase.from('prospect_leads').select('*', { count: 'exact', head: true })
	]);

	const campagnes = campagnesRes.data;
	const taggedLeads = new Set((taggedRes.data ?? []).map((r) => r.lead_id)).size;
	const totalLeads = totalRes.count ?? 0;

	return {
		campagnes,
		stats: {
			actives: campagnes.filter((c) => !c.archived).length,
			archived: campagnes.filter((c) => c.archived).length,
			taggedLeads,
			sansCampagne: Math.max(0, totalLeads - taggedLeads)
		}
	};
};
