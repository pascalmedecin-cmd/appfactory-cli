import { json, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { timingSafeEqual } from 'crypto';
import { runWeeklyGeneration } from '$lib/server/intelligence/run-generation';

// 800s : cap Pro plan Fluid Compute. Refonte 1-phase Opus 4.7 streaming
// peut tourner 5-10 min selon thinking adaptive + nombre de web_search.
export const config = { maxDuration: 800 };

function verifyBearer(authHeader: string | null): boolean {
	const secret = env.CRON_SECRET;
	if (!secret || !authHeader) return false;
	const expected = `Bearer ${secret}`;
	if (authHeader.length !== expected.length) return false;
	return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
}

/**
 * Trigger manuel de generation (pour tests humains avant activation cron).
 * Protection : meme CRON_SECRET que l'endpoint cron (simple et suffisant
 * pour un outil admin interne FilmPro).
 */
export async function POST({ request }: RequestEvent) {
	if (!verifyBearer(request.headers.get('authorization'))) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const result = await runWeeklyGeneration();
		return json(result, { status: result.ok ? 200 : 500 });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error('[trigger intelligence] exception', message);
		return json({ ok: false, error: message }, { status: 500 });
	}
}
