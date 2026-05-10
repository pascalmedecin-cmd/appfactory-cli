import { describe, it, expect, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

vi.mock('$env/dynamic/private', () => ({
	env: {
		PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
		SUPABASE_SERVICE_ROLE_KEY: 'svc-role-key',
	},
}));

vi.mock('$lib/server/intelligence/url-verify', () => ({
	verifyUrl: async () => ({ ok: true, status: 200 }),
}));

vi.mock('$lib/server/intelligence/source-allowlist', () => ({
	isDeniedSource: () => false,
}));

vi.mock('$lib/server/intelligence/themes-repository', () => ({
	listActiveThemes: async () => [{ slug: 'cinema', label: 'Cinéma' }],
}));

vi.mock('$lib/server/intelligence/strip-citations', () => ({
	stripCitationTags: (s: string) => s,
}));

vi.mock('$lib/server/intelligence/url-sanitize', () => ({
	sanitizeUrl: (u: string) => ({ cleaned: u }),
}));

type ReportRow = { id: string; items: unknown[]; version: number };

/**
 * Mock supabase service client. Le code testé fait :
 *   1. SELECT id, items, version FROM intelligence_reports WHERE id=$id
 *   2. UPDATE intelligence_reports SET items=$items, version=$v+1
 *      WHERE id=$id AND version=$v RETURNING id
 * Si UPDATE retourne data=[] → conflit, retry max 3.
 *
 * Implémentation : on utilise des proxies différents pour SELECT vs UPDATE
 * en mémorisant l'ordre d'appel des chaînes builder.
 */
function createMockServiceClient(
	initial: ReportRow,
	opts: { concurrentBumpAfterSelect?: number } = {}
) {
	const state = {
		current: { ...initial, items: [...initial.items] } as ReportRow,
		selectsDone: 0,
		updateAttempts: 0,
		updateSuccesses: 0,
		opts,
	};

	function buildSelectBuilder() {
		const b = {
			select(_cols: string) {
				return b;
			},
			eq(_col: string, _val: unknown) {
				return b;
			},
			maybeSingle() {
				state.selectsDone++;
				if (state.opts.concurrentBumpAfterSelect && state.selectsDone === 1) {
					const snapshot: ReportRow = { ...state.current };
					state.current = {
						...state.current,
						version: state.current.version + state.opts.concurrentBumpAfterSelect,
					};
					return Promise.resolve({ data: snapshot, error: null });
				}
				return Promise.resolve({ data: { ...state.current }, error: null });
			},
		};
		return b;
	}

	function buildUpdateBuilder() {
		const eqs: Record<string, unknown> = {};
		let pendingPayload: { items: unknown[]; version: number } | null = null;
		const b = {
			update(payload: { items: unknown[]; version: number }) {
				pendingPayload = payload;
				return b;
			},
			eq(col: string, val: unknown) {
				eqs[col] = val;
				return b;
			},
			select(_col: string) {
				state.updateAttempts++;
				const expectedVersion = (eqs.version as number) ?? -1;
				if (state.current.version === expectedVersion && pendingPayload) {
					state.current = {
						id: state.current.id,
						items: pendingPayload.items,
						version: pendingPayload.version,
					};
					state.updateSuccesses++;
					return Promise.resolve({ data: [{ id: state.current.id }], error: null });
				}
				return Promise.resolve({ data: [], error: null });
			},
		};
		return b;
	}

	let nextOpIsUpdate = false;
	const supabase = {
		from(_table: string) {
			if (nextOpIsUpdate) {
				nextOpIsUpdate = false;
				return buildUpdateBuilder();
			}
			// Détection write vs read par signature de chain : on retourne un proxy
			// qui décide à l'appel de update() vs select().
			const lazy = {
				select(cols: string) {
					return buildSelectBuilder().select(cols);
				},
				update(payload: { items: unknown[]; version: number }) {
					return buildUpdateBuilder().update(payload);
				},
			};
			return lazy;
		},
	};

	return {
		from: supabase.from,
		_state: () => ({ ...state }),
	};
}

let mockServiceRef: { current: ReturnType<typeof createMockServiceClient> } = {
	current: undefined as never,
};

vi.mock('$lib/server/supabase', () => ({
	createSupabaseServiceClient: () => mockServiceRef.current,
}));

function makeFormData(values: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(values)) fd.set(k, v);
	return fd;
}

const VALID_INPUT = {
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
	actionability: 'veille_active',
};

async function callAddItem(
	mockService: ReturnType<typeof createMockServiceClient>,
	input = VALID_INPUT
): Promise<unknown> {
	mockServiceRef.current = mockService;
	const mod = await import('./+page.server');
	const action = mod.actions.addItem;

	const event = {
		params: { id: 'rpt-1' },
		request: { formData: async () => makeFormData(input) } as unknown as Request,
		locals: {
			supabase: mockService,
			safeGetSession: async () => ({ user: { id: 'user-1' } }),
		},
	} as unknown as Parameters<typeof action>[0];
	return action(event);
}

describe('addItem optimistic locking (V2b H-09)', () => {
	it('UPDATE atomique succeed quand pas de conflit version', async () => {
		const mock = createMockServiceClient({ id: 'rpt-1', items: [], version: 0 });
		const result = await callAddItem(mock);
		expect((result as { success?: boolean }).success).toBe(true);
		const state = mock._state();
		expect(state.current.version).toBe(1);
		expect(state.current.items).toHaveLength(1);
		expect(state.updateSuccesses).toBe(1);
	});

	it('retry fait succeed quand 1 bump version concurrent intervient au 1er essai', async () => {
		const mock = createMockServiceClient(
			{ id: 'rpt-1', items: [], version: 0 },
			{ concurrentBumpAfterSelect: 1 }
		);
		const result = await callAddItem(mock);
		expect((result as { success?: boolean }).success).toBe(true);
		const state = mock._state();
		expect(state.updateAttempts).toBeGreaterThanOrEqual(2);
		expect(state.updateSuccesses).toBe(1);
		expect(state.current.items).toHaveLength(1);
	});

	it('refuse l\'ajout quand items.length >= 15 (V2b bug-hunter F1 saturated)', async () => {
		const fifteenItems = Array.from({ length: 15 }, (_, i) => ({ rank: i + 1 }));
		const mock = createMockServiceClient({
			id: 'rpt-1',
			items: fifteenItems,
			version: 0,
		});
		const result = await callAddItem(mock);
		// L'action retourne fail(409, ...) → wrapper SvelteKit { status: 409, data: {...} }.
		expect((result as { status?: number }).status).toBe(409);
		expect((result as { data: { error: string } }).data.error).toMatch(/saturée|15 items/i);
		const state = mock._state();
		expect(state.updateAttempts).toBe(0);
		expect(state.current.items).toHaveLength(15);
	});
});
