-- Migration Jour 6 : Tables prospection (prospect_leads + recherches_sauvegardees)

-- Table principale des leads de prospection
CREATE TABLE prospect_leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source
  source            TEXT NOT NULL CHECK (source IN ('zefix', 'lindas', 'simap', 'sitg', 'search_ch', 'fosc', 'manuel')),
  source_id         TEXT,
  source_url        TEXT,

  -- Identite
  raison_sociale    TEXT NOT NULL,
  nom_contact       TEXT,

  -- Coordonnees
  adresse           TEXT,
  npa               TEXT,
  localite          TEXT,
  canton            TEXT CHECK (canton IN ('GE', 'VD', 'VS', 'NE', 'FR', 'JU', 'Autre')),
  telephone         TEXT,
  site_web          TEXT,
  email             TEXT,

  -- Qualification
  secteur_detecte   TEXT,
  mots_cles_match   TEXT[],
  score_pertinence  INTEGER DEFAULT 0,

  -- Contexte source
  description       TEXT,
  montant           NUMERIC,
  date_publication  TIMESTAMPTZ,

  -- Workflow
  statut            TEXT NOT NULL DEFAULT 'nouveau' CHECK (statut IN ('nouveau', 'interesse', 'ecarte', 'transfere')),
  transfere_vers_contact_id    TEXT REFERENCES contacts(id),
  transfere_vers_entreprise_id TEXT REFERENCES entreprises(id),

  -- Meta
  date_import       TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_modification TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Dedup : un lead = une source + un source_id unique
  UNIQUE(source, source_id)
);

-- Index pour les filtres frequents
CREATE INDEX idx_leads_statut ON prospect_leads(statut);
CREATE INDEX idx_leads_canton ON prospect_leads(canton);
CREATE INDEX idx_leads_score ON prospect_leads(score_pertinence DESC);
CREATE INDEX idx_leads_source ON prospect_leads(source);
CREATE INDEX idx_leads_date ON prospect_leads(date_import DESC);

-- Table des recherches sauvegardees
CREATE TABLE recherches_sauvegardees (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom               TEXT NOT NULL,

  -- Criteres
  sources           TEXT[],
  cantons           TEXT[],
  mots_cles         TEXT[],
  secteurs          TEXT[],
  score_minimum     INTEGER,

  -- Alertes
  alerte_active     BOOLEAN DEFAULT true,
  frequence_alerte  TEXT DEFAULT 'quotidien' CHECK (frequence_alerte IN ('quotidien', 'hebdomadaire')),
  dernier_check     TIMESTAMPTZ,
  nb_nouveaux       INTEGER DEFAULT 0,

  -- Meta
  date_creation     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS : meme politique que le reste du CRM
ALTER TABLE prospect_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE recherches_sauvegardees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON prospect_leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON recherches_sauvegardees
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
