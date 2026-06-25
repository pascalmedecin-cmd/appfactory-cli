import { describe, it, expect } from 'vitest';
import { POST, DELETE } from './+server';

/**
 * Handlers POST/DELETE /api/prospection/lead-campagnes (assignation / retrait d'étiquettes).
 * Couvre le gate auth (401) + la validation uuid (400) + le happy path. Le repo est testé
 * ailleurs (campagnes.test.ts).
 */
function supabaseMock(result: { error?: unknown } = {}) {
	const res = { data: null, error: result.error ?? null, count: null };
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

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-a222-222222222222';

function event(
	body: unknown,
	handler: typeof POST | typeof DELETE,
	opts: { authed?: boolean; premium?: boolean; supa?: ReturnType<typeof supabaseMock> } = {}
) {
	const { authed = true, premium = true, supa = supabaseMock() } = opts;
	const user = authed ? { id: 'u1', app_metadata: premium ? { ff_crm_listes_v2: true } : {} } : null;
	return {
		request: { json: async () => body },
		locals: {
			safeGetSession: async () => ({ session: authed ? { user } : null, user }),
			supabase: supa
		}
	} as unknown as Parameters<typeof handler>[0];
}

describe('POST /api/prospection/lead-campagnes (assignation)', () => {
	it('401 non authentifié', async () => {
		const res = await POST(event({ leadId: UUID_A, campagneIds: [UUID_B] }, POST, { authed: false }));
		expect(res.status).toBe(401);
	});

	it('403 si flag premium OFF (defense-in-depth)', async () => {
		const res = await POST(event({ leadId: UUID_A, campagneIds: [UUID_B] }, POST, { premium: false }));
		expect(res.status).toBe(403);
	});

	it('400 si leadId pas un uuid', async () => {
		const res = await POST(event({ leadId: 'nope', campagneIds: [UUID_B] }, POST));
		expect(res.status).toBe(400);
	});

	it('400 si campagneIds vide', async () => {
		const res = await POST(event({ leadId: UUID_A, campagneIds: [] }, POST));
		expect(res.status).toBe(400);
	});

	it('200 ok (happy path)', async () => {
		const res = await POST(event({ leadId: UUID_A, campagneIds: [UUID_B] }, POST));
		expect(res.status).toBe(200);
		expect((await res.json()).ok).toBe(true);
	});

	it('400 si campagne inexistante (FK 23503)', async () => {
		const supa = supabaseMock({ error: { code: '23503', message: 'fk' } });
		const res = await POST(event({ leadId: UUID_A, campagneIds: [UUID_B] }, POST, { supa }));
		expect(res.status).toBe(400);
	});
});

describe('DELETE /api/prospection/lead-campagnes (retrait)', () => {
	it('401 non authentifié', async () => {
		const res = await DELETE(event({ leadId: UUID_A, campagneId: UUID_B }, DELETE, { authed: false }));
		expect(res.status).toBe(401);
	});

	it('403 si flag premium OFF', async () => {
		const res = await DELETE(event({ leadId: UUID_A, campagneId: UUID_B }, DELETE, { premium: false }));
		expect(res.status).toBe(403);
	});

	it('400 si campagneId pas un uuid', async () => {
		const res = await DELETE(event({ leadId: UUID_A, campagneId: 'x' }, DELETE));
		expect(res.status).toBe(400);
	});

	it('200 ok (happy path)', async () => {
		const res = await DELETE(event({ leadId: UUID_A, campagneId: UUID_B }, DELETE));
		expect(res.status).toBe(200);
	});
});
