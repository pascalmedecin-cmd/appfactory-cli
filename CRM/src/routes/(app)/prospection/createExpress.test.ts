import { describe, it, expect, vi } from 'vitest';

/**
 * Tests pour l'action `createExpress` du form `/prospection?/createExpress`.
 *
 * Couvre la désambiguïsation post-S130 (faux match silencieux sur multi-sites
 * partageant la même raison sociale, cf. risque H4 bug-hunter S157).
 *
 * Trois cas critiques :
 *   1. tel long + match unique → silent redirect (duplicate=true).
 *   2. tel court (ou absent) + 1 seul candidat → silent redirect.
 *   3. tel court + 2+ candidats → fail(409, ambiguous=true, candidates=[...]).
 */

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

type Candidate = { id: string; raison_sociale: string; localite: string | null; telephone: string | null };

function createMockSupabase(candidates: Candidate[]) {
	let insertCalled = false;
	const builder = {
		select() { return builder; },
		ilike() { return builder; },
		limit() { return Promise.resolve({ data: candidates, error: null }); },
		insert() {
			insertCalled = true;
			return Promise.resolve({ error: null });
		},
	};
	return {
		from() { return builder; },
		_wasInsertCalled: () => insertCalled,
	};
}

function makeFormData(values: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(values)) fd.set(k, v);
	return fd;
}

async function callAction(supabase: ReturnType<typeof createMockSupabase>, fields: Record<string, string>) {
	const mod = await import('./+page.server');
	const action = mod.actions.createExpress;
	const request = {
		formData: async () => makeFormData(fields),
	} as unknown as Request;
	const result = await action({
		request,
		locals: { supabase },
	} as unknown as Parameters<typeof action>[0]);
	return result;
}

describe('createExpress dedup désambiguïsation', () => {
	it('tel long + match unique → silent redirect (duplicate=true)', async () => {
		const supabase = createMockSupabase([
			{ id: 'cand-1', raison_sociale: 'Vitrerie Dupond', localite: 'Vevey', telephone: '+41 79 123 45 67' },
		]);
		const result = await callAction(supabase, {
			raison_sociale: 'Vitrerie Dupond',
			telephone: '+41 79 123 45 67',
			nom_contact: '',
			notes: '',
		});
		expect(result).toEqual({ success: true, id: 'cand-1', duplicate: true });
		expect(supabase._wasInsertCalled()).toBe(false);
	});

	it('tel court (absent) + 1 seul candidat → silent redirect (duplicate=true)', async () => {
		const supabase = createMockSupabase([
			{ id: 'cand-1', raison_sociale: 'Vitrerie Dupond', localite: 'Vevey', telephone: null },
		]);
		const result = await callAction(supabase, {
			raison_sociale: 'Vitrerie Dupond',
			telephone: '',
			nom_contact: '',
			notes: '',
		});
		expect(result).toEqual({ success: true, id: 'cand-1', duplicate: true });
		expect(supabase._wasInsertCalled()).toBe(false);
	});

	it('tel court + 2+ candidats → fail(409) ambiguous avec candidats', async () => {
		const supabase = createMockSupabase([
			{ id: 'cand-1', raison_sociale: 'Vitrerie Dupond', localite: 'Vevey', telephone: null },
			{ id: 'cand-2', raison_sociale: 'Vitrerie Dupond', localite: 'Lausanne', telephone: null },
		]);
		const result = await callAction(supabase, {
			raison_sociale: 'Vitrerie Dupond',
			telephone: '',
			nom_contact: '',
			notes: '',
		}) as { status: number; data: { ambiguous: boolean; candidates: Array<{ id: string; raison_sociale: string; localite: string | null }> } };
		expect(result.status).toBe(409);
		expect(result.data.ambiguous).toBe(true);
		expect(result.data.candidates).toHaveLength(2);
		expect(result.data.candidates[0]).toEqual({ id: 'cand-1', raison_sociale: 'Vitrerie Dupond', localite: 'Vevey' });
		expect(result.data.candidates[1]).toEqual({ id: 'cand-2', raison_sociale: 'Vitrerie Dupond', localite: 'Lausanne' });
		expect(supabase._wasInsertCalled()).toBe(false);
	});

	it('force_create=1 bypasse la dedup même avec multi-candidats', async () => {
		const supabase = createMockSupabase([
			{ id: 'cand-1', raison_sociale: 'Vitrerie Dupond', localite: 'Vevey', telephone: null },
			{ id: 'cand-2', raison_sociale: 'Vitrerie Dupond', localite: 'Lausanne', telephone: null },
		]);
		const result = await callAction(supabase, {
			raison_sociale: 'Vitrerie Dupond',
			telephone: '',
			nom_contact: '',
			notes: '',
			force_create: '1',
		}) as { success: boolean; duplicate: boolean };
		expect(result.success).toBe(true);
		expect(result.duplicate).toBe(false);
		expect(supabase._wasInsertCalled()).toBe(true);
	});
});
