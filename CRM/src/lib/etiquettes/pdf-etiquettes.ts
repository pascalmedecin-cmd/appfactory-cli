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
 * mais chaque étiquette garantit que son contenu reste DANS sa cellule SANS JAMAIS tronquer
 * (règle dure Pascal 2026-07-03 : wrap aux avances réelles + rétrécissement homogène du bloc
 * si besoin, cf. labelLayout) -> invariant testable `layoutEtiquettes`.
 */
import type { EtiquetteEntry } from './prospect-etiquette';
import { campagnePdfFileName } from '$lib/pdf/pdf-filename';
import { measureOutfitBold } from './outfit-metrics';

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
const USABLE_H = LABEL_H - 2 * PAD_Y; // hauteur de texte utile (le bloc ne touche jamais le bord)

// --- Typographie (centrée, NOM gras) -----------------------------------------------------------
const NOM_SIZE = 10.5;
const DEST_SIZE = 9.5; // destinataire (« à l'attention de »), même corps que l'adresse, non gras
const ADDR_SIZE = 9.5;
const LINE_H = 13; // interligne uniforme (bloc centré)
const TEXT_COLOR = '#111111'; // quasi-noir, lisibilité d'impression maximale
/**
 * Paliers de rétrécissement homogène du bloc étiquette (règle « jamais tronqué », Pascal
 * 2026-07-03) : on essaie la taille nominale, puis on réduit TOUT le bloc (tailles + interligne)
 * par paliers de 5 % jusqu'à ce que chaque ligne tienne en largeur ET que le bloc tienne en
 * hauteur. Le wrap est RECALCULÉ à chaque palier (une police plus petite wrappe moins).
 * 0,6 = plancher lisible à l'impression (6,3 pt sur le nom) ; au-delà, rétrécissement final
 * exact (données dégénérées seulement, cf. labelLayout).
 */
const FIT_SCALES = [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6] as const;

/**
 * Étiquette de TRANSITION (intercalaire de groupe, 2026-07-02) : le nom de la catégorie seul,
 * en GRAS et GRANDE taille (15 pt vs 10.5 du nom), centré, fond blanc comme les autres
 * (demande Pascal : ni fond sombre ni inversé). 15 pt = plus grande taille où tous les noms
 * réalistes ≤ 24 chars tiennent sur 1 ligne (stress test avances réelles Outfit Bold,
 * 2026-07-02). Un nom dégénéré (tout en capitales larges) est RÉTRÉCI pour tenir
 * (fit-to-width par avances réelles, plancher ~8.5 pt pour 24 « M ») - jamais d'ellipse :
 * un intercalaire tronqué est un intercalaire illisible dans la pile.
 */
const TRANSITION_SIZE = 15;

// --- Helpers SVG (attributs inline, doctrine svg2pdf) ------------------------------------------
function f(n: number): string {
	return Number(n.toFixed(2)).toString();
}
function esc(s: string): string {
	// Normalise les tirets longs (cadratin/demi-cadratin) en tiret court (règle typo FR), retire
	// les caractères de contrôle C0/C1 illégaux en XML 1.0 (un seul suffirait à faire échouer le
	// DOMParser -> aucun PDF ; audit sécu 2026-07-02, Low), puis échappe les entités XML :
	// défense en profondeur contre toute donnée saisie ou importée.
	return s
		.replace(/[—–]/g, '-')
		// eslint-disable-next-line no-control-regex
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
/**
 * Largeur estimée (conservatrice) d'une chaîne en Outfit à `size` pt. Facteur 0,62 em.
 * N'EST PLUS utilisée pour les étiquettes (fitting aux avances réelles depuis 2026-07-03) ;
 * conservée pour le PDF « liste des prospects » (colonnes de tableau, où l'ellipse est
 * légitime - cf. pdf-liste-prospects.ts).
 */
export function estWidth(s: string, size: number): number {
	return s.length * size * 0.62;
}
/** Tronque `s` (ellipse) pour tenir dans `maxW` pt à `size` pt. Usage : pdf-liste-prospects. */
export function ellipsize(s: string, size: number, maxW: number): string {
	if (estWidth(s, size) <= maxW) return s;
	let cut = s;
	while (cut.length > 1 && estWidth(cut + '…', size) > maxW) {
		cut = cut.slice(0, -1).trimEnd();
	}
	return cut + '…';
}
/**
 * Découpe `s` en lignes tenant dans `maxW` (wrap par MOTS), aux avances RÉELLES Outfit Bold.
 * Jamais d'ellipse : un mot unique plus large que `maxW` reste entier (le rétrécissement
 * final de labelLayout garantit alors la tenue en largeur). Les avances Bold servent aussi
 * pour le texte normal : légèrement plus larges, donc estimation conservatrice (un wrap un
 * rien plus tôt, jamais de débordement).
 */
function wrapReal(s: string, size: number, maxW: number): string[] {
	const words = s.split(/\s+/).filter(Boolean);
	const lines: string[] = [];
	let cur = '';
	for (const w of words) {
		const cand = cur ? `${cur} ${w}` : w;
		if (measureOutfitBold(cand, size) <= maxW || !cur) {
			cur = cand;
		} else {
			lines.push(cur);
			cur = w;
		}
	}
	if (cur) lines.push(cur);
	return lines;
}

// --- Layout PUR (testable) ---------------------------------------------------------------------
export interface LabelLine {
	text: string;
	size: number;
	bold: boolean;
	baseline: number; // y de la baseline du texte (centré dans la cellule)
	estWidth: number; // largeur aux avances réelles Outfit Bold (assertion : ≤ USABLE_W)
}
export interface PlacedLabel {
	index: number; // index global de l'item (page * 24 + cellule)
	col: number;
	row: number;
	cellX: number; // bord gauche de la cellule
	cellY: number; // bord haut de la cellule
	centerX: number; // axe central horizontal (text-anchor middle)
	lines: LabelLine[];
	/** 'transition' = intercalaire de groupe (1 ligne, gras 15 pt). Absent = adresse (défaut). */
	kind?: 'adresse' | 'transition';
}

/**
 * Item du flux d'étiquettes (2026-07-02) : une adresse OU un intercalaire de groupe. Le flux
 * est CONTINU sur la planche (l'intercalaire occupe exactement 1 cellule, aucune cellule
 * laissée vide entre les groupes -> critère « ne pas perdre d'étiquettes »).
 */
export type EtiquetteItem =
	| { kind: 'adresse'; entry: EtiquetteEntry }
	| { kind: 'transition'; nom: string };

/**
 * Libellé rendu d'un intercalaire : CAPITALES (demande Pascal 2026-07-02, uppercase FR -
 * les accents restent accentués : « Régies » -> « RÉGIES », couverts par le subset Outfit).
 */
function transitionLabel(nom: string): string {
	return nom.toLocaleUpperCase('fr');
}

/** Interligne du bloc intercalaire : 15 pt gras respire mieux qu'au LINE_H 13 des adresses. */
const TRANSITION_LINE_H = 17;
/**
 * Seuil de CONFORT du wrap (80 % de la largeur utile) : un libellé multi-mots qui dépasse ce
 * seuil passe à la ligne plutôt que de remplir la cellule bord à bord (« RÉGIES IMMOBILIÈRES »
 * tiendrait à 159/175.75 pt sur 1 ligne mais se lit mieux sur 2 - exemple cité par Pascal
 * 02/07). La garantie DURE de non-débordement reste USABLE_W (fit-to-width en dernier recours).
 */
const TRANSITION_COMFORT_W = USABLE_W * 0.8;

/** Wrap par MOTS du libellé capitalisé, aux avances réelles, à la taille nominale 15 pt. */
function wrapTransition(label: string): string[] {
	const words = label.split(/\s+/).filter(Boolean);
	const lines: string[] = [];
	let cur = '';
	for (const w of words) {
		const cand = cur ? `${cur} ${w}` : w;
		if (measureOutfitBold(cand, TRANSITION_SIZE) <= TRANSITION_COMFORT_W || !cur) {
			cur = cand;
		} else {
			lines.push(cur);
			cur = w;
		}
	}
	if (cur) lines.push(cur);
	return lines.length > 0 ? lines : [label];
}

/**
 * Layout du libellé d'intercalaire (demande Pascal 2026-07-02, 2e passe) : MULTI-LIGNES
 * d'abord (« RÉGIES IMMOBILIÈRES » -> 2 lignes à 15 pt pleins, wrap par mots), et seulement
 * si une ligne reste trop large (mot UNIQUE dégénéré, ex. 24 « M ») rétrécissement du bloc
 * entier (taille homogène, jamais d'ellipse). 24 chars capitalisés = 4 lignes max
 * théoriques × 17 pt = 68 pt, toujours dans la hauteur utile de la cellule (~97 pt).
 */
export function transitionLayout(nom: string): { lines: string[]; size: number } {
	const lines = wrapTransition(transitionLabel(nom));
	const widest = Math.max(...lines.map((l) => measureOutfitBold(l, 1))); // largeur à 1 pt
	const size = widest <= 0 ? TRANSITION_SIZE : Math.min(TRANSITION_SIZE, USABLE_W / widest);
	return { lines, size };
}

/** Place un intercalaire : bloc CAPITALES gras (1-2 lignes usuelles), centré H + V. */
function placeTransition(nom: string, index: number, col: number, row: number): PlacedLabel {
	const cellX = col * LABEL_W;
	const cellY = MARGIN_TOP + row * LABEL_H;
	const { lines, size } = transitionLayout(nom);
	// Bloc centré verticalement, même construction de baselines que placeLabel (interligne dédié).
	const blockTop = cellY + (LABEL_H - lines.length * TRANSITION_LINE_H) / 2;
	return {
		index,
		col,
		row,
		cellX,
		cellY,
		centerX: cellX + LABEL_W / 2,
		kind: 'transition',
		lines: lines.map((text, i) => ({
			text,
			size,
			bold: true,
			baseline: blockTop + (i + 0.5) * TRANSITION_LINE_H + size * 0.34,
			estWidth: measureOutfitBold(text, size),
		})),
	};
}

/** Ligne composée d'une étiquette, avant placement (taille déjà fittée). */
export interface FittedLine {
	text: string;
	size: number;
	bold: boolean;
}

/**
 * Composition d'une étiquette, règle DURE « jamais tronqué » (Pascal 2026-07-03, remplace
 * l'ancien couple 2-lignes-max + ellipse) : TOUT le texte est rendu, dans l'ordre postal
 * (NOM gras -> destinataire -> rue -> cp/ville), wrap par mots aux avances réelles Outfit.
 * Si le bloc déborde de la cellule Avery (largeur OU hauteur), on rétrécit TOUT le bloc
 * par paliers de 5 % (tailles + interligne, wrap recalculé) jusqu'à tenue ; en dernier
 * recours (données dégénérées, ex. mot unique interminable) rétrécissement homogène exact.
 * Invariants garantis quel que soit l'input : texte intégral, chaque ligne ≤ USABLE_W,
 * bloc ≤ USABLE_H. Même philosophie que transitionLayout (éprouvée sur les intercalaires).
 */
export function labelLayout(entry: EtiquetteEntry): { lines: FittedLine[]; lineH: number } {
	const fields: { text: string; size: number; bold: boolean }[] = [];
	const nom = entry.nom.trim();
	if (nom) fields.push({ text: nom, size: NOM_SIZE, bold: true });
	const dest = (entry.destinataire ?? '').trim();
	if (dest) fields.push({ text: dest, size: DEST_SIZE, bold: false });
	const rue = entry.rue.trim();
	if (rue) fields.push({ text: rue, size: ADDR_SIZE, bold: false });
	const cpVille = entry.cpVille.trim();
	if (cpVille) fields.push({ text: cpVille, size: ADDR_SIZE, bold: false });
	if (fields.length === 0) return { lines: [], lineH: LINE_H };

	let last: { lines: FittedLine[]; lineH: number } = { lines: [], lineH: LINE_H };
	for (const scale of FIT_SCALES) {
		const lines: FittedLine[] = [];
		for (const field of fields) {
			const size = field.size * scale;
			for (const text of wrapReal(field.text, size, USABLE_W)) {
				lines.push({ text, size, bold: field.bold });
			}
		}
		last = { lines, lineH: LINE_H * scale };
		const widest = Math.max(...lines.map((l) => measureOutfitBold(l.text, l.size)));
		if (widest <= USABLE_W && lines.length * last.lineH <= USABLE_H) return last;
	}
	// Dernier recours (jamais atteint sur des données postales réelles) : rétrécissement
	// homogène exact du bloc au palier plancher - jamais d'ellipse.
	const widest = Math.max(...last.lines.map((l) => measureOutfitBold(l.text, l.size)));
	const k = Math.min(1, USABLE_W / widest, USABLE_H / (last.lines.length * last.lineH));
	return {
		lines: last.lines.map((l) => ({ ...l, size: l.size * k })),
		lineH: last.lineH * k
	};
}

/** Place une étiquette dans sa cellule : bloc centré H + V, baselines calculées. */
function placeLabel(entry: EtiquetteEntry, index: number, col: number, row: number): PlacedLabel {
	const cellX = col * LABEL_W;
	const cellY = MARGIN_TOP + row * LABEL_H;
	const centerX = cellX + LABEL_W / 2;
	const { lines: fitted, lineH } = labelLayout(entry);
	const n = Math.max(1, fitted.length);
	// Bloc centré verticalement ; chaque ligne occupe lineH, baseline ≈ centre + 0,34·taille.
	const blockTop = cellY + (LABEL_H - n * lineH) / 2;
	const lines: LabelLine[] = fitted.map((ln, i) => ({
		text: ln.text,
		size: ln.size,
		bold: ln.bold,
		baseline: blockTop + (i + 0.5) * lineH + ln.size * 0.34,
		estWidth: measureOutfitBold(ln.text, ln.size)
	}));
	return { index, col, row, cellX, cellY, centerX, lines };
}

/**
 * Pagination PURE du flux d'items (adresses + intercalaires) : flux CONTINU, un item = une
 * cellule, cellules au-delà du flux simplement absentes. C'est le moteur ; `layoutEtiquettes`
 * (adresses seules) reste l'API historique par-dessus.
 *
 * Trade-off ASSUMÉ (bug-hunter 2026-07-02, L1) : un intercalaire peut tomber sur la DERNIÈRE
 * cellule d'une planche (ses adresses commencent sur la suivante). Le reporter gaspillerait
 * une étiquette physique - exactement ce que Pascal a refusé (« pas perdre des étiquettes »).
 * L'intercalaire garde son rôle de séparateur de pile même en fin de planche.
 */
export function layoutEtiquettesItems(items: EtiquetteItem[]): { pages: PlacedLabel[][] } {
	const pages: PlacedLabel[][] = [];
	for (let start = 0; start < items.length; start += PER_PAGE) {
		const page: PlacedLabel[] = [];
		const slice = items.slice(start, start + PER_PAGE);
		slice.forEach((item, k) => {
			const col = k % COLS;
			const row = Math.floor(k / COLS);
			page.push(
				item.kind === 'transition'
					? placeTransition(item.nom, start + k, col, row)
					: placeLabel(item.entry, start + k, col, row)
			);
		});
		pages.push(page);
	}
	return { pages };
}

/** Pagination PURE : adresses -> pages de PlacedLabel (cellules vides simplement absentes). */
export function layoutEtiquettes(entries: EtiquetteEntry[]): { pages: PlacedLabel[][] } {
	return layoutEtiquettesItems(entries.map((entry) => ({ kind: 'adresse', entry })));
}

/** Nombre de pages A4 pour `n` adresses (0 -> 0). */
export function pageCount(n: number): number {
	return Math.ceil(Math.max(0, n) / PER_PAGE);
}

// --- Rendu SVG (1 chaîne par page, prévisualisable navigateur) ---------------------------------
function lineSvg(centerX: number, ln: LabelLine): string {
	return `<text x="${f(centerX)}" y="${f(ln.baseline)}" font-family="Outfit" font-size="${ln.size}" font-weight="${ln.bold ? 700 : 400}" fill="${TEXT_COLOR}" text-anchor="middle">${esc(ln.text)}</text>`;
}
function labelSvg(p: PlacedLabel): string {
	return p.lines.map((ln) => lineSvg(p.centerX, ln)).join('');
}

/** SVG (chaîne) de chaque page A4 pour un flux d'ITEMS (adresses + intercalaires). */
export function buildEtiquettesItemsPagesSvg(items: EtiquetteItem[]): string[] {
	const { pages } = layoutEtiquettesItems(items);
	return pages.map((labels) => {
		const body = labels.map((p) => labelSvg(p)).join('');
		return (
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(PAGE_W)} ${f(PAGE_H)}" width="${f(PAGE_W)}" height="${f(PAGE_H)}">` +
			`<rect x="0" y="0" width="${f(PAGE_W)}" height="${f(PAGE_H)}" fill="#ffffff"/>` +
			body +
			`</svg>`
		);
	});
}

/** SVG (chaîne) de chaque page A4 = exactement ce que svg2pdf convertira (adresses seules). */
export function buildEtiquettesPagesSvg(entries: EtiquetteEntry[]): string[] {
	return buildEtiquettesItemsPagesSvg(entries.map((entry) => ({ kind: 'adresse', entry })));
}

// --- Export effectif (impur : dynamic import jsPDF + svg2pdf + polices, hors bundle initial) ----
/**
 * Nom de fichier explicite (convention source unique : src/lib/pdf/pdf-filename.ts).
 * `date` = jour du téléchargement (défaut : maintenant ; les tests passent une date fixe).
 */
export function etiquettesFileName(label: string, date: Date = new Date()): string {
	return campagnePdfFileName('Étiquettes', label, date);
}

/**
 * Construit le document jsPDF de la planche (pages A4 portrait, polices Outfit embarquées).
 * Cœur PARTAGÉ de l'aperçu (blob -> iframe, lecteur PDF natif) et du téléchargement :
 * ce que l'aperçu montre EST le PDF téléchargé, à l'octet près (même builder).
 */
async function buildEtiquettesDoc(items: EtiquetteItem[]): Promise<{ output: (type: 'blob') => Blob; save: (name: string) => unknown }> {
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

	const svgs = buildEtiquettesItemsPagesSvg(items);
	for (let i = 0; i < svgs.length; i++) {
		if (i > 0) doc.addPage('a4', 'portrait');
		const el = new DOMParser().parseFromString(svgs[i], 'image/svg+xml').documentElement;
		await svg2pdf(el, doc, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
	}
	return doc;
}

/**
 * Génère et télécharge la planche d'étiquettes pour un flux d'ITEMS (adresses + intercalaires
 * de groupe). No-op si le flux est vide (l'appelant désactive déjà le bouton à 0 sélection).
 */
export async function exportEtiquettesItemsPdf(items: EtiquetteItem[], fileName: string): Promise<void> {
	if (items.length === 0) return;
	const doc = await buildEtiquettesDoc(items);
	doc.save(fileName);
}

/**
 * Génère la planche en Blob PDF (aperçu in-app : URL.createObjectURL -> <iframe>, zoom natif
 * du lecteur PDF du navigateur - pattern MarketingPreviewModal de Gouvernance). null si vide.
 */
export async function buildEtiquettesItemsPdfBlob(items: EtiquetteItem[]): Promise<Blob | null> {
	if (items.length === 0) return null;
	const doc = await buildEtiquettesDoc(items);
	return doc.output('blob');
}

/** Génère et télécharge la planche (adresses seules - API historique, mêmes garanties). */
export async function exportEtiquettesPdf(entries: EtiquetteEntry[], fileName: string): Promise<void> {
	return exportEtiquettesItemsPdf(entries.map((entry) => ({ kind: 'adresse', entry })), fileName);
}

// Exposé pour les tests géométriques (bornes de cellule, marge utile).
export const GEOMETRY = { LABEL_W, LABEL_H, MARGIN_TOP, PAD_X, PAD_Y, USABLE_W, LINE_H } as const;
