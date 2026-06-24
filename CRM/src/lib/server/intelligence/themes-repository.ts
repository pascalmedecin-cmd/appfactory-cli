import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';

export type VeilleTheme = Database['public']['Tables']['veille_themes']['Row'];

export const ThemeCategoryEnum = z.enum(['core', 'adjacent']);

export const ThemeSlugSchema = z
	.string()
	.min(2)
	.max(64)
	.regex(/^[a-z][a-z0-9_]*$/, 'slug doit être en snake_case minuscule (a-z, 0-9, _)');

export const ThemeCreateSchema = z.object({
	slug: ThemeSlugSchema,
	label: z.string().min(1).max(120),
	description: z.string().min(1).max(500),
	category: ThemeCategoryEnum,
	sort_order: z.number().int().min(0).max(9999),
	active: z.boolean().optional()
});

export const ThemeUpdateSchema = z
	.object({
		label: z.string().min(1).max(120).optional(),
		description: z.string().min(1).max(500).optional(),
		category: ThemeCategoryEnum.optional(),
		sort_order: z.number().int().min(0).max(9999).optional(),
		active: z.boolean().optional()
	})
	.refine((obj) => Object.keys(obj).length > 0, {
		message: 'Au moins un champ doit être fourni'
	});

export type ThemeCreateInput = z.infer<typeof ThemeCreateSchema>;
export type ThemeUpdateInput = z.infer<typeof ThemeUpdateSchema>;

export async function listAllThemes(client: SupabaseClient<Database>): Promise<VeilleTheme[]> {
	const { data, error } = await client
		.from('veille_themes')
		.select('*')
		.order('sort_order', { ascending: true });
	if (error) throw new Error(`listAllThemes: ${error.message}`);
	return data ?? [];
}

export async function listActiveThemes(client: SupabaseClient<Database>): Promise<VeilleTheme[]> {
	const { data, error } = await client
		.from('veille_themes')
		.select('*')
		.eq('active', true)
		.order('sort_order', { ascending: true });
	if (error) throw new Error(`listActiveThemes: ${error.message}`);
	return data ?? [];
}

export async function createTheme(
	client: SupabaseClient<Database>,
	input: ThemeCreateInput
): Promise<VeilleTheme> {
	const { data, error } = await client
		.from('veille_themes')
		.insert({
			slug: input.slug,
			label: input.label,
			description: input.description,
			category: input.category,
			sort_order: input.sort_order,
			...(input.active !== undefined ? { active: input.active } : {})
		})
		.select('*')
		.single();
	if (error) throw new Error(`createTheme: ${error.message}`);
	return data;
}

export async function updateTheme(
	client: SupabaseClient<Database>,
	id: string,
	input: ThemeUpdateInput
): Promise<VeilleTheme> {
	const { data, error } = await client
		.from('veille_themes')
		.update(input)
		.eq('id', id)
		.select('*')
		.single();
	if (error) throw new Error(`updateTheme: ${error.message}`);
	return data;
}

/**
 * Supprime définitivement un thème de la taxonomie.
 *
 * Sans danger pour l'historique : le champ `theme` des items d'éditions passées
 * est un slug TEXTE LIBRE dans `intelligence_reports.items` (JSONB), sans clé
 * étrangère vers `veille_themes`. Une édition publiée qui référence un thème
 * supprimé reste consultable (l'affichage retombe sur `humanizeSlug`, cf.
 * `veilleFormat.ts::themeLabel`). Pour un retrait réversible, préférer
 * `updateTheme(id, { active: false })`.
 */
export async function deleteTheme(
	client: SupabaseClient<Database>,
	id: string
): Promise<void> {
	const { error } = await client.from('veille_themes').delete().eq('id', id);
	if (error) throw new Error(`deleteTheme: ${error.message}`);
}
