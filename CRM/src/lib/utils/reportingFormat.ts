/**
 * Helpers de formatage et calculs pour la page /reporting (refonte v9 S177).
 *
 * - formatCHF / formatPercent / formatMonth : affichage fr-CH.
 * - reportingIndicators : 4 KPIs flat premium (pipelineActif, conversion, contacts30, opportunites30).
 * - conversionVariant : couleur sémantique du KPI conversion (warning si 0 leads convertis, success si >= 30%).
 * - exportEntries : 3 cibles d'export CSV (cards v9 cliquables).
 * - reportingTabs : 4 onglets ARIA tablist (Synthèse / Pipeline / Activité / Export).
 */

import type {
	ActivityStats,
	ConversionStats,
} from '$lib/server/reporting';

export type ReportingTab = 'synthese' | 'pipeline' | 'activite' | 'export';

export type ReportingVariant = 'default' | 'success' | 'warning';

export interface ReportingData {
	pipelineActifTotal: number;
	conversion: ConversionStats;
	activityContacts: ActivityStats;
	activityEntreprises: ActivityStats;
	activityOpportunites: ActivityStats;
}

export interface ReportingIndicatorsValues {
	pipelineActifCHF: number;
	conversionPct: number;
	conversionRatio: { numerator: number; denominator: number };
	contacts30: number;
	contacts90: number;
	opportunites30: number;
	opportunites90: number;
}

export interface ExportEntry {
	key: 'contacts' | 'entreprises' | 'leads';
	label: string;
	hint: string;
	href: string;
	icon: string;
	total: number;
}

export interface ReportingTabSpec {
	key: ReportingTab;
	label: string;
}

const MONTH_LABELS: Record<string, string> = {
	'01': 'Jan',
	'02': 'Fév',
	'03': 'Mar',
	'04': 'Avr',
	'05': 'Mai',
	'06': 'Juin',
	'07': 'Juil',
	'08': 'Août',
	'09': 'Sep',
	'10': 'Oct',
	'11': 'Nov',
	'12': 'Déc',
};

const CHF_FORMATTER = new Intl.NumberFormat('fr-CH', {
	style: 'currency',
	currency: 'CHF',
	maximumFractionDigits: 0,
});

const PERCENT_FORMATTER = new Intl.NumberFormat('fr-CH', {
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
});

/** Formate un montant CHF sans décimales (séparateur fr-CH). */
export function formatCHF(amount: number): string {
	return CHF_FORMATTER.format(amount);
}

/** Formate un pourcentage avec 1 décimale + suffixe « % » (espace insécable fin). */
export function formatPercent(value: number): string {
	return `${PERCENT_FORMATTER.format(value)} %`;
}

/** Formate une clé YYYY-MM en libellé court fr-CH (Jan, Fév, …, Déc). */
export function formatMonth(key: string): string {
	const parts = key.split('-');
	if (parts.length !== 2) return key;
	const mm = parts[1];
	return MONTH_LABELS[mm] ?? key;
}

/**
 * Indicateurs flat premium en haut de la page /reporting.
 * Les 4 cards sont calculées une fois par render via $derived côté +page.svelte.
 */
export function reportingIndicators(data: ReportingData): ReportingIndicatorsValues {
	return {
		pipelineActifCHF: data.pipelineActifTotal,
		conversionPct: data.conversion.taux_pct,
		conversionRatio: {
			numerator: data.conversion.opportunites_depuis_lead,
			denominator: data.conversion.total_leads,
		},
		contacts30: data.activityContacts.last_30_days,
		contacts90: data.activityContacts.last_90_days,
		opportunites30: data.activityOpportunites.last_30_days,
		opportunites90: data.activityOpportunites.last_90_days,
	};
}

/**
 * Variante visuelle du KPI conversion.
 * - warning : leads > 0 mais conversion = 0 (signal d'alerte)
 * - success : conversion >= 30% (signal positif)
 * - default : entre les deux, ou rien à juger (0 leads)
 */
export function conversionVariant(taux_pct: number, total_leads: number): ReportingVariant {
	if (total_leads === 0) return 'default';
	if (taux_pct === 0) return 'warning';
	if (taux_pct >= 30) return 'success';
	return 'default';
}

/**
 * 3 cibles d'export CSV pour la section Export du tab v9.
 * Le `total` permet d'afficher « N lignes — CSV » sur chaque card.
 */
export function exportEntries(data: ReportingData): ExportEntry[] {
	return [
		{
			key: 'contacts',
			label: 'Contacts',
			hint: 'Toutes les fiches contact actives',
			href: '/api/export/contacts',
			icon: 'contacts',
			total: data.activityContacts.total,
		},
		{
			key: 'entreprises',
			label: 'Entreprises',
			hint: 'Annuaire complet d’entreprises',
			href: '/api/export/entreprises',
			icon: 'business',
			total: data.activityEntreprises.total,
		},
		{
			key: 'leads',
			label: 'Leads de prospection',
			hint: 'Pipeline d’acquisition (tous statuts)',
			href: '/api/export/leads',
			icon: 'search',
			// Pas de total `leads` calculé côté server (out of scope V1) → 0 affiché par défaut.
			total: 0,
		},
	];
}

/**
 * Liste figée des 4 onglets ARIA tablist. Synthèse = défaut.
 */
export function reportingTabs(): ReportingTabSpec[] {
	return [
		{ key: 'synthese', label: 'Synthèse' },
		{ key: 'pipeline', label: 'Pipeline' },
		{ key: 'activite', label: 'Activité' },
		{ key: 'export', label: 'Export' },
	];
}
