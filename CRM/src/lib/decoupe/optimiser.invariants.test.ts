/**
 * Tests du VÉRIFICATEUR lui-même (`checkInvariants`). Le fuzzing prouve que l'algo ne viole
 * jamais les règles ; ces tests prouvent que le vérificateur DÉTECTE bien une violation (sinon
 * il pourrait passer à vide → fausse confiance). Pour chaque règle : un résultat délibérément
 * cassé doit être signalé. + un résultat valide réel ne signale rien.
 */
import { describe, it, expect } from 'vitest';
import { checkInvariants } from './optimiser.invariants';
import { optimiserDecoupe } from './optimiser';
import type { ProduitDecoupe, ResultatOptimisation, Vitre } from './types';

function produit(over: Partial<ProduitDecoupe> = {}): ProduitDecoupe {
	return { id: 'P', laizes_mm: [1520], orientation_imposee: false, jointage_autorise: false, nestable: true, marge_pose_mm: 0, recouvrement_mm: 0, ...over };
}
function vitre(over: Partial<Vitre> = {}): Vitre {
	return { id: 'V', produit_id: 'P', largeur_mm: 1000, hauteur_mm: 500, quantite: 1, sur_mesure_fournisseur: false, ...over };
}
const carte = (...ps: ProduitDecoupe[]) => new Map(ps.map((p) => [p.id, p]));

// Un plan valide minimal (1 pièce 1000×500 dans une laize 1520).
function planValide() {
	return {
		produit_id: 'P',
		laize_mm: 1520,
		longueur_consommee_mm: 500,
		surface_pieces_mm2: 500000,
		taux_chute: (1520 * 500 - 500000) / (1520 * 500),
		placements: [{ vitre_id: 'V', piece_index: 0, x_mm: 0, y_mm: 0, largeur_placee_mm: 1000, hauteur_placee_mm: 500, pivotee: false }],
		poses_en_les: []
	};
}
function res(over: Partial<ResultatOptimisation> = {}): ResultatOptimisation {
	return { plans: [planValide()], commandes_fournisseur: [], alertes: [], ...over };
}

describe('checkInvariants - signale bien les plans valides comme corrects', () => {
	it('sortie réelle de l’algo → aucune violation', () => {
		const vitres = [vitre()];
		const produits = carte(produit());
		expect(checkInvariants(vitres, produits, optimiserDecoupe(vitres, produits))).toEqual([]);
	});
	it('résultat valide construit à la main → aucune violation', () => {
		expect(checkInvariants([vitre()], carte(produit()), res())).toEqual([]);
	});
});

describe('checkInvariants - DÉTECTE les violations (le vérificateur a des dents)', () => {
	it('I1 : pièce qui déborde de la laize', () => {
		const r = res();
		r.plans[0].placements[0].x_mm = 1000; // 1000 + 1000 = 2000 > 1520
		expect(checkInvariants([vitre()], carte(produit()), r).some((m) => m.startsWith('I1'))).toBe(true);
	});

	it('I2 : deux pièces qui se chevauchent', () => {
		const r = res();
		r.plans[0].placements.push({ vitre_id: 'V', piece_index: 1, x_mm: 500, y_mm: 0, largeur_placee_mm: 400, hauteur_placee_mm: 500, pivotee: false });
		r.plans[0].surface_pieces_mm2 += 200000; // garde I4 cohérent pour isoler I2
		expect(checkInvariants([vitre({ quantite: 2 })], carte(produit()), r).some((m) => m.startsWith('I2'))).toBe(true);
	});

	it('I3b : vitre perdue (ni posée, ni commande, ni alerte)', () => {
		const r = res({ plans: [] }); // V n'apparaît nulle part
		expect(checkInvariants([vitre()], carte(produit()), r).some((m) => m.startsWith('I3b'))).toBe(true);
	});

	it('I3d : pièce manquante (quantité 2, une seule posée, pas d’alerte)', () => {
		expect(checkInvariants([vitre({ quantite: 2 })], carte(produit()), res()).some((m) => m.startsWith('I3d'))).toBe(true);
	});

	it('I4 : taux de chute incohérent', () => {
		const r = res();
		r.plans[0].taux_chute = 0.1; // faux
		expect(checkInvariants([vitre()], carte(produit()), r).some((m) => m.startsWith('I4'))).toBe(true);
	});

	it('I5 : vitre cochée sur-mesure mais posée', () => {
		expect(checkInvariants([vitre({ sur_mesure_fournisseur: true })], carte(produit()), res()).some((m) => m.startsWith('I5'))).toBe(true);
	});

	it('I6 : produit non nestable mais posé', () => {
		const out = checkInvariants([vitre()], carte(produit({ nestable: false })), res());
		expect(out.some((m) => m.startsWith('I6'))).toBe(true);
	});

	it('I9 : longueur plus petite que la pièce la plus haute', () => {
		const r = res();
		r.plans[0].longueur_consommee_mm = 400; // < 500 (hauteur pièce) ; recadre I1/I4 pour isoler I9
		r.plans[0].placements[0].hauteur_placee_mm = 500;
		expect(checkInvariants([vitre()], carte(produit()), r).some((m) => m.startsWith('I9'))).toBe(true);
	});
});
