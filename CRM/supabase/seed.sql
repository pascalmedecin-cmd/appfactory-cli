-- Seed jetable Atelier 209 (dette D5) - QA 360 des runs 2+.
-- 100 % factice, jamais de donnee client de prod. Charge par `supabase db reset` sur base
-- fraiche (config.toml [db.seed] sql_paths=["./seed.sql"]). Prerequis : migration
-- 20260715120000_marque_cloisonnement (colonne `marque`). Couvre LES DEUX marques pour
-- tester le cloisonnement (une session filmpro ne doit voir aucune ligne led, et inversement).
--
-- Enums respectes : prospect_leads.source in (zefix,simap,sitg,search_ch,fosc,regbl,minergie,
-- lead_express,google_places) ; statut in (vide,a_contacter,ecarte,transfere) ; canton in
-- (GE,VD,VS,NE,FR,JU) ; opportunites.etape_pipeline in (identification..perdu) ;
-- campagnes.couleur in (c1..c8), statut in (en_cours,active) ; campagne_groupes.nom <= 24 car.
-- Invariant : un lead 'a_contacter' a UNE opportunite 'identification' qui le reference.
--
-- UUID : les ids factices doivent etre RFC-4122-VALIDES (nibble de version = 4, variant = 8/9/a/b),
-- ex. 22222222-0000-4000-8000-0000000000f1. Postgres accepte n'importe quel hexa, mais les routes
-- HTTP valident les ids via `z.string().uuid()` (Zod v4 = strict) : un id « version 0 » passe en
-- base et en test d'integration direct, mais fait 404/400 sur toute route (page campagne, validation).

BEGIN;

-- Nettoyage idempotent (ordre FK-safe : enfants d'abord).
DELETE FROM contact_suggestions    WHERE id::text LIKE '44444444-%';
DELETE FROM prospect_lead_campagnes WHERE lead_id::text LIKE '11111111-%';
DELETE FROM campagne_groupes        WHERE id::text LIKE '33333333-%';
DELETE FROM opportunites            WHERE id LIKE 'seed-%';
DELETE FROM signaux_affaires        WHERE id LIKE 'seed-%';
DELETE FROM prospect_leads          WHERE id::text LIKE '11111111-%';
DELETE FROM contacts                WHERE id LIKE 'seed-%';
DELETE FROM campagnes               WHERE id::text LIKE '22222222-%';
DELETE FROM entreprises             WHERE id LIKE 'seed-%';

-- ============================================================================
-- ENTREPRISES
-- ============================================================================
INSERT INTO entreprises (id, raison_sociale, canton, secteur_activite, source, statut_qualification, marque) VALUES
  -- FilmPro : vitrage / batiment romand
  ('seed-ent-fp-01', 'Regie Lac & Coteaux SA',        'GE', 'Regie immobiliere',  'zefix',        'qualifie', 'filmpro'),
  ('seed-ent-fp-02', 'Atelier Perret Architectes',    'VD', 'Architecture',       'search_ch',    'nouveau',  'filmpro'),
  ('seed-ent-fp-03', 'Chantiers Remy Construction SA', 'GE', 'Construction',       'zefix',        'qualifie', 'filmpro'),
  ('seed-ent-fp-04', 'Clinique du Leman',             'VD', 'Sante',              'google_places','nouveau',  'filmpro'),
  ('seed-ent-fp-05', 'Facility Alpes Services Sarl',  'VS', 'Facility management', 'search_ch',    'nouveau',  'filmpro'),
  ('seed-ent-fp-06', 'Menuiserie Rochat & Fils',      'FR', 'Menuiserie',         'zefix',        'nouveau',  'filmpro'),
  ('seed-ent-fp-07', 'Fiduciaire Rhone Conseil',      'GE', 'Fiduciaire',         'zefix',        'ecarte',   'filmpro'),
  ('seed-ent-fp-08', 'PPE Residence des Vergers',     'NE', 'Copropriete',        'google_places','nouveau',  'filmpro'),
  -- LED Studio : evenementiel / enseignes / stands
  ('seed-ent-led-01', 'Agence evenementielle Pulse SA', 'GE', 'Evenementiel',     'zefix',        'qualifie', 'led'),
  ('seed-ent-led-02', 'Enseignes Lumino Sarl',          'VD', 'Enseignes',        'search_ch',    'nouveau',  'led'),
  ('seed-ent-led-03', 'Stand & Deco Expo SA',           'GE', 'Stands',           'google_places','qualifie', 'led'),
  ('seed-ent-led-04', 'Boutique Vitrine Carouge',       'GE', 'Retail',           'search_ch',    'nouveau',  'led'),
  ('seed-ent-led-05', 'Salon du Bien-etre Lausanne',    'VD', 'Salons',           'google_places','nouveau',  'led'),
  ('seed-ent-led-06', 'Signaletique Meyrin Pro',        'GE', 'Signaletique',     'zefix',        'nouveau',  'led'),
  ('seed-ent-led-07', 'Traiteur Grand Prix Events',     'VD', 'Traiteur',         'search_ch',    'ecarte',   'led'),
  ('seed-ent-led-08', 'Concept Store Riviera',          'VS', 'Retail',           'google_places','nouveau',  'led');

-- ============================================================================
-- CONTACTS (rattaches a une entreprise, meme marque)
-- ============================================================================
INSERT INTO contacts (id, nom, entreprise_id, telephone, email_professionnel, canton, source, statut_qualification, marque) VALUES
  ('seed-ct-fp-01', 'Sylvie Berger',   'seed-ent-fp-01', '+41 22 555 12 01', 'sylvie.berger@lac-coteaux.example',  'GE', 'zefix',     'qualifie', 'filmpro'),
  ('seed-ct-fp-02', 'Marc Perret',     'seed-ent-fp-02', '+41 21 555 12 02', 'm.perret@perret-archi.example',      'VD', 'search_ch', 'nouveau',  'filmpro'),
  ('seed-ct-fp-03', 'Nadia Reymond',   'seed-ent-fp-03', '+41 22 555 12 03', 'n.reymond@remy-construction.example','GE', 'zefix',     'qualifie', 'filmpro'),
  ('seed-ct-led-01', 'Julien Fontaine', 'seed-ent-led-01', '+41 22 555 13 01', 'julien@pulse-events.example',       'GE', 'zefix',     'qualifie', 'led'),
  ('seed-ct-led-02', 'Elodie Vasquez',  'seed-ent-led-02', '+41 21 555 13 02', 'elodie@lumino.example',             'VD', 'search_ch', 'nouveau',  'led'),
  ('seed-ct-led-03', 'Rui Almeida',     'seed-ent-led-03', '+41 22 555 13 03', 'rui@stand-deco.example',            'GE', 'search_ch', 'qualifie', 'led');

-- ============================================================================
-- CONTACT_SUGGESTIONS (brouillons terrain ; PAS de colonne marque -> heritage par
-- l'entreprise parente. Couvre le cloisonnement de la file de validation par jointure.)
-- ============================================================================
INSERT INTO contact_suggestions (id, entreprise_id, nom, prenom, telephone, statut) VALUES
  ('44444444-0000-4000-8000-0000000000f1', 'seed-ent-fp-01',  'Brouillon FP',  'Terrain', '+41 22 555 40 01', 'en_attente'),
  ('44444444-0000-4000-8000-0000000000e1', 'seed-ent-led-01', 'Brouillon LED', 'Terrain', '+41 22 555 40 02', 'en_attente');

-- ============================================================================
-- PROSPECT_LEADS (statuts varies ; ids 11111111-... par marque)
-- ============================================================================
INSERT INTO prospect_leads (id, source, source_id, raison_sociale, canton, telephone, secteur_detecte, score_pertinence, statut, marque) VALUES
  -- FilmPro
  ('11111111-0000-4000-8000-0000000000f1', 'google_places', 'gp-fp-001', 'Regie du Molard SA',        'GE', '+41 22 555 20 01', 'Regie',        8, 'a_contacter', 'filmpro'),
  ('11111111-0000-4000-8000-0000000000f2', 'zefix',         'ide-fp-002', 'Bureau technique Jaquet',  'VD', NULL,               'Ingenierie',   6, 'a_contacter', 'filmpro'),
  ('11111111-0000-4000-8000-0000000000f3', 'search_ch',     'sc-fp-003', 'Renovation Genevoise Sarl', 'GE', '+41 22 555 20 03', 'Renovation',   5, 'vide',        'filmpro'),
  ('11111111-0000-4000-8000-0000000000f4', 'google_places', 'gp-fp-004', 'Climatisation Leman SA',    'VD', '+41 21 555 20 04', 'CVC',          4, 'vide',        'filmpro'),
  ('11111111-0000-4000-8000-0000000000f5', 'zefix',         'ide-fp-005', 'Toitures Fribourg SA',      'FR', NULL,               'Construction', 3, 'ecarte',      'filmpro'),
  -- LED Studio
  ('11111111-0000-4000-8000-0000000000e1', 'google_places', 'gp-led-001', 'Palexpo Concept Events',   'GE', '+41 22 555 30 01', 'Evenementiel', 9, 'a_contacter', 'led'),
  ('11111111-0000-4000-8000-0000000000e2', 'search_ch',     'sc-led-002', 'Vitrine Design Sarl',       'VD', '+41 21 555 30 02', 'Retail',       7, 'a_contacter', 'led'),
  ('11111111-0000-4000-8000-0000000000e3', 'google_places', 'gp-led-003', 'Neon Craft Geneve',         'GE', '+41 22 555 30 03', 'Enseignes',    6, 'vide',        'led'),
  ('11111111-0000-4000-8000-0000000000e4', 'zefix',         'ide-led-004', 'Montage Expo Rapide SA',   'GE', NULL,               'Stands',       5, 'vide',        'led'),
  ('11111111-0000-4000-8000-0000000000e5', 'search_ch',     'sc-led-005', 'Salon Auto Riviera',        'VS', '+41 27 555 30 05', 'Salons',       4, 'ecarte',      'led');

-- Cas Q1 : MEME source_id present dans les 2 marques (autorise) - prouve l'unicite par marque.
INSERT INTO prospect_leads (id, source, source_id, raison_sociale, canton, secteur_detecte, score_pertinence, statut, marque) VALUES
  ('11111111-0000-4000-8000-0000000000f9', 'zefix', 'ide-commun-999', 'Groupe Transverse SA', 'GE', 'Regie',        6, 'vide', 'filmpro'),
  ('11111111-0000-4000-8000-0000000000e9', 'zefix', 'ide-commun-999', 'Groupe Transverse SA', 'GE', 'Evenementiel', 6, 'vide', 'led');

-- ============================================================================
-- OPPORTUNITES (invariant : 1 par lead 'a_contacter', etape identification, meme marque)
-- ============================================================================
INSERT INTO opportunites (id, titre, etape_pipeline, prospect_lead_id, marque) VALUES
  ('seed-opp-fp-01', 'Regie du Molard SA',       'identification', '11111111-0000-4000-8000-0000000000f1', 'filmpro'),
  ('seed-opp-fp-02', 'Bureau technique Jaquet',  'identification', '11111111-0000-4000-8000-0000000000f2', 'filmpro'),
  ('seed-opp-led-01', 'Palexpo Concept Events',  'identification', '11111111-0000-4000-8000-0000000000e1', 'led'),
  ('seed-opp-led-02', 'Vitrine Design Sarl',     'identification', '11111111-0000-4000-8000-0000000000e2', 'led');
-- Quelques opportunites plus avancees (sans lead source, creees "au pipeline")
INSERT INTO opportunites (id, titre, etape_pipeline, marque) VALUES
  ('seed-opp-fp-03', 'Clinique du Leman - films solaires', 'proposition', 'filmpro'),
  ('seed-opp-led-03', 'Stand & Deco Expo - habillage LED', 'negociation', 'led');

-- ============================================================================
-- CAMPAGNES + GROUPES + LIENS (marque coherente de bout en bout)
-- ============================================================================
INSERT INTO campagnes (id, nom, couleur, statut, marque) VALUES
  ('22222222-0000-4000-8000-0000000000f1', 'Regies Geneve T4',      'c1', 'en_cours', 'filmpro'),
  ('22222222-0000-4000-8000-0000000000f2', 'Architectes Vaud',      'c3', 'active',   'filmpro'),
  ('22222222-0000-4000-8000-0000000000e1', 'Enseignes Geneve 2026', 'c5', 'en_cours', 'led'),
  ('22222222-0000-4000-8000-0000000000e2', 'Stands Salons Vaud',    'c7', 'active',   'led');

INSERT INTO campagne_groupes (id, campagne_id, nom, marque) VALUES
  ('33333333-0000-4000-8000-0000000000f1', '22222222-0000-4000-8000-0000000000f1', 'Prioritaires', 'filmpro'),
  ('33333333-0000-4000-8000-0000000000e1', '22222222-0000-4000-8000-0000000000e1', 'Salon EPHJ',   'led');

INSERT INTO prospect_lead_campagnes (lead_id, campagne_id, groupe_id, marque) VALUES
  ('11111111-0000-4000-8000-0000000000f1', '22222222-0000-4000-8000-0000000000f1', '33333333-0000-4000-8000-0000000000f1', 'filmpro'),
  ('11111111-0000-4000-8000-0000000000f3', '22222222-0000-4000-8000-0000000000f1', NULL,                                   'filmpro'),
  ('11111111-0000-4000-8000-0000000000f2', '22222222-0000-4000-8000-0000000000f2', NULL,                                   'filmpro'),
  ('11111111-0000-4000-8000-0000000000e1', '22222222-0000-4000-8000-0000000000e1', '33333333-0000-4000-8000-0000000000e1', 'led'),
  ('11111111-0000-4000-8000-0000000000e3', '22222222-0000-4000-8000-0000000000e1', NULL,                                   'led'),
  ('11111111-0000-4000-8000-0000000000e2', '22222222-0000-4000-8000-0000000000e2', NULL,                                   'led');

-- ============================================================================
-- SIGNAUX (Q2 : FilmPro-only ce run ; l'environnement LED n'a aucun signal)
-- ============================================================================
INSERT INTO signaux_affaires (id, type_signal, statut_traitement, marque) VALUES
  ('seed-sig-fp-01', 'appel_offres',      'nouveau', 'filmpro'),
  ('seed-sig-fp-02', 'permis_construire', 'a_suivre', 'filmpro');

COMMIT;
