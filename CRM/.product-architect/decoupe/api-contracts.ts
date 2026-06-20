/**
 * Contrats - Outil « Découpe Films » (chantier 2 portail FilmPro). Phase 2 specs 2026-06-05.
 *
 * Coeur testable = la fonction PURE `optimiserDecoupe` (aucune I/O, déterministe).
 * Implémentation Phase 3 en TDD strict (brief §6.5 = spec algorithmique de référence).
 * Unités : millimètres entiers partout (ADR-0003).
 */

// ===========================================================================
// 1. MODÈLE (aligné data-model.sql)
// ===========================================================================

export type FamilleProduit = 'solaire' | 'securite' | 'discretion';

export interface ProduitDecoupe {
	id: string;
	reference: string;
	famille: FamilleProduit;
	laizes_mm: number[]; // ≥ 1, toutes > 0
	orientation_imposee: boolean; // true → pas de rotation au nesting
	jointage_autorise: boolean; // true → pose en lés si vitre > laize
	nestable: boolean; // false → jamais nesté (garde-fou : vernis, e-film)
	marge_pose_mm: number; // ≥ 0, ajoutée à L et H avant calcul
	recouvrement_mm: number; // ≥ 0, joint entre lés (défaut 0)
}

export interface Vitre {
	id: string;
	produit_id: string;
	largeur_mm: number; // dimension vitre (hors marge)
	hauteur_mm: number;
	quantite: number; // ≥ 1, N pièces identiques
	sur_mesure_fournisseur: boolean; // LA COCHE → true = hors nesting
}

// ===========================================================================
// 2. RÉSULTAT DE L'OPTIMISATION
// ===========================================================================

export interface PlacementPiece {
	vitre_id: string;
	index: number; // i-ème pièce de la vitre (0..quantite-1)
	x_mm: number; // origine dans la bande (0 = bord laize)
	y_mm: number; // position le long du rouleau
	largeur_placee_mm: number; // dimensions de COUPE effectives (vitre + marge, éventuellement pivotée)
	hauteur_placee_mm: number;
	pivotee: boolean; // true si tournée 90° (impossible si orientation_imposee)
}

export interface PoseEnLes {
	vitre_id: string;
	index: number;
	nb_les: number; // nombre de bandes ≤ laize
	largeurs_les_mm: number[]; // largeur de coupe de chaque lé (recouvrement inclus aux jointures)
}

export interface PlanProduit {
	produit_id: string;
	laize_mm: number; // laize retenue (la meilleure parmi laizes_mm)
	longueur_consommee_mm: number; // longueur de rouleau utilisée
	taux_chute: number; // (surface_rouleau - surface_pièces) / surface_rouleau ∈ [0,1)
	placements: PlacementPiece[];
	poses_en_les: PoseEnLes[]; // vide si aucune
}

export type RaisonCommande = 'sur_mesure_fournisseur' | 'non_nestable';
export interface LigneCommandeFournisseur {
	vitre_id: string;
	raison: RaisonCommande;
}

export type TypeAlerte =
	| 'non_nestable_laisse_en_interne' // coche=non mais produit nestable=false → incohérence (brief §2)
	| 'piece_non_placable'; // > laize max et jointage interdit (brief §6.4)
export interface Alerte {
	vitre_id: string;
	type: TypeAlerte;
	message: string; // explicite, jamais d'échec silencieux
}

export interface ResultatOptimisation {
	plans: PlanProduit[]; // un meilleur_plan par produit nesté
	commandes_fournisseur: LigneCommandeFournisseur[];
	alertes: Alerte[];
}

// ===========================================================================
// 3. FONCTION PURE (le coeur - TDD Phase 3)
// ===========================================================================

/**
 * Optimise la découpe d'un ensemble de vitres (chantier seul OU consolidé).
 * Déterministe : mêmes entrées → même sortie (testable sans DB).
 * Logique de référence : brief §6.5 (préparation → garde-fou nestable → coche →
 * dimensions de coupe → regroupement par produit → faisabilité/lés → test multi-laizes → sortie).
 *
 * @param vitres   vitres à traiter (déjà filtrées : un chantier ou la consolidation choisie)
 * @param produits index produit_id → ProduitDecoupe (tous les produits référencés présents)
 */
export function optimiserDecoupe(
	vitres: Vitre[],
	produits: ReadonlyMap<string, ProduitDecoupe>
): ResultatOptimisation;

// ===========================================================================
// 4. SURFACE HTTP / SvelteKit (sous /decoupe, dans le portail)
// ===========================================================================
// CRUD via load + form actions (pattern projet). L'optimisation s'exécute côté serveur
// (load/endpoint) en appelant optimiserDecoupe ; le plan est rendu en SVG côté client.
//
//   GET  /decoupe                         liste chantiers + accès base produit
//   GET  /decoupe/produits                base produit (CRUD : add/update/archive via actions)
//   GET  /decoupe/chantiers/[id]          fiche + saisie vitres (actions add/update/delete vitre)
//   GET  /decoupe/optimisation?chantiers=<id[,id...]>   calcule et affiche le résultat
//   POST (action) /decoupe/optimisation   "Lancer la découpe" → statut chantier(s) = 'lancee'
//
// Suggestions de consolidation (Q3) : load de /decoupe/optimisation propose les chantiers
// 'en_saisie' partageant (produit × laize) avec la sélection courante.

export interface SuggestionConsolidation {
	produit_id: string;
	laize_mm: number;
	chantier_ids: string[]; // chantiers 'en_saisie' consolidables ensemble
}

export interface ApiError {
	code: 'invalid_input' | 'not_found' | 'conflict' | 'internal';
	message: string;
}
