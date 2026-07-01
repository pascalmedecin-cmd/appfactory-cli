-- Audit 360 finding C-05 (bug-hunter) : race condition auto-création entreprise.
-- Pattern check-then-insert dans contacts/+page.server.ts (2 endroits) crée des
-- doublons sous concurrence (Pascal terrain mobile + main app simultanés).
--
-- Fix structurel : index UNIQUE partial sur raison sociale normalisée
-- (lower + unaccent), limité aux entreprises non archivées pour permettre
-- la conservation d'éventuels doublons historiques archivés.
--
-- Pré-migration : audit doublons potentiels via
--   SELECT lower(unaccent(raison_sociale)) AS norm, count(*) AS n
--   FROM entreprises WHERE statut_archive = false
--   GROUP BY 1 HAVING count(*) > 1;
-- Si présents, fusionner manuellement (garder la plus ancienne, déplacer les
-- contacts liés via UPDATE entreprise_id, archiver les autres) avant ALTER.

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Wrapper IMMUTABLE : public.unaccent() est marquée STABLE car elle dépend
-- du dictionnaire (qui pourrait théoriquement changer). En pratique le
-- dictionnaire unaccent est figé, donc le wrapper IMMUTABLE est correct et
-- nécessaire pour utiliser unaccent dans une expression d'index.
-- Pattern documenté Postgres wiki + recommandé pour cette extension.
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text
LANGUAGE SQL
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$ SELECT public.unaccent($1); $$;

CREATE UNIQUE INDEX IF NOT EXISTS entreprises_raison_sociale_normalized_unique
  ON entreprises (lower(immutable_unaccent(raison_sociale)))
  WHERE statut_archive = false;

COMMENT ON INDEX entreprises_raison_sociale_normalized_unique IS
  'Anti race-condition auto-création entreprise (audit 360 C-05). Garantit unicité de la raison sociale normalisée (lower+unaccent) parmi les entreprises actives.';
