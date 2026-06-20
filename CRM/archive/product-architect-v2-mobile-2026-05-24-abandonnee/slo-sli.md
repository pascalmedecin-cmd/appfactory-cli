# SLO / SLI mobile CRM FilmPro

## Principes

- 1 SLI mesurable par feature critique (ici : par axe Core Web Vitals + reliability).
- SLO = objectif chiffré sur fenêtre 7j post-livraison.
- Instrumentation : Vercel Speed Insights (RUM) déjà branché + Sentry frontend pour error rate.
- Error budget consommé > 100 % sur 7j -> gel feature releases mobile, focus reliability.

## SLIs / SLOs

| Feature / axe | SLI | SLO cible | Instrument | Source baseline |
|---|---|---|---|---|
| Largest Contentful Paint mobile | p75 LCP en ms | < 2 500 ms | Vercel Speed Insights | Baseline pré-livraison à mesurer Phase 4 (Lighthouse mobile) |
| Interaction to Next Paint mobile | p75 INP en ms | < 200 ms | Vercel Speed Insights | Idem |
| Cumulative Layout Shift mobile | p75 CLS | < 0.1 | Vercel Speed Insights | Idem |
| First Contentful Paint mobile | p75 FCP en ms | < 1 800 ms | Vercel Speed Insights | Idem |
| Time to First Byte mobile | p75 TTFB en ms | < 800 ms | Vercel Speed Insights | Idem |
| Error rate page load | Erreurs 5xx / total requests | < 0.5 % rolling 7j | Vercel logs + Sentry | Baseline ~0 (CRM stable) |
| Crash rate JS uncaught | Uncaught errors / sessions | < 0.1 % rolling 7j | Sentry frontend | Idem |
| User flow F1 réussite | Sessions ayant complété F1 / sessions ayant ouvert Signaux | > 50 % (informational, advisory) | Pas instrumenté V1 | Non mesuré, advisory |

## Reporting

Vercel Speed Insights : tableau de bord visible directement dans le projet Vercel `filmpro-crm`. Filtrer par device = `mobile` pour mesure SLI.

Sentry : alertes configurées sur error rate > 0.5 % et crash rate > 0.1 %.

## Action si SLO consommé

Si LCP / INP / CLS dépassent leur seuil sur fenêtre 7j :
1. Identifier la page coupable via Vercel Speed Insights breakdown par route.
2. Profiler en local (Lighthouse + DevTools Performance).
3. Patcher la régression.
4. Re-mesurer 7j.

Si error rate ou crash rate explosent :
1. Kill switch feature flag `ff_crm_mobile_v2` (rollback < 60s).
2. Investigation Sentry : stack trace + reproducer.
3. Fix + re-déploiement + re-rollout.

## Hors-scope V1

- Pas de SLO sur user flow completion rate (pas instrumenté).
- Pas de SLO sur conversion prospect (métier).
- Pas de SLO sur usage feature mobile vs desktop (split usage).
