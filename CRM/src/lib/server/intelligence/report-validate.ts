import {
	IntelligenceEditionSchema,
	IntelligenceItemSchema,
	ImpactFilmproSchema,
	type IntelligenceReport,
	type IntelligenceItem
} from './schema';
import { z } from 'zod';

/**
 * Validation résiliente de la sortie `emit_report` du LLM (refonte 2026-06-06).
 *
 * Remplace le `safeParse` global "tout-ou-rien" qui faisait échouer TOUTE
 * l'édition dès qu'UN article violait UNE contrainte (incident cron W23, un
 * article à 1 seul `search_term`). Désormais :
 *
 *  - `meta` + `impacts_filmpro` : parse STRICT tout-ou-rien (garde-fou niveau
 *    édition — ce ne sont pas des articles ; un en-tête malformé = vrai problème).
 *  - `items` : parse ARTICLE PAR ARTICLE. Les conformes sont gardés, les
 *    fautifs écartés individuellement (jamais réparés — aucune donnée fabriquée).
 *  - Garde anti-dérive : si trop d'articles tombent, échec bruyant pour révéler
 *    une dégradation du modèle plutôt que publier en silence.
 *
 * Les articles gardés sont validés par `IntelligenceItemSchema` à l'identique :
 * aucune contrainte d'intégrité (URL https, date, enums) n'est relâchée, donc le
 * pipeline anti-hallucination en aval (sanitize/verify/cross-check) reçoit
 * exactement les mêmes garanties qu'avant. Voir
 * .product-architect/veille/resilience-validation-spec.md.
 */

/** Seuil absolu de drop validé Pascal 2026-06-06 : au-delà = échec bruyant. */
export const MAX_DROPPED_ABSOLUTE = 3;
/** Seuil ratio de drop validé Pascal 2026-06-06 : au-delà = échec bruyant. */
export const MAX_DROPPED_RATIO = 0.3;

export interface DroppedArticle {
	/** Index de l'article dans le tableau brut émis par le modèle. */
	index: number;
	/** Titre best-effort (si extractible du brut), pour les logs. */
	title: string | null;
	/** Contraintes violées (chemin Zod + code), pour audit/log de dérive. */
	violations: string;
}

export type PartitionResult =
	| { ok: true; report: IntelligenceReport; dropped: DroppedArticle[] }
	| { ok: false; error: string; dropped: DroppedArticle[] };

/**
 * Enveloppe report : `meta` et `impacts_filmpro` stricts, `items` laissés bruts
 * (validés ensuite un par un). Préserve les défauts d'origine (clés optionnelles).
 */
const ReportShellSchema = z.object({
	meta: IntelligenceEditionSchema,
	items: z.array(z.unknown()).optional().default([]),
	impacts_filmpro: z.array(ImpactFilmproSchema).min(0).max(3).optional().default([])
});

function bestEffortTitle(raw: unknown): string | null {
	if (raw && typeof raw === 'object' && 'title' in raw) {
		const t = (raw as { title: unknown }).title;
		if (typeof t === 'string') return t.slice(0, 120);
	}
	return null;
}

function formatViolations(error: z.ZodError): string {
	return error.issues
		.map((i) => `${i.path.join('.') || '(racine)'}: ${i.code}`)
		.join(' | ');
}

export function partitionReport(rawInput: unknown): PartitionResult {
	const shell = ReportShellSchema.safeParse(rawInput);
	if (!shell.success) {
		return {
			ok: false,
			error: `Validation Zod (meta/structure édition) échouée : ${shell.error.message}`,
			dropped: []
		};
	}

	const kept: IntelligenceItem[] = [];
	const dropped: DroppedArticle[] = [];

	shell.data.items.forEach((raw, index) => {
		const parsed = IntelligenceItemSchema.safeParse(raw);
		if (parsed.success) {
			kept.push(parsed.data);
		} else {
			dropped.push({ index, title: bestEffortTitle(raw), violations: formatViolations(parsed.error) });
		}
	});

	const total = shell.data.items.length;
	const droppedCount = dropped.length;

	// Garde anti-dérive : échec bruyant si trop d'articles non conformes.
	// total === 0 = semaine creuse légitime (aucun article émis) → NON bloquant
	// (l'infra low_volume/sparse en aval gère le volume publié).
	const tooManyAbsolute = droppedCount > MAX_DROPPED_ABSOLUTE;
	const tooManyRatio = total > 0 && droppedCount / total > MAX_DROPPED_RATIO;
	const allDropped = total > 0 && kept.length === 0;

	if (tooManyAbsolute || tooManyRatio || allDropped) {
		return {
			ok: false,
			error:
				`Trop d'articles non conformes : ${droppedCount}/${total} écartés ` +
				`(seuils : >${MAX_DROPPED_ABSOLUTE} absolu ou >${Math.round(MAX_DROPPED_RATIO * 100)}% ou 0 valide). ` +
				`Détail : ${dropped.map((d) => `[${d.index}] ${d.violations}`).join(' ; ')}`,
			dropped
		};
	}

	return {
		ok: true,
		report: {
			meta: shell.data.meta,
			items: kept,
			impacts_filmpro: shell.data.impacts_filmpro
		},
		dropped
	};
}
