import { createSupabaseServiceClient } from '$lib/server/supabase';
import { generateIntelligenceReport } from './generate';
import { currentWeekRange } from './week-utils';
import type { IntelligenceReport } from './schema';

export interface RunResult {
	ok: boolean;
	weekLabel: string;
	reportId?: string;
	skipped?: boolean;
	error?: string;
}

/**
 * Orchestrateur : calcule la semaine, charge les 4 titres precedents,
 * genere l'edition via Claude, valide, insere en DB. Idempotent via
 * contrainte UNIQUE sur week_label (skip si deja existante et status=published).
 */
export async function runWeeklyGeneration(now: Date = new Date()): Promise<RunResult> {
	const week = currentWeekRange(now);
	const supabase = createSupabaseServiceClient();

	// Idempotence : ne pas regenerer si edition deja publiee cette semaine
	const { data: existing } = await supabase
		.from('intelligence_reports')
		.select('id, status')
		.eq('week_label', week.weekLabel)
		.maybeSingle();

	if (existing && existing.status === 'published') {
		return { ok: true, weekLabel: week.weekLabel, reportId: existing.id, skipped: true };
	}

	// Charger les 4 dernieres editions pour anti-redondance
	const { data: previous } = await supabase
		.from('intelligence_reports')
		.select('items')
		.eq('status', 'published')
		.order('generated_at', { ascending: false })
		.limit(4);

	const previousTitles = (previous ?? [])
		.map((r) => {
			const items = r.items as Array<{ rank: number; title: string }> | null;
			return items?.find((i) => i.rank === 1)?.title;
		})
		.filter((t): t is string => typeof t === 'string');

	const gen = await generateIntelligenceReport({
		weekLabel: week.weekLabel,
		dateStart: week.dateStart,
		dateEnd: week.dateEnd,
		previousTitles
	});

	if (!gen.success || !gen.report) {
		// Log l'erreur en DB (upsert sur week_label, status=error)
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

		return {
			ok: false,
			weekLabel: week.weekLabel,
			reportId: errRow?.id,
			error: gen.error
		};
	}

	// Insertion / upsert du rapport valide
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
				search_terms: report.search_terms,
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

	return { ok: true, weekLabel: week.weekLabel, reportId: inserted.id };
}
