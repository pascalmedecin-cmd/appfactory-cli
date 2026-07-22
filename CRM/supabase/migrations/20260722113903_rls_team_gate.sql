-- Verrouillage RLS C-1 couche 2 (audit 360 22/07).
--
-- Avant : les tables du CRM avaient des policies ouvertes - soit
-- `using (auth.role() = 'authenticated')` (to public), soit `using (true)`
-- (to authenticated). N'importe quel compte authentifie (l'OTP signup etant
-- ouvert cote GoTrue) contournait l'allowlist applicative et lisait/ecrivait
-- tout le fichier prospects via PostgREST + cle anon.
--
-- Apres : chaque acces team-JWT est filtre par private.is_crm_team() (email
-- appartenant a l'un des 3 domaines equipe confirmes). Les acces service_role
-- (crons, pipeline veille, validation externe) BYPASSENT la RLS et restent
-- inchanges. Aucun acces anonyme ne dependait d'une policy ouverte.
--
-- 28 tables verrouillees : 8 "Authenticated full access" (ALL) + 11
-- "authenticated_full_access" (ALL) + 3 decoupe_*_all (ALL) + 6 SELECT.
-- NON touchees : intelligence_reads (user-scopee user_id=auth.uid()), les
-- policies WRITE admin de feedback_entries et signaux_mots_cles.

-- Helper : source unique de la liste equipe (3 domaines confirmes Pascal 22/07).
create schema if not exists private;
create or replace function private.is_crm_team()
returns boolean language sql stable
set search_path = ''
as $$
  select coalesce(
    lower(auth.jwt() ->> 'email') like '%@filmpro.ch'
    or lower(auth.jwt() ->> 'email') like '%@lamaisoncreativedirection.ch'
    or lower(auth.jwt() ->> 'email') like '%@ledstudio.ch', false);
$$;
revoke all on function private.is_crm_team() from public;
-- La policy `to authenticated using (private.is_crm_team())` est évaluée AVEC les
-- privilèges du rôle appelant (authenticated). Ce rôle doit donc pouvoir résoudre
-- (USAGE schéma) ET exécuter (EXECUTE) le helper, sinon toute requête sur une table
-- verrouillée échoue en « permission denied for schema private » au lieu de filtrer.
grant usage on schema private to authenticated;
grant execute on function private.is_crm_team() to authenticated;

-- ============================================================================
-- GROUPE ALL, policy "Authenticated full access" (8 tables coeur CRM)
-- ============================================================================
drop policy if exists "Authenticated full access" on public.entreprises;
create policy "team_access" on public.entreprises
  for all to authenticated using (private.is_crm_team()) with check (private.is_crm_team());

drop policy if exists "Authenticated full access" on public.contacts;
create policy "team_access" on public.contacts
  for all to authenticated using (private.is_crm_team()) with check (private.is_crm_team());

drop policy if exists "Authenticated full access" on public.signaux_affaires;
create policy "team_access" on public.signaux_affaires
  for all to authenticated using (private.is_crm_team()) with check (private.is_crm_team());

drop policy if exists "Authenticated full access" on public.opportunites;
create policy "team_access" on public.opportunites
  for all to authenticated using (private.is_crm_team()) with check (private.is_crm_team());

drop policy if exists "Authenticated full access" on public.prescripteurs;
create policy "team_access" on public.prescripteurs
  for all to authenticated using (private.is_crm_team()) with check (private.is_crm_team());

drop policy if exists "Authenticated full access" on public.activites;
create policy "team_access" on public.activites
  for all to authenticated using (private.is_crm_team()) with check (private.is_crm_team());

drop policy if exists "Authenticated full access" on public.utilisateurs;
create policy "team_access" on public.utilisateurs
  for all to authenticated using (private.is_crm_team()) with check (private.is_crm_team());

drop policy if exists "Authenticated full access" on public.imports_zefix;
create policy "team_access" on public.imports_zefix
  for all to authenticated using (private.is_crm_team()) with check (private.is_crm_team());

-- ============================================================================
-- GROUPE ALL, policy "authenticated_full_access" (11 tables)
-- ============================================================================
drop policy if exists "authenticated_full_access" on public.campagne_groupes;
create policy "team_access" on public.campagne_groupes
  for all to authenticated using (private.is_crm_team()) with check (private.is_crm_team());

drop policy if exists "authenticated_full_access" on public.campagne_validation_liens;
create policy "team_access" on public.campagne_validation_liens
  for all to authenticated using (private.is_crm_team()) with check (private.is_crm_team());

drop policy if exists "authenticated_full_access" on public.campagnes;
create policy "team_access" on public.campagnes
  for all to authenticated using (private.is_crm_team()) with check (private.is_crm_team());

drop policy if exists "authenticated_full_access" on public.contact_suggestions;
create policy "team_access" on public.contact_suggestions
  for all to authenticated using (private.is_crm_team()) with check (private.is_crm_team());

drop policy if exists "authenticated_full_access" on public.intelligence_reports;
create policy "team_access" on public.intelligence_reports
  for all to authenticated using (private.is_crm_team()) with check (private.is_crm_team());

drop policy if exists "authenticated_full_access" on public.prospect_lead_campagnes;
create policy "team_access" on public.prospect_lead_campagnes
  for all to authenticated using (private.is_crm_team()) with check (private.is_crm_team());

drop policy if exists "authenticated_full_access" on public.prospect_lead_signals;
create policy "team_access" on public.prospect_lead_signals
  for all to authenticated using (private.is_crm_team()) with check (private.is_crm_team());

drop policy if exists "authenticated_full_access" on public.prospect_leads;
create policy "team_access" on public.prospect_leads
  for all to authenticated using (private.is_crm_team()) with check (private.is_crm_team());

drop policy if exists "authenticated_full_access" on public.prospect_photos;
create policy "team_access" on public.prospect_photos
  for all to authenticated using (private.is_crm_team()) with check (private.is_crm_team());

drop policy if exists "authenticated_full_access" on public.prospect_visits;
create policy "team_access" on public.prospect_visits
  for all to authenticated using (private.is_crm_team()) with check (private.is_crm_team());

drop policy if exists "authenticated_full_access" on public.recherches_sauvegardees;
create policy "team_access" on public.recherches_sauvegardees
  for all to authenticated using (private.is_crm_team()) with check (private.is_crm_team());

-- ============================================================================
-- GROUPE ALL, policies decoupe (3 tables, nom = <table>_all)
-- ============================================================================
drop policy if exists "decoupe_chantiers_all" on public.decoupe_chantiers;
create policy "team_access" on public.decoupe_chantiers
  for all to authenticated using (private.is_crm_team()) with check (private.is_crm_team());

drop policy if exists "decoupe_produits_all" on public.decoupe_produits;
create policy "team_access" on public.decoupe_produits
  for all to authenticated using (private.is_crm_team()) with check (private.is_crm_team());

drop policy if exists "decoupe_vitres_all" on public.decoupe_vitres;
create policy "team_access" on public.decoupe_vitres
  for all to authenticated using (private.is_crm_team()) with check (private.is_crm_team());

-- ============================================================================
-- GROUPE SELECT (6 tables, drop UNIQUEMENT la policy read nommee)
-- ============================================================================
drop policy if exists "api_quota_log read" on public.api_quota_log;
create policy "team_read" on public.api_quota_log
  for select to authenticated using (private.is_crm_team());

drop policy if exists "cost_audit_runs_select_authenticated" on public.cost_audit_runs;
create policy "team_read" on public.cost_audit_runs
  for select to authenticated using (private.is_crm_team());

drop policy if exists "feedback_entries_read" on public.feedback_entries;
create policy "team_read" on public.feedback_entries
  for select to authenticated using (private.is_crm_team());

drop policy if exists "signaux_mots_cles_select_all" on public.signaux_mots_cles;
create policy "team_read" on public.signaux_mots_cles
  for select to authenticated using (private.is_crm_team());

drop policy if exists "veille_sources_select_all" on public.veille_sources;
create policy "team_read" on public.veille_sources
  for select to authenticated using (private.is_crm_team());

drop policy if exists "veille_themes_select_all" on public.veille_themes;
create policy "team_read" on public.veille_themes
  for select to authenticated using (private.is_crm_team());
