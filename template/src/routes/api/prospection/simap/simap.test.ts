import { describe, it, expect } from 'vitest';
import { translate, cantonToLead } from './helpers';

describe('translate', () => {
	it('retourne la version francaise en priorite', () => {
		expect(translate({ fr: 'Bonjour', de: 'Hallo', en: 'Hello' })).toBe('Bonjour');
	});

	it('fallback sur allemand si pas de francais', () => {
		expect(translate({ de: 'Hallo', en: 'Hello' })).toBe('Hallo');
	});

	it('fallback sur anglais si ni fr ni de', () => {
		expect(translate({ en: 'Hello', it: 'Ciao' })).toBe('Hello');
	});

	it('fallback sur italien en dernier', () => {
		expect(translate({ it: 'Ciao' })).toBe('Ciao');
	});

	it('retourne vide pour null', () => {
		expect(translate(null)).toBe('');
	});

	it('retourne vide pour undefined', () => {
		expect(translate(undefined)).toBe('');
	});

	it('retourne la string directement si type string', () => {
		expect(translate('direct')).toBe('direct');
	});

	it('retourne vide pour objet vide', () => {
		expect(translate({})).toBe('');
	});
});

describe('cantonToLead', () => {
	it('mappe GE vers GE', () => {
		expect(cantonToLead('GE')).toBe('GE');
	});

	it('mappe VD vers VD', () => {
		expect(cantonToLead('VD')).toBe('VD');
	});

	it('mappe un canton inconnu vers Autre', () => {
		expect(cantonToLead('ZH')).toBe('Autre');
	});

	it('retourne Autre pour null', () => {
		expect(cantonToLead(null)).toBe('Autre');
	});

	it('retourne Autre pour undefined', () => {
		expect(cantonToLead(undefined)).toBe('Autre');
	});

	it('retourne Autre pour chaine vide', () => {
		expect(cantonToLead('')).toBe('Autre');
	});
});
