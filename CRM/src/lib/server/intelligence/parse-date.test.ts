import { describe, it, expect } from 'vitest';
import { parseFlexibleDate, isWithinWindow } from './parse-date';

describe('parseFlexibleDate', () => {
	it('parse YYYY-MM-DD', () => {
		const d = parseFlexibleDate('2026-04-14');
		expect(d?.toISOString()).toBe('2026-04-14T00:00:00.000Z');
	});

	it('parse ISO complet avec Z', () => {
		const d = parseFlexibleDate('2026-04-14T10:30:00Z');
		expect(d?.toISOString()).toBe('2026-04-14T10:30:00.000Z');
	});

	it('parse ISO avec offset', () => {
		const d = parseFlexibleDate('2026-04-14T10:30:00+02:00');
		expect(d?.toISOString()).toBe('2026-04-14T08:30:00.000Z');
	});

	it('parse YYYY-MM partiel', () => {
		const d = parseFlexibleDate('2026-04');
		expect(d?.toISOString()).toBe('2026-04-01T00:00:00.000Z');
	});

	it('parse YYYY seul', () => {
		const d = parseFlexibleDate('2026');
		expect(d?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
	});

	it('rejette null/undefined/vide', () => {
		expect(parseFlexibleDate(null)).toBeNull();
		expect(parseFlexibleDate(undefined)).toBeNull();
		expect(parseFlexibleDate('')).toBeNull();
		expect(parseFlexibleDate('  ')).toBeNull();
	});

	it('rejette année absurde', () => {
		expect(parseFlexibleDate('1999-01-01')).toBeNull();
		expect(parseFlexibleDate('2200-01-01')).toBeNull();
		expect(parseFlexibleDate('1999')).toBeNull();
	});

	it('rejette mois invalide', () => {
		expect(parseFlexibleDate('2026-13')).toBeNull();
		expect(parseFlexibleDate('2026-00')).toBeNull();
	});

	it('rejette chaîne non parsable', () => {
		expect(parseFlexibleDate('hier')).toBeNull();
		expect(parseFlexibleDate('not a date')).toBeNull();
	});
});

describe('isWithinWindow', () => {
	it('accepte date dans la fenêtre', () => {
		const d = new Date('2026-04-14T12:00:00Z');
		expect(isWithinWindow(d, '2026-04-13', '2026-04-19')).toBe(true);
	});

	it('accepte date = début de fenêtre (00:00)', () => {
		const d = new Date('2026-04-13T00:00:00Z');
		expect(isWithinWindow(d, '2026-04-13', '2026-04-19')).toBe(true);
	});

	it('accepte date = fin de fenêtre (23:59)', () => {
		const d = new Date('2026-04-19T23:59:59Z');
		expect(isWithinWindow(d, '2026-04-13', '2026-04-19')).toBe(true);
	});

	it('rejette date avant fenêtre', () => {
		const d = new Date('2026-04-12T23:59:59Z');
		expect(isWithinWindow(d, '2026-04-13', '2026-04-19')).toBe(false);
	});

	it('rejette date après fenêtre', () => {
		const d = new Date('2026-04-20T00:00:00Z');
		expect(isWithinWindow(d, '2026-04-13', '2026-04-19')).toBe(false);
	});

	it('retourne false si bornes invalides', () => {
		const d = new Date('2026-04-14T12:00:00Z');
		expect(isWithinWindow(d, 'invalid', '2026-04-19')).toBe(false);
	});
});
