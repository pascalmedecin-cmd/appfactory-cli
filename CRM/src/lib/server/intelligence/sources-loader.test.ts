import { describe, it, expect, vi } from 'vitest';
import {
	buildSourcesBundle,
	buildSourcesPromptSection,
	getFallbackSourcesBundle,
	loadSourcesBundle,
	type SourceClassification
} from './sources-loader';
import { SOURCES_SEED, type SourceSeedRow } from './sources-seed';
import type { VeilleSource } from './sources-repository';
import {
	getDomainTier,
	domainRegime,
	isDeniedSource,
	requiresStrictVerbatim,
	isAdvocacySource,
	isPreprintSource,
	regimeFromClassification,
	SOURCE_TIERS
} from './source-allowlist';

// GARDE-FOU anti-régression de l'étape 2 du chantier « sources éditables » :
// le CLASSIFIEUR alimenté par la table (ou son filet seed) DOIT reproduire à
// l'identique les fonctions de source-allowlist.ts. Si la politique de régime
// (regimeFromClassification) ou le mapping table→classification dérive, ce test
// casse. Déterministe, zéro réseau, zéro clé API (mandat Pascal).

function seedToClassification(r: SourceSeedRow): SourceClassification {
	return {
		hostname: r.hostname,
		tier: r.tier,
		in_denylist: r.in_denylist,
		strict_verbatim: r.strict_verbatim,
		is_advocacy: r.is_advocacy,
		is_preprint: r.is_preprint
	};
}

function seedToDbRow(r: SourceSeedRow, i: number): VeilleSource {
	return {
		id: `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`,
		hostname: r.hostname,
		name: r.name,
		description: r.description,
		tier: r.tier,
		regime: r.regime,
		in_denylist: r.in_denylist,
		strict_verbatim: r.strict_verbatim,
		is_advocacy: r.is_advocacy,
		is_preprint: r.is_preprint,
		is_benchmark: r.is_benchmark,
		is_new: r.is_new,
		active: true,
		sort_order: r.sort_order,
		created_at: '2026-06-24T00:00:00Z',
		updated_at: '2026-06-24T00:00:00Z'
	};
}

// Réutilisable : vérifie que toutes les sorties du bundle == fonctions code pour un host.
function expectBundleMatchesCode(
	bundle: ReturnType<typeof buildSourcesBundle>,
	host: string
) {
	expect([host, 'tier', bundle.tierOf(host)]).toEqual([host, 'tier', getDomainTier(host)]);
	expect([host, 'regime', bundle.regimeOf(host)]).toEqual([host, 'regime', domainRegime(host)]);
	expect([host, 'denied', bundle.isDenied(host)]).toEqual([host, 'denied', isDeniedSource(host)]);
	expect([host, 'verbatim', bundle.requiresStrictVerbatim(host)]).toEqual([
		host,
		'verbatim',
		requiresStrictVerbatim(host)
	]);
	expect([host, 'advocacy', bundle.isAdvocacy(host)]).toEqual([
		host,
		'advocacy',
		isAdvocacySource(host)
	]);
	expect([host, 'preprint', bundle.isPreprint(host)]).toEqual([
		host,
		'preprint',
		isPreprintSource(host)
	]);
}

describe('buildSourcesBundle : équivalence classifieur ↔ source-allowlist (zéro régression)', () => {
	it('depuis le seed (classifications) : chaque domaine reproduit le code', () => {
		const bundle = buildSourcesBundle(SOURCES_SEED.map(seedToClassification), 'fallback');
		for (const r of SOURCES_SEED) expectBundleMatchesCode(bundle, r.hostname);
	});

	it('depuis des rows DB (shape VeilleSource) : chaque domaine reproduit le code', () => {
		const rows = SOURCES_SEED.map(seedToDbRow);
		// toClassification est interne ; on reconstruit la classification depuis la row.
		const bundle = buildSourcesBundle(
			rows.map((r) => ({
				hostname: r.hostname,
				tier: r.tier as SourceClassification['tier'],
				in_denylist: r.in_denylist,
				strict_verbatim: r.strict_verbatim,
				is_advocacy: r.is_advocacy,
				is_preprint: r.is_preprint
			})),
			'db'
		);
		expect(bundle.source).toBe('db');
		for (const r of SOURCES_SEED) expectBundleMatchesCode(bundle, r.hostname);
	});

	it('la colonne `regime`/`tier` stockée est un cache fidèle (== dérivation)', () => {
		const bundle = buildSourcesBundle(SOURCES_SEED.map(seedToClassification), 'fallback');
		for (const r of SOURCES_SEED) {
			// La colonne stockée doit coïncider avec le runtime dérivé ET avec le code.
			expect([r.hostname, r.regime]).toEqual([r.hostname, bundle.regimeOf(r.hostname)]);
			expect([r.hostname, r.tier]).toEqual([r.hostname, bundle.tierOf(r.hostname)]);
		}
	});
});

describe('buildSourcesBundle : domaines inconnus, patterns, normalisation', () => {
	const bundle = buildSourcesBundle(SOURCES_SEED.map(seedToClassification), 'fallback');

	it('domaine inconnu (hors table) → tier null, régime strict, comme le code', () => {
		for (const host of ['exemple-inconnu.xyz', 'random-blog.io', 'pas-une-source.tld']) {
			expectBundleMatchesCode(bundle, host);
			expect(bundle.tierOf(host)).toBeNull();
			expect(bundle.regimeOf(host)).toBe('strict');
			expect(bundle.isDenied(host)).toBe(false);
		}
	});

	it('patterns anti-spam (blogspot/wordpress/medium/substack) → déniés comme le code', () => {
		for (const host of [
			'monblog.blogspot.com',
			'truc.wordpress.com',
			'auteur.medium.com',
			'auteur.substack.com'
		]) {
			expect(bundle.isDenied(host)).toBe(true);
			expect(isDeniedSource(host)).toBe(true);
			expect(bundle.regimeOf(host)).toBe('strict');
			expectBundleMatchesCode(bundle, host);
		}
	});

	it('medium.com / wordpress nus (sans sous-domaine) ne matchent PAS le pattern', () => {
		// `^[^.]+\.medium\.com$` exige un sous-domaine → medium.com pur n'est pas dénié.
		expect(bundle.isDenied('medium.com')).toBe(isDeniedSource('medium.com'));
		expect(bundle.isDenied('medium.com')).toBe(false);
	});

	it('normalise www. et la casse (même verdict)', () => {
		const known = SOURCES_SEED.find((r) => r.tier === 'T1')!.hostname;
		expect(bundle.tierOf(`www.${known}`)).toBe(bundle.tierOf(known));
		expect(bundle.tierOf(known.toUpperCase())).toBe(bundle.tierOf(known));
		expect(bundle.regimeOf(`WWW.${known.toUpperCase()}`)).toBe(bundle.regimeOf(known));
	});

	it('un domaine en denylist (seed) est dénié et strict', () => {
		const denied = SOURCES_SEED.find((r) => r.in_denylist)!;
		expect(bundle.isDenied(denied.hostname)).toBe(true);
		expect(bundle.regimeOf(denied.hostname)).toBe('strict');
	});

	it('une source désactivée (absente du bundle) retombe en inconnu → strict', () => {
		const known = SOURCES_SEED.find((r) => r.tier === 'T2')!; // presse pro = trusted normalement
		expect(bundle.regimeOf(known.hostname)).toBe('trusted');
		// Bundle SANS cette source = comportement « en pause » (décoché) → inconnu → strict.
		const without = buildSourcesBundle(
			SOURCES_SEED.filter((r) => r.hostname !== known.hostname).map(seedToClassification),
			'fallback'
		);
		expect(without.tierOf(known.hostname)).toBeNull();
		expect(without.regimeOf(known.hostname)).toBe('strict');
	});
});

describe('fail-safe tier invalide (défense en profondeur anti-hallu)', () => {
	// Donnée DB éditable : un tier hors-enum ('T9', vide, casse) ne doit JAMAIS
	// faire monter une source en confiance. Règle d'or 2026-06-23 : dans le doute, strict.

	it('regimeFromClassification : un tier inconnu retombe en strict, pas trusted (filet politique)', () => {
		const base = { denied: false, strictVerbatim: false, preprint: false, advocacy: false };
		// Cast volontaire d'une valeur hors-enum (simule une classification corrompue).
		expect(regimeFromClassification({ ...base, tier: 'T9' as never })).toBe('strict');
		expect(regimeFromClassification({ ...base, tier: '' as never })).toBe('strict');
		expect(regimeFromClassification({ ...base, tier: 't1' as never })).toBe('strict');
		// Sanity : un tier valide fiable reste bien trusted.
		expect(regimeFromClassification({ ...base, tier: 'T2' })).toBe('trusted');
	});

	it('buildSourcesBundle : tier hors-enum dans une classification → regimeOf strict (filet politique)', () => {
		const bundle = buildSourcesBundle(
			[
				{
					hostname: 'corrompu.example',
					tier: 'T9' as never,
					in_denylist: false,
					strict_verbatim: false,
					is_advocacy: false,
					is_preprint: false
				}
			],
			'db'
		);
		expect(bundle.regimeOf('corrompu.example')).toBe('strict');
	});

	it('loadSourcesBundle : une row DB avec tier invalide → tierOf null ET regimeOf strict (frontière)', async () => {
		const badRow: VeilleSource = { ...seedToDbRow(SOURCES_SEED[0], 0), hostname: 'corrompu.example', tier: 'T9' };
		const order = vi.fn().mockResolvedValue({ data: [badRow], error: null });
		const eq = vi.fn().mockReturnValue({ order });
		const select = vi.fn().mockReturnValue({ eq });
		const from = vi.fn().mockReturnValue({ select });
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const bundle = await loadSourcesBundle({ from } as any);
		expect(bundle.source).toBe('db');
		// La validation au franchissement de frontière (toClassification) annule le tier...
		expect(bundle.tierOf('corrompu.example')).toBeNull();
		// ...et le régime retombe en strict (fail-safe), pas en confiance.
		expect(bundle.regimeOf('corrompu.example')).toBe('strict');
		warn.mockRestore();
	});
});

describe('getFallbackSourcesBundle', () => {
	it('source=fallback et couvre tous les domaines du seed', () => {
		const bundle = getFallbackSourcesBundle();
		expect(bundle.source).toBe('fallback');
		expect(bundle.byDomain.size).toBe(SOURCES_SEED.length);
		for (const r of SOURCES_SEED) expect(bundle.byDomain.has(r.hostname)).toBe(true);
	});

	it('reproduit le code sur tout le seed', () => {
		const bundle = getFallbackSourcesBundle();
		for (const r of SOURCES_SEED) expectBundleMatchesCode(bundle, r.hostname);
	});
});

describe('loadSourcesBundle (résilience, miroir de theme-loader)', () => {
	function mockClient(resolved: { data: unknown; error: unknown }) {
		const order = vi.fn().mockResolvedValue(resolved);
		const eq = vi.fn().mockReturnValue({ order });
		const select = vi.fn().mockReturnValue({ eq });
		const from = vi.fn().mockReturnValue({ select });
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return { client: { from } as any, from, select, eq, order };
	}

	it('charge depuis la DB et marque source=db', async () => {
		const rows = SOURCES_SEED.map(seedToDbRow);
		const { client, from, eq } = mockClient({ data: rows, error: null });
		const bundle = await loadSourcesBundle(client);
		expect(bundle.source).toBe('db');
		expect(from).toHaveBeenCalledWith('veille_sources');
		expect(eq).toHaveBeenCalledWith('active', true);
		// Et la classification DB == code.
		for (const r of SOURCES_SEED) expectBundleMatchesCode(bundle, r.hostname);
	});

	it('fallback si DB vide', async () => {
		const { client } = mockClient({ data: [], error: null });
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const bundle = await loadSourcesBundle(client);
		expect(bundle.source).toBe('fallback');
		expect(bundle.byDomain.size).toBe(SOURCES_SEED.length);
		warn.mockRestore();
	});

	it('fallback si DB error', async () => {
		const { client } = mockClient({ data: null, error: { message: 'boom' } });
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const bundle = await loadSourcesBundle(client);
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
		const bundle = await loadSourcesBundle(client);
		expect(bundle.source).toBe('fallback');
		warn.mockRestore();
	});
});

// ÉTAPE 4 du chantier « sources éditables » : la section « Sources autorisées
// (7 tiers) » du prompt n'est plus en dur — elle est régénérée depuis le bundle.
// Ces tests prouvent l'ÉQUIVALENCE (chaque domaine sous le bon tier, denylist
// complète, règles éditoriales préservées) + le déterminisme. Zéro réseau, zéro clé.
describe('buildSourcesPromptSection : section prompt « Sources autorisées » depuis le bundle (étape 4)', () => {
	const bundle = getFallbackSourcesBundle();
	const section = buildSourcesPromptSection(bundle);

	/** Découpe la portion tiers (avant la denylist) en blocs indexés par tier. */
	function tierBlocks(s: string): Map<string, string> {
		const tierPortion = s.split('\n\n# Denylist')[0];
		const map = new Map<string, string>();
		for (const b of tierPortion.split('\n\n')) {
			const m = b.match(/^\*\*(T\d[AB]?) - /);
			if (m) map.set(m[1], b);
		}
		return map;
	}
	/** Domaines listés dans un bloc tier (ligne 2 = la liste). */
	function domainsOf(block: string): string[] {
		const line = block.split('\n')[1];
		return line === '(aucune source active)' ? [] : line.split(', ');
	}

	it('a exactement un bloc par tier T1..T7B avec son libellé', () => {
		const blocks = tierBlocks(section);
		for (const t of SOURCE_TIERS) expect(blocks.has(t)).toBe(true);
		expect(blocks.size).toBe(SOURCE_TIERS.length);
	});

	it('chaque domaine à tier T_x (non denylist) figure SOUS le bloc T_x, trié, et eux seuls', () => {
		const blocks = tierBlocks(section);
		for (const t of SOURCE_TIERS) {
			const expected = [...bundle.byDomain.values()]
				.filter((c) => c.tier === t && !c.in_denylist)
				.map((c) => c.hostname)
				.sort();
			expect([t, domainsOf(blocks.get(t)!)]).toEqual([t, expected]);
		}
	});

	it('aucun domaine en denylist ne fuit dans une section tier', () => {
		const blocks = tierBlocks(section);
		const tierDomains = new Set([...blocks.values()].flatMap(domainsOf));
		for (const c of bundle.byDomain.values()) {
			if (c.in_denylist) expect(tierDomains.has(c.hostname)).toBe(false);
		}
	});

	it('liste TOUS les domaines denylist (et eux seuls) dans la section denylist', () => {
		const deniedExpected = [...bundle.byDomain.values()]
			.filter((c) => c.in_denylist)
			.map((c) => c.hostname)
			.sort();
		expect(deniedExpected.length).toBeGreaterThan(0);
		const denyLines = section.slice(section.indexOf('# Denylist hard')).split('\n');
		const idx = denyLines.findIndex((l) => l.startsWith('**Sources INTERDITES**'));
		expect(denyLines[idx + 1].split(', ').sort()).toEqual(deniedExpected);
	});

	it('les domaines tier=null non-denylist (PR-wires, preprints) ne sont PAS whitelistés', () => {
		const blocks = tierBlocks(section);
		const allTierDomains = [...blocks.values()].flatMap(domainsOf);
		// globenewswire est NOMMÉ dans la prose ALERTE mais jamais dans une liste tier.
		for (const host of ['prnewswire.com', 'biorxiv.org', 'globenewswire.com']) {
			expect(allTierDomains).not.toContain(host);
		}
	});

	it('préserve les règles éditoriales (politique en code, pas en base)', () => {
		expect(section).toContain('RESPECTER STRICTEMENT');
		expect(section).toContain('ALERTE VERBATIM STRICT');
		expect(section).toContain('mordorintelligence.com'); // nommé dans la règle T3
		expect(section).toContain('NOTE PAYWALL');
		expect(section).toContain('FRANCE VOISINE');
		expect(section).toContain('ledauphine.com'); // nommé dans la règle T4
		expect(section).toContain('RÈGLE T7A');
		expect(section).toContain('RÈGLE T7B');
		expect(section).toContain('Patterns bannis : *.blogspot.com');
		expect(section).toContain('# Hors whitelist');
	});

	it('ne contient aucun tiret cadratin (conformité typo FR)', () => {
		expect(section).not.toContain('—');
	});

	it('est déterministe (tri alpha stable, 2 appels identiques)', () => {
		expect(buildSourcesPromptSection(getFallbackSourcesBundle())).toBe(section);
		for (const [, b] of tierBlocks(section)) {
			const d = domainsOf(b);
			expect(d).toEqual([...d].sort());
		}
	});

	it('anti-régression : domaines critiques présents sous le bon tier, dérive corrigée', () => {
		const blocks = tierBlocks(section);
		expect(domainsOf(blocks.get('T1')!)).toContain('bafu.admin.ch');
		// Corrige la dérive code↔prompt : l'ancien prompt listait glass-for-europe.eu (mort).
		expect(domainsOf(blocks.get('T1')!)).toContain('glassforeurope.com');
		expect(section).not.toContain('glass-for-europe.eu');
		// Sources romandes/cantonales + frontalières ajoutées (W26).
		expect(domainsOf(blocks.get('T4')!)).toContain('lenouvelliste.ch');
		expect(domainsOf(blocks.get('T4')!)).toContain('ledauphine.com');
	});

	it('bundle vide → section bien formée, tous les tiers en « (aucune source active) »', () => {
		const s = buildSourcesPromptSection(buildSourcesBundle([], 'fallback'));
		expect(s).toContain('(aucune source active)');
		expect(s).toContain('# Hors whitelist');
		for (const t of SOURCE_TIERS) expect(s).toContain(`**${t} - `);
	});
});
