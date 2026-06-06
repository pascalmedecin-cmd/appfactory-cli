/**
 * Niveau 3 de la spec de vérification (`.product-architect/decoupe/optimiser-verification-spec.md`) :
 * CORPUS GOLDEN sur des cas réalistes (produit réel 3M Prestige 70 + profils représentatifs).
 * Plans VALIDÉS À L'ŒIL par Pascal le 2026-06-06, puis gelés ici. Toute évolution future qui
 * change un de ces plans casse ce test → doit repasser devant Pascal (anti-régression métier).
 * Chaque plan est aussi recoupé par le vérificateur d'invariants (aucune règle dure violée).
 */
import { describe, it, expect } from 'vitest';
import { optimiserDecoupe } from './optimiser';
import { checkInvariants } from './optimiser.invariants';
import type { ProduitDecoupe, Vitre } from './types';

// Produit RÉEL du catalogue (lu en base le 2026-06-06).
const P_REEL: ProduitDecoupe = { id: '3M70', laizes_mm: [1524], orientation_imposee: false, jointage_autorise: true, nestable: true, marge_pose_mm: 1, recouvrement_mm: 0 };
// Profils représentatifs (pour verrouiller les cas limites non encore au catalogue).
const P_VERNIS: ProduitDecoupe = { id: 'VERNIS', laizes_mm: [1270], orientation_imposee: false, jointage_autorise: false, nestable: false, marge_pose_mm: 0, recouvrement_mm: 0 };
const P_SENS: ProduitDecoupe = { id: 'SENS', laizes_mm: [1000, 1520], orientation_imposee: true, jointage_autorise: false, nestable: true, marge_pose_mm: 2, recouvrement_mm: 0 };

const v = (id: string, produit_id: string, l: number, h: number, q: number, sm = false): Vitre => ({ id, produit_id, largeur_mm: l, hauteur_mm: h, quantite: q, sur_mesure_fournisseur: sm });

interface Attendu {
	plans: { produit_id: string; laize_mm: number; longueur_mm: number; nbPieces: number; nbLes: number; chute: number }[];
	commandes: string[]; // raisons triées
	alertes: string[]; // types triés
}

const CAS: { nom: string; produits: ProduitDecoupe[]; vitres: Vitre[]; attendu: Attendu }[] = [
	{
		nom: 'S1 - Villa, fenêtres standard (3M Prestige 70, atelier)',
		produits: [P_REEL],
		vitres: [v('a', '3M70', 1200, 2100, 4), v('b', '3M70', 800, 1400, 6), v('c', '3M70', 600, 900, 3)],
		attendu: { plans: [{ produit_id: '3M70', laize_mm: 1524, longueur_mm: 15013, nbPieces: 13, nbLes: 0, chute: 0.19 }], commandes: [], alertes: [] }
	},
	{
		nom: 'S2 - Grande baie > laize → pose en lés (3M Prestige 70, jointage)',
		produits: [P_REEL],
		vitres: [v('a', '3M70', 2400, 2300, 2), v('b', '3M70', 1500, 2300, 1)],
		attendu: { plans: [{ produit_id: '3M70', laize_mm: 1524, longueur_mm: 11905, nbPieces: 5, nbLes: 2, chute: 0.2 }], commandes: [], alertes: [] }
	},
	{
		nom: 'S3 - Mix atelier + sur-mesure fournisseur (3M Prestige 70)',
		produits: [P_REEL],
		vitres: [v('a', '3M70', 1200, 2100, 3), v('b', '3M70', 1800, 2500, 1, true)],
		attendu: { plans: [{ produit_id: '3M70', laize_mm: 1524, longueur_mm: 6303, nbPieces: 3, nbLes: 0, chute: 0.21 }], commandes: ['sur_mesure_fournisseur'], alertes: [] }
	},
	{
		nom: 'S4 - Vernis anti-UV non nestable, coché sur-mesure',
		produits: [P_VERNIS],
		vitres: [v('a', 'VERNIS', 1100, 1600, 2, true)],
		attendu: { plans: [], commandes: ['non_nestable'], alertes: [] }
	},
	{
		nom: 'S5 - Film à sens imposé, multi-laize 1000/1520',
		produits: [P_SENS],
		vitres: [v('a', 'SENS', 900, 1800, 3)],
		attendu: { plans: [{ produit_id: 'SENS', laize_mm: 1000, longueur_mm: 5406, nbPieces: 3, nbLes: 0, chute: 0.1 }], commandes: [], alertes: [] }
	}
];

describe('optimiserDecoupe - corpus golden (niveau 3, validé Pascal 2026-06-06)', () => {
	for (const cas of CAS) {
		it(cas.nom, () => {
			const produits = new Map(cas.produits.map((p) => [p.id, p]));
			const r = optimiserDecoupe(cas.vitres, produits);

			// Recoupage : aucune règle dure violée sur ce cas réel.
			expect(checkInvariants(cas.vitres, produits, r)).toEqual([]);

			// Plans gelés (les chiffres que Pascal a validés).
			expect(r.plans.length).toBe(cas.attendu.plans.length);
			r.plans.forEach((p, i) => {
				const a = cas.attendu.plans[i];
				expect(p.produit_id).toBe(a.produit_id);
				expect(p.laize_mm).toBe(a.laize_mm);
				expect(p.longueur_consommee_mm).toBe(a.longueur_mm);
				expect(p.placements.length).toBe(a.nbPieces);
				expect(p.poses_en_les.length).toBe(a.nbLes);
				expect(p.taux_chute).toBeCloseTo(a.chute, 2);
			});

			expect(r.commandes_fournisseur.map((c) => c.raison).sort()).toEqual([...cas.attendu.commandes].sort());
			expect(r.alertes.map((a) => a.type).sort()).toEqual([...cas.attendu.alertes].sort());
		});
	}
});
