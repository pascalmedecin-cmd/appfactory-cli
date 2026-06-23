/**
 * Email récap veille post-cron.
 *
 * Envoyé après chaque run veille (succès, sparse, ou échec), via Resend API
 * (fetch direct, pas de SDK npm).
 *
 * Configuration injectée par l'appelant via `EmailRecapConfig` (cf. deps.ts) :
 *  - enabled : gate global (défaut false côté factory)
 *  - apiKey : Resend API key (si manquante alors que enabled=true, skip avec log)
 *  - to / from : destinataires
 *
 * Si la config est désactivée ou incomplète → skip silencieux via sendRecapEmail
 * qui renvoie `{ ok: false, reason }`. Jamais d'exception propagée à l'appelant.
 *
 * Note S167 : retrait de l'import `$env/dynamic/private` pour rendre le module
 * portable hors SvelteKit (cron externalisé GitHub Actions, cf. scripts/run-veille.ts).
 */
import type { IntelligenceReport } from './schema';
import type { CostSummary } from './cost-tracker';
import type { EmailRecapConfig } from './deps';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const CRM_URL = process.env.PUBLIC_APP_URL || 'https://filmpro-portail.vercel.app';
// Le pipeline tourne sur GitHub Actions depuis S167 (plus sur Vercel) : les logs
// d'échec vivent dans les runs du workflow, pas dans les logs Vercel.
const CRON_RUNS_URL =
	'https://github.com/pascalmedecin-cmd/appfactory-cli/actions/workflows/cron-veille.yml';

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
	| { mode: 'sparse'; data: SendRecapSuccess }
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

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

// ---------- Templates ----------

/** Items « à actionner » (action_directe) ou, à défaut, les premiers items par rank. */
function briefItemsOf(report: IntelligenceReport): IntelligenceReport['items'] {
	const items = report.items ?? [];
	const actionItems = items.filter((it) => it?.actionability === 'action_directe');
	return (actionItems.length ? actionItems : items).slice(0, 3);
}

function itemUrl(it: IntelligenceReport['items'][number]): string {
	const u = it?.source?.url;
	return typeof u === 'string' && /^https?:\/\//i.test(u) ? u : `${CRM_URL}/crm/veille`;
}

function renderSuccessHtml(data: SendRecapSuccess): string {
	const { report, weekLabel, costs } = data;
	const itemsCount = (report.items ?? []).length;
	const brief = briefItemsOf(report);
	const impacts = report.impacts_filmpro ?? [];

	// Brief = signaux à actionner d'abord (so-what par item + lien direct).
	const briefHtml = brief.length
		? brief
				.map((it) => {
					const so = it?.filmpro_relevance
						? `<div style="margin:4px 0 0;color:#475569;font-size:13px;line-height:1.5;">${escapeHtml(it.filmpro_relevance)}</div>`
						: '';
					const tag =
						it?.actionability === 'action_directe'
							? `<span style="display:inline-block;font-size:11px;color:#9a3412;background:#ffedd5;border-radius:4px;padding:1px 6px;margin-left:6px;vertical-align:middle;">à actionner</span>`
							: '';
					return `<div style="margin:0 0 14px;padding:0 0 14px;border-bottom:1px solid #f1f5f9;">
						<a href="${escapeHtml(itemUrl(it))}" style="color:#1e293b;font-weight:600;font-size:14px;text-decoration:none;">${escapeHtml(it?.title ?? '(sans titre)')}</a>${tag}
						${so}
					</div>`;
				})
				.join('')
		: '<p style="color:#94a3b8;font-size:13px;">Aucun signal détaillé cette semaine.</p>';

	const impactsHtml = impacts.length
		? `<h3 style="margin:20px 0 8px;font-size:13px;color:#475569;text-transform:uppercase;letter-spacing:.04em;">Impacts FilmPro</h3>
			<ul style="margin:0;padding-left:18px;color:#475569;font-size:13px;line-height:1.6;">
				${impacts.map((im) => `<li>${escapeHtml(im?.note ?? '')}</li>`).join('')}
			</ul>`
		: '';

	const costRows = costs.breakdown
		.map(
			(e) => `
				<tr>
					<td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;color:#94a3b8;">${escapeHtml(e.label)}</td>
					<td style="padding:4px 8px;border-bottom:1px solid #f1f5f9;text-align:right;color:#94a3b8;">${escapeHtml(fmtEur(e.eur))}</td>
				</tr>`
		)
		.join('');

	return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f6f6f6;margin:0;padding:24px;">
	<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5;">
		<div style="background:#1e293b;color:#fff;padding:16px 20px;">
			<div style="font-size:18px;font-weight:600;">FilmPro Veille, W${escapeHtml(weekLabel)}</div>
			<div style="font-size:13px;color:#cbd5e1;margin-top:2px;">${itemsCount} ${itemsCount !== 1 ? 'signaux' : 'signal'} cette semaine</div>
		</div>
		<div style="padding:20px;">
			<p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.6;">${escapeHtml(report.meta?.executive_summary ?? '')}</p>
			<div style="margin-bottom:18px;">
				<a href="${CRM_URL}/crm/veille" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:8px 14px;border-radius:6px;">Ouvrir le brief complet dans le CRM</a>
			</div>

			<h3 style="margin:20px 0 12px;font-size:13px;color:#475569;text-transform:uppercase;letter-spacing:.04em;">Signaux clés</h3>
			${briefHtml}

			${impactsHtml}

			<details style="margin-top:24px;border-top:1px solid #eee;padding-top:12px;">
				<summary style="cursor:pointer;color:#94a3b8;font-size:12px;">Coûts de génération (${escapeHtml(fmtEur(costs.total_eur))})</summary>
				<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;">
					<tbody>${costRows}</tbody>
					<tfoot>
						<tr>
							<td style="padding:6px 8px;text-align:right;font-weight:600;color:#64748b;">Total</td>
							<td style="padding:6px 8px;text-align:right;font-weight:600;color:#64748b;">${escapeHtml(fmtEur(costs.total_eur))}</td>
						</tr>
					</tfoot>
				</table>
			</details>
		</div>
	</div>
</body>
</html>`;
}

function renderSuccessText(data: SendRecapSuccess): string {
	const { report, weekLabel, costs } = data;
	const itemsCount = (report.items ?? []).length;
	const brief = briefItemsOf(report);
	const lines: string[] = [];
	lines.push(`FilmPro Veille : W${weekLabel}`);
	lines.push('');
	lines.push(report.meta?.executive_summary ?? '');
	lines.push('');
	lines.push(`Items générés : ${itemsCount}`);
	lines.push(`Brief complet : ${CRM_URL}/crm/veille`);
	lines.push('');
	lines.push('Signaux clés :');
	for (const it of brief) {
		const flag = it?.actionability === 'action_directe' ? ' [à actionner]' : '';
		lines.push(`  - ${it?.title ?? '(sans titre)'}${flag}`);
		if (it?.filmpro_relevance) lines.push(`    ${it.filmpro_relevance}`);
		lines.push(`    ${itemUrl(it)}`);
	}
	for (const im of report.impacts_filmpro ?? []) {
		if (im?.note) lines.push(`  Impact : ${im.note}`);
	}
	lines.push('');
	lines.push(`Coûts génération : ${fmtEur(costs.total_eur)} (${fmtUsd(costs.total_usd)})`);
	return lines.join('\n');
}

function renderSparseHtml(data: SendRecapSuccess): string {
	const { report, weekLabel, costs } = data;
	const itemsCount = (report.items ?? []).length;
	const rowsHtml = costs.breakdown
		.map(
			(e) => `
				<tr>
					<td style="padding:6px 10px;border-bottom:1px solid #eee;">${escapeHtml(e.label)}</td>
					<td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(fmtEur(e.eur))}</td>
				</tr>`
		)
		.join('');
	const now = new Date().toLocaleString('fr-CH', { dateStyle: 'short', timeStyle: 'short' });

	return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f6f6f6;margin:0;padding:24px;">
	<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #fed7aa;">
		<div style="background:#9a3412;color:#fff;padding:16px 20px;">
			<div style="font-size:18px;font-weight:600;">[ALERTE] Veille FilmPro, semaine creuse</div>
			<div style="font-size:13px;color:#fed7aa;margin-top:2px;">W${escapeHtml(weekLabel)}, ${itemsCount} item${itemsCount > 1 ? 's' : ''} publié${itemsCount > 1 ? 's' : ''}</div>
		</div>
		<div style="padding:20px;">
			<div style="margin-bottom:16px;">
				<span style="color:#9a3412;font-weight:600;">Volume anormalement bas (&lt; 2 items)</span>
				 : <a href="${CRM_URL}/crm/veille" style="color:#2563eb;">Ouvrir dans le CRM</a>
			</div>

			<p style="margin:0 0 12px;color:#475569;font-size:14px;line-height:1.5;">
				La génération automatique n'a retenu que ${itemsCount} item${itemsCount > 1 ? 's' : ''} cette semaine. À investiguer : périmètre trop strict, fenêtre temporelle insuffisante, ou semaine réellement creuse côté actualité sectorielle.
			</p>

			<h3 style="margin:20px 0 8px;font-size:14px;color:#475569;">Résumé exécutif</h3>
			<p style="margin:0 0 16px;color:#475569;font-size:13px;line-height:1.5;font-style:italic;">
				${escapeHtml(report.meta?.executive_summary ?? '(aucun)')}
			</p>

			<h3 style="margin:20px 0 8px;font-size:14px;color:#475569;">Coûts</h3>
			<table style="width:100%;border-collapse:collapse;font-size:14px;">
				<tbody>${rowsHtml}</tbody>
				<tfoot>
					<tr>
						<td style="padding:10px;text-align:right;font-weight:600;">Total</td>
						<td style="padding:10px;text-align:right;font-weight:600;">${escapeHtml(fmtEur(costs.total_eur))}</td>
					</tr>
				</tfoot>
			</table>

			<div style="margin-top:24px;color:#94a3b8;font-size:12px;border-top:1px solid #eee;padding-top:12px;">
				Généré le ${escapeHtml(now)}
			</div>
		</div>
	</div>
</body>
</html>`;
}

function renderSparseText(data: SendRecapSuccess): string {
	const { report, weekLabel, costs } = data;
	const itemsCount = (report.items ?? []).length;
	const lines: string[] = [];
	lines.push(`[ALERTE] Veille FilmPro W${weekLabel} : semaine creuse (${itemsCount} item${itemsCount > 1 ? 's' : ''})`);
	lines.push('');
	lines.push(`URL : ${CRM_URL}/crm/veille`);
	lines.push('');
	lines.push(`La génération automatique n'a retenu que ${itemsCount} item${itemsCount > 1 ? 's' : ''} cette semaine.`);
	lines.push(`À investiguer : périmètre trop strict, fenêtre temporelle insuffisante, ou semaine réellement creuse.`);
	lines.push('');
	lines.push(`Résumé : ${report.meta?.executive_summary ?? '(aucun)'}`);
	lines.push('');
	lines.push('Coûts :');
	for (const e of costs.breakdown) {
		lines.push(`  - ${e.label} → ${fmtEur(e.eur)}`);
	}
	lines.push('');
	lines.push(`Total : ${fmtEur(costs.total_eur)}`);
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
			<div style="margin-bottom:16px;"><span style="color:#dc2626;font-weight:600;">Échec génération</span></div>

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
				<a href="${CRON_RUNS_URL}" style="color:#2563eb;">Ouvrir les runs GitHub Actions</a>
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
	lines.push(`Logs : ${CRON_RUNS_URL}`);
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
		const { weekLabel, report } = input.data;
		const n = report.items?.length ?? 0;
		const actionCount = (report.items ?? []).filter(
			(it) => it?.actionability === 'action_directe'
		).length;
		// Subject = signaux (et combien à actionner), SANS montant EUR (AC-6 2026-06-22 :
		// l'email est un brief, pas un reçu de coûts ; le coût vit dans /couts et replié en bas).
		const actionSuffix = actionCount > 0 ? ` (${actionCount} à actionner)` : '';
		return {
			subject: `[Veille FilmPro] W${weekLabel} · ${n} ${n !== 1 ? 'signaux' : 'signal'}${actionSuffix}`,
			html: renderSuccessHtml(input.data),
			text: renderSuccessText(input.data)
		};
	}
	if (input.mode === 'sparse') {
		const { weekLabel } = input.data;
		const n = input.data.report.items?.length ?? 0;
		return {
			subject: `[ALERTE] Veille FilmPro W${weekLabel}, semaine creuse (${n} item${n !== 1 ? 's' : ''})`,
			html: renderSparseHtml(input.data),
			text: renderSparseText(input.data)
		};
	}
	return {
		subject: `[ALERTE] Veille FilmPro W${input.data.weekLabel}, échec génération`,
		html: renderFailureHtml(input.data),
		text: renderFailureText(input.data)
	};
}

/**
 * Envoi via Resend. Toute config injectée. Toutes les erreurs → { ok: false, reason },
 * jamais d'exception propagée.
 */
export async function sendRecapEmail(
	input: SendRecapInput,
	config: EmailRecapConfig
): Promise<SendRecapResult> {
	if (!config.enabled) {
		return { ok: false, skipped: true, reason: 'EMAIL_RECAP_ENABLED=false' };
	}
	if (!config.apiKey) {
		return { ok: false, skipped: true, reason: 'RESEND_API_KEY manquante' };
	}

	const { subject, html, text } = buildRecapPayload(input);

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
			return { ok: false, reason: `Resend ${res.status}: ${body.slice(0, 300)}` };
		}
		const payload = (await res.json()) as { id?: string };
		return { ok: true, resendId: payload.id };
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return { ok: false, reason: `fetch error: ${msg}` };
	}
}
