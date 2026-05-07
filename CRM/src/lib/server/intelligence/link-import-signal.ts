// Phase C : helper INSERT prospect_lead_signals pour les leads importés depuis
// un chip Veille (match_kind='import'). Le re-scoring continu via apply-signals.ts
// utilise match_kind='rescore'. La PK (lead_id, report_id, item_rank) garantit
// l'idempotence : un lead déjà rescore'é puis importé n'aura qu'une seule ligne.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface LinkImportSignalParams {
	leadIds: string[];
	reportId: string;
	itemRank: number;
	fromTerm: string | null;
	maturity: 'emergent' | 'etabli' | 'speculatif';
	complianceTag: string;
	signalGeneratedAt: string;
}

/**
 * Lie un lot de leads fraîchement importés à leur signal Veille source.
 * Best-effort : un échec ne bloque pas l'import (le bonus scoring a déjà été
 * appliqué inline par calculerScore). Retourne le nombre de signaux liés.
 */
export async function linkImportSignals(
	supabase: Pick<SupabaseClient, 'from'>,
	params: LinkImportSignalParams
): Promise<number> {
	if (params.leadIds.length === 0) return 0;
	const rows = params.leadIds.map((leadId) => ({
		lead_id: leadId,
		report_id: params.reportId,
		item_rank: params.itemRank,
		maturity: params.maturity,
		compliance_tag: params.complianceTag,
		signal_generated_at: params.signalGeneratedAt,
		match_kind: 'import' as const,
		match_term: params.fromTerm ? params.fromTerm.slice(0, 200) : null
	}));
	const { error, count } = await supabase
		.from('prospect_lead_signals')
		.upsert(rows, {
			onConflict: 'lead_id,report_id,item_rank',
			ignoreDuplicates: true,
			count: 'exact'
		});
	if (error) {
		console.error('[link-import-signal] upsert failed', error.message);
		return 0;
	}
	return count ?? rows.length;
}
