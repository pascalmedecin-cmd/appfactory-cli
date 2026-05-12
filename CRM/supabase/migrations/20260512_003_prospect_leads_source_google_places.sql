-- Spec « API Google Places comme source de prospection » (notes/google-places-2026-05-12/spec.md, A1).
-- Ajoute 'google_places' à la check constraint prospect_leads_source_check.
-- Reprend la liste exacte de la migration 20260510_002 + 'google_places'.
--
-- Pré-migration : aucune donnée 'google_places' en prod (source nouvelle).

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
    'lead_express'::text,
    'google_places'::text
  ]));
