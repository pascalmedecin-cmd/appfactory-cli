import { describe, it, expect } from 'vitest';
import { currentYearMonth, getMonthlyUsage, incrementUsage } from './quota';

describe('currentYearMonth', () => {
	it('formate YYYY-MM (UTC), mois zéro-paddé', () => {
		expect(currentYearMonth(new Date('2026-01-05T12:00:00Z'))).toBe('2026-01');
		expect(currentYearMonth(new Date('2026-12-31T23:59:00Z'))).toBe('2026-12');
		expect(currentYearMonth(new Date('2026-09-01T00:00:00Z'))).toBe('2026-09');
	});
});

function mockFrom(result: { data?: unknown; error?: unknown }) {
	return {
		from() {
			const b: Record<string, unknown> = {};
			const proxy: unknown = new Proxy(b, {
				get(_t, p: string) {
					if (p === 'select' || p === 'eq') return () => proxy;
					if (p === 'maybeSingle') return () => Promise.resolve(result);
					if (p === 'upsert') return () => Promise.resolve({ error: null });
					return undefined;
				},
			});
			return proxy;
		},
	} as never;
}

describe('getMonthlyUsage : tolérant aux erreurs DB', () => {
	it('lit calls quand présent', async () => {
		expect(await getMonthlyUsage(mockFrom({ data: { calls: 42 }, error: null }), 'google_places')).toBe(42);
	});
	it('0 si erreur', async () => {
		expect(await getMonthlyUsage(mockFrom({ data: null, error: { message: 'boom' } }), 'google_places')).toBe(0);
	});
	it('0 si pas de ligne', async () => {
		expect(await getMonthlyUsage(mockFrom({ data: null, error: null }), 'search_ch')).toBe(0);
	});
	it('0 si calls non numérique', async () => {
		expect(await getMonthlyUsage(mockFrom({ data: { calls: 'x' }, error: null }), 'google_places')).toBe(0);
	});
});

function mockRpc(result: { data?: unknown; error?: unknown }) {
	return { rpc: () => Promise.resolve(result) } as never;
}

describe('incrementUsage : retour de la nouvelle valeur via RPC', () => {
	it('retourne data quand numérique', async () => {
		expect(await incrementUsage(mockRpc({ data: 43, error: null }), 'google_places', 1)).toBe(43);
	});
	it('null si erreur DB', async () => {
		expect(await incrementUsage(mockRpc({ data: null, error: { message: 'boom' } }), 'google_places')).toBeNull();
	});
	it('null si retour non numérique', async () => {
		expect(await incrementUsage(mockRpc({ data: 'x', error: null }), 'google_places')).toBeNull();
	});
});
