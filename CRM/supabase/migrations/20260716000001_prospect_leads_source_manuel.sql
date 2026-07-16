-- Run 3 Atelier 209 (dette D4) : réintroduit la valeur de source 'manuel' pour l'import de liste.
--
-- Contexte : 'manuel' existait à l'origine (20260403000001:8) puis a été RETIRÉ par
-- 20260411000001 (avec 'lindas'). La dernière migration qui définit le CHECK est
-- 20260512000003 (9 valeurs, sans 'manuel'). L'import de liste (exposants de salon, marque LED)
-- crée des leads sans source_id d'API : il lui faut la valeur de source 'manuel'.
--
-- ÉLARGISSEMENT PUR : on ajoute une valeur permise. Aucune ligne existante ne devient invalide
-- (elles utilisent toutes une des 9 valeurs conservées) → pas d'UPDATE de données requis.
-- Reprend la liste EXACTE de 20260512000003 + 'manuel'.

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
    'google_places'::text,
    'manuel'::text
  ]));
