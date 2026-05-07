-- Phase 1 widget triage matin : colonne pour repousser un lead à plus tard.
-- Si NOT NULL et > now(), le lead est masqué de la queue triage du dashboard.
-- Index partiel pour scaling : seuls les snoozed actifs sont indexés.

ALTER TABLE prospect_leads
  ADD COLUMN IF NOT EXISTS triage_snoozed_until TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_triage_snoozed
  ON prospect_leads(triage_snoozed_until)
  WHERE triage_snoozed_until IS NOT NULL;

COMMENT ON COLUMN prospect_leads.triage_snoozed_until IS
  'Phase 1 triage matin : si NOT NULL et > now(), le lead est masqué de la queue dashboard. Snooze 7 jours par défaut via POST /api/prospection/triage/plus-tard.';
