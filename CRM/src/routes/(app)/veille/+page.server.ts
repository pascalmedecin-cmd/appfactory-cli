import type { PageServerLoad } from './$types';
import type {
	Actionability,
	Segment,
	IntelligenceItem
} from '$lib/server/intelligence/schema';
import { normalizeStoredChips } from '$lib/server/intelligence/chip-normalize';

/**
 * Édition magazine = 1 édition hebdomadaire avec son résumé exécutif et un
 * preview des 3 premiers items. Le détail complet vit dans /veille/[id].
 */
export type EditionPreviewItem = Pick<
	IntelligenceItem,
	'rank' | 'title' | 'segment' | 'actionability'
> & {
	is_update?: boolean;
};

export type EditionCard = {
	id: string;
	week_label: string;
	generated_at: string;
	compliance_tag: string;
	executive_summary: string;
	is_unread: boolean;
	items_total: number;
	preview: EditionPreviewItem[];
};

const SEG_DEFAULTS: Segment = 'tertiaire';
const ACT_DEFAULTS: Actionability = 'a_surveiller';
const PREVIEW_COUNT = 3;
const EDITIONS_LIMIT = 3;

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();

	// Charge les 3 dernières éditions publiées non-archivées (ordre décroissant).
	const { data: reports } = await locals.supabase
		.from('intelligence_reports')
		.select(
			'id, week_label, generated_at, compliance_tag, executive_summary, items, items_hidden'
		)
		.eq('status', 'published')
		.is('archived_at', null)
		.order('generated_at', { ascending: false })
		.limit(EDITIONS_LIMIT);

	// Lectures user courant.
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

	const editions: EditionCard[] = [];
	for (const r of reports ?? []) {
		const hidden = (r.items_hidden ?? []) as Array<{ rank: number }>;
		const hiddenRanks = new Set(hidden.map((h) => h.rank));
		const items = ((r.items ?? []) as Array<IntelligenceItem & { is_update?: boolean }>)
			.filter((it) => !hiddenRanks.has(it.rank))
			.map((raw) => ({
				...raw,
				segment: raw.segment ?? SEG_DEFAULTS,
				actionability: raw.actionability ?? ACT_DEFAULTS,
				search_terms: normalizeStoredChips(
					raw.search_terms
				) as unknown as IntelligenceItem['search_terms']
			}))
			.sort((a, b) => a.rank - b.rank);

		editions.push({
			id: r.id,
			week_label: r.week_label,
			generated_at: r.generated_at,
			compliance_tag: r.compliance_tag,
			executive_summary: r.executive_summary,
			is_unread: !readIds.has(r.id),
			items_total: items.length,
			preview: items.slice(0, PREVIEW_COUNT).map((it) => ({
				rank: it.rank,
				title: it.title,
				segment: it.segment,
				actionability: it.actionability,
				is_update: it.is_update === true
			}))
		});
	}

	return { editions };
};
