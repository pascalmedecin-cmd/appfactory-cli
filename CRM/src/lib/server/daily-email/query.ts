/**
 * Lecture des relances dues pour le Daily Email (aujourd'hui + en retard).
 *
 * DEUX fenetres INDEPENDANTES (revue adversariale 26/06) : une requete « aujourd'hui »
 * (`>= today` et `< demain`) et une requete « en retard » (`< today`), chacune avec sa
 * propre limite d'affichage ET son compte exact. Un `.limit()` PARTAGE avec tri ascendant
 * ferait disparaitre silencieusement les relances du jour des que le stock de retards
 * (plus anciens, donc en tete du tri) depasse la limite - or c'est l'objectif premier de
 * l'email. `date_relance_prevue` est un `timestamptz` (cf. bug racine Vague 3.3) -> bornes
 * EXCLUSIVES via `nextDayIso`. Les compteurs (`{ count: 'exact' }`) sont decouples de la
 * slice affichee (cf. feedback_kpi_premium_global_aggregates : agregats globaux, pas la page).
 *
 * Aucune dependance au pipeline veille. Aucun appel LLM. Best-effort : JAMAIS de throw
 * (champ `{error}` OU promesse rejetee -> retour vide + message assaini).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';
import type { TacheDue } from '$lib/utils/dashboardTemporel';
import { nextDayIso } from '$lib/utils/dashboardTemporel';
import { ETAPES_PIPELINE_CLOSED } from '$lib/schemas';
import { sanitizeForLog } from '$lib/server/intelligence/sanitize';

/** Plafond d'items AFFICHES par section (au-dela : « + N autres »). Le compte total reste exact. */
export const DAILY_SECTION_CAP = 25;

// `etape_pipeline` est nullable : on inclut explicitement IS NULL (deal pas qualifie mais
// relance pertinente) en plus de NOT IN (clos). Identique a la requete du dashboard temporel.
const NOT_CLOSED = `etape_pipeline.is.null,etape_pipeline.not.in.(${ETAPES_PIPELINE_CLOSED.join(',')})`;

export interface DueRelances {
	/** Relances du jour a afficher (cappees a DAILY_SECTION_CAP). */
	today: TacheDue[];
	/** Relances en retard a afficher (cappees a DAILY_SECTION_CAP). */
	late: TacheDue[];
	/** Compte EXACT des relances du jour (peut depasser la liste affichee). */
	todayTotal: number;
	/** Compte EXACT des relances en retard. */
	lateTotal: number;
	/** Message d'erreur assaini si la lecture a echoue, sinon null. */
	error: string | null;
}

function emptyResult(error: string | null): DueRelances {
	return { today: [], late: [], todayTotal: 0, lateTotal: 0, error };
}

/**
 * Charge les relances dues en deux fenetres (aujourd'hui + en retard), deals clos exclus.
 * `todayIso` = `YYYY-MM-DD`. Compte exact par fenetre. Best-effort : toute erreur (champ
 * `{error}` OU promesse rejetee) -> resultat vide + message assaini, jamais de throw.
 */
export async function fetchDueRelances(
	supabase: SupabaseClient<Database>,
	todayIso: string
): Promise<DueRelances> {
	try {
		const [todayRes, lateRes] = await Promise.all([
			supabase
				.from('opportunites')
				.select(
					'id, titre, etape_pipeline, date_relance_prevue, entreprise:entreprises!opportunites_entreprise_id_fkey(raison_sociale)',
					{ count: 'exact' }
				)
				.gte('date_relance_prevue', todayIso)
				.lt('date_relance_prevue', nextDayIso(todayIso))
				.or(NOT_CLOSED)
				.order('date_relance_prevue', { ascending: true })
				.limit(DAILY_SECTION_CAP),
			supabase
				.from('opportunites')
				.select(
					'id, titre, etape_pipeline, date_relance_prevue, entreprise:entreprises!opportunites_entreprise_id_fkey(raison_sociale)',
					{ count: 'exact' }
				)
				.lt('date_relance_prevue', todayIso)
				.or(NOT_CLOSED)
				.order('date_relance_prevue', { ascending: true })
				.limit(DAILY_SECTION_CAP)
		]);

		if (todayRes.error) return emptyResult(sanitizeForLog(todayRes.error.message));
		if (lateRes.error) return emptyResult(sanitizeForLog(lateRes.error.message));

		const today = normalizeTaches(todayRes.data ?? []);
		const late = normalizeTaches(lateRes.data ?? []);
		return {
			today,
			late,
			todayTotal: todayRes.count ?? today.length,
			lateTotal: lateRes.count ?? late.length,
			error: null
		};
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return emptyResult(sanitizeForLog(msg));
	}
}

/**
 * Normalise les lignes PostgREST en `TacheDue` : l'embed entreprise to-one peut arriver
 * en tableau (PostgREST) -> on aplatit en prenant `[0]`, et on force `null` (jamais
 * `undefined`) pour coller au contrat `TacheDue` et a la normalisation du load dashboard
 * (proprietaire unique : on copie la logique, on ne mute pas la source).
 */
function normalizeTaches(rows: unknown[]): TacheDue[] {
	return rows.map((r) => {
		const row = r as {
			id: string;
			titre: string | null;
			etape_pipeline: string | null;
			date_relance_prevue: string | null;
			entreprise:
				| { raison_sociale: string | null }
				| { raison_sociale: string | null }[]
				| null;
		};
		const ent = Array.isArray(row.entreprise)
			? (row.entreprise[0] ?? null)
			: (row.entreprise ?? null);
		return {
			id: row.id,
			titre: row.titre,
			etape_pipeline: row.etape_pipeline,
			date_relance_prevue: row.date_relance_prevue,
			entreprise: ent
		};
	});
}
