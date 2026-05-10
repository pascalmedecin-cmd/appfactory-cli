-- Migration : aligner les CHECK constraints DB sur les enums Zod côté schemas.
--
-- Contexte (audit 360 H-15, S178 V2a) : `signaux_affaires.statut_traitement`,
-- `signaux_affaires.type_signal` et `opportunites.etape_pipeline` étaient des
-- colonnes `text` libres. Toute écriture amont (cron, action, import) avec une
-- valeur hors enum Zod resterait silencieusement persistée — drift garanti
-- côté DB qui contredit progressivement l'enum applicatif.
--
-- Pré-requis : audit pré-migration `SELECT DISTINCT ...` documenté dans le
-- commit message :
--   - signaux_affaires.statut_traitement : { 'nouveau' } (1 valeur, ∈ enum)
--   - signaux_affaires.type_signal       : { 'appel_offres' } (1 valeur, ∈ enum)
--   - opportunites.etape_pipeline        : ∅ (table vide ou tout NULL)
-- Aucune ligne hors enum → l'ajout des CHECK est strictement non-régressant.
--
-- NULL est toléré (CHECK Postgres accepte NULL par défaut, aligné UI/Zod
-- optional pour ces colonnes).

ALTER TABLE signaux_affaires
  DROP CONSTRAINT IF EXISTS signaux_affaires_statut_traitement_check;

ALTER TABLE signaux_affaires
  ADD CONSTRAINT signaux_affaires_statut_traitement_check
  CHECK (statut_traitement IS NULL OR statut_traitement IN (
    'nouveau', 'en_analyse', 'interesse', 'ecarte', 'converti'
  ));

ALTER TABLE signaux_affaires
  DROP CONSTRAINT IF EXISTS signaux_affaires_type_signal_check;

ALTER TABLE signaux_affaires
  ADD CONSTRAINT signaux_affaires_type_signal_check
  CHECK (type_signal IS NULL OR type_signal IN (
    'appel_offres', 'permis_construire', 'creation_entreprise',
    'demenagement', 'expansion', 'fusion_acquisition', 'autre'
  ));

ALTER TABLE opportunites
  DROP CONSTRAINT IF EXISTS opportunites_etape_pipeline_check;

ALTER TABLE opportunites
  ADD CONSTRAINT opportunites_etape_pipeline_check
  CHECK (etape_pipeline IS NULL OR etape_pipeline IN (
    'identification', 'qualification', 'proposition', 'negociation', 'gagne', 'perdu'
  ));
