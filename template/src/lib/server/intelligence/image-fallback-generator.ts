/**
 * Orchestrateur de génération + stockage d'images fallback pour items Veille.
 *
 * Pipeline 3 étapes par item (si image_url=null après filtrage og) :
 *  1. Brief LLM Sonnet 4.6 → JSON {main_subject, foreground_detail, background, photographic_style}
 *  2. Construction prompt structuré + appel fal.ai Flux 1.1 Pro Ultra
 *  3. Audit Vision Opus 4.6 → score pertinence vs titre/résumé (≥6/10 requis)
 *
 * Si l'une des étapes échoue, l'image (si stockée) reste en lib mais
 * generated_image_url reste null → cascade fallback media_library prend le relais.
 */

import Anthropic from '@anthropic-ai/sdk';
import { generateImageViaFal } from './image-generator-fal';
import { inferSegmentFromText } from './segment-mapper';
import { uploadMedia, getServiceClient } from '../media-library';

const BUCKET = 'media-library';
const DOWNLOAD_TIMEOUT_MS = 30_000;
const MIN_RELEVANCE_SCORE = 6; // /10 — seuil audit Vision pour servir l'image générée
const BRIEF_MODEL = 'claude-sonnet-4-6'; // matériel/concret pour Recraft/Flux
const VISION_MODEL = 'claude-opus-4-6'; // qualité critique du filet de sécurité

interface VisualBrief {
	main_subject: string;
	foreground_detail: string;
	background: string;
	photographic_style: string;
}

interface VisionAudit {
	relevance_score: number;
	one_sentence_critique: string;
}

interface ItemForGeneration {
	rank: number;
	title: string;
	summary?: string;
	segment?: string | null;
	image_url: string | null;
}

export interface GenerationOutcome {
	rank: number;
	status: 'generated' | 'skipped_has_image' | 'skipped_no_key' | 'failed';
	publicUrl?: string;
	reason?: string;
}

async function downloadImageBuffer(url: string): Promise<Buffer | null> {
	const controller = new AbortController();
	const t = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
	try {
		const res = await fetch(url, { signal: controller.signal });
		if (!res.ok) return null;
		const arr = new Uint8Array(await res.arrayBuffer());
		return Buffer.from(arr);
	} catch {
		return null;
	} finally {
		clearTimeout(t);
	}
}

/**
 * Étape 1 — Brief LLM Sonnet → JSON visuel structuré.
 * System prompt strict métier FilmPro (vitrages, façades, no people, photoréaliste).
 * Phrases courtes (~25 mots/champ) pour respecter limite Flux ~1000 chars.
 */
async function buildBriefViaLLM(
	anthropic: Anthropic,
	item: ItemForGeneration
): Promise<VisualBrief | null> {
	const systemPrompt = `Tu génères des briefs visuels pour un illustrateur photographe éditorial.

CONTEXTE MÉTIER (non négociable) : FilmPro est un installateur suisse romand de films et vernis pour vitrages de bâtiments tertiaires/résidentiels (contrôle solaire, sécurité, anti-vandalisme, discrétion, esthétique). Toutes les images doivent évoquer cet univers visuel : vitrages, façades vitrées, intérieurs vus à travers des baies vitrées, films/vernis appliqués, matériaux verre + métal + lumière.

ANCRAGE OBLIGATOIRE : la composition DOIT contenir au moins un élément vitrage/baie vitrée/façade en verre, même si le sujet de l'article est abstrait ou technique. Si le sujet ne s'y prête pas directement, utilise une métaphore architecturale via le vitrage.

INTERDITS : tuyauterie industrielle, machines hors vitrage, personnes/visages/mains, textes/logos/watermarks, style illustration/3D/dessin.

CONTRAINTE LONGUEUR : chaque champ = 1 phrase, MAX 25 mots, style télégraphique éditorial.

Tu réponds UNIQUEMENT avec un JSON valide, sans markdown, format :
{
  "main_subject": "sujet — DOIT contenir vitrage/façade/baie (max 25 mots)",
  "foreground_detail": "détail premier plan (max 25 mots)",
  "background": "arrière-plan (max 25 mots)",
  "photographic_style": "lumière + ambiance + technique (max 25 mots)"
}`;

	const userPrompt = `Titre : ${item.title}\n\nRésumé : ${item.summary ?? '(pas de résumé)'}\n\nGénère le brief visuel JSON.`;

	try {
		const response = await anthropic.messages.create({
			model: BRIEF_MODEL,
			max_tokens: 500,
			system: systemPrompt,
			messages: [{ role: 'user', content: userPrompt }]
		});
		const block = response.content.find((b) => b.type === 'text');
		if (!block || block.type !== 'text') return null;
		let jsonStr = block.text.trim();
		if (jsonStr.startsWith('```')) {
			jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
		}
		return JSON.parse(jsonStr) as VisualBrief;
	} catch (e) {
		console.error('[brief LLM] error', e);
		return null;
	}
}

/**
 * Étape 2 — Construction prompt structure éditoriale (pattern Recraft + suffix Flux).
 * Sécurité longueur : truncate à 990 chars (limite Flux ~1000).
 */
function buildPromptFromBrief(brief: VisualBrief): string {
	const full = [
		`Editorial photograph: ${brief.main_subject}.`,
		`Foreground: ${brief.foreground_detail}.`,
		`Background: ${brief.background}.`,
		`Style: ${brief.photographic_style}.`
	].join(' ');
	return full.length > 900 ? full.slice(0, 900) : full;
}

/**
 * Étape 3 — Audit Vision Opus pertinence sur l'image générée.
 * Score 0-10. Seuil de service = MIN_RELEVANCE_SCORE.
 * Justifie chaque décision (one_sentence_critique loggée).
 */
async function auditPertinenceViaVision(
	anthropic: Anthropic,
	imageUrl: string,
	item: ItemForGeneration
): Promise<VisionAudit | null> {
	const systemPrompt = `Tu es directeur artistique évaluant des images d'illustration de presse pour le secteur "films et vernis vitrages bâtiments" (FilmPro, Suisse romande).

Tu réponds UNIQUEMENT avec un JSON valide, sans markdown :
{
  "relevance_score": 0-10 (pertinence visuelle vs titre/résumé article et univers métier vitrages),
  "one_sentence_critique": "1 phrase factuelle décrivant ce qu'on voit + verdict pertinence"
}`;

	const userPrompt = `Article :
Titre : ${item.title}
Résumé : ${item.summary ?? '(pas de résumé)'}

Évalue l'image ci-dessous.`;

	try {
		const response = await anthropic.messages.create({
			model: VISION_MODEL,
			max_tokens: 400,
			system: systemPrompt,
			messages: [
				{
					role: 'user',
					content: [
						{ type: 'image', source: { type: 'url', url: imageUrl } },
						{ type: 'text', text: userPrompt }
					]
				}
			]
		});
		const block = response.content.find((b) => b.type === 'text');
		if (!block || block.type !== 'text') return null;
		let jsonStr = block.text.trim();
		if (jsonStr.startsWith('```')) {
			jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
		}
		return JSON.parse(jsonStr) as VisionAudit;
	} catch (e) {
		console.error('[vision audit] error', e);
		return null;
	}
}

/**
 * Génère et stocke une image fal.ai pour 1 item, avec audits qualité technique
 * et Vision pertinence. Image stockée toujours en lib (réutilisable) mais
 * generated_image_url servi seulement si tous les audits passent.
 */
export async function generateAndStoreFallback(
	item: ItemForGeneration,
	apiKey: string,
	supabaseUrl: string,
	anthropicKey: string
): Promise<GenerationOutcome> {
	if (item.image_url) {
		return { rank: item.rank, status: 'skipped_has_image' };
	}

	const anthropic = new Anthropic({ apiKey: anthropicKey });
	const inferredSegment = inferSegmentFromText(item.title, item.summary ?? '');

	// Étape 1 — Brief LLM
	const brief = await buildBriefViaLLM(anthropic, item);
	if (!brief) {
		return { rank: item.rank, status: 'failed', reason: 'brief LLM échoué' };
	}

	// Étape 2 — Prompt + appel fal.ai Flux Pro Ultra
	const prompt = buildPromptFromBrief(brief);
	const gen = await generateImageViaFal({ prompt, apiKey });
	if (!gen.ok || !gen.url) {
		return { rank: item.rank, status: 'failed', reason: gen.reason ?? 'fal returned no url' };
	}

	const buffer = await downloadImageBuffer(gen.url);
	if (!buffer) {
		return { rank: item.rank, status: 'failed', reason: `download failed (${gen.url})` };
	}

	const supabase = getServiceClient();
	const upload = await uploadMedia(supabase, {
		buffer,
		source: 'fal-ai',
		source_url: gen.url,
		credit: 'Generated by fal.ai (Flux 1.1 Pro Ultra)',
		license: 'fal.ai output',
		description: item.title,
		tags: ['fal-ai', 'generated', inferredSegment ?? 'general'],
		segment: inferredSegment ?? undefined,
		notes: `Auto-généré pipeline cron Veille rank=${item.rank}`
	});
	if (upload.status === 'error' || !upload.storage_path) {
		return { rank: item.rank, status: 'failed', reason: `upload failed: ${upload.reason ?? 'unknown'}` };
	}

	// Étape 3a — Audit qualité technique (dimensions, ratio, format)
	const technicalAudit = await auditUploadedImage(supabase, upload.id!);
	if (!technicalAudit.ok) {
		return { rank: item.rank, status: 'failed', reason: `technical audit: ${technicalAudit.reason}` };
	}

	// Étape 3b — Audit Vision pertinence sémantique
	const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${upload.storage_path}`;
	const vision = await auditPertinenceViaVision(anthropic, publicUrl, item);
	if (!vision) {
		console.warn(`[fallback gen] vision audit indisponible rank=${item.rank}, image servie sans audit`);
	} else {
		console.log(
			`[fallback gen] rank=${item.rank} vision_score=${vision.relevance_score}/10 — ${vision.one_sentence_critique}`
		);
		if (vision.relevance_score < MIN_RELEVANCE_SCORE) {
			return {
				rank: item.rank,
				status: 'failed',
				reason: `vision relevance ${vision.relevance_score}/10 < ${MIN_RELEVANCE_SCORE}`
			};
		}
	}

	return { rank: item.rank, status: 'generated', publicUrl };
}

/**
 * Audit backend post-upload : récupère le row media_library complet pour valider
 * quality_score et is_placeholder. Évite de servir une image médiocre ou marquée
 * placeholder par qualityScore() (ratio aberrant, taille suspecte, format dégradé).
 */
const MIN_QUALITY_SCORE_FAL = 7;

async function auditUploadedImage(
	supabase: ReturnType<typeof getServiceClient>,
	mediaId: string
): Promise<{ ok: boolean; reason?: string }> {
	const { data, error } = await supabase
		.from('media_library')
		.select('quality_score, is_placeholder, width, height')
		.eq('id', mediaId)
		.maybeSingle();
	if (error || !data) {
		return { ok: false, reason: `audit fetch failed: ${error?.message ?? 'no row'}` };
	}
	if (data.is_placeholder) {
		return { ok: false, reason: 'flagged is_placeholder' };
	}
	if ((data.quality_score ?? 0) < MIN_QUALITY_SCORE_FAL) {
		return {
			ok: false,
			reason: `quality_score ${data.quality_score} < ${MIN_QUALITY_SCORE_FAL}`
		};
	}
	// Sanity dim : Recraft V3 landscape_16_9 attendu ~1820×1024. Tolérance large.
	if ((data.width ?? 0) < 800 || (data.height ?? 0) < 400) {
		return { ok: false, reason: `dimensions trop faibles ${data.width}x${data.height}` };
	}
	return { ok: true };
}

/**
 * Pipeline batch : génère pour tous les items qui en ont besoin.
 * Concurrence limitée (default 2) pour éviter de saturer fal.ai et la bande passante.
 */
export async function generateFallbacksForItems<T extends ItemForGeneration>(
	items: T[],
	options: {
		apiKey?: string;
		supabaseUrl: string;
		anthropicKey?: string;
		concurrency?: number;
	} = { supabaseUrl: '' }
): Promise<{ items: (T & { generated_image_url?: string | null })[]; outcomes: GenerationOutcome[] }> {
	if (!options.apiKey || !options.anthropicKey) {
		return {
			items: items.map((it) => ({ ...it, generated_image_url: null })),
			outcomes: items.map((it) => ({ rank: it.rank, status: 'skipped_no_key' as const }))
		};
	}

	const concurrency = options.concurrency ?? 2;
	const targets = items
		.map((item, idx) => ({ item, idx }))
		.filter(({ item }) => !item.image_url);

	const result = items.map((it) => ({ ...it, generated_image_url: null as string | null }));
	const outcomes: GenerationOutcome[] = [];
	let cursor = 0;

	async function worker() {
		while (cursor < targets.length) {
			const current = targets[cursor++];
			const outcome = await generateAndStoreFallback(
				current.item,
				options.apiKey!,
				options.supabaseUrl,
				options.anthropicKey!
			);
			outcomes.push(outcome);
			if (outcome.status === 'generated' && outcome.publicUrl) {
				result[current.idx] = {
					...result[current.idx],
					generated_image_url: outcome.publicUrl
				};
			}
		}
	}

	await Promise.all(
		Array.from({ length: Math.min(concurrency, Math.max(targets.length, 1)) }, () => worker())
	);

	// Items qui avaient déjà une image_url → noté comme skipped
	for (const it of items) {
		if (it.image_url && !outcomes.find((o) => o.rank === it.rank)) {
			outcomes.push({ rank: it.rank, status: 'skipped_has_image' });
		}
	}

	return { items: result, outcomes };
}
