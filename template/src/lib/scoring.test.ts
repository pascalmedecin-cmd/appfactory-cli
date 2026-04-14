import { describe, it, expect } from 'vitest';
import { calculerScore, calculerBonusVeille, SIGNAL_VEILLE_SCORING } from './scoring';

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

describe('calculerBonusVeille (Bloc 3)', () => {
	it('retourne +2 pour etabli + OK FilmPro dans la fenêtre', () => {
		const bonus = calculerBonusVeille({
			maturity: 'etabli',
			complianceTag: 'OK FilmPro',
			weeksSince: 1
		});
		expect(bonus).not.toBeNull();
		expect(bonus!.points).toBe(2);
		expect(bonus!.critere).toContain('OK FilmPro');
	});

	it('retourne +1 pour etabli avec compliance autre', () => {
		const bonus = calculerBonusVeille({
			maturity: 'etabli',
			complianceTag: 'Adjacent pertinent',
			weeksSince: 2
		});
		expect(bonus!.points).toBe(1);
	});

	it('retourne +1 pour emergent peu importe compliance', () => {
		const bonus = calculerBonusVeille({
			maturity: 'emergent',
			complianceTag: 'OK FilmPro',
			weeksSince: 0
		});
		expect(bonus!.points).toBe(1);
	});

	it('retourne null pour speculatif (0 point explicite)', () => {
		const bonus = calculerBonusVeille({
			maturity: 'speculatif',
			complianceTag: 'OK FilmPro',
			weeksSince: 0
		});
		expect(bonus).toBeNull();
	});

	it('retourne null au-delà de 4 semaines (décroissance totale)', () => {
		const bonus = calculerBonusVeille({
			maturity: 'etabli',
			complianceTag: 'OK FilmPro',
			weeksSince: 5
		});
		expect(bonus).toBeNull();
	});

	it('retourne null pour weeksSince négatif (bug date future)', () => {
		const bonus = calculerBonusVeille({
			maturity: 'etabli',
			complianceTag: 'OK FilmPro',
			weeksSince: -1
		});
		expect(bonus).toBeNull();
	});

	it('retourne le bonus exactement à 4 semaines (bord inclus)', () => {
		const bonus = calculerBonusVeille({
			maturity: 'etabli',
			complianceTag: 'OK FilmPro',
			weeksSince: SIGNAL_VEILLE_SCORING.decayWeeks
		});
		expect(bonus).not.toBeNull();
		expect(bonus!.points).toBe(2);
	});
});

describe('calculerScore avec intelligenceSignal (Bloc 3)', () => {
	it('applique le bonus Veille en plus du scoring classique', () => {
		const withoutSignal = calculerScore({
			canton: 'VD',
			source: 'simap',
			raison_sociale: 'construction sa',
		});
		const withSignal = calculerScore({
			canton: 'VD',
			source: 'simap',
			raison_sociale: 'construction sa',
			intelligenceSignal: {
				maturity: 'etabli',
				complianceTag: 'OK FilmPro',
				weeksSince: 1
			}
		});
		expect(withSignal.total).toBe(withoutSignal.total + 2);
		expect(withSignal.criteres.some((c) => c.includes('OK FilmPro'))).toBe(true);
	});

	it('ignore intelligenceSignal si fenêtre dépassée', () => {
		const baseline = calculerScore({
			canton: 'GE',
			source: 'simap',
		});
		const stale = calculerScore({
			canton: 'GE',
			source: 'simap',
			intelligenceSignal: {
				maturity: 'etabli',
				complianceTag: 'OK FilmPro',
				weeksSince: 10
			}
		});
		expect(stale.total).toBe(baseline.total);
	});

	it('accepte intelligenceSignal null sans effet', () => {
		const result = calculerScore({
			source: 'simap',
			intelligenceSignal: null
		});
		expect(result.total).toBe(2); // juste signal simap
	});

	it('speculatif ne modifie pas le score', () => {
		const baseline = calculerScore({ source: 'simap' });
		const specu = calculerScore({
			source: 'simap',
			intelligenceSignal: { maturity: 'speculatif', weeksSince: 0 }
		});
		expect(specu.total).toBe(baseline.total);
	});
});
