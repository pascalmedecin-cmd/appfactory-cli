import { describe, it, expect } from 'vitest';
import { isEmailAllowed, parseEnvList } from './auth';

describe('parseEnvList', () => {
	it('parse une liste comma-separated', () => {
		expect(parseEnvList('filmpro.ch, example.com')).toEqual(['filmpro.ch', 'example.com']);
	});

	it('retourne vide pour undefined', () => {
		expect(parseEnvList(undefined)).toEqual([]);
	});

	it('retourne vide pour chaine vide', () => {
		expect(parseEnvList('')).toEqual([]);
	});

	it('normalise en lowercase et trim', () => {
		expect(parseEnvList(' FilmPro.CH , EXAMPLE.COM ')).toEqual(['filmpro.ch', 'example.com']);
	});
});

describe('isEmailAllowed', () => {
	const domains = ['filmpro.ch'];
	const emails = ['pascal@filmpro.ch', 'antoine@filmpro.ch'];

	// --- Refus (unhappy path) ---

	it('refuse undefined', () => {
		expect(isEmailAllowed(undefined, domains, emails)).toBe(false);
	});

	it('refuse chaine vide', () => {
		expect(isEmailAllowed('', domains, emails)).toBe(false);
	});

	it('refuse un email hors domaine', () => {
		expect(isEmailAllowed('hacker@gmail.com', domains, emails)).toBe(false);
	});

	it('refuse un email similaire mais faux domaine', () => {
		expect(isEmailAllowed('pascal@filmpro.ch.evil.com', domains, emails)).toBe(false);
	});

	it('refuse un email avec sous-domaine', () => {
		expect(isEmailAllowed('pascal@sub.filmpro.ch', domains, emails)).toBe(false);
	});

	it('refuse si aucune restriction configuree (securite par defaut)', () => {
		expect(isEmailAllowed('anyone@anywhere.com', [], [])).toBe(false);
	});

	it('refuse un email non liste meme si domaine non configure', () => {
		expect(isEmailAllowed('inconnu@filmpro.ch', [], emails)).toBe(false);
	});

	// --- Acceptation (happy path) ---

	it('accepte pascal@filmpro.ch par domaine', () => {
		expect(isEmailAllowed('pascal@filmpro.ch', domains, [])).toBe(true);
	});

	it('accepte pascal@filmpro.ch par email explicite', () => {
		expect(isEmailAllowed('pascal@filmpro.ch', [], emails)).toBe(true);
	});

	it('accepte antoine@filmpro.ch', () => {
		expect(isEmailAllowed('antoine@filmpro.ch', domains, emails)).toBe(true);
	});

	it('accepte avec casse differente', () => {
		expect(isEmailAllowed('Pascal@FilmPro.CH', domains, emails)).toBe(true);
	});

	it('accepte un nouvel email @filmpro.ch par domaine', () => {
		expect(isEmailAllowed('nouveau@filmpro.ch', domains, emails)).toBe(true);
	});
});
