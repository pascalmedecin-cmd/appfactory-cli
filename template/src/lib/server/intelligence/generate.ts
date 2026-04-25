import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';
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

export interface GenerateResult {
	success: boolean;
	report?: IntelligenceReport;
	error?: string;
	raw?: unknown;
	/** Coûts agrégés de l'invocation (Claude API). */
	costs?: CostSummary;
}

async function callModel(
	client: Anthropic,
	input: GenerateInput
): Promise<Anthropic.Message> {
	const tools: Anthropic.Tool[] = [
		{
			type: 'web_search_20250305',
			name: 'web_search',
			max_uses: WEB_SEARCH_MAX_USES
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
 * Vérifie chaque item en parallèle :
 * - URL parseable + HEAD 2xx (verifyUrl)
 * - Date dans fenêtre [windowStart, windowEnd] (date LLM, pas de fetch og:published_time)
 *
 * Renseigne `verification.url_ok` + `verification.date_ok` sur chaque item.
 * Les items hors fenêtre ou en 404 sont conservés mais leur maturity est dégradée
 * en "speculatif" pour signaler l'anomalie en aval (le badge UI a été retiré, mais
 * la traçabilité reste utile pour debug et investigation).
 */
async function verifyItems(
	items: IntelligenceItem[],
	windowStart: string,
	windowEnd: string
): Promise<IntelligenceItem[]> {
	return Promise.all(
		items.map(async (item) => {
			const urlResult = await verifyUrl(item.source.url);
			const llmDate = parseFlexibleDate(item.source.published_at);
			const dateOk = llmDate ? isWithinWindow(llmDate, windowStart, windowEnd) : false;
			const urlOk = urlResult.ok;
			const needsFlag = !urlOk || !dateOk;

			return {
				...item,
				maturity: needsFlag ? ('speculatif' as const) : item.maturity,
				verification: {
					url_ok: urlOk,
					url_reason: urlResult.reason,
					entity_ok: null,
					unverified_entities: [],
					date_ok: dateOk
				}
			};
		})
	);
}

export async function generateIntelligenceReport(
	input: GenerateInput
): Promise<GenerateResult> {
	// Reset du tracker : une invocation = une collecte complète.
	costTracker.reset();

	const apiKey = env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		return { success: false, error: 'ANTHROPIC_API_KEY manquante', costs: costTracker.summary() };
	}

	const client = new Anthropic({ apiKey });

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

	const windowStart = input.windowStart ?? input.dateStart;
	const verifiedItems = await verifyItems(parsed.data.items, windowStart, input.dateEnd);

	const enrichedReport: IntelligenceReport = {
		...parsed.data,
		items: verifiedItems
	};

	return {
		success: true,
		report: enrichedReport,
		raw: response,
		costs: costTracker.summary()
	};
}
