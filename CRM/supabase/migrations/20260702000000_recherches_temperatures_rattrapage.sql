-- Rattrapage de dérive schéma (2026-07-02) : la colonne `recherches_sauvegardees.temperatures`
-- existe en PROD (text[] NULL, sans default ni CHECK - vérifié par introspection prod le
-- 2026-07-02) mais n'avait JAMAIS eu de migration versionnée -> `supabase db reset` local
-- produisait un schéma incomplet et la régénération des types cassait le typecheck
-- (Recherche.temperatures manquant). Les valeurs applicatives (chaud/tiede/froid) sont
-- contraintes par Zod côté endpoints, pas par la base (état prod reproduit à l'identique).
-- Idempotent : no-op en prod (colonne déjà là), répare le local.
ALTER TABLE recherches_sauvegardees ADD COLUMN IF NOT EXISTS temperatures TEXT[];
