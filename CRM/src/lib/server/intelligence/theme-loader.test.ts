import { describe, it, expect, vi } from 'vitest';
import {
	buildBundle,
	getFallbackBundle,
	buildThemesPromptSection,
	loadThemeBundle
} from './theme-loader';
import type { VeilleTheme } from './themes-repository';
import { buildSystemPrompt, buildReportJsonSchema, SYSTEM_PROMPT_TEMPLATE } from './prompt';

const sampleThemes: VeilleTheme[] = [
	{
		id: '00000000-0000-0000-0000-000000000001',
		slug: 'films_solaires',
		label: 'Films solaires',
		description: 'Performance énergétique vitrage',
		category: 'core',
		active: true,
		sort_order: 10,
		created_at: '2026-05-05T00:00:00Z',
		updated_at: '2026-05-05T00:00:00Z'
	},
	{
		id: '00000000-0000-0000-0000-000000000002',
		slug: 'ia_outils',
		label: 'IA & outils',
		description: 'IA appliquée audit énergétique',
		category: 'adjacent',
		active: true,
		sort_order: 90,
		created_at: '2026-05-05T00:00:00Z',
		updated_at: '2026-05-05T00:00:00Z'
	},
	{
		id: '00000000-0000-0000-0000-000000000003',
		slug: 'autre',
		label: 'Autre',
		description: 'Hors taxonomie',
		category: 'adjacent',
		active: true,
		sort_order: 999,
		created_at: '2026-05-05T00:00:00Z',
		updated_at: '2026-05-05T00:00:00Z'
	}
];

describe('buildBundle', () => {
	it('trie par sort_order et sépare core/adjacent', () => {
		const shuffled = [sampleThemes[2], sampleThemes[0], sampleThemes[1]];
		const bundle = buildBundle(shuffled, 'db');
		expect(bundle.all.map((t) => t.slug)).toEqual(['films_solaires', 'ia_outils', 'autre']);
		expect(bundle.core).toHaveLength(1);
		expect(bundle.core[0].slug).toBe('films_solaires');
		expect(bundle.adjacent).toHaveLength(2);
		expect(bundle.allowedSlugs).toEqual(['films_solaires', 'ia_outils', 'autre']);
		expect(bundle.source).toBe('db');
	});

	it('accepte une liste vide', () => {
		const bundle = buildBundle([], 'db');
		expect(bundle.all).toHaveLength(0);
		expect(bundle.allowedSlugs).toEqual([]);
	});
});

describe('getFallbackBundle', () => {
	it('retourne un bundle non-vide tag fallback', () => {
		const bundle = getFallbackBundle();
		expect(bundle.source).toBe('fallback');
		expect(bundle.allowedSlugs.length).toBeGreaterThanOrEqual(7);
		expect(bundle.allowedSlugs).toContain('films_solaires');
		expect(bundle.allowedSlugs).toContain('autre');
	});

	it('a "autre" en dernier (sort_order 999)', () => {
		const bundle = getFallbackBundle();
		expect(bundle.allowedSlugs[bundle.allowedSlugs.length - 1]).toBe('autre');
	});
});

describe('buildThemesPromptSection', () => {
	it('produit core + adjacent + allowed list', () => {
		const bundle = buildBundle(sampleThemes, 'db');
		const section = buildThemesPromptSection(bundle);
		expect(section).toContain('Cœur métier');
		expect(section).toContain('films_solaires : Performance énergétique vitrage');
		expect(section).toContain('Adjacents stratégiques');
		expect(section).toContain('ia_outils : IA appliquée audit énergétique');
		expect(section).toContain('Reflet dans le champ theme : un parmi films_solaires, ia_outils, autre');
	});

	it('exclut "autre" de l\'affichage core/adjacent (slug toujours en allowed)', () => {
		const bundle = buildBundle(sampleThemes, 'db');
		const section = buildThemesPromptSection(bundle);
		// "autre" ne doit pas apparaître dans la liste core/adjacent
		expect(section).not.toContain('autre : Hors taxonomie');
		// Mais doit apparaître dans la ligne allowed
		expect(section).toContain('films_solaires, ia_outils, autre');
	});

	it('gère le cas core vide', () => {
		const onlyAdjacent: VeilleTheme[] = [sampleThemes[1], sampleThemes[2]];
		const bundle = buildBundle(onlyAdjacent, 'db');
		const section = buildThemesPromptSection(bundle);
		expect(section).toContain('aucun thème core actif');
		expect(section).toContain('Adjacents stratégiques');
	});
});

describe('buildSystemPrompt', () => {
	it('remplace {{themes_section}} et {{sources_section}} par les sections fournies', () => {
		const out = buildSystemPrompt('THEMES_TEST', 'SOURCES_TEST');
		expect(out).toContain('THEMES_TEST');
		expect(out).toContain('SOURCES_TEST');
		expect(out).not.toContain('{{themes_section}}');
		expect(out).not.toContain('{{sources_section}}');
	});

	it('le template contient bien les deux placeholders', () => {
		expect(SYSTEM_PROMPT_TEMPLATE).toContain('{{themes_section}}');
		expect(SYSTEM_PROMPT_TEMPLATE).toContain('{{sources_section}}');
	});
});

describe('buildReportJsonSchema', () => {
	it('injecte enum dynamique sur le champ theme', () => {
		const schema = buildReportJsonSchema(['films_solaires', 'ia_outils']) as {
			properties: { items: { items: { properties: { theme: { enum?: string[] } } } } };
		};
		const themeProp = schema.properties.items.items.properties.theme;
		expect(themeProp.enum).toEqual(['films_solaires', 'ia_outils']);
	});

	it('omet enum si allowedSlugs vide (theme reste string libre)', () => {
		const schema = buildReportJsonSchema([]) as {
			properties: { items: { items: { properties: { theme: { enum?: string[] } } } } };
		};
		expect(schema.properties.items.items.properties.theme.enum).toBeUndefined();
	});

	it('ne mute pas REPORT_JSON_SCHEMA exporté entre appels', () => {
		const a = buildReportJsonSchema(['theme_a']);
		const b = buildReportJsonSchema(['theme_b']);
		const aSchema = a as { properties: { items: { items: { properties: { theme: { enum: string[] } } } } } };
		const bSchema = b as { properties: { items: { items: { properties: { theme: { enum: string[] } } } } } };
		expect(aSchema.properties.items.items.properties.theme.enum).toEqual(['theme_a']);
		expect(bSchema.properties.items.items.properties.theme.enum).toEqual(['theme_b']);
	});
});

describe('loadThemeBundle', () => {
	it('charge les thèmes actifs depuis la DB et marque source=db', async () => {
		const order = vi.fn().mockResolvedValue({ data: sampleThemes, error: null });
		const eq = vi.fn().mockReturnValue({ order });
		const select = vi.fn().mockReturnValue({ eq });
		const from = vi.fn().mockReturnValue({ select });
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const client = { from } as any;
		const bundle = await loadThemeBundle(client);
		expect(bundle.source).toBe('db');
		expect(bundle.allowedSlugs).toEqual(['films_solaires', 'ia_outils', 'autre']);
		expect(from).toHaveBeenCalledWith('veille_themes');
		expect(eq).toHaveBeenCalledWith('active', true);
	});

	it('fallback si DB vide', async () => {
		const order = vi.fn().mockResolvedValue({ data: [], error: null });
		const eq = vi.fn().mockReturnValue({ order });
		const select = vi.fn().mockReturnValue({ eq });
		const from = vi.fn().mockReturnValue({ select });
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const client = { from } as any;
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const bundle = await loadThemeBundle(client);
		expect(bundle.source).toBe('fallback');
		expect(bundle.allowedSlugs.length).toBeGreaterThanOrEqual(7);
		warn.mockRestore();
	});

	it('fallback si DB error', async () => {
		const order = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
		const eq = vi.fn().mockReturnValue({ order });
		const select = vi.fn().mockReturnValue({ eq });
		const from = vi.fn().mockReturnValue({ select });
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const client = { from } as any;
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const bundle = await loadThemeBundle(client);
		expect(bundle.source).toBe('fallback');
		warn.mockRestore();
	});

	it('fallback si exception inattendue', async () => {
		const from = vi.fn().mockImplementation(() => {
			throw new Error('explosion');
		});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const client = { from } as any;
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const bundle = await loadThemeBundle(client);
		expect(bundle.source).toBe('fallback');
		warn.mockRestore();
	});
});
