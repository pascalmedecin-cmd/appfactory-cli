import { json, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { timingSafeEqual } from 'crypto';
import { runWeeklyGeneration } from '$lib/server/intelligence/run-generation';

// Vercel Hobby max 300s. Pipeline doit fit dedans (Phase 1+2 Opus + N items
// avec brief Sonnet + fal.ai + Vision Sonnet en parallèle concurrence=3).
export const config = { maxDuration: 300 };

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
