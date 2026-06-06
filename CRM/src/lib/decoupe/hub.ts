/**
 * Hub « Découpe » (onglet atelier) - logique pure, zéro I/O.
 * Transforme les lignes chantiers (avec vitres + produit imbriqués) en :
 *   - une liste de chantiers prête à afficher (nb vitres, familles, films internes),
 *   - des suggestions de consolidation (un film nestable posé en interne, partagé
 *     par ≥ 2 chantiers « en saisie » → les optimiser ensemble réduit les chutes).
 * Doctrine projet : tout calcul métier dans un `.ts` pur testé (le `.svelte` = e2e only).
 */

/** Produit imbriqué dans une vitre (sous-ensemble utile au hub). */
export interface HubProduitRow {
	reference: string;
	nom: string;
	famille: string;
	nestable: boolean;
}

/** Vitre imbriquée dans un chantier (jointure Supabase). */
export interface HubVitreRow {
	produit_id: string;
	sur_mesure_fournisseur: boolean;
	decoupe_produits: HubProduitRow | null;
}

/** Ligne chantier brute (jointure Supabase). */
export interface HubChantierRow {
	id: string;
	nom: string;
	client: string | null;
	statut: string;
	updated_at: string;
	decoupe_vitres: HubVitreRow[] | null;
}

/** Film nestable posé en interne (référencé par un chantier). */
export interface HubFilm {
	produit_id: string;
	reference: string;
	nom: string;
	famille: string;
}

/** Chantier projeté pour l'affichage du hub. */
export interface HubChantier {
	id: string;
	nom: string;
	client: string | null;
	statut: string;
	nb_vitres: number;
	familles: string[];
	films: HubFilm[];
}

/** Suggestion de consolidation : un film partagé par plusieurs chantiers en saisie. */
export interface HubGroupe {
	produit_id: string;
	reference: string;
	nom: string;
	famille: string;
	chantiers: { id: string; nom: string }[];
}

export interface HubData {
	chantiers: HubChantier[];
	groupes: HubGroupe[];
}

// Ordre d'affichage stable des pastilles de famille (aligné sur la liste chantiers).
const FAMILLE_ORDER: Record<string, number> = { solaire: 0, securite: 1, discretion: 2 };

/**
 * Construit les données du hub. `rows` est supposé déjà trié (ex. updated_at desc) :
 * l'ordre des chantiers est préservé. Les groupes sont triés par nombre de chantiers
 * décroissant puis référence (déterminisme pour les snapshots de test).
 */
export function buildHub(rows: HubChantierRow[]): HubData {
	const chantiers: HubChantier[] = rows.map((c) => {
		const vitres = c.decoupe_vitres ?? [];

		const familles = [
			...new Set(vitres.map((v) => v.decoupe_produits?.famille).filter((f): f is string => Boolean(f)))
		].sort((a, b) => (FAMILLE_ORDER[a] ?? 9) - (FAMILLE_ORDER[b] ?? 9));

		// Films nestable posés en interne (hors sur-mesure fournisseur), dédupliqués par produit.
		const filmMap = new Map<string, HubFilm>();
		for (const v of vitres) {
			const p = v.decoupe_produits;
			if (!p || !p.nestable || v.sur_mesure_fournisseur) continue;
			if (!filmMap.has(v.produit_id)) {
				filmMap.set(v.produit_id, {
					produit_id: v.produit_id,
					reference: p.reference,
					nom: p.nom,
					famille: p.famille
				});
			}
		}

		return {
			id: c.id,
			nom: c.nom,
			client: c.client,
			statut: c.statut,
			nb_vitres: vitres.length,
			familles,
			films: [...filmMap.values()]
		};
	});

	// Consolidation : un film nestable interne partagé par ≥ 2 chantiers « en saisie ».
	// Les chantiers « lancée » sont exclus (déjà engagés, hors future consolidation - Q3).
	const byProduit = new Map<string, { film: HubFilm; chantiers: { id: string; nom: string }[] }>();
	for (const c of chantiers) {
		if (c.statut !== 'en_saisie') continue;
		for (const f of c.films) {
			let entry = byProduit.get(f.produit_id);
			if (!entry) {
				entry = { film: f, chantiers: [] };
				byProduit.set(f.produit_id, entry);
			}
			entry.chantiers.push({ id: c.id, nom: c.nom });
		}
	}

	const groupes: HubGroupe[] = [...byProduit.values()]
		.filter((g) => g.chantiers.length >= 2)
		.map((g) => ({
			produit_id: g.film.produit_id,
			reference: g.film.reference,
			nom: g.film.nom,
			famille: g.film.famille,
			chantiers: g.chantiers
		}))
		.sort((a, b) => b.chantiers.length - a.chantiers.length || a.reference.localeCompare(b.reference));

	return { chantiers, groupes };
}
