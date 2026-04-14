import { describe, it, expect } from 'vitest';
import { calculerScore } from './scoring';

describe('calculerScore', () => {
	it('retourne +1 pour un lead Zefix seul (entreprise identifiee)', () => {
		const result = calculerScore({
			source: 'zefix',
		});
		expect(result.total).toBe(1);
		expect(result.label).toBe('froid');
		expect(result.criteres).toContainEqual(expect.stringContaining('Entreprise identifiee'));
	});

	it('retourne 0 pour un lead sans critere (source non Zefix)', () => {
		const result = calculerScore({
			source: 'search_ch',
		});
		expect(result.total).toBe(0);
		expect(result.label).toBe('froid');
		expect(result.criteres).toHaveLength(0);
	});

	it('donne +2 pour un canton prioritaire (GE)', () => {
		const result = calculerScore({
			canton: 'GE',
			source: 'search_ch',
		});
		expect(result.total).toBe(2);
		expect(result.criteres).toContainEqual(expect.stringContaining('Canton GE'));
	});

	it('donne +1 pour un canton secondaire (NE)', () => {
		const result = calculerScore({
			canton: 'NE',
			source: 'search_ch',
		});
		expect(result.total).toBe(1);
		expect(result.criteres).toContainEqual(expect.stringContaining('Canton NE'));
	});

	it('donne +3 pour un secteur cible dans la description', () => {
		const result = calculerScore({
			source: 'search_ch',
			description: 'Bureau de construction et renovation',
		});
		expect(result.total).toBe(3);
		expect(result.criteres).toContainEqual(expect.stringContaining('Secteur'));
	});

	it('donne +3 pour un secteur cible dans la raison sociale', () => {
		const result = calculerScore({
			source: 'search_ch',
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

	it('donne +1 entreprise identifiee pour source zefix', () => {
		const result = calculerScore({
			source: 'zefix',
		});
		expect(result.total).toBe(1);
		expect(result.criteres).toContainEqual(expect.stringContaining('Entreprise identifiee'));
	});

	it('donne +2 pour date < 30 jours', () => {
		const recent = new Date();
		recent.setDate(recent.getDate() - 10);
		const result = calculerScore({
			source: 'search_ch',
			date_publication: recent.toISOString(),
		});
		expect(result.total).toBe(2);
		expect(result.criteres).toContainEqual(expect.stringContaining('30j'));
	});

	it('donne +1 pour date entre 30 et 90 jours', () => {
		const older = new Date();
		older.setDate(older.getDate() - 60);
		const result = calculerScore({
			source: 'search_ch',
			date_publication: older.toISOString(),
		});
		expect(result.total).toBe(1);
		expect(result.criteres).toContainEqual(expect.stringContaining('90j'));
	});

	it('donne +1 si telephone present', () => {
		const result = calculerScore({
			source: 'search_ch',
			telephone: '+41 22 123 45 67',
		});
		expect(result.total).toBe(1);
	});

	it('donne +1 si montant > 100k', () => {
		const result = calculerScore({
			source: 'search_ch',
			montant: 250000,
		});
		expect(result.total).toBe(1);
	});

	it('ne donne rien si montant <= 100k', () => {
		const result = calculerScore({
			source: 'search_ch',
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
		// canton GE (2) + secteur (3) + simap (2) + recent (2) + tel (1) + montant (1) = 11
		expect(result.total).toBe(11);
		expect(result.label).toBe('chaud');
	});

	it('label tiede pour score 4-6', () => {
		const result = calculerScore({
			canton: 'GE',
			source: 'simap',
		});
		// 2 + 2 = 4
		expect(result.total).toBe(4);
		expect(result.label).toBe('tiede');
	});

	it('label froid pour score <4', () => {
		const result = calculerScore({
			source: 'simap',
		});
		// 2
		expect(result.total).toBe(2);
		expect(result.label).toBe('froid');
	});

	it('label chaud pour score >=7', () => {
		const result = calculerScore({
			canton: 'GE',
			source: 'zefix',
			raison_sociale: 'Construction SA',
			telephone: '+41 22 000 00 00',
		});
		// canton GE (2) + secteur (3) + entreprise identifiee zefix (1) + tel (1) = 7
		expect(result.total).toBe(7);
		expect(result.label).toBe('chaud');
	});
});
