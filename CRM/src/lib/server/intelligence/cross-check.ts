// Cross-check LLM second-pass pour la veille FilmPro (refonte 2026-05-05,
// recalibrage faits/interprétation 2026-06-22).
//
// Pour chaque item rescapé du filtre URL/date, on :
// 1. Refetch la page source (HTML brut, limité à 200KB).
// 2. Demande à Sonnet 4.6 (modèle vérificateur, peu coûteux) de valider les
//    FAITS VÉRIFIABLES du summary (chiffres, dates, noms propres, citations entre
//    guillemets, énumérations) contre la page réelle.
// 3. Si le verdict est `facts_ok=false` → item rejeté (un fait est fabriqué/déformé).
//
// Origine I1 (zéro-hallu sur les FAITS) : audit W18 a montré qu'un LLM générateur
// peut paraphraser un chiffre en perturbant les décimales sans déclencher aucun
// check (ex: 2,88 Mds USD → 2,66 Mds USD côté Mordor, item rank 5). Le générateur
// ne peut pas s'auto-corriger sous pression de volume ; il faut un valideur EXTERNE
// avec accès au texte réel.
//
// Recalibrage 2026-06-22 (GO Pascal, cause racine W25 « 0 item ») : le vérificateur
// ne juge PLUS « chaque phrase est-elle présente verbatim ? » (ce qui rejetait la
// VOIX D'ANALYSTE - les phrases d'interprétation / « so what » ne sont jamais
// littéralement dans un article et étaient flaggées hallucination → 4 items locaux
// vivants jetés en W25). Il juge désormais « le résumé invente-t-il ou déforme-t-il
// un FAIT ? ». Les chiffres/dates/noms/citations restent vérifiés à l'identique
// (protection W18 INTACTE) ; l'interprétation cohérente passe. Le GATE déterministe
// (rejet si `facts_ok=false`, y compris divergences vides - brèche H-04 fermée) est
// INCHANGÉ : seul le CRITÈRE du vérificateur (le SYSTEM prompt) évolue.
// Voir .product-architect/veille/refonte-lot1-lot2-spec.md (AC-1).
//
// Recalibrage TRUST-BY-SOURCE 2026-06-23 (GO Pascal, cadrage sources fiables) : la
// confiance s'applique désormais AUSSI aux faits durs SELON LE RÉGIME DU DOMAINE.
// - Source FIABLE (T1 officiel/normatif/stats, T2 presse pro, T4 presse qualité +
//   agence, T5 peer-reviewed) → critère « confiance » : un fait dur n'est rejeté que
//   s'il est CONTREDIT par la page (l'absence seule ne rejette plus - l'extracteur de
//   texte est grossier et rate tableaux/PDF/images d'une source reconnue). DEUX
//   garde-fous stricts conservés : (a) un chiffre ATTRIBUÉ à un cabinet d'études reste
//   verbatim (héritage de flag), (b) sur une association/lobby, les chiffres de marché
//   /perf restent verbatim.
// - Source NON fiable / inconnue / sponsorisée / opinion / preprint / paywall non lu →
//   critère STRICT inchangé (l'absence suffit à rejeter).
// Le GATE déterministe (rejet si facts_ok=false) est TOUJOURS INCHANGÉ : seul le
// CRITÈRE (quel SYSTEM) change selon le régime. Voir cadrage-sources-fiables-v1.md.

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { IntelligenceItem } from './schema';
import { costTracker, type CostTracker } from './cost-tracker';
import { isSafeUrlForFetch, safeFetch } from './url-guard';
import type { VerificationRegime } from './source-allowlist';
import { getFallbackSourcesBundle, type SourcesBundle } from './sources-loader';

const CROSS_CHECK_MODEL = 'claude-sonnet-4-6';
const CROSS_CHECK_MAX_TOKENS = 1500;
const PAGE_FETCH_TIMEOUT_MS = 12000;
const PAGE_BODY_MAX_BYTES = 200 * 1024; // 200KB
const USER_AGENT = `Mozilla/5.0 (compatible; FilmProBot/1.0; +${process.env.PUBLIC_APP_URL || 'https://filmpro-portail.vercel.app'})`;

export interface CrossCheckDivergence {
	quoted: string;
	found: string | null;
	/**
	 * fatal = FAIT fabriqué ou déformé (chiffre faux, citation inventée, entité
	 * absente, énumération étendue, date inventée, fait contredit) → cause le rejet.
	 * minor = paraphrase fidèle / nuance secondaire (informatif, ne rejette pas).
	 * Une phrase d'INTERPRÉTATION (so-what, implication) ne doit PAS être listée.
	 */
	severity: 'fatal' | 'minor';
}

export interface CrossCheckVerdict {
	/**
	 * true SI aucun FAIT VÉRIFIABLE du résumé n'est fabriqué ni déformé par rapport
	 * à la page. false dès qu'au moins UN fait l'est (et il est alors listé dans
	 * `divergences` en severity='fatal'). Renommé depuis `verbatim_ok` (2026-06-22) :
	 * le contrat ne vérifie plus la présence verbatim de CHAQUE phrase mais l'absence
	 * de fait fabriqué (l'interprétation d'analyste passe). Gate inchangé : rejet si false.
	 */
	facts_ok: boolean;
	divergences: CrossCheckDivergence[];
	confidence: 'high' | 'medium' | 'low';
}

export interface CrossCheckRejectedItem {
	url: string;
	title: string;
	verdict: CrossCheckVerdict;
}

export interface CrossCheckResult {
	kept: IntelligenceItem[];
	rejected: CrossCheckRejectedItem[];
	/** Items pour lesquels la page n'a pas pu être fetchée → conservés (pas de raison de rejeter). */
	unverifiable: IntelligenceItem[];
	/**
	 * Nombre d'items dont la VÉRIFICATION a échoué côté API (exception du modèle
	 * vérificateur : crédit épuisé, auth, surcharge, réseau) - distinct d'une page
	 * morte (unfetchable) qui est un problème de contenu. Sert à distinguer un
	 * échec systémique d'un rejet de contenu.
	 */
	apiErrorCount: number;
	/**
	 * Nombre d'items conservés par TRUST-BY-SOURCE (levier sourcing 2026-06-23) :
	 * page authentiquement non re-fetchable au cross-check MAIS source à régime
	 * 'trusted'/'trusted_advocacy' (T1 officiel, T2 presse pro, etc.) → aucune contradiction
	 * possible, conservé et marqué `content_reverified=false`. Observabilité du levier.
	 */
	keptByTrust: number;
	/**
	 * Présent UNIQUEMENT si TOUS les items ont échoué côté API verifier (aucune
	 * vérification possible). Signal d'un incident systémique (crédit dédié épuisé,
	 * clé invalide, API down) à remonter en alerte distincte - surtout PAS publier
	 * une édition vide en silence (la génération coûteuse a déjà réussi).
	 */
	systemicError?: { kind: ApiErrorKind; message: string };
}

/** Classe d'erreur de l'API verifier (par statut HTTP, jamais par string-matching). */
export type ApiErrorKind = 'request' | 'auth' | 'overloaded' | 'network';

interface ClassifiedApiError {
	kind: ApiErrorKind;
	status: number | null;
	message: string;
}

/**
 * Classe une exception de l'appel verifier par sa CLASSE typée (statut HTTP),
 * conformément à la doc SDK Anthropic (« catch typed error classes, not message
 * string-matching »). 400 = requête rejetée (crédit dédié épuisé « credit balance
 * too low » OU payload) ; 401/403 = auth ; 429/529/5xx = surcharge transitoire ;
 * sinon = réseau. Le message brut est conservé (sanitizé par l'appelant avant
 * stockage/email) pour qu'une cause précise comme le crédit épuisé soit lisible.
 */
function classifyApiError(e: unknown): ClassifiedApiError {
	const status =
		typeof e === 'object' && e !== null && 'status' in e && typeof (e as { status: unknown }).status === 'number'
			? ((e as { status: number }).status)
			: null;
	const message = e instanceof Error ? e.message : String(e);
	let kind: ApiErrorKind;
	if (status === 400) kind = 'request';
	else if (status === 401 || status === 403) kind = 'auth';
	else if (status === 429 || status === 529 || (typeof status === 'number' && status >= 500))
		kind = 'overloaded';
	else kind = 'network';
	return { kind, status, message };
}

/**
 * Fetch HTML brut de la page, tronqué à PAGE_BODY_MAX_BYTES.
 * Retourne null si erreur réseau / timeout / status non-OK.
 */
export async function fetchPageContent(url: string): Promise<string | null> {
	// Garde SSRF (audit Medium #1) : refuser hostnames privés / metadata cloud.
	if (!isSafeUrlForFetch(url)) return null;
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), PAGE_FETCH_TIMEOUT_MS);
	try {
		const res = await safeFetch(url, {
			method: 'GET',
			signal: controller.signal,
			headers: {
				'User-Agent': USER_AGENT,
				Accept: 'text/html,application/xhtml+xml',
				Range: `bytes=0-${PAGE_BODY_MAX_BYTES - 1}`
			}
		});
		if (!res.ok && res.status !== 206) return null;
		const text = await res.text();
		return text.slice(0, PAGE_BODY_MAX_BYTES);
	} catch {
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

/**
 * Décode une entité numérique HTML (décimale &#NN; ou hexadécimale &#xNN;) en
 * caractère. Guard contre les code points invalides (retourne l'entité brute).
 * Pourquoi (2026-06-22) : certaines pages encodent l'apostrophe des milliers en
 * `&#x27;` (ex. Blick « 28&#x27;500 personnes »). Sans décodage, le texte vu par le
 * vérificateur contient « 28&#x27;500 » alors que le résumé dit « 28'500 » → faux
 * « chiffre absent ». Décoder réduit les rejets à tort d'items factuellement sains.
 */
function decodeNumericEntities(s: string): string {
	return s
		.replace(/&#x([0-9a-f]+);/gi, (m, hex) => {
			const cp = parseInt(hex, 16);
			try {
				return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
			} catch {
				return m;
			}
		})
		.replace(/&#(\d+);/g, (m, dec) => {
			const cp = parseInt(dec, 10);
			try {
				return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
			} catch {
				return m;
			}
		});
}

/**
 * Extrait grossièrement le texte d'un HTML pour le cross-check :
 * - retire scripts, styles, balises HTML
 * - décode les entités nommées courantes + numériques (chiffres avec apostrophe)
 * - normalise les whitespaces
 * - tronque à 60KB de texte (largement suffisant pour un article)
 */
export function htmlToPlainText(html: string): string {
	// Retrait LINÉAIRE de script/style/noscript/template + commentaires via stripNonContent
	// (indexOf, ReDoS-safe, gère les ouvrants non fermés d'une page tronquée) AVANT le strip des
	// balises. Remplace les anciennes regex lazy `<script>[\s\S]*?</script>` / `<!--…-->` à
	// backtracking quadratique sur des ouvrants sans fermant (re-vérif finding ReDoS amplifié).
	// Strip des balises = `<[^<>]+>` (et PAS `<[^>]+>`) : exclure `<` du contenu de balise borne le
	// backtracking à une seule balise → linéaire même sur du code non-échappé « if (a < b && c < d) »
	// (re-vérif finale, bloqueur DoS event-loop : `<[^>]+>` faisait 57 s sur 200KB de `<` sans `>`).
	// Sortie identique sur HTML valide (une vraie balise ne contient pas de `<` non échappé) ;
	// strictement meilleure sur HTML invalide (« a < b » préservé comme texte vers le vérificateur).
	return decodeNumericEntities(
		stripNonContent(html).replace(/<[^<>]+>/g, ' ')
	)
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 60 * 1024);
}

const VERDICT_TOOL: Anthropic.Tool = {
	name: 'emit_verdict',
	description:
		"Émet le verdict de vérification FACTUELLE entre le résumé proposé et le contenu réel de la page. Tu vérifies les FAITS (chiffres, dates, noms, citations), pas le style ni la présence verbatim de chaque phrase d'analyse.",
	input_schema: {
		// confidence est ADVISORY (n'entre pas dans le gate, qui ne lit que facts_ok) →
		// optionnel ici, le Zod VerdictSchema le défaute à 'medium'. Contraste voulu avec
		// `severity` (strict, sans défaut) qui, lui, protège le zéro-hallu. Cohérence des
		// 3 couches : entrée optionnelle, sortie toujours présente via le défaut Zod.
		type: 'object',
		required: ['facts_ok', 'divergences'],
		properties: {
			facts_ok: {
				type: 'boolean',
				description:
					"true SI, SELON LE CRITÈRE DÉFINI DANS LES INSTRUCTIONS SYSTÈME, aucun FAIT VÉRIFIABLE du résumé n'est fautif. false dès qu'au moins UN fait l'est (tu le listes alors dans divergences en severity='fatal'). Les phrases d'INTERPRÉTATION / d'analyse / de mise en perspective (le « so what ») qui n'introduisent aucun fait vérifiable nouveau ne réduisent JAMAIS facts_ok."
			},
			divergences: {
				type: 'array',
				maxItems: 8,
				items: {
					type: 'object',
					required: ['quoted', 'found', 'severity'],
					properties: {
						quoted: {
							type: 'string',
							description: 'Le FAIT du résumé qui pose problème (citation littérale du passage).'
						},
						found: {
							type: ['string', 'null'],
							description:
								'Le fait correspondant dans la page (verbatim) si trouvé, ou null si le fait est totalement absent.'
						},
						severity: {
							type: 'string',
							enum: ['fatal', 'minor'],
							description:
								"fatal = fait fautif SELON LE CRITÈRE SYSTÈME (mode STRICT : fait fabriqué/absent/déformé/contredit ; mode CONFIANCE : fait CONTREDIT par la page, OU chiffre attribué à un cabinet d'études absent, OU chiffre de marché/perf d'une association absent). minor = paraphrase fidèle / nuance secondaire / (en mode CONFIANCE) fait simplement absent mais NON contredit (informatif, ne rejette pas). N'inscris JAMAIS ici une phrase d'interprétation : si elle n'a pas de fait vérifiable, ce n'est pas une divergence."
						}
					}
				}
			},
			confidence: {
				type: 'string',
				enum: ['high', 'medium', 'low'],
				description:
					'high = page lisible et faits clairement vérifiables. medium = page partielle ou faits ambigus. low = page peu lisible ou hors-contexte.'
			}
		}
	}
};

// SYSTEM mode STRICT (sources non fiables / inconnues / sponsorisées / preprints /
// paywall non lu) : l'ABSENCE d'un fait sur la page suffit à le rejeter. Critère
// historique (protection W18). Renommé depuis `SYSTEM` le 2026-06-23 (ajout du mode
// CONFIANCE pour les sources fiables, voir SYSTEM_TRUSTED).
const SYSTEM_STRICT = `Tu es un VÉRIFICATEUR FACTUEL pour une veille sectorielle B2B rédigée par un analyste sénior.
Ta SEULE mission : détecter si le résumé INVENTE ou DÉFORME un FAIT VÉRIFIABLE par rapport à la page source réelle. Tu ne juges NI le style, NI si chaque phrase est présente mot-pour-mot.

# Un FAIT VÉRIFIABLE
Un chiffre (montant, %, CAGR, surface, volume, durée, température), une date, un nom propre (entreprise, personne, lieu, produit, norme, loi), ou une citation entre guillemets / marquée <cite>.

# Champs à vérifier
On te fournit le RÉSUMÉ (description de l'article) et, parfois, la LECTURE FILMPRO (so-what : interprétation métier). Tu vérifies les FAITS des DEUX, mais leur nature diffère :
- RÉSUMÉ : décrit l'article → tous ses faits doivent être dans la page.
- LECTURE FILMPRO : interprétation métier (opportunité, segment cible, action commerciale). Son RAISONNEMENT est libre et ne se vérifie pas. NE flagge RIEN sur : les capacités produit de FilmPro (ex. « les films bloquent jusqu'à 99% des UV »), les catégories de cibles génériques (régies, architectes, tertiaire, ERP, commerces), les suggestions d'action (relancer, prospecter, cibler). MAIS si elle présente comme un FAIT EXTERNE RÉEL ET ACTUEL une entreprise NOMMÉE (raison sociale) ayant agi, une personne, un appel d'offres / chantier / événement précis, un lieu ou un chiffre spécifique attribué à l'actualité → ce fait DOIT être dans la page (sinon fatal). Exemple FATAL : so-what « la régie Dupont SA a lancé un appel d'offres sur 12 immeubles » alors que la page n'en parle pas.

# À REJETER → facts_ok=false + divergence severity='fatal'
- Un chiffre absent de la page, ou aux décimales/unités différentes. Exemple FATAL : « 2,66 Md USD » alors que la page dit « 2,88 Md USD ».
- Une citation entre guillemets / <cite> non présente verbatim dans la page (pas de paraphrase sous guillemets).
- Un nom propre (entreprise, personne, lieu, produit, norme) cité comme fait et absent de la page.
- **Extension d'énumération** : si on liste des éléments (« comme A, B et C », « notamment X et Y »), CHAQUE élément DOIT figurer dans la page. Un élément ajouté absent = FATAL. Exemple : page « façades, toitures et sols », résumé « fenêtres et toitures » → fatal (fenêtres ajoutée).
- **Traduction de terme technique infidèle** : la traduction d'un terme technique nommé sur la page doit être fidèle à la nature du composant/concept. Exemple : page « Magnetic fixed-sash stop for double-sash units », résumé « fixe magnétique sur seuil affleurant » → fatal (autre composant).
- Une date inventée (non affichée sur la page).
- Une affirmation FACTUELLE spécifique CONTREDITE par la page.
- **Exclusivité / antériorité / tendance présentée comme un fait, absente de la page** : un superlatif ou une exclusivité (« le premier », « le plus grand », « unique », « du jamais-vu », « record »), une antériorité (« pour la première fois », « jamais auparavant »), ou une tendance chiffrable affirmée comme un fait (« la demande accélère depuis deux ans ») est un FAIT VÉRIFIABLE même sans chiffre. S'il n'est pas établi par la page → fatal. L'ABSENCE suffit (pas besoin d'une contradiction explicite). NE PAS confondre avec une généralisation prudente cohérente avec la page.

# À IGNORER → ne JAMAIS flagger, ne réduit JAMAIS facts_ok
- Les phrases d'ANALYSE, d'INTERPRÉTATION, d'IMPLICATION, de mise en perspective - le « so what » - qui n'introduisent AUCUN fait vérifiable nouveau. Exemple à IGNORER : « cela confirme la pression estivale croissante sur les bâtiments très vitrés » (interprétation, aucun chiffre/nom/date/citation/exclusivité).
- Les paraphrases fidèles au sens et aux faits.
- La généralisation prudente cohérente avec la page (« la sensibilité au sujet augmente ») - distincte d'une exclusivité/antériorité affirmée.
- Les capacités produit de FilmPro et les catégories de cibles génériques de la lecture FilmPro (voir « Champs à vérifier »).

# Règle d'or
En cas de doute sur la nature d'une phrase (fait vs interprétation), considère-la comme INTERPRÉTATION (ne pas flagger) SAUF si elle contient un chiffre, un nom propre, une date, une citation précis, OU une affirmation d'exclusivité / d'antériorité / de tendance présentée comme un fait. Tu ne pénalises jamais une phrase parce qu'elle est « interprétative » ou « pas confirmée mot-pour-mot » : tu la pénalises UNIQUEMENT si elle contient un fait FABRIQUÉ ou DÉFORMÉ.

facts_ok = true si AUCUN fait fabriqué/déformé. facts_ok = false dès qu'au moins UN fait l'est (listé en 'fatal').

Tu réponds UNIQUEMENT via le tool emit_verdict. Pas de markdown, pas de préambule.`;

// SYSTEM mode CONFIANCE (sources fiables : T1 officiel/normatif/stats, T2 presse pro,
// T4 presse de qualité + agence, T5 peer-reviewed). Décision Pascal 2026-06-23 : on se
// fie à la source reconnue plutôt qu'au filtre IA. Un fait dur n'est rejeté que s'il est
// CONTREDIT par la page (l'absence seule ne rejette plus). DEUX garde-fous stricts
// conservés (héritage de flag + chiffres de cabinet). Le GATE (rejet si facts_ok=false)
// est inchangé ; seul le critère qui amène facts_ok=false change. Cf. cadrage section 1.
const SYSTEM_TRUSTED = `Tu es un VÉRIFICATEUR FACTUEL pour une veille sectorielle B2B rédigée par un analyste sénior.
La source de cet article est une SOURCE RECONNUE ET REDEVABLE (organisme officiel, statistique publique, norme, presse professionnelle ou de qualité établie, agence de presse, revue à comité de lecture). On lui accorde la CONFIANCE : ta mission n'est PAS de retrouver chaque fait mot-pour-mot, mais de détecter si le résumé est CONTREDIT par la page.

# Un FAIT VÉRIFIABLE
Un chiffre (montant, %, CAGR, surface, volume, durée, température), une date, un nom propre (entreprise, personne, lieu, produit, norme, loi), ou une citation entre guillemets / marquée <cite>.

# Champs à vérifier
On te fournit le RÉSUMÉ et, parfois, la LECTURE FILMPRO (so-what : interprétation métier). La LECTURE FILMPRO est libre dans son raisonnement : ne flagge RIEN sur les capacités produit de FilmPro (ex. « bloque jusqu'à 99% des UV »), les catégories de cibles génériques (régies, architectes, tertiaire, ERP), les suggestions d'action. MAIS si elle présente comme un FAIT EXTERNE RÉEL une entreprise NOMMÉE ayant agi, un appel d'offres / chantier précis, une personne, un lieu ou un chiffre d'actualité spécifique, et que la page le CONTREDIT → fatal.

# À REJETER → facts_ok=false + divergence severity='fatal'
- Un fait du résumé CONTREDIT par la page : la page affirme une valeur DIFFÉRENTE (chiffre, date, nom, lieu). Exemple FATAL : page « 28°C », résumé « 35°C » ; page « 2,88 Md USD », résumé « 2,66 Md USD » ; page « façades et toitures », résumé « fenêtres » (élément contredit/substitué). C'est la CONTRADICTION qui rejette, pas l'absence.
- **GARDE-FOU 1 (héritage de flag)** : un CHIFFRE que le résumé attribue à un CABINET D'ÉTUDES DE MARCHÉ nommé (Mordor, Fortune Business, MarketsandMarkets, SNS / SNS Insider, Grand View, Allied Market Research, Research and Markets, GII) ou à « une étude de marché / un rapport de marché / un cabinet » DOIT être présent VERBATIM sur la page. S'il est ABSENT → fatal (on ne blanchit pas un chiffre de cabinet sous la signature de la source fiable). Pour CE type de chiffre uniquement, l'absence suffit.
- Une citation entre guillemets / <cite> que la page CONTREDIT (mots différents attribués à la même personne). Une citation simplement introuvable mais plausible ne rejette pas.

# À IGNORER → ne JAMAIS flagger, ne réduit JAMAIS facts_ok
- **Un fait simplement ABSENT de la page mais NON contredit** : la source est reconnue et l'extracteur de texte est grossier (il rate tableaux, PDF liés, images, contenu chargé en JS). Un chiffre/nom/date du résumé qu'on ne retrouve pas, sans que la page affirme autre chose, est très probablement réel mais non extrait → tu le classes en severity='minor' (informatif), JAMAIS fatal. (Exception : le GARDE-FOU 1 ci-dessus.)
- Les phrases d'ANALYSE / d'INTERPRÉTATION / de mise en perspective (le « so what ») sans fait vérifiable nouveau.
- Les paraphrases fidèles au sens et aux faits.

# Règle d'or (mode CONFIANCE)
Tu ne rejettes un fait QUE si la page le CONTREDIT activement (la page affirme autre chose), OU s'il s'agit d'un chiffre attribué à un cabinet d'études absent de la page (garde-fou 1). L'ABSENCE seule d'un fait ne rejette JAMAIS. En cas de doute, NE PAS flagger.

facts_ok = false UNIQUEMENT si la page contredit au moins un fait, OU si un chiffre de cabinet attribué est absent. Sinon facts_ok = true.

Tu réponds UNIQUEMENT via le tool emit_verdict. Pas de markdown, pas de préambule.`;

// Clause ajoutée au SYSTEM CONFIANCE pour les domaines ADVOCACY (associations /
// fédérations sectorielles, financées par l'industrie). Garde-fou 2 du cadrage : leurs
// chiffres de marché / performance / superlatifs ne bénéficient PAS de la confiance.
const ADVOCACY_CLAUSE = `
# GARDE-FOU 2 (source = association / fédération sectorielle)
Cette source est un organe financé par l'industrie. Tout CHIFFRE DE MARCHÉ, POURCENTAGE DE PERFORMANCE, ou SUPERLATIF / EXCLUSIVITÉ (« le plus grand », « première fois », « record ») présenté comme un fait DOIT être présent VERBATIM sur la page ; s'il est ABSENT → fatal (on ne fait pas confiance à un chiffre de marché auto-déclaré par un lobby). Les faits techniques, normatifs et descriptifs restent en confiance (leur absence ne rejette pas).`;

/** Retourne le SYSTEM correspondant au régime de vérification (cadrage 2026-06-23). */
function systemForRegime(regime: VerificationRegime): string {
	if (regime === 'strict') return SYSTEM_STRICT;
	if (regime === 'trusted_advocacy') return SYSTEM_TRUSTED + '\n' + ADVOCACY_CLAUSE;
	return SYSTEM_TRUSTED;
}

// Détecteur sponsorisé / opinion (cadrage 5.2) : la fiabilité d'un titre ne se transmet
// PAS à sa rubrique payée ou d'opinion. Sur match, on FORCE le régime strict, même sur un
// domaine fiable.
//
// Matching PAR SEGMENT de chemin (revue 2026-06-23, findings MEDIUM-3/4 + LOW-5/6) :
// l'ancien matching par sous-chaîne ratait des tokens publicitaires (publicite, anzeige,
// werbung, sponsored-content, branded...) ET créait des faux positifs (« cp- » au milieu
// d'un slug, « présenté par » dans un titre éditorial normal). On découpe le path en
// segments et on matche un segment EXACT, ou un PRÉFIXE clairement publicitaire.
// ROUND-2 (revue 2026-06-23 finding LOW round-2) : tokens AMBIGUS retirés - `cp` (slug
// ambigu, ≠ « communiqué de presse » garanti), `native` (native plants/API/native-ad…),
// `promo`/`promotion`/`promoted` (promotion scolaire/immobilière), `annonce`/`annonces`
// (toute annonce/communiqué d'actualité). Ils créaient des faux strict (perte de volume) sur
// des slugs métier légitimes. Les marqueurs publicitaires NON ambigus restent ; on ajoute
// `native-advertising` (l'expression complète, sans le `native` nu). Préfixe `cp-` retiré.
const SPONSORED_SEGMENTS = new Set([
	'sponsored', 'sponsorise', 'sponsorisé', 'sponsored-content', 'sponsoredcontent',
	'partner', 'partners', 'partner-content', 'partenaire', 'partenaires', 'contenu-partenaire',
	'publi', 'publireportage', 'publi-communique', 'publicommunique', 'publicite', 'publicité',
	'advertorial', 'advertising', 'native-advertising', 'brandstudio', 'brand-studio',
	'brandlab', 'brand-lab', 'anzeige', 'werbung',
	'communique', 'communiques', 'press-release'
]);
const SPONSORED_SEGMENT_PREFIXES = ['publi-', 'sponsored-', 'advertorial-', 'brand-'];
const OPINION_SEGMENTS = new Set([
	'opinion', 'opinions', 'tribune', 'tribunes', 'edito', 'editorial', 'éditorial',
	'chronique', 'chroniques', 'debat', 'débat', 'debats', 'idees', 'idées', 'meinung',
	'point-de-vue', 'carte-blanche'
]);
// Marqueurs de titre UNIQUEMENT non ambigus (les « en collaboration avec » / « présenté
// par » nus ont été retirés : trop fréquents en journalisme normal, finding LOW-6).
const SPONSORED_TITLE_MARKERS = [
	'publireportage', 'publi-communiqué', 'publi-communique', 'contenu sponsorisé',
	'contenu sponsorise', 'contenu de marque', 'contenu partenaire', '[sponsorisé]',
	'[sponsorise]', 'sponsorisé par', 'sponsorise par', 'en partenariat commercial', 'advertorial'
];
const OPINION_TITLE_MARKERS = [
	'opinion :', 'tribune :', 'tribune libre', 'édito :', 'edito :', 'point de vue :',
	'chronique :', 'carte blanche :'
];

/**
 * true si l'item provient d'une rubrique sponsorisée / publireportage / opinion
 * (détecté par SEGMENT de chemin d'URL ou marqueur de titre non ambigu). Ces rubriques ne
 * bénéficient pas de la confiance accordée au domaine → régime strict. Exporté pour test.
 */
export function isSponsoredOrOpinion(url: string, title: string): boolean {
	let segments: string[] = [];
	try {
		segments = new URL(url).pathname.toLowerCase().split('/').filter(Boolean);
	} catch {
		segments = (url ?? '').toLowerCase().split('/').filter(Boolean);
	}
	const segHit = segments.some(
		(s) =>
			SPONSORED_SEGMENTS.has(s) ||
			OPINION_SEGMENTS.has(s) ||
			SPONSORED_SEGMENT_PREFIXES.some((p) => s.startsWith(p))
	);
	if (segHit) return true;
	const t = (title ?? '').toLowerCase();
	return (
		SPONSORED_TITLE_MARKERS.some((m) => t.includes(m)) ||
		OPINION_TITLE_MARKERS.some((m) => t.includes(m))
	);
}

// Garde-fou 1 DÉTERMINISTE (revue 2026-06-23, finding LOW-7) : backstop du prompt. Si le
// contenu rédigé (résumé / deep_dive / so-what) attribue un CHIFFRE à un cabinet d'études de
// marché nommé, on force le régime STRICT pour tout l'item (le chiffre attribué doit être
// verbatim). Ne dépend plus du seul jugement LLM (invariant dur jamais confié au prompt seul,
// cf. feedback_splitter_deterministe_post_llm). Le SYSTEM_TRUSTED porte DÉJÀ le garde-fou 1
// pour le LLM ; ce backstop est la ceinture déterministe sur le cas courant (chiffre proche
// du cabinet).
//
// ROUND-2 (revue 2026-06-23 finding MEDIUM round-2) : on exige désormais la PROXIMITÉ d'un
// chiffre au nom du cabinet, et on retire « grand view » nu. Avant, une simple mention forçait
// tout l'item en strict → deux régressions de volume :
//  - « a grand view of the skyline » (anglais immobilier/vitrage = cœur métier FilmPro) matchait
//    « grand view » → strict à tort. Retiré au profit de « grandview » / « grand view research ».
//  - « selon McKinsey, le cabinet recommande de… » (name-drop SANS chiffre attribué) forçait
//    strict pour rien. La proximité chiffre+cabinet cible l'INTENTION réelle du garde-fou
//    (un CHIFFRE attribué), pas toute mention.
const MARKET_RESEARCH_FIRM_MARKERS = [
	'mordor', 'fortune business', 'marketsandmarkets', 'markets and markets', 'sns insider',
	'grandview', 'grand view research', 'allied market', 'research and markets', 'researchandmarkets',
	'gii research', 'global industry analysts', 'precedence research', 'statista', 'gartner',
	'mckinsey', 'roland berger', 'frost & sullivan', 'frost and sullivan', 'technavio',
	'euromonitor', 'forrester'
];
// Fenêtre (en caractères) autour du nom du cabinet dans laquelle un chiffre de MARCHÉ est
// considéré « attribué ». Couvre une phrase courte de résumé (« Selon Mordor Intelligence, +6 %
// d'ici 2031 »). Au-delà : couvert par le garde-fou 1 du SYSTEM_TRUSTED (le prompt reste primaire).
const FIRM_FIGURE_PROXIMITY = 160;
// Indice qu'un chiffre voisin est un CHIFFRE DE MARCHÉ (et pas une année, un étage, une température)
// - ROUND-2 re-vérif finding LOW « la fenêtre capte n'importe quel chiffre ». On exige, dans la
// fenêtre, un chiffre ET un indice de marché : %, monnaie, ordre de grandeur, CAGR, « marché ».
//
// ROUND-2 re-vérif finding MEDIUM : frontières CONSCIENTES DES ACCENTS (lookbehind/lookahead sur
// [a-zà-öø-ÿ]). Le `\b` ASCII traitait « é » comme non-mot → « eur » dans « leur », « march » dans
// « démarche », « usd/chf » en sous-chaîne déclenchaient un faux strict. L'entrée est déjà en
// minuscules (mentionsMarketResearchFirm) → pas besoin du flag i. Les symboles %/$/€ n'ont pas de
// frontière (non-lettres). Couvre FR + EN courants.
const LETTER_CLASS = 'a-zà-öø-ÿ';
const MARKET_FIGURE_CUE = new RegExp(
	`%|\\$|€|(?<![${LETTER_CLASS}])(eur|usd|chf|euros?|dollars?|francs?|milliards?|millions?|billions?|md|mrd|mds|bn|cagr|tcac|march[ée]s?|markets?|parts? de march[ée])(?![${LETTER_CLASS}])`
);

/** true si un caractère est une lettre/chiffre ASCII ou accentué (frontière de mot pour le nom). */
function isWordChar(ch: string | undefined): boolean {
	return !!ch && /[a-z0-9à-öø-ÿ]/i.test(ch);
}

/**
 * true si le contenu rédigé de l'item attribue un CHIFFRE DE MARCHÉ à un cabinet d'études nommé
 * (cabinet en frontière de mot ET, dans sa fenêtre de proximité, un chiffre accompagné d'un indice
 * de marché). Exporté pour test. ROUND-2 : frontière de mot (pas de sous-chaîne) + indice de marché
 * (pas une année/un étage) - réduit le faux strict tout en gardant la ceinture sur les vrais chiffres
 * de cabinet ; les cas hors fenêtre restent couverts par le garde-fou 1 du SYSTEM_TRUSTED.
 */
export function mentionsMarketResearchFirm(item: IntelligenceItem): boolean {
	const text =
		`${item.summary ?? ''} ${item.deep_dive ?? ''} ${item.filmpro_relevance ?? ''}`.toLowerCase();
	for (const firm of MARKET_RESEARCH_FIRM_MARKERS) {
		let idx = text.indexOf(firm);
		while (idx !== -1) {
			// Frontière de mot : ni lettre/chiffre juste avant ni juste après (évite « gartner »
			// dans un mot plus large). Les espaces internes des noms multi-mots sont sans effet.
			const before = text[idx - 1];
			const after = text[idx + firm.length];
			if (!isWordChar(before) && !isWordChar(after)) {
				const from = Math.max(0, idx - FIRM_FIGURE_PROXIMITY);
				const to = Math.min(text.length, idx + firm.length + FIRM_FIGURE_PROXIMITY);
				const window = text.slice(from, to);
				if (/\d/.test(window) && MARKET_FIGURE_CUE.test(window)) return true;
			}
			idx = text.indexOf(firm, idx + firm.length);
		}
	}
	return false;
}

// Marqueurs anti-teaser (revue 2026-06-23, finding HIGH-2) : un article paywallé affiche
// souvent une mention explicite d'abonnement. Détectés → on retombe en strict (on ne fait
// pas confiance à un corps qu'on n'a pas pu lire).
const PAYWALL_TEASER_MARKERS = [
	'réservé aux abonnés', 'reserve aux abonnes', 'contenu réservé', 'article réservé',
	"s'abonner pour lire", 'abonnez-vous pour lire', 'pour lire la suite', 'déjà abonné',
	"offre d'abonnement", 'connectez-vous pour lire', 'nur für abonnenten', 'nur fuer abonnenten',
	'jetzt abonnieren', 'subscribe to read', 'this content is for subscribers',
	'create an account to read', 'log in to read',
	// Paywall académique EN (T5 revues : ne sont pas dans PAYWALL_DOMAINS upstream ; primary
	// catch domaine-agnostique - ROUND-2 finding HIGH résiduel, couverture sources trusted hors
	// PAYWALL_DOMAINS). Marqueurs spécifiques (pas « access options » trop large).
	'subscribe to access', 'purchase pdf', 'purchase article', 'buy this article',
	'access through your institution', 'get access to the full'
];

/** true si le texte de page contient un marqueur de paywall/teaser explicite. Exporté pour test. */
export function looksLikePaywallTeaser(pageText: string): boolean {
	const t = (pageText ?? '').toLowerCase();
	return PAYWALL_TEASER_MARKERS.some((m) => t.includes(m));
}

/**
 * Extrait les contenus des blocs <tag>...</tag> de façon LINÉAIRE par balayage `indexOf`
 * (ROUND-2 finding ReDoS : remplace les regex `<tag>([\s\S]*?)</tag>` à backtracking
 * quadratique, ~4-6 s/item sur HTML dégénéré). Tolérant : ignore les `<tagXXX>` (frontière de
 * mot vérifiée), s'arrête à un bloc non fermé, borné par `maxBlocks`. Insensible à la casse.
 */
function extractTagBlocks(html: string, tag: string, maxBlocks = 200): string[] {
	const lower = html.toLowerCase();
	const open = `<${tag}`;
	const close = `</${tag}>`;
	const blocks: string[] = [];
	let scan = 0;
	while (blocks.length < maxBlocks) {
		const openIdx = lower.indexOf(open, scan);
		if (openIdx === -1) break;
		// Frontière de mot : le caractère après `<tag` doit terminer le nom de balise
		// (espace, '>', '/', fin), sinon c'est un autre tag (`<article`≠`<articleX`, `<p`≠`<pre`).
		const boundary = lower[openIdx + open.length] ?? '>';
		if (!(boundary === ' ' || boundary === '>' || boundary === '/' || boundary === '\t' || boundary === '\n' || boundary === '\r')) {
			scan = openIdx + open.length;
			continue;
		}
		const gt = lower.indexOf('>', openIdx + open.length);
		if (gt === -1) break;
		const closeIdx = lower.indexOf(close, gt + 1);
		if (closeIdx === -1) break; // bloc non fermé : on s'arrête (pas de span géant ReDoS-like)
		blocks.push(html.slice(gt + 1, closeIdx));
		scan = closeIdx + close.length;
	}
	return blocks;
}

/**
 * Retire les blocs <tag>...</tag> de façon LINÉAIRE (même motivation ReDoS qu'`extractTagBlocks`).
 * Conserve le reste du HTML (y compris un éventuel bloc final non fermé). Insensible à la casse.
 */
function removeTagBlocks(html: string, tag: string, dropUnclosed = false): string {
	const open = `<${tag}`;
	const close = `</${tag}>`;
	const lower = html.toLowerCase();
	let out = '';
	let cursor = 0; // copié jusqu'ici
	let scan = 0; // position de recherche
	// Borne de sûreté = nb de caractères (scan croît strictement à chaque tour, donc on termine
	// de toute façon par indexOf=-1 ; cette borne ne fait que garantir l'arrêt sans plafonner le
	// traitement réel - fix findings LOW « cap 1000 laisse du chrome/des liens non strippés »).
	let safety = html.length + 1;
	while (safety-- > 0) {
		const openIdx = lower.indexOf(open, scan);
		if (openIdx === -1) break;
		const boundary = lower[openIdx + open.length] ?? '>';
		if (!(boundary === ' ' || boundary === '>' || boundary === '/' || boundary === '\t' || boundary === '\n' || boundary === '\r')) {
			scan = openIdx + open.length;
			continue;
		}
		const closeIdx = lower.indexOf(close, openIdx + open.length);
		if (closeIdx === -1) {
			// Tag non fermé. dropUnclosed (tag NON-CONTENU : script/style/noscript/template) : un
			// ouvrant sans fermant = page tronquée à 200KB en plein <script> JSON-LD → le reste EST
			// le contenu du tag, on le retire jusqu'à la fin (sinon son bruit gonfle la mesure de
			// corps → teaser paywallé resterait 'trusted' - re-vérif bloqueur HIGH). Fail-secure :
			// le corps mesuré tombe → strict (on ne fait pas confiance à une page illisible).
			// Sans dropUnclosed (tag de contenu : nav/aside/a/…) : on garde le reste (pas de sur-retrait).
			if (dropUnclosed) return out + html.slice(cursor, openIdx);
			break;
		}
		out += html.slice(cursor, openIdx);
		cursor = closeIdx + close.length;
		scan = cursor;
	}
	out += html.slice(cursor);
	return out;
}

/**
 * Retire les commentaires HTML <!-- ... --> de façon LINÉAIRE. Pourquoi (ROUND-2 finding bug
 * LOW) : une balise fermante DANS un commentaire (`<!-- </article> -->`) trompait l'extraction,
 * et un <p> commenté gonflait la mesure. On nettoie en amont (stripNonContent).
 */
function removeHtmlComments(html: string): string {
	let out = '';
	let cursor = 0;
	while (true) {
		const start = html.indexOf('<!--', cursor);
		if (start === -1) break;
		out += html.slice(cursor, start);
		const end = html.indexOf('-->', start + 4);
		if (end === -1) return out; // commentaire non fermé : on coupe ici
		cursor = end + 3;
	}
	return out + html.slice(cursor);
}

/**
 * Nettoie le HTML AVANT toute mesure de corps : retire script/style/noscript + commentaires.
 * Sinon un <p>/<article> présent dans un <script> (chaîne JS) ou un commentaire gonfle la mesure
 * (ROUND-2 finding bug MEDIUM « <p> dans <script>/<style>/commentaires → inflation »). ReDoS-safe.
 */
function stripNonContent(html: string): string {
	let s = html;
	// dropUnclosed=true : un de ces tags ouvert sans fermant (troncature 200KB) est retiré jusqu'à
	// la fin - sinon son contenu (JS/CSS) pollue la mesure de corps (re-vérif bloqueur HIGH).
	for (const tag of ['script', 'style', 'noscript', 'template']) s = removeTagBlocks(s, tag, true);
	return removeHtmlComments(s);
}

/** Retire le chrome de page (nav/header/footer/aside) avant mesure. ReDoS-safe. */
function stripPageChrome(html: string): string {
	let s = html;
	for (const tag of ['nav', 'header', 'footer', 'aside']) s = removeTagBlocks(s, tag);
	return s;
}

/**
 * Texte de CORPS d'un scope = texte brut APRÈS retrait des ancres <a> (liens). Pourquoi le
 * retrait des ancres (ROUND-2 re-vérif, bloqueur HIGH + bloqueur MEDIUM) :
 *  - Une zone « à lire aussi » / « recommandés » est faite de LIENS, quel que soit leur balisage
 *    (liens nus <a>, <li><a>, OU <p><a> - pattern CMS Tamedia/WordPress/AMP). Retirer le texte
 *    des <a> fait s'effondrer ces zones → elles ne gonflent plus la mesure (ferme le bloqueur
 *    HIGH : la prémisse « les blocs liés ne sont pas des <p> » était fausse).
 *  - On mesure le TEXTE BRUT (pas seulement les <p>) → un corps rédigé en <div>/<li> SANS <p>
 *    (chapô <p> + corps <div>, AMP) compte enfin (ferme le bloqueur MEDIUM = faux strict round-2).
 * Le corps d'un article réel est de la prose NON liée (peu d'ancres relativement à son texte) →
 * il survit. Résiduel assumé (cadrage §1) : du boilerplate non lié (cookies/newsletter en <p>/<div>
 * hors <aside>) peut subsister ; le marqueur paywall explicite reste la garde primaire, et le GATE
 * (rejet si facts_ok=false) garantit le zéro-hallu indépendamment de cette mesure.
 */
function bodyText(scope: string): string {
	return htmlToPlainText(removeTagBlocks(scope, 'a'));
}

/**
 * Mesure le CORPS RÉEL lisible de l'article pour la garde de confiance (cadrage 5.1).
 *
 * Parmi 3 scopes candidats, retient celui dont le CORPS (texte brut hors ancres, cf. bodyText)
 * est le plus long :
 *  - plus grand bloc <article>, plus grand bloc <main> (corps sémantique),
 *  - page entière chrome-strippée (filet quand un CMS n'enveloppe qu'un chapô dans un <article>
 *    minuscule - AMP/WordPress ; ferme le faux strict « <article> minuscule »).
 * Le HTML est d'abord nettoyé (stripNonContent : script/style/noscript/commentaires) pour qu'un
 * <p>/<article> injecté en chaîne JS ou commenté ne gonfle pas la mesure. Extraction 100 %
 * linéaire (indexOf, pas de regex à backtracking - finding ReDoS).
 *
 * Sert UNIQUEMENT à jauger « corps réel lisible » ; le vérificateur reçoit toujours le pageText
 * complet (il doit voir tout l'article). Exporté pour test.
 */
export function articleBodyText(html: string): string {
	const cleaned = stripNonContent(html);
	const candidates: string[] = [];
	const articleBlocks = extractTagBlocks(cleaned, 'article');
	const mainBlocks = extractTagBlocks(cleaned, 'main');
	if (articleBlocks.length) candidates.push(articleBlocks.reduce((a, b) => (b.length > a.length ? b : a)));
	if (mainBlocks.length) candidates.push(mainBlocks.reduce((a, b) => (b.length > a.length ? b : a)));
	candidates.push(stripPageChrome(cleaned)); // toujours présent (filet chapô minuscule)
	let best = '';
	for (const c of candidates) {
		const t = bodyText(c);
		if (t.length > best.length) best = t;
	}
	return best;
}

function hostOf(url: string): string {
	try {
		return new URL(url).hostname;
	} catch {
		return '';
	}
}

/**
 * Régime de vérification EFFECTIF d'un item = régime du DOMAINE (source-allowlist),
 * rabaissé à 'strict' si la page est une rubrique sponsorisée / d'opinion (5.2). Le
 * garde paywall (corps trop maigre) est appliqué en aval dans crossCheckItem (il
 * nécessite le contenu fetché). Exporté pour test.
 */
export function effectiveRegime(
	item: IntelligenceItem,
	sources: SourcesBundle = getFallbackSourcesBundle()
): VerificationRegime {
	const base = sources.regimeOf(hostOf(item.source.url));
	if (base === 'strict') return 'strict';
	if (isSponsoredOrOpinion(item.source.url, item.title)) return 'strict';
	// Garde-fou 1 déterministe : un item qui nomme un cabinet d'études repasse strict
	// (le chiffre attribué doit être verbatim), sans dépendre du seul prompt.
	if (mentionsMarketResearchFirm(item)) return 'strict';
	return base;
}

/**
 * Plancher de PROSE (somme des <p>, mesure ROUND-2) pour accorder la confiance (cadrage 5.1,
 * garde paywall). Sous ce plancher, le corps lisible est trop maigre pour constater une
 * contradiction de façon fiable → on retombe en strict.
 *
 * ROUND-2 (revue 2026-06-23 finding HIGH régression volume) : abaissé 1200 → 350. À 1200 le
 * plancher rabaissait en strict les BRÈVES D'AGENCE courtes mais fiables (keystone-sda/ats/rts,
 * ~400-900 chars de prose) - précisément le format RTS qui a sauvé W25 → re-creusait le volume.
 * La défense paywall PRIMAIRE est désormais le marqueur explicite (looksLikePaywallTeaser,
 * domaine-agnostique) + le rejet upstream des PAYWALL_DOMAINS (url-verify, body < 5KB). Ce
 * plancher n'est plus que le filet pour un corps quasi vide sans marqueur. Risque résiduel
 * assumé (cadrage §1, décision Pascal) : un teaser non marqué de 350-900 chars de prose sur une
 * source reconnue hors PAYWALL_DOMAINS reste « confiance » - narrow, et strict ≠ exclusion.
 */
const TRUSTED_BODY_MIN_CHARS = 350;

// Exporté pour test (vérifie que la lecture FilmPro est bien soumise au vérificateur,
// fermeture de la brèche « entité externe fabriquée dans le so-what » - revue 2026-06-22).
export function buildUserPrompt(item: IntelligenceItem, pageText: string): string {
	const parts = [
		`# Item à vérifier`,
		`URL source : ${item.source.url}`,
		`Source name : ${item.source.name}`,
		`Date publiée déclarée : ${item.source.published_at}`,
		`Titre : ${item.title}`,
		``,
		`## Résumé proposé (faits à vérifier contre la page)`,
		item.summary,
		item.deep_dive ? `\n## Deep dive proposé\n${item.deep_dive}` : '',
		// La lecture FilmPro (so-what) est de l'interprétation, MAIS ses faits EXTERNES
		// (entreprise nommée, AO, événement, chiffre d'actualité) doivent être sourcés -
		// cf. SYSTEM « Champs à vérifier ». Soumise pour fermer la brèche entité fabriquée.
		item.filmpro_relevance
			? `\n## Lecture FilmPro (so-what, interprétation - vérifier UNIQUEMENT ses faits externes)\n${item.filmpro_relevance}`
			: ''
	];
	parts.push(``, `## Contenu réel de la page (extrait)`, pageText);
	return parts.join('\n');
}

// Zod schema pour valider le verdict retourné par le LLM (audit Low #2).
// Sans ce check, un LLM qui omet `severity` faisait passer un fatal pour minor
// (severity=undefined → !== 'fatal' → considéré minor → item gardé halluciné).
const VerdictSchema = z.object({
	facts_ok: z.boolean(),
	divergences: z.array(
		z.object({
			quoted: z.string(),
			found: z.string().nullable(),
			severity: z.enum(['fatal', 'minor'])
		})
	),
	confidence: z.enum(['high', 'medium', 'low']).default('medium')
});

export interface CrossCheckOptions {
	anthropicApiKey: string;
	/** Si true, items dont la page n'est pas fetchable sont rejetés. Défaut false (conservés). */
	rejectUnfetchable?: boolean;
	/** Max appels SDK Anthropic + fetch concurrents. Défaut 4 (audit Medium #2). */
	concurrency?: number;
	/**
	 * Tracker de coûts à alimenter (audit 360 M-05 : DI explicite plutôt que
	 * le singleton module-level, pour isoler des invocations concurrentes).
	 * Défaut : le singleton `costTracker` (rétrocompat).
	 */
	tracker?: CostTracker;
	/**
	 * Bundle sources actives (chargé depuis `veille_sources` par sources-loader).
	 * Optionnel pour rétrocompat tests. Si absent, fallback seed (= photo exacte
	 * du code) — le cron prod fournit le bundle chargé en amont (run-generation).
	 */
	sources?: SourcesBundle;
}

const DEFAULT_CONCURRENCY = 4;
// 4 tentatives (audit 360 quick-win) : 2 pouvaient ne pas absorber un pic de
// surcharge 529 sur un batch de 12-15 items ; 4 est sans risque et documenté
// (la 1re tentative + 3 relances espacées par backoff exponentiel).
const ANTHROPIC_MAX_RETRIES = 4;
const ANTHROPIC_RETRY_BASE_MS = 1500;

/**
 * Retryable LLM call : retry sur 429 (rate limit) et 529 (overloaded) avec
 * backoff exponentiel. Audit Medium #2.
 */
async function callVerifierWithRetry(
	client: Anthropic,
	item: IntelligenceItem,
	pageText: string,
	system: string
): Promise<Anthropic.Message> {
	let lastError: unknown;
	for (let attempt = 0; attempt <= ANTHROPIC_MAX_RETRIES; attempt++) {
		try {
			return await client.messages.create({
				model: CROSS_CHECK_MODEL,
				max_tokens: CROSS_CHECK_MAX_TOKENS,
				system,
				tools: [VERDICT_TOOL],
				tool_choice: { type: 'tool', name: 'emit_verdict' },
				messages: [{ role: 'user', content: buildUserPrompt(item, pageText) }]
			});
		} catch (e) {
			lastError = e;
			const status =
				typeof e === 'object' && e !== null && 'status' in e
					? (e as { status: unknown }).status
					: null;
			const retryable = status === 429 || status === 529 || status === 503;
			if (!retryable || attempt === ANTHROPIC_MAX_RETRIES) throw e;
			const delay = ANTHROPIC_RETRY_BASE_MS * Math.pow(2, attempt);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}
	throw lastError;
}

/**
 * Pool de concurrence simple : exécute un batch de tâches avec un cap de N
 * en parallèle. Évite la dep `p-limit`. Audit Medium #2.
 */
async function runWithConcurrency<T, R>(
	items: T[],
	concurrency: number,
	worker: (item: T) => Promise<R>
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let next = 0;
	const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
		while (true) {
			const idx = next++;
			if (idx >= items.length) return;
			results[idx] = await worker(items[idx]);
		}
	});
	await Promise.all(runners);
	return results;
}

/**
 * Cause d'un cross-check sans verdict exploitable, DISCRIMINÉE (levier sourcing 2026-06-23).
 * La distinction est nécessaire au trust-by-source : seul un échec qui est une PROPRIÉTÉ DE LA
 * SOURCE autorise un keep par confiance ; un échec de NOTRE vérificateur ne le fait jamais.
 *  - 'dead_page'      : page non re-fetchable / vide (réseau, 404, soft-404, shell JS-only, mur
 *                       cookie, < 200 chars). Propriété de la source → éligible au trust-by-source
 *                       si le domaine est 'trusted'.
 *  - 'verifier_failed': NOTRE vérificateur a tourné mais n'a pas produit de verdict exploitable
 *                       (pas de tool_use emit_verdict, ou verdict non conforme Zod). Échec de
 *                       notre côté → JAMAIS de trust-keep (cohérent avec apiError).
 */
export type CrossCheckMiss = 'dead_page' | 'verifier_failed';

/**
 * Cross-check un item : fetch + LLM verdict.
 * Retourne un CrossCheckVerdict, ou un CrossCheckMiss discriminé si pas de verdict exploitable.
 */
export async function crossCheckItem(
	client: Anthropic,
	item: IntelligenceItem,
	tracker: CostTracker = costTracker,
	sources?: SourcesBundle
): Promise<CrossCheckVerdict | CrossCheckMiss> {
	const html = await fetchPageContent(item.source.url);
	if (!html) return 'dead_page';
	const pageText = htmlToPlainText(html);
	if (pageText.length < 200) return 'dead_page'; // page trop pauvre/morte pour vérifier

	// Régime de vérification (cadrage trust-by-source 2026-06-23, durci ROUND-2). Garde paywall
	// (5.1) : une source fiable dont seul un teaser est lisible NE bénéficie PAS de la confiance
	// (on ne peut pas constater de contradiction de façon fiable) → on retombe en strict. Deux
	// signaux, en OU :
	//  - PRIMAIRE : marqueur de paywall explicite dans le pageText (looksLikePaywallTeaser),
	//    domaine-agnostique, robuste au chrome.
	//  - FILET : prose réelle trop maigre (articleBodyText mesure la somme des <p> du meilleur
	//    scope, ReDoS-safe et insensible au chrome interne « à lire aussi » - finding HIGH
	//    résiduel ; max-sur-scopes contre le <article> minuscule - finding MEDIUM).
	let regime = effectiveRegime(item, sources);
	if (regime !== 'strict') {
		const bodyLen = articleBodyText(html).length;
		if (looksLikePaywallTeaser(pageText) || bodyLen < TRUSTED_BODY_MIN_CHARS) {
			regime = 'strict';
		}
	}

	const response = await callVerifierWithRetry(client, item, pageText, systemForRegime(regime));

	tracker.addClaudeCall(CROSS_CHECK_MODEL, response.usage, 'Cross-check verbatim');

	const block = response.content.find(
		(b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'emit_verdict'
	);
	if (!block) return 'verifier_failed';

	// Validation Zod stricte du verdict (audit Low #2). Si le LLM retourne un
	// objet non conforme (severity manquant, divergences malformées), on traite
	// comme verdict invalide → null (= unverifiable côté caller).
	const parsed = VerdictSchema.safeParse(block.input);
	if (!parsed.success) return 'verifier_failed';
	return parsed.data;
}

export async function crossCheckBatch(
	items: IntelligenceItem[],
	opts: CrossCheckOptions
): Promise<CrossCheckResult> {
	if (items.length === 0) {
		return { kept: [], rejected: [], unverifiable: [], apiErrorCount: 0, keptByTrust: 0 };
	}
	const client = new Anthropic({ apiKey: opts.anthropicApiKey });
	const concurrency = opts.concurrency ?? DEFAULT_CONCURRENCY;
	const tracker = opts.tracker ?? costTracker;
	// Sources bundle résolu UNE fois pour tout le batch (fallback seed = code).
	const sources = opts.sources ?? getFallbackSourcesBundle();

	// Pool de concurrence (audit Medium #2) : limite N appels Anthropic en parallèle
	// pour éviter rate-limit 429 + DoS amplification fetch sortants.
	//
	// RÉSILIENCE PAR-ITEM (audit 360 racine 2026-06-19) : une exception de la
	// vérification d'UN item (crédit épuisé, 400, réseau, auth...) ne fait PLUS
	// échouer tout le batch (anti-pattern tout-ou-rien W23 déplacé au second-pass).
	// Elle est capturée et classée. L'item non vérifié n'est JAMAIS publié
	// (garantie zéro-hallu préservée) : il est rejeté/unverifiable comme une page
	// morte, selon rejectUnfetchable.
	const outcomes = await runWithConcurrency(items, concurrency, async (item) => {
		try {
			const verdict = await crossCheckItem(client, item, tracker, sources);
			return { item, verdict, apiError: null as ClassifiedApiError | null };
		} catch (e) {
			return {
				item,
				verdict: null as CrossCheckVerdict | CrossCheckMiss | null,
				apiError: classifyApiError(e)
			};
		}
	});

	const kept: IntelligenceItem[] = [];
	const rejected: CrossCheckRejectedItem[] = [];
	const unverifiable: IntelligenceItem[] = [];
	let apiErrorCount = 0;
	let keptByTrust = 0;
	let firstApiError: ClassifiedApiError | null = null;

	for (const { item, verdict, apiError } of outcomes) {
		// Cas 1 : exception côté API verifier → impossible de vérifier. Jamais publié
		// (zéro-hallu). Traité comme non-vérifiable, comptabilisé pour le diagnostic
		// systémique.
		if (apiError) {
			apiErrorCount++;
			if (!firstApiError) firstApiError = apiError;
			if (opts.rejectUnfetchable) {
				rejected.push({
					url: item.source.url,
					title: item.title,
					verdict: { facts_ok: false, divergences: [], confidence: 'low' }
				});
			} else {
				unverifiable.push(item);
			}
			continue;
		}
		// Cas 2a : NOTRE vérificateur n'a pas produit de verdict exploitable
		// ('verifier_failed' : pas de tool_use emit_verdict, ou verdict non conforme Zod).
		// (Le `=== null` est une garde de typage : il ne survient qu'avec apiError, déjà
		// traité au cas 1 ; en filet on le traite ici comme un échec de notre côté.)
		// Échec de NOTRE côté, PAS une propriété de la source → JAMAIS de trust-keep
		// (cohérent avec l'apiError). Rejeté sous rejectUnfetchable, sinon non-vérifiable.
		if (verdict === 'verifier_failed' || verdict === null) {
			if (opts.rejectUnfetchable) {
				rejected.push({
					url: item.source.url,
					title: item.title,
					verdict: { facts_ok: false, divergences: [], confidence: 'low' }
				});
			} else {
				unverifiable.push(item);
			}
			continue;
		}
		// Cas 2b : page authentiquement non re-fetchable / vide ('dead_page' : réseau, 404,
		// soft-404, shell JS, mur cookie, < 200 chars). Cas fréquent des pages officielles
		// .ch/.admin.ch et RTS (audit sourcing 2026-06-23).
		//
		// TRUST-BY-SOURCE (levier sourcing W26) : la décision garder/rejeter respecte le
		// RÉGIME DU DOMAINE (le même qui régit déjà la sévérité du cross-check des pages
		// fetchables) :
		//  - régime 'trusted'/'trusted_advocacy' (T1 officiel, T2 presse pro, T4 presse
		//    qualité, T5 acad) : sous ce régime un fait n'est rejeté que s'il est CONTREDIT
		//    par la page ; une page absente ne contredit rien → l'item est CONSERVÉ, marqué
		//    content_reverified=false (traçabilité + relecture). Extension cohérente du modèle.
		//  - régime 'strict' (domaine inconnu/hors-tier, preprint, sponsorisé/opinion,
		//    cabinet d'études) : strict exige une confirmation POSITIVE, absente ici → REJET
		//    (inchangé). effectiveRegime() rabaisse déjà sponsorisé/opinion/market-research.
		// Le gate facts_ok (cas 3) et l'apiError (cas 1) ne sont PAS touchés. Seule une
		// page authentiquement morte d'une source fiable bénéficie du keep.
		if (verdict === 'dead_page') {
			if (opts.rejectUnfetchable) {
				if (effectiveRegime(item, sources) !== 'strict') {
					keptByTrust++;
					kept.push({
						...item,
						verification: {
							...(item.verification ?? { url_ok: true, unverified_entities: [] }),
							content_reverified: false
						}
					});
				} else {
					rejected.push({
						url: item.source.url,
						title: item.title,
						verdict: { facts_ok: false, divergences: [], confidence: 'low' }
					});
				}
			} else {
				unverifiable.push(item);
			}
			continue;
		}
		// Cas 3 : vérifié. Audit 360 H-04 (zéro hallu strict) : rejet dès que
		// facts_ok=false, indépendamment des divergences (peut être [] ou minor
		// uniquement). Le LLM signale facts_ok=false quand un fait du résumé n'est pas
		// confirmé par la page, même sans divergence détaillée → brèche fermée. Le GATE
		// est INCHANGÉ par le recalibrage faits/interprétation (2026-06-22) : seul le
		// CRITÈRE qui amène le LLM à poser facts_ok=false a changé (faits seuls, plus
		// la présence verbatim de chaque phrase d'analyse).
		if (!verdict.facts_ok) {
			rejected.push({ url: item.source.url, title: item.title, verdict });
		} else {
			kept.push(item);
		}
	}

	// Échec SYSTÉMIQUE : TOUS les items ont échoué côté API verifier (aucune
	// vérification possible). Ce n'est pas un problème de contenu mais
	// d'infrastructure (crédit dédié épuisé, clé invalide, API down). L'appelant
	// alerte distinctement plutôt que de publier une édition vide en silence.
	const systemicError =
		apiErrorCount === items.length && firstApiError
			? { kind: firstApiError.kind, message: firstApiError.message }
			: undefined;

	return { kept, rejected, unverifiable, apiErrorCount, keptByTrust, systemicError };
}
