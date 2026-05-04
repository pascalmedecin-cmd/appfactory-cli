import { env } from '$env/dynamic/private';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import { generateIntelligenceReport } from './generate';
import { currentWeekRange, extendedWindowStart } from './week-utils';
import type { IntelligenceReport } from './schema';
import type { PreviousItem } from './prompt';
import { sendRecapEmail } from './email-recap';
import { applySignalsFromReport } from './apply-signals';

type Supabase = ReturnType<typeof createSupabaseServiceClient>;

export interface RunResult {
	ok: boolean;
	weekLabel: string;
	reportId?: string;
	skipped?: boolean;
	error?: string;
}

const DEFAULT_WINDOW_DAYS = 30;
/** Seuil items en-dessous duquel on déclenche l'alerte « semaine creuse ». */
const SPARSE_WEEK_THRESHOLD = 2;
/** Texte placeholder écrit en DB lors du marquage running (évite NOT NULL sur executive_summary). */
const RUNNING_PLACEHOLDER = 'Run en cours, en attente de publication.';

function logPhase(weekLabel: string, phase: string, extra?: Record<string, unknown>) {
	const ts = new Date().toISOString();
	const ctx = extra ? ` ${JSON.stringify(extra)}` : '';
	console.log(`[veille ${weekLabel}] ${ts} phase=${phase}${ctx}`);
}

/**
 * Marque la semaine en cours `status=running` AU DÉMARRAGE, avant tout appel
 * coûteux. Une ligne `running` orpheline en DB = preuve factuelle qu'un run
 * a démarré et n'a pas atteint la phase de publication (timeout Vercel,
 * exception non capturée, kill SIGKILL). Sans cette trace, un échec amont
 * = aucune ligne en base, aucune alerte (incident W18 du 01/05/2026).
 *
 * Idempotent via UNIQUE(week_label) : si la ligne existe déjà (running de
 * tour précédent ou error), elle est écrasée. Si elle est `published`,
 * l'appelant a déjà court-circuité avant d'arriver ici (cf. idempotence run).
 */
async function markRunning(
	supabase: Supabase,
	weekLabel: string,
	startedAt: string
): Promise<void> {
	const { error } = await supabase
		.from('intelligence_reports')
		.upsert(
			{
				week_label: weekLabel,
				generated_at: startedAt,
				compliance_tag: 'Non exploitable',
				executive_summary: RUNNING_PLACEHOLDER,
				items: [],
				impacts_filmpro: [],
				search_terms: [],
				raw_response: null,
				status: 'running',
				error_message: null
			},
			{ onConflict: 'week_label' }
		);
	if (error) {
		// Ne propage PAS : on log mais on continue. Si le markRunning échoue, on
		// veut quand même tenter la génération. La pire perte = la trace running.
		console.error(`[veille ${weekLabel}] markRunning failed: ${error.message}`);
	} else {
		logPhase(weekLabel, 'running_marked', { startedAt });
	}
}

/**
 * Upsert status=error avec message + envoi de l'email d'alerte échec.
 * Centralise la branche d'erreur historiquement dispersée dans run-generation.
 */
async function markError(
	supabase: Supabase,
	weekLabel: string,
	errorMessage: string,
	rawResponse: unknown,
	costs: Parameters<typeof sendRecapEmail>[0]['data'] extends { costs: infer C } ? C : never
): Promise<string | undefined> {
	// Défense en profondeur : tronquer + masquer tout pattern API key / Bearer
	// résiduel avant stockage. La table intelligence_reports.error_message est
	// lisible par tout user authentifié (RLS authenticated_full_access). Le SDK
	// Anthropic ne leak pas l'API key dans Error.message en pratique, mais un
	// middleware tiers ou un wrapper futur pourrait. Coût ~3 lignes, zéro régression.
	const sanitized = errorMessage
		.slice(0, 500)
		.replace(/sk-ant-[a-zA-Z0-9_-]+/g, '[REDACTED_API_KEY]')
		.replace(/Bearer\s+[a-zA-Z0-9_.-]+/gi, 'Bearer [REDACTED]');

	const { data: errRow } = await supabase
		.from('intelligence_reports')
		.upsert(
			{
				week_label: weekLabel,
				compliance_tag: 'Non exploitable',
				executive_summary: 'Génération échouée, voir error_message.',
				items: [],
				impacts_filmpro: [],
				search_terms: [],
				raw_response: rawResponse ?? null,
				status: 'error',
				error_message: sanitized
			},
			{ onConflict: 'week_label' }
		)
		.select('id')
		.single();

	logPhase(weekLabel, 'error_marked', { errorMessage: sanitized });

	try {
		const result = await sendRecapEmail({
			mode: 'failure',
			data: {
				weekLabel,
				errorMessage: sanitized,
				costs
			}
		});
		if (!result.ok && !result.skipped) {
			console.warn(`[email-recap] failure alert not sent: ${result.reason}`);
		}
	} catch (e) {
		console.error('[email-recap] unexpected error', e);
	}

	return errRow?.id;
}

/**
 * Anti-doublons activé à partir d'un weekLabel seuil (format YYYY-Www).
 * Avant le seuil : skip pour permettre une « édition zéro » sans contrainte.
 * Si VEILLE_ANTI_DOUBLONS_FROM n'est pas défini, anti-doublons toujours actif.
 */
function antiDoublonsActive(currentWeek: string): boolean {
	const seuil = env.VEILLE_ANTI_DOUBLONS_FROM;
	if (!seuil) return true;
	return currentWeek >= seuil;
}

/**
 * Tolérance fenêtre vérification (jours). Default 30 (refonte LEAN S112).
 * Override via env VEILLE_WINDOW_DAYS pour resserrer ou élargir.
 */
function windowDays(): number {
	const v = parseInt(env.VEILLE_WINDOW_DAYS ?? '', 10);
	return Number.isFinite(v) && v > 0 ? v : DEFAULT_WINDOW_DAYS;
}

/**
 * Orchestrateur : calcule la semaine, charge les items des 4 dernières éditions
 * (URL + titre + date) pour anti-doublons intelligent, génère l'édition via Claude
 * 1-phase, valide, insère en DB. Idempotent via contrainte UNIQUE sur week_label
 * (skip si déjà existante et status=published).
 */
export async function runWeeklyGeneration(now: Date = new Date()): Promise<RunResult> {
	const week = currentWeekRange(now);
	const supabase = createSupabaseServiceClient();
	const startedAt = new Date().toISOString();

	logPhase(week.weekLabel, 'start', { now: startedAt });

	// Idempotence : ne pas regénérer si édition déjà publiée cette semaine.
	const { data: existing } = await supabase
		.from('intelligence_reports')
		.select('id, status')
		.eq('week_label', week.weekLabel)
		.maybeSingle();

	if (existing && existing.status === 'published') {
		logPhase(week.weekLabel, 'idempotent_skip', { reportId: existing.id });
		return { ok: true, weekLabel: week.weekLabel, reportId: existing.id, skipped: true };
	}

	// Trace running AVANT tout appel coûteux. Si la suite crash / timeout,
	// la ligne running reste comme preuve factuelle du démarrage. Sans ça,
	// un échec amont = aucune trace en DB (cf. incident W18 01/05/2026).
	await markRunning(supabase, week.weekLabel, startedAt);

	// Wrap try/catch global : toute exception (Anthropic timeout, network,
	// SDK error, etc.) est convertie en upsert status=error + email failure.
	// Plus aucune exception muette qui propagerait sans laisser de trace.
	let gen: Awaited<ReturnType<typeof generateIntelligenceReport>>;
	try {
		// Charge les 4 dernières éditions pour anti-doublons URL+date.
		let previousItems: PreviousItem[] = [];
		if (antiDoublonsActive(week.weekLabel)) {
			const { data: previous } = await supabase
				.from('intelligence_reports')
				.select('week_label, items')
				.eq('status', 'published')
				.order('generated_at', { ascending: false })
				.limit(4);

			for (const r of previous ?? []) {
				const items = r.items as Array<{
					title?: string;
					source?: { url?: string; published_at?: string };
				}> | null;
				for (const it of items ?? []) {
					if (!it.title || !it.source?.url || !it.source?.published_at) continue;
					previousItems.push({
						week_label: r.week_label,
						title: it.title,
						url: it.source.url,
						published_at: it.source.published_at
					});
				}
			}
			logPhase(week.weekLabel, 'previous_loaded', {
				editions: previous?.length ?? 0,
				items: previousItems.length
			});
		}

		const days = windowDays();
		logPhase(week.weekLabel, 'generate_start', { windowDays: days });
		gen = await generateIntelligenceReport({
			weekLabel: week.weekLabel,
			dateStart: week.dateStart,
			dateEnd: week.dateEnd,
			windowStart: extendedWindowStart(week, days),
			windowDays: days,
			previousItems
		});
		logPhase(week.weekLabel, 'generate_done', {
			success: gen.success,
			items: gen.report?.items.length,
			error: gen.error
		});
	} catch (e) {
		// Exception inattendue (réseau, SDK Anthropic, etc.) : convertir en
		// status=error structuré avant de propager le ok:false. Préserve la
		// trace + déclenche l'email d'alerte échec.
		const message = e instanceof Error ? e.message : String(e);
		logPhase(week.weekLabel, 'exception', { message });
		const errId = await markError(supabase, week.weekLabel, `Exception: ${message}`, null, {
			breakdown: [],
			total_usd: 0,
			total_eur: 0
		});
		return {
			ok: false,
			weekLabel: week.weekLabel,
			reportId: errId,
			error: `Exception: ${message}`
		};
	}

	if (!gen.success || !gen.report) {
		const errId = await markError(
			supabase,
			week.weekLabel,
			gen.error ?? 'Erreur inconnue',
			gen.raw,
			gen.costs ?? { breakdown: [], total_usd: 0, total_eur: 0 }
		);
		return {
			ok: false,
			weekLabel: week.weekLabel,
			reportId: errId,
			error: gen.error
		};
	}

	// Insertion / upsert du rapport valide.
	const report: IntelligenceReport = gen.report;
	const { data: inserted, error: insertError } = await supabase
		.from('intelligence_reports')
		.upsert(
			{
				week_label: week.weekLabel,
				generated_at: report.meta.generated_at,
				compliance_tag: report.meta.compliance_tag,
				executive_summary: report.meta.executive_summary,
				items: report.items,
				impacts_filmpro: report.impacts_filmpro,
				// search_terms globaux supprimés depuis la refonte /veille : les termes
				// sont désormais portés par chaque item. La colonne DB est conservée
				// pour rétro-compat lecture des anciennes éditions, nouvelles lignes = [].
				search_terms: [],
				raw_response: gen.raw ?? null,
				status: 'published',
				error_message: null
			},
			{ onConflict: 'week_label' }
		)
		.select('id')
		.single();

	if (insertError || !inserted) {
		// La ligne running pré-existe : la convertir en error pour cohérence.
		const errMsg = `Insert DB échoué : ${insertError?.message ?? 'inconnu'}`;
		const errId = await markError(
			supabase,
			week.weekLabel,
			errMsg,
			gen.raw,
			gen.costs ?? { breakdown: [], total_usd: 0, total_eur: 0 }
		);
		return {
			ok: false,
			weekLabel: week.weekLabel,
			reportId: errId,
			error: errMsg
		};
	}

	logPhase(week.weekLabel, 'published', { reportId: inserted.id, items: report.items.length });

	// Phase C+D : propager les signaux Veille aux leads existants (re-scoring continu
	// + agrégation cross-signaux). Best-effort : un échec ici ne bloque pas l'edition.
	try {
		const applied = await applySignalsFromReport(supabase, inserted.id, report);
		console.log(
			`[veille→prospection] report ${week.weekLabel} : ${applied.insertedSignals} signal(s) lié(s), ${applied.recomputedLeads} lead(s) recalculé(s), ${applied.failedLeads} échec(s).`
		);
	} catch (e) {
		console.error('[veille→prospection] échec apply-signals (non-bloquant)', e);
	}

	// Email récap (best-effort, n'influence pas le retour). Mode `sparse` si édition
	// anormalement maigre (< SPARSE_WEEK_THRESHOLD items) → alerte distincte.
	const isSparse = report.items.length < SPARSE_WEEK_THRESHOLD;
	try {
		const result = await sendRecapEmail({
			mode: isSparse ? 'sparse' : 'success',
			data: {
				weekLabel: week.weekLabel,
				report,
				costs: gen.costs ?? { breakdown: [], total_usd: 0, total_eur: 0 }
			}
		});
		if (!result.ok && !result.skipped) {
			console.warn(
				`[email-recap] ${isSparse ? 'sparse' : 'success'} recap not sent: ${result.reason}`
			);
		}
	} catch (e) {
		console.error('[email-recap] unexpected error', e);
	}

	return { ok: true, weekLabel: week.weekLabel, reportId: inserted.id };
}
