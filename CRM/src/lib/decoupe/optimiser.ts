/**
 * Cœur d'optimisation de découpe (outil « Découpe Films »).
 *
 * Problème : strip-packing 1D - caser des rectangles (vitres + marge de pose) dans une bande de
 * largeur fixe (la laize), en minimisant la longueur de rouleau consommée. Heuristique maison
 * (First-Fit Decreasing Height en étagères/shelves), déterministe et explicable - PAS l'optimum
 * mathématique (NP-difficile, inutile ici). Spec de référence : brief §6.5.
 *
 * Fonction pure : aucune I/O, mêmes entrées → mêmes sorties. Tout en millimètres entiers (ADR-0003).
 *
 * Conventions de modélisation (explicites, pour l'atelier) :
 * - « en travers » = dimension parallèle à la laize (≤ laize). « le long » = consommée sur le rouleau.
 * - Dimension de coupe = dimension vitre + marge de pose, sur L et sur H (brief §4.4).
 * - Orientation imposée : la pièce garde L/H ; le L (largeur) va en travers de la laize, pas de rotation.
 * - Orientation libre : on met en travers la plus GRANDE dimension qui tient dans la laize (raccourcit
 *   le rouleau). `pivotee` = true si la dimension en travers n'est pas le L d'origine.
 * - Pose en lés (pièce plus large que la laize, jointage autorisé) : on découpe la plus petite dimension
 *   en N bandes ≤ laize ; le recouvrement du produit ajoute de la matière à chaque jointure (Q4).
 */

import type {
	Alerte,
	LigneCommandeFournisseur,
	PlacementPiece,
	PlanProduit,
	PoseEnLes,
	ProduitDecoupe,
	ResultatOptimisation,
	Vitre
} from './types';

/** Dimensions de coupe d'une vitre = dimensions vitre + marge de pose (sur L et H). Brief §4.4. */
export function dimensionsDeCoupe(vitre: Vitre, produit: ProduitDecoupe): { w: number; h: number } {
	return { w: vitre.largeur_mm + produit.marge_pose_mm, h: vitre.hauteur_mm + produit.marge_pose_mm };
}

/**
 * Calcule le nombre de lés et la largeur de bande pour couvrir `largeur` avec des bandes ≤ `laize`,
 * en tenant compte du `recouvrement` à chaque jointure (la matière consommée croît avec le recouvrement).
 * Couverture : N bandes de `largeurBande`, (N-1) jointures de `recouvrement`. Brief §6.4 + Q4.
 */
export function calculerLes(
	largeur: number,
	laize: number,
	recouvrement: number
): { nb: number; largeurBande: number } {
	// N minimal tel qu'il existe une largeur de bande ≤ laize couvrant `largeur` avec les recouvrements.
	let nb = Math.max(1, Math.ceil((largeur - recouvrement) / Math.max(1, laize - recouvrement)));
	let largeurBande = Math.ceil((largeur + (nb - 1) * recouvrement) / nb);
	// Garde-fou arrondi : si l'arrondi fait dépasser la laize, ajouter une bande.
	while (largeurBande > laize) {
		nb += 1;
		largeurBande = Math.ceil((largeur + (nb - 1) * recouvrement) / nb);
	}
	return { nb, largeurBande };
}

// --- Représentation interne d'une pièce à nester (après garde-fou / coche / lés) ---
interface PieceANester {
	vitre_id: string;
	piece_index: number;
	w0: number; // dimension de coupe "L"
	h0: number; // dimension de coupe "H"
	rotatable: boolean; // false si orientation imposée OU lé (orientation figée)
	les_index?: number;
}

/**
 * Choisit l'orientation d'une pièce pour une laize donnée.
 * Retourne `null` si la pièce ne tient pas dans la laize (même pivotée).
 * `across` ≤ laize garanti si non-null.
 */
export function orientationPourLaize(
	piece: PieceANester,
	laize: number
): { across: number; along: number; pivotee: boolean } | null {
	const { w0, h0, rotatable } = piece;
	if (!rotatable) {
		// Orientation figée : le L va en travers, pas de rotation.
		return w0 <= laize ? { across: w0, along: h0, pivotee: false } : null;
	}
	// Orientation libre : on privilégie la plus grande dimension en travers (raccourcit le rouleau).
	const grande = Math.max(w0, h0);
	const petite = Math.min(w0, h0);
	if (grande <= laize) {
		// across = grande. pivotee si la grande dimension n'est pas le L d'origine.
		return { across: grande, along: petite, pivotee: grande !== w0 };
	}
	if (petite <= laize) {
		return { across: petite, along: grande, pivotee: petite !== w0 };
	}
	return null;
}

interface ResultatNester {
	longueur: number;
	surfacePieces: number;
	placements: PlacementPiece[];
}

/**
 * Nesting d'un ensemble de pièces dans une bande de largeur `laize` (FFDH en étagères).
 * Retourne `null` si une pièce ne tient pas dans cette laize (laize invalide pour ce groupe).
 */
export function nester(pieces: PieceANester[], laize: number): ResultatNester | null {
	// Pré-calcul orientation pour cette laize ; abandon si une pièce ne tient pas.
	const oriente = pieces.map((p) => {
		const o = orientationPourLaize(p, laize);
		return o ? { p, ...o } : null;
	});
	if (oriente.some((o) => o === null)) return null;
	const items = oriente as Array<{ p: PieceANester; across: number; along: number; pivotee: boolean }>;

	// FFD : tri par "le long" décroissant (puis "en travers" décroissant, puis stable par id/index).
	items.sort(
		(a, b) =>
			b.along - a.along ||
			b.across - a.across ||
			a.p.vitre_id.localeCompare(b.p.vitre_id) ||
			a.p.piece_index - b.p.piece_index ||
			(a.p.les_index ?? 0) - (b.p.les_index ?? 0)
	);

	// Étagères : chacune a une hauteur figée (= "le long" de sa 1re pièce, la plus haute grâce au tri).
	const shelves: Array<{ y: number; height: number; usedWidth: number }> = [];
	let longueurTotale = 0;
	const placements: PlacementPiece[] = [];
	let surfacePieces = 0;

	for (const it of items) {
		let shelf = shelves.find((s) => s.usedWidth + it.across <= laize);
		if (!shelf) {
			shelf = { y: longueurTotale, height: it.along, usedWidth: 0 };
			shelves.push(shelf);
			longueurTotale += it.along; // hauteur figée (FFDH, tri décroissant)
		}
		placements.push({
			vitre_id: it.p.vitre_id,
			piece_index: it.p.piece_index,
			x_mm: shelf.usedWidth,
			y_mm: shelf.y,
			largeur_placee_mm: it.across,
			hauteur_placee_mm: it.along,
			pivotee: it.pivotee,
			...(it.p.les_index !== undefined ? { les_index: it.p.les_index } : {})
		});
		surfacePieces += it.across * it.along;
		shelf.usedWidth += it.across;
	}

	return { longueur: longueurTotale, surfacePieces, placements };
}

/**
 * Optimise la découpe d'un ensemble de vitres (chantier seul OU consolidé : il suffit de passer
 * les vitres concernées). Déterministe. Logique : brief §6.5.
 *
 * @param vitres   vitres à traiter
 * @param produits index produit_id → ProduitDecoupe (tous les produits référencés présents)
 */
export function optimiserDecoupe(
	vitres: Vitre[],
	produits: ReadonlyMap<string, ProduitDecoupe>
): ResultatOptimisation {
	const commandes_fournisseur: LigneCommandeFournisseur[] = [];
	const alertes: Alerte[] = [];
	// Pièces à nester regroupées par produit + suivi des poses en lés par produit.
	const groupes = new Map<string, PieceANester[]>();
	const lesParProduit = new Map<string, PoseEnLes[]>();

	const ajouterPiece = (produitId: string, piece: PieceANester) => {
		const g = groupes.get(produitId);
		if (g) g.push(piece);
		else groupes.set(produitId, [piece]);
	};

	for (const vitre of vitres) {
		const produit = produits.get(vitre.produit_id);
		if (!produit) {
			// Produit manquant : on ne devine pas, on signale (jamais d'échec silencieux).
			alertes.push({
				vitre_id: vitre.id,
				type: 'piece_non_placable',
				message: `Produit introuvable pour la vitre ${vitre.id}.`
			});
			continue;
		}

		// 1) Garde-fou nestable (prioritaire sur la coche).
		if (!produit.nestable) {
			commandes_fournisseur.push({ vitre_id: vitre.id, raison: 'non_nestable' });
			if (!vitre.sur_mesure_fournisseur) {
				alertes.push({
					vitre_id: vitre.id,
					type: 'non_nestable_laisse_en_interne',
					message: `Produit non nestable laissé en découpe interne (vitre ${vitre.id}) : traité hors découpe.`
				});
			}
			continue;
		}

		// 2) Coche sur-mesure fournisseur → hors nesting.
		if (vitre.sur_mesure_fournisseur) {
			commandes_fournisseur.push({ vitre_id: vitre.id, raison: 'sur_mesure_fournisseur' });
			continue;
		}

		// 3) Découpe interne → préparer les pièces (dimensions de coupe).
		const { w, h } = dimensionsDeCoupe(vitre, produit);
		const laizeMax = Math.max(...produit.laizes_mm);
		// La plus petite dimension plaçable en travers (selon orientation).
		const minAcross = produit.orientation_imposee ? w : Math.min(w, h);

		for (let i = 0; i < vitre.quantite; i++) {
			if (minAcross <= laizeMax) {
				ajouterPiece(produit.id, {
					vitre_id: vitre.id,
					piece_index: i,
					w0: w,
					h0: h,
					rotatable: !produit.orientation_imposee
				});
				continue;
			}
			// Trop large pour la laize max.
			if (!produit.jointage_autorise) {
				alertes.push({
					vitre_id: vitre.id,
					type: 'piece_non_placable',
					message: `Vitre ${vitre.id} (pièce ${i + 1}) plus large que la laize max (${laizeMax} mm) et jointage non autorisé.`
				});
				continue;
			}
			// Pose en lés : on découpe la plus petite dimension en bandes ≤ laize max.
			const dimToSplit = produit.orientation_imposee ? w : Math.min(w, h);
			const alongDim = produit.orientation_imposee ? h : Math.max(w, h);
			const { nb, largeurBande } = calculerLes(dimToSplit, laizeMax, produit.recouvrement_mm);
			const poses = lesParProduit.get(produit.id) ?? [];
			poses.push({ vitre_id: vitre.id, piece_index: i, nb_les: nb, largeur_bande_mm: largeurBande });
			lesParProduit.set(produit.id, poses);
			for (let k = 0; k < nb; k++) {
				ajouterPiece(produit.id, {
					vitre_id: vitre.id,
					piece_index: i,
					w0: largeurBande,
					h0: alongDim,
					rotatable: false, // orientation figée pour un lé
					les_index: k
				});
			}
		}
	}

	// 4) Pour chaque produit : test multi-laizes, on garde la longueur minimale (brief §6.2).
	const plans: PlanProduit[] = [];
	for (const [produitId, pieces] of groupes) {
		if (pieces.length === 0) continue;
		const produit = produits.get(produitId)!;
		const laizesTriees = [...new Set(produit.laizes_mm)].sort((a, b) => a - b);

		let meilleur: { laize: number; res: ResultatNester } | null = null;
		for (const laize of laizesTriees) {
			const res = nester(pieces, laize);
			if (!res) continue; // laize trop petite pour une pièce du groupe
			// Primaire : longueur min ; tie-break : laize min (déjà triée croissant).
			if (!meilleur || res.longueur < meilleur.res.longueur) meilleur = { laize, res };
		}
		if (!meilleur) continue; // ne devrait pas arriver (laize max toujours valide)

		const aireRouleau = meilleur.laize * meilleur.res.longueur;
		const taux_chute = aireRouleau > 0 ? (aireRouleau - meilleur.res.surfacePieces) / aireRouleau : 0;
		plans.push({
			produit_id: produitId,
			laize_mm: meilleur.laize,
			longueur_consommee_mm: meilleur.res.longueur,
			surface_pieces_mm2: meilleur.res.surfacePieces,
			taux_chute,
			placements: meilleur.res.placements,
			poses_en_les: lesParProduit.get(produitId) ?? []
		});
	}

	// Ordre stable des plans (par produit_id) pour un rendu déterministe.
	plans.sort((a, b) => a.produit_id.localeCompare(b.produit_id));
	return { plans, commandes_fournisseur, alertes };
}
