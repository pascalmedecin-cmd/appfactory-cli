import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: { ZEFIX_USERNAME: 'u', ZEFIX_PASSWORD: 'p' } }));
vi.mock('$lib/server/intelligence/signal-lookup', () => ({ fetchIntelligenceSignalLookup: vi.fn(async () => null) }));
vi.mock('$lib/server/intelligence/link-import-signal', () => ({ linkImportSignals: vi.fn(async () => undefined) }));
// Flag pin ON (déterminisme) ; le gate OFF (403) a son test dédié.
vi.mock('$lib/prospection-flags', () => ({ isProspectionSourceEnabled: vi.fn(() => true) }));

import { POST } from './+server';
import { isProspectionSourceEnabled } from '$lib/prospection-flags';
import { CandidateImportSchema } from '$lib/schemas';

type Behavior = {
	existing?: Array<{ source_id: string }>;
	dismissed?: Array<{ source_id: string; statut: string }>;
	insertError?: string | null;
	capturedInsert?: { current: unknown };
};

function createMockSupabase(b: Behavior) {
	return {
		from(_table: string) {
			const state: { mode: 'select' | 'insert' | null; field: string | null } = { mode: null, field: null };
			const builder: Record<string, unknown> = {};
			const proxy: unknown = new Proxy(builder, {
				get(_t, prop: string) {
					if (prop === 'select') return (cols: string) => { state.mode = 'select'; state.field = cols.includes('statut') ? 'statut' : 'source_id'; return proxy; };
					if (prop === 'insert') return (rows: unknown) => { state.mode = 'insert'; if (b.capturedInsert) b.capturedInsert.current = rows; return proxy; };
					if (prop === 'eq' || prop === 'in') return () => proxy;
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

const COMPANY = (uid: string, name: string, ehraid = 1) => ({ uid, name, ehraid, legalSeat: 'Genève', sogcDate: '2026-06-01' });

function mockZefix(companies: unknown[], status = 200) {
	const bytes = new TextEncoder().encode(JSON.stringify(companies));
	global.fetch = vi.fn(async () => ({
		ok: status >= 200 && status < 300,
		status,
		arrayBuffer: async () => bytes.buffer,
		text: async () => JSON.stringify(companies),
	})) as never;
}

describe('POST /api/prospection/zefix', () => {
	beforeEach(() => { vi.restoreAllMocks(); vi.mocked(isProspectionSourceEnabled).mockReturnValue(true); });

	it('401 si pas de session', async () => {
		const res = await POST(makeEvent({ canton: 'GE', name: 'vitrerie' }, { session: false }).event);
		expect(res.status).toBe(401);
	});

	it('403 si source désactivée par flag', async () => {
		vi.mocked(isProspectionSourceEnabled).mockReturnValueOnce(false);
		const res = await POST(makeEvent({ canton: 'GE', name: 'vitrerie' }).event);
		expect(res.status).toBe(403);
	});

	it('400 si canton manquant/inconnu', async () => {
		const res = await POST(makeEvent({ name: 'vitrerie' }).event);
		expect(res.status).toBe(400);
	});

	it('import direct : 2 entreprises créées, statut serveur', async () => {
		mockZefix([COMPANY('CHE-1', 'Vitrerie Alpha SA', 11), COMPANY('CHE-2', 'Façades Beta', 22)]);
		const ev = makeEvent({ canton: 'GE', name: 'vitrerie' });
		const res = await POST(ev.event);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.imported).toBe(2);
		const inserted = ev.captured.current as Array<Record<string, unknown>>;
		expect(inserted).toHaveLength(2);
		expect(inserted[0].source).toBe('zefix');
		expect(inserted[0].source_id).toBe('CHE-1');
		expect(inserted[0].statut).toBe('vide');
		expect(inserted[0].canton).toBe('GE');
	});

	it('dédup direct : 1 déjà présent → 1 importé, 1 skipped', async () => {
		mockZefix([COMPANY('CHE-1', 'Alpha'), COMPANY('CHE-2', 'Beta')]);
		const ev = makeEvent({ canton: 'GE', name: 'a' }, { behavior: { existing: [{ source_id: 'CHE-2' }] } });
		const res = await POST(ev.event);
		const data = await res.json();
		expect(data.imported).toBe(1);
		expect(data.skipped).toBe(1);
	});

	// P3 : mode aperçu (preview:true) — parse + dédup, AUCUN insert.
	it('aperçu (preview:true) : candidats cochables, 0 insert', async () => {
		mockZefix([COMPANY('CHE-1', 'Alpha SA'), COMPANY('CHE-2', 'Beta Sàrl')]);
		const ev = makeEvent({ canton: 'GE', name: 'a', preview: true });
		const res = await POST(ev.event);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(Array.isArray(data.candidates)).toBe(true);
		expect(data.candidates).toHaveLength(2);
		expect(data.total_results).toBe(2);
		expect(data.imported).toBeUndefined();
		expect(ev.captured.current).toBeNull(); // AUCUN insert pendant l'aperçu
		expect(data.candidates[0].status_hint).toBe('new');
		expect(data.candidates[0].importable).toBe(true);
		expect(data.candidates[0].tempId).toBe('CHE-1');
		// Round-trip : chaque candidat Zefix satisfait CandidateImportSchema.
		for (const c of data.candidates) expect(CandidateImportSchema.safeParse(c).success).toBe(true);
	});

	it('aperçu : lead déjà écarté → status dismissed, non importable', async () => {
		mockZefix([COMPANY('CHE-9', 'Gamma')]);
		const ev = makeEvent({ canton: 'GE', name: 'g', preview: true }, { behavior: { dismissed: [{ source_id: 'CHE-9', statut: 'transfere' }] } });
		const res = await POST(ev.event);
		const data = await res.json();
		expect(data.candidates[0].status_hint).toBe('dismissed');
		expect(data.candidates[0].importable).toBe(false);
		expect(ev.captured.current).toBeNull();
	});

	it('aucun résultat Zefix → aperçu candidats vides', async () => {
		mockZefix([]);
		const ev = makeEvent({ canton: 'GE', name: 'zzz', preview: true });
		const res = await POST(ev.event);
		const data = await res.json();
		expect(data.candidates).toEqual([]);
		expect(data.total_results).toBe(0);
	});
});
