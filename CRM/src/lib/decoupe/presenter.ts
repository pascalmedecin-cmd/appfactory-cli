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

export interface StripRect {
	x: number;
	y: number;
	w: number;
	h: number;
	color: string;
	label: string | null; // dimensions affichées dans la pièce si assez grande
}
export interface StripGeometry {
	width: number;
	height: number;
	rects: StripRect[];
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
		const showLbl = w > 30 && h > 22;
		return {
			x,
			y,
			w,
			h,
			color: colorOf(pl.vitre_id),
			label: showLbl ? `${pl.largeur_placee_mm}×${pl.hauteur_placee_mm}${pl.pivotee ? ' ↻' : ''}` : null
		};
	});
	return { width, height: H, rects };
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
