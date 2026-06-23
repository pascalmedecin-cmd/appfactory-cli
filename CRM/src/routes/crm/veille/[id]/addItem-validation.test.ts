import { describe, it, expect, vi, beforeEach } from 'vitest';

// Audit 360 V2c H-20 : couverture tests du pipeline anti-hallucination minimal de
// l'ajout manuel d'item (Zod content → thème actif → sanitize → denied source → verifyUrl).
// La V2b couvrait l'optimistic locking (addItem-optimistic.test.ts) ; ici on couvre les
// rejets en amont.

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));
vi.mock('$env/dynamic/private', () => ({
	env: { PUBLIC_SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'svc-key' }
}));

type VerifyResult = { ok: true; status: number } | { ok: false; reason: string; status?: number };
const mockVerifyUrl = vi.fn(async (_u: string): Promise<VerifyResult> => ({ ok: true, status: 200 }));
vi.mock('$lib/server/intelligence/url-verify', () => ({ verifyUrl: (u: string) => mockVerifyUrl(u) }));
vi.mock('$lib/server/intelligence/url-sanitize', () => ({ sanitizeUrl: (u: string) => ({ cleaned: u }) }));
const mockIsDeniedSource = vi.fn((_h: string) => false);
vi.mock('$lib/server/intelligence/source-allowlist', () => ({
	isDeniedSource: (h: string) => mockIsDeniedSource(h)
}));
const mockActiveThemes = vi.fn(
	async (): Promise<Array<{ slug: string; label: string }>> => [{ slug: 'cinema', label: 'Cinéma' }]
);
vi.mock('$lib/server/intelligence/themes-repository', () => ({
	listActiveThemes: () => mockActiveThemes()
}));
vi.mock('$lib/server/intelligence/strip-citations', () => ({ stripCitationTags: (s: string) => s }));

const mockServiceRef: { current: unknown } = { current: undefined };
vi.mock('$lib/server/supabase', () => ({ createSupabaseServiceClient: () => mockServiceRef.current }));

/**
 * Mock service client minimal :
 *  SELECT id,items,version FROM intelligence_reports → row
 *  UPDATE intelligence_reports SET items=..., version=... WHERE id AND version → success
 */
function makeOkServiceClient(initial = { id: 'rpt-1', items: [] as unknown[], version: 0 }) {
	const state = { ...initial, items: [...initial.items], updates: 0 };
	return {
		from() {
			return {
				select() {
					const chain = {
						eq: () => chain,
						maybeSingle: () =>
							Promise.resolve({
								data: { id: state.id, items: state.items, version: state.version },
								error: null
							})
					};
					return chain;
				},
				update(payload: { items: unknown[]; version: number }) {
					const chain = {
						eq: () => chain,
						select: () => {
							state.updates++;
							state.items = payload.items;
							state.version = payload.version;
							return Promise.resolve({ data: [{ id: state.id }], error: null });
						}
					};
					return chain;
				}
			};
		},
		_state: () => state
	};
}

function makeFormData(values: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(values)) fd.set(k, v);
	return fd;
}

const VALID_INPUT: Record<string, string> = {
	title: 'Lorem ipsum dolor sit amet titre item',
	summary: 'A'.repeat(60),
	filmpro_relevance: 'B'.repeat(40),
	url: 'https://example.com/article',
	source_name: 'Le Temps',
	published_at: '2026-05-10',
	theme: 'cinema',
	segment: 'tertiaire',
	geo_scope: 'suisse',
	maturity: 'etabli',
	actionability: 'veille_active'
};

async function callAddItem(
	input: Record<string, string> = VALID_INPUT,
	opts: { user?: { id: string } | null; service?: unknown } = {}
): Promise<unknown> {
	mockServiceRef.current = opts.service ?? makeOkServiceClient();
	const mod = await import('./+page.server');
	const action = mod.actions.addItem!;
	const event = {
		params: { id: 'rpt-1' },
		request: { formData: async () => makeFormData(input) } as unknown as Request,
		locals: {
			supabase: mockServiceRef.current,
			safeGetSession: async () => ({ user: 'user' in opts ? opts.user : { id: 'user-1' } })
		}
	} as unknown as Parameters<typeof action>[0];
	return action(event);
}

beforeEach(() => {
	mockVerifyUrl.mockReset();
	mockVerifyUrl.mockResolvedValue({ ok: true, status: 200 });
	mockIsDeniedSource.mockReset();
	mockIsDeniedSource.mockReturnValue(false);
	mockActiveThemes.mockReset();
	mockActiveThemes.mockResolvedValue([{ slug: 'cinema', label: 'Cinéma' }]);
	mockServiceRef.current = undefined;
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('addItem validation pipeline (H-20)', () => {
	it('URL valide + thème actif + contenu OK → item ajouté', async () => {
		const service = makeOkServiceClient();
		const r = await callAddItem(VALID_INPUT, { service });
		expect((r as { success?: boolean }).success).toBe(true);
		expect(service._state().updates).toBe(1);
		expect(service._state().items).toHaveLength(1);
	});

	it('utilisateur non authentifié → fail(401)', async () => {
		const r = (await callAddItem(VALID_INPUT, { user: null })) as { status?: number };
		expect(r.status).toBe(401);
	});

	it('contenu trop court (summary vide) → fail(400)', async () => {
		const r = (await callAddItem({ ...VALID_INPUT, summary: '' })) as {
			status?: number;
			data?: { error: string };
		};
		expect(r.status).toBe(400);
		expect(r.data?.error).toMatch(/summary/i);
	});

	it('date de publication mal formée (pas YYYY-MM-DD) → fail(400)', async () => {
		const r = (await callAddItem({ ...VALID_INPUT, published_at: '2026-5-1' })) as {
			status?: number;
			data?: { error: string };
		};
		expect(r.status).toBe(400);
		expect(r.data?.error).toMatch(/published_at|YYYY-MM-DD/i);
	});

	it('thème inexistant ou inactif → fail(400)', async () => {
		const r = (await callAddItem({ ...VALID_INPUT, theme: 'inconnu' })) as {
			status?: number;
			data?: { error: string };
		};
		expect(r.status).toBe(400);
		expect(r.data?.error).toMatch(/inconnu|inactif/i);
	});

	it('URL morte (404) → fail(400)', async () => {
		mockVerifyUrl.mockResolvedValueOnce({ ok: false, reason: 'dead', status: 404 });
		const r = (await callAddItem(VALID_INPUT)) as { status?: number; data?: { error: string } };
		expect(r.status).toBe(400);
		expect(r.data?.error).toMatch(/inaccessible/i);
		expect(r.data?.error).toMatch(/404/);
	});

	it('URL paywall (verifyUrl ok=false) → fail(400)', async () => {
		mockVerifyUrl.mockResolvedValueOnce({ ok: false, reason: 'paywall' });
		const r = (await callAddItem(VALID_INPUT)) as { status?: number; data?: { error: string } };
		expect(r.status).toBe(400);
		expect(r.data?.error).toMatch(/inaccessible/i);
		expect(r.data?.error).toMatch(/paywall/i);
	});

	it('source en denylist → fail(400)', async () => {
		mockIsDeniedSource.mockReturnValueOnce(true);
		const r = (await callAddItem(VALID_INPUT)) as { status?: number; data?: { error: string } };
		expect(r.status).toBe(400);
		expect(r.data?.error).toMatch(/denylist/i);
	});
});
