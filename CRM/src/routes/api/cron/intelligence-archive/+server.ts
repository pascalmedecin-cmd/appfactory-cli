import { json, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { timingSafeEqual } from 'crypto';
import { createSupabaseServiceClient } from '$lib/server/supabase';

function verifyCronSecret(authHeader: string | null): boolean {
	const secret = env.CRON_SECRET;
	if (!secret || !authHeader) return false;
	const expected = `Bearer ${secret}`;
	if (authHeader.length !== expected.length) return false;
	return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
}

/**
 * Cron quotidien 4h UTC : marque archived_at sur les éditions dont
 * generated_at < now - 365 jours. Le fil /veille filtre archived_at IS NULL
 * par défaut, les archivés ne s'affichent qu'avec ?archives=1.
 */
export async function GET({ request }: RequestEvent) {
	if (!verifyCronSecret(request.headers.get('authorization'))) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const supabase = createSupabaseServiceClient();
	const oneYearAgo = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString();
	const now = new Date().toISOString();

	const { data, error } = await supabase
		.from('intelligence_reports')
		.update({ archived_at: now })
		.is('archived_at', null)
		.lt('generated_at', oneYearAgo)
		.select('id, week_label');

	if (error) {
		return json({ error: 'update_failed', detail: error.message }, { status: 500 });
	}

	return json({ ok: true, archived_count: data?.length ?? 0, weeks: data?.map((r) => r.week_label) ?? [] });
}
