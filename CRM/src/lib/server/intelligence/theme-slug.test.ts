import { describe, it, expect } from 'vitest';
import { isAllowedThemeSlug } from './theme-slug';

describe('isAllowedThemeSlug (M-22)', () => {
	const active = ['films_solaires', 'reglementation', 'autre'];

	it('true si le slug est dans la liste active', () => {
		expect(isAllowedThemeSlug('films_solaires', active)).toBe(true);
		expect(isAllowedThemeSlug('autre', active)).toBe(true);
	});

	it('false si le slug est absent', () => {
		expect(isAllowedThemeSlug('inconnu', active)).toBe(false);
		expect(isAllowedThemeSlug('', active)).toBe(false);
	});

	it('false sur liste vide', () => {
		expect(isAllowedThemeSlug('films_solaires', [])).toBe(false);
	});

	it('comparaison stricte (casse sensible)', () => {
		expect(isAllowedThemeSlug('Films_Solaires', active)).toBe(false);
	});
});
