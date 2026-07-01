-- Audit 360 V2b bug-hunter F3 : optimistic lock partiel sur intelligence_reports
--
-- Migration 006 a ajouté `version INTEGER`, mais seul `addItem` (V2b H-09)
-- la respecte. Les autres writers (cron archive, recheck-historical, run-generation,
-- veille listActiveThemes upsert) UPDATE sans bump version → 2 problèmes :
--   (a) Lost update silencieux : addItem voit version=N, autre writer UPDATE
--       sans toucher version → addItem CAS sur N réussit, mais l'autre
--       écriture est écrasée si elle touchait `items` ou colonne overlap.
--   (b) addItem `eq('version', currentVersion)` reste valide mais l'autre
--       writer continue à toucher la table sans signaler de bump → impossible
--       pour addItem de détecter qu'un autre changement a eu lieu (false negative).
--
-- Fix structurel : trigger BEFORE UPDATE qui force `NEW.version = OLD.version + 1`
-- sauf si NEW.version > OLD.version (= addItem en CAS optimistic, déjà calculé
-- côté JS). Tous les writers bumpent automatiquement, l'addItem détecte tout
-- changement intercurrent.
--
-- Cas d'usage couverts :
--   - addItem CAS : NEW.version = currentVersion+1 = OLD.version+1 → trigger no-op (NEW > OLD).
--   - cron archive : NEW.version = OLD.version (non touché) → trigger force +1.
--   - recheck-historical UPDATE items_hidden : trigger force +1.
--   - run-generation UPDATE items : trigger force +1.

CREATE OR REPLACE FUNCTION public.intelligence_reports_bump_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Si NEW.version > OLD.version, c'est un caller en CAS optimistic qui a
    -- déjà calculé le bump (cf. addItem V2b H-09). On respecte sa valeur.
    -- Sinon, force +1 pour signaler à tous les CAS observers que la row a bougé.
    IF NEW.version IS NULL OR NEW.version <= OLD.version THEN
        NEW.version := OLD.version + 1;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS intelligence_reports_bump_version_trigger ON public.intelligence_reports;

CREATE TRIGGER intelligence_reports_bump_version_trigger
BEFORE UPDATE ON public.intelligence_reports
FOR EACH ROW
EXECUTE FUNCTION public.intelligence_reports_bump_version();

COMMENT ON FUNCTION public.intelligence_reports_bump_version() IS
'Audit 360 V2b bug-hunter F3 : tous les UPDATE sur intelligence_reports bumpent version. addItem CAS reste possible (NEW.version > OLD.version respecté).';
