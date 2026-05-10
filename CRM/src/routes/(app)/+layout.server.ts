import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, parent }) => {
	const { user } = await parent();

	if (!user) return { unreadIntelligence: 0 };

	// Audit 360 V2b H-08 : aligner le compteur unread sidebar avec les cards
	// affichées dans `/veille/+page.server.ts` (filtre `archived_at IS NULL`).
	// Avant le fix : SELECT count(*) sur tous les published → badge sidebar
	// supérieur au nombre de cards visibles (5 vs 7) si 2 éditions étaient
	// archivées.
	const { count: totalPublished } = await locals.supabase
		.from('intelligence_reports')
		.select('id', { count: 'exact', head: true })
		.eq('status', 'published')
		.is('archived_at', null);

	// Côté reads : on ne contraint pas avec un IN(report_ids) car
	// (a) cela ferait un round-trip supplémentaire pour récupérer les ids,
	// (b) lire une édition puis l'archiver garde la lecture en base ; le delta
	//     reste cohérent (max(0, …) absorbe le cas où readCount > totalPublished
	//     transitoire pendant un archivage).
	const { count: readCount } = await locals.supabase
		.from('intelligence_reads')
		.select('report_id', { count: 'exact', head: true })
		.eq('user_id', user.id);

	const unreadIntelligence = Math.max(0, (totalPublished ?? 0) - (readCount ?? 0));

	return { unreadIntelligence };
};
