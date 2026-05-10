/**
 * Normalisation NFD unifiée (audit 360 H-22, S178 V2a).
 *
 * Avant : 5 implémentations inline `s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()`
 * dispersées dans `text-utils.ts`, `scoring.ts`, `segment-mapper.ts`,
 * `ImportModal.svelte`, `searchch/helpers.ts`. Toute évolution (locale tr,
 * cas Unicode bord) devait être propagée à 5 endroits → drift garanti.
 *
 * Après : source unique. Les 5 sites importent `normalizeNFD` ou
 * `normalizeNFDTrim` (variante avec `.trim()` post-normalisation).
 *
 * Implémentation : NFD = decomposition canonique Unicode (sépare base+accent).
 * Le range `̀-ͯ` (Combining Diacritical Marks) couvre tous les
 * accents latins/cyrilliques/grecs/etc. attendus dans nos données CH.
 */

/**
 * Normalise un texte pour matching insensible accents/casse.
 * `'Bâtiment'` → `'batiment'`, `'Zürich'` → `'zurich'`, `'café'` → `'cafe'`.
 *
 * Préserve les espaces, ponctuation, chiffres, emojis (Unicode hors range
 * combining marks).
 */
export function normalizeNFD(s: string): string {
	return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Variante : normalizeNFD + `.trim()`. Utilisée par les sites qui matchent
 * une saisie utilisateur (denylist génériques search.ch, ImportModal).
 */
export function normalizeNFDTrim(s: string): string {
	return normalizeNFD(s).trim();
}
