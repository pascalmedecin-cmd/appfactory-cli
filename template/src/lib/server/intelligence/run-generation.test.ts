import { describe, it, expect, vi, beforeEach } from 'vitest';

interface MockResp<T = unknown> {
	data: T | null;
	error: { message: string } | null;
	count?: number | null;
}

interface UpsertCall {
	table: string;
	values: Record<string, unknown>;
	options?: Record<string, unknown>;
}

/**
 * Capture chainable Supabase mock spécifique à run-generation.
 * Trace les upserts pour vérifier que le marquage running/error/published a lieu.
 */
function makeCapturingSupabase(responses: MockResp[]) {
	let i = 0;
	const next = () => responses[i++] ?? { data: null, error: null, count: null };
	const upserts: UpsertCall[] = [];

	function makeChain(table: string) {
		const handler: ProxyHandler<Record<string, unknown>> = {
			get(_t, prop) {
				if (prop === 'then') {
					const r = next();
					return (resolve: (v: MockResp) => unknown) => Promise.resolve(resolve(r));
				}
				if (prop === 'maybeSingle' || prop === 'single') {
					return () => Promise.resolve(next());
				}
				if (prop === 'upsert') {
					return (values: Record<string, unknown>, options?: Record<string, unknown>) => {
						upserts.push({ table, values, options });
						return proxy;
					};
				}
				return () => proxy;
			}
		};
		const proxy: Record<string, unknown> = new Proxy({}, handler);
		return proxy;
	}

	return {
		client: { from: vi.fn().mockImplementation((t: string) => makeChain(t)) },
		upserts
	};
}

const fakeSupabase = makeCapturingSupabase([]);
const generateMock = vi.fn();
const sendRecapMock = vi.fn();
const applySignalsMock = vi.fn();

vi.mock('$lib/server/supabase', () => ({
	createSupabaseServiceClient: () => fakeSupabase.client
}));

vi.mock('$env/dynamic/private', () => ({
	env: { VEILLE_ANTI_DOUBLONS_FROM: '2026-W18', VEILLE_WINDOW_DAYS: '30' }
}));

vi.mock('./generate', () => ({
	generateIntelligenceReport: (...args: unknown[]) => generateMock(...args)
}));

vi.mock('./email-recap', () => ({
	sendRecapEmail: (...args: unknown[]) => sendRecapMock(...args)
}));

vi.mock('./apply-signals', () => ({
	applySignalsFromReport: (...args: unknown[]) => applySignalsMock(...args)
}));

import { runWeeklyGeneration } from './run-generation';

function resetState(responses: MockResp[]) {
	(fakeSupabase as unknown as { upserts: UpsertCall[] }).upserts.length = 0;
	const internal = fakeSupabase as unknown as { _i?: number };
	internal._i = 0;
	// Reconstruire le supabase factice pour ré-injecter les responses
	const fresh = makeCapturingSupabase(responses);
	(fakeSupabase as unknown as { client: unknown }).client = fresh.client;
	(fakeSupabase as unknown as { upserts: UpsertCall[] }).upserts = fresh.upserts;
	return fresh;
}

describe('runWeeklyGeneration - observability anti-aveugle', () => {
	beforeEach(() => {
		generateMock.mockReset();
		sendRecapMock.mockReset();
		applySignalsMock.mockReset();
		sendRecapMock.mockResolvedValue({ ok: true });
		applySignalsMock.mockResolvedValue({
			insertedSignals: 0,
			recomputedLeads: 0,
			failedLeads: 0
		});
	});

	it('upsert status=running AU DÉMARRAGE avant tout appel à Anthropic', async () => {
		const fresh = resetState([
			// idempotence check : pas d'édition existante
			{ data: null, error: null },
			// markRunning upsert : succès, retourne null (pas .select)
			{ data: null, error: null },
			// previousItems chargement (anti-doublons activé W18) : aucune
			{ data: [], error: null },
			// publish upsert .select.single : retourne id
			{ data: { id: 'rep-success' }, error: null }
		]);
		generateMock.mockResolvedValue({
			success: true,
			report: {
				meta: {
					week_label: '2026-W18',
					generated_at: '2026-05-01T06:00:00Z',
					compliance_tag: 'OK FilmPro',
					executive_summary: 'a'.repeat(100)
				},
				items: [
					{
						rank: 1,
						title: 'item de test au moins 10 chars',
						summary: 'a'.repeat(80),
						filmpro_relevance: 'b'.repeat(50),
						maturity: 'etabli',
						theme: 'films_solaires',
						geo_scope: 'suisse_romande',
						source: {
							name: 'Source',
							url: 'https://example.com/x',
							published_at: '2026-04-30T00:00:00Z'
						},
						deep_dive: null,
						segment: 'tertiaire',
						actionability: 'action_directe',
						search_terms: [
							{ kind: 'simap', canton: 'VD', query: 'test', label: 'SIMAP VD test' }
						]
					}
				],
				impacts_filmpro: []
			},
			raw: { mock: true },
			costs: { breakdown: [], total_usd: 1.5, total_eur: 1.4 }
		});

		const result = await runWeeklyGeneration(new Date('2026-05-01T06:00:00Z'));

		expect(result.ok).toBe(true);
		expect(result.skipped).toBeUndefined();

		// Au moins 2 upserts : running + published
		const statuses = fresh.upserts.map((u) => u.values.status);
		expect(statuses).toContain('running');
		expect(statuses).toContain('published');
		// running DOIT être avant published (preuve que le marquage est en amont)
		const runningIdx = statuses.indexOf('running');
		const publishedIdx = statuses.indexOf('published');
		expect(runningIdx).toBeLessThan(publishedIdx);
	});

	it("convertit une exception non capturée de generateIntelligenceReport en upsert status=error + email failure", async () => {
		const fresh = resetState([
			// idempotence check
			{ data: null, error: null },
			// markRunning upsert
			{ data: null, error: null },
			// previousItems
			{ data: [], error: null },
			// markError upsert .select.single
			{ data: { id: 'rep-error' }, error: null }
		]);
		generateMock.mockRejectedValue(new Error('Anthropic stream timeout'));

		const result = await runWeeklyGeneration(new Date('2026-05-01T06:00:00Z'));

		expect(result.ok).toBe(false);
		expect(result.error).toMatch(/Exception: Anthropic stream timeout/);
		expect(result.reportId).toBe('rep-error');

		const statuses = fresh.upserts.map((u) => u.values.status);
		expect(statuses).toContain('running');
		expect(statuses).toContain('error');

		// Email failure déclenché
		expect(sendRecapMock).toHaveBeenCalledTimes(1);
		expect(sendRecapMock.mock.calls[0][0]).toMatchObject({ mode: 'failure' });
	});

	it('skip silencieux si édition déjà publiée (idempotence préservée)', async () => {
		resetState([
			// idempotence check : édition published trouvée
			{ data: { id: 'rep-existing', status: 'published' }, error: null }
		]);

		const result = await runWeeklyGeneration(new Date('2026-05-01T06:00:00Z'));

		expect(result.ok).toBe(true);
		expect(result.skipped).toBe(true);
		expect(result.reportId).toBe('rep-existing');
		expect(generateMock).not.toHaveBeenCalled();
	});

	it("masque les patterns sk-ant-* et Bearer * dans error_message stocké en DB", async () => {
		const fresh = resetState([
			{ data: null, error: null }, // idempotence
			{ data: null, error: null }, // markRunning
			{ data: [], error: null }, // previousItems
			{ data: { id: 'rep-leak' }, error: null } // markError
		]);
		generateMock.mockRejectedValue(
			new Error('401 Unauthorized: invalid Bearer sk-ant-api03-secretvalue123 header')
		);

		const result = await runWeeklyGeneration(new Date('2026-05-01T06:00:00Z'));

		expect(result.ok).toBe(false);
		const errorUpsert = fresh.upserts.find((u) => u.values.status === 'error');
		expect(errorUpsert).toBeDefined();
		const stored = errorUpsert!.values.error_message as string;
		expect(stored).not.toMatch(/sk-ant-api03-secretvalue123/);
		expect(stored).toContain('[REDACTED');
		// Sanity : pas de Bearer suivi du token réel
		expect(stored).not.toMatch(/Bearer\s+sk-ant-/);
	});

	it("convertit gen.success=false en upsert status=error sans appeler generateIntelligenceReport deux fois", async () => {
		const fresh = resetState([
			{ data: null, error: null }, // idempotence
			{ data: null, error: null }, // markRunning
			{ data: [], error: null }, // previousItems
			{ data: { id: 'rep-err2' }, error: null } // markError .single
		]);
		generateMock.mockResolvedValue({
			success: false,
			error: 'Modèle coupé par max_tokens',
			raw: { mock: 'partial' },
			costs: { breakdown: [], total_usd: 0.8, total_eur: 0.7 }
		});

		const result = await runWeeklyGeneration(new Date('2026-05-01T06:00:00Z'));

		expect(result.ok).toBe(false);
		expect(result.error).toMatch(/Modèle coupé par max_tokens/);
		const statuses = fresh.upserts.map((u) => u.values.status);
		expect(statuses).toContain('running');
		expect(statuses).toContain('error');
		expect(generateMock).toHaveBeenCalledTimes(1);
	});
});
