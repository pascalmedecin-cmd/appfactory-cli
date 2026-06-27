// Bloc 3 : Fetch du signal Veille source pour bonus scoring.
// Lookup un item d'une édition de veille à partir de {report_id, rank}
// et retourne les métadonnées nécessaires au scoring (maturity, compliance, age).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { IntelligenceSignalInput } from '$lib/scoring';
import { ComplianceTagEnum, type ComplianceTag } from './schema';
import { WEEK_MS } from '$lib/utils/time-constants';

// Audit 360 V3b L-14 : narrow une valeur DB brute vers l'enum compliance_tag. La colonne
// est écrite via ComplianceTagEnum (validation LLM), mais on reste défensif sur la lecture
// (donnée legacy / corruption) → tag inconnu = null = pas de bonus, scoring classique OK.
export function narrowComplianceTag(v: string | null | undefined): ComplianceTag | null {
	return v != null && ComplianceTagEnum.safeParse(v).success ? (v as ComplianceTag) : null;
}

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
 * Phase C+D : couple le signal pour le scoring (weeksSince calculé) et le
 * snapshot DB (generated_at brut) qui sert à insérer dans prospect_lead_signals.
 */
export interface IntelligenceSignalLookup {
	forScoring: IntelligenceSignalInput;
	snapshot: {
		maturity: 'emergent' | 'etabli' | 'speculatif';
		complianceTag: string;
		generatedAt: string;
	};
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
	return Math.floor(diffMs / WEEK_MS);
}

/**
 * Retourne le signal Veille source (forScoring + snapshot) si trouvé, null sinon.
 * Défensif : tout échec → null = pas de bonus, scoring classique reste correct.
 */
export async function fetchIntelligenceSignalLookup(
	supabase: Pick<SupabaseClient, 'from'>,
	reportId: string,
	itemRank: number | null | undefined
): Promise<IntelligenceSignalLookup | null> {
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
			forScoring: {
				maturity: item.maturity,
				complianceTag: narrowComplianceTag(row.compliance_tag),
				weeksSince: weeksSinceIso(row.generated_at)
			},
			snapshot: {
				maturity: item.maturity,
				complianceTag: row.compliance_tag,
				generatedAt: row.generated_at
			}
		};
	} catch {
		return null;
	}
}
