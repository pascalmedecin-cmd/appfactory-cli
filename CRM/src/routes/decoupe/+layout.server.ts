import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

/**
 * Garde de l'outil « Découpe Films » : accessible uniquement si le flag
 * `ffDecoupe` est ON pour l'utilisateur (JWT custom claim, ADR-0005 decoupe).
 * Flag OFF → retour au portail `/`. L'auth est déjà imposée globalement par
 * `hooks.server.ts` (redirect /login si pas de session). Aligné sur le guard
 * terrain (ffCrmMobileV3).
 */
export const load: LayoutServerLoad = async ({ parent }) => {
	const { featureFlags } = await parent();
	if (!featureFlags?.ffDecoupe) {
		throw redirect(303, '/');
	}
	return {};
};
