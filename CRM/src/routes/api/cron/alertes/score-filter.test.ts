import { describe, it, expect } from 'vitest';
import { buildScoreFilter, type ScoreThresholds } from './score-filter';

// Seuils typiques (alignés config.scoring : chaud >= 9, tiede 5..8, froid <= 4).
const T: ScoreThresholds = { chaudMin: 9, tiedeMin: 5, tiedeMax: 8, froidMax: 4 };

describe('buildScoreFilter', () => {
	it('retourne null si aucune température', () => {
		expect(buildScoreFilter(null, T)).toBeNull();
		expect(buildScoreFilter(undefined, T)).toBeNull();
		expect(buildScoreFilter([], T)).toBeNull();
	});

	it('retourne null si les 3 températures sont sélectionnées (couvre tout)', () => {
		expect(buildScoreFilter(['chaud', 'tiede', 'froid'], T)).toBeNull();
	});

	it('ignore les valeurs inconnues et null-ise si rien de valide ne reste', () => {
		expect(buildScoreFilter(['inconnu'], T)).toBeNull();
	});

	it('chaud seul → gte chaudMin', () => {
		expect(buildScoreFilter(['chaud'], T)).toEqual({ mode: 'gte', gte: 9 });
	});

	it('tiede seul → between [tiedeMin, tiedeMax]', () => {
		expect(buildScoreFilter(['tiede'], T)).toEqual({ mode: 'between', gte: 5, lte: 8 });
	});

	it('froid seul → lte froidMax', () => {
		expect(buildScoreFilter(['froid'], T)).toEqual({ mode: 'lte', lte: 4 });
	});

	it('chaud + froid → or-expr PostgREST', () => {
		expect(buildScoreFilter(['chaud', 'froid'], T)).toEqual({
			mode: 'or',
			orExpr: 'score_pertinence.gte.9,score_pertinence.lte.4',
		});
	});

	it('chaud + tiede → or-expr avec and() pour la plage tiède', () => {
		expect(buildScoreFilter(['chaud', 'tiede'], T)).toEqual({
			mode: 'or',
			orExpr: 'score_pertinence.gte.9,and(score_pertinence.gte.5,score_pertinence.lte.8)',
		});
	});

	it('dé-duplique en conservant l’ordre d’apparition', () => {
		expect(buildScoreFilter(['froid', 'chaud', 'froid'], T)).toEqual({
			mode: 'or',
			orExpr: 'score_pertinence.lte.4,score_pertinence.gte.9',
		});
	});

	it('une seule valeur après dé-dup → plan range, pas or', () => {
		expect(buildScoreFilter(['chaud', 'chaud'], T)).toEqual({ mode: 'gte', gte: 9 });
	});
});
