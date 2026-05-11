import { describe, it, expect } from 'vitest';
import { nextTabIndex } from './tabsNav';

// Audit 360 V2c H-27 : navigation clavier du tablist ARIA (roving tabindex).

describe('nextTabIndex (H-27 navigation clavier tablist)', () => {
	it('ArrowRight depuis le 1er onglet → onglet suivant', () => {
		expect(nextTabIndex(0, 'ArrowRight', 5)).toBe(1);
	});
	it('ArrowRight depuis le dernier onglet → wrap vers le 1er', () => {
		expect(nextTabIndex(4, 'ArrowRight', 5)).toBe(0);
	});
	it('ArrowDown se comporte comme ArrowRight', () => {
		expect(nextTabIndex(1, 'ArrowDown', 5)).toBe(2);
	});
	it('ArrowLeft depuis le 1er onglet → wrap vers le dernier', () => {
		expect(nextTabIndex(0, 'ArrowLeft', 5)).toBe(4);
	});
	it('ArrowLeft depuis un onglet du milieu → onglet précédent', () => {
		expect(nextTabIndex(2, 'ArrowLeft', 5)).toBe(1);
	});
	it('ArrowUp se comporte comme ArrowLeft', () => {
		expect(nextTabIndex(2, 'ArrowUp', 5)).toBe(1);
	});
	it('Home → premier onglet', () => {
		expect(nextTabIndex(3, 'Home', 5)).toBe(0);
	});
	it('End → dernier onglet', () => {
		expect(nextTabIndex(1, 'End', 5)).toBe(4);
	});
	it('touche non gérée (Enter) → null', () => {
		expect(nextTabIndex(2, 'Enter', 5)).toBeNull();
	});
	it('touche non gérée (a) → null', () => {
		expect(nextTabIndex(0, 'a', 3)).toBeNull();
	});
	it('liste vide → null', () => {
		expect(nextTabIndex(0, 'ArrowRight', 0)).toBeNull();
	});
	it('index courant invalide (-1) → null', () => {
		expect(nextTabIndex(-1, 'ArrowRight', 3)).toBeNull();
	});
	it('index courant hors borne → null', () => {
		expect(nextTabIndex(5, 'ArrowRight', 3)).toBeNull();
	});
	it('un seul onglet : ArrowRight reste sur le même', () => {
		expect(nextTabIndex(0, 'ArrowRight', 1)).toBe(0);
		expect(nextTabIndex(0, 'ArrowLeft', 1)).toBe(0);
	});
});
