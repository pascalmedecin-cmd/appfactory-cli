import { describe, it, expect } from 'vitest';
import { normalizeNFD, normalizeNFDTrim } from './text-normalize';

describe('normalizeNFD (audit 360 H-22)', () => {
	it('strip accents latins courants', () => {
		expect(normalizeNFD('fenêtre')).toBe('fenetre');
		expect(normalizeNFD('rénovation')).toBe('renovation');
		expect(normalizeNFD('Genève')).toBe('geneve');
		expect(normalizeNFD('façade')).toBe('facade');
	});

	it('lowercase + strip combiné', () => {
		expect(normalizeNFD('CONSTRUCTION')).toBe('construction');
		expect(normalizeNFD('Zürich')).toBe('zurich');
		expect(normalizeNFD('Sàrl')).toBe('sarl');
	});

	it('préserve les chiffres, ponctuation, espaces', () => {
		expect(normalizeNFD('abc 123')).toBe('abc 123');
		expect(normalizeNFD('Vitrerie Dupond, SA')).toBe('vitrerie dupond, sa');
	});

	it('chaîne vide → vide (no-op)', () => {
		expect(normalizeNFD('')).toBe('');
	});

	it('chaîne déjà normalisée → idempotent', () => {
		const first = normalizeNFD('Müller');
		expect(normalizeNFD(first)).toBe(first);
		expect(first).toBe('muller');
	});

	it('caractères Unicode hors range diacritiques préservés (emoji + CJK)', () => {
		expect(normalizeNFD('Café 🇨🇭')).toBe('cafe 🇨🇭');
		expect(normalizeNFD('東京 City')).toBe('東京 city');
	});

	it('cas extrême : multiples accents combinés (caractères composés)', () => {
		// 'naïve' utilise un i avec tréma combinant (NFC) ou décomposé (NFD).
		expect(normalizeNFD('naïve')).toBe('naive');
		expect(normalizeNFD('Pâte à modeler')).toBe('pate a modeler');
	});
});

describe('normalizeNFDTrim (audit 360 H-22)', () => {
	it('combine NFD + trim externe', () => {
		expect(normalizeNFDTrim('  Ëlephant  ')).toBe('elephant');
		expect(normalizeNFDTrim('\tFÉNÊTRE\n')).toBe('fenetre');
	});

	it('préserve les espaces internes', () => {
		expect(normalizeNFDTrim('  Île de France  ')).toBe('ile de france');
	});

	it('chaîne vide ou whitespace-only → ""', () => {
		expect(normalizeNFDTrim('')).toBe('');
		expect(normalizeNFDTrim('   ')).toBe('');
	});
});
