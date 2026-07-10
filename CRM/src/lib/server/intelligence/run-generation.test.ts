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
					// veille_sources (sources-loader, étape 3) : réponse inerte qui NE consomme
					// PAS la séquence intelligence_reports → loadSourcesBundle retombe sur le
					// seed (= code). Sans ça, l'await décalerait toute la séquence d'un cran.
					if (table === 'veille_sources') {
						const r = { data: [], error: null } as MockResp;
						return (resolve: (v: MockResp) => unknown) => Promise.resolve(resolve(r));
					}
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
const sendBriefMock = vi.fn();
const applySignalsMock = vi.fn();

vi.mock('./generate', () => ({
	generateIntelligenceReport: (...args: unknown[]) => generateMock(...args)
}));

vi.mock('./email-recap', () => ({
	sendRecapEmail: (...args: unknown[]) => sendRecapMock(...args)
}));

vi.mock('./email-brief', () => ({
	sendBriefEmail: (...args: unknown[]) => sendBriefMock(...args)
}));

vi.mock('./apply-signals', () => ({
	applySignalsFromReport: (...args: unknown[]) => applySignalsMock(...args)
}));

// Cross-check mocké au niveau orchestration : ce fichier teste run-generation, pas
// les internes du cross-check (couverts par cross-check.test.ts). Défaut = aucun
// item gardé (équivaut à l'ancien comportement « page example.com non vérifiable »),
// surchargeable par-test (ex. systemicError).
vi.mock('./cross-check', () => ({
	crossCheckBatch: vi.fn()
}));

// S169 : run-generation appelle loadThemeBundle(supabase) avant generate. Pour
// ne pas perturber la séquence du mock supabase capturant les upserts (qui est
// purement séquentiel), on mocke theme-loader pour retourner directement le
// bundle hardcoded fallback.
vi.mock('./theme-loader', async () => {
	const actual = await vi.importActual<typeof import('./theme-loader')>('./theme-loader');
	return {
		...actual,
		loadThemeBundle: vi.fn(async () => actual.getFallbackBundle())
	};
});

import { runWeeklyGeneration } from './run-generation';
import { crossCheckBatch } from './cross-check';
import type { Mock } from 'vitest';

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
			to: ['test@filmpro.ch'],
			from: 'noreply@filmpro.ch'
		},
		brief: {
			enabled: false,
			to: ['test@filmpro.ch', 'antoine@filmpro.ch'],
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
		sendBriefMock.mockReset();
		sendBriefMock.mockResolvedValue({ ok: true });
		applySignalsMock.mockReset();
		(crossCheckBatch as Mock).mockReset();
		// Défaut : cross-check ne garde aucun item (comportement neutre). Les tests
		// qui ont besoin d'un cas précis (systemicError) surchargent via mockResolvedValueOnce.
		(crossCheckBatch as Mock).mockResolvedValue({
			kept: [],
			rejected: [],
			unverifiable: [],
			apiErrorCount: 0
		});
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
		// S169 : opts inclut désormais `themes` (bundle taxonomie) en plus de
		// l'API key. On vérifie que la key est bien injectée + qu'un bundle non
		// vide est passé.
		expect(opts.anthropicApiKey).toBe('sk-ant-injected-12345');
		expect(opts.themes.allowedSlugs.length).toBeGreaterThanOrEqual(7);
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

	// Rattrapage du soir (décision Pascal 2026-06-19, renverse council 06-06) :
	// une semaine en status=error est RETENTÉE (plus de skip). L'email du matin a
	// déjà alerté ; la garde idempotente « published » est le seul court-circuit.
	it('rattrapage : RETENTE une semaine en status=error (renverse le skip 06-06)', async () => {
		const fresh = makeCapturingSupabase([
			{ data: { id: 'rep-errored', status: 'error' }, error: null }, // idempotence : error du matin
			{ data: null, error: null }, // markRunning (réécrit la ligne error)
			{ data: [], error: null }, // previousItems
			{ data: { id: 'rep-errored' }, error: null } // markError .single (re-échec possible)
		]);
		generateMock.mockResolvedValue({
			success: false,
			error: 'erreur transitoire',
			raw: null,
			costs: { breakdown: [], total_usd: 0, total_eur: 0 }
		});

		await runWeeklyGeneration(new Date('2026-05-01T06:00:00Z'), makeMockDeps(fresh.client));

		// La génération EST relancée (plus de skip sur status=error).
		expect(generateMock).toHaveBeenCalledTimes(1);
		expect(fresh.upserts.map((u) => u.values.status)).toContain('running');
	});

	it('tourne si aucune édition (anti-skip scheduler)', async () => {
		const fresh = makeCapturingSupabase([
			{ data: null, error: null }, // idempotence : rien
			{ data: null, error: null }, // markRunning
			{ data: [], error: null }, // previousItems
			{ data: { id: 'rep-catchup' }, error: null } // markError .single
		]);
		generateMock.mockResolvedValue({
			success: false,
			error: 'erreur quelconque',
			raw: null,
			costs: { breakdown: [], total_usd: 0, total_eur: 0 }
		});

		await runWeeklyGeneration(new Date('2026-05-01T06:00:00Z'), makeMockDeps(fresh.client));

		expect(generateMock).toHaveBeenCalledTimes(1);
	});

	it('tourne si status=running orphelin (crash dur du runner sans trace error)', async () => {
		const fresh = makeCapturingSupabase([
			{ data: { id: 'rep-orphan', status: 'running' }, error: null }, // idempotence : orphelin
			{ data: null, error: null }, // markRunning (réécrit l'orphelin)
			{ data: [], error: null }, // previousItems
			{ data: { id: 'rep-orphan' }, error: null } // markError .single
		]);
		generateMock.mockResolvedValue({
			success: false,
			error: 'erreur quelconque',
			raw: null,
			costs: { breakdown: [], total_usd: 0, total_eur: 0 }
		});

		await runWeeklyGeneration(new Date('2026-05-01T06:00:00Z'), makeMockDeps(fresh.client));

		expect(generateMock).toHaveBeenCalledTimes(1);
	});

	it('published : skip idempotent (le rattrapage ne re-paie jamais un succès)', async () => {
		const fresh = makeCapturingSupabase([
			{ data: { id: 'rep-pub', status: 'published' }, error: null }
		]);

		const result = await runWeeklyGeneration(
			new Date('2026-05-01T06:00:00Z'),
			makeMockDeps(fresh.client)
		);

		expect(result.ok).toBe(true);
		expect(result.skipped).toBe(true);
		expect(generateMock).not.toHaveBeenCalled();
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

	it('systemicError du cross-check (crédit API épuisé) → markError distinct, rien publié (zéro-hallu)', async () => {
		const fresh = makeCapturingSupabase([
			{ data: null, error: null }, // idempotence
			{ data: null, error: null }, // markRunning
			{ data: [], error: null }, // previousItems
			{ data: { id: 'rep-sys' }, error: null } // markError .single
		]);
		// La génération RÉUSSIT (la partie chère), mais la vérification anti-hallu est
		// systémiquement impossible (crédit dédié épuisé) → on ne publie rien + alerte distincte.
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
						search_terms: [{ kind: 'simap', canton: 'VD', query: 'test', label: 'SIMAP VD test' }]
					}
				],
				impacts_filmpro: []
			},
			raw: { mock: true },
			costs: { breakdown: [], total_usd: 1.5, total_eur: 1.4 }
		});
		(crossCheckBatch as Mock).mockResolvedValueOnce({
			kept: [],
			rejected: [{ url: 'https://example.com/x', title: 't', verdict: { facts_ok: false, divergences: [], confidence: 'low' } }],
			unverifiable: [],
			apiErrorCount: 1,
			systemicError: { kind: 'request', message: 'credit balance too low' }
		});

		const result = await runWeeklyGeneration(
			new Date('2026-05-01T06:00:00Z'),
			makeMockDeps(fresh.client)
		);

		expect(result.ok).toBe(false);
		expect(result.error).toMatch(/Vérification anti-hallucination impossible/);
		// Rien publié (zéro-hallu) : status passe à error, jamais published.
		const statuses = fresh.upserts.map((u) => u.values.status);
		expect(statuses).toContain('error');
		expect(statuses).not.toContain('published');
		// Email d'alerte échec déclenché.
		expect(sendRecapMock.mock.calls[0][0]).toMatchObject({ mode: 'failure' });
	});

	// --- Régression W25 (intégration) : un item SANS chips (search_terms vide) ne
	// court-circuite JAMAIS le cross-check. Verrouille l'invariant zéro-hallu contre
	// un futur refactor du chemin de publication (bug-hunter Low-2, 2026-06-19). ---
	const itemZeroChip = {
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
		search_terms: []
	};
	const metaOk = {
		week_label: '2026-W18',
		generated_at: '2026-05-01T06:00:00Z',
		compliance_tag: 'OK FilmPro',
		executive_summary: 'a'.repeat(100)
	};

	it('item SANS chips : passe par cross-check et est publié si cross-check le garde (régression W25)', async () => {
		const fresh = makeCapturingSupabase([
			{ data: null, error: null }, // idempotence
			{ data: null, error: null }, // markRunning
			{ data: [], error: null }, // previousItems
			{ data: { id: 'rep-zerochip' }, error: null } // publish
		]);
		generateMock.mockResolvedValue({
			success: true,
			report: { meta: metaOk, items: [itemZeroChip], impacts_filmpro: [] },
			raw: { mock: true },
			costs: { breakdown: [], total_usd: 1, total_eur: 1 }
		});
		(crossCheckBatch as Mock).mockResolvedValueOnce({
			kept: [itemZeroChip],
			rejected: [],
			unverifiable: [],
			apiErrorCount: 0
		});

		const result = await runWeeklyGeneration(
			new Date('2026-05-01T06:00:00Z'),
			makeMockDeps(fresh.client)
		);

		expect(result.ok).toBe(true);
		// L'item 0-chip a bien été SOUMIS au cross-check (aucun court-circuit).
		expect((crossCheckBatch as Mock).mock.calls[0][0]).toHaveLength(1);
		// Publié, avec ses 0 chips intacts (plus de rejet pour search_terms vide).
		const published = fresh.upserts.find((u) => u.values.status === 'published');
		expect(published).toBeDefined();
		const publishedItems = published!.values.items as Array<{ search_terms: unknown }>;
		expect(publishedItems).toHaveLength(1);
		expect(publishedItems[0].search_terms).toEqual([]);
	});

	it("item SANS chips : rejeté par cross-check => JAMAIS publié (zéro-hallu)", async () => {
		const fresh = makeCapturingSupabase([
			{ data: null, error: null }, // idempotence
			{ data: null, error: null }, // markRunning
			{ data: [], error: null }, // previousItems
			{ data: { id: 'rep-zerochip-rej' }, error: null } // publish (édition vide)
		]);
		generateMock.mockResolvedValue({
			success: true,
			report: { meta: metaOk, items: [itemZeroChip], impacts_filmpro: [] },
			raw: { mock: true },
			costs: { breakdown: [], total_usd: 1, total_eur: 1 }
		});
		// Cross-check rejette l'item (verbatim KO), sans systemicError : l'édition est
		// publiée mais NE contient PAS l'item non vérifié.
		(crossCheckBatch as Mock).mockResolvedValueOnce({
			kept: [],
			rejected: [
				{
					url: 'https://example.com/x',
					title: 't',
					verdict: { facts_ok: false, divergences: [], confidence: 'low' }
				}
			],
			unverifiable: [],
			apiErrorCount: 0
		});

		const result = await runWeeklyGeneration(
			new Date('2026-05-01T06:00:00Z'),
			makeMockDeps(fresh.client)
		);

		// L'item 0-chip est passé par cross-check...
		expect((crossCheckBatch as Mock).mock.calls[0][0]).toHaveLength(1);
		// ...et comme il a été rejeté, l'édition publiée ne le contient pas (zéro-hallu).
		expect(result.ok).toBe(true);
		const published = fresh.upserts.find((u) => u.values.status === 'published');
		expect(published).toBeDefined();
		expect(published!.values.items).toHaveLength(0);
	});

	// --- force / brief / no-email (verrouille les comportements neufs de cette session,
	// LOW remontés par la revue adversariale 2026-06-23 : sans ces tests, une régression
	// inversant `!opts.force` ou le seuil `>= 1` passerait la suite verte). ---

	it('force:true : régénère même une édition déjà publiée (bypass idempotence, rattrapage W25)', async () => {
		const fresh = makeCapturingSupabase([
			{ data: { id: 'rep-pub', status: 'published' }, error: null }, // idempotence : DÉJÀ publiée
			{ data: null, error: null }, // markRunning
			{ data: [], error: null }, // previousItems
			{ data: { id: 'rep-regen' }, error: null } // publish
		]);
		generateMock.mockResolvedValue({
			success: true,
			report: { meta: metaOk, items: [itemZeroChip], impacts_filmpro: [] },
			raw: { mock: true },
			costs: { breakdown: [], total_usd: 1, total_eur: 1 }
		});
		(crossCheckBatch as Mock).mockResolvedValueOnce({
			kept: [itemZeroChip],
			rejected: [],
			unverifiable: [],
			apiErrorCount: 0
		});

		const result = await runWeeklyGeneration(
			new Date('2026-05-01T06:00:00Z'),
			makeMockDeps(fresh.client),
			{ force: true }
		);

		// PAS de skip malgré le status=published : la génération tourne quand même.
		expect(result.skipped).toBeFalsy();
		expect(generateMock).toHaveBeenCalledTimes(1);
		// Nouvelle édition publiée (écrase l'ancienne).
		expect(fresh.upserts.some((u) => u.values.status === 'published')).toBe(true);
	});

	it('brief brandé ENVOYÉ quand l’édition a >= 1 item', async () => {
		const fresh = makeCapturingSupabase([
			{ data: null, error: null },
			{ data: null, error: null },
			{ data: [], error: null },
			{ data: { id: 'rep-1item' }, error: null }
		]);
		generateMock.mockResolvedValue({
			success: true,
			report: { meta: metaOk, items: [itemZeroChip], impacts_filmpro: [] },
			raw: {},
			costs: { breakdown: [], total_usd: 1, total_eur: 1 }
		});
		(crossCheckBatch as Mock).mockResolvedValueOnce({
			kept: [itemZeroChip],
			rejected: [],
			unverifiable: [],
			apiErrorCount: 0
		});

		const result = await runWeeklyGeneration(
			new Date('2026-05-01T06:00:00Z'),
			makeMockDeps(fresh.client)
		);

		expect(result.ok).toBe(true);
		expect(sendBriefMock).toHaveBeenCalledTimes(1);
		expect(sendBriefMock.mock.calls[0][0]).toMatchObject({ weekLabel: '2026-W18' });
	});

	it('régime normal (>= SPARSE_WEEK_THRESHOLD items) : le récap admin ne doublonne plus, seul le brief part', async () => {
		const fresh = makeCapturingSupabase([
			{ data: null, error: null }, // idempotence
			{ data: null, error: null }, // markRunning
			{ data: [], error: null }, // previousItems
			{ data: { id: 'rep-2items' }, error: null } // publish
		]);
		const itemB = { ...itemZeroChip, rank: 2, title: 'second item de test 10 chars' };
		generateMock.mockResolvedValue({
			success: true,
			report: { meta: metaOk, items: [itemZeroChip, itemB], impacts_filmpro: [] },
			raw: {},
			costs: { breakdown: [], total_usd: 1, total_eur: 1 }
		});
		(crossCheckBatch as Mock).mockResolvedValueOnce({
			kept: [itemZeroChip, itemB],
			rejected: [],
			unverifiable: [],
			apiErrorCount: 0
		});

		const result = await runWeeklyGeneration(
			new Date('2026-05-01T06:00:00Z'),
			makeMockDeps(fresh.client)
		);

		expect(result.ok).toBe(true);
		// Le brief brandé (antoine@ + pascal@, logo) est le seul email de régime normal.
		expect(sendBriefMock).toHaveBeenCalledTimes(1);
		// Le récap admin (mode success, sans logo) NE part plus : fin du doublon hebdo.
		expect(sendRecapMock).not.toHaveBeenCalled();
	});

	it('brief brandé NON envoyé quand l’édition est vide (0 item) : seul l’admin est alerté', async () => {
		const fresh = makeCapturingSupabase([
			{ data: null, error: null },
			{ data: null, error: null },
			{ data: [], error: null },
			{ data: { id: 'rep-empty' }, error: null }
		]);
		generateMock.mockResolvedValue({
			success: true,
			report: { meta: metaOk, items: [itemZeroChip], impacts_filmpro: [] },
			raw: {},
			costs: { breakdown: [], total_usd: 1, total_eur: 1 }
		});
		// Cross-check ne garde rien -> 0 item publié.
		(crossCheckBatch as Mock).mockResolvedValueOnce({
			kept: [],
			rejected: [],
			unverifiable: [],
			apiErrorCount: 0
		});

		const result = await runWeeklyGeneration(
			new Date('2026-05-01T06:00:00Z'),
			makeMockDeps(fresh.client)
		);

		expect(result.ok).toBe(true);
		const published = fresh.upserts.find((u) => u.values.status === 'published');
		expect(published!.values.items).toHaveLength(0);
		// Le brief brandé n'est PAS expédié à antoine@.
		expect(sendBriefMock).not.toHaveBeenCalled();
		// L'admin reçoit quand même l'alerte (mode sparse).
		expect(sendRecapMock).toHaveBeenCalled();
	});

	it('--no-email : récap admin ET brief reçoivent une config désactivée (backfill silencieux)', async () => {
		const fresh = makeCapturingSupabase([
			{ data: null, error: null },
			{ data: null, error: null },
			{ data: [], error: null },
			{ data: { id: 'rep-silent' }, error: null }
		]);
		generateMock.mockResolvedValue({
			success: true,
			report: { meta: metaOk, items: [itemZeroChip], impacts_filmpro: [] },
			raw: {},
			costs: { breakdown: [], total_usd: 1, total_eur: 1 }
		});
		(crossCheckBatch as Mock).mockResolvedValueOnce({
			kept: [itemZeroChip],
			rejected: [],
			unverifiable: [],
			apiErrorCount: 0
		});

		await runWeeklyGeneration(new Date('2026-05-01T06:00:00Z'), makeMockDeps(fresh.client), {
			noEmail: true
		});

		// Les envois reçoivent enabled=false (skip interne réel prouvé en unit).
		expect(sendRecapMock.mock.calls[0][1]).toMatchObject({ enabled: false });
		expect(sendBriefMock.mock.calls[0][1]).toMatchObject({ enabled: false });
	});
});
