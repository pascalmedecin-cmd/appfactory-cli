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

describe('calculerScore : fixes bimodalité scoring (audit 2026-05-01)', () => {
	// Bug 1 historique : "Bâtiment".toLowerCase() = "bâtiment" qui ne matchait jamais
	// le keyword "batiment" sans normalisation NFD. 50 leads RegBL ratent +3 secteur.
	it('matche les keywords secteur sur description avec accents (NFD strip)', () => {
		const result = calculerScore({
			source: 'regbl',
			description: 'Bâtiment autorisé - 4 étages - 237 m² au sol',
		});
		// regbl source intervention (+1) + secteur "batiment" matché via normalize (+3) = 4
		expect(result.total).toBe(4);
		expect(result.criteres.some((c) => c.includes('Secteur'))).toBe(true);
	});

	it('matche les keywords secteur via raison_sociale avec accents', () => {
		const result = calculerScore({
			source: 'search_ch',
			raison_sociale: 'Bureau d\'Architecture Genève SA',
		});
		// search_ch ne donne aucune source → secteur "architecture" via normalize (+3)
		expect(result.total).toBe(3);
		expect(result.criteres.some((c) => c.includes('Secteur'))).toBe(true);
	});

	// Bug 2 historique : RegBL n'était pondéré nulle part comme source signal.
	it('pondère regbl comme source intervention (+1)', () => {
		const result = calculerScore({
			source: 'regbl',
		});
		expect(result.total).toBe(1);
		expect(result.criteres.some((c) => c.includes('REGBL'))).toBe(true);
	});

	// Bug 3 historique : la colonne secteur_detecte calculée à l'import était ignorée.
	it('lit secteur_detecte en priorité sur description', () => {
		const result = calculerScore({
			source: 'search_ch',
			secteur_detecte: 'construction',
			// description vide ou non parsable : secteur_detecte doit suffire
			description: 'XYZ123',
			raison_sociale: 'XYZ Holding',
		});
		expect(result.total).toBe(3);
		expect(result.criteres.some((c) => c.includes('construction'))).toBe(true);
	});

	it('fallback sur description si secteur_detecte ne matche pas un keyword', () => {
		const result = calculerScore({
			source: 'search_ch',
			secteur_detecte: 'autre',
			description: 'Renovation de facade',
		});
		// "autre" ne matche aucun keyword secteur → fallback description "renovation"
		expect(result.total).toBe(3);
	});

	// Cas réel observé en prod : RegBL canton GE avec description "Bâtiment autorisé".
	// Avant fix : score = 2 (canton GE) + 0 (secteur raté accent) + 0 (regbl pas pondéré) = 2-3.
	// Après fix : score = 2 + 3 + 1 = 6 (sans récence).
	it('lead RegBL canton GE avec description accentuée scoré correctement (cas prod)', () => {
		const result = calculerScore({
			canton: 'GE',
			source: 'regbl',
			secteur_detecte: 'construction',
			description: 'Bâtiment autorisé - 4 étages - 237 m² au sol',
			raison_sociale: 'Chantier Genève (EGID 12345)',
		});
		// canton GE (+2) + secteur (+3) + regbl intervention (+1) = 6
		expect(result.total).toBe(6);
		expect(result.label).toBe('tiede');
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
});

describe('calculerScore avec intelligenceSignals (Phase C+D : agrégation cross-signaux)', () => {
	it('cumule plusieurs signaux dans la fenêtre', () => {
		const baseline = calculerScore({
			canton: 'VD',
			source: 'simap'
		});
		// 2 signaux : etabli OK FilmPro (+2) + emergent (+1) = +3
		const withTwo = calculerScore({
			canton: 'VD',
			source: 'simap',
			intelligenceSignals: [
				{ maturity: 'etabli', complianceTag: 'OK FilmPro', weeksSince: 0 },
				{ maturity: 'emergent', complianceTag: 'Adjacent pertinent', weeksSince: 2 }
			]
		});
		expect(withTwo.total).toBe(baseline.total + 3);
		const cumulCritere = withTwo.criteres.find((c) => c.startsWith('Veille cumul'));
		expect(cumulCritere).toBeDefined();
		expect(cumulCritere).toContain('2 signaux');
	});

	it('plafonne à maxBonus (4) quand le cumul brut dépasse', () => {
		// 3 signaux etabli OK FilmPro = +6 brut → plafonné à 4
		const result = calculerScore({
			source: 'simap',
			intelligenceSignals: [
				{ maturity: 'etabli', complianceTag: 'OK FilmPro', weeksSince: 0 },
				{ maturity: 'etabli', complianceTag: 'OK FilmPro', weeksSince: 1 },
				{ maturity: 'etabli', complianceTag: 'OK FilmPro', weeksSince: 2 }
			]
		});
		// baseline simap (+2) + plafond cumul Veille (+4) = 6
		expect(result.total).toBe(6);
		expect(result.criteres.some((c) => c.includes('plafonné'))).toBe(true);
		expect(result.criteres.some((c) => c.includes('+4/6'))).toBe(true);
	});

	it('ignore les signaux hors fenêtre dans le cumul', () => {
		const result = calculerScore({
			source: 'simap',
			intelligenceSignals: [
				{ maturity: 'etabli', complianceTag: 'OK FilmPro', weeksSince: 0 }, // +2
				{ maturity: 'etabli', complianceTag: 'OK FilmPro', weeksSince: 10 } // 0 (hors fenêtre)
			]
		});
		expect(result.total).toBe(2 + 2); // simap + 1 signal valide
		expect(result.criteres.some((c) => c.includes('Veille cumul 1 signal'))).toBe(true);
	});

	it('intelligenceSignals (array) prend le pas sur intelligenceSignal (legacy)', () => {
		// Si les deux sont fournis, l'array gagne (évite double-comptage).
		const result = calculerScore({
			source: 'simap',
			intelligenceSignal: { maturity: 'etabli', complianceTag: 'OK FilmPro', weeksSince: 0 },
			intelligenceSignals: [
				{ maturity: 'emergent', complianceTag: 'Adjacent pertinent', weeksSince: 0 }
			]
		});
		// simap (+2) + array seul (emergent +1) = 3
		expect(result.total).toBe(3);
	});

	it('array vide → fallback sur signal legacy si présent', () => {
		const result = calculerScore({
			source: 'simap',
			intelligenceSignal: { maturity: 'etabli', complianceTag: 'OK FilmPro', weeksSince: 0 },
			intelligenceSignals: []
		});
		// L'array vide active le bloc agrégation mais sans signal → 0 bonus.
		// Fallback sur intelligenceSignal n'a PAS lieu (cohérent : si caller passe array vide, c'est qu'il a interrogé la table de jointure et n'a rien trouvé).
		expect(result.total).toBe(2); // juste simap
	});

	it('array null → fallback sur signal legacy', () => {
		const result = calculerScore({
			source: 'simap',
			intelligenceSignal: { maturity: 'etabli', complianceTag: 'OK FilmPro', weeksSince: 0 },
			intelligenceSignals: null
		});
		expect(result.total).toBe(2 + 2); // simap + bonus legacy
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
