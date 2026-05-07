import { describe, it, expect } from 'vitest';
import { formatRelativeDate, formatRelanceDate, firstNameFromEmail } from './dateFormat';

describe('formatRelativeDate', () => {
	const now = new Date('2026-05-07T15:30:00');

	it('retourne HH:MM si aujourd\'hui', () => {
		const today = new Date('2026-05-07T10:15:00').toISOString();
		expect(formatRelativeDate(today, now)).toBe('10:15');
	});

	it('retourne "Hier" pour la veille', () => {
		const yesterday = new Date('2026-05-06T08:00:00').toISOString();
		expect(formatRelativeDate(yesterday, now)).toBe('Hier');
	});

	it('retourne le jour court dans la même semaine (2-6 jours)', () => {
		// 2026-05-04 = lundi
		const monday = new Date('2026-05-04T08:00:00').toISOString();
		expect(formatRelativeDate(monday, now)).toBe('Lun.');
	});

	it('retourne DD.MM (locale fr-CH) si plus ancien qu\'une semaine', () => {
		const old = new Date('2026-04-15T08:00:00').toISOString();
		expect(formatRelativeDate(old, now)).toBe('15.04');
	});

	it('gère null/undefined/string vide', () => {
		expect(formatRelativeDate(null)).toBe('–');
		expect(formatRelativeDate(undefined)).toBe('–');
		expect(formatRelativeDate('')).toBe('–');
	});

	it('gère date invalide', () => {
		expect(formatRelativeDate('not a date')).toBe('–');
	});
});

describe('formatRelanceDate', () => {
	const now = new Date('2026-05-07T15:30:00');

	it('retourne "Retard Nj" si date passée', () => {
		const past = new Date('2026-05-04T08:00:00').toISOString();
		const r = formatRelanceDate(past, now);
		expect(r.label).toBe('Retard 3j');
		expect(r.urgency).toBe('retard');
	});

	it('retourne "Aujourd\'hui" si date == today', () => {
		const today = new Date('2026-05-07T08:00:00').toISOString();
		const r = formatRelanceDate(today, now);
		expect(r.label).toBe("Aujourd'hui");
		expect(r.urgency).toBe('today');
	});

	it('retourne "Demain" si date == today+1', () => {
		const tomorrow = new Date('2026-05-08T08:00:00').toISOString();
		const r = formatRelanceDate(tomorrow, now);
		expect(r.label).toBe('Demain');
		expect(r.urgency).toBe('demain');
	});

	it('retourne DD.MM (locale fr-CH) si > today+1', () => {
		const later = new Date('2026-05-12T08:00:00').toISOString();
		const r = formatRelanceDate(later, now);
		expect(r.label).toBe('12.05');
		expect(r.urgency).toBe('futur');
	});

	it('gère null', () => {
		const r = formatRelanceDate(null, now);
		expect(r.label).toBe('–');
		expect(r.urgency).toBe('futur');
	});
});

describe('firstNameFromEmail', () => {
	it('extrait le premier nom avant le séparateur', () => {
		expect(firstNameFromEmail('pascal.medecin@gmail.com')).toBe('Pascal');
		expect(firstNameFromEmail('pascal@filmpro.ch')).toBe('Pascal');
		expect(firstNameFromEmail('marie-claire@test.fr')).toBe('Marie');
		expect(firstNameFromEmail('jean_dupont@example.org')).toBe('Jean');
	});

	it('capitalize correctement', () => {
		expect(firstNameFromEmail('PASCAL.M@gmail.com')).toBe('Pascal');
		expect(firstNameFromEmail('pAsCal@test.com')).toBe('Pascal');
	});

	it('retourne null si email vide / invalide', () => {
		expect(firstNameFromEmail(null)).toBeNull();
		expect(firstNameFromEmail(undefined)).toBeNull();
		expect(firstNameFromEmail('')).toBeNull();
		expect(firstNameFromEmail('@gmail.com')).toBeNull();
	});

	it('retourne null si la partie locale ne contient pas de lettres alphabétiques pures', () => {
		expect(firstNameFromEmail('123@test.com')).toBeNull();
		expect(firstNameFromEmail('a1b2@test.com')).toBeNull();
	});

	it('accepte les caractères accentués', () => {
		expect(firstNameFromEmail('amélie@test.fr')).toBe('Amélie');
	});
});
