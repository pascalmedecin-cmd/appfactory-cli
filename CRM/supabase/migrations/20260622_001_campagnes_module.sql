-- Vague 3.2 - Module Campagnes : étiquetage MULTIPLE des prospects (relation N-N).
-- Une entreprise (prospect_lead) peut porter plusieurs campagnes en parallèle.
-- À APPLIQUER en prod via pg lib (scripts/apply-campagnes-migration.mjs, DATABASE_URL_ADMIN) :
-- NON encore exécutée au 2026-06-22 (différée, à faire avec Pascal). MCP Supabase read-only -> voie pg.
-- Le fichier reste la trace versionnée.
-- Idempotent : CREATE TABLE/INDEX IF NOT EXISTS, DROP POLICY IF EXISTS avant CREATE POLICY.

-- 1) Table des campagnes (entités nommées, couleur, archivables).
CREATE TABLE IF NOT EXISTS campagnes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom            TEXT NOT NULL,
  -- Couleur = slug de la palette FilmPro (c1..c8), mappé en CSS côté UI. Défaut c1 (enrich/violet).
  couleur        TEXT NOT NULL DEFAULT 'c1' CHECK (couleur IN ('c1','c2','c3','c4','c5','c6','c7','c8')),
  description    TEXT,
  archived       BOOLEAN NOT NULL DEFAULT false,
  date_creation  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by     UUID
);

-- Unicité insensible à la casse sur le nom : empêche les quasi-doublons (« Régies » vs « régies »).
CREATE UNIQUE INDEX IF NOT EXISTS idx_campagnes_nom_lower ON campagnes (lower(nom));
-- Liste de l'écran dédié (actives/archivées, triées par création).
CREATE INDEX IF NOT EXISTS idx_campagnes_archived ON campagnes (archived, date_creation DESC);

-- 2) Table de liens N-N prospect_lead <-> campagne.
CREATE TABLE IF NOT EXISTS prospect_lead_campagnes (
  lead_id          UUID NOT NULL REFERENCES prospect_leads(id) ON DELETE CASCADE,
  campagne_id      UUID NOT NULL REFERENCES campagnes(id) ON DELETE CASCADE,
  date_assignation TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (lead_id, campagne_id)
);

-- Recherche inverse « les leads d'une campagne » + compteurs (la PK couvre déjà lead_id en tête).
CREATE INDEX IF NOT EXISTS idx_plc_campagne ON prospect_lead_campagnes (campagne_id);

-- 3) RLS : même politique mono-tenant plat que le reste du CRM (3 fondateurs symétriques).
--    À durcir le jour d'un 4e utilisateur non-fondateur (cf. feedback_rls_multitenant_durcissement_si_4_users).
ALTER TABLE campagnes ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_lead_campagnes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_full_access" ON campagnes;
CREATE POLICY "authenticated_full_access" ON campagnes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_full_access" ON prospect_lead_campagnes;
CREATE POLICY "authenticated_full_access" ON prospect_lead_campagnes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE campagnes IS 'Vague 3.2 : campagnes de prospection (etiquettes multiples). couleur = slug palette c1..c8.';
COMMENT ON TABLE prospect_lead_campagnes IS 'Vague 3.2 : liens N-N prospect_lead <-> campagne (etiquetage multiple, cumulatif).';
