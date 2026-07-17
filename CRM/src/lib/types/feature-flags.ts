/**
 * Feature flags lus depuis JWT custom claims Supabase (auth.users.raw_app_meta_data).
 * Voir ADR-005 dans `CRM/.product-architect/adr/0005-feature-flag-supabase-jwt-vs-growthbook.md`.
 *
 * Activation : `UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"ff_crm_mobile_v2": true}'::jsonb WHERE email = '<email>@filmpro.ch'`.
 * Kill switch : `UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data - 'ff_crm_mobile_v2' WHERE email = '<email>@filmpro.ch'`.
 */
export interface FeatureFlags {
	ffCrmMobileV2: boolean;
	/** V3 « outil terrain » : shell mobile PWA dédié (/terrain). ADR-0004. */
	ffCrmMobileV3: boolean;
	/** Outil « Découpe Films » (chantier 2 portail) : route /decoupe. ADR-0005 (decoupe). */
	ffDecoupe: boolean;
	/**
	 * Refonte UX/UI - Vague 2 « listes & fiches premium » (chantier réversible par page).
	 * ON → ligne riche + chips KPI + fiche premium. OFF → rendu actuel (zéro régression).
	 * Activation : `... raw_app_meta_data || '{"ff_crm_listes_v2": true}'::jsonb`.
	 */
	ffCrmListesV2: boolean;
	/**
	 * Cohérence UI - bandeau de page in-page (icône + sur-titre + titre + description) façon
	 * Gouvernance, avec Header fixe allégé (le titre migre du Header vers le bandeau).
	 * ON → bandeau PageBand + titre masqué dans le Header sur les pages adoptées. OFF → rendu actuel.
	 * Spec : `docs/COHERENCE-UI-BANDEAU.md`. Activation : `... || '{"ff_page_bandeau": true}'::jsonb`.
	 */
	ffPageBandeau: boolean;
	/**
	 * Cohérence UI - increments b/c/d (briques transverses, compteurs, grille). Normalise boutons,
	 * pastilles, recherche, surfaces, états vides, sur-titres et hauteurs de contrôles sur les tokens
	 * existants (peau Atelier 209 inchangée). ON → briques cohérentes façon mockup validé. OFF → rendu
	 * actuel strict (zéro régression). Spec : `docs/COHERENCE-UI-BANDEAU.md` § « Increments b/c/d ».
	 * Activation : `... || '{"ff_ui_coherence": true}'::jsonb`.
	 */
	ffUiCoherence: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
	ffCrmMobileV2: false,
	ffCrmMobileV3: false,
	ffDecoupe: false,
	ffCrmListesV2: false,
	ffPageBandeau: false,
	ffUiCoherence: false,
};

/**
 * Lit les feature flags depuis `user.app_metadata` (claims signés JWT, non altérables côté client).
 * Renvoie les défauts si user absent ou metadata absent. Toute valeur non strictement === true est false.
 */
export function readFeatureFlags(appMetadata: Record<string, unknown> | null | undefined): FeatureFlags {
	if (!appMetadata) return DEFAULT_FEATURE_FLAGS;
	return {
		ffCrmMobileV2: appMetadata['ff_crm_mobile_v2'] === true,
		ffCrmMobileV3: appMetadata['ff_crm_mobile_v3'] === true,
		ffDecoupe: appMetadata['ff_decoupe'] === true,
		ffCrmListesV2: appMetadata['ff_crm_listes_v2'] === true,
		ffPageBandeau: appMetadata['ff_page_bandeau'] === true,
		ffUiCoherence: appMetadata['ff_ui_coherence'] === true,
	};
}
