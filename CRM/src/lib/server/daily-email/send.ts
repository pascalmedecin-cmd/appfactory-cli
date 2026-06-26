/**
 * Envoi du Daily Email via Resend.
 *
 * Le bloc de transport (fetch POST vers api.resend.com/emails) est volontairement RECOPIE
 * ici plutot que factorise avec email-recap.ts / email-brief.ts : le garde-fou DUR
 * « ne jamais casser le weekly » impose de NE PAS editer ces fichiers valides. Ce bloc est
 * deja duplique 2x dans le repo ; une 3e copie isolee est l'option la plus sure (cf.
 * « un seul pilote par fichier »). Best-effort : toute erreur -> { ok:false, reason },
 * jamais d'exception propagee (un echec quotidien ne doit rien casser).
 */
import { buildDailyEmailPayload, type DailyEmailInput } from './template';
import type { EmailDailyConfig } from './config';
import { sanitizeForLog } from '$lib/server/intelligence/sanitize';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export interface SendDailyResult {
	ok: boolean;
	skipped?: boolean;
	reason?: string;
	resendId?: string;
}

/**
 * Envoi du daily via Resend. Config injectee. Gate en 3 checks (enabled / apiKey /
 * destinataires), puis envoi. Toutes les erreurs -> { ok:false, reason }, jamais de throw.
 */
export async function sendDailyEmail(
	input: DailyEmailInput,
	config: EmailDailyConfig
): Promise<SendDailyResult> {
	if (!config.enabled) {
		return { ok: false, skipped: true, reason: 'EMAIL_DAILY_ENABLED=false' };
	}
	if (!config.apiKey) {
		return { ok: false, skipped: true, reason: 'RESEND_API_KEY manquante' };
	}
	if (!config.to.length) {
		return { ok: false, skipped: true, reason: 'aucun destinataire daily' };
	}

	const { subject, html, text } = buildDailyEmailPayload(input);

	try {
		const res = await fetch(RESEND_ENDPOINT, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${config.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ from: config.from, to: config.to, subject, html, text })
		});
		if (!res.ok) {
			const body = await res.text();
			return { ok: false, reason: `Resend ${res.status}: ${sanitizeForLog(body).slice(0, 300)}` };
		}
		const payload = (await res.json()) as { id?: string };
		return { ok: true, resendId: payload.id };
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return { ok: false, reason: `fetch error: ${sanitizeForLog(msg)}` };
	}
}
