# SLO/SLI - Portail FilmPro multi-outils (chantier 1)

Chantier structurel (reorg + renommage + home statique), surface mince. SLO centres sur la home portail et la non-regression du CRM.

| Feature | SLI (indicateur) | SLO (cible) | Instrument |
|---|---|---|---|
| Home portail | LCP p75 | < 2.5s | Lighthouse CI / Vercel Analytics |
| Home portail | CLS | < 0.1 | Lighthouse CI |
| Home portail | disponibilite (HTTP 200) | > 99.5 % | Vercel logs |
| Entree CRM (dashboard) | latence p75 vs baseline actuelle | <= baseline (pas de regression) | Vercel Analytics |
| Navigation CRM | taux de pages rendues sans erreur apres reorg | 100 % | Playwright e2e + Vercel logs |
| Bascule URL | les 2 adresses repondent 200, ancienne -> nouvelle (redirect) | 100 % | curl / verification manuelle supervisee |

## Error budget

Pas d'error budget formel (surface mince, pas de feature rampable). Garde-fou binaire :
- 0 erreur Vercel/runtime NOUVELLE attribuable au portail apres mise en prod.
- Observabilite : logs Vercel + smoke fondateur (Sentry retire du CRM le 2026-06-07, decision meta).

## Mesure baseline (a figer en Phase 5)

`metrics-baseline.json` capturera : LCP/CLS home, taille bundle delta, nombre de tests verts (hors baseline rouge connue 17 tests hooks.server), date. Sert de reference drift pour les chantiers suivants (Devis, Terrain).
