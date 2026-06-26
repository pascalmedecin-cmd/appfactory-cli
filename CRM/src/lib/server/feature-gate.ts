import { readFeatureFlags } from '$lib/types/feature-flags';

/**
 * Gate serveur du module Campagnes (Vague 3.2, flag JWT par-user ffCrmListesV2).
 *
 * Defense-in-depth : les endpoints (mutations CRUD, assignation, import, export) valident le
 * flag EUX-MÊMES, pas seulement l'UI. Sans cela, un admin authentifié mais non-premium pourrait
 * contourner l'interface (qui masque la surface) par un appel direct -> l'invariant « flag OFF =
 * rendu byte-identique, aucune surface Campagnes » ne tiendrait plus (rollout contrôlé).
 *
 * Le flag vit dans les claims signés JWT (`user.app_metadata`, non altérables côté client).
 */
export function isCampagnesEnabled(user: { app_metadata?: unknown } | null | undefined): boolean {
	return readFeatureFlags((user?.app_metadata ?? undefined) as Record<string, unknown> | undefined).ffCrmListesV2 === true;
}
