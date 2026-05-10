import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, parent }) => {
	const { user } = await parent();

	if (!user) return { unreadIntelligence: 0 };

	// Audit 360 V2b H-08 + bug-hunter F4 : aligner le compteur unread sidebar
	// avec les cards affichées dans `/veille` (filtre `archived_at IS NULL`)
	// ET aligner les reads sur les mêmes ids actifs. Sans filtre côté reads,
	// le drift est permanent : si user a lu une édition puis qu'elle est
	// archivée, sa row `intelligence_reads` reste, faussant le delta.
	const { data: activeReports } = await locals.supabase
		.from('intelligence_reports')
		.select('id')
		.eq('status', 'published')
		.is('archived_at', null);

	const activeIds = (activeReports ?? []).map((r) => r.id);
	const totalActive = activeIds.length;

	if (totalActive === 0) return { unreadIntelligence: 0 };

	const { count: readCount } = await locals.supabase
		.from('intelligence_reads')
		.select('report_id', { count: 'exact', head: true })
		.eq('user_id', user.id)
		.in('report_id', activeIds);

	const unreadIntelligence = Math.max(0, totalActive - (readCount ?? 0));

	return { unreadIntelligence };
};
