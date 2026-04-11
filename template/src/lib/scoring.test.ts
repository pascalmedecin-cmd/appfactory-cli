import { describe, it, expect } from 'vitest';
import { calculerScore } from './scoring';

describe('calculerScore', () => {
	it('retourne 0 pour un lead sans critere', () => {
		const result = calculerScore({
			source: 'zefix',
		});
		expect(result.total).toBe(0);
		expect(result.label).toBe('non_qualifie');
		expect(result.criteres).toHaveLength(0);
	});

	it('donne +3 pour un canton prioritaire (GE)', () => {
		const result = calculerScore({
			canton: 'GE',
			source: 'zefix',
		});
		expect(result.total).toBe(3);
		expect(result.criteres).toContainEqual(expect.stringContaining('Canton GE'));
	});

	it('donne +1 pour un canton secondaire (NE)', () => {
		const result = calculerScore({
			canton: 'NE',
			source: 'zefix',
		});
		expect(result.total).toBe(1);
		expect(result.criteres).toContainEqual(expect.stringContaining('Canton NE'));
	});

	it('donne +3 pour un secteur cible dans la description', () => {
		const result = calculerScore({
			source: 'zefix',
			description: 'Bureau de construction et renovation',
		});
		expect(result.total).toBe(3);
		expect(result.criteres).toContainEqual(expect.stringContaining('Secteur'));
	});

	it('donne +3 pour un secteur cible dans la raison sociale', () => {
		const result = calculerScore({
			source: 'zefix',
			raison_sociale: 'Architecte SA',
		});
		expect(result.total).toBe(3);
	});

	it('donne +2 pour source chaude SIMAP', () => {
		const result = calculerScore({
			source: 'simap',
		});
		expect(result.total).toBe(2);
		expect(result.criteres).toContainEqual(expect.stringContaining('SIMAP'));
	});

	it('donne +2 pour date < 30 jours', () => {
		const recent = new Date();
		recent.setDate(recent.getDate() - 10);
		const result = calculerScore({
			source: 'zefix',
			date_publication: recent.toISOString(),
		});
		expect(result.total).toBe(2);
		expect(result.criteres).toContainEqual(expect.stringContaining('30j'));
	});

	it('donne +1 pour date entre 30 et 90 jours', () => {
		const older = new Date();
		older.setDate(older.getDate() - 60);
		const result = calculerScore({
			source: 'zefix',
			date_publication: older.toISOString(),
		});
		expect(result.total).toBe(1);
		expect(result.criteres).toContainEqual(expect.stringContaining('90j'));
	});

	it('donne +1 si telephone present', () => {
		const result = calculerScore({
			source: 'zefix',
			telephone: '+41 22 123 45 67',
		});
		expect(result.total).toBe(1);
	});

	it('donne +1 si montant > 100k', () => {
		const result = calculerScore({
			source: 'zefix',
			montant: 250000,
		});
		expect(result.total).toBe(1);
	});

	it('ne donne rien si montant <= 100k', () => {
		const result = calculerScore({
			source: 'zefix',
			montant: 50000,
		});
		expect(result.total).toBe(0);
	});

	it('cumule tous les criteres pour un lead chaud', () => {
		const recent = new Date();
		recent.setDate(recent.getDate() - 5);
		const result = calculerScore({
			canton: 'GE',
			description: 'Renovation de facade et construction',
			source: 'simap',
			date_publication: recent.toISOString(),
			telephone: '+41 22 000 00 00',
			montant: 500000,
		});
		// canton GE (3) + secteur (3) + simap (2) + recent (2) + tel (1) + montant (1) = 12
		expect(result.total).toBe(12);
		expect(result.label).toBe('chaud');
	});

	it('label tiede pour score 5-7', () => {
		const result = calculerScore({
			canton: 'GE',
			source: 'simap',
		});
		// 3 + 2 = 5
		expect(result.total).toBe(5);
		expect(result.label).toBe('tiede');
	});

	it('label froid pour score 2-4', () => {
		const result = calculerScore({
			source: 'simap',
		});
		// 2
		expect(result.total).toBe(2);
		expect(result.label).toBe('froid');
	});
});
