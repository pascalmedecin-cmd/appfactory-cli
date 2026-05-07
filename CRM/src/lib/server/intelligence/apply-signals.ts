// Phase C : Quand un nouveau report Veille est généré, propager les signaux
// aux prospect_leads existants qui matchent (par chip canton+query, ou par
// raison_sociale ILIKE les mots-clés).
//
// Idempotent : la PRIMARY KEY (lead_id, report_id, item_rank) bloque les doublons.
// Les leads touchés voient leur score recalculé.

import type { SupabaseClient } from '@supabase/supabase-js';
import { recomputeLeadScoresBatch } from './recompute-score';
import type { IntelligenceItem, IntelligenceReport } from './schema';
import { normalizeStoredChips } from './chip-normalize';

interface ItemSignalSnapshot {
	itemRank: number;
	maturity: 'emergent' | 'etabli' | 'speculatif';
}

interface ChipMatch {
	canton: string;
	query: string;
	label: string;
}

/**
 * Extrait les chips structurés d'un item via normalizeStoredChips, qui couvre
 * tous les cas (chip structuré, chip legacy string normalisé, format inconnu skip).
 */
function extractChips(item: IntelligenceItem): ChipMatch[] {
	const chips = normalizeStoredChips(item.search_terms);
	return chips.map((c) => ({ canton: c.canton, query: c.query, label: c.label }));
}

/**
 * Échappe les caractères spéciaux ILIKE (%, _) pour éviter les faux positifs.
 * Sépare ce besoin du suivant (sanitisation PostgREST `.or()`) qui n'est plus
 * utilisé : on évite désormais `.or()` au profit de 2 requêtes ILIKE séparées
 * (cf. findMatchingLeadIds).
 */
function escapeIlike(s: string): string {
	return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/**
 * Pour un chip donné, retourne les IDs des leads existants qui matchent :
 *   canton = chip.canton AND (raison_sociale ILIKE %query% OR description ILIKE %query%)
 * Filtre les leads écartés (statut ecarte/transfere) pour éviter du bruit.
 *
 * Sécurité : on évite l'API PostgREST `.or()` avec interpolation de string car
 * la virgule, les parenthèses et les quotes sont des séparateurs/délimiteurs du
 * mini-DSL de filtre. Un caractère de la query qui s'y glisserait pourrait scinder
 * la clause et élargir le SELECT (defense-in-depth, audit security 2026-04-27).
 * Solution : 2 requêtes paramétrées séparées via .ilike(), puis dédup côté code.
 */
async function findMatchingLeadIds(
	supabase: Pick<SupabaseClient, 'from'>,
	chip: ChipMatch
): Promise<string[]> {
	const safe = escapeIlike(chip.query);
	if (safe.length < 3) return []; // protection : query trop courte = trop de matches
	const pattern = `%${safe}%`;

	const [resRaisonSociale, resDescription] = await Promise.all([
		supabase
			.from('prospect_leads')
			.select('id')
			.eq('canton', chip.canton)
			.not('statut', 'in', '(ecarte,transfere)')
			.ilike('raison_sociale', pattern),
		supabase
			.from('prospect_leads')
			.select('id')
			.eq('canton', chip.canton)
			.not('statut', 'in', '(ecarte,transfere)')
			.ilike('description', pattern)
	]);

	const ids = new Set<string>();
	for (const r of (resRaisonSociale.data ?? []) as Array<{ id: string }>) ids.add(r.id);
	for (const r of (resDescription.data ?? []) as Array<{ id: string }>) ids.add(r.id);
	return [...ids];
}

/**
 * Applique les signaux d'un report fraîchement publié à tous les leads existants
 * qui matchent. Insère prospect_lead_signals (idempotent), puis recompute les scores.
 */
export async function applySignalsFromReport(
	supabase: Pick<SupabaseClient, 'from'>,
	reportId: string,
	report: IntelligenceReport
): Promise<{ insertedSignals: number; recomputedLeads: number; failedLeads: number }> {
	const generatedAt = report.meta.generated_at;
	const complianceTag = report.meta.compliance_tag;

	// 1. Pour chaque item, snapshot signal + chips.
	const itemSnapshots: ItemSignalSnapshot[] = (report.items ?? []).map((it) => ({
		itemRank: it.rank,
		maturity: it.maturity
	}));

	// 2. Pour chaque (item, chip) → trouver les leads qui matchent.
	const inserts: Array<{
		lead_id: string;
		report_id: string;
		item_rank: number;
		maturity: 'emergent' | 'etabli' | 'speculatif';
		compliance_tag: string;
		signal_generated_at: string;
		match_kind: 'rescore';
		match_term: string;
	}> = [];
	const touchedLeadIds = new Set<string>();

	for (const item of report.items ?? []) {
		const snapshot = itemSnapshots.find((s) => s.itemRank === item.rank);
		if (!snapshot) continue;

		const chips = extractChips(item);
		for (const chip of chips) {
			const leadIds = await findMatchingLeadIds(supabase, chip);
			for (const leadId of leadIds) {
				inserts.push({
					lead_id: leadId,
					report_id: reportId,
					item_rank: item.rank,
					maturity: snapshot.maturity,
					compliance_tag: complianceTag,
					signal_generated_at: generatedAt,
					match_kind: 'rescore',
					match_term: chip.label.slice(0, 200)
				});
				touchedLeadIds.add(leadId);
			}
		}
	}

	// 3. Insert idempotent (la PK bloque les doublons sur ré-exécution).
	let insertedSignals = 0;
	if (inserts.length > 0) {
		// Dédup en mémoire avant DB (un même lead peut matcher 2 chips du même item).
		const dedupKey = (i: (typeof inserts)[number]) => `${i.lead_id}|${i.report_id}|${i.item_rank}`;
		const seen = new Set<string>();
		const unique = inserts.filter((i) => {
			const k = dedupKey(i);
			if (seen.has(k)) return false;
			seen.add(k);
			return true;
		});

		// upsert ignoreDuplicates : si la ligne existe déjà (run précédent), on ne fait rien.
		const { error, count } = await supabase
			.from('prospect_lead_signals')
			.upsert(unique, { onConflict: 'lead_id,report_id,item_rank', ignoreDuplicates: true, count: 'exact' });

		if (!error) insertedSignals = count ?? unique.length;
	}

	// 4. Recompute scores des leads touchés.
	const ids = [...touchedLeadIds];
	const { updated, failed } = await recomputeLeadScoresBatch(supabase, ids);

	return { insertedSignals, recomputedLeads: updated, failedLeads: failed };
}
