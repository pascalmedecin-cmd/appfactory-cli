-- Preuve RLS du team-gate Storage bucket prospect_photos
-- (migration <14chiffres>_rls_storage_prospect_photos_team_gate.sql). Audit 360 22/07 - test de refus (DoD sécu).
--
-- NOTE media_library : la surface "table public.media_library lisible par tout
-- authenticated" décrite dans l'audit a DÉJÀ été neutralisée le 2026-04-24 par
-- `20260424000001_remove_media_library.sql` (DROP TABLE media_library CASCADE).
-- La table, sa policy et tout accès applicatif n'existent plus -> aucune surface
-- à verrouiller. Ce script ne teste donc que le bucket Storage prospect_photos,
-- seule surface réellement ouverte restante.
--
-- Lancer sur la base jetable locale APRES `supabase db reset` :
--   PGPASSWORD=postgres psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -v ON_ERROR_STOP=1 -f supabase/security/rls_storage_media_proof.sql
--
-- Le script LEVE une exception (exit code != 0) au moindre écart. S'il se termine
-- sans erreur, les 3 régimes sont prouvés.
--
-- PIÈGE 1 (superuser) : le rôle `postgres` (superuser) BYPASSE la RLS -> chaque bloc
-- fait `set local role authenticated|service_role` + set_config('request.jwt.claims', ...).
--
-- PIÈGE 2 (trigger protect_delete) : storage.objects porte un trigger BEFORE DELETE
-- (`storage.protect_delete`) qui LEVE 42501 sur tout DELETE SQL direct tant que le GUC
-- `storage.allow_delete_query` n'est pas 'true'. Un DELETE testé sans ce GUC serait donc
-- refusé par le TRIGGER, pas par la RLS = FAUX VERT. Le chemin d'attaque réel (Storage
-- API `.remove()`) désarme ce trigger via ce même GUC, laissant la RLS SEULE barrière.
-- On reproduit donc ce chemin : `set local storage.allow_delete_query = 'true'` avant le
-- DELETE, pour que le refus mesuré soit bien celui de la RLS.
--
-- GRANT PROD : storage.objects a déjà ses grants Supabase pour authenticated/service_role
-- (regrant idempotent ci-dessous, no-op). RLS = seule couche modifiée par la migration.
-- (Base jetable : ne quitte jamais le local.)

\set ON_ERROR_STOP on

grant select, insert, update, delete on storage.objects to authenticated, service_role;

begin;
  -- GUC posé en superuser (postgres) : désarme protect_delete pour toute la transaction,
  -- reproduisant le chemin Storage API où la RLS est la seule barrière du DELETE.
  set local storage.allow_delete_query = 'true';

  -- ---- Fixtures (service_role, BYPASS RLS) ----
  set local role service_role;
  insert into storage.buckets (id, name) values ('prospect_photos', 'prospect_photos')
    on conflict (id) do nothing;
  insert into storage.objects (id, bucket_id, name)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'prospect_photos', 'proof/fake-object.jpg');

  -- ==========================================================================
  -- TEST 1 : JWT étranger (pirate@gmail.com) -> 0 objet visible + DELETE filtré
  --          par la RLS. C'EST LE TEST DE REFUS (DoD).
  -- ==========================================================================
  set local role authenticated;
  select set_config('request.jwt.claims', '{"email":"pirate@gmail.com","role":"authenticated"}', true);
  do $$
  declare n bigint; d int;
  begin
    if private.is_crm_team() then
      raise exception 'FAIL foreign: is_crm_team() devrait être FALSE pour @gmail.com';
    end if;
    -- Storage : 0 objet prospect_photos visible
    select count(*) into n from storage.objects where bucket_id = 'prospect_photos';
    if n <> 0 then
      raise exception 'FAIL foreign: % objet(s) prospect_photos visible(s) (attendu 0) -> fuite RLS Storage', n;
    end if;
    -- DELETE régi par la SEULE RLS (trigger désarmé) : doit filtrer 0 ligne
    delete from storage.objects where bucket_id = 'prospect_photos';
    get diagnostics d = row_count;
    if d <> 0 then
      raise exception 'FAIL foreign: DELETE a supprimé % objet(s) (RLS aurait dû filtrer 0) -> fuite RLS Storage', d;
    end if;
    raise notice 'OK foreign: 0 objet prospect_photos visible, DELETE filtré par la RLS';
  end $$;

  -- ==========================================================================
  -- TEST 2 : JWT équipe (x@filmpro.ch) -> objet visible
  -- ==========================================================================
  set local role authenticated;
  select set_config('request.jwt.claims', '{"email":"x@filmpro.ch","role":"authenticated"}', true);
  do $$
  declare n bigint;
  begin
    if not private.is_crm_team() then
      raise exception 'FAIL team: is_crm_team() devrait être TRUE pour @filmpro.ch';
    end if;
    select count(*) into n from storage.objects where bucket_id = 'prospect_photos';
    if n <> 1 then
      raise exception 'FAIL team: objet prospect_photos devrait être visible (vu %)', n;
    end if;
    raise notice 'OK team: objet prospect_photos visible';
  end $$;

  -- ==========================================================================
  -- TEST 3 : service_role -> accès complet inchangé (BYPASS RLS)
  -- ==========================================================================
  set local role service_role;
  do $$
  declare n bigint;
  begin
    select count(*) into n from storage.objects where bucket_id = 'prospect_photos';
    if n <> 1 then raise exception 'FAIL service_role: objet attendu (bypass RLS), vu %', n; end if;
    raise notice 'OK service_role: accès complet (bypass RLS)';
  end $$;
rollback;

\echo '=== RLS storage prospect_photos team-gate : les 3 régimes sont PROUVÉS (aucune exception levée) ==='
