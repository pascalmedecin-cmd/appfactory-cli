import Anthropic from '@anthropic-ai/sdk';
import {
	IntelligenceReportSchema,
	type IntelligenceReport,
	type IntelligenceItem
} from './schema';
import {
	SYSTEM_PROMPT,
	buildUserPrompt,
	REPORT_JSON_SCHEMA,
	type PreviousItem
} from './prompt';
import { verifyUrl } from './url-verify';
import { sanitizeUrlsBatch } from './url-sanitize';
import { isDeniedSource, getDomainTier } from './source-allowlist';
import { parseFlexibleDate, isWithinWindow } from './parse-date';
import { costTracker, type CostSummary } from './cost-tracker';

const MODEL = 'claude-opus-4-7';
// 32K : run prod S112 retry 1 a été coupé par max_tokens à 16K (12K thinking
// + 13 web_search + emit_report partiel = items=[] alors que executive_summary
// décrivait des signaux). 32K laisse marge pour adaptive thinking xhigh + 15
// web_search + emit_report avec 5-10 items pleins.
const MAX_TOKENS = 32000;
const WEB_SEARCH_MAX_USES = 15;

export interface GenerateInput {
	weekLabel: string;
	dateStart: string;
	dateEnd: string;
	/** Début de fenêtre de vérification (tolérance délai indexation). Défaut = dateStart. */
	windowStart?: string;
	/** Items des 4 dernières éditions pour anti-doublons intelligent. */
	previousItems: PreviousItem[];
	/** Tolérance fenêtre vérification en jours (default 30). Propagé au user prompt. */
	windowDays: number;
}

export interface RejectedItem {
	url: string;
	title: string;
	reason:
		| 'invalid_url'
		| 'http_error'
		| 'paywall'
		| 'timeout'
		| 'network'
		| 'date_out_of_window'
		| 'denied_source';
	detail?: string;
}

export interface GenerateResult {
	success: boolean;
	report?: IntelligenceReport;
	error?: string;
	raw?: unknown;
	/** Coûts agrégés de l'invocation (Claude API). */
	costs?: CostSummary;
	/** Items rejetés par sanitize/verify pre-publish (pour relance volume + audit). */
	rejected?: RejectedItem[];
	/** Compteur d'URLs sanitizées (suffixes parasites strippés). */
	sanitizedUrlsCount?: number;
}

async function callModel(
	client: Anthropic,
	input: GenerateInput
): Promise<Anthropic.Message> {
	const tools: Anthropic.Tool[] = [
		{
			type: 'web_search_20250305',
			name: 'web_search',
			max_uses: WEB_SEARCH_MAX_USES,
			// Bias géographique vers la Suisse pour que les recherches retournent
			// en priorité des sources locales (sites .ch, presse romande). Sans ce
			// paramètre, le moteur revient à Google standard et privilégie les
			// résultats France/EN les mieux référencés.
			user_location: {
				type: 'approximate',
				country: 'CH',
				region: 'Vaud',
				city: 'Lausanne',
				timezone: 'Europe/Zurich'
			},
			// Filtre négatif : sources observées comme bruyantes ou bas de gamme
			// dans les runs S112 (rapports génériques, annuaires, ag3-immobilier
			// avec URL malformée, optimhome blog SEO bas qualité). Pas de
			// allowed_domains (on veut garder le monde ouvert pour innovations).
			blocked_domains: [
				'natlawreview.com',
				'optimhome.com',
				'hellopro.fr',
				'ag3-immobilier.fr',
				'centralmedia.fr',
				'indexbox.io',
				'giiresearch.com',
				'monimmeuble.com',
				'labomaison.com'
			]
		} as unknown as Anthropic.Tool,
		{
			name: 'emit_report',
			description:
				"Émettre l'édition hebdomadaire finale conforme au schéma. À appeler UNE SEULE FOIS en toute fin, après les recherches web.",
			input_schema: REPORT_JSON_SCHEMA as unknown as Anthropic.Tool.InputSchema,
			strict: true,
			// cache_control sur le dernier tool → cache = system + tools complet.
			cache_control: { type: 'ephemeral' }
		} as unknown as Anthropic.Tool
	];

	// Anthropic SDK refuse l'appel non-streaming si la prédiction de durée
	// dépasse 10 min (max_tokens 32K + adaptive thinking xhigh + 15 web_search
	// = >> 10 min projetés). On passe en streaming et on récupère le message
	// final accumulé. Comportement identique côté output (Anthropic.Message).
	const stream = client.messages.stream({
		model: MODEL,
		max_tokens: MAX_TOKENS,
		// Opus 4.7 : adaptive thinking + effort xhigh. Sampling params (temperature/top_p/top_k)
		// retirés : rejetés 400 sur 4.7. Cast via spread : output_config pas encore typé SDK 0.88.
		...({ thinking: { type: 'adaptive' }, output_config: { effort: 'xhigh' } } as Record<string, unknown>),
		system: [
			{
				type: 'text',
				text: SYSTEM_PROMPT,
				cache_control: { type: 'ephemeral' }
			}
		],
		tools,
		messages: [
			{
				role: 'user',
				content: buildUserPrompt({
					weekLabel: input.weekLabel,
					dateStart: input.dateStart,
					dateEnd: input.dateEnd,
					previousItems: input.previousItems,
					windowDays: input.windowDays
				})
			}
		]
	});
	return stream.finalMessage();
}

/**
 * Filtre BLOQUANT (refonte 2026-05-05 anti-hallucination) :
 * - URL invalide / HTTP error / timeout / network / paywall → REJETÉ
 * - Date hors fenêtre [windowStart, windowEnd] → REJETÉ
 *
 * Items publiables : URL accessible ET date dans la fenêtre.
 * Items rejetés : retournés séparément pour relance volume + audit.
 *
 * Note : avant la refonte, les items KO étaient juste dégradés en
 * `maturity=speculatif` mais publiés quand même. Conséquence : 24heures paywall
 * et URLs corrompues `',6` arrivaient dans le CRM (audit W18 2026-05-05).
 */
async function filterAndAnnotateItems(
	items: IntelligenceItem[],
	windowStart: string,
	windowEnd: string
): Promise<{ kept: IntelligenceItem[]; rejected: RejectedItem[] }> {
	// Pré-filtre denylist hard : reject avant verifyUrl pour économiser les
	// appels réseau sur des domaines bannis (blogs marketing, agrégateurs SEO,
	// sources d'hallucination identifiées). Cf. source-allowlist.ts.
	const kept: IntelligenceItem[] = [];
	const rejected: RejectedItem[] = [];
	const survivors: IntelligenceItem[] = [];
	for (const item of items) {
		let host = '';
		try {
			host = new URL(item.source.url).hostname;
		} catch {
			rejected.push({
				url: item.source.url,
				title: item.title,
				reason: 'invalid_url',
				detail: 'URL parse failed'
			});
			continue;
		}
		if (isDeniedSource(host)) {
			rejected.push({
				url: item.source.url,
				title: item.title,
				reason: 'denied_source',
				detail: `domaine ${host} dans denylist (blog marketing/agrégateur SEO/source identifiée faible)`
			});
			continue;
		}
		survivors.push(item);
	}

	const annotated = await Promise.all(
		survivors.map(async (item) => {
			const urlResult = await verifyUrl(item.source.url);
			const llmDate = parseFlexibleDate(item.source.published_at);
			const dateOk = llmDate ? isWithinWindow(llmDate, windowStart, windowEnd) : false;
			const urlOk = urlResult.ok;
			return { item, urlResult, urlOk, dateOk };
		})
	);

	for (const { item, urlResult, urlOk, dateOk } of annotated) {
		if (!urlOk) {
			rejected.push({
				url: item.source.url,
				title: item.title,
				reason:
					urlResult.reason === 'paywall'
						? 'paywall'
						: urlResult.reason === 'invalid_url'
							? 'invalid_url'
							: urlResult.reason === 'timeout'
								? 'timeout'
								: urlResult.reason === 'network'
									? 'network'
									: 'http_error',
				detail: urlResult.status ? `HTTP ${urlResult.status}` : urlResult.reason
			});
			continue;
		}
		if (!dateOk) {
			rejected.push({
				url: item.source.url,
				title: item.title,
				reason: 'date_out_of_window',
				detail: `published_at=${item.source.published_at} hors [${windowStart}..${windowEnd}]`
			});
			continue;
		}
		// Annoter le tier whitelist (informatif, pas reject hors whitelist).
		const tier = getDomainTier(new URL(item.source.url).hostname);
		if (!tier) {
			console.log(
				`[veille filter] item ${item.title.slice(0, 60)}... domaine ${new URL(item.source.url).hostname} hors whitelist (autorisé mais à auditer)`
			);
		}
		kept.push({
			...item,
			verification: {
				url_ok: true,
				entity_ok: null,
				unverified_entities: [],
				date_ok: true
			}
		});
	}

	return { kept, rejected };
}

export interface GenerateOptions {
	/** Anthropic API key. Injectée par l'appelant (cf. deps.ts). */
	anthropicApiKey: string;
}

export async function generateIntelligenceReport(
	input: GenerateInput,
	opts: GenerateOptions
): Promise<GenerateResult> {
	// Reset du tracker : une invocation = une collecte complète.
	costTracker.reset();

	if (!opts.anthropicApiKey) {
		return { success: false, error: 'ANTHROPIC_API_KEY manquante', costs: costTracker.summary() };
	}

	const client = new Anthropic({ apiKey: opts.anthropicApiKey });

	const response = await callModel(client, input);
	costTracker.addClaudeCall(MODEL, response.usage, 'Claude veille (1-phase)');

	// Garde stop_reason : si le modèle a été coupé par max_tokens, l'éventuel
	// emit_report final est probablement tronqué (items vides alors que la
	// recherche web a produit du signal). On échoue explicitement plutôt que
	// d'enregistrer une édition incomplète + alerte semaine creuse trompeuse.
	if (response.stop_reason === 'max_tokens') {
		return {
			success: false,
			error: `Modèle coupé par max_tokens (${MAX_TOKENS} tokens consommés). Output partiel.`,
			raw: response,
			costs: costTracker.summary()
		};
	}

	const emitBlock = response.content.find(
		(b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'emit_report'
	);

	if (!emitBlock) {
		return {
			success: false,
			error: `Modèle n'a pas appelé emit_report (stop_reason=${response.stop_reason})`,
			raw: response,
			costs: costTracker.summary()
		};
	}

	const parsed = IntelligenceReportSchema.safeParse(emitBlock.input);
	if (!parsed.success) {
		return {
			success: false,
			error: `Validation Zod échouée : ${parsed.error.message}`,
			raw: response,
			costs: costTracker.summary()
		};
	}

	// Pipeline anti-hallucination (2026-05-05) :
	// 1. Sanitize URLs : strip suffixes parasites (`',6` etc.) avant verifyUrl.
	// 2. Filtre bloquant URL + date : items KO rejetés (pas dégradés).
	// La cross-check verbatim (LLM second-pass sur le contenu de la page)
	// est appliquée en aval dans run-generation.ts.
	const { items: sanitizedItems, sanitizedCount } = sanitizeUrlsBatch(parsed.data.items);

	const windowStart = input.windowStart ?? input.dateStart;
	const { kept, rejected } = await filterAndAnnotateItems(
		sanitizedItems,
		windowStart,
		input.dateEnd
	);

	const enrichedReport: IntelligenceReport = {
		...parsed.data,
		items: kept
	};

	return {
		success: true,
		report: enrichedReport,
		raw: response,
		costs: costTracker.summary(),
		rejected,
		sanitizedUrlsCount: sanitizedCount
	};
}
