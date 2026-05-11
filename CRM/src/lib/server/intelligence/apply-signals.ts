// Phase C : Quand un nouveau report Veille est généré, propager les signaux
// aux prospect_leads existants qui matchent (par chip canton+query, ou par
// raison_sociale ILIKE les mots-clés).
//
// Idempotent : la PRIMARY KEY (lead_id, report_id, item_rank) bloque les doublons.
// Les leads touchés voient leur score recalculé.

import type { SupabaseClient } from '@supabase/supabase-js';
import { recomputeLeadScore } from './recompute-score';
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
			}
		}
	}

	// 3+4. Insert idempotent + recompute, lead par lead.
	//
	// Audit 360 M-09 : on traite chaque lead touché d'affilée — upsert de ses
	// signaux PUIS recalcul de son score — au lieu de « tout insérer, puis tout
	// recalculer ». Ça réduit la fenêtre pendant laquelle un lead a un signal lié
	// mais un score pas encore à jour, de « durée du recompute de N leads » à
	// « ~3 round-trips pour 1 lead ». Une vraie transaction atomique est impossible
	// ici : le calcul de score est du JS (calculerScore), pas du SQL. La PK
	// (lead_id, report_id, item_rank) garantit l'idempotence des inserts, et
	// recomputeLeadScore est idempotent.

	// Dédup en mémoire avant DB (un même lead peut matcher 2 chips du même item).
	const dedupKey = (i: (typeof inserts)[number]) => `${i.lead_id}|${i.report_id}|${i.item_rank}`;
	const seen = new Set<string>();
	const unique = inserts.filter((i) => {
		const k = dedupKey(i);
		if (seen.has(k)) return false;
		seen.add(k);
		return true;
	});

	// Regrouper les lignes par lead, en préservant l'ordre de découverte.
	const rowsByLead = new Map<string, typeof unique>();
	for (const ins of unique) {
		const arr = rowsByLead.get(ins.lead_id);
		if (arr) arr.push(ins);
		else rowsByLead.set(ins.lead_id, [ins]);
	}

	let insertedSignals = 0;
	let recomputedLeads = 0;
	let failedLeads = 0;
	for (const [leadId, rows] of rowsByLead) {
		// upsert ignoreDuplicates : si la ligne existe déjà (run précédent), on ne fait rien.
		const { error, count } = await supabase
			.from('prospect_lead_signals')
			.upsert(rows, { onConflict: 'lead_id,report_id,item_rank', ignoreDuplicates: true, count: 'exact' });
		if (!error) insertedSignals += count ?? rows.length;

		const newScore = await recomputeLeadScore(supabase, leadId);
		if (newScore === null) failedLeads++;
		else recomputedLeads++;
	}

	return { insertedSignals, recomputedLeads, failedLeads };
}
