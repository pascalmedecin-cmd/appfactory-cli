-- Spec : notes/page-log-2026-05-13/spec.md
-- Module : page /log + bouton flottant global, livraison client antoine@filmpro.ch.
-- Capture les retours utilisateurs (bugs + suggestions + questions) saisis depuis
-- n'importe quelle page du CRM. RLS « lecture publique authentifié, insert
-- authentifié, update admin uniquement » (cohérent doctrine mono-tenant fondateurs).

CREATE TABLE IF NOT EXISTS public.feedback_entries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email text NOT NULL,
  type             text NOT NULL CHECK (type IN ('bug', 'suggestion', 'question')),
  severity         text CHECK (severity IN ('bloquant', 'genant', 'mineur')),
  page             text NOT NULL CHECK (char_length(page) BETWEEN 1 AND 100),
  description      text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 1000),
  context          jsonb NOT NULL DEFAULT '{}'::jsonb,
  status           text NOT NULL DEFAULT 'nouveau'
                     CHECK (status IN ('nouveau', 'a_actionner', 'traite', 'logge')),
  admin_notes      text CHECK (admin_notes IS NULL OR char_length(admin_notes) <= 2000),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  -- Sévérité obligatoire ssi type=bug.
  CONSTRAINT feedback_severity_iff_bug CHECK (
    (type = 'bug' AND severity IS NOT NULL)
    OR (type IN ('suggestion', 'question') AND severity IS NULL)
  )
);

CREATE INDEX idx_feedback_created_at_desc ON public.feedback_entries (created_at DESC);
CREATE INDEX idx_feedback_status ON public.feedback_entries (status);
CREATE INDEX idx_feedback_type ON public.feedback_entries (type);

ALTER TABLE public.feedback_entries ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les authentifiés voient tout (cohérent doctrine mono-tenant).
CREATE POLICY "feedback_entries_read" ON public.feedback_entries
  FOR SELECT TO authenticated USING (true);

-- Insert : tout authentifié peut créer une entrée. created_by forcé à auth.uid()
-- côté policy (WITH CHECK), created_by_email rempli côté serveur depuis user.email.
CREATE POLICY "feedback_entries_insert" ON public.feedback_entries
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Update : réservé admin (changement statut + admin_notes uniquement).
-- L'admin est identifié par email JWT (cohérent pattern auth allowlist).
-- Defense in depth : la form action côté serveur double-check isAdminEmail(user.email)
-- avant la mutation, donc si la JWT ne propage pas 'email' la RLS reste un second filet.
-- Audit secu 2026-05-13 LOW-1 : comparaison via lower() pour s'aligner sur le check
-- serveur (admin.ts.isAdminEmail toLowerCase). Sans ça, un JWT mixed-case
-- passe le check serveur mais voit la RLS bloquer silencieusement (0 lignes update).
CREATE POLICY "feedback_entries_update_admin" ON public.feedback_entries
  FOR UPDATE TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'pascal@filmpro.ch')
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'pascal@filmpro.ch');

-- Delete : interdit côté client. Pas de policy DELETE = refus par défaut.
-- Suppression possible uniquement via service_role (script ops).

-- Trigger updated_at automatique (pattern aligné veille_themes 20260505_001).
CREATE OR REPLACE FUNCTION feedback_entries_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS feedback_entries_updated_at ON public.feedback_entries;
CREATE TRIGGER feedback_entries_updated_at
  BEFORE UPDATE ON public.feedback_entries
  FOR EACH ROW
  EXECUTE FUNCTION feedback_entries_set_updated_at();

COMMENT ON TABLE public.feedback_entries IS
'Spec page-log-2026-05-13/spec.md : retours utilisateurs (bugs + suggestions + questions) saisis depuis le bouton flottant ou la page /log. RLS lecture publique authentifié, insert authentifié, update admin uniquement (pascal@filmpro.ch).';
