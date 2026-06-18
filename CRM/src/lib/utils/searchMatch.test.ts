import { describe, it, expect } from 'vitest';
import {
	matchesQuery,
	matchesAnyField,
	normalizeForSearch,
	SEARCH_DEBOUNCE_MS
} from './searchMatch';

describe('matchesQuery (Vague 1 cohérence)', () => {
	it('insensible aux accents (« zurich » trouve « Zürich »)', () => {
		expect(matchesQuery('Zürich', 'zurich')).toBe(true);
		expect(matchesQuery('Genève', 'geneve')).toBe(true);
		expect(matchesQuery('Bâtiment Dupond', 'batiment')).toBe(true);
	});

	it('insensible à la casse', () => {
		expect(matchesQuery('CONSTRUCTION SA', 'construction')).toBe(true);
		expect(matchesQuery('vitrerie', 'VITRERIE')).toBe(true);
	});

	it('query vide ou espaces → matche tout (aucun filtre)', () => {
		expect(matchesQuery('peu importe', '')).toBe(true);
		expect(matchesQuery('peu importe', '   ')).toBe(true);
	});

	it('multi-mots : la sous-chaîne avec espace doit matcher', () => {
		expect(matchesQuery('Vitrerie Dupond SA', 'vitrerie dupond')).toBe(true);
		expect(matchesQuery('Vitrerie Dupond SA', 'dupond sa')).toBe(true);
		// L'ordre compte (substring, pas tokens indépendants).
		expect(matchesQuery('Vitrerie Dupond SA', 'sa dupond')).toBe(false);
	});

	it('no-match : sous-chaîne absente → false', () => {
		expect(matchesQuery('Genève', 'lausanne')).toBe(false);
		expect(matchesQuery('', 'quelque chose')).toBe(false);
	});

	it('normalisation NFD des deux côtés (haystack ET query accentués)', () => {
		expect(matchesQuery('café façade', 'FAÇADE')).toBe(true);
		expect(matchesQuery('Île de France', 'ile')).toBe(true);
	});

	it('préserve chiffres et ponctuation pour le matching', () => {
		expect(matchesQuery('Dupond, SA 1204', '1204')).toBe(true);
		expect(matchesQuery('NPA 1700 Fribourg', '1700 fribourg')).toBe(true);
	});
});

describe('matchesAnyField (Vague 1 cohérence)', () => {
	it('matche si au moins un champ matche', () => {
		expect(matchesAnyField(['Rénovation', 'Régie Martin', 'Lausanne'], 'martin')).toBe(true);
		expect(matchesAnyField(['Rénovation', 'Régie Martin', 'Lausanne'], 'lausanne')).toBe(true);
	});

	it('ignore les champs null/undefined sans planter', () => {
		expect(matchesAnyField([null, undefined, 'Zürich'], 'zurich')).toBe(true);
		expect(matchesAnyField([null, undefined], 'zurich')).toBe(false);
	});

	it('query vide → true (aucun filtre)', () => {
		expect(matchesAnyField(['a', 'b'], '')).toBe(true);
		expect(matchesAnyField([null], '  ')).toBe(true);
	});

	it('no-match sur tous les champs → false', () => {
		expect(matchesAnyField(['Genève', 'Vaud', 'Sion'], 'zurich')).toBe(false);
	});
});

describe('contrat partagé', () => {
	it('normalizeForSearch est la normalisation NFD (alias)', () => {
		expect(normalizeForSearch('Zürich')).toBe('zurich');
		expect(normalizeForSearch('FAÇADE')).toBe('facade');
	});

	it('SEARCH_DEBOUNCE_MS = 250 (contrat commun A1/A2)', () => {
		expect(SEARCH_DEBOUNCE_MS).toBe(250);
	});
});
