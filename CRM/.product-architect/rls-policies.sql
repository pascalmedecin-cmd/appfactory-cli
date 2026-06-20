-- =============================================================================
-- RLS POLICIES — CRM FilmPro mobile V3 « outil terrain »
-- Phase 2 product-architect. Date : 2026-05-31.
--
-- DÉCISION PROJET (non template) : RLS « mono-tenant plat ».
-- Le CRM FilmPro est mono-tenant ≤ 10 admins @filmpro.ch (3 fondateurs
-- symétriques). Toutes les tables appliquent `FOR ALL TO authenticated
-- USING (true)`. Ce N'EST PAS le pattern per-user `user_id = auth.uid()` du
-- template product-architect : on respecte la décision design assumée du projet
-- (CLAUDE.md § Sécurité L-03/L-04). Voir ADR-0007.
--
-- À DURCIR avant l'ajout d'un 4e utilisateur non-fondateur (mémoire
-- feedback_rls_multitenant_durcissement_si_4_users.md).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- prospect_visits — déjà RLS-protégée (migration 20260430_001).
-- Les colonnes ajoutées en V3 (resultat, note) héritent de la policy existante,
-- aucune nouvelle policy nécessaire. Rappel de la policy en place :
-- -----------------------------------------------------------------------------
--   ALTER TABLE prospect_visits ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY "authenticated_full_access" ON prospect_visits
--     FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- (inchangée)


-- -----------------------------------------------------------------------------
-- prospect_photos — déjà RLS-protégée (migration 20260430_001), inchangée.
-- -----------------------------------------------------------------------------
-- (réutilisée telle quelle)


-- -----------------------------------------------------------------------------
-- contact_suggestions — nouvelle table V3.
-- Policy mono-tenant plat alignée sur les tables existantes du projet.
-- -----------------------------------------------------------------------------
ALTER TABLE contact_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON contact_suggestions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "authenticated_full_access" ON contact_suggestions IS
  'Mono-tenant plat assumé (3 fondateurs FilmPro). À durcir created_by/role si 4e user non-fondateur — voir ADR-0007.';


-- -----------------------------------------------------------------------------
-- DÉFENSE EN PROFONDEUR APPLICATIVE (la RLS plate ne suffit pas seule)
-- -----------------------------------------------------------------------------
-- La RLS `USING (true)` n'isole rien entre fondateurs : la protection réelle est
-- (a) authentification obligatoire (session OTP @filmpro.ch) vérifiée dans
--     chaque endpoint via `locals.safeGetSession()` → 401 si pas de session ;
-- (b) validation Zod stricte sur tous les bodies d'écriture (résultat ∈ enum,
--     longueurs bornées, au moins un identifiant pour une suggestion) ;
-- (c) vérification d'existence du parent (entreprise) avant insert (anti
--     énumération + FK safe), pattern déjà appliqué dans /api/visits + /api/photos.
--
-- TEST RLS (Phase 4) : la suite Vitest mocke supabase-js → ne prouve RIEN sur la
-- RLS runtime (incident S99). Pour V3, étant donné le design mono-tenant plat
-- (pas de refus per-user à tester), le critère RLS est :
--   1. Test API : appel sans session → 401 (Vitest, mockable, prouve le gate auth).
--   2. Vérif manuelle prod/staging : un 2e compte fondateur voit bien la donnée
--      (comportement attendu mono-tenant), documenté dans l'audit secu daté.
-- Pas de pgTAP per-table refusal ici car il n'y a pas d'isolation per-user à
-- tester (ce serait tester `USING (true)` qui retourne toujours vrai). Voir ADR-0007.
