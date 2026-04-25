import { json, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { timingSafeEqual } from 'crypto';
import { runWeeklyGeneration } from '$lib/server/intelligence/run-generation';

// 800s : cap Pro plan Fluid Compute. Refonte 1-phase Opus 4.7 streaming
// peut tourner 5-10 min selon thinking adaptive + nombre de web_search.
// (Ancienne valeur 300 héritée du pipeline 2-phases + images supprimé S110.)
export const config = { maxDuration: 800 };

function verifyCronSecret(authHeader: string | null): boolean {
	const secret = env.CRON_SECRET;
	if (!secret || !authHeader) return false;
	const expected = `Bearer ${secret}`;
	if (authHeader.length !== expected.length) return false;
	return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
}

export async function GET({ request }: RequestEvent) {
	if (!verifyCronSecret(request.headers.get('authorization'))) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const result = await runWeeklyGeneration();
		if (!result.ok) {
			return json(
				{
					ok: false,
					weekLabel: result.weekLabel,
					error: result.error,
					reportId: result.reportId
				},
				{ status: 500 }
			);
		}
		return json(result);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error('[cron intelligence] exception', message);
		return json({ ok: false, error: message }, { status: 500 });
	}
}
