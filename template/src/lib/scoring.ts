/**
 * Scoring automatique des leads de prospection.
 * Lit les criteres depuis config.ts (miroir de project.yaml).
 */

import { config } from './config';

const { scoring } = config;

// Bloc 3 : Bonus scoring signaux Veille (intelligence_signal).
// Item Veille avec maturity + compliance_tag bien notés → bonus décroissant dans le temps.
// Objectif : remonter la température des leads issus des signaux chauds actuels.
export const SIGNAL_VEILLE_SCORING = {
	// Bonus en points selon maturity + compliance_tag de l'item Veille source.
	baremes: {
		etabliOkFilmpro: 2, // maturity=etabli ET compliance_tag=OK FilmPro → signal confirmé et actionnable
		etabli: 1,           // maturity=etabli (compliance autre) → signal confirmé mais moins aligné
		emergent: 1,         // maturity=emergent → signal chaud mais moins consolidé
		speculatif: 0        // maturity=speculatif → pas de bonus, on attend validation
	},
	// Décroissance temporelle : bonus conservé <= 4 semaines, perdu au-delà.
	decayWeeks: 4
} as const;

export interface IntelligenceSignalInput {
	maturity: 'emergent' | 'etabli' | 'speculatif';
	complianceTag?: string | null; // "OK FilmPro" | "Adjacent pertinent" | "À surveiller" | "Non exploitable"
	weeksSince: number;
}

interface LeadScoring {
	canton?: string | null;
	description?: string | null;
	raison_sociale?: string | null;
	source: string;
	date_publication?: string | Date | null;
	telephone?: string | null;
	montant?: number | null;
	// Bloc 3 : signal Veille source (optionnel). Si fourni et dans la fenêtre de 4 semaines,
	// apporte un bonus selon maturity + compliance_tag.
	intelligenceSignal?: IntelligenceSignalInput | null;
}

export interface ScoreDetail {
	total: number;
	label: 'chaud' | 'tiede' | 'froid';
	criteres: string[];
}

/**
 * Calcule le bonus de scoring lié à un signal Veille source.
 * Retourne {points, critere} ou null si aucun bonus applicable.
 */
export function calculerBonusVeille(
	signal: IntelligenceSignalInput
): { points: number; critere: string } | null {
	// Décroissance temporelle : au-delà de N semaines, bonus perdu.
	if (signal.weeksSince > SIGNAL_VEILLE_SCORING.decayWeeks) return null;
	if (signal.weeksSince < 0) return null; // Future date = bug, on ignore

	const b = SIGNAL_VEILLE_SCORING.baremes;
	let points = 0;
	let label = '';

	if (signal.maturity === 'etabli' && signal.complianceTag === 'OK FilmPro') {
		points = b.etabliOkFilmpro;
		label = 'Veille établie + OK FilmPro';
	} else if (signal.maturity === 'etabli') {
		points = b.etabli;
		label = 'Veille établie';
	} else if (signal.maturity === 'emergent') {
		points = b.emergent;
		label = 'Veille émergente';
	} else {
		// speculatif → 0 pt (pas de bonus mais pas de malus non plus)
		return null;
	}

	if (points <= 0) return null;
	return { points, critere: `${label} (+${points})` };
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

	// Entreprise identifiee (Zefix = inscription RC avec UID)
	if (scoring.entrepriseIdentifiee.sources.includes(lead.source as typeof scoring.entrepriseIdentifiee.sources[number])) {
		total += scoring.entrepriseIdentifiee.points;
		criteres.push(`Entreprise identifiee (+${scoring.entrepriseIdentifiee.points})`);
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

	// Bloc 3 : bonus signal Veille (si lead issu d'un chip Veille dans la fenêtre de 4 semaines)
	if (lead.intelligenceSignal) {
		const bonus = calculerBonusVeille(lead.intelligenceSignal);
		if (bonus) {
			total += bonus.points;
			criteres.push(bonus.critere);
		}
	}

	// Label (3 niveaux stricts : chaud / tiede / froid)
	let label: ScoreDetail['label'];
	if (total >= scoring.labels.chaud) label = 'chaud';
	else if (total >= scoring.labels.tiede) label = 'tiede';
	else label = 'froid';

	return { total, label, criteres };
}
