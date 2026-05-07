import { describe, it, expect } from 'vitest';
import { detectCanton, detectKind, normalizeStringToChip, buildChipLabel, normalizeStoredChips } from './chip-normalize';

describe('detectCanton', () => {
	it('détecte les abréviations cantonales', () => {
		expect(detectCanton('AO école VD 2026')).toBe('VD');
		expect(detectCanton('Genève vitrage')).toBe('GE');
		expect(detectCanton('VS Sion')).toBe('VS');
		expect(detectCanton('Neuchâtel rénovation')).toBe('NE');
		expect(detectCanton('Canton FR')).toBe('FR');
		expect(detectCanton('Delémont Jura')).toBe('JU');
	});

	it('détecte villes principales', () => {
		expect(detectCanton('Ville de Lausanne')).toBe('VD');
		expect(detectCanton('Sion bâtiment')).toBe('VS');
		expect(detectCanton('La Chaux-de-Fonds')).toBe('NE');
		expect(detectCanton('Bulle école')).toBe('FR');
	});

	it('retourne null si aucun canton', () => {
		expect(detectCanton('vitrage haute performance')).toBe(null);
		expect(detectCanton('école 2026')).toBe(null);
	});

	it('ne confond pas avec des mots anglais (FR dans "FRench")', () => {
		expect(detectCanton('FRench design')).toBe(null);
	});
});

describe('detectKind', () => {
	it('retourne simap sur indices appel d offres', () => {
		expect(detectKind('SIMAP école')).toBe('simap');
		expect(detectKind('appel d offres vitrage')).toBe('simap');
		expect(detectKind("appel d'offres école")).toBe('simap');
		expect(detectKind('AO Lausanne 2026')).toBe('simap');
		expect(detectKind('marché public rénovation')).toBe('simap');
		expect(detectKind('adjudication vitrage')).toBe('simap');
	});

	it('retourne zefix sur indices raison sociale', () => {
		expect(detectKind('Losinger Marazzi SA')).toBe('zefix');
		expect(detectKind('Acme Sàrl vitrage')).toBe('zefix');
		expect(detectKind('Schmid GmbH Valais')).toBe('zefix');
		expect(detectKind('Novae AG Bern')).toBe('zefix');
		expect(detectKind('Zefix recherche entreprise')).toBe('zefix');
	});

	it('retourne simap par défaut (API texte libre)', () => {
		expect(detectKind('vitrage haute performance')).toBe('simap');
		expect(detectKind('école rénovation')).toBe('simap');
	});
});

describe('normalizeStringToChip', () => {
	it('produit un chip complet depuis une string SIMAP', () => {
		const chip = normalizeStringToChip('appel d offres école Vaud vitrage');
		expect(chip.kind).toBe('simap');
		expect(chip.canton).toBe('VD');
		expect(chip.query).toBe('appel d offres école Vaud vitrage');
		expect(chip.label).toContain('SIMAP');
		expect(chip.label).toContain('VD');
	});

	it('produit un chip Zefix sur string entreprise genevoise', () => {
		const chip = normalizeStringToChip('Losinger Marazzi SA Genève');
		expect(chip.kind).toBe('zefix');
		expect(chip.canton).toBe('GE');
	});

	it('applique le canton fallback (VD par défaut)', () => {
		const chip = normalizeStringToChip('vitrage haute performance');
		expect(chip.canton).toBe('VD');
		expect(chip.kind).toBe('simap');
	});

	it('applique un canton fallback custom', () => {
		const chip = normalizeStringToChip('vitrage', 'GE');
		expect(chip.canton).toBe('GE');
	});

	it('collapse les espaces multiples dans query', () => {
		const chip = normalizeStringToChip('école   rénovation  vitrage');
		expect(chip.query).toBe('école rénovation vitrage');
	});

	it('trim les espaces de bord', () => {
		const chip = normalizeStringToChip('  école Lausanne  ');
		expect(chip.query).toBe('école Lausanne');
	});
});

describe('normalizeStoredChips', () => {
	it('normalise un mix string + chip structuré', () => {
		const result = normalizeStoredChips([
			'école Vaud rénovation',
			{ kind: 'zefix', canton: 'GE', query: 'Losinger', label: 'Zefix · GE · Losinger' }
		]);
		expect(result).toHaveLength(2);
		expect(result[0]).toMatchObject({ kind: 'simap', canton: 'VD' });
		expect(result[1]).toMatchObject({ kind: 'zefix', canton: 'GE', query: 'Losinger' });
	});

	it('reconstruit le label manquant', () => {
		const result = normalizeStoredChips([
			{ kind: 'simap', canton: 'VD', query: 'vitrage école' }
		]);
		expect(result[0].label).toBe('SIMAP · VD · vitrage école');
	});

	it('retourne tableau vide sur input non-array', () => {
		expect(normalizeStoredChips(null)).toEqual([]);
		expect(normalizeStoredChips(undefined)).toEqual([]);
		expect(normalizeStoredChips({})).toEqual([]);
		expect(normalizeStoredChips('string')).toEqual([]);
	});

	it('ignore les entrées invalides (chip mal formé)', () => {
		const result = normalizeStoredChips([
			'valide école',
			{ kind: 'simap' }, // canton + query manquants → skip
			null,
			42,
			{ kind: 'simap', canton: 'VD', query: 'autre valide', label: 'custom' }
		]);
		expect(result).toHaveLength(2);
		expect(result[0].query).toBe('valide école');
		expect(result[1].query).toBe('autre valide');
	});
});

describe('buildChipLabel', () => {
	it('formate SIMAP', () => {
		expect(buildChipLabel('simap', 'VD', 'école vitrage')).toBe('SIMAP · VD · école vitrage');
	});

	it('formate Zefix', () => {
		expect(buildChipLabel('zefix', 'GE', 'Losinger Marazzi')).toBe('Zefix · GE · Losinger Marazzi');
	});

	it('tronque les query > 80 chars avec ellipse', () => {
		const long = 'a'.repeat(100);
		const label = buildChipLabel('simap', 'VD', long);
		expect(label.length).toBeLessThan(100);
		expect(label).toContain('…');
	});
});
