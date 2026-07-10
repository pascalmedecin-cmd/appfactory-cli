import { describe, it, expect } from 'vitest';
import { selectByMix, computeMix } from './mix-select';
import type { IntelligenceItem } from './schema';

function mk(rank: number, geo: IntelligenceItem['geo_scope']): IntelligenceItem {
	return {
		rank,
		title: `Item de test numéro ${rank}`,
		summary: 'Résumé suffisamment long pour le schéma de validation des items de veille.',
		filmpro_relevance: 'Pertinence FilmPro de test pour le segment tertiaire.',
		maturity: 'etabli',
		theme: 'films_solaires',
		geo_scope: geo,
		source: { name: 'Src', url: `https://ex.com/${rank}`, published_at: '2026-06-18T00:00:00Z' },
		deep_dive: null,
		segment: 'tertiaire',
		actionability: 'veille_active',
		search_terms: []
	};
}

describe('computeMix', () => {
	it('compte romande/suisse/monde et la part locale', () => {
		const m = computeMix([mk(1, 'suisse_romande'), mk(2, 'suisse'), mk(3, 'monde')]);
		expect(m).toMatchObject({ total: 3, romande: 1, suisse: 1, monde: 1, local: 2 });
		expect(m.localShare).toBeCloseTo(2 / 3);
	});
	it('localShare=0 sur liste vide (pas de division par zéro)', () => {
		expect(computeMix([]).localShare).toBe(0);
	});
});

describe('selectByMix', () => {
	it('en famine (items ≤ cap), garde TOUT (aucun item perdu)', () => {
		const items = [mk(1, 'suisse_romande'), mk(2, 'suisse_romande'), mk(3, 'monde')];
		const r = selectByMix(items, 10);
		expect(r.selected).toHaveLength(3);
		expect(r.selected.map((i) => i.rank)).toEqual([1, 2, 3]);
	});

	it('au-delà du cap, préserve le mix 2/3 local / 1/3 monde', () => {
		// 8 locaux (rank 1-8) + 8 monde (rank 9-16), cap 9 → 6 locaux + 3 monde.
		const locals = Array.from({ length: 8 }, (_, i) => mk(i + 1, 'suisse_romande'));
		const globals = Array.from({ length: 8 }, (_, i) => mk(i + 9, 'monde'));
		const r = selectByMix([...locals, ...globals], 9);
		expect(r.selected).toHaveLength(9);
		expect(r.mix.local).toBe(6);
		expect(r.mix.monde).toBe(3);
	});

	it('backfill : si peu de monde, complète avec du local (jamais d item inexistant)', () => {
		// 9 locaux + 1 monde, cap 10 → quota monde 3 mais 1 seul dispo → 9 locaux + 1 monde.
		const locals = Array.from({ length: 9 }, (_, i) => mk(i + 1, 'suisse_romande'));
		const globals = [mk(10, 'monde')];
		const r = selectByMix([...locals, ...globals], 10);
		expect(r.selected).toHaveLength(10);
		expect(r.mix.local).toBe(9);
		expect(r.mix.monde).toBe(1);
	});

	it('sélection triée par rank en sortie', () => {
		const items = [mk(3, 'monde'), mk(1, 'suisse_romande'), mk(2, 'suisse')];
		const r = selectByMix(items, 10);
		expect(r.selected.map((i) => i.rank)).toEqual([1, 2, 3]);
	});

	it('drift=true si édition 100% monde avec assez d items (canari W18-24)', () => {
		const r = selectByMix([mk(1, 'monde'), mk(2, 'monde'), mk(3, 'monde')], 10);
		expect(r.mix.localShare).toBe(0);
		expect(r.drift).toBe(true);
	});

	it('drift=false si majorité locale', () => {
		const r = selectByMix(
			[mk(1, 'suisse_romande'), mk(2, 'suisse_romande'), mk(3, 'monde')],
			10
		);
		expect(r.drift).toBe(false);
	});

	it('drift=false si trop peu d items pour juger (1 seul monde)', () => {
		const r = selectByMix([mk(1, 'monde')], 10);
		expect(r.drift).toBe(false);
	});

	// Plancher recalibré à 0.30 le 2026-07-10 : une édition ~38 % locale (cas W28,
	// 3 local / 8 total) est jugée de bonne qualité et NE déclenche plus le canari.
	it('drift=false à ~38% local (>= plancher 0.30, cas W28)', () => {
		const r = selectByMix(
			[
				mk(1, 'suisse_romande'),
				mk(2, 'suisse_romande'),
				mk(3, 'suisse'),
				mk(4, 'monde'),
				mk(5, 'monde'),
				mk(6, 'monde'),
				mk(7, 'monde'),
				mk(8, 'monde')
			],
			10
		);
		expect(r.mix.localShare).toBeCloseTo(3 / 8);
		expect(r.drift).toBe(false);
	});

	// Sous le plancher 0.30, la vraie dérive « trop monde » reste détectée.
	it('drift=true à 20% local (< plancher 0.30)', () => {
		const r = selectByMix(
			[mk(1, 'suisse_romande'), mk(2, 'monde'), mk(3, 'monde'), mk(4, 'monde'), mk(5, 'monde')],
			10
		);
		expect(r.mix.localShare).toBeCloseTo(1 / 5);
		expect(r.drift).toBe(true);
	});
});
