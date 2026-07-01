-- Ajouter source_id et score_pertinence à signaux_affaires
-- pour la veille automatique (cron signaux)

alter table signaux_affaires
  add column source_id text,
  add column score_pertinence integer default 0;

-- Contrainte unique pour dédup : même source + même identifiant = pas de doublon
create unique index idx_signaux_source_dedup
  on signaux_affaires(source_officielle, source_id)
  where source_id is not null;

-- Index pour filtrage par score
create index idx_signaux_score on signaux_affaires(score_pertinence);
