-- Audit 360 V2b - H-10 : RPC plpgsql atomique pour transferer un lead vers CRM
--
-- Contexte : `transferer` action (`/prospection/+page.server.ts:368-441`)
-- faisait 3 INSERTs/UPDATE séquentiels :
--   1. INSERT entreprises (raison_sociale, canton, ide, secteur, source, ...)
--   2. INSERT contacts (si nom_contact présent)
--   3. UPDATE prospect_leads SET statut='transfere', transfere_vers_*
-- Si le 2 ou 3 échoue, état partiel corrompu (entreprise sans contact ni
-- lien lead, ou entreprise+contact orphelins).
--
-- Fix : RPC plpgsql `transfer_lead_to_crm(p_lead_id uuid)` qui exécute
-- les 3 INSERTs/UPDATE dans une transaction implicite (un appel RPC =
-- une transaction côté Postgres). Tout rollback automatique si l'un des
-- statements throw.
--
-- Retourne JSON `{ entreprise_id, contact_id }` pour permettre au caller
-- SvelteKit de rediriger ou afficher confirmation. SECURITY DEFINER non
-- nécessaire (les tables sont accessibles via service_role, et la RLS
-- est mono-tenant FilmPro - pas de cross-user concern).

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
BEGIN
    -- 1. Récupérer le lead source.
    SELECT *
    INTO v_lead
    FROM public.prospect_leads
    WHERE id = p_lead_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lead introuvable: %', p_lead_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Adresse concaténée (adresse, npa, localite) ou NULL si tout vide.
    v_adresse := NULLIF(
        concat_ws(
            ', ',
            NULLIF(v_lead.adresse, ''),
            NULLIF(v_lead.npa, ''),
            NULLIF(v_lead.localite, '')
        ),
        ''
    );

    -- 2. INSERT entreprise.
    INSERT INTO public.entreprises (
        id,
        raison_sociale,
        canton,
        adresse_siege,
        numero_ide,
        site_web,
        secteur_activite,
        source,
        notes_libres,
        statut_qualification,
        date_import_ajout,
        date_derniere_modification
    )
    VALUES (
        v_entreprise_id,
        v_lead.raison_sociale,
        NULLIF(v_lead.canton, ''),
        v_adresse,
        NULLIF(v_lead.source_id, ''),
        NULLIF(v_lead.site_web, ''),
        NULLIF(v_lead.secteur_detecte, ''),
        'prospection (' || v_lead.source || ')',
        NULLIF(v_lead.description, ''),
        'nouveau',
        v_ts,
        v_ts
    );

    -- 3. INSERT contact (optionnel selon nom_contact).
    IF v_lead.nom_contact IS NOT NULL AND length(trim(v_lead.nom_contact)) > 0 THEN
        v_contact_id := gen_random_uuid();
        INSERT INTO public.contacts (
            id,
            nom,
            entreprise_id,
            telephone,
            email_professionnel,
            canton,
            source,
            statut_qualification,
            statut_archive,
            est_prescripteur,
            doublon_detecte,
            date_ajout,
            date_derniere_modification
        )
        VALUES (
            v_contact_id,
            v_lead.nom_contact,
            v_entreprise_id,
            NULLIF(v_lead.telephone, ''),
            NULLIF(v_lead.email, ''),
            NULLIF(v_lead.canton, ''),
            'prospection (' || v_lead.source || ')',
            'nouveau',
            false,
            false,
            false,
            v_ts,
            v_ts
        );
    END IF;

    -- 4. UPDATE prospect_leads.statut + liens.
    UPDATE public.prospect_leads
    SET
        statut = 'transfere',
        transfere_vers_entreprise_id = v_entreprise_id,
        transfere_vers_contact_id = v_contact_id,
        date_modification = v_ts
    WHERE id = p_lead_id;

    -- 5. Retour JSON pour le caller.
    RETURN jsonb_build_object(
        'entreprise_id', v_entreprise_id,
        'contact_id', v_contact_id
    );
END;
$$;

COMMENT ON FUNCTION public.transfer_lead_to_crm(uuid) IS
'Audit 360 V2b H-10 : transfert atomique d''un lead prospection vers CRM (entreprise + contact + statut). Une transaction implicite, rollback auto si throw.';
