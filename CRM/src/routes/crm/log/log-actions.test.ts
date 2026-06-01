import { describe, it, expect, vi } from 'vitest';

/**
 * Tests des form actions `/log?/{create,updateStatus,updateAdminNotes}` + load.
 * Cible : auth gate (401 sans session), admin gate (403 non-admin), Zod gate (400), happy path.
 * Pattern aligné sur src/routes/crm/pipeline/pipeline-actions.test.ts (audit 360 M-49).
 */

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

function createMockSupabase(opts: { writeError?: { message: string }; rows?: unknown[] } = {}) {
	const calls: { table: string; op: string }[] = [];
	const builder: Record<string, unknown> = {};
	const chain = () => builder;
	const terminal = (op: string, table: string) => () => {
		calls.push({ table, op });
		return Promise.resolve({ error: opts.writeError ?? null });
	};
	const selectTerminal = (table: string) => () => {
		calls.push({ table, op: 'select' });
		return Promise.resolve({ data: opts.rows ?? [], error: null });
	};
	function from(table: string) {
		builder.select = () => {
			builder.order = selectTerminal(table);
			return builder;
		};
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
	name: 'create' | 'updateStatus' | 'updateAdminNotes',
	supabase: ReturnType<typeof createMockSupabase>,
	safeGetSession: ReturnType<typeof makeSession>,
	fields: Record<string, string>
) {
	const mod = await import('./+page.server');
	const action = mod.actions[name]!;
	const request = { formData: async () => makeFormData(fields) } as unknown as Request;
	return action({
		request,
		locals: { supabase, safeGetSession },
	} as unknown as Parameters<typeof action>[0]);
}

async function callLoad(
	supabase: ReturnType<typeof createMockSupabase>,
	safeGetSession: ReturnType<typeof makeSession>
) {
	const mod = await import('./+page.server');
	// PageServerLoad TS type est `MaybeWithVoid<...>` côté SvelteKit. Le retour réel
	// est toujours `{entries, isAdmin, userEmail}` (jamais void) — on cast pour exposer
	// la forme effective consommée par les assertions des tests.
	const result = await mod.load({
		locals: { supabase, safeGetSession },
	} as unknown as Parameters<typeof mod.load>[0]);
	return result as { entries: unknown[]; isAdmin: boolean; userEmail: string };
}

const VALID_UUID = '11111111-1111-4111-8111-111111111111';
const ADMIN_EMAIL = 'pascal@filmpro.ch';
const ANTOINE_EMAIL = 'antoine@filmpro.ch';

describe('log form actions - create', () => {
	it('refuse 401 sans session', async () => {
		const supabase = createMockSupabase();
		const result = (await callAction('create', supabase, makeSession(null), {
			type: 'bug',
			severity: 'mineur',
			page: '/contacts',
			description: 'Description suffisamment longue pour passer le schema',
		})) as { status: number; data: { error: string } };
		expect(result.status).toBe(401);
		expect(supabase._calls()).toHaveLength(0);
	});

	it('refuse 400 si Zod fail (bug sans severity)', async () => {
		const supabase = createMockSupabase();
		const result = (await callAction('create', supabase, makeSession(ANTOINE_EMAIL), {
			type: 'bug',
			page: '/contacts',
			description: 'Description suffisamment longue pour passer le schema',
		})) as { status: number; data: { error: string } };
		expect(result.status).toBe(400);
		expect(supabase._calls()).toHaveLength(0);
	});

	it('refuse 400 si description < 10 chars', async () => {
		const supabase = createMockSupabase();
		const result = (await callAction('create', supabase, makeSession(ANTOINE_EMAIL), {
			type: 'suggestion',
			page: '/pipeline',
			description: 'trop',
		})) as { status: number };
		expect(result.status).toBe(400);
		expect(supabase._calls()).toHaveLength(0);
	});

	it('happy path : { success: true } + insert feedback_entries', async () => {
		const supabase = createMockSupabase();
		const result = await callAction('create', supabase, makeSession(ANTOINE_EMAIL), {
			type: 'bug',
			severity: 'genant',
			page: '/contacts',
			description: 'La carte de pipeline revient à sa place après drag.',
		});
		expect(result).toEqual({ success: true });
		expect(supabase._calls()).toEqual([{ table: 'feedback_entries', op: 'insert' }]);
	});
});

describe('log form actions - updateStatus', () => {
	it('refuse 403 si non-admin', async () => {
		const supabase = createMockSupabase();
		const result = (await callAction('updateStatus', supabase, makeSession(ANTOINE_EMAIL), {
			id: VALID_UUID,
			status: 'a_actionner',
		})) as { status: number };
		expect(result.status).toBe(403);
		expect(supabase._calls()).toHaveLength(0);
	});

	it('refuse 403 sans session', async () => {
		const supabase = createMockSupabase();
		const result = (await callAction('updateStatus', supabase, makeSession(null), {
			id: VALID_UUID,
			status: 'a_actionner',
		})) as { status: number };
		expect(result.status).toBe(403);
		expect(supabase._calls()).toHaveLength(0);
	});

	it('refuse 400 admin + status hors enum', async () => {
		const supabase = createMockSupabase();
		const result = (await callAction('updateStatus', supabase, makeSession(ADMIN_EMAIL), {
			id: VALID_UUID,
			status: 'pas-un-statut',
		})) as { status: number };
		expect(result.status).toBe(400);
		expect(supabase._calls()).toHaveLength(0);
	});

	it('happy path admin : update feedback_entries', async () => {
		const supabase = createMockSupabase();
		const result = await callAction('updateStatus', supabase, makeSession(ADMIN_EMAIL), {
			id: VALID_UUID,
			status: 'traite',
		});
		expect(result).toEqual({ success: true });
		expect(supabase._calls()).toEqual([{ table: 'feedback_entries', op: 'update' }]);
	});
});

describe('log form actions - updateAdminNotes', () => {
	it('refuse 403 si non-admin', async () => {
		const supabase = createMockSupabase();
		const result = (await callAction('updateAdminNotes', supabase, makeSession(ANTOINE_EMAIL), {
			id: VALID_UUID,
			admin_notes: 'lié à audit',
		})) as { status: number };
		expect(result.status).toBe(403);
		expect(supabase._calls()).toHaveLength(0);
	});

	it('happy path admin : update feedback_entries (note vide acceptée)', async () => {
		const supabase = createMockSupabase();
		const result = await callAction('updateAdminNotes', supabase, makeSession(ADMIN_EMAIL), {
			id: VALID_UUID,
			admin_notes: '',
		});
		expect(result).toEqual({ success: true });
		expect(supabase._calls()).toEqual([{ table: 'feedback_entries', op: 'update' }]);
	});
});

describe('log load', () => {
	it('renvoie entries vide + isAdmin=false sans session', async () => {
		const supabase = createMockSupabase({ rows: [] });
		const result = await callLoad(supabase, makeSession(null));
		expect(result.entries).toEqual([]);
		expect(result.isAdmin).toBe(false);
		expect(result.userEmail).toBe('');
	});

	it('renvoie isAdmin=true pour pascal@filmpro.ch', async () => {
		const supabase = createMockSupabase({ rows: [] });
		const result = await callLoad(supabase, makeSession(ADMIN_EMAIL));
		expect(result.isAdmin).toBe(true);
		expect(result.userEmail).toBe(ADMIN_EMAIL);
	});

	it('renvoie isAdmin=false pour antoine@filmpro.ch', async () => {
		const supabase = createMockSupabase({ rows: [] });
		const result = await callLoad(supabase, makeSession(ANTOINE_EMAIL));
		expect(result.isAdmin).toBe(false);
		expect(result.userEmail).toBe(ANTOINE_EMAIL);
	});
});
