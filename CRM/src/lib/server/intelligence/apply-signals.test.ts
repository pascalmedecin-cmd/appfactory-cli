import { describe, it, expect, vi } from 'vitest';
import { applySignalsFromReport } from './apply-signals';
import type { IntelligenceReport, IntelligenceItem } from './schema';

interface MockResp<T = unknown> {
	data: T | null;
	error: { message: string } | null;
	count?: number | null;
}

/**
 * Mock chainable Supabase. apply-signals enchaîne :
 *   - findMatchingLeadIds : from('prospect_leads').select('id').eq('canton', X).not(...).or(...)  ← await
 *   - upsert prospect_lead_signals : from('prospect_lead_signals').upsert([...], {...})           ← await direct sur upsert(...)
 *   - recompute-score appels en cascade (lead select + signaux select + update)
 *
 * On séquence par ordre d'invocation.
 */
function makeSupabase(responses: MockResp[]) {
	let i = 0;
	const next = () => responses[i++] ?? { data: null, error: null, count: null };

	function makeChain() {
		const target: Record<string, unknown> = {};
		const handler: ProxyHandler<Record<string, unknown>> = {
			get(_t, prop) {
				if (prop === 'then') {
					const r = next();
					return (resolve: (v: MockResp) => unknown) => Promise.resolve(resolve(r));
				}
				if (prop === 'maybeSingle') {
					return () => Promise.resolve(next());
				}
				if (prop === 'upsert') {
					// upsert(...) retourne directement le résultat (pas chainable ici).
					return () => Promise.resolve(next());
				}
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

function makeItem(rank: number, query: string, canton: string): IntelligenceItem {
	return {
		rank,
		title: 'Test item ' + rank,
		summary: 'A test item summary that is long enough to pass schema validation.',
		filmpro_relevance: 'Pertinence pour FilmPro suffisante',
		maturity: 'etabli',
		theme: 'films_solaires',
		geo_scope: 'suisse_romande',
		source: {
			name: 'Test Source',
			url: 'https://example.com/article-' + rank,
			published_at: '2026-04-25T00:00:00Z'
		},
		deep_dive: null,
		segment: 'tertiaire',
		actionability: 'action_directe',
		search_terms: [{ kind: 'simap', canton, query, label: `SIMAP · ${canton} · ${query}` }]
	};
}

function makeReport(items: IntelligenceItem[]): IntelligenceReport {
	return {
		meta: {
			week_label: '2026-W18',
			generated_at: '2026-04-25T08:00:00Z',
			compliance_tag: 'OK FilmPro',
			executive_summary: 'a'.repeat(100)
		},
		items,
		impacts_filmpro: []
	};
}

describe('applySignalsFromReport', () => {
	it('retourne 0 si aucun item dans le report', async () => {
		const supabase = makeSupabase([]) as unknown as Parameters<typeof applySignalsFromReport>[0];
		const r = await applySignalsFromReport(supabase, 'report-1', makeReport([]));
		expect(r.insertedSignals).toBe(0);
		expect(r.recomputedLeads).toBe(0);
	});

	it("ne fait rien si la query est trop courte (<3 chars)", async () => {
		// 1 item avec query courte → findMatchingLeadIds retourne [] sans appel DB
		// Donc 0 réponses Supabase consommées (sauf l'upsert sur tableau vide).
		const supabase = makeSupabase([]) as unknown as Parameters<typeof applySignalsFromReport>[0];
		const item = makeItem(1, 'ab', 'VD'); // 2 chars
		const r = await applySignalsFromReport(supabase, 'report-1', makeReport([item]));
		expect(r.insertedSignals).toBe(0);
		expect(r.recomputedLeads).toBe(0);
	});

	it('match leads + dédup + upsert + recompute', async () => {
		// 1 chip → 2 ILIKE en parallèle (raison_sociale, description) → trouve 2 leads
		// → upsert 2 lignes → recompute 2 leads (succès)
		const responses: MockResp[] = [
			// 1a. findMatchingLeadIds : ILIKE raison_sociale → 2 leads
			{ data: [{ id: 'lead-A' }, { id: 'lead-B' }], error: null },
			// 1b. ILIKE description → vide
			{ data: [], error: null },
			// 2. upsert prospect_lead_signals
			{ data: null, error: null, count: 2 },
			// 3a. recompute lead-A : select lead
			{
				data: {
					id: 'lead-A',
					canton: 'VD',
					description: null,
					raison_sociale: 'Test SA',
					source: 'simap',
					date_publication: null,
					telephone: null,
					montant: null
				},
				error: null
			},
			// 3b. select signaux lead-A
			{ data: [], error: null },
			// 3c. update lead-A
			{ data: null, error: null },
			// 4a-c. recompute lead-B
			{
				data: {
					id: 'lead-B',
					canton: 'VD',
					description: null,
					raison_sociale: 'Other SA',
					source: 'simap',
					date_publication: null,
					telephone: null,
					montant: null
				},
				error: null
			},
			{ data: [], error: null },
			{ data: null, error: null }
		];
		const supabase = makeSupabase(responses) as unknown as Parameters<typeof applySignalsFromReport>[0];
		const item = makeItem(1, 'films solaires Lausanne', 'VD');
		const r = await applySignalsFromReport(supabase, 'report-1', makeReport([item]));
		expect(r.insertedSignals).toBe(2);
		expect(r.recomputedLeads).toBe(2);
		expect(r.failedLeads).toBe(0);
	});

	it('dédup cross-fields : un lead matche raison_sociale ET description sans doubler', async () => {
		// 1 chip → 1 lead matche les 2 ILIKE (raison_sociale + description). Set côté code dédup.
		const responses: MockResp[] = [
			// 1a. ILIKE raison_sociale → lead-A
			{ data: [{ id: 'lead-A' }], error: null },
			// 1b. ILIKE description → lead-A (même)
			{ data: [{ id: 'lead-A' }], error: null },
			// 2. upsert (1 ligne)
			{ data: null, error: null, count: 1 },
			// 3. recompute lead-A
			{
				data: {
					id: 'lead-A',
					canton: 'VD',
					description: null,
					raison_sociale: 'X',
					source: 'simap',
					date_publication: null,
					telephone: null,
					montant: null
				},
				error: null
			},
			{ data: [], error: null },
			{ data: null, error: null }
		];
		const supabase = makeSupabase(responses) as unknown as Parameters<typeof applySignalsFromReport>[0];
		const item = makeItem(1, 'films solaires', 'VD');
		const r = await applySignalsFromReport(supabase, 'report-1', makeReport([item]));
		expect(r.insertedSignals).toBe(1);
		expect(r.recomputedLeads).toBe(1);
	});

	it('dédup en mémoire si même lead matche 2 chips du même item', async () => {
		// Item avec 2 chips (canton VD). 2 chips × 2 ILIKE = 4 calls Supabase.
		// Les deux chips retournent le même lead-A. Après dédup en mémoire, 1 seul insert.
		const item: IntelligenceItem = {
			...makeItem(1, 'first query', 'VD'),
			search_terms: [
				{ kind: 'simap', canton: 'VD', query: 'first query', label: 'a' },
				{ kind: 'simap', canton: 'VD', query: 'second query', label: 'b' }
			]
		};
		const responses: MockResp[] = [
			// chip 1 ILIKE raison_sociale → lead-A
			{ data: [{ id: 'lead-A' }], error: null },
			// chip 1 ILIKE description → vide
			{ data: [], error: null },
			// chip 2 ILIKE raison_sociale → lead-A
			{ data: [{ id: 'lead-A' }], error: null },
			// chip 2 ILIKE description → vide
			{ data: [], error: null },
			// upsert (1 ligne après dédup)
			{ data: null, error: null, count: 1 },
			// recompute lead-A
			{
				data: {
					id: 'lead-A',
					canton: 'VD',
					description: null,
					raison_sociale: 'X',
					source: 'simap',
					date_publication: null,
					telephone: null,
					montant: null
				},
				error: null
			},
			{ data: [], error: null },
			{ data: null, error: null }
		];
		const supabase = makeSupabase(responses) as unknown as Parameters<typeof applySignalsFromReport>[0];
		const r = await applySignalsFromReport(supabase, 'report-1', makeReport([item]));
		expect(r.insertedSignals).toBe(1);
		expect(r.recomputedLeads).toBe(1);
	});
});
