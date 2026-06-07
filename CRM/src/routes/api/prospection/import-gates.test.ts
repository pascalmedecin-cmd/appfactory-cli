import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * V5 (2026-06-07) : gates serveur des imports de masse (defense-in-depth — la coupe n'est
 * pas seulement UI). Les sources simap/regbl et l'enrichissement batch sont désactivés dans
 * `config.prospection` (état prod V5), donc ces endpoints répondent « désactivé » sans aucun
 * appel réseau externe. Le test s'appuie sur la config RÉELLE (pas de mock du flag).
 */

vi.mock('$env/dynamic/private', () => ({
	env: { ZEFIX_USERNAME: 'u', ZEFIX_PASSWORD: 'p', SEARCH_CH_API_KEY: 'k' },
}));
vi.mock('$lib/server/intelligence/signal-lookup', () => ({ fetchIntelligenceSignalLookup: vi.fn(async () => null) }));
vi.mock('$lib/server/intelligence/link-import-signal', () => ({ linkImportSignals: vi.fn(async () => undefined) }));

import { POST as simapPOST } from './simap/+server';
import { POST as regblPOST } from './regbl/+server';
import { POST as batchPOST } from './enrichir-batch/+server';

function makeEvent(body: unknown) {
	return {
		request: { json: async () => body },
		locals: {
			supabase: {},
			safeGetSession: async () => ({ session: { user: { email: 'a@filmpro.ch' } }, user: { email: 'a@filmpro.ch' } }),
		},
	} as never;
}

describe('Gates imports de masse Prospection V5 (config réelle désactivée)', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		// Toute tentative d'appel réseau ferait échouer le test : on prouve qu'aucun n'a lieu.
		vi.stubGlobal('fetch', vi.fn(() => { throw new Error('fetch ne doit jamais être appelé (source désactivée)'); }));
	});

	it('SIMAP import → 403 désactivé, aucun fetch', async () => {
		const res = await simapPOST(makeEvent({ canton: 'GE' }));
		expect(res.status).toBe(403);
		expect((fetch as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
	});

	it('RegBL import → 403 désactivé, aucun fetch', async () => {
		const res = await regblPOST(makeEvent({ cantons: ['GE'], limit: 10 }));
		expect(res.status).toBe(403);
		expect((fetch as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
	});

	it('Enrichissement batch → 403 désactivé, aucun fetch', async () => {
		const res = await batchPOST(makeEvent({ lead_ids: ['x'], sources: ['search_ch'] }));
		expect(res.status).toBe(403);
		expect((fetch as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
	});
});
