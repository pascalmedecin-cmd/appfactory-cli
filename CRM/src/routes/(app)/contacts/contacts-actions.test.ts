import { describe, it, expect, vi } from 'vitest';

/**
 * Tests des form actions `/contacts?/{create,update,delete}` (audit 360 M-49 — couverture
 * form actions ~5% → cibler sécu / contracts / return shape).
 *
 * Couvre, pour chaque action :
 *   - validation Zod : un champ requis manquant → `fail(400, { error })`.
 *   - return shape happy path : `{ success: true }`.
 *   - erreur Supabase → `fail(400, { success: false, error })` (helper `dbFail`).
 */

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

type DbResult = { error: { message: string; code?: string } | null };

function createMockSupabase(opts: { writeError?: { message: string; code?: string } } = {}) {
	const calls: { table: string; op: string }[] = [];
	const builder: Record<string, unknown> = {};
	const chain = () => builder;
	const terminal = (op: string, table: string) => () => {
		calls.push({ table, op });
		return Promise.resolve<DbResult>({ error: opts.writeError ?? null });
	};
	function from(table: string) {
		builder.select = chain;
		builder.eq = chain;
		builder.order = chain;
		builder.insert = terminal('insert', table);
		// `.update(...).eq(...)` : update renvoie le builder, eq termine.
		builder.update = () => {
			builder.eq = terminal('update', table);
			return builder;
		};
		return builder;
	}
	return {
		from,
		rpc: () => Promise.resolve({ data: [], error: null }),
		_calls: () => calls,
	};
}

function makeFormData(values: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(values)) fd.set(k, v);
	return fd;
}

async function callAction(
	name: 'create' | 'update' | 'delete',
	supabase: ReturnType<typeof createMockSupabase>,
	fields: Record<string, string>
) {
	const mod = await import('./+page.server');
	const action = mod.actions[name]!;
	const request = { formData: async () => makeFormData(fields) } as unknown as Request;
	return action({ request, locals: { supabase } } as unknown as Parameters<typeof action>[0]);
}

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

describe('contacts form actions', () => {
	describe('create', () => {
		it('refuse 400 si le nom est vide (validation Zod)', async () => {
			const supabase = createMockSupabase();
			const result = (await callAction('create', supabase, { nom: '', entreprise_nom: '' })) as {
				status: number;
				data: { error: string };
			};
			expect(result.status).toBe(400);
			expect(result.data.error).toBeTruthy();
			expect(supabase._calls()).toHaveLength(0);
		});

		it('return shape { success: true } + insert appelé sur happy path', async () => {
			const supabase = createMockSupabase();
			const result = await callAction('create', supabase, { nom: 'Dupont', prenom: 'Marie', entreprise_nom: '' });
			expect(result).toEqual({ success: true });
			expect(supabase._calls()).toEqual([{ table: 'contacts', op: 'insert' }]);
		});

		it('propage une erreur Supabase en fail(400, { success: false })', async () => {
			const supabase = createMockSupabase({ writeError: { message: 'boom' } });
			const result = (await callAction('create', supabase, { nom: 'Dupont', entreprise_nom: '' })) as {
				status: number;
				data: { success: boolean; error: string };
			};
			expect(result.status).toBe(400);
			expect(result.data.success).toBe(false);
			expect(result.data.error).toBeTruthy();
		});
	});

	describe('update', () => {
		it('refuse 400 si id absent (requiredUUID)', async () => {
			const supabase = createMockSupabase();
			const result = (await callAction('update', supabase, { nom: 'Dupont', entreprise_nom: '' })) as {
				status: number;
				data: { error: string };
			};
			expect(result.status).toBe(400);
			expect(result.data.error).toBeTruthy();
			expect(supabase._calls()).toHaveLength(0);
		});

		it('return shape { success: true } + update appelé sur happy path', async () => {
			const supabase = createMockSupabase();
			const result = await callAction('update', supabase, { id: VALID_UUID, nom: 'Dupont', entreprise_nom: '' });
			expect(result).toEqual({ success: true });
			expect(supabase._calls()).toEqual([{ table: 'contacts', op: 'update' }]);
		});
	});

	describe('delete', () => {
		it('refuse 400 si id invalide', async () => {
			const supabase = createMockSupabase();
			const result = (await callAction('delete', supabase, { id: 'pas-un-uuid' })) as {
				status: number;
				data: { error: string };
			};
			expect(result.status).toBe(400);
			expect(supabase._calls()).toHaveLength(0);
		});

		it('archive (soft-delete) via update statut_archive sur happy path', async () => {
			const supabase = createMockSupabase();
			const result = await callAction('delete', supabase, { id: VALID_UUID });
			expect(result).toEqual({ success: true });
			expect(supabase._calls()).toEqual([{ table: 'contacts', op: 'update' }]);
		});
	});
});
