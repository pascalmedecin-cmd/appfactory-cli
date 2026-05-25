import type { LayoutServerLoad } from './$types';
import { readFeatureFlags } from '$lib/types/feature-flags';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();
	// Feature flags lus depuis JWT custom claims Supabase (ADR-005 refonte mobile).
	const featureFlags = readFeatureFlags(user?.app_metadata as Record<string, unknown> | undefined);
	return { session, user, featureFlags };
};
