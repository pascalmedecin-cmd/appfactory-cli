import { describe, it, expect, beforeAll } from 'vitest';
import {
	scoreKeywords,
	highlightKeywords,
	highlightKeywordsAndSearch,
	dominantKeywordCategory,
	KEYWORD_CAPS,
	KEYWORD_SCORE_FLOOR,
	KEYWORD_SCORE_CEIL,
	KW_SEARCH_MIN_LEN,
	type KeywordRow,
} from './keywords';

// Helper pour fabriquer un KeywordRow minimal (id factice, terme_norm calculé à la main).
function kw(terme: string, terme_norm: string, categorie: 'coeur' | 'bonus' | 'eviter', poids: number): KeywordRow {
	return { id: terme, terme, terme_norm, categorie, poids };
}

const KW_COEUR_VITRAGE = kw('vitrage', 'vitrage', 'coeur', 5);
const KW_COEUR_FILM = kw('film', 'film', 'coeur', 5);
const KW_COEUR_CONTROLE = kw('contrôle solaire', 'controle solaire', 'coeur', 5);
const KW_BONUS_REGIE = kw('régie', 'regie', 'bonus', 2);
const KW_BONUS_ARCHI = kw('architecte', 'architecte', 'bonus', 2);
const KW_EVITER_ROUTE = kw('route', 'route', 'eviter', -3);
const KW_EVITER_VOIRIE = kw('voirie', 'voirie', 'eviter', -3);

describe('scoreKeywords - bases', () => {
	it('retourne 0 sur texte vide', () => {
		expect(scoreKeywords('', [KW_COEUR_VITRAGE]).total).toBe(0);
		expect(scoreKeywords(null, [KW_COEUR_VITRAGE]).total).toBe(0);
		expect(scoreKeywords(undefined, [KW_COEUR_VITRAGE]).total).toBe(0);
	});

	it('retourne 0 sur liste vide', () => {
		expect(scoreKeywords('vitrage partout', []).total).toBe(0);
	});

	it('1 match Cœur = +5', () => {
		const r = scoreKeywords('rénovation du vitrage de la baie', [KW_COEUR_VITRAGE]);
		expect(r.total).toBe(5);
		expect(r.matches).toHaveLength(1);
		expect(r.matches[0].count).toBe(1);
		expect(r.criteres[0]).toContain('Cœur');
	});

	it('1 match Bonus = +2', () => {
		const r = scoreKeywords('architecte mandataire', [KW_BONUS_ARCHI]);
		expect(r.total).toBe(2);
	});

	it('1 match Éviter = -3 (cumul fixe par terme)', () => {
		const r = scoreKeywords('réfection de la route cantonale', [KW_EVITER_ROUTE]);
		expect(r.total).toBe(-3);
		expect(r.criteres[0]).toContain('Éviter');
	});
});

describe('scoreKeywords - match plein-mot', () => {
	it('route ne matche pas routine', () => {
		const r = scoreKeywords('changement de routine sur le projet', [KW_EVITER_ROUTE]);
		expect(r.total).toBe(0);
		expect(r.matches).toHaveLength(0);
	});

	it('route ne matche pas autoroute (au milieu)', () => {
		const r = scoreKeywords('autoroute A1 - tronçon Genève', [KW_EVITER_ROUTE]);
		expect(r.total).toBe(0);
	});

	it('film matche bien isolé', () => {
		const r = scoreKeywords('pose de film solaire', [KW_COEUR_FILM]);
		expect(r.total).toBe(5);
	});

	it('film ne matche pas filmer ou filmographie', () => {
		const r = scoreKeywords('filmographie complète', [KW_COEUR_FILM]);
		expect(r.total).toBe(0);
	});
});

describe('scoreKeywords - accents insensibles', () => {
	it('régie matche Regie / REGIE / régie / Régie', () => {
		expect(scoreKeywords('Regie immobilière', [KW_BONUS_REGIE]).total).toBe(2);
		expect(scoreKeywords('REGIE DUPONT', [KW_BONUS_REGIE]).total).toBe(2);
		expect(scoreKeywords('régie active', [KW_BONUS_REGIE]).total).toBe(2);
		expect(scoreKeywords('Régie Dupont SA', [KW_BONUS_REGIE]).total).toBe(2);
	});

	it('contrôle solaire matche controle solaire (sans accent)', () => {
		const r = scoreKeywords('pose de controle solaire avancé', [KW_COEUR_CONTROLE]);
		expect(r.total).toBe(5);
	});
});

describe('scoreKeywords - multi-mots', () => {
	it('contrôle solaire matche la séquence exacte', () => {
		const r = scoreKeywords('film de contrôle solaire premium', [KW_COEUR_CONTROLE]);
		expect(r.total).toBe(5);
	});

	it('contrôler le solaire ne matche pas contrôle solaire', () => {
		const r = scoreKeywords('contrôler le solaire en été', [KW_COEUR_CONTROLE]);
		expect(r.total).toBe(0);
	});
});

describe('scoreKeywords - plafonds par catégorie', () => {
	it('3 matches Cœur (+15 raw) sont plafonnés à KEYWORD_CAPS.coeur (+10)', () => {
		// 3 mots distincts Cœur, chacun 1 match
		const r = scoreKeywords('vitrage et film et contrôle solaire', [
			KW_COEUR_VITRAGE,
			KW_COEUR_FILM,
			KW_COEUR_CONTROLE,
		]);
		expect(r.total).toBe(KEYWORD_CAPS.coeur);
		expect(r.criteres[0]).toContain('plafonné');
		expect(r.criteres[0]).toContain('/15');
	});

	it('3 matches Cœur d\'un même mot (+15) plafonnés à +10', () => {
		const r = scoreKeywords('vitrage vitrage vitrage de qualité', [KW_COEUR_VITRAGE]);
		expect(r.total).toBe(KEYWORD_CAPS.coeur);
		expect(r.matches[0].count).toBe(3);
	});

	it('3 matches Bonus (+6 raw) plafonnés à KEYWORD_CAPS.bonus (+4)', () => {
		const r = scoreKeywords('régie régie architecte', [KW_BONUS_REGIE, KW_BONUS_ARCHI]);
		expect(r.total).toBe(KEYWORD_CAPS.bonus);
		expect(r.criteres[0]).toContain('plafonné');
	});
});

describe('scoreKeywords - éviter (malus cumulatif sur termes distincts)', () => {
	it('2 termes Éviter distincts cumulent les malus', () => {
		const r = scoreKeywords('voirie et route refaites', [KW_EVITER_ROUTE, KW_EVITER_VOIRIE]);
		expect(r.total).toBe(-6); // -3 + -3
	});

	it('plusieurs occurrences du même terme Éviter = malus fixe (pas de cumul intra-terme)', () => {
		const r = scoreKeywords('route route route', [KW_EVITER_ROUTE]);
		expect(r.total).toBe(-3);
		expect(r.matches[0].count).toBe(3); // compte gardé pour info
	});
});

describe('scoreKeywords - clamp global', () => {
	it('clamp au plancher KEYWORD_SCORE_FLOOR', () => {
		// 5 termes éviter distincts = -15 raw, clamp à -10.
		const kws: KeywordRow[] = [
			kw('a', 'a-term', 'eviter', -3), // ne matchera pas (length < 2 OK ici car >= 2 chars terme_norm)
			kw('route', 'route', 'eviter', -3),
			kw('voirie', 'voirie', 'eviter', -3),
			kw('pont', 'pont', 'eviter', -3),
			kw('tunnel', 'tunnel', 'eviter', -3),
			kw('chaussee', 'chaussee', 'eviter', -3),
		];
		const r = scoreKeywords('route voirie pont tunnel chaussee partout', kws);
		expect(r.total).toBe(KEYWORD_SCORE_FLOOR);
	});

	it('clamp au plafond KEYWORD_SCORE_CEIL', () => {
		// Cœur cap +10 + Bonus cap +4 = +14, encore sous +20.
		// On vérifie juste que le clamp ne descend pas un score normal.
		const r = scoreKeywords('vitrage film régie architecte', [
			KW_COEUR_VITRAGE,
			KW_COEUR_FILM,
			KW_BONUS_REGIE,
			KW_BONUS_ARCHI,
		]);
		expect(r.total).toBeLessThanOrEqual(KEYWORD_SCORE_CEIL);
		expect(r.total).toBe(10 + 4); // 2 cœur (+10 raw, déjà au cap) + 2 bonus (+4 raw au cap)
	});
});

describe('scoreKeywords - mix toutes catégories', () => {
	it('vitrage + régie + route = +5 +2 -3 = +4', () => {
		const r = scoreKeywords('vitrage de la régie à coté de la route', [
			KW_COEUR_VITRAGE,
			KW_BONUS_REGIE,
			KW_EVITER_ROUTE,
		]);
		expect(r.total).toBe(4);
		expect(r.criteres).toHaveLength(3);
	});

	it('termes < 2 chars dans la liste sont ignorés sans crash', () => {
		const r = scoreKeywords('vitrage', [kw('a', 'a', 'coeur', 5), KW_COEUR_VITRAGE]);
		expect(r.total).toBe(5);
	});
});

describe('highlightKeywords', () => {
	it('retourne un seul chunk si aucun match', () => {
		const chunks = highlightKeywords('aucun match ici', [KW_COEUR_VITRAGE]);
		expect(chunks).toEqual([{ text: 'aucun match ici', cat: null }]);
	});

	it('retourne un seul chunk si keywords vide', () => {
		const chunks = highlightKeywords('vitrage présent', []);
		expect(chunks).toEqual([{ text: 'vitrage présent', cat: null }]);
	});

	it('découpe correctement autour d\'un match Cœur', () => {
		const chunks = highlightKeywords('rénovation du vitrage existant', [KW_COEUR_VITRAGE]);
		expect(chunks).toHaveLength(3);
		expect(chunks[0]).toEqual({ text: 'rénovation du ', cat: null });
		expect(chunks[1].text).toBe('vitrage');
		expect(chunks[1].cat).toBe('coeur');
		expect(chunks[2]).toEqual({ text: ' existant', cat: null });
	});

	it('match accent-insensible préserve le texte original avec accents', () => {
		const chunks = highlightKeywords('Régie Dupont', [KW_BONUS_REGIE]);
		const matchChunk = chunks.find((c) => c.cat === 'bonus');
		expect(matchChunk?.text).toBe('Régie');
	});

	it('plusieurs matches catégories différentes', () => {
		const chunks = highlightKeywords('vitrage de la régie sur la route', [
			KW_COEUR_VITRAGE,
			KW_BONUS_REGIE,
			KW_EVITER_ROUTE,
		]);
		const cats = chunks.filter((c) => c.cat !== null).map((c) => c.cat);
		expect(cats).toEqual(['coeur', 'bonus', 'eviter']);
	});

	it('zéro caractère perdu : la somme des chunks = texte original', () => {
		const text = 'vitrage et régie et architecte';
		const chunks = highlightKeywords(text, [KW_COEUR_VITRAGE, KW_BONUS_REGIE, KW_BONUS_ARCHI]);
		expect(chunks.map((c) => c.text).join('')).toBe(text);
	});

	it('chevauchement : le 1er match couvre, les suivants sont ignorés', () => {
		// Cas pathologique : 2 keywords se chevauchent. On vérifie qu'il n'y a pas de doublon.
		const kwLong = kw('contrôle solaire', 'controle solaire', 'coeur', 5);
		const kwShort = kw('solaire', 'solaire', 'bonus', 2);
		const chunks = highlightKeywords('pose de contrôle solaire premium', [kwLong, kwShort]);
		const text = chunks.map((c) => c.text).join('');
		expect(text).toBe('pose de contrôle solaire premium');
		const highlighted = chunks.filter((c) => c.cat !== null);
		// Le terme plus long démarre en premier (start identique) ; en cas d'égalité on garde end plus grand.
		expect(highlighted).toHaveLength(1);
		expect(highlighted[0].text).toBe('contrôle solaire');
	});
});

describe('highlightKeywordsAndSearch - V3 composition keyword × search', () => {
	it('texte vide → []', () => {
		expect(highlightKeywordsAndSearch('', [KW_COEUR_VITRAGE], 'vit')).toEqual([]);
	});

	it('pas de keywords ni search → 1 chunk neutre', () => {
		const r = highlightKeywordsAndSearch('hello world', [], '');
		expect(r).toEqual([{ text: 'hello world', cat: null, search: false }]);
	});

	it('keyword seul, pas de search → comportement V2 + flag search=false', () => {
		const r = highlightKeywordsAndSearch('pose de vitrage neuf', [KW_COEUR_VITRAGE], '');
		const reconstr = r.map((c) => c.text).join('');
		expect(reconstr).toBe('pose de vitrage neuf');
		const hl = r.find((c) => c.cat === 'coeur');
		expect(hl?.text).toBe('vitrage');
		expect(hl?.search).toBe(false);
		// Tous les chunks ont search=false.
		expect(r.every((c) => c.search === false)).toBe(true);
	});

	it('search seul, pas de keywords → portion search en jaune', () => {
		const r = highlightKeywordsAndSearch('rendez-vous à Lausanne demain', [], 'lausanne');
		const hl = r.find((c) => c.search === true);
		expect(hl?.text).toBe('Lausanne');
		expect(hl?.cat).toBe(null);
	});

	it('search case-insensitive et accent-insensitive', () => {
		const r = highlightKeywordsAndSearch("La Régie d'Étoile a contacté", [], 'regie');
		const hl = r.find((c) => c.search === true);
		expect(hl?.text).toBe('Régie');
	});

	it('search trop court (< 2 chars) → ignoré', () => {
		const r = highlightKeywordsAndSearch('vitrage neuf', [KW_COEUR_VITRAGE], 'v');
		// Seul le keyword est highlighté ; pas de chunk search:true.
		expect(r.some((c) => c.search === true)).toBe(false);
		expect(r.some((c) => c.cat === 'coeur')).toBe(true);
	});

	it('keyword + search non-chevauchants → 2 chunks distincts', () => {
		const r = highlightKeywordsAndSearch('vitrage à Lausanne', [KW_COEUR_VITRAGE], 'lausanne');
		const reconstr = r.map((c) => c.text).join('');
		expect(reconstr).toBe('vitrage à Lausanne');
		const coeur = r.find((c) => c.cat === 'coeur' && !c.search);
		const search = r.find((c) => c.search === true && c.cat === null);
		expect(coeur?.text).toBe('vitrage');
		expect(search?.text).toBe('Lausanne');
	});

	it('keyword + search chevauchants → search prime sur la portion (cat=null, search=true)', () => {
		// "vitrage" est Cœur. Search "vit" cible le début de "vitrage".
		const r = highlightKeywordsAndSearch('pose de vitrage neuf', [KW_COEUR_VITRAGE], 'vit');
		const reconstr = r.map((c) => c.text).join('');
		expect(reconstr).toBe('pose de vitrage neuf');
		// La portion "vit" doit être search-true cat-null ; "rage" reste Cœur.
		const searchPortion = r.find((c) => c.search === true);
		expect(searchPortion?.text).toBe('vit');
		expect(searchPortion?.cat).toBe(null);
		const coeurPortion = r.find((c) => c.cat === 'coeur');
		expect(coeurPortion?.text).toBe('rage');
	});

	it('search multi-occurrence → toutes les occurrences marquées', () => {
		const r = highlightKeywordsAndSearch('Pose vitrage et autre vitrage', [], 'vitrage');
		const searches = r.filter((c) => c.search === true);
		expect(searches).toHaveLength(2);
		expect(searches.every((c) => c.text === 'vitrage')).toBe(true);
	});

	it('zéro caractère perdu : la somme des chunks = texte original', () => {
		const text = 'Rénovation thermique d\'une façade vitrée à Lausanne (régie)';
		const r = highlightKeywordsAndSearch(
			text,
			[KW_COEUR_VITRAGE, KW_BONUS_REGIE],
			'lausanne',
		);
		expect(r.map((c) => c.text).join('')).toBe(text);
	});

	it('KW_SEARCH_MIN_LEN exporté = 2', () => {
		expect(KW_SEARCH_MIN_LEN).toBe(2);
	});
});

describe('pluriel FR (S188 makeWordRegex suffix s?)', () => {
	it('« vitrage » matche aussi « vitrages » (singulier→pluriel)', () => {
		const r = scoreKeywords('Vitrages de toits en pente', [KW_COEUR_VITRAGE]);
		expect(r.total).toBe(5);
		expect(r.matches[0].count).toBe(1);
	});

	it('« vitrage » continue à matcher le singulier', () => {
		const r = scoreKeywords('pose de vitrage neuf', [KW_COEUR_VITRAGE]);
		expect(r.total).toBe(5);
	});

	it('« route » matche aussi « routes » (cohérence Éviter)', () => {
		const r = scoreKeywords('réfection des routes cantonales', [KW_EVITER_ROUTE]);
		expect(r.total).toBe(-3);
	});

	it('plein-mot strict conservé : « route » ne matche pas « routine »', () => {
		const r = scoreKeywords('mise en place de routines', [KW_EVITER_ROUTE]);
		// "routines" contient "routine" (s? optionnel) mais "routine" ≠ "route" plein-mot.
		expect(r.total).toBe(0);
	});

	it('terme finissant déjà par s : pas de double pluralisation', () => {
		// On fabrique un keyword "vitrages" (déjà au pluriel).
		const kwAlreadyPlural = kw('vitrages', 'vitrages', 'coeur', 5);
		const r = scoreKeywords('plusieurs vitrages installés', [kwAlreadyPlural]);
		expect(r.total).toBe(5);
		// Sanity : ne match pas "vitragess" (jamais en FR).
		const noMatch = scoreKeywords('vitragess', [kwAlreadyPlural]);
		expect(noMatch.total).toBe(0);
	});

	it('highlight V3 reflète aussi le pluriel', () => {
		const r = highlightKeywordsAndSearch('Vitrages de toits', [KW_COEUR_VITRAGE], '');
		const hl = r.find((c) => c.cat === 'coeur');
		expect(hl?.text).toBe('Vitrages');
	});
});

// Test de parité runtime ↔ script (audit contracts M2). Le script
// `scripts/rescore_signaux_v2.mjs` lit la BDD prod et UPDATE les signaux : si sa
// regex/normalization diverge de keywords.ts, on rescore en silence avec une règle
// différente du runtime. Test de garde via import du module pur partagé.
describe('parité runtime keywords.ts ↔ script rescore', () => {
	// Import dynamique pour éviter de polluer le bundle Vitest avec un .mjs lib.
	let pureCountMatches: (textNorm: string, termeNorm: string) => number;
	let pureNormalizeNFD: (s: string) => string;
	beforeAll(async () => {
		const mod = await import('../../../scripts/_keywords_pure.mjs');
		pureCountMatches = mod.countMatches;
		pureNormalizeNFD = mod.normalizeNFD;
	});

	// Helper : count que scoreKeywords TS voit pour un keyword donné.
	function tsCount(text: string, kwRow: KeywordRow): number {
		const r = scoreKeywords(text, [kwRow]);
		const m = r.matches.find((x) => x.keyword.terme_norm === kwRow.terme_norm);
		return m?.count ?? 0;
	}

	const FIXTURES: Array<{ text: string; kw: KeywordRow; expected: number }> = [
		{ text: 'pose de vitrage neuf', kw: KW_COEUR_VITRAGE, expected: 1 },
		{ text: 'Vitrages de toits en pente', kw: KW_COEUR_VITRAGE, expected: 1 },
		{ text: 'réfection des routes cantonales', kw: KW_EVITER_ROUTE, expected: 1 },
		{ text: 'mise en place de routines', kw: KW_EVITER_ROUTE, expected: 0 },
		{ text: 'contrôle solaire et film vitrage', kw: KW_COEUR_VITRAGE, expected: 1 },
		{ text: 'aucun match ici', kw: KW_COEUR_VITRAGE, expected: 0 },
		{ text: 'régie et régies', kw: KW_BONUS_REGIE, expected: 2 },
		{ text: 'architecte mandataire', kw: KW_BONUS_ARCHI, expected: 1 },
		// Match accent insensitive
		{ text: 'la Régie immobilière', kw: KW_BONUS_REGIE, expected: 1 },
	];

	for (const f of FIXTURES) {
		it(`"${f.text}" / "${f.kw.terme}" → script=${f.expected}, TS=${f.expected}`, () => {
			const ts = tsCount(f.text, f.kw);
			const script = pureCountMatches(pureNormalizeNFD(f.text), f.kw.terme_norm);
			expect(ts).toBe(f.expected);
			expect(script).toBe(f.expected);
			expect(script).toBe(ts);
		});
	}
});

// ----------------------------------------------------------------------------
// V4 (S189) : dominantKeywordCategory — alimente le bandeau coloré 3 px sur
// chaque card signal (page /signaux). Priorité Cœur > Bonus > Éviter > null.

describe('dominantKeywordCategory (V4)', () => {
	const KEYWORDS_FULL = [
		KW_COEUR_VITRAGE,
		KW_COEUR_FILM,
		KW_COEUR_CONTROLE,
		KW_BONUS_REGIE,
		KW_BONUS_ARCHI,
		KW_EVITER_ROUTE,
		KW_EVITER_VOIRIE,
	];

	it('retourne null pour texte vide ou null', () => {
		expect(dominantKeywordCategory('', KEYWORDS_FULL)).toBe(null);
		expect(dominantKeywordCategory(null, KEYWORDS_FULL)).toBe(null);
		expect(dominantKeywordCategory(undefined, KEYWORDS_FULL)).toBe(null);
	});

	it('retourne null pour liste keywords vide', () => {
		expect(dominantKeywordCategory('pose de vitrage', [])).toBe(null);
	});

	it('retourne null pour texte sans aucun match', () => {
		expect(dominantKeywordCategory('aucun mot pertinent ici', KEYWORDS_FULL)).toBe(null);
	});

	it('retourne "coeur" sur un seul match coeur', () => {
		expect(dominantKeywordCategory('pose de vitrage neuf', KEYWORDS_FULL)).toBe('coeur');
	});

	it('retourne "bonus" sur un seul match bonus (pas de coeur)', () => {
		expect(dominantKeywordCategory('architecte mandataire', KEYWORDS_FULL)).toBe('bonus');
	});

	it('retourne "eviter" sur un seul match eviter (pas de coeur ni bonus)', () => {
		expect(dominantKeywordCategory('réfection de la route cantonale', KEYWORDS_FULL)).toBe('eviter');
	});

	it('Cœur prime sur bonus + eviter cumulés', () => {
		// 2 bonus + 2 eviter + 1 coeur → coeur l'emporte (priorité)
		expect(
			dominantKeywordCategory(
				'architecte régie route voirie vitrage',
				KEYWORDS_FULL,
			),
		).toBe('coeur');
	});

	it('Bonus prime sur eviter quand pas de coeur', () => {
		expect(
			dominantKeywordCategory('architecte mandataire route nationale', KEYWORDS_FULL),
		).toBe('bonus');
	});

	it('tolère le pluriel FR (vitrages → coeur)', () => {
		expect(dominantKeywordCategory('Vitrages de toits en pente', KEYWORDS_FULL)).toBe('coeur');
	});

	it('insensible aux accents (Régie → bonus)', () => {
		expect(dominantKeywordCategory('la Régie immobilière', KEYWORDS_FULL)).toBe('bonus');
	});

	it('court-circuit Cœur : le 1er match Cœur trouvé termine la boucle', () => {
		// Test conceptuel : l'ordre des keywords ne change pas le résultat tant
		// qu'un coeur est présent. On rajoute un bonus et eviter avant le coeur
		// dans le tableau pour vérifier que coeur reste prioritaire malgré ça.
		const ordered = [KW_BONUS_REGIE, KW_EVITER_ROUTE, KW_COEUR_VITRAGE];
		expect(dominantKeywordCategory('régie route vitrage', ordered)).toBe('coeur');
	});
});
