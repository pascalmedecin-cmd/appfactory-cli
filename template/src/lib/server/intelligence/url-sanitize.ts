// URL sanitizer pour la veille FilmPro (refonte anti-hallucination 2026-05-05).
//
// Origine : audit W18 a révélé 3/6 URLs corrompues par suffixe parasite `',6`
// (bug sérialiseur LLM/JSON). Le constructeur `new URL()` accepte les apostrophes,
// donc verifyUrl HEAD partait sur une URL fausse → 404 silencieux. On strippe
// proactivement les suffixes parasites avant toute vérification.
//
// Sanitizer conservatif : n'altère QUE le suffixe trailing du path/query/hash.
// Ne touche jamais le scheme, l'host ni le port. En cas de doute → return tel quel.

const TRAILING_PARASITE_RE = /['",;\s]+\d*$/;

const TRAILING_PARASITE_MAX_ITERATIONS = 3;

export interface SanitizeUrlResult {
	cleaned: string;
	changed: boolean;
}

export function sanitizeUrl(rawUrl: string): SanitizeUrlResult {
	if (typeof rawUrl !== 'string') {
		return { cleaned: '', changed: false };
	}

	let cleaned = rawUrl.trim();
	const original = cleaned;

	// Strip itératif borné : capture les patterns chaînés type `'`,6` ou `"';`.
	for (let i = 0; i < TRAILING_PARASITE_MAX_ITERATIONS; i++) {
		const next = cleaned.replace(TRAILING_PARASITE_RE, '');
		if (next === cleaned) break;
		cleaned = next;
	}

	return { cleaned, changed: cleaned !== original };
}

/**
 * Applique sanitizeUrl à toutes les URLs item-level d'une liste.
 * Retourne les URLs modifiées + compteur pour log/audit.
 */
export function sanitizeUrlsBatch<T extends { source: { url: string } }>(
	items: T[]
): { items: T[]; sanitizedCount: number } {
	let sanitizedCount = 0;
	const out = items.map((item) => {
		const { cleaned, changed } = sanitizeUrl(item.source.url);
		if (changed) {
			sanitizedCount++;
			return { ...item, source: { ...item.source, url: cleaned } };
		}
		return item;
	});
	return { items: out, sanitizedCount };
}
