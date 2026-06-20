-- =============================================================================
-- DATA MODEL — CRM FilmPro mobile V3 « outil terrain »
-- Phase 2 product-architect. Date : 2026-05-31.
-- Principe : add-column-only + 1 nouvelle table (migration vibe-coder safe).
-- Stack réelle : Supabase Postgres (PAS le template Next.js générique).
--
-- RAPPEL ARCHITECTURE : 2 mondes d'IDs coexistent dans ce CRM.
--   - CRM core (legacy text PK, format UUID en pratique) : entreprises, contacts, opportunites, activites
--   - Prospection (UUID natif) : prospect_leads, prospect_visits, prospect_photos
-- La V3 réutilise prospect_visits + prospect_photos (déjà en prod, migration
-- 20260430_001) et ajoute contact_suggestions. Aucune table CRM core modifiée.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- MIGRATION V3-001 : extension prospect_visits → compte-rendu de visite
-- -----------------------------------------------------------------------------
-- prospect_visits existait comme pur check-in GPS (lat/lng NOT NULL). La V3 en
-- fait l'entité « compte-rendu terrain » : on y ajoute le résultat + la note,
-- et on rend le GPS optionnel (géoloc refusable → visite enregistrée sans
-- coordonnées). Voir ADR-0002.

ALTER TABLE prospect_visits
  ADD COLUMN IF NOT EXISTS resultat TEXT,
  ADD COLUMN IF NOT EXISTS note     TEXT;

-- Valeurs de résultat fermées (règle UX projet : jamais d'option « Autre »).
-- Liste à valider avec Pascal en début de Phase 3 (placeholder métier ci-dessous).
ALTER TABLE prospect_visits
  ADD CONSTRAINT prospect_visits_resultat_chk
  CHECK (
    resultat IS NULL OR resultat IN (
      'visite_interesse',     -- visité, client intéressé
      'visite_a_relancer',    -- visité, à relancer
      'absent',               -- personne / fermé
      'non_pertinent'         -- hors cible FilmPro
    )
  );

-- Borne longueur note (anti-payload abusif, cohérent avec saisie terrain courte).
ALTER TABLE prospect_visits
  ADD CONSTRAINT prospect_visits_note_len_chk
  CHECK (note IS NULL OR char_length(note) <= 2000);

-- GPS optionnel V3 : la géoloc peut être refusée sur le terrain.
-- Les contraintes de range (lat BETWEEN -90 AND 90, lng BETWEEN -180 AND 180)
-- restent valides car elles ne s'évaluent que sur valeur non NULL.
ALTER TABLE prospect_visits ALTER COLUMN lat DROP NOT NULL;
ALTER TABLE prospect_visits ALTER COLUMN lng DROP NOT NULL;

-- (revue contracts H/M) Ferme les illegal states introduits par le GPS nullable :
-- les deux coordonnées ensemble ou aucune (pas de demi-GPS), et la distance vs
-- Zefix n'a de sens qu'avec un GPS. RAPPEL IMPLÉMENTATION : le POST /api/visits
-- actuel calcule distance_from_zefix_m inconditionnellement -> Phase 3 DOIT
-- mettre distance_from_zefix_m = NULL + skip géocodage quand lat/lng absent.
ALTER TABLE prospect_visits
  ADD CONSTRAINT prospect_visits_latlng_together_chk
  CHECK ((lat IS NULL) = (lng IS NULL));
ALTER TABLE prospect_visits
  ADD CONSTRAINT prospect_visits_distance_requires_gps_chk
  CHECK (distance_from_zefix_m IS NULL OR lat IS NOT NULL);

COMMENT ON COLUMN prospect_visits.resultat IS 'V3 mobile terrain : résultat de visite (valeurs fermées, pas d''« Autre »).';
COMMENT ON COLUMN prospect_visits.note     IS 'V3 mobile terrain : note courte de compte-rendu (≤ 2000 char).';


-- -----------------------------------------------------------------------------
-- MIGRATION V3-002 : contact_suggestions → file de validation « brouillon »
-- -----------------------------------------------------------------------------
-- Un contact croisé sur le terrain crée une SUGGESTION, jamais une ligne
-- `contacts` directe. Le desktop la valide/rejette/fusionne en 1 clic.
-- Isole le risque qualité de données hors du référentiel. Voir ADR-0003.

CREATE TABLE IF NOT EXISTS contact_suggestions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rattachement : TOUJOURS une entreprise (le commercial est sur une fiche).
  -- NOT NULL = invariant métier réel (revue contracts H-2) : pas de suggestion
  -- orpheline. visit_id = lien optionnel à la visite qui a généré la suggestion
  -- (ON DELETE SET NULL : la suggestion appartient à l'entreprise, pas à la
  -- visite ; si la visite est supprimée la suggestion survit - acté ADR-0003).
  entreprise_id     TEXT NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  visit_id          UUID REFERENCES prospect_visits(id)  ON DELETE SET NULL,

  -- Payload contact (tous optionnels, mais au moins un identifiant requis).
  prenom            TEXT,
  nom               TEXT,
  role_fonction     TEXT,
  telephone         TEXT,
  email             TEXT,
  notes             TEXT,

  -- File de validation.
  statut            TEXT NOT NULL DEFAULT 'en_attente'
                    CHECK (statut IN ('en_attente', 'valide', 'rejete')),

  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Résolution desktop.
  resolved_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at       TIMESTAMPTZ,
  merged_contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,

  -- Au moins un identifiant exploitable (anti suggestion vide).
  CONSTRAINT contact_suggestions_has_identifier CHECK (
    prenom IS NOT NULL OR nom IS NOT NULL OR telephone IS NOT NULL OR email IS NOT NULL
  ),

  -- Borne longueur notes.
  CONSTRAINT contact_suggestions_notes_len_chk CHECK (
    notes IS NULL OR char_length(notes) <= 2000
  ),

  -- (revue contracts) Cohérence du cycle de vie de la file de validation :
  -- merged_contact_id seulement si validée ; resolved_at renseigné ssi la
  -- suggestion n'est plus en_attente. Rend la file auto-cohérente.
  CONSTRAINT contact_suggestions_merged_requires_valide CHECK (
    merged_contact_id IS NULL OR statut = 'valide'
  ),
  CONSTRAINT contact_suggestions_resolved_coherence CHECK (
    (statut = 'en_attente') = (resolved_at IS NULL)
  )
);

-- Index partiel sur la file active (badge desktop = COUNT statut='en_attente').
CREATE INDEX IF NOT EXISTS idx_contact_suggestions_pending
  ON contact_suggestions(created_at DESC) WHERE statut = 'en_attente';
CREATE INDEX IF NOT EXISTS idx_contact_suggestions_entreprise
  ON contact_suggestions(entreprise_id);

COMMENT ON TABLE contact_suggestions IS
  'V3 mobile terrain : contact croisé sur place en mode brouillon. Validé/fusionné au desktop. Jamais écrit direct dans contacts.';


-- -----------------------------------------------------------------------------
-- ERD (mermaid) — relations V3
-- -----------------------------------------------------------------------------
-- erDiagram
--     entreprises ||--o{ prospect_visits      : "visité"
--     entreprises ||--o{ prospect_photos      : "photo bâtiment"
--     entreprises ||--o{ contact_suggestions  : "contact terrain proposé"
--     prospect_visits ||--o{ contact_suggestions : "généré pendant"
--     contacts ||--o| contact_suggestions     : "fusionné vers (après validation)"
--     entreprises ||--o{ opportunites          : "relances dues (accueil À faire)"
