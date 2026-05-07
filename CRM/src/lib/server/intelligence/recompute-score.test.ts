import { describe, it, expect, vi } from 'vitest';
import { recomputeLeadScore, recomputeLeadScoresBatch } from './recompute-score';

interface MockResp<T = unknown> {
	data: T | null;
	error: { message: string } | null;
}

/**
 * Mock chainable Supabase client. Recompute fait :
 *   1. supabase.from('prospect_leads').select(...).eq('id', leadId).maybeSingle()
 *   2. supabase.from('prospect_lead_signals').select(...).eq('lead_id', leadId)  ← await direct
 *   3. supabase.from('prospect_leads').update({...}).eq('id', leadId)             ← await direct
 *
 * Stratégie : chaque méthode (select/update/eq) retourne un Proxy thenable.
 * Quand on `await` le résultat, on pop la prochaine fixture. Quand on appelle
 * `maybeSingle()`, idem. Sinon (chaining), on retourne le même proxy.
 */
function makeSupabase(responses: MockResp[]) {
	let i = 0;
	const next = () => responses[i++] ?? { data: null, error: null };

	function makeChain() {
		const target: Record<string, unknown> = {};
		const handler: ProxyHandler<Record<string, unknown>> = {
			get(_t, prop) {
				if (prop === 'then') {
					// await proxy → pop next fixture.
					const r = next();
					return (resolve: (v: MockResp) => unknown) => Promise.resolve(resolve(r));
				}
				if (prop === 'maybeSingle') {
					return () => Promise.resolve(next());
				}
				// select / update / eq / in / not / etc. → retourne un nouveau proxy chainable.
				return () => proxy;
			}
		};
		const proxy: Record<string, unknown> = new Proxy(target, handler);
		return proxy;
	}

	return {
		from: vi.fn().mockImplementation(() => makeChain())
	};
}

describe('recomputeLeadScore', () => {
	it('retourne null si lead introuvable', async () => {
		// 1er appel (select lead) → not found
		const supabase = makeSupabase([{ data: null, error: null }]) as unknown as Parameters<
			typeof recomputeLeadScore
		>[0];
		const r = await recomputeLeadScore(supabase, 'missing-id');
		expect(r).toBeNull();
	});

	it('recalcule le score avec un signal Veille fresh (etabli OK FilmPro)', async () => {
		const recentIso = new Date().toISOString();
		const supabase = makeSupabase([
			// 1. select lead
			{
				data: {
					id: 'lead-1',
					canton: 'GE',
					description: 'construction',
					raison_sociale: 'Test SA',
					source: 'simap',
					date_publication: null,
					telephone: null,
					montant: null
				},
				error: null
			},
			// 2. select signaux
			{
				data: [
					{
						maturity: 'etabli',
						compliance_tag: 'OK FilmPro',
						signal_generated_at: recentIso
					}
				],
				error: null
			},
			// 3. update score
			{ data: null, error: null }
		]) as unknown as Parameters<typeof recomputeLeadScore>[0];

		const r = await recomputeLeadScore(supabase, 'lead-1');
		// canton GE (+2) + secteur construction (+3) + simap (+2) + bonus Veille (+2) = 9
		expect(r).toBe(9);
	});

	it('retourne 0 si update échoue', async () => {
		const supabase = makeSupabase([
			{
				data: {
					id: 'lead-1',
					canton: null,
					description: null,
					raison_sociale: 'X',
					source: 'search_ch',
					date_publication: null,
					telephone: null,
					montant: null
				},
				error: null
			},
			{ data: [], error: null }, // 0 signaux
			{ data: null, error: { message: 'update failed' } } // update fail
		]) as unknown as Parameters<typeof recomputeLeadScore>[0];

		const r = await recomputeLeadScore(supabase, 'lead-1');
		expect(r).toBeNull();
	});
});

describe('recomputeLeadScoresBatch', () => {
	it('retourne updated=0/failed=0 sur leadIds vide', async () => {
		const supabase = makeSupabase([]) as unknown as Parameters<typeof recomputeLeadScoresBatch>[0];
		const r = await recomputeLeadScoresBatch(supabase, []);
		expect(r).toEqual({ updated: 0, failed: 0 });
	});

	it('compte updated et failed par lead', async () => {
		// 2 leads : 1 succès (3 réponses), 1 échec lead introuvable (1 réponse)
		const supabase = makeSupabase([
			// lead 1 : found
			{
				data: {
					id: 'l1',
					canton: 'GE',
					description: null,
					raison_sociale: 'X',
					source: 'simap',
					date_publication: null,
					telephone: null,
					montant: null
				},
				error: null
			},
			// signaux l1 : aucun
			{ data: [], error: null },
			// update l1 OK
			{ data: null, error: null },
			// lead 2 : not found
			{ data: null, error: null }
		]) as unknown as Parameters<typeof recomputeLeadScoresBatch>[0];

		const r = await recomputeLeadScoresBatch(supabase, ['l1', 'l2']);
		expect(r.updated).toBe(1);
		expect(r.failed).toBe(1);
	});
});
