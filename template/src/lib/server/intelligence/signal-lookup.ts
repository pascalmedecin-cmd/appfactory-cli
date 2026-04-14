// Bloc 3 — Fetch du signal Veille source pour bonus scoring.
// Lookup un item d'une édition de veille à partir de {report_id, rank}
// et retourne les métadonnées nécessaires au scoring (maturity, compliance, age).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { IntelligenceSignalInput } from '$lib/scoring';

interface IntelligenceReportRow {
	compliance_tag: string;
	generated_at: string;
	items: unknown;
}

interface IntelligenceItemShape {
	rank?: number;
	maturity?: 'emergent' | 'etabli' | 'speculatif';
}

/**
 * Calcule le nombre de semaines entières écoulées depuis une date ISO.
 * Retourne 0 si date future ou invalide.
 */
function weeksSinceIso(iso: string): number {
	const t = new Date(iso).getTime();
	if (Number.isNaN(t)) return Infinity; // invalide → hors fenêtre = pas de bonus
	const diffMs = Date.now() - t;
	if (diffMs < 0) return 0; // future → traité comme semaine 0
	return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
}

/**
 * Retourne les données du signal Veille source si trouvé, null sinon.
 * Se comporte défensivement : si n'importe quelle étape échoue, retourne null
 * (pas de bonus = fallback sûr, le scoring classique reste correct).
 */
export async function fetchIntelligenceSignal(
	supabase: Pick<SupabaseClient, 'from'>,
	reportId: string,
	itemRank: number | null | undefined
): Promise<IntelligenceSignalInput | null> {
	if (!reportId || !itemRank || itemRank < 1) return null;

	try {
		const { data, error } = await supabase
			.from('intelligence_reports')
			.select('compliance_tag, generated_at, items')
			.eq('id', reportId)
			.maybeSingle();

		if (error || !data) return null;
		const row = data as IntelligenceReportRow;

		const items = Array.isArray(row.items) ? (row.items as IntelligenceItemShape[]) : [];
		const item = items.find((it) => it?.rank === itemRank);
		if (!item || !item.maturity) return null;

		return {
			maturity: item.maturity,
			complianceTag: row.compliance_tag ?? null,
			weeksSince: weeksSinceIso(row.generated_at)
		};
	} catch {
		return null;
	}
}
