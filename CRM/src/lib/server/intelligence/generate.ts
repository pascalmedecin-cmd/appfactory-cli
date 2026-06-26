import Anthropic from '@anthropic-ai/sdk';
import { type IntelligenceReport, type IntelligenceItem } from './schema';
import { partitionReport, type DroppedArticle } from './report-validate';
import {
	buildSystemPrompt,
	buildUserPrompt,
	buildReportJsonSchema,
	type PreviousItem
} from './prompt';
import {
	buildThemesPromptSection,
	getFallbackBundle,
	type ThemeBundle
} from './theme-loader';
import { verifyUrl } from './url-verify';
import { sanitizeUrlsBatch } from './url-sanitize';
import { extractSearchResultUrls, recoverUrl } from './url-recover';
import {
	buildSourcesPromptSection,
	getFallbackSourcesBundle,
	type SourcesBundle
} from './sources-loader';
import { parseFlexibleDate, isWithinWindow } from './parse-date';
import { isAllowedThemeSlug } from './theme-slug';
import { costTracker, type CostSummary, type CostTracker } from './cost-tracker';

const MODEL = 'claude-opus-4-8';
// Fenêtre de SORTIE = thinking adaptive + texte + tool_use emit_report. La doc
// Anthropic est explicite : « Use max_tokens as a hard limit on total output
// (thinking + response text) » (platform.claude.com/docs/en/build-with-claude/adaptive-thinking).
// À effort xhigh, le repère officiel est 64k : « set a large max_tokens... Starting
// at 64k tokens... is a reasonable default » (.../build-with-claude/effort).
// 16K puis 32K SOUS-dimensionnaient : le thinking xhigh dévorait la fenêtre et
// coupait l'emit_report (items=[] alors que l'executive_summary décrivait des
// signaux) — récidive prouvée (coupé à 16K S112, re-coupé à 32K W25 2026-06-19).
// On dimensionne à 64K ; adaptive ne consomme PAS le plafond (on ne paie que les
// tokens réellement émis), donc 64K = marge, pas surcoût garanti.
const MAX_TOKENS = 64000;
// Relance unique si le 1er appel déborde quand même (semaine exceptionnellement
// dense) : 128K = plafond output d'Opus 4.8 (API synchrone). Un bloc tool_use
// tronqué n'est PAS récupérable partiellement (doc /handling-stop-reasons :
// « retry with higher max_tokens, not continuation »), d'où la relance complète.
const MAX_TOKENS_RETRY = 128000;
// 22 (était 15, levier sourcing 2026-06-23) : plus de budget de recherche pour
// élargir le sourcing local (sources romandes nommées au-delà de RTS) + fenêtre 30j,
// sans toucher la barre de pertinence. Le filtre aval (URL + cross-check) reste identique.
const WEB_SEARCH_MAX_USES = 22;

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
	/** Articles écartés à la validation de schéma (par-article), pour audit/dérive. */
	schemaDropped?: DroppedArticle[];
}

async function callModel(
	client: Anthropic,
	input: GenerateInput,
	themes: ThemeBundle,
	sources: SourcesBundle,
	maxTokens: number
): Promise<Anthropic.Message> {
	const themesSection = buildThemesPromptSection(themes);
	const sourcesSection = buildSourcesPromptSection(sources);
	const systemPrompt = buildSystemPrompt(themesSection, sourcesSection);
	const reportSchema = buildReportJsonSchema(themes.allowedSlugs);
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
			input_schema: reportSchema as unknown as Anthropic.Tool.InputSchema,
			strict: true,
			// cache_control sur le dernier tool → cache = system + tools complet.
			cache_control: { type: 'ephemeral' }
		} as unknown as Anthropic.Tool
	];

	// Anthropic SDK refuse l'appel non-streaming si la prédiction de durée
	// dépasse 10 min (max_tokens élevé + adaptive thinking xhigh + 15 web_search
	// = >> 10 min projetés). On passe en streaming et on récupère le message
	// final accumulé. Comportement identique côté output (Anthropic.Message).
	const stream = client.messages.stream({
		model: MODEL,
		max_tokens: maxTokens,
		// Opus 4.8 : seul l'adaptive thinking est supporté ; thinking.budget_tokens
		// est REJETÉ (400). Les SEULS leviers sur la part de réflexion sont `effort`
		// (soft) et `max_tokens` (hard cap total) — il n'y a PAS de budget_tokens ici
		// (l'ancien commentaire « budget_tokens manuel = 400 » était faux et trompeur).
		// effort xhigh CONSERVÉ : la garantie anti-hallucination ne dépend pas de
		// l'effort (elle est en aval, cross-check verbatim Sonnet) ; xhigh sert la
		// qualité éditoriale. Sampling params (temperature/top_p/top_k) retirés :
		// rejetés 400. Cast via spread : output_config pas encore typé SDK 0.88.
		...({ thinking: { type: 'adaptive' }, output_config: { effort: 'xhigh' } } as Record<string, unknown>),
		system: [
			{
				type: 'text',
				text: systemPrompt,
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
 * Lit le COMPTE de tokens de thinking. Sur Opus 4.8, `thinking.display='omitted'`
 * par défaut (texte du bloc vide, signature conservée) mais la facturation et le
 * compte restent exacts dans `usage.output_tokens_details.thinking_tokens`. Champ
 * non typé SDK 0.88 → accès défensif. Sert à mesurer empiriquement combien de la
 * fenêtre part en réflexion (calibrage de MAX_TOKENS sans deviner).
 */
function thinkingTokensOf(usage: Anthropic.Message['usage']): number | null {
	const details = (usage as { output_tokens_details?: { thinking_tokens?: number } | null })
		.output_tokens_details;
	return details?.thinking_tokens ?? null;
}

/**
 * Appelle le modèle avec une fenêtre de sortie MAX_TOKENS, puis RELANCE une seule
 * fois à MAX_TOKENS_RETRY si le 1er appel a été coupé par max_tokens.
 *
 * Pourquoi relancer (et non « continuer ») : la coupure tronque le bloc tool_use
 * emit_report, qui n'est PAS récupérable partiellement (doc Anthropic
 * /handling-stop-reasons). effort xhigh est conservé sur les deux appels.
 *
 * Chaque appel RÉEL est tracé dans le cost-tracker (le 1er, coûteux en web_search,
 * est facturé même s'il a débordé). Exporté pour test unitaire ciblé.
 */
export async function callModelWithOverflowRetry(
	client: Anthropic,
	input: GenerateInput,
	themes: ThemeBundle,
	sources: SourcesBundle,
	tracker: CostTracker
): Promise<Anthropic.Message> {
	const first = await callModel(client, input, themes, sources, MAX_TOKENS);
	tracker.addClaudeCall(MODEL, first.usage, 'Claude veille (1-phase)');
	if (first.stop_reason !== 'max_tokens') return first;

	console.warn(
		`[generate] stop_reason=max_tokens à ${MAX_TOKENS} tokens ` +
			`(thinking_tokens=${thinkingTokensOf(first.usage) ?? 'n/a'}) — relance à ${MAX_TOKENS_RETRY}.`
	);
	const second = await callModel(client, input, themes, sources, MAX_TOKENS_RETRY);
	tracker.addClaudeCall(MODEL, second.usage, 'Claude veille (relance max_tokens)');
	return second;
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
	windowEnd: string,
	sources: SourcesBundle,
	knownUrls: readonly string[] = []
): Promise<{ kept: IntelligenceItem[]; rejected: RejectedItem[]; recoveredCount: number }> {
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
		if (sources.isDenied(host)) {
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

	// Vérification URL + RÉCUPÉRATION (2026-06-22, cause racine W25) : si l'URL émise
	// échoue (404/network — cas suffixe parasite /ts, /j, /sd), on tente une URL de
	// secours issue des citations web_search (ground truth) ou de l'URL du modèle
	// amputée du suffixe parasite (jamais fabriquée), RE-VÉRIFIÉE live. Le cross-check
	// verbatim en aval reste le backstop. Voir url-recover.ts + spec AC-2.
	const annotated = await Promise.all(
		survivors.map(async (item) => {
			let effectiveUrl = item.source.url;
			let urlResult = await verifyUrl(effectiveUrl);
			let mutated = false;
			if (!urlResult.ok) {
				const recovered = recoverUrl(effectiveUrl, knownUrls);
				if (recovered && recovered !== effectiveUrl) {
					const recheck = await verifyUrl(recovered);
					if (recheck.ok) {
						effectiveUrl = recovered;
						urlResult = recheck;
						mutated = true;
					}
				}
			}
			const llmDate = parseFlexibleDate(item.source.published_at);
			const dateOk = llmDate ? isWithinWindow(llmDate, windowStart, windowEnd) : false;
			return { item, effectiveUrl, urlResult, urlOk: urlResult.ok, dateOk, mutated };
		})
	);

	let recoveredCount = 0;
	for (const { item, effectiveUrl, urlResult, urlOk, dateOk, mutated } of annotated) {
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
				url: effectiveUrl,
				title: item.title,
				reason: 'date_out_of_window',
				detail: `published_at=${item.source.published_at} hors [${windowStart}..${windowEnd}]`
			});
			continue;
		}
		if (mutated) {
			recoveredCount++;
			console.log(
				`[veille filter] URL récupérée : ${item.source.url.slice(0, 70)} → ${effectiveUrl.slice(0, 70)}`
			);
		}
		// Annoter le tier whitelist (informatif, pas reject hors whitelist).
		const tier = sources.tierOf(new URL(effectiveUrl).hostname);
		if (!tier) {
			console.log(
				`[veille filter] item ${item.title.slice(0, 60)}... domaine ${new URL(effectiveUrl).hostname} hors whitelist (autorisé mais à auditer)`
			);
		}
		kept.push({
			...item,
			source: { ...item.source, url: effectiveUrl },
			verification: {
				url_ok: true,
				entity_ok: null,
				unverified_entities: [],
				date_ok: true,
				url_mutated: mutated
			}
		});
	}

	return { kept, rejected, recoveredCount };
}

export interface GenerateOptions {
	/** Anthropic API key. Injectée par l'appelant (cf. deps.ts). */
	anthropicApiKey: string;
	/**
	 * Bundle thèmes actifs (chargé depuis `veille_themes` par theme-loader).
	 * Optionnel pour rétrocompat tests. Si absent, fallback hardcoded
	 * (cf. theme-loader FALLBACK_THEMES) — le cron prod doit toujours fournir.
	 */
	themes?: ThemeBundle;
	/**
	 * Bundle sources actives (chargé depuis `veille_sources` par sources-loader).
	 * Optionnel pour rétrocompat tests. Si absent, fallback seed (= photo exacte
	 * du code, cf. SOURCES_SEED) — le cron prod doit toujours fournir.
	 */
	sources?: SourcesBundle;
	/**
	 * Tracker de coûts à alimenter (audit 360 M-05 : DI explicite plutôt que
	 * le singleton module-level). Défaut : le singleton `costTracker`.
	 */
	tracker?: CostTracker;
}

export async function generateIntelligenceReport(
	input: GenerateInput,
	opts: GenerateOptions
): Promise<GenerateResult> {
	const tracker = opts.tracker ?? costTracker;
	// Reset du tracker : une invocation = une collecte complète.
	tracker.reset();

	if (!opts.anthropicApiKey) {
		return { success: false, error: 'ANTHROPIC_API_KEY manquante', costs: tracker.summary() };
	}

	const client = new Anthropic({ apiKey: opts.anthropicApiKey });

	// Themes bundle : fourni par run-generation.ts (chargé via theme-loader).
	// Fallback explicite vers la liste hardcoded si l'appelant l'omet (tests).
	const themes = opts.themes ?? getFallbackBundle();
	// Sources bundle : fourni par run-generation.ts (chargé via sources-loader).
	// Fallback seed (= photo exacte du code) si l'appelant l'omet (tests).
	const sources = opts.sources ?? getFallbackSourcesBundle();
	// callModelWithOverflowRetry trace lui-même chaque appel réel dans le tracker
	// et relance à 128K si le 1er appel à 64K déborde (stop_reason=max_tokens).
	const response = await callModelWithOverflowRetry(client, input, themes, sources, tracker);

	// Garde stop_reason : si le modèle a été coupé par max_tokens MÊME après la
	// relance à 128K, l'emit_report final est tronqué (non récupérable). On échoue
	// explicitement plutôt que d'enregistrer une édition incomplète + alerte semaine
	// creuse trompeuse. À ce stade = semaine exceptionnellement dense (le rattrapage
	// / la relance manuelle prennent le relais).
	if (response.stop_reason === 'max_tokens') {
		return {
			success: false,
			error: `Modèle coupé par max_tokens même après relance à ${MAX_TOKENS_RETRY} tokens (semaine exceptionnellement dense). Output partiel.`,
			raw: response,
			costs: tracker.summary()
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
			costs: tracker.summary()
		};
	}

	// Validation résiliente par-article (refonte 2026-06-06, remplace le safeParse
	// global tout-ou-rien) : meta/impacts stricts, articles validés un par un,
	// fautifs écartés individuellement (jamais réparés), garde anti-dérive si trop
	// d'articles tombent. Voir report-validate.ts + resilience-validation-spec.md.
	const partition = partitionReport(emitBlock.input);
	if (!partition.ok) {
		return {
			success: false,
			error: partition.error,
			raw: response,
			costs: tracker.summary(),
			schemaDropped: partition.dropped
		};
	}
	if (partition.dropped.length > 0) {
		console.warn(
			`[generate] ${partition.dropped.length} article(s) écarté(s) à la validation de schéma : ` +
				partition.dropped.map((d) => `[${d.index}] ${d.violations}`).join(' ; ')
		);
	}
	const report = partition.report;

	// Theme allowlist post-Zod : Zod accepte string libre depuis S169 (theme
	// dynamique DB). Si le modèle a sorti un thème inconnu malgré le JSON
	// schema strict-mode, on dégrade en 'autre' avec log plutôt que rejeter
	// l'item entier (perte d'info éditoriale > coût d'un fallback gracieux).
	// Audit 360 M-22 : `isAllowedThemeSlug` est le helper partagé avec /veille/[id].
	const fallbackTheme = isAllowedThemeSlug('autre', themes.allowedSlugs)
		? 'autre'
		: (themes.allowedSlugs[0] ?? 'autre');
	for (const item of report.items) {
		if (!isAllowedThemeSlug(item.theme, themes.allowedSlugs)) {
			console.warn(
				`[generate] theme inconnu "${item.theme}" sur item rank=${item.rank}, fallback "${fallbackTheme}"`
			);
			item.theme = fallbackTheme;
		}
	}

	// Pipeline anti-hallucination (2026-05-05) :
	// 1. Sanitize URLs : strip suffixes parasites (`',6` etc.) avant verifyUrl.
	// 2. Filtre bloquant URL + date : items KO rejetés (pas dégradés).
	// La cross-check verbatim (LLM second-pass sur le contenu de la page)
	// est appliquée en aval dans run-generation.ts.
	const { items: sanitizedItems, sanitizedCount } = sanitizeUrlsBatch(report.items);

	// Ground truth des URLs réellement retournées par web_search (pour récupérer
	// une URL mal-formée sans rien fabriquer — cause racine W25). Voir url-recover.ts.
	const knownUrls = extractSearchResultUrls(response);

	const windowStart = input.windowStart ?? input.dateStart;
	const { kept, rejected, recoveredCount } = await filterAndAnnotateItems(
		sanitizedItems,
		windowStart,
		input.dateEnd,
		sources,
		knownUrls
	);
	if (recoveredCount > 0) {
		console.log(`[generate] ${recoveredCount} URL(s) récupérée(s) (suffixe parasite / citation).`);
	}

	const enrichedReport: IntelligenceReport = {
		...report,
		items: kept
	};

	return {
		success: true,
		report: enrichedReport,
		raw: response,
		costs: tracker.summary(),
		rejected,
		sanitizedUrlsCount: sanitizedCount,
		schemaDropped: partition.dropped
	};
}
