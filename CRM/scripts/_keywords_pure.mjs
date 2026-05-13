/**
 * Helper ESM autonome partagé entre les scripts de rescore/seed et un test de parité
 * côté Vitest (cf. src/lib/scoring/keywords.test.ts § "parité runtime ↔ script").
 *
 * Doit RESTER aligné avec src/lib/scoring/keywords.ts (makeWordRegex + countMatches).
 * Le test de parité l'enforce automatiquement : tout changement de regex côté TS qui
 * n'est pas répliqué ici fait passer le test rouge.
 */

/** @param {string} s */
export function normalizeNFD(s) {
	return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** @param {string} s */
export function escapeRegex(s) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Aligné avec keywords.ts:makeWordRegex (S188 pluriel `s?` toléré, pas de double-pluralisation).
/** @param {string} termeNorm */
export function makeWordRegex(termeNorm) {
	const suffix = termeNorm.endsWith('s') ? '' : 's?';
	return new RegExp(`\\b${escapeRegex(termeNorm)}${suffix}\\b`, 'gi');
}

/** @param {string} textNorm @param {string} termeNorm @returns {number} */
export function countMatches(textNorm, termeNorm) {
	if (!termeNorm || termeNorm.length < 2) return 0;
	const re = makeWordRegex(termeNorm);
	const m = textNorm.match(re);
	return m ? m.length : 0;
}
