-- Confirmation finale de la validation externe (2026-07-03).
--
-- Besoin métier (Pascal 03/07) : la personne externe termine sa vérification par un geste
-- explicite « Envoyer la validation » ; le CRM affiche alors « Validation reçue » sur la page
-- campagne. Ce signal est INFORMATIF : il ne bloque jamais l'avancement de la campagne ni
-- l'impression des étiquettes (le fondateur reste libre d'avancer sans lui).
--
-- La confirmation appartient au LIEN (= au round de validation) : générer un nouveau lien
-- révoque les précédents et ouvre un nouveau round, non confirmé. Renvoyer la validation
-- (après un changement d'avis) met simplement l'horodatage à jour.
--
-- Idempotent : IF NOT EXISTS.

ALTER TABLE campagne_validation_liens
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN campagne_validation_liens.confirmed_at IS
  'Confirmation finale de la personne externe (« Envoyer la validation », 2026-07-03). NULL = pas encore confirmé. Informatif : ne bloque ni la campagne ni les étiquettes.';
