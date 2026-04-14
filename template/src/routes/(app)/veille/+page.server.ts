import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();

	const { data: reports } = await locals.supabase
		.from('intelligence_reports')
		.select(
			'id, week_label, generated_at, compliance_tag, executive_summary, items, impacts_filmpro, search_terms, status, error_message'
		)
		.eq('status', 'published')
		.order('generated_at', { ascending: false })
		.limit(20);

	// Lectures de l'user courant (set des report_id lus)
	let readIds = new Set<string>();
	if (user) {
		const { data: reads } = await locals.supabase
			.from('intelligence_reads')
			.select('report_id')
			.eq('user_id', user.id);
		readIds = new Set((reads ?? []).map((r) => r.report_id));
	}

	return {
		reports: reports ?? [],
		readIds: Array.from(readIds)
	};
};
