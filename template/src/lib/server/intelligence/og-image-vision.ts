/**
 * Passe Vision Niveau 1 : juge sémantique d'une og:image résolue.
 *
 * Complément à checkOgImageQuality (filtres rapides URL + HEAD) : applique
 * une Vision Claude Sonnet pour rejeter les og:image qui sont techniquement
 * valides (JPEG/PNG > 20 KB, URL propre) mais éditorialement inacceptables :
 * schémas scientifiques, infographies, captures d'écran, illustrations,
 * images génériques sans lien contextuel avec l'article.
 *
 * Incident déclencheur : W16 2026-04-22, Springer a servi Fig1_HTML.png
 * (diagramme axonométrique labellisé de vitrages) comme og:image — passé
 * trivialement les filtres URL + HEAD.
 *
 * Coût : ~$0.003/item avec og:image (Sonnet 4.6). Latence ~2-4s/item.
 * Budget cron Hobby (300s) : 10 items × 4s = 40s, confortable.
 */

import Anthropic from '@anthropic-ai/sdk';
import { costTracker } from './cost-tracker';

const VISION_MODEL = 'claude-sonnet-4-6';
const MIN_CONTEXTUAL_SCORE = 7; // /10 : pertinence contextuelle requise

export interface OgImageVisionAudit {
	is_photograph: boolean;
	is_editorial: boolean;
	no_diagram_or_infographic: boolean;
	no_screenshot_or_ui: boolean;
	contextual_score: number; // 0-10
	one_sentence_critique: string;
}

export interface OgImageVisionResult {
	ok: boolean;
	reason?: string;
	audit?: OgImageVisionAudit;
}

/**
 * Audite une og:image déjà validée techniquement (URL safe + HEAD content-type).
 *
 * Retourne `ok=false` si :
 *  - pas une photo (illustration / 3D / dessin)
 *  - pas éditorial (stock banal sans propos)
 *  - diagramme / schéma / infographie / chart
 *  - capture d'écran / UI
 *  - score contextuel < MIN_CONTEXTUAL_SCORE
 *
 * Un `ok=false` force la cascade vers fal.ai (Niveau 2).
 */
export async function auditOgImageVision(
	anthropic: Anthropic,
	imageUrl: string,
	item: { title: string; summary?: string }
): Promise<OgImageVisionResult> {
	const systemPrompt = `Tu es directeur artistique évaluant une image candidate comme illustration d'article de presse pour FilmPro (Suisse romande, films/vernis protection vitrages bâtiments tertiaires et résidentiels).

TA MISSION : juger si cette image est acceptable éditorialement et contextuellement pertinente vs le titre/résumé de l'article.

CRITÈRES DE REJET STRICT (tous doivent être respectés) :
- is_photograph : l'image est une PHOTOGRAPHIE réelle (pas illustration, pas rendu 3D, pas dessin, pas peinture)
- is_editorial : l'image a un parti pris visuel éditorial (composition, lumière, cadrage), PAS une photo stock générique banale
- no_diagram_or_infographic : aucun diagramme, schéma technique, axonométrie, chart, graphique, infographie, flowchart, illustration technique avec labels
- no_screenshot_or_ui : aucune capture d'écran d'application, interface, site web, tableau de bord

CONTEXTUAL_SCORE (0-10) : pertinence visuelle de l'image vs le SUJET précis de l'article.
- 10 : évidence parfaite, image illustre précisément le sujet
- 7-9 : bonne pertinence, lien clair et éditorialement fort
- 4-6 : pertinence vague (univers ok, sujet pas vraiment illustré)
- 0-3 : hors sujet ou absurde

Tu réponds UNIQUEMENT avec un JSON valide, sans markdown :
{
  "is_photograph": true/false,
  "is_editorial": true/false,
  "no_diagram_or_infographic": true/false,
  "no_screenshot_or_ui": true/false,
  "contextual_score": 0-10,
  "one_sentence_critique": "1 phrase factuelle décrivant ce qu'on voit + verdict éditorial"
}`;

	const userPrompt = `Article :
Titre : ${item.title}
Résumé : ${item.summary ?? '(pas de résumé)'}

Évalue l'image ci-dessous selon les critères du système.`;

	let response: Anthropic.Message;
	try {
		response = await anthropic.messages.create({
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
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return { ok: false, reason: `vision fetch error: ${msg}` };
	}

	costTracker.addClaudeCall(VISION_MODEL, response.usage, 'Claude Vision audit (og:image)');

	const block = response.content.find((b) => b.type === 'text');
	if (!block || block.type !== 'text') {
		return { ok: false, reason: 'vision no text response' };
	}

	let audit: OgImageVisionAudit;
	try {
		let jsonStr = block.text.trim();
		if (jsonStr.startsWith('```')) {
			jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
		}
		audit = JSON.parse(jsonStr) as OgImageVisionAudit;
	} catch {
		return { ok: false, reason: 'vision invalid JSON' };
	}

	if (!audit.is_photograph) return { ok: false, reason: 'not_photograph', audit };
	if (!audit.is_editorial) return { ok: false, reason: 'not_editorial', audit };
	if (!audit.no_diagram_or_infographic) return { ok: false, reason: 'diagram_or_infographic', audit };
	if (!audit.no_screenshot_or_ui) return { ok: false, reason: 'screenshot_or_ui', audit };
	if (audit.contextual_score < MIN_CONTEXTUAL_SCORE) {
		return {
			ok: false,
			reason: `contextual_score ${audit.contextual_score}/10 < ${MIN_CONTEXTUAL_SCORE}`,
			audit
		};
	}

	return { ok: true, audit };
}
