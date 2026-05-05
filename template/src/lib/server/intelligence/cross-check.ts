// Cross-check LLM second-pass pour la veille FilmPro (refonte 2026-05-05).
//
// Pour chaque item rescapé du filtre URL/date, on :
// 1. Refetch la page source (HTML brut, limité à 200KB).
// 2. Demande à Sonnet 4.6 (modèle vérificateur, peu coûteux) de valider
//    verbatim chaque chiffre, date, citation, entité du summary contre la page.
// 3. Si le verdict est `verbatim_ok=false` → item rejeté (hallucination).
//
// Origine : audit W18 a montré qu'un LLM générateur peut paraphraser un chiffre
// en perturbant les décimales sans déclencher aucun check (ex: 2,88 Mds USD →
// 2,66 Mds USD côté Mordor, item rank 5). Le générateur ne peut pas s'auto-corriger
// sous pression de volume ; il faut un valideur EXTERNE avec accès au texte réel.

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { IntelligenceItem } from './schema';
import { costTracker } from './cost-tracker';
import { isSafeUrlForFetch } from './url-guard';

const CROSS_CHECK_MODEL = 'claude-sonnet-4-6';
const CROSS_CHECK_MAX_TOKENS = 1500;
const PAGE_FETCH_TIMEOUT_MS = 12000;
const PAGE_BODY_MAX_BYTES = 200 * 1024; // 200KB
const USER_AGENT =
	'Mozilla/5.0 (compatible; FilmProBot/1.0; +https://filmpro-crm.vercel.app)';

export interface CrossCheckDivergence {
	quoted: string;
	found: string | null;
	severity: 'fatal' | 'minor';
}

export interface CrossCheckVerdict {
	verbatim_ok: boolean;
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
 * Extrait grossièrement le texte d'un HTML pour le cross-check :
 * - retire scripts, styles, balises HTML
 * - normalise les whitespaces
 * - tronque à 60KB de texte (largement suffisant pour un article)
 */
export function htmlToPlainText(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
		.replace(/<!--[\s\S]*?-->/g, ' ')
		.replace(/<[^>]+>/g, ' ')
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
		'Émet le verdict de cross-check verbatim entre le résumé proposé et le contenu réel de la page.',
	input_schema: {
		type: 'object',
		required: ['verbatim_ok', 'divergences', 'confidence'],
		properties: {
			verbatim_ok: {
				type: 'boolean',
				description:
					'true SI tous les chiffres précis (avec décimales), dates, noms d\'entreprises et citations littérales du résumé sont présents verbatim ou avec une équivalence évidente dans le contenu de la page. false dès qu\'au moins UNE divergence factuelle (chiffre faux, citation fabriquée, entité absente, date inventée) est détectée. Les paraphrases stylistiques fidèles ne comptent PAS comme divergence.'
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
							description: 'Le passage du résumé qui pose problème (citation littérale).'
						},
						found: {
							type: ['string', 'null'],
							description:
								'Le passage correspondant dans la page (verbatim) si trouvé, ou null si le fait est totalement absent.'
						},
						severity: {
							type: 'string',
							enum: ['fatal', 'minor'],
							description:
								'fatal = chiffre faux, citation fabriquée, entité inventée, date inventée. minor = paraphrase légèrement enrichie, source secondaire non citée.'
						}
					}
				}
			},
			confidence: {
				type: 'string',
				enum: ['high', 'medium', 'low'],
				description:
					'high = page lisible et résumé clairement vérifiable. medium = page partielle ou résumé ambigu. low = page peu lisible ou hors-contexte.'
			}
		}
	}
};

const SYSTEM = `Tu es un valideur factuel pour un module de veille hebdomadaire B2B.
Ta mission : détecter toute hallucination dans le résumé d'un item de veille en le comparant à la page source réelle.

Règles strictes :
- Tout chiffre présent dans le résumé (montant, pourcentage, CAGR, surface, date, durée, etc.) DOIT apparaître verbatim ou avec une équivalence évidente dans la page. Une perturbation des décimales (ex: 2,66 Md vs 2,88 Md sur la page) = divergence fatale.
- Toute citation entre guillemets ou marquée <cite> DOIT correspondre à un passage présent verbatim dans la page.
- Tout nom d'entreprise, personne, lieu spécifique cité comme source DOIT être présent dans la page.
- Une paraphrase stylistique fidèle au sens et aux faits = ACCEPTABLE (pas une divergence).
- Une affirmation ajoutée par le résumé qui n'est pas dans la page = divergence fatale.

Tu réponds UNIQUEMENT via le tool emit_verdict. Pas de markdown, pas de préambule.`;

function buildUserPrompt(item: IntelligenceItem, pageText: string): string {
	const parts = [
		`# Item à vérifier`,
		`URL source : ${item.source.url}`,
		`Source name : ${item.source.name}`,
		`Date publiée déclarée : ${item.source.published_at}`,
		`Titre : ${item.title}`,
		``,
		`## Résumé proposé (à vérifier mot pour mot)`,
		item.summary,
		item.deep_dive ? `\n## Deep dive proposé\n${item.deep_dive}` : ''
	];
	parts.push(``, `## Contenu réel de la page (extrait)`, pageText);
	return parts.join('\n');
}

// Zod schema pour valider le verdict retourné par le LLM (audit Low #2).
// Sans ce check, un LLM qui omet `severity` faisait passer un fatal pour minor
// (severity=undefined → !== 'fatal' → considéré minor → item gardé halluciné).
const VerdictSchema = z.object({
	verbatim_ok: z.boolean(),
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
}

const DEFAULT_CONCURRENCY = 4;
const ANTHROPIC_MAX_RETRIES = 2;
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
	item: IntelligenceItem
): Promise<CrossCheckVerdict | null> {
	const html = await fetchPageContent(item.source.url);
	if (!html) return null;
	const pageText = htmlToPlainText(html);
	if (pageText.length < 200) return null; // page trop pauvre pour vérifier

	const response = await callVerifierWithRetry(client, item, pageText);

	costTracker.addClaudeCall(CROSS_CHECK_MODEL, response.usage, 'Cross-check verbatim');

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
		return { kept: [], rejected: [], unverifiable: [] };
	}
	const client = new Anthropic({ apiKey: opts.anthropicApiKey });
	const concurrency = opts.concurrency ?? DEFAULT_CONCURRENCY;

	// Pool de concurrence (audit Medium #2) : limite N appels Anthropic en parallèle
	// pour éviter rate-limit 429 + DoS amplification fetch sortants.
	const verdicts = await runWithConcurrency(items, concurrency, async (item) => ({
		item,
		verdict: await crossCheckItem(client, item)
	}));

	const kept: IntelligenceItem[] = [];
	const rejected: CrossCheckRejectedItem[] = [];
	const unverifiable: IntelligenceItem[] = [];

	for (const { item, verdict } of verdicts) {
		if (verdict === null) {
			if (opts.rejectUnfetchable) {
				rejected.push({
					url: item.source.url,
					title: item.title,
					verdict: { verbatim_ok: false, divergences: [], confidence: 'low' }
				});
			} else {
				unverifiable.push(item);
			}
			continue;
		}
		// Reject UNIQUEMENT si verbatim_ok=false ET au moins une divergence fatale.
		// Les minor sont laissées passer (paraphrases acceptables).
		const hasFatal = verdict.divergences.some((d) => d.severity === 'fatal');
		if (!verdict.verbatim_ok && hasFatal) {
			rejected.push({ url: item.source.url, title: item.title, verdict });
		} else {
			kept.push(item);
		}
	}

	return { kept, rejected, unverifiable };
}
