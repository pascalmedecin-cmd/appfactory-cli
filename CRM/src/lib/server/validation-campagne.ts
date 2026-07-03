/**
 * Validation externe des prospects d'une campagne (2026-07-02).
 *
 * Une personne de l'équipe SANS compte CRM reçoit un lien secret (/validation/<token>) et
 * marque chaque prospect « garder » ou « retirer » (fiche Google Maps à l'appui). Les décisions
 * vivent sur le lien N-N `prospect_lead_campagnes` (même doctrine que `groupe_id` : la décision
 * vaut pour CE prospect DANS CETTE campagne). Le retrait effectif reste un geste fondateur
 * (« Appliquer les retraits » sur la page campagne).
 *
 * Sécurité :
 *  - token 32 octets aléatoires (base64url, 43 chars), transmis UNE fois au fondateur ; seule
 *    son empreinte SHA-256 (hex) est stockée -> un dump de table ne donne aucun lien valide ;
 *  - résolution par égalité d'empreinte (lookup indexé) : pas de comparaison de secret en
 *    mémoire, pas d'oracle de timing exploitable (l'attaquant ne contrôle pas la préimage) ;
 *  - expiration 2 jours (décision Pascal 02/07) + révocation ; générer un nouveau lien révoque
 *    les précédents (au plus UN lien actif par campagne) ;
 *  - RLS authenticated sur la table : la page publique passe par le client service role côté
 *    serveur, APRÈS résolution du token. Aucune policy anon.
 */
import { createHash, randomBytes } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';

/** Durée de vie d'un lien de validation : 2 jours (décision Pascal 02/07). */
export const VALIDATION_LIEN_TTL_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Kill-switch global de la PORTE PUBLIQUE (env `VALIDATION_EXTERNE_ENABLED`, défaut ON).
 *
 * Le flag JWT `ffCrmListesV2` ne s'applique PAS aux routes publiques (pas de session -> pas de
 * claim). Cette variable est le SEUL levier pour fermer instantanément page + API sans migration
 * ni révocation individuelle : posée sur `0`/`false`/`off`/`no` (insensible à la casse), elle
 * doit être testée EN TÊTE du load public et de l'API decision, AVANT toute lecture DB.
 * Fonction PURE (valeur d'env injectée) pour être testable sans toucher `$env`.
 */
export function validationExterneEnabled(raw: string | undefined | null): boolean {
	if (raw == null) return true; // défaut ON : la variable n'a pas à être posée en temps normal
	const v = raw.trim().toLowerCase();
	return v !== '0' && v !== 'false' && v !== 'off' && v !== 'no';
}

export const VALIDATION_STATUTS = ['garder', 'retirer'] as const;
export type ValidationStatut = (typeof VALIDATION_STATUTS)[number];

export function isValidationStatut(v: unknown): v is ValidationStatut {
	return typeof v === 'string' && (VALIDATION_STATUTS as readonly string[]).includes(v);
}

/** Forme d'un token émis : base64url de 32 octets = exactement 43 caractères. */
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export function isValidationTokenShape(token: unknown): token is string {
	return typeof token === 'string' && TOKEN_RE.test(token);
}

/** Empreinte SHA-256 hex du token (seule valeur stockée en base). */
export function hashValidationToken(token: string): string {
	return createHash('sha256').update(token, 'utf8').digest('hex');
}

export type ValidationLienActif = {
	id: string;
	expires_at: string;
	date_creation: string;
};

type DbError = { message: string } | null;

/**
 * Lien actif (non révoqué, non expiré) d'une campagne, ou null. Le token en clair n'existe
 * plus : cet état sert à afficher « un lien est actif jusqu'au ... » et à le révoquer.
 */
export async function getValidationLienActif(
	supabase: SupabaseClient<Database>,
	campagneId: string
): Promise<{ data: ValidationLienActif | null; error: DbError }> {
	const { data, error } = await supabase
		.from('campagne_validation_liens')
		.select('id, expires_at, date_creation')
		.eq('campagne_id', campagneId)
		.is('revoked_at', null)
		.gt('expires_at', new Date().toISOString())
		.order('date_creation', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (error) return { data: null, error };
	return { data: (data as ValidationLienActif) ?? null, error: null };
}

/** Révoque tous les liens encore actifs d'une campagne (idempotent). */
export async function revokeValidationLiens(
	supabase: SupabaseClient<Database>,
	campagneId: string
): Promise<{ error: DbError }> {
	const { error } = await supabase
		.from('campagne_validation_liens')
		.update({ revoked_at: new Date().toISOString() })
		.eq('campagne_id', campagneId)
		.is('revoked_at', null);
	return { error: error ?? null };
}

/**
 * Génère un nouveau lien de validation pour la campagne. Révoque d'abord les liens actifs
 * (invariant : au plus un lien actif par campagne). Retourne le token EN CLAIR - c'est le
 * seul moment où il existe ; l'appelant construit l'URL et ne le persiste nulle part.
 */
export async function createValidationLien(
	supabase: SupabaseClient<Database>,
	campagneId: string,
	userId: string | null
): Promise<{ data: { token: string; expiresAt: string } | null; error: DbError }> {
	const expiresAt = new Date(Date.now() + VALIDATION_LIEN_TTL_MS).toISOString();

	// Deux tentatives : une génération CONCURRENTE sur la même campagne peut faire échouer l'insert
	// sur l'index partiel unique `uniq_cvl_actif_par_campagne` (23505) - deux fondateurs révoquent
	// puis insèrent au même instant. On révoque à nouveau (ce qui inclut alors le lien du concurrent)
	// puis on réinsère : le dernier générateur gagne, cohérent avec « un nouveau lien révoque le
	// précédent ». Sans ce garde, la 2ᵉ requête retournait un 500 opaque (bug-hunter, Medium).
	for (let attempt = 0; attempt < 2; attempt++) {
		const { error: revokeErr } = await revokeValidationLiens(supabase, campagneId);
		if (revokeErr) return { data: null, error: revokeErr };

		const token = randomBytes(32).toString('base64url');
		const { error } = await supabase.from('campagne_validation_liens').insert({
			campagne_id: campagneId,
			token_hash: hashValidationToken(token),
			expires_at: expiresAt,
			created_by: userId,
		});
		if (!error) return { data: { token, expiresAt }, error: null };
		// Seul le conflit d'unicité (lien actif concurrent) est réessayable ; toute autre erreur remonte.
		if ((error as { code?: string }).code !== '23505') return { data: null, error };
	}
	return { data: null, error: { message: 'Génération du lien en conflit, réessayez.' } };
}

export type TokenResolution =
	| { status: 'ok'; lienId: string; campagneId: string; expiresAt: string; confirmedAt: string | null }
	| { status: 'introuvable' }
	| { status: 'expire' }
	| { status: 'db'; message: string };

/**
 * Résout un token brut (page publique). Distingue :
 *  - ok          : lien valide -> campagneId ;
 *  - introuvable : token inconnu ou malformé (404 générique, anti-énumération) ;
 *  - expire      : lien existant mais révoqué/expiré (message dédié : « demandez un nouveau lien ») ;
 *  - db          : échec transitoire (jamais présenté comme lien invalide).
 */
export async function resolveValidationToken(
	supabase: SupabaseClient<Database>,
	rawToken: unknown
): Promise<TokenResolution> {
	if (!isValidationTokenShape(rawToken)) return { status: 'introuvable' };

	const { data, error } = await supabase
		.from('campagne_validation_liens')
		.select('id, campagne_id, expires_at, revoked_at, confirmed_at')
		.eq('token_hash', hashValidationToken(rawToken))
		.maybeSingle();
	if (error) return { status: 'db', message: error.message };
	if (!data) return { status: 'introuvable' };
	if (data.revoked_at !== null || new Date(data.expires_at).getTime() <= Date.now()) {
		return { status: 'expire' };
	}
	return {
		status: 'ok',
		lienId: data.id,
		campagneId: data.campagne_id,
		expiresAt: data.expires_at,
		confirmedAt: data.confirmed_at,
	};
}

/**
 * Confirmation finale de la personne externe (« Envoyer la validation », 2026-07-03) : horodate
 * le lien résolu. Renvoyer après un changement d'avis met simplement l'horodatage à jour (le
 * dernier envoi prime). Signal INFORMATIF côté CRM (« Validation reçue ») : ne bloque jamais
 * l'avancement de la campagne ni l'impression des étiquettes.
 */
export async function confirmValidationLien(
	supabase: SupabaseClient<Database>,
	lienId: string
): Promise<{ confirmedAt: string | null; error: DbError }> {
	const confirmedAt = new Date().toISOString();
	const { error } = await supabase
		.from('campagne_validation_liens')
		.update({ confirmed_at: confirmedAt })
		.eq('id', lienId);
	if (error) return { confirmedAt: null, error };
	return { confirmedAt, error: null };
}

/**
 * Confirmation du ROUND COURANT d'une campagne = `confirmed_at` du lien le plus récent (actif,
 * expiré ou révoqué - la confirmation survit à l'expiration du lien). Générer un nouveau lien
 * ouvre un nouveau round non confirmé : le badge « Validation reçue » disparaît jusqu'à la
 * prochaine confirmation.
 */
export async function getValidationConfirmation(
	supabase: SupabaseClient<Database>,
	campagneId: string
): Promise<{ confirmedAt: string | null; error: DbError }> {
	const { data, error } = await supabase
		.from('campagne_validation_liens')
		.select('confirmed_at')
		.eq('campagne_id', campagneId)
		.order('date_creation', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (error) return { confirmedAt: null, error };
	return { confirmedAt: data?.confirmed_at ?? null, error: null };
}

/**
 * Enregistre une décision (garder / retirer / null = annuler) pour un prospect DANS une
 * campagne. `count: 'exact'` : 0 ligne touchée = le prospect n'est plus dans la campagne
 * (retiré par un fondateur entre-temps) -> `notFound`, l'UI publique rafraîchit sa liste.
 */
export async function setValidationDecision(
	supabase: SupabaseClient<Database>,
	campagneId: string,
	leadId: string,
	statut: ValidationStatut | null
): Promise<{ notFound: boolean; error: DbError }> {
	const { error, count } = await supabase
		.from('prospect_lead_campagnes')
		.update(
			{
				validation_statut: statut,
				validation_at: statut === null ? null : new Date().toISOString(),
			},
			{ count: 'exact' }
		)
		.eq('campagne_id', campagneId)
		.eq('lead_id', leadId);
	if (error) return { notFound: false, error };
	return { notFound: (count ?? 0) === 0, error: null };
}

/**
 * Applique les retraits décidés : supprime de la campagne les liens marqués « retirer »
 * (geste fondateur, ConfirmModal côté UI). Ne supprime JAMAIS les prospects eux-mêmes.
 * Retourne le nombre de liens supprimés (count exact, jamais estimé).
 */
export async function applyValidationRetraits(
	supabase: SupabaseClient<Database>,
	campagneId: string
): Promise<{ removed: number; error: DbError }> {
	const { error, count } = await supabase
		.from('prospect_lead_campagnes')
		.delete({ count: 'exact' })
		.eq('campagne_id', campagneId)
		.eq('validation_statut', 'retirer');
	if (error) return { removed: 0, error };
	return { removed: count ?? 0, error: null };
}
