import { describe, it, expect } from 'vitest';
import {
	getIsoWeek,
	formatWeekLabel,
	currentWeekRange,
	extendedWindowStart,
	weekLabelToDate
} from './week-utils';

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

describe('extendedWindowStart', () => {
	it('renvoie dateEnd - 13 jours pour une fenêtre 14j', () => {
		const range = { weekLabel: '2026-W15', dateStart: '2026-04-06', dateEnd: '2026-04-12' };
		expect(extendedWindowStart(range, 14)).toBe('2026-03-30');
	});

	it('renvoie dateStart (identique) pour une fenêtre 7j', () => {
		const range = { weekLabel: '2026-W15', dateStart: '2026-04-06', dateEnd: '2026-04-12' };
		expect(extendedWindowStart(range, 7)).toBe('2026-04-06');
	});

	it('défaut = 14j', () => {
		const range = { weekLabel: '2026-W15', dateStart: '2026-04-06', dateEnd: '2026-04-12' };
		expect(extendedWindowStart(range)).toBe('2026-03-30');
	});
});

describe('weekLabelToDate (round-trip via currentWeekRange)', () => {
	it('round-trip 2026-W18 → currentWeekRange retourne 2026-W18', () => {
		const date = weekLabelToDate('2026-W18');
		const range = currentWeekRange(date);
		expect(range.weekLabel).toBe('2026-W18');
	});

	it('round-trip 2026-W01 (boundary début année)', () => {
		const date = weekLabelToDate('2026-W01');
		const range = currentWeekRange(date);
		expect(range.weekLabel).toBe('2026-W01');
	});

	it('round-trip 2026-W52 (boundary fin année)', () => {
		const date = weekLabelToDate('2026-W52');
		const range = currentWeekRange(date);
		expect(range.weekLabel).toBe('2026-W52');
	});

	it('round-trip 2026-W19 (semaine en cours S167)', () => {
		const date = weekLabelToDate('2026-W19');
		const range = currentWeekRange(date);
		expect(range.weekLabel).toBe('2026-W19');
	});

	it('plante explicitement sur format invalide (pas de W)', () => {
		expect(() => weekLabelToDate('2026-18')).toThrow(/Format attendu/);
	});

	it('plante explicitement sur format invalide (semaine 1 chiffre)', () => {
		expect(() => weekLabelToDate('2026-W1')).toThrow(/Format attendu/);
	});

	it('plante explicitement sur année non numérique', () => {
		expect(() => weekLabelToDate('XXXX-W18')).toThrow(/Format attendu/);
	});

	it('plante si semaine = 0 ou > 53', () => {
		expect(() => weekLabelToDate('2026-W00')).toThrow(/hors plage/);
		expect(() => weekLabelToDate('2026-W54')).toThrow(/hors plage/);
	});

	it('retourne une Date au jeudi de la semaine cible (pivot ISO)', () => {
		// W18 2026 = lundi 27 avril 2026 → jeudi 30 avril 2026
		const date = weekLabelToDate('2026-W18');
		expect(date.getUTCDay()).toBe(4); // jeudi
		expect(date.toISOString().slice(0, 10)).toBe('2026-04-30');
	});
});
