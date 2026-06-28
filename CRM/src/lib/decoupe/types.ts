/**
 * Types du cœur d'optimisation de découpe (outil « Découpe Films »).
 * Unités : millimètres entiers partout (ADR-0003). Aucune I/O, aucune dépendance UI/DB.
 * Spec de référence : brief §2/§6 + `.product-architect/decoupe/`.
 */

/** Produit du catalogue de découpe (sous-ensemble utile à l'optimisation). */
export interface ProduitDecoupe {
	id: string;
	laizes_mm: number[]; // ≥ 1, toutes > 0
	orientation_imposee: boolean; // true → pas de rotation au nesting
	jointage_autorise: boolean; // true → pose en lés si la pièce dépasse la laize
	nestable: boolean; // false → jamais nesté (garde-fou : vernis, e-film)
	marge_pose_mm: number; // ≥ 0, ajoutée à L et à H (dimension de coupe)
	recouvrement_mm: number; // ≥ 0, joint entre lés (défaut 0)
}

/** Vitre saisie (une ligne = `quantite` pièces identiques). */
export interface Vitre {
	id: string;
	produit_id: string;
	largeur_mm: number; // dimension vitre (hors marge)
	hauteur_mm: number;
	quantite: number; // ≥ 1
	sur_mesure_fournisseur: boolean; // LA COCHE → true = hors nesting
}

/** Une pièce posée dans la bande (rectangle placé). Une pose en lés produit N placements. */
export interface PlacementPiece {
	vitre_id: string;
	piece_index: number; // i-ème pièce de la vitre (0..quantite-1)
	x_mm: number; // position en travers de la laize (0 = bord)
	y_mm: number; // position le long du rouleau
	largeur_placee_mm: number; // dimension de coupe en travers de la laize
	hauteur_placee_mm: number; // dimension de coupe le long du rouleau
	pivotee: boolean; // true si tournée 90° (jamais si orientation imposée)
	les_index?: number; // si lé : index du lé (0..nb_les-1)
}

/** Résumé d'une vitre posée en plusieurs lés (bandes ≤ laize). */
export interface PoseEnLes {
	vitre_id: string;
	piece_index: number;
	nb_les: number; // nombre de bandes
	largeur_bande_mm: number; // largeur de coupe d'une bande (recouvrement inclus)
}

/** Plan retenu pour un produit (la meilleure laize). */
export interface PlanProduit {
	produit_id: string;
	laize_mm: number; // laize retenue
	longueur_consommee_mm: number; // longueur de rouleau utilisée
	surface_pieces_mm2: number; // somme des aires des pièces placées (coupe)
	taux_chute: number; // (laize*longueur - surface_pieces) / (laize*longueur), ∈ [0,1)
	placements: PlacementPiece[];
	poses_en_les: PoseEnLes[]; // vide si aucune
}

export type RaisonCommande = 'sur_mesure_fournisseur' | 'non_nestable';
export interface LigneCommandeFournisseur {
	vitre_id: string;
	raison: RaisonCommande;
}

export type TypeAlerte = 'non_nestable_laisse_en_interne' | 'piece_non_placable';
export interface Alerte {
	vitre_id: string;
	type: TypeAlerte;
	message: string;
}

export interface ResultatOptimisation {
	plans: PlanProduit[]; // un plan par produit ayant ≥ 1 pièce nestée
	commandes_fournisseur: LigneCommandeFournisseur[];
	alertes: Alerte[];
}
