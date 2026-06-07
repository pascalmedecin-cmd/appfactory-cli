import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * V5 (2026-06-07) : les alertes (recherches sauvegardées avec alerte active) relèvent de
 * l'acquisition de masse, retirée du CRM. Le cron court-circuite quand
 * `config.prospection.features.alerts` est OFF (état prod V5) : 200, aucun accès DB, aucun
 * traitement. Réversible via la config. Garde CRON_SECRET inchangée.
 */

const { mockEnv } = vi.hoisted(() => ({
	mockEnv: { CRON_SECRET: 'test-secret' } as Record<string, string | undefined>,
}));
vi.mock('$env/dynamic/private', () => ({ env: mockEnv }));

const createClient = vi.fn();
vi.mock('$lib/server/supabase', () => ({ createSupabaseServiceClient: () => createClient() }));

import { GET } from './+server';

function callGet(authHeader: string | null) {
	const event = {
		request: { headers: { get: (k: string) => (k.toLowerCase() === 'authorization' ? authHeader : null) } },
	} as unknown as Parameters<typeof GET>[0];
	return GET(event);
}

describe('GET /api/cron/alertes', () => {
	beforeEach(() => {
		mockEnv.CRON_SECRET = 'test-secret';
		createClient.mockReset();
		createClient.mockReturnValue({
			from: () => ({ select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }),
		});
	});

	it('401 sans header Authorization', async () => {
		expect((await callGet(null)).status).toBe(401);
	});

	it('V5 : alertes désactivées → court-circuit 200 sans accès DB', async () => {
		const res = await callGet('Bearer test-secret');
		expect(res.status).toBe(200);
		const body = (await res.json()) as Record<string, unknown>;
		expect(JSON.stringify(body)).toContain('désactiv');
		// Le gate précède createSupabaseServiceClient : aucune connexion DB ouverte.
		expect(createClient).not.toHaveBeenCalled();
	});
});
