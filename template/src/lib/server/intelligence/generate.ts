import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';
import {
	IntelligenceReportSchema,
	type IntelligenceReport
} from './schema';
import { INTELLIGENCE_SYSTEM_PROMPT, buildUserPrompt } from './prompt';
import { enrichItemsWithOgImages } from './og-image';

const MODEL = 'claude-sonnet-4-5-20250929'; // TODO: passer a claude-sonnet-4-6 des dispo GA
const MAX_TOKENS = 16000;

// JSON schema aligne sur IntelligenceReportSchema (Zod). Derive manuellement
// plutot que zod-to-json-schema pour eviter dependance + garder controle strict.
const REPORT_JSON_SCHEMA = {
	type: 'object',
	required: ['edition', 'items', 'impacts_filmpro', 'search_terms'],
	properties: {
		edition: {
			type: 'object',
			required: ['week_label', 'generated_at', 'compliance_tag', 'executive_summary'],
			properties: {
				week_label: { type: 'string', pattern: '^\\d{4}-W\\d{2}$' },
				generated_at: { type: 'string' },
				compliance_tag: {
					type: 'string',
					enum: ['OK FilmPro', 'Adjacent pertinent', 'À surveiller', 'Non exploitable']
				},
				executive_summary: { type: 'string', minLength: 80, maxLength: 600 }
			}
		},
		items: {
			type: 'array',
			minItems: 1,
			maxItems: 10,
			items: {
				type: 'object',
				required: [
					'rank',
					'title',
					'summary',
					'filmpro_relevance',
					'maturity',
					'theme',
					'geo_scope',
					'source',
					'deep_dive',
					'image_url'
				],
				properties: {
					rank: { type: 'integer', minimum: 1, maximum: 10 },
					title: { type: 'string', minLength: 10, maxLength: 200 },
					summary: { type: 'string', minLength: 40, maxLength: 800 },
					filmpro_relevance: { type: 'string', minLength: 20, maxLength: 300 },
					maturity: { type: 'string', enum: ['emergent', 'etabli', 'speculatif'] },
					theme: {
						type: 'string',
						enum: [
							'films_solaires',
							'films_securite',
							'discretion_smartfilm',
							'batiment_renovation',
							'ia_outils',
							'reglementation',
							'autre'
						]
					},
					geo_scope: { type: 'string', enum: ['suisse_romande', 'suisse', 'monde'] },
					source: {
						type: 'object',
						required: ['name', 'url', 'published_at'],
						properties: {
							name: { type: 'string', minLength: 2, maxLength: 120 },
							url: { type: 'string', format: 'uri' },
							published_at: { type: 'string' }
						}
					},
					deep_dive: { type: ['string', 'null'], maxLength: 200 },
					image_url: { type: ['string', 'null'] }
				}
			}
		},
		impacts_filmpro: {
			type: 'array',
			minItems: 1,
			maxItems: 3,
			items: {
				type: 'object',
				required: ['axis', 'note'],
				properties: {
					axis: {
						type: 'string',
						enum: [
							'diagnostic',
							'go_nogo',
							'pricing',
							'sourcing',
							'capacite',
							'qualite',
							'organisation',
							'image'
						]
					},
					note: { type: 'string', minLength: 10, maxLength: 300 }
				}
			}
		},
		search_terms: {
			type: 'array',
			minItems: 8,
			maxItems: 15,
			items: {
				type: 'object',
				required: ['term', 'rationale', 'segment'],
				properties: {
					term: { type: 'string', minLength: 3, maxLength: 120 },
					rationale: { type: 'string', minLength: 10, maxLength: 200 },
					segment: {
						type: 'string',
						enum: ['tertiaire', 'residentiel', 'commerces', 'erp', 'partenaires']
					}
				}
			}
		}
	}
} as const;

export interface GenerateInput {
	weekLabel: string;
	dateStart: string;
	dateEnd: string;
	previousTitles: string[];
}

export interface GenerateResult {
	success: boolean;
	report?: IntelligenceReport;
	error?: string;
	raw?: unknown;
}

export async function generateIntelligenceReport(
	input: GenerateInput
): Promise<GenerateResult> {
	const apiKey = env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		return { success: false, error: 'ANTHROPIC_API_KEY manquante' };
	}

	const client = new Anthropic({ apiKey });

	const tools: Anthropic.Tool[] = [
		// Web search natif Anthropic
		{
			type: 'web_search_20250305',
			name: 'web_search',
			max_uses: 10
		} as unknown as Anthropic.Tool,
		// Tool de sortie structuree : le modele DOIT appeler ce tool pour cloturer
		{
			name: 'emit_report',
			description:
				"Émettre l'édition hebdomadaire finale au format JSON strict conforme au schéma. À appeler UNE SEULE FOIS, en toute fin, après avoir effectué les recherches web nécessaires.",
			input_schema: REPORT_JSON_SCHEMA as unknown as Anthropic.Tool.InputSchema
		}
	];

	// web_search est un server-tool Anthropic : les appels sont executes cote
	// serveur et les resultats injectes directement dans le meme tour. Le
	// modele termine en appelant emit_report (seul tool client-side). Pas de
	// boucle agentic a gerer : une seule requete suffit.
	const response = await client.messages.create({
		model: MODEL,
		max_tokens: MAX_TOKENS,
		system: [
			{
				type: 'text',
				text: INTELLIGENCE_SYSTEM_PROMPT,
				cache_control: { type: 'ephemeral' }
			}
		],
		tools,
		messages: [{ role: 'user', content: buildUserPrompt(input) }]
	});

	const emitBlock = response.content.find(
		(b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'emit_report'
	);

	if (!emitBlock) {
		return {
			success: false,
			error: `Modèle n'a pas appelé emit_report (stop_reason=${response.stop_reason})`,
			raw: response
		};
	}

	const parsed = IntelligenceReportSchema.safeParse(emitBlock.input);
	if (!parsed.success) {
		return {
			success: false,
			error: `Validation Zod échouée : ${parsed.error.message}`,
			raw: response
		};
	}

	// Enrichissement OG images : resout image_url depuis source.url quand
	// le modele n'a pas rempli le champ. Best-effort, silencieux en cas
	// d'echec reseau (fallback UI gradient themé gère l'absence d'image).
	const enrichedItems = await enrichItemsWithOgImages(parsed.data.items);
	const enrichedReport: IntelligenceReport = { ...parsed.data, items: enrichedItems };

	return { success: true, report: enrichedReport, raw: response };
}
