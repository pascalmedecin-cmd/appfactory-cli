import { describe, it, expect } from 'vitest';
import { PATCH, DELETE } from './+server';

/**
 * Handlers PATCH / DELETE /api/campagnes/[id] (écran dédié). Couvre les chemins SÉCU/validation
 * (401 non-auth, 400 id non-uuid, 400 aucune modification, 409 conflit de nom) + le happy path.
 * La logique du repo est testée dans campagnes.test.ts ; ici on prouve le gate auth, la validation
 * du param id et le mapping erreur -> statut HTTP.
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

const VALID_ID = '11111111-1111-4111-8111-111111111111';

function event(body: unknown, opts: { authed?: boolean; premium?: boolean; id?: string; supa?: ReturnType<typeof supabaseMock> } = {}) {
	const {
		authed = true,
		premium = true,
		id = VALID_ID,
		supa = supabaseMock({ data: { id: VALID_ID, nom: 'Régies', couleur: 'c1' } })
	} = opts;
	const user = authed ? { id: 'u1', app_metadata: premium ? { ff_crm_listes_v2: true } : {} } : null;
	return {
		request: { json: async () => body },
		params: { id },
		locals: {
			safeGetSession: async () => ({ session: authed ? { user } : null, user }),
			supabase: supa
		}
	} as unknown as Parameters<typeof PATCH>[0];
}

describe('PATCH /api/campagnes/[id]', () => {
	it('401 si non authentifié', async () => {
		expect((await PATCH(event({ nom: 'X' }, { authed: false }))).status).toBe(401);
	});

	it('403 si flag premium OFF (defense-in-depth)', async () => {
		expect((await PATCH(event({ nom: 'X' }, { premium: false }))).status).toBe(403);
	});

	it('400 si id non-uuid', async () => {
		expect((await PATCH(event({ nom: 'X' }, { id: 'pas-un-uuid' }))).status).toBe(400);
	});

	it('400 si aucune modification', async () => {
		expect((await PATCH(event({}))).status).toBe(400);
	});

	it('200 renommage (happy path)', async () => {
		expect((await PATCH(event({ nom: 'Régies GE' }))).status).toBe(200);
	});

	it('409 sur conflit de nom (23505 -> duplicate)', async () => {
		const supa = supabaseMock({ error: { code: '23505', message: 'dup' } });
		expect((await PATCH(event({ nom: 'Régies' }, { supa }))).status).toBe(409);
	});

	it('200 archivage (updateCampagne)', async () => {
		expect((await PATCH(event({ archived: true }))).status).toBe(200);
	});

	it('200 changement de statut (active)', async () => {
		expect((await PATCH(event({ statut: 'active' }))).status).toBe(200);
	});

	it('400 sur statut hors périmètre (Zod enum strict)', async () => {
		expect((await PATCH(event({ statut: 'lance' }))).status).toBe(400);
	});
});

describe('DELETE /api/campagnes/[id]', () => {
	it('401 si non authentifié', async () => {
		expect((await DELETE(event(null, { authed: false }))).status).toBe(401);
	});

	it('403 si flag premium OFF', async () => {
		expect((await DELETE(event(null, { premium: false }))).status).toBe(403);
	});

	it('400 si id non-uuid', async () => {
		expect((await DELETE(event(null, { id: 'x' }))).status).toBe(400);
	});

	it('200 suppression (happy path, liens N-N en cascade DB)', async () => {
		expect((await DELETE(event(null))).status).toBe(200);
	});
});
