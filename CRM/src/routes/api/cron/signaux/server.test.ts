import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests du cron `GET /api/cron/signaux` (audit 360 M-51 — handler 314 lignes, 0 test).
 * Couvre : garde CRON_SECRET (401 sans / mauvais token) ; happy path (Zefix + SIMAP renvoient
 * du vide → 200, 0 importé, 0 erreur) ; creds Zefix absents → branche dégradée comptée en erreur.
 * fetch et le client service Supabase sont mockés (pas d'appel réseau ni DB réels).
 */

const { mockEnv } = vi.hoisted(() => ({
	mockEnv: { CRON_SECRET: 'test-secret', ZEFIX_USERNAME: 'u', ZEFIX_PASSWORD: 'p' } as Record<string, string | undefined>,
}));
vi.mock('$env/dynamic/private', () => ({ env: mockEnv }));
vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));
vi.mock('$lib/server/supabase', () => ({
	createSupabaseServiceClient: () => ({
		from: () => ({
			select: () => ({ eq: () => ({ in: () => Promise.resolve({ data: [] }) }) }),
			insert: () => Promise.resolve({ error: null }),
		}),
	}),
}));

async function callGet(authHeader: string | null) {
	const mod = await import('./+server');
	const event = {
		request: { headers: { get: (k: string) => (k.toLowerCase() === 'authorization' ? authHeader : null) } },
	} as unknown as Parameters<typeof mod.GET>[0];
	return mod.GET(event);
}

describe('GET /api/cron/signaux', () => {
	beforeEach(() => {
		mockEnv.CRON_SECRET = 'test-secret';
		mockEnv.ZEFIX_USERNAME = 'u';
		mockEnv.ZEFIX_PASSWORD = 'p';
		// fetch renvoie systématiquement du vide → aucune création détectée.
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('401 sans header Authorization', async () => {
		const res = await callGet(null);
		expect(res.status).toBe(401);
	});

	it('401 avec un mauvais token', async () => {
		const res = await callGet('Bearer wrong-secret-x');
		expect(res.status).toBe(401);
	});

	it('200 + 0 importé / 0 erreur quand Zefix et SIMAP ne renvoient rien', async () => {
		const res = await callGet('Bearer test-secret');
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			message: string;
			zefix: { imported: number; skipped: number };
			simap: { imported: number; skipped: number };
			errors: number;
		};
		expect(body.zefix).toEqual({ imported: 0, skipped: 0 });
		expect(body.simap).toEqual({ imported: 0, skipped: 0 });
		expect(body.errors).toBe(0);
		expect(body.message).toContain('0');
	});

	it('creds Zefix absents → branche dégradée comptée en erreur (toujours 200)', async () => {
		delete mockEnv.ZEFIX_USERNAME;
		const res = await callGet('Bearer test-secret');
		expect(res.status).toBe(200);
		const body = (await res.json()) as { errors: number; zefix: { imported: number } };
		expect(body.errors).toBeGreaterThanOrEqual(1);
		expect(body.zefix.imported).toBe(0);
	});

	it('audit 360 V3b L-11 : une sogcDate Zefix malformée est skippée + tracée en erreur (pas de drop silencieux)', async () => {
		const today = new Date().toISOString().slice(0, 10);
		// fetch : Zefix /sogc/bydate renvoie 1 création avec date pourrie + 1 valide ;
		// SIMAP renvoie vide. Format = [{sogcPublication, companyShort}] depuis 2026-05-13.
		let firstZefixCall = true;
		vi.stubGlobal(
			'fetch',
			vi.fn((url: string) => {
				const u = String(url);
				if (u.includes('zefix.admin.ch')) {
					// On ne renvoie le payload de test que sur le premier appel (date today) ;
					// les jours antérieurs renvoient du vide pour ne pas multiplier les erreurs.
					if (!firstZefixCall) return Promise.resolve({ ok: true, json: async () => [] });
					firstZefixCall = false;
					return Promise.resolve({
						ok: true,
						json: async () => [
							{
								sogcPublication: {
									sogcDate: 'pas-une-date',
									sogcId: 1,
									registryOfCommerceCanton: 'GE',
									message: 'But: pourri',
									mutationTypes: [{ id: 2, key: 'status.neu' }],
								},
								companyShort: { name: 'Pourrie SA', uid: 'CHE-111.111.111', legalSeat: 'Genève' },
							},
							{
								sogcPublication: {
									sogcDate: today,
									sogcId: 2,
									registryOfCommerceCanton: 'VD',
									message: 'But: conseil aux entreprises',
									mutationTypes: [{ id: 2, key: 'status.neu' }],
								},
								companyShort: { name: 'Valide SA', uid: 'CHE-222.222.222', legalSeat: 'Lausanne' },
							},
						],
					});
				}
				return Promise.resolve({ ok: true, json: async () => [] }); // SIMAP
			})
		);
		const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const res = await callGet('Bearer test-secret');
		expect(res.status).toBe(200);
		const body = (await res.json()) as { errors: number; zefix: { imported: number } };
		expect(body.errors).toBeGreaterThanOrEqual(1);
		expect(body.zefix.imported).toBeGreaterThanOrEqual(1); // la création valide est bien importée
		// la date pourrie a été tracée explicitement (pas droppée en silence)
		const loggedAll = errSpy.mock.calls.flat().map((a) => JSON.stringify(a)).join(' ');
		expect(loggedAll).toContain('sogcDate invalide');
		errSpy.mockRestore();
	});

	it('CRON_SECRET non configuré → 401 même avec un token plausible', async () => {
		delete mockEnv.CRON_SECRET;
		const res = await callGet('Bearer test-secret');
		expect(res.status).toBe(401);
	});
});
