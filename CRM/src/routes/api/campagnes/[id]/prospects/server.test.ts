import { describe, it, expect } from 'vitest';
import { GET } from './+server';

/**
 * GET /api/campagnes/[id]/prospects (panneau Étiquettes). Couvre les chemins SÉCU/validation
 * (401 non-auth, 403 flag OFF, 400 id non-uuid) + happy path (liste de prospects). La logique de
 * récupération (résolution lead_ids -> prospect_leads) est testée dans campagnes.test.ts.
 *
 * Mock Supabase PAR TABLE : `fetchProspectsForCampagne` fait DEUX requêtes successives
 * (prospect_lead_campagnes puis prospect_leads). Un mock à résultat unique renverrait la même
 * donnée aux deux -> on route par nom de table.
 */
type SbResult = { data?: unknown; error?: unknown; count?: number | null };
function multiTableMock(byTable: Record<string, SbResult>) {
	const chainFor = (table: string): unknown => {
		const r = byTable[table] ?? {};
		const res = { data: r.data ?? null, error: r.error ?? null, count: r.count ?? null };
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

const VALID_ID = '11111111-1111-4111-8111-111111111111';

function event(
	opts: { authed?: boolean; premium?: boolean; id?: string; supa?: ReturnType<typeof multiTableMock> } = {}
) {
	const { authed = true, premium = true, id = VALID_ID } = opts;
	const supa =
		opts.supa ??
		multiTableMock({
			prospect_lead_campagnes: { data: [{ lead_id: 'L1' }, { lead_id: 'L2' }] },
			prospect_leads: {
				data: [
					{ id: 'L1', raison_sociale: 'Boutique Léman', adresse: 'Rue Basse 7', npa: '1201', localite: 'Genève', statut: 'a_contacter', score_pertinence: 7, source: 'zefix' },
					{ id: 'L2', raison_sociale: 'Régie du Lac', adresse: null, npa: null, localite: null, statut: 'vide', score_pertinence: null, source: 'search_ch' }
				]
			}
		});
	const user = authed ? { id: 'u1', app_metadata: premium ? { ff_crm_listes_v2: true } : {} } : null;
	return {
		params: { id },
		locals: {
			safeGetSession: async () => ({ session: authed ? { user } : null, user }),
			supabase: supa
		}
	} as unknown as Parameters<typeof GET>[0];
}

describe('GET /api/campagnes/[id]/prospects', () => {
	it('401 si non authentifié', async () => {
		expect((await GET(event({ authed: false }))).status).toBe(401);
	});

	it('403 si flag premium OFF (defense-in-depth)', async () => {
		expect((await GET(event({ premium: false }))).status).toBe(403);
	});

	it('400 si id non-uuid', async () => {
		expect((await GET(event({ id: 'pas-un-uuid' }))).status).toBe(400);
	});

	it('200 + liste de prospects (happy path) : adresse + statut/score/source (panneau prospects)', async () => {
		const res = await GET(event());
		expect(res.status).toBe(200);
		const body = (await res.json()) as { prospects: Array<{ id: string; raison_sociale: string }> };
		expect(body.prospects).toHaveLength(2);
		expect(body.prospects[0]).toMatchObject({
			id: 'L1',
			raison_sociale: 'Boutique Léman',
			adresse: 'Rue Basse 7',
			statut: 'a_contacter',
			score_pertinence: 7,
			source: 'zefix'
		});
		expect(body.prospects[1]).toMatchObject({ id: 'L2', adresse: null, statut: 'vide', score_pertinence: null, source: 'search_ch' });
	});

	it('200 + liste vide quand la campagne n’a aucun prospect', async () => {
		const supa = multiTableMock({ prospect_lead_campagnes: { data: [] } });
		const res = await GET(event({ supa }));
		expect(res.status).toBe(200);
		expect((await res.json()).prospects).toEqual([]);
	});

	it('500 si erreur DB sur la lecture des prospects', async () => {
		const supa = multiTableMock({
			prospect_lead_campagnes: { data: [{ lead_id: 'L1' }] },
			prospect_leads: { error: { message: 'boom' } }
		});
		expect((await GET(event({ supa }))).status).toBe(500);
	});

	it('500 si erreur DB sur la lecture du LIEN (jamais « campagne vide » silencieuse)', async () => {
		const supa = multiTableMock({ prospect_lead_campagnes: { error: { message: 'lien-boom' } } });
		expect((await GET(event({ supa }))).status).toBe(500);
	});
});
