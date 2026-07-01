-- V5 recentrage Signaux & Prospection (2026-06-07)
-- Appliquée en prod le 2026-06-07 via pg lib (DATABASE_URL_ADMIN) — MCP Supabase read-only.
-- Ce fichier trace le changement pour re-provisioning / autres environnements. Idempotent.
-- Spec : CRM/docs/SPEC_V5_SIGNAUX_PROSPECTION_2026-06-07.md

-- 1) Autoriser le statut 'archive' (soft-archive réversible des signaux hors-scope).
ALTER TABLE signaux_affaires DROP CONSTRAINT IF EXISTS signaux_affaires_statut_traitement_check;
ALTER TABLE signaux_affaires ADD CONSTRAINT signaux_affaires_statut_traitement_check
  CHECK ((statut_traitement IS NULL) OR (statut_traitement = ANY (ARRAY[
    'nouveau', 'en_analyse', 'interesse', 'ecarte', 'converti', 'archive'
  ])));

-- 2) Soft-archive des créations Zefix (radar recentré sur SIMAP). Réversible : archive -> nouveau.
--    Aucun DELETE. Restaurables, consultables via ?vue=archivees.
UPDATE signaux_affaires SET statut_traitement = 'archive'
WHERE source_officielle = 'zefix' AND statut_traitement = 'nouveau';

-- 3) Re-notation V5 des SIMAP actifs : retrait du booster +2 simap (constant, ne discriminait plus)
--    et nettoyage de la note correspondante. Idempotent grâce au filtre LIKE (après run, le motif
--    a disparu -> 0 ligne). Score = valeur dérivée, recalculable.
UPDATE signaux_affaires
SET score_pertinence = score_pertinence - 2,
    notes_libres = NULLIF(regexp_replace(notes_libres, ',?\s*Signal SIMAP \(\+2\)', '', 'g'), '')
WHERE source_officielle = 'simap'
  AND statut_traitement IN ('nouveau', 'en_analyse')
  AND notes_libres LIKE '%Signal SIMAP (+2)%';
