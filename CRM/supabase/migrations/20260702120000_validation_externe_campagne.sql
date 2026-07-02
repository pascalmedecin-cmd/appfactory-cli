-- Validation externe des prospects d'une campagne (2026-07-02).
--
-- Besoin métier : avant l'impression des étiquettes / le mailing, une personne de l'équipe
-- SANS compte CRM vérifie chaque prospect (fiche Google Maps) et marque « garder » ou
-- « retirer ». Elle reçoit un LIEN SECRET (page publique /validation/<token>) ; ses décisions
-- sont enregistrées sur le lien N-N prospect<->campagne ; un fondateur applique ensuite les
-- retraits depuis la page campagne (droit de regard : elle ne supprime jamais rien elle-même).
--
-- Sécurité :
--  - le token n'est JAMAIS stocké en clair : uniquement son empreinte SHA-256 (hex). Un dump
--    de la table ne permet pas de reconstruire les liens de validation.
--  - expiration courte (2 jours, décision Pascal 02/07) + révocation manuelle (revoked_at).
--  - RLS : accès authenticated uniquement (fondateurs). La page publique passe par le client
--    service role côté serveur, APRÈS résolution du token - aucune policy anon.
--
-- Idempotent : IF NOT EXISTS / DROP POLICY IF EXISTS avant CREATE POLICY.

-- 1) Liens de validation (au plus UN lien actif par campagne, géré côté serveur :
--    la génération révoque les liens actifs précédents).
CREATE TABLE IF NOT EXISTS campagne_validation_liens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campagne_id   UUID NOT NULL REFERENCES campagnes(id) ON DELETE CASCADE,
  -- SHA-256 hex du token (64 chars). Jamais le token en clair.
  token_hash    TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked_at    TIMESTAMPTZ,
  created_by    UUID,
  date_creation TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Résolution par token (page publique) : l'index UNIQUE sur token_hash couvre déjà le lookup.
-- Liste des liens d'une campagne (état « lien actif » de la page campagne).
CREATE INDEX IF NOT EXISTS idx_cvl_campagne ON campagne_validation_liens (campagne_id, date_creation DESC);

-- Invariant « au plus UN lien NON RÉVOQUÉ par campagne », garanti EN BASE (spec §2, décision build
-- 02/07). La génération d'un lien révoque d'abord les précédents (revoked_at), mais la séquence
-- révoque-puis-insère n'est pas atomique : cet index partiel rend l'invariant infalsifiable même en
-- cas de génération concurrente sur la même campagne (la 2ᵉ insertion échoue en 23505 plutôt que de
-- créer un 2ᵉ lien actif). Coût nul, additif. (Un lien expiré mais non révoqué reste couvert : la
-- prochaine génération le révoque avant d'insérer.)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_cvl_actif_par_campagne
  ON campagne_validation_liens (campagne_id)
  WHERE revoked_at IS NULL;

-- 2) Décision de validation portée par le lien N-N (même doctrine que groupe_id : la décision
--    vaut pour CE prospect DANS CETTE campagne). NULL = pas encore vérifié.
ALTER TABLE prospect_lead_campagnes
  ADD COLUMN IF NOT EXISTS validation_statut TEXT
    CHECK (validation_statut IN ('garder', 'retirer')),
  ADD COLUMN IF NOT EXISTS validation_at TIMESTAMPTZ;

-- 3) RLS : fondateurs (authenticated) uniquement. La page publique ne touche JAMAIS ces tables
--    avec la clé anon : résolution token + écriture décision passent par service role serveur.
ALTER TABLE campagne_validation_liens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_full_access" ON campagne_validation_liens;
CREATE POLICY "authenticated_full_access" ON campagne_validation_liens
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE campagne_validation_liens IS
  'Liens de validation externe d''une campagne (2026-07-02). token_hash = SHA-256 hex (jamais le token en clair), expiration 2 jours, révocable. Page publique /validation/<token> via service role serveur.';
COMMENT ON COLUMN prospect_lead_campagnes.validation_statut IS
  'Décision de validation externe pour CE prospect DANS cette campagne : garder / retirer / NULL (pas encore vérifié). Le retrait effectif reste un geste fondateur (« Appliquer »).';
