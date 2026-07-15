import { describe, it, expect, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

type Entreprise = { id: string; raison_sociale: string; site_web: string | null; canton?: string | null };

function createMockSupabase(rows: Entreprise[], opts: { error?: { message: string } } = {}) {
	const calls: { ilikePattern?: string; limit?: number; statut_archive?: boolean; marque?: string; selectCols?: string } = {};
	const builder = {
		select(cols: string) { calls.selectCols = cols; return builder; },
		eq(col: string, val: boolean | string) {
			if (col === 'marque') calls.marque = val as string;
			else calls.statut_archive = val as boolean;
			return builder;
		},
		ilike(_col: string, pattern: string) {
			calls.ilikePattern = pattern;
			return builder;
		},
		order() { return builder; },
		limit(n: number) {
			calls.limit = n;
			return Promise.resolve({ data: opts.error ? null : rows, error: opts.error ?? null });
		},
	};
	return {
		from() { return builder; },
		_calls: calls,
	};
}

async function callGET(
	supabase: ReturnType<typeof createMockSupabase>,
	q: string | null
): Promise<{ status: number; body: unknown }> {
	const mod = await import('./+server');
	const url = new URL(`http://localhost/api/entreprises/search${q !== null ? `?q=${encodeURIComponent(q)}` : ''}`);
	const event = {
		url,
		locals: { supabase, marque: 'filmpro' },
	} as unknown as Parameters<typeof mod.GET>[0];
	const resp = await mod.GET(event);
	const body = await resp.json();
	return { status: resp.status, body };
}

describe('GET /api/entreprises/search (V2b H-06)', () => {
	it('returns empty when q < 2 chars (no DB call)', async () => {
		const supabase = createMockSupabase([{ id: '1', raison_sociale: 'Test', site_web: null }]);
		const r = await callGET(supabase, 'a');
		expect(r.status).toBe(200);
		expect((r.body as { results: unknown[] }).results).toEqual([]);
		expect(supabase._calls.ilikePattern).toBeUndefined();
	});

	it('triggers ilike prefix-bounded with q% pattern and statut_archive=false', async () => {
		const rows: Entreprise[] = [
			{ id: '1', raison_sociale: 'Acme SA', site_web: 'https://acme.ch' },
		];
		const supabase = createMockSupabase(rows);
		await callGET(supabase, 'Acm');
		expect(supabase._calls.ilikePattern).toBe('Acm%');
		expect(supabase._calls.limit).toBe(20);
		expect(supabase._calls.statut_archive).toBe(false);
		expect(supabase._calls.marque).toBe('filmpro');
	});

	it('escapes ILIKE wildcards in user input (% _ \\)', async () => {
		const supabase = createMockSupabase([]);
		await callGET(supabase, 'a%_\\');
		expect(supabase._calls.ilikePattern).toBe('a\\%\\_\\\\%');
	});

	it('rejects q > 100 chars with 400', async () => {
		const supabase = createMockSupabase([]);
		const longQ = 'a'.repeat(101);
		const r = await callGET(supabase, longQ);
		expect(r.status).toBe(400);
	});

	it('returns up to 20 results from DB', async () => {
		const rows: Entreprise[] = Array.from({ length: 20 }, (_, i) => ({
			id: `ent-${i}`,
			raison_sociale: `Acme ${i}`,
			site_web: null,
		}));
		const supabase = createMockSupabase(rows);
		const r = await callGET(supabase, 'Acm');
		expect((r.body as { results: Entreprise[] }).results).toHaveLength(20);
	});

	it('returns 500 on DB error', async () => {
		const supabase = createMockSupabase([], { error: { message: 'connection refused' } });
		const r = await callGET(supabase, 'Acm');
		expect(r.status).toBe(500);
	});

	it('V3 : SELECT inclut canton (pastille fiche mobile)', async () => {
		const supabase = createMockSupabase([{ id: '1', raison_sociale: 'Acme SA', site_web: null, canton: 'VD' }]);
		const r = await callGET(supabase, 'Acm');
		expect(supabase._calls.selectCols).toContain('canton');
		expect((r.body as { results: Entreprise[] }).results[0].canton).toBe('VD');
	});
});
