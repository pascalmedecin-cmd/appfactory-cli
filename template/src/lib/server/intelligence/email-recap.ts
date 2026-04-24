/**
 * Email récap veille post-cron.
 *
 * Envoyé après chaque cron /api/cron/intelligence (succès ou échec),
 * via Resend API (fetch direct, pas de SDK npm).
 *
 * Activation :
 *  - env EMAIL_RECAP_ENABLED=true (gate obligatoire, défaut off)
 *  - env RESEND_API_KEY requis (sinon skip avec log)
 *  - env EMAIL_RECAP_TO (défaut pascal@filmpro.ch)
 *  - env EMAIL_RECAP_FROM (défaut noreply@filmpro.ch)
 *
 * Si une env var manque → skip silencieux côté appelant via sendRecapEmail qui
 * renvoie `{ ok: false, reason }`. Jamais d'exception propagée au cron.
 */
import { env } from '$env/dynamic/private';
import type { IntelligenceReport } from './schema';
import type { CostSummary, CostEntry } from './cost-tracker';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_TO = 'pascal@filmpro.ch';
const DEFAULT_FROM = 'FilmPro Veille <noreply@filmpro.ch>';
const CRM_URL = 'https://filmpro-crm.vercel.app';

export interface SendRecapSuccess {
	report: IntelligenceReport;
	weekLabel: string;
	costs: CostSummary;
}

export interface SendRecapFailure {
	weekLabel: string;
	errorMessage: string;
	costs: CostSummary;
}

export type SendRecapInput =
	| { mode: 'success'; data: SendRecapSuccess }
	| { mode: 'failure'; data: SendRecapFailure };

export interface SendRecapResult {
	ok: boolean;
	skipped?: boolean;
	reason?: string;
	resendId?: string;
}

// ---------- Helpers format ----------

function fmtEur(n: number): string {
	return `${n.toFixed(2)} EUR`;
}

function fmtUsd(n: number): string {
	return `$${n.toFixed(3)}`;
}

function fmtInt(n: number): string {
	return n.toLocaleString('fr-CH');
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function fmtEntryDetails(entry: CostEntry): string {
	return `in ${fmtInt(entry.input_tokens)} / out ${fmtInt(entry.output_tokens)} / cache ${fmtInt(entry.cache_read_tokens + entry.cache_creation_tokens)}`;
}

// ---------- Templates ----------

function renderSuccessHtml(data: SendRecapSuccess): string {
	const { report, weekLabel, costs } = data;
	const itemsCount = (report.items ?? []).length;
	const rowsHtml = costs.breakdown
		.map(
			(e) => `
				<tr>
					<td style="padding:6px 10px;border-bottom:1px solid #eee;">${escapeHtml(e.label)}</td>
					<td style="padding:6px 10px;border-bottom:1px solid #eee;color:#666;font-size:13px;">${escapeHtml(e.model)}</td>
					<td style="padding:6px 10px;border-bottom:1px solid #eee;color:#666;font-size:13px;">${escapeHtml(fmtEntryDetails(e))}</td>
					<td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(fmtEur(e.eur))}</td>
				</tr>`
		)
		.join('');

	const now = new Date().toLocaleString('fr-CH', { dateStyle: 'short', timeStyle: 'short' });

	return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f6f6f6;margin:0;padding:24px;">
	<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5;">
		<div style="background:#1e293b;color:#fff;padding:16px 20px;">
			<div style="font-size:18px;font-weight:600;">FilmPro Veille, W${escapeHtml(weekLabel)}</div>
			<div style="font-size:13px;color:#cbd5e1;margin-top:2px;">Récap automatique post-cron</div>
		</div>
		<div style="padding:20px;">
			<div style="margin-bottom:16px;">
				<span style="color:#16a34a;font-weight:600;">✅ Veille publiée</span>
 : <a href="${CRM_URL}/veille" style="color:#2563eb;">Ouvrir dans le CRM</a>
			</div>

			<h3 style="margin:20px 0 8px;font-size:14px;color:#475569;text-transform:uppercase;letter-spacing:.04em;">Métriques</h3>
			<table style="width:100%;border-collapse:collapse;font-size:14px;">
				<tr>
					<td style="padding:6px 10px;color:#64748b;">Items générés</td>
					<td style="padding:6px 10px;text-align:right;font-weight:600;">${itemsCount}</td>
				</tr>
			</table>

			<h3 style="margin:20px 0 8px;font-size:14px;color:#475569;text-transform:uppercase;letter-spacing:.04em;">Coûts</h3>
			<table style="width:100%;border-collapse:collapse;font-size:14px;">
				<thead>
					<tr style="background:#f1f5f9;">
						<th style="padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase;color:#475569;">Étape</th>
						<th style="padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase;color:#475569;">Modèle</th>
						<th style="padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase;color:#475569;">Détail</th>
						<th style="padding:8px 10px;text-align:right;font-size:12px;text-transform:uppercase;color:#475569;">EUR</th>
					</tr>
				</thead>
				<tbody>${rowsHtml}</tbody>
				<tfoot>
					<tr>
						<td colspan="3" style="padding:10px;text-align:right;font-weight:600;">Total</td>
						<td style="padding:10px;text-align:right;font-weight:600;">${escapeHtml(fmtEur(costs.total_eur))}</td>
					</tr>
					<tr>
						<td colspan="3" style="padding:2px 10px;text-align:right;color:#94a3b8;font-size:12px;">Équivalent USD</td>
						<td style="padding:2px 10px;text-align:right;color:#94a3b8;font-size:12px;">${escapeHtml(fmtUsd(costs.total_usd))}</td>
					</tr>
				</tfoot>
			</table>

			<div style="margin-top:24px;color:#94a3b8;font-size:12px;border-top:1px solid #eee;padding-top:12px;">
				Généré le ${escapeHtml(now)} : Résumé exécutif :
				<em>${escapeHtml(report.meta?.executive_summary ?? '')}</em>
			</div>
		</div>
	</div>
</body>
</html>`;
}

function renderSuccessText(data: SendRecapSuccess): string {
	const { report, weekLabel, costs } = data;
	const itemsCount = (report.items ?? []).length;
	const lines: string[] = [];
	lines.push(`FilmPro Veille : W${weekLabel}`);
	lines.push(`=== Veille publiée ===`);
	lines.push(`URL : ${CRM_URL}/veille`);
	lines.push('');
	lines.push(`Items générés : ${itemsCount}`);
	lines.push('');
	lines.push('Coûts :');
	for (const e of costs.breakdown) {
		lines.push(`  - ${e.label} (${e.model}) ${fmtEntryDetails(e)} → ${fmtEur(e.eur)}`);
	}
	lines.push('');
	lines.push(`Total : ${fmtEur(costs.total_eur)} (${fmtUsd(costs.total_usd)})`);
	lines.push('');
	lines.push(`Résumé : ${report.meta?.executive_summary ?? ''}`);
	return lines.join('\n');
}

function renderFailureHtml(data: SendRecapFailure): string {
	const { weekLabel, errorMessage, costs } = data;
	const truncated = errorMessage.length > 500 ? errorMessage.slice(0, 500) + '…' : errorMessage;
	const rowsHtml = costs.breakdown.length
		? costs.breakdown
				.map(
					(e) => `
				<tr>
					<td style="padding:6px 10px;border-bottom:1px solid #eee;">${escapeHtml(e.label)}</td>
					<td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(fmtEur(e.eur))}</td>
				</tr>`
				)
				.join('')
		: `<tr><td colspan="2" style="padding:12px;color:#94a3b8;text-align:center;">Aucun coût mesuré avant l'échec.</td></tr>`;

	return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f6f6f6;margin:0;padding:24px;">
	<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #fecaca;">
		<div style="background:#991b1b;color:#fff;padding:16px 20px;">
			<div style="font-size:18px;font-weight:600;">[ALERTE] Veille FilmPro, échec</div>
			<div style="font-size:13px;color:#fecaca;margin-top:2px;">W${escapeHtml(weekLabel)}, génération interrompue</div>
		</div>
		<div style="padding:20px;">
			<div style="margin-bottom:16px;"><span style="color:#dc2626;font-weight:600;">❌ Échec génération</span></div>

			<h3 style="margin:16px 0 8px;font-size:14px;color:#475569;">Message d'erreur</h3>
			<pre style="background:#fef2f2;border:1px solid #fecaca;padding:10px;border-radius:4px;font-size:13px;overflow-x:auto;color:#7f1d1d;white-space:pre-wrap;">${escapeHtml(truncated)}</pre>

			<h3 style="margin:20px 0 8px;font-size:14px;color:#475569;">Coûts avant échec</h3>
			<table style="width:100%;border-collapse:collapse;font-size:14px;">
				<tbody>${rowsHtml}</tbody>
				<tfoot>
					<tr>
						<td style="padding:10px;text-align:right;font-weight:600;">Total</td>
						<td style="padding:10px;text-align:right;font-weight:600;">${escapeHtml(fmtEur(costs.total_eur))}</td>
					</tr>
				</tfoot>
			</table>

			<div style="margin-top:20px;font-size:13px;">
				<a href="https://vercel.com/pascalmedecin-cmds-projects/filmpro-crm/logs" style="color:#2563eb;">Ouvrir les logs Vercel</a>
			</div>
		</div>
	</div>
</body>
</html>`;
}

function renderFailureText(data: SendRecapFailure): string {
	const { weekLabel, errorMessage, costs } = data;
	const truncated = errorMessage.length > 500 ? errorMessage.slice(0, 500) + '…' : errorMessage;
	const lines: string[] = [];
	lines.push(`[ALERTE] Veille FilmPro W${weekLabel} : échec génération`);
	lines.push('');
	lines.push('Message d\'erreur :');
	lines.push(truncated);
	lines.push('');
	lines.push('Coûts avant échec :');
	if (costs.breakdown.length === 0) {
		lines.push('  (aucun coût mesuré)');
	} else {
		for (const e of costs.breakdown) {
			lines.push(`  - ${e.label} → ${fmtEur(e.eur)}`);
		}
	}
	lines.push('');
	lines.push(`Total : ${fmtEur(costs.total_eur)}`);
	lines.push('');
	lines.push('Logs : https://vercel.com/pascalmedecin-cmds-projects/filmpro-crm/logs');
	return lines.join('\n');
}

// ---------- Public API ----------

/**
 * Pure : construit le payload Resend pour un input. Exposée pour tests.
 */
export function buildRecapPayload(input: SendRecapInput): {
	subject: string;
	html: string;
	text: string;
} {
	if (input.mode === 'success') {
		const { weekLabel, costs } = input.data;
		return {
			subject: `[Veille FilmPro] W${weekLabel}, ${input.data.report.items?.length ?? 0} items, ${fmtEur(costs.total_eur)}`,
			html: renderSuccessHtml(input.data),
			text: renderSuccessText(input.data)
		};
	}
	return {
		subject: `[ALERTE] Veille FilmPro W${input.data.weekLabel}, échec génération`,
		html: renderFailureHtml(input.data),
		text: renderFailureText(input.data)
	};
}

/**
 * Envoi via Resend. Gate par env. Toutes les erreurs → { ok: false, reason },
 * jamais d'exception propagée.
 */
export async function sendRecapEmail(input: SendRecapInput): Promise<SendRecapResult> {
	const enabled = (env.EMAIL_RECAP_ENABLED ?? '').toLowerCase() === 'true';
	if (!enabled) {
		return { ok: false, skipped: true, reason: 'EMAIL_RECAP_ENABLED=false' };
	}
	const apiKey = env.RESEND_API_KEY;
	if (!apiKey) {
		return { ok: false, skipped: true, reason: 'RESEND_API_KEY manquante' };
	}
	const to = env.EMAIL_RECAP_TO || DEFAULT_TO;
	const from = env.EMAIL_RECAP_FROM || DEFAULT_FROM;

	const { subject, html, text } = buildRecapPayload(input);

	try {
		const res = await fetch(RESEND_ENDPOINT, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ from, to, subject, html, text })
		});
		if (!res.ok) {
			const body = await res.text();
			return { ok: false, reason: `Resend ${res.status}: ${body.slice(0, 300)}` };
		}
		const payload = (await res.json()) as { id?: string };
		return { ok: true, resendId: payload.id };
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return { ok: false, reason: `fetch error: ${msg}` };
	}
}
