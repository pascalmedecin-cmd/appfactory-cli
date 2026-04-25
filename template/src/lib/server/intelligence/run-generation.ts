import { env } from '$env/dynamic/private';
import { createSupabaseServiceClient } from '$lib/server/supabase';
import { generateIntelligenceReport } from './generate';
import { currentWeekRange, extendedWindowStart } from './week-utils';
import type { IntelligenceReport } from './schema';
import type { PreviousItem } from './prompt';
import { sendRecapEmail } from './email-recap';

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

	// Idempotence : ne pas regénérer si édition déjà publiée cette semaine.
	const { data: existing } = await supabase
		.from('intelligence_reports')
		.select('id, status')
		.eq('week_label', week.weekLabel)
		.maybeSingle();

	if (existing && existing.status === 'published') {
		return { ok: true, weekLabel: week.weekLabel, reportId: existing.id, skipped: true };
	}

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
	}

	const days = windowDays();
	const gen = await generateIntelligenceReport({
		weekLabel: week.weekLabel,
		dateStart: week.dateStart,
		dateEnd: week.dateEnd,
		windowStart: extendedWindowStart(week, days),
		windowDays: days,
		previousItems
	});

	if (!gen.success || !gen.report) {
		// Log l'erreur en DB (upsert sur week_label, status=error).
		const { data: errRow } = await supabase
			.from('intelligence_reports')
			.upsert(
				{
					week_label: week.weekLabel,
					compliance_tag: 'Non exploitable',
					executive_summary: 'Génération échouée, voir error_message.',
					items: [],
					impacts_filmpro: [],
					search_terms: [],
					raw_response: gen.raw ?? null,
					status: 'error',
					error_message: gen.error ?? 'Erreur inconnue'
				},
				{ onConflict: 'week_label' }
			)
			.select('id')
			.single();

		// Email alerte échec (best-effort, n'influence pas le retour).
		try {
			const result = await sendRecapEmail({
				mode: 'failure',
				data: {
					weekLabel: week.weekLabel,
					errorMessage: gen.error ?? 'Erreur inconnue',
					costs: gen.costs ?? { breakdown: [], total_usd: 0, total_eur: 0 }
				}
			});
			if (!result.ok && !result.skipped) {
				console.warn(`[email-recap] failure alert not sent: ${result.reason}`);
			}
		} catch (e) {
			console.error('[email-recap] unexpected error', e);
		}

		return {
			ok: false,
			weekLabel: week.weekLabel,
			reportId: errRow?.id,
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
		return {
			ok: false,
			weekLabel: week.weekLabel,
			error: `Insert DB échoué : ${insertError?.message ?? 'inconnu'}`
		};
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
