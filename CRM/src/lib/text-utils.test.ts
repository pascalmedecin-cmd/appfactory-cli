import { describe, it, expect } from 'vitest';
import { normalizeText, matchMotsCles } from './text-utils';

describe('normalizeText', () => {
	it('supprime les accents', () => {
		expect(normalizeText('fenêtre')).toBe('fenetre');
		expect(normalizeText('rénovation')).toBe('renovation');
		expect(normalizeText('bâtiment')).toBe('batiment');
		expect(normalizeText('Genève')).toBe('geneve');
		expect(normalizeText('façade')).toBe('facade');
	});

	it('met en minuscules', () => {
		expect(normalizeText('CONSTRUCTION')).toBe('construction');
		expect(normalizeText('Zürich')).toBe('zurich');
	});

	it('préserve les caractères non accentués', () => {
		expect(normalizeText('abc 123')).toBe('abc 123');
	});
});

describe('matchMotsCles', () => {
	it('retourne true si un mot-clé matche dans raison_sociale', () => {
		expect(matchMotsCles(['construction'], ['Bâti Construction SA', null, null])).toBe(true);
	});

	it('retourne true si un mot-clé matche dans description', () => {
		expect(matchMotsCles(['rénovation'], [null, 'Travaux de renovation de façade', null])).toBe(true);
	});

	it('retourne true si un mot-clé matche dans secteur_detecte', () => {
		expect(matchMotsCles(['architecte'], [null, null, 'Bureau d\'architecte'])).toBe(true);
	});

	it('matching insensible aux accents : fenetre trouve fenêtre', () => {
		expect(matchMotsCles(['fenetre'], [null, 'Installation de fenêtres PVC', null])).toBe(true);
	});

	it('matching insensible aux accents : mot-clé accentué trouve texte sans accent', () => {
		expect(matchMotsCles(['rénovation'], [null, 'renovation interieure', null])).toBe(true);
	});

	it('matching insensible à la casse', () => {
		expect(matchMotsCles(['GENEVE'], ['Entreprise de Genève', null, null])).toBe(true);
	});

	it('retourne false si aucun mot-clé ne matche', () => {
		expect(matchMotsCles(['peinture'], ['Construction SA', 'Bâtiment neuf', 'architecte'])).toBe(false);
	});

	it('retourne true si liste de mots-clés vide (pas de filtre)', () => {
		expect(matchMotsCles([], ['Construction SA', null, null])).toBe(true);
	});

	it('retourne false si tous les champs sont null', () => {
		expect(matchMotsCles(['test'], [null, null, null])).toBe(false);
	});

	it('retourne false si tous les champs sont undefined', () => {
		expect(matchMotsCles(['test'], [undefined, undefined, undefined])).toBe(false);
	});

	it('matche sur substring (pas exact)', () => {
		expect(matchMotsCles(['bât'], [null, 'Bâtiment résidentiel', null])).toBe(true);
	});

	it('un seul mot-clé sur plusieurs suffit (OR logique)', () => {
		expect(matchMotsCles(['peinture', 'construction'], ['Construction SA', null, null])).toBe(true);
	});

	it('gère les trémas allemands', () => {
		expect(matchMotsCles(['zurich'], ['Firma Zürich AG', null, null])).toBe(true);
	});
});
