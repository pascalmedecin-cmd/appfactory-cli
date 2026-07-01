import { describe, it, expect, vi } from 'vitest';

/**
 * Tests de la form action `/signaux?/updateStatut` (modèle simplifié 2026-07-01).
 * Le tri d'un signal (À suivre / Archivé, ou restauration) passe par un simple
 * update de statut_traitement, borné par le CHECK DB à ('nouveau','a_suivre','archive')
 * et par SignalUpdateStatutSchema (Zod). Les anciennes actions archive/unarchive
 * (Vague 3) et createOpportunite sont supprimées.
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

async function callUpdateStatut(supabase: ReturnType<typeof createMock>, fields: Record<string, string>) {
	const mod = await import('./+page.server');
	const action = mod.actions.updateStatut!;
	const request = { formData: async () => makeFormData(fields) } as unknown as Request;
	return action({ request, locals: { supabase } } as unknown as Parameters<typeof action>[0]);
}

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

describe('signaux form action - updateStatut', () => {
	it('existe ; les anciennes actions archive/unarchive/createOpportunite/update sont supprimées', async () => {
		const mod = await import('./+page.server');
		expect(mod.actions.updateStatut).toBeDefined();
		expect(mod.actions.archive).toBeUndefined();
		expect(mod.actions.unarchive).toBeUndefined();
		expect(mod.actions.createOpportunite).toBeUndefined();
		expect(mod.actions.update).toBeUndefined();
	});

	it('refuse 400 si id invalide', async () => {
		const supabase = createMock();
		const result = (await callUpdateStatut(supabase, { id: 'pas-un-uuid', statut_traitement: 'a_suivre' })) as { status: number };
		expect(result.status).toBe(400);
		expect(supabase._calls()).toHaveLength(0);
	});

	it('refuse 400 si statut hors modèle (interesse / converti / ecarte retirés)', async () => {
		for (const statut of ['interesse', 'converti', 'ecarte', 'en_analyse', 'supprime']) {
			const supabase = createMock();
			const result = (await callUpdateStatut(supabase, { id: VALID_UUID, statut_traitement: statut })) as { status: number };
			expect(result.status).toBe(400);
			expect(supabase._calls()).toHaveLength(0);
		}
	});

	it('happy path À suivre : update statut=a_suivre, eq id', async () => {
		const supabase = createMock();
		const result = (await callUpdateStatut(supabase, { id: VALID_UUID, statut_traitement: 'a_suivre' })) as { success: boolean };
		expect(result.success).toBe(true);
		const calls = supabase._calls();
		const upd = calls.find((c) => c.op === 'update');
		expect((upd!.payload as { statut_traitement: string }).statut_traitement).toBe('a_suivre');
		expect(calls.some((c) => c.op === 'eq' && c.col === 'id' && c.val === VALID_UUID)).toBe(true);
	});

	it('happy path Archivé : update statut=archive, eq id', async () => {
		const supabase = createMock();
		const result = (await callUpdateStatut(supabase, { id: VALID_UUID, statut_traitement: 'archive' })) as { success: boolean };
		expect(result.success).toBe(true);
		const calls = supabase._calls();
		const upd = calls.find((c) => c.op === 'update');
		expect((upd!.payload as { statut_traitement: string }).statut_traitement).toBe('archive');
	});

	it('propage une erreur DB', async () => {
		const supabase = createMock({ updateError: { message: 'boom' } });
		const result = (await callUpdateStatut(supabase, { id: VALID_UUID, statut_traitement: 'archive' })) as { error?: string; success?: boolean };
		expect(result.success).toBeUndefined();
	});
});
