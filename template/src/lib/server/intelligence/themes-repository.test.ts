import { describe, it, expect } from 'vitest';
import {
	ThemeSlugSchema,
	ThemeCreateSchema,
	ThemeUpdateSchema,
	ThemeCategoryEnum
} from './themes-repository';

describe('ThemeSlugSchema', () => {
	it('accepte les slugs en snake_case minuscule', () => {
		expect(ThemeSlugSchema.safeParse('films_solaires').success).toBe(true);
		expect(ThemeSlugSchema.safeParse('vitrages_haute_performance').success).toBe(true);
		expect(ThemeSlugSchema.safeParse('ia_outils').success).toBe(true);
		expect(ThemeSlugSchema.safeParse('ab').success).toBe(true);
	});

	it('rejette majuscules, tirets, espaces, caractères spéciaux', () => {
		expect(ThemeSlugSchema.safeParse('Films_Solaires').success).toBe(false);
		expect(ThemeSlugSchema.safeParse('films-solaires').success).toBe(false);
		expect(ThemeSlugSchema.safeParse('films solaires').success).toBe(false);
		expect(ThemeSlugSchema.safeParse('films/solaires').success).toBe(false);
		expect(ThemeSlugSchema.safeParse('é_thème').success).toBe(false);
	});

	it('rejette si commence par un chiffre ou un underscore', () => {
		expect(ThemeSlugSchema.safeParse('1_solaire').success).toBe(false);
		expect(ThemeSlugSchema.safeParse('_solaire').success).toBe(false);
	});

	it('rejette trop court (< 2) ou trop long (> 64)', () => {
		expect(ThemeSlugSchema.safeParse('a').success).toBe(false);
		expect(ThemeSlugSchema.safeParse('a' + 'b'.repeat(64)).success).toBe(false);
	});
});

describe('ThemeCategoryEnum', () => {
	it('accepte core et adjacent', () => {
		expect(ThemeCategoryEnum.safeParse('core').success).toBe(true);
		expect(ThemeCategoryEnum.safeParse('adjacent').success).toBe(true);
	});

	it('rejette toute autre valeur', () => {
		expect(ThemeCategoryEnum.safeParse('central').success).toBe(false);
		expect(ThemeCategoryEnum.safeParse('').success).toBe(false);
		expect(ThemeCategoryEnum.safeParse('CORE').success).toBe(false);
	});
});

describe('ThemeCreateSchema', () => {
	const validInput = {
		slug: 'nouveau_theme',
		label: 'Nouveau thème',
		description: 'Description du nouveau thème',
		category: 'core' as const,
		sort_order: 100
	};

	it('accepte un input valide', () => {
		expect(ThemeCreateSchema.safeParse(validInput).success).toBe(true);
	});

	it('accepte active optionnel', () => {
		expect(ThemeCreateSchema.safeParse({ ...validInput, active: false }).success).toBe(true);
	});

	it('rejette label vide ou trop long', () => {
		expect(ThemeCreateSchema.safeParse({ ...validInput, label: '' }).success).toBe(false);
		expect(
			ThemeCreateSchema.safeParse({ ...validInput, label: 'a'.repeat(121) }).success
		).toBe(false);
	});

	it('rejette description vide ou > 500 chars', () => {
		expect(ThemeCreateSchema.safeParse({ ...validInput, description: '' }).success).toBe(false);
		expect(
			ThemeCreateSchema.safeParse({ ...validInput, description: 'x'.repeat(501) }).success
		).toBe(false);
	});

	it('rejette sort_order négatif, > 9999, ou non-entier', () => {
		expect(ThemeCreateSchema.safeParse({ ...validInput, sort_order: -1 }).success).toBe(false);
		expect(ThemeCreateSchema.safeParse({ ...validInput, sort_order: 10000 }).success).toBe(false);
		expect(ThemeCreateSchema.safeParse({ ...validInput, sort_order: 1.5 }).success).toBe(false);
	});

	it('rejette category invalide', () => {
		expect(
			ThemeCreateSchema.safeParse({ ...validInput, category: 'autre' as never }).success
		).toBe(false);
	});
});

describe('ThemeUpdateSchema', () => {
	it('accepte un patch partiel', () => {
		expect(ThemeUpdateSchema.safeParse({ label: 'Nouveau label' }).success).toBe(true);
		expect(ThemeUpdateSchema.safeParse({ active: false }).success).toBe(true);
		expect(ThemeUpdateSchema.safeParse({ sort_order: 50 }).success).toBe(true);
	});

	it('rejette un objet vide', () => {
		expect(ThemeUpdateSchema.safeParse({}).success).toBe(false);
	});

	it('applique les mêmes contraintes que create sur les champs fournis', () => {
		expect(ThemeUpdateSchema.safeParse({ label: '' }).success).toBe(false);
		expect(ThemeUpdateSchema.safeParse({ sort_order: -5 }).success).toBe(false);
		expect(ThemeUpdateSchema.safeParse({ category: 'invalid' }).success).toBe(false);
	});
});
