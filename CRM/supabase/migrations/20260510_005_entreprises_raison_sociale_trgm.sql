-- Audit 360 V2b - H-06 : index trigram sur entreprises.raison_sociale
--
-- Contexte : `getOrCreateEntreprise` (CRM contacts) faisait
-- `SELECT * FROM entreprises LIMIT 1000` puis filtrait JS via
-- `normalizeCompanyName`. Coût payload + latence dépassent 100 ms dès
-- ~500 lignes. Refonte V2b : `.ilike('raison_sociale', q || '%').limit(50)`
-- bounded prefix-match, accélérée par index GIN trigram (pg_trgm).
--
-- Coût : index GIN ~80 KB pour 100 lignes. Insertions : surcoût maintenance
-- index sur INSERT/UPDATE/DELETE négligeable à l'échelle FilmPro
-- (~10 entreprises/jour max).
--
-- Pré-condition : extension pg_trgm dispo Supabase (déjà installée par
-- défaut sur projets Postgres 14+). `IF NOT EXISTS` rend le statement
-- idempotent.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS entreprises_raison_sociale_trgm
ON public.entreprises USING gin (raison_sociale gin_trgm_ops);
