/**
 * Helpers de formatage et calculs pour la page /signaux (refonte v9 S176bis page 5/6).
 * - signauxIndicators : 4 KPIs flat premium (total, nouveaux, a-convertir, convertis)
 * - filterSignauxByTab : filtre selon tab actif (tous, nouveau, en_analyse, interesse, converti, ecarte)
 * - signauxCountsByTab : compteurs par tab pour les pills ARIA
 * - emptyMessageForTab : message contextualisé par tab
 * - formatTypeLabel / typeIcon / formatRelative / formatDate / scoreLabel / scoreStyle / statutLabel / statutVariant
 */

import { DAY_MS } from './time-constants';

// Audit 360 M-25 : casing des clés de tab — asymétrie assumée. Ici (signaux),
// les clés non-`tous` sont en snake_case car elles MAPPENT 1:1 sur l'enum DB
// `signaux_affaires.statut_traitement` (`en_analyse`, `ecarte`, …) : un kebab
// imposerait une table de conversion. Sur /contacts, /entreprises, /pipeline,
// au contraire, les clés de tab sont des regroupements UI-only (`a-qualifier`,
// `sans-entreprise`) sans correspondance directe DB → kebab-case lisible.
export type SignauxTab = 'tous' | 'nouveau' | 'en_analyse' | 'interesse' | 'converti' | 'ecarte';

export type SignalLite = {
	id: string;
	type_signal: string | null;
	canton: string | null;
	statut_traitement: string | null;
	score_pertinence: number | null;
	date_detection: string | null;
	date_publication: string | null;
};

export type SignauxIndicatorsValues = {
	total: number;
	nouveaux: number;
	aConvertir: number;
	convertis: number;
};

const STATUT_LABELS: Record<string, string> = {
	nouveau: 'Nouveau',
	en_analyse: 'En analyse',
	interesse: 'Intéressé',
	ecarte: 'Écarté',
	converti: 'Converti',
};

const STATUT_VARIANTS: Record<string, 'default' | 'info' | 'success' | 'warning' | 'muted'> = {
	nouveau: 'warning',
	en_analyse: 'info',
	interesse: 'success',
	ecarte: 'muted',
	converti: 'default',
};

const TYPE_LABELS: Record<string, string> = {
	appel_offres: "Appel d'offres",
	permis_construire: 'Permis de construire',
	creation_entreprise: "Création d'entreprise",
	demenagement: 'Déménagement',
	expansion: 'Expansion',
	fusion_acquisition: 'Fusion / acquisition',
	autre: 'Autre',
};

const TYPE_ICONS: Record<string, string> = {
	appel_offres: 'gavel',
	permis_construire: 'construction',
	creation_entreprise: 'domain_add',
	demenagement: 'local_shipping',
	expansion: 'trending_up',
	fusion_acquisition: 'merge',
	autre: 'info',
};

export type ScoreBucket = 'chaud' | 'tiede' | 'froid' | 'non_qualifie';

export type ScoreStyle = {
	icon: string;
	colorClass: string;
	bgClass: string;
	label: string;
};

// V4 (S189) : ScorePill saturée premium. Les anciennes classes pâles
// (`bg-danger/10 text-danger-deep`) cédaient sous le bruit visuel d'une liste dense :
// impossible de repérer un Chaud du premier coup d'œil. Nouvelles classes
// `signal-score-pill--*` (dans SignauxCards.svelte + SlideOut) : fond saturé, texte
// blanc, ring 1px inset, shadow douce. Le différencier devient instantané.

// Borne d'affichage du score signal. La DB peut stocker un score > maxPoints
// (somme canton+keywords+source avant cap final), utile pour le tri par
// pertinence. L'affichage clamp à maxPoints pour éviter les "13/10" et garder
// une échelle visuellement cohérente. Le tri ORDER BY score_pertinence DESC
// reste correct car on lit la valeur brute en DB.
export function clampDisplayScore(
	raw: number | null | undefined,
	maxPoints: number
): number {
	if (raw === null || raw === undefined) return 0;
	if (raw < 0) return 0;
	if (raw > maxPoints) return maxPoints;
	return raw;
}
const SCORE_STYLES: Record<ScoreBucket, ScoreStyle> = {
	chaud: { icon: 'local_fire_department', colorClass: 'signal-score-pill--chaud', bgClass: '', label: 'Chaud' },
	tiede: { icon: 'thermostat', colorClass: 'signal-score-pill--tiede', bgClass: '', label: 'Tiède' },
	froid: { icon: 'ac_unit', colorClass: 'signal-score-pill--froid', bgClass: '', label: 'Froid' },
	non_qualifie: { icon: 'remove', colorClass: 'signal-score-pill--unscored', bgClass: '', label: 'Non qualifié' },
};

/**
 * Indicateurs flat premium en haut de page /signaux.
 * - total : count de tous les signaux (tous statuts)
 * - nouveaux : count statut_traitement='nouveau' (à triager)
 * - aConvertir : count statut_traitement='interesse' (action commerciale prioritaire)
 * - convertis : count statut_traitement='converti'
 */
export function signauxIndicators<T extends SignalLite>(
	signaux: ReadonlyArray<T>
): SignauxIndicatorsValues {
	let total = 0;
	let nouveaux = 0;
	let aConvertir = 0;
	let convertis = 0;

	for (const s of signaux) {
		total += 1;
		const st = s.statut_traitement ?? 'nouveau';
		if (st === 'nouveau') nouveaux += 1;
		else if (st === 'interesse') aConvertir += 1;
		else if (st === 'converti') convertis += 1;
	}

	return { total, nouveaux, aConvertir, convertis };
}

/**
 * Filtre les signaux selon le tab actif.
 * - tous : retourne tous (incluant écartés)
 * - nouveau / en_analyse / interesse / converti / ecarte : statut_traitement === tab
 */
export function filterSignauxByTab<T extends SignalLite>(
	signaux: ReadonlyArray<T>,
	tab: SignauxTab
): T[] {
	if (tab === 'tous') return [...signaux];
	return signaux.filter((s) => (s.statut_traitement ?? 'nouveau') === tab);
}

/**
 * Counts par tab pour les pills compteur des onglets ARIA.
 */
export function signauxCountsByTab<T extends SignalLite>(
	signaux: ReadonlyArray<T>
): Record<SignauxTab, number> {
	const counts: Record<SignauxTab, number> = {
		tous: signaux.length,
		nouveau: 0,
		en_analyse: 0,
		interesse: 0,
		converti: 0,
		ecarte: 0,
	};
	for (const s of signaux) {
		const st = (s.statut_traitement ?? 'nouveau') as SignauxTab;
		if (st in counts && st !== 'tous') counts[st] += 1;
	}
	return counts;
}

/**
 * Message vide contextualisé par tab.
 */
export function emptyMessageForTab(tab: SignauxTab): string {
	switch (tab) {
		case 'nouveau':
			return 'Aucun signal nouveau à triager.';
		case 'en_analyse':
			return "Aucun signal en analyse pour l'instant.";
		case 'interesse':
			return 'Aucun signal qualifié intéressant.';
		case 'converti':
			return 'Aucun signal converti en opportunité.';
		case 'ecarte':
			return 'Aucun signal écarté.';
		case 'tous':
		default:
			return 'Aucun signal ne correspond aux filtres.';
	}
}

/**
 * Label humain du type de signal (key snake_case → label).
 * Fallback : capitalisation simple si type inconnu.
 */
export function formatTypeLabel(type: string | null): string {
	if (!type) return '–';
	const known = TYPE_LABELS[type];
	if (known) return known;
	return type.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Icon Material Symbols pour le type. Fallback 'info'.
 */
export function typeIcon(type: string | null): string {
	return TYPE_ICONS[type ?? ''] ?? 'info';
}

/**
 * Date courte fr-CH (DD.MM.YY).
 */
export function formatDate(d: string | null): string {
	if (!d) return '–';
	const date = new Date(d);
	if (Number.isNaN(date.getTime())) return '–';
	return date.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/**
 * Date relative humanisée fr-CH (Aujourd'hui / Hier / Il y a N jours / Il y a N sem. / fallback formatDate).
 */
export function formatRelative(d: string | null, now: Date = new Date()): string {
	if (!d) return '–';
	const date = new Date(d);
	if (Number.isNaN(date.getTime())) return '–';
	const diff = now.getTime() - date.getTime();
	const days = Math.floor(diff / DAY_MS);
	if (days === 0) return "Aujourd'hui";
	if (days === 1) return 'Hier';
	if (days < 7) return `Il y a ${days} jours`;
	if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`;
	return formatDate(d);
}

/**
 * Bucket de score : chaud / tiede / froid / non_qualifie selon seuils.
 * V4 (S189) : seuils alignés sur `config.scoring.labels` (chaud=7, tiede=4)
 * après retrait de la temporalité (maxPoints 12 → 10). Froid >= 1 (signal
 * positif mais sous le seuil tiède), 0 ou null → non_qualifié.
 * Seuils par défaut : chaud >= 7, tiede >= 4, froid >= 1.
 */
export function scoreLabel(
	score: number | null,
	thresholds: { chaud: number; tiede: number; froid: number } = { chaud: 7, tiede: 4, froid: 1 }
): ScoreBucket {
	if (score == null) return 'non_qualifie';
	if (score >= thresholds.chaud) return 'chaud';
	if (score >= thresholds.tiede) return 'tiede';
	if (score >= thresholds.froid) return 'froid';
	return 'non_qualifie';
}

/**
 * Style visuel pour un score (icon, colorClass, bgClass, label).
 */
export function scoreStyle(
	score: number | null,
	thresholds?: { chaud: number; tiede: number; froid: number }
): ScoreStyle {
	return SCORE_STYLES[scoreLabel(score, thresholds)];
}

/**
 * Label humain du statut. Fallback 'Nouveau'.
 */
export function statutLabel(statut: string | null): string {
	return STATUT_LABELS[statut ?? ''] ?? 'Nouveau';
}

/**
 * Variant Badge pour le statut.
 */
export function statutVariant(statut: string | null): 'default' | 'info' | 'success' | 'warning' | 'muted' {
	return STATUT_VARIANTS[statut ?? ''] ?? 'muted';
}

/**
 * aria-label complet pour une card signal (rowAriaLabel équivalent pour le pattern table).
 */
export function signalAriaLabel<T extends SignalLite>(s: T): string {
	const type = formatTypeLabel(s.type_signal);
	const canton = s.canton ?? 'canton non renseigné';
	const score = s.score_pertinence ?? 0;
	const statut = statutLabel(s.statut_traitement);
	return `${type}, ${canton}, score ${score}, statut ${statut}`;
}
