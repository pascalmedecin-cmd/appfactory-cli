-- ============================================================================
-- data-model.sql - Outil « Découpe Films » (chantier 2 portail FilmPro)
-- Phase 2 specs (2026-06-05). Add-column-only, jamais destructif.
-- Unités : TOUT en millimètres entiers (cf. ADR-0003). L'UI affiche en cm/m.
-- Migration cible : supabase/migrations/2026MMDD_001_decoupe_films.sql (Phase 3).
-- Traçabilité : created_by uuid REFERENCES auth.users(id) (pattern projet, cf.
--   20260531_001_v3_mobile_terrain.sql). RLS mono-tenant plat (cf. rls-policies.sql + ADR-0004).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- (A) BASE PRODUIT - catalogue descriptif (PAS tarifaire). cf. brief §3.
-- ----------------------------------------------------------------------------
CREATE TABLE decoupe_produits (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference           text    NOT NULL,                       -- identifiant interne FilmPro
  nom                 text    NOT NULL,
  famille             text    NOT NULL CHECK (famille IN ('solaire','securite','discretion')),
  fabricant           text,
  fournisseur         text,                                   -- transparence assumée (brief §3)
  laizes_mm           integer[] NOT NULL                      -- 1..n laizes disponibles
                        CHECK (array_length(laizes_mm, 1) >= 1
                               AND array_position(laizes_mm, NULL) IS NULL
                               AND 0 < ALL (laizes_mm)),
  orientation_imposee boolean NOT NULL DEFAULT false,         -- true → rotation interdite au nesting
  jointage_autorise   boolean NOT NULL DEFAULT false,         -- true → pose en lés si vitre > laize
  nestable            boolean NOT NULL DEFAULT true,          -- garde-fou : false = jamais nesté (vernis, e-film)
  marge_pose_mm       integer NOT NULL DEFAULT 0 CHECK (marge_pose_mm >= 0),   -- ajoutée à L et H (brief §4.4)
  recouvrement_mm     integer NOT NULL DEFAULT 0 CHECK (recouvrement_mm >= 0), -- joint entre lés (Q4, défaut 0)
  notes               text,                                   -- champ libre (Q2 : pas d'attribut métier inventé)
  actif               boolean NOT NULL DEFAULT true,          -- soft-delete (préserve l'historique des vitres)
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
-- Référence unique parmi les produits actifs (insensible à la casse).
CREATE UNIQUE INDEX decoupe_produits_reference_unique
  ON decoupe_produits (lower(reference)) WHERE actif;

-- ----------------------------------------------------------------------------
-- (B) CHANTIER - regroupe des vitres. cf. brief §1 étape 1, §4.1.
-- ----------------------------------------------------------------------------
CREATE TABLE decoupe_chantiers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom         text NOT NULL,
  client      text,                                           -- rattachement léger (Q1 : pas de FK référentiel au MVP)
  statut      text NOT NULL DEFAULT 'en_saisie'
                CHECK (statut IN ('en_saisie','lancee')),      -- 'lancee' = découpe lancée → exclue de la conso suggérée (Q3)
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_decoupe_chantiers_statut ON decoupe_chantiers (statut);  -- conso suggérée filtre 'en_saisie'

-- ----------------------------------------------------------------------------
-- (C) VITRE - ligne de saisie (quantité = N pièces identiques). cf. brief §4.2/§4.3.
-- ----------------------------------------------------------------------------
CREATE TABLE decoupe_vitres (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id            uuid NOT NULL REFERENCES decoupe_chantiers(id) ON DELETE CASCADE,
  produit_id             uuid NOT NULL REFERENCES decoupe_produits(id) ON DELETE RESTRICT,
  largeur_mm             integer NOT NULL CHECK (largeur_mm > 0),    -- dimension VITRE (la marge de pose est
  hauteur_mm             integer NOT NULL CHECK (hauteur_mm > 0),    --   ajoutée au calcul, pas stockée ici)
  quantite               integer NOT NULL DEFAULT 1 CHECK (quantite >= 1),
  type_vitrage           text,                                       -- descriptif (information sur la vitre)
  sur_mesure_fournisseur boolean NOT NULL DEFAULT false,             -- LA COCHE (brief §2) : true → hors nesting
  created_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_decoupe_vitres_chantier ON decoupe_vitres (chantier_id);
CREATE INDEX idx_decoupe_vitres_produit  ON decoupe_vitres (produit_id);

-- ----------------------------------------------------------------------------
-- (D) PAS de table « plan de découpe ».
-- ----------------------------------------------------------------------------
-- Le plan est RECALCULÉ à la demande par la fonction pure `optimiserDecoupe`
-- (déterministe à partir des vitres + produits). Rien à persister au MVP (ADR-0002).
-- Le seul état conservé est `decoupe_chantiers.statut` ('lancee' après lancement).
-- Persistance d'un snapshot de plan = ajout possible plus tard (hors-scope no-debt).

-- ERD
-- decoupe_produits ||--o{ decoupe_vitres : "réf produit (RESTRICT)"
-- decoupe_chantiers ||--o{ decoupe_vitres : "contient (CASCADE)"
