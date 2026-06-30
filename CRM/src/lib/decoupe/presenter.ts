/**
 * Helpers de présentation (PURS) de l'écran de résultat « Découpe Films ».
 *
 * Doctrine projet : aucun calcul métier dans le `.svelte` (testé en e2e seulement) → tout
 * ce qui transforme le résultat de l'algo en langage visuel vit ici, couvert par Vitest
 * (barrière QA §3 « tolérance zéro »). Reproduit fidèlement le golden v4 validé
 * (`scripts/_decoupe_golden.ts`, golden-validated-2026-06-05/).
 *
 * Entrées : millimètres entiers (cf. `./types`). Sorties d'affichage en m / m² / %.
 * Fonctions pures : aucune I/O, mêmes entrées → mêmes sorties.
 */
import type { PlanProduit, ResultatOptimisation } from './types';

export type SeuilClass = 'good' | 'mid' | 'high';

/** Couleur d'accent par famille (tuile de carte / pastille). Mêmes valeurs que `.df-pastille--*`. */
export const FAMILLE_COLOR: Record<string, string> = {
	solaire: '#d98a23',
	securite: '#3d6b8a',
	discretion: '#7b6a9a'
};
export const FAMILLE_LABEL: Record<string, string> = {
	solaire: 'Solaire',
	securite: 'Sécurité',
	discretion: 'Discrétion'
};
export function familleColor(famille: string): string {
	return FAMILLE_COLOR[famille] ?? FAMILLE_COLOR.securite;
}

export const RAISON_LABEL: Record<string, string> = {
	sur_mesure_fournisseur: 'Sur-mesure fournisseur',
	non_nestable: 'Produit non nestable'
};
export function alerteTitre(type: string): string {
	return type === 'piece_non_placable' ? 'Pièce non plaçable' : 'Produit non nestable';
}

// --- Formatage (locale FR : virgule décimale) ------------------------------------------------
/** mm → « 5,90 m ». */
export function formatMetres(mm: number): string {
	return (mm / 1000).toFixed(2).replace('.', ',') + ' m';
}
/** mm → « 3,3 » (1 décimale, sans unité ; pour « X m économisés »). */
export function formatMetresCourt(mm: number): string {
	return (mm / 1000).toFixed(1).replace('.', ',');
}
/** mm² → « 8,70 m² ». */
export function formatM2(mm2: number): string {
	return (mm2 / 1e6).toFixed(2).replace('.', ',') + ' m²';
}
/** taux ∈ [0,1] → « 19 » (entier, sans %). */
export function formatPct(taux: number): string {
	return (taux * 100).toFixed(0);
}

// --- Seuils chute (feu tricolore : ≤15 % bon, ≤30 % moyen, > élevé) ---------------------------
export function chuteClass(taux: number): SeuilClass {
	const p = taux * 100;
	return p <= 15 ? 'good' : p <= 30 ? 'mid' : 'high';
}

// --- Palette pièces déterministe (color-by-size, façon marker textile) ------------------------
export const PIECE_COLORS = [
	'#5A7190',
	'#538B6B',
	'#917548',
	'#7B6A9A',
	'#3F7C82',
	'#B07A5A',
	'#6F4F6E'
] as const;

/**
 * Variante FONCÉE de chaque couleur de pièce pour le TEXTE du label posé dans le strip
 * (le label est écrit sur un fond `tint(couleur, 0.14)`). Calibrée pour atteindre WCAG AA
 * (≥ 4,5:1 du texte sur son fond teinté) — la couleur vive d'origine reste le contour du
 * rectangle (identité couleur préservée). Ratios vérifiés (script _decoupe_pdf_audit calc).
 * Cf. [[feedback_a11y_deep_tokens_with_axe_gate]].
 */
const PIECE_TEXT_DEEP: Record<string, string> = {
	'#5A7190': '#556A87', // 4,62:1 sur #e8ebef
	'#538B6B': '#447258', // 4,73:1 sur #e7efea
	'#917548': '#7D653E', // 4,69:1 sur #f0ece5
	'#7B6A9A': '#6F5F8B', // 4,79:1 sur #edeaf1
	'#3F7C82': '#397075', // 4,71:1 sur #e4edee
	'#B07A5A': '#895F46', // 4,75:1 sur #f4ece8
	'#6F4F6E': '#6F4F6E' // 5,65:1 sur #ebe6eb (déjà conforme)
};
/** Couleur de TEXTE accessible pour le label d'une pièce (sur son fond teinté). */
export function pieceTextColor(color: string): string {
	return PIECE_TEXT_DEEP[color] ?? color;
}

/**
 * Fabrique un mapping `vitre_id → couleur` stable et déterministe.
 * `orderedIds` fixe l'ordre d'attribution (ordre de saisie des vitres) pour que la même
 * vitre garde la même couleur partout (strip, légende, liste de coupe). Les ids non
 * pré-déclarés reçoivent la couleur suivante à la première rencontre.
 */
export function makeColorOf(orderedIds: readonly string[] = []): (vitreId: string) => string {
	const map = new Map<string, string>();
	const assign = (id: string) => {
		if (!map.has(id)) map.set(id, PIECE_COLORS[map.size % PIECE_COLORS.length]);
		return map.get(id) as string;
	};
	for (const id of orderedIds) assign(id);
	return assign;
}

// --- Liste de coupe groupée (par vitre + dimensions de coupe + rotation) ----------------------
export interface CutGroup {
	vitre_id: string;
	w: number; // dimension de coupe en travers de la laize
	h: number; // dimension de coupe le long du rouleau
	n: number; // nombre de pièces identiques
	pivot: boolean;
	les: boolean;
}
export function cutGroups(plan: PlanProduit): CutGroup[] {
	const g = new Map<string, CutGroup>();
	for (const pl of plan.placements) {
		const k = `${pl.vitre_id}|${pl.largeur_placee_mm}|${pl.hauteur_placee_mm}|${pl.pivotee}`;
		const e =
			g.get(k) ??
			({
				vitre_id: pl.vitre_id,
				w: pl.largeur_placee_mm,
				h: pl.hauteur_placee_mm,
				n: 0,
				pivot: pl.pivotee,
				les: false
			} satisfies CutGroup);
		e.n++;
		if (pl.les_index !== undefined) e.les = true;
		g.set(k, e);
	}
	return [...g.values()];
}

// --- Synthèse globale (bandeau KPI) -----------------------------------------------------------
export interface SyntheseDecoupe {
	totalLong: number; // longueur totale de film à découper (mm)
	rollSurf: number; // surface rouleau consommée (mm²)
	pieceSurf: number; // surface utile des pièces (mm²)
	chuteSurf: number; // surface de chute (mm²)
	chuteMoy: number; // taux de chute moyen ∈ [0,1)
	remplMoy: number; // remplissage moyen = 1 - chute
	nbPieces: number; // pièces posées en découpe interne
	nbFilms: number; // nombre de plans (films distincts)
	nbCommandes: number; // pièces sorties en commande fournisseur
	baselineLong: number; // longueur « pose séquentielle » (chaque pièce sur sa propre longueur)
	economieLong: number; // longueur économisée vs baseline (≥ 0)
	statutOk: boolean; // aucune alerte → prêt à découper
}
export function synthese(resultat: ResultatOptimisation): SyntheseDecoupe {
	const plans = resultat.plans;
	const totalLong = plans.reduce((s, p) => s + p.longueur_consommee_mm, 0);
	const rollSurf = plans.reduce((s, p) => s + p.laize_mm * p.longueur_consommee_mm, 0);
	const pieceSurf = plans.reduce((s, p) => s + p.surface_pieces_mm2, 0);
	const chuteMoy = rollSurf > 0 ? (rollSurf - pieceSurf) / rollSurf : 0;
	const nbPieces = plans.reduce((s, p) => s + p.placements.length, 0);
	// Baseline honnête : « pose séquentielle » = chaque pièce sur sa propre longueur de laize
	// (aucun regroupement en travers). Somme des « le long » de toutes les pièces.
	const baselineLong = plans.reduce(
		(s, p) => s + p.placements.reduce((a, pl) => a + pl.hauteur_placee_mm, 0),
		0
	);
	return {
		totalLong,
		rollSurf,
		pieceSurf,
		chuteSurf: rollSurf - pieceSurf,
		chuteMoy,
		remplMoy: 1 - chuteMoy,
		nbPieces,
		nbFilms: plans.length,
		nbCommandes: resultat.commandes_fournisseur.length,
		baselineLong,
		economieLong: Math.max(0, baselineLong - totalLong),
		statutOk: resultat.alertes.length === 0
	};
}

// --- Métriques d'un plan (carte film) ---------------------------------------------------------
export interface FilmMetrics {
	remplissage: number; // surface pièces / surface rouleau ∈ [0,1]
	classe: SeuilClass;
	chuteSurf: number; // mm²
}
export function filmMetrics(plan: PlanProduit): FilmMetrics {
	const rollSurfP = plan.laize_mm * plan.longueur_consommee_mm;
	return {
		remplissage: rollSurfP > 0 ? plan.surface_pieces_mm2 / rollSurfP : 0,
		classe: chuteClass(plan.taux_chute),
		chuteSurf: rollSurfP - plan.surface_pieces_mm2
	};
}

// --- Géométrie du strip de remplissage (SVG, calcul pur) --------------------------------------
export const STRIP_HEIGHT = 88; // hauteur d'affichage de la laize, px (rangées homogènes)

// Métriques du label de pièce (DM Mono ≈ 0,6 em d'avance), en unités du viewBox du strip.
export const STRIP_LABEL_FONT = 9; // font-size du label dans le viewBox
const LABEL_CHAR_W = STRIP_LABEL_FONT * 0.6; // largeur estimée d'un caractère mono
const LABEL_PAD = 6; // marge interne mini autour du texte
const LABEL_MIN_SIDE = STRIP_LABEL_FONT + 2; // épaisseur mini de la pièce pour porter le texte

/** Orientation du label dans une pièce : horizontal, vertical (pivoté), ou aucun. */
export type LabelOrient = 'h' | 'v' | null;

export interface StripRect {
	x: number;
	y: number;
	w: number;
	h: number;
	color: string;
	label: string | null; // dimensions de coupe, affichées seulement si elles tiennent SANS déborder
	labelOrient: LabelOrient; // 'h' si tient en largeur, 'v' si tient une fois pivoté, null sinon
}
export interface StripGeometry {
	width: number;
	height: number;
	rects: StripRect[];
}
/**
 * Choisit l'orientation d'un label de dimensions pour qu'il NE DÉBORDE JAMAIS de la pièce :
 *  - 'h' (horizontal) si le texte tient dans la largeur `w` et la pièce est assez épaisse,
 *  - 'v' (pivoté -90°) si le texte tient le long de la hauteur `h` (pièce étroite mais haute),
 *  - null si la pièce est trop petite dans les deux sens (repérage par couleur + liste de coupe).
 * Logique pure et déterministe : reproduite à l'identique côté écran (SVG) et PDF.
 */
export function labelOrientation(textLen: number, w: number, h: number): LabelOrient {
	const textW = textLen * LABEL_CHAR_W;
	if (textW <= w - LABEL_PAD && h >= LABEL_MIN_SIDE) return 'h';
	if (textW <= h - LABEL_PAD && w >= LABEL_MIN_SIDE) return 'v';
	return null;
}
/**
 * Projette les placements du plan dans une bande SVG : la laize occupe la hauteur fixe
 * (`STRIP_HEIGHT`), la longueur consommée donne la largeur, à l'échelle. Axe transposé
 * (x_mm = travers de laize → vertical ; y_mm = le long du rouleau → horizontal).
 */
export function stripGeometry(plan: PlanProduit, colorOf: (vitreId: string) => string): StripGeometry {
	const H = STRIP_HEIGHT;
	const s = H / plan.laize_mm; // px par mm
	const width = Math.max(40, Math.round(plan.longueur_consommee_mm * s));
	const rects: StripRect[] = plan.placements.map((pl) => {
		const x = Math.round(pl.y_mm * s);
		const y = Math.round(pl.x_mm * s);
		const w = Math.max(1, Math.round(pl.hauteur_placee_mm * s));
		const h = Math.max(1, Math.round(pl.largeur_placee_mm * s));
		const text = `${pl.largeur_placee_mm}×${pl.hauteur_placee_mm}`;
		const orient = labelOrientation(text.length, w, h);
		return {
			x,
			y,
			w,
			h,
			color: colorOf(pl.vitre_id),
			label: orient ? text : null,
			labelOrient: orient
		};
	});
	return { width, height: H, rects };
}

// --- Diagramme de découpe écran (refonte 2026-06-29) ------------------------------------------
// Le strip ÉCRAN est refondu : tous les films sont rendus à une ÉCHELLE PARTAGÉE (isométrique,
// même px/mm en laize ET en longueur d'un film à l'autre) avec une cote de laize (mm) et une
// règle de longueur (m). Distinct de `stripGeometry` ci-dessus, qui reste la projection compacte
// du PDF atelier (jsPDF/svg2pdf) — non touchée pour ne pas ré-auditer le PDF.

/** Réf courte stable d'une vitre (V1, V2…), même ordre que `makeColorOf` (ordre de saisie). */
export function makeVitreRef(orderedIds: readonly string[] = []): (vitreId: string) => string {
	const map = new Map<string, string>();
	const assign = (id: string) => {
		if (!map.has(id)) map.set(id, `V${map.size + 1}`);
		return map.get(id) as string;
	};
	for (const id of orderedIds) assign(id);
	return assign;
}

// Géométrie du diagramme, en unités de viewBox SVG. Marges constantes (cote + règle) → rendues à
// la même taille px sur tous les films grâce au facteur de rendu proportionnel `renderMaxWidthPx`.
export const DGM_MARGIN_L = 48; // colonne de gauche (cote de laize)
export const DGM_MARGIN_R = 16; // marge droite
export const DGM_TOP = 10; // marge haute
export const DGM_BAND_W_MAX = 520; // largeur de bande du film le plus long (unités viewBox)
export const DGM_RENDER_MAX_PX = 720; // largeur px du viewBox le plus large (les autres au prorata)
export const DGM_BELOW = 51; // bloc sous la bande : règle + libellés + titre d'axe
export const DGM_RULER_GAP = 12; // bas de bande → ligne de règle
export const DGM_TICK = 4; // demi-longueur d'un tiret de règle
export const DGM_LABELS_DY = 16; // ligne de règle → libellés de mètres
export const DGM_AXIS_DY = 34; // ligne de règle → titre d'axe

export interface DiagramRect {
	x: number;
	y: number;
	w: number;
	h: number;
	color: string;
	vitreRef: string; // « V1 », « V2 »… (coin haut-gauche)
	label: string | null; // dimensions de coupe si elles tiennent
	labelOrient: LabelOrient;
	pivot: boolean;
}
export interface DiagramTick {
	x: number;
	label: string; // « 0 », « 1 »…
}
export interface DiagramFilm {
	viewBoxW: number;
	viewBoxH: number;
	renderMaxWidthPx: number; // CSS max-width (préserve une échelle px commune entre films)
	band: { x: number; y: number; w: number; h: number };
	coteLabel: string; // « 1830 mm »
	coteMidY: number;
	rulerY: number;
	ticks: DiagramTick[];
	totalX: number;
	totalLabel: string; // « 4,60 m »
	axisX: number;
	rects: DiagramRect[];
	chute: { x: number; y: number; label: string } | null;
}

/**
 * Projette tous les plans dans des diagrammes à ÉCHELLE PARTAGÉE.
 * `colorOf`/`vitreRefOf` : mappings stables (ordre de saisie) partagés strip/légende/liste de coupe.
 * Invariants (testés) : aucune pièce hors bande, échelle (px/mm) identique d'un film à l'autre,
 * déterminisme. Axe transposé comme `stripGeometry` (x_mm = travers laize → vertical).
 */
export function diagramFilms(
	plans: readonly PlanProduit[],
	colorOf: (vitreId: string) => string,
	vitreRefOf: (vitreId: string) => string
): DiagramFilm[] {
	if (plans.length === 0) return [];
	const maxLong = Math.max(...plans.map((p) => p.longueur_consommee_mm), 1);
	const u = DGM_BAND_W_MAX / maxLong; // unités viewBox par mm (isométrique)
	const viewBoxWs = plans.map(
		(p) => DGM_MARGIN_L + Math.round(p.longueur_consommee_mm * u) + DGM_MARGIN_R
	);
	const maxViewBoxW = Math.max(...viewBoxWs, 1);
	const renderK = DGM_RENDER_MAX_PX / maxViewBoxW; // px par unité viewBox (commun à tous)

	return plans.map((plan, i) => {
		const bandW = Math.max(40, Math.round(plan.longueur_consommee_mm * u));
		const bandH = Math.max(8, Math.round(plan.laize_mm * u));
		const viewBoxW = viewBoxWs[i];
		const viewBoxH = DGM_TOP + bandH + DGM_BELOW;
		const bandX = DGM_MARGIN_L;
		const bandY = DGM_TOP;
		const bandBottom = bandY + bandH;

		const rects: DiagramRect[] = plan.placements.map((pl) => {
			const x = bandX + Math.round(pl.y_mm * u);
			const y = bandY + Math.round(pl.x_mm * u);
			const w = Math.max(1, Math.round(pl.hauteur_placee_mm * u));
			const h = Math.max(1, Math.round(pl.largeur_placee_mm * u));
			const text = `${pl.largeur_placee_mm}×${pl.hauteur_placee_mm}`;
			const orient = labelOrientation(text.length, w, h);
			return {
				x,
				y,
				w,
				h,
				color: colorOf(pl.vitre_id),
				vitreRef: vitreRefOf(pl.vitre_id),
				label: orient ? text : null,
				labelOrient: orient,
				pivot: pl.pivotee
			};
		});

		// Règle de longueur : un tiret par mètre entier.
		const rulerY = bandBottom + DGM_RULER_GAP;
		const nbMeters = Math.floor(plan.longueur_consommee_mm / 1000);
		const ticks: DiagramTick[] = [];
		for (let m = 0; m <= nbMeters; m++) {
			ticks.push({ x: bandX + Math.round(m * 1000 * u), label: String(m) });
		}

		// Étiquette « chute » : centrée dans la bande de chute basse si elle est assez épaisse.
		const maxPieceBottom = rects.reduce((mx, r) => Math.max(mx, r.y + r.h), bandY);
		const bottomGap = bandBottom - maxPieceBottom;
		const pct = Math.round(plan.taux_chute * 100);
		const chute =
			bottomGap >= 13
				? {
						x: bandX + Math.round(bandW / 2),
						y: maxPieceBottom + Math.round(bottomGap / 2) + 3,
						label: pct > 30 ? `chute ${pct} %` : 'chute'
					}
				: null;

		return {
			viewBoxW,
			viewBoxH,
			renderMaxWidthPx: Math.round(renderK * viewBoxW),
			band: { x: bandX, y: bandY, w: bandW, h: bandH },
			coteLabel: `${plan.laize_mm} mm`,
			coteMidY: bandY + bandH / 2,
			rulerY,
			ticks,
			totalX: bandX + bandW,
			totalLabel: formatMetres(plan.longueur_consommee_mm),
			axisX: bandX + Math.round(bandW / 2),
			rects,
			chute
		};
	});
}

// --- Arc-jauge du KPI chute (spark circulaire) ------------------------------------------------
export interface SparkArc {
	dash: number; // longueur du trait coloré
	gap: number; // circonférence totale
	colorVar: string; // variable CSS de la couleur (feu tricolore)
}
export function chuteSpark(taux: number): SparkArc {
	const r = 18;
	const circ = 2 * Math.PI * r;
	const frac = Math.min(1, Math.max(0, taux));
	const p = taux * 100;
	const colorVar = p <= 15 ? 'var(--color-success)' : p <= 30 ? 'var(--df-amber)' : 'var(--color-danger)';
	return { dash: Number((circ * frac).toFixed(1)), gap: Number(circ.toFixed(1)), colorVar };
}
/** Couleur du chiffre roi (taux de chute) selon le feu tricolore. */
export function chuteColorVar(taux: number): string {
	const p = taux * 100;
	return p <= 15 ? 'var(--df-green-tx)' : p <= 30 ? 'var(--df-amber-tx)' : 'var(--df-red-tx)';
}
