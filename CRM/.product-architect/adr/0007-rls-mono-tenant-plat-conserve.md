# ADR-0007 — RLS mono-tenant plat conservé (pas de per-user), tests adaptés

## Status
Accepted (2026-05-31)

## Context
Le template product-architect impose des policies RLS per-user (`user_id = (select auth.uid())`) + tests pgTAP « ≥ 1 refus par table ». Or le CRM FilmPro est **mono-tenant plat par décision design assumée** (S127 : 3 fondateurs symétriques, ≤ 10 admins @filmpro.ch) : toutes les tables existantes appliquent `FOR ALL TO authenticated USING (true)`. La nouvelle table V3 `contact_suggestions` doit s'aligner sur ce pattern, pas sur le template.

## Decision
`contact_suggestions` reçoit la policy `authenticated_full_access` (`USING (true) WITH CHECK (true)`), identique aux tables existantes. La protection réelle = (a) gate auth obligatoire dans chaque endpoint (`safeGetSession()` → 401), (b) validation Zod stricte, (c) vérif existence parent. **Pas de pgTAP per-table refusal** : il n'y a pas d'isolation per-user à tester (tester `USING (true)` testerait toujours vrai). Critère RLS V3 = test API « 401 sans session » (AC-014) + vérif manuelle prod multi-fondateur documentée dans l'audit secu.

## Consequences
- (+) Cohérent avec le reste du CRM, pas d'asymétrie de modèle de sécurité.
- (+) Pas de sur-ingénierie RLS pour un besoin per-user inexistant aujourd'hui.
- (-) **Aucune isolation entre fondateurs** : tout authentifié voit/modifie toutes les suggestions. Assumé (mono-tenant).
- (-) Les tests Vitest mockent supabase-js → ne prouvent rien sur la RLS runtime (incident S99). Compensé par le gate auth applicatif testé + vérif manuelle.
- (!) **À DURCIR** avant l'ajout d'un 4e utilisateur non-fondateur : passer à `created_by = auth.uid()` (ou rôle admin) + tests d'intégration vraie DB. Trigger documenté.

## References
- `CRM/CLAUDE.md` § Sécurité L-03/L-04 (mono-tenant plat assumé).
- `memory/feedback_rls_multitenant_durcissement_si_4_users.md`
- `memory/feedback_rls_mocks_insufficient_S99.md`
- `~/.claude/rules/quality.md` § RLS Postgres et tests avec mocks.
