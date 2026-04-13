import { describe, it, expect } from 'vitest';
import { getIsoWeek, formatWeekLabel, currentWeekRange } from './week-utils';

describe('getIsoWeek', () => {
	it('renvoie W01 pour le 4 janvier 2026', () => {
		const r = getIsoWeek(new Date('2026-01-04T12:00:00Z'));
		expect(r.year).toBe(2026);
		expect(r.week).toBe(1);
	});

	it('renvoie W15 pour le 2026-04-10', () => {
		const r = getIsoWeek(new Date('2026-04-10T12:00:00Z'));
		expect(r.week).toBe(15);
	});

	it('gere le debordement annee (31 decembre peut etre W01 annee suivante)', () => {
		// 2029-12-31 est un lundi = W01 2030 ISO
		const r = getIsoWeek(new Date('2029-12-31T12:00:00Z'));
		expect(r.year).toBe(2030);
		expect(r.week).toBe(1);
	});
});

describe('formatWeekLabel', () => {
	it('pad la semaine sur 2 digits', () => {
		expect(formatWeekLabel(2026, 1)).toBe('2026-W01');
		expect(formatWeekLabel(2026, 15)).toBe('2026-W15');
		expect(formatWeekLabel(2026, 52)).toBe('2026-W52');
	});
});

describe('currentWeekRange', () => {
	it('renvoie lundi au dimanche pour un vendredi', () => {
		const r = currentWeekRange(new Date('2026-04-10T08:00:00Z')); // vendredi
		expect(r.weekLabel).toBe('2026-W15');
		expect(r.dateStart).toBe('2026-04-06'); // lundi
		expect(r.dateEnd).toBe('2026-04-12');   // dimanche
	});

	it('gere un dimanche correctement (toujours dans la meme semaine ISO)', () => {
		const r = currentWeekRange(new Date('2026-04-12T23:00:00Z'));
		expect(r.weekLabel).toBe('2026-W15');
	});
});
