-- =============================================================================
-- MIGRATION Découpe Films : 3 tables de l'outil d'optimisation de découpe
-- (chantier 2 portail FilmPro). Date : 2026-06-05. Phase 3 product-architect
-- (pack .product-architect/decoupe/).
--
-- Principe : create-table-only + index (rétro-compatible, vibe-coder safe).
-- Idempotente / rejouable : CREATE TABLE/INDEX IF NOT EXISTS, policies guardées par DO.
-- Source de vérité specs : .product-architect/decoupe/data-model.sql + rls-policies.sql.
--
-- Unités : TOUT en millimètres entiers (ADR-0003). L'UI affiche en cm/m.
-- RLS : décision projet « mono-tenant plat » (3 fondateurs @filmpro.ch symétriques,
-- ADR-0004 / CLAUDE.md L-03/L-04). Tout authentifié voit/écrit tout. `created_by`
-- = traçabilité, PAS isolation. À durcir si 4e user non-fondateur. Aucun GRANT manuel
-- (default ACL postgres grant déjà authenticated=arwdDxtm ; anon bloqué par TO authenticated).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. decoupe_produits → catalogue descriptif (PAS tarifaire). Brief §3.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS decoupe_produits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference           TEXT    NOT NULL,                       -- identifiant interne FilmPro
  nom                 TEXT    NOT NULL,
  famille             TEXT    NOT NULL CHECK (famille IN ('solaire','securite','discretion')),
  fabricant           TEXT,
  fournisseur         TEXT,                                   -- transparence assumée (brief §3)
  laizes_mm           INTEGER[] NOT NULL                      -- 1..20 laizes disponibles (bornées)
                        CHECK (array_length(laizes_mm, 1) BETWEEN 1 AND 20
                               AND array_position(laizes_mm, NULL) IS NULL
                               AND 0 < ALL (laizes_mm)
                               AND 20000 >= ALL (laizes_mm)),            -- borne haute defense-in-depth (audit sécu 2026-06-05)
  orientation_imposee BOOLEAN NOT NULL DEFAULT false,         -- true → rotation interdite au nesting
  jointage_autorise   BOOLEAN NOT NULL DEFAULT false,         -- true → pose en lés si vitre > laize
  nestable            BOOLEAN NOT NULL DEFAULT true,          -- garde-fou : false = jamais nesté (vernis, e-film)
  marge_pose_mm       INTEGER NOT NULL DEFAULT 0 CHECK (marge_pose_mm BETWEEN 0 AND 50000),   -- ajoutée à L et H (brief §4.4)
  recouvrement_mm     INTEGER NOT NULL DEFAULT 0 CHECK (recouvrement_mm BETWEEN 0 AND 50000), -- joint entre lés (Q4, défaut 0)
  notes               TEXT,                                   -- champ libre (Q2 : pas d'attribut métier inventé)
  actif               BOOLEAN NOT NULL DEFAULT true,          -- soft-delete (préserve l'historique des vitres)
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Référence unique parmi les produits actifs (insensible à la casse).
CREATE UNIQUE INDEX IF NOT EXISTS decoupe_produits_reference_unique
  ON decoupe_produits (lower(reference)) WHERE actif;

COMMENT ON TABLE decoupe_produits IS
  'Découpe Films : catalogue produit descriptif (laizes, nesting, marges). PAS tarifaire (brief §0/§3).';
COMMENT ON COLUMN decoupe_produits.nestable IS
  'Garde-fou : false = jamais nesté quelle que soit la coche vitre (vernis, e-film) - brief §2.';
COMMENT ON COLUMN decoupe_produits.recouvrement_mm IS
  'Joint ajouté à la matière entre lés (Q4). Défaut 0 = partage géométrique pur.';


-- -----------------------------------------------------------------------------
-- 2. decoupe_chantiers → regroupe des vitres. Brief §1 étape 1, §4.1.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS decoupe_chantiers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom         TEXT NOT NULL,
  client      TEXT,                                           -- rattachement léger (Q1 : pas de FK référentiel au MVP)
  statut      TEXT NOT NULL DEFAULT 'en_saisie'
                CHECK (statut IN ('en_saisie','lancee')),     -- 'lancee' = découpe lancée → exclue de la conso suggérée (Q3)
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_decoupe_chantiers_statut
  ON decoupe_chantiers (statut);  -- conso suggérée filtre 'en_saisie'

COMMENT ON TABLE decoupe_chantiers IS
  'Découpe Films : chantier regroupant des vitres. statut lancee = exclu de la consolidation suggérée (Q3).';


-- -----------------------------------------------------------------------------
-- 3. decoupe_vitres → ligne de saisie (quantité = N pièces identiques). Brief §4.2/§4.3.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS decoupe_vitres (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id            UUID NOT NULL REFERENCES decoupe_chantiers(id) ON DELETE CASCADE,
  produit_id             UUID NOT NULL REFERENCES decoupe_produits(id) ON DELETE RESTRICT,
  largeur_mm             INTEGER NOT NULL CHECK (largeur_mm BETWEEN 1 AND 50000),  -- dimension VITRE (la marge de pose est
  hauteur_mm             INTEGER NOT NULL CHECK (hauteur_mm BETWEEN 1 AND 50000),  --   ajoutée au calcul, pas stockée ici)
  quantite               INTEGER NOT NULL DEFAULT 1 CHECK (quantite BETWEEN 1 AND 10000), -- bornes defense-in-depth (audit sécu 2026-06-05)
  type_vitrage           TEXT,                                       -- descriptif (information sur la vitre)
  sur_mesure_fournisseur BOOLEAN NOT NULL DEFAULT false,             -- LA COCHE (brief §2) : true → hors nesting
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_decoupe_vitres_chantier ON decoupe_vitres (chantier_id);
CREATE INDEX IF NOT EXISTS idx_decoupe_vitres_produit  ON decoupe_vitres (produit_id);

COMMENT ON TABLE decoupe_vitres IS
  'Découpe Films : vitre saisie (1 ligne = quantite pièces identiques). sur_mesure_fournisseur = la coche hors nesting (brief §2).';


-- -----------------------------------------------------------------------------
-- 4. RLS mono-tenant plat (3 fondateurs @filmpro.ch symétriques, ADR-0004).
--    ⚠️ Tests Vitest mockent supabase-js → ne prouvent RIEN sur la RLS réelle.
--    Couverture = tests pgTAP intégration vraie DB (AC-018 Phase 4), ≥ 1 refus
--    non-authentifié par table. cf. CRM CLAUDE.md § RISQUES OUVERTS (M-48).
-- -----------------------------------------------------------------------------
ALTER TABLE decoupe_produits  ENABLE ROW LEVEL SECURITY;
ALTER TABLE decoupe_chantiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE decoupe_vitres    ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'decoupe_produits' AND policyname = 'decoupe_produits_all'
  ) THEN
    CREATE POLICY decoupe_produits_all ON decoupe_produits
      FOR ALL TO authenticated
      USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'decoupe_chantiers' AND policyname = 'decoupe_chantiers_all'
  ) THEN
    CREATE POLICY decoupe_chantiers_all ON decoupe_chantiers
      FOR ALL TO authenticated
      USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'decoupe_vitres' AND policyname = 'decoupe_vitres_all'
  ) THEN
    CREATE POLICY decoupe_vitres_all ON decoupe_vitres
      FOR ALL TO authenticated
      USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

COMMENT ON POLICY decoupe_produits_all ON decoupe_produits IS
  'Mono-tenant plat assumé (3 fondateurs FilmPro). À durcir created_by/rôle si 4e user non-fondateur — ADR-0004.';
