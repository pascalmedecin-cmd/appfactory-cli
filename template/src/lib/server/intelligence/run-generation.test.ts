import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VeilleDeps } from './deps';

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

const generateMock = vi.fn();
const sendRecapMock = vi.fn();
const applySignalsMock = vi.fn();

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

/**
 * Construit un objet `VeilleDeps` complet à partir d'un client supabase mock.
 * Toutes les valeurs sont déterministes pour les tests (anti-doublons activé W18,
 * window 30j, email désactivé pour ne pas hit Resend).
 */
function makeMockDeps(supabase: unknown): VeilleDeps {
	return {
		supabase: supabase as VeilleDeps['supabase'],
		anthropicApiKey: 'sk-ant-test-fixture',
		email: {
			enabled: false,
			to: 'test@filmpro.ch',
			from: 'noreply@filmpro.ch'
		},
		antiDoublonsFrom: '2026-W18',
		windowDays: 30
	};
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
		const fresh = makeCapturingSupabase([
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

		const result = await runWeeklyGeneration(
			new Date('2026-05-01T06:00:00Z'),
			makeMockDeps(fresh.client)
		);

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

	it('passe deps.anthropicApiKey à generateIntelligenceReport', async () => {
		const fresh = makeCapturingSupabase([
			{ data: null, error: null }, // idempotence
			{ data: null, error: null }, // markRunning
			{ data: [], error: null }, // previousItems
			{ data: { id: 'rep-key' }, error: null } // publish
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
				items: [],
				impacts_filmpro: []
			},
			raw: null,
			costs: { breakdown: [], total_usd: 0, total_eur: 0 }
		});

		const deps = makeMockDeps(fresh.client);
		deps.anthropicApiKey = 'sk-ant-injected-12345';
		await runWeeklyGeneration(new Date('2026-05-01T06:00:00Z'), deps);

		expect(generateMock).toHaveBeenCalledTimes(1);
		const opts = generateMock.mock.calls[0][1];
		expect(opts).toEqual({ anthropicApiKey: 'sk-ant-injected-12345' });
	});

	it("convertit une exception non capturée de generateIntelligenceReport en upsert status=error + email failure", async () => {
		const fresh = makeCapturingSupabase([
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

		const result = await runWeeklyGeneration(
			new Date('2026-05-01T06:00:00Z'),
			makeMockDeps(fresh.client)
		);

		expect(result.ok).toBe(false);
		expect(result.error).toMatch(/Exception: Anthropic stream timeout/);
		expect(result.reportId).toBe('rep-error');

		const statuses = fresh.upserts.map((u) => u.values.status);
		expect(statuses).toContain('running');
		expect(statuses).toContain('error');

		// Email failure déclenché (sendRecapEmail reçoit (input, emailConfig))
		expect(sendRecapMock).toHaveBeenCalledTimes(1);
		expect(sendRecapMock.mock.calls[0][0]).toMatchObject({ mode: 'failure' });
		// 2e arg = emailConfig injecté (depuis deps)
		expect(sendRecapMock.mock.calls[0][1]).toMatchObject({ enabled: false });
	});

	it('skip silencieux si édition déjà publiée (idempotence préservée)', async () => {
		const fresh = makeCapturingSupabase([
			// idempotence check : édition published trouvée
			{ data: { id: 'rep-existing', status: 'published' }, error: null }
		]);

		const result = await runWeeklyGeneration(
			new Date('2026-05-01T06:00:00Z'),
			makeMockDeps(fresh.client)
		);

		expect(result.ok).toBe(true);
		expect(result.skipped).toBe(true);
		expect(result.reportId).toBe('rep-existing');
		expect(generateMock).not.toHaveBeenCalled();
	});

	it("masque les patterns sk-ant-* et Bearer * dans error_message stocké en DB", async () => {
		const fresh = makeCapturingSupabase([
			{ data: null, error: null }, // idempotence
			{ data: null, error: null }, // markRunning
			{ data: [], error: null }, // previousItems
			{ data: { id: 'rep-leak' }, error: null } // markError
		]);
		generateMock.mockRejectedValue(
			new Error('401 Unauthorized: invalid Bearer sk-ant-api03-secretvalue123 header')
		);

		const result = await runWeeklyGeneration(
			new Date('2026-05-01T06:00:00Z'),
			makeMockDeps(fresh.client)
		);

		expect(result.ok).toBe(false);
		const errorUpsert = fresh.upserts.find((u) => u.values.status === 'error');
		expect(errorUpsert).toBeDefined();
		const stored = errorUpsert!.values.error_message as string;
		expect(stored).not.toMatch(/sk-ant-api03-secretvalue123/);
		expect(stored).toContain('[REDACTED');
		// Sanity : pas de Bearer suivi du token réel
		expect(stored).not.toMatch(/Bearer\s+sk-ant-/);
	});

	it("masque les patterns JWT (eyJ...), Resend (re_...) et api_key=val génériques", async () => {
		const fresh = makeCapturingSupabase([
			{ data: null, error: null },
			{ data: null, error: null },
			{ data: [], error: null },
			{ data: { id: 'rep-leak2' }, error: null }
		]);
		// JWT Supabase + Resend key + api_key=value
		generateMock.mockRejectedValue(
			new Error(
				'Auth failed eyJhbGciOiJIUzI1NiI.eyJzdWIiOiIxMjM0NSJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c re_a1b2c3d4e5f6g7h8i9j0kkkk api_key=foo123bar456'
			)
		);

		const result = await runWeeklyGeneration(
			new Date('2026-05-01T06:00:00Z'),
			makeMockDeps(fresh.client)
		);

		expect(result.ok).toBe(false);
		const errorUpsert = fresh.upserts.find((u) => u.values.status === 'error');
		const stored = errorUpsert!.values.error_message as string;
		expect(stored).not.toMatch(/eyJhbGciOiJIUzI1NiI/);
		expect(stored).toMatch(/\[REDACTED_JWT\]/);
		expect(stored).not.toMatch(/re_a1b2c3d4e5f6g7h8i9j0/);
		expect(stored).toMatch(/\[REDACTED_RESEND_KEY\]/);
		expect(stored).not.toMatch(/api_key=foo123bar456/);
		expect(stored).toMatch(/api_key=\[REDACTED\]/i);
	});

	it("convertit gen.success=false en upsert status=error sans appeler generateIntelligenceReport deux fois", async () => {
		const fresh = makeCapturingSupabase([
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

		const result = await runWeeklyGeneration(
			new Date('2026-05-01T06:00:00Z'),
			makeMockDeps(fresh.client)
		);

		expect(result.ok).toBe(false);
		expect(result.error).toMatch(/Modèle coupé par max_tokens/);
		const statuses = fresh.upserts.map((u) => u.values.status);
		expect(statuses).toContain('running');
		expect(statuses).toContain('error');
		expect(generateMock).toHaveBeenCalledTimes(1);
	});
});
