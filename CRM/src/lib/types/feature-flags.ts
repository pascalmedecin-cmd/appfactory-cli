/**
 * Feature flags lus depuis JWT custom claims Supabase (auth.users.raw_app_meta_data).
 * Voir ADR-005 dans `CRM/.product-architect/adr/0005-feature-flag-supabase-jwt-vs-growthbook.md`.
 *
 * Activation : `UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"ff_crm_mobile_v2": true}'::jsonb WHERE email = '<email>@filmpro.ch'`.
 * Kill switch : `UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data - 'ff_crm_mobile_v2' WHERE email = '<email>@filmpro.ch'`.
 */
export interface FeatureFlags {
	ffCrmMobileV2: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
	ffCrmMobileV2: false,
};

/**
 * Lit les feature flags depuis `user.app_metadata` (claims signés JWT, non altérables côté client).
 * Renvoie les défauts si user absent ou metadata absent. Toute valeur non strictement === true est false.
 */
export function readFeatureFlags(appMetadata: Record<string, unknown> | null | undefined): FeatureFlags {
	if (!appMetadata) return DEFAULT_FEATURE_FLAGS;
	return {
		ffCrmMobileV2: appMetadata['ff_crm_mobile_v2'] === true,
	};
}
