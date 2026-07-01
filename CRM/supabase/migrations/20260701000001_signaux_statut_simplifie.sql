-- Signaux : modèle de statut simplifié (2026-07-01).
--
-- Avant : nouveau / en_analyse / interesse / ecarte / converti / archive.
-- Après : nouveau (à trier) / a_suivre / archive.
--
-- Le tri d'un signal se fait désormais via le bouton « Statut » du slide-out
-- (À suivre / Archivé). La conversion signal -> opportunité est supprimée
-- (le pipeline part des prospects, pas des signaux ; l'ancien bouton « Créer
-- opportunité » plantait à 100 % sur une violation de FK circulaire).
--
-- Répartition prod au 2026-07-01 (source : count read-only) :
--   nouveau=418, ecarte=14, archive=1227 ; aucun en_analyse / interesse / converti.

-- 1. Retirer d'ABORD l'ancien CHECK : sans ça, les UPDATE vers 'a_suivre'
--    (valeur absente de l'ancienne liste) seraient rejetés par la contrainte.
ALTER TABLE signaux_affaires DROP CONSTRAINT IF EXISTS signaux_affaires_statut_traitement_check;

-- 2. Migration des données existantes vers le nouveau modèle.
--    interesse / en_analyse (on s'y intéressait / en cours d'examen) -> à suivre.
--    ecarte / converti (rangés / hors file)                          -> archivé.
UPDATE signaux_affaires SET statut_traitement = 'a_suivre'
  WHERE statut_traitement IN ('interesse', 'en_analyse');
UPDATE signaux_affaires SET statut_traitement = 'archive'
  WHERE statut_traitement IN ('ecarte', 'converti');

-- 3. Poser la nouvelle contrainte CHECK stricte (remplace celle de 20260607_001).
ALTER TABLE signaux_affaires ADD CONSTRAINT signaux_affaires_statut_traitement_check
  CHECK (statut_traitement IS NULL OR statut_traitement IN ('nouveau', 'a_suivre', 'archive'));

-- Note : la colonne dormante `opportunite_associee_id` et la FK circulaire
-- `fk_signaux_opportunite` restent en place (toujours NULL, plus jamais écrites).
-- Elles sont inoffensives ; leur retrait (avec régénération des types TS) est
-- laissé à un nettoyage ultérieur pour ne pas élargir ce lot.
