-- Archivage entreprises : traçabilité nettoyage mensuel Zefix
alter table entreprises
  add column if not exists statut_archive boolean not null default false,
  add column if not exists archivee_at timestamptz,
  add column if not exists motif_archivage text,
  add column if not exists date_derniere_verification_zefix timestamptz;

create index if not exists idx_entreprises_verif_zefix
  on entreprises (date_derniere_verification_zefix nulls first)
  where numero_ide is not null and statut_archive = false;
