/**
 * Scoring automatique des leads de prospection.
 * Lit les criteres depuis config.ts (miroir de project.yaml).
 */

import { config } from './config';

const { scoring } = config;

interface LeadScoring {
	canton?: string | null;
	description?: string | null;
	raison_sociale?: string | null;
	source: string;
	date_publication?: string | Date | null;
	telephone?: string | null;
	montant?: number | null;
}

export interface ScoreDetail {
	total: number;
	label: 'chaud' | 'tiede' | 'froid' | 'non_qualifie';
	criteres: string[];
}

function differenceEnJours(a: Date, b: Date): number {
	return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

export function calculerScore(lead: LeadScoring): ScoreDetail {
	let total = 0;
	const criteres: string[] = [];

	// Canton
	if (lead.canton && scoring.cantonsPrioritaires.values.includes(lead.canton as typeof scoring.cantonsPrioritaires.values[number])) {
		total += scoring.cantonsPrioritaires.points;
		criteres.push(`Canton ${lead.canton} (+${scoring.cantonsPrioritaires.points})`);
	} else if (lead.canton && scoring.cantonsSecondaires.values.includes(lead.canton as typeof scoring.cantonsSecondaires.values[number])) {
		total += scoring.cantonsSecondaires.points;
		criteres.push(`Canton ${lead.canton} (+${scoring.cantonsSecondaires.points})`);
	}

	// Secteur
	const texte = `${lead.description || ''} ${lead.raison_sociale || ''}`.toLowerCase();
	const secteurMatch = scoring.secteursCibles.keywords.find((s) => texte.includes(s));
	if (secteurMatch) {
		total += scoring.secteursCibles.points;
		criteres.push(`Secteur "${secteurMatch}" (+${scoring.secteursCibles.points})`);
	}

	// Signal chaud
	if (scoring.sourcesChaudes.values.includes(lead.source as typeof scoring.sourcesChaudes.values[number])) {
		total += scoring.sourcesChaudes.points;
		criteres.push(`Signal ${lead.source.toUpperCase()} (+${scoring.sourcesChaudes.points})`);
	}

	// Recence
	if (lead.date_publication) {
		const datePub = lead.date_publication instanceof Date
			? lead.date_publication
			: new Date(lead.date_publication);
		// Ignorer les dates invalides et les dates futures
		if (!isNaN(datePub.getTime())) {
			const jours = differenceEnJours(new Date(), datePub);
			if (jours >= 0) {
				for (const seuil of scoring.recence) {
					if (jours <= seuil.maxJours) {
						total += seuil.points;
						criteres.push(`Recente < ${seuil.maxJours}j (+${seuil.points})`);
						break;
					}
				}
			}
		}
	}

	// Telephone disponible
	if (lead.telephone) {
		total += scoring.telephoneDisponible.points;
		criteres.push(`Tel dispo (+${scoring.telephoneDisponible.points})`);
	}

	// Montant significatif
	if (lead.montant && lead.montant > scoring.montantMinimum.seuil) {
		total += scoring.montantMinimum.points;
		criteres.push(`Montant > ${scoring.montantMinimum.seuil / 1000}k (+${scoring.montantMinimum.points})`);
	}

	// Label
	let label: ScoreDetail['label'];
	if (total >= scoring.labels.chaud) label = 'chaud';
	else if (total >= scoring.labels.tiede) label = 'tiede';
	else if (total >= scoring.labels.froid) label = 'froid';
	else label = 'non_qualifie';

	return { total, label, criteres };
}
