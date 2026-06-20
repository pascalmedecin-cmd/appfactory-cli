/**
 * CONTRATS API — CRM FilmPro mobile V3 « outil terrain »
 * Phase 2 product-architect. Date : 2026-05-31.
 *
 * Stack réelle : SvelteKit (form actions / +server.ts endpoints) + Supabase.
 * Convention projet : tout endpoint vérifie `locals.safeGetSession()` → 401 si
 * pas de session, valide le body via Zod, vérifie l'existence du parent.
 *
 * Légende :
 *   [EXISTANT]  endpoint déjà en prod, réutilisé tel quel
 *   [ÉTENDU]    endpoint existant dont le contrat évolue en V3 (rétro-compatible)
 *   [NOUVEAU]   endpoint à créer en V3
 */

// =============================================================================
// 1. À FAIRE (accueil) — relances dues. [EXISTANT côté data, à exposer mobile]
// =============================================================================
// Réutilise la requête `relances` déjà présente dans (app)/+page.server.ts :
//   opportunites.date_relance_prevue <= today ET étape non close.
// Le shell mobile consomme la même `load`, pas de nouvel endpoint nécessaire.

export interface AFaireItem {
  opportunite_id: string;
  titre: string;
  etape_pipeline: string | null;
  date_relance_prevue: string; // YYYY-MM-DD
  entreprise_id: string | null;
  entreprise_nom?: string;
}

// =============================================================================
// 2. RECHERCHE ENTREPRISE — [EXISTANT, à étendre additivement] (revue H-3)
// =============================================================================
// GET /api/entreprises/search?q=<nom>  EXISTE DÉJÀ (audit 360 V2b H-06).
// Contrat réel actuel : retourne { id, raison_sociale, site_web }, exige q >= 2
// chars (sinon { results: [] }), q <= 100 (sinon 400), filtre statut_archive=false,
// ILIKE prefix `q%` (index GIN trigram 20260510_005), cap 20, ordre raison_sociale.
// V3 : AJOUTER `canton` au SELECT (changement ADDITIF sûr, canton existe sur
// entreprises) pour la pastille canton de la fiche. NE PAS créer un 2e endpoint.

export interface EntrepriseSearchResult {
  id: string;
  raison_sociale: string;
  site_web: string | null; // déjà retourné par l'endpoint existant
  canton: string | null;   // V3 : ajout additif au SELECT existant
}
export interface EntrepriseSearchResponse {
  results: EntrepriseSearchResult[]; // cap 20 ; [] si q < 2 chars ; 400 si q > 100
}

// =============================================================================
// 3. FICHE ENTREPRISE (lecture seule) — [EXISTANT, agrégat lecture]
// =============================================================================
// GET /api/entreprises/[id]  (ou load route) → contexte fiche.

export interface FicheEntreprise {
  id: string;
  raison_sociale: string;
  canton: string | null;
  adresse_siege: string | null;
  // Premier contact exploitable (pour boutons natifs).
  contact_principal: {
    nom: string | null;
    telephone: string | null;     // → bouton Appeler (tel:)
    email_professionnel: string | null; // → bouton Email (mailto:)
  } | null;
  opportunites_en_cours: Array<{
    id: string;
    titre: string;
    etape_pipeline: string | null;
    date_relance_prevue: string | null;
  }>;
  // Historique court (5 max chacun).
  dernieres_visites: VisiteResume[];
  dernieres_activites: Array<{
    id: string;
    type_activite: string | null;
    resume_contenu: string | null;
    date_heure: string;
  }>;
}

// =============================================================================
// 4. VISITES / COMPTE-RENDU — [ÉTENDU, modif d'implémentation REQUISE] /api/visits
// =============================================================================
// ATTENTION (revue H-1) : « ÉTENDU » n'est PAS un no-op. Le code actuel :
//   - POST rejette en 400 si lat/lng absent ou non fini, et N'INSÈRE PAS
//     resultat/note (insertRow ne les contient pas).
//   - GET ne SELECT pas resultat/note.
// Phase 3 DOIT donc modifier l'endpoint (3 changements, tous ADDITIFS au contrat) :
//   (1) POST : lat/lng deviennent optionnels (pas de 400 si absents) ; calcul
//       distance_from_zefix_m conditionnel (NULL si pas de GPS) ; ajouter
//       resultat/note à l'insert.
//   (2) GET + POST : ajouter resultat/note au SELECT.
//   (3) NE PAS retirer les champs existants (accuracy_m, distance_from_zefix_m,
//       user_id) du SELECT : le desktop les consomme. VisiteResume reste un
//       SUR-ENSEMBLE (la vue mobile peut n'en lire qu'une partie).

export interface VisiteResume {
  id: string;
  visited_at: string;
  resultat: ResultatVisite | null;     // V3 ajout
  note: string | null;                 // V3 ajout
  lat: number | null;                  // V3 : nullable (géoloc optionnelle)
  lng: number | null;
  accuracy_m: number | null;           // conservé (consommé desktop)
  address_resolved: string | null;
  distance_from_zefix_m: number | null;// conservé ; NULL quand lat/lng NULL
  user_id: string | null;              // conservé
}

export type ResultatVisite =
  | 'visite_interesse'
  | 'visite_a_relancer'
  | 'absent'
  | 'non_pertinent';
// Source unique TS (revue Low) : dériver le schéma Zod Phase 3 de cette const,
// le CHECK DB restant l'autorité runtime. Évite le drift enum (DB / TS / Zod).
export const RESULTAT_VISITE = [
  'visite_interesse', 'visite_a_relancer', 'absent', 'non_pertinent',
] as const;

// GET  /api/visits?entreprise_id=<uuid>  → { visits: VisiteResume[], parent_address_raw }
// POST /api/visits  (body ci-dessous) → { visit: VisiteResume, geocode_diag }
export interface CreateVisiteRequest {
  // Le endpoint réel est XOR lead_id | entreprise_id. Le shell MOBILE n'utilise
  // QUE entreprise_id (vue mobile-only). 400 si les deux fournis.
  entreprise_id: string;            // UUID
  resultat?: ResultatVisite;        // enum fermé, pas d'« Autre »
  note?: string;                    // ≤ 2000 char
  lat?: number;                     // optionnel V3 (géoloc refusable) ; si fourni, lng requis
  lng?: number;
  accuracy_m?: number;
}

// =============================================================================
// 5. PHOTOS — [EXISTANT] /api/photos (réutilisé tel quel, max 10/owner)
// =============================================================================
// POST /api/photos?entreprise_id=<uuid>  multipart (file + caption?)
//   → { photo: { id, url, caption, uploaded_at, ... } }
// GET  /api/photos?entreprise_id=<uuid>  → { photos: [...] } (URLs signées 1h)

export interface PhotoUploadResponse {
  photo: {
    id: string;
    storage_path: string;
    caption: string | null;
    uploaded_at: string;
    url: string | null; // signed URL
  };
}

// =============================================================================
// 6. CONTACT SUGGESTIONS (brouillon) — [NOUVEAU]
// =============================================================================

// POST /api/contact-suggestions  (mobile, création brouillon)
export interface CreateContactSuggestionRequest {
  entreprise_id: string;
  visit_id?: string;
  prenom?: string;
  nom?: string;
  role_fonction?: string;
  telephone?: string;
  email?: string;
  notes?: string;
  // Au moins un de {prenom, nom, telephone, email} requis (validé Zod + CHECK DB).
}
export interface ContactSuggestion {
  id: string;
  entreprise_id: string;        // toujours rempli (NOT NULL en DB, revue H-2)
  visit_id: string | null;      // (revue M) utile au desktop pour la traçabilité
  prenom: string | null;
  nom: string | null;
  role_fonction: string | null; // (revue M) exposé en lecture, pas seulement en create
  telephone: string | null;
  email: string | null;
  notes: string | null;
  statut: 'en_attente' | 'valide' | 'rejete';
  created_at: string;           // (revue M) tri desktop
  resolved_at: string | null;   // (revue M) renseigné ssi statut != en_attente
}

// GET /api/contact-suggestions?statut=en_attente  (desktop, badge + liste)
export interface ContactSuggestionsResponse {
  suggestions: ContactSuggestion[];
  count_en_attente: number; // alimente le badge compteur desktop
}

// POST /api/contact-suggestions/[id]/resolve  (desktop, validation 1 clic)
// IDEMPOTENCE (revue M) : transition d'état UNIQUE en_attente -> valide|rejete,
// irréversible. Un resolve sur une suggestion déjà résolue (statut != en_attente)
// renvoie 409 (pas de 2e ligne contacts créée). Protège du double-clic = doublon
// (le mal exact que la file de validation évite, ADR-0003).
export interface ResolveContactSuggestionRequest {
  action: 'valide' | 'rejete';
  merged_contact_id?: string; // si fusion sur un contact existant (sinon création)
}
export interface ResolveContactSuggestionResponse {
  id: string;
  statut: 'valide' | 'rejete';
  contact_id?: string; // (revue M) la ligne contacts touchée (créée OU fusionnée)
  merged: boolean;     // true = fusion sur un contact existant ; false = création
}

// =============================================================================
// 7. ERREURS — schéma commun
// =============================================================================
export interface ApiError {
  error: string; // message court FR (convention projet : { error } )
}
// Codes HTTP : 401 (pas de session), 400 (body/JSON invalide, q recherche > 100,
// XOR lead/entreprise violé), 404 (parent introuvable), 409 (limite 10 photos OU
// resolve sur suggestion déjà résolue), 413 (photo > 5 Mo), 500 (erreur serveur).
