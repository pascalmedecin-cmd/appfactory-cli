-- FilmPro CRM — Schema PostgreSQL
-- Migration depuis Google Sheets CRM_DB
-- 8 tables, foreign keys, RLS

-- ============================================================
-- UTILISATEURS (reference table, created first)
-- ============================================================
create table utilisateurs (
  id text primary key,
  prenom text not null,
  nom text not null,
  email_connexion text unique not null,
  role text not null default 'utilisateur',
  niveau_acces text not null default 'lecture',
  date_ajout timestamptz not null default now(),
  actif boolean not null default true
);

-- ============================================================
-- ENTREPRISES
-- ============================================================
create table entreprises (
  id text primary key,
  raison_sociale text not null,
  numero_ide text,
  secteur_activite text,
  segment_cible text,
  canton text,
  adresse_siege text,
  site_web text,
  taille_estimee text,
  source text,
  statut_qualification text,
  score_priorite integer default 0,
  tags text,
  notes_libres text,
  responsable_filmpro text,
  date_import_ajout timestamptz default now(),
  date_derniere_modification timestamptz default now()
);

-- ============================================================
-- CONTACTS
-- ============================================================
create table contacts (
  id text primary key,
  prenom text,
  nom text,
  entreprise_id text references entreprises(id) on delete set null,
  role_fonction text,
  segment text,
  email_professionnel text,
  statut_email text,
  telephone text,
  canton text,
  adresse text,
  tags text,
  notes_libres text,
  source text,
  statut_qualification text,
  score_priorite integer default 0,
  est_prescripteur boolean default false,
  responsable_filmpro text,
  date_ajout timestamptz default now(),
  date_derniere_modification timestamptz default now(),
  date_dernier_echange timestamptz,
  doublon_detecte boolean default false,
  fiche_fusionnee_avec text,
  statut_archive boolean default false
);

-- ============================================================
-- SIGNAUX_AFFAIRES
-- ============================================================
create table signaux_affaires (
  id text primary key,
  type_signal text,
  canton text,
  commune text,
  description_projet text,
  maitre_ouvrage text,
  contact_maitre_ouvrage_id text references contacts(id) on delete set null,
  architecte_bureau text,
  source_officielle text,
  date_publication timestamptz,
  date_detection timestamptz default now(),
  statut_traitement text,
  opportunite_associee_id text, -- FK added after opportunites creation
  responsable_filmpro text,
  notes_libres text
);

-- ============================================================
-- OPPORTUNITES
-- ============================================================
create table opportunites (
  id text primary key,
  titre text not null,
  contact_id text references contacts(id) on delete set null,
  entreprise_id text references entreprises(id) on delete set null,
  etape_pipeline text,
  montant_estime numeric(12,2) default 0,
  responsable text,
  date_creation timestamptz default now(),
  date_relance_prevue timestamptz,
  date_cloture_effective timestamptz,
  motif_perte text,
  prescripteur_origine text,
  lie_signal_affaires boolean default false,
  signal_affaires_id text references signaux_affaires(id) on delete set null,
  notes_libres text,
  tags text,
  date_derniere_modification timestamptz default now()
);

-- FK circulaire signaux_affaires -> opportunites
alter table signaux_affaires
  add constraint fk_signaux_opportunite
  foreign key (opportunite_associee_id) references opportunites(id) on delete set null;

-- ============================================================
-- PRESCRIPTEURS
-- ============================================================
create table prescripteurs (
  id text primary key,
  contact_id text references contacts(id) on delete cascade,
  nb_affaires_recommandees integer default 0,
  valeur_totale_generee numeric(12,2) default 0,
  nb_affaires_gagnees integer default 0,
  nb_affaires_en_cours integer default 0,
  date_derniere_recommandation timestamptz,
  niveau_activite text,
  notes_relation text,
  date_ajout_prescripteur timestamptz default now()
);

-- ============================================================
-- ACTIVITES
-- ============================================================
create table activites (
  id text primary key,
  type_activite text not null,
  auteur_id text references utilisateurs(id) on delete set null,
  contact_id text references contacts(id) on delete set null,
  opportunite_id text references opportunites(id) on delete set null,
  date_heure timestamptz not null default now(),
  resume_contenu text,
  prochaine_action text,
  date_prochaine_action timestamptz
);

-- ============================================================
-- IMPORTS_ZEFIX
-- ============================================================
create table imports_zefix (
  id text primary key,
  date_import timestamptz not null default now(),
  realise_par_id text references utilisateurs(id) on delete set null,
  cantons_filtres text,
  secteurs_filtres text,
  nb_entreprises_importees integer default 0,
  nb_doublons_detectes integer default 0,
  nb_nouvelles_fiches integer default 0,
  statut_import text,
  notes_campagne text
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_contacts_entreprise on contacts(entreprise_id);
create index idx_contacts_email on contacts(email_professionnel);
create index idx_opportunites_contact on opportunites(contact_id);
create index idx_opportunites_entreprise on opportunites(entreprise_id);
create index idx_opportunites_pipeline on opportunites(etape_pipeline);
create index idx_activites_contact on activites(contact_id);
create index idx_activites_opportunite on activites(opportunite_id);
create index idx_signaux_statut on signaux_affaires(statut_traitement);
create index idx_prescripteurs_contact on prescripteurs(contact_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- Single-tenant pour l'instant : user authentifie = acces total
-- ============================================================
alter table utilisateurs enable row level security;
alter table entreprises enable row level security;
alter table contacts enable row level security;
alter table signaux_affaires enable row level security;
alter table opportunites enable row level security;
alter table prescripteurs enable row level security;
alter table activites enable row level security;
alter table imports_zefix enable row level security;

-- Policy : authenticated users have full access
create policy "Authenticated full access" on utilisateurs
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on entreprises
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on contacts
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on signaux_affaires
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on opportunites
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on prescripteurs
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on activites
  for all using (auth.role() = 'authenticated');

create policy "Authenticated full access" on imports_zefix
  for all using (auth.role() = 'authenticated');
