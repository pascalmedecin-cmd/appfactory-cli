// Whitelist 7 tiers + denylist hard pour la veille FilmPro (2026-05-05).
//
// Origine : audit W18 a publié 6 items dont 5 portaient au moins une dette
// (chiffres hallucinés Mordor, paywall 24heures, blogs marketing comme
// fortunebusinessinsights/sun-shield/vitroconcept.com). Le LLM, sans cadre
// strict des sources, dérive vers des blogs marketing et des sites IT non-
// référentiels (zyyne, projectfork, nextnews, leblogfinance, coast-smartfilm).
//
// 7 tiers de sources autorisées + denylist hard. Le pipeline filtre
// les items dont le domaine est dans la denylist. Les items hors whitelist
// mais hors denylist sont autorisés (log warning seulement) — la whitelist
// est informative au début, le temps que la deep research la complète.
//
// Cette liste est appelée à grossir : Pascal a lancé une deep research Google
// en parallèle pour cartographier exhaustivement les sources sectorielles.
// Quand le JSON revient, l'enrichissement est mécanique (ajout dans les Sets).

export type SourceTier = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7A' | 'T7B';

/**
 * T1 — Sources officielles : régulation, normes, agences publiques.
 * Crédibilité : haute. Usage : autorité chiffrée, citations réglementaires.
 */
export const TIER_1_OFFICIAL = new Set([
	// Suisse
	'bafu.admin.ch',
	'bfe.admin.ch',
	'are.admin.ch',
	'fedpol.admin.ch',
	'sia.ch',
	'snv.ch',
	'minergie.ch',
	'ofl.admin.ch',
	// France
	'ademe.fr',
	'cstb.fr',
	'afnor.org',
	'effinergie.org',
	'operat.ademe.fr',
	'ecologie.gouv.fr',
	'legifrance.gouv.fr',
	'anr.fr',
	// Belgique / Luxembourg
	'environnement.brussels',
	'guichet.public.lu',
	// UE / international
	'commission.europa.eu',
	'cordis.europa.eu',
	'din.de',
	'glass-for-europe.eu',
	'gae-eu.org',
	'gimm.eu',
	'eurovent.eu',
	'iea.org',
	'irena.org',
	// Associations professionnelles dédiées films vitrage
	'ewfa.org', // European Window Film Association
	'iwfa.com' // International Window Film Association
]);

/**
 * T2 — Presse professionnelle bâtiment / vitrage.
 * Crédibilité : haute. Usage : actualités sectorielles, études de cas.
 */
export const TIER_2_TRADE_PRO = new Set([
	// Suisse
	'espazium.ch',
	'constructo.ch',
	'bauen-wohnen.ch',
	'hochparterre.ch',
	'baublatt.ch',
	// France
	'batiactu.com',
	'lemoniteur.fr',
	'cahiers-techniques-batiment.fr',
	'amc-archi.com',
	'architectes.org',
	'verre-et-protections.com',
	'verreetprotections.com',
	// International
	'detail.de',
	'glassonweb.com',
	'glassmagazine.com',
	'usglassmag.com',
	'windowfilmmag.com', // Window Film Magazine (seul titre dédié industrie)
	'archdaily.com',
	'archdaily.fr',
	'build-up.eu',
	'glass-international.com'
]);

/**
 * T3 — Études de marché et cabinets d'analyse.
 * Crédibilité : haute. Usage : chiffres marché, baromètres ESG/immobilier.
 *
 * NOTE : mordorintelligence.com et fortunebusinessinsights.com sont
 * AUTORISÉS mais leur usage est conditionné au cross-check verbatim
 * (sources d'hallucination chiffrée identifiées W18 : Mordor item 5
 * 5 chiffres décalés, Fortune drift temporel 2019→2025).
 */
export const TIER_3_MARKET_RESEARCH = new Set([
	'mckinsey.com',
	'rolandberger.com',
	'jll.ch',
	'jll.com',
	'cbre.ch',
	'cbre.com',
	'mediaassets.cbre.com',
	'bnpparibas-realestate.com',
	'cushmanwakefield.com',
	'savills.com',
	'deloitte.com',
	'pwc.com',
	'ey.com',
	'wbdg.org', // Whole Building Design Guide
	'mordorintelligence.com', // alerte verbatim
	'fortunebusinessinsights.com', // alerte verbatim
	'snsinsider.com' // cabinet analyse, alerte verbatim
]);

/**
 * T4 — Presse généraliste qualité (CH romande, alémanique, France).
 * Crédibilité : haute. Usage : signaux marché, opinions tribunes.
 *
 * NOTE : 24heures.ch / tdg.ch / lematin.ch / letemps.ch / lemonde.fr ont
 * un paywall hard, déjà détecté par url-verify.ts (PAYWALL_DOMAINS).
 */
export const TIER_4_PRESS_GENERAL = new Set([
	// Suisse romande
	'rts.ch',
	'letemps.ch',
	'24heures.ch',
	'tdg.ch',
	'lematin.ch',
	'bilan.ch',
	'agefi.com',
	'heidi.news',
	// Suisse alémanique
	'srf.ch',
	'swissinfo.ch',
	'ats.ch',
	'nzz.ch',
	'tagesanzeiger.ch',
	'handelszeitung.ch',
	'bilanz.ch',
	'cash.ch',
	'schweizerbauer.ch',
	// France
	'lemonde.fr',
	'lesechos.fr',
	'lefigaro.fr',
	'capital.fr',
	'challenges.fr'
]);

/**
 * T5 — Tech & innovation : R&D, brevets, recherche académique.
 * Crédibilité : haute. Usage : signaux faibles innovation matériau, brevets.
 */
export const TIER_5_TECH_INNOVATION = new Set([
	'technologyreview.com',
	'phys.org',
	'ieee.org',
	'spectrum.ieee.org',
	'nature.com',
	'sciencedirect.com',
	'sciencemag.org',
	'arxiv.org',
	'espacenet.com',
	'wipo.int',
	'patents.google.com',
	'uspto.gov',
	// Académique CH/FR
	'empa.ch',
	'epfl.ch',
	'memento.epfl.ch',
	'ethz.ch',
	'heia-fr.ch',
	'zhaw.ch',
	'pagora.grenoble-inp.fr', // Grenoble INP Pagora électronique imprimée
	'grenoble-inp.fr'
]);

/**
 * T6 — Sites officiels concurrents internationaux films/smart glass.
 * Crédibilité : haute pour signal compétitif (lancement produit, tech),
 * moyenne pour chiffres marché (biais marketing).
 */
export const TIER_6_COMPETITORS_INTERNATIONAL = new Set([
	'3m.com',
	'3msuisse.ch',
	'eastman.com',
	'llumar.com',
	'vista-films.com',
	'suntek.com',
	'averydennison.com',
	'madico.com',
	'solargard.com',
	'view.com',
	'sageglass.com',
	'halio.com',
	'kinestral.com',
	'saint-gobain.com',
	'saint-gobain-glass.com',
	'guardianglass.com',
	'hueck.com',
	'schueco.com',
	'vitro.com',
	'pilkington.com',
	'agc.com',
	'agc-glass.eu',
	'nsg.com',
	'riouglass.com' // Riou Glass FR (consolidation NSG/Apollo cf. doc deep research)
]);

/**
 * T7A — Installateurs concurrents directs FilmPro (CH/FR/IT/BE).
 * Crédibilité : moyenne (sites pro mais biais marketing). Usage : signal
 * compétitif EXPLICITE (« X concurrent lance Y », « Z installateur référence
 * sur chantier W »). JAMAIS source neutre pour chiffres marché.
 */
export const TIER_7A_INSTALLERS_BENCHMARK = new Set([
	// Suisse romande
	'jpschweizer.com',
	'solar-comfort.com',
	'vitroconcept.ch',
	'glaslook.ch',
	'noovum.ch',
	'a-film.ch',
	'glas-pro-tect.ch', // Glas Pro'tect CH (deep research)
	'seecret.ch', // Seecret Films CH (deep research)
	'vitrocsa.com', // systèmes vitrés architecte minimaliste CH (deep research)
	// France
	'dexypro.fr',
	'solisconcept.com',
	'storesdefrance.com',
	'protectio-france.com', // (deep research)
	'siacofrance.com', // SIAC France réseau poseurs (deep research)
	'le-portail-du-film-pour-vitrages.com', // portail FR films vitrages
	// Belgique
	'lisaenergie.be', // (deep research BE)
	'vectura.be', // (deep research BE)
	// Italie
	'serisolar.com',
	'solarisfilms.it',
	'italfilm.it',
	'glassfilm.it',
	'pellicolerisparmioenergetico.it', // blog poseur IT
	// Luxembourg
	'solarfilmprotect.com', // (deep research LU)
	// Multi-pays / Europe
	'carlikefilm.com', // (deep research EU)
	// USA (référence info industrie, peu prospectable)
	'windowfilmdepot.com'
]);

/**
 * T7B — Fabricants/marques solutions architecture/bâtiment.
 * Crédibilité : moyenne-haute pour signal compétitif. Usage : bench specs
 * produits, normes, certifications, R&D matériaux.
 */
export const TIER_7B_BRANDS_BENCHMARK = new Set([
	'solarscreen.eu',
	'tegofilm.com',
	'swissnanotech.ch',
	'reflectiv.com',
	'hanitacoatings.com',
	'gauzy.com'
]);

/**
 * Denylist hard : reject avant verify. Sources identifiées comme :
 * - blogs personnels / SaaS marketing déguisés
 * - agrégateurs SEO sans rédaction propre
 * - sources d'hallucination identifiées dans les audits W18 et antérieurs
 *
 * Distinction explicite : `vitroconcept.com` (FR, marketing) ≠
 * `vitroconcept.ch` (CH romande, T7A légitime).
 */
export const DENYLIST = new Set([
	// Identifiés W18 audit 2026-05-05
	'leblogfinance.com',
	'nextnews.fr',
	'projectfork.net',
	'zyyne.com',
	'coast-smartfilm.com',
	'epx-informatique.com',
	'sun-shield.fr',
	'vitroconcept.com', // FR marketing, distinct du .ch légitime
	'decilab.com',
	// Agrégateurs SEO low-effort
	'wikiwand.com',
	'wikipedia-mirror.com',
	'newsbreak.com',
	'pressreleasetoday.com',
	// Agrégateurs PR low-quality (identifiés via deep research 2026-05-05)
	'openpr.com',
	'pr.com',
	'img.pr.com'
]);

/**
 * Patterns denylist : préfixes de path / hostnames bannis.
 */
const DENYLIST_HOSTNAME_PATTERNS = [
	/\.blogspot\./,
	/\.wordpress\.com$/,
	/^[^.]+\.medium\.com$/, // medium.com/@user → reject (mais medium.com pur ok)
	/^[^.]+\.substack\.com$/
];

function normalizeHostname(hostname: string): string {
	return hostname.toLowerCase().replace(/^www\./, '');
}

/**
 * Retourne true si le domaine est explicitement banni (denylist).
 * Le pipeline doit reject ces items avant verifyUrl.
 */
export function isDeniedSource(hostname: string): boolean {
	const normalized = normalizeHostname(hostname);
	if (DENYLIST.has(normalized)) return true;
	return DENYLIST_HOSTNAME_PATTERNS.some((re) => re.test(normalized));
}

/**
 * Retourne le tier d'un domaine, ou null si hors whitelist.
 * La whitelist est informative au stade actuel (pas de reject hors whitelist),
 * mais le tier sert au log audit + à terme à la priorisation rank.
 */
export function getDomainTier(hostname: string): SourceTier | null {
	const normalized = normalizeHostname(hostname);
	if (TIER_1_OFFICIAL.has(normalized)) return 'T1';
	if (TIER_2_TRADE_PRO.has(normalized)) return 'T2';
	if (TIER_3_MARKET_RESEARCH.has(normalized)) return 'T3';
	if (TIER_4_PRESS_GENERAL.has(normalized)) return 'T4';
	if (TIER_5_TECH_INNOVATION.has(normalized)) return 'T5';
	if (TIER_6_COMPETITORS_INTERNATIONAL.has(normalized)) return 'T6';
	if (TIER_7A_INSTALLERS_BENCHMARK.has(normalized)) return 'T7A';
	if (TIER_7B_BRANDS_BENCHMARK.has(normalized)) return 'T7B';
	return null;
}

/**
 * Domaines autorisés flaggés "verbatim chiffres obligatoire" (sources
 * d'hallucination chiffrée connues mais autorisées). Le cross-check doit
 * être renforcé sur les chiffres pour ces domaines.
 */
export const STRICT_VERBATIM_DOMAINS = new Set([
	'mordorintelligence.com',
	'fortunebusinessinsights.com',
	'marketsandmarkets.com',
	'globenewswire.com',
	'businesswire.com'
]);

export function requiresStrictVerbatim(hostname: string): boolean {
	return STRICT_VERBATIM_DOMAINS.has(normalizeHostname(hostname));
}
