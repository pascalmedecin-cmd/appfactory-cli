import { IntelligenceItemSchema, type IntelligenceItem } from './schema';

/**
 * Audit 360 M-19 : lecture validée du JSONB `intelligence_reports.items`.
 *
 * Les items sont validés au boundary de lecture (en plus de la validation au
 * write via `IntelligenceReportSchema`). Si une édition est legacy (items
 * pré-refonte non conformes au schéma courant), on retombe sur le cast brut —
 * pas de régression d'affichage, juste un `console.warn`.
 *
 * Source unique pour `/veille` (liste) et `/veille/[id]` (détail).
 */
export function readReportItems(raw: unknown, reportId: string): IntelligenceItem[] {
	const arr = (raw ?? []) as unknown[];
	const parsed = IntelligenceItemSchema.array().safeParse(arr);
	if (parsed.success) return parsed.data;
	console.warn(
		`[veille] édition ${reportId} : items JSONB non conforme au schéma (legacy ?), lecture en mode brut.`
	);
	return arr as IntelligenceItem[];
}
