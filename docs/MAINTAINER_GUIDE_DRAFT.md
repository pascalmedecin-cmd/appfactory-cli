# Guide Mainteneur — FilmPro CRM

**Statut :** En cours de redaction (alimente au fil du developpement)
**Derniere mise a jour :** 2026-04-03

> Ce document capture les decisions techniques, l'architecture et les procedures de maintenance au fur et a mesure du developpement.

---

## Sommaire

1. [Architecture](#1-architecture)
2. [Stack technique](#2-stack-technique)
3. [Structure du projet](#3-structure-du-projet)
4. [Base de donnees](#4-base-de-donnees)
5. [Authentification](#5-authentification)
6. [Deploiement](#6-deploiement)
7. [APIs externes](#7-apis-externes)
8. [Conventions de code](#8-conventions-de-code)
9. [Procedures courantes](#9-procedures-courantes)

---

## 1. Architecture

*A completer lors de l'implementation.*

```
Navigateur
  ↓ HTTPS
SvelteKit (Vercel)
  ↓ supabase-js
Supabase (PostgreSQL + Auth + API REST)
  ↓ cron / edge functions
APIs externes (Zefix, SIMAP, search.ch, SITG)
```

---

## 2. Stack technique

| Composant | Version | Role |
|-----------|---------|------|
| SvelteKit | ^2.50 | Framework frontend + SSR |
| Svelte | ^5.54 | UI components (runes) |
| Tailwind CSS | ^4.2 | Styles |
| Supabase | fmflvjubjtpidvxwhqab | BDD + Auth + API |
| Vercel | adapter-vercel ^6.3 | Hebergement + CDN |
| Node.js | 22.x | Runtime Vercel |

---

## 3. Structure du projet

```
template/
  src/
    lib/
      database.types.ts        -- Types generes depuis Supabase
      supabase.ts               -- Client browser
      server/supabase.ts        -- Client server
      components/
        DataTable.svelte        -- Tableau generique tri/recherche/pagination/selection
        SlideOut.svelte          -- Panneau lateral detail
        ModalForm.svelte         -- Modal formulaire avec accordeon "Plus de details"
        FormField.svelte         -- Champ formulaire (text/email/tel/date/textarea)
        Badge.svelte             -- Badge colore (6 variants)
        EmptyState.svelte        -- Etat vide avec action
        Header.svelte            -- Barre superieure
        Sidebar.svelte           -- Sidebar collapsible
    routes/
      +layout.svelte            -- Layout racine
      +layout.server.ts         -- Session loader
      login/                     -- Page connexion
      auth/callback/             -- OAuth callback
      (app)/
        +layout.svelte          -- Layout sidebar+header
        +page.svelte            -- Dashboard (stats, relances, activites)
        contacts/               -- CRUD contacts
        entreprises/            -- CRUD entreprises
        pipeline/               -- Kanban opportunites (drag & drop)
        signaux/                -- Signaux d'affaires (DataTable + conversion)
        prospection/            -- Leads prospection (CRUD + import multi-sources)
        aide/                   -- Documentation utilisateur integree (sommaire + recherche)
    routes/
      api/
        prospection/
          lindas/               -- Import SPARQL registre du commerce
          zefix/                -- Import REST registre du commerce (auth)
          simap/                -- Import marches publics construction
          search-ch/            -- Enrichissement telephone
```

---

## 4. Base de donnees

### 4.1 Tables CRM (existantes)
- contacts, entreprises, opportunites, prescripteurs
- signaux_affaires, activites, imports_zefix, utilisateurs

### 4.2 Tables Prospection (en place)
- prospect_leads — leads unifies multi-sources, scoring, dedup (UNIQUE source+source_id)
- recherches_sauvegardees — criteres sauvegardes pour alertes (CRUD + UI en place, cron quotidien)

### 4.3 Regenerer les types TypeScript
```bash
cd template
npx supabase gen types typescript --project-id fmflvjubjtpidvxwhqab > src/lib/database.types.ts
```

### 4.4 Migrations
- `20260402_001_schema_filmpro.sql` — 8 tables CRM initiales (contacts, entreprises, opportunites, etc.)
- `20260403_001_prospect_leads.sql` — Tables prospection (prospect_leads + recherches_sauvegardees + RLS + index)

---

## 5. Authentification

- Google OAuth via Supabase Auth
- Projet GCP : appfactory-492107
- Redirect callback : `/auth/callback`
- Protection routes : `hooks.server.ts` (redirect `/login` si pas de session)
- RLS : `authenticated` = full access sur toutes les tables

---

## 6. Deploiement

- **Preview :** Push sur branche → Vercel deploy auto
- **Production :** Push sur `main` → https://filmpro-crm.vercel.app
- **Variables d'env :** PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, CRON_SECRET, SEARCH_CH_API_KEY (configurees dans Vercel)
- **Cron :** `/api/cron/alertes` execute quotidiennement a 7h (vercel.json), securise par CRON_SECRET

---

## 7. APIs externes

| API | Usage | Auth | Quota | Statut | Route |
|-----|-------|------|-------|--------|-------|
| LINDAS SPARQL | Import entreprises par canton | Aucune | Illimite | Fonctionnel | `/api/prospection/lindas` |
| SIMAP | Marches publics construction | Aucune | ? | Fonctionnel | `/api/prospection/simap` |
| Zefix REST | Import entreprises (complet) | Basic Auth (env vars) | ? | Code pret, attend credentials | `/api/prospection/zefix` |
| search.ch | Enrichissement telephone | Cle API (env var) | 1000/mois | Code pret, attend cle | `/api/prospection/search-ch` |
| SITG | Permis construire GE | Aucune | Illimite | A integrer | — |

### 7.1 Variables d'environnement API

| Variable | Service | Statut |
|----------|---------|--------|
| `ZEFIX_USERNAME` | Zefix REST Basic Auth | En attente (demande envoyee) |
| `ZEFIX_PASSWORD` | Zefix REST Basic Auth | En attente |
| `SEARCH_CH_API_KEY` | search.ch annuaire | Configure (.env local + Vercel prod) |
| `CRON_SECRET` | Cron alertes | Configure (.env local + Vercel prod) |

Configurer dans Vercel : `vercel env add ZEFIX_USERNAME` (production + preview).

---

## 8. Conventions de code

*A documenter au fil du dev : nommage composants, structure fichiers, patterns recurrents.*

---

## 9. Procedures courantes

### 9.1 Ajouter une nouvelle table
*A documenter.*

### 9.2 Ajouter une nouvelle page/route
*A documenter.*

### 9.3 Ajouter une source de prospection
*A documenter.*

### 9.4 Modifier le scoring des leads
Le scoring est configure dans `project.yaml` (source de verite) et `src/lib/config.ts` (miroir TS importe par le code).
Modifier les deux fichiers en coherence : cantons, secteurs, seuils, labels.
La fonction `calculerScore()` dans `src/lib/scoring.ts` lit la config — pas besoin de la modifier sauf changement de logique.

### 9.5 Personnaliser pour un nouveau client
1. Copier le template
2. Modifier `project.yaml` et `src/lib/config.ts` (branding, scoring, pipeline, sources)
3. Remplacer les logos dans `static/`
4. Mettre a jour `src/app.css` (couleurs @theme)
5. Deployer

---

## Journal des decisions techniques

| Date | Decision | Raison |
|------|----------|--------|
| 2026-04-02 | Pas de scraping FAO | Fragile, pas d'API, maintenance lourde |
| 2026-04-02 | Scoring stocke en base | Eviter recalcul cote client, permet tri SQL |
| 2026-04-02 | Slide-out au lieu de pages detail | Garder le contexte liste visible |
| 2026-04-02 | 100% sources gratuites | Zefix + LINDAS + SIMAP + SITG + search.ch |
| 2026-04-03 | Drag & drop HTML5 natif | Pas de lib externe (svelte-dnd, etc.), form action ?/move pour persistence |
| 2026-04-03 | Conversion signal→opportunite | Cree opp liee + update statut signal en une action serveur atomique |
| 2026-04-03 | Validation Zod sur toutes les form actions | Securite : UUID, email, enums, longueur max — suite audit Datadog AI Security |
| 2026-04-03 | Email provider Supabase desactive | Seul Google OAuth autorise, empeche creation de comptes non autorises |
| 2026-04-03 | DataTable selectedIds en $bindable | Permet aux pages parentes de lire/ecrire la selection pour les actions batch |
| 2026-04-03 | Scoring calcule cote serveur a l'import | Stocke en base (score_pertinence), recalcule si enrichissement |
| 2026-04-03 | Transfert lead → CRM cree entreprise + contact | Action atomique : insert entreprise, optionnel contact, update statut lead |
| 2026-04-03 | LINDAS SPARQL comme source principale (pas Zefix) | Pas d'auth, donnees ouvertes, suffisant pour nom+adresse+but social |
| 2026-04-03 | API SIMAP directe (pas MCP server) | Endpoint public https://www.simap.ch/api, pas besoin de MCP server pour integration serveur |
| 2026-04-03 | Parsing XML search.ch avec regex | Reponse Atom feed, extraction tel:phone/street/zip/city par regex (pas de parser XML lourd) |
| 2026-04-03 | Import batch insert 500 rows max | Limite Supabase par requete, boucle si plus |
| 2026-04-03 | Recherches sauvegardees CRUD + alertes cron | Table existante, actions form save/delete, cron Vercel quotidien 7h |
| 2026-04-03 | Rate limiting in-memory hooks.server.ts | 10 req/min/IP sur /api/prospection/*, nettoyage periodique, pas de dep externe |
| 2026-04-03 | Responsive sidebar mobile (burger + overlay) | Sidebar masquee < 768px, Header avec bouton menu, modals bottom-sheet sur mobile |
| 2026-04-03 | Vitest + Playwright | 34 tests unitaires (scoring + schemas + validation), tests e2e navigation/auth redirect |
| 2026-04-03 | Cron securise par CRON_SECRET env var | Dynamic import $env/dynamic/private, Vercel cron injecte le Bearer token |
| 2026-04-03 | project.yaml + config.ts pour extraction template | Tout le specifique client (scoring, pipeline, sources, nav) centralise, code lit config.ts |
| 2026-04-03 | Page Aide integree (pas de CMS) | Contenu statique Svelte, sommaire cliquable, recherche client-side, IntersectionObserver |
