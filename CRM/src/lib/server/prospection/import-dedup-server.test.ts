import { describe, it, expect } from 'vitest';
import { fetchLeadDedupSets } from './import-dedup-server';

/**
 * Mock supabase minimal : capture le `.eq('marque', …)` (garde d'étanchéité) et sert des pages
 * successives via `.range(from, to)`. Prouve que la lecture de dédup est marque-scopée et paginée.
 */
function mockClient(rowsByMarque: Record<string, Array<Record<string, unknown>>>, calls: { eq: [string, unknown][] }) {
	return {
		from() {
			const state: { marque: string | null; from: number; to: number } = { marque: null, from: 0, to: Infinity };
			const proxy: unknown = new Proxy({}, {
				get(_t, prop: string) {
					if (prop === 'select') return () => proxy;
					if (prop === 'order') return () => proxy;
					if (prop === 'eq') return (col: string, val: unknown) => { calls.eq.push([col, val]); if (col === 'marque') state.marque = String(val); return proxy; };
					if (prop === 'range') return (f: number, t: number) => { state.from = f; state.to = t; return proxy; };
					if (prop === 'then') return (resolve: (v: unknown) => void) => {
						const all = rowsByMarque[state.marque ?? ''] ?? [];
						resolve({ data: all.slice(state.from, state.to + 1), error: null });
					};
					return undefined;
				},
			});
			return proxy;
		},
	};
}

describe('fetchLeadDedupSets', () => {
	it('scope la lecture à la marque active (.eq(marque)) et bâtit les 4 axes', async () => {
		const calls = { eq: [] as [string, unknown][] };
		const client = mockClient(
			{
				filmpro: [{ raison_sociale: 'Régie du Molard', localite: 'Genève', npa: '1204', telephone: '022 310 00 00', email: 'a@molard.ch', site_web: 'https://molard.ch' }],
				led: [{ raison_sociale: 'Neon Craft', localite: 'Carouge', npa: '1227', telephone: null, email: null, site_web: null }],
			},
			calls,
		);
		const sets = await fetchLeadDedupSets(client as never, 'filmpro');
		// Étanchéité : la seule marque interrogée est 'filmpro'.
		expect(calls.eq).toContainEqual(['marque', 'filmpro']);
		expect(calls.eq.some(([c, v]) => c === 'marque' && v === 'led')).toBe(false);
		// Les 4 axes du lead filmpro sont indexés (accents retirés sur le nom).
		expect(sets.nameLoc.has('regiedumolard|geneve')).toBe(true);
		expect(sets.phone.has('223100000')).toBe(true);
		expect(sets.email.has('a@molard.ch')).toBe(true);
		expect(sets.domain.has('molard.ch')).toBe(true);
	});

	it('robuste : marque sans lead → sets vides', async () => {
		const calls = { eq: [] as [string, unknown][] };
		const sets = await fetchLeadDedupSets(mockClient({}, calls) as never, 'led');
		expect(sets.nameLoc.size).toBe(0);
		expect(sets.phone.size).toBe(0);
	});
});
