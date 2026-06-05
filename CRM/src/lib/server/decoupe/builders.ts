/**
 * Découpe Films - couche d'écriture (builders purs).
 *
 * Source unique de la forme des rows insérées/mises à jour pour les 3 tables
 * `decoupe_*`. Aucune I/O : ces fonctions transforment une entrée déjà validée
 * (sortie Zod, cf. $lib/schemas) en `TablesInsert`/`TablesUpdate` typée. Testables
 * sans DB (pattern projet, cf. src/lib/server/referentiel/).
 *
 * Conventions data-model (Phase 2) :
 *  - id : généré par la DB (`gen_random_uuid()`), jamais ici.
 *  - created_at / updated_at : `DEFAULT now()` à l'insert (omis) ; updated_at
 *    rafraîchi manuellement à l'update (produits/chantiers seulement).
 *  - created_by : passé par l'action (utilisateur courant) ; produits + chantiers
 *    uniquement (decoupe_vitres n'a pas de created_by). Traçabilité, pas isolation (ADR-0004).
 *  - chaîne vide → null (jamais de '' en DB).
 */
import type {
	DecoupeProduitCreateSchema,
	DecoupeProduitUpdateSchema,
	DecoupeChantierCreateSchema,
	DecoupeChantierUpdateSchema,
	DecoupeVitreCreateSchema,
	DecoupeVitreUpdateSchema,
} from '$lib/schemas';
import type { z } from 'zod';
import type { TablesInsert, TablesUpdate } from '$lib/database.types';
import { now } from '$lib/server/db-helpers';

export type ProduitCreateInput = z.infer<typeof DecoupeProduitCreateSchema>;
export type ProduitUpdateInput = z.infer<typeof DecoupeProduitUpdateSchema>;
export type ChantierCreateInput = z.infer<typeof DecoupeChantierCreateSchema>;
export type ChantierUpdateInput = z.infer<typeof DecoupeChantierUpdateSchema>;
export type VitreCreateInput = z.infer<typeof DecoupeVitreCreateSchema>;
export type VitreUpdateInput = z.infer<typeof DecoupeVitreUpdateSchema>;

// --------------------------------------------------------------------------
// Produits (catalogue descriptif)
// --------------------------------------------------------------------------

/** Row d'INSERT produit. Nouveau produit toujours `actif=true` ; created_by = utilisateur courant. */
export function buildProduitInsert(
	input: ProduitCreateInput,
	createdBy: string | null
): TablesInsert<'decoupe_produits'> {
	return {
		reference: input.reference,
		nom: input.nom,
		famille: input.famille,
		fabricant: input.fabricant || null,
		fournisseur: input.fournisseur || null,
		laizes_mm: input.laizes_mm,
		orientation_imposee: input.orientation_imposee,
		jointage_autorise: input.jointage_autorise,
		nestable: input.nestable,
		marge_pose_mm: input.marge_pose_mm,
		recouvrement_mm: input.recouvrement_mm,
		notes: input.notes || null,
		actif: true,
		created_by: createdBy,
	};
}

/** Row d'UPDATE produit (champs métier + updated_at). Ne touche pas actif/created_by/id. */
export function buildProduitUpdate(input: ProduitUpdateInput): TablesUpdate<'decoupe_produits'> {
	return {
		reference: input.reference,
		nom: input.nom,
		famille: input.famille,
		fabricant: input.fabricant || null,
		fournisseur: input.fournisseur || null,
		laizes_mm: input.laizes_mm,
		orientation_imposee: input.orientation_imposee,
		jointage_autorise: input.jointage_autorise,
		nestable: input.nestable,
		marge_pose_mm: input.marge_pose_mm,
		recouvrement_mm: input.recouvrement_mm,
		notes: input.notes || null,
		updated_at: now(),
	};
}

/** Soft-delete / restauration : bascule `actif` (false = archive, true = restaure) + updated_at. */
export function buildProduitActif(actif: boolean): TablesUpdate<'decoupe_produits'> {
	return { actif, updated_at: now() };
}

// --------------------------------------------------------------------------
// Chantiers (regroupent des vitres)
// --------------------------------------------------------------------------

/** Row d'INSERT chantier : statut initial forcé `en_saisie` ; created_by = utilisateur courant. */
export function buildChantierInsert(
	input: ChantierCreateInput,
	createdBy: string | null
): TablesInsert<'decoupe_chantiers'> {
	return {
		nom: input.nom,
		client: input.client || null,
		statut: 'en_saisie',
		created_by: createdBy,
	};
}

/** Row d'UPDATE chantier (nom/client + updated_at). Le statut a son propre builder. */
export function buildChantierUpdate(input: ChantierUpdateInput): TablesUpdate<'decoupe_chantiers'> {
	return {
		nom: input.nom,
		client: input.client || null,
		updated_at: now(),
	};
}

/** « Lancer la découpe » : passe le chantier en `lancee` (exclu de la conso suggérée, AC-015/Q3). */
export function buildChantierLancementUpdate(): TablesUpdate<'decoupe_chantiers'> {
	return { statut: 'lancee', updated_at: now() };
}

// --------------------------------------------------------------------------
// Vitres (1 ligne = quantite pièces identiques) - pas de created_by ni updated_at
// --------------------------------------------------------------------------

/** Row d'INSERT vitre. */
export function buildVitreInsert(input: VitreCreateInput): TablesInsert<'decoupe_vitres'> {
	return {
		chantier_id: input.chantier_id,
		produit_id: input.produit_id,
		largeur_mm: input.largeur_mm,
		hauteur_mm: input.hauteur_mm,
		quantite: input.quantite,
		type_vitrage: input.type_vitrage || null,
		sur_mesure_fournisseur: input.sur_mesure_fournisseur,
	};
}

/** Row d'UPDATE vitre (dimensions/quantité/produit/coche). Ne déplace pas la vitre de chantier. */
export function buildVitreUpdate(input: VitreUpdateInput): TablesUpdate<'decoupe_vitres'> {
	return {
		produit_id: input.produit_id,
		largeur_mm: input.largeur_mm,
		hauteur_mm: input.hauteur_mm,
		quantite: input.quantite,
		type_vitrage: input.type_vitrage || null,
		sur_mesure_fournisseur: input.sur_mesure_fournisseur,
	};
}
