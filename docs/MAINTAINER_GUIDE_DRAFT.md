# Guide Mainteneur — FilmPro CRM

**Statut :** En cours de redaction (alimente au fil du developpement)
**Derniere mise a jour :** 2026-04-02

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
      database.types.ts      -- Types generes depuis Supabase
      supabase.ts             -- Client browser
      server/supabase.ts      -- Client server
    routes/
      +layout.svelte          -- Layout racine
      +layout.server.ts       -- Session loader
      +page.svelte             -- Dashboard
      login/                   -- Page connexion
      auth/callback/           -- OAuth callback
```

*A mettre a jour au fil des ajouts de routes et composants.*

---

## 4. Base de donnees

### 4.1 Tables CRM (existantes)
- contacts, entreprises, opportunites, prescripteurs
- signaux_affaires, activites, imports_zefix, utilisateurs

### 4.2 Tables Prospection (a creer)
- prospect_leads — voir docs/SPECS_PROSPECTION.md
- recherches_sauvegardees — voir docs/SPECS_PROSPECTION.md

### 4.3 Regenerer les types TypeScript
```bash
cd template
npx supabase gen types typescript --project-id fmflvjubjtpidvxwhqab > src/lib/database.types.ts
```

### 4.4 Migrations
*Documenter chaque migration SQL appliquee.*

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
- **Production :** Push sur `main` → https://template-rho-three.vercel.app
- **Variables d'env :** PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY (configurees dans Vercel)

---

## 7. APIs externes

| API | Usage | Auth | Quota | Doc |
|-----|-------|------|-------|-----|
| Zefix REST | Import entreprises | Credentials (en attente) | ? | swagger-ui |
| LINDAS SPARQL | Fallback Zefix | Aucune | Illimite | lindas.admin.ch |
| SIMAP | Marches publics | Aucune | ? | simap.ch |
| SITG | Permis construire GE | Aucune | Illimite | ge.ch/sitg |
| search.ch | Enrichissement tel | Cle API gratuite | 1000/mois | tel.search.ch/api |

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
Voir `docs/SPECS_PROSPECTION.md` section 5. Modifier la fonction `calculerScore()` et les seuils de classification.

---

## Journal des decisions techniques

| Date | Decision | Raison |
|------|----------|--------|
| 2026-04-02 | Pas de scraping FAO | Fragile, pas d'API, maintenance lourde |
| 2026-04-02 | Scoring stocke en base | Eviter recalcul cote client, permet tri SQL |
| 2026-04-02 | Slide-out au lieu de pages detail | Garder le contexte liste visible |
| 2026-04-02 | 100% sources gratuites | Zefix + LINDAS + SIMAP + SITG + search.ch |
