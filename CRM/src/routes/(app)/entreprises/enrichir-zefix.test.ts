import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests de l'action `/entreprises?/enrichir` (audit 360 M-55 — enrichissement Zefix 0 test).
 * Couvre : champs manquants → 400 ; creds Zefix absents → 400 ; entreprise introuvable → 400 ;
 * HTTP Zefix KO → 400 ; aucun résultat → 400 ; fetch throw → 500 ; happy path → { success: true }
 * + payload d'update (H-02 : ne pas écraser `notes_libres` déjà saisi).
 */

const { mockEnv } = vi.hoisted(() => ({
	mockEnv: { ZEFIX_USERNAME: 'user', ZEFIX_PASSWORD: 'pass' } as Record<string, string | undefined>,
}));
vi.mock('$env/dynamic/private', () => ({ env: mockEnv }));
vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

type UpdatePayload = Record<string, unknown>;

function createMockSupabase(opts: {
	existing?: { notes_libres: string | null } | null;
	existingError?: { message: string };
	updateError?: { message: string };
}) {
	let captured: UpdatePayload | null = null;
	function from() {
		return {
			select() {
				return {
					eq() {
						return {
							single: () =>
								Promise.resolve({
									data: opts.existing === undefined ? { notes_libres: null } : opts.existing,
									error: opts.existingError ?? null,
								}),
						};
					},
				};
			},
			update(payload: UpdatePayload) {
				captured = payload;
				return { eq: () => Promise.resolve({ error: opts.updateError ?? null }) };
			},
		};
	}
	return { from, _captured: () => captured };
}

function makeFormData(values: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(values)) fd.set(k, v);
	return fd;
}

async function callEnrichir(supabase: ReturnType<typeof createMockSupabase>, fields: Record<string, string>) {
	const mod = await import('./+page.server');
	const action = mod.actions.enrichir!;
	const request = { formData: async () => makeFormData(fields) } as unknown as Request;
	return action({ request, locals: { supabase } } as unknown as Parameters<typeof action>[0]);
}

const ZEFIX_HIT = [
	{
		name: 'Acme SA',
		uid: 'CHE-123.456.789',
		legalSeat: 'Lausanne',
		canton: { cantonAbbreviation: 'VD' },
		purpose: { fr: 'Production audiovisuelle' },
		address: { street: 'Rue du Lac', houseNumber: '42', swissZipCode: '1000', city: 'Lausanne' },
	},
];

describe('action enrichir (Zefix)', () => {
	beforeEach(() => {
		mockEnv.ZEFIX_USERNAME = 'user';
		mockEnv.ZEFIX_PASSWORD = 'pass';
		vi.stubGlobal('fetch', vi.fn());
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('refuse 400 si id ou raison_sociale absent', async () => {
		const supabase = createMockSupabase({});
		const r = (await callEnrichir(supabase, { id: '', raison_sociale: 'Acme' })) as { status: number; data: { error: string } };
		expect(r.status).toBe(400);
		expect(r.data.error).toBe('Données manquantes');
	});

	it('refuse 400 si credentials Zefix non configurés', async () => {
		delete mockEnv.ZEFIX_USERNAME;
		const supabase = createMockSupabase({});
		const r = (await callEnrichir(supabase, { id: 'id-1', raison_sociale: 'Acme' })) as { status: number; data: { error: string } };
		expect(r.status).toBe(400);
		expect(r.data.error).toContain('Credentials Zefix');
	});

	it('refuse 400 si entreprise introuvable en DB', async () => {
		const supabase = createMockSupabase({ existing: null, existingError: { message: 'no rows' } });
		const r = (await callEnrichir(supabase, { id: 'id-1', raison_sociale: 'Acme' })) as { status: number; data: { error: string } };
		expect(r.status).toBe(400);
		expect(r.data.error).toBe('Entreprise introuvable');
	});

	it('HTTP Zefix non-OK → fail(400, "Zefix HTTP ...")', async () => {
		const supabase = createMockSupabase({ existing: { notes_libres: null } });
		(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 503 });
		const r = (await callEnrichir(supabase, { id: 'id-1', raison_sociale: 'Acme' })) as { status: number; data: { error: string } };
		expect(r.status).toBe(400);
		expect(r.data.error).toContain('Zefix HTTP 503');
	});

	it('aucun résultat Zefix → fail(400)', async () => {
		const supabase = createMockSupabase({ existing: { notes_libres: null } });
		(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => [] });
		const r = (await callEnrichir(supabase, { id: 'id-1', raison_sociale: 'Acme' })) as { status: number; data: { error: string } };
		expect(r.status).toBe(400);
		expect(r.data.error).toContain('Aucun résultat');
	});

	it('fetch throw → fail(500)', async () => {
		const supabase = createMockSupabase({ existing: { notes_libres: null } });
		(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'));
		const r = (await callEnrichir(supabase, { id: 'id-1', raison_sociale: 'Acme' })) as { status: number; data: { error: string } };
		expect(r.status).toBe(500);
		expect(r.data.error).toContain('Erreur lors de la requête Zefix');
	});

	it('happy path : { success: true } + payload update (notes_libres écrit car vide)', async () => {
		const supabase = createMockSupabase({ existing: { notes_libres: null } });
		(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ZEFIX_HIT });
		const r = await callEnrichir(supabase, { id: 'id-1', raison_sociale: 'Acme SA' });
		expect(r).toEqual({ success: true });
		const payload = supabase._captured()!;
		expect(payload.numero_ide).toBe('CHE-123.456.789');
		expect(payload.canton).toBe('VD');
		expect(payload.adresse_siege).toBe('Rue du Lac 42 1000 Lausanne');
		expect(payload.notes_libres).toBe('Production audiovisuelle');
		expect(payload.date_derniere_modification).toBeTruthy();
	});

	it('H-02 : ne réécrit PAS notes_libres si déjà saisi en DB', async () => {
		const supabase = createMockSupabase({ existing: { notes_libres: 'Notes manuelles importantes' } });
		(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ZEFIX_HIT });
		const r = await callEnrichir(supabase, { id: 'id-1', raison_sociale: 'Acme SA' });
		expect(r).toEqual({ success: true });
		const payload = supabase._captured()!;
		expect('notes_libres' in payload).toBe(false);
		expect(payload.numero_ide).toBe('CHE-123.456.789');
	});
});
