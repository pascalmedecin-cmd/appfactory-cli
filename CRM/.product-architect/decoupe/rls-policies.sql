-- ============================================================================
-- rls-policies.sql - Outil « Découpe Films ». Phase 2 specs (2026-06-05).
-- Doctrine : MONO-TENANT PLAT (3 fondateurs @filmpro.ch symétriques) - cf. ADR-0004
--   + CRM CLAUDE.md § Sécurité L-03/L-04. Tout authentifié voit/écrit tout.
--   `created_by` = traçabilité, PAS isolation. À DURCIR si 4e user non-fondateur
--   (created_by = auth.uid() + tests pgTAP) - cf. feedback_rls_multitenant_durcissement_si_4_users.
-- Perf : `auth.uid()` est stable par requête ; pattern aligné sur 20260531_001_v3_mobile_terrain.sql.
-- ============================================================================

ALTER TABLE decoupe_produits  ENABLE ROW LEVEL SECURITY;
ALTER TABLE decoupe_chantiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE decoupe_vitres    ENABLE ROW LEVEL SECURITY;

-- Produits : tout authentifié gère le catalogue (mono-tenant plat).
CREATE POLICY decoupe_produits_all ON decoupe_produits
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Chantiers : idem.
CREATE POLICY decoupe_chantiers_all ON decoupe_chantiers
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Vitres : idem. (L'intégrité chantier/produit est portée par les FK, pas la RLS.)
CREATE POLICY decoupe_vitres_all ON decoupe_vitres
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ⚠️ RISQUE OUVERT (hérité du projet) : les tests Vitest mockent supabase-js et ne prouvent RIEN
-- sur la RLS réelle. Couverture RLS = tests pgTAP intégration vraie DB (AC Phase 4), ≥ 1 refus
-- non-authentifié par table. cf. CRM CLAUDE.md § RISQUES OUVERTS (M-48).
