import { json, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import { matchMotsCles } from '$lib/text-utils';
import { config } from '$lib/config';
import { timingSafeEqual } from 'crypto';
import { buildScoreFilter, type ScoreFilterPlan, type ScoreThresholds } from './score-filter';
import { HOUR_MS } from '$lib/utils/time-constants';

// Seuils de température : source unique config.scoring.labels.
// chaud >= CHAUD_MIN, tiede dans [TIEDE_MIN, CHAUD_MIN-1], froid < TIEDE_MIN.
const CHAUD_MIN = config.scoring.labels.chaud;
const TIEDE_MIN = config.scoring.labels.tiede;
const FROID_MAX = TIEDE_MIN - 1;
const TIEDE_MAX = CHAUD_MIN - 1;
const SCORE_THRESHOLDS: ScoreThresholds = {
	chaudMin: CHAUD_MIN,
	tiedeMin: TIEDE_MIN,
	tiedeMax: TIEDE_MAX,
	froidMax: FROID_MAX,
};

// Audit 360 M-52 : applique le plan de filtrage température (calculé par `buildScoreFilter`)
// au query builder PostgREST. Dé-duplique les deux branches (mots-clés / count seul).
function applyScoreFilter<Q extends { gte(c: string, v: number): Q; lte(c: string, v: number): Q; or(e: string): Q }>(
	query: Q,
	plan: ScoreFilterPlan | null
): Q {
	if (!plan) return query;
	switch (plan.mode) {
		case 'gte':
			return query.gte('score_pertinence', plan.gte);
		case 'lte':
			return query.lte('score_pertinence', plan.lte);
		case 'between':
			return query.gte('score_pertinence', plan.gte).lte('score_pertinence', plan.lte);
		case 'or':
			return query.or(plan.orExpr);
	}
}

function verifyCronSecret(authHeader: string | null): boolean {
	const secret = env.CRON_SECRET;
	if (!secret || !authHeader) return false;
	const expected = `Bearer ${secret}`;
	if (authHeader.length !== expected.length) return false;
	return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
}

/**
 * Cron endpoint: execute les recherches sauvegardees avec alertes actives.
 * Compare les leads importes depuis le dernier check.
 * Met a jour nb_nouveaux pour affichage dashboard.
 *
 * Securise par CRON_SECRET (Vercel cron ou appel manuel).
 */
export async function GET(event: RequestEvent) {
	// Verifier le secret cron (timing-safe)
	const authHeader = event.request.headers.get('authorization');
	if (!verifyCronSecret(authHeader)) {
		return json({ error: 'Non autorise' }, { status: 401 });
	}

	const supabase = createSupabaseServiceClient();
	const now = new Date().toISOString();

	// Charger les recherches avec alerte active
	const { data: recherches, error: rechErr } = await supabase
		.from('recherches_sauvegardees')
		.select('*')
		.eq('alerte_active', true);

	if (rechErr) {
		console.error('Erreur chargement recherches sauvegardees:', rechErr.message);
		return json({ error: 'Erreur interne' }, { status: 500 });
	}
	if (!recherches || recherches.length === 0) {
		return json({ message: 'Aucune alerte active', checked: 0 });
	}

	let totalNouveaux = 0;

	for (const rech of recherches) {
		// Determiner si on doit checker (frequence)
		if (rech.dernier_check) {
			const dernierCheck = new Date(rech.dernier_check);
			const heuresDepuis = (Date.now() - dernierCheck.getTime()) / HOUR_MS;

			// Audit 360 V3b L-10 : seuils volontairement < 24h / < 168h (et non pile).
			// Marge de jitter du planificateur Vercel (le cron peut se déclencher un peu
			// tôt). Sans cette marge, un run quotidien qui s'exécute à H-23h59 serait sauté
			// jusqu'au lendemain → une journée entière sans check. 20h / 140h = ~4h / ~28h
			// de tolérance, suffisant pour absorber tout décalage de scheduling.
			if (rech.frequence_alerte === 'quotidien' && heuresDepuis < 20) continue;
			if (rech.frequence_alerte === 'hebdomadaire' && heuresDepuis < 140) continue;
		}

		const hasMotsCles = rech.mots_cles && rech.mots_cles.length > 0;

		let nbNouveaux: number;

		if (hasMotsCles) {
			// Mots-clés présents : récupérer les champs texte pour filtrage JS
			let query = supabase
				.from('prospect_leads')
				.select('raison_sociale,description,secteur_detecte')
				.eq('statut', 'nouveau');

			if (rech.dernier_check) query = query.gte('date_import', rech.dernier_check);
			if (rech.sources && rech.sources.length > 0) query = query.in('source', rech.sources);
			if (rech.cantons && rech.cantons.length > 0) query = query.in('canton', rech.cantons);
			if (rech.score_minimum) query = query.gte('score_pertinence', rech.score_minimum);
			query = applyScoreFilter(query, buildScoreFilter(rech.temperatures, SCORE_THRESHOLDS));

			const { data: leads } = await query;
			nbNouveaux = (leads ?? []).filter(lead =>
				matchMotsCles(rech.mots_cles!, [lead.raison_sociale, lead.description, lead.secteur_detecte])
			).length;
		} else {
			// Pas de mots-clés : count seul (plus performant)
			let query = supabase
				.from('prospect_leads')
				.select('*', { count: 'exact', head: true })
				.eq('statut', 'nouveau');

			if (rech.dernier_check) query = query.gte('date_import', rech.dernier_check);
			if (rech.sources && rech.sources.length > 0) query = query.in('source', rech.sources);
			if (rech.cantons && rech.cantons.length > 0) query = query.in('canton', rech.cantons);
			if (rech.score_minimum) query = query.gte('score_pertinence', rech.score_minimum);
			query = applyScoreFilter(query, buildScoreFilter(rech.temperatures, SCORE_THRESHOLDS));

			const { count } = await query;
			nbNouveaux = count ?? 0;
		}

		totalNouveaux += nbNouveaux;

		// Mettre a jour la recherche
		await supabase
			.from('recherches_sauvegardees')
			.update({
				dernier_check: now,
				nb_nouveaux: nbNouveaux,
			})
			.eq('id', rech.id);
	}

	return json({
		message: `${recherches.length} alerte(s) verifiee(s), ${totalNouveaux} nouveau(x) lead(s)`,
		checked: recherches.length,
		nouveaux: totalNouveaux,
	});
}
