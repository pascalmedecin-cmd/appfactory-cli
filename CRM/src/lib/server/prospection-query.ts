/**
 * Source UNIQUE du filtre `prospect_leads` de la Prospection (Vague 3.2, prérequis interne).
 *
 * Avant : 3 implémentations divergentes du même filtre — le `load` de la page
 * (`crm/prospection/+page.server.ts`), l'export CSV (`api/export/prospection`) et la
 * sélection globale (`api/prospection/all-ids`). Elles divergeaient : all-ids ne mappait
 * pas l'onglet -> sources, n'excluait pas les transférés par défaut, et cherchait sur 2
 * champs au lieu de 3 -> la « sélection globale » pouvait cocher des prospects hors de la
 * vue affichée (autres onglets + transférés cachés).
 *
 * Ce module réconcilie ces divergences en un seul endroit. Le comportement canonique est
 * celui du `load` (le plus complet). Les 3 appelants partagent désormais le parsing, le
 * mapping onglet, le filtre (source/canton/statut/transférés/température) et les 3 champs
 * de recherche. La pagination / le cap / la sémantique du compteur restent propres à chaque
 * appelant (légitimement différents : pagination vs export plafonné vs liste d'ids).
 *
 * Sécurité : recherche via `.ilike()` paramétré (jamais de mini-DSL `.or()` interpolé,
 * cf. memory/feedback_postgrest_or_filter_injection.md) ; wildcards échappés (`escapeIlike`) ;
 * tableaux de filtres bornés (`MAX_FILTER_VALUES`).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { PROSPECTION_TABS, TAB_SOURCE_MAP, VALID_SORT_KEYS, type ProspectionTabKey } from '$lib/prospection-utils';
import { isProspectionTabVisible, defaultProspectionTab } from '$lib/prospection-flags';
import { escapeIlike } from '$lib/server/db-helpers';
import { leadIdsForCampagnes } from '$lib/server/campagnes';

/** Champs balayés par la recherche texte (les 3, partout — corrige la divergence all-ids). */
export const PROSPECTION_SEARCH_FIELDS = ['raison_sociale', 'localite', 'canton'] as const;

/** Garde-fou DoS : un `IN (...)` borné par paramètre d'URL (sources/cantons/statuts). */
export const MAX_FILTER_VALUES = 50;

/** Format des ids campagne : tout `?campagne=` hors format UUID est ignoré au parsing
 *  (defense-in-depth ; evite un filtre silencieusement vide sur une saisie malformee). */
const CAMPAGNE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Bornage de la saisie de recherche (cohérent avec l'ancien export/all-ids). */
const MAX_SEARCH_LEN = 200;

/** Lot 2 : remap défensif des anciens liens/bookmarks (?statut=nouveau|interesse) vers
 *  le nouveau modèle, pour éviter un filtre silencieusement mort après la migration. */
const LEGACY_STATUT_REMAP: Record<string, string> = { nouveau: 'vide', interesse: 'a_contacter' };

export type ProspectionFilter = {
	tab: ProspectionTabKey;
	tabSources: readonly string[];
	/** Sources demandées intersectées avec celles de l'onglet (ou toutes celles de l'onglet si vide). */
	effectiveSources: string[];
	/** Vrai si un filtre source est demandé mais incompatible avec l'onglet -> 0 résultat. */
	sourceFilterIncompatible: boolean;
	filterSources: string[];
	filterCantons: string[];
	filterStatuts: string[];
	/** Vague 3.2 : campagnes demandées (relation N-N, filtre « porte ≥1 de ces campagnes »). */
	filterCampagnes: string[];
	/** Lot 2 : vue « Écartés » (statut=ecarte) au lieu de la file de tri (statut=vide). */
	showDismissed: boolean;
	search: string;
	sortKey: string;
	sortAsc: boolean;
};

/**
 * Résout l'onglet effectif : un `?tab=` inconnu ou masqué retombe sur le défaut (premier
 * onglet visible). N'effectue PAS le redirect 303 — c'est une décision propre au `load`
 * (l'export et all-ids n'en ont pas besoin). Comparer `resolveProspectionTab(requestedTab)`
 * au `requestedTab` côté `load` suffit à décider du redirect.
 */
export function resolveProspectionTab(rawTab: string | null): ProspectionTabKey {
	const fallback = defaultProspectionTab();
	if (rawTab === null) return fallback;
	return (PROSPECTION_TABS as readonly string[]).includes(rawTab) && isProspectionTabVisible(rawTab as ProspectionTabKey)
		? (rawTab as ProspectionTabKey)
		: fallback;
}

/** Parse les paramètres d'URL en un filtre normalisé, identique pour les 3 appelants. */
export function parseProspectionFilter(url: URL): ProspectionFilter {
	const tab = resolveProspectionTab(url.searchParams.get('tab'));
	const tabSources = TAB_SOURCE_MAP[tab];

	const filterSources = url.searchParams.getAll('source').slice(0, MAX_FILTER_VALUES);
	const filterCantons = url.searchParams.getAll('canton').slice(0, MAX_FILTER_VALUES);
	const filterStatuts = [...new Set(
		url.searchParams.getAll('statut').map((s) => LEGACY_STATUT_REMAP[s] ?? s)
	)].slice(0, MAX_FILTER_VALUES);
	const filterCampagnes = url.searchParams.getAll('campagne').filter((id) => CAMPAGNE_ID_RE.test(id)).slice(0, MAX_FILTER_VALUES);
	const search = (url.searchParams.get('q') ?? '').slice(0, MAX_SEARCH_LEN);
	const showDismissed = url.searchParams.get('ecartes') === '1';

	const rawSort = url.searchParams.get('sort') ?? '';
	const sortKey = (VALID_SORT_KEYS as readonly string[]).includes(rawSort) ? rawSort : 'date_import';
	const sortAsc = url.searchParams.get('dir') === 'asc';

	const effectiveSources = filterSources.length > 0
		? filterSources.filter((s) => tabSources.includes(s))
		: [...tabSources];
	const sourceFilterIncompatible = filterSources.length > 0 && effectiveSources.length === 0;

	return {
		tab, tabSources, effectiveSources, sourceFilterIncompatible,
		filterSources, filterCantons, filterStatuts, filterCampagnes,
		showDismissed, search, sortKey, sortAsc,
	};
}

// Les query builders PostgREST se chaînent en renvoyant le même type ; on garde le type de
// l'appelant (qui porte l'inférence de `.data`) et on caste en interne pour les appels.
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Applique les filtres « de portée » (canton, statut) — identiques pour la vue principale
 * ET les compteurs par onglet. N'applique PAS le filtre source.
 */
export function applyProspectionScopeFilters<T>(query: T, f: ProspectionFilter): T {
	let q = query as any;
	if (f.filterCantons.length > 0) q = q.in('canton', f.filterCantons);
	// Lot 2 : portée par statut. Défaut = file de tri (statut='vide'). La vue « Écartés »
	// (showDismissed) montre les 'ecarte'. Un filtre statut explicite (?statut=) prime.
	// a_contacter (au pipeline) et transfere (clients) ne s'affichent jamais en prospection.
	if (f.filterStatuts.length > 0) q = q.in('statut', f.filterStatuts);
	else if (f.showDismissed) q = q.eq('statut', 'ecarte');
	else q = q.eq('statut', 'vide');
	return q as T;
}

/**
 * Applique le filtre source de la vue principale : sources de l'onglet intersectées au
 * filtre demandé. La garde `sourceFilterIncompatible` est gérée en amont par l'appelant
 * (court-circuit à vide), donc ici on applique simplement le `.in('source', ...)`.
 */
export function applyProspectionSourceFilter<T>(query: T, f: ProspectionFilter): T {
	if (f.sourceFilterIncompatible) return query;
	const sources = f.effectiveSources.length > 0 ? f.effectiveSources : [...f.tabSources];
	return (query as any).in('source', sources) as T;
}

/** Filtre complet de la vue principale = source (onglet) + portée (canton/statut/temp). */
export function applyProspectionFilters<T>(query: T, f: ProspectionFilter): T {
	return applyProspectionScopeFilters(applyProspectionSourceFilter(query, f), f);
}

/**
 * Résout la restriction « filtre campagne » (relation N-N) en une liste de lead_ids.
 * Retourne `null` quand aucune campagne n'est demandée (= pas de restriction), sinon les
 * lead_ids portant ≥1 des campagnes (dédupés, possiblement vide -> aucun résultat). Async
 * (interroge la jonction `prospect_lead_campagnes`) : à appeler UNE fois par requête, en
 * amont du query builder. La liste de campagnes est déjà bornée (MAX_FILTER_VALUES).
 */
export async function resolveCampagneLeadIds(
	supabase: SupabaseClient,
	filter: ProspectionFilter,
): Promise<string[] | null> {
	if (filter.filterCampagnes.length === 0) return null;
	return leadIdsForCampagnes(supabase as never, filter.filterCampagnes);
}

/**
 * Applique la restriction relationnelle campagne sur une query `prospect_leads` :
 * `.in('id', leadIds)` (paramétré, jamais de `.or()` interpolé, cf.
 * feedback_postgrest_or_filter_injection). `null` = no-op (pas de filtre campagne).
 * NB : une liste VIDE matche 0 ligne — l'appelant court-circuite ce cas en amont.
 */
export function applyCampagneLeadFilter<T>(query: T, restrictIds: string[] | null): T {
	if (restrictIds === null) return query;
	return (query as any).in('id', restrictIds) as T;
}

/** Motif `.ilike()` échappé pour la recherche (wildcards SQL neutralisés). */
export function prospectionSearchPattern(search: string): string {
	return `%${escapeIlike(search)}%`;
}

/**
 * Récupération « toutes les lignes filtrées, plafonnée » — partagée par l'export CSV et la
 * sélection globale d'ids (mêmes filtres, même recherche 3 champs + dédup, cap distinct).
 * Le `load` n'utilise PAS ce helper : il pagine (range) et calcule des compteurs par onglet.
 *
 * - `order: true`  -> tri par `sortKey` (export). `false` -> aucun tri (all-ids, qui ne
 *   renvoie que des ids pour une sélection).
 * - En recherche : 3 `.ilike()` en parallèle + dédup par id ; `totalMatching` = taille
 *   dédupée avant cap. Sinon : `count: 'exact'` -> `totalMatching` = total réel filtré.
 * - `truncated` = `totalMatching > cap` (sert le header « No silent caps » de l'export et le
 *   drapeau `capped` de la sélection globale).
 */
export async function fetchProspectionRows<Row extends { id: string }>(
	supabase: SupabaseClient,
	filter: ProspectionFilter,
	opts: { select: string; cap: number; order?: boolean },
): Promise<{ rows: Row[]; totalMatching: number; truncated: boolean; error: { message: string } | null }> {
	const { select, cap, order = false } = opts;

	// Filtre source incompatible avec l'onglet -> 0 résultat, aucune requête DB.
	if (filter.sourceFilterIncompatible) {
		return { rows: [], totalMatching: 0, truncated: false, error: null };
	}

	// Filtre campagne (relation N-N) : résolu une fois en lead_ids, appliqué via `.in('id', ...)`.
	// Aucune campagne sans aucun lead -> vue vide (court-circuit, aucune requête principale).
	const restrictIds = await resolveCampagneLeadIds(supabase, filter);
	if (restrictIds !== null && restrictIds.length === 0) {
		return { rows: [], totalMatching: 0, truncated: false, error: null };
	}

	const decorate = (q: any) => (order ? q.order(filter.sortKey, { ascending: filter.sortAsc }) : q);

	if (filter.search) {
		const pattern = prospectionSearchPattern(filter.search);
		const queries = PROSPECTION_SEARCH_FIELDS.map((field) =>
			decorate(
				applyCampagneLeadFilter(
					applyProspectionFilters(supabase.from('prospect_leads').select(select), filter),
					restrictIds,
				).ilike(field, pattern),
			).limit(cap),
		);
		const results = await Promise.all(queries);
		const firstError = results.find((r) => r.error)?.error ?? null;
		if (firstError) return { rows: [], totalMatching: 0, truncated: false, error: firstError };

		const seen = new Set<string>();
		const rows: Row[] = [];
		for (const r of results) {
			for (const row of (r.data ?? []) as unknown as Row[]) {
				if (!seen.has(row.id)) {
					seen.add(row.id);
					rows.push(row);
				}
			}
		}
		const totalMatching = rows.length;
		return { rows: rows.slice(0, cap), totalMatching, truncated: totalMatching > cap, error: null };
	}

	const { data, count, error } = await decorate(
		applyCampagneLeadFilter(
			applyProspectionFilters(supabase.from('prospect_leads').select(select, { count: 'exact' }), filter),
			restrictIds,
		),
	).limit(cap);
	if (error) return { rows: [], totalMatching: 0, truncated: false, error };
	const rows = (data ?? []) as unknown as Row[];
	const totalMatching = count ?? rows.length;
	return { rows, totalMatching, truncated: totalMatching > cap, error: null };
}
