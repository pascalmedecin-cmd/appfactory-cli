import { describe, expect, it } from 'vitest';
import {
	isDeniedSource,
	getDomainTier,
	requiresStrictVerbatim,
	isPreprintSource,
	isAdvocacySource,
	domainRegime,
	DENYLIST,
	ADVOCACY_DOMAINS,
	ACADEMIC_PREPRINT_STRICT,
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

	it('aucun domaine advocacy ni preprint n\'est dans la denylist', () => {
		for (const a of ADVOCACY_DOMAINS) expect(isDeniedSource(a)).toBe(false);
		for (const p of ACADEMIC_PREPRINT_STRICT) expect(isDeniedSource(p)).toBe(false);
	});
});

// Cadrage « sources fiables » 2026-06-23 : nouvelles sources, corrections, régime.
describe('cadrage sources fiables 2026-06-23', () => {
	it('ajoute les statistiques officielles en T1 (lacune comblée)', () => {
		expect(getDomainTier('bfs.admin.ch')).toBe('T1');
		expect(getDomainTier('ofs.admin.ch')).toBe('T1');
		expect(getDomainTier('insee.fr')).toBe('T1');
		expect(getDomainTier('destatis.de')).toBe('T1');
	});

	it('ajoute normes/légal/agences/assos films en T1', () => {
		expect(getDomainTier('iso.org')).toBe('T1');
		expect(getDomainTier('fedlex.admin.ch')).toBe('T1');
		expect(getDomainTier('suisseenergie.ch')).toBe('T1');
		expect(getDomainTier('sigab.ch')).toBe('T1');
		expect(getDomainTier('ffpv.org')).toBe('T1');
	});

	it('corrige glass-for-europe.eu (mort) en glassforeurope.com', () => {
		expect(getDomainTier('glassforeurope.com')).toBe('T1');
		expect(getDomainTier('glass-for-europe.eu')).toBeNull();
	});

	it('ajoute presse pro DE/FR en T2 et agence/presse en T4', () => {
		expect(getDomainTier('glaswelt.de')).toBe('T2');
		expect(getDomainTier('baunetzwissen.de')).toBe('T2');
		expect(getDomainTier('keystone-sda.ch')).toBe('T4');
		expect(getDomainTier('watson.ch')).toBe('T4');
		expect(getDomainTier('latribune.fr')).toBe('T4');
	});

	it('ajoute revues/labos en T5', () => {
		expect(getDomainTier('link.springer.com')).toBe('T5');
		expect(getDomainTier('fraunhofer.de')).toBe('T5');
	});

	it('étend STRICT_VERBATIM aux cabinets payants et PR wires', () => {
		expect(requiresStrictVerbatim('grandviewresearch.com')).toBe(true);
		expect(requiresStrictVerbatim('alliedmarketresearch.com')).toBe(true);
		expect(requiresStrictVerbatim('prnewswire.com')).toBe(true);
		expect(requiresStrictVerbatim('snsinsider.com')).toBe(true);
	});

	it('NON exclus mais filtre strict : réseaux sociaux / wikis / UGC (décision Pascal 2026-06-23)', () => {
		// Règle Pascal : une source non « fiable » n'est PAS exclue, elle passe par le
		// filtre anti-hallu (régime strict). Seule la denylist W18 (blogs/spam prouvés) exclut.
		for (const d of ['wikipedia.org', 'reddit.com', 'x.com', 'twitter.com', 'facebook.com', 'linkedin.com', 'quora.com', 'researchgate.net']) {
			expect(isDeniedSource(d), `${d} ne doit PAS être exclu`).toBe(false);
			expect(domainRegime(d), `${d} doit passer par le filtre strict`).toBe('strict');
		}
	});

	it('isPreprintSource : arxiv & co (reste T5 pour le tier, strict pour le régime)', () => {
		expect(isPreprintSource('arxiv.org')).toBe(true);
		expect(isPreprintSource('biorxiv.org')).toBe(true);
		expect(getDomainTier('arxiv.org')).toBe('T5'); // tier inchangé
		expect(isPreprintSource('nature.com')).toBe(false);
	});

	it('isAdvocacySource : assos sectorielles + fédérations industrielles (finding LOW-1)', () => {
		expect(isAdvocacySource('ewfa.org')).toBe(true);
		expect(isAdvocacySource('sfv-asvp.ch')).toBe(true);
		// Fédérations industrielles de T1 désormais traitées advocacy (revue 2026-06-23) :
		expect(isAdvocacySource('gae-eu.org')).toBe(true);
		expect(isAdvocacySource('gimm.eu')).toBe(true);
		expect(isAdvocacySource('eurovent.eu')).toBe(true);
		expect(isAdvocacySource('rts.ch')).toBe(false);
	});

	it('toute fédération industrielle de T1 est aussi en ADVOCACY (invariant garde-fou 2)', () => {
		// gae-eu.org/gimm.eu/eurovent.eu sont en T1 ; ils DOIVENT être en advocacy sinon
		// leurs chiffres de marché passeraient en confiance nue (finding LOW-1).
		for (const fed of ['gae-eu.org', 'gimm.eu', 'eurovent.eu']) {
			expect(getDomainTier(fed)).toBe('T1');
			expect(domainRegime(fed)).toBe('trusted_advocacy');
		}
	});
});

describe('domainRegime (régime de vérification par domaine)', () => {
	it('confiance (trusted) sur T1 officiel/stats, T2, T4, T5 peer-reviewed', () => {
		expect(domainRegime('bafu.admin.ch')).toBe('trusted');
		expect(domainRegime('bfs.admin.ch')).toBe('trusted');
		expect(domainRegime('rts.ch')).toBe('trusted');
		expect(domainRegime('batiactu.com')).toBe('trusted');
		expect(domainRegime('nature.com')).toBe('trusted');
		expect(domainRegime('keystone-sda.ch')).toBe('trusted');
	});

	it('trusted_advocacy sur les associations/lobbies sectoriels', () => {
		expect(domainRegime('ewfa.org')).toBe('trusted_advocacy');
		expect(domainRegime('glassforeurope.com')).toBe('trusted_advocacy');
		expect(domainRegime('ffpv.org')).toBe('trusted_advocacy');
	});

	it('strict sur T3 (cabinets/conseil), T6/T7 (concurrents/installateurs)', () => {
		expect(domainRegime('mckinsey.com')).toBe('strict');
		expect(domainRegime('mordorintelligence.com')).toBe('strict');
		expect(domainRegime('3m.com')).toBe('strict');
		expect(domainRegime('jpschweizer.com')).toBe('strict');
		expect(domainRegime('solarscreen.eu')).toBe('strict');
	});

	it('strict sur preprints malgré l\'appartenance à T5', () => {
		expect(domainRegime('arxiv.org')).toBe('strict');
		expect(domainRegime('biorxiv.org')).toBe('strict');
	});

	it('strict sur STRICT_VERBATIM et PR wires', () => {
		expect(domainRegime('grandviewresearch.com')).toBe('strict');
		expect(domainRegime('prnewswire.com')).toBe('strict');
	});

	it('strict par défaut sur un domaine inconnu (hors whitelist)', () => {
		expect(domainRegime('unknown-source.example')).toBe('strict');
		expect(domainRegime('un-blog-quelconque.fr')).toBe('strict');
	});

	it('strict sur un domaine dénié W18 (ceinture-bretelles)', () => {
		expect(domainRegime('leblogfinance.com')).toBe('strict');
		expect(domainRegime('zyyne.com')).toBe('strict');
	});

	it('normalise www. avant de classer le régime', () => {
		expect(domainRegime('www.rts.ch')).toBe('trusted');
		expect(domainRegime('WWW.MORDORINTELLIGENCE.COM')).toBe('strict');
	});
});
