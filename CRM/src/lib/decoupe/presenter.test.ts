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
	alerteTitre,
	makeVitreRef,
	diagramFilms,
	DGM_MARGIN_L,
	DGM_MARGIN_R,
	DGM_TOP,
	DGM_BELOW,
	DGM_RENDER_MAX_PX
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
				// grand → label horizontal
				{ vitre_id: 'a', piece_index: 0, x_mm: 0, y_mm: 0, largeur_placee_mm: 800, hauteur_placee_mm: 1500, pivotee: false },
				// minuscule → pas de label
				{ vitre_id: 'b', piece_index: 0, x_mm: 0, y_mm: 1900, largeur_placee_mm: 50, hauteur_placee_mm: 50, pivotee: false }
			]
		};
		const geo = stripGeometry(plan, makeColorOf());
		expect(geo.rects[0].label).toBe('800×1500');
		expect(geo.rects[0].labelOrient).toBe('h');
		expect(geo.rects[1].label).toBeNull();
		expect(geo.rects[1].labelOrient).toBeNull();
	});
	it('le label NE DÉBORDE JAMAIS : pièce étroite et haute → label pivoté (vertical), pas de débordement', () => {
		// Reproduit le cas réel « 1200×800 posée verticale » qui débordait : étroite le long du
		// rouleau (hauteur_placee), haute en travers de la laize (largeur_placee).
		const plan: PlanProduit = {
			produit_id: 'p',
			laize_mm: 1830,
			longueur_consommee_mm: 800,
			surface_pieces_mm2: 0,
			taux_chute: 0,
			poses_en_les: [],
			placements: [
				{ vitre_id: 'a', piece_index: 0, x_mm: 0, y_mm: 0, largeur_placee_mm: 1200, hauteur_placee_mm: 800, pivotee: true }
			]
		};
		const geo = stripGeometry(plan, makeColorOf());
		const r = geo.rects[0];
		expect(r.label).toBe('1200×800');
		// pièce étroite (w le long du rouleau) mais haute (h en travers laize) → vertical
		expect(r.labelOrient).toBe('v');
		expect(r.w).toBeLessThan(r.h);
	});
	it('le strip ne porte plus le symbole ↻ (le pivot est indiqué dans la liste de coupe)', () => {
		const plan: PlanProduit = {
			produit_id: 'p', laize_mm: 1000, longueur_consommee_mm: 1000, surface_pieces_mm2: 0, taux_chute: 0, poses_en_les: [],
			placements: [{ vitre_id: 'a', piece_index: 0, x_mm: 0, y_mm: 0, largeur_placee_mm: 800, hauteur_placee_mm: 800, pivotee: true }]
		};
		const geo = stripGeometry(plan, makeColorOf());
		expect(geo.rects[0].label).not.toContain('↻');
		expect(geo.rects[0].label).toBe('800×800');
	});
});

describe('makeVitreRef (réf courte stable V1, V2…)', () => {
	it('attribue V1, V2… dans l’ordre de rencontre, stable', () => {
		const r = makeVitreRef();
		expect(r('a')).toBe('V1');
		expect(r('b')).toBe('V2');
		expect(r('a')).toBe('V1'); // inchangé
		expect(r('c')).toBe('V3');
	});
	it('pré-ordre fixe l’attribution', () => {
		const r = makeVitreRef(['x', 'y', 'z']);
		expect(r('y')).toBe('V2');
		expect(r('x')).toBe('V1');
	});
});

describe('diagramFilms (diagramme écran à échelle partagée)', () => {
	const orderedIds = VITRES.map((v) => v.id);
	const colorOf = makeColorOf(orderedIds);
	const vitreRefOf = makeVitreRef(orderedIds);

	it('un diagramme par plan, vide si aucun plan', () => {
		expect(diagramFilms([], colorOf, vitreRefOf)).toHaveLength(0);
		const dgms = diagramFilms(RESULTAT.plans, colorOf, vitreRefOf);
		expect(dgms).toHaveLength(RESULTAT.plans.length);
	});

	it('ÉCHELLE PARTAGÉE : px/unité identique d’un film à l’autre (renderMaxWidthPx ∝ viewBoxW)', () => {
		const dgms = diagramFilms(RESULTAT.plans, colorOf, vitreRefOf);
		const ks = dgms.map((d) => d.renderMaxWidthPx / d.viewBoxW);
		for (const k of ks) expect(k).toBeCloseTo(ks[0], 2);
		// le film le plus long est rendu à la largeur max ; les autres en dessous.
		const maxPx = Math.max(...dgms.map((d) => d.renderMaxWidthPx));
		expect(maxPx).toBeLessThanOrEqual(DGM_RENDER_MAX_PX);
		expect(Math.max(...dgms.map((d) => d.viewBoxW))).toBeGreaterThan(0);
	});

	it('échelle laize ET longueur identiques entre films (isométrie, même mm→unité)', () => {
		const dgms = diagramFilms(RESULTAT.plans, colorOf, vitreRefOf);
		// u = w / longueur = h / laize, partagé. On le reconstruit par film et on compare.
		// reconstruit via band.w arrondi à l'entier → tolérance 2 décimales (l'échelle exacte
		// partagée est déjà prouvée par le test renderMaxWidthPx/viewBoxW ci-dessus).
		const us = dgms.map((d, i) => d.band.w / RESULTAT.plans[i].longueur_consommee_mm);
		for (const u of us) expect(u).toBeCloseTo(us[0], 2);
		// la laize suit la même échelle (à l’arrondi entier près).
		dgms.forEach((d, i) => {
			const expectedH = Math.round(RESULTAT.plans[i].laize_mm * us[0]);
			expect(Math.abs(d.band.h - expectedH)).toBeLessThanOrEqual(2);
		});
	});

	it('INVARIANT : aucune pièce hors de la bande', () => {
		const dgms = diagramFilms(RESULTAT.plans, colorOf, vitreRefOf);
		for (const d of dgms) {
			for (const r of d.rects) {
				expect(r.x).toBeGreaterThanOrEqual(d.band.x);
				expect(r.y).toBeGreaterThanOrEqual(d.band.y);
				expect(r.x + r.w).toBeLessThanOrEqual(d.band.x + d.band.w + 1);
				expect(r.y + r.h).toBeLessThanOrEqual(d.band.y + d.band.h + 1);
			}
		}
	});

	it('viewBox cohérent (marges constantes) + 1 rect par placement + refs synchronisées', () => {
		const dgms = diagramFilms(RESULTAT.plans, colorOf, vitreRefOf);
		dgms.forEach((d, i) => {
			expect(d.viewBoxW).toBe(DGM_MARGIN_L + d.band.w + DGM_MARGIN_R);
			expect(d.viewBoxH).toBe(DGM_TOP + d.band.h + DGM_BELOW);
			expect(d.rects).toHaveLength(RESULTAT.plans[i].placements.length);
			for (const r of d.rects) {
				expect(r.vitreRef).toMatch(/^V\d+$/);
				expect(r.color).toMatch(/^#/);
			}
		});
	});

	it('règle de longueur : un tiret par mètre entier, départ à 0 sur la bande', () => {
		const plan: PlanProduit = {
			produit_id: 'p', laize_mm: 1500, longueur_consommee_mm: 3600, surface_pieces_mm2: 0, taux_chute: 0, poses_en_les: [],
			placements: [{ vitre_id: 'a', piece_index: 0, x_mm: 0, y_mm: 0, largeur_placee_mm: 1500, hauteur_placee_mm: 3600, pivotee: false }]
		};
		const [d] = diagramFilms([plan], makeColorOf(), makeVitreRef());
		expect(d.ticks).toHaveLength(4); // 0,1,2,3
		expect(d.ticks[0].label).toBe('0');
		expect(d.ticks[0].x).toBe(d.band.x);
		expect(d.totalLabel).toBe('3,60 m');
	});

	it('étiquette chute présente si bande de chute basse assez épaisse', () => {
		// une seule pièce occupant le haut → grosse chute basse → label.
		const plan: PlanProduit = {
			produit_id: 'p', laize_mm: 2000, longueur_consommee_mm: 2000, surface_pieces_mm2: 2_000_000, taux_chute: 0.5, poses_en_les: [],
			placements: [{ vitre_id: 'a', piece_index: 0, x_mm: 0, y_mm: 0, largeur_placee_mm: 1000, hauteur_placee_mm: 2000, pivotee: false }]
		};
		const [d] = diagramFilms([plan], makeColorOf(), makeVitreRef());
		expect(d.chute).not.toBeNull();
		expect(d.chute!.label).toBe('chute 50 %');
	});

	it('déterminisme : mêmes entrées → mêmes sorties', () => {
		const a = diagramFilms(RESULTAT.plans, makeColorOf(orderedIds), makeVitreRef(orderedIds));
		const b = diagramFilms(RESULTAT.plans, makeColorOf(orderedIds), makeVitreRef(orderedIds));
		expect(JSON.stringify(a)).toBe(JSON.stringify(b));
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
