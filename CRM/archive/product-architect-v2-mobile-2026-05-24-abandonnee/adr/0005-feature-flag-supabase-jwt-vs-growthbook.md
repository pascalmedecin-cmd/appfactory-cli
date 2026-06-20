# ADR-005 - Feature flag via JWT custom claims Supabase (pas GrowthBook)

## Status

Accepted (2026-05-24)

## Context

La best practice product-architect (`RESEARCH_NOTES.md` C.1) recommande GrowthBook cloud free tier pour les feature flags (< 1000 MAU). Le CRM FilmPro doit rollout la refonte mobile progressivement (canary 1 user -> beta 2 users -> GA 3 users).

Options envisagées :

- **GrowthBook cloud free tier** : Standard, mais overkill pour 3 users. Dépendance externe (network call à chaque page load OU SDK avec cache). Latence réseau additive.
- **Supabase RLS + JWT custom claims** : Natif Supabase, 0 dépendance, claim dans le JWT déjà signé à l'auth. Lecture instantanée côté serveur (`hooks.server.ts`).
- **Variable d'environnement Vercel** : Trop binaire (tous users ou aucun), pas de rollout progressif.
- **Hardcoded list emails dans le code** : Cradingue, oblige redeploy pour ajouter/retirer un user.

## Decision

Feature flag `ff_crm_mobile_v2` stocké dans `auth.users.raw_app_meta_data` (JSONB Supabase). Lu via JWT custom claim côté SvelteKit dans `hooks.server.ts`, propagé via `event.locals.featureFlags`.

Voir `feature-flag-plan.md` pour implémentation complète.

## Consequences

- (+) 0 dépendance externe.
- (+) 0 latence réseau (claim dans le JWT déjà chargé).
- (+) Rollback < 60s via SQL UPDATE.
- (+) Conforme `RESEARCH_NOTES.md` C.1.6 « Supabase RLS+JWT custom claims pour MVP < 100 users ».
- (-) Pas de UI de gestion (admin GrowthBook). Pascal doit éditer en SQL.
- (-) Mitigation : 3 users seulement, SQL trivial.
- (-) Si V2 introduit un 4ᵉ+ user non-fondateur, le flag SQL devient plus tricky -> envisager GrowthBook à ce moment.

## References

- `RESEARCH_NOTES.md` C.1.6 best practice feature flags pour MVP.
- Cadrage Phase 1 ajustement complémentaire D-07.
- Doc Supabase JWT custom claims : https://supabase.com/docs/guides/auth/auth-hooks
