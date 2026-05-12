import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: { GOOGLE_PLACES_API_KEY: 'test-key' } }));
vi.mock('$lib/server/intelligence/signal-lookup', () => ({ fetchIntelligenceSignalLookup: vi.fn(async () => null) }));
vi.mock('$lib/server/intelligence/link-import-signal', () => ({ linkImportSignals: vi.fn(async () => undefined) }));

import { POST } from './+server';

type Behavior = {
	quotaUsed?: number;
	existing?: Array<{ source_id: string }>;
	dismissed?: Array<{ source_id: string; statut: string }>;
	entreprisesLookup?: Array<{ id: string; raison_sociale: string }>;
	insertError?: string | null;
	capturedInsert?: { current: unknown };
	incrementCalls?: { count: number };
};

function createMockSupabase(b: Behavior) {
	return {
		rpc(name: string, _args: unknown) {
			if (name === 'api_quota_increment') {
				if (b.incrementCalls) b.incrementCalls.count++;
				return Promise.resolve({ data: (b.quotaUsed ?? 0) + 1, error: null });
			}
			// entreprises_lookup_by_name
			return Promise.resolve({ data: b.entreprisesLookup ?? [], error: null });
		},
		from(table: string) {
			const state: { mode: 'select' | 'insert' | null; field: string | null } = { mode: null, field: null };
			const builder: Record<string, unknown> = {};
			const proxy: unknown = new Proxy(builder, {
				get(_t, prop: string) {
					if (prop === 'select') return (cols: string) => { state.mode = 'select'; state.field = cols.includes('statut') ? 'statut' : cols.includes('calls') ? 'calls' : 'source_id'; return proxy; };
					if (prop === 'insert') return (rows: unknown) => { state.mode = 'insert'; if (b.capturedInsert) b.capturedInsert.current = rows; return proxy; };
					if (prop === 'upsert') return () => proxy;
					if (prop === 'eq' || prop === 'in') return () => proxy;
					if (prop === 'maybeSingle') return () => Promise.resolve({ data: table === 'api_quota_log' ? { calls: b.quotaUsed ?? 0 } : null, error: null });
					if (prop === 'then') return (resolve: (v: unknown) => void) => {
						if (state.mode === 'insert') { resolve({ data: null, error: b.insertError ? { message: b.insertError } : null }); return; }
						if (state.field === 'statut') { resolve({ data: b.dismissed ?? [], error: null }); return; }
						resolve({ data: b.existing ?? [], error: null });
					};
					return undefined;
				},
			});
			return proxy;
		},
	};
}

function makeEvent(body: unknown, opts: { session?: boolean; behavior?: Behavior } = {}): { event: never; captured: { current: unknown } } {
	const captured = { current: null as unknown };
	const supabase = createMockSupabase({ ...(opts.behavior ?? {}), capturedInsert: captured });
	const event = {
		request: { json: async () => body },
		locals: {
			supabase,
			safeGetSession: async () => ({ session: opts.session === false ? null : { user: { email: 'a@filmpro.ch' } }, user: { email: 'a@filmpro.ch' } }),
		},
	} as never;
	return { event, captured };
}

const PLACE = (id: string, name: string, canton = 'GE', phone?: string) => ({
	id, displayName: { text: name }, businessStatus: 'OPERATIONAL', types: ['real_estate_agency'],
	...(phone ? { nationalPhoneNumber: phone } : {}),
	addressComponents: [{ shortText: canton, types: ['administrative_area_level_1'] }, { longText: 'Genève', types: ['locality'] }],
});

function mockFetch(places: unknown[], status = 200) {
	global.fetch = vi.fn(async () => ({
		ok: status >= 200 && status < 300, status,
		headers: { get: () => null },
		text: async () => JSON.stringify({ places }),
	})) as never;
}

describe('POST /api/prospection/google-places', () => {
	beforeEach(() => { vi.restoreAllMocks(); });

	it('401 si pas de session', async () => {
		const res = await POST(makeEvent({ activityType: 'electrician', canton: 'GE' }, { session: false }).event);
		expect(res.status).toBe(401);
	});

	it('400 si payload invalide', async () => {
		const res = await POST(makeEvent({ activityType: 'nope', canton: 'GE' }).event);
		expect(res.status).toBe(400);
	});

	it('429 si quota mensuel applicatif épuisé', async () => {
		const res = await POST(makeEvent({ activityType: 'electrician', canton: 'GE' }, { behavior: { quotaUsed: 900 } }).event);
		expect(res.status).toBe(429);
	});

	it('happy path : importe les leads, incrémente le quota, dédup intra-source', async () => {
		mockFetch([PLACE('p1', 'Régie Alpha SA', 'GE', '022 111 11 11'), PLACE('p2', 'Régie Beta', 'GE'), PLACE('p3', 'Régie Gamma', 'GE')]);
		const incrementCalls = { count: 0 };
		const ev = makeEvent({ activityType: 'real_estate_agency', canton: 'GE' }, {
			behavior: { quotaUsed: 10, existing: [{ source_id: 'pid:p3' }], incrementCalls },
		});
		const res = await POST(ev.event);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.imported).toBe(2); // p3 dédupliqué
		expect(data.skipped).toBe(1);
		expect(incrementCalls.count).toBe(1);
		const inserted = ev.captured.current as Array<Record<string, unknown>>;
		expect(inserted).toHaveLength(2);
		expect(inserted[0].source).toBe('google_places');
		expect(inserted[0].source_id).toBe('pid:p1');
		expect(inserted[0].telephone).toBe('022 111 11 11');
	});

	it('marque « déjà connue (Zefix) » via la RPC entreprises_lookup_by_name', async () => {
		mockFetch([PLACE('p1', 'Vitrerie Lausanne SA', 'VD')]);
		const ev = makeEvent({ activityType: 'real_estate_agency', canton: 'VD' }, {
			behavior: { entreprisesLookup: [{ id: 'e1', raison_sociale: 'Vitrerie Lausanne SA' }] },
		});
		const res = await POST(ev.event);
		const data = await res.json();
		expect(data.already_known).toBe(1);
		const inserted = ev.captured.current as Array<Record<string, unknown>>;
		expect(String(inserted[0].description)).toContain('déjà connue (Zefix)');
	});

	it('canton hors cibles → lead conservé avec canton null + mention', async () => {
		mockFetch([PLACE('p1', 'Zurich Bau', 'ZH')]);
		const ev = makeEvent({ activityType: 'general_contractor', canton: 'GE' });
		const res = await POST(ev.event);
		const data = await res.json();
		expect(data.imported).toBe(1);
		expect(data.canton_missing).toBe(1);
		const inserted = ev.captured.current as Array<Record<string, unknown>>;
		expect(inserted[0].canton).toBeNull();
		expect(String(inserted[0].description)).toContain('canton non déterminé');
	});

	it('502 si Google répond en erreur', async () => {
		global.fetch = vi.fn(async () => ({ ok: false, status: 500, headers: { get: () => null }, text: async () => 'oops' })) as never;
		const res = await POST(makeEvent({ activityType: 'electrician', canton: 'GE' }).event);
		expect(res.status).toBe(502);
	});

	it('503 si Google renvoie 403 (clé invalide)', async () => {
		global.fetch = vi.fn(async () => ({ ok: false, status: 403, headers: { get: () => null }, text: async () => 'forbidden' })) as never;
		const res = await POST(makeEvent({ activityType: 'electrician', canton: 'GE' }).event);
		expect(res.status).toBe(503);
	});

	it('aucun résultat → message vide, pas d’insert', async () => {
		mockFetch([]);
		const ev = makeEvent({ activityType: 'electrician', canton: 'GE' });
		const res = await POST(ev.event);
		const data = await res.json();
		expect(data.imported).toBe(0);
		expect(data.total_results).toBe(0);
	});

	it('un lead déjà écarté/transféré n’est pas ré-importé', async () => {
		mockFetch([PLACE('p1', 'Régie X', 'GE')]);
		const ev = makeEvent({ activityType: 'real_estate_agency', canton: 'GE' }, { behavior: { dismissed: [{ source_id: 'pid:p1', statut: 'ecarte' }] } });
		const res = await POST(ev.event);
		const data = await res.json();
		expect(data.imported).toBe(0);
		expect(data.skipped).toBe(1);
	});

	it('erreur d’insert Supabase → 500', async () => {
		mockFetch([PLACE('p1', 'Régie X', 'GE')]);
		const ev = makeEvent({ activityType: 'real_estate_agency', canton: 'GE' }, { behavior: { insertError: 'boom' } });
		const res = await POST(ev.event);
		expect(res.status).toBe(500);
		const data = await res.json();
		expect(data.imported).toBe(0);
	});

	it('import depuis un signal Veille : source_intelligence_id posé sur les leads', async () => {
		mockFetch([PLACE('p1', 'Régie X', 'GE')]);
		const ev = makeEvent({ activityType: 'real_estate_agency', canton: 'GE', from_intelligence: '11111111-2222-3333-4444-555555555555', from_term: 'régie' });
		await POST(ev.event);
		const inserted = ev.captured.current as Array<Record<string, unknown>>;
		expect(inserted[0].source_intelligence_id).toBe('11111111-2222-3333-4444-555555555555');
		expect(inserted[0].source_intelligence_term).toBe('régie');
	});
});
