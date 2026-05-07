import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, parent }) => {
	const { user } = await parent();

	if (!user) return { unreadIntelligence: 0 };

	// Compter les éditions publiées non lues par l'user courant
	const { count: totalPublished } = await locals.supabase
		.from('intelligence_reports')
		.select('id', { count: 'exact', head: true })
		.eq('status', 'published');

	const { count: readCount } = await locals.supabase
		.from('intelligence_reads')
		.select('report_id', { count: 'exact', head: true })
		.eq('user_id', user.id);

	const unreadIntelligence = Math.max(0, (totalPublished ?? 0) - (readCount ?? 0));

	return { unreadIntelligence };
};
