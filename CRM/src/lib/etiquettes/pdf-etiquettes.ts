/**
 * Planche d'étiquettes d'adresses (publipostage) - export PDF VECTORIEL, côté client.
 *
 * Format Avery 6122 / J8159 (validé avec Pascal côté Marketing, mailings FilmPro) : A4 portrait,
 * grille 3 × 8 = 24 étiquettes 70 × 36 mm, marge haute 5 mm, marges latérales 0 mm. Texte centré
 * horizontalement ET verticalement dans chaque étiquette ; NOM en gras ; cellules au-delà du
 * nombre d'adresses laissées vides (aucun tracé) pour préserver la grille de la planche physique.
 *
 * Doctrine PDF projet (cf. reference_pdf_client_jspdf_svg2pdf + src/lib/decoupe/pdf-export.ts) :
 *  - tout le layout/le SVG est PUR et top-level -> testable Vitest (doctrine .svelte = e2e) ;
 *  - 1 <svg> par page A4 (viewBox en points PDF), converti par svg2pdf à l'export ;
 *  - svg2pdf IGNORE le CSS -> attributs de présentation inline uniquement, baselines de texte
 *    calculées à la main (pas de dominant-baseline), couleurs en aplat ;
 *  - polices DM Sans 400/700 (marque FilmPro) embarquées en TTF base64, réutilisées du moteur
 *    Découpe (asset partagé) ; svg2pdf ne distingue que normal/bold -> 400 + 700 suffisent ;
 *  - jsPDF + svg2pdf + polices en DYNAMIC IMPORT (hors bundle initial), exercés en e2e.
 *
 * Contrairement au plan de découpe, la grille est FIXE (24 cellules/page) : pas de moteur de flux,
 * mais chaque étiquette garantit que son contenu reste DANS sa cellule (lignes tronquées à la
 * largeur utile, bloc centré qui tient dans la hauteur) -> invariant testable `layoutEtiquettes`.
 */
import type { EtiquetteEntry } from './prospect-etiquette';

// --- Géométrie A4 + grille Avery 6122 (points PDF : 1 mm = 2.834645 pt) ------------------------
const MM = 2.834645;
export const PAGE_W = 210 * MM; // 595.28
export const PAGE_H = 297 * MM; // 841.89

export const COLS = 3;
export const ROWS = 8;
export const PER_PAGE = COLS * ROWS; // 24
const LABEL_W = 70 * MM; // 198.43 ; 3 × 70 = 210 mm = pleine largeur A4
const LABEL_H = 36 * MM; // 102.05 ; 5 + 8 × 36 + 4 = 297 mm = hauteur A4
const MARGIN_TOP = 5 * MM; // marge haute planche (mesure physique Avery 6122)
const PAD_X = 4 * MM; // marge interne gauche/droite d'une étiquette (texte centré)
const PAD_Y = 2.5 * MM; // réserve haute/basse interne (le bloc centré ne touche jamais le bord)

const USABLE_W = LABEL_W - 2 * PAD_X; // largeur de texte utile dans une étiquette

// --- Typographie (centrée, NOM gras) -----------------------------------------------------------
const NOM_SIZE = 10.5;
const DEST_SIZE = 9.5; // destinataire (« à l'attention de »), même corps que l'adresse, non gras
const ADDR_SIZE = 9.5;
const LINE_H = 13; // interligne uniforme (bloc centré)
const NOM_MAX_LINES = 2; // un nom long passe sur 2 lignes max, puis ellipse
const TEXT_COLOR = '#111111'; // quasi-noir, lisibilité d'impression maximale

// --- Helpers SVG (attributs inline, doctrine svg2pdf) ------------------------------------------
function f(n: number): string {
	return Number(n.toFixed(2)).toString();
}
function esc(s: string): string {
	// Normalise les tirets longs (cadratin/demi-cadratin) en tiret court (règle typo FR), puis
	// échappe les entités XML : défense en profondeur contre une donnée saisie « — ».
	return s
		.replace(/[—–]/g, '-')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
/**
 * Largeur estimée (conservatrice) d'une chaîne en Outfit à `size` pt. Facteur 0,62 em : couvre le
 * cas tout-capitales (avances Outfit majuscules ≈ 0,55-0,62 em) avec la marge de PAD_X de chaque
 * côté en plus -> aucun débordement dans la cellule voisine (gouttière 0). Le facteur sert au
 * wrap/ellipse uniquement (pas au rendu, qui utilise les vraies avances de la police).
 */
export function estWidth(s: string, size: number): number {
	return s.length * size * 0.62;
}
/** Tronque `s` (ellipse) pour tenir dans `maxW` pt à `size` pt. */
export function ellipsize(s: string, size: number, maxW: number): string {
	if (estWidth(s, size) <= maxW) return s;
	let cut = s;
	while (cut.length > 1 && estWidth(cut + '…', size) > maxW) {
		cut = cut.slice(0, -1).trimEnd();
	}
	return cut + '…';
}
/** Découpe `s` en lignes tenant dans `maxW` (wrap par mots), bornées à `maxLines` (dernière ellipsée). */
export function wrapToWidth(s: string, size: number, maxW: number, maxLines: number): string[] {
	const words = s.split(/\s+/).filter(Boolean);
	const lines: string[] = [];
	let cur = '';
	for (const w of words) {
		const cand = cur ? `${cur} ${w}` : w;
		if (estWidth(cand, size) <= maxW || !cur) {
			cur = cand;
		} else {
			lines.push(cur);
			cur = w;
		}
	}
	if (cur) lines.push(cur);
	if (lines.length > maxLines) {
		lines.length = maxLines;
		lines[maxLines - 1] = `${lines[maxLines - 1]} …`;
	}
	// Garantie dure : chaque ligne tient dans la largeur utile (mot unique trop long inclus).
	return lines.map((l) => ellipsize(l, size, maxW));
}

// --- Layout PUR (testable) ---------------------------------------------------------------------
export interface LabelLine {
	text: string;
	size: number;
	bold: boolean;
	baseline: number; // y de la baseline du texte (centré dans la cellule)
	estWidth: number; // largeur estimée (assertion : ≤ USABLE_W)
}
export interface PlacedLabel {
	index: number; // index global de l'adresse (page * 24 + cellule)
	col: number;
	row: number;
	cellX: number; // bord gauche de la cellule
	cellY: number; // bord haut de la cellule
	centerX: number; // axe central horizontal (text-anchor middle)
	lines: LabelLine[];
}

/**
 * Lignes d'une étiquette, lignes vides omises, dans l'ordre postal :
 *   NOM gras (≤ 2 lignes) -> destinataire « à l'attention de » (≤ 1 ligne) -> rue -> cp/ville.
 *
 * Le destinataire est borné à UNE ligne (ellipse si trop long) : c'est ce qui garantit qu'une
 * étiquette pleine tient dans la cellule Avery (nom 2 + destinataire 1 + rue 1 + cp/ville 1 = 5
 * lignes max ≤ hauteur utile). Voir le test « préservation de la cellule ».
 */
export function labelLines(entry: EtiquetteEntry): { text: string; size: number; bold: boolean }[] {
	const out: { text: string; size: number; bold: boolean }[] = [];
	const nom = entry.nom.trim();
	if (nom) {
		for (const ln of wrapToWidth(nom, NOM_SIZE, USABLE_W, NOM_MAX_LINES)) {
			out.push({ text: ln, size: NOM_SIZE, bold: true });
		}
	}
	const dest = (entry.destinataire ?? '').trim();
	if (dest) out.push({ text: ellipsize(dest, DEST_SIZE, USABLE_W), size: DEST_SIZE, bold: false });
	const rue = entry.rue.trim();
	if (rue) out.push({ text: ellipsize(rue, ADDR_SIZE, USABLE_W), size: ADDR_SIZE, bold: false });
	const cpVille = entry.cpVille.trim();
	if (cpVille) out.push({ text: ellipsize(cpVille, ADDR_SIZE, USABLE_W), size: ADDR_SIZE, bold: false });
	return out;
}

/** Place une étiquette dans sa cellule : bloc centré H + V, baselines calculées. */
function placeLabel(entry: EtiquetteEntry, index: number, col: number, row: number): PlacedLabel {
	const cellX = col * LABEL_W;
	const cellY = MARGIN_TOP + row * LABEL_H;
	const centerX = cellX + LABEL_W / 2;
	const raw = labelLines(entry);
	const n = Math.max(1, raw.length);
	// Bloc centré verticalement ; chaque ligne occupe LINE_H, baseline ≈ centre + 0,34·taille.
	const blockTop = cellY + (LABEL_H - n * LINE_H) / 2;
	const lines: LabelLine[] = raw.map((ln, i) => ({
		text: ln.text,
		size: ln.size,
		bold: ln.bold,
		baseline: blockTop + (i + 0.5) * LINE_H + ln.size * 0.34,
		estWidth: estWidth(ln.text, ln.size)
	}));
	return { index, col, row, cellX, cellY, centerX, lines };
}

/** Pagination PURE : adresses -> pages de PlacedLabel (cellules vides simplement absentes). */
export function layoutEtiquettes(entries: EtiquetteEntry[]): { pages: PlacedLabel[][] } {
	const pages: PlacedLabel[][] = [];
	for (let start = 0; start < entries.length; start += PER_PAGE) {
		const page: PlacedLabel[] = [];
		const slice = entries.slice(start, start + PER_PAGE);
		slice.forEach((entry, k) => {
			const col = k % COLS;
			const row = Math.floor(k / COLS);
			page.push(placeLabel(entry, start + k, col, row));
		});
		pages.push(page);
	}
	return { pages };
}

/** Nombre de pages A4 pour `n` adresses (0 -> 0). */
export function pageCount(n: number): number {
	return Math.ceil(Math.max(0, n) / PER_PAGE);
}

// --- Rendu SVG (1 chaîne par page, prévisualisable navigateur) ---------------------------------
function lineSvg(centerX: number, ln: LabelLine): string {
	return `<text x="${f(centerX)}" y="${f(ln.baseline)}" font-family="Outfit" font-size="${ln.size}" font-weight="${ln.bold ? 700 : 400}" fill="${TEXT_COLOR}" text-anchor="middle">${esc(ln.text)}</text>`;
}
function labelSvg(p: PlacedLabel, guides: boolean): string {
	const guide = guides
		? `<rect x="${f(p.cellX)}" y="${f(p.cellY)}" width="${f(LABEL_W)}" height="${f(LABEL_H)}" fill="none" stroke="#E5E7EB" stroke-width="0.5"/>`
		: '';
	return guide + p.lines.map((ln) => lineSvg(p.centerX, ln)).join('');
}

export interface EtiquettesRenderOpts {
	/** Trace un repère fin par cellule (prévisualisation/QA uniquement ; jamais à l'impression). */
	guides?: boolean;
}

/** SVG (chaîne) de chaque page A4 = exactement ce que svg2pdf convertira. */
export function buildEtiquettesPagesSvg(entries: EtiquetteEntry[], opts: EtiquettesRenderOpts = {}): string[] {
	const { pages } = layoutEtiquettes(entries);
	return pages.map((labels) => {
		const body = labels.map((p) => labelSvg(p, opts.guides === true)).join('');
		return (
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(PAGE_W)} ${f(PAGE_H)}" width="${f(PAGE_W)}" height="${f(PAGE_H)}">` +
			`<rect x="0" y="0" width="${f(PAGE_W)}" height="${f(PAGE_H)}" fill="#ffffff"/>` +
			body +
			`</svg>`
		);
	});
}

// --- Export effectif (impur : dynamic import jsPDF + svg2pdf + polices, hors bundle initial) ----
/** Nom de fichier slugifié à partir du libellé de campagne. */
export function etiquettesFileName(label: string): string {
	const slug = label
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase()
		.slice(0, 60);
	return `etiquettes-${slug || 'campagne'}.pdf`;
}

/**
 * Génère et télécharge la planche d'étiquettes (appelé depuis le panneau, côté navigateur).
 * No-op si aucune adresse (l'appelant désactive déjà le bouton à 0 sélection).
 */
export async function exportEtiquettesPdf(entries: EtiquetteEntry[], fileName: string): Promise<void> {
	if (entries.length === 0) return;
	const [{ jsPDF }, svg2pdfMod, fonts] = await Promise.all([
		import('jspdf'),
		import('svg2pdf.js'),
		import('./etiquettes-fonts')
	]);
	const svg2pdf = (svg2pdfMod as { svg2pdf: (el: Element, doc: unknown, opts?: unknown) => Promise<unknown> }).svg2pdf;

	const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
	doc.addFileToVFS('Outfit-Regular.ttf', fonts.OUTFIT_400);
	doc.addFont('Outfit-Regular.ttf', 'Outfit', 'normal');
	doc.addFileToVFS('Outfit-Bold.ttf', fonts.OUTFIT_700);
	doc.addFont('Outfit-Bold.ttf', 'Outfit', 'bold');

	const svgs = buildEtiquettesPagesSvg(entries);
	for (let i = 0; i < svgs.length; i++) {
		if (i > 0) doc.addPage('a4', 'portrait');
		const el = new DOMParser().parseFromString(svgs[i], 'image/svg+xml').documentElement;
		await svg2pdf(el, doc, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
	}
	doc.save(fileName);
}

// Exposé pour les tests géométriques (bornes de cellule, marge utile).
export const GEOMETRY = { LABEL_W, LABEL_H, MARGIN_TOP, PAD_X, PAD_Y, USABLE_W, LINE_H } as const;
