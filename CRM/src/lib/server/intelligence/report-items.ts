import {
	IntelligenceItemSchema,
	IntelligenceEditionSchema,
	type IntelligenceItem,
	type IntelligenceReport,
	type ImpactFilmpro
} from './schema';

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

/**
 * Adapte une LIGNE DB `intelligence_reports` (forme PLATE : executive_summary,
 * compliance_tag, generated_at au top-level) vers la forme RENDU `IntelligenceReport`
 * (meta nichée) attendue par le rendu brief (email-brief.ts / endpoint PDF de marque).
 *
 * Deux formes de "report" coexistent dans le repo : la ligne DB plate (lue par /veille
 * et /veille/[id]) et le report nesté in-memory produit par run-generation. Ce pont est
 * l'UNIQUE adaptateur DB -> rendu, validé + testé (symétrie avec readReportItems) : il
 * supprime la reconstruction inline non typée et le risque de coller un jour la forme
 * plate dans le rendu (résumé silencieusement vide). meta validée via
 * IntelligenceEditionSchema (repli gracieux sur la ligne brute si legacy, comme
 * readReportItems) ; items via readReportItems ; impacts en best-effort.
 */
export function rowToIntelligenceReport(row: {
	week_label: string;
	generated_at: string;
	compliance_tag: string;
	executive_summary: string;
	items: unknown;
	impacts_filmpro?: unknown;
	id?: string;
}): IntelligenceReport {
	const metaRaw = {
		week_label: row.week_label,
		generated_at: row.generated_at,
		compliance_tag: row.compliance_tag,
		executive_summary: row.executive_summary
	};
	const metaParsed = IntelligenceEditionSchema.safeParse(metaRaw);
	if (!metaParsed.success) {
		console.warn(
			`[veille] édition ${row.id ?? row.week_label} : meta non conforme (legacy ?), rendu en mode brut.`
		);
	}
	return {
		meta: metaParsed.success ? metaParsed.data : (metaRaw as IntelligenceReport['meta']),
		items: readReportItems(row.items, row.id ?? row.week_label),
		impacts_filmpro: (row.impacts_filmpro ?? []) as ImpactFilmpro[]
	};
}
