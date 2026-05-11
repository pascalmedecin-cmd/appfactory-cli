/**
 * Helpers de formatage pour la page /pipeline (refonte v9 S176bis).
 * - Format relance : "06 mai · J-2" (overdue), "À planifier" (null), "18 mai · J+10" (futur)
 * - Format montant compact : "28 500 CHF", "213.6 k CHF" (≥ 100 000), null si zéro/null
 * - Helpers totals/progress/indicators pour Kanban + bandeau indicateurs
 */
import { z } from 'zod';

/**
 * Audit 360 M-16 : forme attendue d'une ligne `opportunites` (avec jointures)
 * lue par /pipeline. Validation au boundary du `load` — une ligne dont les
 * champs critiques sont absents/mal typés est ignorée + loggée plutôt que de
 * traverser le composant en castée à l'aveugle. `.passthrough()` : les colonnes
 * DB et jointures supplémentaires (contacts/entreprises/signaux_affaires) restent.
 */
export const PipelineOpportuniteRowSchema = z
	.object({
		id: z.string(),
		titre: z.string().nullable().optional(),
		etape_pipeline: z.string().nullable().optional(),
		// `montant_estime` : numeric DB ; PostgREST/supabase-js peut le transiter en
		// string selon la config. Le code aval (formatMontantCompact) tolère déjà
		// number|null ; on ne veut pas écarter toute la ligne pour un type souple
		// (audit contracts). Seul `id` (PK NOT NULL) est strict.
		montant_estime: z.union([z.number(), z.string()]).nullable().optional(),
		date_relance_prevue: z.string().nullable().optional()
	})
	.passthrough();

const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function startOfDay(d: Date): Date {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	return x;
}

export type RelanceLabel = {
	label: string;
	overdue: boolean;
	hasDate: boolean;
};

/**
 * Format relance Kanban card : "06 mai · J-2" si overdue, "18 mai · J+10" si futur,
 * "À planifier" si pas de date.
 */
export function formatRelancePipeline(input: string | Date | null | undefined, now: Date = new Date()): RelanceLabel {
	if (!input) return { label: 'À planifier', overdue: false, hasDate: false };
	const d = typeof input === 'string' ? new Date(input) : input;
	if (Number.isNaN(d.getTime())) return { label: 'À planifier', overdue: false, hasDate: false };

	const today = startOfDay(now);
	const target = startOfDay(d);
	const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);

	const day = String(d.getDate()).padStart(2, '0');
	const mois = MOIS_COURTS[d.getMonth()];
	const datePart = `${day} ${mois}`;

	if (diffDays < 0) return { label: `${datePart} · J${diffDays}`, overdue: true, hasDate: true };
	if (diffDays === 0) return { label: `${datePart} · aujourd'hui`, overdue: false, hasDate: true };
	return { label: `${datePart} · J+${diffDays}`, overdue: false, hasDate: true };
}

/**
 * Format compact montant CHF.
 * - null / 0 / négatif → null (caller affiche un placeholder muted)
 * - < 100 000 → "28 500 CHF" (groupe milliers)
 * - >= 100 000 → "213.6 k CHF" (1 décimale, k suffix)
 */
export function formatMontantCompact(n: number | null | undefined): string | null {
	if (n == null || !Number.isFinite(n) || n <= 0) return null;
	if (n < 100_000) {
		return `${new Intl.NumberFormat('fr-CH').format(Math.round(n))} CHF`;
	}
	const k = (n / 1000).toFixed(1).replace(/\.0$/, '');
	return `${k} k CHF`;
}

export type EtapeKey = 'identification' | 'qualification' | 'proposition' | 'negociation' | 'gagne' | 'perdu';

const ETAPES_ACTIVES: ReadonlyArray<EtapeKey> = ['identification', 'qualification', 'proposition', 'negociation'];

/**
 * Progress visuelle 0-1 par étape active uniquement (pour la barre fine en col-head).
 * Étapes closed (gagne/perdu) → 0 (la barre n'est pas rendue côté composant).
 */
export function progressByEtape(etapeKey: string): number {
	const idx = ETAPES_ACTIVES.indexOf(etapeKey as EtapeKey);
	if (idx === -1) return 0;
	// 0.6 / 0.75 / 0.85 / 0.95
	return 0.6 + idx * 0.13 - (idx === 3 ? 0.04 : 0);
}

export type OppLite = {
	id: string;
	etape_pipeline: string | null;
	montant_estime: number | null;
	date_relance_prevue: string | null;
	date_cloture_effective?: string | null;
};

/**
 * Totaux cumulés count + sum montant par étape (toutes étapes).
 */
export function totalsByEtape<T extends OppLite>(opps: ReadonlyArray<T>): Record<string, { count: number; sum: number }> {
	const out: Record<string, { count: number; sum: number }> = {};
	for (const opp of opps) {
		const key = opp.etape_pipeline ?? 'identification';
		const slot = out[key] ?? { count: 0, sum: 0 };
		slot.count += 1;
		slot.sum += opp.montant_estime ?? 0;
		out[key] = slot;
	}
	return out;
}

export type PipelineTab = 'en-cours' | 'closed' | 'toutes';

/**
 * Etapes visibles selon le tab actif.
 */
export function etapesVisibleForTab(tab: PipelineTab): ReadonlyArray<EtapeKey> {
	if (tab === 'closed') return ['gagne', 'perdu'];
	if (tab === 'toutes') return ['identification', 'qualification', 'proposition', 'negociation', 'gagne', 'perdu'];
	return ETAPES_ACTIVES;
}

export type IndicatorsValues = {
	active: number;
	valueActive: number;
	wonThisMonthCount: number;
	wonThisMonthValue: number;
	overdue: number;
};

/**
 * Indicateurs flat premium en haut de page.
 * - active : count opps en étapes actives (4 étapes)
 * - valueActive : sum montant_estime des opps actives
 * - wonThisMonthCount/Value : opps `gagne` avec date_cloture_effective dans le mois courant
 * - overdue : opps actives avec date_relance_prevue strictement antérieure à `now`
 */
export function pipelineIndicators<T extends OppLite>(opps: ReadonlyArray<T>, now: Date = new Date()): IndicatorsValues {
	const today = startOfDay(now);
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

	let active = 0;
	let valueActive = 0;
	let wonThisMonthCount = 0;
	let wonThisMonthValue = 0;
	let overdue = 0;

	for (const opp of opps) {
		const etape = opp.etape_pipeline ?? 'identification';
		const isActive = ETAPES_ACTIVES.includes(etape as EtapeKey);

		if (isActive) {
			active += 1;
			valueActive += opp.montant_estime ?? 0;
			if (opp.date_relance_prevue) {
				const d = startOfDay(new Date(opp.date_relance_prevue));
				if (d.getTime() < today.getTime()) overdue += 1;
			}
		}

		if (etape === 'gagne' && opp.date_cloture_effective) {
			const closeDate = new Date(opp.date_cloture_effective);
			if (!Number.isNaN(closeDate.getTime()) && closeDate >= monthStart && closeDate <= now) {
				wonThisMonthCount += 1;
				wonThisMonthValue += opp.montant_estime ?? 0;
			}
		}
	}

	return { active, valueActive, wonThisMonthCount, wonThisMonthValue, overdue };
}
