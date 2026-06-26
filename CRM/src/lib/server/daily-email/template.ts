/**
 * Email quotidien « Relances du jour » (Daily Email CRM) - rendu pur, deterministe.
 *
 * Structure inspiree du brief quotidien Gouvernance (bandeau pleine largeur a coins
 * CARRES, conteneur arrondi en bas seulement, intro a compteurs colores, sections
 * eyebrow + pastille count, cartes douces par item, CTA, footer, responsive mobile +
 * conditionnel MSO Outlook), mais ADAPTEE au metier FilmPro (relances sur opportunites,
 * pas des taches/agenda) et a la CHARTE EMAIL FilmPro (golden = email-brief.ts : navy
 * #152A45, accent #2F5A9E, Inter, palette froide, logo PNG blanc). Pas de copie : le
 * contenu, le ton et la palette sont FilmPro.
 *
 * Email-safe : tables + styles 100% inline (le <style> n'ajoute QUE du responsive
 * progressif), logo PNG (les clients mail ne rendent pas le SVG inline), AUCUN tiret
 * cadratin, AUCUN emoji, accents FR litteraux, symboles via entites HTML. Reutilise les
 * helpers purs du dashboard temporel (`tacheTitre`, `dueLabel`) SANS les modifier.
 *
 * Contenu « minimal » (decision Pascal 26/06) : relances seules (aujourd'hui + en retard),
 * sans fil d'activite. Compteurs de section = totaux EXACTS (revue 26/06), pas la slice.
 */
import type { TacheDue } from '$lib/utils/dashboardTemporel';
import { tacheTitre, dueLabel } from '$lib/utils/dashboardTemporel';

const CRM_URL = process.env.PUBLIC_APP_URL || 'https://filmpro-portail.vercel.app';
// Logo FilmPro blanc officiel, servi en prod depuis static/. PNG (pas SVG) car les
// clients mail ne rendent pas le SVG inline. Affiche sur le bandeau navy.
const LOGO_URL = `${CRM_URL}/FilmPro_logo_white.png`;

const JOURS_LONGS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS_FR = [
	'janvier',
	'février',
	'mars',
	'avril',
	'mai',
	'juin',
	'juillet',
	'août',
	'septembre',
	'octobre',
	'novembre',
	'décembre'
];

// Charte email FilmPro (subset email-safe, aligne sur email-brief.ts / charte-pdf-filmpro).
const C = {
	navy: '#152A45', // bandeau
	accent: '#2F5A9E', // section « aujourd'hui », liens, CTA
	danger: '#B91C1C', // section « en retard » + anciennete
	title: '#152A45', // titre de carte (navy fort)
	body: '#374151', // intro
	muted: '#6B7280', // meta, footer
	dot: '#C7CFDA', // separateur median discret
	pageBg: '#F1F5F9', // fond de l'email (slate froid)
	cardBg: '#F5F8FC', // fond de carte (cool tres clair, teinte accent)
	cardRule: '#E3EAF3', // bord de carte
	rule: '#E5E7EB', // filets
	white: '#FFFFFF'
} as const;

// Pastilles de count par section (fg = couleur section, bg = teinte douce assortie).
const PILL = {
	today: { fg: C.accent, bg: '#EAF0F9' },
	late: { fg: C.danger, bg: '#FBEAEA' }
} as const;

const FONT = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Plafond d'items AFFICHES par section ; au-dela, « + N autres » (le total reste exact). */
const SECTION_CAP = 25;

export interface DailyEmailInput {
	/** Relances du jour a AFFICHER (deja cappees a SECTION_CAP par la requete). */
	today: TacheDue[];
	/** Relances en retard a AFFICHER (deja cappees a SECTION_CAP). */
	late: TacheDue[];
	/** Compte EXACT des relances du jour (sert aux pastilles et au « + N autres »). */
	todayTotal: number;
	/** Compte EXACT des relances en retard. */
	lateTotal: number;
	/** Date du jour `YYYY-MM-DD`. */
	todayIso: string;
	/** Injectable pour des libelles deterministes en test. */
	now?: Date;
}

export interface DailyEmailPayload {
	subject: string;
	html: string;
	text: string;
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function capitalize(s: string): string {
	return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Libelle humain du jour : « vendredi 26 juin 2026 ». Fallback = iso brut. */
function dateFr(iso: string): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
	if (!m) return iso;
	const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
	return `${JOURS_LONGS[d.getDay()]} ${d.getDate()} ${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

/** Sujet adaptatif. Point median (U+00B7) en clair, jamais de cadratin. */
function subjectLine(todayTotal: number, lateTotal: number): string {
	const parts: string[] = [];
	if (todayTotal > 0) parts.push(`${todayTotal} aujourd'hui`);
	if (lateTotal > 0) parts.push(`${lateTotal} en retard`);
	const tail = parts.length ? ` · ${parts.join(', ')}` : '';
	return `FilmPro · Relances du jour${tail}`;
}

const SEP = ` <span style="color:${C.dot};">&middot;</span> `;

/** Ligne d'intro adaptative, sous le bandeau. Compteurs colores (accent / danger). */
function introHtml(todayTotal: number, lateTotal: number): string {
	const bits: string[] = [];
	if (todayTotal > 0) {
		bits.push(`<span style="color:${C.accent};font-weight:700;">${todayTotal} à faire aujourd'hui</span>`);
	}
	if (lateTotal > 0) {
		bits.push(`<span style="color:${C.danger};font-weight:700;">${lateTotal} en retard</span>`);
	}
	if (!bits.length) return 'Aucune relance en attente.';
	return `Voici tes relances : ${bits.join(SEP)}.`;
}

/** Meta sous le titre d'une carte : anciennete (si en retard) + entreprise (si titre custom). */
function metaLineHtml(t: TacheDue, kind: 'today' | 'late', todayIso: string, now: Date): string {
	const bits: string[] = [];
	if (kind === 'late') {
		const age = dueLabel(t.date_relance_prevue, todayIso, now);
		if (age.text) bits.push(`<span style="color:${C.danger};font-weight:700;">${escapeHtml(age.text)}</span>`);
	}
	// L'entreprise n'est ajoutee que si le titre est custom (sinon tacheTitre vaut deja
	// « Relancer <entreprise> » -> on eviterait un doublon).
	const ent = t.entreprise?.raison_sociale?.trim();
	if (t.titre?.trim() && ent) {
		bits.push(`<span style="color:${C.muted};">${escapeHtml(ent)}</span>`);
	}
	if (!bits.length) return '';
	return `<div class="tx-meta" style="margin-top:5px;font-size:12.5px;line-height:18px;">${bits.join(SEP)}</div>`;
}

/** Carte douce d'une relance (enveloppe cool + titre navy + meta). */
function cardHtml(t: TacheDue, kind: 'today' | 'late', todayIso: string, now: Date, first: boolean): string {
	const top = first ? '14px' : '10px';
	const titre = escapeHtml(tacheTitre(t));
	return `        <tr>
          <td class="gp" style="padding:${top} 28px 0 28px;font-family:${FONT};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.cardBg};border:1px solid ${C.cardRule};border-radius:10px;">
              <tr>
                <td style="padding:12px 16px 13px 16px;">
                  <span class="tx-title" style="font-size:15px;line-height:21px;font-weight:700;color:${C.title};overflow-wrap:break-word;word-break:break-word;">${titre}</span>${metaLineHtml(t, kind, todayIso, now)}
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
}

const SECTION_LABEL = { today: "À faire aujourd'hui", late: 'En retard' } as const;

/** Section complete : eyebrow (label + pastille total) + cartes + « + N autres ». Vide si total 0. */
function sectionHtml(
	kind: 'today' | 'late',
	taches: TacheDue[],
	total: number,
	todayIso: string,
	now: Date
): string {
	if (!total) return '';
	const pill = PILL[kind];
	const color = kind === 'today' ? C.accent : C.danger;
	const cards = taches.map((t, i) => cardHtml(t, kind, todayIso, now, i === 0)).join('\n');
	const overflow = total - taches.length;
	const more =
		overflow > 0
			? `\n        <tr>
          <td class="gp" style="padding:10px 28px 0 28px;font-family:${FONT};">
            <div style="font-size:12.5px;color:${C.muted};">+ ${overflow} autre${overflow > 1 ? 's' : ''}, <a href="${CRM_URL}/crm" style="color:${C.accent};text-decoration:none;">voir le CRM</a></div>
          </td>
        </tr>`
			: '';
	return `        <tr>
          <td class="gp" style="padding:26px 28px 0 28px;font-family:${FONT};">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td valign="middle"><span style="font-size:12px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${color};">${escapeHtml(SECTION_LABEL[kind])}</span></td>
                <td valign="middle" style="padding-left:9px;"><span style="display:inline-block;min-width:18px;text-align:center;font-size:11px;font-weight:700;color:${pill.fg};background:${pill.bg};border-radius:9px;padding:2px 7px;">${total}</span></td>
              </tr>
            </table>
          </td>
        </tr>
${cards}${more}`;
}

/** Bandeau navy pleine largeur, coins CARRES (sommet du conteneur). Logo + eyebrow + date. */
function bannerHtml(dateLongue: string): string {
	return `  <tr>
    <td style="background:${C.navy};padding:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td class="gp" style="padding:22px 28px;font-family:${FONT};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td valign="middle"><img src="${LOGO_URL}" alt="FilmPro" width="150" height="26" style="display:block;border:0;width:150px;height:auto;" /></td>
                <td valign="middle" align="right">
                  <div style="font-size:11px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;color:rgba(255,255,255,.55);">Relances du jour</div>
                  <div style="font-size:13px;font-weight:600;color:#CFD8E5;margin-top:4px;">${escapeHtml(dateLongue)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function renderHtml(input: DailyEmailInput): string {
	const now = input.now ?? new Date();
	const total = input.todayTotal + input.lateTotal;
	const dateLongue = capitalize(dateFr(input.todayIso));
	const preheader = `${total} relance${total > 1 ? 's' : ''} à traiter aujourd'hui.`;

	const todaySection = sectionHtml('today', input.today, input.todayTotal, input.todayIso, now);
	const lateSection = sectionHtml('late', input.late, input.lateTotal, input.todayIso, now);

	return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<title>Relances du jour - FilmPro</title>
<style>
  /* Responsive progressif : marges reduites + corps agrandi sur telephone. Le desktop
     garde le rendu inline. */
  @media only screen and (max-width:480px) {
    .gp { padding-left:16px !important; padding-right:16px !important; }
    .tx-intro { font-size:16px !important; line-height:24px !important; }
    .tx-title { font-size:16px !important; line-height:23px !important; }
    .tx-meta  { font-size:13px !important; }
    .tx-foot  { font-size:13px !important; line-height:20px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.pageBg};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.pageBg};font-size:1px;line-height:1px;">${escapeHtml(preheader)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.pageBg};">
  <tr>
    <td align="center" style="padding:24px 16px;">
      <!--[if (gte mso 9)|(IE)]><table role="presentation" align="center" width="640" cellpadding="0" cellspacing="0" border="0"><tr><td style="width:640px;"><![endif]-->
      <table role="presentation" align="center" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;background:${C.white};border-radius:0 0 14px 14px;overflow:hidden;border:1px solid ${C.rule};">

${bannerHtml(dateLongue)}

        <tr>
          <td class="gp" style="padding:26px 28px 2px 28px;font-family:${FONT};">
            <p class="tx-intro" style="margin:0;font-size:15px;line-height:23px;color:${C.body};">${introHtml(input.todayTotal, input.lateTotal)}</p>
          </td>
        </tr>

${todaySection}
${lateSection}

        <tr>
          <td class="gp" style="padding:28px 28px 6px 28px;font-family:${FONT};">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="background:${C.accent};border-radius:10px;">
                  <a href="${CRM_URL}/crm" target="_blank" style="display:inline-block;padding:13px 32px;font-family:${FONT};font-size:15px;font-weight:700;color:${C.white};text-decoration:none;border-radius:10px;">Ouvrir le CRM</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="gp" style="padding:20px 28px 32px 28px;font-family:${FONT};">
            <div class="tx-foot" style="border-top:1px solid ${C.rule};padding-top:16px;font-size:12.5px;line-height:19px;color:${C.muted};">
              Rappel quotidien du CRM FilmPro, envoyé le matin les jours où tu as des relances en cours. Les relances se mettent à jour dans le CRM, pas en répondant à ce mail.
            </div>
          </td>
        </tr>

      </table>
      <!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->
      <div style="font-size:11px;color:${C.muted};margin-top:14px;font-family:${FONT};">FilmPro &middot; Traitements pour vitrage, Suisse romande</div>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function renderText(input: DailyEmailInput): string {
	const now = input.now ?? new Date();
	const lines: string[] = [];
	lines.push(`FilmPro - Relances du jour - ${dateFr(input.todayIso)}`);

	if (input.todayTotal > 0) {
		lines.push('');
		lines.push(`À FAIRE AUJOURD'HUI (${input.todayTotal})`);
		for (const t of input.today) lines.push(`  - ${tacheTitre(t)}`);
		const overflow = input.todayTotal - input.today.length;
		if (overflow > 0) lines.push(`  + ${overflow} autre${overflow > 1 ? 's' : ''}, voir le CRM`);
	}

	if (input.lateTotal > 0) {
		lines.push('');
		lines.push(`EN RETARD (${input.lateTotal})`);
		for (const t of input.late) {
			const age = dueLabel(t.date_relance_prevue, input.todayIso, now);
			lines.push(`  - ${tacheTitre(t)}${age.text ? ` (${age.text})` : ''}`);
		}
		const overflow = input.lateTotal - input.late.length;
		if (overflow > 0) lines.push(`  + ${overflow} autre${overflow > 1 ? 's' : ''}, voir le CRM`);
	}

	lines.push('');
	lines.push(`Ouvrir le CRM : ${CRM_URL}/crm`);
	return lines.join('\n');
}

/** Pur : construit le payload Resend du daily. Expose pour tests + apercu navigateur. */
export function buildDailyEmailPayload(input: DailyEmailInput): DailyEmailPayload {
	return {
		subject: subjectLine(input.todayTotal, input.lateTotal),
		html: renderHtml(input),
		text: renderText(input)
	};
}
