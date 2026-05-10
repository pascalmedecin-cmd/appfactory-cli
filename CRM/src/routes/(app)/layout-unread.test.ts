import { describe, it, expect, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

type CountFilter = { archivedNullOnly?: boolean };

function createMockSupabase(opts: {
	totalPublishedNotArchived: number;
	totalPublishedAll: number;
	readCount: number;
}) {
	const filterState: CountFilter = {};
	const intelReportsBuilder = {
		select() { return intelReportsBuilder; },
		eq() { return intelReportsBuilder; },
		is(col: string, val: null) {
			if (col === 'archived_at' && val === null) filterState.archivedNullOnly = true;
			return Promise.resolve({
				count: filterState.archivedNullOnly ? opts.totalPublishedNotArchived : opts.totalPublishedAll,
				error: null,
			});
		},
	};
	const intelReadsBuilder = {
		select() { return intelReadsBuilder; },
		eq() {
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

describe('+layout.server unread (V2b H-08)', () => {
	it('aligne le count sur archived_at IS NULL (badge != cards visibles avant fix)', async () => {
		// Scenario : 7 published total, 2 archivés, 1 read.
		// Cards visibles : 5 (7 - 2). Reads : 1. Unread cards visibles : 4.
		const supabase = createMockSupabase({
			totalPublishedNotArchived: 5,
			totalPublishedAll: 7,
			readCount: 1,
		});
		const r = await callLoad(supabase);
		expect(r.unreadIntelligence).toBe(4);
		expect(supabase._filterState.archivedNullOnly).toBe(true);
	});

	it('retourne 0 si user absent (parent sans session)', async () => {
		const supabase = createMockSupabase({
			totalPublishedNotArchived: 5,
			totalPublishedAll: 7,
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

	it('absorbe transitoire readCount > totalPublished (Math.max 0)', async () => {
		const supabase = createMockSupabase({
			totalPublishedNotArchived: 3,
			totalPublishedAll: 5,
			readCount: 5, // user a lu une édition récemment archivée
		});
		const r = await callLoad(supabase);
		expect(r.unreadIntelligence).toBe(0);
	});
});
