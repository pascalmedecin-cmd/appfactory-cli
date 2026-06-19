import { describe, it, expect, beforeEach, vi } from 'vitest';

// Signal Veille + flag mockés (logique pure testée à part). Flag ON par défaut ; le gate OFF a son test.
vi.mock('$lib/server/intelligence/signal-lookup', () => ({ fetchIntelligenceSignalLookup: vi.fn(async () => null) }));
vi.mock('$lib/server/intelligence/link-import-signal', () => ({ linkImportSignals: vi.fn(async () => undefined) }));
vi.mock('$lib/prospection-flags', () => ({ isProspectionSourceEnabled: vi.fn(() => true) }));

import { POST } from './+server';
import { isProspectionSourceEnabled } from '$lib/prospection-flags';

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

const CAND = (source_id: string, raison_sociale: string, extra: Record<string, unknown> = {}) => ({
	source_id, raison_sociale, canton: 'GE', telephone: '022 111 11 11', ...extra,
});

describe('POST /api/prospection/import-selected', () => {
	beforeEach(() => { vi.restoreAllMocks(); vi.mocked(isProspectionSourceEnabled).mockReturnValue(true); });

	it('401 si pas de session', async () => {
		const res = await POST(makeEvent({ source: 'zefix', candidates: [CAND('u1', 'Alpha')] }, { session: false }).event);
		expect(res.status).toBe(401);
	});

	it('400 si payload malformé (source inconnue)', async () => {
		const res = await POST(makeEvent({ source: 'simap', candidates: [CAND('u1', 'Alpha')] }).event);
		expect(res.status).toBe(400);
	});

	it('candidat malformé (raison_sociale vide) ignoré ligne par ligne, pas de 400 global', async () => {
		const ev = makeEvent({ source: 'zefix', candidates: [{ source_id: 'u1', raison_sociale: '' }] });
		const res = await POST(ev.event);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.imported).toBe(0);
		expect(data.rejected).toBe(1);
		expect(ev.captured.current).toBeNull();
	});

	it('400 si aucun candidat', async () => {
		const res = await POST(makeEvent({ source: 'zefix', candidates: [] }).event);
		expect(res.status).toBe(400);
	});

	it('403 si source désactivée par flag (defense-in-depth)', async () => {
		vi.mocked(isProspectionSourceEnabled).mockReturnValueOnce(false);
		const res = await POST(makeEvent({ source: 'google_places', candidates: [CAND('p1', 'Alpha')] }).event);
		expect(res.status).toBe(403);
	});

	it('import sélectif : 2 cochés sur 5 → exactement 2 insérés (pas 5)', async () => {
		const ev = makeEvent({
			source: 'search_ch',
			candidates: [CAND('s1', 'Régie Un'), CAND('s2', 'Régie Deux')],
		});
		const res = await POST(ev.event);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.imported).toBe(2);
		expect(data.skipped).toBe(0);
		const inserted = ev.captured.current as Array<Record<string, unknown>>;
		expect(inserted).toHaveLength(2);
		expect(inserted.map((r) => r.source_id).sort()).toEqual(['s1', 's2']);
		expect(inserted[0].statut).toBe('nouveau');
		expect(inserted[0].source).toBe('search_ch');
	});

	it('RE-dédup serveur : un candidat déjà présent (TOCTOU) n’est pas réinséré', async () => {
		const ev = makeEvent(
			{ source: 'zefix', candidates: [CAND('CHE-1', 'Alpha'), CAND('CHE-2', 'Beta')] },
			{ behavior: { existing: [{ source_id: 'CHE-2' }] } },
		);
		const res = await POST(ev.event);
		const data = await res.json();
		expect(data.imported).toBe(1);
		expect(data.skipped).toBe(1);
		const inserted = ev.captured.current as Array<Record<string, unknown>>;
		expect(inserted).toHaveLength(1);
		expect(inserted[0].source_id).toBe('CHE-1');
	});

	it('RE-dédup serveur : un candidat écarté/transféré n’est pas réinséré', async () => {
		const ev = makeEvent(
			{ source: 'zefix', candidates: [CAND('CHE-9', 'Gamma')] },
			{ behavior: { dismissed: [{ source_id: 'CHE-9', statut: 'ecarte' }] } },
		);
		const res = await POST(ev.event);
		const data = await res.json();
		expect(data.imported).toBe(0);
		expect(data.skipped).toBe(1);
	});

	it('dédup intra-payload : un même source_id en double n’est inséré qu’une fois', async () => {
		const ev = makeEvent({ source: 'zefix', candidates: [CAND('CHE-X', 'Delta'), CAND('CHE-X', 'Delta bis')] });
		const res = await POST(ev.event);
		const data = await res.json();
		expect(data.imported).toBe(1);
		const inserted = ev.captured.current as Array<Record<string, unknown>>;
		expect(inserted).toHaveLength(1);
	});

	it('RE-score serveur : un score client falsifié est ignoré (jamais inséré tel quel)', async () => {
		const ev = makeEvent({
			source: 'search_ch',
			// Le client injecte un score absurde + un statut « new » : tous deux doivent être ignorés.
			candidates: [{ ...CAND('s1', 'Régie Score'), score_pertinence: 9999, status_hint: 'new', importable: true }],
		});
		const res = await POST(ev.event);
		expect(res.status).toBe(200);
		const inserted = ev.captured.current as Array<Record<string, unknown>>;
		expect(inserted).toHaveLength(1);
		expect(inserted[0].score_pertinence).not.toBe(9999);
		expect(typeof inserted[0].score_pertinence).toBe('number');
	});

	it('anti all-or-nothing : 1 candidat NPA invalide n’efface pas les valides du lot', async () => {
		// Le cœur du fix bug-hunter : un seul NPA hors bornes (ex. zip frontalier 5 chiffres) ne doit
		// PAS faire perdre les 2 autres entreprises valides cochées. Les valides s’importent, le mauvais
		// est ignoré (compté en `rejected`).
		const ev = makeEvent({
			source: 'search_ch',
			candidates: [CAND('s1', 'Régie Un'), CAND('s2', 'Régie Deux', { npa: '01200' }), CAND('s3', 'Régie Trois')],
		});
		const res = await POST(ev.event);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.imported).toBe(2); // s1 + s3
		expect(data.rejected).toBe(1); // s2 (npa 5 chiffres)
		const inserted = ev.captured.current as Array<Record<string, unknown>>;
		expect(inserted.map((r) => r.source_id).sort()).toEqual(['s1', 's3']);
	});

	it('payload entièrement mal formé → 200 imported 0, rejected N (pas un 400 global)', async () => {
		const ev = makeEvent({ source: 'search_ch', candidates: [CAND('s1', 'A', { npa: 'xx' }), CAND('s2', 'B', { telephone: 'x'.repeat(60) })] });
		const res = await POST(ev.event);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.imported).toBe(0);
		expect(data.rejected).toBe(2);
		expect(ev.captured.current).toBeNull();
	});

	it('erreur d’insert Supabase → 500', async () => {
		const ev = makeEvent({ source: 'zefix', candidates: [CAND('CHE-1', 'Alpha')] }, { behavior: { insertError: 'boom' } });
		const res = await POST(ev.event);
		expect(res.status).toBe(500);
		const data = await res.json();
		expect(data.imported).toBe(0);
	});
});
