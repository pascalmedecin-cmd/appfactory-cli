# ADR-0002 - Algo strip-packing heuristique maison, plan recalculé à la demande

## Status
Accepted (2026-06-05).

## Context
Le coeur de l'outil est l'optimisation de découpe : caser des rectangles (vitres + marge) dans une bande de
largeur fixe (laize) en minimisant la longueur consommée. C'est un **strip-packing 1D**, NP-difficile à
l'optimum. Le brief (§6.1) tranche : une **heuristique de bonne qualité suffit**, le résultat doit être
**fiable et explicable** (exécuté à l'atelier). Le brief fournit le pseudo-code de référence (§6.5) et
demande une implémentation maison, pas une dépendance obscure.

## Decision
1. **Heuristique maison** : First-Fit Decreasing + placement par étagères/skyline (brief §6.5), implémentée en
   **TypeScript pur**, sans dépendance externe de packing.
2. **Fonction pure** `optimiserDecoupe(vitres, produits)` (cf. `api-contracts.ts`) : aucune I/O, déterministe
   → **TDD strict** en Phase 3 (tous les cas du brief = critères AC-003..AC-014).
3. **Plan recalculé à la demande**, **pas de persistance** : le plan dérive entièrement des vitres + produits
   (déterministe). On ne crée **pas** de table « plan ». Le seul état conservé est `decoupe_chantiers.statut`
   (`lancee` après lancement). Persister un snapshot de plan = ajout possible plus tard (hors-scope no-debt).

## Consequences
- (+) Pas de dépendance fragile ; algo auditable et explicable (exigence atelier).
- (+) Fonction pure = couverture de tests exhaustive sans DB ; régressions impossibles à rater.
- (+) Pas de désynchronisation plan/données (toujours recalculé depuis la source).
- (-) Pas l'optimum mathématique (assumé : le brief ne le demande pas).
- (-) Recalcul à chaque affichage (négligeable : chantiers réalistes ≤ ~quelques centaines de pièces, SLI < 2 s).
- (-) Pas d'historique des plans lancés au MVP (si besoin de traçabilité fine plus tard → table snapshot).

## References
- Brief §6 (logique d'optimisation) + §6.5 (pseudo-code) + §6.6 (sortie).
- `api-contracts.ts` (signature `optimiserDecoupe`), AC-003..AC-014.
- `~/.claude/rules/methodology.md` § Software factory (TDD agent-driven).
