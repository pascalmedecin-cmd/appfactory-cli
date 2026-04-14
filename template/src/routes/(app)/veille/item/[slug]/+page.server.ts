import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { IntelligenceItem } from '$lib/server/intelligence/schema';

export const load: PageServerLoad = async ({ params, locals }) => {
	// slug = "<report_uuid>-<rank>"
	const match = params.slug.match(/^([0-9a-f-]{36})-(\d+)$/i);
	if (!match) throw error(404, 'Item introuvable');
	const reportId = match[1];
	const rank = parseInt(match[2], 10);

	const { data: report, error: err } = await locals.supabase
		.from('intelligence_reports')
		.select(
			'id, week_label, generated_at, compliance_tag, executive_summary, items, items_hidden, impacts_filmpro'
		)
		.eq('id', reportId)
		.maybeSingle();

	if (err || !report) throw error(404, 'Édition introuvable');

	const hidden = (report.items_hidden ?? []) as Array<{ rank: number }>;
	if (hidden.some((h) => h.rank === rank)) throw error(404, 'Signal retiré');

	const items = (report.items ?? []) as IntelligenceItem[];
	const item = items.find((it) => it.rank === rank);
	if (!item) throw error(404, 'Signal introuvable dans cette édition');

	return {
		item: {
			...item,
			segment: item.segment ?? 'tertiaire',
			actionability: item.actionability ?? 'a_surveiller',
			search_terms: item.search_terms ?? []
		} as IntelligenceItem,
		report: {
			id: report.id,
			week_label: report.week_label,
			generated_at: report.generated_at,
			compliance_tag: report.compliance_tag,
			executive_summary: report.executive_summary
		}
	};
};
