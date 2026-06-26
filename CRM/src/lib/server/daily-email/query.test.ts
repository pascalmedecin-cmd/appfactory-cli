import { describe, it, expect } from 'vitest';
import { fetchDueRelances, DAILY_SECTION_CAP } from './query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';

/**
 * Mock Supabase chainable (Proxy thenable). Chaque appel `.from()` consomme le prochain
 * resultat de la file et renvoie un proxy dont chaque methode renvoie le proxy ; l'`await`
 * final lit `.then` et resout `{ data, count, error }`. Tous les appels de chaine sont
 * enregistres dans `calls` (global, dans l'ordre) pour verifier les deux fenetres.
 * Cf. feedback_supabase_mock_proxy_pattern.
 */
function makeSupabaseMock(results: Array<{ data: unknown; count?: number | null; error: unknown }>) {
	const calls: { method: string; args: unknown[] }[] = [];
	let idx = 0;
	const supabase = {
		from: (table: string) => {
			calls.push({ method: 'from', args: [table] });
			const result = results[idx++] ?? { data: [], count: 0, error: null };
			const proxy: unknown = new Proxy(
				{},
				{
					get(_t, prop: string) {
						if (prop === 'then') {
							return (resolve: (v: unknown) => void) => resolve(result);
						}
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

const row = (id: string, date: string) => ({
	id,
	titre: id,
	etape_pipeline: null,
	date_relance_prevue: date,
	entreprise: null
});

describe('fetchDueRelances - deux fenêtres bornées', () => {
	it("aujourd'hui = [today, demain) ; en retard = < today ; clos exclus ; ordonnée ; limitée", async () => {
		const { supabase, calls } = makeSupabaseMock([
			{ data: [], count: 0, error: null }, // today
			{ data: [], count: 0, error: null } // late
		]);
		await fetchDueRelances(supabase, '2026-06-26');

		const froms = calls.filter((c) => c.method === 'from');
		expect(froms.length).toBe(2);
		expect(froms.every((c) => c.args[0] === 'opportunites')).toBe(true);

		// Fenêtre aujourd'hui : gte today + lt demain
		const gte = calls.filter((c) => c.method === 'gte').map((c) => c.args);
		expect(gte).toContainEqual(['date_relance_prevue', '2026-06-26']);
		const lts = calls.filter((c) => c.method === 'lt').map((c) => c.args);
		expect(lts).toContainEqual(['date_relance_prevue', '2026-06-27']); // demain (today window)
		expect(lts).toContainEqual(['date_relance_prevue', '2026-06-26']); // today (late window)

		// Deals clos exclus, ordonnées, limitées par fenêtre.
		const ors = calls.filter((c) => c.method === 'or');
		expect(ors.length).toBe(2);
		expect(ors.every((c) => String(c.args[0]).includes('etape_pipeline.not.in.(gagne,perdu)'))).toBe(true);
		const limits = calls.filter((c) => c.method === 'limit');
		expect(limits.length).toBe(2);
		expect(limits.every((c) => c.args[0] === DAILY_SECTION_CAP)).toBe(true);
	});

	it('compteurs EXACTS découplés de la slice affichée', async () => {
		const { supabase } = makeSupabaseMock([
			{ data: [row('a', '2026-06-26T08:00:00+00:00')], count: 3, error: null }, // 1 affichée, 3 total
			{ data: [row('b', '2026-06-20T00:00:00+00:00')], count: 40, error: null } // 1 affichée, 40 total
		]);
		const r = await fetchDueRelances(supabase, '2026-06-26');
		expect(r.todayTotal).toBe(3);
		expect(r.lateTotal).toBe(40);
		expect(r.today.length).toBe(1);
		expect(r.late.length).toBe(1);
		expect(r.error).toBeNull();
	});

	it('count null -> retombe sur la longueur de la slice', async () => {
		const { supabase } = makeSupabaseMock([
			{ data: [row('a', '2026-06-26T08:00:00+00:00')], count: null, error: null },
			{ data: [], count: null, error: null }
		]);
		const r = await fetchDueRelances(supabase, '2026-06-26');
		expect(r.todayTotal).toBe(1);
		expect(r.lateTotal).toBe(0);
	});
});

describe('fetchDueRelances - normalisation embed', () => {
	it('entreprise array -> objet ; null/undefined -> null', async () => {
		const { supabase } = makeSupabaseMock([
			{
				data: [
					{ id: '1', titre: 'X', etape_pipeline: null, date_relance_prevue: '2026-06-26T00:00:00+00:00', entreprise: [{ raison_sociale: 'Acme' }] },
					{ id: '2', titre: 'Y', etape_pipeline: null, date_relance_prevue: '2026-06-26T00:00:00+00:00', entreprise: null }
				],
				count: 2,
				error: null
			},
			{ data: [], count: 0, error: null }
		]);
		const r = await fetchDueRelances(supabase, '2026-06-26');
		expect(r.today[0].entreprise).toEqual({ raison_sociale: 'Acme' });
		expect(r.today[1].entreprise).toBeNull();
	});
});

describe('fetchDueRelances - best-effort (jamais de throw)', () => {
	it('erreur {error} structurée -> vide + message', async () => {
		const { supabase } = makeSupabaseMock([
			{ data: null, count: null, error: { message: 'boom' } },
			{ data: [], count: 0, error: null }
		]);
		const r = await fetchDueRelances(supabase, '2026-06-26');
		expect(r.today).toEqual([]);
		expect(r.late).toEqual([]);
		expect(r.todayTotal).toBe(0);
		expect(r.lateTotal).toBe(0);
		expect(r.error).toBe('boom');
	});

	it('promesse REJETÉE (blip réseau) -> vide + message, jamais de throw', async () => {
		const rejecting: unknown = new Proxy(
			{},
			{
				get(_t, prop: string) {
					if (prop === 'then') {
						return (_res: unknown, reject: (e: unknown) => void) => reject(new Error('network down'));
					}
					return () => rejecting;
				}
			}
		);
		const supabase = { from: () => rejecting } as unknown as SupabaseClient<Database>;
		const r = await fetchDueRelances(supabase, '2026-06-26');
		expect(r.error).toContain('network down');
		expect(r.today).toEqual([]);
		expect(r.late).toEqual([]);
	});
});
