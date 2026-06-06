/**
 * Niveau 2 de la spec de vérification (`.product-architect/decoupe/optimiser-verification-spec.md`) :
 * QUALITÉ des propositions.
 *  - O1 : sur des familles CONSTRUITES où l'optimum est connu, l'heuristique doit l'atteindre (égalité).
 *  - O2 : sur de petits cas, on calcule par FORCE BRUTE le meilleur packing-étagère (min sur toutes
 *         les permutations) et on borne l'écart de l'heuristique (le ratio réel est loggé).
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { optimiserDecoupe } from './optimiser';
import type { ProduitDecoupe, Vitre } from './types';

function produit(laize: number, over: Partial<ProduitDecoupe> = {}): ProduitDecoupe {
	return {
		id: 'P',
		laizes_mm: [laize],
		orientation_imposee: true, // pas de rotation → comparaison directe avec l'oracle
		jointage_autorise: false,
		nestable: true,
		marge_pose_mm: 0,
		recouvrement_mm: 0,
		...over
	};
}
function carte(p: ProduitDecoupe): Map<string, ProduitDecoupe> {
	return new Map([[p.id, p]]);
}

// --- Oracle force brute : meilleur packing-étagère (min sur toutes les permutations) ---------
function firstFitLength(order: { a: number; b: number }[], laize: number): number {
	// Modèle étagère général : une étagère prend la hauteur de SA PLUS HAUTE pièce
	// (une pièce plus haute la fait grandir). Longueur = somme des hauteurs d'étagère.
	const shelves: { used: number; h: number }[] = [];
	for (const p of order) {
		let s = shelves.find((sh) => sh.used + p.a <= laize);
		if (!s) {
			s = { used: 0, h: 0 };
			shelves.push(s);
		}
		s.used += p.a;
		s.h = Math.max(s.h, p.b);
	}
	return shelves.reduce((sum, s) => sum + s.h, 0);
}
function permutations<T>(arr: T[]): T[][] {
	if (arr.length <= 1) return [arr];
	const res: T[][] = [];
	for (let i = 0; i < arr.length; i++) {
		const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
		for (const p of permutations(rest)) res.push([arr[i], ...p]);
	}
	return res;
}
function bestShelfLength(pieces: { a: number; b: number }[], laize: number): number {
	let best = Infinity;
	for (const perm of permutations(pieces)) best = Math.min(best, firstFitLength(perm, laize));
	return best;
}

// ---------------------------------------------------------------------------------------------
describe('optimiserDecoupe - oracle qualité (niveau 2)', () => {
	it('O1a : N pièces identiques → longueur = ⌈N/k⌉ × h (optimum connu)', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 400, max: 1600 }).chain((L) =>
					fc.record({
						L: fc.constant(L),
						w: fc.integer({ min: 50, max: L }),
						h: fc.integer({ min: 50, max: 1500 }),
						N: fc.integer({ min: 1, max: 12 })
					})
				),
				({ L, w, h, N }) => {
					const r = optimiserDecoupe(
						[{ id: 'V', produit_id: 'P', largeur_mm: w, hauteur_mm: h, quantite: N, sur_mesure_fournisseur: false }],
						carte(produit(L))
					);
					const k = Math.floor(L / w); // pièces par étagère
					const attendu = Math.ceil(N / k) * h;
					expect(r.plans[0].longueur_consommee_mm).toBe(attendu);
				}
			),
			{ numRuns: 3000 }
		);
	});

	it('O1b : une seule pièce → longueur = sa dimension « le long »', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 400, max: 1600 }).chain((L) =>
					fc.record({ L: fc.constant(L), w: fc.integer({ min: 50, max: L }), h: fc.integer({ min: 50, max: 1500 }) })
				),
				({ L, w, h }) => {
					const r = optimiserDecoupe(
						[{ id: 'V', produit_id: 'P', largeur_mm: w, hauteur_mm: h, quantite: 1, sur_mesure_fournisseur: false }],
						carte(produit(L))
					);
					expect(r.plans[0].longueur_consommee_mm).toBe(h);
				}
			),
			{ numRuns: 1500 }
		);
	});

	it('O1c : pièces qui pavent exactement une étagère → longueur = h', () => {
		fc.assert(
			fc.property(
				fc.array(fc.integer({ min: 1, max: 600 }), { minLength: 2, maxLength: 5 }),
				fc.integer({ min: 50, max: 1500 }),
				(parts, h) => {
					const L = parts.reduce((s, x) => s + x, 0); // laize = somme exacte → pavage parfait
					const vitres: Vitre[] = parts.map((w, i) => ({
						id: `V${i}`,
						produit_id: 'P',
						largeur_mm: w,
						hauteur_mm: h,
						quantite: 1,
						sur_mesure_fournisseur: false
					}));
					const r = optimiserDecoupe(vitres, carte(produit(L)));
					expect(r.plans[0].longueur_consommee_mm).toBe(h);
				}
			),
			{ numRuns: 2000 }
		);
	});

	it('O2 : écart au meilleur packing-étagère borné (force brute, N ≤ 6)', () => {
		const ratios: number[] = [];
		fc.assert(
			fc.property(
				fc.integer({ min: 500, max: 1600 }).chain((L) =>
					fc.record({
						L: fc.constant(L),
						pieces: fc.array(fc.record({ a: fc.integer({ min: 50, max: L }), b: fc.integer({ min: 50, max: 1500 }) }), {
							minLength: 2,
							maxLength: 6
						})
					})
				),
				({ L, pieces }) => {
					const vitres: Vitre[] = pieces.map((p, i) => ({
						id: `V${i}`,
						produit_id: 'P',
						largeur_mm: p.a,
						hauteur_mm: p.b,
						quantite: 1,
						sur_mesure_fournisseur: false
					}));
					const r = optimiserDecoupe(vitres, carte(produit(L)));
					const ffdh = r.plans[0].longueur_consommee_mm;
					const best = bestShelfLength(pieces, L);
					const ratio = ffdh / best;
					ratios.push(ratio);
					// L'heuristique ne doit jamais être loin du meilleur ordre possible.
					expect(ratio).toBeLessThanOrEqual(1.5);
				}
			),
			{ numRuns: 1200 }
		);
		ratios.sort((a, b) => a - b);
		const med = ratios[Math.floor(ratios.length / 2)];
		const max = ratios[ratios.length - 1];
		// eslint-disable-next-line no-console
		console.log(`O2 écart FFDH/meilleur-ordre : médian=${med.toFixed(3)} max=${max.toFixed(3)} (n=${ratios.length})`);
		expect(med).toBeLessThanOrEqual(1.1);
	});
});
