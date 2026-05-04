-- Migration : étendre status intelligence_reports à 'running'.
--
-- Contexte (S165 2026-05-04) : W18 du 01/05/2026 absente en DB sans aucune trace
-- (ni published, ni error). Cause = exception non capturée et / ou timeout
-- silencieux 300s plan Hobby Vercel pendant l'appel Anthropic. Aucune ligne n'est
-- écrite avant la fin du run, donc tout échec en amont = silence total.
--
-- Fix observability : la fonction runWeeklyGeneration upsert désormais
-- status='running' AU DÉMARRAGE (avant tout appel coûteux). Une ligne running
-- orpheline = preuve factuelle qu'un run a démarré et n'a pas atteint la phase
-- de publication. Permet diagnostic même quand les logs Vercel sont expirés.

ALTER TABLE intelligence_reports DROP CONSTRAINT IF EXISTS intelligence_reports_status_check;

ALTER TABLE intelligence_reports
  ADD CONSTRAINT intelligence_reports_status_check
  CHECK (status IN ('published', 'draft', 'error', 'running'));
