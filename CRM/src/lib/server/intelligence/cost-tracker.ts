/**
 * Cost tracker pour le pipeline veille (GitHub Actions workflow `cron-veille`,
 * externalisé S167 — handler Vercel `/api/cron/intelligence` retiré S176ter).
 *
 * Agrège les coûts Claude API (tokens uncached + cache read + cache creation)
 * sur une invocation complète.
 *
 * Pattern : module-level singleton. Une invocation = un reset() au début,
 * collecte progressive pendant, summary() à la fin. Pas thread-safe multi-invocation.
 *
 * Tarifs source : doc Anthropic (platform.claude.com, cache 2026-04-15).
 * Conversion EUR : taux fixe approximatif, valeur indicative, pas comptable.
 */
import type Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeForLog } from './sanitize';

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

export type CostEntry = ClaudeEntry;

export interface CostSummary {
	breakdown: CostEntry[];
	total_usd: number;
	total_eur: number;
}

/** Métadonnées d'un run pour persistance DB. */
export interface PersistMeta {
	/** Clé naturelle stable (ex 'veille-2026-W19-080524'). UPSERT idempotent dessus. */
	runId: string;
	/** Catégorie fonctionnelle pour filtrer le dashboard coûts. */
	feature: 'veille' | 'signaux' | 'autre';
	/** État final du run. partial = succès dégradé (low_volume, etc.). */
	status: 'success' | 'partial' | 'error';
	/** ISO timestamp du début du run. */
	startedAt: string;
	/** ISO timestamp de fin. Si absent, now() au moment de persist(). */
	finishedAt?: string;
	/** Message d'erreur si status='error'. */
	errorMessage?: string;
}

export interface PersistResult {
	ok: boolean;
	error?: string;
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

	summary(): CostSummary {
		const total_usd = this.entries.reduce((s, e) => s + e.usd, 0);
		return {
			breakdown: [...this.entries],
			total_usd,
			total_eur: total_usd * USD_TO_EUR
		};
	}

	/**
	 * Persiste le snapshot courant dans la table `cost_audit_runs`.
	 *
	 * UPSERT idempotent sur `run_id` (re-run du même runId écrase la ligne).
	 * Best-effort : encapsule toute exception et la retourne en `ok:false` au
	 * lieu de propager. Le pipeline veille appelle cette méthode en fin de run
	 * pour alimenter le dashboard /dashboard/couts.
	 *
	 * Le client supabase doit être un service-role client (RLS bypass) car la
	 * table n'a aucune policy INSERT.
	 */
	async persist(supabase: SupabaseClient, meta: PersistMeta): Promise<PersistResult> {
		const summary = this.summary();
		const totals = summary.breakdown.reduce(
			(acc, e) => ({
				input: acc.input + (e.kind === 'claude' ? e.input_tokens : 0),
				output: acc.output + (e.kind === 'claude' ? e.output_tokens : 0),
				cacheRead: acc.cacheRead + (e.kind === 'claude' ? e.cache_read_tokens : 0),
				cacheCreation: acc.cacheCreation + (e.kind === 'claude' ? e.cache_creation_tokens : 0)
			}),
			{ input: 0, output: 0, cacheRead: 0, cacheCreation: 0 }
		);

		const finishedAt = meta.finishedAt ?? new Date().toISOString();
		const startedTs = Date.parse(meta.startedAt);
		const finishedTs = Date.parse(finishedAt);
		const durationSeconds =
			Number.isFinite(startedTs) && Number.isFinite(finishedTs)
				? Math.max(0, Math.round((finishedTs - startedTs) / 1000))
				: null;

		// Premier model rencontré dans breakdown comme « modèle principal » du run.
		// Si breakdown vide (run échoué très tôt) : 'n/a' pour respecter NOT NULL.
		const model =
			summary.breakdown.find((e): e is ClaudeEntry => e.kind === 'claude')?.model ?? 'n/a';

		// Defense-in-depth (audit S177 Info #1) : sanitize errorMessage avant
		// persistance même si l'appelant l'a déjà fait. La colonne est RLS-lisible
		// par tout user @filmpro.ch, donc tout API key / URL interne / token qui
		// fuiterait dans un message d'exception serait visible côté UI dashboard.
		// Pattern aligné sur run-generation.markError + email-recap.
		const sanitizedError = meta.errorMessage ? sanitizeForLog(meta.errorMessage) : null;

		try {
			const { error } = await supabase.from('cost_audit_runs').upsert(
				{
					run_id: meta.runId,
					feature: meta.feature,
					model,
					status: meta.status,
					started_at: meta.startedAt,
					finished_at: finishedAt,
					duration_seconds: durationSeconds,
					total_input_tokens: totals.input,
					total_output_tokens: totals.output,
					total_cache_read_tokens: totals.cacheRead,
					total_cache_creation_tokens: totals.cacheCreation,
					total_usd: summary.total_usd,
					total_eur: summary.total_eur,
					breakdown: summary.breakdown,
					error_message: sanitizedError
				},
				{ onConflict: 'run_id' }
			);
			if (error) {
				return { ok: false, error: error.message };
			}
			return { ok: true };
		} catch (e) {
			return { ok: false, error: e instanceof Error ? e.message : String(e) };
		}
	}
}

// Singleton module-level : une invocation cron = un usage complet.
export const costTracker = new CostTracker();
