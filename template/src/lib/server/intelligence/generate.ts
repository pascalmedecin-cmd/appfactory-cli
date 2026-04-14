import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';
import {
	IntelligenceReportSchema,
	type IntelligenceReport
} from './schema';
import { INTELLIGENCE_SYSTEM_PROMPT, buildUserPrompt } from './prompt';
import { enrichItemsWithOgImages } from './og-image';
import { verifyUrl } from './url-verify';
import { verifyEntitiesInText } from './entity-verify';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 16000;

// JSON schema conforme au subset supporte par strict mode Anthropic :
// - Pas de minLength/maxLength/minimum/maximum/multipleOf (400 error)
// - Pas de minItems/maxItems autres que 0 ou 1
// - additionalProperties: false obligatoire sur chaque objet
// - Contraintes min/max exprimees en description (le SDK officiel fait pareil)
// Doc: https://docs.anthropic.com/en/docs/build-with-claude/structured-outputs#json-schema-limitations
const REPORT_JSON_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['meta', 'items', 'impacts_filmpro', 'search_terms'],
	properties: {
		meta: {
			type: 'object',
			additionalProperties: false,
			required: ['week_label', 'generated_at', 'compliance_tag', 'executive_summary'],
			properties: {
				week_label: {
					type: 'string',
					pattern: '^\\d{4}-W\\d{2}$',
					description: 'Format ISO YYYY-Www (ex: 2026-W16)'
				},
				generated_at: {
					type: 'string',
					format: 'date-time',
					description: 'Timestamp ISO 8601 complet avec Z'
				},
				compliance_tag: {
					type: 'string',
					enum: ['OK FilmPro', 'Adjacent pertinent', 'À surveiller', 'Non exploitable']
				},
				executive_summary: {
					type: 'string',
					description: 'Synthèse executive de 80 à 600 caractères'
				}
			}
		},
		items: {
			type: 'array',
			description: 'Entre 1 et 10 items classés par pertinence descendante',
			items: {
				type: 'object',
				additionalProperties: false,
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
					rank: {
						type: 'integer',
						description: 'Rang entre 1 et 10, unique, croissant depuis 1'
					},
					title: {
						type: 'string',
						description: 'Titre de 10 à 200 caractères'
					},
					summary: {
						type: 'string',
						description: 'Résumé de 40 à 800 caractères'
					},
					filmpro_relevance: {
						type: 'string',
						description: 'Pertinence FilmPro de 20 à 600 caractères'
					},
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
						additionalProperties: false,
						required: ['name', 'url', 'published_at'],
						properties: {
							name: {
								type: 'string',
								description: 'Nom de la source de 2 à 120 caractères'
							},
							url: {
								type: 'string',
								format: 'uri',
								description: 'URL HTTPS pointant vers la page exacte de l article'
							},
							published_at: {
								type: 'string',
								description: 'Date YYYY-MM-DD ou datetime ISO 8601'
							}
						}
					},
					deep_dive: {
						type: ['string', 'null'],
						description: 'Analyse approfondie optionnelle, 0 à 400 caractères'
					},
					image_url: {
						type: ['string', 'null'],
						description: 'URL image optionnelle (HTTPS)'
					}
				}
			}
		},
		impacts_filmpro: {
			type: 'array',
			description: 'Entre 1 et 3 impacts métier FilmPro',
			items: {
				type: 'object',
				additionalProperties: false,
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
							'image',
							'reglementation'
						]
					},
					note: {
						type: 'string',
						description: 'Note d impact de 10 à 500 caractères'
					}
				}
			}
		},
		search_terms: {
			type: 'array',
			description: 'Entre 8 et 15 termes de recherche pour alimenter le prospecting',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['term', 'rationale', 'segment'],
				properties: {
					term: {
						type: 'string',
						description: 'Terme de recherche de 3 à 120 caractères'
					},
					rationale: {
						type: 'string',
						description: 'Justification de 10 à 200 caractères'
					},
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

async function callAnthropic(
	client: Anthropic,
	input: GenerateInput
): Promise<Anthropic.Message> {
	const tools: Anthropic.Tool[] = [
		{
			type: 'web_search_20250305',
			name: 'web_search',
			max_uses: 10
		} as unknown as Anthropic.Tool,
		{
			name: 'emit_report',
			description:
				"Émettre l'édition hebdomadaire finale au format JSON strict conforme au schéma. À appeler UNE SEULE FOIS, en toute fin, après avoir effectué les recherches web nécessaires.",
			input_schema: REPORT_JSON_SCHEMA as unknown as Anthropic.Tool.InputSchema,
			// strict: true active le grammar-constrained sampling cote Anthropic
			// (garantit conformite au JSON schema). GA sur Sonnet 4.6.
			strict: true
		} as unknown as Anthropic.Tool
	];

	return client.messages.create({
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
}

export async function generateIntelligenceReport(
	input: GenerateInput
): Promise<GenerateResult> {
	const apiKey = env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		return { success: false, error: 'ANTHROPIC_API_KEY manquante' };
	}

	const client = new Anthropic({ apiKey });

	let response: Anthropic.Message;
	let emitBlock: Anthropic.ToolUseBlock | undefined;
	let lastError = '';

	// Retry 1 fois si emit_report absent (le modele a pu terminer en text only
	// apres des recherches web sans appeler l outil). Filet minimal, pas de boucle.
	for (let attempt = 0; attempt < 2; attempt++) {
		response = await callAnthropic(client, input);
		emitBlock = response.content.find(
			(b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'emit_report'
		);
		if (emitBlock) break;
		lastError = `Modèle n'a pas appelé emit_report (stop_reason=${response.stop_reason})`;
	}

	if (!emitBlock) {
		return { success: false, error: lastError, raw: response! };
	}

	const parsed = IntelligenceReportSchema.safeParse(emitBlock.input);
	if (!parsed.success) {
		return {
			success: false,
			error: `Validation Zod échouée : ${parsed.error.message}`,
			raw: response!
		};
	}

	// Verifications post-generation : URLs (HEAD check) + entites Zefix.
	// Executees en parallele par item pour limiter la latence. Le resultat est
	// ajoute dans item.verification. Les items en echec ne sont PAS retires
	// automatiquement : ils sont bascules en maturity=speculatif et l'UI
	// affiche un badge "Non verifie". Cela preserve la tracabilite cote DB.
	const verifiedItems = await Promise.all(
		parsed.data.items.map(async (item) => {
			const [urlResult, entityResult] = await Promise.all([
				verifyUrl(item.source.url),
				verifyEntitiesInText(
					[item.title, item.summary, item.deep_dive ?? ''].join('\n')
				)
			]);

			const urlOk = urlResult.ok;
			const entityOk = entityResult.entity_ok;
			const needsFlag = !urlOk || entityOk === false;

			return {
				...item,
				maturity: needsFlag ? ('speculatif' as const) : item.maturity,
				verification: {
					url_ok: urlOk,
					url_reason: urlResult.reason,
					entity_ok: entityOk,
					unverified_entities: entityResult.unverified_entities
				}
			};
		})
	);

	const enrichedItems = await enrichItemsWithOgImages(verifiedItems);
	const enrichedReport: IntelligenceReport = { ...parsed.data, items: enrichedItems };

	return { success: true, report: enrichedReport, raw: response! };
}
