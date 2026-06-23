import { describe, it, expect } from 'vitest';
import {
	stripCitationTags,
	stripCitationsFromItem,
	stripCitationsFromReport
} from './strip-citations';

// Note : les helpers stripCitations*FromItem/Report sont volontairement génériques
// (T extends ...). On les teste avec des shapes minimales locales pour ne pas
// dépendre des enums Zod qui évoluent (maturity, geo_scope, actionability, etc.).
// Le typage strict du chemin réel (run-generation.ts) garantit la compatibilité
// runtime ; ici on teste uniquement le comportement de strip cite.

describe('stripCitationTags - cite seul', () => {
	it('retire balise cite avec attribut index', () => {
		const input = 'Le marché atteint <cite index="1-15">74 millions CHF en 2026</cite> selon le rapport.';
		expect(stripCitationTags(input)).toBe('Le marché atteint 74 millions CHF en 2026 selon le rapport.');
	});

	it('retire balise cite sans attribut', () => {
		expect(stripCitationTags('Texte <cite>contenu</cite> fin.')).toBe('Texte contenu fin.');
	});

	it('retire plusieurs balises cite indépendantes', () => {
		const input = 'A <cite index="1-2">un</cite> et B <cite index="3-4">deux</cite>.';
		expect(stripCitationTags(input)).toBe('A un et B deux.');
	});

	it('retire balise cite vide', () => {
		expect(stripCitationTags('Avant <cite index="1-1"></cite> après.')).toBe('Avant  après.');
	});
});

describe('stripCitationTags - attributs variants', () => {
	it('retire balise cite avec attribut end', () => {
		expect(stripCitationTags('Foo <cite end="42">bar</cite> baz.')).toBe('Foo bar baz.');
	});

	it('retire balise cite avec attributs multiples', () => {
		const input = 'X <cite index="5" end="10" data-source="web">Y</cite> Z.';
		expect(stripCitationTags(input)).toBe('X Y Z.');
	});

	it('retire balise cite avec quotes simples', () => {
		expect(stripCitationTags("X <cite index='5-10'>Y</cite> Z.")).toBe('X Y Z.');
	});

	it('retire balise cite avec espaces autour des attributs', () => {
		expect(stripCitationTags('X <cite  index="5" >Y</cite> Z.')).toBe('X Y Z.');
	});
});

describe('stripCitationTags - imbriqué', () => {
	it('retire balise cite imbriquée (2 niveaux)', () => {
		const input = '<cite index="1">foo <cite index="2">bar</cite> baz</cite>';
		expect(stripCitationTags(input)).toBe('foo bar baz');
	});

	it('retire balise cite imbriquée (3 niveaux)', () => {
		const input = '<cite>a <cite>b <cite>c</cite> d</cite> e</cite>';
		expect(stripCitationTags(input)).toBe('a b c d e');
	});
});

describe('stripCitationTags - multiligne (DOTALL)', () => {
	it('retire balise cite avec saut de ligne dans le contenu', () => {
		const input = 'Avant <cite index="1-15">ligne 1\nligne 2</cite> après.';
		expect(stripCitationTags(input)).toBe('Avant ligne 1\nligne 2 après.');
	});

	it('retire balise cite étalée sur plusieurs lignes', () => {
		const input = 'X <cite\nindex="1">\ncontenu\n</cite> Z.';
		expect(stripCitationTags(input)).toBe('X \ncontenu\n Z.');
	});
});

describe('stripCitationTags - cas dégénérés', () => {
	it('retourne string vide pour string vide', () => {
		expect(stripCitationTags('')).toBe('');
	});

	it('retourne null pour null (rétrocompat champs nullable)', () => {
		expect(stripCitationTags(null)).toBe(null);
	});

	it('retourne undefined pour undefined', () => {
		expect(stripCitationTags(undefined)).toBe(undefined);
	});

	it('texte sans cite : inchangé', () => {
		const input = 'Texte normal sans aucune balise HTML.';
		expect(stripCitationTags(input)).toBe(input);
	});

	it('balise cite ouvrante seule (orpheline) : ne casse pas, retire la balise ouvrante', () => {
		// Si fermante absente, on ne supprime rien (sécurité : on ne mange pas tout le reste).
		const input = 'Texte <cite index="1"> sans fermeture.';
		expect(stripCitationTags(input)).toBe(input);
	});

	it('respecte la casse insensible (CITE majuscule)', () => {
		expect(stripCitationTags('X <CITE index="1">Y</CITE> Z.')).toBe('X Y Z.');
	});

	it('ne touche pas aux balises non-cite', () => {
		const input = '<p>Para <strong>fort</strong></p>';
		expect(stripCitationTags(input)).toBe(input);
	});
});

describe('stripCitationsFromItem', () => {
	const baseItem = {
		rank: 1,
		title: 'Titre',
		summary: 'Résumé sans cite',
		filmpro_relevance: 'Relevance sans cite',
		deep_dive: null as string | null,
		extra: 'preserved'
	};

	it('strippe summary, filmpro_relevance, deep_dive', () => {
		const item = {
			...baseItem,
			summary: 'Le marché atteint <cite index="1-15">74M CHF</cite>.',
			filmpro_relevance: 'Cible <cite index="2-3">vitrages</cite>.',
			deep_dive: 'Détail <cite index="4-5">technique</cite>.'
		};
		const out = stripCitationsFromItem(item);
		expect(out.summary).toBe('Le marché atteint 74M CHF.');
		expect(out.filmpro_relevance).toBe('Cible vitrages.');
		expect(out.deep_dive).toBe('Détail technique.');
	});

	it('préserve deep_dive null', () => {
		const out = stripCitationsFromItem(baseItem);
		expect(out.deep_dive).toBe(null);
	});

	it("ne mute pas l'item d'entrée", () => {
		const item = {
			...baseItem,
			summary: 'X <cite>Y</cite> Z.'
		};
		stripCitationsFromItem(item);
		expect(item.summary).toBe('X <cite>Y</cite> Z.');
	});

	it('préserve les champs non-textuels (rank, extra)', () => {
		const item = {
			...baseItem,
			summary: 'X <cite>Y</cite>'
		};
		const out = stripCitationsFromItem(item);
		expect(out.rank).toBe(1);
		expect(out.extra).toBe('preserved');
	});
});

describe('stripCitationsFromReport', () => {
	it('strippe executive_summary et tous les items', () => {
		const report = {
			meta: {
				week_label: '2026-W18',
				executive_summary:
					'Vue globale. <cite index="1-1">Phrase clé</cite>. Conclusion.'
			},
			items: [
				{
					rank: 1,
					title: 'Item 1',
					summary: 'A <cite>cite1</cite> B',
					filmpro_relevance: 'C <cite>cite2</cite> D',
					deep_dive: null as string | null
				}
			],
			impacts_filmpro: []
		};

		const out = stripCitationsFromReport(report);
		expect(out.meta.executive_summary).toBe('Vue globale. Phrase clé. Conclusion.');
		expect(out.items[0].summary).toBe('A cite1 B');
		expect(out.items[0].filmpro_relevance).toBe('C cite2 D');
	});

	it('strippe les notes de impacts_filmpro (rendues dans le brief client)', () => {
		// Régression : impacts_filmpro[].note est rendu en clair dans email-brief
		// (-> antoine@). Un <cite> de web_search y fuyait car seul ce strip (vs ses
		// jumeaux dedash/strip-enum) ne couvrait pas impacts_filmpro.
		const report = {
			meta: { week_label: '2026-W26', executive_summary: 'Synthèse.' },
			items: [
				{
					rank: 1,
					title: 'Item 1',
					summary: 'S',
					filmpro_relevance: 'R',
					deep_dive: null as string | null
				}
			],
			impacts_filmpro: [
				{ axis: 'pricing', note: 'Hausse <cite index="1-2">de 12% en 2026</cite> à anticiper.' },
				{ axis: 'reglementation', note: 'Note sans cite, inchangée.' }
			]
		};

		const out = stripCitationsFromReport(report);
		expect(out.impacts_filmpro[0].note).toBe('Hausse de 12% en 2026 à anticiper.');
		expect(out.impacts_filmpro[1].note).toBe('Note sans cite, inchangée.');
		// axis (champ non textuel) préservé
		expect(out.impacts_filmpro[0].axis).toBe('pricing');
	});

	it('préserve impacts_filmpro null/absent (rétrocompat)', () => {
		const report = {
			meta: { week_label: '2026-W26', executive_summary: 'X' },
			items: [],
			impacts_filmpro: null as Array<{ note?: string }> | null
		};
		const out = stripCitationsFromReport(report);
		expect(out.impacts_filmpro).toBe(null);
	});
});
