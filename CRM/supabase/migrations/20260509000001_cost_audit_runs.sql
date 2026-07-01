-- Migration : table cost_audit_runs pour persistance coûts API Claude.
--
-- Contexte (S177 2026-05-09) : cost-tracker.ts est un singleton in-memory qui
-- collecte les coûts d'une invocation veille puis les envoie dans l'email-recap.
-- Aucune persistance => pas de dashboard historique possible.
--
-- Décisions :
-- - 1 ligne par run (pas par appel API) : la veille fait ~10 calls/run, table
--   reste lisible. Détail par appel conservé dans `breakdown` JSONB pour drill.
-- - run_id text UNIQUE : clé naturelle (ex 'veille-2026-W19-080524') permet
--   l'idempotence côté tracker (UPSERT si re-run du même run_id).
-- - feature CHECK strict : élargi facilement par ALTER TABLE ... DROP CHECK
--   puis recreate. Aujourd'hui : veille uniquement, signaux/autres prévus.
-- - status CHECK : success / partial (timeout, données incomplètes) / error.
-- - RLS : SELECT pour tout user authentifié (CRM = users @filmpro.ch via OTP),
--   no INSERT/UPDATE/DELETE policies => seul service_role bypass RLS.
--   Aligné pattern veille_themes (S169).

CREATE TABLE IF NOT EXISTS cost_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id text NOT NULL UNIQUE,
  feature text NOT NULL CHECK (feature IN ('veille', 'signaux', 'autre')),
  model text NOT NULL,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'partial', 'error')),
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  duration_seconds integer,
  total_input_tokens integer NOT NULL DEFAULT 0,
  total_output_tokens integer NOT NULL DEFAULT 0,
  total_cache_read_tokens integer NOT NULL DEFAULT 0,
  total_cache_creation_tokens integer NOT NULL DEFAULT 0,
  total_usd numeric(10, 6) NOT NULL DEFAULT 0,
  total_eur numeric(10, 6) NOT NULL DEFAULT 0,
  breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cost_audit_runs_feature_started_idx
  ON cost_audit_runs (feature, started_at DESC);

CREATE INDEX IF NOT EXISTS cost_audit_runs_started_idx
  ON cost_audit_runs (started_at DESC);

ALTER TABLE cost_audit_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cost_audit_runs_select_authenticated ON cost_audit_runs;
CREATE POLICY cost_audit_runs_select_authenticated
  ON cost_audit_runs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Aucune policy INSERT / UPDATE / DELETE : seul le service_role bypass RLS.
-- Le tracker côté backend appelle costTracker.persist(...) via service client.

COMMENT ON TABLE cost_audit_runs IS
  'Persistance coûts API Claude par run (veille + features futures). Source : cost-tracker.ts.';
COMMENT ON COLUMN cost_audit_runs.run_id IS
  'Clé naturelle (ex veille-2026-W19-080524). Permet UPSERT idempotent.';
COMMENT ON COLUMN cost_audit_runs.breakdown IS
  'Array CostEntry du tracker : [{label, model, input_tokens, output_tokens, cache_read, cache_creation, usd, eur}, ...]';
