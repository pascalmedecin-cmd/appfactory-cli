import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';
import {
	IntelligenceReportSchema,
	IntelligenceCandidatesSchema,
	type IntelligenceReport,
	type IntelligenceCandidate
} from './schema';
import {
	PHASE1_SYSTEM_PROMPT,
	buildPhase1UserPrompt,
	CANDIDATES_JSON_SCHEMA
} from './prompt-phase1';
import { PHASE2_SYSTEM_PROMPT, buildPhase2UserPrompt } from './prompt-phase2';
import { enrichItemsWithOgImages } from './og-image';
import { checkOgImageQuality } from './og-image-quality';
import { generateFallbacksForItems } from './image-fallback-generator';
import { verifyUrl } from './url-verify';
import { verifyEntitiesInText } from './entity-verify';
import { fetchPublishedDate } from './fetch-og-date';
import { parseFlexibleDate, isWithinWindow } from './parse-date';

const MODEL = 'claude-opus-4-6';
const MAX_TOKENS_PHASE1 = 8000;
const MAX_TOKENS_PHASE2 = 16000;
const TEMP_PHASE1 = 0.1;
const TEMP_PHASE2 = 0.45;

// JSON schema emit_report (Phase 2) — conforme subset strict-mode Anthropic.
// Contraintes min/max exprimées en description (cf. doc Anthropic structured outputs).
const REPORT_JSON_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['meta', 'items', 'impacts_filmpro'],
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
					description: 'Synthèse executive de 80 à 1200 caractères'
				}
			}
		},
		items: {
			type: 'array',
			description: 'Entre 0 et 10 items classés par pertinence descendante',
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
					'image_url',
					'segment',
					'actionability',
					'search_terms'
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
					},
					segment: {
						type: 'string',
						enum: ['tertiaire', 'residentiel', 'commerces', 'erp', 'partenaires'],
						description: 'Segment commercial FilmPro principal ciblé par ce signal'
					},
					actionability: {
						type: 'string',
						enum: ['action_directe', 'veille_active', 'a_surveiller'],
						description:
							'action_directe = prospecter maintenant ; veille_active = suivre ; a_surveiller = signal faible'
					},
					search_terms: {
						type: 'array',
						description:
							'Entre 2 et 4 chips structurés auto-exécutables pour la prospection. Chaque chip = {kind, canton, query, label}.',
						items: {
							type: 'object',
							additionalProperties: false,
							required: ['kind', 'canton', 'query', 'label'],
							properties: {
								kind: {
									type: 'string',
									enum: ['simap', 'zefix'],
									description:
										'simap = recherche appels d offres publics (mots-clés libres) ; zefix = recherche raison sociale entreprise (registre du commerce)'
								},
								canton: {
									type: 'string',
									enum: ['GE', 'VD', 'VS', 'NE', 'FR', 'JU'],
									description: 'Canton romand ciblé par la recherche (obligatoire côté APIs)'
								},
								query: {
									type: 'string',
									description:
										'SIMAP : 3-8 mots-clés métier (ex: "rénovation école vitrage"). Zefix : nom d entreprise pressenti (ex: "Losinger Marazzi"). 2 à 120 caractères.'
								},
								label: {
									type: 'string',
									description:
										'Libellé FR court affiché sur le chip UI, ex: "SIMAP VD · rénovation école vitrage" ou "Zefix GE · Losinger Marazzi". 3 à 160 caractères.'
								}
							}
						}
					}
				}
			}
		},
		impacts_filmpro: {
			type: 'array',
			description: 'Entre 0 et 3 impacts métier FilmPro',
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
		}
	}
} as const;

export interface GenerateInput {
	weekLabel: string;
	dateStart: string;
	dateEnd: string;
	/** Début de fenêtre de vérification (tolérance délai indexation). Défaut = dateStart. */
	windowStart?: string;
	previousTitles: string[];
}

export interface GenerateResult {
	success: boolean;
	report?: IntelligenceReport;
	error?: string;
	raw?: unknown;
	/** Debug pipeline 2 phases : candidats bruts et candidats survivants au filtre. */
	candidatesRaw?: IntelligenceCandidate[];
	candidatesFiltered?: IntelligenceCandidate[];
}

/**
 * Normalise une URL pour comparaison (détection mutation Phase 2) :
 * - lowercase host, strip trailing slash, strip hash/query (chemin = vérité).
 * Si parsing échoue → retourne brut (sera traité comme mutation).
 */
function normalizeUrlForCompare(url: string): string {
	try {
		const u = new URL(url);
		const path = u.pathname.replace(/\/$/, '');
		return `${u.protocol}//${u.host.toLowerCase()}${path}`;
	} catch {
		return url;
	}
}

// ---------- Phase 1 : extraction candidats ----------

async function callPhase1(
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
			name: 'emit_candidates',
			description:
				"Émettre la liste brute de candidats (URL + date + hints). À appeler UNE SEULE FOIS en fin d'analyse, après les recherches web.",
			input_schema: CANDIDATES_JSON_SCHEMA as unknown as Anthropic.Tool.InputSchema,
			strict: true,
			// cache_control sur le dernier tool → cache = system + tools complet.
			cache_control: { type: 'ephemeral' }
		} as unknown as Anthropic.Tool
	];

	return client.messages.create({
		model: MODEL,
		max_tokens: MAX_TOKENS_PHASE1,
		temperature: TEMP_PHASE1,
		system: [
			{
				type: 'text',
				text: PHASE1_SYSTEM_PROMPT,
				cache_control: { type: 'ephemeral' }
			}
		],
		tools,
		messages: [{ role: 'user', content: buildPhase1UserPrompt(input) }]
	});
}

async function runPhase1Candidates(
	client: Anthropic,
	input: GenerateInput
): Promise<{ candidates: IntelligenceCandidate[]; raw: Anthropic.Message; error?: string }> {
	let response: Anthropic.Message | undefined;
	let emitBlock: Anthropic.ToolUseBlock | undefined;
	let lastError = '';

	for (let attempt = 0; attempt < 2; attempt++) {
		response = await callPhase1(client, input);
		emitBlock = response.content.find(
			(b): b is Anthropic.ToolUseBlock =>
				b.type === 'tool_use' && b.name === 'emit_candidates'
		);
		if (emitBlock) break;
		lastError = `Phase 1 : modèle n'a pas appelé emit_candidates (stop_reason=${response.stop_reason})`;
	}

	if (!emitBlock || !response) {
		return { candidates: [], raw: response!, error: lastError };
	}

	const parsed = IntelligenceCandidatesSchema.safeParse(emitBlock.input);
	if (!parsed.success) {
		return {
			candidates: [],
			raw: response,
			error: `Phase 1 validation Zod échouée : ${parsed.error.message}`
		};
	}
	return { candidates: parsed.data.candidates, raw: response };
}

// ---------- Filtre programmatique 14j ----------

/**
 * Vérifie chaque candidat en parallèle :
 * - URL HEAD reachable (verifyUrl)
 * - og:published_time si dispo (source of truth), sinon date LLM
 * - Date dans fenêtre [windowStart, dateEnd]
 * Retourne les candidats survivants, avec published_at normalisé à la date vérifiée.
 */
export async function filterCandidatesByWindow(
	candidates: IntelligenceCandidate[],
	windowStart: string,
	windowEnd: string
): Promise<IntelligenceCandidate[]> {
	const results = await Promise.all(
		candidates.map(async (c) => {
			const [urlResult, ogDate] = await Promise.all([
				verifyUrl(c.url),
				fetchPublishedDate(c.url)
			]);
			if (!urlResult.ok) return null;

			const llmDate = parseFlexibleDate(c.published_at);
			const dateToCheck = ogDate ?? llmDate;
			if (!dateToCheck) return null;
			if (!isWithinWindow(dateToCheck, windowStart, windowEnd)) return null;

			// Normaliser published_at à la date vérifiée (og prioritaire).
			const normalized = dateToCheck.toISOString();
			return { ...c, published_at: normalized };
		})
	);
	return results.filter((c): c is IntelligenceCandidate => c !== null);
}

// ---------- Phase 2 : rédaction ----------

async function callPhase2(
	client: Anthropic,
	input: GenerateInput,
	candidates: IntelligenceCandidate[]
): Promise<Anthropic.Message> {
	const tools: Anthropic.Tool[] = [
		{
			type: 'web_search_20250305',
			name: 'web_search',
			max_uses: 3
		} as unknown as Anthropic.Tool,
		{
			name: 'emit_report',
			description:
				"Émettre l'édition hebdomadaire finale conforme au schéma. À appeler UNE SEULE FOIS en toute fin.",
			input_schema: REPORT_JSON_SCHEMA as unknown as Anthropic.Tool.InputSchema,
			strict: true,
			cache_control: { type: 'ephemeral' }
		} as unknown as Anthropic.Tool
	];

	return client.messages.create({
		model: MODEL,
		max_tokens: MAX_TOKENS_PHASE2,
		temperature: TEMP_PHASE2,
		system: [
			{
				type: 'text',
				text: PHASE2_SYSTEM_PROMPT,
				cache_control: { type: 'ephemeral' }
			}
		],
		tools,
		messages: [
			{
				role: 'user',
				content: buildPhase2UserPrompt({
					weekLabel: input.weekLabel,
					dateStart: input.dateStart,
					dateEnd: input.dateEnd,
					candidates,
					previousTitles: input.previousTitles
				})
			}
		]
	});
}

async function runPhase2Report(
	client: Anthropic,
	input: GenerateInput,
	candidates: IntelligenceCandidate[]
): Promise<{ report?: IntelligenceReport; raw: Anthropic.Message; error?: string }> {
	let response: Anthropic.Message | undefined;
	let emitBlock: Anthropic.ToolUseBlock | undefined;
	let lastError = '';

	for (let attempt = 0; attempt < 2; attempt++) {
		response = await callPhase2(client, input, candidates);
		emitBlock = response.content.find(
			(b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'emit_report'
		);
		if (emitBlock) break;
		lastError = `Phase 2 : modèle n'a pas appelé emit_report (stop_reason=${response.stop_reason})`;
	}

	if (!emitBlock || !response) {
		return { raw: response!, error: lastError };
	}

	const parsed = IntelligenceReportSchema.safeParse(emitBlock.input);
	if (!parsed.success) {
		return {
			raw: response,
			error: `Phase 2 validation Zod échouée : ${parsed.error.message}`
		};
	}
	return { report: parsed.data, raw: response };
}

// ---------- Orchestrateur public ----------

export async function generateIntelligenceReport(
	input: GenerateInput
): Promise<GenerateResult> {
	const apiKey = env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		return { success: false, error: 'ANTHROPIC_API_KEY manquante' };
	}

	const client = new Anthropic({ apiKey });

	// Phase 1 : extraction candidats bruts.
	const phase1 = await runPhase1Candidates(client, input);
	if (phase1.error) {
		return { success: false, error: phase1.error, raw: phase1.raw };
	}

	// Filtre programmatique : URL + og-date + fenêtre 14j.
	const windowStart = input.windowStart ?? input.dateStart;
	const filtered = await filterCandidatesByWindow(
		phase1.candidates,
		windowStart,
		input.dateEnd
	);

	// Phase 2 : rédaction éditoriale.
	const phase2 = await runPhase2Report(client, input, filtered);
	if (phase2.error || !phase2.report) {
		return {
			success: false,
			error: phase2.error,
			raw: phase2.raw,
			candidatesRaw: phase1.candidates,
			candidatesFiltered: filtered
		};
	}

	// Set des URLs candidates filtrées (normalisées) → détection mutation Phase 2.
	const candidateUrlSet = new Set(filtered.map((c) => normalizeUrlForCompare(c.url)));

	// Vérifications post-génération (URLs + entités + date) : redondantes avec
	// le filtre Phase 1 mais préservées pour compatibilité badge "Non vérifié"
	// et traçabilité (item.verification conservé dans la DB).
	const verifiedItems = await Promise.all(
		phase2.report.items.map(async (item) => {
			const [urlResult, entityResult, ogDate] = await Promise.all([
				verifyUrl(item.source.url),
				verifyEntitiesInText(
					[item.title, item.summary, item.deep_dive ?? ''].join('\n')
				),
				fetchPublishedDate(item.source.url)
			]);

			const llmDate = parseFlexibleDate(item.source.published_at);
			const dateToCheck = ogDate ?? llmDate;
			const dateSource: 'og' | 'llm' | 'none' = ogDate ? 'og' : llmDate ? 'llm' : 'none';
			const dateOk = dateToCheck
				? isWithinWindow(dateToCheck, windowStart, input.dateEnd)
				: false;

			const urlOk = urlResult.ok;
			const entityOk = entityResult.entity_ok;

			// Détection mutation URL : Phase 2 a-t-il émis une URL hors candidats ?
			const urlNorm = normalizeUrlForCompare(item.source.url);
			const urlMutated = candidateUrlSet.size > 0 && !candidateUrlSet.has(urlNorm);
			if (urlMutated) {
				console.warn(
					`[URL_MUTATED] rank=${item.rank} final=${item.source.url} not in candidates (${candidateUrlSet.size} filtered)`
				);
			}

			const needsFlag = !urlOk || entityOk === false || !dateOk || urlMutated;

			return {
				...item,
				maturity: needsFlag ? ('speculatif' as const) : item.maturity,
				verification: {
					url_ok: urlOk,
					url_reason: urlResult.reason,
					entity_ok: entityOk,
					unverified_entities: entityResult.unverified_entities,
					date_ok: dateOk,
					date_source: dateSource,
					url_mutated: urlMutated
				}
			};
		})
	);

	const enrichedItems = await enrichItemsWithOgImages(verifiedItems);

	// Bloc 6ter : filtrage qualité og:image — drop logo/placeholder/wrong-content-type
	// pour forcer la cascade fallback (génération fal.ai puis media_library).
	const filteredItems = await Promise.all(
		enrichedItems.map(async (it) => {
			if (!it.image_url) return it;
			const quality = await checkOgImageQuality(it.image_url);
			if (quality.ok) return it;
			console.log(
				`[og-quality] reject rank=${it.rank} reason=${quality.reason} url=${it.image_url}`
			);
			return { ...it, image_url: null };
		})
	);

	// Bloc 6ter : génération fal.ai pour items sans og:image fiable.
	// process.env.PUBLIC_SUPABASE_URL plus fiable que $env/dynamic/private dans contexte cron.
	const supabaseUrl = (process.env.PUBLIC_SUPABASE_URL ?? env.PUBLIC_SUPABASE_URL ?? '')
		.replace(/\\n/g, '')
		.trim();
	const falKey = env.FAL_KEY ?? process.env.FAL_KEY;
	const { items: itemsWithGenerated, outcomes: genOutcomes } = await generateFallbacksForItems(
		filteredItems,
		{ apiKey: falKey, supabaseUrl }
	);
	const generatedCount = genOutcomes.filter((o) => o.status === 'generated').length;
	const failedCount = genOutcomes.filter((o) => o.status === 'failed').length;
	if (generatedCount > 0 || failedCount > 0) {
		console.log(
			`[fal.ai fallback] generated=${generatedCount} failed=${failedCount} skipped_has_image=${
				genOutcomes.filter((o) => o.status === 'skipped_has_image').length
			} skipped_no_key=${genOutcomes.filter((o) => o.status === 'skipped_no_key').length}`
		);
	}

	const enrichedReport: IntelligenceReport = {
		...phase2.report,
		items: itemsWithGenerated
	};

	return {
		success: true,
		report: enrichedReport,
		raw: phase2.raw,
		candidatesRaw: phase1.candidates,
		candidatesFiltered: filtered
	};
}
