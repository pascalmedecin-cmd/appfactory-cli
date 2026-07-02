import { describe, it, expect } from 'vitest';
import { PATCH, DELETE } from './+server';

/**
 * PATCH/DELETE /api/campagnes/[id]/groupes/[gid]. Sécu/validation + traduction des erreurs du
 * repo (introuvable -> 400, doublon -> 409). Le scoping (id ET campagne_id) est testé côté repo.
 */
type SbResult = { data?: unknown; error?: unknown };
function mock(result: SbResult = {}) {
	const res = { data: result.data ?? null, error: result.error ?? null };
	const chain: unknown = new Proxy(
		{},
		{
			get(_t, prop: string) {
				if (prop === 'then')
					return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
						Promise.resolve(res).then(resolve, reject);
				return () => chain;
			}
		}
	);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return { from: () => chain } as any;
}

const CAMP_ID = '11111111-1111-4111-8111-111111111111';
const GID = '33333333-3333-4333-8333-333333333333';
const G = { id: GID, campagne_id: CAMP_ID, nom: 'Nouveau', date_creation: 'd', created_by: null };

function event(opts: { authed?: boolean; premium?: boolean; id?: string; gid?: string; body?: unknown; supa?: unknown } = {}) {
	const { authed = true, premium = true, id = CAMP_ID, gid = GID } = opts;
	const user = authed ? { id: 'u1', app_metadata: premium ? { ff_crm_listes_v2: true } : {} } : null;
	return {
		params: { id, gid },
		request: new Request('http://local/api', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(opts.body ?? { nom: 'Nouveau' })
		}),
		locals: {
			safeGetSession: async () => ({ session: authed ? { user } : null, user }),
			supabase: opts.supa ?? mock({ data: { ...G } })
		}
	} as unknown as Parameters<typeof PATCH>[0];
}

describe('PATCH /api/campagnes/[id]/groupes/[gid]', () => {
	it('401 / 403 / 400 ids / 400 payload', async () => {
		expect((await PATCH(event({ authed: false }))).status).toBe(401);
		expect((await PATCH(event({ premium: false }))).status).toBe(403);
		expect((await PATCH(event({ gid: 'nope' }))).status).toBe(400);
		expect((await PATCH(event({ body: { nom: 'x'.repeat(25) } }))).status).toBe(400);
	});

	it('200 : groupe renommé', async () => {
		const res = await PATCH(event());
		expect(res.status).toBe(200);
		expect((await res.json()).groupe.nom).toBe('Nouveau');
	});

	it('400 introuvable (gid d’une autre campagne) / 409 doublon', async () => {
		expect((await PATCH(event({ supa: mock({ data: null }) }))).status).toBe(400);
		expect((await PATCH(event({ supa: mock({ error: { code: '23505', message: 'dup' } }) }))).status).toBe(409);
	});
});

describe('DELETE /api/campagnes/[id]/groupes/[gid]', () => {
	it('401 / 403 / 400 ids', async () => {
		expect((await DELETE(event({ authed: false }))).status).toBe(401);
		expect((await DELETE(event({ premium: false }))).status).toBe(403);
		expect((await DELETE(event({ id: 'nope' }))).status).toBe(400);
	});

	it('200 suppression ; 400 introuvable', async () => {
		expect((await DELETE(event({ supa: mock({ data: { id: GID } }) }))).status).toBe(200);
		expect((await DELETE(event({ supa: mock({ data: null }) }))).status).toBe(400);
	});
});
