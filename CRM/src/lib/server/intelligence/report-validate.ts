import {
	IntelligenceItemSchema,
	ImpactFilmproSchema,
	ComplianceTagEnum,
	type IntelligenceReport,
	type IntelligenceItem,
	type IntelligenceEdition
} from './schema';
import { parseFlexibleDate } from './parse-date';
import { z } from 'zod';

/**
 * Validation résiliente de la sortie `emit_report` du LLM.
 *
 * Refonte 2026-06-06 (articles par-article) + élargie 2026-06-19 (audit racine,
 * décision Pascal « publier ce qui est bon ») : aucun écart LOCAL ne doit faire
 * perdre toute l'édition.
 *
 *  - `meta` : NORMALISÉ jamais rejeté (resilientMeta). compliance_tag invalide →
 *    fallback 'Non exploitable' ; executive_summary tronqué/placeholder ;
 *    week_label + generated_at ré-écrits serveur (décoratifs ici). Avant 06-19,
 *    un en-tête imparfait (résumé court, date sans `Z`) faisait échouer toute
 *    l'édition pour un champ que le serveur écrase.
 *  - `impacts_filmpro` : validés UN PAR UN, non conformes écartés (cap 3), jamais
 *    bloquant (avant : strict tout-ou-rien).
 *  - `items` : parse ARTICLE PAR ARTICLE. Conformes gardés, fautifs écartés
 *    individuellement (jamais réparés — aucune donnée fabriquée).
 *  - Garde anti-dérive : seul le RATIO (>30%) + le « 0 valide » subsistent (le
 *    seuil absolu >3 a été retiré, il ne scalait pas avec la sur-génération 12-15).
 *
 * Les articles gardés sont validés par `IntelligenceItemSchema` à l'identique :
 * aucune contrainte d'intégrité (URL https, date, enums) n'est relâchée, donc le
 * pipeline anti-hallucination en aval (sanitize/verify/cross-check) reçoit
 * exactement les mêmes garanties qu'avant. Voir
 * .product-architect/veille/resilience-validation-spec.md.
 */

/**
 * Seuil RATIO de drop : au-delà = vraie dérive du modèle → échec bruyant.
 * Le seuil ABSOLU (>3) validé 06-06 a été RETIRÉ le 2026-06-19 (décision Pascal
 * « publier ce qui est bon ») : il ne scalait pas avec la sur-génération 12-15
 * (4 écarts sur 15 = 27% faisait échouer 11 bons articles). Seuls le ratio et le
 * « 0 valide » gardent contre la dérive réelle.
 */
export const MAX_DROPPED_RATIO = 0.3;

const META_FALLBACK_SUMMARY = 'Édition générée (synthèse executive indisponible).';

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
 * Enveloppe report : structure seulement (rawInput DOIT être un objet avec ces
 * clés). meta + impacts laissés BRUTS (`unknown`), normalisés/validés un par un
 * en aval — la seule fatalité restante est un emit_report qui n'est même pas un
 * objet JSON (le modèle n'a rien émis d'exploitable).
 */
const ReportShellSchema = z.object({
	meta: z.unknown(),
	items: z.array(z.unknown()).optional().default([]),
	impacts_filmpro: z.array(z.unknown()).optional().default([])
});

/**
 * Construit un `meta` TOUJOURS valide à partir du brut émis par le modèle, en
 * NORMALISANT plutôt qu'en rejetant (décision Pascal 2026-06-19) :
 *  - compliance_tag : enum, sinon fallback 'Non exploitable' (signale « à revoir »).
 *  - executive_summary : tronqué à 2000, placeholder si vide (jamais rejeté min/max).
 *  - week_label / generated_at : ré-écrits serveur en aval (décoratifs ici) ; on
 *    pose des valeurs valides pour la forme (déterministe, sans horloge : epoch fixe
 *    si non parsable).
 * Les écarts sont retournés pour log (dérive en-tête), jamais bloquants.
 */
function resilientMeta(raw: unknown): { meta: IntelligenceEdition; issues: string[] } {
	const m = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
	const issues: string[] = [];

	const tag = ComplianceTagEnum.safeParse(m.compliance_tag);
	const compliance_tag = tag.success ? tag.data : 'Non exploitable';
	if (!tag.success) issues.push('compliance_tag invalide → Non exploitable');

	let summary = typeof m.executive_summary === 'string' ? m.executive_summary.trim() : '';
	if (summary.length > 2000) {
		summary = summary.slice(0, 2000);
		issues.push('executive_summary tronqué à 2000');
	}
	if (summary.length === 0) {
		summary = META_FALLBACK_SUMMARY;
		issues.push('executive_summary vide → placeholder');
	}

	const week_label =
		typeof m.week_label === 'string' && /^\d{4}-W\d{2}$/.test(m.week_label)
			? m.week_label
			: '0000-W00';
	const parsedGen = parseFlexibleDate(typeof m.generated_at === 'string' ? m.generated_at : null);
	const generated_at = parsedGen ? parsedGen.toISOString() : new Date(0).toISOString();

	return {
		meta: { week_label, generated_at, compliance_tag, executive_summary: summary },
		issues
	};
}

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
			error: `Structure d'édition invalide (emit_report non conforme) : ${shell.error.message}`,
			dropped: []
		};
	}

	// Meta : normalisée, jamais rejetée (« publier ce qui est bon »).
	const { meta, issues: metaIssues } = resilientMeta(shell.data.meta);
	if (metaIssues.length > 0) {
		console.warn(`[report-validate] meta normalisée : ${metaIssues.join(' ; ')}`);
	}

	// Impacts : validés UN PAR UN, non conformes écartés (cap 3), jamais bloquant.
	const impacts_filmpro: z.infer<typeof ImpactFilmproSchema>[] = [];
	let droppedImpacts = 0;
	for (const raw of shell.data.impacts_filmpro) {
		const p = ImpactFilmproSchema.safeParse(raw);
		if (p.success) {
			if (impacts_filmpro.length < 3) impacts_filmpro.push(p.data);
		} else {
			droppedImpacts++;
		}
	}
	if (droppedImpacts > 0) {
		console.warn(`[report-validate] ${droppedImpacts} impact(s) écarté(s) (non conformes).`);
	}

	// Items : parse article par article.
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

	// Garde anti-dérive (décision Pascal 2026-06-19 « publier ce qui est bon ») :
	// le seuil ABSOLU >3 a été RETIRÉ (ne scalait pas avec la sur-génération 12-15 :
	// 4 écarts sur 15 = 27% faisaient échouer 11 bons articles). On garde le RATIO
	// (>30% = vraie dérive du modèle → échec bruyant) et le « 0 valide ».
	// total === 0 = semaine creuse légitime (aucun article émis) → NON bloquant.
	const tooManyRatio = total > 0 && droppedCount / total > MAX_DROPPED_RATIO;
	const allDropped = total > 0 && kept.length === 0;

	if (tooManyRatio || allDropped) {
		return {
			ok: false,
			error:
				`Trop d'articles non conformes : ${droppedCount}/${total} écartés ` +
				`(seuil : >${Math.round(MAX_DROPPED_RATIO * 100)}% ou 0 valide). ` +
				`Détail : ${dropped.map((d) => `[${d.index}] ${d.violations}`).join(' ; ')}`,
			dropped
		};
	}

	return {
		ok: true,
		report: { meta, items: kept, impacts_filmpro },
		dropped
	};
}
