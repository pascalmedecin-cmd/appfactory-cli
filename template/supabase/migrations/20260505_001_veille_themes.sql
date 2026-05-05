-- Migration : externaliser la taxonomie thèmes veille en table éditable.
--
-- Contexte (S168 spec, livrée S169 2026-05-05) : taxonomie thèmes hardcoded
-- dans src/lib/server/intelligence/schema.ts (ThemeEnum Zod) et prompt.ts (liste
-- prose). Impossible d'ajouter un thème sans deploy. Pascal demande extension
-- à 10 thèmes pour vendredi 08/05 (cron auto W19) + page admin pour maintenir.
--
-- Décisions :
-- - id uuid (cohérent avec autres tables intelligence_*).
-- - slug text unique (kebab/snake_case, source de vérité côté code et LLM).
-- - category text check core/adjacent (priorité haute vs signaux faibles).
-- - active bool (désactivation temporaire sans suppression historique).
-- - sort_order int (ordre d'affichage prompt + admin UI).
-- - RLS : public read (cron + page LLM ingestion), service-role-only writes
--   (page admin passe par endpoints SvelteKit qui valident locals.user.role).
--
-- Rétro-compat : si la table est vide en runtime, theme-loader.ts fallback sur
-- l'enum hardcoded actuel via un seed identique. Aucune régression cron.

CREATE TABLE IF NOT EXISTS veille_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('core', 'adjacent')),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS veille_themes_active_sort_idx
  ON veille_themes (active, sort_order)
  WHERE active = true;

ALTER TABLE veille_themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS veille_themes_select_all ON veille_themes;
CREATE POLICY veille_themes_select_all
  ON veille_themes
  FOR SELECT
  USING (true);

-- Aucune policy INSERT / UPDATE / DELETE : seul le service_role bypass RLS.
-- Les endpoints admin SvelteKit utilisent le client service-role après check
-- locals.user.role === 'admin'.

-- Trigger updated_at
CREATE OR REPLACE FUNCTION veille_themes_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS veille_themes_updated_at ON veille_themes;
CREATE TRIGGER veille_themes_updated_at
  BEFORE UPDATE ON veille_themes
  FOR EACH ROW
  EXECUTE FUNCTION veille_themes_set_updated_at();

-- Seed 10 thèmes : 5 cœur métier existants + 3 nouveaux + ia_outils + autre.
-- ON CONFLICT idempotent : ré-exécuter la migration ne casse pas un éventuel
-- override admin (slug match → no-op).

INSERT INTO veille_themes (slug, label, description, category, sort_order)
VALUES
  ('films_solaires', 'Films solaires',
   'Performance énergétique vitrage, contrôle solaire, gestion thermique',
   'core', 10),
  ('films_securite', 'Films sécurité',
   'Protection effraction, anti-bris, retardateur d''effraction, sécurité passive bâtiment',
   'core', 20),
  ('discretion_smartfilm', 'Discrétion / smart film',
   'Films opacifiants, PDLC, smart glass commutable, vie privée bureau',
   'core', 30),
  ('batiment_renovation', 'Bâtiment & rénovation',
   'Rénovation vitrage existant, retrofit, audit thermique, copropriété',
   'core', 40),
  ('reglementation', 'Réglementation',
   'Normes EN 410 / 673, MoPEC, RE 2020, DPE, ERP sécurité incendie, certifications HQE/BREEAM/Minergie/LEED',
   'core', 50),
  ('vitrages_haute_performance', 'Vitrages haute performance',
   'Low-E, triple vitrage, gaz argon, coefficients Ug/Uw, vitrages chauffants',
   'core', 60),
  ('confort_thermique_tertiaire', 'Confort thermique tertiaire',
   'HVAC, BACS, GTB, régulation thermique tertiaire, certifications confort',
   'adjacent', 70),
  ('facades_innovantes', 'Façades innovantes',
   'Mur-rideau, BIPV (vitrages photovoltaïques), façades adaptatives, double-peau',
   'adjacent', 80),
  ('ia_outils', 'IA & outils',
   'IA appliquée audit énergétique, drones thermiques, imagerie infrarouge, modélisation bâtiment, BIM, smart glass connecté',
   'adjacent', 90),
  ('autre', 'Autre',
   'Hors taxonomie principale (signal exploratoire, à reclasser ultérieurement)',
   'adjacent', 999)
ON CONFLICT (slug) DO NOTHING;
