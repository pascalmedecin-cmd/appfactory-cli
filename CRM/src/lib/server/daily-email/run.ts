/**
 * Orchestrateur du Daily Email CRM : lecture relances -> envoi.
 *
 * Deterministe de bout en bout (lecture DB + helpers purs + Resend) : AUCUN appel LLM,
 * conforme a la regle dure « zero nouveau script LLM » (le weekly veille reste la seule
 * exception actee). Best-effort : ne propage jamais d'exception.
 *
 * Court-circuit gate : si OFF (ou cle/destinataires manquants), retourne immediatement
 * sans toucher la DB (cout zero). Cas vide (decision Pascal 26/06) : si rien d'urgent
 * (0 en retard ET 0 aujourd'hui), aucun envoi - zero bruit les jours calmes.
 *
 * Taxonomie de retour : `skipped:true` = non-envoi VOLONTAIRE (gate off, cle/destinataire
 * absent, cas vide) ; `skipped:false && sent:false` = PANNE (erreur DB ou echec Resend).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';
import { fetchDueRelances } from './query';
import { sendDailyEmail } from './send';
import type { EmailDailyConfig } from './config';

export interface DailyDigestResult {
	/** Email reellement envoye (Resend a accepte). */
	sent: boolean;
	/** Non-envoi VOLONTAIRE (gate off / cle ou destinataire absent / cas vide). */
	skipped: boolean;
	/** Motif lisible (logs / reponse cron). */
	reason: string;
	/** Compteurs EXACTS du jour (toujours presents, meme a 0). */
	counts: { today: number; late: number };
	/** Id Resend si envoye. */
	resendId?: string;
}

const NO_COUNTS = { today: 0, late: 0 };

export async function runDailyDigest(
	supabase: SupabaseClient<Database>,
	config: EmailDailyConfig,
	now: Date = new Date()
): Promise<DailyDigestResult> {
	// Gate court-circuit : OFF / mal configure -> aucun acces DB, aucun envoi (cout zero).
	if (!config.enabled) {
		return { sent: false, skipped: true, reason: 'EMAIL_DAILY_ENABLED=false', counts: NO_COUNTS };
	}
	if (!config.apiKey) {
		return { sent: false, skipped: true, reason: 'RESEND_API_KEY manquante', counts: NO_COUNTS };
	}
	if (!config.to.length) {
		return { sent: false, skipped: true, reason: 'aucun destinataire daily', counts: NO_COUNTS };
	}

	// `today` en UTC : le cron tourne tot le matin UTC (05:00 = 07:00 CH ete), la date UTC
	// du jour coincide alors avec la date suisse. La borne `.lt('YYYY-MM-DD')` caste en
	// timestamptz a la session TZ Postgres (UTC par defaut Supabase). Ce couplage
	// (horaire matinal UTC + session UTC) est requis ; tout horaire UTC tardif imposerait
	// un calcul de date en Europe/Zurich.
	const todayIso = now.toISOString().slice(0, 10);

	const { today, late, todayTotal, lateTotal, error } = await fetchDueRelances(supabase, todayIso);
	if (error) {
		// Panne de lecture = echec, pas un skip volontaire (taxonomie monitoring).
		return { sent: false, skipped: false, reason: `lecture relances: ${error}`, counts: NO_COUNTS };
	}

	const counts = { today: todayTotal, late: lateTotal };

	// Cas vide : rien d'urgent -> on n'envoie pas (zero bruit, l'email garde sa valeur de signal).
	if (todayTotal === 0 && lateTotal === 0) {
		return { sent: false, skipped: true, reason: "rien d'urgent aujourd'hui", counts };
	}

	const result = await sendDailyEmail(
		{ today, late, todayTotal, lateTotal, todayIso, now },
		config
	);

	return {
		sent: result.ok,
		skipped: Boolean(result.skipped),
		reason: result.reason ?? (result.ok ? 'envoye' : 'echec'),
		counts,
		resendId: result.resendId
	};
}
