import { describe, it, expect } from 'vitest';
import { extractEntityCandidates } from './entity-verify';

describe('extractEntityCandidates', () => {
	it('extrait une entite SA simple', () => {
		const cands = extractEntityCandidates('Plattix SA annonce un projet.');
		expect(cands).toContain('Plattix SA');
	});

	it('extrait plusieurs formes corporate suisses', () => {
		const text =
			'Acme SA et Beta Sàrl collaborent avec Gamma GmbH sur un chantier. Delta AG supervise.';
		const cands = extractEntityCandidates(text);
		expect(cands).toEqual(
			expect.arrayContaining(['Acme SA', 'Beta Sàrl', 'Gamma GmbH', 'Delta AG'])
		);
	});

	it('extrait un nom compose', () => {
		const cands = extractEntityCandidates('Les Ateliers du Verre SA remportent le marche.');
		expect(cands.some((c) => c.includes('Ateliers du Verre'))).toBe(true);
	});

	it('ignore administrations generiques', () => {
		const cands = extractEntityCandidates('Le Canton de Vaud SA publie un rapport.');
		expect(cands.find((c) => c.startsWith('Canton'))).toBeUndefined();
	});

	it('retourne tableau vide si aucun suffixe', () => {
		const cands = extractEntityCandidates('Un chantier est en cours a Geneve.');
		expect(cands).toEqual([]);
	});

	it('dedoublonne', () => {
		const cands = extractEntityCandidates('Plattix SA et Plattix SA annoncent.');
		expect(cands.filter((c) => c === 'Plattix SA').length).toBe(1);
	});
});
