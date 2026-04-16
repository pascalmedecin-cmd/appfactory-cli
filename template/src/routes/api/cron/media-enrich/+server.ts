import { json, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { timingSafeEqual } from 'crypto';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import { enrichLibrary, summarize } from '$lib/server/media-enrich';

function verifyCronSecret(authHeader: string | null): boolean {
	const secret = env.CRON_SECRET;
	if (!secret || !authHeader) return false;
	const expected = `Bearer ${secret}`;
	if (authHeader.length !== expected.length) return false;
	return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
}

/**
 * Cron hebdo (jeudi 8h UTC) : enrichit la bibliothèque photo FilmPro depuis
 * Pexels + Unsplash. Par défaut : tous les segments, 2 images / query / source.
 * Dedup idempotent via content_hash.
 */
export async function GET({ request }: RequestEvent) {
	if (!verifyCronSecret(request.headers.get('authorization'))) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const supabase = createSupabaseServiceClient();

	try {
		const reports = await enrichLibrary(supabase, {
			perQuery: 2,
			sources: ['pexels', 'unsplash'],
			unsplashKey: env.UNSPLASH_ACCESS_KEY,
			pexelsKey: env.PEXELS_API_KEY
		});
		const summary = summarize(reports);

		const errors = reports.flatMap((r) => r.errors);
		if (errors.length > 0) {
			console.warn('[media-enrich] erreurs :', errors.slice(0, 10));
		}

		return json({ ok: true, summary, reports });
	} catch (e) {
		console.error('[media-enrich] fatal :', e);
		return json({ error: 'enrich_failed', detail: (e as Error).message }, { status: 500 });
	}
}
