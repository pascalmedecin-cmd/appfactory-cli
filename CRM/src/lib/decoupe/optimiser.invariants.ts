/**
 * Vérificateur des RÈGLES DURES de l'optimiseur de découpe (niveau 1 de la spec
 * `.product-architect/decoupe/optimiser-verification-spec.md`).
 *
 * Pur : donné (vitres, produits, résultat), retourne la liste des violations
 * (vide = tout est correct). Utilisé par le fuzzing (`optimiser.fuzz.test.ts`)
 * pour valider des dizaines de milliers de cas, et réutilisable comme assertion
 * de garde en dev. Ne dépend PAS de l'implémentation de l'algo : il vérifie des
 * propriétés que toute sortie correcte doit satisfaire (pas un miroir du code).
 */

import type { ProduitDecoupe, ResultatOptimisation, Vitre } from './types';

const EPS = 1e-9;

/** Deux rectangles axis-aligned se chevauchent-ils (bords jointifs NON comptés) ? */
function overlap(
	a: { x: number; y: number; w: number; h: number },
	b: { x: number; y: number; w: number; h: number }
): boolean {
	return a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS;
}

export function checkInvariants(
	vitres: Vitre[],
	produits: ReadonlyMap<string, ProduitDecoupe>,
	result: ResultatOptimisation
): string[] {
	const v: string[] = [];
	const vitreById = new Map(vitres.map((x) => [x.id, x]));

	// --- Par plan : I1 (laize), I2 (chevauchement), I4 (surface/chute), I9 (borne) ---
	for (const plan of result.plans) {
		const produit = produits.get(plan.produit_id);
		if (!produit) {
			v.push(`I4: plan pour produit inconnu ${plan.produit_id}`);
			continue;
		}
		if (!produit.laizes_mm.includes(plan.laize_mm)) {
			v.push(`I4: laize ${plan.laize_mm} hors du catalogue du produit ${plan.produit_id}`);
		}

		const rects = plan.placements.map((p) => ({
			x: p.x_mm,
			y: p.y_mm,
			w: p.largeur_placee_mm,
			h: p.hauteur_placee_mm,
			ref: `${p.vitre_id}#${p.piece_index}${p.les_index !== undefined ? `/lé${p.les_index}` : ''}`
		}));

		let surfaceRecalc = 0;
		let maxAlong = 0;
		for (const r of rects) {
			// I1 : dans la laize + dans la longueur
			if (r.x < -EPS || r.x + r.w > plan.laize_mm + EPS) {
				v.push(`I1: pièce ${r.ref} déborde de la laize (x=${r.x}, w=${r.w}, laize=${plan.laize_mm})`);
			}
			if (r.y < -EPS || r.y + r.h > plan.longueur_consommee_mm + EPS) {
				v.push(`I1: pièce ${r.ref} déborde de la longueur (y=${r.y}, h=${r.h}, long=${plan.longueur_consommee_mm})`);
			}
			if (r.w <= 0 || r.h <= 0) v.push(`I1: pièce ${r.ref} de dimension nulle/négative (${r.w}x${r.h})`);
			surfaceRecalc += r.w * r.h;
			maxAlong = Math.max(maxAlong, r.h);
		}

		// I2 : pas de chevauchement (O(n²), tailles de test petites)
		for (let i = 0; i < rects.length; i++) {
			for (let j = i + 1; j < rects.length; j++) {
				if (overlap(rects[i], rects[j])) {
					v.push(`I2: chevauchement entre ${rects[i].ref} et ${rects[j].ref}`);
				}
			}
		}

		// I4 : surface cohérente + chute ∈ [0,1)
		const aire = plan.laize_mm * plan.longueur_consommee_mm;
		if (Math.abs(surfaceRecalc - plan.surface_pieces_mm2) > 1e-6 * Math.max(1, surfaceRecalc)) {
			v.push(`I4: surface_pieces incohérente (déclaré ${plan.surface_pieces_mm2}, recalculé ${surfaceRecalc})`);
		}
		if (plan.surface_pieces_mm2 > aire + EPS) {
			v.push(`I4: surface posée ${plan.surface_pieces_mm2} > aire rouleau ${aire}`);
		}
		const tauxAttendu = aire > 0 ? (aire - plan.surface_pieces_mm2) / aire : 0;
		if (Math.abs(tauxAttendu - plan.taux_chute) > 1e-6) {
			v.push(`I4: taux_chute incohérent (déclaré ${plan.taux_chute}, attendu ${tauxAttendu})`);
		}
		if (plan.taux_chute < -EPS || plan.taux_chute >= 1) {
			v.push(`I4: taux_chute hors [0,1) : ${plan.taux_chute}`);
		}
		if (plan.placements.length > 0 && plan.longueur_consommee_mm <= 0) {
			v.push(`I4: longueur_consommee nulle avec ${plan.placements.length} placements`);
		}
		// I9 : borne basse physique (la pièce la plus haute doit tenir sur le rouleau)
		if (plan.placements.length > 0 && plan.longueur_consommee_mm < maxAlong - EPS) {
			v.push(`I9: longueur ${plan.longueur_consommee_mm} < plus haute pièce ${maxAlong}`);
		}

		// I7 : lés cohérents
		for (const pose of plan.poses_en_les) {
			if (pose.nb_les < 2) v.push(`I7: pose en lés avec nb_les < 2 (${pose.nb_les})`);
			if (pose.largeur_bande_mm > plan.laize_mm + EPS) {
				v.push(`I7: bande de lé ${pose.largeur_bande_mm} > laize ${plan.laize_mm}`);
			}
			const lesPlacements = plan.placements.filter(
				(p) => p.vitre_id === pose.vitre_id && p.piece_index === pose.piece_index && p.les_index !== undefined
			);
			if (lesPlacements.length !== pose.nb_les) {
				v.push(`I7: ${pose.vitre_id}#${pose.piece_index} : ${lesPlacements.length} placements de lé pour nb_les=${pose.nb_les}`);
			}
		}
	}

	// --- Conservation (I3) + coche/garde-fou (I5/I6) au niveau des vitres ---
	const placedVitreIds = new Set(result.plans.flatMap((p) => p.placements.map((pl) => pl.vitre_id)));
	const commandeVitreIds = new Set(result.commandes_fournisseur.map((c) => c.vitre_id));

	// I3e : au plus une commande par vitre
	const seenCmd = new Set<string>();
	for (const c of result.commandes_fournisseur) {
		if (seenCmd.has(c.vitre_id)) v.push(`I3e: commande dupliquée pour la vitre ${c.vitre_id}`);
		seenCmd.add(c.vitre_id);
		const vitre = vitreById.get(c.vitre_id);
		if (!vitre) {
			v.push(`I3: commande pour une vitre inconnue ${c.vitre_id}`);
			continue;
		}
		const produit = produits.get(vitre.produit_id);
		if (c.raison === 'non_nestable' && produit && produit.nestable) {
			v.push(`I3e: raison non_nestable mais produit ${vitre.produit_id} est nestable`);
		}
		if (c.raison === 'sur_mesure_fournisseur' && !vitre.sur_mesure_fournisseur) {
			v.push(`I3e: raison sur_mesure mais la vitre ${c.vitre_id} n'est pas cochée`);
		}
	}

	for (const vitre of vitres) {
		const produit = produits.get(vitre.produit_id);
		const isPlaced = placedVitreIds.has(vitre.id);
		const isCmd = commandeVitreIds.has(vitre.id);
		const hasAlerte = result.alertes.some((a) => a.vitre_id === vitre.id);

		// I3a : jamais posée ET commandée
		if (isPlaced && isCmd) v.push(`I3a: vitre ${vitre.id} à la fois posée et en commande`);
		// I3b : jamais silencieusement perdue
		if (!isPlaced && !isCmd && !hasAlerte) v.push(`I3b: vitre ${vitre.id} perdue (ni posée, ni commande, ni alerte)`);

		if (isPlaced) {
			// I3c / I5 / I6 : une vitre posée est forcément interne légitime
			if (!produit) v.push(`I3c: vitre ${vitre.id} posée mais produit introuvable`);
			else {
				if (!produit.nestable) v.push(`I6: vitre ${vitre.id} posée alors que produit non nestable`);
				if (vitre.sur_mesure_fournisseur) v.push(`I5: vitre ${vitre.id} posée alors que cochée sur-mesure`);
			}
			// I3d : conservation des pièces (distinct piece_index posés + alertes non plaçables = quantité)
			const piecesPosees = new Set(
				result.plans
					.flatMap((p) => p.placements)
					.filter((pl) => pl.vitre_id === vitre.id)
					.map((pl) => pl.piece_index)
			);
			const nonPlacables = result.alertes.filter(
				(a) => a.vitre_id === vitre.id && a.type === 'piece_non_placable'
			).length;
			if (piecesPosees.size + nonPlacables !== vitre.quantite) {
				v.push(
					`I3d: vitre ${vitre.id} quantité ${vitre.quantite} mais ${piecesPosees.size} pièces posées + ${nonPlacables} non plaçables`
				);
			}
		}

		// I6 : garde-fou - produit non nestable jamais posé, toujours commandé
		if (produit && !produit.nestable && !isCmd) {
			v.push(`I6: produit non nestable (vitre ${vitre.id}) absent des commandes`);
		}
		// I5 : coche - sur-mesure (produit nestable) toujours commandé, jamais posé
		if (produit && produit.nestable && vitre.sur_mesure_fournisseur && !isCmd) {
			v.push(`I5: vitre cochée sur-mesure ${vitre.id} absente des commandes`);
		}
	}

	return v;
}
