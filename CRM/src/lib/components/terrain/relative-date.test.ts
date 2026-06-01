import { describe, it, expect } from 'vitest';
import { formatRelativeDate } from './relative-date';

const NOW = new Date('2026-06-01T10:00:00');

describe('formatRelativeDate', () => {
	it("aujourd'hui", () => {
		expect(formatRelativeDate('2026-06-01', NOW)).toBe("aujourd'hui");
	});
	it('hier', () => {
		expect(formatRelativeDate('2026-05-31', NOW)).toBe('hier');
	});
	it('demain', () => {
		expect(formatRelativeDate('2026-06-02', NOW)).toBe('demain');
	});
	it('il y a N j (passé proche)', () => {
		expect(formatRelativeDate('2026-05-28', NOW)).toBe('il y a 4 j');
	});
	it('dans N j (futur proche)', () => {
		expect(formatRelativeDate('2026-06-05', NOW)).toBe('dans 4 j');
	});
	it('date courte au-delà d une semaine', () => {
		expect(formatRelativeDate('2026-05-10', NOW)).toBe('10.05');
		expect(formatRelativeDate('2026-07-20', NOW)).toBe('20.07');
	});
	it('vide / invalide → chaîne vide', () => {
		expect(formatRelativeDate(null, NOW)).toBe('');
		expect(formatRelativeDate('', NOW)).toBe('');
		expect(formatRelativeDate('pas-une-date', NOW)).toBe('');
	});
	it('ignore l heure de now', () => {
		expect(formatRelativeDate('2026-06-01', new Date('2026-06-01T23:59:59'))).toBe("aujourd'hui");
	});
});
