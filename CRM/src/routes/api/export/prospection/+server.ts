/**
 * Export CSV filtré de la Prospection : reflète EXACTEMENT la vue affichée
 * (onglet actif + filtres source/canton/statut/température + recherche), pas
 * la page paginée — toutes les lignes filtrées, plafonnées à MAX_EXPORT.
 *
 * Le bouton « Exporter CSV » de /crm/prospection pointe ici avec la querystring
 * courante de la page, donc l'export = ce que l'utilisateur voit.
 *
 * ⚠️ La logique de filtre DOIT rester le miroir de `crm/prospection/+page.server.ts`
 * (`buildBaseQuery` + recherche 3 champs). Toute évolution des filtres de la page
 * doit être répercutée ici.
 *
 * DETTE CONNUE (à consolider) : il existe 3 implémentations du filtre `prospect_leads`
 * — le `load` de la page, `/api/prospection/all-ids` (2 champs de recherche, pas de
 * mapping onglet), et ce module. Elles divergent légèrement. À fusionner dans un
 * helper unique `$lib/server/prospection-query.ts` lors de la cascade « colonne
 * Campagne » (Vague 3.2), où l'export gagnera aussi la colonne Campagne.
 *
 * Protégé par le hook global (session @filmpro.ch requise).
 */
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { toCsv, csvFilename, csvResponseHeaders } from '$lib/server/csv-export';
import { LEADS_EXPORT_COLUMNS } from '$lib/server/export-columns';
import { PROSPECTION_TABS, TAB_SOURCE_MAP, VALID_SORT_KEYS, PROSPECTION_EXPORT_CAP, type ProspectionTabKey } from '$lib/prospection-utils';
import { isProspectionTabVisible, defaultProspectionTab } from '$lib/prospection-flags';

const MAX_EXPORT = PROSPECTION_EXPORT_CAP;
const MAX_FILTER_VALUES = 50; // Garde-fou DoS : IN (...) borné par paramètre.
const VALID_TEMPS = new Set(['chaud', 'tiede', 'froid']);
// Mêmes 3 champs que la recherche serveur du load (raison_sociale, localite, canton).
const SEARCH_FIELDS = ['raison_sociale', 'localite', 'canton'] as const;

export const GET: RequestHandler = async ({ locals, url }) => {
	// --- Résolution de l'onglet (miroir du load, sans le redirect 303) ---
	const fallbackTab = defaultProspectionTab();
	const rawTab = url.searchParams.get('tab') ?? fallbackTab;
	const tab: ProspectionTabKey =
		(PROSPECTION_TABS as readonly string[]).includes(rawTab) && isProspectionTabVisible(rawTab as ProspectionTabKey)
			? (rawTab as ProspectionTabKey)
			: fallbackTab;
	const tabSources = TAB_SOURCE_MAP[tab];

	// --- Filtres (miroir du load) ---
	const filterSources = url.searchParams.getAll('source').slice(0, MAX_FILTER_VALUES);
	const filterCantons = url.searchParams.getAll('canton').slice(0, MAX_FILTER_VALUES);
	const filterStatuts = url.searchParams.getAll('statut').slice(0, MAX_FILTER_VALUES);
	const filterTemperatures = url.searchParams.getAll('temp').filter((t) => VALID_TEMPS.has(t));
	const search = (url.searchParams.get('q') ?? '').slice(0, 200);
	const showTransferred = url.searchParams.get('showTransferred') === '1';

	const rawSort = url.searchParams.get('sort') ?? '';
	const sortKey = (VALID_SORT_KEYS as readonly string[]).includes(rawSort) ? rawSort : 'score_pertinence';
	const sortAsc = url.searchParams.get('dir') === 'asc';

	const effectiveSources = filterSources.length > 0
		? filterSources.filter((s) => tabSources.includes(s))
		: [...tabSources];
	const sourceFilterIncompatible = filterSources.length > 0 && effectiveSources.length === 0;

	const buildBaseQuery = () => {
		// count: 'exact' → permet de détecter une troncature (total réel vs cap), sans
		// changer les lignes renvoyées. Miroir du load (qui utilise aussi count: 'exact').
		let q = locals.supabase.from('prospect_leads').select('*', { count: 'exact' });
		// Garde de symétrie avec le load (+page.server.ts:75) : le filtre source ne
		// s'applique pas si incompatible. Ici buildBaseQuery n'est appelé que dans la
		// branche !sourceFilterIncompatible, donc la garde est équivalente, mais on la
		// conserve pour rester un miroir exact (évite une divergence à la prochaine édition).
		if (!sourceFilterIncompatible) q = q.in('source', effectiveSources.length > 0 ? effectiveSources : [...tabSources]);
		if (filterCantons.length > 0) q = q.in('canton', filterCantons);
		if (filterStatuts.length > 0) q = q.in('statut', filterStatuts);
		else if (!showTransferred) q = q.neq('statut', 'transfere');
		if (filterTemperatures.length > 0) {
			const ranges: string[] = [];
			if (filterTemperatures.includes('chaud')) ranges.push('score_pertinence.gte.7');
			if (filterTemperatures.includes('tiede')) ranges.push('and(score_pertinence.gte.4,score_pertinence.lte.6)');
			if (filterTemperatures.includes('froid')) ranges.push('score_pertinence.lte.3');
			if (ranges.length > 0) q = q.or(ranges.join(','));
		}
		return q;
	};

	let rows: Record<string, unknown>[] = [];
	let totalMatching = 0; // total filtré réel (avant cap), pour détecter une troncature.
	if (!sourceFilterIncompatible) {
		if (search) {
			// Recherche sûre : 3 .ilike() en parallèle + Set dédup (pas de mini-DSL .or()
			// interpolé, cf. memory/feedback_postgrest_or_filter_injection.md). On échappe
			// les 3 wildcards SQL ilike (% _ \).
			const escaped = search.replace(/[%_\\]/g, (c) => `\\${c}`);
			const queries = SEARCH_FIELDS.map((field) =>
				buildBaseQuery().ilike(field, `%${escaped}%`).order(sortKey, { ascending: sortAsc }).limit(MAX_EXPORT)
			);
			const results = await Promise.all(queries);
			const firstError = results.find((r) => r.error)?.error;
			if (firstError) {
				console.error('[export prospection] erreur Supabase (recherche)', firstError);
				throw error(500, 'Erreur lors de la récupération des données');
			}
			const seen = new Set<string>();
			for (const r of results) {
				for (const row of (r.data ?? []) as unknown as Record<string, unknown>[]) {
					const id = String(row.id);
					if (!seen.has(id)) {
						seen.add(id);
						rows.push(row);
					}
				}
			}
			// Union dédupée AVANT cap (proxy : chaque .ilike est déjà capé à MAX_EXPORT).
			totalMatching = rows.length;
			rows = rows.slice(0, MAX_EXPORT);
		} else {
			const { data, error: dbError, count } = await buildBaseQuery()
				.order(sortKey, { ascending: sortAsc })
				.limit(MAX_EXPORT);
			if (dbError) {
				console.error('[export prospection] erreur Supabase', dbError);
				throw error(500, 'Erreur lors de la récupération des données');
			}
			rows = (data ?? []) as unknown as Record<string, unknown>[];
			totalMatching = count ?? rows.length;
		}
	}

	const csv = toCsv(rows, LEADS_EXPORT_COLUMNS);
	// BOM UTF-8 (Excel). Version du schéma dans le header X-Export-Schema-Version.
	const body = '\ufeff' + csv;

	const headers = csvResponseHeaders(csvFilename('prospection'));
	// « No silent caps » : si le filtre dépasse le plafond, l'export tronque — on le
	// signale (header + log serveur). Le bouton UI avertit aussi quand totalLeads > cap.
	// Au volume actuel (< 200 leads) ce cas ne se déclenche pas ; garde-fou pour l'échelle.
	if (totalMatching > MAX_EXPORT) {
		headers.set('X-Export-Truncated', '1');
		headers.set('X-Export-Total', String(totalMatching));
		console.warn(`[export prospection] export tronqué : ${rows.length}/${totalMatching} lignes (cap ${MAX_EXPORT})`);
	}

	return new Response(body, { status: 200, headers });
};
