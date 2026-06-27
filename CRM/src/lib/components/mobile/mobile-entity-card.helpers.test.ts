import { describe, it, expect } from 'vitest';
import {
	actionVariant,
	shouldInvokeOnClick,
	isValidDominant,
} from './mobile-entity-card.helpers';

// Audit 360 Bloc D : les helpers de pastille (scorePillModifier/Class/Icon/Title)
// ont été retirés — MobileEntityCard rend désormais la primitive unifiée ScorePill
// (mode numérique), fin du système saturé `signal-score-pill`.

describe('actionVariant', () => {
	it("retourne 'neutral' par défaut si undefined", () => {
		expect(actionVariant(undefined)).toBe('neutral');
	});

	it("retourne 'neutral' par défaut si appelé sans argument", () => {
		expect(actionVariant()).toBe('neutral');
	});

	it('préserve une variante explicite primary', () => {
		expect(actionVariant('primary')).toBe('primary');
	});

	it('préserve une variante explicite danger', () => {
		expect(actionVariant('danger')).toBe('danger');
	});

	it("préserve 'neutral' explicite", () => {
		expect(actionVariant('neutral')).toBe('neutral');
	});
});

describe('shouldInvokeOnClick', () => {
	it("retourne true quand aucune href (action handler attendu)", () => {
		expect(shouldInvokeOnClick({})).toBe(true);
	});

	it('retourne false quand une href est fournie (navigation prend le relais)', () => {
		expect(shouldInvokeOnClick({ href: '/contacts/42' })).toBe(false);
	});

	it('retourne true quand href est une chaîne vide (pas de navigation valide)', () => {
		expect(shouldInvokeOnClick({ href: '' })).toBe(true);
	});

	it('retourne true même si onClick est fourni en plus, sans href', () => {
		expect(shouldInvokeOnClick({ onClick: () => undefined })).toBe(true);
	});
});

describe('isValidDominant', () => {
	it('accepte coeur', () => {
		expect(isValidDominant('coeur')).toBe(true);
	});

	it('accepte bonus', () => {
		expect(isValidDominant('bonus')).toBe(true);
	});

	it('accepte eviter', () => {
		expect(isValidDominant('eviter')).toBe(true);
	});

	it('accepte neutral', () => {
		expect(isValidDominant('neutral')).toBe(true);
	});

	it('rejette une chaîne inconnue', () => {
		expect(isValidDominant('rouge')).toBe(false);
	});

	it('rejette une valeur non-string', () => {
		expect(isValidDominant(42)).toBe(false);
		expect(isValidDominant(null)).toBe(false);
		expect(isValidDominant(undefined)).toBe(false);
	});
});
