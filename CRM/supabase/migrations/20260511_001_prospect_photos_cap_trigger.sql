-- Audit 360 M-08 : plafond atomique de 10 photos par owner (lead OU entreprise).
--
-- L'endpoint /api/photos faisait un SELECT COUNT puis (après upload storage) un
-- INSERT — deux uploads concurrents pouvaient tous deux voir count=9 et créer
-- une 11ᵉ ligne. On déplace la garde dans un trigger BEFORE INSERT, et on
-- sérialise les inserts concurrents sur le même owner via un verrou consultatif
-- transactionnel (pg_advisory_xact_lock) → le COUNT devient atomique.
--
-- L'app garde son check applicatif (chemin rapide : 409 avant l'upload storage) ;
-- ce trigger est le filet de sécurité contre la course.

CREATE OR REPLACE FUNCTION enforce_prospect_photos_cap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	v_owner_key text;
	v_count integer;
BEGIN
	v_owner_key := coalesce(NEW.prospect_lead_id::text, NEW.entreprise_id);
	IF v_owner_key IS NULL THEN
		-- La contrainte XOR garantit qu'un des deux FK est rempli ; garde défensive.
		RAISE EXCEPTION 'prospect_photos: aucun owner (lead/entreprise) sur la ligne insérée'
			USING ERRCODE = 'check_violation';
	END IF;

	-- Verrou transactionnel par owner : sérialise les inserts concurrents sur le
	-- même lead/entreprise (audit 360 M-08). Libéré automatiquement en fin de transaction.
	PERFORM pg_advisory_xact_lock(hashtext('prospect_photos_cap:' || v_owner_key));

	IF NEW.prospect_lead_id IS NOT NULL THEN
		SELECT count(*) INTO v_count FROM prospect_photos WHERE prospect_lead_id = NEW.prospect_lead_id;
	ELSE
		SELECT count(*) INTO v_count FROM prospect_photos WHERE entreprise_id = NEW.entreprise_id;
	END IF;

	IF v_count >= 10 THEN
		RAISE EXCEPTION 'Limite de 10 photos atteinte pour cet élément'
			USING ERRCODE = 'check_violation';
	END IF;

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prospect_photos_cap_trigger ON prospect_photos;
CREATE TRIGGER prospect_photos_cap_trigger
	BEFORE INSERT ON prospect_photos
	FOR EACH ROW
	EXECUTE FUNCTION enforce_prospect_photos_cap();

COMMENT ON FUNCTION enforce_prospect_photos_cap() IS
	'Audit 360 M-08 : plafond atomique de 10 photos par lead/entreprise (advisory xact lock).';
