import { formatMontantCompact } from '$lib/utils/pipelineFormat';

export type AccordionStageConfig = {
	key: string;
	label: string;
	icon: string;
};

export type AccordionOpp = {
	id: string;
	etape_pipeline: string | null;
	montant_estime: number | null;
	date_relance_prevue: string | null;
};

export type AccordionStage = {
	key: string;
	label: string;
	icon: string;
	count: number;
	montantTotal: number;
	opportunites: AccordionOpp[];
};

export function createCollapsedState(): Set<string> {
	return new Set();
}

export function toggleStageExpansion(state: ReadonlySet<string>, key: string): Set<string> {
	const next = new Set(state);
	if (next.has(key)) next.delete(key);
	else next.add(key);
	return next;
}

export function isStageExpanded(state: ReadonlySet<string>, key: string): boolean {
	return state.has(key);
}

export function expandAllStages(configs: ReadonlyArray<AccordionStageConfig>): Set<string> {
	return new Set(configs.map((c) => c.key));
}

export function buildAccordionStages(
	opps: ReadonlyArray<AccordionOpp>,
	configs: ReadonlyArray<AccordionStageConfig>
): AccordionStage[] {
	const buckets = new Map<string, AccordionOpp[]>();
	for (const cfg of configs) buckets.set(cfg.key, []);

	const defaultKey = configs[0]?.key ?? 'identification';
	for (const opp of opps) {
		const key = opp.etape_pipeline ?? defaultKey;
		const bucket = buckets.get(key) ?? buckets.get(defaultKey);
		bucket?.push(opp);
	}

	return configs.map((cfg) => {
		const list = buckets.get(cfg.key) ?? [];
		const montantTotal = list.reduce((acc, o) => acc + (o.montant_estime ?? 0), 0);
		return {
			key: cfg.key,
			label: cfg.label,
			icon: cfg.icon,
			count: list.length,
			montantTotal,
			opportunites: list
		};
	});
}

export function formatStageCount(n: number): string {
	return n >= 2 ? `${n} opportunités` : `${n} opportunité`;
}

export function formatStageMontantTotal(sum: number): string | null {
	return formatMontantCompact(sum);
}
