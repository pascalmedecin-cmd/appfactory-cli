import { describe, it, expect } from 'vitest';
import {
	formatMetres,
	formatMetresCourt,
	formatM2,
	formatPct,
	chuteClass,
	makeColorOf,
	PIECE_COLORS,
	cutGroups,
	synthese,
	filmMetrics,
	stripGeometry,
	STRIP_HEIGHT,
	chuteSpark,
	chuteColorVar,
	familleColor,
	alerteTitre
} from './presenter';
import { optimiserDecoupe } from './optimiser';
import type { ProduitDecoupe, Vitre, PlanProduit } from './types';

// --- Jeu de données réaliste (mêmes profils que le golden v4) --------------------------------
const PRODUITS = new Map<string, ProduitDecoupe>([
	['p-sol70', { id: 'p-sol70', laizes_mm: [1520, 1830], orientation_imposee: false, jointage_autorise: true, nestable: true, marge_pose_mm: 0, recouvrement_mm: 0 }],
	['p-sec', { id: 'p-sec', laizes_mm: [1830], orientation_imposee: false, jointage_autorise: false, nestable: true, marge_pose_mm: 0, recouvrement_mm: 0 }],
	['p-disc', { id: 'p-disc', laizes_mm: [1270, 1520], orientation_imposee: true, jointage_autorise: false, nestable: true, marge_pose_mm: 0, recouvrement_mm: 0 }],
	['p-vernis', { id: 'p-vernis', laizes_mm: [1000], orientation_imposee: false, jointage_autorise: false, nestable: false, marge_pose_mm: 0, recouvrement_mm: 0 }]
]);
const VITRES: Vitre[] = [
	{ id: 'v1', produit_id: 'p-sol70', largeur_mm: 1200, hauteur_mm: 800, quantite: 4, sur_mesure_fournisseur: false },
	{ id: 'v2', produit_id: 'p-sol70', largeur_mm: 900, hauteur_mm: 2100, quantite: 2, sur_mesure_fournisseur: false },
	{ id: 'v3', produit_id: 'p-sec', largeur_mm: 600, hauteur_mm: 600, quantite: 3, sur_mesure_fournisseur: false },
	{ id: 'v4', produit_id: 'p-sol70', largeur_mm: 2000, hauteur_mm: 1000, quantite: 1, sur_mesure_fournisseur: true },
	{ id: 'v5', produit_id: 'p-disc', largeur_mm: 1700, hauteur_mm: 900, quantite: 1, sur_mesure_fournisseur: false },
	{ id: 'v6', produit_id: 'p-vernis', largeur_mm: 800, hauteur_mm: 600, quantite: 2, sur_mesure_fournisseur: false }
];
const RESULTAT = optimiserDecoupe(VITRES, PRODUITS);

describe('formatage', () => {
	it('formatMetres : 2 décimales, virgule, unité m', () => {
		expect(formatMetres(5900)).toBe('5,90 m');
		expect(formatMetres(0)).toBe('0,00 m');
		expect(formatMetres(1234)).toBe('1,23 m');
	});
	it('formatMetresCourt : 1 décimale, sans unité', () => {
		expect(formatMetresCourt(3300)).toBe('3,3');
		expect(formatMetresCourt(0)).toBe('0,0');
	});
	it('formatM2 : 2 décimales, virgule, unité m²', () => {
		expect(formatM2(8_700_000)).toBe('8,70 m²');
		expect(formatM2(1_000_000)).toBe('1,00 m²');
	});
	it('formatPct : entier sans décimale', () => {
		expect(formatPct(0.19)).toBe('19');
		expect(formatPct(0)).toBe('0');
		expect(formatPct(0.815)).toBe('82');
	});
});

describe('chuteClass (feu tricolore)', () => {
	it('borne ≤ 15 % → good', () => {
		expect(chuteClass(0)).toBe('good');
		expect(chuteClass(0.15)).toBe('good');
	});
	it('15 % < t ≤ 30 % → mid', () => {
		expect(chuteClass(0.1501)).toBe('mid');
		expect(chuteClass(0.30)).toBe('mid');
	});
	it('> 30 % → high', () => {
		expect(chuteClass(0.3001)).toBe('high');
		expect(chuteClass(0.9)).toBe('high');
	});
});

describe('makeColorOf (palette déterministe)', () => {
	it('même id → même couleur (stabilité)', () => {
		const c = makeColorOf();
		const a = c('v1');
		expect(c('v1')).toBe(a);
	});
	it('cycle sur la palette dans l’ordre de rencontre', () => {
		const c = makeColorOf();
		expect(c('a')).toBe(PIECE_COLORS[0]);
		expect(c('b')).toBe(PIECE_COLORS[1]);
		expect(c('a')).toBe(PIECE_COLORS[0]); // inchangé
		expect(c('c')).toBe(PIECE_COLORS[2]);
	});
	it('pré-ordre fixe l’attribution', () => {
		const c = makeColorOf(['x', 'y']);
		expect(c('x')).toBe(PIECE_COLORS[0]);
		expect(c('y')).toBe(PIECE_COLORS[1]);
		expect(c('z')).toBe(PIECE_COLORS[2]);
	});
	it('cyclage au-delà de la longueur de palette', () => {
		const c = makeColorOf();
		for (let i = 0; i < PIECE_COLORS.length; i++) c(`id${i}`);
		expect(c(`id${PIECE_COLORS.length}`)).toBe(PIECE_COLORS[0]);
	});
});

describe('cutGroups (regroupement liste de coupe)', () => {
	it('regroupe les pièces identiques et compte', () => {
		const planSol = RESULTAT.plans.find((p) => p.produit_id === 'p-sol70')!;
		const groups = cutGroups(planSol);
		// La somme des n = nombre de placements du plan (conservation).
		const total = groups.reduce((s, g) => s + g.n, 0);
		expect(total).toBe(planSol.placements.length);
		// 6 pièces solaire = 2 × (900×2100) + 4 × (1200×800).
		const g2100 = groups.find((g) => g.w === 900 && g.h === 2100 || (g.w === 2100 && g.h === 900));
		expect(groups.some((g) => g.n === 4)).toBe(true);
		expect(g2100?.n).toBe(2);
	});
	it('marque pivot et les correctement', () => {
		const fake: PlanProduit = {
			produit_id: 'p',
			laize_mm: 1000,
			longueur_consommee_mm: 100,
			surface_pieces_mm2: 0,
			taux_chute: 0,
			poses_en_les: [],
			placements: [
				{ vitre_id: 'a', piece_index: 0, x_mm: 0, y_mm: 0, largeur_placee_mm: 500, hauteur_placee_mm: 100, pivotee: true },
				{ vitre_id: 'a', piece_index: 1, x_mm: 0, y_mm: 0, largeur_placee_mm: 500, hauteur_placee_mm: 100, pivotee: true, les_index: 0 }
			]
		};
		const groups = cutGroups(fake);
		expect(groups).toHaveLength(1);
		expect(groups[0].n).toBe(2);
		expect(groups[0].pivot).toBe(true);
		expect(groups[0].les).toBe(true);
	});
});

describe('synthese (bandeau KPI)', () => {
	const s = synthese(RESULTAT);
	it('nbFilms / nbCommandes cohérents avec le résultat', () => {
		expect(s.nbFilms).toBe(RESULTAT.plans.length);
		expect(s.nbCommandes).toBe(RESULTAT.commandes_fournisseur.length);
	});
	it('nbPieces = somme des placements', () => {
		const total = RESULTAT.plans.reduce((a, p) => a + p.placements.length, 0);
		expect(s.nbPieces).toBe(total);
	});
	it('remplMoy = 1 - chuteMoy ; chute ∈ [0,1)', () => {
		expect(s.remplMoy).toBeCloseTo(1 - s.chuteMoy, 10);
		expect(s.chuteMoy).toBeGreaterThanOrEqual(0);
		expect(s.chuteMoy).toBeLessThan(1);
	});
	it('economie = baseline - total, jamais négative, ≤ baseline', () => {
		expect(s.economieLong).toBe(Math.max(0, s.baselineLong - s.totalLong));
		expect(s.economieLong).toBeGreaterThanOrEqual(0);
		expect(s.baselineLong).toBeGreaterThanOrEqual(s.totalLong);
	});
	it('statutOk reflète l’absence d’alerte', () => {
		expect(s.statutOk).toBe(RESULTAT.alertes.length === 0);
	});
	it('surfaces : chuteSurf = rollSurf - pieceSurf ≥ 0', () => {
		expect(s.chuteSurf).toBe(s.rollSurf - s.pieceSurf);
		expect(s.chuteSurf).toBeGreaterThanOrEqual(0);
	});
});

describe('filmMetrics', () => {
	it('remplissage ∈ [0,1] et classe cohérente avec le taux', () => {
		for (const plan of RESULTAT.plans) {
			const fm = filmMetrics(plan);
			expect(fm.remplissage).toBeGreaterThanOrEqual(0);
			expect(fm.remplissage).toBeLessThanOrEqual(1);
			expect(fm.classe).toBe(chuteClass(plan.taux_chute));
			expect(fm.chuteSurf).toBeGreaterThanOrEqual(0);
		}
	});
});

describe('stripGeometry (invariants visuels durs)', () => {
	it('AUCUNE pièce hors de la bande (laize) — fidélité de l’invariant algo', () => {
		const colorOf = makeColorOf();
		for (const plan of RESULTAT.plans) {
			const geo = stripGeometry(plan, colorOf);
			expect(geo.height).toBe(STRIP_HEIGHT);
			for (const r of geo.rects) {
				expect(r.x).toBeGreaterThanOrEqual(0);
				expect(r.y).toBeGreaterThanOrEqual(0);
				// chaque rectangle tient dans la hauteur (= laize) : x_mm + largeur ≤ laize.
				expect(r.y + r.h).toBeLessThanOrEqual(geo.height + 1); // +1 = arrondi entier
				// et dans la largeur (= longueur consommée), à l’arrondi près.
				expect(r.x + r.w).toBeLessThanOrEqual(geo.width + 1);
			}
		}
	});
	it('width minimale de 40 px et 1 rect par placement', () => {
		const colorOf = makeColorOf();
		for (const plan of RESULTAT.plans) {
			const geo = stripGeometry(plan, colorOf);
			expect(geo.width).toBeGreaterThanOrEqual(40);
			expect(geo.rects).toHaveLength(plan.placements.length);
		}
	});
	it('label affiché seulement si le rect est assez grand', () => {
		const plan: PlanProduit = {
			produit_id: 'p',
			laize_mm: 1000,
			longueur_consommee_mm: 2000,
			surface_pieces_mm2: 0,
			taux_chute: 0,
			poses_en_les: [],
			placements: [
				// grand → label
				{ vitre_id: 'a', piece_index: 0, x_mm: 0, y_mm: 0, largeur_placee_mm: 800, hauteur_placee_mm: 1500, pivotee: false },
				// minuscule → pas de label
				{ vitre_id: 'b', piece_index: 0, x_mm: 0, y_mm: 1900, largeur_placee_mm: 50, hauteur_placee_mm: 50, pivotee: false }
			]
		};
		const geo = stripGeometry(plan, makeColorOf());
		expect(geo.rects[0].label).toContain('800×1500');
		expect(geo.rects[1].label).toBeNull();
	});
	it('le symbole ↻ apparaît pour une pièce pivotée', () => {
		const plan: PlanProduit = {
			produit_id: 'p', laize_mm: 1000, longueur_consommee_mm: 1000, surface_pieces_mm2: 0, taux_chute: 0, poses_en_les: [],
			placements: [{ vitre_id: 'a', piece_index: 0, x_mm: 0, y_mm: 0, largeur_placee_mm: 800, hauteur_placee_mm: 800, pivotee: true }]
		};
		const geo = stripGeometry(plan, makeColorOf());
		expect(geo.rects[0].label).toContain('↻');
	});
});

describe('chuteSpark / chuteColorVar (feu tricolore)', () => {
	it('arc : dash = fraction de la circonférence, gap = circonférence', () => {
		const a = chuteSpark(0.5);
		expect(a.gap).toBeGreaterThan(0);
		expect(a.dash).toBeCloseTo(a.gap * 0.5, 1);
	});
	it('couleur selon les seuils', () => {
		expect(chuteSpark(0.1).colorVar).toBe('var(--color-success)');
		expect(chuteSpark(0.2).colorVar).toBe('var(--df-amber)');
		expect(chuteSpark(0.5).colorVar).toBe('var(--color-danger)');
		expect(chuteColorVar(0.1)).toBe('var(--df-green-tx)');
		expect(chuteColorVar(0.2)).toBe('var(--df-amber-tx)');
		expect(chuteColorVar(0.5)).toBe('var(--df-red-tx)');
	});
	it('arc borné même hors [0,1]', () => {
		expect(chuteSpark(2).dash).toBeLessThanOrEqual(chuteSpark(2).gap);
		expect(chuteSpark(-1).dash).toBe(0);
	});
});

describe('libellés', () => {
	it('familleColor a un fallback', () => {
		expect(familleColor('solaire')).toBe('#d98a23');
		expect(familleColor('inconnu')).toBe('#3d6b8a');
	});
	it('alerteTitre traduit le type', () => {
		expect(alerteTitre('piece_non_placable')).toBe('Pièce non plaçable');
		expect(alerteTitre('non_nestable_laisse_en_interne')).toBe('Produit non nestable');
	});
});
