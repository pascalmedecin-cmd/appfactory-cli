-- Audit 360 finding C-07 (contracts-reviewer) : drift Zod ↔ DB CHECK sur source.
-- Zod LeadCreateSchema/LeadExpressCreateSchema accepte 'lead_express' mais le
-- CHECK constraint DB le refusait → F3 V2 mobile saisie rapide cassée silencieusement
-- (CHECK violation 23514 retournée comme erreur générique côté UI).
--
-- Fix : étendre le CHECK pour autoriser 'lead_express' (saisie terrain mobile).
-- Les autres valeurs DB-only (sitg, fosc, minergie) sont conservées pour compat
-- future (sources cantonales potentielles) même si Zod ne les expose pas en UI.
--
-- Pré-migration : aucune donnée 'lead_express' en prod (vérifié 2026-05-10
-- via SELECT source, count(*) FROM prospect_leads — sources actuelles : simap 81,
-- regbl 50, zefix 9, search_ch 5).

ALTER TABLE prospect_leads
  DROP CONSTRAINT IF EXISTS prospect_leads_source_check;

ALTER TABLE prospect_leads
  ADD CONSTRAINT prospect_leads_source_check
  CHECK (source = ANY (ARRAY[
    'zefix'::text,
    'simap'::text,
    'sitg'::text,
    'search_ch'::text,
    'fosc'::text,
    'regbl'::text,
    'minergie'::text,
    'lead_express'::text
  ]));
