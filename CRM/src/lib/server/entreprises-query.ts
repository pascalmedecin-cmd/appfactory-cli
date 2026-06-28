/**
 * Source UNIQUE du filtre `entreprises` de la page /crm/entreprises (Bloc A — refonte serveur
 * 2026-06-28). Aligne le pattern de `/prospection` : le `load` parse l'URL, applique le filtre
 * d'onglet + la recherche + la pagination + le tri côté Postgres, et calcule les counts/KPI via
 * des requêtes `count:'exact'` séparées (sans `limit`, sans filtre d'onglet pour les KPI globaux).
 *
 * Avant : `load` chargeait `select('*')` SANS limite (toutes les entreprises non archivées), et
 * la page filtrait/paginait/comptait 100 % côté client. La table entreprises est celle qui croît
 * le plus (transferts Prospection) → payload non borné. Cette refonte borne la vue à une page.
 *
 * Sécurité : recherche via `.ilike()` paramétré (jamais de mini-DSL `.or()` interpolé avec de la
 * saisie, cf. memory/feedback_postgrest_or_filter_injection.md) ; wildcards échappés
 * (`escapeIlike`) ; les `.or()` d'onglet/KPI ne contiennent QUE des littéraux ; l'anti-join
 * `sans-contact` n'injecte que des ids validés UUID (issus de la table `contacts`).
 *
 * Helpers PURS (parse) + apply-functions génériques (prennent un query builder PostgREST et le
 * renvoient chaîné) → testables sans Supabase. Cf. `entreprises-query.test.ts`.
 */
import { escapeIlike } from '$lib/server/db-helpers';

/** Onglets de la page (catégories mutuellement exclusives, calculées par relation aux contacts). */
export const ENTREPRISES_TABS = ['toutes', 'qualifiees', 'a-qualifier', 'sans-contact'] as const;
export type EntreprisesTabKey = (typeof ENTREPRISES_TABS)[number];

/** Champs balayés par la recherche texte (3 .ilike() en parallèle + dédup, cf. /prospection). */
export const ENTREPRISES_SEARCH_FIELDS = ['raison_sociale', 'secteur_activite', 'canton'] as const;

/** Clés de tri autorisées (whitelist stricte → anti-injection de colonne via `?sort=`). */
export const ENTREPRISES_SORT_KEYS = [
	'raison_sociale',
	'secteur_activite',
	'canton',
	'statut_qualification',
	'date_derniere_modification',
] as const;
export type EntreprisesSortKey = (typeof ENTREPRISES_SORT_KEYS)[number];

/** Tailles de page autorisées (anti-DOS via `?perPage=`). */
export const ENTREPRISES_PAGE_SIZES = [25, 50, 100] as const;
export const ENTREPRISES_DEFAULT_PAGE_SIZE = 50;
/** Tri par défaut : entreprise la plus récemment modifiée en tête (parité avec l'ancien `load`). */
export const ENTREPRISES_DEFAULT_SORT: EntreprisesSortKey = 'date_derniere_modification';

const MAX_SEARCH_LEN = 200;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EntreprisesQuery = {
	tab: EntreprisesTabKey;
	page: number;
	pageSize: number;
	search: string;
	sortKey: EntreprisesSortKey;
	sortAsc: boolean;
};

/** Onglet effectif : un `?tab=` inconnu retombe sur `toutes`. */
export function resolveEntreprisesTab(raw: string | null): EntreprisesTabKey {
	return raw !== null && (ENTREPRISES_TABS as readonly string[]).includes(raw)
		? (raw as EntreprisesTabKey)
		: 'toutes';
}

/** Parse les paramètres d'URL en un filtre normalisé. */
export function parseEntreprisesQuery(url: URL): EntreprisesQuery {
	const tab = resolveEntreprisesTab(url.searchParams.get('tab'));
	const page = Math.max(0, parseInt(url.searchParams.get('page') ?? '0', 10) || 0);

	const rawPerPage = parseInt(url.searchParams.get('perPage') ?? '', 10);
	const pageSize = (ENTREPRISES_PAGE_SIZES as readonly number[]).includes(rawPerPage)
		? rawPerPage
		: ENTREPRISES_DEFAULT_PAGE_SIZE;

	const search = (url.searchParams.get('q') ?? '').slice(0, MAX_SEARCH_LEN).trim();

	const rawSort = url.searchParams.get('sort') ?? '';
	const sortKey = (ENTREPRISES_SORT_KEYS as readonly string[]).includes(rawSort)
		? (rawSort as EntreprisesSortKey)
		: ENTREPRISES_DEFAULT_SORT;
	// `?dir=asc` => ascendant ; sinon descendant (le défaut date desc = parité ancien `load`).
	const sortAsc = url.searchParams.get('dir') === 'asc';

	return { tab, page, pageSize, search, sortKey, sortAsc };
}

// Les query builders PostgREST se chaînent en renvoyant le même type ; on garde le type de
// l'appelant (qui porte l'inférence de `.data`) et on caste en interne pour les appels.
/* eslint-disable @typescript-eslint/no-explicit-any */

/** Filtre de base commun à toutes les requêtes (vue + counts + KPI) : entreprises non archivées. */
export function applyEntreprisesBaseFilter<T>(query: T): T {
	return (query as any).eq('statut_archive', false) as T;
}

/**
 * Filtre d'onglet. `idsWithContact` = ids entreprise référencés par ≥1 contact non archivé
 * (déjà chargés côté `load`, invariant fiche SlideOut). `sans-contact` = anti-join : les
 * entreprises dont l'id n'est PAS dans ce set. Set vide → toutes les entreprises sont
 * « sans contact » (aucun filtre ajouté). Seuls des ids UUID validés sont injectés dans le `IN`.
 */
export function applyEntreprisesTabFilter<T>(
	query: T,
	tab: EntreprisesTabKey,
	idsWithContact: readonly string[],
): T {
	const q = query as any;
	if (tab === 'qualifiees') return q.eq('statut_qualification', 'qualifie') as T;
	// « À qualifier » = statut 'nouveau' OU null (pas encore traité). Littéraux seuls.
	if (tab === 'a-qualifier') return q.or('statut_qualification.eq.nouveau,statut_qualification.is.null') as T;
	if (tab === 'sans-contact') {
		const ids = idsWithContact.filter((id) => UUID_RE.test(id));
		if (ids.length === 0) return q as T;
		return q.not('id', 'in', `(${ids.join(',')})`) as T;
	}
	return q as T; // 'toutes' : aucun filtre supplémentaire
}

/**
 * Filtre « sans canton » pour le KPI non-premium : canton NULL ou chaîne vide. Littéraux seuls
 * (parité exacte avec l'ancien `if (!e.canton)` côté client, qui était vrai pour null ET '').
 */
export function applyEntreprisesSansCantonFilter<T>(query: T): T {
	return (query as any).or('canton.is.null,canton.eq.') as T;
}

/** Motif de recherche ILIKE échappé (`%term%`) — wildcards de la saisie neutralisés. */
export function entreprisesSearchPattern(search: string): string {
	return `%${escapeIlike(search)}%`;
}
