import type { PageServerLoad } from './$types';
import type {
	Actionability,
	GeoScope,
	Segment,
	Theme,
	IntelligenceItem
} from '$lib/server/intelligence/schema';
import { normalizeStoredChips } from '$lib/server/intelligence/chip-normalize';
import { loadFallbackPool, pickFallback } from '$lib/server/veille-fallback';
import { env as publicEnv } from '$env/dynamic/public';

// Item aplati pour le fil chronologique : 1 ligne de DB -> N items individuels.
export type FeedItem = IntelligenceItem & {
	report_id: string;
	report_week_label: string;
	report_generated_at: string;
	report_compliance_tag: string;
	is_unread: boolean;
	// Drapeaux calculés serveur
	is_hot: boolean;
	recurrence_count: number;
	// Filtres dérivés (geo_scope normalisé pour badge court)
	geo_label: string;
	// URL fallback media_library si image_url manquante/invalide (Bloc 6bis)
	fallback_image_url: string | null;
};

export type FacetCounts = {
	total: number;
	actionability: Record<Actionability, number>;
	segment: Record<Segment, number>;
	geo: Record<string, number>;
	theme: Record<Theme, number>;
	hot: number;
	recurrent: number;
};

const SEG_DEFAULTS: Segment = 'tertiaire';
const ACT_DEFAULTS: Actionability = 'a_surveiller';

function geoToLabel(geo: GeoScope): string {
	if (geo === 'suisse_romande') return 'Romandie';
	if (geo === 'suisse') return 'CH';
	return 'Monde';
}

/**
 * Fingerprint simplifié du titre pour détecter récurrence : lowercase, retire
 * mots outils courts, garde les 4 premiers mots significatifs. Pas parfait mais
 * suffisant pour l'heuristique "×N".
 */
function titleFingerprint(title: string): string {
	const stop = new Set([
		'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'a', 'à', 'au', 'aux',
		'et', 'ou', 'pour', 'sur', 'dans', 'par', 'en', 'se', 'sa', 'son', 'ses'
	]);
	return title
		.toLowerCase()
		.replace(/[^a-zàâäéèêëîïôöùûüç0-9\s]/g, ' ')
		.split(/\s+/)
		.filter((w) => w.length >= 3 && !stop.has(w))
		.slice(0, 4)
		.join(' ');
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = await locals.safeGetSession();

	const showArchives = url.searchParams.get('archives') === '1';

	let query = locals.supabase
		.from('intelligence_reports')
		.select(
			'id, week_label, generated_at, compliance_tag, executive_summary, items, items_hidden, archived_at, status'
		)
		.eq('status', 'published')
		.order('generated_at', { ascending: false });

	if (!showArchives) {
		query = query.is('archived_at', null);
	}

	const { data: reports } = await query;

	// Lectures user courant
	let readIds = new Set<string>();
	if (user && reports) {
		const ids = reports.map((r) => r.id);
		const { data: reads } = await locals.supabase
			.from('intelligence_reads')
			.select('report_id')
			.eq('user_id', user.id)
			.in('report_id', ids);
		readIds = new Set((reads ?? []).map((r) => r.report_id));
	}

	// Pool fallback media_library (1 seule query pour tous les items)
	const fallbackPool = await loadFallbackPool(locals.supabase, publicEnv.PUBLIC_SUPABASE_URL ?? '');

	// Aplatir et enrichir
	const now = Date.now();
	const sevenDaysMs = 7 * 24 * 3600 * 1000;
	const fingerprintCounts = new Map<string, number>();
	const eightWeeksMs = 8 * 7 * 24 * 3600 * 1000;

	// 1er passage : compter fingerprints dans fenêtre 8 semaines
	for (const r of reports ?? []) {
		const ageMs = now - new Date(r.generated_at).getTime();
		if (ageMs > eightWeeksMs) continue;
		const items = (r.items ?? []) as IntelligenceItem[];
		for (const it of items) {
			const fp = titleFingerprint(it.title ?? '');
			if (fp) fingerprintCounts.set(fp, (fingerprintCounts.get(fp) ?? 0) + 1);
		}
	}

	const feed: FeedItem[] = [];
	for (const r of reports ?? []) {
		const hidden = (r.items_hidden ?? []) as Array<{ rank: number }>;
		const hiddenRanks = new Set(hidden.map((h) => h.rank));
		const items = (r.items ?? []) as IntelligenceItem[];
		const ageMs = now - new Date(r.generated_at).getTime();

		for (const raw of items) {
			if (hiddenRanks.has(raw.rank)) continue;

			// Rétro-compat anciennes éditions : champs refonte absents -> défauts
			const item: IntelligenceItem = {
				...raw,
				segment: raw.segment ?? SEG_DEFAULTS,
				actionability: raw.actionability ?? ACT_DEFAULTS,
				search_terms: normalizeStoredChips(raw.search_terms) as unknown as IntelligenceItem['search_terms']
			};

			const fp = titleFingerprint(item.title ?? '');
			const recurrence = fp ? fingerprintCounts.get(fp) ?? 1 : 1;
			const isHot =
				item.actionability === 'action_directe' &&
				ageMs <= sevenDaysMs &&
				item.geo_scope === 'suisse_romande';

			const fallback = pickFallback(
				fallbackPool,
				item.segment,
				`${r.id}-${item.rank}`
			);

			feed.push({
				...item,
				report_id: r.id,
				report_week_label: r.week_label,
				report_generated_at: r.generated_at,
				report_compliance_tag: r.compliance_tag,
				is_unread: !readIds.has(r.id),
				is_hot: isHot,
				recurrence_count: recurrence,
				geo_label: geoToLabel(item.geo_scope),
				fallback_image_url: fallback
			});
		}
	}

	// Tri : generated_at DESC, rank ASC
	feed.sort((a, b) => {
		if (a.report_generated_at !== b.report_generated_at) {
			return a.report_generated_at < b.report_generated_at ? 1 : -1;
		}
		return a.rank - b.rank;
	});

	// Counts sur le set complet (non filtré par URL)
	const facets: FacetCounts = {
		total: feed.length,
		actionability: { action_directe: 0, veille_active: 0, a_surveiller: 0 },
		segment: { tertiaire: 0, residentiel: 0, commerces: 0, erp: 0, partenaires: 0 },
		geo: {},
		theme: {
			films_solaires: 0,
			films_securite: 0,
			discretion_smartfilm: 0,
			batiment_renovation: 0,
			ia_outils: 0,
			reglementation: 0,
			autre: 0
		},
		hot: 0,
		recurrent: 0
	};
	for (const f of feed) {
		facets.actionability[f.actionability]++;
		facets.segment[f.segment]++;
		facets.geo[f.geo_label] = (facets.geo[f.geo_label] ?? 0) + 1;
		facets.theme[f.theme]++;
		if (f.is_hot) facets.hot++;
		if (f.recurrence_count >= 2) facets.recurrent++;
	}

	// Filtrage selon URL params
	const actionabilityFilter = url.searchParams.get('pertinence') as Actionability | null;
	const segmentFilter = url.searchParams.get('segment') as Segment | null;
	const geoFilter = url.searchParams.get('geo');
	const themeFilter = url.searchParams.get('theme') as Theme | null;
	const hotOnly = url.searchParams.get('hot') === '1';
	const recurrentOnly = url.searchParams.get('recurrent') === '1';

	const filtered = feed.filter((f) => {
		if (actionabilityFilter && f.actionability !== actionabilityFilter) return false;
		if (segmentFilter && f.segment !== segmentFilter) return false;
		if (geoFilter && f.geo_label !== geoFilter) return false;
		if (themeFilter && f.theme !== themeFilter) return false;
		if (hotOnly && !f.is_hot) return false;
		if (recurrentOnly && f.recurrence_count < 2) return false;
		return true;
	});

	return {
		feed: filtered,
		facets,
		filters: {
			pertinence: actionabilityFilter,
			segment: segmentFilter,
			geo: geoFilter,
			theme: themeFilter,
			hot: hotOnly,
			recurrent: recurrentOnly,
			archives: showArchives
		}
	};
};
