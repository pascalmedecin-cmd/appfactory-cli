import { json, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createSupabaseServerClient } from '$lib/server/supabase';
import { timingSafeEqual } from 'crypto';

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

	const supabase = createSupabaseServerClient(event.cookies);
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
			const heuresDepuis = (Date.now() - dernierCheck.getTime()) / (1000 * 60 * 60);

			if (rech.frequence_alerte === 'quotidien' && heuresDepuis < 20) continue;
			if (rech.frequence_alerte === 'hebdomadaire' && heuresDepuis < 140) continue;
		}

		// Construire la requete de comptage des nouveaux leads
		let query = supabase
			.from('prospect_leads')
			.select('*', { count: 'exact', head: true })
			.eq('statut', 'nouveau');

		// Filtrer par date depuis le dernier check
		if (rech.dernier_check) {
			query = query.gte('date_import', rech.dernier_check);
		}

		// Filtrer par criteres de la recherche
		if (rech.sources && rech.sources.length > 0) {
			query = query.in('source', rech.sources);
		}
		if (rech.cantons && rech.cantons.length > 0) {
			query = query.in('canton', rech.cantons);
		}
		if (rech.score_minimum) {
			query = query.gte('score_pertinence', rech.score_minimum);
		}

		const { count } = await query;
		const nbNouveaux = count ?? 0;
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
