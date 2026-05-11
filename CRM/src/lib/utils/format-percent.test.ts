import { describe, it, expect } from 'vitest';
import { formatPercentFromRatio, formatPercentValue } from './format-percent';

describe('formatPercentFromRatio (M-24)', () => {
	it('ratio → pourcentage 1 décimale, sans signe par défaut', () => {
		expect(formatPercentFromRatio(0.382)).toMatch(/^38,2\s*%$/);
		expect(formatPercentFromRatio(0)).toMatch(/^0,0\s*%$/);
		expect(formatPercentFromRatio(1)).toMatch(/^100,0\s*%$/);
	});

	it('signed:true → signe explicite (sauf zéro)', () => {
		expect(formatPercentFromRatio(0.124, { signed: true })).toMatch(/^\+12,4\s*%$/);
		expect(formatPercentFromRatio(-0.05, { signed: true })).toMatch(/^[−-]5,0\s*%$/);
		expect(formatPercentFromRatio(0, { signed: true })).toMatch(/^0,0\s*%$/);
	});

	it('non-fini → fallback (défaut "—")', () => {
		expect(formatPercentFromRatio(NaN)).toBe('—');
		expect(formatPercentFromRatio(Infinity)).toBe('—');
		expect(formatPercentFromRatio(-Infinity, { fallback: 'n/a' })).toBe('n/a');
	});
});

describe('formatPercentValue (M-24)', () => {
	it('valeur 0..100 → "X,Y %" avec espace ASCII (compat tests reporting)', () => {
		expect(formatPercentValue(38.2)).toBe('38,2 %');
		expect(formatPercentValue(0)).toBe('0,0 %');
		expect(formatPercentValue(100)).toBe('100,0 %');
		expect(formatPercentValue(12.5)).toContain(',');
		expect(formatPercentValue(12.5)).not.toContain('.');
	});

	it('non-fini → fallback (défaut "—")', () => {
		expect(formatPercentValue(NaN)).toBe('—');
		expect(formatPercentValue(Infinity, { fallback: '?' })).toBe('?');
	});
});
