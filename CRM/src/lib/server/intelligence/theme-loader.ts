/**
 * theme-loader : charge la taxonomie thèmes veille depuis la table
 * `veille_themes` (ordonnée par `sort_order`, filtrée `active=true`).
 *
 * Pourquoi : la taxonomie thèmes était hardcoded (S168) dans schema.ts
 * (`ThemeEnum`) et prompt.ts (section "Thèmes à couvrir"). Pour permettre à
 * Pascal d'éditer les thèmes via /veille/themes sans redeploy, on externalise
 * en DB. Ce module est consommé par `run-generation.ts` qui injecte les thèmes
 * actifs dans le prompt LLM et la validation post-Zod.
 *
 * Fallback hardcoded : si la DB est vide (table non créée ou aucun thème
 * actif), on retombe sur la liste S168 pour ne JAMAIS casser le cron.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../database.types';
import type { VeilleTheme } from './themes-repository';

export interface ThemeBundle {
	all: VeilleTheme[];
	core: VeilleTheme[];
	adjacent: VeilleTheme[];
	allowedSlugs: readonly string[];
	source: 'db' | 'fallback';
}

/**
 * Liste de fallback : doit rester alignée avec le seed SQL initial
 * (`20260505_001_veille_themes.sql`). Si la DB est inaccessible ou vide, le
 * cron continue à tourner avec ces thèmes. Slug `autre` toujours dernier.
 */
const FALLBACK_THEMES: VeilleTheme[] = [
	{
		id: '00000000-0000-0000-0000-000000000001',
		slug: 'films_solaires',
		label: 'Films solaires',
		description: 'Performance énergétique vitrage, contrôle solaire, gestion thermique',
		category: 'core',
		active: true,
		sort_order: 10,
		created_at: '2026-05-05T00:00:00Z',
		updated_at: '2026-05-05T00:00:00Z'
	},
	{
		id: '00000000-0000-0000-0000-000000000002',
		slug: 'films_securite',
		label: 'Films sécurité',
		description:
			"Protection effraction, anti-bris, retardateur d'effraction, sécurité passive bâtiment",
		category: 'core',
		active: true,
		sort_order: 20,
		created_at: '2026-05-05T00:00:00Z',
		updated_at: '2026-05-05T00:00:00Z'
	},
	{
		id: '00000000-0000-0000-0000-000000000003',
		slug: 'discretion_smartfilm',
		label: 'Discrétion / smart film',
		description: 'Films opacifiants, PDLC, smart glass commutable, vie privée bureau',
		category: 'core',
		active: true,
		sort_order: 30,
		created_at: '2026-05-05T00:00:00Z',
		updated_at: '2026-05-05T00:00:00Z'
	},
	{
		id: '00000000-0000-0000-0000-000000000004',
		slug: 'batiment_renovation',
		label: 'Bâtiment & rénovation',
		description: 'Rénovation vitrage existant, retrofit, audit thermique, copropriété',
		category: 'core',
		active: true,
		sort_order: 40,
		created_at: '2026-05-05T00:00:00Z',
		updated_at: '2026-05-05T00:00:00Z'
	},
	{
		id: '00000000-0000-0000-0000-000000000005',
		slug: 'reglementation',
		label: 'Réglementation',
		description:
			'Normes EN 410 / 673, MoPEC, RE 2020, DPE, ERP sécurité incendie, certifications HQE/BREEAM/Minergie/LEED',
		category: 'core',
		active: true,
		sort_order: 50,
		created_at: '2026-05-05T00:00:00Z',
		updated_at: '2026-05-05T00:00:00Z'
	},
	{
		id: '00000000-0000-0000-0000-000000000006',
		slug: 'ia_outils',
		label: 'IA & outils',
		description:
			'IA appliquée audit énergétique, drones thermiques, imagerie infrarouge, modélisation bâtiment, BIM, smart glass connecté',
		category: 'adjacent',
		active: true,
		sort_order: 90,
		created_at: '2026-05-05T00:00:00Z',
		updated_at: '2026-05-05T00:00:00Z'
	},
	{
		id: '00000000-0000-0000-0000-000000000007',
		slug: 'autre',
		label: 'Autre',
		description: 'Hors taxonomie principale (signal exploratoire, à reclasser ultérieurement)',
		category: 'adjacent',
		active: true,
		sort_order: 999,
		created_at: '2026-05-05T00:00:00Z',
		updated_at: '2026-05-05T00:00:00Z'
	}
];

/**
 * Retourne un bundle pré-construit avec la liste fallback hardcoded.
 * Utilisé quand le cron doit absolument tourner mais que l'appelant ne fournit
 * pas de bundle (tests, scénario dégradé).
 */
export function getFallbackBundle(): ThemeBundle {
	return buildBundle(FALLBACK_THEMES, 'fallback');
}

export function buildBundle(themes: VeilleTheme[], source: 'db' | 'fallback'): ThemeBundle {
	const sorted = [...themes].sort((a, b) => a.sort_order - b.sort_order);
	const core = sorted.filter((t) => t.category === 'core');
	const adjacent = sorted.filter((t) => t.category === 'adjacent');
	const allowedSlugs = sorted.map((t) => t.slug);
	return { all: sorted, core, adjacent, allowedSlugs, source };
}

/**
 * Charge les thèmes actifs depuis Supabase. Retombe sur le fallback hardcoded
 * si la table est vide, inaccessible, ou si tous les thèmes sont désactivés.
 * Pourquoi le fallback : le cron veille hebdo ne doit JAMAIS rater un run à
 * cause d'une erreur DB côté taxonomie (perte d'une édition entière).
 */
export async function loadThemeBundle(
	client: SupabaseClient<Database>
): Promise<ThemeBundle> {
	try {
		const { data, error } = await client
			.from('veille_themes')
			.select('*')
			.eq('active', true)
			.order('sort_order', { ascending: true });
		if (error) {
			console.warn('[theme-loader] DB error, fallback hardcoded:', error.message);
			return buildBundle(FALLBACK_THEMES, 'fallback');
		}
		if (!data || data.length === 0) {
			console.warn('[theme-loader] DB vide, fallback hardcoded');
			return buildBundle(FALLBACK_THEMES, 'fallback');
		}
		return buildBundle(data as VeilleTheme[], 'db');
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'unknown';
		console.warn('[theme-loader] exception, fallback hardcoded:', msg);
		return buildBundle(FALLBACK_THEMES, 'fallback');
	}
}

/**
 * Construit la section "Thèmes à couvrir" pour le SYSTEM_PROMPT.
 * Format aligné sur l'ancien hardcode de prompt.ts.
 */
export function buildThemesPromptSection(bundle: ThemeBundle): string {
	const coreLines = bundle.core
		.filter((t) => t.slug !== 'autre')
		.map((t) => `- ${t.slug} : ${t.description}`)
		.join('\n');
	const adjacentLines = bundle.adjacent
		.filter((t) => t.slug !== 'autre')
		.map((t) => `- ${t.slug} : ${t.description}`)
		.join('\n');
	const allowed = bundle.allowedSlugs.join(', ');

	const coreBlock = coreLines
		? `Cœur métier (priorité haute) :\n${coreLines}`
		: 'Cœur métier : (aucun thème core actif)';
	const adjacentBlock = adjacentLines
		? `\n\nAdjacents stratégiques (signaux faibles, priorité moyenne) :\n${adjacentLines}`
		: '';

	return `${coreBlock}${adjacentBlock}\n\nReflet dans le champ theme : un parmi ${allowed}.`;
}
