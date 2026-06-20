# PRD - Outil « Découpe Films » (chantier 2 portail FilmPro)

**Date** : 2026-06-05
**Auteur** : Pascal (cadré avec product-architect ; brief fonctionnel v2.0 du 2026-06-03)
**Statut** : Spec Phase 2 - en attente validation gate 2→3
**Repo** : `~/Claude/Projets/FilmPro/CRM/` (app portail, route `/decoupe`)

---

## 1. Vision

Un outil interne qui, à partir des vitres d'un chantier et de la base produit FilmPro, **propose le plan de
découpe des films qui gaspille le moins de matière** - et signale clairement ce qui doit être commandé sur
mesure au fournisseur. Pas de prix : que des plans de coupe.

## 2. Objectifs mesurables

| KPI | Baseline | Cible | Horizon | Mesure |
|---|---|---|---|---|
| Temps pour obtenir un plan de découpe d'un chantier | calcul manuel (papier/tableur) | < 2 min (saisie → plan) | Day 1 | timer manuel sur 1 chantier témoin |
| Taux de chute affiché et explicable par produit | non mesuré aujourd'hui | 100 % des plans affichent le taux | Day 1 | présence du champ dans la sortie |
| Économie de matière via consolidation multi-chantiers | 0 (pas d'outil) | chute consolidée ≤ chute des chantiers séparés sur jeu témoin | 1 mois | comparaison plans séparés vs consolidé |
| Pièces sans solution jamais silencieuses | risque oubli manuel | 100 % signalées (alerte ou liste commande) | Day 1 | test unitaire couverture cas |

## 3. User stories (Given/When/Then)

```gherkin
Feature: Saisie d'un chantier et de ses vitres

Scenario: Créer un chantier et y saisir des vitres identiques
  Given je suis connecté (fondateur @filmpro.ch)
  When je crée un chantier "Régie Léman - 12 rue X"
  And j'ajoute une ligne "8 × 1200×800, produit FS-Solaire-01, coche sur-mesure = non"
  Then la ligne apparaît avec quantité 8
  And le chantier est en statut "en_saisie"

Feature: Optimisation de découpe

Scenario: Optimiser un chantier en découpe interne
  Given un chantier avec des vitres en découpe interne (produit nestable)
  When je lance l'optimisation
  Then j'obtiens, par produit, un plan de placement + la longueur de rouleau + le taux de chute
  And la meilleure laize est retenue si le produit en a plusieurs

Scenario: Vitre cochée sur-mesure fournisseur
  Given une vitre avec coche "sur-mesure fournisseur" = oui
  When je lance l'optimisation
  Then la vitre n'est PAS nestée
  And elle apparaît dans la liste de commande fournisseur

Scenario: Garde-fou produit non nestable laissé en interne
  Given une vitre avec un produit nestable=false et coche sur-mesure=non
  When je lance l'optimisation
  Then la vitre n'est pas nestée (mise en liste de commande)
  And une alerte d'incohérence est affichée

Scenario: Vitre plus large que la laize, jointage interdit
  Given une vitre plus large que la laize max, produit jointage_autorise=false
  When je lance l'optimisation
  Then la vitre est signalée "non plaçable" (jamais omise silencieusement)

Scenario: Vitre plus large que la laize, jointage autorisé
  Given une vitre plus large que la laize max, produit jointage_autorise=true
  When je lance l'optimisation
  Then la vitre est découpée en lés (bandes ≤ laize, recouvrement du produit appliqué)
  And le plan signale la pose en lés

Scenario: Consolidation multi-chantiers
  Given deux chantiers "non lancés" avec même produit × même laize en découpe interne
  When je demande l'optimisation consolidée
  Then les vitres sont nestées ensemble
  And la chute consolidée est calculée sur l'ensemble
```

## 4. Architecture data

→ `data-model.sql` (3 tables : `decoupe_produits`, `decoupe_chantiers`, `decoupe_vitres` ; pas de table plan)
→ `rls-policies.sql` (mono-tenant plat, ADR-0004)
Unités : millimètres entiers (ADR-0003). Plan recalculé à la demande (ADR-0002).

## 5. Contrats

→ `api-contracts.ts`. Coeur = `optimiserDecoupe(vitres, produits): ResultatOptimisation` (fonction pure, TDD).
Surface HTTP : routes SvelteKit sous `/decoupe` (load + form actions). Optimisation côté serveur, rendu SVG client.

## 6. Design

→ `DESIGN.md`. 4 écrans : liste chantiers, fiche chantier + saisie vitres, base produit, écran d'optimisation
(plan SVG par produit + taux de chute + liste commande + alertes). Réutilise tokens portail/CRM.
**Export PDF** du plan (vectoriel, côté client, template FilmPro validé avec Pascal) - ADR-0005.

## 7. Décisions structurelles (ADR)

- ADR-0001 : Découpe Films = outil du portail (route `/decoupe`, card existante), pas un module siloé.
- ADR-0002 : algo strip-packing heuristique maison (FFD + étagères), plan recalculé à la demande (pas de persistance).
- ADR-0003 : unités millimètres entiers ; dimension de coupe = dimension vitre + marge de pose (produit).
- ADR-0004 : RLS mono-tenant plat (doctrine projet), `created_by` = traçabilité.
- ADR-0005 : export PDF du plan, vectoriel côté client (jsPDF + svg2pdf), template validé avec Pascal.

## 8. Hors-scope nommé (no-debt)

- Aucun prix / chiffrage / devis (périmètre figé brief §0).
- Pas de FK référentiel `entreprises`/`contacts` au MVP (rattachement client = champ libre, branchable plus tard - Q1).
- Pas de persistance du plan de découpe (recalculé, déterministe - ADR-0002).
- Pas d'attributs produit au-delà du minimum + `notes` (Q2).
- Pas de fenêtre de temps pour la consolidation suggérée (Q3 : statut « non lancé » seul).
- Pas d'envoi PDF automatisé par email (l'export PDF est manuel, à la demande - ADR-0005).

## 9. Plan de test

| Niveau | Outil | Cible | Phase |
|---|---|---|---|
| Unit (coeur algo) | Vitest | `optimiserDecoupe` : tous les cas brief §2/§6 (coche, nestable, multi-laize, rotation, lés, non plaçable, consolidation, recouvrement) | 3 |
| Unit (helpers) | Vitest | dimensions de coupe, choix de laize, taux de chute | 3 |
| Integration | Vitest (mock supabase) | actions CRUD chantiers/vitres/produits (validation Zod) | 3 |
| RLS | pgTAP vraie DB | ≥ 1 refus non-authentifié par table | 4 |
| E2E | Playwright | workflow 3 étapes + écran optimisation + export PDF (téléchargement) | 4 |
| PDF | manual verification | template FilmPro validé visuellement par Pascal (checkpoint dédié) | 4 |
| A11y | axe-core | 0 violation sérieuse/critique (dont le plan SVG : `role`/`aria` + table de repli) | 4 |
| Perf | Lighthouse | LCP < 2.5s, CLS < 0.1 sur `/decoupe` | 4 |
| Sécu | code-review:security-auditor | 0 H/C/M, artefact daté | 4 |

## 10. Plan de livraison

Outil interne, 3 fondateurs → rollout simple (pas de canary % GrowthBook). Feature flag `ffDecoupe` (cf. `feature-flag-plan.md`) :
card/route masquées tant que OFF, bascule ON quand QA verte. Kill switch = flag OFF. Rollback = revert commit.

**Checkpoint supervisé (template PDF)** : une fois l'écran d'optimisation fonctionnel en Phase 3, je présente le
template PDF FilmPro (rendu réel) à Pascal pour validation visuelle AVANT de finaliser l'export (AC-025, ADR-0005).

## 11. SLO/SLI

| Élément | SLI | Cible | Instrument |
|---|---|---|---|
| Optimisation | temps de calcul d'un plan (chantier réaliste ≤ ~200 pièces) | < 2 s côté serveur | log/perf manuel Phase 4 |
| Correction | pièces sans solution signalées / total sans solution | 100 % | tests unitaires |

(Outil interne ≤ 3 users : pas d'error budget formel ; correction algo = critère bloquant.)
