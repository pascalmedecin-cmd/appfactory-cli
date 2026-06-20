# ADR-0004 — Feature flag neuf `ff_crm_mobile_v3` + rollback de `ff_crm_mobile_v2`

## Status
Accepted (2026-05-31)

## Context
La V2 a posé un flag `ff_crm_mobile_v2` (JWT custom claims Supabase `raw_app_meta_data`, lu par `src/lib/types/feature-flags.ts`), actif sur `pascal@filmpro.ch`. La V2 est abandonnée. Deux options : recycler le flag V2 (bascule sémantique) ou en créer un neuf.

## Decision
Créer un flag neuf **`ff_crm_mobile_v3`** (sémantique propre, lecture analogue dans `feature-flags.ts`) et **retirer complètement `ff_crm_mobile_v2`** (kill switch sur tous les users + suppression du champ d'interface `ffCrmMobileV2` une fois le code V2 rollback). Mécanisme inchangé : claims signés JWT non altérables côté client.

Activation : `UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"ff_crm_mobile_v3": true}'::jsonb WHERE email = '<email>@filmpro.ch'`.
Kill switch : `... raw_app_meta_data - 'ff_crm_mobile_v3' ...` (< 60 s).

## Consequences
- (+) Sémantique propre, pas d'ambiguïté V2/V3 dans les logs ou le code.
- (+) Rollback V3 instantané (retrait du flag), comportement desktop intact (AC-013).
- (-) Le code V2 sous `ff_crm_mobile_v2` doit être rollback/repurposé (audit fichier par fichier, voir PRD § réutilisation) — sinon deux chemins morts coexistent.
- (-) Mécanisme JWT claims = MVP < 100 users (pas GrowthBook) ; rollout fin (0→10→50→100 %) impossible à granularité user sans table de cohortes. Acceptable : ≤ 10 users, rollout = pilote Pascal puis tous.

## References
- `src/lib/types/feature-flags.ts` (mécanisme existant).
- `memory/project_refonte_mobile_v3_terrain.md` (arbitrage flag V2→V3).
- ADR-0005 V2 (archive) : `archive/product-architect-v2-mobile-2026-05-24-abandonnee/adr/`.
