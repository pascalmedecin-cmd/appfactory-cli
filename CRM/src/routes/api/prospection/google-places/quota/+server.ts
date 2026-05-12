import { json, type RequestEvent } from '@sveltejs/kit';
import { getMonthlyUsage } from '$lib/server/quota';
import { googlePlacesQuotaStatus } from '$lib/api-limits';

/** Quota Google Places restant pour le mois courant — alimente l'affichage du panneau d'import. */
export const GET = async ({ locals }: RequestEvent) => {
	const { session } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });
	const used = await getMonthlyUsage(locals.supabase, 'google_places');
	const { cap, remaining, exhausted } = googlePlacesQuotaStatus(used);
	return json({ used, cap, remaining, exhausted });
};
