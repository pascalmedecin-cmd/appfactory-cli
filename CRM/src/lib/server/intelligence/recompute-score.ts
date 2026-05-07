// Phase C+D : Recompute du score d'un lead à partir de tous ses signaux Veille liés.
// Lit prospect_lead_signals + champs lead, applique calculerScore avec array de signaux,
// UPDATE prospect_leads.score_pertinence + date_modification.

import type { SupabaseClient } from '@supabase/supabase-js';
import { calculerScore, type IntelligenceSignalInput } from '$lib/scoring';

interface LeadRow {
	id: string;
	canton: string | null;
	description: string | null;
	raison_sociale: string;
	secteur_detecte: string | null;
	source: string;
	date_publication: string | null;
	telephone: string | null;
	montant: number | null;
}

interface SignalRow {
	maturity: 'emergent' | 'etabli' | 'speculatif';
	compliance_tag: string;
	signal_generated_at: string;
}

/**
 * Calcule weeksSince depuis une date ISO (semaines entières écoulées).
 * Cohérent avec signal-lookup.ts (Bloc 3).
 */
function weeksSinceIso(iso: string): number {
	const t = new Date(iso).getTime();
	if (Number.isNaN(t)) return Infinity;
	const diffMs = Date.now() - t;
	if (diffMs < 0) return 0;
	return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
}

/**
 * Recharge tous les signaux Veille liés au lead, recalcule le score, met à jour la DB.
 * Idempotent : appeler 2 fois de suite donne le même résultat (sauf si nouveau signal apparu).
 * Retourne le nouveau score, ou null si lead introuvable.
 */
export async function recomputeLeadScore(
	supabase: Pick<SupabaseClient, 'from'>,
	leadId: string
): Promise<number | null> {
	const { data: lead, error: leadErr } = await supabase
		.from('prospect_leads')
		.select('id, canton, description, raison_sociale, secteur_detecte, source, date_publication, telephone, montant')
		.eq('id', leadId)
		.maybeSingle();

	if (leadErr || !lead) return null;
	const leadRow = lead as LeadRow;

	const { data: signals } = await supabase
		.from('prospect_lead_signals')
		.select('maturity, compliance_tag, signal_generated_at')
		.eq('lead_id', leadId);

	const intelligenceSignals: IntelligenceSignalInput[] = (signals as SignalRow[] | null ?? []).map(
		(s) => ({
			maturity: s.maturity,
			complianceTag: s.compliance_tag,
			weeksSince: weeksSinceIso(s.signal_generated_at)
		})
	);

	const result = calculerScore({
		canton: leadRow.canton,
		description: leadRow.description,
		raison_sociale: leadRow.raison_sociale,
		secteur_detecte: leadRow.secteur_detecte,
		source: leadRow.source,
		date_publication: leadRow.date_publication,
		telephone: leadRow.telephone,
		montant: leadRow.montant,
		intelligenceSignals
	});

	const { error: updErr } = await supabase
		.from('prospect_leads')
		.update({
			score_pertinence: result.total,
			date_modification: new Date().toISOString()
		})
		.eq('id', leadId);

	if (updErr) return null;
	return result.total;
}

/**
 * Recompute en batch. Best-effort : log les erreurs individuelles, continue.
 * Retourne {updated, failed} pour audit.
 */
export async function recomputeLeadScoresBatch(
	supabase: Pick<SupabaseClient, 'from'>,
	leadIds: string[]
): Promise<{ updated: number; failed: number }> {
	let updated = 0;
	let failed = 0;
	for (const id of leadIds) {
		const r = await recomputeLeadScore(supabase, id);
		if (r === null) failed++;
		else updated++;
	}
	return { updated, failed };
}
