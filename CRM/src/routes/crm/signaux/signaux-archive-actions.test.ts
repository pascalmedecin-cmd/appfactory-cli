import { describe, it, expect, vi } from 'vitest';

/**
 * Tests des form actions Vague 3 `/signaux?/{archive,unarchive}`.
 * Archive = statut_traitement -> 'archive' (sauf converti) ; unarchive -> 'nouveau'
 * (seulement si réellement archivé). Zod gate (400) + happy path + chaîne de filtres.
 */

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

type Call = { table: string; op: string; col?: string; val?: unknown; payload?: unknown };

function createMock(opts: { updateError?: { message: string } | null } = {}) {
	const calls: Call[] = [];
	function from(table: string) {
		return {
			update(payload: unknown) {
				calls.push({ table, op: 'update', payload });
				const chain: Record<string, unknown> = {
					eq(col: string, val: unknown) { calls.push({ table, op: 'eq', col, val }); return chain; },
					neq(col: string, val: unknown) { calls.push({ table, op: 'neq', col, val }); return chain; },
					then(resolve: (v: { error: unknown }) => unknown) {
						return Promise.resolve({ error: opts.updateError ?? null }).then(resolve);
					},
				};
				return chain;
			},
		};
	}
	return { from, _calls: () => calls };
}

function makeFormData(values: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(values)) fd.set(k, v);
	return fd;
}

async function callAction(name: 'archive' | 'unarchive', supabase: ReturnType<typeof createMock>, fields: Record<string, string>) {
	const mod = await import('./+page.server');
	const action = mod.actions[name]!;
	const request = { formData: async () => makeFormData(fields) } as unknown as Request;
	return action({ request, locals: { supabase } } as unknown as Parameters<typeof action>[0]);
}

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

describe('signaux form actions - archive', () => {
	it('existe', async () => {
		const mod = await import('./+page.server');
		expect(mod.actions.archive).toBeDefined();
		expect(mod.actions.unarchive).toBeDefined();
	});

	it('refuse 400 si id invalide', async () => {
		const supabase = createMock();
		const result = (await callAction('archive', supabase, { id: 'pas-un-uuid' })) as { status: number };
		expect(result.status).toBe(400);
		expect(supabase._calls()).toHaveLength(0);
	});

	it('happy path : update statut=archive, eq id, neq converti', async () => {
		const supabase = createMock();
		const result = (await callAction('archive', supabase, { id: VALID_UUID })) as { success: boolean };
		expect(result.success).toBe(true);
		const calls = supabase._calls();
		const upd = calls.find((c) => c.op === 'update');
		expect((upd!.payload as { statut_traitement: string }).statut_traitement).toBe('archive');
		expect(calls.some((c) => c.op === 'eq' && c.col === 'id' && c.val === VALID_UUID)).toBe(true);
		// Garde : ne pas archiver un converti.
		expect(calls.some((c) => c.op === 'neq' && c.col === 'statut_traitement' && c.val === 'converti')).toBe(true);
	});

	it('propage une erreur DB', async () => {
		const supabase = createMock({ updateError: { message: 'boom' } });
		const result = (await callAction('archive', supabase, { id: VALID_UUID })) as { error?: string; success?: boolean };
		expect(result.success).toBeUndefined();
	});
});

describe('signaux form actions - unarchive', () => {
	it('refuse 400 si id invalide', async () => {
		const supabase = createMock();
		const result = (await callAction('unarchive', supabase, { id: 'x' })) as { status: number };
		expect(result.status).toBe(400);
	});

	it('happy path : update statut=nouveau, eq id, eq statut=archive (garde)', async () => {
		const supabase = createMock();
		const result = (await callAction('unarchive', supabase, { id: VALID_UUID })) as { success: boolean };
		expect(result.success).toBe(true);
		const calls = supabase._calls();
		const upd = calls.find((c) => c.op === 'update');
		expect((upd!.payload as { statut_traitement: string }).statut_traitement).toBe('nouveau');
		expect(calls.some((c) => c.op === 'eq' && c.col === 'id' && c.val === VALID_UUID)).toBe(true);
		// Garde : ne restaure que des signaux réellement archivés.
		expect(calls.some((c) => c.op === 'eq' && c.col === 'statut_traitement' && c.val === 'archive')).toBe(true);
	});
});
