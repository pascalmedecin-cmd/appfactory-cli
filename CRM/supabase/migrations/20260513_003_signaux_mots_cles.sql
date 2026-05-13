-- Spec : notes/refonte-signaux-2026-05-13/spec.md
-- Module : table de mots-clés pilotant le scoring v2 des signaux (Cœur / Bonus / À éviter).
-- Métier : pertinence FilmPro (traitements vitrage), voir memory/project_filmpro_metier.md.

CREATE TABLE IF NOT EXISTS public.signaux_mots_cles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  terme           text NOT NULL CHECK (char_length(terme) BETWEEN 2 AND 50),
  -- terme_norm = NFD strip + lowercase, calculé côté TS (normalizeNFD).
  -- Sert au matching déterministe + à l'unicité insensible à casse/accents.
  terme_norm      text NOT NULL CHECK (char_length(terme_norm) BETWEEN 2 AND 50),
  categorie       text NOT NULL CHECK (categorie IN ('coeur', 'bonus', 'eviter')),
  -- Poids signé : par défaut +5 / +2 / -3 (V1 figés par catégorie, voir spec § 3).
  poids           integer NOT NULL CHECK (poids BETWEEN -10 AND 10),
  cree_par        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cree_par_email  text NOT NULL,
  cree_le         timestamptz NOT NULL DEFAULT now(),
  mis_a_jour_le   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (terme_norm)
);

CREATE INDEX IF NOT EXISTS signaux_mots_cles_categorie_idx ON public.signaux_mots_cles(categorie);
CREATE INDEX IF NOT EXISTS signaux_mots_cles_terme_norm_idx ON public.signaux_mots_cles(terme_norm);
CREATE INDEX IF NOT EXISTS signaux_mots_cles_cree_le_idx ON public.signaux_mots_cles(cree_le DESC);

ALTER TABLE public.signaux_mots_cles ENABLE ROW LEVEL SECURITY;

-- SELECT : tous les authentifiés (cohérent doctrine mono-tenant FilmPro).
DROP POLICY IF EXISTS "signaux_mots_cles_select_all" ON public.signaux_mots_cles;
CREATE POLICY "signaux_mots_cles_select_all" ON public.signaux_mots_cles
  FOR SELECT TO authenticated USING (true);

-- INSERT / UPDATE / DELETE : admins @filmpro.ch uniquement.
-- Comparaison `lower()` côté SQL pour aligner sur isAdminEmail() côté TS qui toLowerCase.
DROP POLICY IF EXISTS "signaux_mots_cles_admin_insert" ON public.signaux_mots_cles;
CREATE POLICY "signaux_mots_cles_admin_insert" ON public.signaux_mots_cles
  FOR INSERT TO authenticated
  WITH CHECK (lower(auth.jwt() ->> 'email') LIKE '%@filmpro.ch');

DROP POLICY IF EXISTS "signaux_mots_cles_admin_update" ON public.signaux_mots_cles;
CREATE POLICY "signaux_mots_cles_admin_update" ON public.signaux_mots_cles
  FOR UPDATE TO authenticated
  USING (lower(auth.jwt() ->> 'email') LIKE '%@filmpro.ch')
  WITH CHECK (lower(auth.jwt() ->> 'email') LIKE '%@filmpro.ch');

DROP POLICY IF EXISTS "signaux_mots_cles_admin_delete" ON public.signaux_mots_cles;
CREATE POLICY "signaux_mots_cles_admin_delete" ON public.signaux_mots_cles
  FOR DELETE TO authenticated
  USING (lower(auth.jwt() ->> 'email') LIKE '%@filmpro.ch');

-- Trigger mis_a_jour_le (pattern aligné feedback_entries / veille_themes : fonction nominative).
CREATE OR REPLACE FUNCTION public.signaux_mots_cles_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.mis_a_jour_le := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_signaux_mots_cles_set_updated_at ON public.signaux_mots_cles;
CREATE TRIGGER trg_signaux_mots_cles_set_updated_at
  BEFORE UPDATE ON public.signaux_mots_cles
  FOR EACH ROW EXECUTE FUNCTION public.signaux_mots_cles_set_updated_at();

-- Seed initial : 39 mots-clés FilmPro (15 Cœur / 13 Bonus / 11 Éviter).
-- terme_norm pré-calculé (NFD strip + lowercase) pour cohérence runtime.
-- Justifications (Brief / Métier / Pascal) dans spec § 6.
INSERT INTO public.signaux_mots_cles (terme, terme_norm, categorie, poids, cree_par_email) VALUES
  -- Cœur métier (+5)
  ('vitrage',               'vitrage',               'coeur',  5, 'seed@filmpro.ch'),
  ('film',                  'film',                  'coeur',  5, 'seed@filmpro.ch'),
  ('vernis vitre',          'vernis vitre',          'coeur',  5, 'seed@filmpro.ch'),
  ('vernis vitrage',        'vernis vitrage',        'coeur',  5, 'seed@filmpro.ch'),
  ('contrôle solaire',      'controle solaire',      'coeur',  5, 'seed@filmpro.ch'),
  ('anti-UV',               'anti-uv',               'coeur',  5, 'seed@filmpro.ch'),
  ('anti-effraction',       'anti-effraction',       'coeur',  5, 'seed@filmpro.ch'),
  ('bris de glace',         'bris de glace',         'coeur',  5, 'seed@filmpro.ch'),
  ('anti-éblouissement',    'anti-eblouissement',    'coeur',  5, 'seed@filmpro.ch'),
  ('miroiterie',            'miroiterie',            'coeur',  5, 'seed@filmpro.ch'),
  ('vitrerie',              'vitrerie',              'coeur',  5, 'seed@filmpro.ch'),
  ('store solaire',         'store solaire',         'coeur',  5, 'seed@filmpro.ch'),
  ('façade vitrée',         'facade vitree',         'coeur',  5, 'seed@filmpro.ch'),
  ('baie vitrée',           'baie vitree',           'coeur',  5, 'seed@filmpro.ch'),
  ('véranda',               'veranda',               'coeur',  5, 'seed@filmpro.ch'),
  -- Bonus (+2)
  ('régie',                 'regie',                 'bonus',  2, 'seed@filmpro.ch'),
  ('architecte',            'architecte',            'bonus',  2, 'seed@filmpro.ch'),
  ('architecture',          'architecture',          'bonus',  2, 'seed@filmpro.ch'),
  ('facility manager',      'facility manager',      'bonus',  2, 'seed@filmpro.ch'),
  ('facility',              'facility',              'bonus',  2, 'seed@filmpro.ch'),
  ('bureau d''études',      'bureau d''etudes',      'bonus',  2, 'seed@filmpro.ch'),
  ('bureau technique',      'bureau technique',      'bonus',  2, 'seed@filmpro.ch'),
  ('ingénieur',             'ingenieur',             'bonus',  2, 'seed@filmpro.ch'),
  ('rénovation',            'renovation',            'bonus',  2, 'seed@filmpro.ch'),
  ('réhabilitation',        'rehabilitation',        'bonus',  2, 'seed@filmpro.ch'),
  ('transformation',        'transformation',        'bonus',  2, 'seed@filmpro.ch'),
  ('fenêtre',               'fenetre',               'bonus',  2, 'seed@filmpro.ch'),
  ('menuiserie extérieure', 'menuiserie exterieure', 'bonus',  2, 'seed@filmpro.ch'),
  -- À éviter (-3)
  ('route',                 'route',                 'eviter', -3, 'seed@filmpro.ch'),
  ('chaussée',              'chaussee',              'eviter', -3, 'seed@filmpro.ch'),
  ('asphalte',              'asphalte',              'eviter', -3, 'seed@filmpro.ch'),
  ('voirie',                'voirie',                'eviter', -3, 'seed@filmpro.ch'),
  ('canalisation',          'canalisation',          'eviter', -3, 'seed@filmpro.ch'),
  ('conduite',              'conduite',              'eviter', -3, 'seed@filmpro.ch'),
  ('pont',                  'pont',                  'eviter', -3, 'seed@filmpro.ch'),
  ('tunnel',                'tunnel',                'eviter', -3, 'seed@filmpro.ch'),
  ('terrassement',          'terrassement',          'eviter', -3, 'seed@filmpro.ch'),
  ('pavage',                'pavage',                'eviter', -3, 'seed@filmpro.ch'),
  ('revêtement bitumineux', 'revetement bitumineux', 'eviter', -3, 'seed@filmpro.ch')
ON CONFLICT (terme_norm) DO NOTHING;

COMMENT ON TABLE public.signaux_mots_cles IS
  'Mots-clés FilmPro pilotant le scoring v2 des signaux. Cœur=+5, Bonus=+2, Éviter=-3. Édité via /signaux par admins @filmpro.ch.';
