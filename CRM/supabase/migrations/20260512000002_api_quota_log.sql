-- Spec « API Google Places comme source de prospection » (notes/google-places-2026-05-12/spec.md, A4).
-- Compteur mensuel d'appels par API externe — source de vérité pour le garde-fou de quota
-- applicatif (refus 429 au-delà du cap) et l'affichage « il reste N recherches ce mois ».
--
-- Résout aussi le [WATCH] S171 (visibilité quota search.ch) : la même table est partagée
-- par search_ch et google_places.
--
-- Écriture : aucune policy INSERT/UPDATE/DELETE. L'incrément passe par la RPC
--   `api_quota_increment` (SECURITY DEFINER, search_path verrouillé, ON CONFLICT atomique) —
--   pas besoin de service role. Lecture : tout utilisateur authentifié (affichage UI).

CREATE TABLE IF NOT EXISTS public.api_quota_log (
  source      text NOT NULL CHECK (source IN ('search_ch', 'google_places')),
  year_month  text NOT NULL CHECK (year_month ~ '^\d{4}-\d{2}$'),
  calls       integer NOT NULL DEFAULT 0 CHECK (calls >= 0),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source, year_month)
);

ALTER TABLE public.api_quota_log ENABLE ROW LEVEL SECURITY;

-- Lecture seule pour les utilisateurs authentifiés (affichage du compteur restant).
DROP POLICY IF EXISTS "api_quota_log read" ON public.api_quota_log;
CREATE POLICY "api_quota_log read" ON public.api_quota_log
  FOR SELECT TO authenticated USING (true);

-- Pas de policy INSERT/UPDATE/DELETE : seul le service role (qui contourne la RLS)
-- écrit dans cette table, depuis le serveur, après un appel API réussi.

COMMENT ON TABLE public.api_quota_log IS
'Spec google-places-2026-05-12 A4 : compteur mensuel d''appels API externes (search_ch, google_places). Écriture via RPC api_quota_increment (SECURITY DEFINER), lecture authenticated.';

-- Incrément atomique du compteur du mois courant (spec § 7 DoD #6 : atomicité).
-- SECURITY DEFINER pour pouvoir écrire malgré l'absence de policy INSERT/UPDATE ;
-- search_path verrouillé. Retourne la nouvelle valeur du compteur.
CREATE OR REPLACE FUNCTION public.api_quota_increment(
  p_source text,
  p_year_month text,
  p_by integer DEFAULT 1
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new integer;
BEGIN
  IF p_source NOT IN ('search_ch', 'google_places') THEN
    RAISE EXCEPTION 'api_quota_increment: source invalide %', p_source USING ERRCODE = '22023';
  END IF;
  IF p_year_month !~ '^\d{4}-\d{2}$' THEN
    RAISE EXCEPTION 'api_quota_increment: year_month invalide %', p_year_month USING ERRCODE = '22023';
  END IF;
  IF p_by IS NULL OR p_by < 1 THEN
    RAISE EXCEPTION 'api_quota_increment: increment invalide %', p_by USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.api_quota_log (source, year_month, calls, updated_at)
  VALUES (p_source, p_year_month, p_by, now())
  ON CONFLICT (source, year_month)
  DO UPDATE SET calls = api_quota_log.calls + EXCLUDED.calls, updated_at = now()
  RETURNING calls INTO v_new;

  RETURN v_new;
END;
$$;

COMMENT ON FUNCTION public.api_quota_increment(text, text, integer) IS
'Spec google-places-2026-05-12 § 7 DoD #6 : incrément atomique du compteur mensuel api_quota_log. SECURITY DEFINER (écriture sans policy), search_path verrouillé.';
