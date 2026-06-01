import { describe, it, expect, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

type FilterState = {
	archivedNullOnly?: boolean;
	readsFilteredByActiveIds?: boolean;
};

/**
 * Mock layout supabase.
 *
 * Le code testé fait :
 *   1. SELECT id FROM intelligence_reports WHERE status='published' AND archived_at IS NULL
 *   2. (si N>0) SELECT count(report_id) FROM intelligence_reads WHERE user_id=$id
 *      AND report_id IN (...)
 *
 * On simule via deux builders distincts par table.
 */
function createMockSupabase(opts: {
	activeIds: string[]; // editions actives (status=published, archived_at IS NULL)
	readCount: number; // nombre de reads que l'user a sur les ids actifs
}) {
	const filterState: FilterState = {};

	const intelReportsBuilder = {
		select() { return intelReportsBuilder; },
		eq() { return intelReportsBuilder; },
		is(col: string, val: null) {
			if (col === 'archived_at' && val === null) filterState.archivedNullOnly = true;
			// Retourne data = liste d'ids actifs.
			return Promise.resolve({
				data: opts.activeIds.map((id) => ({ id })),
				error: null,
			});
		},
	};

	const intelReadsBuilder = {
		select() { return intelReadsBuilder; },
		eq() { return intelReadsBuilder; },
		in(col: string, _values: string[]) {
			if (col === 'report_id') filterState.readsFilteredByActiveIds = true;
			return Promise.resolve({ count: opts.readCount, error: null });
		},
	};

	return {
		from(table: string) {
			if (table === 'intelligence_reports') return intelReportsBuilder;
			if (table === 'intelligence_reads') return intelReadsBuilder;
			throw new Error(`unexpected from(${table})`);
		},
		_filterState: filterState,
	};
}

async function callLoad(
	supabase: ReturnType<typeof createMockSupabase>
): Promise<{ unreadIntelligence: number }> {
	const mod = await import('./+layout.server');
	const event = {
		locals: { supabase },
		parent: async () => ({ user: { id: 'u-1' } }),
	} as unknown as Parameters<typeof mod.load>[0];
	const r = await mod.load(event);
	return r as { unreadIntelligence: number };
}

describe('+layout.server unread (V2b H-08 + bug-hunter F4)', () => {
	it('compte unread sur ids actifs uniquement (drift permanent évité)', async () => {
		// Scenario : 5 éditions actives, user a 1 read sur ces 5 → unread = 4.
		const supabase = createMockSupabase({
			activeIds: ['e1', 'e2', 'e3', 'e4', 'e5'],
			readCount: 1,
		});
		const r = await callLoad(supabase);
		expect(r.unreadIntelligence).toBe(4);
		expect(supabase._filterState.archivedNullOnly).toBe(true);
		expect(supabase._filterState.readsFilteredByActiveIds).toBe(true);
	});

	it('reads d\'éditions archivées exclus du count (F4 fix permanent)', async () => {
		// 3 éditions actives. User a lu 2 anciennes (archivées entre-temps) + 1 active.
		// Avant F4 : readCount=3 (toutes les rows reads), unread = max(0, 3-3) = 0 (FAUX
		// car 2 cards visibles non lues).
		// Après F4 : readCount=1 (filtré sur active ids), unread = 3-1 = 2 ✓.
		const supabase = createMockSupabase({
			activeIds: ['e1', 'e2', 'e3'],
			readCount: 1,
		});
		const r = await callLoad(supabase);
		expect(r.unreadIntelligence).toBe(2);
	});

	it('retourne 0 si user absent (parent sans session)', async () => {
		const supabase = createMockSupabase({
			activeIds: ['e1', 'e2'],
			readCount: 0,
		});
		const mod = await import('./+layout.server');
		const event = {
			locals: { supabase },
			parent: async () => ({ user: null }),
		} as unknown as Parameters<typeof mod.load>[0];
		const r = (await mod.load(event)) as { unreadIntelligence: number };
		expect(r.unreadIntelligence).toBe(0);
	});

	it('retourne 0 si aucune édition active (skip 2e query)', async () => {
		const supabase = createMockSupabase({ activeIds: [], readCount: 99 });
		const r = await callLoad(supabase);
		expect(r.unreadIntelligence).toBe(0);
	});

	it('absorbe transitoire readCount > totalActive (Math.max 0)', async () => {
		const supabase = createMockSupabase({
			activeIds: ['e1', 'e2', 'e3'],
			readCount: 5, // shouldn't happen post-F4, mais defense-in-depth
		});
		const r = await callLoad(supabase);
		expect(r.unreadIntelligence).toBe(0);
	});
});
