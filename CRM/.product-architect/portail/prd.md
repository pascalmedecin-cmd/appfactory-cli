# PRD - Portail FilmPro multi-outils (chantier 1)

**Date** : 2026-06-01
**Auteur** : Pascal (cadre avec product-architect)
**Statut** : Spec en validation Phase 2 (gate 2->3 en attente)
**Repo** : ~/Claude/Projets/FilmPro/CRM (app SvelteKit, path Vercel rootDirectory = CRM)
**Stack confirmee** : SvelteKit 2 + Tailwind v4 + Supabase + Vercel + Vitest/Playwright (PAS Next.js)

---

## 1. Vision

Transformer l'app "CRM FilmPro" en un portail unique nomme **FilmPro** : une page d'accueil a cards premium d'ou les 3 fondateurs entrent dans chaque outil. Le CRM devient le premier outil (rien perdu, juste range derriere sa carte) ; une carte annonce le futur generateur de devis. Les outils partagent un meme referentiel entreprises/contacts et pourront se parler (creer un devis depuis une fiche, devis accepte qui avance le pipeline).

Perimetre de CE chantier : portail + renommage + reorganisation du CRM en module + formalisation des fondations partagees. L'outil Devis lui-meme = chantier 2.

## 2. Objectifs mesurables

| KPI | Baseline | Cible | Horizon | Comment mesurer |
|---|---|---|---|---|
| Pages/fonctions CRM accessibles apres reorg | 100 % | 100 % (zero regression) | Day 1 | Suite Playwright e2e existante verte + smoke 7 pages |
| Acces a la home portail | inexistant | <= 1 clic depuis toute page | Day 1 | Lien/logo "retour portail" present sur le layout |
| Occurrences de "CRM" comme NOM d'application dans l'UI | plusieurs (title, navbar, config) | 0 | Day 1 | grep UI + revue manuelle ; "CRM" ne subsiste que comme nom d'outil |
| Description metier correcte (vitrage, pas video) | fausse (config.ts) | corrigee | Day 1 | Lecture config.ts + meta |
| Contrat referentiel partage documente et applique | non formalise | formalise (couche service identifiee) | Day 1 | ADR-0002 + revue code couche referentiel |

## 3. User stories (Given/When/Then)

```gherkin
Feature: Portail FilmPro multi-outils

Scenario: Arrivee sur le portail apres connexion
  Given je suis un fondateur connecte (OTP @filmpro.ch)
  When j'ouvre l'application
  Then j'atterris sur la home portail
  And je vois 2 cards : "CRM" (active) et "Devis" (Bientot disponible)

Scenario: Entrer dans le CRM
  Given je suis sur la home portail
  When je clique la card "CRM"
  Then j'arrive sur le dashboard CRM
  And toutes les pages CRM (contacts, entreprises, pipeline, prospection, signaux, veille, reporting) sont accessibles comme avant

Scenario: La card Devis ne mene nulle part (encore)
  Given je suis sur la home portail
  When je clique la card "Devis"
  Then rien ne se passe (pas de navigation, pas de 404)
  And la card indique "Bientot disponible" et est annoncee comme telle aux lecteurs d'ecran

Scenario: Revenir au portail depuis le CRM
  Given je suis sur une page quelconque du CRM
  When je clique le logo / lien "portail"
  Then je reviens a la home portail en 1 clic

Scenario: Continuite du referentiel partage (fondation)
  Given j'ai cree l'entreprise "Regie X" et un contact dans le CRM
  When le futur outil Devis lira le referentiel (chantier 2)
  Then "Regie X" et son contact sont disponibles sans nouvelle saisie

Scenario: Renommage complet
  Given l'application a ete renommee
  When j'inspecte les titres d'onglet, la navbar, les metadonnees
  Then le nom de l'application est "FilmPro" (pas "CRM FilmPro")
  And "CRM" n'apparait que comme nom d'un outil
```

## 4. Acceptance criteria

Voir `acceptance-criteria.json` (parseable, 1 ligne par critere, blocking flag explicite).

## 5. Architecture data

**Aucune table creee ou restructuree dans ce chantier.** La reorganisation est structurelle (routes + nommage), pas un changement de schema.

- Le referentiel partage (`entreprises`, `contacts`, `utilisateurs`) est **formalise comme contrat** (ADR-0002) : ecriture via une couche de service partagee `src/lib/server/referentiel/`, endpoints `/api/entreprises/*` et `/api/contacts/*` restent partages.
- Tables metier CRM (`opportunites`, `signaux_affaires`, `intelligence_reports`, `prospect_leads`, ...) inchangees.
- Esquisse devis (chantier 2, NON appliquee) documentee en commentaire dans `data-model.sql` pour prouver que le referentiel suffit (les tables `devis`/`devis_lignes`/`catalogue_produits` se branchent par FK sur `entreprises`/`contacts` sans toucher l'existant).

Voir `data-model.sql` (etat + esquisse) et `data-model-fondations.md` (contrat detaille).

## 6. Contrats API

Voir `api-contracts.ts`. Ce chantier n'ajoute pas d'endpoint metier. Il fige une **convention** : endpoints partages (referentiel) sans prefixe outil ; endpoints scopes par outil prefixes (`/api/crm/*`, futur `/api/devis/*`). Le reprefixage effectif des endpoints CRM existants est hors-scope de ce chantier (cf. section 9).

## 7. Design system

Reutilisation integrale des tokens existants (`src/app.css`). Nouveau composant semantique `ToolCard` (etats `active` / `soon`) + `PortailHome` + lien retour portail. Voir `DESIGN.md` et `golden-standard.html` (valide Pascal).

## 8. Architecture Decision Records

- `adr/0001-une-app-route-groups.md` : 1 app SvelteKit, outils = route groups, DB unique.
- `adr/0002-referentiel-partage-entreprises-contacts.md` : contrat de referentiel partage + couche service.
- `adr/0003-passerelles-actions-croisees.md` : mecanisme "les outils se parlent" (services traces, jamais UPDATE cross-outil direct).
- `adr/0004-renommage-et-bascule-url.md` : renommage UI + bascule adresse vers filmpro.vercel.app avec redirection de l'ancienne.

## 9. Hors-scope nomme (no-debt)

1. **L'outil Devis n'est PAS construit** (chantier 2). Fondations seulement.
2. **Mobile V3 (terrain) n'est PAS integre au portail** ce chantier (3e card apres sa livraison).
3. **Aucun durcissement RLS** : mono-tenant plat conserve ; durcissement conditionne au 4e user non-fondateur (risque ouvert documente, autre chantier).
4. **Pas de compteurs live sur les cards** (home statique). Donnees temps reel = amelioration future.
5. **Reprefixage des endpoints CRM existants `/api/crm/*`** reporte (non bloquant) ; peut etre fait au chantier 2.
6. **Pas de domaine perso / DNS custom** ce chantier : cible = alias Vercel `filmpro.vercel.app` (domaine perso = decision ulterieure).

## 10. Plan de test

| Niveau | Outil | Coverage cible | Owner Phase |
|---|---|---|---|
| Unit | Vitest | Helpers nouveaux (ToolCard logic, nav) couverts ; suite existante verte | 3 |
| Navigation | Playwright e2e | 100 % liens nav CRM apres reorg + entree/sortie portail | 4 |
| Visual | Playwright snapshot | Home portail + dashboard CRM (baseline) | 4 |
| A11y | axe-core | 0 violation serieuse/critique sur home + 1 page CRM temoin | 4 |
| Perf | Lighthouse CI | Home : LCP < 2.5s, CLS < 0.1 | 4 |
| Non-regression | Suite Vitest existante | Verte (suite complete ; ancienne baseline rouge Sentry resolue, voir ci-dessous) | 3 |
| Securite | code-review:security-auditor | 0 H/C/M sur fichiers touches (routing, layout, config) | 4 |

**Baseline rouge resolue** : les 17 tests `hooks.server.test.ts` (jadis rouges, `c442e59`) sont repasses verts apres le decouplage `baseHandle` puis le retrait de Sentry (2026-06-07). La suite est integralement verte ; plus de baseline rouge a exclure.

## 11. Plan de livraison

Ce chantier n'est pas une feature user "rampable" classique : c'est une reorganisation + un renommage + une **bascule d'adresse**. Le plan se centre donc sur la bascule URL sans coupure. Voir `feature-flag-plan.md`.

| Etape | Action | Critere passage |
|---|---|---|
| Preview | Deploiement preview branch (reorg + home + renommage) | Build vert, smoke 7 pages + home OK |
| Prod | Promotion prod sur l'alias ACTUEL (filmpro-crm) | Tests verts, 0 regression, smoke fondateur |
| Bascule URL | Activer nouvel alias filmpro.vercel.app + redirection de l'ancien | Les 2 adresses menent a l'app ; ancien -> nouveau |
| Communication | Envoyer le nouveau lien aux 3 fondateurs | Confirmation acces des 3 |
| Cleanup | Retrait eventuel ancien alias (differe) | Apres confirmation des 3, jamais avant |

Kill switch / rollback : `vercel rollback` vers le commit baseline + re-pointage alias. Attention trap connu (`vercel rollback` verrouille l'alias prod, cf. watch list CRM) : verifier `vercel inspect` apres rollback.

## 12. SLO/SLI cibles

| Feature | SLI | SLO cible | Instrument |
|---|---|---|---|
| Home portail | LCP p75 | < 2.5s | Lighthouse CI / Vercel Analytics |
| Home portail | disponibilite (200 OK) | > 99.5 % | Vercel logs |
| Entree CRM | aucune regression de latence vs baseline dashboard | <= baseline actuelle | Vercel Analytics |

Pas d'error budget formel (chantier structurel, surface mince). Surveillance : 0 erreur runtime nouvelle attribuable au portail, via logs Vercel + smoke (Sentry retire du CRM le 2026-06-07).
