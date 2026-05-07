import { json, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { timingSafeEqual } from 'crypto';
import { runWeeklyGeneration } from '$lib/server/intelligence/run-generation';
import { buildVeilleDepsFromEnvObject } from '$lib/server/intelligence/deps';

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
		const deps = buildVeilleDepsFromEnvObject({
			PUBLIC_SUPABASE_URL: publicEnv.PUBLIC_SUPABASE_URL,
			SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
			ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
			EMAIL_RECAP_ENABLED: env.EMAIL_RECAP_ENABLED,
			RESEND_API_KEY: env.RESEND_API_KEY,
			EMAIL_RECAP_TO: env.EMAIL_RECAP_TO,
			EMAIL_RECAP_FROM: env.EMAIL_RECAP_FROM,
			VEILLE_ANTI_DOUBLONS_FROM: env.VEILLE_ANTI_DOUBLONS_FROM,
			VEILLE_WINDOW_DAYS: env.VEILLE_WINDOW_DAYS
		});

		const result = await runWeeklyGeneration(new Date(), deps);
		return json(result, { status: result.ok ? 200 : 500 });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error('[trigger intelligence] exception', message);
		return json({ ok: false, error: message }, { status: 500 });
	}
}
