import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

import { GET, POST } from './+server';

const ENT = '25087e61-0d78-4e2c-b990-1c9e014dc413';

type MockOpts = {
	parent?: Record<string, unknown> | null;
	parentError?: { message: string } | null;
	insertError?: { message: string } | null;
	visits?: Array<Record<string, unknown>>;
	captureInsert?: (row: Record<string, unknown>) => void;
	captureSelect?: (table: string, cols: string) => void;
};

function createMockSupabase(opts: MockOpts) {
	return {
		from(table: string) {
			const state: { insertRow: Record<string, unknown> | null } = { insertRow: null };
			const proxy: unknown = new Proxy(
				{},
				{
					get(_t, prop: string) {
						if (prop === 'select') return (cols: string) => { opts.captureSelect?.(table, cols); return proxy; };
						if (prop === 'insert') return (row: Record<string, unknown>) => { state.insertRow = row; opts.captureInsert?.(row); return proxy; };
						if (prop === 'eq') return () => proxy;
						if (prop === 'order') return () => Promise.resolve({ data: opts.visits ?? [], error: null });
						if (prop === 'maybeSingle') return () => Promise.resolve({ data: opts.parent ?? null, error: opts.parentError ?? null });
						if (prop === 'single') return () => Promise.resolve({ data: opts.insertError ? null : { id: 'v1', visited_at: '2026-05-31T10:00:00Z', ...state.insertRow }, error: opts.insertError ?? null });
						return undefined;
					},
				}
			);
			return proxy;
		},
	};
}

function makePost(body: unknown, opts: MockOpts & { session?: boolean } = {}) {
	const captured = { insert: null as Record<string, unknown> | null };
	const supabase = createMockSupabase({
		parent: opts.parent ?? { id: ENT, adresse_siege: 'Rue Test 1, 1000 Lausanne', canton: 'VD' },
		...opts,
		captureInsert: (r) => { captured.insert = r; },
	});
	const event = {
		request: { json: async () => body },
		url: new URL('http://localhost/api/visits'),
		locals: {
			supabase,
			safeGetSession: async () => (opts.session === false ? { session: null, user: null } : { session: {}, user: { id: 'u1' } }),
		},
	} as never;
	return { event, captured };
}

function makeGet(query: string, opts: MockOpts & { session?: boolean } = {}) {
	const selects: Array<{ table: string; cols: string }> = [];
	const supabase = createMockSupabase({
		parent: opts.parent ?? { id: ENT, adresse_siege: 'Rue Test 1, 1000 Lausanne', canton: 'VD' },
		visits: opts.visits ?? [],
		captureSelect: (table, cols) => selects.push({ table, cols }),
	});
	const event = {
		url: new URL(`http://localhost/api/visits${query}`),
		locals: {
			supabase,
			safeGetSession: async () => (opts.session === false ? { session: null, user: null } : { session: {}, user: { id: 'u1' } }),
		},
	} as never;
	return { event, selects };
}

describe('POST /api/visits (V3 : GPS optionnel + resultat/note)', () => {
	beforeEach(() => { vi.restoreAllMocks(); global.fetch = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })) as never; });

	it('401 sans session (AC-014)', async () => {
		const { event } = makePost({ entreprise_id: ENT, resultat: 'absent' }, { session: false });
		const res = await POST(event);
		expect(res.status).toBe(401);
	});

	it('400 sans owner (ni entreprise_id ni lead_id)', async () => {
		const { event } = makePost({ resultat: 'absent' });
		const res = await POST(event);
		expect(res.status).toBe(400);
	});

	it('400 résultat hors enum (AC-007)', async () => {
		const { event } = makePost({ entreprise_id: ENT, resultat: 'pas_un_resultat' });
		const res = await POST(event);
		expect(res.status).toBe(400);
	});

	it('400 demi-GPS (lat sans lng)', async () => {
		const { event } = makePost({ entreprise_id: ENT, resultat: 'absent', lat: 46.5 });
		const res = await POST(event);
		expect(res.status).toBe(400);
	});

	it('enregistre une visite SANS GPS : lat/lng null, pas de géocodage (AC-015)', async () => {
		const fetchSpy = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
		global.fetch = fetchSpy as never;
		const { event, captured } = makePost({ entreprise_id: ENT, resultat: 'absent', note: 'fermé' });
		const res = await POST(event);
		expect(res.status).toBe(201);
		expect(captured.insert?.lat).toBeNull();
		expect(captured.insert?.lng).toBeNull();
		expect(captured.insert?.distance_from_zefix_m).toBeNull();
		expect(captured.insert?.resultat).toBe('absent');
		expect(captured.insert?.note).toBe('fermé');
		expect(fetchSpy).not.toHaveBeenCalled(); // pas de géocodage sans GPS
	});

	it('insère resultat + note dans la ligne (AC-019)', async () => {
		const { event, captured } = makePost({ entreprise_id: ENT, resultat: 'visite_interesse', note: 'RDV pris' });
		await POST(event);
		expect(captured.insert?.resultat).toBe('visite_interesse');
		expect(captured.insert?.note).toBe('RDV pris');
		expect(captured.insert?.entreprise_id).toBe(ENT);
		expect(captured.insert?.user_id).toBe('u1');
	});

	it('avec GPS : tente le géocodage (fetch appelé)', async () => {
		const fetchSpy = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
		global.fetch = fetchSpy as never;
		const { event, captured } = makePost({ entreprise_id: ENT, resultat: 'absent', lat: 46.5, lng: 6.6 });
		const res = await POST(event);
		expect(res.status).toBe(201);
		expect(captured.insert?.lat).toBe(46.5);
		expect(captured.insert?.lng).toBe(6.6);
		expect(fetchSpy).toHaveBeenCalled();
	});

	it('404 si parent introuvable', async () => {
		const { event } = makePost({ entreprise_id: ENT, resultat: 'absent' }, { parent: null });
		const res = await POST(event);
		expect(res.status).toBe(404);
	});

	it('note > 2000 caractères → 400', async () => {
		const { event } = makePost({ entreprise_id: ENT, resultat: 'absent', note: 'a'.repeat(2001) });
		const res = await POST(event);
		expect(res.status).toBe(400);
	});
});

describe('GET /api/visits (V3 : SELECT étendu resultat/note, sur-ensemble desktop)', () => {
	it('401 sans session', async () => {
		const { event } = makeGet(`?entreprise_id=${ENT}`, { session: false });
		const res = await GET(event);
		expect(res.status).toBe(401);
	});

	it('400 sans owner', async () => {
		const { event } = makeGet('');
		const res = await GET(event);
		expect(res.status).toBe(400);
	});

	it('SELECT inclut resultat + note ET conserve accuracy_m/distance/user_id (AC-019)', async () => {
		const { event, selects } = makeGet(`?entreprise_id=${ENT}`);
		await GET(event);
		const visitSelect = selects.find((s) => s.table === 'prospect_visits');
		expect(visitSelect?.cols).toContain('resultat');
		expect(visitSelect?.cols).toContain('note');
		expect(visitSelect?.cols).toContain('accuracy_m');
		expect(visitSelect?.cols).toContain('distance_from_zefix_m');
		expect(visitSelect?.cols).toContain('user_id');
	});

	it('retourne la liste des visites', async () => {
		const visits = [{ id: 'v1', resultat: 'absent', note: null, lat: null, lng: null }];
		const { event } = makeGet(`?entreprise_id=${ENT}`, { visits });
		const res = await GET(event);
		const body = await res.json();
		expect(body.visits).toHaveLength(1);
	});
});
