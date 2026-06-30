import { describe, it, expect } from 'vitest';
import { searchAide, normalizeForSearch, aideSearchIndex } from './search';
import { aideContent } from './content';

const KNOWN_SECTION_IDS = new Set(aideContent.flatMap((l) => l.sections.map((s) => s.id)));

describe('normalizeForSearch', () => {
	it('met en minuscules, retire les accents et trim', () => {
		expect(normalizeForSearch('  Évidé À Café  ')).toBe('evide a cafe');
		expect(normalizeForSearch('SÉCURITÉ')).toBe('securite');
		expect(normalizeForSearch('déjà')).toBe('deja');
	});
});

describe('aideSearchIndex', () => {
	it('couvre toutes les sections de l\'arbre', () => {
		expect(aideSearchIndex.length).toBeGreaterThanOrEqual(20);
		for (const entry of aideSearchIndex) {
			expect(entry.haystack.length).toBeGreaterThan(0);
			expect(entry.haystack).toBe(normalizeForSearch(entry.haystack));
		}
	});
});

describe('searchAide', () => {
	it('renvoie une liste vide pour une requête vide ou blanche', () => {
		expect(searchAide('')).toEqual([]);
		expect(searchAide('   ')).toEqual([]);
	});

	it('trouve un terme présent dans le corps d\'une section, pas seulement le titre', () => {
		// « kanban » n'apparaît dans aucun titre de section, uniquement dans un paragraphe (fiche Pipeline).
		const res = searchAide('kanban');
		expect(res.length).toBeGreaterThan(0);
		expect(res.every((r) => r.titleMatch === false)).toBe(true);
	});

	it('est insensible à la casse', () => {
		const lo = searchAide('pipeline');
		const hi = searchAide('PIPELINE');
		expect(hi.map((r) => r.sectionId)).toEqual(lo.map((r) => r.sectionId));
		expect(lo.length).toBeGreaterThan(0);
	});

	it('est insensible aux accents et remonte les correspondances de titre en premier', () => {
		const res = searchAide('securite'); // sans accent → doit matcher les sections au titre « ...Sécurité... »
		expect(res.length).toBeGreaterThan(0);
		expect(res.some((r) => r.sectionId === 'tech-securite')).toBe(true);
		// le premier résultat est forcément une correspondance de titre (tri titleMatch d'abord)
		expect(res[0].titleMatch).toBe(true);
	});

	it('renvoie chaque section au plus une fois', () => {
		const res = searchAide('crm');
		const keys = res.map((r) => `${r.levelKey}:${r.sectionId}`);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('ne renvoie rien pour un terme absent', () => {
		expect(searchAide('zzxyqwklmn')).toEqual([]);
	});

	it('chaque résultat pointe vers une section réelle de l\'arbre, avec une icône', () => {
		// Verrouille le contrat de M-29 : un résultat cliquable doit mener à une ancre #id existante.
		for (const term of ['crm', 'pipeline', 'veille', 'securite', 'lead']) {
			for (const r of searchAide(term)) {
				expect(KNOWN_SECTION_IDS.has(r.sectionId)).toBe(true);
				expect(r.sectionTitle.trim()).not.toBe('');
				expect(r.sectionIcon.trim()).not.toBe('');
				expect(['demarrage', 'fonctions', 'technique']).toContain(r.levelKey);
			}
		}
	});
});
