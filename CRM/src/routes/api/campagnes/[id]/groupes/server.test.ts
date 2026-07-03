import { describe, it, expect } from 'vitest';
import { POST } from './+server';

/**
 * POST /api/campagnes/[id]/groupes. Couvre les chemins SÉCU/validation (401, 403 flag OFF,
 * 400 id/payload) + happy paths (création + assignation initiale, 409 doublon, warning
 * d'assignation non silencieux). La logique repo est testée dans server/campagne-groupes.test.ts.
 * (Le handler GET, consommé uniquement par l'ex-panneau latéral, a été retiré avec lui.)
 *
 * Mock Supabase PAR TABLE (même doctrine que les tests d'endpoints campagnes) : la création
 * touche `campagne_groupes` (insert + check d'appartenance) puis `prospect_lead_campagnes`
 * (assignation initiale) -> on route par nom de table.
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
const LEAD_1 = '22222222-2222-4222-8222-222222222222';
const G = { id: '33333333-3333-4333-8333-333333333333', campagne_id: CAMP_ID, nom: 'Régies', date_creation: 'd', created_by: null };

function event(opts: { authed?: boolean; premium?: boolean; id?: string; body?: unknown; supa?: unknown } = {}) {
	const { authed = true, premium = true, id = CAMP_ID } = opts;
	const supa =
		opts.supa ??
		multiTableMock({
			campagne_groupes: { data: { ...G } },
			prospect_lead_campagnes: { data: [{ lead_id: LEAD_1 }] }
		});
	const user = authed ? { id: 'u1', app_metadata: premium ? { ff_crm_listes_v2: true } : {} } : null;
	return {
		params: { id },
		request: new Request('http://local/api', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(opts.body ?? { nom: 'Régies' })
		}),
		locals: {
			safeGetSession: async () => ({ session: authed ? { user } : null, user }),
			supabase: supa
		}
	} as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/campagnes/[id]/groupes', () => {
	it('401 / 403 / 400 id / 400 payload (nom vide, > 24, leadIds non uuid)', async () => {
		expect((await POST(event({ authed: false }))).status).toBe(401);
		expect((await POST(event({ premium: false }))).status).toBe(403);
		expect((await POST(event({ id: 'nope' }))).status).toBe(400);
		expect((await POST(event({ body: { nom: '   ' } }))).status).toBe(400);
		expect((await POST(event({ body: { nom: 'x'.repeat(25) } }))).status).toBe(400);
		expect((await POST(event({ body: { nom: 'ok', leadIds: ['pas-un-uuid'] } }))).status).toBe(400);
	});

	it('201 : groupe créé, assignation initiale comptée', async () => {
		const res = await POST(event({ body: { nom: 'Régies', leadIds: [LEAD_1] } }));
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.groupe).toMatchObject({ id: G.id, nom: 'Régies' });
		expect(body.assigned).toBe(1);
		expect(body.assignWarning).toBe(null);
	});

	it('201 sans leadIds : aucune assignation tentée', async () => {
		const res = await POST(event({ body: { nom: 'Régies' } }));
		expect(res.status).toBe(201);
		expect((await res.json()).assigned).toBe(0);
	});

	it('409 doublon (unicité insensible à la casse par campagne)', async () => {
		const supa = multiTableMock({ campagne_groupes: { error: { code: '23505', message: 'dup' } } });
		expect((await POST(event({ supa }))).status).toBe(409);
	});

	it('échec d’assignation initiale -> 201 MAIS assignWarning non silencieux (groupe = sortie primaire)', async () => {
		const supa = multiTableMock({
			campagne_groupes: { data: { ...G } },
			prospect_lead_campagnes: { error: { message: 'boom' } }
		});
		const res = await POST(event({ supa, body: { nom: 'Régies', leadIds: [LEAD_1] } }));
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.assignWarning).toBeTruthy();
		expect(body.assigned).toBe(0);
	});
});
