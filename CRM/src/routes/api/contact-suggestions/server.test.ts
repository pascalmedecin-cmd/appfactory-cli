import { describe, it, expect, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

import { GET, POST } from './+server';

const ENT = '25087e61-0d78-4e2c-b990-1c9e014dc413';

type MockOpts = {
	entreprise?: { id: string } | null; // undefined → défaut présent
	list?: Array<Record<string, unknown>>;
	count?: number;
	insertError?: { message: string; code?: string } | null;
};

function createMockSupabase(opts: MockOpts) {
	const inserts: Array<{ table: string; row: unknown }> = [];
	const supa = {
		_inserts: inserts,
		from(table: string) {
			const st = { headCount: false, lastRow: null as unknown };
			const proxy: unknown = new Proxy(
				{},
				{
					get(_t, prop: string) {
						if (prop === 'select') return (_cols: string, o?: { head?: boolean }) => { if (o?.head) st.headCount = true; return proxy; };
						if (prop === 'insert') return (row: unknown) => { st.lastRow = row; inserts.push({ table, row }); return proxy; };
						if (prop === 'eq') return () => proxy;
						if (prop === 'order') return () => proxy;
						if (prop === 'maybeSingle') return () => Promise.resolve({ data: table === 'entreprises' ? (opts.entreprise === undefined ? { id: ENT } : opts.entreprise) : null, error: null });
						if (prop === 'single') return () => Promise.resolve({ data: opts.insertError ? null : { id: 's1', statut: 'en_attente', created_at: '2026-05-31T10:00:00Z', resolved_at: null, ...(st.lastRow as object) }, error: opts.insertError ?? null });
						if (prop === 'then') return (resolve: (v: unknown) => void) => {
							if (st.headCount) { resolve({ count: opts.count ?? 0, error: null, data: null }); return; }
							resolve({ data: opts.list ?? [], error: null });
						};
						return undefined;
					},
				}
			);
			return proxy;
		},
	};
	return supa;
}

function makePost(body: unknown, opts: MockOpts & { session?: boolean } = {}) {
	const supabase = createMockSupabase(opts);
	const event = {
		request: { json: async () => body },
		url: new URL('http://localhost/api/contact-suggestions'),
		locals: {
			supabase,
			safeGetSession: async () => (opts.session === false ? { session: null, user: null } : { session: {}, user: { id: 'u1' } }),
		},
	} as never;
	return { event, supabase };
}

function makeGet(query: string, opts: MockOpts & { session?: boolean } = {}) {
	const supabase = createMockSupabase(opts);
	const event = {
		url: new URL(`http://localhost/api/contact-suggestions${query}`),
		locals: {
			supabase,
			safeGetSession: async () => (opts.session === false ? { session: null, user: null } : { session: {}, user: { id: 'u1' } }),
		},
	} as never;
	return { event, supabase };
}

describe('POST /api/contact-suggestions (brouillon terrain)', () => {
	it('401 sans session (AC-014)', async () => {
		const { event } = makePost({ entreprise_id: ENT, nom: 'Dupont' }, { session: false });
		expect((await POST(event)).status).toBe(401);
	});

	it('400 sans identifiant (entreprise_id + notes seules) (AC-009)', async () => {
		const { event } = makePost({ entreprise_id: ENT, notes: 'rien' });
		expect((await POST(event)).status).toBe(400);
	});

	it('400 sans entreprise_id', async () => {
		const { event } = makePost({ nom: 'Dupont' });
		expect((await POST(event)).status).toBe(400);
	});

	it('404 si entreprise introuvable', async () => {
		const { event } = makePost({ entreprise_id: ENT, nom: 'Dupont' }, { entreprise: null });
		expect((await POST(event)).status).toBe(404);
	});

	it('crée une ligne contact_suggestions et JAMAIS une ligne contacts (AC-009)', async () => {
		const { event, supabase } = makePost({ entreprise_id: ENT, nom: 'Dupont', telephone: '022' });
		const res = await POST(event);
		expect(res.status).toBe(201);
		const tables = supabase._inserts.map((i) => i.table);
		expect(tables).toContain('contact_suggestions');
		expect(tables).not.toContain('contacts');
	});

	it('pose statut en_attente + created_by = user', async () => {
		const { event, supabase } = makePost({ entreprise_id: ENT, nom: 'Dupont' });
		await POST(event);
		const row = supabase._inserts.find((i) => i.table === 'contact_suggestions')?.row as Record<string, unknown>;
		expect(row.created_by).toBe('u1');
		expect(row.entreprise_id).toBe(ENT);
		// statut non posé explicitement → DEFAULT 'en_attente' en DB (ou posé en_attente).
		expect([undefined, 'en_attente']).toContain(row.statut);
	});

	it('normalise les chaînes vides en null', async () => {
		const { event, supabase } = makePost({ entreprise_id: ENT, nom: 'Dupont', prenom: '', email: '' });
		await POST(event);
		const row = supabase._inserts.find((i) => i.table === 'contact_suggestions')?.row as Record<string, unknown>;
		expect(row.prenom).toBeNull();
		expect(row.email).toBeNull();
		expect(row.nom).toBe('Dupont');
	});
});

describe('GET /api/contact-suggestions (badge + liste desktop)', () => {
	it('401 sans session', async () => {
		const { event } = makeGet('?statut=en_attente', { session: false });
		expect((await GET(event)).status).toBe(401);
	});

	it('retourne suggestions + count_en_attente', async () => {
		const list = [{ id: 's1', entreprise_id: ENT, nom: 'Dupont', statut: 'en_attente' }];
		const { event } = makeGet('?statut=en_attente', { list, count: 3 });
		const res = await GET(event);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.suggestions).toHaveLength(1);
		expect(body.count_en_attente).toBe(3);
	});
});
