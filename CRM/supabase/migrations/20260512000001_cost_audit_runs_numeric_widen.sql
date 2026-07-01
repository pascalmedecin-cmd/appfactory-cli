-- Migration : élargir total_usd / total_eur de numeric(10,6) à numeric(12,6).
--
-- Contexte (audit 360 V3b L-16) : numeric(10,6) plafonne à 9 999,999999 — un seul
-- run de veille coûte ~quelques EUR, mais l'agrégation côté dashboard et tout run
-- exceptionnel (rattrapage, batch) pourrait théoriquement dépasser 10 000. La colonne
-- déclencherait alors une erreur 22003 (numeric field overflow) à l'INSERT du tracker.
-- numeric(12,6) → plafond 999 999,999999, marge confortable, même scale (6 décimales).
--
-- Sûr : ALTER TYPE vers une précision supérieure ne perd aucune donnée et ne réécrit
-- pas la table (PostgreSQL gère la coercition numeric→numeric sans rewrite).

ALTER TABLE cost_audit_runs
  ALTER COLUMN total_usd TYPE numeric(12, 6),
  ALTER COLUMN total_eur TYPE numeric(12, 6);

COMMENT ON COLUMN cost_audit_runs.total_usd IS 'Coût total du run en USD (numeric(12,6), plafond ~1M — audit 360 V3b L-16).';
COMMENT ON COLUMN cost_audit_runs.total_eur IS 'Coût total du run en EUR (numeric(12,6), plafond ~1M — audit 360 V3b L-16).';
