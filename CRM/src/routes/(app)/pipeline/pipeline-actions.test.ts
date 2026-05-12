import { describe, it, expect, vi } from 'vitest';

/**
 * Tests des form actions `/pipeline?/{create,move,archive}` (audit 360 M-49).
 * Cible : validation Zod (étape pipeline / id), return shape, propagation erreur DB.
 */

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

function createMockSupabase(opts: { writeError?: { message: string } } = {}) {
	const calls: { table: string; op: string }[] = [];
	const builder: Record<string, unknown> = {};
	const chain = () => builder;
	const terminal = (op: string, table: string) => () => {
		calls.push({ table, op });
		return Promise.resolve({ error: opts.writeError ?? null });
	};
	function from(table: string) {
		builder.select = chain;
		builder.order = chain;
		builder.eq = chain;
		builder.insert = terminal('insert', table);
		builder.update = () => {
			builder.eq = terminal('update', table);
			return builder;
		};
		return builder;
	}
	return { from, _calls: () => calls };
}

function makeFormData(values: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(values)) fd.set(k, v);
	return fd;
}

async function callAction(
	name: 'create' | 'move' | 'archive',
	supabase: ReturnType<typeof createMockSupabase>,
	fields: Record<string, string>
) {
	const mod = await import('./+page.server');
	const action = mod.actions[name]!;
	const request = { formData: async () => makeFormData(fields) } as unknown as Request;
	return action({ request, locals: { supabase } } as unknown as Parameters<typeof action>[0]);
}

const VALID_UUID = '22222222-2222-4222-8222-222222222222';

describe('pipeline form actions', () => {
	it('create : refuse 400 si titre vide', async () => {
		const supabase = createMockSupabase();
		const result = (await callAction('create', supabase, { titre: '' })) as { status: number; data: { error: string } };
		expect(result.status).toBe(400);
		expect(result.data.error).toBeTruthy();
		expect(supabase._calls()).toHaveLength(0);
	});

	it('create : { success: true } + insert opportunites sur happy path', async () => {
		const supabase = createMockSupabase();
		const result = await callAction('create', supabase, { titre: 'Tour Genève', etape_pipeline: 'identification' });
		expect(result).toEqual({ success: true });
		expect(supabase._calls()).toEqual([{ table: 'opportunites', op: 'insert' }]);
	});

	it('move : refuse 400 si etape_pipeline hors enum', async () => {
		const supabase = createMockSupabase();
		const result = (await callAction('move', supabase, { id: VALID_UUID, etape_pipeline: 'pas-une-etape' })) as {
			status: number;
			data: { error: string };
		};
		expect(result.status).toBe(400);
		expect(supabase._calls()).toHaveLength(0);
	});

	it('move : refuse 400 si id absent', async () => {
		const supabase = createMockSupabase();
		const result = (await callAction('move', supabase, { etape_pipeline: 'identification' })) as { status: number };
		expect(result.status).toBe(400);
		expect(supabase._calls()).toHaveLength(0);
	});

	it('move : update opportunites + { success: true } sur happy path', async () => {
		const supabase = createMockSupabase();
		const result = await callAction('move', supabase, { id: VALID_UUID, etape_pipeline: 'identification' });
		expect(result).toEqual({ success: true });
		expect(supabase._calls()).toEqual([{ table: 'opportunites', op: 'update' }]);
	});

	it('archive : update -> etape perdu + { success: true }', async () => {
		const supabase = createMockSupabase();
		const result = await callAction('archive', supabase, { id: VALID_UUID, motif_perte: 'Budget' });
		expect(result).toEqual({ success: true });
		expect(supabase._calls()).toEqual([{ table: 'opportunites', op: 'update' }]);
	});

	it('archive : erreur Supabase -> fail(400, { success: false })', async () => {
		const supabase = createMockSupabase({ writeError: { message: 'db down' } });
		const result = (await callAction('archive', supabase, { id: VALID_UUID, motif_perte: 'Budget' })) as {
			status: number;
			data: { success: boolean; error: string };
		};
		expect(result.status).toBe(400);
		expect(result.data.success).toBe(false);
	});
});
