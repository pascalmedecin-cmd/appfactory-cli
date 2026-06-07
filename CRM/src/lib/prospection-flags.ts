import { config } from '$lib/config';

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
 * Une feature d'acquisition de masse est-elle active ? (recherches sauvegardées, alertes,
 * enrichissement batch). Défaut sûr : `false`.
 */
export function isProspectionFeatureEnabled(feature: FeatureKey): boolean {
	// Cast en Record<…, boolean> : `as const` fige chaque feature à son littéral (false en V5),
	// ce qui ferait échouer `=== true` (« no overlap ») au type-check. Le cast restaure boolean.
	const features = config.prospection.features as Record<FeatureKey, boolean>;
	return features[feature] === true;
}
