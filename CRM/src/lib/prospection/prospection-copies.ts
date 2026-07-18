/**
 * Copies métier des champs de recherche de prospection - SOURCE UNIQUE, marque-aware (parité #4/#6).
 *
 * Avant : exemples de secteur (« vitrerie, façade… ») codés FilmPro en dur dans `SourceSearchFields`
 * et `ImportModal`. En environnement LED, ces exemples vitrage n'ont aucun sens. Après : une table
 * par marque, consommée par les deux composants (évite la re-divergence D3).
 *
 * FilmPro = **verbatim des chaînes existantes** (non-régression byte-identique, gardée par le test
 * `prospection-copies.test.ts`). LED = validé Pascal 2026-07-18 (maquette parité : signalétique,
 * stand, enseigne, événementiel). Le format d'exemple suit chaque composant (« ex : » vs « ex: »).
 */
import type { Marque } from '$lib/marque';

export type ProspectionCopies = {
	// SourceSearchFields (recherche entreprises P3)
	searchchPlaceholder: string;
	searchchGenericExemples: string;
	gpKeywordPlaceholder: string;
	gpKeywordPlaceholderLibre: string;
	// ImportModal (import sources)
	importRegistreHelperExemples: string;
	importRegistrePlaceholder: string;
	importAnnuairePlaceholder: string;
	importAnnuaireGenericExemples: string;
	importGpKeywordPlaceholder: string;
	importGpKeywordPlaceholderLibre: string;
};

const FILMPRO: ProspectionCopies = {
	searchchPlaceholder: 'vitrerie, façade, régie…',
	searchchGenericExemples: 'vitrerie, façade…',
	gpKeywordPlaceholder: 'ex : ventilation…',
	gpKeywordPlaceholderLibre: 'ex : agencement magasins',
	importRegistreHelperExemples: 'vitrerie, façade, architecte',
	importRegistrePlaceholder: 'vitrerie, façade, architecte, construction…',
	importAnnuairePlaceholder: 'vitrerie, façade, miroiterie, store…',
	importAnnuaireGenericExemples: 'vitrerie, façade, architecte, …',
	importGpKeywordPlaceholder: 'ex: ventilation, charpente métallique…',
	importGpKeywordPlaceholderLibre: 'ex: agencement de magasins',
};

const LED: ProspectionCopies = {
	searchchPlaceholder: 'signalétique, stand, enseigne…',
	searchchGenericExemples: 'signalétique, stand, enseigne…',
	gpKeywordPlaceholder: 'ex : agencement de stand…',
	gpKeywordPlaceholderLibre: 'ex : habillage de vitrine',
	importRegistreHelperExemples: 'signalétique, stand, enseigne',
	importRegistrePlaceholder: 'signalétique, stand, enseigne, événementiel…',
	importAnnuairePlaceholder: 'signalétique, stand, enseigne, néon…',
	importAnnuaireGenericExemples: 'signalétique, stand, enseigne, …',
	importGpKeywordPlaceholder: 'ex: agencement de stand, habillage…',
	importGpKeywordPlaceholderLibre: 'ex: agencement de stand',
};

export const PROSPECTION_COPIES: Record<Marque, ProspectionCopies> = { filmpro: FILMPRO, led: LED };

/** Copies de la marque active (défaut sûr filmpro = non-régression). */
export function prospectionCopies(marque: Marque): ProspectionCopies {
	return PROSPECTION_COPIES[marque] ?? FILMPRO;
}
