import { describe, it, expect, vi, afterEach } from 'vitest';
import { runDailyDigest } from './run';
import type { EmailDailyConfig } from './config';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';

const ENABLED: EmailDailyConfig = {
	enabled: true,
	apiKey: 're_test',
	to: ['pascal@filmpro.ch', 'antoine@filmpro.ch'],
	from: 'FilmPro CRM <noreply@filmpro.ch>'
};

/** Mock : un résultat par appel `.from()` (today puis late), proxy thenable. */
function makeSupabaseMock(results: Array<{ data: unknown; count?: number | null; error: unknown }>) {
	const calls: { method: string; args: unknown[] }[] = [];
	let idx = 0;
	const supabase = {
		from: (t: string) => {
			calls.push({ method: 'from', args: [t] });
			const result = results[idx++] ?? { data: [], count: 0, error: null };
			const proxy: unknown = new Proxy(
				{},
				{
					get(_t, prop: string) {
						if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(result);
						return (...args: unknown[]) => {
							calls.push({ method: prop, args });
							return proxy;
						};
					}
				}
			);
			return proxy;
		}
	} as unknown as SupabaseClient<Database>;
	return { supabase, calls };
}

const NOW = new Date('2026-06-26T05:00:00Z');

const row = (id: string, date: string) => ({
	id,
	titre: id,
	etape_pipeline: null,
	date_relance_prevue: date,
	entreprise: null
});

describe('runDailyDigest - gate (cost zéro, OFF par défaut)', () => {
	afterEach(() => vi.restoreAllMocks());

	it('gate OFF -> skip sans toucher la DB ni envoyer', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		const { supabase, calls } = makeSupabaseMock([]);
		const r = await runDailyDigest(supabase, { ...ENABLED, enabled: false }, NOW);
		expect(r.skipped).toBe(true);
		expect(r.sent).toBe(false);
		expect(r.reason).toContain('EMAIL_DAILY_ENABLED=false');
		expect(calls.length).toBe(0);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('apiKey absente (enabled) -> skip sans DB ni envoi', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		const { supabase, calls } = makeSupabaseMock([]);
		const r = await runDailyDigest(supabase, { ...ENABLED, apiKey: undefined }, NOW);
		expect(r.skipped).toBe(true);
		expect(r.reason).toContain('RESEND_API_KEY manquante');
		expect(calls.length).toBe(0);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('aucun destinataire -> skip sans DB', async () => {
		const { supabase, calls } = makeSupabaseMock([]);
		const r = await runDailyDigest(supabase, { ...ENABLED, to: [] }, NOW);
		expect(r.skipped).toBe(true);
		expect(calls.length).toBe(0);
	});
});

describe('runDailyDigest - exécution', () => {
	afterEach(() => vi.restoreAllMocks());

	it('cas vide (0 relance) -> skip volontaire, aucun envoi', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		const { supabase } = makeSupabaseMock([
			{ data: [], count: 0, error: null },
			{ data: [], count: 0, error: null }
		]);
		const r = await runDailyDigest(supabase, ENABLED, NOW);
		expect(r.skipped).toBe(true);
		expect(r.sent).toBe(false);
		expect(r.reason).toContain("rien d'urgent");
		expect(r.counts).toEqual({ today: 0, late: 0 });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('relances présentes -> envoi + compteurs EXACTS (totaux, pas la slice)', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'daily-x' }) });
		vi.stubGlobal('fetch', fetchMock);
		const { supabase } = makeSupabaseMock([
			{ data: [row('a', '2026-06-26T08:00:00+00:00')], count: 4, error: null }, // today : 1 affichée, 4 total
			{ data: [row('b', '2026-06-24T00:00:00+00:00')], count: 12, error: null } // late : 1 affichée, 12 total
		]);
		const r = await runDailyDigest(supabase, ENABLED, NOW);
		expect(r.sent).toBe(true);
		expect(r.counts).toEqual({ today: 4, late: 12 });
		expect(r.resendId).toBe('daily-x');
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('erreur DB -> PANNE (skipped:false), pas de throw, pas d\'envoi', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		const { supabase } = makeSupabaseMock([
			{ data: null, count: null, error: { message: 'db down' } },
			{ data: [], count: 0, error: null }
		]);
		const r = await runDailyDigest(supabase, ENABLED, NOW);
		expect(r.sent).toBe(false);
		expect(r.skipped).toBe(false); // panne, pas un skip volontaire
		expect(r.reason).toContain('db down');
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
