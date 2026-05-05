import { describe, expect, it } from 'vitest';
import {
	isDeniedSource,
	getDomainTier,
	requiresStrictVerbatim,
	DENYLIST,
	TIER_1_OFFICIAL,
	TIER_7A_INSTALLERS_BENCHMARK
} from './source-allowlist';

describe('isDeniedSource', () => {
	it('reject les domaines W18 identifiés faibles', () => {
		expect(isDeniedSource('leblogfinance.com')).toBe(true);
		expect(isDeniedSource('nextnews.fr')).toBe(true);
		expect(isDeniedSource('projectfork.net')).toBe(true);
		expect(isDeniedSource('zyyne.com')).toBe(true);
		expect(isDeniedSource('coast-smartfilm.com')).toBe(true);
		expect(isDeniedSource('decilab.com')).toBe(true);
	});

	it("distingue vitroconcept.com (denylist FR) de vitroconcept.ch (T7A légitime)", () => {
		expect(isDeniedSource('vitroconcept.com')).toBe(true);
		expect(isDeniedSource('vitroconcept.ch')).toBe(false);
		expect(getDomainTier('vitroconcept.ch')).toBe('T7A');
	});

	it('reject les patterns blogspot/wordpress/medium @user/substack', () => {
		expect(isDeniedSource('toto.blogspot.com')).toBe(true);
		expect(isDeniedSource('mysite.wordpress.com')).toBe(true);
		expect(isDeniedSource('user.medium.com')).toBe(true);
		expect(isDeniedSource('newsletter.substack.com')).toBe(true);
	});

	it('autorise domaines neutres', () => {
		expect(isDeniedSource('rts.ch')).toBe(false);
		expect(isDeniedSource('batiactu.com')).toBe(false);
		expect(isDeniedSource('3m.com')).toBe(false);
	});

	it('normalise www. avant lookup', () => {
		expect(isDeniedSource('www.leblogfinance.com')).toBe(true);
		expect(isDeniedSource('WWW.LEBLOGFINANCE.COM')).toBe(true);
	});
});

describe('getDomainTier', () => {
	it('classe les sources officielles en T1', () => {
		expect(getDomainTier('bafu.admin.ch')).toBe('T1');
		expect(getDomainTier('sia.ch')).toBe('T1');
		expect(getDomainTier('ademe.fr')).toBe('T1');
	});

	it('classe presse pro en T2', () => {
		expect(getDomainTier('batiactu.com')).toBe('T2');
		expect(getDomainTier('espazium.ch')).toBe('T2');
		expect(getDomainTier('glassmagazine.com')).toBe('T2');
	});

	it('classe études marché en T3 (incluant les sources verbatim-strict)', () => {
		expect(getDomainTier('mckinsey.com')).toBe('T3');
		expect(getDomainTier('mordorintelligence.com')).toBe('T3');
		expect(getDomainTier('fortunebusinessinsights.com')).toBe('T3');
	});

	it('classe presse CH en T4', () => {
		expect(getDomainTier('rts.ch')).toBe('T4');
		expect(getDomainTier('letemps.ch')).toBe('T4');
		expect(getDomainTier('nzz.ch')).toBe('T4');
	});

	it('classe tech & innovation en T5', () => {
		expect(getDomainTier('technologyreview.com')).toBe('T5');
		expect(getDomainTier('phys.org')).toBe('T5');
		expect(getDomainTier('epfl.ch')).toBe('T5');
	});

	it('classe concurrents internationaux en T6', () => {
		expect(getDomainTier('3m.com')).toBe('T6');
		expect(getDomainTier('eastman.com')).toBe('T6');
		expect(getDomainTier('saint-gobain.com')).toBe('T6');
	});

	it('classe installateurs benchmark en T7A', () => {
		expect(getDomainTier('jpschweizer.com')).toBe('T7A');
		expect(getDomainTier('vitroconcept.ch')).toBe('T7A');
		expect(getDomainTier('serisolar.com')).toBe('T7A');
	});

	it('classe marques benchmark en T7B', () => {
		expect(getDomainTier('solarscreen.eu')).toBe('T7B');
		expect(getDomainTier('tegofilm.com')).toBe('T7B');
		expect(getDomainTier('swissnanotech.ch')).toBe('T7B');
	});

	it('retourne null pour domaine inconnu', () => {
		expect(getDomainTier('unknown-source.example')).toBeNull();
	});

	it('normalise www. dans le lookup', () => {
		expect(getDomainTier('www.batiactu.com')).toBe('T2');
		expect(getDomainTier('WWW.RTS.CH')).toBe('T4');
	});
});

describe('requiresStrictVerbatim', () => {
	it('flagge les sources d\'hallucination chiffrée connues', () => {
		expect(requiresStrictVerbatim('mordorintelligence.com')).toBe(true);
		expect(requiresStrictVerbatim('fortunebusinessinsights.com')).toBe(true);
		expect(requiresStrictVerbatim('marketsandmarkets.com')).toBe(true);
	});

	it('ne flagge PAS les sources fiables', () => {
		expect(requiresStrictVerbatim('rts.ch')).toBe(false);
		expect(requiresStrictVerbatim('mckinsey.com')).toBe(false);
	});
});

describe('cohérence des tiers (smoke)', () => {
	it('aucun domaine ne doit être à la fois denylist et tier whitelist', () => {
		for (const denied of DENYLIST) {
			expect(getDomainTier(denied), `domain ${denied} ne doit pas être tier whitelist`).toBeNull();
		}
	});

	it('T1 et T7A ne se chevauchent pas', () => {
		for (const t1 of TIER_1_OFFICIAL) {
			expect(TIER_7A_INSTALLERS_BENCHMARK.has(t1)).toBe(false);
		}
	});
});
