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
import type { Marque } from '$lib/marque';
import { sortGroupes, SANS_GROUPE_LABEL } from '$lib/campagne-groupes';
import { estWidth, ellipsize } from '$lib/etiquettes/pdf-etiquettes';
import { GOOGLE_SOURCE, safeMapsUrl } from '$lib/maps-url';
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
// Hôtes admis + lien Maps : source unique $lib/maps-url (partagée avec la page publique de
// validation externe - même promesse « le libellé Google mène chez Google »).
const TYPE_TOKEN_RE = /^[a-z][a-z0-9_]*$/;

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
	// Colonne structurée d'abord (2026-07-02), repli sur le parsing de description (leads
	// antérieurs au backfill ou ré-imports d'un payload sans types).
	const types = isGoogle
		? p.google_types && p.google_types.length > 0
			? p.google_types
			: googleTypesFromDescription(p.description)
		: [];
	return {
		nom: p.raison_sociale.trim(),
		adresse: (p.adresse ?? '').trim(),
		npa: (p.npa ?? '').trim(),
		localite: (p.localite ?? '').trim(),
		typePrincipal: types.length > 0 ? humanizeGoogleType(types[0]) : null,
		mapsUrl: isGoogle ? safeMapsUrl(p.source_url) : null
	};
}

// --- Sections par groupe (2026-07-02) ------------------------------------------------------------
/** Groupe minimal (id + nom suffisent au tri et aux en-têtes de section). */
export interface GroupeLite {
	id: string;
	nom: string;
}
/** Ligne du flux paginé : un en-tête de section (groupe) ou une ligne prospect. */
export type ListeItem =
	| { kind: 'section'; nom: string; count: number }
	| { kind: 'row'; row: ListeProspectRow };

/**
 * Flux d'items sectionné par groupe : même ordre que partout (alphabétique fr, « Sans
 * groupe » en fin, sections vides omises). Sans aucun groupe défini -> lignes seules
 * (sortie IDENTIQUE à l'historique). Ordre d'entrée préservé dans une section.
 */
export function buildListeItems(prospects: readonly ProspectCampagne[], groupes: readonly GroupeLite[]): ListeItem[] {
	if (groupes.length === 0) return prospects.map((p) => ({ kind: 'row', row: toListeRow(p) }));
	const items: ListeItem[] = [];
	const push = (nom: string, members: readonly ProspectCampagne[]) => {
		if (members.length === 0) return;
		items.push({ kind: 'section', nom, count: members.length });
		for (const p of members) items.push({ kind: 'row', row: toListeRow(p) });
	};
	for (const g of sortGroupes(groupes)) {
		push(
			g.nom,
			prospects.filter((p) => p.groupe_id === g.id)
		);
	}
	push(
		SANS_GROUPE_LABEL,
		// Sans groupe = pas de groupe OU groupe inconnu de la liste (lien orphelin défensif).
		prospects.filter((p) => !p.groupe_id || !groupes.some((g) => g.id === p.groupe_id))
	);
	return items;
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

/**
 * Découpe le flux d'ITEMS en pages avec contrôle d'orphelin (bug-hunter 2026-07-02, M2) : un
 * en-tête de section qui tomberait sur le DERNIER slot d'une page est reporté en tête de page
 * suivante (le slot reste vide - une section n'est jamais séparée de sa première ligne). Sans
 * sections (liste plate), découpe identique à `paginateRows`.
 */
export function paginateItems(items: ListeItem[]): ListeItem[][] {
	const pages: ListeItem[][] = [];
	let i = 0;
	let first = true;
	while (i < items.length) {
		const cap = rowsCapacity(first ? TABLE_TOP_P1 : TABLE_TOP_PN);
		let take = Math.min(items.length - i, cap);
		// Anti-orphelin : dernier slot occupé par une section alors qu'il reste du contenu après.
		if (take > 1 && i + take < items.length && items[i + take - 1].kind === 'section') take--;
		pages.push(items.slice(i, i + take));
		i += take;
		first = false;
	}
	return pages;
}

// --- Helpers SVG (attributs inline, doctrine svg2pdf) -------------------------------------------
function f(n: number): string {
	return Number(n.toFixed(2)).toString();
}
function esc(s: string): string {
	// Normalise les tirets longs en tiret court (règle typo FR), retire les caractères de
	// contrôle illégaux XML 1.0 (sinon DOMParser échoue -> aucun PDF ; audit sécu 2026-07-02,
	// Low), puis échappe les entités XML.
	return s
		.replace(/[—–]/g, '-')
		// eslint-disable-next-line no-control-regex
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
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

/**
 * Accents de marque du PDF (parité bi-marque). FilmPro = valeurs @theme d'origine (non-régression
 * byte-identique) ; LED = magenta AA + navy LED, alignés sur `.crm-shell[data-marque='led']` (app.css).
 * `pill` = fond de la pastille « Ouvrir sur Google Maps » ; `rule` = filet d'en-tête sous le logo.
 */
export function marqueAccents(marque: Marque): { pill: string; rule: string } {
	return marque === 'led' ? { pill: '#C6007E', rule: '#01003B' } : { pill: C.primary, rule: C.logo };
}

function renderRow(
	row: ListeProspectRow,
	rowTop: number,
	zebra: boolean,
	pageIndex: number,
	links: ListeLink[],
	pillColor: string = C.primary
): string {
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
		s += rect(px, py, PILL_W, PILL_H, pillColor, PILL_H / 2);
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

/** En-tête de section (groupe) : bandeau discret pleine largeur, nom en gras + compteur. */
function renderSection(nom: string, count: number, rowTop: number): string {
	let s = rect(MARGIN, rowTop + 3, CW, ROW_H - 6, C.headBg, 4);
	const baseline = rowTop + 15.2;
	s += text(MARGIN + 8, baseline, ellipsize(nom, ROW_FONT + 0.5, 300), { size: ROW_FONT + 0.5, fill: C.text, weight: 700 });
	s += text(MARGIN + 8 + estWidth(nom, ROW_FONT + 0.5) + 10, baseline, `${count} prospect${count > 1 ? 's' : ''}`, {
		size: 8,
		fill: C.muted
	});
	return s;
}

export interface ListePagesResult {
	svgs: string[];
	links: ListeLink[];
}

/**
 * SVG (chaîne) de chaque page A4 paysage + zones cliquables, pour un flux d'ITEMS (lignes +
 * en-têtes de section par groupe). `logoFragment` = fragment SVG du logo déjà positionné
 * (injecté par l'export ; les tests peuvent passer '').
 */
export function buildListeItemsPagesSvg(
	campagneNom: string,
	dateLabel: string,
	items: ListeItem[],
	logoFragment: string,
	accents: { pill: string; rule: string } = { pill: C.primary, rule: C.logo }
): ListePagesResult {
	const pageItems = paginateItems(items);
	const total = Math.max(1, pageItems.length);
	const nbRows = items.reduce((n, it) => n + (it.kind === 'row' ? 1 : 0), 0);
	const links: ListeLink[] = [];
	const svgs: string[] = [];

	for (let pi = 0; pi < total; pi++) {
		let body = '';
		// En-tête commun : logo seul + règle (template validé Pascal 02/07 : pas de mention à droite).
		body += logoFragment;
		body += line(MARGIN, RULE_Y, PAGE_W - MARGIN, RULE_Y, accents.rule, 1.4);

		let tableTop: number;
		if (pi === 0) {
			// Bloc titre : nom de campagne + date du jour de téléchargement (demande Pascal).
			body += text(MARGIN, MARGIN + 56, ellipsize(campagneNom, 17, CW), { size: 17, fill: C.text, weight: 700 });
			body += text(MARGIN, MARGIN + 74, `${nbRows} prospect${nbRows > 1 ? 's' : ''} · liste téléchargée le ${dateLabel}`, { size: 9.5, fill: C.muted });
			tableTop = TABLE_TOP_P1;
		} else {
			tableTop = TABLE_TOP_PN;
		}

		body += renderTableHead(tableTop);
		// La zébrure ne compte que les LIGNES prospect (un bandeau de section la réinitialise
		// visuellement) : parité suivie séparément de l'index d'item.
		let rowParity = 0;
		const page = pageItems[pi] ?? [];
		for (let r = 0; r < page.length; r++) {
			const rowTop = tableTop + HEAD_H + r * ROW_H;
			const item = page[r];
			if (item.kind === 'section') {
				body += renderSection(item.nom, item.count, rowTop);
				rowParity = 0;
			} else {
				body += renderRow(item.row, rowTop, rowParity % 2 === 1, pi, links, accents.pill);
				rowParity++;
			}
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

/** SVG de chaque page pour des lignes SANS sections (API historique, mêmes garanties). */
export function buildListePagesSvg(
	campagneNom: string,
	dateLabel: string,
	rows: ListeProspectRow[],
	logoFragment: string,
	accents: { pill: string; rule: string } = { pill: C.primary, rule: C.logo }
): ListePagesResult {
	return buildListeItemsPagesSvg(campagneNom, dateLabel, rows.map((row) => ({ kind: 'row', row })), logoFragment, accents);
}

// --- Nom de fichier (convention source unique : src/lib/pdf/pdf-filename.ts) --------------------
export function listeFileName(campagneNom: string, date: Date): string {
	return campagnePdfFileName('Prospects', campagneNom, date);
}

// --- Export effectif (impur : dynamic import jsPDF + svg2pdf + polices + logo) -------------------
/**
 * Génère et télécharge la liste PDF (appelée depuis l'écran Campagnes, côté navigateur).
 * `groupes` (2026-07-02) : sectionne la liste par groupe (même ordre que le panneau et les
 * étiquettes) ; liste plate si la campagne n'a aucun groupe. No-op si aucun prospect.
 */
export async function exportListeProspectsPdf(
	campagneNom: string,
	prospects: ProspectCampagne[],
	groupes: readonly GroupeLite[] = [],
	marque: Marque = 'filmpro'
): Promise<void> {
	if (prospects.length === 0) return;
	const [{ jsPDF }, svg2pdfMod, fonts, logoMod] = await Promise.all([
		import('jspdf'),
		import('svg2pdf.js'),
		import('$lib/etiquettes/etiquettes-fonts'),
		import('$lib/pdf/marque-logo')
	]);
	const svg2pdf = (svg2pdfMod as { svg2pdf: (el: Element, doc: unknown, opts?: unknown) => Promise<unknown> }).svg2pdf;

	const items = buildListeItems(prospects, groupes);
	const now = new Date();
	const dateLabel = now.toLocaleDateString('fr-CH', { day: 'numeric', month: 'long', year: 'numeric' });
	const logoFragment = logoMod.marqueLogoSvg(marque, MARGIN, MARGIN, 18, C.logo);
	const { svgs, links } = buildListeItemsPagesSvg(campagneNom, dateLabel, items, logoFragment, marqueAccents(marque));

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
