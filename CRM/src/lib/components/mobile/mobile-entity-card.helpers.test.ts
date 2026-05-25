import { describe, it, expect } from 'vitest';
import {
	scorePillModifier,
	scorePillClass,
	scorePillTitle,
	actionVariant,
	shouldInvokeOnClick,
	isValidDominant,
} from './mobile-entity-card.helpers';

describe('scorePillModifier', () => {
	it('preserves chaud sans accent', () => {
		expect(scorePillModifier('chaud')).toBe('chaud');
	});

	it("retire l'accent de tiède (CSS class kebab-safe)", () => {
		expect(scorePillModifier('tiède')).toBe('tiede');
	});

	it('preserves froid sans accent', () => {
		expect(scorePillModifier('froid')).toBe('froid');
	});

	it('preserves unscored', () => {
		expect(scorePillModifier('unscored')).toBe('unscored');
	});
});

describe('scorePillClass', () => {
	it('compose la classe base + modifier pour chaud', () => {
		expect(scorePillClass('chaud')).toBe('signal-score-pill signal-score-pill--chaud');
	});

	it("utilise tiede (sans accent) dans la classe pour 'tiède'", () => {
		expect(scorePillClass('tiède')).toBe('signal-score-pill signal-score-pill--tiede');
	});

	it('compose la classe pour unscored', () => {
		expect(scorePillClass('unscored')).toBe('signal-score-pill signal-score-pill--unscored');
	});
});

describe('scorePillTitle', () => {
	it('formate un score positif', () => {
		expect(scorePillTitle(7)).toBe('Score 7');
	});

	it('formate un score zéro', () => {
		expect(scorePillTitle(0)).toBe('Score 0');
	});

	it('formate un score négatif (scoring CRM autorise les pénalités)', () => {
		expect(scorePillTitle(-3)).toBe('Score -3');
	});
});

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
