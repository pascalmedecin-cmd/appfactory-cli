import { config } from '$lib/config';
import { PROSPECTION_TABS, TAB_SOURCE_MAP, type ProspectionTabKey } from '$lib/prospection-utils';

/**
 * Flags V5 (2026-06-07) de la Prospection — source de vérité : `config.prospection`.
 *
 * Pilotent la coupure des imports de masse et des features d'acquisition de masse.
 * Lisibles côté client ET serveur (config statique, pas de variable d'env). La coupe
 * est réversible en repassant les valeurs à `true` dans `config.ts`.
 */

type SourceConfig = { enabled?: boolean };
type FeatureKey = keyof typeof config.prospection.features;

/**
 * Une source d'import est-elle active ? Défaut sûr : une source inconnue renvoie `false`.
 */
export function isProspectionSourceEnabled(source: string): boolean {
	const sources = config.prospection.sources as Record<string, SourceConfig>;
	return sources[source]?.enabled === true;
}

/**
 * Filtre une liste de sources en ne gardant que les actives (ordre d'entrée préservé).
 * Utilisé pour restreindre les onglets d'import proposés dans l'UI Prospection.
 */
export function filterEnabledSources(sources: readonly string[]): string[] {
	return sources.filter((s) => isProspectionSourceEnabled(s));
}

/**
 * Un onglet Prospection est-il visible ? Vrai dès qu'au moins une de ses sources est active.
 * La visibilité dérive donc de l'état des flags de source (réversible : réactiver une source
 * dans `config.ts` réaffiche l'onglet sans autre modification). SIMAP/RegBL ayant toutes leurs
 * sources coupées en V5, leurs onglets sont masqués (mini-projet Prospection P1, 2026-06-18).
 */
export function isProspectionTabVisible(tab: ProspectionTabKey): boolean {
	return (TAB_SOURCE_MAP[tab] ?? []).some((s) => isProspectionSourceEnabled(s));
}

/** Liste ordonnée des onglets Prospection visibles (ordre canonique `PROSPECTION_TABS`). */
export function visibleProspectionTabs(): ProspectionTabKey[] {
	return PROSPECTION_TABS.filter(isProspectionTabVisible);
}

/** Onglet par défaut = premier onglet visible (fallback `entreprises` si tout est coupé). */
export function defaultProspectionTab(): ProspectionTabKey {
	return visibleProspectionTabs()[0] ?? 'entreprises';
}

/**
 * Une feature d'acquisition de masse est-elle active ? (recherches sauvegardées, alertes,
 * enrichissement batch). Défaut sûr : `false`.
 */
export function isProspectionFeatureEnabled(feature: FeatureKey): boolean {
	// Cast en Record<…, boolean> : `as const` fige chaque feature à son littéral (false en V5),
	// ce qui ferait échouer `=== true` (« no overlap ») au type-check. Le cast restaure boolean.
	const features = config.prospection.features as Record<FeatureKey, boolean>;
	return features[feature] === true;
}
