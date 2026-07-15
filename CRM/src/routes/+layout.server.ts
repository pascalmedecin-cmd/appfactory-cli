import type { LayoutServerLoad } from './$types';
import { readFeatureFlags } from '$lib/types/feature-flags';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();
	// Feature flags lus depuis JWT custom claims Supabase (ADR-005 refonte mobile).
	const featureFlags = readFeatureFlags(user?.app_metadata as Record<string, unknown> | undefined);
	// Atelier 209 Run 2 : marque active exposee au chrome (Sidebar/Header) et aux pages.
	return { session, user, featureFlags, marqueActive: locals.marque };
};
