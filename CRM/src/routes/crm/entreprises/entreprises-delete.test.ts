import { describe, it, expect, vi } from 'vitest';

/**
 * REG-01 + I-2 — action `/entreprises?/delete`.
 *
 * Couvre :
 *  - validation Zod (id invalide → fail(400)).
 *  - garde dépendances DÉTACHABLES (contacts/opportunités) CONSERVÉE et
 *    JAMAIS contournée par `force` : fail(409, { blocked, contacts, opportunites })
 *    et aucun DELETE (la modale UI listante consomme ce payload).
 *  - I-2 : données TERRAIN (photos/visites/suggestions, FK ON DELETE CASCADE) →
 *    pas de blocage mais confirmation obligatoire qui chiffre la perte :
 *    fail(409, { needsConfirm, cascade }) tant que `force` n'est pas posé.
 *  - confirmation systématique (cascade à zéro renvoie quand même needsConfirm).
 *  - happy path : force=true + aucune dépendance détachable → delete → success.
 *  - erreur Supabase (FK résiduelle 23503) → message explicite via dbFail.
 */

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

type Row = Record<string, unknown>;

/** Builder thenable : toute méthode chaîne, l'await résout `result`. */
function chainable(result: unknown) {
	const p: Record<string, unknown> = {};
	for (const m of ['select', 'eq', 'order', 'delete', 'not', 'limit', 'in']) {
		p[m] = () => p;
	}
	p.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
		Promise.resolve(result).then(resolve, reject);
	return p;
}

function createMockSupabase(
	opts: {
		contacts?: Row[];
		opportunites?: Row[];
		photos?: number;
		visites?: number;
		suggestions?: number;
		contactsError?: { message: string; code?: string };
		deleteError?: { message: string; code?: string };
	} = {}
) {
	const calls: string[] = [];
	function from(table: string) {
		calls.push(table);
		if (table === 'contacts')
			return chainable(
				opts.contactsError ? { data: null, error: opts.contactsError } : { data: opts.contacts ?? [], error: null }
			);
		if (table === 'opportunites') return chainable({ data: opts.opportunites ?? [], error: null });
		if (table === 'prospect_photos') return chainable({ count: opts.photos ?? 0, error: null });
		if (table === 'prospect_visits') return chainable({ count: opts.visites ?? 0, error: null });
		if (table === 'contact_suggestions') return chainable({ count: opts.suggestions ?? 0, error: null });
		// entreprises (delete)
		return chainable({ error: opts.deleteError ?? null });
	}
	return { from, _calls: () => calls };
}

function makeFormData(values: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(values)) fd.set(k, v);
	return fd;
}

async function callDelete(supabase: ReturnType<typeof createMockSupabase>, fields: Record<string, string>) {
	const mod = await import('./+page.server');
	const action = mod.actions.delete!;
	const request = { formData: async () => makeFormData(fields) } as unknown as Request;
	return action({ request, locals: { supabase } } as unknown as Parameters<typeof action>[0]);
}

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

describe('entreprises delete action', () => {
	it('refuse 400 si id invalide (validation Zod)', async () => {
		const supabase = createMockSupabase();
		const r = (await callDelete(supabase, { id: 'pas-un-uuid' })) as { status: number };
		expect(r.status).toBe(400);
	});

	it('bloque 409 avec la liste des dépendances détachables et ne supprime pas', async () => {
		const supabase = createMockSupabase({
			contacts: [{ id: 'c1', nom: 'Dupont', prenom: 'Marie' }],
			opportunites: [{ id: 'o1', titre: 'Toiture régie' }],
		});
		const r = (await callDelete(supabase, { id: VALID_UUID })) as {
			status: number;
			data: { blocked: boolean; contacts: Row[]; opportunites: Row[]; error: string };
		};
		expect(r.status).toBe(409);
		expect(r.data.blocked).toBe(true);
		expect(r.data.contacts).toHaveLength(1);
		expect(r.data.opportunites).toHaveLength(1);
		expect(r.data.contacts[0]).toMatchObject({ nom: 'Dupont' });
		// pas de DELETE sur entreprises tant que des dépendances détachables existent
		expect(supabase._calls()).not.toContain('entreprises');
	});

	it('bloque même si seules des opportunités sont rattachées', async () => {
		const supabase = createMockSupabase({ opportunites: [{ id: 'o1', titre: 'X' }] });
		const r = (await callDelete(supabase, { id: VALID_UUID })) as { status: number; data: { blocked: boolean } };
		expect(r.status).toBe(409);
		expect(r.data.blocked).toBe(true);
	});

	it('la garde détachables n est PAS contournée par force=true', async () => {
		const supabase = createMockSupabase({ contacts: [{ id: 'c1', nom: 'X' }] });
		const r = (await callDelete(supabase, { id: VALID_UUID, force: 'true' })) as {
			status: number;
			data: { blocked: boolean };
		};
		expect(r.status).toBe(409);
		expect(r.data.blocked).toBe(true);
		expect(supabase._calls()).not.toContain('entreprises');
	});

	it('exige confirmation (409 needsConfirm) avec le décompte terrain, sans supprimer', async () => {
		const supabase = createMockSupabase({ photos: 3, visites: 2, suggestions: 1 });
		const r = (await callDelete(supabase, { id: VALID_UUID })) as {
			status: number;
			data: { needsConfirm: boolean; cascade: { photos: number; visites: number; suggestions: number } };
		};
		expect(r.status).toBe(409);
		expect(r.data.needsConfirm).toBe(true);
		expect(r.data.cascade).toEqual({ photos: 3, visites: 2, suggestions: 1 });
		expect(supabase._calls()).not.toContain('entreprises');
	});

	it('exige confirmation même sans donnée terrain (cascade à zéro)', async () => {
		const supabase = createMockSupabase();
		const r = (await callDelete(supabase, { id: VALID_UUID })) as {
			status: number;
			data: { needsConfirm: boolean; cascade: { photos: number; visites: number; suggestions: number } };
		};
		expect(r.status).toBe(409);
		expect(r.data.needsConfirm).toBe(true);
		expect(r.data.cascade).toEqual({ photos: 0, visites: 0, suggestions: 0 });
		expect(supabase._calls()).not.toContain('entreprises');
	});

	it('supprime quand confirmé (force=true) et aucune dépendance détachable', async () => {
		const supabase = createMockSupabase({ photos: 3 });
		const r = await callDelete(supabase, { id: VALID_UUID, force: 'true' });
		expect(r).toEqual({ success: true });
		expect(supabase._calls()).toContain('entreprises');
	});

	it('fail-secure : remonte une erreur DB si la lecture des dépendances échoue (pas de DELETE)', async () => {
		const supabase = createMockSupabase({ contactsError: { message: 'db indisponible' } });
		const r = (await callDelete(supabase, { id: VALID_UUID, force: 'true' })) as { status: number };
		expect(r.status).toBe(400);
		expect(supabase._calls()).not.toContain('entreprises');
	});

	it('propage un message explicite sur FK résiduelle 23503', async () => {
		const supabase = createMockSupabase({
			deleteError: { message: 'fk', code: '23503' },
		});
		const r = (await callDelete(supabase, { id: VALID_UUID, force: 'true' })) as {
			status: number;
			data: { error: string };
		};
		expect(r.status).toBe(400);
		expect(r.data.error.toLowerCase()).toContain('référencé');
	});
});
