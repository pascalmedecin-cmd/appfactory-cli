/**
 * Export PDF du plan de découpe (outil « Découpe Films »).
 *
 * ADR-0005 : export VECTORIEL, côté client, à la demande. Template FilmPro validé avec Pascal
 * (checkpoint AC-025, maquette `.product-architect/decoupe/pdf-template-mockup.html`).
 *
 * Architecture = MOTEUR DE FLUX (doctrine projet `.svelte` = e2e ; tout le métier en `.ts` pur testé).
 * Le document est une suite de blocs posés de haut en bas par `layoutDecoupePdf` (PUR, testé) :
 *  - blocs INSÉCABLES (titre, KPI, alertes, commande, en-tête de section, identité+schéma d'un
 *    film, note) : posés entiers ; basculent en page suivante s'ils ne tiennent pas (golden §1).
 *  - bloc SÉCABLE = la liste de coupe d'un film : se remplit jusqu'au bas de page puis CONTINUE
 *    page suivante avec en-tête de colonnes répété + rappel « (suite) » (golden §4). Une ligne
 *    n'est jamais coupée. Anti-orphelin : identité + en-tête + 2 lignes restent ensemble.
 *  - cadre de carte dessiné PAR SEGMENT de page → la liste est toujours DANS un cadre.
 * Garantie testable : aucun élément ne franchit la zone de contenu (bas ≤ CONTENT_BOTTOM).
 *
 * Le rendu effectif (jsPDF + svg2pdf + polices DM Sans/Mono embarquées) est en dynamic import
 * dans `exportDecoupePdf` → hors bundle initial, exercé en e2e. Attributs de style INLINE
 * (svg2pdf ignore le CSS), couleurs pré-mélangées (pas de fill-opacity), chute en aplat (pas de
 * `<pattern>`), baselines de texte calculées (pas de dominant-baseline).
 */
import {
	FAMILLE_LABEL,
	RAISON_LABEL,
	alerteTitre,
	chuteClass,
	cutGroups,
	familleColor,
	filmMetrics,
	formatM2,
	formatMetres,
	formatMetresCourt,
	formatPct,
	makeColorOf,
	pieceTextColor,
	stripGeometry,
	synthese,
	STRIP_LABEL_FONT,
	type CutGroup,
	type SeuilClass
} from './presenter';
import type { PlanProduit, ResultatOptimisation } from './types';

// --- Entrée (reproductible / pure : aucune fonction, aucun état) ------------------------------
export interface DecoupePdfInput {
	titre: string; // ex. « Villa Léman, étage 2 » ou « 3 chantiers consolidés »
	dateLabel: string; // ex. « 05.06.2026 à 14:32 »
	nbVitres: number;
	resultat: ResultatOptimisation;
	produitsInfo: Record<string, { reference: string; nom: string; famille: string; fabricant: string }>;
	vitresInfo: Record<string, { produit_id: string; largeur_mm: number; hauteur_mm: number; quantite: number }>;
	vitreOrder: string[]; // ordre de saisie des vitres → couleurs de pièce déterministes
}

// --- Géométrie A4 (points PDF : 1 mm = 2.834645 pt) -------------------------------------------
const MM = 2.834645;
export const PAGE_W = 210 * MM; // 595.28
export const PAGE_H = 297 * MM; // 841.89
const MARGIN = 15 * MM; // 42.52
const CW = PAGE_W - 2 * MARGIN; // largeur de contenu
const HEADER_H = 44; // en-tête identité en haut de chaque page
export const CONTENT_TOP = MARGIN + HEADER_H + 14;
export const CONTENT_BOTTOM = PAGE_H - MARGIN - 18; // réserve pied de page
const GAP = 11; // gouttière entre blocs
const CARD_PAD_X = 14; // marge interne gauche/droite de carte
const ROW_H = 22; // hauteur d'une ligne de liste de coupe (aérée)
const CARD_BOTTOM_PAD = 14; // marge basse interne de carte
const CONT_LEAD_H = 42; // hauteur du rappel d'identité en continuation

// --- Palette (tokens golden, en hex solide) ---------------------------------------------------
const C = {
	logo: '#00003B',
	primary: '#2F5A9E',
	text: '#111827',
	body: '#374151',
	muted: '#6B7280',
	faint: '#70757E', // gris tertiaire accessible (4,63:1 sur blanc) ; reste plus clair que muted (4,83:1)
	border: '#E5E7EB',
	borderStrong: '#D1D5DB',
	surfaceAlt: '#F9FAFB',
	sunken: '#F3F4F6',
	amber: '#F79009',
	amberTx: '#B54708',
	amberBg: '#FFFAEB',
	amberBd: '#FEDF89',
	greenTx: '#027A48',
	greenBg: '#ECFDF3',
	greenBd: '#A6F4C5',
	redTx: '#B42318',
	redBg: '#FEF3F2',
	redBd: '#FECDCA'
} as const;

const CHUTE_PALETTE: Record<SeuilClass, { tx: string; bg: string; bd: string }> = {
	good: { tx: C.greenTx, bg: C.greenBg, bd: C.greenBd },
	mid: { tx: C.amberTx, bg: C.amberBg, bd: C.amberBd },
	high: { tx: C.redTx, bg: C.redBg, bd: C.redBd }
};

// --- Helpers couleur ---------------------------------------------------------------------------
function hexToRgb(hex: string): [number, number, number] {
	const h = hex.replace('#', '');
	return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex(r: number, g: number, b: number): string {
	const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
	return `#${c(r)}${c(g)}${c(b)}`;
}
/** Mélange `hex` à `alpha` sur fond blanc (remplace fill-opacity, robuste svg2pdf). */
export function tint(hex: string, alpha: number): string {
	const [r, g, b] = hexToRgb(hex);
	return rgbToHex(alpha * r + (1 - alpha) * 255, alpha * g + (1 - alpha) * 255, alpha * b + (1 - alpha) * 255);
}

// --- Helpers SVG (attributs inline) ------------------------------------------------------------
function f(n: number): string {
	return Number(n.toFixed(2)).toString();
}
function esc(s: string): string {
	// Normalise les tirets longs (cadratin/demi-cadratin) en tiret court — règle typo FR (REDACTION-FR.md) :
	// défense en profondeur contre une donnée saisie avec un « — » (autocorrection fréquente).
	return s
		.replace(/[—–]/g, '-')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
/** Tronque à `max` caractères (ellipsis) sans laisser de parenthèse ouverte orpheline. */
export function ellipsize(s: string, max: number): string {
	if (s.length <= max) return s;
	let cut = s.slice(0, Math.max(0, max - 1)).trimEnd();
	// éviter une troncature « … (vernis… » : si une parenthèse reste ouverte, couper avant elle.
	if ((cut.match(/\(/g) ?? []).length > (cut.match(/\)/g) ?? []).length) {
		const lp = cut.lastIndexOf('(');
		if (lp > 0) cut = cut.slice(0, lp).trimEnd();
	}
	return cut + '…';
}
function rect(x: number, y: number, w: number, h: number, fill: string, stroke?: string, sw = 1, r = 0): string {
	const rr = r ? ` rx="${f(r)}" ry="${f(r)}"` : '';
	const st = stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : '';
	return `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${rr} fill="${fill}"${st}/>`;
}
interface TextOpts {
	size?: number;
	weight?: 400 | 700;
	fill?: string;
	anchor?: 'start' | 'middle' | 'end';
	mono?: boolean;
	rotate?: number;
}
/** Texte avec baseline en `y` (pas de dominant-baseline → identique navigateur ↔ svg2pdf). */
function text(x: number, y: number, s: string, o: TextOpts = {}): string {
	const size = o.size ?? 9;
	const family = o.mono ? 'DMMono' : 'DMSans';
	const rot = o.rotate ? ` transform="rotate(${o.rotate} ${f(x)} ${f(y)})"` : '';
	return `<text x="${f(x)}" y="${f(y)}" font-family="${family}" font-size="${size}" font-weight="${o.weight ?? 400}" fill="${o.fill ?? C.body}" text-anchor="${o.anchor ?? 'start'}"${rot}>${esc(s)}</text>`;
}
function line(x1: number, y1: number, x2: number, y2: number, stroke: string, sw = 1): string {
	return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${stroke}" stroke-width="${sw}"/>`;
}
/**
 * Jauge circulaire (donut) : anneau de fond + arc proportionnel à `frac` ∈ [0,1], départ à 12 h,
 * sens horaire. L'arc est approximé par des segments de droite (path M/L) → rendu garanti par
 * svg2pdf (pas de dépendance à la commande d'arc « A »). Reproduit le `kpi-spark` du golden validé.
 */
export function gauge(cx: number, cy: number, r: number, frac: number, color: string, bg: string, sw: number): string {
	const fr = Math.min(1, Math.max(0, frac));
	let s = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="none" stroke="${bg}" stroke-width="${sw}"/>`;
	if (fr <= 0.001) return s;
	const a0 = -Math.PI / 2;
	const steps = Math.max(2, Math.round(fr * 48));
	const pts: string[] = [];
	for (let k = 0; k <= steps; k++) {
		const a = a0 + fr * 2 * Math.PI * (k / steps);
		pts.push(`${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`);
	}
	s += `<path d="M${pts.join(' L')}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
	return s;
}
/** Décalage de baseline pour centrer verticalement un texte de taille `size` sur `cy`. */
function midBaseline(cy: number, size: number): number {
	return cy + size * 0.34;
}
/** Découpe un texte en lignes tenant dans `maxChars` caractères (wrap par mots). */
export function wrapText(s: string, maxChars: number): string[] {
	const words = s.split(' ');
	const lines: string[] = [];
	let cur = '';
	for (const w of words) {
		if (cur && (cur + ' ' + w).length > maxChars) {
			lines.push(cur);
			cur = w;
		} else {
			cur = cur ? cur + ' ' + w : w;
		}
	}
	if (cur) lines.push(cur);
	return lines;
}

// --- Icônes Lucide (paths 24×24, rendues vectorielles par svg2pdf) ----------------------------
const ICON_PATHS: Record<string, { d: string[]; circles?: [number, number, number][]; sw: number }> = {
	scissors: { sw: 1.75, circles: [[6, 6, 3], [6, 18, 3]], d: ['M8.12 8.12 12 12', 'M20 4 8.12 15.88', 'M14.8 14.8 20 20'] },
	ruler: { sw: 1.75, d: ['M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z', 'm14.5 12.5 2-2', 'm11.5 9.5 2-2', 'm8.5 6.5 2-2', 'm17.5 15.5 2-2'] },
	layers: { sw: 1.75, d: ['m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z', 'm22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65', 'm22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65'] },
	truck: { sw: 1.75, circles: [[17, 18, 2], [7, 18, 2]], d: ['M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2', 'M15 18H9', 'M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14'] },
	box: { sw: 1.75, d: ['M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z', 'm3.3 7 8.7 5 8.7-5', 'M12 22V12'] },
	alert: { sw: 2, d: ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z', 'M12 9v4', 'M12 17h.01'] },
	check: { sw: 2, d: ['M21.801 10A10 10 0 1 1 17 3.335', 'm9 11 3 3L22 4'] }
};
function icon(name: keyof typeof ICON_PATHS, cx: number, cy: number, size: number, color: string): string {
	const ic = ICON_PATHS[name];
	const k = size / 24;
	const parts = ic.d.map((d) => `<path d="${d}"/>`);
	for (const [ccx, ccy, r] of ic.circles ?? []) parts.push(`<circle cx="${ccx}" cy="${ccy}" r="${r}"/>`);
	return `<g transform="translate(${f(cx - size / 2)} ${f(cy - size / 2)}) scale(${f(k)})" fill="none" stroke="${color}" stroke-width="${ic.sw}" stroke-linecap="round" stroke-linejoin="round">${parts.join('')}</g>`;
}

// --- Logo FilmPro (verbatim, mêmes tracés que le golden / l'app) -------------------------------
const LOGO_PATHS =
	'M193.419,849.762h-38.175V662.449h119.879v35.163h-81.705v43.793h73.718v34.115h-73.718V849.762z M329.33,849.762h-37.651V714.824h37.651V849.762z M310.439,696.827c-6.233,0-11.698-2.017-16.244-5.994c-4.624-4.047-6.968-9.442-6.968-16.039c0-6.598,2.344-11.994,6.968-16.039c4.546-3.978,10.011-5.994,16.244-5.994s11.698,2.017,16.244,5.994c4.624,4.045,6.968,9.441,6.968,16.039c0,6.597-2.344,11.992-6.968,16.039C322.137,694.811,316.672,696.827,310.439,696.827z M388.383,849.762h-37.651v-192.55h37.651V849.762z M627.866,849.762h-37.65v-77.943c0-7.927-2.125-14.379-6.315-19.177c-4.18-4.781-10.24-7.105-18.527-7.105c-5.306,0-10.113,1.171-14.286,3.481c-4.163,2.303-7.481,5.476-9.861,9.429c-2.373,3.941-3.576,8.528-3.576,13.634v77.682H500v-77.943c0-7.927-2.125-14.379-6.315-19.177c-4.18-4.781-10.24-7.105-18.527-7.105c-5.306,0-10.113,1.171-14.286,3.481c-4.163,2.303-7.481,5.476-9.861,9.429c-2.373,3.941-3.576,8.528-3.576,13.634v77.682h-37.651V714.824h37.651v13.59c2.631-3.028,5.519-5.658,8.631-7.854c4.606-3.252,9.602-5.703,14.847-7.287c5.232-1.576,10.581-2.376,15.898-2.376c10.64,0,19.77,2.397,27.137,7.125c6.303,4.048,11.04,9.229,14.122,15.435c5.826-7.831,12.814-13.509,20.81-16.901c8.85-3.755,18.055-5.658,27.361-5.658c12.646,0,22.885,2.535,30.434,7.533c7.549,5.004,13.04,11.517,16.322,19.358c3.231,7.719,4.869,15.908,4.869,24.341V849.762z M676.095,847.762V664.449h68.873c13.18,0,24.878,2.292,35.091,6.875c10.214,4.582,18.222,11.194,24.027,19.837c5.805,8.642,8.707,19.03,8.707,31.163c0,12.396-2.684,22.871-8.052,31.425c-5.369,8.556-13.16,15.058-23.373,19.51s-22.609,6.678-37.186,6.678H710.27v67.825H676.095z M710.27,750.999h33.781c10.911,0,19.399-2.269,25.468-6.809c6.066-4.538,9.101-11.608,9.101-21.212c0-9.514-3.122-16.715-9.362-21.604c-6.242-4.888-14.557-7.333-24.943-7.333H710.27V750.999z M827.196,847.762V716.824h33.65v17.153c4.538-7.681,10.233-13.137,17.088-16.367c6.852-3.229,14.249-4.845,22.193-4.845c2.793,0,5.368,0.131,7.726,0.393c2.356,0.262,4.626,0.655,6.809,1.179l-4.189,34.567c-2.707-0.872-5.522-1.571-8.446-2.095c-2.925-0.524-5.826-0.786-8.707-0.786c-9.428,0-17.197,2.838-23.307,8.511c-6.111,5.676-9.166,13.532-9.166,23.569v69.658H827.196z M982.619,851.689c-13.968,0-26.341-3.165-37.121-9.492c-10.781-6.328-19.248-14.751-25.401-25.271c-6.154-10.518-9.231-22.062-9.231-34.633c0-9.251,1.768-18.069,5.303-26.449s8.511-15.777,14.927-22.193s13.988-11.478,22.718-15.189c8.728-3.709,18.331-5.564,28.807-5.564c13.879,0,26.208,3.143,36.989,9.428c10.78,6.285,19.248,14.688,25.402,25.205c6.154,10.521,9.23,22.108,9.23,34.764c0,9.254-1.768,18.049-5.303,26.384c-3.535,8.337-8.49,15.735-14.861,22.194c-6.373,6.461-13.924,11.545-22.652,15.254C1002.695,849.834,993.093,851.689,982.619,851.689z M982.488,822.36c7.418,0,14.01-1.637,19.771-4.91c5.761-3.273,10.299-7.899,13.617-13.88c3.316-5.979,4.976-13.071,4.976-21.277c0-8.204-1.637-15.319-4.91-21.343c-3.273-6.022-7.813-10.648-13.617-13.879c-5.807-3.229-12.419-4.845-19.837-4.845c-7.333,0-13.902,1.616-19.706,4.845c-5.807,3.23-10.345,7.856-13.618,13.879c-3.273,6.023-4.91,13.139-4.91,21.343c0,8.206,1.657,15.299,4.976,21.277c3.316,5.98,7.856,10.606,13.618,13.88C968.608,820.724,975.155,822.36,982.488,822.36z';
const LOGO_VB = { x: 150, y: 645, h: 212 };
function logo(x: number, y: number, h: number): string {
	const k = h / LOGO_VB.h;
	const squares = `<g fill="${C.logo}"><g opacity="0.24"><rect x="1223.987" y="647.388" width="120" height="120"/></g><g opacity="0.62"><rect x="1182.781" y="687.575" width="120" height="120"/></g><rect x="1141.575" y="727.762" width="120" height="120"/></g>`;
	return `<g transform="translate(${f(x - LOGO_VB.x * k)} ${f(y - LOGO_VB.y * k)}) scale(${f(k)})"><path d="${LOGO_PATHS}" fill="${C.logo}" fill-rule="evenodd"/>${squares}</g>`;
}

// --- Contexte (synthèse + couleurs déterministes) ---------------------------------------------
interface Ctx {
	input: DecoupePdfInput;
	synth: ReturnType<typeof synthese>;
	colorOf: (id: string) => string;
}
function buildCtx(input: DecoupePdfInput): Ctx {
	return { input, synth: synthese(input.resultat), colorOf: makeColorOf(input.vitreOrder) };
}

// --- Schéma de remplissage (strip) ------------------------------------------------------------
const STRIP_TARGET_H = 78;
const STRIP_PAD = 8;
export interface StripLayout {
	scale: number;
	gw: number;
	gh: number;
	boxW: number;
	boxH: number;
}
export function stripLayout(plan: PlanProduit, maxW: number): StripLayout {
	const s = 88 / plan.laize_mm;
	const declared = Math.round(plan.longueur_consommee_mm * s);
	// Robustesse : la bande doit COUVRIR l'étendue réelle des pièces le long du rouleau, même si
	// `longueur_consommee_mm` est sous-évaluée par rapport aux placements (sinon les pièces sortent
	// du cadre, comme observé sur données incohérentes). Pour des données valides, c'est un no-op.
	const contentUnits = plan.placements.reduce(
		(m, p) => Math.max(m, Math.round(p.y_mm * s) + Math.max(1, Math.round(p.hauteur_placee_mm * s))),
		0
	);
	const gwUnits = Math.max(40, declared, contentUnits);
	const scale = Math.min(STRIP_TARGET_H / 88, (maxW - 2 * STRIP_PAD) / gwUnits);
	const gw = gwUnits * scale;
	const gh = 88 * scale;
	return { scale, gw, gh, boxW: gw + 2 * STRIP_PAD, boxH: gh + 16 };
}
function renderStrip(ctx: Ctx, plan: PlanProduit, x: number, y: number, sl: StripLayout): string {
	const geo = stripGeometry(plan, ctx.colorOf);
	const { scale, gw, gh, boxW, boxH } = sl;
	let s = rect(x, y, boxW, boxH, C.sunken, C.border, 1, 9);
	const ox = x + STRIP_PAD;
	const oy = y + 8;
	s += rect(ox, oy, gw, gh, '#fff', C.border, 0.8, 3); // rouleau (chute = blanc visible)
	for (const r of geo.rects) {
		const rxp = ox + r.x * scale;
		const ryp = oy + r.y * scale;
		const rw = r.w * scale;
		const rh = r.h * scale;
		s += rect(rxp, ryp, rw, rh, tint(r.color, 0.14), r.color, 1.1, 2);
		const fs = STRIP_LABEL_FONT * scale * 0.95;
		// Plancher de lisibilité : sous ~6,5 pt le label est illisible → on le masque (l'info reste
		// dans la liste de coupe ordonnée). Au-dessus : texte en couleur foncée accessible (AA).
		if (r.label && fs >= 6.5) {
			const cx = rxp + rw / 2;
			const cy = ryp + rh / 2;
			s += text(cx, midBaseline(cy, fs), r.label, { size: fs, fill: pieceTextColor(r.color), anchor: 'middle', mono: true, rotate: r.labelOrient === 'v' ? -90 : undefined });
		}
	}
	return s;
}

// --- En-tête / pied de page (par page) --------------------------------------------------------
function renderHeader(input: DecoupePdfInput, suite: boolean): string {
	const rx = PAGE_W - MARGIN;
	let s = logo(MARGIN, MARGIN, 18);
	s += text(rx, MARGIN + 8, suite ? ellipsize(input.titre, 46) : 'Traitements pour vitrage', { size: 9, fill: C.muted, anchor: 'end', weight: 700 });
	s += text(rx, MARGIN + 19, suite ? 'Plan de découpe · suite' : 'PLAN DE DÉCOUPE', { size: 9, fill: C.primary, anchor: 'end', weight: 700 });
	s += line(MARGIN, MARGIN + 26, rx, MARGIN + 26, C.logo, 1.4);
	return s;
}
function renderFooter(input: DecoupePdfInput, page: number, total: number): string {
	const yb = PAGE_H - MARGIN + 4;
	let s = line(MARGIN, PAGE_H - MARGIN - 6, PAGE_W - MARGIN, PAGE_H - MARGIN - 6, C.border, 1);
	s += text(MARGIN, yb, `FilmPro · Plan de découpe · ${ellipsize(input.titre, 48)}`, { size: 8, fill: C.faint });
	s += text(PAGE_W - MARGIN, yb, `${input.dateLabel.split(' à ')[0]} · page ${page} / ${total}`, { size: 8, fill: C.faint, anchor: 'end', mono: true });
	return s;
}

// --- Bloc titre -------------------------------------------------------------------------------
const TITLE_H = 60;
function renderTitle(ctx: Ctx, y: number): string {
	const { input, synth } = ctx;
	// Pastille de statut (calculée d'abord : sa largeur borne la troncature du titre).
	const ok = synth.statutOk;
	const pal = ok ? CHUTE_PALETTE.good : CHUTE_PALETTE.mid;
	const label = ok ? 'Prêt à découper' : 'À vérifier';
	const pw = label.length * 5.2 + 34;
	const px = PAGE_W - MARGIN - pw;
	// Le titre s'arrête AVANT la pastille (gap 12 pt) : largeur max → nombre de caractères max
	// à 19 pt gras (avance ≈ 0,58 em, conservateur pour ne jamais chevaucher). Plafond 52.
	const titleMaxChars = Math.min(52, Math.floor((px - MARGIN - 12) / (19 * 0.58)));
	let s = text(MARGIN, y + 9, "RÉSULTAT DE L'OPTIMISATION", { size: 8, fill: C.faint, weight: 700 });
	s += text(MARGIN, y + 28, ellipsize(input.titre, titleMaxChars), { size: 19, fill: C.text, weight: 700 });
	const meta = `${input.nbVitres} vitre${input.nbVitres > 1 ? 's' : ''} saisie${input.nbVitres > 1 ? 's' : ''}   ·   ${synth.nbFilms} film${synth.nbFilms > 1 ? 's' : ''} · ${synth.nbCommandes} à commander   ·   établi le ${input.dateLabel}`;
	s += text(MARGIN, y + 43, meta, { size: 9.5, fill: C.muted });
	s += rect(px, y + 4, pw, 22, pal.bg, pal.bd, 1.25, 11);
	s += icon(ok ? 'check' : 'alert', px + 15, y + 15, 13, pal.tx);
	s += text(px + 25, midBaseline(y + 15, 10), label, { size: 10, fill: pal.tx, weight: 700 });
	return s;
}

// --- Bloc KPI ---------------------------------------------------------------------------------
const KPI_H = 74;
function kpiCard(x: number, y: number, w: number, h: number, lbl: string, ico: keyof typeof ICON_PATHS, val: string, unit: string, subLines: string[], valColor: string, accent?: string, gaugeFrac?: number): string {
	let s = rect(x, y, w, h, '#fff', accent ?? C.border, accent ? 1.4 : 1, 9);
	s += icon(ico, x + 16, y + 16, 12, C.faint);
	s += text(x + 26, midBaseline(y + 16, 9), lbl, { size: 9, fill: C.muted });
	// Jauge circulaire (golden kpi-spark) : seulement sur la carte qui la fournit (taux de chute).
	if (gaugeFrac !== undefined) s += gauge(x + w - 17, y + 17, 11, gaugeFrac, valColor, C.sunken, 3.5);
	s += text(x + 11, y + 42, val, { size: 21, fill: valColor, weight: 700, mono: true });
	s += text(x + 13 + val.length * 12.5, y + 42, unit, { size: 11, fill: C.muted, weight: 700 });
	subLines.slice(0, 2).forEach((ln, i) => {
		s += text(x + 11, y + 54 + i * 10, ellipsize(ln, 26), { size: 8.5, fill: C.faint });
	});
	return s;
}
function renderKpi(ctx: Ctx, y: number): string {
	const { synth } = ctx;
	const gap = 9;
	const w = (CW - 3 * gap) / 4;
	const h = 68;
	const chutePal = CHUTE_PALETTE[chuteClass(synth.chuteMoy)];
	let s = kpiCard(MARGIN, y, w, h, 'Taux de chute', 'scissors', formatPct(synth.chuteMoy), '%', [`remplissage ${formatPct(synth.remplMoy)} %`, `${formatM2(synth.pieceSurf)} / ${formatM2(synth.rollSurf)}`], chutePal.tx, chutePal.bd, synth.chuteMoy);
	const eco = synth.economieLong > 0 ? [`${formatMetresCourt(synth.economieLong)} m économisés`, 'vs pose séquentielle'] : ['aucun regroupement', 'possible'];
	s += kpiCard(MARGIN + (w + gap), y, w, h, 'Film à découper', 'ruler', formatMetresCourt(synth.totalLong), 'm', eco, C.text);
	s += kpiCard(MARGIN + 2 * (w + gap), y, w, h, 'Films · pièces', 'layers', String(synth.nbFilms), synth.nbFilms > 1 ? 'films' : 'film', [`${synth.nbPieces} pièce${synth.nbPieces > 1 ? 's' : ''} posée${synth.nbPieces > 1 ? 's' : ''}`, 'en découpe interne'], C.text);
	s += kpiCard(MARGIN + 3 * (w + gap), y, w, h, 'À commander', 'truck', String(synth.nbCommandes), synth.nbCommandes > 1 ? 'pièces' : 'pièce', ['sur-mesure ou', 'produit non nestable'], synth.nbCommandes > 0 ? C.amberTx : C.text);
	return s;
}

// --- Bloc alertes -----------------------------------------------------------------------------
function alertsHeight(n: number): number {
	return 16 + n * 18 + 12;
}
function renderAlerts(ctx: Ctx, y: number): string {
	const al = ctx.input.resultat.alertes;
	const h = alertsHeight(al.length);
	let s = rect(MARGIN, y, CW, h, C.amberBg, C.amberBd, 1, 10);
	s += rect(MARGIN, y, 3, h, C.amber);
	s += icon('alert', MARGIN + 20, y + 18, 16, C.amberTx);
	s += text(MARGIN + 36, y + 16, `${al.length} point${al.length > 1 ? 's' : ''} à vérifier avant de lancer`, { size: 10.5, fill: C.amberTx, weight: 700 });
	al.forEach((a, i) => {
		const ly = y + 34 + i * 18;
		const v = ctx.input.vitresInfo[a.vitre_id];
		const dims = v ? `${v.largeur_mm} × ${v.hauteur_mm} mm` : '';
		s += text(MARGIN + 36, ly, ellipsize(`${alerteTitre(a.type)} · ${a.message}`, 78), { size: 9.5, fill: C.body });
		if (dims) s += text(PAGE_W - MARGIN - 8, ly, dims, { size: 9, fill: C.amberTx, anchor: 'end', mono: true });
	});
	return s;
}

// --- Bloc commande fournisseur ----------------------------------------------------------------
const ORDER_ROW_H = 32;
function orderHeight(n: number): number {
	return 16 + n * ORDER_ROW_H + 22;
}
function renderOrder(ctx: Ctx, y: number): string {
	const cmds = ctx.input.resultat.commandes_fournisseur;
	let s = text(MARGIN, y + 9, `À COMMANDER CHEZ LE FOURNISSEUR · ${cmds.length}`, { size: 8.5, fill: C.faint, weight: 700 });
	const top = y + 16;
	const tableH = cmds.length * ORDER_ROW_H;
	s += rect(MARGIN, top, CW, tableH + 22, '#fff', C.border, 1, 10);
	cmds.forEach((cmd, i) => {
		const ry = top + i * ORDER_ROW_H;
		const cy = ry + ORDER_ROW_H / 2;
		const v = ctx.input.vitresInfo[cmd.vitre_id];
		const pid = v?.produit_id ?? '';
		const pinfo = ctx.input.produitsInfo[pid];
		const fam = pinfo?.famille ?? 'securite';
		if (i > 0) s += line(MARGIN + 14, ry, PAGE_W - MARGIN - 14, ry, C.border, 1);
		s += rect(MARGIN + 14, cy - 12, 24, 24, familleColor(fam), undefined, 0, 7);
		s += icon('box', MARGIN + 26, cy, 14, '#fff');
		const ref = pinfo?.reference ?? '—';
		s += text(MARGIN + 48, cy - 1, ref, { size: 10.5, fill: C.text, weight: 700 });
		s += text(MARGIN + 48 + ref.length * 6.6 + 6, cy - 1, ellipsize(pinfo?.nom ?? '', 28), { size: 9.5, fill: C.muted });
		if (v) s += text(MARGIN + 48, cy + 11, `${v.largeur_mm} × ${v.hauteur_mm} mm`, { size: 9, fill: C.muted, mono: true });
		const raison = RAISON_LABEL[cmd.raison] ?? cmd.raison;
		const cw = raison.length * 5 + 16;
		s += rect(PAGE_W - MARGIN - 14 - cw, cy - 10.5, cw, 21, C.surfaceAlt, C.border, 1, 10.5);
		s += text(PAGE_W - MARGIN - 14 - cw / 2, midBaseline(cy, 9), raison, { size: 9, fill: C.body, weight: 700, anchor: 'middle' });
	});
	const fy = top + tableH;
	s += line(MARGIN, fy, PAGE_W - MARGIN, fy, C.border, 1);
	s += text(MARGIN + 14, midBaseline(fy + 11, 8.5), 'Ces pièces sortent de la découpe interne (sur-mesure ou produit non nestable).', { size: 8.5, fill: C.muted });
	s += rect(MARGIN, top, CW, tableH + 22, 'none', C.border, 1, 10);
	return s;
}

// --- En-tête de section -----------------------------------------------------------------------
function renderSection(label: string, y: number): string {
	return text(MARGIN, y + 14, label.toUpperCase(), { size: 8.5, fill: C.faint, weight: 700 });
}

// --- Note de clôture --------------------------------------------------------------------------
const NOTE_TEXT =
	'Plan exécutable à l’atelier. La liste de coupe ordonnée est la source de référence ; le schéma l’illustre. Découper les pièces dans l’ordre indiqué, en partant du bord de laize.';
function noteHeight(): number {
	return wrapText(NOTE_TEXT, 112).length * 12 + 8;
}
function renderNote(y: number): string {
	return wrapText(NOTE_TEXT, 112)
		.map((ln, i) => text(MARGIN, y + 12 + i * 12, ln, { size: 9, fill: C.muted }))
		.join('');
}

// --- Film : identité + schéma (lead insécable) + lignes de coupe (sécables) --------------------
const IX = MARGIN + CARD_PAD_X; // x interne de carte
const RX = PAGE_W - MARGIN - CARD_PAD_X; // x droit interne
const CUT_COL = { sw: IX + 4, qty: IX + 24, dim: IX + 58, src: IX + 188, tag: RX };

/** Hauteur du « lead » d'un film (tout ce qui précède la 1re ligne de coupe, dans le cadre). */
function filmLeadHeight(plan: PlanProduit): number {
	return 66 + stripLayout(plan, CW - 2 * CARD_PAD_X).boxH + 93;
}
/** Dessine le lead du film (identité, schéma, métriques, titre + en-tête de la liste de coupe). */
function renderFilmLead(ctx: Ctx, plan: PlanProduit, top: number): string {
	const pinfo = ctx.input.produitsInfo[plan.produit_id];
	const fam = pinfo?.famille ?? 'securite';
	const fm = filmMetrics(plan);
	const famC = familleColor(fam);
	const sl = stripLayout(plan, CW - 2 * CARD_PAD_X);
	let s = '';
	// En-tête film
	s += rect(IX, top + 13, 28, 28, famC, undefined, 0, 8);
	s += icon('scissors', IX + 14, top + 27, 16, '#fff');
	const ref = pinfo?.reference ?? '—';
	s += text(IX + 38, top + 25, ref, { size: 13.5, fill: C.text, weight: 700 });
	if (pinfo?.fabricant) s += text(IX + 38 + ref.length * 8.2 + 8, top + 25, pinfo.fabricant, { size: 9, fill: C.faint });
	s += text(IX + 38, top + 38, ellipsize(pinfo?.nom ?? '', 28), { size: 9.5, fill: C.muted });
	const nomW = Math.min((pinfo?.nom ?? '').length * 4.8 + 6, 140);
	s += `<circle cx="${f(IX + 38 + nomW + 8)}" cy="${f(top + 35)}" r="3.5" fill="${famC}"/>`;
	s += text(IX + 38 + nomW + 16, top + 38, FAMILLE_LABEL[fam] ?? fam, { size: 9, fill: C.body });
	// Pastille chute
	const cp = CHUTE_PALETTE[fm.classe];
	const chuteLbl = `${formatPct(plan.taux_chute)} % de chute`;
	const cw = chuteLbl.length * 5.1 + 30;
	const cx0 = RX - cw;
	s += rect(cx0, top + 16, cw, 24, cp.bg, cp.bd, 1.25, 12);
	s += icon('scissors', cx0 + 15, top + 28, 13, cp.tx);
	s += text(cx0 + 25, midBaseline(top + 28, 10), chuteLbl, { size: 10, fill: cp.tx, weight: 700 });
	// Verdict (remplissage dérivé du même taux que la pastille chute → somme = 100 garantie)
	s += text(IX, top + 58, 'À découper', { size: 9.5, fill: C.muted });
	s += text(IX + 62, top + 58, `Laize ${plan.laize_mm} mm × ${formatMetres(plan.longueur_consommee_mm)}`, { size: 11, fill: C.text, weight: 700, mono: true });
	s += text(RX, top + 58, `remplissage ${formatPct(1 - plan.taux_chute)} %`, { size: 9.5, fill: C.muted, anchor: 'end', mono: true });
	// Schéma
	s += renderStrip(ctx, plan, IX, top + 66, sl);
	// Légende
	const ly = top + 66 + sl.boxH + 14;
	s += rect(IX, ly - 8, 9, 9, tint(famC, 0.14), famC, 1, 2);
	s += text(IX + 14, ly, 'pièces posées', { size: 8.5, fill: C.faint });
	s += rect(IX + 90, ly - 8, 9, 9, '#fff', C.borderStrong, 1, 2);
	s += text(IX + 104, ly, 'chute', { size: 8.5, fill: C.faint });
	s += text(IX + 150, ly, 'échelle : longueur du film à l’échelle de la consommation', { size: 8.5, fill: C.faint });
	// Métriques film
	const myLine = ly + 13;
	s += line(MARGIN, myLine, PAGE_W - MARGIN, myLine, C.border, 1);
	const foot = `${plan.placements.length} pièce${plan.placements.length > 1 ? 's' : ''}   ·   ${formatM2(plan.surface_pieces_mm2)} utiles   ·   ${formatM2(fm.chuteSurf)} de chute`;
	s += text(IX, myLine + 13, foot, { size: 9.5, fill: C.muted });
	// Titre + en-tête de la liste de coupe (la 1re ligne suit immédiatement, dans le cadre)
	const cutLine = myLine + 26;
	s += line(MARGIN, cutLine, PAGE_W - MARGIN, cutLine, C.border, 1);
	s += text(IX, cutLine + 15, `Liste de coupe ordonnée · ${plan.placements.length}`, { size: 9.5, fill: C.body, weight: 700 });
	s += renderCutColHeader(cutLine + 30);
	return s;
}
/** Rappel compact d'identité du film en tête de page de continuation. */
function renderFilmContLead(ctx: Ctx, plan: PlanProduit, top: number): string {
	const pinfo = ctx.input.produitsInfo[plan.produit_id];
	const ref = pinfo?.reference ?? '—';
	let s = text(IX, top + 14, `${ref} · ${ellipsize(pinfo?.nom ?? '', 28)} · liste de coupe (suite)`, { size: 10, fill: C.text, weight: 700 });
	s += renderCutColHeader(top + 30);
	return s;
}
function renderCutColHeader(headBaseline: number): string {
	let s = text(CUT_COL.qty, headBaseline, 'QTÉ', { size: 7.5, fill: C.faint, weight: 700 });
	s += text(CUT_COL.dim, headBaseline, 'DIMENSION DE COUPE', { size: 7.5, fill: C.faint, weight: 700 });
	s += text(CUT_COL.src, headBaseline, 'VITRE SOURCE', { size: 7.5, fill: C.faint, weight: 700 });
	s += line(MARGIN, headBaseline + 6, PAGE_W - MARGIN, headBaseline + 6, C.border, 1);
	return s;
}
function renderCutRow(ctx: Ctx, g: CutGroup, top: number, sepAbove: boolean): string {
	const cy = top + ROW_H / 2;
	const baseline = midBaseline(cy, 10.5);
	let s = sepAbove ? line(CUT_COL.sw - 2, top, RX, top, C.border, 0.8) : '';
	s += rect(CUT_COL.sw - 2, cy - 6.5, 13, 13, tint(ctx.colorOf(g.vitre_id), 0.85), undefined, 0, 4);
	s += text(CUT_COL.qty, baseline, `×${g.n}`, { size: 10.5, fill: C.text, weight: 700, mono: true });
	s += text(CUT_COL.dim, baseline, `${g.w} × ${g.h} mm`, { size: 10.5, fill: C.text, weight: 700, mono: true });
	const v = ctx.input.vitresInfo[g.vitre_id];
	s += text(CUT_COL.src, baseline, v ? `${v.largeur_mm} × ${v.hauteur_mm} mm` : '—', { size: 10, fill: C.muted, mono: true });
	const tags: string[] = [];
	if (g.pivot) tags.push('pivotée');
	if (g.les) tags.push('en lés');
	if (tags.length) s += text(CUT_COL.tag, baseline, tags.join(' · '), { size: 9, fill: C.primary, anchor: 'end', weight: 700 });
	return s;
}

// --- Moteur de flux ---------------------------------------------------------------------------
export interface Placed {
	tag: string;
	y: number;
	h: number;
	svg: string;
	rows?: number; // nb de lignes de coupe portées par un segment de film (testable : anti-veuve)
}
class Flow {
	pages: Placed[][] = [[]];
	y = CONTENT_TOP;
	private cur(): Placed[] {
		return this.pages[this.pages.length - 1];
	}
	curHasContent(): boolean {
		return this.cur().length > 0;
	}
	newPage(): void {
		this.pages.push([]);
		this.y = CONTENT_TOP;
	}
	commit(tag: string, top: number, h: number, svg: string, rows?: number): void {
		this.cur().push({ tag, y: top, h, svg, rows });
		this.y = top + h + GAP;
	}
	/** Pose un bloc insécable ; bascule en page suivante s'il ne tient pas (avec son `keepNext`). */
	atom(tag: string, h: number, draw: (y: number) => string, keepNext = 0): void {
		if (this.cur().length > 0 && this.y + h + keepNext > CONTENT_BOTTOM) this.newPage();
		this.commit(tag, this.y, h, draw(this.y));
	}
}

/** Pose un film : lead insécable + liste de coupe sécable (continue page suivante si besoin). */
function placeFilm(flow: Flow, ctx: Ctx, plan: PlanProduit): void {
	const groups = cutGroups(plan);
	const leadH = filmLeadHeight(plan);
	// Anti-orphelin : lead + min(2, n) lignes doivent tenir ensemble.
	const minRows = Math.min(2, groups.length);
	if (flow.curHasContent() && flow.y + leadH + minRows * ROW_H + CARD_BOTTOM_PAD > CONTENT_BOTTOM) {
		flow.newPage();
	}
	let i = 0;
	let first = true;
	for (;;) {
		const segTop = flow.y;
		const lead = first ? renderFilmLead(ctx, plan, segTop) : renderFilmContLead(ctx, plan, segTop);
		const startI = i;
		const rowTop = segTop + (first ? leadH : CONT_LEAD_H);
		// Lignes qui tiennent dans ce segment.
		let fit = 0;
		while (startI + fit < groups.length && rowTop + (fit + 1) * ROW_H + CARD_BOTTOM_PAD <= CONTENT_BOTTOM) fit++;
		// Anti-veuve : ne pas reléguer 1 ou 2 lignes seules sur la page de continuation suivante.
		// On en rapatrie ici pour que la continuation porte ≥ 3 lignes (si ce segment peut s'en passer).
		const remaining = groups.length - (startI + fit);
		if (remaining >= 1 && remaining <= 2) {
			const need = 3 - remaining;
			const floor = first ? minRows : 1;
			if (fit - need >= floor) fit -= need;
		}
		let rowsSvg = '';
		let rowY = rowTop;
		for (let k = 0; k < fit; k++) {
			rowsSvg += renderCutRow(ctx, groups[startI + k], rowY, k > 0);
			rowY += ROW_H;
		}
		i = startI + fit;
		const segBottom = rowY + CARD_BOTTOM_PAD;
		const h = segBottom - segTop;
		const frame = rect(MARGIN, segTop, CW, h, '#fff', C.border, 1, 12);
		flow.commit(first ? 'film' : 'film-suite', segTop, h, frame + lead + rowsSvg, fit);
		first = false;
		if (i >= groups.length) break;
		flow.newPage();
	}
}

/** Plan complet du document : pages de blocs placés (PUR, testable). */
export function layoutDecoupePdf(input: DecoupePdfInput): { pages: Placed[][] } {
	const ctx = buildCtx(input);
	const flow = new Flow();
	const r = input.resultat;
	flow.atom('title', TITLE_H, (y) => renderTitle(ctx, y));
	flow.atom('kpi', KPI_H, (y) => renderKpi(ctx, y));
	if (r.alertes.length > 0) flow.atom('alerts', alertsHeight(r.alertes.length), (y) => renderAlerts(ctx, y));
	if (r.commandes_fournisseur.length > 0) flow.atom('order', orderHeight(r.commandes_fournisseur.length), (y) => renderOrder(ctx, y));
	if (r.plans.length > 0) {
		const label = `Découpe interne · ${r.plans.length} film${r.plans.length > 1 ? 's' : ''}`;
		// keepNext = vrai début du 1er film (lead + 2 lignes anti-orphelin) : l'en-tête de section
		// bascule AVEC son film plutôt que de rester orpheline en bas de page.
		const p0 = r.plans[0];
		// + GAP : la section et le film sont séparés par une gouttière ; la réserve doit l'inclure.
		const sectionKeep = GAP + filmLeadHeight(p0) + Math.min(2, cutGroups(p0).length) * ROW_H + CARD_BOTTOM_PAD;
		flow.atom('section', 26, (y) => renderSection(label, y), sectionKeep);
		for (const plan of r.plans) placeFilm(flow, ctx, plan);
		flow.atom('note', noteHeight(), (y) => renderNote(y));
	}
	return { pages: flow.pages };
}

/** SVG (chaîne) de chaque page A4 = ce que svg2pdf convertira (prévisualisable en navigateur). */
export function buildPageSvgStrings(input: DecoupePdfInput): string[] {
	const { pages } = layoutDecoupePdf(input);
	const total = pages.length;
	return pages.map((items, i) => {
		const body = items.map((it) => it.svg).join('');
		return (
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(PAGE_W)} ${f(PAGE_H)}" width="${f(PAGE_W)}" height="${f(PAGE_H)}">` +
			`<rect x="0" y="0" width="${f(PAGE_W)}" height="${f(PAGE_H)}" fill="#ffffff"/>` +
			renderHeader(input, i > 0) +
			body +
			renderFooter(input, i + 1, total) +
			`</svg>`
		);
	});
}

// --- Export effectif (impur : dynamic import jsPDF + svg2pdf + polices, hors bundle initial) ---
function fileName(input: DecoupePdfInput): string {
	const slug = input.titre
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase()
		.slice(0, 60);
	return `plan-decoupe-${slug || 'chantier'}.pdf`;
}

/** Génère et télécharge le PDF (appelé depuis l'écran de résultat, côté navigateur). */
export async function exportDecoupePdf(input: DecoupePdfInput): Promise<void> {
	const [{ jsPDF }, svg2pdfMod, fonts] = await Promise.all([import('jspdf'), import('svg2pdf.js'), import('./pdf-fonts')]);
	const svg2pdf = (svg2pdfMod as { svg2pdf: (el: Element, doc: unknown, opts?: unknown) => Promise<unknown> }).svg2pdf;

	const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
	doc.addFileToVFS('DMSans-Regular.ttf', fonts.DMSANS_400);
	doc.addFont('DMSans-Regular.ttf', 'DMSans', 'normal');
	doc.addFileToVFS('DMSans-Bold.ttf', fonts.DMSANS_700);
	doc.addFont('DMSans-Bold.ttf', 'DMSans', 'bold');
	doc.addFileToVFS('DMMono-Regular.ttf', fonts.DMMONO_400);
	doc.addFont('DMMono-Regular.ttf', 'DMMono', 'normal');

	const svgs = buildPageSvgStrings(input);
	for (let i = 0; i < svgs.length; i++) {
		if (i > 0) doc.addPage('a4', 'portrait');
		const el = new DOMParser().parseFromString(svgs[i], 'image/svg+xml').documentElement;
		await svg2pdf(el, doc, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
	}
	doc.save(fileName(input));
}
