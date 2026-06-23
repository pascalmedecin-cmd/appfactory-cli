/**
 * Construction de l'URL de redirection /crm/prospection après import d'un chip Veille.
 *
 * Extrait du endpoint `api/prospection/from-intelligence/+server.ts` : SvelteKit
 * interdit d'exporter autre chose que GET/POST/... (ou un `_prefixe`) depuis un
 * `+server.ts` (échec build). Le logique pure vit donc ici, testable + importable.
 */
import { PROSPECTION_TABS, TAB_SOURCE_MAP } from '$lib/prospection-utils';

/**
 * Onglet Prospection contenant une source donnée. Dérivé de TAB_SOURCE_MAP (source
 * UNIQUE des onglets, prospection-utils.ts) pour rester aligné si une source change
 * d'onglet. zefix -> 'entreprises', simap -> 'simap', regbl -> 'regbl'.
 * Fallback = la source elle-même (cohérent : simap/regbl sont aussi des noms d'onglet).
 */
export function tabForSource(source: string): string {
	return PROSPECTION_TABS.find((tab) => TAB_SOURCE_MAP[tab].includes(source)) ?? source;
}

/**
 * URL de redirection /crm/prospection après import depuis un chip Veille.
 *
 * CRITIQUE : pose `tab=` (en plus de `source=`). Sans onglet, parseProspectionFilter
 * retombe sur l'onglet par défaut ; si la source du chip (ex. zefix) n'appartient pas
 * à cet onglet, `sourceFilterIncompatible` -> 0 résultat et les leads importés sont
 * invisibles. Pose donc l'onglet qui CONTIENT la source (zefix -> entreprises).
 * `sort=date_import` reste une clé de tri valide (cf. SORT_FIELDS) : les imports
 * frais remontent en tête.
 */
export function buildRedirect(
	source: 'simap' | 'zefix' | 'regbl',
	canton: string,
	reportId: string,
	fromTerm: string
): string {
	const params = new URLSearchParams();
	params.set('tab', tabForSource(source));
	params.set('source', source);
	params.set('canton', canton);
	params.set('from_intelligence', reportId);
	params.set('from_term', fromTerm);
	params.set('sort', 'date_import');
	params.set('dir', 'desc');
	return `/crm/prospection?${params.toString()}`;
}
