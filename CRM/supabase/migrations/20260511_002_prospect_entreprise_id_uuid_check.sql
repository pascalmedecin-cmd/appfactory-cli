-- Audit 360 M-20 : cohérence du type de `prospect_visits.entreprise_id` /
-- `prospect_photos.entreprise_id`.
--
-- Le finding suggérait `ALTER COLUMN entreprise_id TYPE uuid`. C'est INFAISABLE :
-- ces colonnes sont des FK vers `entreprises.id`, qui est de type `text` (legacy,
-- format UUID en pratique — cf. migration 20260510_010). Une FK doit avoir le même
-- type que sa cible ; convertir ces colonnes en `uuid` casserait la contrainte.
-- Migrer `entreprises.id` lui-même en `uuid` est hors scope (touche toutes les FK).
--
-- À la place, on durcit ce qui est durcissable : un CHECK garantissant le format
-- UUID sur ces deux colonnes `text` (audit data 2026-05-11 : 0 ligne hors format),
-- + des commentaires explicatifs pour qu'un futur lecteur ne re-flagge pas.

ALTER TABLE prospect_photos
	ADD CONSTRAINT prospect_photos_entreprise_id_uuid_fmt
	-- `~*` (insensible à la casse) pour matcher le UUID_RE `/i` côté app (audit contracts).
	CHECK (entreprise_id IS NULL OR entreprise_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

ALTER TABLE prospect_visits
	ADD CONSTRAINT prospect_visits_entreprise_id_uuid_fmt
	-- `~*` (insensible à la casse) pour matcher le UUID_RE `/i` côté app (audit contracts).
	CHECK (entreprise_id IS NULL OR entreprise_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

COMMENT ON COLUMN prospect_photos.entreprise_id IS
	'FK vers entreprises.id (type TEXT legacy, format UUID — CHECK prospect_photos_entreprise_id_uuid_fmt). NULL si la photo est rattachée à un lead (XOR).';
COMMENT ON COLUMN prospect_visits.entreprise_id IS
	'FK vers entreprises.id (type TEXT legacy, format UUID — CHECK prospect_visits_entreprise_id_uuid_fmt). NULL si la visite est rattachée à un lead (XOR).';
