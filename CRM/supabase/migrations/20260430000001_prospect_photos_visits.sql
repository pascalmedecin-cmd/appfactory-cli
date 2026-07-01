-- Migration : V2 mobile terrain
-- F1 : prospect_photos (photos bâtiment attachées à un lead OU une entreprise)
-- F2 : prospect_visits (check-in géoloc visite RDV avec écart vs adresse Zefix)
--
-- Convention RLS : "authenticated_full_access" alignée sur tables existantes
-- (prospect_leads, intelligence_reports, lead_signals).
--
-- FK XOR design : prospect_photos relie soit un lead, soit une entreprise,
-- jamais les deux. Évite le pattern polymorphe sans FK (incohérence possible).

-- =============================================================================
-- F1 : prospect_photos
-- =============================================================================

CREATE TABLE prospect_photos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- FK XOR : exactement un des deux remplis
  -- Note : entreprises.id est de type TEXT (legacy, format UUID en pratique)
  prospect_lead_id UUID REFERENCES prospect_leads(id) ON DELETE CASCADE,
  entreprise_id    TEXT REFERENCES entreprises(id) ON DELETE CASCADE,

  storage_path    TEXT NOT NULL,
  caption         TEXT,
  uploaded_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Métadonnées techniques (optionnelles)
  size_bytes      INTEGER,
  mime_type       TEXT,

  -- Contrainte XOR : exactement un FK rempli
  CONSTRAINT prospect_photos_xor CHECK (
    (prospect_lead_id IS NOT NULL)::int + (entreprise_id IS NOT NULL)::int = 1
  ),

  -- Sanity check storage_path : format strict pour bloquer path traversal
  CONSTRAINT prospect_photos_storage_path_format CHECK (
    storage_path ~ '^(leads|entreprises)/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|heic)$'
  ),

  -- Unicité storage_path : empêche les références zombies vers même objet
  CONSTRAINT prospect_photos_storage_path_unique UNIQUE (storage_path)
);

CREATE INDEX idx_prospect_photos_lead       ON prospect_photos(prospect_lead_id) WHERE prospect_lead_id IS NOT NULL;
CREATE INDEX idx_prospect_photos_entreprise ON prospect_photos(entreprise_id) WHERE entreprise_id IS NOT NULL;
CREATE INDEX idx_prospect_photos_uploaded   ON prospect_photos(uploaded_at DESC);

ALTER TABLE prospect_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON prospect_photos
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

COMMENT ON TABLE prospect_photos IS 'V2 mobile F1 : photos bâtiment attachées à un lead OU une entreprise (XOR).';
COMMENT ON CONSTRAINT prospect_photos_xor ON prospect_photos IS 'Exactement un des deux FK doit être rempli.';

-- =============================================================================
-- F2 : prospect_visits
-- =============================================================================

CREATE TABLE prospect_visits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- FK XOR : visite rattachée soit à un lead (avant conversion), soit à une entreprise
  -- Note : entreprises.id est de type TEXT (legacy, format UUID en pratique)
  prospect_lead_id UUID REFERENCES prospect_leads(id) ON DELETE CASCADE,
  entreprise_id    TEXT REFERENCES entreprises(id) ON DELETE CASCADE,

  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visited_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Coordonnées GPS capturées au check-in
  lat             NUMERIC(10, 7) NOT NULL,
  lng             NUMERIC(10, 7) NOT NULL,
  accuracy_m      NUMERIC(8, 1),

  -- Adresse retro-géocodée (snapshot pour audit) + distance vs adresse Zefix
  address_resolved        TEXT,
  distance_from_zefix_m   NUMERIC(8, 1),

  CONSTRAINT prospect_visits_xor CHECK (
    (prospect_lead_id IS NOT NULL)::int + (entreprise_id IS NOT NULL)::int = 1
  ),

  CONSTRAINT prospect_visits_lat_range CHECK (lat BETWEEN -90 AND 90),
  CONSTRAINT prospect_visits_lng_range CHECK (lng BETWEEN -180 AND 180)
);

CREATE INDEX idx_prospect_visits_lead       ON prospect_visits(prospect_lead_id) WHERE prospect_lead_id IS NOT NULL;
CREATE INDEX idx_prospect_visits_entreprise ON prospect_visits(entreprise_id) WHERE entreprise_id IS NOT NULL;
CREATE INDEX idx_prospect_visits_user       ON prospect_visits(user_id);
CREATE INDEX idx_prospect_visits_visited    ON prospect_visits(visited_at DESC);

ALTER TABLE prospect_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON prospect_visits
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

COMMENT ON TABLE prospect_visits IS 'V2 mobile F2 : check-in géoloc visite RDV avec écart vs adresse Zefix.';

-- =============================================================================
-- F1 bis : Storage policies pour bucket "prospect_photos" (Private)
-- =============================================================================
-- ATTENTION : le bucket "prospect_photos" doit être créé MANUELLEMENT
-- via Supabase Dashboard > Storage > New bucket :
--   - name           : prospect_photos
--   - Public bucket  : NON (Private)
--   - File size limit: 10 MB (confort vs limite client 5 MB compressée)
--   - Allowed MIME   : image/jpeg, image/png, image/webp, image/heic
--
-- Les policies ci-dessous donnent l'accès lecture/écriture au bucket Private
-- pour les utilisateurs authentifiés. URLs signées générées côté serveur (1h).

CREATE POLICY "prospect_photos_authenticated_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'prospect_photos');

CREATE POLICY "prospect_photos_authenticated_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'prospect_photos');

CREATE POLICY "prospect_photos_authenticated_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'prospect_photos')
  WITH CHECK (bucket_id = 'prospect_photos');

CREATE POLICY "prospect_photos_authenticated_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'prospect_photos');
