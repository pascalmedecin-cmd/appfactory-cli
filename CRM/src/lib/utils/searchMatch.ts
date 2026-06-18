/**
 * Primitive de matching de recherche texte des listes CRM (Vague 1 cohérence, 2026-06-18).
 *
 * Source unique du contrat de recherche : matching insensible aux accents et à la casse,
 * délai de debounce commun. S'appuie sur `normalizeNFD` (text-normalize.ts, audit 360 H-22)
 * sans ré-implémenter la normalisation.
 *
 * Côté serveur (Prospection, recherche paginée), seuls l'UI et le debounce sont partagés ;
 * le matching réel reste fait par Postgres `.ilike` (cf. SPEC_VAGUE1_COHERENCE § 1.3, pas de
 * migration DB). Côté client (Signaux, liste bornée), le filtrage utilise ces helpers.
 */
import { normalizeNFD } from './text-normalize';

/** Délai de debounce commun aux recherches de liste (contrat Vague 1 § 1.4). */
export const SEARCH_DEBOUNCE_MS = 250;

/** Alias nommé de la normalisation de recherche (NFD + minuscules). */
export const normalizeForSearch = normalizeNFD;

/**
 * Vrai si `query` (normalisée) est une sous-chaîne de `haystack` (normalisé).
 * Une query vide ou composée d'espaces ne filtre rien (retourne `true`).
 */
export function matchesQuery(haystack: string, query: string): boolean {
	const q = normalizeNFD(query).trim();
	if (!q) return true;
	return normalizeNFD(haystack).includes(q);
}

/**
 * Vrai si au moins un des `fields` (non nuls) matche `query`.
 * Query vide → `true`. Les champs `null`/`undefined` sont ignorés.
 */
export function matchesAnyField(
	fields: Array<string | null | undefined>,
	query: string
): boolean {
	const q = normalizeNFD(query).trim();
	if (!q) return true;
	return fields.some((f) => f != null && normalizeNFD(f).includes(q));
}
