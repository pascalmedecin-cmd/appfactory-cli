import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import {
	normalizeStoredChips,
	type SearchChip
} from '$lib/server/intelligence/chip-normalize';
import type { IntelligenceItem } from '$lib/server/intelligence/schema';

/**
 * Agrégat de chips structurés à partir des items, avec rappel du signal source.
 * Source unique pour la section « Termes générés / À lancer dans Prospection »
 * de la page détail. Remplace le champ legacy `report.search_terms` (toujours
 * vide depuis refonte LEAN S111).
 */
export type AggregatedChip = {
	chip: SearchChip;
	item_rank: number;
};

export const load: PageServerLoad = async ({ locals, params }) => {
	const { user } = await locals.safeGetSession();

	const { data: report, error: dbErr } = await locals.supabase
		.from('intelligence_reports')
		.select('*')
		.eq('id', params.id)
		.maybeSingle();

	if (dbErr || !report) {
		throw error(404, 'Édition introuvable');
	}

	// Auto-mark as read pour l'user qui ouvre le détail
	if (user) {
		await locals.supabase
			.from('intelligence_reads')
			.upsert(
				{ user_id: user.id, report_id: report.id },
				{ onConflict: 'user_id,report_id', ignoreDuplicates: true }
			);
	}

	// Agrégation chips items → liste flat dédupliquée. Chaque chip porte le rang
	// du signal source (utile pour l'auto-exécution prospection + traçabilité).
	const items = ((report.items ?? []) as Array<
		IntelligenceItem & { search_terms?: unknown }
	>) ?? [];
	const aggregatedChips: AggregatedChip[] = [];
	const seen = new Set<string>();
	for (const it of items) {
		const chips = normalizeStoredChips(it.search_terms);
		for (const c of chips) {
			const key = `${c.kind}|${c.canton}|${c.query.toLowerCase()}`;
			if (seen.has(key)) continue;
			seen.add(key);
			aggregatedChips.push({ chip: c, item_rank: it.rank });
		}
	}

	return { report, aggregatedChips };
};
