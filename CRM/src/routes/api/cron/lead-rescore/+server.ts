// Phase E : cron quotidien qui recalcule le score des leads dont au moins un
// signal Veille est dans la fenêtre de décroissance, ou vient juste de sortir.
//
// Pourquoi : le bonus Veille décroît dans le temps (cf. SIGNAL_VEILLE_SCORING.decayWeeks).
// Sans recalcul périodique, un lead reste figé à son score d'origine alors que
// le bonus aurait dû tomber. Ce cron rejoue calculerScore() en utilisant
// signal_generated_at pour calculer weeksSince à la date courante.
//
// Idempotent : si rien n'a changé, le score reste identique.
// Stratégie : on cible les leads avec signaux datant de < (decayWeeks + 1) semaines
// pour balayer la fenêtre + 1 semaine de transition.

import { json, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import { recomputeLeadScoresBatch } from '$lib/server/intelligence/recompute-score';
import { SIGNAL_VEILLE_SCORING } from '$lib/scoring';
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

	const supabase = createSupabaseServiceClient();

	// Fenêtre = decayWeeks + 1 semaine de transition (pour faire tomber le bonus
	// chez les leads qui viennent de franchir le seuil).
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - (SIGNAL_VEILLE_SCORING.decayWeeks + 1) * 7);

	const { data: rows, error } = await supabase
		.from('prospect_lead_signals')
		.select('lead_id')
		.gte('signal_generated_at', cutoff.toISOString());

	if (error) {
		console.error('[cron lead-rescore] erreur lecture signaux', error.message);
		return json({ error: 'Erreur interne' }, { status: 500 });
	}

	const leadIds = [...new Set((rows ?? []).map((r: { lead_id: string }) => r.lead_id))];

	if (leadIds.length === 0) {
		return json({ message: 'Aucun lead à recalculer.', recalculated: 0 });
	}

	const { updated, failed } = await recomputeLeadScoresBatch(supabase, leadIds);

	return json({
		message: `${updated} lead(s) recalculé(s), ${failed} échec(s).`,
		recalculated: updated,
		failed,
		candidates: leadIds.length
	});
}
