/**
 * Scoring automatique des leads de prospection (0-13 points).
 * Calcule a l'import et recalcule si le lead est enrichi.
 */

const CANTONS_PRIORITAIRES = ['GE', 'VD', 'VS'];
const CANTONS_SECONDAIRES = ['NE', 'FR', 'JU'];

const SECTEURS_CIBLES = [
	'construction', 'architecte', 'architecture', 'hvac', 'chauffage',
	'ventilation', 'climatisation', 'regie', 'facility', 'batiment',
	'menuiserie', 'charpente', 'electricite', 'plomberie', 'peinture',
	'renovation', 'genie civil', 'bureau technique', 'ingenieur',
];

const SOURCES_CHAUDES = ['simap', 'sitg'];

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
	if (lead.canton && CANTONS_PRIORITAIRES.includes(lead.canton)) {
		total += 3;
		criteres.push(`Canton ${lead.canton} (+3)`);
	} else if (lead.canton && CANTONS_SECONDAIRES.includes(lead.canton)) {
		total += 1;
		criteres.push(`Canton ${lead.canton} (+1)`);
	}

	// Secteur
	const texte = `${lead.description || ''} ${lead.raison_sociale || ''}`.toLowerCase();
	const secteurMatch = SECTEURS_CIBLES.find((s) => texte.includes(s));
	if (secteurMatch) {
		total += 3;
		criteres.push(`Secteur "${secteurMatch}" (+3)`);
	}

	// Signal chaud (SIMAP, SITG)
	if (SOURCES_CHAUDES.includes(lead.source)) {
		total += 2;
		criteres.push(`Signal ${lead.source.toUpperCase()} (+2)`);
	}

	// Recence
	if (lead.date_publication) {
		const datePub = lead.date_publication instanceof Date
			? lead.date_publication
			: new Date(lead.date_publication);
		const jours = differenceEnJours(new Date(), datePub);
		if (jours <= 30) {
			total += 2;
			criteres.push('Recente < 30j (+2)');
		} else if (jours <= 90) {
			total += 1;
			criteres.push('Recente < 90j (+1)');
		}
	}

	// Telephone disponible
	if (lead.telephone) {
		total += 1;
		criteres.push('Tel dispo (+1)');
	}

	// Montant significatif
	if (lead.montant && lead.montant > 100000) {
		total += 1;
		criteres.push('Montant > 100k (+1)');
	}

	// Label
	let label: ScoreDetail['label'];
	if (total >= 8) label = 'chaud';
	else if (total >= 5) label = 'tiede';
	else if (total >= 2) label = 'froid';
	else label = 'non_qualifie';

	return { total, label, criteres };
}
