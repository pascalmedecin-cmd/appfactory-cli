/**
 * Helpers de formatage et calculs pour la page /signaux (modèle simplifié 2026-07-01).
 * - signauxIndicators : 3 indicateurs flat premium (total, nouveaux, aSuivre)
 * - filterSignauxByTab : filtre selon tab actif (nouveau, a_suivre) — les archivés vivent dans la vue `?vue=archivees`
 * - signauxCountsByTab : compteurs par tab pour les pills ARIA
 * - emptyMessageForTab : message contextualisé par tab
 * - formatTypeLabel / typeIcon / formatRelative / formatDate / scoreLabel / statutLabel / statutVariant
 */

import { DAY_MS } from './time-constants';

// Clés de tab en snake_case car elles MAPPENT 1:1 sur l'enum DB
// `signaux_affaires.statut_traitement` (`nouveau`, `a_suivre`). L'archivage
// (`archive`) n'est PAS un onglet : il vit dans une vue dédiée (`?vue=archivees`).
// Modèle simplifié 2026-07-01 (radar SIMAP) : à trier -> à suivre / archivé.
export type SignauxTab = 'nouveau' | 'a_suivre';

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
	aSuivre: number;
};

const STATUT_LABELS: Record<string, string> = {
	nouveau: 'À trier',
	a_suivre: 'À suivre',
	// 'archive' : rangé hors de la file de triage (vue `?vue=archivees`). Reste
	// dans la table des labels, sinon une fiche/carte archivée s'affiche « À trier ».
	archive: 'Archivé',
};

const STATUT_VARIANTS: Record<string, 'default' | 'info' | 'success' | 'warning' | 'muted'> = {
	nouveau: 'warning',
	a_suivre: 'info',
	archive: 'muted',
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

// Audit 360 Bloc D : la pastille de score Signaux a convergé sur la primitive
// unifiée ScorePill (variante `temperature`). scoreLabel reste la source des seuils
// Chaud/Tiède/Froid ; le rendu visuel (couleurs/icônes pâles, WCAG AA) vit désormais
// dans ScorePill.svelte. L'ancien SCORE_STYLES + classes `signal-score-pill--*` retirés.

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
/**
 * Indicateurs flat premium en haut de page /signaux (vue active, hors archivés).
 * - total : count des signaux chargés (file active)
 * - nouveaux : count statut_traitement='nouveau' (à trier)
 * - aSuivre : count statut_traitement='a_suivre' (retenus, à travailler)
 */
export function signauxIndicators<T extends SignalLite>(
	signaux: ReadonlyArray<T>
): SignauxIndicatorsValues {
	let total = 0;
	let nouveaux = 0;
	let aSuivre = 0;

	for (const s of signaux) {
		total += 1;
		const st = s.statut_traitement ?? 'nouveau';
		if (st === 'nouveau') nouveaux += 1;
		else if (st === 'a_suivre') aSuivre += 1;
	}

	return { total, nouveaux, aSuivre };
}

/**
 * Filtre les signaux selon le tab actif (nouveau / a_suivre).
 */
export function filterSignauxByTab<T extends SignalLite>(
	signaux: ReadonlyArray<T>,
	tab: SignauxTab
): T[] {
	return signaux.filter((s) => (s.statut_traitement ?? 'nouveau') === tab);
}

/**
 * Counts par tab pour les pills compteur des onglets ARIA.
 */
export function signauxCountsByTab<T extends SignalLite>(
	signaux: ReadonlyArray<T>
): Record<SignauxTab, number> {
	const counts: Record<SignauxTab, number> = {
		nouveau: 0,
		a_suivre: 0,
	};
	for (const s of signaux) {
		const st = (s.statut_traitement ?? 'nouveau') as SignauxTab;
		if (st in counts) counts[st] += 1;
	}
	return counts;
}

/**
 * Message vide contextualisé par tab.
 */
export function emptyMessageForTab(tab: SignauxTab): string {
	switch (tab) {
		case 'nouveau':
			return 'Aucun signal à trier.';
		case 'a_suivre':
			return 'Aucun signal à suivre pour le moment.';
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
 * Label humain du statut. Fallback 'À trier' (statut null = non trié).
 */
export function statutLabel(statut: string | null): string {
	return STATUT_LABELS[statut ?? ''] ?? 'À trier';
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
