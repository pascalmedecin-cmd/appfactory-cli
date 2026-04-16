import { describe, it, expect } from 'vitest';
import { pickFallback, type FallbackPools, type PoolEntry } from './veille-fallback';

function entry(url: string, score = 8, segment = 'controle-solaire'): PoolEntry {
	return { url, score, segment: segment as PoolEntry['segment'] };
}

describe('pickFallback — top-N quality_score', () => {
	const pools: FallbackPools = {
		byLibSegment: {
			'controle-solaire': [
				entry('https://lib.x/cs-1.jpg', 10, 'controle-solaire'),
				entry('https://lib.x/cs-2.jpg', 9, 'controle-solaire'),
				entry('https://lib.x/cs-3.jpg', 9, 'controle-solaire'),
				entry('https://lib.x/cs-4.jpg', 8, 'controle-solaire'),
				entry('https://lib.x/cs-5.jpg', 8, 'controle-solaire'),
				entry('https://lib.x/cs-6.jpg', 7, 'controle-solaire'),
				entry('https://lib.x/cs-7.jpg', 7, 'controle-solaire')
			],
			discretion: [entry('https://lib.x/dis-1.jpg', 9, 'discretion')]
		},
		byVeilleSegment: {
			tertiaire: [
				entry('https://lib.x/cs-1.jpg', 10, 'controle-solaire'),
				entry('https://lib.x/cs-2.jpg', 9, 'controle-solaire')
			],
			residentiel: []
		}
	};

	it('utilise inferSegmentFromText quand un keyword match', () => {
		const url = pickFallback(pools, 'tertiaire', 'seed-1', {
			title: 'film solaire ROI',
			summary: ''
		});
		// 'film solaire' → controle-solaire → top 5 du pool
		expect(url).toMatch(/https:\/\/lib\.x\/cs-[1-5]\.jpg/);
	});

	it("retombe sur byVeilleSegment si aucun keyword ne match", () => {
		const url = pickFallback(pools, 'tertiaire', 'seed-1', {
			title: 'compte rendu général',
			summary: ''
		});
		expect(url).toMatch(/https:\/\/lib\.x\/cs-[12]\.jpg/);
	});

	it('déterministe : même seed → même image', () => {
		const u1 = pickFallback(pools, 'tertiaire', 'rep1-rank2', {
			title: 'film solaire'
		});
		const u2 = pickFallback(pools, 'tertiaire', 'rep1-rank2', {
			title: 'film solaire'
		});
		expect(u1).toBe(u2);
	});

	it('seed différent → potentiellement image différente (dans le top-N)', () => {
		const seeds = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];
		const urls = new Set(
			seeds.map((s) => pickFallback(pools, 'tertiaire', s, { title: 'film solaire' }))
		);
		// On doit voir au moins 2 URLs distinctes parmi 8 seeds (top-N=5 → 5 candidats max)
		expect(urls.size).toBeGreaterThan(1);
	});

	it('respecte la limite top-N (jamais d\'image low-score si top dispo)', () => {
		// 100 seeds différents → toutes les URLs doivent être dans le top 5
		const top5 = new Set([
			'https://lib.x/cs-1.jpg',
			'https://lib.x/cs-2.jpg',
			'https://lib.x/cs-3.jpg',
			'https://lib.x/cs-4.jpg',
			'https://lib.x/cs-5.jpg'
		]);
		for (let i = 0; i < 100; i++) {
			const url = pickFallback(pools, 'tertiaire', `seed-${i}`, {
				title: 'film solaire'
			});
			expect(url).not.toBeNull();
			expect(top5.has(url!)).toBe(true);
		}
	});

	it('retourne null si pool vide', () => {
		const empty: FallbackPools = { byLibSegment: {}, byVeilleSegment: {} };
		const url = pickFallback(empty, 'residentiel', 'x', { title: 'foo' });
		expect(url).toBeNull();
	});

	it('inférence avec pool vide → fallback sur Veille segment', () => {
		// Inférence match "discretion" mais pool vide pour ce segment veille → on tombe... non, pas dans byVeilleSegment.
		// Vérifions le cas inverse : keyword qui infère un segment lib qui A des entries
		const url = pickFallback(pools, 'tertiaire', 's1', {
			title: 'frosted privacy office'
		});
		// inférence → discretion → pool[discretion]=1 entry → cs-2... non, attend
		// 'frosted' → discretion segment lib, qui a 1 entry
		expect(url).toBe('https://lib.x/dis-1.jpg');
	});
});
