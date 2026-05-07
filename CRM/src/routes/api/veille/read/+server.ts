import { json, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';

const PayloadSchema = z.object({ report_id: z.string().uuid() });

export async function POST({ request, locals }: RequestEvent) {
	const { user } = await locals.safeGetSession();
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const parsed = PayloadSchema.safeParse(payload);
	if (!parsed.success) {
		return json({ error: 'report_id UUID requis' }, { status: 400 });
	}
	const reportId = parsed.data.report_id;

	const { error } = await locals.supabase
		.from('intelligence_reads')
		.upsert(
			{ user_id: user.id, report_id: reportId },
			{ onConflict: 'user_id,report_id', ignoreDuplicates: true }
		);

	if (error) {
		console.error('[veille read] upsert failed', error.message);
		return json({ error: 'DB error' }, { status: 500 });
	}

	return json({ ok: true });
}
