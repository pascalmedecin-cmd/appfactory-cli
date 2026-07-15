-- Run 1 Atelier 209 (2026-07-15) - dette D1 : modèle de rôles admin / superuser.
--
-- Source de vérité des listes = src/lib/server/roles.ts (DEFAULT_ADMIN_EMAILS /
-- DEFAULT_SUPERUSER_EMAILS). src/lib/server/roles.test.ts échoue si ces littéraux
-- divergent des constantes TS (garde-fou anti-dérive).
--
-- Décision Pascal 2026-07-15 : l'édition des mots-clés Signaux passe de « tout le
-- domaine @filmpro.ch » (ancien LIKE) à « admin + superuser nommés » (IN d'une liste
-- close) ; c'est un RESSERREMENT (plus sûr), pas un élargissement. Les retours (/log)
-- restent réservés à l'admin (Pascal), désormais sur ses deux adresses. Chaque rôle
-- porte ses deux adresses (@filmpro.ch transition + @lamaisoncreativedirection.ch cible)
-- pour ne verrouiller personne pendant la bascule de domaine.
--
-- Gate serveur aligné : src/routes/crm/log/+page.server.ts (isAdmin) et
-- src/routes/crm/signaux/+page.server.ts (isEditor). La RLS reste le second filet
-- (defense-in-depth), donc gate et RLS doivent lister les mêmes emails.
--
-- Reste sur `auth.jwt() ->> 'email'` (sans état de session, sans GUC) : reco V3 du Run 0.
-- Idempotent (DROP IF EXISTS + CREATE) ; noms de policies inchangés (bascule propre).

-- ============================================================
-- feedback_entries : UPDATE réservé ADMIN (Pascal, 2 adresses).
-- ============================================================
DROP POLICY IF EXISTS "feedback_entries_update_admin" ON public.feedback_entries;
CREATE POLICY "feedback_entries_update_admin" ON public.feedback_entries
  FOR UPDATE TO authenticated
  USING (
    lower(auth.jwt() ->> 'email') IN (
      'pascal@filmpro.ch',
      'pascal@lamaisoncreativedirection.ch'
    )
  )
  WITH CHECK (
    lower(auth.jwt() ->> 'email') IN (
      'pascal@filmpro.ch',
      'pascal@lamaisoncreativedirection.ch'
    )
  );

-- ============================================================
-- signaux_mots_cles : INSERT / UPDATE / DELETE réservés ÉDITEURS
-- (admin Pascal + superuser Antoine, 2 adresses chacun).
-- ============================================================
DROP POLICY IF EXISTS "signaux_mots_cles_admin_insert" ON public.signaux_mots_cles;
CREATE POLICY "signaux_mots_cles_admin_insert" ON public.signaux_mots_cles
  FOR INSERT TO authenticated
  WITH CHECK (
    lower(auth.jwt() ->> 'email') IN (
      'pascal@filmpro.ch',
      'pascal@lamaisoncreativedirection.ch',
      'antoine@filmpro.ch',
      'antoine@lamaisoncreativedirection.ch'
    )
  );

DROP POLICY IF EXISTS "signaux_mots_cles_admin_update" ON public.signaux_mots_cles;
CREATE POLICY "signaux_mots_cles_admin_update" ON public.signaux_mots_cles
  FOR UPDATE TO authenticated
  USING (
    lower(auth.jwt() ->> 'email') IN (
      'pascal@filmpro.ch',
      'pascal@lamaisoncreativedirection.ch',
      'antoine@filmpro.ch',
      'antoine@lamaisoncreativedirection.ch'
    )
  )
  WITH CHECK (
    lower(auth.jwt() ->> 'email') IN (
      'pascal@filmpro.ch',
      'pascal@lamaisoncreativedirection.ch',
      'antoine@filmpro.ch',
      'antoine@lamaisoncreativedirection.ch'
    )
  );

DROP POLICY IF EXISTS "signaux_mots_cles_admin_delete" ON public.signaux_mots_cles;
CREATE POLICY "signaux_mots_cles_admin_delete" ON public.signaux_mots_cles
  FOR DELETE TO authenticated
  USING (
    lower(auth.jwt() ->> 'email') IN (
      'pascal@filmpro.ch',
      'pascal@lamaisoncreativedirection.ch',
      'antoine@filmpro.ch',
      'antoine@lamaisoncreativedirection.ch'
    )
  );

COMMENT ON TABLE public.feedback_entries IS
  'Spec page-log-2026-05-13/spec.md : retours utilisateurs. RLS lecture publique authentifié, insert authentifié, update ADMIN uniquement (Atelier 209 : pascal@filmpro.ch + pascal@lamaisoncreativedirection.ch). Source des rôles : src/lib/server/roles.ts.';

COMMENT ON TABLE public.signaux_mots_cles IS
  'Mots-clés FilmPro pilotant le scoring v2 des signaux. Cœur=+5, Bonus=+2, Éviter=-3. Édité via /signaux par admin + superuser (Atelier 209 : Pascal + Antoine, source src/lib/server/roles.ts).';
