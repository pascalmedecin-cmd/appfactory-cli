import { describe, it, expect } from 'vitest';
import {
	optimiserDecoupe,
	dimensionsDeCoupe,
	calculerLes,
	orientationPourLaize
} from './optimiser';
import type { ProduitDecoupe, Vitre } from './types';

// --- Factories ---
function produit(over: Partial<ProduitDecoupe> = {}): ProduitDecoupe {
	return {
		id: 'P',
		laizes_mm: [1520],
		orientation_imposee: false,
		jointage_autorise: false,
		nestable: true,
		marge_pose_mm: 0,
		recouvrement_mm: 0,
		...over
	};
}
function vitre(over: Partial<Vitre> = {}): Vitre {
	return {
		id: 'V',
		produit_id: 'P',
		largeur_mm: 1000,
		hauteur_mm: 500,
		quantite: 1,
		sur_mesure_fournisseur: false,
		...over
	};
}
function carte(...ps: ProduitDecoupe[]): Map<string, ProduitDecoupe> {
	return new Map(ps.map((p) => [p.id, p]));
}

// ===========================================================================
describe('dimensionsDeCoupe (AC-006)', () => {
	it('ajoute la marge de pose à L et à H', () => {
		expect(dimensionsDeCoupe(vitre({ largeur_mm: 1000, hauteur_mm: 500 }), produit({ marge_pose_mm: 20 }))).toEqual({
			w: 1020,
			h: 520
		});
	});
	it('marge 0 → dimensions de coupe = dimensions vitre', () => {
		expect(dimensionsDeCoupe(vitre({ largeur_mm: 800, hauteur_mm: 600 }), produit())).toEqual({ w: 800, h: 600 });
	});
});

describe('calculerLes (AC-010/011, recouvrement)', () => {
	it('recouvrement 0 → partage géométrique pur', () => {
		expect(calculerLes(2000, 1520, 0)).toEqual({ nb: 2, largeurBande: 1000 });
	});
	it('recouvrement > 0 → matière ajoutée à la jointure (bande plus large)', () => {
		expect(calculerLes(2000, 1520, 100)).toEqual({ nb: 2, largeurBande: 1050 });
	});
	it('largeur ≤ laize → une seule bande', () => {
		expect(calculerLes(1000, 1520, 0)).toEqual({ nb: 1, largeurBande: 1000 });
	});
});

describe('orientationPourLaize', () => {
	it('orientation libre : la plus grande dimension va en travers (raccourcit le rouleau)', () => {
		expect(orientationPourLaize({ vitre_id: 'V', piece_index: 0, w0: 500, h0: 1000, rotatable: true }, 1520)).toEqual({
			across: 1000,
			along: 500,
			pivotee: true
		});
	});
	it('orientation imposée : pas de rotation (L en travers)', () => {
		expect(orientationPourLaize({ vitre_id: 'V', piece_index: 0, w0: 500, h0: 1000, rotatable: false }, 1520)).toEqual({
			across: 500,
			along: 1000,
			pivotee: false
		});
	});
	it('ne tient pas dans la laize → null', () => {
		expect(orientationPourLaize({ vitre_id: 'V', piece_index: 0, w0: 2000, h0: 3000, rotatable: true }, 1520)).toBeNull();
	});
});

// ===========================================================================
describe('optimiserDecoupe - règle de la coche & garde-fou (AC-003/004/005)', () => {
	it('coche sur-mesure fournisseur → liste de commande, jamais nestée (AC-003)', () => {
		const r = optimiserDecoupe([vitre({ sur_mesure_fournisseur: true })], carte(produit()));
		expect(r.plans).toHaveLength(0);
		expect(r.commandes_fournisseur).toEqual([{ vitre_id: 'V', raison: 'sur_mesure_fournisseur' }]);
		expect(r.alertes).toHaveLength(0);
	});

	it('garde-fou : produit non nestable → liste de commande même si coche=non (AC-004)', () => {
		const r = optimiserDecoupe([vitre({ sur_mesure_fournisseur: false })], carte(produit({ nestable: false })));
		expect(r.plans).toHaveLength(0);
		expect(r.commandes_fournisseur).toEqual([{ vitre_id: 'V', raison: 'non_nestable' }]);
	});

	it('incohérence : non nestable laissé en interne (coche=non) → alerte (AC-005)', () => {
		const r = optimiserDecoupe([vitre({ sur_mesure_fournisseur: false })], carte(produit({ nestable: false })));
		expect(r.alertes).toEqual([
			{ vitre_id: 'V', type: 'non_nestable_laisse_en_interne', message: expect.any(String) }
		]);
	});

	it('non nestable + coche=oui → commande, PAS d’alerte (cohérent)', () => {
		const r = optimiserDecoupe([vitre({ sur_mesure_fournisseur: true })], carte(produit({ nestable: false })));
		expect(r.commandes_fournisseur).toEqual([{ vitre_id: 'V', raison: 'non_nestable' }]);
		expect(r.alertes).toHaveLength(0);
	});
});

describe('optimiserDecoupe - nesting nominal (AC-007/008/012)', () => {
	it('une vitre en découpe interne → un plan avec longueur et taux de chute', () => {
		const r = optimiserDecoupe([vitre({ largeur_mm: 1000, hauteur_mm: 500 })], carte(produit({ laizes_mm: [1520] })));
		expect(r.plans).toHaveLength(1);
		const p = r.plans[0];
		expect(p.laize_mm).toBe(1520);
		expect(p.longueur_consommee_mm).toBe(500);
		expect(p.placements).toHaveLength(1);
		expect(p.placements[0]).toMatchObject({ x_mm: 0, y_mm: 0, largeur_placee_mm: 1000, hauteur_placee_mm: 500, pivotee: false });
		expect(p.taux_chute).toBeCloseTo(260000 / 760000, 5);
	});

	it('multi-laizes : retient la laize qui minimise la longueur (AC-007)', () => {
		// 900×500 : longueur 500 dans les deux laizes → tie-break sur la plus petite laize (moins de chute).
		const r = optimiserDecoupe([vitre({ largeur_mm: 900, hauteur_mm: 500 })], carte(produit({ laizes_mm: [1000, 1520] })));
		expect(r.plans[0].laize_mm).toBe(1000);
		expect(r.plans[0].longueur_consommee_mm).toBe(500);
		expect(r.plans[0].taux_chute).toBeCloseTo(0.1, 5);
	});

	it('orientation imposée : pas de rotation (longueur plus grande) (AC-008)', () => {
		const r = optimiserDecoupe(
			[vitre({ largeur_mm: 500, hauteur_mm: 1000 })],
			carte(produit({ orientation_imposee: true, laizes_mm: [1520] }))
		);
		expect(r.plans[0].longueur_consommee_mm).toBe(1000);
		expect(r.plans[0].placements[0].pivotee).toBe(false);
	});

	it('orientation libre : pivote pour raccourcir le rouleau (AC-008)', () => {
		const r = optimiserDecoupe(
			[vitre({ largeur_mm: 500, hauteur_mm: 1000 })],
			carte(produit({ orientation_imposee: false, laizes_mm: [1520] }))
		);
		expect(r.plans[0].longueur_consommee_mm).toBe(500);
		expect(r.plans[0].placements[0].pivotee).toBe(true);
	});

	it('quantité N → N pièces placées (AC-002)', () => {
		const r = optimiserDecoupe([vitre({ largeur_mm: 400, hauteur_mm: 300, quantite: 3 })], carte(produit()));
		expect(r.plans[0].placements).toHaveLength(3);
	});
});

describe('optimiserDecoupe - faisabilité & lés (AC-009/010/011)', () => {
	it('pièce trop large + jointage interdit → alerte non plaçable, jamais omise (AC-009)', () => {
		const r = optimiserDecoupe(
			[vitre({ largeur_mm: 2000, hauteur_mm: 3000 })],
			carte(produit({ jointage_autorise: false, laizes_mm: [1520] }))
		);
		expect(r.plans).toHaveLength(0);
		expect(r.alertes).toEqual([{ vitre_id: 'V', type: 'piece_non_placable', message: expect.any(String) }]);
	});

	it('pièce trop large + jointage autorisé → pose en lés (AC-010)', () => {
		const r = optimiserDecoupe(
			[vitre({ largeur_mm: 2000, hauteur_mm: 3000 })],
			carte(produit({ jointage_autorise: true, laizes_mm: [1520], recouvrement_mm: 0 }))
		);
		expect(r.alertes).toHaveLength(0);
		expect(r.plans[0].poses_en_les).toEqual([{ vitre_id: 'V', piece_index: 0, nb_les: 2, largeur_bande_mm: 1000 }]);
		expect(r.plans[0].placements).toHaveLength(2);
		expect(r.plans[0].longueur_consommee_mm).toBe(6000); // 2 lés 1000×3000 ne tiennent pas côte à côte (1520) → 2 étagères
	});

	it('recouvrement intégré au calcul : bandes plus larges qu’à 0 (AC-011)', () => {
		const r = optimiserDecoupe(
			[vitre({ largeur_mm: 2000, hauteur_mm: 3000 })],
			carte(produit({ jointage_autorise: true, laizes_mm: [1520], recouvrement_mm: 100 }))
		);
		expect(r.plans[0].poses_en_les[0].largeur_bande_mm).toBe(1050);
	});
});

describe('optimiserDecoupe - consolidation & multi-produit (AC-013)', () => {
	it('plusieurs vitres d’un même produit nestées ensemble (consolidation)', () => {
		const r = optimiserDecoupe(
			[
				vitre({ id: 'A', largeur_mm: 1000, hauteur_mm: 500 }),
				vitre({ id: 'B', largeur_mm: 500, hauteur_mm: 500 })
			],
			carte(produit({ laizes_mm: [1520] }))
		);
		expect(r.plans).toHaveLength(1);
		expect(r.plans[0].placements).toHaveLength(2);
		expect(r.plans[0].longueur_consommee_mm).toBe(500); // 1000+500 ≤ 1520 → même étagère
		expect(r.plans[0].taux_chute).toBeCloseTo(10000 / 760000, 5);
	});

	it('deux produits → deux plans distincts', () => {
		const r = optimiserDecoupe(
			[vitre({ id: 'A', produit_id: 'P1' }), vitre({ id: 'B', produit_id: 'P2' })],
			carte(produit({ id: 'P1' }), produit({ id: 'P2' }))
		);
		expect(r.plans).toHaveLength(2);
		expect(r.plans.map((p) => p.produit_id)).toEqual(['P1', 'P2']);
	});
});

describe('optimiserDecoupe - robustesse', () => {
	it('aucune vitre → résultat vide', () => {
		expect(optimiserDecoupe([], carte(produit()))).toEqual({ plans: [], commandes_fournisseur: [], alertes: [] });
	});
	it('produit introuvable → alerte, jamais d’échec silencieux', () => {
		const r = optimiserDecoupe([vitre({ produit_id: 'INCONNU' })], carte(produit({ id: 'P' })));
		expect(r.plans).toHaveLength(0);
		expect(r.alertes[0]).toMatchObject({ vitre_id: 'V', type: 'piece_non_placable' });
	});
});
