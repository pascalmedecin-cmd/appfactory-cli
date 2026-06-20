/**
 * api-contracts.ts - Portail FilmPro multi-outils (chantier 1)
 *
 * Ce chantier n'ajoute AUCUN endpoint metier. Il fige une CONVENTION de routing
 * qui permet aux outils de coexister et de partager le referentiel proprement.
 * Les contrats des endpoints metier (devis) seront produits au chantier 2.
 */

// ----------------------------------------------------------------------------
// CONVENTION DE ROUTING API (figee ce chantier)
// ----------------------------------------------------------------------------
// 1. Endpoints PARTAGES (referentiel + capture terrain) : pas de prefixe outil.
//      /api/entreprises/*      (recherche, get, upsert via couche service)
//      /api/contacts/*
//      /api/visits, /api/photos, /api/contact-suggestions   (terrain, partages)
//
// 2. Endpoints SCOPES par outil : prefixes par outil.
//      /api/crm/*       (prospection, signaux, veille, reporting) - existant
//      /api/devis/*     (chantier 2)
//
// NOTE : le reprefixage effectif des endpoints CRM existants (/api/prospection ->
// /api/crm/prospection) est HORS-SCOPE de ce chantier (non bloquant). Voir PRD section 9.

// ----------------------------------------------------------------------------
// CONTRAT REFERENTIEL PARTAGE (existant, formalise - ADR-0002)
// ----------------------------------------------------------------------------
// Toute ecriture entreprises/contacts passe par la couche service, pas en direct.

export interface Entreprise {
	id: string;
	raison_sociale: string;
	canton?: string | null;
	// ... (champs existants inchanges)
}

export interface Contact {
	id: string;
	entreprise_id: string; // FK referentiel partage
	prenom?: string | null;
	nom: string;
	role?: string | null;
	tel?: string | null;
	email?: string | null;
}

export interface ApiError {
	code: 'forbidden' | 'invalid_input' | 'duplicate' | 'not_found' | 'internal';
	message: string;
	details?: Record<string, string>;
}

// ----------------------------------------------------------------------------
// COUCHE SERVICE REFERENTIEL (cible ce chantier - src/lib/server/referentiel/)
// ----------------------------------------------------------------------------
// Signatures cibles (l'implementation reutilise/centralise l'existant) :
//
//   referentiel.entreprises.search(q: string, canton?: string): Promise<Entreprise[]>
//   referentiel.entreprises.upsert(input): Promise<Entreprise>   // normalisation + dedup
//   referentiel.contacts.listByEntreprise(entrepriseId: string): Promise<Contact[]>
//   referentiel.contacts.upsert(input): Promise<Contact>
//
// Le futur outil Devis consomme ces memes fonctions -> zero re-saisie, zero divergence.

// ----------------------------------------------------------------------------
// PASSERELLES INTER-OUTILS (principe ADR-0003 ; implementation chantier 2)
// ----------------------------------------------------------------------------
// Passerelle A (CRM -> Devis) : navigation via convention d'URL, lecture referentiel.
//   GET /devis/nouveau?entreprise_id=<uuid>
//
// Passerelle B (Devis -> CRM) : service expose par le CRM, jamais d'UPDATE direct.
//   crm.opportunites.avancerDepuisDevis(devisId: string, auteurId: string): Promise<void>
