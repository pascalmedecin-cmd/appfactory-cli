import { describe, it, expect, vi } from 'vitest';

/**
 * REG-01 + REG-01bis + I-2 — action `/entreprises?/delete`.
 *
 * Couvre :
 *  - validation Zod (id invalide → fail(400)).
 *  - garde dépendances DÉTACHABLES (contacts/opportunités) CONSERVÉE et
 *    JAMAIS contournée par `force` : fail(409, { blocked, contacts, opportunites })
 *    et aucun DELETE (la modale UI listante consomme ce payload).
 *  - REG-01bis (fix « contact inexistant attaché ») : la garde ne compte QUE les
 *    dépendances visibles dans la fiche, donc détachables — contacts NON archivés
 *    (`statut_archive=false`) et opportunités ACTIVES (hors `gagne`/`perdu`). Un
 *    contact archivé ou une opportunité clôturée, invisibles, ne bloquent PLUS la
 *    suppression (FK ON DELETE SET NULL les détache proprement).
 *  - I-2 : données TERRAIN (photos/visites/suggestions, FK ON DELETE CASCADE) →
 *    pas de blocage mais confirmation obligatoire qui chiffre la perte :
 *    fail(409, { needsConfirm, cascade }) tant que `force` n'est pas posé.
 *  - confirmation systématique (cascade à zéro renvoie quand même needsConfirm).
 *  - happy path : force=true + aucune dépendance détachable → delete → success.
 *  - erreur Supabase (FK résiduelle 23503) → message explicite via dbFail.
 */

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

type Row = Record<string, unknown>;

/**
 * Builder thenable FILTRE-CONSCIENT : `.eq(col, val)` et `.not(col, 'in', '(a,b)')`
 * accumulent des prédicats réellement appliqués au dataset à l'await. Indispensable
 * pour prouver que la garde filtre `statut_archive=false` et exclut `gagne/perdu`
 * (un mock qui ignore les filtres ne pourrait pas distinguer un contact archivé).
 *
 * mode 'list' → { data: rows filtrées, error } ; 'count' → { count, error } ;
 * 'mutation' → { error }.
 */
function makeBuilder(
	mode: 'list' | 'count' | 'mutation',
	payload: Row[] | number | null,
	errorObj: { message: string; code?: string } | null | undefined
) {
	const preds: Array<(r: Row) => boolean> = [];
	const b: Record<string, unknown> = {};
	for (const m of ['select', 'order', 'limit', 'delete']) b[m] = () => b;
	b.eq = (col: string, val: unknown) => {
		preds.push((r) => r[col] === val);
		return b;
	};
	b.not = (col: string, op: string, val: string) => {
		if (op === 'in') {
			const set = val.replace(/[()]/g, '').split(',').map((s) => s.trim());
			preds.push((r) => !set.includes(String(r[col])));
		}
		return b;
	};
	b.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
		let result: unknown;
		if (errorObj) {
			result = mode === 'count' ? { count: null, error: errorObj } : { data: null, error: errorObj };
		} else if (mode === 'count') {
			result = { count: payload as number, error: null };
		} else if (mode === 'mutation') {
			result = { error: null };
		} else {
			const rows = (payload as Row[]) ?? [];
			result = { data: rows.filter((row) => preds.every((p) => p(row))), error: null };
		}
		return Promise.resolve(result).then(resolve, reject);
	};
	return b;
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
		if (table === 'contacts') return makeBuilder('list', opts.contacts ?? [], opts.contactsError);
		if (table === 'opportunites') return makeBuilder('list', opts.opportunites ?? [], null);
		if (table === 'prospect_photos') return makeBuilder('count', opts.photos ?? 0, null);
		if (table === 'prospect_visits') return makeBuilder('count', opts.visites ?? 0, null);
		if (table === 'contact_suggestions') return makeBuilder('count', opts.suggestions ?? 0, null);
		// entreprises (delete)
		return makeBuilder('mutation', null, opts.deleteError);
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
/** Un contact ACTIF (non archivé) rattaché à l'entreprise = dépendance détachable visible. */
const activeContact = (over: Row = {}): Row => ({ id: 'c1', nom: 'Dupont', prenom: 'Marie', entreprise_id: VALID_UUID, statut_archive: false, ...over });
/** Une opportunité ACTIVE (hors gagne/perdu) rattachée à l'entreprise = dépendance détachable visible. */
const activeOpp = (over: Row = {}): Row => ({ id: 'o1', titre: 'Toiture régie', entreprise_id: VALID_UUID, etape_pipeline: 'qualification', ...over });

describe('entreprises delete action', () => {
	it('refuse 400 si id invalide (validation Zod)', async () => {
		const supabase = createMockSupabase();
		const r = (await callDelete(supabase, { id: 'pas-un-uuid' })) as { status: number };
		expect(r.status).toBe(400);
	});

	it('bloque 409 avec la liste des dépendances détachables et ne supprime pas', async () => {
		const supabase = createMockSupabase({
			contacts: [activeContact()],
			opportunites: [activeOpp()],
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

	it('bloque même si seules des opportunités actives sont rattachées', async () => {
		const supabase = createMockSupabase({ opportunites: [activeOpp({ titre: 'X' })] });
		const r = (await callDelete(supabase, { id: VALID_UUID })) as { status: number; data: { blocked: boolean } };
		expect(r.status).toBe(409);
		expect(r.data.blocked).toBe(true);
	});

	it('la garde détachables n est PAS contournée par force=true', async () => {
		const supabase = createMockSupabase({ contacts: [activeContact({ nom: 'X' })] });
		const r = (await callDelete(supabase, { id: VALID_UUID, force: 'true' })) as {
			status: number;
			data: { blocked: boolean };
		};
		expect(r.status).toBe(409);
		expect(r.data.blocked).toBe(true);
		expect(supabase._calls()).not.toContain('entreprises');
	});

	// --- REG-01bis : les ARCHIVÉS/CLÔTURÉS invisibles ne bloquent plus ---

	it('REG-01bis : un contact ARCHIVÉ (invisible) ne bloque plus la suppression', async () => {
		// Cas réel entreprise « Film » : 1 seul contact rattaché, statut_archive=true.
		const supabase = createMockSupabase({ contacts: [activeContact({ nom: 'Fantome', statut_archive: true })] });
		const r = (await callDelete(supabase, { id: VALID_UUID })) as {
			status: number;
			data: { blocked?: boolean; needsConfirm?: boolean };
		};
		expect(r.status).toBe(409);
		expect(r.data.blocked).toBeUndefined();
		expect(r.data.needsConfirm).toBe(true); // passe la garde → demande confirmation cascade
		expect(supabase._calls()).not.toContain('entreprises');
	});

	it('REG-01bis : un contact archivé seul → supprimable une fois confirmé (force=true)', async () => {
		const supabase = createMockSupabase({ contacts: [activeContact({ statut_archive: true })] });
		const r = await callDelete(supabase, { id: VALID_UUID, force: 'true' });
		expect(r).toEqual({ success: true });
		expect(supabase._calls()).toContain('entreprises');
	});

	it('REG-01bis : une opportunité CLÔTURÉE (gagne/perdu) ne bloque plus', async () => {
		const supabase = createMockSupabase({ opportunites: [activeOpp({ etape_pipeline: 'gagne' })] });
		const r = (await callDelete(supabase, { id: VALID_UUID })) as {
			status: number;
			data: { blocked?: boolean; needsConfirm?: boolean };
		};
		expect(r.status).toBe(409);
		expect(r.data.blocked).toBeUndefined();
		expect(r.data.needsConfirm).toBe(true);
	});

	it('REG-01bis : un contact actif bloque, l archivé du même lot est ignoré', async () => {
		const supabase = createMockSupabase({
			contacts: [activeContact({ nom: 'Actif', statut_archive: false }), activeContact({ id: 'c2', nom: 'Archive', statut_archive: true })],
		});
		const r = (await callDelete(supabase, { id: VALID_UUID })) as {
			status: number;
			data: { blocked: boolean; contacts: Row[] };
		};
		expect(r.status).toBe(409);
		expect(r.data.blocked).toBe(true);
		expect(r.data.contacts).toHaveLength(1);
		expect(r.data.contacts[0]).toMatchObject({ nom: 'Actif' });
	});

	// --- I-2 : confirmation cascade terrain ---

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
