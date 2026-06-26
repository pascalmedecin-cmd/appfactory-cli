// Cron quotidien : Daily Email CRM (« Relances du jour »).
//
// Envoie aux fondateurs les relances dues (aujourd'hui + en retard) lues sur
// `opportunites`. 100% deterministe (lecture DB + template + Resend), AUCUN appel LLM
// (regle dure « zero nouveau script LLM » respectee). Independant du weekly veille : ce
// cron ne touche ni l'infra GHA du brief hebdo, ni les emails recap/brief.
//
// GATE OFF par defaut (consigne Pascal 25/06) : tant que EMAIL_DAILY_ENABLED !== 'true',
// `runDailyDigest` court-circuite AVANT tout acces DB et n'envoie rien. Activation =
// poser la variable d'env Vercel EMAIL_DAILY_ENABLED=true (zero redeploiement).
//
// Planifie a 05:00 UTC = 07:00 heure suisse d'ete (06:00 CH en hiver, comme tout le
// systeme cron du projet). Voir CRM/vercel.json.

import { json, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import { buildDailyEmailConfig } from '$lib/server/daily-email/config';
import { runDailyDigest } from '$lib/server/daily-email/run';
import { sanitizeError } from '$lib/server/intelligence/sanitize';
import { timingSafeEqual } from 'crypto';

function verifyCronSecret(authHeader: string | null): boolean {
	const secret = env.CRON_SECRET;
	if (!secret || !authHeader) return false;
	const expected = `Bearer ${secret}`;
	if (authHeader.length !== expected.length) return false;
	return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
}

export async function GET(event: RequestEvent) {
	if (!verifyCronSecret(event.request.headers.get('authorization'))) {
		return json({ error: 'Non autorisé' }, { status: 401 });
	}

	const config = buildDailyEmailConfig(env);

	try {
		const supabase = createSupabaseServiceClient();
		const result = await runDailyDigest(supabase, config);
		return json(result);
	} catch (e) {
		console.error('[cron daily-email] erreur inattendue', sanitizeError(e));
		return json({ error: 'Erreur interne' }, { status: 500 });
	}
}
