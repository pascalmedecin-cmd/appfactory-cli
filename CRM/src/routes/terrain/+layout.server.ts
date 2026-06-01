import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

/**
 * Garde du shell terrain V3 (AC-013) : accessible uniquement si le flag
 * `ffCrmMobileV3` est ON pour l'utilisateur. Flag OFF → on renvoie vers le
 * CRM desktop (comportement inchangé, zéro contamination). L'auth est déjà
 * imposée globalement par `hooks.server.ts` (redirect /login si pas de session).
 */
export const load: LayoutServerLoad = async ({ parent }) => {
	const { featureFlags } = await parent();
	if (!featureFlags?.ffCrmMobileV3) {
		throw redirect(303, '/crm');
	}
	return {};
};
