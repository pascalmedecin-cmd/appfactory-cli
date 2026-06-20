# ADR-0004 - RLS mono-tenant plat pour les tables decoupe_*

## Status
Accepted (2026-06-05). Hérite de la doctrine projet (CRM CLAUDE.md § Sécurité L-03/L-04).

## Context
Le CRM FilmPro est mono-tenant : 3 fondateurs @filmpro.ch symétriques, qui voient et modifient toutes les
données (décision S127 assumée). Toutes les tables métier portent une RLS « plate »
(`FOR ALL TO authenticated`). Découpe Films vit dans la même base et la même population d'utilisateurs ;
aucune raison d'introduire une isolation par utilisateur sur les chantiers/vitres/produits.

## Decision
- Les 3 tables `decoupe_produits`, `decoupe_chantiers`, `decoupe_vitres` ont une RLS **mono-tenant plat** :
  `FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)`
  (pattern aligné sur `20260531_001_v3_mobile_terrain.sql`).
- `created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL` = **traçabilité**, pas isolation.
- Couverture : tests **pgTAP** vraie DB (≥ 1 refus non authentifié par table, AC-018). Les tests Vitest
  mockent supabase-js et ne prouvent RIEN sur la RLS réelle (M-48).

## Consequences
- (+) Cohérent avec tout le CRM ; les 3 fondateurs collaborent sans friction d'accès.
- (+) Surface RLS simple à auditer.
- (-) Aucune cloison entre fondateurs (assumé, comme le reste du CRM).
- (-) **À durcir avant un 4e utilisateur non-fondateur** : passer à `created_by = auth.uid()` (ou rôle) +
  tests d'intégration session non-admin. cf. `feedback_rls_multitenant_durcissement_si_4_users`.

## References
- CRM CLAUDE.md § Sécurité (L-03/L-04), § RISQUES OUVERTS (M-48).
- `memory/feedback_rls_multitenant_durcissement_si_4_users.md`, `feedback_rls_mocks_insufficient_S99.md`.
- `rls-policies.sql`, AC-018.
