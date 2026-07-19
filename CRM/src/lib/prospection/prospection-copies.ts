/**
 * Copies métier marque-aware du CRM - SOURCE UNIQUE (parité #4/#6 puis WP-C). Couvre les champs de
 * recherche de prospection ET quelques surfaces métier adjacentes (saisie rapide, pipeline, galerie
 * photo, modèle CSV) : toute copie qui cite un secteur/exemple métier et doit suivre la marque active.
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
	// ImportModal - texte d'aide de la source Google Places (WP-C #5, validé Pascal 2026-07-18)
	importGpHelper: string;
	// LeadExpress (saisie rapide) - placeholders entreprise + note (WP-C #1/#2)
	expressRaisonPlaceholder: string;
	expressNotePlaceholder: string;
	// PipelineQuickAdvance - placeholder « prochaine action » (WP-C #3)
	pipelineActionPlaceholder: string;
	// PhotoGallery - état vide (WP-C #4)
	photoEmptyHint: string;
	// ImportListeModal - ligne d'exemple du modèle CSV téléchargeable (WP-C #6)
	importTemplateExampleRow: string;
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
	// Verbatim de la source ImportModal (ASCII sans accents + nbsp/€/apostrophe typo) : non-régression byte-identique.
	importGpHelper: 'Ideal pour reperer regies, entreprises generales et corps d’etat dans un canton. Cout : 0 € jusqu’a 900 recherches/mois.',
	expressRaisonPlaceholder: 'Ex : Vitrerie Dupond Sàrl',
	expressNotePlaceholder: 'Ex : RDV 5 mai vitrage SE',
	pipelineActionPlaceholder: 'Ex : Envoi devis film solaire 80m²',
	photoEmptyHint: 'Aucune photo. Ajoute une vue façade ou vitrage pour étoffer le dossier.',
	importTemplateExampleRow: 'Miroiterie Cornavin Sàrl,Rue de Cornavin 5,1201,Genève,+41 22 000 00 00,Vitrerie,https://exemple.ch,contact@exemple.ch',
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
	// WP-C validé Pascal 2026-07-18 (maquette Chrome). #5 corrigé : « exploitants de salles + agences événementielles ».
	importGpHelper: 'Idéal pour repérer exploitants de salles et agences événementielles dans un canton. Coût : 0 € jusqu’à 900 recherches/mois.',
	expressRaisonPlaceholder: 'Ex : Enseignes Dupond Sàrl',
	expressNotePlaceholder: 'Ex : RDV 5 mai pose enseigne',
	pipelineActionPlaceholder: 'Ex : Envoi devis enseigne lumineuse',
	photoEmptyHint: 'Aucune photo. Ajoute une vue de l’enseigne ou du stand pour étoffer le dossier.',
	importTemplateExampleRow: 'Enseignes Lumino Sàrl,Rue de Cornavin 5,1201,Genève,+41 22 000 00 00,Signalétique,https://exemple.ch,contact@exemple.ch',
};

export const PROSPECTION_COPIES: Record<Marque, ProspectionCopies> = { filmpro: FILMPRO, led: LED };

/** Copies de la marque active (défaut sûr filmpro = non-régression). */
export function prospectionCopies(marque: Marque): ProspectionCopies {
	return PROSPECTION_COPIES[marque] ?? FILMPRO;
}
