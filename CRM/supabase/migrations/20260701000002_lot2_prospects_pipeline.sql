-- Lot 2 - Prospects + Pipeline
--
-- 1. Statuts prospect simplifiés : VIDE (défaut après import, "à trier") /
--    a_contacter (entre au pipeline) / ecarte (masqué, réactivable).
--    'transfere' conservé pour la conversion client depuis le pipeline.
--    Remap des données : nouveau -> vide, interesse -> a_contacter.
--
--    Ordre OBLIGATOIRE (leçon Lot 1 Signaux, cf. feedback_migration_enum_drop_check_avant_update) :
--    DROP CHECK -> UPDATE data -> ADD CHECK -> DEFAULT. Inverser provoque un
--    rejet 23514 (l'UPDATE écrit une valeur que l'ancien CHECK refuse encore).

ALTER TABLE prospect_leads DROP CONSTRAINT IF EXISTS prospect_leads_statut_check;

UPDATE prospect_leads SET statut = 'vide'        WHERE statut = 'nouveau';
UPDATE prospect_leads SET statut = 'a_contacter' WHERE statut = 'interesse';
-- 'ecarte' et 'transfere' restent inchangés.

ALTER TABLE prospect_leads
  ADD CONSTRAINT prospect_leads_statut_check
  CHECK (statut IN ('vide', 'a_contacter', 'ecarte', 'transfere'));

ALTER TABLE prospect_leads ALTER COLUMN statut SET DEFAULT 'vide';

-- 2. Lien opportunité <- prospect d'origine.
--    Un prospect « à contacter » crée une opportunité (étape identification)
--    qui le référence via cette colonne, puis disparaît de la file de prospection.
--    Nullable : les opportunités créées manuellement au pipeline n'ont pas de
--    prospect source. ON DELETE SET NULL : l'opportunité survit à la suppression
--    du prospect (elle a sa propre valeur métier au pipeline).
ALTER TABLE opportunites
  ADD COLUMN IF NOT EXISTS prospect_lead_id uuid
    REFERENCES prospect_leads(id) ON DELETE SET NULL;

-- Index UNIQUE partiel : idempotence garantie côté base — un prospect a AU PLUS
-- une opportunité liée. L'action « à contacter » ne crée jamais de doublon, même
-- en double-clic ou concurrence 3 fondateurs. Plusieurs NULL restent autorisés
-- (opportunités créées manuellement au pipeline, sans prospect source).
CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunites_prospect_lead
  ON opportunites(prospect_lead_id) WHERE prospect_lead_id IS NOT NULL;

-- 3. RPC « à contacter » : passe le prospect à a_contacter ET crée l'opportunité
--    d'entrée au pipeline (étape identification), de façon ATOMIQUE et idempotente.
--    Appelée par le sidepane prospect ET le widget de tri matinal (invariant unique).
--    FOR UPDATE verrouille le lead : un seul des N fondateurs concurrents crée l'opp.
CREATE OR REPLACE FUNCTION public.mark_lead_for_contact(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_lead RECORD;
  v_opp_id text;
  v_created boolean := false;
BEGIN
  SELECT id, statut, raison_sociale INTO v_lead
  FROM public.prospect_leads WHERE id = p_lead_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead introuvable: %', p_lead_id USING ERRCODE = 'P0002';
  END IF;

  -- On n'entre au pipeline que depuis 'vide' (à trier). 'a_contacter' = déjà entré
  -- (double-clic / 2e fondateur) -> idempotent : on retourne l'opportunité existante.
  -- 'ecarte'/'transfere' -> conflit : ne pas ressusciter un lead écarté/converti.
  IF v_lead.statut NOT IN ('vide', 'a_contacter') THEN
    RAISE EXCEPTION 'lead_not_triable: %', v_lead.statut USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_opp_id
  FROM public.opportunites WHERE prospect_lead_id = p_lead_id LIMIT 1;

  IF v_opp_id IS NULL THEN
    v_opp_id := gen_random_uuid()::text;
    INSERT INTO public.opportunites (
      id, titre, etape_pipeline, prospect_lead_id, date_creation, date_derniere_modification
    ) VALUES (
      v_opp_id, v_lead.raison_sociale, 'identification', p_lead_id, now(), now()
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

COMMENT ON FUNCTION public.mark_lead_for_contact(uuid) IS
'Lot 2 : passe un prospect « à contacter » (statut a_contacter) + crée l''opportunité d''entrée au pipeline (étape identification). Atomique + idempotent (FOR UPDATE + idx unique partiel = 1 opp max par lead).';

-- 4. Backfill des opportunités pour les prospects remappés interesse -> a_contacter.
--    Sans ça, les prospects historiquement « intéressés » deviennent a_contacter SANS
--    opportunité liée : invisibles en prospection (filtre = statut vide) ET absents du
--    pipeline (chargé depuis opportunites) = perdus. On leur crée l'opportunité d'entrée,
--    exactement comme le ferait la RPC mark_lead_for_contact (invariant a_contacter => opp).
--    L'index UNIQUE partiel garantit l'idempotence si la migration est rejouée.
INSERT INTO opportunites (id, titre, etape_pipeline, prospect_lead_id, date_creation, date_derniere_modification)
SELECT gen_random_uuid()::text, pl.raison_sociale, 'identification', pl.id, now(), now()
FROM prospect_leads pl
WHERE pl.statut = 'a_contacter'
  AND NOT EXISTS (SELECT 1 FROM opportunites o WHERE o.prospect_lead_id = pl.id);

-- 5. Durcissement concurrence de transfer_lead_to_crm (audit Lot 2).
--    Au Lot 2, « Convertir en client » (convertToClient) devient le SEUL chemin
--    prospect -> entreprise et s'appuie sur cette RPC. Sans verrou de ligne, deux
--    fondateurs concurrents sur la même opportunité franchissent tous deux le garde
--    d'idempotence P0001 (READ COMMITTED) et créent un contact dupliqué (contacts n'a
--    pas de contrainte unique). On aligne sur mark_lead_for_contact : SELECT ... FOR UPDATE
--    sérialise les appels -> le 2e relit statut='transfere' et lève proprement P0001.
--    Seul changement vs migration 20260510000008 : le FOR UPDATE au SELECT du lead.
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
    -- 1. Récupérer le lead source (FOR UPDATE : verrou de ligne anti-concurrence).
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
            date_import_ajout, date_derniere_modification
        )
        VALUES (
            v_entreprise_id, v_lead.raison_sociale, NULLIF(v_lead.canton, ''), v_adresse,
            NULLIF(v_lead.source_id, ''), NULLIF(v_lead.site_web, ''),
            NULLIF(v_lead.secteur_detecte, ''), 'prospection (' || v_lead.source || ')',
            NULLIF(v_lead.description, ''), 'nouveau', v_ts, v_ts
        );
    EXCEPTION WHEN unique_violation THEN
        SELECT id
        INTO v_existing_entreprise_id
        FROM public.entreprises
        WHERE lower(immutable_unaccent(raison_sociale)) = lower(immutable_unaccent(v_lead.raison_sociale))
          AND statut_archive = false
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
            date_ajout, date_derniere_modification
        )
        VALUES (
            v_contact_id, v_lead.nom_contact, v_entreprise_id, NULLIF(v_lead.telephone, ''),
            NULLIF(v_lead.email, ''), NULLIF(v_lead.canton, ''),
            'prospection (' || v_lead.source || ')', 'nouveau', false, false, false, v_ts, v_ts
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
