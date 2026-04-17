import { describe, it, expect, beforeEach } from 'vitest';
import { CostTracker } from './cost-tracker';
import type Anthropic from '@anthropic-ai/sdk';

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

describe('CostTracker - addFalCall', () => {
	let tracker: CostTracker;
	beforeEach(() => {
		tracker = new CostTracker();
	});

	it('calcule coût Flux 1.1 Pro Ultra', () => {
		tracker.addFalCall('flux-1.1-pro-ultra', 'fallback', 3);
		const { total_usd } = tracker.summary();
		// 3 × $0.06 = $0.18
		expect(total_usd).toBeCloseTo(0.18, 4);
	});

	it('agrège count par (label, model)', () => {
		tracker.addFalCall('flux-1.1-pro-ultra', 'fallback', 2);
		tracker.addFalCall('flux-1.1-pro-ultra', 'fallback', 1);
		const { breakdown } = tracker.summary();
		expect(breakdown).toHaveLength(1);
		const e = breakdown[0] as Extract<(typeof breakdown)[0], { kind: 'fal' }>;
		expect(e.count).toBe(3);
	});

	it('count=1 par défaut', () => {
		tracker.addFalCall('flux-1.1-pro-ultra', 'fallback');
		const { breakdown } = tracker.summary();
		const e = breakdown[0] as Extract<(typeof breakdown)[0], { kind: 'fal' }>;
		expect(e.count).toBe(1);
	});

	it('model fal inconnu → coût 0', () => {
		tracker.addFalCall('unknown-model', 'fallback', 5);
		const { total_usd } = tracker.summary();
		expect(total_usd).toBe(0);
	});
});

describe('CostTracker - reset et mix', () => {
	let tracker: CostTracker;
	beforeEach(() => {
		tracker = new CostTracker();
	});

	it('reset() vide les entrées', () => {
		tracker.addClaudeCall('claude-opus-4-7', usage(1000, 100), 'Phase 1');
		tracker.addFalCall('flux-1.1-pro-ultra', 'fallback', 2);
		tracker.reset();
		const { breakdown, total_usd } = tracker.summary();
		expect(breakdown).toHaveLength(0);
		expect(total_usd).toBe(0);
	});

	it('mix Claude + fal.ai additionne correctement', () => {
		tracker.addClaudeCall('claude-sonnet-4-6', usage(100_000, 10_000), 'brief');
		tracker.addFalCall('flux-1.1-pro-ultra', 'fallback', 2);
		const { breakdown, total_usd } = tracker.summary();
		expect(breakdown).toHaveLength(2);
		// Claude : 100K × $3 + 10K × $15 = 0.3 + 0.15 = $0.45
		// Fal : 2 × $0.06 = $0.12
		// Total : $0.57
		expect(total_usd).toBeCloseTo(0.57, 4);
	});
});
