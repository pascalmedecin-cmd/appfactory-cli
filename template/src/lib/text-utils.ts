/**
 * Utilitaires texte : normalisation accents, matching mots-clés.
 */

/** Supprime les diacritiques (accents) et met en minuscules */
export function normalizeText(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
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
