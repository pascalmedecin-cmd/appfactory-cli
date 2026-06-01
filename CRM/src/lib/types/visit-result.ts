/**
 * Résultat d'une visite terrain (V3 mobile). Source de vérité unique de l'enum :
 * le schéma Zod (schemas.ts) et le CHECK DB (migration 20260531_001) en dérivent.
 * Règle UX projet : valeurs fermées, jamais d'option « Autre ».
 */
export const RESULTAT_VISITE = [
	'visite_interesse',
	'visite_a_relancer',
	'absent',
	'non_pertinent',
] as const;

export type ResultatVisite = (typeof RESULTAT_VISITE)[number];

/** Libellés FR affichés à l'utilisateur (mobile + relecture desktop). */
export const RESULTAT_VISITE_LABELS: Record<ResultatVisite, string> = {
	visite_interesse: 'Visité - intéressé',
	visite_a_relancer: 'Visité - à relancer',
	absent: 'Absent',
	non_pertinent: 'Pas pertinent',
};

/** Variante de couleur (token) par résultat, pour les pastilles. */
export const RESULTAT_VISITE_VARIANT: Record<ResultatVisite, 'success' | 'warning' | 'muted' | 'danger'> = {
	visite_interesse: 'success',
	visite_a_relancer: 'warning',
	absent: 'muted',
	non_pertinent: 'danger',
};

export function isResultatVisite(v: unknown): v is ResultatVisite {
	return typeof v === 'string' && (RESULTAT_VISITE as readonly string[]).includes(v);
}
