/**
 * sources-repository : CRUD de la table `veille_sources` (sources de veille
 * éditables). Jumeau de themes-repository pour les sources.
 *
 * Étape 1 du chantier « sources éditables » : le repository et les schémas
 * existent ; le moteur ne lit pas encore la table (il lit source-allowlist.ts).
 * Les étapes suivantes ajoutent le loader (DB + filet) et branchent le pipeline.
 */
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';

export type VeilleSource = Database['public']['Tables']['veille_sources']['Row'];

export const SourceTierEnum = z.enum(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7A', 'T7B']);
export const SourceRegimeEnum = z.enum(['strict', 'trusted', 'trusted_advocacy']);

/** Domaine normalisé : minuscules, sans protocole, sans www., sans path. */
export const HostnameSchema = z
	.string()
	.trim()
	.toLowerCase()
	.min(3)
	.max(253)
	.regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/, 'domaine invalide (ex. exemple.ch)');

/**
 * Extrait le hostname normalisé d'une saisie utilisateur (URL ou domaine nu).
 * « https://www.Exemple.ch/page » -> « exemple.ch ». Lève si vide/illisible.
 * Utilisé par l'action de création (l'UI saisit une URL, on stocke le domaine).
 */
export function normalizeSourceHostname(input: string): string {
	const raw = input.trim();
	if (!raw) throw new Error('URL vide');
	let host = raw;
	try {
		// Ajoute un protocole si absent pour que URL() accepte un domaine nu.
		host = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`).hostname;
	} catch {
		host = raw;
	}
	return host.toLowerCase().replace(/^www\./, '');
}

export const SourceCreateSchema = z.object({
	hostname: HostnameSchema,
	name: z.string().trim().min(1).max(160),
	description: z.string().trim().max(500).default(''),
	tier: SourceTierEnum.nullable().default(null),
	regime: SourceRegimeEnum,
	in_denylist: z.boolean().default(false),
	strict_verbatim: z.boolean().default(false),
	is_advocacy: z.boolean().default(false),
	is_preprint: z.boolean().default(false),
	is_benchmark: z.boolean().default(false),
	is_new: z.boolean().default(false),
	active: z.boolean().optional(),
	sort_order: z.number().int().min(0).max(100000).default(0)
});

export const SourceUpdateSchema = z
	.object({
		name: z.string().trim().min(1).max(160).optional(),
		description: z.string().trim().max(500).optional(),
		tier: SourceTierEnum.nullable().optional(),
		regime: SourceRegimeEnum.optional(),
		in_denylist: z.boolean().optional(),
		strict_verbatim: z.boolean().optional(),
		is_advocacy: z.boolean().optional(),
		is_preprint: z.boolean().optional(),
		is_benchmark: z.boolean().optional(),
		is_new: z.boolean().optional(),
		active: z.boolean().optional(),
		sort_order: z.number().int().min(0).max(100000).optional()
	})
	.refine((obj) => Object.keys(obj).length > 0, { message: 'Au moins un champ doit être fourni' });

export type SourceCreateInput = z.infer<typeof SourceCreateSchema>;
export type SourceUpdateInput = z.infer<typeof SourceUpdateSchema>;

export async function listAllSources(client: SupabaseClient<Database>): Promise<VeilleSource[]> {
	const { data, error } = await client
		.from('veille_sources')
		.select('*')
		.order('sort_order', { ascending: true });
	if (error) throw new Error(`listAllSources: ${error.message}`);
	return data ?? [];
}

export async function listActiveSources(client: SupabaseClient<Database>): Promise<VeilleSource[]> {
	const { data, error } = await client
		.from('veille_sources')
		.select('*')
		.eq('active', true)
		.order('sort_order', { ascending: true });
	if (error) throw new Error(`listActiveSources: ${error.message}`);
	return data ?? [];
}

export async function createSource(
	client: SupabaseClient<Database>,
	input: SourceCreateInput
): Promise<VeilleSource> {
	const { data, error } = await client
		.from('veille_sources')
		.insert({
			hostname: input.hostname,
			name: input.name,
			description: input.description,
			tier: input.tier,
			regime: input.regime,
			in_denylist: input.in_denylist,
			strict_verbatim: input.strict_verbatim,
			is_advocacy: input.is_advocacy,
			is_preprint: input.is_preprint,
			is_benchmark: input.is_benchmark,
			is_new: input.is_new,
			sort_order: input.sort_order,
			...(input.active !== undefined ? { active: input.active } : {})
		})
		.select('*')
		.single();
	if (error) throw new Error(`createSource: ${error.message}`);
	return data;
}

export async function updateSource(
	client: SupabaseClient<Database>,
	id: string,
	input: SourceUpdateInput
): Promise<VeilleSource> {
	const { data, error } = await client
		.from('veille_sources')
		.update(input)
		.eq('id', id)
		.select('*')
		.single();
	if (error) throw new Error(`updateSource: ${error.message}`);
	return data;
}

/**
 * Supprime définitivement une source. Pour un retrait réversible, préférer
 * `updateSource(id, { active: false })` (la source reste dans la liste, en pause).
 */
export async function deleteSource(client: SupabaseClient<Database>, id: string): Promise<void> {
	const { error } = await client.from('veille_sources').delete().eq('id', id);
	if (error) throw new Error(`deleteSource: ${error.message}`);
}
