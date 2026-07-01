-- Bibliothèque photo FilmPro (Bloc 6bis, session 66)
-- - Table media_library : métadonnées queryables (dimensions, source, tags, segment, usage)
-- - Storage bucket "media-library" : binaires (Supabase CDN natif)
-- - Pattern : seed local + enrichissement hebdo Pexels/Unsplash, dedup par content_hash

CREATE TABLE media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Storage
  storage_path TEXT NOT NULL UNIQUE, -- ex: filmpro/seed/a1b2c3.jpg
  content_hash TEXT NOT NULL UNIQUE, -- sha256 du binaire, dedup absolue

  -- Source
  source TEXT NOT NULL CHECK (source IN ('seed', 'pexels', 'unsplash')),
  source_id TEXT, -- id externe Pexels/Unsplash (null pour seed)
  source_url TEXT, -- URL originale (null pour seed)
  credit TEXT, -- ex: "Photo by John Doe on Pexels"
  license TEXT, -- ex: "Pexels License", "Unsplash License", "FilmPro proprietary"

  -- Dimensions et format
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  format TEXT NOT NULL, -- jpeg, png, webp
  file_size_kb INTEGER NOT NULL CHECK (file_size_kb > 0),
  aspect_ratio NUMERIC GENERATED ALWAYS AS (width::numeric / height::numeric) STORED,
  orientation TEXT GENERATED ALWAYS AS (
    CASE
      WHEN width > height THEN 'landscape'
      WHEN width < height THEN 'portrait'
      ELSE 'square'
    END
  ) STORED,

  -- Catégorisation
  description TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  segment TEXT, -- segment FilmPro (securite, confort-thermique, discretion, esthetique, etc.)
  dominant_color TEXT, -- hex #RRGGBB (optionnel, calcul futur)

  -- Qualité (scoring Bloc 6bis)
  quality_score INTEGER CHECK (quality_score BETWEEN 0 AND 10), -- 0-10, heuristique dimensions+format
  is_placeholder BOOLEAN NOT NULL DEFAULT FALSE, -- true si détecté favicon/logo/placeholder

  -- Usage tracking
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  use_count INTEGER NOT NULL DEFAULT 0,

  -- Admin
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- Index pour recherche rapide
CREATE INDEX idx_media_library_source ON media_library(source);
CREATE INDEX idx_media_library_segment ON media_library(segment) WHERE segment IS NOT NULL;
CREATE INDEX idx_media_library_tags_gin ON media_library USING GIN(tags);
CREATE INDEX idx_media_library_dimensions ON media_library(width, height);
CREATE INDEX idx_media_library_orientation ON media_library(orientation);
CREATE INDEX idx_media_library_quality ON media_library(quality_score DESC) WHERE quality_score IS NOT NULL;

-- RLS : lecture authenticated (CRM privé), mutation service_role uniquement
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_library_read_authenticated"
  ON media_library FOR SELECT
  TO authenticated
  USING (TRUE);

-- Pas de policy INSERT/UPDATE/DELETE pour authenticated : uniquement via service_role (scripts seed + cron)

-- Bucket storage (créé via API ou Studio, pas en SQL direct)
-- Instructions manuelles ci-dessous si pas exécuté via script :
--   INSERT INTO storage.buckets (id, name, public) VALUES ('media-library', 'media-library', TRUE);
--   CREATE POLICY "media-library read public" ON storage.objects FOR SELECT USING (bucket_id = 'media-library');
