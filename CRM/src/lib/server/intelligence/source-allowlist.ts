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
// mais hors denylist sont autorisés (log warning seulement) - la whitelist
// est informative au début, le temps que la deep research la complète.
//
// Cette liste est appelée à grossir : Pascal a lancé une deep research Google
// en parallèle pour cartographier exhaustivement les sources sectorielles.
// Quand le JSON revient, l'enrichissement est mécanique (ajout dans les Sets).

export type SourceTier = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7A' | 'T7B';

/** Liste des tiers connus (source unique pour la validation runtime des données DB). */
export const SOURCE_TIERS: readonly SourceTier[] = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7A', 'T7B'];

/** Type guard : true si `value` est un tier reconnu. Sinon le traiter comme inconnu → strict. */
export function isSourceTier(value: unknown): value is SourceTier {
	return typeof value === 'string' && (SOURCE_TIERS as readonly string[]).includes(value);
}

/**
 * T1 - Sources officielles : régulation, normes, agences publiques.
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
	'ec.europa.eu', // Commission EU / Eurostat (cadrage sources fiables 2026-06-23)
	'eur-lex.europa.eu', // droit EU consolidé (cadrage 2026-06-23)
	'cordis.europa.eu',
	'din.de',
	'glassforeurope.com', // corrigé 2026-06-23 : glass-for-europe.eu était mort (vérif source primaire)
	'gae-eu.org',
	'gimm.eu',
	'eurovent.eu',
	'iea.org',
	'irena.org',
	// Normes / propriété intellectuelle (cadrage sources fiables 2026-06-23)
	'iso.org',
	'cen.eu',
	'cencenelec.eu',
	'fedlex.admin.ch', // droit fédéral suisse consolidé
	'ige.ch', // Institut fédéral de la propriété intellectuelle
	// Statistiques officielles (productrices primaires, code de pratique statistique) - cadrage 2026-06-23
	'bfs.admin.ch',
	'ofs.admin.ch',
	'insee.fr',
	'destatis.de',
	// Agences publiques énergie / bâtiment CH (mandat public) - cadrage 2026-06-23
	'energieschweiz.ch',
	'suisseenergie.ch',
	'leprogrammebatiments.ch',
	'cecb.ch',
	// Associations professionnelles dédiées films vitrage / verre (advocacy : voir ADVOCACY_DOMAINS)
	'ewfa.org', // European Window Film Association
	'iwfa.com', // International Window Film Association
	'apfv.org', // Association des professionnels du film pour vitrage (cadrage 2026-06-23)
	'asffv.fr', // Assoc. française des spécialistes du film pour vitrage
	'sigab.ch', // Institut suisse du verre dans le bâtiment
	'sfv-asvp.ch', // Association suisse du verre plat (la vraie, PAS « SVS » = soudure)
	'ffpv.org' // Fédération professionnelle du verre
]);

/**
 * T2 - Presse professionnelle bâtiment / vitrage.
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
	'glass-international.com',
	// Presse pro bâtiment/façade DE + FR (cadrage sources fiables 2026-06-23)
	'glaswelt.de',
	'gff-magazin.de',
	'baunetzwissen.de',
	'lechodelabaie.fr'
]);

/**
 * T3 - Études de marché et cabinets d'analyse.
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
 * T4 - Presse généraliste qualité (CH romande, alémanique, France).
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
	// Quotidiens cantonaux romands (couverture chantiers / régies / communes par canton ;
	// les grands titres romands ratent souvent le local cantonal). Ajout 2026-06-24.
	'lenouvelliste.ch', // VS - Le Nouvelliste
	'laliberte.ch', // FR - La Liberté
	'arcinfo.ch', // NE - ArcInfo (ex L'Express / L'Impartial)
	'lacote.ch', // VD - La Côte (Nyon / Morges / La Côte vaudoise)
	'lqj.ch', // JU - Le Quotidien Jurassien
	'lecourrier.ch', // GE - Le Courrier
	'ghi.ch', // GE - GHI (hebdomadaire genevois gratuit)
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
	'challenges.fr',
	'latribune.fr',
	// France voisine - bassin lémanique frontalier de Genève. Veille de CONTEXTE
	// uniquement : FilmPro n'intervient PAS en France voisine, mais les problématiques
	// (confort d'été, rénovation, réglementation thermique) sont un miroir utile du
	// Grand Genève. Ajout 2026-06-24.
	'ledauphine.com', // Le Dauphiné Libéré (Ain / Pays de Gex + Haute-Savoie)
	'lemessager.fr', // Le Messager (Chablais / Genevois haut-savoyard)
	// Agence de presse + service public additionnels (cadrage sources fiables 2026-06-23)
	'keystone-sda.ch', // agence de presse nationale (double sourcing, sans paywall)
	'rsi.ch', // service public italophone SSR
	'watson.ch'
]);

/**
 * T5 - Tech & innovation : R&D, brevets, recherche académique.
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
	'grenoble-inp.fr',
	// Revues à comité de lecture + labos publics additionnels (cadrage sources fiables 2026-06-23)
	'link.springer.com',
	'onlinelibrary.wiley.com',
	'tandfonline.com',
	'cnrs.fr',
	'fraunhofer.de'
	// NB : arxiv.org reste listé ci-dessus pour le TIER, mais est traité STRICT
	// (preprint non peer-reviewed) via ACADEMIC_PREPRINT_STRICT / domainRegime.
]);

/**
 * T6 - Sites officiels concurrents internationaux films/smart glass.
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
 * T7A - Installateurs concurrents directs FilmPro (CH/FR/IT/BE).
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
 * T7B - Fabricants/marques solutions architecture/bâtiment.
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
	// NB (décision Pascal 2026-06-23) : les sources NON listées « fiables » (réseaux
	// sociaux, wikis ouverts, forums, domaines inconnus) ne sont PAS exclues d'office.
	// Elles passent par le FILTRE ANTI-HALLU (régime 'strict' via domainRegime → chaque
	// fait doit être présent verbatim sur la page, sinon rejet). Seules les sources
	// PROUVÉES toxiques (blogs marketing/spam SEO ci-dessus, identifiés W18) restent en
	// denylist : le filtre anti-hallu ne peut PAS les rattraper (il vérifie que le résumé
	// colle à la SOURCE, pas que la source dit vrai ; un blog qui invente un chiffre sur
	// sa propre page passerait le verbatim). La denylist reste donc volontairement étroite.
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

export function normalizeHostname(hostname: string): string {
	return hostname.toLowerCase().replace(/^www\./, '');
}

/**
 * Retourne true si le hostname matche un des patterns denylist structurels
 * (`*.blogspot`, `*.wordpress.com`, `user.medium.com`, `user.substack.com`).
 *
 * Ces patterns NE sont PAS des sources éditables (règle anti-spam structurelle) :
 * ils restent en code et sont réutilisés par le loader DB (`sources-loader.ts`)
 * pour que la classification table reproduise exactement `isDeniedSource`.
 */
export function matchesDenylistHostnamePattern(hostname: string): boolean {
	const normalized = normalizeHostname(hostname);
	return DENYLIST_HOSTNAME_PATTERNS.some((re) => re.test(normalized));
}

/**
 * Retourne true si le domaine est explicitement banni (denylist).
 * Le pipeline doit reject ces items avant verifyUrl.
 */
export function isDeniedSource(hostname: string): boolean {
	const normalized = normalizeHostname(hostname);
	if (DENYLIST.has(normalized)) return true;
	return matchesDenylistHostnamePattern(normalized);
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
	'snsinsider.com',
	'globenewswire.com',
	'businesswire.com',
	// Cabinets d'études à chiffres payants + fils de communiqués (cadrage 2026-06-23).
	// Chiffres dans un livrable payant / rédigés par l'émetteur → non vérifiables, strict obligatoire.
	'grandviewresearch.com',
	'researchandmarkets.com',
	'giiresearch.com',
	'alliedmarketresearch.com',
	'prnewswire.com',
	'accesswire.com',
	'einpresswire.com',
	'newswire.ca'
]);

export function requiresStrictVerbatim(hostname: string): boolean {
	return STRICT_VERBATIM_DOMAINS.has(normalizeHostname(hostname));
}

/**
 * Preprints académiques : NON peer-reviewed (modération seule, ~14000 retraits).
 * arxiv.org reste dans TIER_5 pour l'étiquetage de tier, mais son RÉGIME de
 * vérification est STRICT (cadrage sources fiables 2026-06-23, section 4).
 */
export const ACADEMIC_PREPRINT_STRICT = new Set([
	'arxiv.org',
	'medrxiv.org',
	'biorxiv.org',
	'preprints.org',
	'ssrn.com',
	'researchsquare.com'
]);

export function isPreprintSource(hostname: string): boolean {
	return ACADEMIC_PREPRINT_STRICT.has(normalizeHostname(hostname));
}

/**
 * Domaines d'associations / fédérations sectorielles (sous-ensemble de T1).
 * Régime « trusted_advocacy » : confiance sur les faits techniques / normatifs /
 * auto-déclaratifs, mais STRICT verbatim sur tout chiffre de marché / % de
 * performance / superlatif (organes financés par l'industrie → garde-fou 2 du
 * cadrage 2026-06-23, section 3.4).
 */
export const ADVOCACY_DOMAINS = new Set([
	'ewfa.org',
	'iwfa.com',
	'glassforeurope.com',
	'apfv.org',
	'asffv.fr',
	'sigab.ch',
	'sfv-asvp.ch',
	'ffpv.org',
	// Fédérations industrielles plus larges déjà en T1 (revue 2026-06-23, finding LOW-1) :
	// ce sont aussi des organes financés par l'industrie → clause advocacy (strict sur
	// leurs chiffres de marché/perf), pas confiance nue.
	'gae-eu.org', // Glass Alliance Europe (fédération faîtière verre)
	'gimm.eu',
	'eurovent.eu' // association fabricants HVAC
]);

export function isAdvocacySource(hostname: string): boolean {
	return ADVOCACY_DOMAINS.has(normalizeHostname(hostname));
}

/**
 * Régime de vérification d'un DOMAINE (cadrage sources fiables 2026-06-23).
 *
 * - 'strict' : filtre verbatim actuel (l'ABSENCE d'un fait sur la page suffit à
 *   rejeter). Sources non fiables, inconnues, ou flaggées strict.
 * - 'trusted' : confiance - un fait dur n'est rejeté que s'il est CONTREDIT par
 *   la page (l'absence seule ne rejette plus). Source reconnue + URL active.
 * - 'trusted_advocacy' : comme 'trusted' mais les chiffres de marché / perf /
 *   superlatifs restent strict (associations / lobbies sectoriels).
 *
 * Décision Pascal (2026-06-23) : la confiance s'applique AUSSI aux faits durs sur
 * les sources reconnues. La fiabilité est un attribut du DOMAINE, jamais re-jugée
 * par le LLM article par article. Règle d'or : dans le doute, strict (domaine
 * inconnu / tier=null → strict). Le sponsorisé/opinion (pattern URL/titre) et le
 * paywall (corps non lu) sont gérés en aval (cross-check.ts) car ils dépendent de
 * l'item / de la page, pas seulement du domaine.
 *
 * NB : le GATE déterministe (rejet si facts_ok=false) est INCHANGÉ ; seul le
 * CRITÈRE du vérificateur change selon le régime retourné ici.
 */
export type VerificationRegime = 'strict' | 'trusted' | 'trusted_advocacy';

/**
 * Classification atomique d'un domaine (déniée / strict verbatim / preprint /
 * tier / advocacy), indépendante de la PROVENANCE des données (Sets en code OU
 * table `veille_sources`). C'est la forme commune que `domainRegime` (code) et
 * `sources-loader.ts` (DB) passent tous deux à `regimeFromClassification`.
 */
export interface DomainClassification {
	denied: boolean;
	strictVerbatim: boolean;
	preprint: boolean;
	tier: SourceTier | null;
	advocacy: boolean;
}

/**
 * POLITIQUE de régime (règle métier stable, source unique). Dérive le régime de
 * vérification à partir de la classification atomique d'un domaine, dans l'ordre
 * de priorité décidé au cadrage 2026-06-23. Ce n'est PAS une « source » éditable :
 * c'est la règle qui mappe une classification (tier + flags) vers un régime.
 *
 * Réutilisée par `domainRegime` (données = Sets en code) ET par le classifieur DB
 * (`sources-loader.ts`, données = table) → les deux chemins produisent forcément
 * le même régime pour une même classification (zéro drift possible par construction).
 */
export function regimeFromClassification(c: DomainClassification): VerificationRegime {
	// Sources flaggées strict, déniées, ou preprints → strict (les déniées sont
	// déjà rejetées en amont ; ceinture-bretelles ici si jamais elles arrivent).
	if (c.denied) return 'strict';
	if (c.strictVerbatim) return 'strict';
	if (c.preprint) return 'strict';
	// Domaine inconnu (hors whitelist) → strict par défaut (privilège par domaine nommé).
	if (c.tier === null) return 'strict';
	// Cabinets/conseil (T3, chiffres non vérifiables) + concurrents/installateurs/
	// marques (T6/T7, biais marketing) → strict en bloc.
	if (c.tier === 'T3' || c.tier === 'T6' || c.tier === 'T7A' || c.tier === 'T7B') return 'strict';
	// Associations / lobbies sectoriels → confiance + clause advocacy.
	if (c.advocacy) return 'trusted_advocacy';
	// Confiance RÉSERVÉE aux tiers explicitement fiables : T1 (officiel/normatif/
	// stats/agences), T2 (presse pro), T4 (presse qualité + agence), T5 (peer-reviewed/
	// brevets/labos, hors preprints). Tout le reste — y compris un tier invalide qui
	// aurait échappé à la validation amont (la donnée vient d'une table éditable) —
	// retombe en strict : fail-SAFE sur un pipeline anti-hallu (règle d'or 2026-06-23 :
	// dans le doute, strict). Pour une donnée valide, seuls T1/T2/T4/T5 atteignent ici,
	// donc le comportement est rigoureusement identique à l'ancien `return 'trusted'`.
	if (c.tier === 'T1' || c.tier === 'T2' || c.tier === 'T4' || c.tier === 'T5') return 'trusted';
	return 'strict';
}

export function domainRegime(hostname: string): VerificationRegime {
	const normalized = normalizeHostname(hostname);
	return regimeFromClassification({
		denied: isDeniedSource(normalized),
		strictVerbatim: requiresStrictVerbatim(normalized),
		preprint: isPreprintSource(normalized),
		tier: getDomainTier(normalized),
		advocacy: isAdvocacySource(normalized)
	});
}
