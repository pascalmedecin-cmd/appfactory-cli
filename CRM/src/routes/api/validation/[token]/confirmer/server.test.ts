import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * POST /api/validation/[token]/confirmer - route PUBLIQUE (definition of done sécurité, même
 * doctrine que /decision). Couvre : kill-switch (410, ZÉRO requête DB), 404 token inconnu,
 * 410 lien révoqué/expiré avec 0 écriture, 200 happy path (écriture sur LE lien résolu),
 * 500 erreurs DB (résolution + écriture).
 */
const { resolveValidationToken, confirmValidationLien, createClient, mockEnv } = vi.hoisted(() => ({
	resolveValidationToken: vi.fn(),
	confirmValidationLien: vi.fn(),
	createClient: vi.fn(() => ({})),
	mockEnv: {} as Record<string, string | undefined>,
}));

vi.mock('$env/dynamic/private', () => ({ env: mockEnv }));
vi.mock('$lib/server/supabase', () => ({ createSupabaseServiceClient: () => createClient() }));
vi.mock('$lib/server/validation-campagne', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/validation-campagne')>(
		'$lib/server/validation-campagne'
	);
	return { ...actual, resolveValidationToken, confirmValidationLien };
});

import { POST } from './+server';

const TOKEN = 'A'.repeat(43);

function call() {
	return POST({ params: { token: TOKEN } } as unknown as Parameters<typeof POST>[0]);
}

beforeEach(() => {
	for (const k of Object.keys(mockEnv)) delete mockEnv[k];
	createClient.mockClear();
	resolveValidationToken.mockReset();
	confirmValidationLien.mockReset();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST confirmer - kill-switch', () => {
	it('VALIDATION_EXTERNE_ENABLED=0 → 410 SANS aucune requête DB (ni client, ni résolution, ni écriture)', async () => {
		mockEnv.VALIDATION_EXTERNE_ENABLED = '0';
		const res = await call();
		expect(res.status).toBe(410);
		expect(createClient).not.toHaveBeenCalled();
		expect(resolveValidationToken).not.toHaveBeenCalled();
		expect(confirmValidationLien).not.toHaveBeenCalled();
	});
});

describe('POST confirmer - résolution du token', () => {
	it('token inconnu → 404, 0 écriture', async () => {
		resolveValidationToken.mockResolvedValue({ status: 'introuvable' });
		const res = await call();
		expect(res.status).toBe(404);
		expect(confirmValidationLien).not.toHaveBeenCalled();
	});

	it('lien révoqué/expiré → 410, 0 écriture (une confirmation ne survit pas à la révocation)', async () => {
		resolveValidationToken.mockResolvedValue({ status: 'expire' });
		const res = await call();
		expect(res.status).toBe(410);
		expect(confirmValidationLien).not.toHaveBeenCalled();
	});

	it('erreur DB de résolution → 500 (jamais présenté comme lien invalide)', async () => {
		resolveValidationToken.mockResolvedValue({ status: 'db', message: 'boom' });
		const res = await call();
		expect(res.status).toBe(500);
		expect(confirmValidationLien).not.toHaveBeenCalled();
	});
});

describe('POST confirmer - écriture', () => {
	beforeEach(() => {
		resolveValidationToken.mockResolvedValue({
			status: 'ok',
			lienId: 'lien-1',
			campagneId: 'cmp-A',
			expiresAt: 'x',
			confirmedAt: null,
		});
	});

	it('happy path → 200 { ok, confirmedAt }, écriture sur LE lien résolu uniquement', async () => {
		confirmValidationLien.mockResolvedValue({ confirmedAt: '2026-07-03T10:00:00.000Z', error: null });
		const res = await call();
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true, confirmedAt: '2026-07-03T10:00:00.000Z' });
		expect(confirmValidationLien).toHaveBeenCalledWith(expect.anything(), 'lien-1');
	});

	it('renvoi après changement d’avis → même chemin, l’horodatage est simplement mis à jour', async () => {
		resolveValidationToken.mockResolvedValue({
			status: 'ok',
			lienId: 'lien-1',
			campagneId: 'cmp-A',
			expiresAt: 'x',
			confirmedAt: '2026-07-03T09:00:00.000Z',
		});
		confirmValidationLien.mockResolvedValue({ confirmedAt: '2026-07-03T11:00:00.000Z', error: null });
		const res = await call();
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true, confirmedAt: '2026-07-03T11:00:00.000Z' });
	});

	it('erreur DB d’écriture → 500', async () => {
		confirmValidationLien.mockResolvedValue({ confirmedAt: null, error: { message: 'boom' } });
		const res = await call();
		expect(res.status).toBe(500);
	});
});
