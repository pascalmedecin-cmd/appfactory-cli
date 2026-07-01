-- Bloc 6ter — Étend media_library avec source='fal-ai' (générations Recraft V3
-- au pipeline cron intelligence pour items dont l'og:image n'est pas fiable
-- et le fallback lib pas pertinent). Coût ~0.04 USD/image.

ALTER TABLE media_library DROP CONSTRAINT IF EXISTS media_library_source_check;
ALTER TABLE media_library
  ADD CONSTRAINT media_library_source_check
  CHECK (source IN ('seed', 'pexels', 'unsplash', 'fal-ai'));
