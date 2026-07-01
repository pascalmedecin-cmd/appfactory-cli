-- REG-01 cause 2 (racine) : la FK prospect_leads.transfere_vers_entreprise_id
-- était créée sans clause ON DELETE (=> NO ACTION). Toute entreprise issue d'un
-- transfert de lead devenait définitivement non supprimable (erreur 23503
-- générique). Les FK soeurs (contacts.entreprise_id, opportunites.entreprise_id)
-- sont déjà ON DELETE SET NULL : on aligne. Supprimer l'entreprise dénoue le lien
-- côté lead (le lead conserve son statut 'transfere', le pointeur passe à NULL).
--
-- Idempotent : on droppe la contrainte si elle existe avant de la recréer.

ALTER TABLE prospect_leads
  DROP CONSTRAINT IF EXISTS prospect_leads_transfere_vers_entreprise_id_fkey;

ALTER TABLE prospect_leads
  ADD CONSTRAINT prospect_leads_transfere_vers_entreprise_id_fkey
    FOREIGN KEY (transfere_vers_entreprise_id)
    REFERENCES entreprises(id)
    ON DELETE SET NULL;
