-- Verrouillage RLS C-1 couche 2 (suite) : bucket Storage prospect_photos (audit 360 22/07).
--
-- Avant : les 4 policies storage.objects du bucket prospect_photos étaient ouvertes à
-- TOUT compte authentifié (`to authenticated using (bucket_id = 'prospect_photos')`,
-- source 20260430000001_prospect_photos_visits.sql). L'OTP signup étant ouvert côté
-- GoTrue, un compte étranger contournait l'allowlist applicative et LISAIT / SUPPRIMAIT
-- les photos de bâtiments prospects via la Storage API + clé anon.
--
-- Après : chaque accès team-JWT est filtré par private.is_crm_team() (helper créé et
-- grant-é dans 20260722113903_rls_team_gate.sql : email d'un des 3 domaines équipe
-- confirmés). Les URLs signées sont générées côté serveur pour des utilisateurs équipe
-- (tous les comptes légitimes sont dans l'allowlist -> is_crm_team() = TRUE) : aucun flux
-- légitime n'est bloqué. Les accès service_role (crons, pipeline) BYPASSENT la RLS.
--
-- media_library : hors périmètre. La table décrite dans l'audit a été DROPPÉE le
-- 2026-04-24 (20260424000001_remove_media_library.sql, DROP TABLE ... CASCADE) : sa
-- policy et tout accès n'existent plus, aucune surface à verrouiller.

-- Bucket Storage prospect_photos : aligne les 4 policies sur le team-gate.
drop policy if exists "prospect_photos_authenticated_read"   on storage.objects;
drop policy if exists "prospect_photos_authenticated_insert" on storage.objects;
drop policy if exists "prospect_photos_authenticated_update" on storage.objects;
drop policy if exists "prospect_photos_authenticated_delete" on storage.objects;

create policy "prospect_photos_team_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'prospect_photos' and private.is_crm_team());

create policy "prospect_photos_team_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'prospect_photos' and private.is_crm_team());

create policy "prospect_photos_team_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'prospect_photos' and private.is_crm_team())
  with check (bucket_id = 'prospect_photos' and private.is_crm_team());

create policy "prospect_photos_team_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'prospect_photos' and private.is_crm_team());
