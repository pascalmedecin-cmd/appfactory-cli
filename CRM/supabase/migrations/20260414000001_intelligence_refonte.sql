-- Refonte /veille (session 57)
-- - Ajout colonne items_hidden (JSONB) : soft-hide d'items individuels après
--   retrait rétroactif (URL morte, recheck-historical). Stocke liste d'objets
--   { rank: int, reason: string, hidden_at: timestamptz }.
-- - archived_at existe déjà (migration 20260413_001_intelligence).
-- - Le fil /veille filtre par défaut archived_at IS NULL et exclut les items
--   listés dans items_hidden.

ALTER TABLE intelligence_reports
  ADD COLUMN items_hidden JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Index partiel pour accelerer le cron archivage (lignes non archivees)
CREATE INDEX IF NOT EXISTS idx_intelligence_active
  ON intelligence_reports(generated_at DESC)
  WHERE archived_at IS NULL;
