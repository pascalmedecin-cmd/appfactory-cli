/**
 * Niveau 1 de la spec de vérification (`.product-architect/decoupe/optimiser-verification-spec.md`) :
 * FUZZING des règles dures. On génère des dizaines de milliers d'entrées au hasard (dimensions,
 * quantités, laizes, marges, jointage, orientation, coche, produit inconnu) et on vérifie qu'AUCUNE
 * règle dure n'est jamais violée. fast-check réduit tout échec au plus petit cas reproductible.
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { optimiserDecoupe } from './optimiser';
import { checkInvariants } from './optimiser.invariants';
import type { ProduitDecoupe, Vitre } from './types';

// --- Générateurs (arbitraires) ---------------------------------------------------------------
// Bornes choisies pour couvrir les cas tordus (oversized, lés, marges, multi-laizes) tout en
// gardant le nombre de pièces par cas borné (le fuzzing reste rapide).
function produitArb(id: string): fc.Arbitrary<ProduitDecoupe> {
	return fc.record({
		id: fc.constant(id),
		laizes_mm: fc.uniqueArray(fc.integer({ min: 350, max: 1800 }), { minLength: 1, maxLength: 3 }),
		orientation_imposee: fc.boolean(),
		jointage_autorise: fc.boolean(),
		nestable: fc.boolean(),
		marge_pose_mm: fc.integer({ min: 0, max: 100 }),
		recouvrement_mm: fc.integer({ min: 0, max: 120 })
	});
}

const productsArb = fc.tuple(produitArb('P0'), produitArb('P1'), produitArb('P2'));

const vitresArb = fc.array(
	fc.record({
		produit_id: fc.constantFrom('P0', 'P1', 'P2', 'INCONNU'),
		largeur_mm: fc.integer({ min: 1, max: 2000 }),
		hauteur_mm: fc.integer({ min: 1, max: 2000 }),
		quantite: fc.integer({ min: 1, max: 4 }),
		sur_mesure_fournisseur: fc.boolean()
	}),
	{ minLength: 0, maxLength: 8 }
);

function toMap(prods: ProduitDecoupe[]): Map<string, ProduitDecoupe> {
	return new Map(prods.map((p) => [p.id, p]));
}
function withIds(raw: Omit<Vitre, 'id'>[]): Vitre[] {
	return raw.map((v, i) => ({ ...v, id: `V${i}` }));
}

// Petit shuffle déterministe (LCG) piloté par une graine générée → indépendance à l'ordre.
function shuffle<T>(arr: T[], seed: number): T[] {
	const a = [...arr];
	let s = (seed ^ 0x9e3779b9) >>> 0;
	for (let i = a.length - 1; i > 0; i--) {
		s = (1103515245 * s + 12345) >>> 0;
		const j = s % (i + 1);
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

// ---------------------------------------------------------------------------------------------
describe('optimiserDecoupe - fuzzing des règles dures (niveau 1)', () => {
	it('aucune règle dure violée sur 20 000 cas aléatoires', () => {
		fc.assert(
			fc.property(productsArb, vitresArb, (prods, raw) => {
				const produits = toMap(prods);
				const vitres = withIds(raw);
				const r = optimiserDecoupe(vitres, produits);
				const violations = checkInvariants(vitres, produits, r);
				if (violations.length > 0) {
					throw new Error('Violations:\n  - ' + violations.join('\n  - '));
				}
			}),
			{ numRuns: 20000 }
		);
	}, 120000);

	it('déterminisme : mêmes entrées → sorties identiques (I8)', () => {
		fc.assert(
			fc.property(productsArb, vitresArb, (prods, raw) => {
				const produits = toMap(prods);
				const vitres = withIds(raw);
				expect(optimiserDecoupe(vitres, produits)).toEqual(optimiserDecoupe(vitres, produits));
			}),
			{ numRuns: 5000 }
		);
	}, 60000);

	it('indépendance à l’ordre : permuter les vitres → plan identique, mêmes commandes/alertes', () => {
		// Le PLAN de coupe (géométrie) doit être invariant à l'ordre de saisie. Les listes
		// commandes/alertes suivent l'ordre de saisie (voulu) → comparées en tant qu'ensembles.
		const canon = (r: ReturnType<typeof optimiserDecoupe>) => ({
			// Géométrie (placements, longueur, chute) comparée à l'identique : elle DOIT être invariante.
			// Seul poses_en_les (liste-résumé) suit l'ordre de saisie → normalisée comme un ensemble.
			plans: r.plans.map((p) => ({
				...p,
				poses_en_les: [...p.poses_en_les].sort(
					(a, b) => a.vitre_id.localeCompare(b.vitre_id) || a.piece_index - b.piece_index
				)
			})),
			commandes: [...r.commandes_fournisseur].sort(
				(a, b) => a.vitre_id.localeCompare(b.vitre_id) || a.raison.localeCompare(b.raison)
			),
			alertes: [...r.alertes].sort(
				(a, b) => a.vitre_id.localeCompare(b.vitre_id) || a.type.localeCompare(b.type)
			)
		});
		fc.assert(
			fc.property(productsArb, vitresArb, fc.nat(), (prods, raw, seed) => {
				const produits = toMap(prods);
				const vitres = withIds(raw); // ids fixés AVANT permutation
				const ref = optimiserDecoupe(vitres, produits);
				const permute = optimiserDecoupe(shuffle(vitres, seed), produits);
				expect(canon(permute)).toEqual(canon(ref));
			}),
			{ numRuns: 5000 }
		);
	}, 60000);
});
