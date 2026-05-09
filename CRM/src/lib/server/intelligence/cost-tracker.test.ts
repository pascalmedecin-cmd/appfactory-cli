import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CostTracker } from './cost-tracker';
import type Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Helper pour construire un objet Usage minimal. */
function usage(input: number, output: number, cacheRead = 0, cacheCreation = 0): Anthropic.Usage {
	return {
		input_tokens: input,
		output_tokens: output,
		cache_read_input_tokens: cacheRead,
		cache_creation_input_tokens: cacheCreation
	} as unknown as Anthropic.Usage;
}

describe('CostTracker - addClaudeCall', () => {
	let tracker: CostTracker;
	beforeEach(() => {
		tracker = new CostTracker();
	});

	it('calcule coût Opus 4.7 sur input+output uncached', () => {
		tracker.addClaudeCall('claude-opus-4-7', usage(1_000_000, 100_000), 'Phase 1');
		const { breakdown, total_usd } = tracker.summary();
		expect(breakdown).toHaveLength(1);
		// 1M input × $5 + 100K output × $25 = 5 + 2.5 = $7.5
		expect(total_usd).toBeCloseTo(7.5, 4);
	});

	it('calcule coût Sonnet 4.6 correctement', () => {
		tracker.addClaudeCall('claude-sonnet-4-6', usage(500_000, 50_000), 'brief');
		const { total_usd } = tracker.summary();
		// 500K × $3 + 50K × $15 = 1.5 + 0.75 = $2.25
		expect(total_usd).toBeCloseTo(2.25, 4);
	});

	it('applique multiplicateur 0.1x sur cache_read', () => {
		tracker.addClaudeCall('claude-opus-4-7', usage(0, 0, 1_000_000, 0), 'cached');
		const { total_usd } = tracker.summary();
		// 1M cache_read × $5 × 0.1 = $0.5
		expect(total_usd).toBeCloseTo(0.5, 4);
	});

	it('applique multiplicateur 1.25x sur cache_creation', () => {
		tracker.addClaudeCall('claude-opus-4-7', usage(0, 0, 0, 1_000_000), 'first');
		const { total_usd } = tracker.summary();
		// 1M cache_creation × $5 × 1.25 = $6.25
		expect(total_usd).toBeCloseTo(6.25, 4);
	});

	it('agrège appels avec même label + model', () => {
		tracker.addClaudeCall('claude-sonnet-4-6', usage(100_000, 10_000), 'brief');
		tracker.addClaudeCall('claude-sonnet-4-6', usage(200_000, 20_000), 'brief');
		const { breakdown } = tracker.summary();
		expect(breakdown).toHaveLength(1);
		const e = breakdown[0] as Extract<(typeof breakdown)[0], { kind: 'claude' }>;
		expect(e.input_tokens).toBe(300_000);
		expect(e.output_tokens).toBe(30_000);
	});

	it('sépare entrées avec label différent', () => {
		tracker.addClaudeCall('claude-sonnet-4-6', usage(100_000, 10_000), 'brief');
		tracker.addClaudeCall('claude-sonnet-4-6', usage(100_000, 10_000), 'vision');
		const { breakdown } = tracker.summary();
		expect(breakdown).toHaveLength(2);
	});

	it('conversion EUR appliquée (taux 0.92)', () => {
		tracker.addClaudeCall('claude-opus-4-7', usage(1_000_000, 0), 'Phase 1');
		const { total_usd, total_eur } = tracker.summary();
		expect(total_eur).toBeCloseTo(total_usd * 0.92, 4);
	});

	it('usage.input_tokens=null → traité comme 0', () => {
		const u = { input_tokens: null, output_tokens: 100 } as unknown as Anthropic.Usage;
		tracker.addClaudeCall('claude-opus-4-7', u, 'edge');
		const { total_usd } = tracker.summary();
		// 100 output × $25 / 1M = $0.0025
		expect(total_usd).toBeCloseTo(0.0025, 6);
	});

	it('model inconnu → coût 0 (graceful)', () => {
		tracker.addClaudeCall('claude-unknown-model', usage(1_000_000, 1_000_000), 'test');
		const { total_usd } = tracker.summary();
		expect(total_usd).toBe(0);
	});
});

describe('CostTracker - reset', () => {
	let tracker: CostTracker;
	beforeEach(() => {
		tracker = new CostTracker();
	});

	it('reset() vide les entrées', () => {
		tracker.addClaudeCall('claude-opus-4-7', usage(1000, 100), 'Phase 1');
		tracker.reset();
		const { breakdown, total_usd } = tracker.summary();
		expect(breakdown).toHaveLength(0);
		expect(total_usd).toBe(0);
	});
});

describe('CostTracker - persist', () => {
	let tracker: CostTracker;
	let upsertCalls: Array<{ values: Record<string, unknown>; options?: Record<string, unknown> }>;
	let upsertError: { message: string } | null;
	let supabaseMock: SupabaseClient;

	beforeEach(() => {
		tracker = new CostTracker();
		upsertCalls = [];
		upsertError = null;
		supabaseMock = {
			from: vi.fn().mockImplementation((_table: string) => ({
				upsert: vi.fn().mockImplementation(
					(values: Record<string, unknown>, options?: Record<string, unknown>) => {
						upsertCalls.push({ values, options });
						return Promise.resolve({ error: upsertError });
					}
				)
			}))
		} as unknown as SupabaseClient;
	});

	it('UPSERT cost_audit_runs avec totals agrégés et breakdown JSONB', async () => {
		tracker.addClaudeCall('claude-opus-4-7', usage(100_000, 10_000), 'Phase 1');
		tracker.addClaudeCall('claude-opus-4-7', usage(50_000, 5_000, 200_000, 30_000), 'Phase 2');

		const result = await tracker.persist(supabaseMock, {
			runId: 'veille-2026-W19-test',
			feature: 'veille',
			status: 'success',
			startedAt: '2026-05-09T10:00:00.000Z',
			finishedAt: '2026-05-09T10:08:30.000Z'
		});

		expect(result.ok).toBe(true);
		expect(supabaseMock.from).toHaveBeenCalledWith('cost_audit_runs');
		expect(upsertCalls).toHaveLength(1);
		const v = upsertCalls[0]!.values;
		expect(v.run_id).toBe('veille-2026-W19-test');
		expect(v.feature).toBe('veille');
		expect(v.status).toBe('success');
		expect(v.model).toBe('claude-opus-4-7');
		expect(v.total_input_tokens).toBe(150_000);
		expect(v.total_output_tokens).toBe(15_000);
		expect(v.total_cache_read_tokens).toBe(200_000);
		expect(v.total_cache_creation_tokens).toBe(30_000);
		expect(v.duration_seconds).toBe(510);
		expect(v.error_message).toBeNull();
		expect(Array.isArray(v.breakdown)).toBe(true);
		expect((v.breakdown as unknown[])).toHaveLength(2);
		expect(upsertCalls[0]!.options).toEqual({ onConflict: 'run_id' });
	});

	it('persist sur tracker vide → model=n/a + totals zéro (run échoué très tôt)', async () => {
		const result = await tracker.persist(supabaseMock, {
			runId: 'veille-2026-W19-fail-early',
			feature: 'veille',
			status: 'error',
			startedAt: '2026-05-09T10:00:00.000Z',
			errorMessage: 'ANTHROPIC_API_KEY manquante'
		});

		expect(result.ok).toBe(true);
		const v = upsertCalls[0]!.values;
		expect(v.model).toBe('n/a');
		expect(v.total_usd).toBe(0);
		expect(v.total_eur).toBe(0);
		expect(v.error_message).toBe('ANTHROPIC_API_KEY manquante');
		expect(v.status).toBe('error');
	});

	it('finishedAt absent → utilise now() au moment de persist', async () => {
		const before = Date.now();
		await tracker.persist(supabaseMock, {
			runId: 'veille-2026-W19-no-finish',
			feature: 'veille',
			status: 'success',
			startedAt: new Date(before - 5000).toISOString()
		});
		const after = Date.now();
		const finishedAt = upsertCalls[0]!.values.finished_at as string;
		const ts = Date.parse(finishedAt);
		expect(ts).toBeGreaterThanOrEqual(before);
		expect(ts).toBeLessThanOrEqual(after);
	});

	it('erreur DB → retourne ok:false sans propager', async () => {
		upsertError = { message: 'duplicate key violates unique constraint' };
		const result = await tracker.persist(supabaseMock, {
			runId: 'veille-2026-W19-dup',
			feature: 'veille',
			status: 'success',
			startedAt: '2026-05-09T10:00:00.000Z'
		});
		expect(result.ok).toBe(false);
		expect(result.error).toContain('duplicate key');
	});

	it('exception throw côté supabase → retourne ok:false sans propager', async () => {
		const throwingSupabase = {
			from: () => ({
				upsert: () => {
					throw new Error('connection lost');
				}
			})
		} as unknown as SupabaseClient;
		const result = await tracker.persist(throwingSupabase, {
			runId: 'veille-2026-W19-net-fail',
			feature: 'veille',
			status: 'success',
			startedAt: '2026-05-09T10:00:00.000Z'
		});
		expect(result.ok).toBe(false);
		expect(result.error).toBe('connection lost');
	});

	it('UPSERT idempotent : 2 appels persist consécutifs avec même runId envoient même clé', async () => {
		const meta = {
			runId: 'veille-2026-W19-idempotent',
			feature: 'veille' as const,
			status: 'success' as const,
			startedAt: '2026-05-09T10:00:00.000Z'
		};
		await tracker.persist(supabaseMock, meta);
		tracker.addClaudeCall('claude-opus-4-7', usage(100, 10), 'late');
		await tracker.persist(supabaseMock, meta);
		expect(upsertCalls).toHaveLength(2);
		expect(upsertCalls[0]!.values.run_id).toBe(upsertCalls[1]!.values.run_id);
		expect(upsertCalls[0]!.options).toEqual({ onConflict: 'run_id' });
		expect(upsertCalls[1]!.options).toEqual({ onConflict: 'run_id' });
	});
});
