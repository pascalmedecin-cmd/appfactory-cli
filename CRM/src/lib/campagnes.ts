/**
 * Constantes et types Campagnes PARTAGÉS client + serveur (Vague 3.2, étiquetage N-N).
 *
 * Pur, sans dépendance serveur : importable depuis les composants Svelte (CampagneCombo,
 * liste, fiche, écran dédié) ET depuis `$lib/server/campagnes.ts` (qui les ré-exporte pour
 * compat). Source UNIQUE de la palette de couleurs -> aucune dérive entre le slug stocké
 * (CHECK SQL c1..c8), le picker côté UI et les classes CSS `.camp--cN` / `.swN` (app.css).
 */
import type { Database } from '$lib/database.types';
import { prospectMapsUrl } from '$lib/maps-url';

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

/**
 * Prospect d'une campagne tel qu'exposé par GET /api/campagnes/[id]/prospects.
 * Sur-ensemble de `ProspectAdresse` (étiquettes) : le panneau « Prospects de la campagne »
 * affiche en plus le statut de tri, le score et la source. Un consommateur qui n'attend que
 * l'adresse (page Étiquettes) ignore simplement les champs additionnels.
 */
export interface ProspectCampagne {
	id: string;
	raison_sociale: string;
	adresse: string | null;
	npa: string | null;
	localite: string | null;
	statut: string;
	score_pertinence: number | null;
	source: string;
	/** Lien vers la fiche source (pour `google_places` : URL Google Maps). Alimente le PDF de liste. */
	source_url: string | null;
	/** Description d'import (pour `google_places` : adresse formatée + types Google). Alimente le PDF de liste. */
	description: string | null;
	/** Types Google Places structurés (1er = principal). null hors google_places. */
	google_types: string[] | null;
	/** Groupe du prospect DANS cette campagne (null = sans groupe). Porté par le lien N-N. */
	groupe_id: string | null;
	/** Décision de validation externe (lien partagé) : garder / retirer / null = pas encore vérifié. */
	validation_statut: ValidationDecision | null;
}

/** Décisions possibles de la validation externe (alignées sur le CHECK SQL + le Zod des endpoints). */
export const VALIDATION_DECISIONS = ['garder', 'retirer'] as const;
export type ValidationDecision = (typeof VALIDATION_DECISIONS)[number];

export function isValidationDecision(v: unknown): v is ValidationDecision {
	return typeof v === 'string' && (VALIDATION_DECISIONS as readonly string[]).includes(v);
}

/** Avancement de la validation externe d'une liste de prospects (pur, testé). */
export interface ValidationProgress {
	total: number;
	verifies: number;
	garder: number;
	retirer: number;
}

export function validationProgress(list: readonly Pick<ProspectCampagne, 'validation_statut'>[]): ValidationProgress {
	let garder = 0;
	let retirer = 0;
	for (const p of list) {
		if (p.validation_statut === 'garder') garder++;
		else if (p.validation_statut === 'retirer') retirer++;
	}
	return { total: list.length, verifies: garder + retirer, garder, retirer };
}

/**
 * Cap de volume de la lecture PUBLIQUE (page de validation externe) : borne la sérialisation
 * envoyée à un appelant anonyme (aligné sur le cas étiquettes). Au-delà, `fetchProspectsForCampagne`
 * tronque et signale `truncated` -> pas de sérialisation illimitée vers un anonyme (spec §5.4).
 */
export const PUBLIC_MAX_PROSPECTS = 1000;

/**
 * Vue MINIMALE d'un prospect exposée à la page publique (personne SANS compte CRM). Clés closes :
 * aucun champ sensible (score, statut de tri, source, description, google_types, id de campagne)
 * ne doit transiter. `id` = lead_id, requis par l'API decision, ne porte aucune info exploitable.
 */
export interface PublicProspect {
	id: string;
	nom: string;
	adresse: string;
	mapsUrl: string | null;
	decision: ValidationDecision | null;
}

/**
 * Projette un prospect de campagne vers sa vue publique minimale. Fonction PURE, SOURCE UNIQUE de
 * la minimisation publique : remplace le `.map()` inline non testé (spec §5.3). Le test de forme
 * (clés exactement ['adresse','decision','id','mapsUrl','nom']) casse si un champ sensible fuit
 * un jour par recopie accidentelle du select serveur.
 */
export function toPublicProspect(p: ProspectCampagne): PublicProspect {
	return {
		id: p.id,
		nom: p.raison_sociale,
		adresse: [p.adresse, [p.npa, p.localite].filter(Boolean).join(' ')].filter(Boolean).join(', '),
		mapsUrl: prospectMapsUrl(p),
		decision: p.validation_statut,
	};
}

/** Normalisation de recherche : minuscules + sans diacritiques (« regie » matche « Régie »). */
function normSearch(s: string): string {
	return s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.trim();
}

/** Filtre local du panneau prospects (nom OU localité, insensible à la casse ET aux accents). Pur, testé. */
export function filterProspectsCampagne(list: readonly ProspectCampagne[], search: string): ProspectCampagne[] {
	const q = normSearch(search);
	if (!q) return [...list];
	return list.filter(
		(p) => normSearch(p.raison_sociale).includes(q) || normSearch(p.localite ?? '').includes(q),
	);
}
