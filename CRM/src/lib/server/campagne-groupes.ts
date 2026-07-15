/**
 * Source UNIQUE des opérations serveur sur les GROUPES de prospects d'une campagne (2026-07-02).
 *
 * Modèle : `campagne_groupes` (groupes nommés PAR campagne, nom borné 24 chars stress-testés)
 * + `prospect_lead_campagnes.groupe_id` (un prospect = au plus un groupe par campagne).
 *
 * Sécurité / robustesse (mêmes doctrines que $lib/server/campagnes) :
 *  - bornage des entrées (nom, taille des lots d'ids) - defense in depth en plus du Zod ;
 *  - toute opération sur un groupe est SCOPÉE par (id, campagne_id) : un id de groupe d'une
 *    autre campagne ne matche jamais (l'endpoint ne fait pas confiance au couple d'ids) ;
 *  - l'assignation vérifie l'appartenance du groupe à la campagne AVANT l'update ; la FK
 *    composite (groupe_id, campagne_id) -> campagne_groupes(id, campagne_id) re-garantit la
 *    même règle au niveau base (defense in depth, testée sur postgres réel le 2026-07-02) ;
 *  - conflit de nom (index unique campagne_id + lower(nom), 23505) -> erreur typée `duplicate` ;
 *  - aucune interpolation de saisie dans un mini-DSL `.or()` : uniquement `.eq()`/`.in()`.
 *
 * RLS : `authenticated_full_access` (mono-tenant plat) - à durcir au 4e utilisateur.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';
import type { Marque } from '$lib/marque';
import type { CampagneError } from '$lib/server/campagnes';
import { GROUPE_NOM_MAX, MAX_GROUPE_LEAD_IDS, type CampagneGroupe } from '$lib/campagne-groupes';

export { GROUPE_NOM_MAX, MAX_GROUPE_LEAD_IDS };
export type { CampagneGroupe };

const UNIQUE_VIOLATION = '23505';
const FK_VIOLATION = '23503';
const CHECK_VIOLATION = '23514';
const IN_CHUNK = 500; // lots d'ids pour `.in()` (< cap PostgREST, cohérent avec campagnes.ts)

function sanitizeNom(nom: string): string {
	return nom.trim();
}
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/;
function nomInvalide(nom: string): boolean {
	// Caractères de contrôle rejetés à la source (audit sécu 2026-07-02, Low) : un C0 au milieu
	// du nom passerait trim()+longueur mais casserait le parsing XML des moteurs PDF en aval.
	return nom.length === 0 || nom.length > GROUPE_NOM_MAX || CONTROL_CHARS.test(nom);
}

/** Liste les groupes d'une campagne (le tri d'affichage - alphabétique fr - est fait côté pur). */
export async function listGroupes(
	supabase: SupabaseClient<Database>,
	marque: Marque,
	campagneId: string
): Promise<{ data: CampagneGroupe[]; error: { message: string } | null }> {
	const { data, error } = await supabase
		.from('campagne_groupes')
		.select('*')
		.eq('marque', marque)
		.eq('campagne_id', campagneId)
		.order('date_creation', { ascending: true });
	if (error) return { data: [], error };
	return { data: (data ?? []) as CampagneGroupe[], error: null };
}

/** Crée un groupe dans une campagne. Conflit de nom (insensible à la casse) -> `duplicate`. */
export async function createGroupe(
	supabase: SupabaseClient<Database>,
	marque: Marque,
	input: { campagneId: string; nom: string; userId: string | null }
): Promise<{ data: CampagneGroupe | null; error: CampagneError | null }> {
	const nom = sanitizeNom(input.nom);
	if (nomInvalide(nom)) {
		return { data: null, error: { code: 'invalid', message: 'Nom de groupe invalide.' } };
	}
	// marque du groupe = marque active (== marque de la campagne parente) : la FK composite
	// (campagne_id, marque) → campagnes(id, marque) rejette (23503) sinon. La poser est
	// OBLIGATOIRE : sans elle, le DEFAULT 'filmpro' casse la création d'un groupe LED.
	const { data, error } = await supabase
		.from('campagne_groupes')
		.insert({ campagne_id: input.campagneId, nom, created_by: input.userId, marque })
		.select('*')
		.single();
	if (error) {
		if (error.code === UNIQUE_VIOLATION) {
			return { data: null, error: { code: 'duplicate', message: `Un groupe « ${nom} » existe déjà dans cette campagne.` } };
		}
		if (error.code === FK_VIOLATION) {
			return { data: null, error: { code: 'invalid', message: 'Campagne inexistante.' } };
		}
		if (error.code === CHECK_VIOLATION) {
			return { data: null, error: { code: 'invalid', message: 'Nom de groupe invalide.' } };
		}
		return { data: null, error: { code: 'db', message: error.message } };
	}
	return { data: data as CampagneGroupe, error: null };
}

/** Renomme un groupe (scopé par campagne : un gid d'une autre campagne ne matche jamais). */
export async function renameGroupe(
	supabase: SupabaseClient<Database>,
	campagneId: string,
	groupeId: string,
	nom: string
): Promise<{ data: CampagneGroupe | null; error: CampagneError | null }> {
	const trimmed = sanitizeNom(nom);
	if (nomInvalide(trimmed)) {
		return { data: null, error: { code: 'invalid', message: 'Nom de groupe invalide.' } };
	}
	const { data, error } = await supabase
		.from('campagne_groupes')
		.update({ nom: trimmed })
		.eq('id', groupeId)
		.eq('campagne_id', campagneId)
		.select('*')
		.maybeSingle();
	if (error) {
		if (error.code === UNIQUE_VIOLATION) {
			return { data: null, error: { code: 'duplicate', message: `Un groupe « ${trimmed} » existe déjà dans cette campagne.` } };
		}
		if (error.code === CHECK_VIOLATION) {
			return { data: null, error: { code: 'invalid', message: 'Nom de groupe invalide.' } };
		}
		return { data: null, error: { code: 'db', message: error.message } };
	}
	if (!data) return { data: null, error: { code: 'invalid', message: 'Groupe introuvable dans cette campagne.' } };
	return { data: data as CampagneGroupe, error: null };
}

/**
 * Supprime un groupe (scopé par campagne). Les prospects du groupe repassent « sans groupe »
 * (FK ON DELETE SET NULL (groupe_id), testé postgres réel) - aucun lien ni lead supprimé.
 */
export async function deleteGroupe(
	supabase: SupabaseClient<Database>,
	campagneId: string,
	groupeId: string
): Promise<{ error: CampagneError | null }> {
	const { data, error } = await supabase
		.from('campagne_groupes')
		.delete()
		.eq('id', groupeId)
		.eq('campagne_id', campagneId)
		.select('id')
		.maybeSingle();
	if (error) return { error: { code: 'db', message: error.message } };
	if (!data) return { error: { code: 'invalid', message: 'Groupe introuvable dans cette campagne.' } };
	return { error: null };
}

/**
 * Assigne (ou retire : `groupeId = null`) un groupe à un lot de prospects DE cette campagne.
 * N'update que les liens existants de la campagne (`campagne_id` + `lead_id in (...)`) : un
 * lead non étiqueté à la campagne est simplement ignoré (jamais créé ici). Renvoie le nombre
 * de liens réellement mis à jour (l'UI affiche un compte honnête).
 */
export async function assignGroupeToLeads(
	supabase: SupabaseClient<Database>,
	campagneId: string,
	groupeId: string | null,
	leadIds: readonly string[]
): Promise<{ updated: number; error: CampagneError | null }> {
	const lids = [...new Set(leadIds.filter((s) => typeof s === 'string' && s.length > 0))].slice(
		0,
		MAX_GROUPE_LEAD_IDS
	);
	if (lids.length === 0) return { updated: 0, error: null };

	// Appartenance du groupe à LA campagne vérifiée avant l'update (la FK composite re-garantit
	// la même règle au niveau base ; ici on la traduit en 400 propre plutôt qu'en 23503).
	if (groupeId !== null) {
		const { data: g, error: gErr } = await supabase
			.from('campagne_groupes')
			.select('id')
			.eq('id', groupeId)
			.eq('campagne_id', campagneId)
			.maybeSingle();
		if (gErr) return { updated: 0, error: { code: 'db', message: gErr.message } };
		if (!g) return { updated: 0, error: { code: 'invalid', message: 'Groupe introuvable dans cette campagne.' } };
	}

	let updated = 0;
	for (let i = 0; i < lids.length; i += IN_CHUNK) {
		const chunk = lids.slice(i, i + IN_CHUNK);
		const { data, error } = await supabase
			.from('prospect_lead_campagnes')
			.update({ groupe_id: groupeId })
			.eq('campagne_id', campagneId)
			.in('lead_id', chunk)
			.select('lead_id');
		if (error) {
			if (error.code === FK_VIOLATION) {
				// Course : groupe supprimé entre la vérification et l'update (TOCTOU fermé par la FK).
				return { updated, error: { code: 'invalid', message: 'Groupe introuvable dans cette campagne.' } };
			}
			return { updated, error: { code: 'db', message: error.message } };
		}
		updated += (data ?? []).length;
	}
	return { updated, error: null };
}
