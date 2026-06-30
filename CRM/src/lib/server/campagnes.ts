/**
 * Source UNIQUE des opérations sur les Campagnes (Vague 3.2, étiquetage MULTIPLE N-N).
 *
 * Une entreprise (`prospect_lead`) peut porter plusieurs campagnes en parallèle via la
 * table de liens `prospect_lead_campagnes`. Ce module centralise : le CRUD des campagnes
 * (écran dédié), l'assignation/retrait d'étiquettes (import + fiche), le chargement des
 * campagnes par lead (liste/fiche) et la résolution des lead_ids d'un filtre campagne.
 *
 * Sécurité / robustesse :
 *  - bornage des entrées (nom, description, taille des multi-sélections) — defense in depth
 *    en plus du Zod des endpoints ;
 *  - couleur contrainte à la palette c1..c8 (cohérent avec le CHECK SQL) ;
 *  - conflit de nom (index unique `lower(nom)`, code Postgres 23505) traduit en erreur typée
 *    `duplicate` (jamais une 500 opaque) ;
 *  - aucune interpolation de saisie dans un mini-DSL `.or()` : uniquement `.in()` / `.eq()`
 *    paramétrés (cf. memory/feedback_postgrest_or_filter_injection.md) ;
 *  - embed PostgREST non ambigu : `prospect_lead_campagnes` a 1 seule FK vers `campagnes`
 *    (et 1 vers `prospect_leads`) -> pas l'ambiguïté 2-FK (cf. feedback_postgrest_embed_ambigu_2fk).
 *
 * RLS : `authenticated_full_access` (mono-tenant plat, 3 fondateurs symétriques) — à durcir
 * au 4e utilisateur (cf. feedback_rls_multitenant_durcissement_si_4_users).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';
import type { ProspectAdresse } from '$lib/etiquettes/prospect-etiquette';
import {
	COULEUR_SLUGS,
	DEFAULT_COULEUR,
	isCouleurSlug,
	CAMPAGNE_NOM_MAX,
	CAMPAGNE_DESC_MAX,
	MAX_CAMPAGNE_IDS,
} from '$lib/campagnes';
import type { Campagne, CampagneWithCount, CouleurSlug } from '$lib/campagnes';

// Constantes/types Campagnes : source unique dans le module client-safe `$lib/campagnes`
// (partagé UI + serveur, aucune dérive de palette). Ré-exportés ici pour compat : les
// endpoints, le filtre `prospection-query` et les tests les importent depuis ce module.
export { COULEUR_SLUGS, DEFAULT_COULEUR, isCouleurSlug, CAMPAGNE_NOM_MAX, CAMPAGNE_DESC_MAX, MAX_CAMPAGNE_IDS };
export type { Campagne, CampagneWithCount, CouleurSlug };

export type CampagneError = { code: 'duplicate' | 'invalid' | 'db'; message: string };

const UNIQUE_VIOLATION = '23505';

/**
 * Liste des campagnes avec le nombre de leads étiquetés (compte embarqué PostgREST, 1 requête).
 * Triée par date de création décroissante (l'écran dédié re-trie côté client si besoin).
 */
export async function listCampagnes(
	supabase: SupabaseClient<Database>,
	opts: { includeArchived?: boolean } = {}
): Promise<{ data: CampagneWithCount[]; error: { message: string } | null }> {
	const { includeArchived = true } = opts;
	let q = supabase
		.from('campagnes')
		.select('*, prospect_lead_campagnes(count)')
		.order('date_creation', { ascending: false });
	if (!includeArchived) q = q.eq('archived', false);

	const { data, error } = await q;
	if (error) return { data: [], error };

	const rows: CampagneWithCount[] = (data ?? []).map((c) => {
		// L'embed renvoie [{ count: N }] (tableau d'agrégat) ; 0 si aucun lead.
		const linkAgg = (c as { prospect_lead_campagnes?: Array<{ count: number }> }).prospect_lead_campagnes;
		const lead_count = Array.isArray(linkAgg) ? (linkAgg[0]?.count ?? 0) : 0;
		const { prospect_lead_campagnes: _omit, ...rest } = c as Campagne & {
			prospect_lead_campagnes?: unknown;
		};
		return { ...(rest as Campagne), lead_count };
	});
	return { data: rows, error: null };
}

function sanitizeNom(nom: string): string {
	return nom.trim();
}
function sanitizeDescription(description: string | null | undefined): string | null {
	const d = (description ?? '').trim();
	return d.length > 0 ? d.slice(0, CAMPAGNE_DESC_MAX) : null;
}

/** Crée une campagne. Conflit de nom (insensible à la casse) -> erreur `duplicate`. */
export async function createCampagne(
	supabase: SupabaseClient<Database>,
	input: { nom: string; couleur?: string; description?: string | null; userId: string | null }
): Promise<{ data: Campagne | null; error: CampagneError | null }> {
	const nom = sanitizeNom(input.nom);
	if (nom.length === 0 || nom.length > CAMPAGNE_NOM_MAX) {
		return { data: null, error: { code: 'invalid', message: 'Nom de campagne invalide.' } };
	}
	const couleur = isCouleurSlug(input.couleur) ? input.couleur : DEFAULT_COULEUR;
	const description = sanitizeDescription(input.description);

	const { data, error } = await supabase
		.from('campagnes')
		.insert({ nom, couleur, description, created_by: input.userId })
		.select('*')
		.single();

	if (error) {
		if (error.code === UNIQUE_VIOLATION) {
			return { data: null, error: { code: 'duplicate', message: `Une campagne « ${nom} » existe déjà.` } };
		}
		return { data: null, error: { code: 'db', message: error.message } };
	}
	return { data: data as Campagne, error: null };
}

/** Renomme une campagne. Conflit de nom -> erreur `duplicate`. */
export async function renameCampagne(
	supabase: SupabaseClient<Database>,
	id: string,
	nom: string
): Promise<{ data: Campagne | null; error: CampagneError | null }> {
	const trimmed = sanitizeNom(nom);
	if (trimmed.length === 0 || trimmed.length > CAMPAGNE_NOM_MAX) {
		return { data: null, error: { code: 'invalid', message: 'Nom de campagne invalide.' } };
	}
	const { data, error } = await supabase
		.from('campagnes')
		.update({ nom: trimmed })
		.eq('id', id)
		.select('*')
		.single();
	if (error) {
		if (error.code === UNIQUE_VIOLATION) {
			return { data: null, error: { code: 'duplicate', message: `Une campagne « ${trimmed} » existe déjà.` } };
		}
		return { data: null, error: { code: 'db', message: error.message } };
	}
	return { data: data as Campagne, error: null };
}

/** Met à jour les champs éditables (couleur / description / archivage) d'une campagne. */
export async function updateCampagne(
	supabase: SupabaseClient<Database>,
	id: string,
	patch: { couleur?: string; description?: string | null; archived?: boolean }
): Promise<{ data: Campagne | null; error: CampagneError | null }> {
	const update: Database['public']['Tables']['campagnes']['Update'] = {};
	if (patch.couleur !== undefined) {
		if (!isCouleurSlug(patch.couleur)) {
			return { data: null, error: { code: 'invalid', message: 'Couleur invalide.' } };
		}
		update.couleur = patch.couleur;
	}
	if (patch.description !== undefined) update.description = sanitizeDescription(patch.description);
	if (patch.archived !== undefined) update.archived = patch.archived;

	if (Object.keys(update).length === 0) {
		return { data: null, error: { code: 'invalid', message: 'Aucune modification.' } };
	}

	const { data, error } = await supabase
		.from('campagnes')
		.update(update)
		.eq('id', id)
		.select('*')
		.single();
	if (error) return { data: null, error: { code: 'db', message: error.message } };
	return { data: data as Campagne, error: null };
}

/** Supprime une campagne (les liens N-N partent en cascade). Ne supprime AUCUN prospect. */
export async function deleteCampagne(
	supabase: SupabaseClient<Database>,
	id: string
): Promise<{ error: CampagneError | null }> {
	const { error } = await supabase.from('campagnes').delete().eq('id', id);
	if (error) return { error: { code: 'db', message: error.message } };
	return { error: null };
}

/** Normalise une liste d'ids campagne : dédup + bornage anti-DoS. */
function normalizeCampagneIds(ids: readonly string[]): string[] {
	return [...new Set(ids.filter((s) => typeof s === 'string' && s.length > 0))].slice(0, MAX_CAMPAGNE_IDS);
}

/**
 * Assigne (cumulativement) une ou plusieurs campagnes à un lead. Idempotent : un lien déjà
 * présent est ignoré (upsert ignoreDuplicates sur la PK). Un id campagne inexistant ->
 * violation FK 23503 -> erreur typée (le payload client n'est jamais fait confiance).
 */
export async function assignCampagnesToLead(
	supabase: SupabaseClient<Database>,
	leadId: string,
	campagneIds: readonly string[]
): Promise<{ error: CampagneError | null }> {
	const ids = normalizeCampagneIds(campagneIds);
	if (ids.length === 0) return { error: null };
	const rows = ids.map((campagne_id) => ({ lead_id: leadId, campagne_id }));
	const { error } = await supabase
		.from('prospect_lead_campagnes')
		.upsert(rows, { onConflict: 'lead_id,campagne_id', ignoreDuplicates: true });
	if (error) {
		if (error.code === '23503') {
			return { error: { code: 'invalid', message: 'Campagne inexistante.' } };
		}
		return { error: { code: 'db', message: error.message } };
	}
	return { error: null };
}

/**
 * Assigne (cumulativement) une ou plusieurs campagnes à PLUSIEURS leads en une seule requête
 * (étiquetage d'un lot importé). Idempotent (upsert ignoreDuplicates sur la PK). Best-effort
 * côté appelant : utilisé après l'insert des leads ; une erreur est remontée typée (un id
 * campagne inexistant -> 23503) mais ne supprime jamais les leads déjà importés.
 */
export async function assignCampagnesToLeads(
	supabase: SupabaseClient<Database>,
	leadIds: readonly string[],
	campagneIds: readonly string[]
): Promise<{ error: CampagneError | null }> {
	const cids = normalizeCampagneIds(campagneIds);
	const lids = [...new Set(leadIds.filter(Boolean))];
	if (cids.length === 0 || lids.length === 0) return { error: null };
	const rows = lids.flatMap((lead_id) => cids.map((campagne_id) => ({ lead_id, campagne_id })));
	const { error } = await supabase
		.from('prospect_lead_campagnes')
		.upsert(rows, { onConflict: 'lead_id,campagne_id', ignoreDuplicates: true });
	if (error) {
		if (error.code === '23503') return { error: { code: 'invalid', message: 'Campagne inexistante.' } };
		return { error: { code: 'db', message: error.message } };
	}
	return { error: null };
}

/** Retire l'étiquette d'une campagne d'un lead (ne supprime ni le lead ni la campagne). */
export async function removeCampagneFromLead(
	supabase: SupabaseClient<Database>,
	leadId: string,
	campagneId: string
): Promise<{ error: CampagneError | null }> {
	const { error } = await supabase
		.from('prospect_lead_campagnes')
		.delete()
		.eq('lead_id', leadId)
		.eq('campagne_id', campagneId);
	if (error) return { error: { code: 'db', message: error.message } };
	return { error: null };
}

/**
 * Charge les campagnes (objets complets) par lead pour une page de leads. Retourne une Map
 * lead_id -> Campagne[] (vide si aucune). Une seule requête sur la jonction + embed campagne.
 */
export async function fetchCampagnesByLead(
	supabase: SupabaseClient<Database>,
	leadIds: readonly string[]
): Promise<Map<string, Campagne[]>> {
	const map = new Map<string, Campagne[]>();
	const ids = [...new Set(leadIds.filter(Boolean))];
	if (ids.length === 0) return map;

	const { data, error } = await supabase
		.from('prospect_lead_campagnes')
		.select('lead_id, campagnes(*)')
		.in('lead_id', ids);
	if (error || !data) return map;

	for (const row of data as Array<{ lead_id: string; campagnes: Campagne | null }>) {
		if (!row.campagnes) continue;
		const list = map.get(row.lead_id) ?? [];
		list.push(row.campagnes);
		map.set(row.lead_id, list);
	}
	// Tri stable par nom pour un rendu déterministe des pastilles.
	for (const list of map.values()) list.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
	return map;
}

/**
 * Résout les lead_ids portant AU MOINS UNE des campagnes données (filtre « ≥1 campagne »).
 * Dédupé. Utilisé par le filtre prospection : l'appelant applique ensuite `.in('id', leadIds)`.
 * Le nombre de campagnes du filtre est borné (MAX_CAMPAGNE_IDS) ; le volume de leads suit
 * l'échelle du CRM (mono-tenant, quelques milliers de prospects au plus).
 */
export async function leadIdsForCampagnes(
	supabase: SupabaseClient<Database>,
	campagneIds: readonly string[]
): Promise<string[]> {
	const ids = normalizeCampagneIds(campagneIds);
	if (ids.length === 0) return [];
	const { data, error } = await supabase
		.from('prospect_lead_campagnes')
		.select('lead_id')
		.in('campagne_id', ids);
	if (error || !data) return [];
	return [...new Set((data as Array<{ lead_id: string }>).map((r) => r.lead_id))];
}

/**
 * Prospects étiquetés d'UNE campagne, réduits aux champs d'adresse postale (publipostage ->
 * planche d'étiquettes). Lit la table de lien N-N PUIS `prospect_leads` (seuls les champs
 * nécessaires, jamais `select('*')`), triés par raison sociale pour une liste scannable.
 *
 * Robustesse (audit 2026-06-30) :
 *  - PROPAGE toute erreur DB. La lecture de lien n'est volontairement PAS faite via
 *    `leadIdsForCampagnes` (qui dégrade en silence -> [] pour le filtre prospection) : ici un
 *    échec transitoire doit remonter (-> 500 + log côté endpoint), jamais être présenté comme
 *    « campagne vide » (un opérateur conclurait à tort qu'aucun prospect n'est étiqueté).
 *  - PAGINÉE des deux côtés (jamais de troncature silencieuse au cap PostgREST par défaut) : la
 *    lecture de lien par `range`, la lecture des prospects par lots d'ids strictement < cap.
 */
const PG_PAGE = 1000; // cap PostgREST par défaut : on pagine pour ne jamais tronquer en silence
const IN_CHUNK = 500; // lots d'ids pour `.in()` (< cap -> aucun lot ne peut être tronqué)

async function leadIdsForCampagnePaginated(
	supabase: SupabaseClient<Database>,
	campagneId: string
): Promise<{ ids: string[]; error: { message: string } | null }> {
	const ids: string[] = [];
	for (let from = 0; ; from += PG_PAGE) {
		const { data, error } = await supabase
			.from('prospect_lead_campagnes')
			.select('lead_id')
			.eq('campagne_id', campagneId)
			.range(from, from + PG_PAGE - 1);
		if (error) return { ids: [], error };
		const batch = (data ?? []) as Array<{ lead_id: string }>;
		for (const r of batch) ids.push(r.lead_id);
		if (batch.length < PG_PAGE) break;
	}
	return { ids, error: null };
}

export async function fetchProspectsForCampagne(
	supabase: SupabaseClient<Database>,
	campagneId: string
): Promise<{ data: ProspectAdresse[]; error: { message: string } | null }> {
	const { ids: leadIds, error: linkError } = await leadIdsForCampagnePaginated(supabase, campagneId);
	if (linkError) return { data: [], error: linkError };
	if (leadIds.length === 0) return { data: [], error: null };

	const rows: ProspectAdresse[] = [];
	for (let i = 0; i < leadIds.length; i += IN_CHUNK) {
		const chunk = leadIds.slice(i, i + IN_CHUNK);
		const { data, error } = await supabase
			.from('prospect_leads')
			.select('id, raison_sociale, adresse, npa, localite')
			.in('id', chunk);
		if (error) return { data: [], error };
		rows.push(...((data ?? []) as ProspectAdresse[]));
	}
	// Tri stable par raison sociale (l'ordre inter-lots n'est pas garanti par la DB).
	rows.sort((a, b) => a.raison_sociale.localeCompare(b.raison_sociale, 'fr'));
	return { data: rows, error: null };
}
