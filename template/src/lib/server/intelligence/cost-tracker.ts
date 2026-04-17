/**
 * Cost tracker pour le pipeline veille (cron /api/cron/intelligence).
 *
 * Agrège les coûts Claude API (tokens uncached + cache read + cache creation)
 * et fal.ai (count × tarif unitaire) sur une invocation complète.
 *
 * Pattern : module-level singleton. Une invocation cron = un reset() au début,
 * collecte progressive pendant, summary() à la fin. Pas thread-safe multi-invocation.
 *
 * Tarifs source : doc Anthropic (platform.claude.com, cache 2026-04-15).
 * Conversion EUR : taux fixe approximatif — valeur indicative, pas comptable.
 */
import type Anthropic from '@anthropic-ai/sdk';

// ---------- Tarifs ----------

/** Prix par million de tokens input (uncached). */
const INPUT_USD_PER_M: Record<string, number> = {
	'claude-opus-4-7': 5.0,
	'claude-opus-4-6': 5.0,
	'claude-sonnet-4-6': 3.0,
	'claude-haiku-4-5': 1.0
};

/** Prix par million de tokens output. */
const OUTPUT_USD_PER_M: Record<string, number> = {
	'claude-opus-4-7': 25.0,
	'claude-opus-4-6': 25.0,
	'claude-sonnet-4-6': 15.0,
	'claude-haiku-4-5': 5.0
};

/** Multiplicateur cache write (5 min TTL, ephemeral). */
const CACHE_WRITE_MULTIPLIER = 1.25;

/** Multiplicateur cache read. */
const CACHE_READ_MULTIPLIER = 0.1;

/** Prix fal.ai par modèle (USD / image). */
const FAL_USD_PER_IMAGE: Record<string, number> = {
	'flux-1.1-pro-ultra': 0.06,
	'recraft-v3': 0.04
};

/** Taux de conversion USD → EUR (approximatif, à actualiser si besoin). */
const USD_TO_EUR = 0.92;

// ---------- Types publics ----------

export interface ClaudeEntry {
	kind: 'claude';
	label: string;
	model: string;
	input_tokens: number;
	output_tokens: number;
	cache_read_tokens: number;
	cache_creation_tokens: number;
	usd: number;
	eur: number;
}

export interface FalEntry {
	kind: 'fal';
	label: string;
	model: string;
	count: number;
	usd: number;
	eur: number;
}

export type CostEntry = ClaudeEntry | FalEntry;

export interface CostSummary {
	breakdown: CostEntry[];
	total_usd: number;
	total_eur: number;
}

// ---------- Class ----------

export class CostTracker {
	private entries: CostEntry[] = [];

	reset(): void {
		this.entries = [];
	}

	/**
	 * Enregistre un appel Claude API. Fusionne les entrées avec le même
	 * `label` + `model` (agrégation N appels identiques).
	 */
	addClaudeCall(model: string, usage: Anthropic.Usage, label: string): void {
		const input = usage.input_tokens ?? 0;
		const output = usage.output_tokens ?? 0;
		const cacheRead = usage.cache_read_input_tokens ?? 0;
		const cacheCreation = usage.cache_creation_input_tokens ?? 0;

		const inputRate = INPUT_USD_PER_M[model] ?? 0;
		const outputRate = OUTPUT_USD_PER_M[model] ?? 0;

		const usd =
			(input * inputRate) / 1_000_000 +
			(output * outputRate) / 1_000_000 +
			(cacheRead * CACHE_READ_MULTIPLIER * inputRate) / 1_000_000 +
			(cacheCreation * CACHE_WRITE_MULTIPLIER * inputRate) / 1_000_000;

		const existing = this.entries.find(
			(e): e is ClaudeEntry =>
				e.kind === 'claude' && e.label === label && e.model === model
		);

		if (existing) {
			existing.input_tokens += input;
			existing.output_tokens += output;
			existing.cache_read_tokens += cacheRead;
			existing.cache_creation_tokens += cacheCreation;
			existing.usd += usd;
			existing.eur = existing.usd * USD_TO_EUR;
		} else {
			this.entries.push({
				kind: 'claude',
				label,
				model,
				input_tokens: input,
				output_tokens: output,
				cache_read_tokens: cacheRead,
				cache_creation_tokens: cacheCreation,
				usd,
				eur: usd * USD_TO_EUR
			});
		}
	}

	/**
	 * Incrémente le compteur pour un appel fal.ai réussi.
	 * Agrège par (label, model) comme addClaudeCall.
	 */
	addFalCall(model: string, label: string, count = 1): void {
		const rate = FAL_USD_PER_IMAGE[model] ?? 0;
		const usd = count * rate;

		const existing = this.entries.find(
			(e): e is FalEntry =>
				e.kind === 'fal' && e.label === label && e.model === model
		);

		if (existing) {
			existing.count += count;
			existing.usd += usd;
			existing.eur = existing.usd * USD_TO_EUR;
		} else {
			this.entries.push({
				kind: 'fal',
				label,
				model,
				count,
				usd,
				eur: usd * USD_TO_EUR
			});
		}
	}

	summary(): CostSummary {
		const total_usd = this.entries.reduce((s, e) => s + e.usd, 0);
		return {
			breakdown: [...this.entries],
			total_usd,
			total_eur: total_usd * USD_TO_EUR
		};
	}
}

// Singleton module-level : une invocation cron = un usage complet.
export const costTracker = new CostTracker();
