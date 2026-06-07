import { describe, it, expect } from 'vitest';
import { calculerScore } from './scoring';
import type { KeywordRow } from './scoring/keywords';

// Helpers : keywords seed proches de la migration _003 (sous-ensemble).
function kw(terme: string, terme_norm: string, categorie: 'coeur' | 'bonus' | 'eviter', poids: number): KeywordRow {
	return { id: terme, terme, terme_norm, categorie, poids };
}

const KW_SEED: KeywordRow[] = [
	kw('vitrage', 'vitrage', 'coeur', 5),
	kw('film', 'film', 'coeur', 5),
	kw('régie', 'regie', 'bonus', 2),
	kw('architecte', 'architecte', 'bonus', 2),
	kw('route', 'route', 'eviter', -3),
	kw('voirie', 'voirie', 'eviter', -3),
];

describe('calculerScore v2 - rétro-compat (keywords absent ou vide)', () => {
	it('golden : keywords undefined → comportement v1 identique (V5 : Zefix seul → 0)', () => {
		const r = calculerScore({ source: 'zefix' });
		expect(r.total).toBe(0);
		expect(r.criteres.every((c) => !c.includes('Entreprise identifiee'))).toBe(true);
	});

	it('golden : keywords [] → comportement v1 identique (config.secteursCibles utilisé)', () => {
		const lead = { source: 'simap', description: 'construction école', canton: 'GE' };
		const v1 = calculerScore(lead);
		const v1bis = calculerScore(lead, []);
		expect(v1.total).toBe(v1bis.total);
		expect(v1.criteres).toEqual(v1bis.criteres);
	});

	it('golden : config.secteursCibles continue de matcher "construction" en mode v1', () => {
		const r = calculerScore({ source: 'simap', description: 'travaux de construction' });
		expect(r.criteres).toContainEqual(expect.stringContaining('Secteur'));
	});
});

describe('calculerScore v2 - keywords actif (Cœur / Bonus / Éviter)', () => {
	it('lead avec 1 mot Cœur "vitrage" en description → +5 keywords (composant secteur v1 absent)', () => {
		const r = calculerScore(
			{ source: 'simap', description: 'rénovation du vitrage de l\'école' },
			KW_SEED,
		);
		// V5 : +5 (Cœur vitrage) seul. Le booster +2 simap a été retiré.
		expect(r.total).toBe(5);
		expect(r.criteres).toContainEqual(expect.stringContaining('Cœur'));
		expect(r.criteres).not.toContainEqual(expect.stringContaining('Secteur'));
	});

	it('lead avec mix Cœur + Bonus + Éviter → score équilibré', () => {
		const r = calculerScore(
			{
				source: 'simap',
				canton: 'GE',
				description: 'la régie demande la pose de vitrage côté route',
			},
			KW_SEED,
		);
		// V5 : +2 (canton GE prio) + 5 (Cœur vitrage) + 2 (Bonus régie) - 3 (Éviter route) = 6 (plus de +2 simap)
		expect(r.total).toBe(6);
		expect(r.criteres.some((c) => c.includes('Cœur'))).toBe(true);
		expect(r.criteres.some((c) => c.includes('Bonus'))).toBe(true);
		expect(r.criteres.some((c) => c.includes('Éviter'))).toBe(true);
	});

	it('lead hors-scope (que des Éviter) avec autres composants → score négatif possible', () => {
		const r = calculerScore(
			{ source: 'search_ch', description: 'réfection de la chaussée et de la voirie sur la route' },
			KW_SEED,
		);
		// Éviter route (-3) + Éviter voirie (-3) = -6, pas d'autres composants
		// chaussée n'est pas dans KW_SEED de ce test (juste route+voirie)
		expect(r.total).toBe(-6);
		expect(r.label).toBe('froid');
	});

	it('lead avec 3 matches Cœur → plafonné à +10', () => {
		const r = calculerScore(
			{ source: 'search_ch', description: 'vitrage et film et film partout' },
			KW_SEED,
		);
		// vitrage = 1*5, film = 2*5 = 15 raw → cap à 10 ; pas d'autre composant
		expect(r.total).toBe(10);
	});

	it('tri par score : signaux ordonnés correctement', () => {
		// V5 : plus de +2 simap. L'ordre relatif est préservé (c'est ce qui importe pour le tri).
		const lead1 = { source: 'simap', description: 'vitrage rénové' }; // +5
		const lead2 = { source: 'simap', description: 'banale notice' }; // 0
		const lead3 = { source: 'simap', description: 'réfection de route' }; // -3
		const scores = [lead1, lead2, lead3].map((l) => calculerScore(l, KW_SEED).total);
		expect(scores).toEqual([5, 0, -3]);
		const sorted = [...scores].sort((a, b) => b - a);
		expect(sorted).toEqual([5, 0, -3]);
	});

	it('match accents-insensible : Régie / régie / REGIE tous +2 Bonus', () => {
		const r1 = calculerScore({ source: 'search_ch', description: 'Régie Dupont' }, KW_SEED);
		const r2 = calculerScore({ source: 'search_ch', description: 'régie active' }, KW_SEED);
		const r3 = calculerScore({ source: 'search_ch', description: 'REGIE SA' }, KW_SEED);
		expect(r1.total).toBe(2);
		expect(r2.total).toBe(2);
		expect(r3.total).toBe(2);
	});

	it('plein-mot : "route" ne matche pas "autoroute"', () => {
		const r = calculerScore({ source: 'search_ch', description: 'autoroute A1' }, KW_SEED);
		// pas de malus éviter ; pas d'autre composant
		expect(r.total).toBe(0);
	});
});
