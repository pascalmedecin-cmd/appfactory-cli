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
// VOIX D'ANALYSTE — les phrases d'interprétation / « so what » ne sont jamais
// littéralement dans un article et étaient flaggées hallucination → 4 items locaux
// vivants jetés en W25). Il juge désormais « le résumé invente-t-il ou déforme-t-il
// un FAIT ? ». Les chiffres/dates/noms/citations restent vérifiés à l'identique
// (protection W18 INTACTE) ; l'interprétation cohérente passe. Le GATE déterministe
// (rejet si `facts_ok=false`, y compris divergences vides — brèche H-04 fermée) est
// INCHANGÉ : seul le CRITÈRE du vérificateur (le SYSTEM prompt) évolue.
// Voir .product-architect/veille/refonte-lot1-lot2-spec.md (AC-1).

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { IntelligenceItem } from './schema';
import { costTracker, type CostTracker } from './cost-tracker';
import { isSafeUrlForFetch } from './url-guard';

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
	 * vérificateur : crédit épuisé, auth, surcharge, réseau) — distinct d'une page
	 * morte (unfetchable) qui est un problème de contenu. Sert à distinguer un
	 * échec systémique d'un rejet de contenu.
	 */
	apiErrorCount: number;
	/**
	 * Présent UNIQUEMENT si TOUS les items ont échoué côté API verifier (aucune
	 * vérification possible). Signal d'un incident systémique (crédit dédié épuisé,
	 * clé invalide, API down) à remonter en alerte distincte — surtout PAS publier
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
		const res = await fetch(url, {
			method: 'GET',
			signal: controller.signal,
			headers: {
				'User-Agent': USER_AGENT,
				Accept: 'text/html,application/xhtml+xml',
				Range: `bytes=0-${PAGE_BODY_MAX_BYTES - 1}`
			},
			redirect: 'follow'
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
	return decodeNumericEntities(
		html
			.replace(/<script[\s\S]*?<\/script>/gi, ' ')
			.replace(/<style[\s\S]*?<\/style>/gi, ' ')
			.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
			.replace(/<!--[\s\S]*?-->/g, ' ')
			.replace(/<[^>]+>/g, ' ')
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
					"true SI aucun FAIT VÉRIFIABLE du résumé n'est fabriqué ni déformé : tous les chiffres (avec décimales/unités), dates, noms propres et citations entre guillemets sont présents verbatim ou avec une équivalence évidente dans la page, et aucune affirmation factuelle spécifique n'est contredite par la page. false dès qu'au moins UN fait est fabriqué ou déformé (et tu le listes alors dans divergences en severity='fatal'). Les phrases d'INTERPRÉTATION / d'analyse / de mise en perspective (le « so what ») qui n'introduisent aucun fait vérifiable nouveau ne réduisent JAMAIS facts_ok."
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
								"fatal = FAIT fabriqué ou déformé (chiffre faux, citation inventée, entité absente, énumération étendue, date inventée, fait contredit). minor = paraphrase fidèle / nuance secondaire (informatif, ne rejette pas). N'inscris JAMAIS ici une phrase d'interprétation : si elle n'a pas de fait vérifiable, ce n'est pas une divergence."
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

const SYSTEM = `Tu es un VÉRIFICATEUR FACTUEL pour une veille sectorielle B2B rédigée par un analyste sénior.
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
- Les phrases d'ANALYSE, d'INTERPRÉTATION, d'IMPLICATION, de mise en perspective — le « so what » — qui n'introduisent AUCUN fait vérifiable nouveau. Exemple à IGNORER : « cela confirme la pression estivale croissante sur les bâtiments très vitrés » (interprétation, aucun chiffre/nom/date/citation/exclusivité).
- Les paraphrases fidèles au sens et aux faits.
- La généralisation prudente cohérente avec la page (« la sensibilité au sujet augmente ») — distincte d'une exclusivité/antériorité affirmée.
- Les capacités produit de FilmPro et les catégories de cibles génériques de la lecture FilmPro (voir « Champs à vérifier »).

# Règle d'or
En cas de doute sur la nature d'une phrase (fait vs interprétation), considère-la comme INTERPRÉTATION (ne pas flagger) SAUF si elle contient un chiffre, un nom propre, une date, une citation précis, OU une affirmation d'exclusivité / d'antériorité / de tendance présentée comme un fait. Tu ne pénalises jamais une phrase parce qu'elle est « interprétative » ou « pas confirmée mot-pour-mot » : tu la pénalises UNIQUEMENT si elle contient un fait FABRIQUÉ ou DÉFORMÉ.

facts_ok = true si AUCUN fait fabriqué/déformé. facts_ok = false dès qu'au moins UN fait l'est (listé en 'fatal').

Tu réponds UNIQUEMENT via le tool emit_verdict. Pas de markdown, pas de préambule.`;

// Exporté pour test (vérifie que la lecture FilmPro est bien soumise au vérificateur,
// fermeture de la brèche « entité externe fabriquée dans le so-what » — revue 2026-06-22).
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
		// (entreprise nommée, AO, événement, chiffre d'actualité) doivent être sourcés —
		// cf. SYSTEM « Champs à vérifier ». Soumise pour fermer la brèche entité fabriquée.
		item.filmpro_relevance
			? `\n## Lecture FilmPro (so-what, interprétation — vérifier UNIQUEMENT ses faits externes)\n${item.filmpro_relevance}`
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
	pageText: string
): Promise<Anthropic.Message> {
	let lastError: unknown;
	for (let attempt = 0; attempt <= ANTHROPIC_MAX_RETRIES; attempt++) {
		try {
			return await client.messages.create({
				model: CROSS_CHECK_MODEL,
				max_tokens: CROSS_CHECK_MAX_TOKENS,
				system: SYSTEM,
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
 * Cross-check un item : fetch + LLM verdict.
 * Retourne null si la page n'a pas pu être fetchée (item à conserver par défaut).
 */
export async function crossCheckItem(
	client: Anthropic,
	item: IntelligenceItem,
	tracker: CostTracker = costTracker
): Promise<CrossCheckVerdict | null> {
	const html = await fetchPageContent(item.source.url);
	if (!html) return null;
	const pageText = htmlToPlainText(html);
	if (pageText.length < 200) return null; // page trop pauvre pour vérifier

	const response = await callVerifierWithRetry(client, item, pageText);

	tracker.addClaudeCall(CROSS_CHECK_MODEL, response.usage, 'Cross-check verbatim');

	const block = response.content.find(
		(b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'emit_verdict'
	);
	if (!block) return null;

	// Validation Zod stricte du verdict (audit Low #2). Si le LLM retourne un
	// objet non conforme (severity manquant, divergences malformées), on traite
	// comme verdict invalide → null (= unverifiable côté caller).
	const parsed = VerdictSchema.safeParse(block.input);
	if (!parsed.success) return null;
	return parsed.data;
}

export async function crossCheckBatch(
	items: IntelligenceItem[],
	opts: CrossCheckOptions
): Promise<CrossCheckResult> {
	if (items.length === 0) {
		return { kept: [], rejected: [], unverifiable: [], apiErrorCount: 0 };
	}
	const client = new Anthropic({ apiKey: opts.anthropicApiKey });
	const concurrency = opts.concurrency ?? DEFAULT_CONCURRENCY;
	const tracker = opts.tracker ?? costTracker;

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
			const verdict = await crossCheckItem(client, item, tracker);
			return { item, verdict, apiError: null as ClassifiedApiError | null };
		} catch (e) {
			return { item, verdict: null as CrossCheckVerdict | null, apiError: classifyApiError(e) };
		}
	});

	const kept: IntelligenceItem[] = [];
	const rejected: CrossCheckRejectedItem[] = [];
	const unverifiable: IntelligenceItem[] = [];
	let apiErrorCount = 0;
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
		// Cas 2 : page non fetchable (contenu mort).
		if (verdict === null) {
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

	return { kept, rejected, unverifiable, apiErrorCount, systemicError };
}
