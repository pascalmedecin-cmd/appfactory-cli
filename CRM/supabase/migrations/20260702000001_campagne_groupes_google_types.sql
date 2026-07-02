-- Groupes de prospects PAR campagne + types Google Places structurés (2026-07-02).
--
-- (1) prospect_leads.google_types TEXT[] : les types Places en colonne structurée (jusqu'ici
--     sérialisés uniquement dans `description`, ré-extraits par parsing - fragile). Backfill
--     des leads google_places existants depuis `description` (même règle d'extraction que
--     googleTypesFromDescription, source unique du format d'import).
-- (2) campagne_groupes : groupes nommés PAR campagne. Borne du nom = 24 caractères, fixée par
--     stress test de rendu de l'étiquette de transition (Outfit Bold 15 pt, 1 ligne, largeur
--     utile Avery 6122 = 175.75 pt, avances réelles mesurées via jsPDF le 2026-07-02).
-- (3) prospect_lead_campagnes.groupe_id : un prospect appartient à AU PLUS UN groupe par
--     campagne (le groupe vit sur le lien N-N, pas sur le lead). FK composite
--     (groupe_id, campagne_id) -> campagne_groupes(id, campagne_id) : un groupe d'une AUTRE
--     campagne est rejeté par la base elle-même (defense in depth, en plus du check serveur).
--     ON DELETE SET NULL (groupe_id) : syntaxe PG15+ (prod = PG17) qui ne nullifie QUE la
--     colonne groupe_id (jamais campagne_id, qui est NOT NULL et membre de la PK).
--
-- Idempotent : IF NOT EXISTS / DROP POLICY IF EXISTS avant CREATE POLICY.

-- 1) Types Google structurés sur le lead.
ALTER TABLE prospect_leads ADD COLUMN IF NOT EXISTS google_types TEXT[];

COMMENT ON COLUMN prospect_leads.google_types IS
  'Types Google Places (ordre API, le 1er = type principal). Rempli à l''import google_places ; backfill 2026-07-02 depuis description.';

-- Backfill : `description` d''import Google = segments joints par « — » ; le segment des types
-- = tokens snake_case joints par « / ». Premier segment dont TOUS les tokens matchent
-- ^[a-z][a-z0-9_]*$ (les segments adresse/mentions contiennent majuscules, virgules ou accents
-- et ne matchent jamais). Ré-exécutable : ne touche que les lignes encore NULL.
UPDATE prospect_leads pl
SET google_types = (
  SELECT string_to_array(u.seg, ' / ')
  FROM unnest(string_to_array(pl.description, ' — ')) WITH ORDINALITY AS u(seg, ord)
  WHERE u.seg ~ '^[a-z][a-z0-9_]*( / [a-z][a-z0-9_]*)*$'
  ORDER BY u.ord
  LIMIT 1
)
WHERE pl.source = 'google_places'
  AND pl.description IS NOT NULL
  AND pl.google_types IS NULL;

-- 2) Groupes de prospects par campagne.
CREATE TABLE IF NOT EXISTS campagne_groupes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campagne_id   UUID NOT NULL REFERENCES campagnes(id) ON DELETE CASCADE,
  -- 24 caractères max : borne stress-testée de l'étiquette de transition (voir en-tête).
  nom           TEXT NOT NULL CHECK (btrim(nom) <> '' AND char_length(nom) <= 24),
  date_creation TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID,
  -- Cible de la FK composite du lien N-N (garantit groupe et lien sur la MÊME campagne).
  CONSTRAINT campagne_groupes_id_campagne_unique UNIQUE (id, campagne_id)
);

-- Unicité insensible à la casse PAR campagne (« Régies » vs « régies »).
CREATE UNIQUE INDEX IF NOT EXISTS idx_campagne_groupes_nom_lower
  ON campagne_groupes (campagne_id, lower(nom));
-- Liste des groupes d'une campagne (panneau + étiquettes + PDF).
CREATE INDEX IF NOT EXISTS idx_campagne_groupes_campagne ON campagne_groupes (campagne_id);

-- 3) Appartenance : au plus un groupe par (lead, campagne), porté par le lien N-N.
ALTER TABLE prospect_lead_campagnes ADD COLUMN IF NOT EXISTS groupe_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'plc_groupe_campagne_fk'
  ) THEN
    ALTER TABLE prospect_lead_campagnes
      ADD CONSTRAINT plc_groupe_campagne_fk
      FOREIGN KEY (groupe_id, campagne_id)
      REFERENCES campagne_groupes (id, campagne_id)
      ON DELETE SET NULL (groupe_id);
  END IF;
END $$;

-- Compteurs par groupe + retrait en masse d'un groupe.
CREATE INDEX IF NOT EXISTS idx_plc_groupe ON prospect_lead_campagnes (groupe_id);

-- 4) RLS : même politique mono-tenant plat que le reste du CRM (3 fondateurs symétriques).
--    À durcir le jour d'un 4e utilisateur non-fondateur (cf. feedback_rls_multitenant_durcissement_si_4_users).
ALTER TABLE campagne_groupes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_full_access" ON campagne_groupes;
CREATE POLICY "authenticated_full_access" ON campagne_groupes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE campagne_groupes IS
  'Groupes de prospects par campagne (2026-07-02). nom borné 24 chars (étiquette de transition). Un prospect = au plus 1 groupe par campagne (prospect_lead_campagnes.groupe_id).';
COMMENT ON COLUMN prospect_lead_campagnes.groupe_id IS
  'Groupe du prospect DANS cette campagne (NULL = sans groupe). FK composite : le groupe appartient forcément à la même campagne.';
