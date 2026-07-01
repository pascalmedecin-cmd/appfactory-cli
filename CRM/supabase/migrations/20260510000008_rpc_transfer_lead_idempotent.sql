-- Audit 360 V2b bug-hunter F2 : RPC transfer_lead_to_crm non-idempotent
--
-- Avant ce patch : 2e clic Pascal sur "Transférer" (rechargement page latent,
-- double-clic accidentel) ré-exécutait la RPC :
--   - SELECT lead trouvé (statut='transfere' déjà mais pas filtré).
--   - INSERT entreprise → 23505 unique_violation (UNIQUE INDEX V1
--     `entreprises_raison_sociale_normalized_unique`).
--   - PL/pgSQL ne catch pas → propagation 500 silencieux côté SvelteKit.
--
-- Patch :
--   1. Guard `IF v_lead.statut = 'transfere'` → RAISE EXCEPTION P0001
--      `lead_already_transferred`. Le caller SvelteKit map P0001 → 409.
--   2. Wrap INSERT entreprise dans BEGIN/EXCEPTION WHEN unique_violation :
--      fallback SELECT id de l'entreprise pré-existante (matche normalisé
--      via UNIQUE INDEX partial), réutilise pour l'INSERT contact + UPDATE
--      lead. Si la collision n'est pas raison_sociale → RAISE pour ne pas
--      avaler une vraie violation.
--   3. Idem INSERT contact : pas de UNIQUE INDEX strict aujourd'hui mais
--      defense-in-depth si V3a en pose un.
--
-- CREATE OR REPLACE = remplace silencieusement la function migration 007.

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
    -- 1. Récupérer le lead source.
    SELECT *
    INTO v_lead
    FROM public.prospect_leads
    WHERE id = p_lead_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lead introuvable: %', p_lead_id
            USING ERRCODE = 'P0002';
    END IF;

    -- 1bis. Audit V2b F2 : guard idempotence. Si lead déjà transféré, ne
    -- pas ré-exécuter le pipeline (sinon 23505 silencieux). On signale au
    -- caller via P0001 pour qu'il affiche un 409 explicite.
    IF v_lead.statut = 'transfere' THEN
        RAISE EXCEPTION 'lead_already_transferred: %', p_lead_id
            USING ERRCODE = 'P0001';
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

    -- 2. INSERT entreprise. Audit V2b F2 : si une entreprise homonyme est
    -- déjà présente (via UNIQUE INDEX V1), réutiliser son id au lieu de
    -- propager le 23505. La normalisation UNIQUE INDEX = `lower(immutable_unaccent(raison_sociale))`.
    BEGIN
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
    EXCEPTION WHEN unique_violation THEN
        -- Match sur l'index UNIQUE partial : retrouve l'id existant.
        SELECT id
        INTO v_existing_entreprise_id
        FROM public.entreprises
        WHERE lower(immutable_unaccent(raison_sociale)) = lower(immutable_unaccent(v_lead.raison_sociale))
          AND statut_archive = false
        LIMIT 1;

        IF v_existing_entreprise_id IS NULL THEN
            -- Vraie violation hors raison_sociale (autre constraint future) → re-raise.
            RAISE;
        END IF;

        v_entreprise_id := v_existing_entreprise_id;
    END;

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

    RETURN jsonb_build_object(
        'entreprise_id', v_entreprise_id,
        'contact_id', v_contact_id
    );
END;
$$;

COMMENT ON FUNCTION public.transfer_lead_to_crm(uuid) IS
'Audit 360 V2b H-10 + bug-hunter F2 : transfert atomique d''un lead prospection vers CRM (entreprise + contact + statut). Idempotent : si lead déjà transféré → P0001 ; si entreprise homonyme existe → réutilise son id (catch 23505).';
