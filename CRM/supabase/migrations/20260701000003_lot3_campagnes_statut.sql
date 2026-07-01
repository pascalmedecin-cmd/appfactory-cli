-- Lot 3 - Campagnes : cycle de vie (statut En cours / Active)
--
-- Nouveau champ `campagnes.statut` (2 valeurs) : 'en_cours' (défaut, préparation +
-- identification des prospects) / 'active' (campagne lancée). Distinct de l'archivage
-- (colonne `archived`, conservée).
--
-- Colonne NOUVELLE -> AUCUN remap de données (pas de valeur legacy à traduire) : le
-- DEFAULT 'en_cours' remplit les campagnes existantes. L'ordre « DROP CHECK avant UPDATE »
-- (leçon Lot 1/2, cf. feedback_migration_enum_drop_check_avant_update) ne s'applique donc
-- PAS ici — il n'y a pas d'UPDATE de valeurs préexistantes hors périmètre du nouveau CHECK.
--
-- Idempotent (rejouable) : ADD COLUMN IF NOT EXISTS + DROP/ADD CONSTRAINT.

ALTER TABLE campagnes ADD COLUMN IF NOT EXISTS statut TEXT NOT NULL DEFAULT 'en_cours';

ALTER TABLE campagnes DROP CONSTRAINT IF EXISTS campagnes_statut_check;
ALTER TABLE campagnes ADD CONSTRAINT campagnes_statut_check CHECK (statut IN ('en_cours', 'active'));

COMMENT ON COLUMN campagnes.statut IS
'Lot 3 : cycle de vie campagne. en_cours (défaut, préparation + identification prospects) / active (lancée). Distinct de archived.';
