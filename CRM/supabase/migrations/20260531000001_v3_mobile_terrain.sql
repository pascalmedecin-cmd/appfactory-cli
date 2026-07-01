-- =============================================================================
-- MIGRATION V3 mobile terrain : extension prospect_visits + contact_suggestions
-- CRM FilmPro. Date : 2026-05-31. Phase 3 product-architect (pack .product-architect/).
--
-- Principe : add-column-only + 1 nouvelle table (rétro-compatible, vibe-coder safe).
-- Idempotente / rejouable : IF NOT EXISTS partout, ADD CONSTRAINT guardé par DO.
-- Source de vérité specs : .product-architect/data-model.sql + rls-policies.sql.
--
-- RLS : décision projet « mono-tenant plat » (3 fondateurs @filmpro.ch symétriques,
-- ADR-0007 / CLAUDE.md L-03/L-04). Aligné sur les tables existantes : RLS ENABLE +
-- policy authenticated_full_access. Aucun GRANT manuel (default ACL postgres grant
-- déjà authenticated=arwdDxtm ; anon bloqué par absence de policy).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. prospect_visits → compte-rendu de visite (resultat + note, GPS optionnel)
-- -----------------------------------------------------------------------------
ALTER TABLE prospect_visits
  ADD COLUMN IF NOT EXISTS resultat TEXT,
  ADD COLUMN IF NOT EXISTS note     TEXT;

-- GPS optionnel V3 : la géoloc peut être refusée sur le terrain (ADR-0002).
-- Les CHECK lat/lng range existants ne s'évaluent que sur valeur non NULL.
ALTER TABLE prospect_visits ALTER COLUMN lat DROP NOT NULL;
ALTER TABLE prospect_visits ALTER COLUMN lng DROP NOT NULL;

DO $$
BEGIN
  -- Résultat fermé (règle UX projet : jamais d'« Autre »).
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prospect_visits_resultat_chk') THEN
    ALTER TABLE prospect_visits ADD CONSTRAINT prospect_visits_resultat_chk
      CHECK (resultat IS NULL OR resultat IN (
        'visite_interesse', 'visite_a_relancer', 'absent', 'non_pertinent'
      ));
  END IF;

  -- Borne longueur note (saisie terrain courte).
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prospect_visits_note_len_chk') THEN
    ALTER TABLE prospect_visits ADD CONSTRAINT prospect_visits_note_len_chk
      CHECK (note IS NULL OR char_length(note) <= 2000);
  END IF;

  -- Pas de demi-GPS : les deux coordonnées ensemble ou aucune.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prospect_visits_latlng_together_chk') THEN
    ALTER TABLE prospect_visits ADD CONSTRAINT prospect_visits_latlng_together_chk
      CHECK ((lat IS NULL) = (lng IS NULL));
  END IF;

  -- La distance vs Zefix n'a de sens qu'avec un GPS.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prospect_visits_distance_requires_gps_chk') THEN
    ALTER TABLE prospect_visits ADD CONSTRAINT prospect_visits_distance_requires_gps_chk
      CHECK (distance_from_zefix_m IS NULL OR lat IS NOT NULL);
  END IF;
END $$;

COMMENT ON COLUMN prospect_visits.resultat IS 'V3 mobile terrain : résultat de visite (valeurs fermées, pas d''« Autre »).';
COMMENT ON COLUMN prospect_visits.note     IS 'V3 mobile terrain : note courte de compte-rendu (<= 2000 char).';


-- -----------------------------------------------------------------------------
-- 2. contact_suggestions → file de validation « brouillon » (ADR-0003)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_suggestions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rattachement : TOUJOURS une entreprise (commercial sur une fiche).
  entreprise_id     TEXT NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  -- Lien optionnel à la visite génératrice ; la suggestion survit à la visite.
  visit_id          UUID REFERENCES prospect_visits(id) ON DELETE SET NULL,

  -- Payload contact (au moins un identifiant requis, cf. CHECK).
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

  CONSTRAINT contact_suggestions_has_identifier CHECK (
    prenom IS NOT NULL OR nom IS NOT NULL OR telephone IS NOT NULL OR email IS NOT NULL
  ),
  CONSTRAINT contact_suggestions_notes_len_chk CHECK (
    notes IS NULL OR char_length(notes) <= 2000
  ),
  -- merged_contact_id seulement si validée.
  CONSTRAINT contact_suggestions_merged_requires_valide CHECK (
    merged_contact_id IS NULL OR statut = 'valide'
  ),
  -- resolved_at renseigné ssi la suggestion n'est plus en_attente.
  CONSTRAINT contact_suggestions_resolved_coherence CHECK (
    (statut = 'en_attente') = (resolved_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_contact_suggestions_pending
  ON contact_suggestions(created_at DESC) WHERE statut = 'en_attente';
CREATE INDEX IF NOT EXISTS idx_contact_suggestions_entreprise
  ON contact_suggestions(entreprise_id);

COMMENT ON TABLE contact_suggestions IS
  'V3 mobile terrain : contact croisé sur place en mode brouillon. Validé/fusionné au desktop. Jamais écrit direct dans contacts.';

-- RLS mono-tenant plat (aligné tables existantes, ADR-0007).
ALTER TABLE contact_suggestions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'contact_suggestions'
      AND policyname = 'authenticated_full_access'
  ) THEN
    CREATE POLICY "authenticated_full_access" ON contact_suggestions
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMENT ON POLICY "authenticated_full_access" ON contact_suggestions IS
  'Mono-tenant plat assumé (3 fondateurs FilmPro). À durcir created_by/role si 4e user non-fondateur — voir ADR-0007.';
