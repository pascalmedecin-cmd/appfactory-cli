import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { user } = await locals.safeGetSession();

	const { data: report, error: dbErr } = await locals.supabase
		.from('intelligence_reports')
		.select('*')
		.eq('id', params.id)
		.maybeSingle();

	if (dbErr || !report) {
		throw error(404, 'Édition introuvable');
	}

	// Auto-mark as read pour l'user qui ouvre le détail
	if (user) {
		await locals.supabase
			.from('intelligence_reads')
			.upsert(
				{ user_id: user.id, report_id: report.id },
				{ onConflict: 'user_id,report_id', ignoreDuplicates: true }
			);
	}

	return { report };
};
