import { normalizeNFD } from '$lib/utils/text-normalize';

export type KeywordCategorie = 'coeur' | 'bonus' | 'eviter';

export interface KeywordRow {
	id: string;
	terme: string;
	terme_norm: string;
	categorie: KeywordCategorie;
	poids: number;
}

export interface KeywordMatch {
	keyword: KeywordRow;
	count: number;
}

export interface KeywordScore {
	total: number;
	matches: KeywordMatch[];
	criteres: string[];
}

// Plafonds par catégorie (figés V1, voir spec § 5).
export const KEYWORD_CAPS = {
	coeur: 10,
	bonus: 4,
} as const;

// Poids par défaut signés par catégorie (figés V1, voir spec § 3 hors-scope).
// Source unique pour le serveur (POIDS_PAR_CATEGORIE[cat] à l'insert), le panneau UI
// (label visible « +5 / +2 / -3 »), et toute future migration de poids éditable V2.
export const POIDS_PAR_CATEGORIE: Record<KeywordCategorie, number> = {
	coeur: 5,
	bonus: 2,
	eviter: -3,
} as const;

// Bornes globales du score keywords (avant ajout aux autres composants v1).
export const KEYWORD_SCORE_FLOOR = -10;
export const KEYWORD_SCORE_CEIL = 20;

// Échappe un terme pour usage safe dans une RegExp.
function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Construit la regex plein-mot pour un terme normalisé (NFD strip + lowercase).
// `\b` marche pour les mots commençant/finissant par [A-Za-z0-9_] après NFD ;
// on l'utilise tel quel car normalizeNFD a déjà retiré les accents.
//
// V3 (S188) : suffix `s?` optionnel pour tolérer le pluriel FR (« vitrage » matche
// aussi « vitrages »). Le suffix n'est PAS ajouté si le terme finit déjà par `s`
// (évite « vitrages » → `vitragess?`). Le pluriel ne s'applique que sur la fin du
// terme entier : « contrôle solaire » ne matche pas « contrôles solaires » (pluriel
// distribué non couvert, hors-scope spec § 3).
function makeWordRegex(termeNorm: string): RegExp {
	const suffix = termeNorm.endsWith('s') ? '' : 's?';
	return new RegExp(`\\b${escapeRegex(termeNorm)}${suffix}\\b`, 'gi');
}

/**
 * Compte les matchs plein-mot d'un terme dans un texte normalisé.
 * `route` ne matche pas `routine` ni `routes-poutres`.
 * Multi-mots supportés : `contrôle solaire` ne matche que la séquence exacte.
 */
function countMatches(textNorm: string, termeNorm: string): number {
	if (!termeNorm || termeNorm.length < 2) return 0;
	const re = makeWordRegex(termeNorm);
	const m = textNorm.match(re);
	return m ? m.length : 0;
}

/**
 * Score un texte selon une liste de mots-clés catégorisés.
 * Cœur : `min(nb_matchs * poids, KEYWORD_CAPS.coeur)`.
 * Bonus : `min(nb_matchs * poids, KEYWORD_CAPS.bonus)`.
 * Éviter : si ≥ 1 match, malus fixe = `poids` (V1, pas de cumul intra-éviter).
 * Score final clampé `[KEYWORD_SCORE_FLOOR, KEYWORD_SCORE_CEIL]`.
 */
export function scoreKeywords(text: string | null | undefined, keywords: KeywordRow[]): KeywordScore {
	const out: KeywordScore = { total: 0, matches: [], criteres: [] };
	if (!text || !Array.isArray(keywords) || keywords.length === 0) return out;
	const textNorm = normalizeNFD(text);

	// Buckets par catégorie pour appliquer les plafonds.
	let coeurRaw = 0;
	let bonusRaw = 0;
	let eviterApplied = 0;
	const coeurDetail: string[] = [];
	const bonusDetail: string[] = [];
	const eviterDetail: string[] = [];

	for (const kw of keywords) {
		const n = countMatches(textNorm, kw.terme_norm);
		if (n === 0) continue;
		out.matches.push({ keyword: kw, count: n });

		if (kw.categorie === 'coeur') {
			coeurRaw += n * kw.poids;
			coeurDetail.push(`${kw.terme}×${n}`);
		} else if (kw.categorie === 'bonus') {
			bonusRaw += n * kw.poids;
			bonusDetail.push(`${kw.terme}×${n}`);
		} else {
			// 'eviter' : malus fixe à la 1re occurrence d'un terme éviter ; on cumule
			// les poids signés des termes distincts éviter détectés (cap au plancher global).
			eviterApplied += kw.poids;
			eviterDetail.push(kw.terme);
		}
	}

	const coeurApplied = Math.min(coeurRaw, KEYWORD_CAPS.coeur);
	const bonusApplied = Math.min(bonusRaw, KEYWORD_CAPS.bonus);

	if (coeurApplied > 0) {
		out.criteres.push(
			coeurRaw <= KEYWORD_CAPS.coeur
				? `Cœur ${coeurDetail.join(', ')} (+${coeurApplied})`
				: `Cœur ${coeurDetail.join(', ')} plafonné (+${coeurApplied}/${coeurRaw})`,
		);
	}
	if (bonusApplied > 0) {
		out.criteres.push(
			bonusRaw <= KEYWORD_CAPS.bonus
				? `Bonus ${bonusDetail.join(', ')} (+${bonusApplied})`
				: `Bonus ${bonusDetail.join(', ')} plafonné (+${bonusApplied}/${bonusRaw})`,
		);
	}
	if (eviterApplied !== 0) {
		out.criteres.push(`Éviter ${eviterDetail.join(', ')} (${eviterApplied})`);
	}

	const raw = coeurApplied + bonusApplied + eviterApplied;
	out.total = Math.max(KEYWORD_SCORE_FLOOR, Math.min(KEYWORD_SCORE_CEIL, raw));
	return out;
}

/**
 * Helper pour le surlignage UI : retourne les ranges [start, end, cat] des matchs
 * dans le texte ORIGINAL (pas normalisé), pour pouvoir construire des chunks
 * `<mark class="cat-X">` côté Svelte sans `{@html}`.
 *
 * Stratégie : on normalise le texte ET on garde une map d'offset original ↔ normalisé.
 * Comme normalizeNFD strip les diacritiques (qui sont des codepoints à part) et
 * lowercase (qui préserve la longueur pour ASCII et la plupart des cas latins),
 * on construit la map en parcourant les codepoints originaux et en notant
 * pour chacun la longueur de sa version normalisée. Pas parfait pour les ligatures
 * (ß → ss) mais largement suffisant pour notre vocabulaire FR + CH.
 */
export interface HighlightChunk {
	text: string;
	cat: KeywordCategorie | null;
}

// Map des offsets entre la chaîne originale (avec accents) et la normalisée (sans accents,
// lowercase). Utilisée à la fois par highlightKeywords (V2) et highlightKeywordsAndSearch (V3).
// Pas exporté : helper privé du module.
function buildOffsetMap(text: string): {
	origChars: string[];
	normStr: string;
	normToOrig: number[];
} {
	const origChars: string[] = Array.from(text);
	let normStr = '';
	const origStartInNorm: number[] = []; // origStartInNorm[i] = offset où démarre origChars[i] dans normStr
	for (const c of origChars) {
		origStartInNorm.push(normStr.length);
		normStr += normalizeNFD(c);
	}
	origStartInNorm.push(normStr.length); // sentinelle
	const normToOrig: number[] = new Array(normStr.length + 1);
	let i = 0;
	for (let k = 0; k <= normStr.length; k++) {
		while (i + 1 < origStartInNorm.length && origStartInNorm[i + 1] <= k) i++;
		normToOrig[k] = i;
	}
	return { origChars, normStr, normToOrig };
}

export function highlightKeywords(text: string, keywords: KeywordRow[]): HighlightChunk[] {
	if (!text) return [];
	if (!Array.isArray(keywords) || keywords.length === 0) return [{ text, cat: null }];

	const { origChars, normStr, normToOrig } = buildOffsetMap(text);

	// Collecte tous les matchs (origStart, origEnd, cat). Plusieurs keywords peuvent
	// se chevaucher ; on garde le 1er match qui couvre chaque caractère.
	type Range = { start: number; end: number; cat: KeywordCategorie };
	const ranges: Range[] = [];
	for (const kw of keywords) {
		if (!kw.terme_norm || kw.terme_norm.length < 2) continue;
		const re = makeWordRegex(kw.terme_norm);
		let m: RegExpExecArray | null;
		while ((m = re.exec(normStr)) !== null) {
			const start = normToOrig[m.index];
			const end = normToOrig[m.index + m[0].length];
			ranges.push({ start, end, cat: kw.categorie });
		}
	}
	if (ranges.length === 0) return [{ text, cat: null }];

	// Tri par start, fusion : on garde le 1er range qui démarre, on saute ceux qui chevauchent.
	ranges.sort((a, b) => a.start - b.start || b.end - a.end);
	const chunks: HighlightChunk[] = [];
	let cursor = 0;
	for (const r of ranges) {
		if (r.start < cursor) continue;
		if (r.start > cursor) {
			chunks.push({ text: origChars.slice(cursor, r.start).join(''), cat: null });
		}
		chunks.push({ text: origChars.slice(r.start, r.end).join(''), cat: r.cat });
		cursor = r.end;
	}
	if (cursor < origChars.length) {
		chunks.push({ text: origChars.slice(cursor).join(''), cat: null });
	}
	return chunks;
}

// ----------------------------------------------------------------------------
// V4 (refonte signaux S189) : catégorie dominante par card.

/**
 * Détermine la catégorie dominante d'un texte selon les mots-clés détectés.
 * Priorité visuelle (spec V4) : Cœur > Bonus > Éviter > null (aucun match).
 *
 * Usage : alimente le bandeau coloré 3 px en haut de chaque card signal (page
 * `/signaux`) pour permettre une identification à l'œil nu (sans lire le texte)
 * de la classe d'intérêt d'un signal. La couleur du bandeau = couleur de la
 * catégorie dominante (success pour Cœur, primary pour Bonus, danger pour
 * Éviter, transparent pour neutre).
 *
 * Volontairement basé sur la PRÉSENCE et non le SCORE : un signal avec 1 seul
 * match Cœur (faible) doit visuellement primer un signal avec 4 matches Bonus,
 * car c'est un projet vitrage avéré (Cœur métier FilmPro).
 */
export function dominantKeywordCategory(
	text: string | null | undefined,
	keywords: KeywordRow[],
): KeywordCategorie | null {
	if (!text || !Array.isArray(keywords) || keywords.length === 0) return null;
	const textNorm = normalizeNFD(text);
	let hasCoeur = false;
	let hasBonus = false;
	let hasEviter = false;
	for (const kw of keywords) {
		if (!kw.terme_norm || kw.terme_norm.length < 2) continue;
		if (countMatches(textNorm, kw.terme_norm) === 0) continue;
		if (kw.categorie === 'coeur') {
			hasCoeur = true;
			break; // Cœur prime : court-circuit dès le 1er match.
		}
		if (kw.categorie === 'bonus') hasBonus = true;
		else if (kw.categorie === 'eviter') hasEviter = true;
	}
	if (hasCoeur) return 'coeur';
	if (hasBonus) return 'bonus';
	if (hasEviter) return 'eviter';
	return null;
}

// ----------------------------------------------------------------------------
// V3 (refonte signaux S188) : composition keyword × search.

export const KW_SEARCH_MIN_LEN = 2;

export interface HighlightChunkV2 {
	text: string;
	cat: KeywordCategorie | null;
	search: boolean;
}

/**
 * Surlignage combiné catégorie keyword + recherche utilisateur.
 *
 * - keywords : matchs plein-mot (`\b...\b`) catégorisés Cœur/Bonus/Éviter.
 * - searchTerm : sous-chaîne libre (case-insensitive, accents-insensitive), longueur ≥ 2.
 *
 * Règle de priorité visuelle (spec § 4 C7) : si une portion de texte est à la fois dans
 * un keyword et dans un match de recherche, le **search prime** (chunk rendu jaune,
 * cat=null pour cette portion). Le reste du keyword reste catégorisé.
 *
 * Algorithme : painter char-par-char. Coût O(n*k) où n = longueur texte, k = nb keywords + 1.
 * Acceptable pour les descriptions SIMAP (~200 chars × 40 keywords = ~8 000 ops).
 */
export function highlightKeywordsAndSearch(
	text: string,
	keywords: KeywordRow[],
	searchTerm: string,
): HighlightChunkV2[] {
	if (!text) return [];
	const queryNorm = normalizeNFD((searchTerm ?? '').trim());
	const hasKeywords = Array.isArray(keywords) && keywords.length > 0;
	const hasSearch = queryNorm.length >= KW_SEARCH_MIN_LEN;
	if (!hasKeywords && !hasSearch) {
		return [{ text, cat: null, search: false }];
	}

	const { origChars, normStr, normToOrig } = buildOffsetMap(text);

	// État par caractère original. Default = (null, false).
	const stateAt: Array<{ cat: KeywordCategorie | null; search: boolean }> = origChars.map(() => ({
		cat: null,
		search: false,
	}));

	// Passe 1 : peindre les ranges keywords. First-win sur chevauchement (cohérent avec
	// le comportement de highlightKeywords V2).
	if (hasKeywords) {
		type Range = { start: number; end: number; cat: KeywordCategorie };
		const kwRanges: Range[] = [];
		for (const kw of keywords) {
			if (!kw.terme_norm || kw.terme_norm.length < 2) continue;
			const re = makeWordRegex(kw.terme_norm);
			let m: RegExpExecArray | null;
			while ((m = re.exec(normStr)) !== null) {
				kwRanges.push({
					start: normToOrig[m.index],
					end: normToOrig[m.index + m[0].length],
					cat: kw.categorie,
				});
			}
		}
		// Tri par start, fusion first-win (mêmes règles que highlightKeywords).
		kwRanges.sort((a, b) => a.start - b.start || b.end - a.end);
		let cursor = 0;
		for (const r of kwRanges) {
			if (r.start < cursor) continue;
			for (let i = r.start; i < r.end; i++) stateAt[i].cat = r.cat;
			cursor = r.end;
		}
	}

	// Passe 2 : peindre les ranges search (override cat → null sur la portion search).
	if (hasSearch) {
		let idx = 0;
		while ((idx = normStr.indexOf(queryNorm, idx)) !== -1) {
			const start = normToOrig[idx];
			const end = normToOrig[idx + queryNorm.length];
			for (let i = start; i < end; i++) {
				stateAt[i].search = true;
				stateAt[i].cat = null; // jaune prime
			}
			idx += queryNorm.length;
		}
	}

	// Groupage des positions consécutives ayant le même état.
	const out: HighlightChunkV2[] = [];
	let i = 0;
	while (i < origChars.length) {
		const start = i;
		const s = stateAt[i];
		while (
			i + 1 < origChars.length &&
			stateAt[i + 1].cat === s.cat &&
			stateAt[i + 1].search === s.search
		) {
			i++;
		}
		out.push({
			text: origChars.slice(start, i + 1).join(''),
			cat: s.cat,
			search: s.search,
		});
		i++;
	}
	return out;
}
