/**
 * Email brief éditorial brandé FilmPro (email #2 de la veille hebdo).
 *
 * Distinct de email-recap.ts (email #1, admin/technique : « la veille a tourné » +
 * coûts, destiné à pascal@). Ce brief est le LIVRABLE éditorial : résumé + signaux
 * clés (so-what + lien cliquable par item) + impacts, brandé FilmPro, destiné à
 * antoine@ + pascal@. Envoyé uniquement quand l'édition a du contenu (>= 1 item),
 * géré par l'appelant (run-generation).
 *
 * Email-safe : tables + styles inline, aucune dépendance CSS/SVG externe (les
 * clients mail stripent les <style> globaux, les web fonts et le SVG inline). Palette
 * FilmPro = charte-pdf-filmpro/tokens.css (navy #152A45, accent #2F5A9E). Aucun tiret
 * cadratin, aucun emoji (cf. règles typo FR). Le contenu LLM est déjà dedashé en amont.
 */
import type { IntelligenceReport, IntelligenceItem } from './schema';
import type { EmailBriefConfig } from './deps';
import { weekLabelToDate } from './week-utils';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const CRM_URL = process.env.PUBLIC_APP_URL || 'https://filmpro-portail.vercel.app';
// Logo FilmPro blanc officiel (usage « cover » navy de la charte), wordmark blanc +
// carrés nuancés (opacités 0.24/0.62 préservées depuis FilmPro_logo_white.svg, comme la
// webapp). Servi en prod depuis static/. PNG (et non SVG) car Gmail/Outlook ne rendent
// pas le SVG inline. Affiché sur l'en-tête navy.
const LOGO_URL = `${CRM_URL}/FilmPro_logo_white.png`;

const MOIS_FR = [
	'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
	'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

/**
 * Libellé humain du lundi de la semaine ISO : « 22 juin 2026 ». Déterministe
 * (dérivé du weekLabel, pas de l'horloge). weekLabelToDate renvoie le jeudi ISO ;
 * on recule au lundi. Fallback = weekLabel brut si parsing impossible.
 */
export function weekStartFr(weekLabel: string): string {
	let d: Date;
	try {
		d = weekLabelToDate(weekLabel);
	} catch {
		return weekLabel;
	}
	const dow = (d.getUTCDay() + 6) % 7; // 0 = lundi
	const monday = new Date(
		Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow)
	);
	return `${monday.getUTCDate()} ${MOIS_FR[monday.getUTCMonth()]} ${monday.getUTCFullYear()}`;
}

// Palette FilmPro (subset email-safe de charte-pdf-filmpro/tokens.css).
const C = {
	navy: '#152A45',
	accent: '#2F5A9E',
	accentSoft: '#5A7190',
	orange: '#D97706',
	text: '#374151',
	muted: '#6B7280',
	surface: '#F1F5F9',
	rule: '#E5E7EB',
	white: '#FFFFFF'
} as const;

const FONT =
	"'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export interface SendBriefInput {
	weekLabel: string;
	report: IntelligenceReport;
}

export interface SendBriefResult {
	ok: boolean;
	skipped?: boolean;
	reason?: string;
	resendId?: string;
}

// ---------- Helpers ----------

function escapeHtml(s: string): string {
	// Coercition String() : l'endpoint PDF de marque expose ce rendu à des lignes DB
	// legacy potentiellement non validées par Zod (readReportItems retombe en mode brut) ;
	// un champ non-string ne doit jamais provoquer un TypeError 500.
	return String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function itemUrl(it: IntelligenceItem): string {
	const u = it?.source?.url;
	return typeof u === 'string' && /^https?:\/\//i.test(u) ? u : `${CRM_URL}/crm/veille`;
}

function editionNumber(weekLabel: string): string {
	const m = /W(\d{2})$/.exec(weekLabel);
	return m ? m[1] : weekLabel;
}

const ACTION_META: Record<string, { label: string; bg: string; fg: string }> = {
	action_directe: { label: 'À actionner', bg: '#FEF3E2', fg: C.orange },
	veille_active: { label: 'Veille active', bg: '#EAF0F9', fg: C.accent },
	a_surveiller: { label: 'À surveiller', bg: C.surface, fg: C.muted }
};

const GEO_LABEL: Record<string, string> = {
	suisse_romande: 'Suisse romande',
	suisse: 'Suisse',
	monde: 'International'
};

function actionBadge(actionability: string | undefined): string {
	const meta = ACTION_META[actionability ?? ''] ?? ACTION_META.a_surveiller;
	return `<span style="display:inline-block;font-size:11px;font-weight:600;color:${meta.fg};background:${meta.bg};border-radius:4px;padding:2px 8px;line-height:1.4;">${escapeHtml(meta.label)}</span>`;
}

function metaLine(it: IntelligenceItem): string {
	const bits: string[] = [];
	const geo = GEO_LABEL[it?.geo_scope ?? ''];
	if (geo) bits.push(geo);
	if (it?.source?.name) bits.push(it.source.name);
	if (!bits.length) return '';
	return `<div style="font-size:12px;color:${C.muted};margin-top:6px;">${escapeHtml(bits.join(' · '))}</div>`;
}

/** Bloc d'un signal : titre lié, badge actionnabilité, so-what, méta source/geo. */
function renderItem(it: IntelligenceItem): string {
	const so = it?.filmpro_relevance
		? `<div style="font-size:14px;line-height:1.55;color:${C.text};margin-top:8px;">${escapeHtml(it.filmpro_relevance)}</div>`
		: '';
	return `
		<tr>
			<td style="padding:18px 0;border-bottom:1px solid ${C.rule};">
				<div style="margin-bottom:8px;">${actionBadge(it?.actionability)}</div>
				<a href="${escapeHtml(itemUrl(it))}" style="font-size:16px;font-weight:600;color:${C.navy};text-decoration:none;line-height:1.35;">${escapeHtml(it?.title ?? '(sans titre)')}</a>
				${so}
				${metaLine(it)}
				<div style="margin-top:10px;">
					<a href="${escapeHtml(itemUrl(it))}" style="font-size:13px;font-weight:600;color:${C.accent};text-decoration:none;">Lire la source &rarr;</a>
				</div>
			</td>
		</tr>`;
}

// ---------- Templates ----------

function renderBriefHtml(input: SendBriefInput): string {
	const { report, weekLabel } = input;
	const items = (report.items ?? []) as IntelligenceItem[];
	const n = items.length;
	const summary = report.meta?.executive_summary ?? '';
	const impacts = report.impacts_filmpro ?? [];

	const itemsHtml = items.map(renderItem).join('');

	const impactsHtml = impacts.length
		? `<tr><td style="padding:24px 0 4px;">
				<div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${C.accent};">Impacts FilmPro</div>
			</td></tr>
			<tr><td style="padding:0 0 8px;">
				<ul style="margin:8px 0 0;padding-left:18px;color:${C.text};font-size:14px;line-height:1.6;">
					${impacts.map((im) => `<li style="margin-bottom:6px;">${escapeHtml(im?.note ?? '')}</li>`).join('')}
				</ul>
			</td></tr>`
		: '';

	const preheader = summary ? summary.slice(0, 140) : `Veille FilmPro, ${n} signaux cette semaine.`;

	return `<!DOCTYPE html>
<html lang="fr">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width,initial-scale=1">
	<meta name="color-scheme" content="light">
	<title>Veille FilmPro</title>
</head>
<body style="margin:0;padding:0;background:${C.surface};">
	<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.surface};font-size:1px;line-height:1px;">${escapeHtml(preheader)}</div>
	<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.surface};">
		<tr>
			<td align="center" style="padding:28px 16px;">
				<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:${C.white};border-radius:12px;overflow:hidden;border:1px solid ${C.rule};font-family:${FONT};">

					<!-- Header brandé : bandeau navy + logo blanc nuancé (usage cover charte) -->
					<tr>
						<td style="background:${C.navy};padding:26px 32px;">
							<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
								<tr>
									<td style="vertical-align:middle;">
										<img src="${LOGO_URL}" alt="FilmPro" width="172" height="30" style="display:block;border:0;width:172px;height:auto;" />
										<div style="font-size:12px;letter-spacing:.10em;text-transform:uppercase;color:rgba(255,255,255,.55);margin-top:14px;">Brief sectoriel hebdomadaire</div>
										<div style="font-size:14px;font-weight:600;color:${C.white};margin-top:4px;">Semaine du ${escapeHtml(weekStartFr(weekLabel))}</div>
									</td>
									<td style="vertical-align:middle;text-align:right;">
										<div style="font-size:34px;font-weight:700;color:${C.white};line-height:1;">N&deg;&nbsp;${escapeHtml(editionNumber(weekLabel))}</div>
										<div style="font-size:12px;color:rgba(255,255,255,.6);margin-top:4px;">${n} ${n !== 1 ? 'signaux' : 'signal'}</div>
									</td>
								</tr>
							</table>
						</td>
					</tr>

					<!-- Corps -->
					<tr>
						<td style="padding:28px 32px 8px;">
							<div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${C.accent};margin-bottom:10px;">L'essentiel</div>
							<p style="margin:0;font-size:15px;line-height:1.65;color:${C.text};">${escapeHtml(summary)}</p>
							<div style="margin:22px 0 4px;">
								<a href="${CRM_URL}/crm/veille" style="display:inline-block;background:${C.accent};color:${C.white};text-decoration:none;font-size:14px;font-weight:600;padding:11px 20px;border-radius:8px;">Ouvrir le brief complet</a>
							</div>
						</td>
					</tr>

					<!-- Signaux -->
					<tr>
						<td style="padding:18px 32px 0;">
							<div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${C.accent};border-top:2px solid ${C.navy};padding-top:18px;">Signaux clés</div>
							<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
								${itemsHtml}
							</table>
						</td>
					</tr>

					<!-- Impacts -->
					<tr><td style="padding:0 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${impactsHtml}</table></td></tr>

					<!-- Footer -->
					<tr>
						<td style="padding:24px 32px 28px;border-top:1px solid ${C.rule};">
							<div style="font-size:12px;color:${C.muted};line-height:1.6;">
								Brief généré automatiquement par la veille FilmPro.
								<a href="${CRM_URL}/crm/veille" style="color:${C.accent};text-decoration:none;">Consulter toutes les éditions</a>.
							</div>
						</td>
					</tr>

				</table>
				<div style="font-size:11px;color:${C.muted};margin-top:16px;font-family:${FONT};">FilmPro &middot; Traitements pour vitrage, Suisse romande</div>
			</td>
		</tr>
	</table>
</body>
</html>`;
}

function renderBriefText(input: SendBriefInput): string {
	const { report, weekLabel } = input;
	const items = (report.items ?? []) as IntelligenceItem[];
	const lines: string[] = [];
	lines.push(`FilmPro Veille - Brief sectoriel - Semaine du ${weekStartFr(weekLabel)}`);
	lines.push('');
	lines.push(report.meta?.executive_summary ?? '');
	lines.push('');
	lines.push(`Brief complet : ${CRM_URL}/crm/veille`);
	lines.push('');
	lines.push('SIGNAUX CLÉS');
	for (const it of items) {
		const meta = ACTION_META[it?.actionability ?? ''] ?? ACTION_META.a_surveiller;
		lines.push('');
		lines.push(`[${meta.label}] ${it?.title ?? '(sans titre)'}`);
		if (it?.filmpro_relevance) lines.push(`  ${it.filmpro_relevance}`);
		lines.push(`  Source : ${itemUrl(it)}`);
	}
	const impacts = report.impacts_filmpro ?? [];
	if (impacts.length) {
		lines.push('');
		lines.push('IMPACTS FILMPRO');
		for (const im of impacts) if (im?.note) lines.push(`  - ${im.note}`);
	}
	return lines.join('\n');
}

// ---------- API publique ----------

/** Pure : construit le payload Resend du brief. Exposée pour tests + aperçu. */
export function buildBriefPayload(input: SendBriefInput): {
	subject: string;
	html: string;
	text: string;
} {
	const n = (input.report.items ?? []).length;
	const actionCount = (input.report.items ?? []).filter(
		(it) => it?.actionability === 'action_directe'
	).length;
	const actionSuffix = actionCount > 0 ? ` (${actionCount} à actionner)` : '';
	return {
		subject: `Veille FilmPro · ${input.weekLabel} · ${n} ${n !== 1 ? 'signaux' : 'signal'}${actionSuffix}`,
		html: renderBriefHtml(input),
		text: renderBriefText(input)
	};
}

/**
 * Variante IMPRIMABLE du brief (PDF de marque, Bloc C 2026-06-26).
 *
 * Même rendu brandé que l'email (bandeau navy + logo + signaux + impacts FilmPro),
 * enrichi pour l'impression navigateur -> « Enregistrer en PDF ». Sert l'endpoint
 * GET /crm/veille/[id]/brief, ouvert dans un onglet par le bouton « Exporter en PDF ».
 *
 * L'email lui-même n'est PAS modifié : `@page` A4 + bouton + auto-impression sont
 * injectés ICI uniquement (les clients mail stripent <style>/<script> ; ces ajouts
 * ne servent qu'au rendu navigateur). L'inline script/onclick est autorisé par la CSP
 * du projet ('unsafe-inline' sur script-src, décision assumée CLAUDE.md). Pur + testable.
 */
export function buildBriefPrintHtml(input: SendBriefInput): string {
	const html = renderBriefHtml(input);
	// Garde dure : si renderBriefHtml est un jour refactoré et n'émet plus exactement un
	// </head> + un </body>, on échoue FORT plutôt que de servir une page sans
	// enrichissements (sinon @page/bouton/auto-print disparaîtraient en silence).
	if (!html.includes('</head>') || !html.includes('</body>')) {
		throw new Error(
			'buildBriefPrintHtml: marqueurs </head>/</body> introuvables dans le rendu brief.'
		);
	}
	const printStyle =
		'<style>@page{size:A4;margin:14mm}@media print{body{background:#fff}.fp-no-print{display:none!important}}</style>';
	const printBtn =
		`<div class="fp-no-print" style="position:fixed;top:16px;right:16px;z-index:9;font-family:${FONT};">` +
		`<button type="button" onclick="window.print()" style="background:${C.accent};color:${C.white};border:0;border-radius:8px;padding:10px 16px;font-size:14px;font-weight:600;cursor:pointer;">Enregistrer en PDF</button>` +
		`</div>`;
	// Auto-ouverture de la boîte d'impression à l'ouverture de l'onglet (best-effort,
	// try/catch : un bloqueur ne doit pas casser la page - le bouton reste cliquable).
	const printScript =
		'<script>window.addEventListener("load",function(){setTimeout(function(){try{window.print()}catch(e){}},350);});</script>';
	// Replacements par FONCTION : neutralise toute séquence $ spéciale ($&, $1...) qui
	// pourrait surgir d'une valeur interpolée (couleur/police), au lieu d'un littéral.
	return html
		.replace('</head>', () => `${printStyle}</head>`)
		.replace('</body>', () => `${printBtn}${printScript}</body>`);
}

/**
 * Envoi du brief via Resend. Config injectée. Toutes les erreurs -> { ok: false, reason },
 * jamais d'exception propagée (best-effort, ne casse pas le run).
 */
export async function sendBriefEmail(
	input: SendBriefInput,
	config: EmailBriefConfig
): Promise<SendBriefResult> {
	if (!config.enabled) {
		return { ok: false, skipped: true, reason: 'EMAIL_BRIEF_ENABLED=false' };
	}
	if (!config.apiKey) {
		return { ok: false, skipped: true, reason: 'RESEND_API_KEY manquante' };
	}
	if (!config.to.length) {
		return { ok: false, skipped: true, reason: 'aucun destinataire brief' };
	}

	const { subject, html, text } = buildBriefPayload(input);

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
