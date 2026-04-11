/**
 * Utilitaires partagés pour le module Prospection.
 * Labels, variants, options de filtrage - source unique (pas de duplication).
 */
import { config } from '$lib/config';

const { labels: scoreLabels } = config.scoring;

// --- Canton noms ---

export const cantonNoms: Record<string, string> = {
	GE: 'Genève',
	VD: 'Vaud',
	VS: 'Valais',
	NE: 'Neuchâtel',
	FR: 'Fribourg',
	JU: 'Jura',
};

// --- Score ---

export function scoreLabel(score: number): string {
	if (score >= scoreLabels.chaud) return 'Chaud';
	if (score >= scoreLabels.tiede) return 'Tiède';
	if (score >= scoreLabels.froid) return 'Froid';
	return 'Faible';
}

export function scoreBadgeVariant(score: number): 'danger' | 'warning' | 'muted' | 'default' {
	if (score >= scoreLabels.chaud) return 'danger';
	if (score >= scoreLabels.tiede) return 'warning';
	if (score >= scoreLabels.froid) return 'muted';
	return 'default';
}

export function scoreToCategory(score: number): string {
	if (score >= scoreLabels.chaud) return 'chaud';
	if (score >= scoreLabels.tiede) return 'tiede';
	return 'froid';
}

// --- Statut ---

export function statutLabel(statut: string): string {
	const labels: Record<string, string> = {
		nouveau: 'Nouveau',
		interesse: 'Intéressé',
		ecarte: 'Écarté',
		transfere: 'Converti',
	};
	return labels[statut] ?? statut;
}

export function statutBadgeVariant(statut: string): 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'muted' {
	switch (statut) {
		case 'nouveau': return 'warning';
		case 'interesse': return 'accent';
		case 'ecarte': return 'muted';
		case 'transfere': return 'success';
		default: return 'default';
	}
}

// --- Source ---

export function sourceLabel(s: string): string {
	const labels: Record<string, string> = {
		zefix: 'Registre du commerce',
		simap: 'Marchés publics',
		search_ch: 'Annuaire',
		sitg: 'Géodonnées',
		fosc: 'Feuille officielle',
		regbl: 'Registre des bâtiments',
		minergie: 'Minergie',
	};
	return labels[s] ?? s;
}

// --- Options de filtrage (source unique) ---

export const sourceOptions = [
	{ value: 'zefix', label: 'Zefix (registre du commerce)' },
	{ value: 'simap', label: 'SIMAP (marchés publics)' },
	{ value: 'search_ch', label: 'search.ch (annuaire)' },
	{ value: 'sitg', label: 'SITG (géodonnées Genève)' },
	{ value: 'fosc', label: 'FOSC (feuille officielle)' },
	{ value: 'regbl', label: 'RegBL (registre des bâtiments)' },
	{ value: 'minergie', label: 'Minergie (bâtiments certifiés)' },
];

const cantons = [...config.scoring.cantonsPrioritaires.values, ...config.scoring.cantonsSecondaires.values];

export const cantonOptions = cantons.map(c => ({ value: c, label: `${cantonNoms[c] ?? c} (${c})` }));

export const temperatureOptions = [
	{ value: 'chaud', label: 'Chaud', dotColor: 'bg-danger' },
	{ value: 'tiede', label: 'Tiède', dotColor: 'bg-warning' },
	{ value: 'froid', label: 'Froid', dotColor: 'bg-text-muted' },
];

export const statutOptions = [
	{ value: 'nouveau', label: 'Nouveau' },
	{ value: 'interesse', label: 'Intéressé' },
	{ value: 'ecarte', label: 'Écarté' },
	{ value: 'transfere', label: 'Converti' },
];

// --- Date relative ---

export function relativeDate(dateStr: string | null): string {
	if (!dateStr) return '—';
	const date = new Date(dateStr);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	if (diffDays === 0) return "Aujourd'hui";
	if (diffDays === 1) return 'Hier';
	if (diffDays < 7) return `Il y a ${diffDays} j`;
	if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`;
	if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
	return `Il y a ${Math.floor(diffDays / 365)} an${Math.floor(diffDays / 365) > 1 ? 's' : ''}`;
}
