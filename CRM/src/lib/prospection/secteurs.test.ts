import { describe, it, expect } from 'vitest';
import { detectSecteur, SECTEUR_KEYWORDS_BY_MARQUE } from './secteurs';
import { normalizeNFD } from '$lib/utils/text-normalize';
import { config } from '$lib/config';

/**
 * Table google-places d'AVANT la fusion D3 (la plus riche des 3 copies runtime). La table FilmPro
 * unifiée doit reproduire EXACTEMENT ses classements (non-régression google-places byte-identique ;
 * les additions FilmPro - architektur/ingenieurbuero - sont des sur-ensembles redondants qui ne
 * changent aucun verdict car ils contiennent un terme déjà présent).
 */
const OLD_GOOGLE_PLACES: Record<string, string[]> = {
	construction: ['construction', 'batiment', 'bau', 'genie civil', 'general contractor', 'entreprise generale'],
	architecture: ['architecte', 'architecture', 'architekt', 'bureau d etudes'],
	hvac: ['chauffage', 'ventilation', 'climatisation', 'hvac', 'heizung', 'sanitaire', 'plumber', 'plumbing'],
	electricite: ['electricite', 'elektro', 'electricien', 'electrician', 'electrical'],
	peinture: ['peinture', 'platrerie', 'painter', 'painting', 'maler'],
	renovation: ['renovation', 'transformation', 'umbau'],
	menuiserie: ['menuiserie', 'charpente', 'schreinerei', 'zimmerei', 'vitrerie', 'vitre', 'roofing', 'roofing contractor', 'toiture', 'etancheite', 'couvreur'],
	ingenieur: ['ingenieur', 'bureau technique'],
	regie: ['regie', 'facility', 'immobilier', 'verwaltung', 'real estate', 'real estate agency'],
};

/** Oracle : ancienne détection google-places (même normalisation NFD + first-match-wins). */
function oldDetect(text: string): string | null {
	const haystack = normalizeNFD(text);
	for (const [secteur, kws] of Object.entries(OLD_GOOGLE_PLACES)) {
		if (kws.some((kw) => haystack.includes(kw))) return secteur;
	}
	return null;
}

describe('detectSecteur filmpro - non-régression vs table google-places (golden = oracle)', () => {
	// Corpus = chaque mot-clé de l'ancienne table (dans un nom réaliste) + noms d'entreprises réels.
	// Le verdict FilmPro doit être IDENTIQUE à l'oracle (les additions FilmPro sont des sur-ensembles
	// redondants → aucun verdict ne change ; les substrings comme « bau » ⊂ « umbau » se comportent
	// exactement comme avant - c'est le comportement historique, pas une régression).
	const corpus: string[] = [
		...Object.values(OLD_GOOGLE_PLACES).flat().map((kw) => `Entreprise ${kw} SA`),
		'Régie du Rhône SA', 'Miroiterie Cornavin Sàrl', 'Clinique dentaire Plainpalais',
		'Boulangerie du Coin', 'Toiture & Étanchéité Sàrl', 'Bureau technique Dupont',
		'Architectes associés Genève', 'Chauffage Ventilation Léman', 'Boutique Horlogère',
	];
	for (const input of corpus) {
		it(`« ${input} » → oracle`, () => {
			expect(detectSecteur(input, 'filmpro')).toBe(oldDetect(input));
		});
	}
});

describe('detectSecteur filmpro - robustesse', () => {
	it('insensible aux accents (Régie ≡ Regie)', () => {
		expect(detectSecteur('Régie Naef', 'filmpro')).toBe('regie');
		expect(detectSecteur('REGIE NAEF', 'filmpro')).toBe('regie');
	});
	it('vitrerie classée menuiserie (criterion D3 - via les 3 sources)', () => {
		expect(detectSecteur('Vitrerie du Lac', 'filmpro')).toBe('menuiserie');
		expect(detectSecteur('Miroiterie et Vitrerie SA', 'filmpro')).toBe('menuiserie');
	});
	it('toiture/étanchéité classées menuiserie', () => {
		expect(detectSecteur('Toiture & Étanchéité Sàrl', 'filmpro')).toBe('menuiserie');
	});
	it('déterministe (ordre des clés)', () => {
		const r1 = detectSecteur('Bureau technique et architecte', 'filmpro');
		const r2 = detectSecteur('Bureau technique et architecte', 'filmpro');
		expect(r1).toBe(r2);
		// architecture précède ingenieur dans l'ordre d'insertion.
		expect(r1).toBe('architecture');
	});
	it('aucun mot-clé → null', () => {
		expect(detectSecteur('Boulangerie du Coin', 'filmpro')).toBeNull();
	});
	it('entrée dégénérée → null (pas de crash)', () => {
		expect(detectSecteur('', 'filmpro')).toBeNull();
		expect(detectSecteur(null, 'filmpro')).toBeNull();
		expect(detectSecteur(undefined, 'filmpro')).toBeNull();
	});
});

describe('detectSecteur led - secteurs LED Studio', () => {
	it('enseigne lumineuse', () => {
		expect(detectSecteur('Néon Concept Sàrl', 'led')).toBe('enseigne');
	});
	it('stand / montage de stand', () => {
		expect(detectSecteur('Expo Stand Léman SA', 'led')).toBe('stand');
	});
	it('signalétique', () => {
		expect(detectSecteur('Signalétique Riviera', 'led')).toBe('signaletique');
	});
	it('événementiel', () => {
		expect(detectSecteur('Pulse Event Design', 'led')).toBe('evenementiel');
	});
	it('retail / commerce', () => {
		expect(detectSecteur('Vitrine LED Carouge boutique', 'led')).toBeTypeOf('string');
	});
});

describe('cloisonnement des tables par marque', () => {
	it('les 2 marques ont leurs propres tables', () => {
		expect(Object.keys(SECTEUR_KEYWORDS_BY_MARQUE)).toEqual(['filmpro', 'led']);
		expect(SECTEUR_KEYWORDS_BY_MARQUE.filmpro).toHaveProperty('menuiserie');
		expect(SECTEUR_KEYWORDS_BY_MARQUE.led).toHaveProperty('enseigne');
	});
});

describe('invariant scoring : chaque clé de secteur FilmPro déclenche le bonus secteur', () => {
	// Le scoring matche `secteur_detecte` (une CLÉ) contre config.scoring.secteursCibles.keywords
	// (scoring.ts:135-139 : secteurDetecteNorm.includes(keyword)). Si une clé FilmPro n'y correspond
	// à aucun mot-clé, le lead perdrait silencieusement les +3 « secteur ». Garde contre ce couplage.
	const scoringKeywords = config.scoring.secteursCibles.keywords;
	for (const key of Object.keys(SECTEUR_KEYWORDS_BY_MARQUE.filmpro)) {
		it(`clé « ${key} » ⊇ un mot-clé de scoring`, () => {
			expect(scoringKeywords.some((kw) => key.includes(kw))).toBe(true);
		});
	}
});

describe('non-régression D3 « via les 3 sources » : jamais de classification perdue (oracle zefix/searchch)', () => {
	// Anciennes tables (ASCII) de zefix et searchch AVANT la fusion. La table FilmPro unifiée est un
	// sur-ensemble : elle ne doit JAMAIS renvoyer null là où l'ancienne table classait (elle GAGNE au
	// contraire vitrerie/toiture côté zefix/searchch - criterion D3, intended).
	const OLD_ZEFIX: Record<string, string[]> = {
		construction: ['construction', 'batiment', 'bau', 'genie civil'],
		architecture: ['architecte', 'architecture', 'architektur'],
		hvac: ['chauffage', 'ventilation', 'climatisation', 'hvac', 'heizung'],
		electricite: ['electricite', 'elektro', 'electricien'],
		renovation: ['renovation', 'transformation', 'umbau'],
		menuiserie: ['menuiserie', 'charpente', 'schreinerei', 'zimmerei'],
		ingenieur: ['ingenieur', 'bureau technique'],
		regie: ['regie', 'facility', 'immobilier', 'verwaltung'],
	};
	const OLD_SEARCHCH: Record<string, string[]> = {
		...OLD_ZEFIX,
		menuiserie: ['menuiserie', 'charpente', 'schreinerei', 'zimmerei', 'vitrerie', 'vitre'],
	};
	for (const [label, table] of [['zefix', OLD_ZEFIX], ['searchch', OLD_SEARCHCH]] as const) {
		for (const kws of Object.values(table)) {
			for (const kw of kws) {
				it(`${label} « ${kw} » reste classé (non null)`, () => {
					expect(detectSecteur(`Entreprise ${kw} SA`, 'filmpro')).not.toBeNull();
				});
			}
		}
	}
});
