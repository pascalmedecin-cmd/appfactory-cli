-- Retrait total pipeline images /veille (S110 2026-04-24).
--
-- Contexte : la cascade og:image → Vision → fal.ai → media_library était une
-- usine à gaz peu qualitative. Décision Pascal : suppression complète.
-- Veille conserve toutes ses autres features (génération hebdo, vérifications,
-- segments, chips, email récap textuel, anti-redondance, cost tracking Claude).
--
-- Ordre d'exécution :
--   1. Strip image_url + generated_image_url des items JSONB historiques
--      (rétro-compat : l'opérateur `-` sur clé absente est no-op, idempotent).
--   2. DROP TABLE media_library CASCADE (drop indexes + dépendances inclus).
--
-- Le bucket Storage media-library est droppé séparément via Supabase Dashboard
-- (Storage est hors-DDL, ne peut être migré via SQL).

-- 1. Strip image_url + generated_image_url des items historiques
UPDATE intelligence_reports
SET items = COALESCE(
  (
    SELECT jsonb_agg(item - 'image_url' - 'generated_image_url')
    FROM jsonb_array_elements(items) AS item
  ),
  '[]'::jsonb
)
WHERE items IS NOT NULL AND jsonb_typeof(items) = 'array';

-- 2. Drop table media_library (45 lignes, 1 contrainte source_check, indexes)
DROP TABLE IF EXISTS media_library CASCADE;
