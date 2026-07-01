/**
 * Constantes et types Campagnes PARTAGÉS client + serveur (Vague 3.2, étiquetage N-N).
 *
 * Pur, sans dépendance serveur : importable depuis les composants Svelte (CampagneCombo,
 * liste, fiche, écran dédié) ET depuis `$lib/server/campagnes.ts` (qui les ré-exporte pour
 * compat). Source UNIQUE de la palette de couleurs -> aucune dérive entre le slug stocké
 * (CHECK SQL c1..c8), le picker côté UI et les classes CSS `.camp--cN` / `.swN` (app.css).
 */
import type { Database } from '$lib/database.types';

export type Campagne = Database['public']['Tables']['campagnes']['Row'];
export type CampagneWithCount = Campagne & { lead_count: number };

/** Slugs de couleur valides (palette workflow FilmPro). Aligné sur le CHECK SQL. */
export const COULEUR_SLUGS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'] as const;
export type CouleurSlug = (typeof COULEUR_SLUGS)[number];
export const DEFAULT_COULEUR: CouleurSlug = 'c1';

export function isCouleurSlug(v: unknown): v is CouleurSlug {
	return typeof v === 'string' && (COULEUR_SLUGS as readonly string[]).includes(v);
}

/** Classe CSS de la pastille pour un slug couleur (retombe sur le défaut si invalide). */
export function campClass(couleur: string | null | undefined): string {
	return `camp--${isCouleurSlug(couleur) ? couleur : DEFAULT_COULEUR}`;
}

/** Classe swatch (sw1..sw8) pour un slug couleur (retombe sur le défaut si invalide). */
export function swatchClass(couleur: string | null | undefined): string {
	const slug = isCouleurSlug(couleur) ? couleur : DEFAULT_COULEUR;
	return `sw${slug.slice(1)}`;
}

/** Bornes de saisie (alignées sur le Zod des endpoints + le repo serveur). */
export const CAMPAGNE_NOM_MAX = 80;
export const CAMPAGNE_DESC_MAX = 280;
/** Garde DoS sur les multi-sélections campagne (cohérent avec MAX_FILTER_VALUES prospection). */
export const MAX_CAMPAGNE_IDS = 50;

/**
 * Statuts de cycle de vie d'une campagne (Lot 3). Source UNIQUE, alignée sur le CHECK SQL
 * (`campagnes_statut_check`) et le Zod des endpoints. Distinct de l'archivage (`archived`).
 *  - en_cours : préparation + identification des prospects (défaut à la création) ;
 *  - active   : campagne lancée.
 */
export const CAMPAGNE_STATUTS = ['en_cours', 'active'] as const;
export type CampagneStatut = (typeof CAMPAGNE_STATUTS)[number];
export const DEFAULT_CAMPAGNE_STATUT: CampagneStatut = 'en_cours';

export function isCampagneStatut(v: unknown): v is CampagneStatut {
	return typeof v === 'string' && (CAMPAGNE_STATUTS as readonly string[]).includes(v);
}

const CAMPAGNE_STATUT_LABELS: Record<CampagneStatut, string> = {
	en_cours: 'En cours',
	active: 'Active',
};

/** Libellé humain d'un statut de campagne (retombe sur le défaut si valeur inconnue). */
export function campagneStatutLabel(statut: string | null | undefined): string {
	return CAMPAGNE_STATUT_LABELS[isCampagneStatut(statut) ? statut : DEFAULT_CAMPAGNE_STATUT];
}
