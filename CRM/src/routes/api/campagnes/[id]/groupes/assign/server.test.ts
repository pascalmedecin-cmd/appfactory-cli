import { describe, it, expect } from 'vitest';
import { POST } from './+server';

/**
 * POST /api/campagnes/[id]/groupes/assign. Sécu/validation + compte `updated` honnête +
 * groupe étranger -> 400. La logique (check d'appartenance, chunking, FK) est testée côté repo.
 */
type SbResult = { data?: unknown; error?: unknown };
function multiTableMock(byTable: Record<string, SbResult>) {
	const chainFor = (table: string): unknown => {
		const r = byTable[table] ?? {};
		const res = { data: r.data ?? null, error: r.error ?? null };
		return new Proxy(
			{},
			{
				get(_t, prop: string) {
					if (prop === 'then')
						return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
							Promise.resolve(res).then(resolve, reject);
					return () => chainFor(table);
				}
			}
		);
	};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return { from: (t: string) => chainFor(t) } as any;
}

const CAMP_ID = '11111111-1111-4111-8111-111111111111';
const GID = '33333333-3333-4333-8333-333333333333';
const LEAD_1 = '22222222-2222-4222-8222-222222222222';

function event(opts: { authed?: boolean; premium?: boolean; id?: string; body?: unknown; supa?: unknown } = {}) {
	const { authed = true, premium = true, id = CAMP_ID } = opts;
	const user = authed ? { id: 'u1', app_metadata: premium ? { ff_crm_listes_v2: true } : {} } : null;
	return {
		params: { id },
		request: new Request('http://local/api', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(opts.body ?? { groupeId: GID, leadIds: [LEAD_1] })
		}),
		locals: {
			safeGetSession: async () => ({ session: authed ? { user } : null, user }),
			supabase:
				opts.supa ??
				multiTableMock({
					campagne_groupes: { data: { id: GID } },
					prospect_lead_campagnes: { data: [{ lead_id: LEAD_1 }] }
				})
		}
	} as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/campagnes/[id]/groupes/assign', () => {
	it('401 / 403 / 400 id / 400 payload (leadIds vide, groupeId non uuid/non null)', async () => {
		expect((await POST(event({ authed: false }))).status).toBe(401);
		expect((await POST(event({ premium: false }))).status).toBe(403);
		expect((await POST(event({ id: 'nope' }))).status).toBe(400);
		expect((await POST(event({ body: { groupeId: GID, leadIds: [] } }))).status).toBe(400);
		expect((await POST(event({ body: { groupeId: 'x', leadIds: [LEAD_1] } }))).status).toBe(400);
	});

	it('200 + updated (compte honnête) ; groupeId null accepté (retirer du groupe)', async () => {
		const res = await POST(event());
		expect(res.status).toBe(200);
		expect((await res.json()).updated).toBe(1);
		const res2 = await POST(event({ body: { groupeId: null, leadIds: [LEAD_1] } }));
		expect(res2.status).toBe(200);
	});

	it('400 si le groupe n’appartient pas à la campagne', async () => {
		const supa = multiTableMock({ campagne_groupes: { data: null } });
		expect((await POST(event({ supa }))).status).toBe(400);
	});
});
