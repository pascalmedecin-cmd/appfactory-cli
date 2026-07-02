/**
 * Liste des prospects d'une campagne - export PDF VECTORIEL, côté client (écran Campagnes).
 *
 * Usage métier (Pascal, 2026-07-02) : ouvrir la fiche Google Maps de chaque prospect pour
 * confirmer visuellement ses vitrages (photos), accessoirement emporter la liste d'une campagne.
 * D'où : A4 PAYSAGE, tableau Nom / Adresse / NPA / Localité + colonnes Google (type principal,
 * pastille CLIQUABLE « Ouvrir sur Google Maps » - jamais l'URL brute). Les prospects non-Google
 * sont inclus (colonnes Google à « - »). En-tête logo FilmPro + nom de campagne + date du jour
 * de téléchargement ; pied de page numéroté (1 / N).
 *
 * Doctrine PDF projet (cf. reference_pdf_client_jspdf_svg2pdf + src/lib/decoupe/pdf-export.ts +
 * src/lib/etiquettes/pdf-etiquettes.ts) : layout/SVG PUR top-level testable Vitest ; 1 <svg> par
 * page (viewBox en points PDF) converti par svg2pdf ; attributs de présentation inline ; polices
 * Outfit embarquées ; jsPDF + svg2pdf + polices en DYNAMIC IMPORT. Spécificité de ce moteur :
 * svg2pdf ne produit PAS d'annotations de lien -> le layout pur émet aussi la liste des zones
 * cliquables (page + rectangle + URL) et l'export les pose via `doc.link()` APRÈS le rendu SVG
 * (même repère : viewBox = page en points, origine haut-gauche des deux côtés).
 *
 * Données Google : `prospect_leads` ne stocke pas les types Places en colonne dédiée ; l'import
 * (routes/api/prospection/google-places/+server.ts) les sérialise dans `description` au format
 * « adresse formatée — type1 / type2 — mentions ». On ré-extrait ici le segment « types » par sa
 * signature (tokens snake_case), format produit par notre propre code - source unique, testé.
 */
import type { ProspectCampagne } from '$lib/campagnes';
import { estWidth, ellipsize } from '$lib/etiquettes/pdf-etiquettes';
import { safeHttpUrl } from '$lib/utils/safe-url';
import { campagnePdfFileName } from '$lib/pdf/pdf-filename';

// --- Géométrie A4 PAYSAGE (points PDF : 1 mm = 2.834645 pt) ------------------------------------
const MM = 2.834645;
export const PAGE_W = 297 * MM; // 841.89
export const PAGE_H = 210 * MM; // 595.28
const MARGIN = 34;
const CW = PAGE_W - 2 * MARGIN; // largeur de contenu ≈ 773.89

// --- Palette (mêmes tokens que le PDF Découpe / goldens) ----------------------------------------
const C = {
	logo: '#00003B',
	primary: '#2F5A9E',
	text: '#111827',
	body: '#374151',
	muted: '#6B7280',
	faint: '#70757E',
	border: '#E5E7EB',
	hairline: '#EDF0F4',
	headBg: '#F3F5F9',
	zebra: '#FAFBFD',
	white: '#FFFFFF'
} as const;

// --- Colonnes du tableau (x relatif à MARGIN ; largeurs = zone de texte utile) ------------------
export const LISTE_COLS = {
	nom: { x: 8, w: 182, label: 'Nom' },
	adresse: { x: 198, w: 178, label: 'Adresse' },
	npa: { x: 384, w: 38, label: 'NPA' },
	localite: { x: 430, w: 104, label: 'Localité' },
	type: { x: 542, w: 122, label: 'Type (Google)' },
	maps: { x: 672, w: 100, label: 'Google Maps' }
} as const;

const ROW_H = 24;
const HEAD_H = 20;
const ROW_FONT = 9;
const PILL_W = LISTE_COLS.maps.w;
const PILL_H = 16;
const PILL_FONT = 7.2;
const PILL_LABEL = 'Ouvrir sur Google Maps';

// Zones verticales : en-tête commun (logo + règle), bloc titre (page 1 seulement), pied de page.
const RULE_Y = MARGIN + 26; // règle sous le logo (même construction que le PDF Découpe)
const TABLE_TOP_P1 = MARGIN + 88; // sous le bloc titre
const TABLE_TOP_PN = MARGIN + 40; // pages suivantes : directement sous la règle
const FOOTER_RULE_Y = PAGE_H - MARGIN - 16;
const CONTENT_BOTTOM = FOOTER_RULE_Y - 6;

// --- Extraction des données Google (depuis les champs stockés du lead) --------------------------
const GOOGLE_SOURCE = 'google_places';
const TYPE_TOKEN_RE = /^[a-z][a-z0-9_]*$/;

/**
 * Hôtes admis pour la pastille « Ouvrir sur Google Maps » : le libellé promet Google, l'URL doit
 * tenir la promesse (durcissement audit sécu 02/07 - un `source_url` arbitraire ne doit jamais
 * devenir un lien PDF étiqueté Google). L'import Google écrit `googleMapsUri` ou
 * `placeMapsUrl(placeId)` : tous deux vivent sur ces hôtes.
 */
const MAPS_HOSTS = new Set(['www.google.com', 'google.com', 'maps.google.com', 'www.google.ch', 'maps.app.goo.gl', 'goo.gl']);

function safeMapsUrl(url: string | null): string | null {
	const safe = safeHttpUrl(url);
	if (!safe) return null;
	try {
		return MAPS_HOSTS.has(new URL(safe).hostname.toLowerCase()) ? safe : null;
	} catch {
		return null;
	}
}

/**
 * Ré-extrait les types Google Places sérialisés dans `description` par l'import (segments joints
 * par « — » ; le segment des types = tokens snake_case joints par « / »). Les autres segments
 * (adresse formatée, mentions FR) contiennent espaces/majuscules/virgules et ne matchent jamais.
 */
export function googleTypesFromDescription(description: string | null): string[] {
	if (!description) return [];
	for (const seg of description.split(' — ')) {
		const tokens = seg.split(' / ').map((t) => t.trim());
		if (tokens.length > 0 && tokens.every((t) => TYPE_TOKEN_RE.test(t))) return tokens;
	}
	return [];
}

/** « real_estate_agency » -> « Real estate agency » (lisible, sans inventer de traduction). */
export function humanizeGoogleType(t: string): string {
	const s = t.replace(/_/g, ' ').trim();
	return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

/** Ligne du PDF, dérivée d'un prospect de campagne. Champs Google null si non applicables. */
export interface ListeProspectRow {
	nom: string;
	adresse: string;
	npa: string;
	localite: string;
	typePrincipal: string | null;
	mapsUrl: string | null;
}

export function toListeRow(p: ProspectCampagne): ListeProspectRow {
	const isGoogle = p.source === GOOGLE_SOURCE;
	const types = isGoogle ? googleTypesFromDescription(p.description) : [];
	return {
		nom: p.raison_sociale.trim(),
		adresse: (p.adresse ?? '').trim(),
		npa: (p.npa ?? '').trim(),
		localite: (p.localite ?? '').trim(),
		typePrincipal: types.length > 0 ? humanizeGoogleType(types[0]) : null,
		mapsUrl: isGoogle ? safeMapsUrl(p.source_url) : null
	};
}

// --- Pagination PURE ----------------------------------------------------------------------------
function rowsCapacity(tableTop: number): number {
	return Math.max(1, Math.floor((CONTENT_BOTTOM - (tableTop + HEAD_H)) / ROW_H));
}

/** Répartition des `n` lignes par page (la page 1 porte le bloc titre, donc moins de lignes). */
export function paginateRows(n: number): number[] {
	if (n <= 0) return [];
	const cap1 = rowsCapacity(TABLE_TOP_P1);
	const capN = rowsCapacity(TABLE_TOP_PN);
	const pages: number[] = [Math.min(n, cap1)];
	let rest = n - pages[0];
	while (rest > 0) {
		const take = Math.min(rest, capN);
		pages.push(take);
		rest -= take;
	}
	return pages;
}

// --- Helpers SVG (attributs inline, doctrine svg2pdf) -------------------------------------------
function f(n: number): string {
	return Number(n.toFixed(2)).toString();
}
function esc(s: string): string {
	// Normalise les tirets longs en tiret court (règle typo FR) puis échappe les entités XML.
	return s
		.replace(/[—–]/g, '-')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
interface TextOpts {
	size: number;
	fill: string;
	weight?: 400 | 700;
	anchor?: 'start' | 'middle' | 'end';
}
function text(x: number, baseline: number, s: string, o: TextOpts): string {
	const anchor = o.anchor ?? 'start';
	return `<text x="${f(x)}" y="${f(baseline)}" font-family="Outfit" font-size="${o.size}" font-weight="${o.weight ?? 400}" fill="${o.fill}"${anchor === 'start' ? '' : ` text-anchor="${anchor}"`}>${esc(s)}</text>`;
}
function rect(x: number, y: number, w: number, h: number, fill: string, rx = 0): string {
	return `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${rx ? ` rx="${f(rx)}"` : ''}/>`;
}
function line(x1: number, y1: number, x2: number, y2: number, stroke: string, sw: number): string {
	return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${stroke}" stroke-width="${f(sw)}"/>`;
}

// --- Zone cliquable (annotation jsPDF posée après le rendu SVG) ---------------------------------
export interface ListeLink {
	page: number; // index 0-based de la page
	x: number;
	y: number;
	w: number;
	h: number;
	url: string;
}

// --- Rendu d'une page ----------------------------------------------------------------------------
function renderTableHead(top: number): string {
	let s = rect(MARGIN, top, CW, HEAD_H, C.headBg, 4);
	for (const col of Object.values(LISTE_COLS)) {
		s += text(MARGIN + col.x, top + 13.5, col.label.toUpperCase(), { size: 7, fill: C.muted, weight: 700 });
	}
	return s;
}

function renderRow(row: ListeProspectRow, rowTop: number, zebra: boolean, pageIndex: number, links: ListeLink[]): string {
	let s = '';
	if (zebra) s += rect(MARGIN, rowTop, CW, ROW_H, C.zebra);
	s += line(MARGIN, rowTop + ROW_H, MARGIN + CW, rowTop + ROW_H, C.hairline, 0.6);
	const baseline = rowTop + 15.2;
	const cell = (key: keyof typeof LISTE_COLS, value: string, opts?: Partial<TextOpts>) => {
		const col = LISTE_COLS[key];
		const shown = value ? ellipsize(value, opts?.size ?? ROW_FONT, col.w) : '-';
		s += text(MARGIN + col.x, baseline, shown, {
			size: opts?.size ?? ROW_FONT,
			fill: value ? (opts?.fill ?? C.body) : C.faint,
			weight: opts?.weight ?? 400
		});
	};
	cell('nom', row.nom, { weight: 700, fill: C.text });
	cell('adresse', row.adresse);
	cell('npa', row.npa);
	cell('localite', row.localite);
	cell('type', row.typePrincipal ?? '', { fill: C.muted });

	// Pastille cliquable « Ouvrir sur Google Maps » (jamais l'URL brute) - demande Pascal 02/07.
	if (row.mapsUrl) {
		const px = MARGIN + LISTE_COLS.maps.x;
		const py = rowTop + (ROW_H - PILL_H) / 2;
		s += rect(px, py, PILL_W, PILL_H, C.primary, PILL_H / 2);
		s += text(px + PILL_W / 2, py + PILL_H / 2 + PILL_FONT * 0.34, PILL_LABEL, {
			size: PILL_FONT,
			fill: C.white,
			weight: 700,
			anchor: 'middle'
		});
		links.push({ page: pageIndex, x: px, y: py, w: PILL_W, h: PILL_H, url: row.mapsUrl });
	} else {
		cell('maps', '');
	}
	return s;
}

export interface ListePagesResult {
	svgs: string[];
	links: ListeLink[];
}

/**
 * SVG (chaîne) de chaque page A4 paysage + zones cliquables. `logoFragment` = fragment SVG du
 * logo déjà positionné (injecté par l'export ; les tests peuvent passer '').
 */
export function buildListePagesSvg(
	campagneNom: string,
	dateLabel: string,
	rows: ListeProspectRow[],
	logoFragment: string
): ListePagesResult {
	const perPage = paginateRows(rows.length);
	const total = Math.max(1, perPage.length);
	const links: ListeLink[] = [];
	const svgs: string[] = [];
	let cursor = 0;

	for (let pi = 0; pi < total; pi++) {
		let body = '';
		// En-tête commun : logo seul + règle (template validé Pascal 02/07 : pas de mention à droite).
		body += logoFragment;
		body += line(MARGIN, RULE_Y, PAGE_W - MARGIN, RULE_Y, C.logo, 1.4);

		let tableTop: number;
		if (pi === 0) {
			// Bloc titre : nom de campagne + date du jour de téléchargement (demande Pascal).
			body += text(MARGIN, MARGIN + 56, ellipsize(campagneNom, 17, CW), { size: 17, fill: C.text, weight: 700 });
			const n = rows.length;
			body += text(MARGIN, MARGIN + 74, `${n} prospect${n > 1 ? 's' : ''} · liste téléchargée le ${dateLabel}`, { size: 9.5, fill: C.muted });
			tableTop = TABLE_TOP_P1;
		} else {
			tableTop = TABLE_TOP_PN;
		}

		body += renderTableHead(tableTop);
		const count = perPage[pi] ?? 0;
		for (let r = 0; r < count; r++) {
			const rowTop = tableTop + HEAD_H + r * ROW_H;
			body += renderRow(rows[cursor], rowTop, r % 2 === 1, pi, links);
			cursor++;
		}

		// Pied de page : numéro de page seul, CENTRÉ (template validé Pascal 02/07).
		body += line(MARGIN, FOOTER_RULE_Y, PAGE_W - MARGIN, FOOTER_RULE_Y, C.border, 1);
		body += text(PAGE_W / 2, PAGE_H - MARGIN - 4, `${pi + 1} / ${total}`, { size: 8, fill: C.faint, anchor: 'middle' });

		svgs.push(
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(PAGE_W)} ${f(PAGE_H)}" width="${f(PAGE_W)}" height="${f(PAGE_H)}">` +
				rect(0, 0, PAGE_W, PAGE_H, C.white) +
				body +
				`</svg>`
		);
	}
	return { svgs, links };
}

// --- Nom de fichier (convention source unique : src/lib/pdf/pdf-filename.ts) --------------------
export function listeFileName(campagneNom: string, date: Date): string {
	return campagnePdfFileName('Prospects', campagneNom, date);
}

// --- Export effectif (impur : dynamic import jsPDF + svg2pdf + polices + logo) -------------------
/**
 * Génère et télécharge la liste PDF (appelée depuis l'écran Campagnes, côté navigateur).
 * No-op si aucun prospect (les appelants gardent déjà le bouton).
 */
export async function exportListeProspectsPdf(campagneNom: string, prospects: ProspectCampagne[]): Promise<void> {
	if (prospects.length === 0) return;
	const [{ jsPDF }, svg2pdfMod, fonts, logoMod] = await Promise.all([
		import('jspdf'),
		import('svg2pdf.js'),
		import('$lib/etiquettes/etiquettes-fonts'),
		import('$lib/pdf/filmpro-logo')
	]);
	const svg2pdf = (svg2pdfMod as { svg2pdf: (el: Element, doc: unknown, opts?: unknown) => Promise<unknown> }).svg2pdf;

	const rows = prospects.map(toListeRow);
	const now = new Date();
	const dateLabel = now.toLocaleDateString('fr-CH', { day: 'numeric', month: 'long', year: 'numeric' });
	const logoFragment = logoMod.filmproLogoSvg(MARGIN, MARGIN, 18, C.logo);
	const { svgs, links } = buildListePagesSvg(campagneNom, dateLabel, rows, logoFragment);

	const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape', compress: true });
	doc.addFileToVFS('Outfit-Regular.ttf', fonts.OUTFIT_400);
	doc.addFont('Outfit-Regular.ttf', 'Outfit', 'normal');
	doc.addFileToVFS('Outfit-Bold.ttf', fonts.OUTFIT_700);
	doc.addFont('Outfit-Bold.ttf', 'Outfit', 'bold');

	for (let i = 0; i < svgs.length; i++) {
		if (i > 0) doc.addPage('a4', 'landscape');
		const el = new DOMParser().parseFromString(svgs[i], 'image/svg+xml').documentElement;
		await svg2pdf(el, doc, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
		// Annotations de lien de CETTE page (jsPDF pose sur la page courante ; même repère pt).
		for (const l of links) {
			if (l.page === i) doc.link(l.x, l.y, l.w, l.h, { url: l.url });
		}
	}
	doc.save(listeFileName(campagneNom, now));
}

// Exposé pour les tests géométriques.
export const LISTE_GEOMETRY = { MARGIN, CW, ROW_H, HEAD_H, TABLE_TOP_P1, TABLE_TOP_PN, CONTENT_BOTTOM, PILL_W, PILL_H } as const;
export { estWidth, ellipsize };
