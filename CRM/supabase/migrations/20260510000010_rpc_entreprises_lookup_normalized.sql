-- Audit 360 V2b bug-hunter F5 : helper getOrCreateEntreprise utilise un
-- prefix ILIKE sur la raison sociale BRUTE, alors que l'index UNIQUE partial
-- V1 (`entreprises_raison_sociale_normalized_unique`) est sur
-- `lower(immutable_unaccent(raison_sociale))`. Conséquence : "École Suisse SA"
-- en DB + saisie "ecole suisse" → ILIKE 'ecol%' matche pas (à cause de l'accent
-- 'É'). Le helper retourne null, INSERT déclenche 23505 silencieux, fallback
-- re-lookup avec même prefix → toujours 0 résultat → erreur silencieuse côté
-- create contact.
--
-- Fix : RPC plpgsql qui exécute la recherche directement sur la version
-- normalisée. Utilise l'index UNIQUE existant (lookup O(log N)).

CREATE OR REPLACE FUNCTION public.entreprises_lookup_by_name(p_query text)
RETURNS TABLE (
    id text,
    raison_sociale text
)
LANGUAGE sql
STABLE
AS $$
    SELECT id, raison_sociale
    FROM public.entreprises
    WHERE statut_archive = false
      AND lower(immutable_unaccent(raison_sociale)) LIKE
          lower(immutable_unaccent(p_query)) || '%'
    LIMIT 50;
$$;

COMMENT ON FUNCTION public.entreprises_lookup_by_name(text) IS
'Audit 360 V2b bug-hunter F5 : recherche entreprises par préfixe normalisé (lower + unaccent), aligné sur UNIQUE INDEX partial V1. Retourne max 50 candidats.';
