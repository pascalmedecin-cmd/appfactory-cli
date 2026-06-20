# PRD - Refonte mobile CRM FilmPro

**Date** : 2026-05-24
**Auteur** : Pascal (cadré avec product-architect)
**Statut** : Spec validée Phase 2
**Repo** : `~/Claude/Projets/AppFactory/CRM/`
**Branche cible** : `feat/mobile-v2`
**Date livraison cible** : 2026-05-31

---

## 1. Vision

Faire du CRM FilmPro une vraie app terrain sur iPhone : zéro tableau scroll H, zéro liste illisible, cartes tappables avec les 2-3 actions clés directement accessibles. Le desktop reste strictement identique (>= 1024px), aucune fonction n'est supprimée.

## 2. Objectifs mesurables

| KPI | Baseline (S190) | Cible | Horizon | Comment mesurer |
|---|---|---|---|---|
| Pages CRM utilisables en mobilité (viewport 430x932) | 4 / 10 (Dashboard, Signaux, Veille, Aide) | 9 / 10 (Log exclu, desktop-only assumé) | 2026-05-31 | Smoke manuel Chrome DevTools iPhone 14 Pro Max |
| Scroll horizontal détecté sur viewport mobile | Présent sur Prospection, Contacts, Entreprises, Pipeline, Reporting | 0 sur les 5 pages refondues | 2026-05-31 | Test Playwright `scrollWidth <= clientWidth` |
| Tableau HTML rendu en mobile | 5 pages (DataTable) | 0 sur les 5 pages refondues | 2026-05-31 | Test Playwright `page.locator('table').count() === 0` viewport < 1024px |
| Lighthouse mobile (Perf / A11y / BP / SEO) | Non mesuré sur breakpoint mobile | >= 90 sur les 4 axes, sur 5 pages | 2026-05-31 | Lighthouse CI mobile preset, run Vercel preview |
| Tap targets a11y AA (>= 44x44 CSS px) | Non audité | 100 % sur les 5 pages refondues | 2026-05-31 | axe-core `target-size` rule |

## 3. User stories (Gherkin)

```gherkin
Feature: Refonte mobile CRM

Scenario: Pascal lit un signal et le convertit en prospect depuis iPhone
  Given je suis connecté en tant que Pascal sur iPhone (viewport 430x932)
  When je tape sur "Signaux" dans la sidebar burger
  Then je vois une grille de cartes 1 colonne triées par pertinence
  And aucun scroll horizontal n'est nécessaire
  When je tape sur une carte signal "YPERIA OIKEN Vitrages"
  Then un SlideOut full-width s'ouvre avec le détail
  When je tape "Convertir en prospect"
  Then un modal bottom sheet s'ouvre avec les champs pré-remplis
  When je tape "Créer"
  Then je suis redirigé sur Prospection mobile, la nouvelle fiche apparaît en haut

Scenario: Pascal crée une fiche terrain et appelle le contact depuis chantier
  Given je suis sur le dashboard mobile (viewport < 1024px)
  When je tape le FAB "Lead express"
  Then un modal bottom sheet s'ouvre avec 4 champs (raison sociale, contact, tél, source)
  When je remplis et tape "Créer"
  Then je suis redirigé sur Prospection mobile
  When je tape la carte du prospect créé
  And je tape l'onglet "Photos"
  And je tape "Ajouter photo"
  Then le sélecteur natif iOS s'ouvre (caméra ou galerie)
  When je sélectionne une photo
  Then la thumbnail apparaît dans la galerie
  When je tape le numéro de téléphone affiché
  Then iOS lance l'appel via le lien tel: natif

Scenario: Pascal fait avancer une opportunité depuis le tram
  Given je suis sur Pipeline mobile (viewport < 1024px)
  Then je vois 6 étapes en accordéon fermées (header = nom + count + somme CHF)
  When je tape "Négociation"
  Then l'étape s'expand et liste les 3 opps avec titre + montant + date relance
  When je tape la carte d'une opp
  Then un SlideOut full-width s'ouvre avec les détails éditables
  When je tape "Faire avancer" et sélectionne "Gagné"
  Then une confirmation modal s'affiche
  When je confirme
  Then l'opp est déplacée vers l'étape "Gagné"

Scenario: Aucune régression desktop
  Given je suis sur n'importe quelle page CRM en viewport >= 1024px
  Then l'interface est strictement identique à la baseline pre-refonte
  And les snapshots Playwright desktop sont verts
```

## 4. Acceptance criteria

Voir `acceptance-criteria.json` (parseable, 27 critères atomiques avec id, testable, blocking, test_type, owner_phase).

Synthèse : 18 critères bloquants Phase 4, 6 critères bloquants Phase 3, 3 critères non bloquants (advisory).

## 5. Architecture data

**Pas de changement de data model**.

La refonte est UI pure (Q7 hors-scope). Aucune migration, aucune nouvelle table, aucune colonne ajoutée. Les modèles existants (`prospect_leads`, `contacts`, `entreprises`, `opportunites`, `signaux_affaires`, `visites`, `photos`) restent intacts.

Si une décision en Phase 3 nécessitait un changement (ex: nouvelle colonne `is_mobile_ready` pour feature flag par row), un ADR sera créé et la gate Phase 2 -> 3 revalidée par Pascal.

## 6. Contrats API

**Pas de changement de contrats API**.

La refonte est UI pure. Toutes les routes SvelteKit existantes (`+page.server.ts`, form actions, endpoints `/api/*`) restent intactes côté contrat (signatures, payloads, response shapes). Les composants mobile consomment les mêmes data loaders que leurs équivalents desktop.

Si une décision en Phase 3 nécessitait un nouveau endpoint (ex: `GET /api/pipeline/etape/<key>` pour lazy-load accordéon Pipeline), un ADR sera créé et la gate Phase 2 -> 3 revalidée.

## 7. Design system

Voir `DESIGN.md` (design system mobile sémantique, anti-generic UI, naming conventions, composants réutilisés/créés).

Tokens projet : `CRM/src/lib/design/tokens.css` (existant, non modifié). Aucun nouveau token créé.

Référentiel visuel : golden v9 (`~/.claude/goldens/audit-uiux-golden-v9-2026-05-06.json`).

## 8. ADRs

Voir `adr/` :

- `adr/0001-breakpoint-mobile-1024px.md` : choix du breakpoint < 1024px (vs 768px / 640px).
- `adr/0002-composant-mobile-entity-card.md` : composant générique `<MobileEntityCard>` extrait et réutilisé.
- `adr/0003-pipeline-accordeon-vs-alternatives.md` : Pipeline mobile en accordéon (vs bottom-sheet / swipe).
- `adr/0004-sidebar-burger-vs-bottom-nav.md` : sidebar burger conservée (pas de bottom navigation).
- `adr/0005-feature-flag-supabase-jwt-vs-growthbook.md` : feature flag via JWT custom claims Supabase (vs GrowthBook).

## 9. Hors-scope nommé

Strictement reporté de la Phase 1 (Q7) :

- Pas de PWA / installable iOS / manifest / Service Worker.
- Pas de notifications push (web push ni mobile).
- Pas de mode offline (réseau requis pour toute action).
- Pas de refonte data model / RLS / colonnes / tables.
- Pas de nouvelle fonctionnalité métier (juste rendre l'existant utilisable en mobilité).
- Pas de gestures swipe avancés (swipe-to-archive style Apple Mail).
- Pas de bottom navigation bar (sidebar burger conservée).
- Pas de refonte page Log (déjà desktop-only S185).
- Pas de refonte cockpit (méta-projet hors CRM).
- Pas de dark mode iOS (light forcé, vérifier cohérence).
- Pas de changement de stack (SvelteKit 5 + Tailwind v4 + Supabase + Vercel figés).

## 10. Plan de test

| Niveau | Outil | Coverage cible | Owner Phase |
|---|---|---|---|
| Unit | Vitest | Aucune nouvelle logique métier - couverture inchangée | 3 |
| Visual desktop (régression) | Playwright snapshots | 0 diff sur 100 % des pages CRM en viewport >= 1024px | 4 |
| Visual mobile (baseline) | Playwright snapshots | Baseline créée sur 5 pages refondues viewport 430x932 | 4 |
| E2E mobile | Playwright preset `iPhone 14 Pro Max` | 100 % des 3 user flows critiques (F1, F2, F3) verts | 4 |
| Scroll horizontal | Playwright assertion `scrollWidth <= clientWidth` | 0 dépassement sur toutes les pages, viewport mobile | 4 |
| Tableaux mobile | Playwright assertion `page.locator('table').count() === 0` | 0 table HTML rendu en viewport < 1024px, 5 pages | 4 |
| A11y | `@axe-core/playwright` | 0 violation sérieuse, 0 critique, 100 % tap targets >= 44px | 4 |
| Perf mobile | Lighthouse CI preset mobile | Score >= 90 sur 4 axes, 5 pages refondues | 4 |
| Sécurité | `code-review:security-auditor` | 0 H/C/M, artifact daté | 4 |
| Bug hunt | `code-review:bug-hunter` | 0 Critical, audit subagent Opus | 4 |
| Contracts | `code-review:contracts-reviewer` | 0 breaking change non ADR-documentée | 4 |

Tests RLS pgTAP : non applicable (aucune policy modifiée, refonte UI pure).

## 11. Plan de livraison

| Étape | % users | Durée | Critère passage |
|---|---|---|---|
| Canary | 1 pilote (Pascal lui-même, viewport iPhone réel) | 24h | Smoke F1+F2+F3 verts, 0 régression desktop visible |
| Beta | 2/3 users (Pascal + Antoine) | 2-3 jours | 0 bug remonté en page Log, SLO mobile respecté |
| GA | 3/3 users (tous fondateurs) | Permanent | Maintenir SLO 7 jours avant cleanup flag |

Feature flag : `ff_crm_mobile_v2` via JWT custom claims Supabase (voir `feature-flag-plan.md`).

Kill switch : flag désactivable < 60s (toggle via SQL `UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"ff_crm_mobile_v2": false}'`). Rollback plan : commit hash baseline `26975c9` (S189 livré) + revert PR via `git revert`.

## 12. SLO/SLI cibles

Voir `slo-sli.md`.

Synthèse :
- LCP mobile p75 < 2.5s
- INP mobile p75 < 200ms
- CLS p75 < 0.1
- Error rate (page load 5xx) < 0.5 % rolling 7j
- Crash rate JS uncaught error < 0.1 % rolling 7j

Instrumentation : Vercel Speed Insights (RUM) + Sentry frontend (déjà branchés sur le projet).

Error budget : si SLO consommé > 100 % sur fenêtre 7j post-livraison -> gel feature releases mobile, focus reliability.

---

## Notes méthodologie

Spec validée Phase 2 = artefact primaire. Toute déviation en Phase 3 (nouvelle table, nouvel endpoint, changement de breakpoint, ajout dépendance) doit créer un ADR et déclencher revalidation Pascal du gate Phase 2 -> 3.

Source : `~/.claude/skills/product-architect/RESEARCH_NOTES.md` Partie A (historique Pascal) + Partie C (best practices externes 2025-2026).
