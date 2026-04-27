-- Migration : Veille → Prospection, table de jointure leads ↔ signaux Veille
-- Permet :
--  - re-scoring continu (un nouveau report Veille met à jour les leads existants)
--  - agrégation cross-signaux (un lead peut accumuler plusieurs bonus)
--  - décroissance dynamique (cron quotidien recalcule selon âge des signaux)
--
-- La colonne prospect_leads.source_intelligence_id existante reste l'origine
-- d'import (tracée pour info). La table ci-dessous gère le cumul de bonus.

CREATE TABLE prospect_lead_signals (
  lead_id              UUID NOT NULL REFERENCES prospect_leads(id) ON DELETE CASCADE,
  report_id            UUID NOT NULL REFERENCES intelligence_reports(id) ON DELETE CASCADE,
  item_rank            INTEGER NOT NULL CHECK (item_rank >= 1 AND item_rank <= 10),

  -- Snapshot des champs signal au moment du match (pour découpler le re-scoring
  -- de la lecture du report : si le report est archivé/modifié, le bonus reste).
  maturity             TEXT NOT NULL CHECK (maturity IN ('emergent', 'etabli', 'speculatif')),
  compliance_tag       TEXT NOT NULL,
  signal_generated_at  TIMESTAMPTZ NOT NULL,

  -- Comment le match a été établi (debug + audit).
  match_kind           TEXT NOT NULL CHECK (match_kind IN ('import', 'rescore')),
  match_term           TEXT,

  applied_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (lead_id, report_id, item_rank)
);

CREATE INDEX idx_lead_signals_lead ON prospect_lead_signals(lead_id);
CREATE INDEX idx_lead_signals_report ON prospect_lead_signals(report_id);
CREATE INDEX idx_lead_signals_generated ON prospect_lead_signals(signal_generated_at DESC);

ALTER TABLE prospect_lead_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON prospect_lead_signals
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
