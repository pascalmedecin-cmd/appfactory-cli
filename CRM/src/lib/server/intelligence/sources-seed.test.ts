import { describe, it, expect } from 'vitest';
import { SOURCES_SEED } from './sources-seed';
import {
	getDomainTier,
	domainRegime,
	isDeniedSource,
	requiresStrictVerbatim,
	isAdvocacySource,
	isPreprintSource,
	TIER_1_OFFICIAL,
	TIER_2_TRADE_PRO,
	TIER_3_MARKET_RESEARCH,
	TIER_4_PRESS_GENERAL,
	TIER_5_TECH_INNOVATION,
	TIER_6_COMPETITORS_INTERNATIONAL,
	TIER_7A_INSTALLERS_BENCHMARK,
	TIER_7B_BRANDS_BENCHMARK,
	DENYLIST,
	STRICT_VERBATIM_DOMAINS,
	ACADEMIC_PREPRINT_STRICT,
	ADVOCACY_DOMAINS
} from './source-allowlist';

// Ce test est le GARDE-FOU anti-régression du chantier « sources éditables » :
// le seed (sources-seed.ts + migration SQL jumelle) DOIT reproduire à l'identique
// la classification de source-allowlist.ts. Si quelqu'un édite les Sets sans
// régénérer (npx tsx scripts/gen-veille-sources-seed.ts), ce test casse.

const ALL_SETS = [
	TIER_1_OFFICIAL,
	TIER_2_TRADE_PRO,
	TIER_3_MARKET_RESEARCH,
	TIER_4_PRESS_GENERAL,
	TIER_5_TECH_INNOVATION,
	TIER_6_COMPETITORS_INTERNATIONAL,
	TIER_7A_INSTALLERS_BENCHMARK,
	TIER_7B_BRANDS_BENCHMARK,
	DENYLIST,
	STRICT_VERBATIM_DOMAINS,
	ACADEMIC_PREPRINT_STRICT,
	ADVOCACY_DOMAINS
];

describe('sources-seed : équivalence avec source-allowlist (zéro régression)', () => {
	it('chaque ligne reproduit exactement la classification du code', () => {
		for (const r of SOURCES_SEED) {
			expect([r.hostname, 'tier', r.tier]).toEqual([r.hostname, 'tier', getDomainTier(r.hostname)]);
			expect([r.hostname, 'regime', r.regime]).toEqual([
				r.hostname,
				'regime',
				domainRegime(r.hostname)
			]);
			expect([r.hostname, 'denylist', r.in_denylist]).toEqual([
				r.hostname,
				'denylist',
				isDeniedSource(r.hostname)
			]);
			expect([r.hostname, 'verbatim', r.strict_verbatim]).toEqual([
				r.hostname,
				'verbatim',
				requiresStrictVerbatim(r.hostname)
			]);
			expect([r.hostname, 'advocacy', r.is_advocacy]).toEqual([
				r.hostname,
				'advocacy',
				isAdvocacySource(r.hostname)
			]);
			expect([r.hostname, 'preprint', r.is_preprint]).toEqual([
				r.hostname,
				'preprint',
				isPreprintSource(r.hostname)
			]);
		}
	});

	it('couvre tous les domaines connus du moteur (aucun oubli)', () => {
		const union = new Set<string>();
		for (const s of ALL_SETS) for (const d of s) union.add(d);
		const seeded = new Set(SOURCES_SEED.map((r) => r.hostname));
		for (const d of union) expect(seeded.has(d), `seed manque ${d}`).toBe(true);
		expect(SOURCES_SEED.length).toBe(union.size);
	});

	it('hostnames uniques, minuscules, sans www.', () => {
		const seen = new Set<string>();
		for (const r of SOURCES_SEED) {
			expect(seen.has(r.hostname), `doublon ${r.hostname}`).toBe(false);
			seen.add(r.hostname);
			expect(r.hostname).toBe(r.hostname.toLowerCase());
			expect(r.hostname.startsWith('www.')).toBe(false);
		}
	});

	it('chaque source a un nom non vide', () => {
		for (const r of SOURCES_SEED) expect(r.name.length, r.hostname).toBeGreaterThan(0);
	});
});
