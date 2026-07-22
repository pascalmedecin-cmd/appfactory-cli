-- Preuve RLS du verrouillage team-gate (migration 20260722113903_rls_team_gate.sql).
-- Audit 360 22/07 - test de refus (DoD sécu).
--
-- Lancer sur la base jetable locale APRES `supabase db reset` :
--   PGPASSWORD=postgres psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -v ON_ERROR_STOP=1 -f supabase/security/rls_team_gate_proof.sql
--
-- Le script LEVE une exception (exit code != 0) au moindre écart. S'il se termine
-- sans erreur, les 3 régimes sont prouvés.
--
-- PIÈGE ÉVITÉ : le rôle `postgres` (superuser) BYPASSE la RLS -> chaque bloc fait
-- `set local role authenticated|service_role` + set_config('request.jwt.claims', ...).
--
-- SIMULATION DU GRANT PROD (nécessaire, sinon faux échec) : en local, les tables du
-- schéma public créées par le rôle `postgres` n'héritent que de `Dxtm` pour
-- `authenticated`/`service_role` (pas de SELECT/INSERT). En PROD, l'ACL par défaut
-- Supabase accorde `arwdDxtm` à `authenticated` (le client anon-key de l'app lit via
-- ce rôle, RLS = seule barrière) et `service_role` a BYPASSRLS + accès complet. On
-- reproduit donc ce GRANT ici pour isoler et tester la COUCHE RLS, seule modifiée par
-- la migration. (Base jetable : le grant ne quitte jamais le local.)

\set ON_ERROR_STOP on

grant select, insert, update, delete on
  public.entreprises, public.contacts, public.signaux_affaires, public.opportunites,
  public.prescripteurs, public.activites, public.utilisateurs, public.imports_zefix,
  public.campagne_groupes, public.campagne_validation_liens, public.campagnes,
  public.contact_suggestions, public.intelligence_reports, public.prospect_lead_campagnes,
  public.prospect_lead_signals, public.prospect_leads, public.prospect_photos,
  public.prospect_visits, public.recherches_sauvegardees, public.decoupe_chantiers,
  public.decoupe_produits, public.decoupe_vitres, public.api_quota_log,
  public.cost_audit_runs, public.feedback_entries, public.signaux_mots_cles,
  public.veille_sources, public.veille_themes
  to authenticated, service_role;

-- ============================================================================
-- TEST 1 : membre équipe (email @filmpro.ch) -> accès autorisé
-- ============================================================================
begin;
  select set_config('request.jwt.claims', '{"email":"alice@filmpro.ch","role":"authenticated"}', true);
  set local role authenticated;
  do $$
  declare n bigint;
  begin
    if not private.is_crm_team() then
      raise exception 'FAIL team: is_crm_team() devrait être TRUE pour @filmpro.ch';
    end if;
    -- SELECT accessible (>= 0)
    select count(*) into n from public.entreprises;
    raise notice 'OK team: SELECT entreprises accessible (% lignes)', n;
    -- INSERT + UPDATE OK sur table cœur
    insert into public.entreprises (id, raison_sociale) values ('rls-proof-team', 'RLS Proof Team SA');
    update public.entreprises set notes_libres = 'touched' where id = 'rls-proof-team';
    if (select count(*) from public.entreprises where id = 'rls-proof-team') <> 1 then
      raise exception 'FAIL team: la ligne insérée devrait être visible';
    end if;
    raise notice 'OK team: INSERT + UPDATE autorisés sur entreprises';
  end $$;
rollback;

-- ============================================================================
-- TEST 2 : utilisateur étranger (email @gmail.com) -> 0 ligne + INSERT refusé
--          C'EST LE TEST DE REFUS (DoD).
-- ============================================================================
begin;
  select set_config('request.jwt.claims', '{"email":"pirate@gmail.com","role":"authenticated"}', true);
  set local role authenticated;
  do $$
  declare
    t text;
    n bigint;
    tables text[] := array[
      'entreprises','contacts','signaux_affaires','opportunites','prescripteurs',
      'activites','utilisateurs','imports_zefix','campagne_groupes','campagne_validation_liens',
      'campagnes','contact_suggestions','intelligence_reports','prospect_lead_campagnes',
      'prospect_lead_signals','prospect_leads','prospect_photos','prospect_visits',
      'recherches_sauvegardees','decoupe_chantiers','decoupe_produits','decoupe_vitres',
      'api_quota_log','cost_audit_runs','feedback_entries','signaux_mots_cles',
      'veille_sources','veille_themes'
    ];
  begin
    if private.is_crm_team() then
      raise exception 'FAIL foreign: is_crm_team() devrait être FALSE pour @gmail.com';
    end if;
    -- SELECT count = 0 sur CHACUNE des 28 tables verrouillées
    foreach t in array tables loop
      execute format('select count(*) from public.%I', t) into n;
      if n <> 0 then
        raise exception 'FAIL foreign: %.count = % (attendu 0) -> fuite RLS', t, n;
      end if;
    end loop;
    raise notice 'OK foreign: 0 ligne visible sur les 28 tables verrouillées';
    -- INSERT refusé par la RLS (SQLSTATE 42501 = insufficient_privilege)
    begin
      insert into public.entreprises (id, raison_sociale) values ('rls-proof-foreign', 'X');
      raise exception 'FAIL foreign: l''INSERT aurait dû être bloqué par la RLS';
    exception when insufficient_privilege then
      raise notice 'OK foreign: INSERT bloqué par la RLS (42501)';
    end;
  end $$;
rollback;

-- ============================================================================
-- TEST 3 : service_role -> accès complet inchangé (BYPASS RLS)
-- ============================================================================
begin;
  set local role service_role;
  do $$
  declare n bigint;
  begin
    select count(*) into n from public.entreprises;   -- voit tout le seed (bypass RLS)
    if n < 1 then
      raise exception 'FAIL service_role: accès complet attendu, vu % lignes', n;
    end if;
    insert into public.entreprises (id, raison_sociale) values ('rls-proof-sr', 'SR');
    raise notice 'OK service_role: accès complet (bypass RLS), % entreprises visibles', n;
  end $$;
rollback;

\echo '=== RLS team-gate : les 3 régimes sont PROUVÉS (aucune exception levée) ==='
