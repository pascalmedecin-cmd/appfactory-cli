/**
 * Prospection P3 — module partagé du flux « aperçu → cocher → importer ».
 *
 * Source UNIQUE de vérité pour les 3 sources entreprises (zefix / search_ch / google_places) :
 *  - dédup serveur (leads existants + écartés/transférés),
 *  - statut d'un candidat (new / exists / dismissed / known_zefix),
 *  - construction de la ligne d'insert `prospect_leads`.
 *
 * Utilisé par :
 *  - le mode aperçu des 3 endpoints search (parse → candidats, 0 insert),
 *  - leur mode direct historique (insert des importables),
 *  - l'endpoint d'écriture `import-selected` (payload client re-validé, re-scoré, re-dédupliqué).
 *
 * Garde dure : aucune confiance au payload client. Le score est toujours recalculé
 * (`calculerScore`), la dédup toujours re-vérifiée au moment réel de l'insert (TOCTOU).
 */

import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { calculerScore, type IntelligenceSignalInput } from '$lib/scoring';
import type { LeadPreviewSource } from '$lib/schemas';
import type { Marque } from '$lib/marque';

export type CandidateStatus = 'new' | 'exists' | 'dismissed' | 'known_zefix';

/** Champs « métier » d'un candidat, indépendants du statut/score (mappés par chaque source). */
export interface CandidateCore {
	source: LeadPreviewSource;
	source_id: string;
	source_url: string | null;
	raison_sociale: string;
	adresse: string | null;
	npa: string | null;
	localite: string | null;
	canton: string | null;
	telephone: string | null;
	site_web: string | null;
	email: string | null;
	secteur_detecte: string | null;
	description: string | null;
	date_publication: string | null;
	/** Types Google Places (ordre API, le 1er = principal). null pour zefix/search_ch. */
	google_types: string[] | null;
}

/** Candidat public renvoyé par l'aperçu (consommé par le checklist, re-soumis à l'import). */
export interface PublicCandidate extends CandidateCore {
	/** Identifiant stable côté UI = source_id (dédup intra-liste + clé checkbox). */
	tempId: string;
	score_pertinence: number;
	status_hint: CandidateStatus;
	/** false pour exists/dismissed → grisés + décochés + jamais insérés. */
	importable: boolean;
}

/** Ensembles de dédup pour une source (source_id des leads déjà présents / déjà traités). */
export interface DedupSets {
	existing: Set<string>;
	dismissed: Set<string>;
}

type ReadClient = Pick<SupabaseClient, 'from'>;

/**
 * Charge les ensembles de dédup pour une source : leads déjà importés (mêmes source_id)
 * + leads écartés/transférés (ne jamais ré-importer). Tolérant aux erreurs DB (Set vide).
 */
export async function fetchDedupSets(
	supabase: ReadClient,
	source: LeadPreviewSource,
	sourceIds: string[],
	marque: Marque,
): Promise<DedupSets> {
	// Dédup PAR MARQUE (index UNIQUE (marque, source, source_id)) : un même source_id peut
	// exister en filmpro ET en led ; sans ce filtre, un import LED verrait un lead filmpro
	// homonyme comme un doublon (blocage / non-régression) et inversement.
	const existing = new Set<string>();
	if (sourceIds.length > 0) {
		const { data } = await supabase
			.from('prospect_leads')
			.select('source_id')
			.eq('marque', marque)
			.eq('source', source)
			.in('source_id', sourceIds);
		if (data) for (const r of data as Array<{ source_id: string | null }>) if (r.source_id) existing.add(r.source_id);
	}
	const dismissed = new Set<string>();
	if (sourceIds.length > 0) {
		// Borné par `source_id` (comme `existing`) : seul l'état des candidats du payload nous
		// intéresse (statusFor n'interroge que ces source_id). Évite de charger tout l'historique
		// écarté/transféré de la source en mémoire (audit sécu 2026-06-18, F-1).
		const { data } = await supabase
			.from('prospect_leads')
			.select('source_id, statut')
			.eq('marque', marque)
			.eq('source', source)
			.in('source_id', sourceIds)
			.in('statut', ['ecarte', 'transfere']);
		if (data) for (const r of data as Array<{ source_id: string | null }>) if (r.source_id) dismissed.add(r.source_id);
	}
	return { existing, dismissed };
}

/**
 * Normalise un NPA suisse vers `^\d{4}$` ou `null` (contrat de sortie commun aux 3 sources).
 * search.ch renvoie le `tel:zip` brut (frontalier 5 chiffres, valeur parasite…) ; Google et
 * Zefix produisent déjà `^\d{4}$|null`. Aligner search.ch garantit qu'un candidat d'aperçu
 * satisfait toujours `CandidateImportSchema.npa` (anti round-trip cassé, bug-hunter 2026-06-18).
 */
export function normalizeNpa(raw: string | null | undefined): string | null {
	const v = (raw ?? '').trim();
	return /^\d{4}$/.test(v) ? v : null;
}

/** Statut d'un candidat à partir des ensembles de dédup (+ flag « déjà connue via Zefix »). */
export function statusFor(sourceId: string, sets: DedupSets, knownZefix = false): CandidateStatus {
	if (sets.existing.has(sourceId)) return 'exists';
	if (sets.dismissed.has(sourceId)) return 'dismissed';
	if (knownZefix) return 'known_zefix';
	return 'new';
}

/** Un candidat est insérable s'il n'est ni déjà présent ni déjà écarté/transféré. */
export function isImportable(status: CandidateStatus): boolean {
	return status === 'new' || status === 'known_zefix';
}

const GOOGLE_TYPE_RE = /^[a-z][a-z0-9_]*$/;

/**
 * Filtre allowlist des types Google Places (source unique, aperçu ET import sélectif) : seuls
 * les tokens snake_case conformes passent, bornés à 20, et UNIQUEMENT pour la source
 * google_places. Anti all-or-nothing (bug-hunter 2026-07-02, L2) : un token inattendu est
 * écarté, jamais le candidat entier - même principe que le NPA search.ch (cf. normalizeNpa).
 */
export function sanitizeGoogleTypes(
	types: readonly string[] | null | undefined,
	source: LeadPreviewSource
): string[] | null {
	if (source !== 'google_places' || !types) return null;
	// Conformité + borne de longueur par token (64 = large pour un type Google réel ~40 max).
	const ok = types.filter((t) => typeof t === 'string' && t.length <= 64 && GOOGLE_TYPE_RE.test(t)).slice(0, 20);
	return ok.length > 0 ? ok : null;
}

/**
 * Calcule le score serveur d'un candidat (jamais le score client). Score sur le canton
 * réel du candidat : un lead sans canton exploitable ne reçoit pas de bonus canton.
 */
export function scoreCandidate(
	core: CandidateCore,
	opts: { intelligenceSignal?: IntelligenceSignalInput | null } = {},
): number {
	return calculerScore({
		canton: core.canton,
		description: core.description,
		raison_sociale: core.raison_sociale,
		secteur_detecte: core.secteur_detecte,
		source: core.source,
		date_publication: core.date_publication,
		telephone: core.telephone,
		montant: null,
		intelligenceSignal: opts.intelligenceSignal ?? null,
	}).total;
}

/**
 * Construit la ligne d'insert `prospect_leads` à partir d'un candidat (cœur + score serveur).
 * Source unique : utilisée par le mode direct des endpoints ET par import-selected.
 */
export function candidateToInsertRow(
	core: CandidateCore,
	score: number,
	opts: { now: string; fromIntelligence: string | null; fromTerm: string | null; marque: Marque },
): Record<string, unknown> {
	return {
		id: randomUUID(),
		marque: opts.marque,
		source: core.source,
		source_id: core.source_id,
		source_url: core.source_url,
		raison_sociale: core.raison_sociale,
		nom_contact: null,
		adresse: core.adresse,
		npa: core.npa,
		localite: core.localite,
		canton: core.canton,
		telephone: core.telephone,
		site_web: core.site_web,
		email: core.email,
		secteur_detecte: core.secteur_detecte,
		description: core.description,
		google_types: core.google_types,
		montant: null,
		date_publication: core.date_publication,
		score_pertinence: score,
		statut: 'vide',
		date_import: opts.now,
		date_modification: opts.now,
		source_intelligence_id: opts.fromIntelligence,
		source_intelligence_term: opts.fromTerm,
	};
}

/** Projette un candidat scoré en candidat public (renvoyé à l'UI par l'aperçu). */
export function toPublicCandidate(core: CandidateCore, score: number, status: CandidateStatus): PublicCandidate {
	return {
		...core,
		tempId: core.source_id,
		score_pertinence: score,
		status_hint: status,
		importable: isImportable(status),
	};
}
