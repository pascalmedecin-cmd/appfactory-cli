# Feature flag plan - ff_crm_mobile_v2

## Décision (ADR-005)

Feature flag implémenté via JWT custom claims Supabase, pas via GrowthBook.

Raison : 3 users total (Pascal + Antoine + 3ᵉ fondateur), GrowthBook cloud free tier overkill. JWT custom claims natif Supabase = 0 dépendance externe, 0 latence réseau, rollback instantané via SQL.

## Implémentation

### Schema (pas de migration, utilise auth.users.raw_app_meta_data)

```sql
-- Activer le flag pour Pascal (canary)
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"ff_crm_mobile_v2": true}'::jsonb
WHERE email = 'pascal@filmpro.ch';

-- Activer pour Antoine (beta)
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"ff_crm_mobile_v2": true}'::jsonb
WHERE email = 'antoine@filmpro.ch';

-- Activer pour le 3ᵉ fondateur (GA)
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"ff_crm_mobile_v2": true}'::jsonb
WHERE email = '<3eme>@filmpro.ch';
```

### Lecture côté SvelteKit (hooks.server.ts)

```typescript
// Récupération du flag depuis le JWT custom claim
const ffCrmMobileV2 = session?.user?.app_metadata?.ff_crm_mobile_v2 === true;
event.locals.featureFlags = { ffCrmMobileV2 };
```

### Consommation côté composants

```svelte
<!-- src/routes/(app)/prospection/+page.svelte -->
{#if isMobile && $page.data.featureFlags.ffCrmMobileV2}
  <!-- Nouvelle UI mobile cards -->
  <ProspectionMobileCards {leads} />
{:else}
  <!-- UI desktop existante (DataTable) -->
  <DataTable {leads} columns={...} />
{/if}
```

`isMobile` : derived from viewport width via store réactif + media query `(max-width: 1023.98px)`.

## Rollout

| Étape | Date cible | Users activés | Critère passage suivant |
|---|---|---|---|
| Canary | 2026-05-28 | 1 (Pascal) | Smoke F1+F2+F3 verts, 0 régression desktop, 24h sans bug en Log |
| Beta | 2026-05-30 | 2 (Pascal + Antoine) | 0 bug remonté en Log, SLO mobile respecté, 48h |
| GA | 2026-05-31 | 3 (tous fondateurs) | Permanent, monitoring continu 7j avant cleanup flag |

## Kill switch

Désactivation < 60s via SQL :

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data - 'ff_crm_mobile_v2'
WHERE email = '<email>@filmpro.ch';
```

OU pour rollback global :

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data - 'ff_crm_mobile_v2'
WHERE email LIKE '%@filmpro.ch';
```

L'user se rafraîchit (ou refresh navigateur), le flag tombe à `false`, fallback automatique UI desktop existante.

## Rollback plan complet (si feature flag insuffisant)

Si bug structurel (régression desktop, crash bloquant) :

1. Kill switch SQL (< 60s).
2. `git revert <commit-hash-livraison>` sur main.
3. Push -> Vercel auto-deploy < 2 min.
4. Validation prod via Pascal smoke.
5. Investigation post-mortem (mémoire `feedback_crm_mobile_v2_rollback_<date>.md` si applicable).

Commit hash baseline (S189 livré, état stable pré-refonte) : `26975c9`.

## Cleanup flag (après 7j stable GA)

Si SLO respectés 7j post-GA, retirer les guards `featureFlags.ffCrmMobileV2` et garder uniquement le code mobile-first (avec fallback desktop par viewport `>= 1024px`). Le flag SQL peut être retiré ou laissé tel quel (sans effet).

## Tests Phase 4

- Test Playwright : user Pascal avec flag = true voit nouvelle UI sur viewport < 1024px.
- Test Playwright : user sans flag voit UI desktop existante (regression test).
- Test Playwright : viewport >= 1024px voit toujours UI desktop, indépendamment du flag.
