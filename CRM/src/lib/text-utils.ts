/**
 * Utilitaires texte : normalisation accents, matching mots-clés.
 */

// Audit 360 H-22 : normalisation NFD centralis\u00e9e dans `src/lib/utils/text-normalize.ts`.
// `normalizeText` reste un alias public pour ne pas casser les imports existants.
import { normalizeNFD } from './utils/text-normalize';

/** Supprime les diacritiques (accents) et met en minuscules. Alias `normalizeNFD`. */
export function normalizeText(text: string): string {
	return normalizeNFD(text);
}

/**
 * Vérifie si au moins un mot-clé matche dans les champs textuels d'un lead.
 * Matching insensible aux accents et à la casse, substring.
 *
 * @param motsCles - Liste de mots-clés à chercher
 * @param champs - Valeurs textuelles du lead à inspecter (null/undefined ignorés)
 * @returns true si au moins un mot-clé est trouvé dans au moins un champ
 */
export function matchMotsCles(motsCles: string[], champs: (string | null | undefined)[]): boolean {
	if (motsCles.length === 0) return true;

	const champsNorm = champs
		.filter((c): c is string => !!c)
		.map(normalizeText);

	if (champsNorm.length === 0) return false;

	const texteComplet = champsNorm.join(' ');
	return motsCles.some(mot => texteComplet.includes(normalizeText(mot)));
}
