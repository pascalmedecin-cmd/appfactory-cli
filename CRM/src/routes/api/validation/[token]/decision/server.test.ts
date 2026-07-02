import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * POST /api/validation/[token]/decision - route PUBLIQUE (definition of done sécurité).
 * Couvre : kill-switch (410, ZÉRO requête DB), 404 token inconnu, 410 lien révoqué/expiré avec
 * 0 écriture, 409 isolation cross-campagne / prospect absent avec 0 écriture, 400 body invalide,
 * 200 happy path, 500 erreurs DB.
 */
const { resolveValidationToken, setValidationDecision, createClient, mockEnv } = vi.hoisted(() => ({
	resolveValidationToken: vi.fn(),
	setValidationDecision: vi.fn(),
	createClient: vi.fn(() => ({})),
	mockEnv: {} as Record<string, string | undefined>,
}));

vi.mock('$env/dynamic/private', () => ({ env: mockEnv }));
vi.mock('$lib/server/supabase', () => ({ createSupabaseServiceClient: () => createClient() }));
vi.mock('$lib/server/validation-campagne', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/validation-campagne')>(
		'$lib/server/validation-campagne'
	);
	return { ...actual, resolveValidationToken, setValidationDecision };
});

import { POST } from './+server';

const UUID = '11111111-1111-4111-8111-111111111111';
const TOKEN = 'A'.repeat(43);

function call(body: unknown) {
	return POST({
		params: { token: TOKEN },
		request: { json: async () => body },
	} as unknown as Parameters<typeof POST>[0]);
}

beforeEach(() => {
	for (const k of Object.keys(mockEnv)) delete mockEnv[k];
	createClient.mockClear();
	resolveValidationToken.mockReset();
	setValidationDecision.mockReset();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST decision - kill-switch', () => {
	it('VALIDATION_EXTERNE_ENABLED=0 → 410 SANS aucune requête DB (ni client, ni résolution, ni écriture)', async () => {
		mockEnv.VALIDATION_EXTERNE_ENABLED = '0';
		const res = await call({ leadId: UUID, statut: 'garder' });
		expect(res.status).toBe(410);
		expect(createClient).not.toHaveBeenCalled();
		expect(resolveValidationToken).not.toHaveBeenCalled();
		expect(setValidationDecision).not.toHaveBeenCalled();
	});
});

describe('POST decision - résolution du token', () => {
	it('token inconnu → 404, 0 écriture', async () => {
		resolveValidationToken.mockResolvedValue({ status: 'introuvable' });
		const res = await call({ leadId: UUID, statut: 'garder' });
		expect(res.status).toBe(404);
		expect(setValidationDecision).not.toHaveBeenCalled();
	});

	it('lien révoqué/expiré → 410, 0 écriture (refus d’écriture après révocation OU expiration)', async () => {
		resolveValidationToken.mockResolvedValue({ status: 'expire' });
		const res = await call({ leadId: UUID, statut: 'retirer' });
		expect(res.status).toBe(410);
		expect(setValidationDecision).not.toHaveBeenCalled();
	});

	it('erreur DB de résolution → 500 (jamais présenté comme lien invalide)', async () => {
		resolveValidationToken.mockResolvedValue({ status: 'db', message: 'boom' });
		const res = await call({ leadId: UUID, statut: 'garder' });
		expect(res.status).toBe(500);
		expect(setValidationDecision).not.toHaveBeenCalled();
	});
});

describe('POST decision - corps + écriture', () => {
	beforeEach(() => {
		resolveValidationToken.mockResolvedValue({ status: 'ok', campagneId: 'cmp-A', expiresAt: 'x' });
	});

	it('body invalide (leadId non-uuid) → 400, 0 écriture', async () => {
		const res = await call({ leadId: 'pas-un-uuid', statut: 'garder' });
		expect(res.status).toBe(400);
		expect(setValidationDecision).not.toHaveBeenCalled();
	});

	it('body invalide (statut hors enum) → 400', async () => {
		const res = await call({ leadId: UUID, statut: 'peut-etre' });
		expect(res.status).toBe(400);
	});

	it('isolation cross-campagne / prospect absent (notFound) → 409, 0 ligne modifiée', async () => {
		// Le token résout la campagne A ; setValidationDecision filtre par campagne_id ET lead_id →
		// un leadId hors de A ne touche AUCUNE ligne (count 0) -> notFound -> 409.
		setValidationDecision.mockResolvedValue({ notFound: true, error: null });
		const res = await call({ leadId: UUID, statut: 'garder' });
		expect(res.status).toBe(409);
		expect(setValidationDecision).toHaveBeenCalledWith(expect.anything(), 'cmp-A', UUID, 'garder');
	});

	it('erreur DB d’écriture → 500', async () => {
		setValidationDecision.mockResolvedValue({ notFound: false, error: { message: 'boom' } });
		const res = await call({ leadId: UUID, statut: 'retirer' });
		expect(res.status).toBe(500);
	});

	it('happy path (garder/retirer/annuler) → 200 { ok: true }', async () => {
		setValidationDecision.mockResolvedValue({ notFound: false, error: null });
		for (const statut of ['garder', 'retirer', null]) {
			const res = await call({ leadId: UUID, statut });
			expect(res.status).toBe(200);
			expect(await res.json()).toEqual({ ok: true });
		}
	});
});
