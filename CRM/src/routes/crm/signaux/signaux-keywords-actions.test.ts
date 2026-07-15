import { describe, it, expect, vi } from 'vitest';

/**
 * Tests des form actions `/signaux?/{addKeyword,removeKeyword}`.
 * Cible : admin gate (403 non-@filmpro.ch), Zod gate (400), doublon (409), happy path,
 * rescoring rétroactif déclenché. Pattern aligné sur log-actions.test.ts.
 */

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

interface MockSupabaseOpts {
	insertError?: { message: string; code?: string } | null;
	deleteError?: { message: string } | null;
	signauxRows?: Array<{
		id: string;
		canton: string | null;
		description_projet: string | null;
		maitre_ouvrage: string | null;
		source_officielle: string | null;
		date_publication: string | null;
		statut_traitement: string | null;
	}>;
	keywordRows?: Array<{ id: string; terme: string; terme_norm: string; categorie: string; poids: number }>;
}

function createMockSupabase(opts: MockSupabaseOpts = {}) {
	const calls: Array<{ table: string; op: string; payload?: unknown }> = [];
	function from(table: string) {
		const builder: Record<string, unknown> = {};
		// SELECT chain (signaux et keywords)
		builder.select = () => {
			builder.in = () => {
				calls.push({ table, op: 'select.in' });
				return Promise.resolve({ data: opts.signauxRows ?? [], error: null });
			};
			builder.order = () => Promise.resolve({ data: opts.keywordRows ?? [], error: null });
			// .select(...) terminal direct pour keywords reload (sans .order)
			return Object.assign(
				Promise.resolve({ data: opts.keywordRows ?? [], error: null }),
				builder,
			);
		};
		// INSERT
		builder.insert = (payload: unknown) => {
			calls.push({ table, op: 'insert', payload });
			return Promise.resolve({ error: opts.insertError ?? null });
		};
		// UPDATE
		builder.update = (payload: unknown) => {
			calls.push({ table, op: 'update', payload });
			builder.eq = () => Promise.resolve({ error: null });
			return builder;
		};
		// DELETE
		builder.delete = () => {
			builder.eq = () => {
				calls.push({ table, op: 'delete' });
				return Promise.resolve({ error: opts.deleteError ?? null });
			};
			return builder;
		};
		return builder;
	}
	return { from, _calls: () => calls };
}

function makeSession(email: string | null) {
	return async () => ({
		session: email ? ({ user: { id: 'u1', email } } as unknown as object) : null,
		user: email ? ({ id: 'u1', email } as { id: string; email: string }) : null,
	});
}

function makeFormData(values: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(values)) fd.set(k, v);
	return fd;
}

async function callAction(
	name: 'addKeyword' | 'removeKeyword',
	supabase: ReturnType<typeof createMockSupabase>,
	safeGetSession: ReturnType<typeof makeSession>,
	fields: Record<string, string>,
) {
	const mod = await import('./+page.server');
	const action = mod.actions[name]!;
	const request = { formData: async () => makeFormData(fields) } as unknown as Request;
	return action({
		request,
		locals: { supabase, safeGetSession },
	} as unknown as Parameters<typeof action>[0]);
}

const ADMIN_EMAIL = 'pascal@filmpro.ch';
const SUPERUSER_EMAIL = 'antoine@filmpro.ch'; // Atelier 209 : superuser = éditeur des mots-clés
const NON_ADMIN_EMAIL = 'evil@external.com';
const VALID_UUID = '11111111-1111-4111-8111-111111111111';

describe('signaux form actions - addKeyword', () => {
	it('refuse 403 sans session', async () => {
		const supabase = createMockSupabase();
		const result = (await callAction('addKeyword', supabase, makeSession(null), {
			terme: 'vitrage',
			categorie: 'coeur',
		})) as { status: number; data: { error: string } };
		expect(result.status).toBe(403);
		expect(supabase._calls()).toHaveLength(0);
	});

	it('refuse 403 sur email non-éditeur', async () => {
		const supabase = createMockSupabase();
		const result = (await callAction('addKeyword', supabase, makeSession(NON_ADMIN_EMAIL), {
			terme: 'vitrage',
			categorie: 'coeur',
		})) as { status: number; data: { error: string } };
		expect(result.status).toBe(403);
		expect(supabase._calls()).toHaveLength(0);
	});

	it('autorise un superuser (Antoine) à ajouter un mot-clé', async () => {
		const supabase = createMockSupabase({ signauxRows: [] });
		const result = (await callAction('addKeyword', supabase, makeSession(SUPERUSER_EMAIL), {
			terme: 'vitrage',
			categorie: 'coeur',
		})) as { success?: boolean; status?: number };
		expect(result.status).toBeUndefined();
		expect(result.success).toBe(true);
		expect(supabase._calls().some((c) => c.table === 'signaux_mots_cles' && c.op === 'insert')).toBe(true);
	});

	it('refuse 400 si terme trop court (< 2 chars)', async () => {
		const supabase = createMockSupabase();
		const result = (await callAction('addKeyword', supabase, makeSession(ADMIN_EMAIL), {
			terme: 'a',
			categorie: 'coeur',
		})) as { status: number; data: { error: string } };
		expect(result.status).toBe(400);
		expect(result.data.error).toMatch(/court/i);
	});

	it('refuse 400 si categorie invalide', async () => {
		const supabase = createMockSupabase();
		const result = (await callAction('addKeyword', supabase, makeSession(ADMIN_EMAIL), {
			terme: 'vitrage',
			categorie: 'autre',
		})) as { status: number; data: { error: string } };
		expect(result.status).toBe(400);
	});

	it('happy path admin : insert + rescoring déclenché', async () => {
		const supabase = createMockSupabase({
			keywordRows: [{ id: 'kw1', terme: 'vitrage', terme_norm: 'vitrage', categorie: 'coeur', poids: 5 }],
			signauxRows: [
				{ id: 's1', canton: 'GE', description_projet: 'vitrage', maitre_ouvrage: null, source_officielle: 'simap', date_publication: null, statut_traitement: 'nouveau' },
			],
		});
		const result = (await callAction('addKeyword', supabase, makeSession(ADMIN_EMAIL), {
			terme: 'vitrage',
			categorie: 'coeur',
		})) as { success: boolean };
		expect(result.success).toBe(true);
		const calls = supabase._calls();
		expect(calls.some((c) => c.table === 'signaux_mots_cles' && c.op === 'insert')).toBe(true);
		// Rescoring : select signaux + update sur la row.
		expect(calls.some((c) => c.table === 'signaux_affaires' && c.op === 'select.in')).toBe(true);
		expect(calls.some((c) => c.table === 'signaux_affaires' && c.op === 'update')).toBe(true);
	});

	it('renvoie 409 si doublon (code postgres 23505)', async () => {
		const supabase = createMockSupabase({ insertError: { message: 'duplicate', code: '23505' } });
		const result = (await callAction('addKeyword', supabase, makeSession(ADMIN_EMAIL), {
			terme: 'vitrage',
			categorie: 'coeur',
		})) as { status: number; data: { error: string } };
		expect(result.status).toBe(409);
		expect(result.data.error).toMatch(/déjà/);
	});

	it('terme avec accents : normalisé en terme_norm sans accent', async () => {
		const supabase = createMockSupabase();
		await callAction('addKeyword', supabase, makeSession(ADMIN_EMAIL), {
			terme: 'régie',
			categorie: 'bonus',
		});
		const insertCall = supabase._calls().find((c) => c.op === 'insert');
		expect(insertCall).toBeDefined();
		const payload = insertCall!.payload as { terme: string; terme_norm: string };
		expect(payload.terme).toBe('régie');
		expect(payload.terme_norm).toBe('regie');
	});

	it('poids correct par catégorie : Cœur=+5 / Bonus=+2 / Éviter=-3', async () => {
		const supabase = createMockSupabase();
		await callAction('addKeyword', supabase, makeSession(ADMIN_EMAIL), { terme: 'vitrage', categorie: 'coeur' });
		await callAction('addKeyword', supabase, makeSession(ADMIN_EMAIL), { terme: 'régie', categorie: 'bonus' });
		await callAction('addKeyword', supabase, makeSession(ADMIN_EMAIL), { terme: 'route', categorie: 'eviter' });
		const inserts = supabase._calls().filter((c) => c.op === 'insert');
		expect((inserts[0].payload as { poids: number }).poids).toBe(5);
		expect((inserts[1].payload as { poids: number }).poids).toBe(2);
		expect((inserts[2].payload as { poids: number }).poids).toBe(-3);
	});
});

describe('signaux form actions - removeKeyword', () => {
	it('refuse 403 sans session', async () => {
		const supabase = createMockSupabase();
		const result = (await callAction('removeKeyword', supabase, makeSession(null), {
			id: VALID_UUID,
		})) as { status: number };
		expect(result.status).toBe(403);
		expect(supabase._calls()).toHaveLength(0);
	});

	it('refuse 403 sur email non-éditeur', async () => {
		const supabase = createMockSupabase();
		const result = (await callAction('removeKeyword', supabase, makeSession(NON_ADMIN_EMAIL), {
			id: VALID_UUID,
		})) as { status: number };
		expect(result.status).toBe(403);
	});

	it('autorise un superuser (Antoine) à supprimer un mot-clé', async () => {
		const supabase = createMockSupabase({ signauxRows: [] });
		const result = (await callAction('removeKeyword', supabase, makeSession(SUPERUSER_EMAIL), {
			id: VALID_UUID,
		})) as { success?: boolean; status?: number };
		expect(result.status).toBeUndefined();
		expect(result.success).toBe(true);
	});

	it('refuse 400 si id invalide (pas UUID)', async () => {
		const supabase = createMockSupabase();
		const result = (await callAction('removeKeyword', supabase, makeSession(ADMIN_EMAIL), {
			id: 'pas-un-uuid',
		})) as { status: number; data: { error: string } };
		expect(result.status).toBe(400);
	});

	it('happy path admin : delete + rescoring déclenché', async () => {
		const supabase = createMockSupabase({ signauxRows: [] });
		const result = (await callAction('removeKeyword', supabase, makeSession(ADMIN_EMAIL), {
			id: VALID_UUID,
		})) as { success: boolean };
		expect(result.success).toBe(true);
		const calls = supabase._calls();
		expect(calls.some((c) => c.table === 'signaux_mots_cles' && c.op === 'delete')).toBe(true);
		expect(calls.some((c) => c.table === 'signaux_affaires' && c.op === 'select.in')).toBe(true);
	});
});

describe('signaux form actions - retrait ?/create', () => {
	it("la form action 'create' n'existe plus", async () => {
		const mod = await import('./+page.server');
		expect(mod.actions.create).toBeUndefined();
	});

	it("les form actions du modèle simplifié sont préservées ; les obsolètes retirées", async () => {
		const mod = await import('./+page.server');
		expect(mod.actions.updateStatut).toBeDefined();
		expect(mod.actions.delete).toBeDefined();
		expect(mod.actions.deleteBatch).toBeDefined();
		expect(mod.actions.addKeyword).toBeDefined();
		expect(mod.actions.removeKeyword).toBeDefined();
		// Retirées le 2026-07-01 (modèle simplifié + suppression conversion signal->opportunité).
		expect(mod.actions.update).toBeUndefined();
		expect(mod.actions.createOpportunite).toBeUndefined();
	});
});
