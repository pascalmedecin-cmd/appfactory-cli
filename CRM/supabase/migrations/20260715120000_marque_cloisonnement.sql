-- Atelier 209 - Run 2 : cloisonnement bi-marque (FilmPro / LED Studio)
--
-- Ajoute une colonne `marque` ('filmpro' | 'led') sur les 12 tables metier, defaut
-- 'filmpro' = NON-REGRESSION (toutes les lignes legacy restent FilmPro, le CRM se
-- comporte exactement comme avant). `marque` est un FILTRE DE VUE applicatif (la RLS
-- reste mono-tenant plate, inchangee) + des garde-fous de COHERENCE en base (FK
-- composites) qui empechent en dur qu'un enregistrement d'une marque soit rattache a
-- l'autre. Decisions Pascal 2026-07-15 :
--   Q1 : un meme tiers peut exister dans les 2 marques independamment
--        -> unicite (source_id, raison_sociale, nom de campagne) PREFIXEE par marque.
--   Q2 : veille/signaux restent FilmPro-only ce run (le cron signaux ecrit marque='filmpro').
--   Q3 : selecteur de marque par-appareil (cookie) -> aucune incidence base.
--
-- Idempotente (rejouable par `supabase db reset` ET applicable en prod via lib `pg`).

-- ============================================================================
-- 1. Colonne `marque` + CHECK + index sur les 12 tables (partie uniforme)
-- ============================================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'prospect_leads', 'entreprises', 'contacts', 'opportunites', 'signaux_affaires',
    'campagnes', 'recherches_sauvegardees', 'prospect_lead_campagnes', 'campagne_groupes',
    'campagne_validation_liens', 'prospect_photos', 'prospect_visits'
  ]
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS marque text NOT NULL DEFAULT ''filmpro''', t);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t || '_marque_chk') THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (marque IN (''filmpro'', ''led''))',
        t, t || '_marque_chk');
    END IF;
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (marque)', 'idx_' || t || '_marque', t);
  END LOOP;
END $$;

-- Index composites colles aux requetes filtrees les plus chaudes.
CREATE INDEX IF NOT EXISTS idx_entreprises_marque_archive ON public.entreprises (marque, statut_archive);
CREATE INDEX IF NOT EXISTS idx_contacts_marque_archive ON public.contacts (marque, statut_archive);
CREATE INDEX IF NOT EXISTS idx_prospect_leads_marque_statut ON public.prospect_leads (marque, statut);
CREATE INDEX IF NOT EXISTS idx_prospect_leads_marque_date ON public.prospect_leads (marque, date_import DESC);

-- ============================================================================
-- 2. Cles (id, marque) requises comme cible des FK composites de coherence
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prospect_leads_id_marque_key') THEN
    ALTER TABLE public.prospect_leads ADD CONSTRAINT prospect_leads_id_marque_key UNIQUE (id, marque);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campagnes_id_marque_key') THEN
    ALTER TABLE public.campagnes ADD CONSTRAINT campagnes_id_marque_key UNIQUE (id, marque);
  END IF;
END $$;

-- ============================================================================
-- 3. Unicite metier PREFIXEE par marque (Q1 : meme tiers autorise dans les 2 marques)
-- ============================================================================
-- prospect_leads : dedup source+source_id -> par marque (un meme source_id peut etre
-- importe par FilmPro ET par LED sans collision). Multiples NULL source_id toujours OK.
ALTER TABLE public.prospect_leads DROP CONSTRAINT IF EXISTS prospect_leads_source_source_id_key;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prospect_leads_source_source_id_key') THEN
    ALTER TABLE public.prospect_leads
      ADD CONSTRAINT prospect_leads_source_source_id_key UNIQUE (marque, source, source_id);
  END IF;
END $$;

-- entreprises : unicite raison sociale normalisee -> par marque (l'index sert AUSSI la
-- dedup de transfer_lead_to_crm + le lookup entreprises_lookup_by_name, reecrits plus bas).
DROP INDEX IF EXISTS public.entreprises_raison_sociale_normalized_unique;
CREATE UNIQUE INDEX IF NOT EXISTS entreprises_raison_sociale_normalized_unique
  ON public.entreprises (marque, lower(immutable_unaccent(raison_sociale)))
  WHERE statut_archive = false;

-- campagnes : unicite du nom (insensible casse) -> par marque.
DROP INDEX IF EXISTS public.idx_campagnes_nom_lower;
CREATE UNIQUE INDEX IF NOT EXISTS idx_campagnes_nom_lower
  ON public.campagnes (marque, lower(nom));

-- ============================================================================
-- 4. Garde-fous de coherence en base : impossible d'attacher un enregistrement
--    d'une marque a un parent de l'autre marque (defense in depth vs bug applicatif)
-- ============================================================================
DO $$
BEGIN
  -- lien N-N prospect<->campagne : lead ET campagne doivent etre de la MEME marque que le lien
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prospect_lead_campagnes_lead_marque_fk') THEN
    ALTER TABLE public.prospect_lead_campagnes
      ADD CONSTRAINT prospect_lead_campagnes_lead_marque_fk
      FOREIGN KEY (lead_id, marque) REFERENCES public.prospect_leads (id, marque) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prospect_lead_campagnes_campagne_marque_fk') THEN
    ALTER TABLE public.prospect_lead_campagnes
      ADD CONSTRAINT prospect_lead_campagnes_campagne_marque_fk
      FOREIGN KEY (campagne_id, marque) REFERENCES public.campagnes (id, marque) ON DELETE CASCADE;
  END IF;
  -- un groupe appartient a une campagne de la MEME marque
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campagne_groupes_campagne_marque_fk') THEN
    ALTER TABLE public.campagne_groupes
      ADD CONSTRAINT campagne_groupes_campagne_marque_fk
      FOREIGN KEY (campagne_id, marque) REFERENCES public.campagnes (id, marque) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- 5. RPC reecrites : propager la marque du lead (sinon fuite silencieuse par le DEFAULT)
-- ============================================================================

-- 5a. transfer_lead_to_crm : entreprise + contact heritent de la marque du lead ;
--     le fallback de dedup (unique_violation) ne matche QUE dans la meme marque.
CREATE OR REPLACE FUNCTION public.transfer_lead_to_crm(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_lead RECORD;
    v_entreprise_id uuid := gen_random_uuid();
    v_contact_id uuid := NULL;
    v_ts timestamptz := now();
    v_adresse text;
    v_existing_entreprise_id uuid;
BEGIN
    SELECT *
    INTO v_lead
    FROM public.prospect_leads
    WHERE id = p_lead_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lead introuvable: %', p_lead_id
            USING ERRCODE = 'P0002';
    END IF;

    IF v_lead.statut = 'transfere' THEN
        RAISE EXCEPTION 'lead_already_transferred: %', p_lead_id
            USING ERRCODE = 'P0001';
    END IF;

    v_adresse := NULLIF(
        concat_ws(
            ', ',
            NULLIF(v_lead.adresse, ''),
            NULLIF(v_lead.npa, ''),
            NULLIF(v_lead.localite, '')
        ),
        ''
    );

    BEGIN
        INSERT INTO public.entreprises (
            id, raison_sociale, canton, adresse_siege, numero_ide, site_web,
            secteur_activite, source, notes_libres, statut_qualification,
            date_import_ajout, date_derniere_modification, marque
        )
        VALUES (
            v_entreprise_id, v_lead.raison_sociale, NULLIF(v_lead.canton, ''), v_adresse,
            NULLIF(v_lead.source_id, ''), NULLIF(v_lead.site_web, ''),
            NULLIF(v_lead.secteur_detecte, ''), 'prospection (' || v_lead.source || ')',
            NULLIF(v_lead.description, ''), 'nouveau', v_ts, v_ts, v_lead.marque
        );
    EXCEPTION WHEN unique_violation THEN
        SELECT id
        INTO v_existing_entreprise_id
        FROM public.entreprises
        WHERE lower(immutable_unaccent(raison_sociale)) = lower(immutable_unaccent(v_lead.raison_sociale))
          AND statut_archive = false
          AND marque = v_lead.marque
        LIMIT 1;

        IF v_existing_entreprise_id IS NULL THEN
            RAISE;
        END IF;

        v_entreprise_id := v_existing_entreprise_id;
    END;

    IF v_lead.nom_contact IS NOT NULL AND length(trim(v_lead.nom_contact)) > 0 THEN
        v_contact_id := gen_random_uuid();
        INSERT INTO public.contacts (
            id, nom, entreprise_id, telephone, email_professionnel, canton, source,
            statut_qualification, statut_archive, est_prescripteur, doublon_detecte,
            date_ajout, date_derniere_modification, marque
        )
        VALUES (
            v_contact_id, v_lead.nom_contact, v_entreprise_id, NULLIF(v_lead.telephone, ''),
            NULLIF(v_lead.email, ''), NULLIF(v_lead.canton, ''),
            'prospection (' || v_lead.source || ')', 'nouveau', false, false, false, v_ts, v_ts,
            v_lead.marque
        );
    END IF;

    UPDATE public.prospect_leads
    SET statut = 'transfere',
        transfere_vers_entreprise_id = v_entreprise_id,
        transfere_vers_contact_id = v_contact_id,
        date_modification = v_ts
    WHERE id = p_lead_id;

    RETURN jsonb_build_object(
        'entreprise_id', v_entreprise_id,
        'contact_id', v_contact_id
    );
END;
$$;

-- 5b. mark_lead_for_contact : l'opportunite d'entree herite de la marque du lead.
CREATE OR REPLACE FUNCTION public.mark_lead_for_contact(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_lead RECORD;
  v_opp_id text;
  v_created boolean := false;
BEGIN
  SELECT id, statut, raison_sociale, marque INTO v_lead
  FROM public.prospect_leads WHERE id = p_lead_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead introuvable: %', p_lead_id USING ERRCODE = 'P0002';
  END IF;

  IF v_lead.statut NOT IN ('vide', 'a_contacter') THEN
    RAISE EXCEPTION 'lead_not_triable: %', v_lead.statut USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_opp_id
  FROM public.opportunites WHERE prospect_lead_id = p_lead_id LIMIT 1;

  IF v_opp_id IS NULL THEN
    v_opp_id := gen_random_uuid()::text;
    INSERT INTO public.opportunites (
      id, titre, etape_pipeline, prospect_lead_id, date_creation, date_derniere_modification, marque
    ) VALUES (
      v_opp_id, v_lead.raison_sociale, 'identification', p_lead_id, now(), now(), v_lead.marque
    );
    v_created := true;
  END IF;

  IF v_lead.statut <> 'a_contacter' THEN
    UPDATE public.prospect_leads
    SET statut = 'a_contacter', date_modification = now()
    WHERE id = p_lead_id;
  END IF;

  RETURN jsonb_build_object('opportunite_id', v_opp_id, 'created', v_created);
END;
$$;

-- 5c. entreprises_lookup_by_name : scope par marque. Nouveau parametre p_marque avec
--     DEFAULT 'filmpro' (les appels historiques a 1 argument restent valides = non-regression) ;
--     l'appelant CRM passera la marque active. DROP prealable car la signature change.
DROP FUNCTION IF EXISTS public.entreprises_lookup_by_name(text);
CREATE OR REPLACE FUNCTION public.entreprises_lookup_by_name(p_query text, p_marque text DEFAULT 'filmpro')
RETURNS TABLE(id text, raison_sociale text)
LANGUAGE sql
STABLE
AS $$
  SELECT id, raison_sociale
  FROM public.entreprises
  WHERE statut_archive = false
    AND marque = p_marque
    AND lower(immutable_unaccent(raison_sociale)) LIKE lower(immutable_unaccent(p_query)) || '%'
  LIMIT 50;
$$;

COMMENT ON COLUMN public.prospect_leads.marque IS
'Atelier 209 Run 2 : cloisonnement bi-marque (filmpro|led). Defaut filmpro = non-regression. Filtre de vue applicatif + garde-fous FK composites.';
