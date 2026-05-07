import { json, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { timingSafeEqual } from 'crypto';
import { runWeeklyGeneration } from '$lib/server/intelligence/run-generation';
import { buildVeilleDepsFromEnvObject } from '$lib/server/intelligence/deps';

// Vercel Hobby max 300s. Pipeline doit fit dedans (Phase 1+2 Opus + N items
// avec brief Sonnet + fal.ai + Vision Sonnet en parallèle concurrence=3).
//
// Note S167 : preuve directe S166 (HTTP 504 FUNCTION_INVOCATION_TIMEOUT à
// 301.4s sur rerun manuel) que le pipeline Anthropic streaming peut dépasser
// 300s, donc ce cron récidive timeout chaque vendredi. Solution structurelle =
// externaliser vers GitHub Actions cron (Bloc #2 S167). Ce handler reste vivant
// le temps de la transition, mais le cron Vercel sera désactivé dans `vercel.json`
// dès que le workflow GHA aura tourné une fois en prod.
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
		// Construction des deps depuis l'env SvelteKit. `PUBLIC_SUPABASE_URL`
		// vient du scope public, le reste du privé. La factory `buildVeilleDepsFromEnvObject`
		// est partagée avec le script standalone (cf. scripts/run-veille.ts) :
		// même validation, même messages d'erreur, source unique.
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
