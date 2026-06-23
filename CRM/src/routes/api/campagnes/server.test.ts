import { describe, it, expect } from 'vitest';
import { POST } from './+server';

/**
 * Handler POST /api/campagnes (création). Couvre les chemins SÉCU/validation (401 non-auth,
 * 400 payload invalide, 409 conflit de nom) + le happy path. La logique du repo est testée
 * dans campagnes.test.ts ; ici on prouve le gate auth + le mapping erreur -> statut HTTP.
 */
function supabaseMock(result: { data?: unknown; error?: unknown } = {}) {
	const res = { data: result.data ?? null, error: result.error ?? null, count: null };
	const chain: unknown = new Proxy(
		{},
		{
			get(_t, prop: string) {
				if (prop === 'then')
					return (r: (v: unknown) => unknown, j: (e: unknown) => unknown) => Promise.resolve(res).then(r, j);
				return () => chain;
			}
		}
	);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return { from: () => chain } as any;
}

function event(body: unknown, opts: { authed?: boolean; supa?: ReturnType<typeof supabaseMock> } = {}) {
	const { authed = true, supa = supabaseMock({ data: { id: 'c1', nom: 'Régies', couleur: 'c1' } }) } = opts;
	return {
		request: { json: async () => body },
		locals: {
			safeGetSession: async () => ({
				session: authed ? { user: { id: 'u1' } } : null,
				user: authed ? { id: 'u1' } : null
			}),
			supabase: supa
		}
	} as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/campagnes', () => {
	it('401 si non authentifié (aucune écriture)', async () => {
		const res = await POST(event({ nom: 'X' }, { authed: false }));
		expect(res.status).toBe(401);
	});

	it('400 si nom manquant', async () => {
		const res = await POST(event({ couleur: 'c2' }));
		expect(res.status).toBe(400);
	});

	it('400 si nom vide', async () => {
		const res = await POST(event({ nom: '   ' }));
		expect(res.status).toBe(400);
	});

	it('201 + campagne créée (happy path)', async () => {
		const res = await POST(event({ nom: 'Régies', couleur: 'c3' }));
		expect(res.status).toBe(201);
		const payload = await res.json();
		expect(payload.campagne).toMatchObject({ id: 'c1' });
	});

	it('409 sur conflit de nom (23505 -> duplicate)', async () => {
		const supa = supabaseMock({ error: { code: '23505', message: 'dup' } });
		const res = await POST(event({ nom: 'Régies' }, { supa }));
		expect(res.status).toBe(409);
	});
});
