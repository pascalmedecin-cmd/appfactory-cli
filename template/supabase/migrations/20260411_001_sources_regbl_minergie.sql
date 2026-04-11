-- Migration : retrait sources manuel/lindas, ajout regbl/minergie

-- Modifier la contrainte CHECK sur prospect_leads.source
ALTER TABLE prospect_leads DROP CONSTRAINT IF EXISTS prospect_leads_source_check;
ALTER TABLE prospect_leads ADD CONSTRAINT prospect_leads_source_check
  CHECK (source IN ('zefix', 'simap', 'sitg', 'search_ch', 'fosc', 'regbl', 'minergie'));

-- Retirer le canton 'Autre' (règle UX : pas d'option Autre)
ALTER TABLE prospect_leads DROP CONSTRAINT IF EXISTS prospect_leads_canton_check;
ALTER TABLE prospect_leads ADD CONSTRAINT prospect_leads_canton_check
  CHECK (canton IN ('GE', 'VD', 'VS', 'NE', 'FR', 'JU'));
