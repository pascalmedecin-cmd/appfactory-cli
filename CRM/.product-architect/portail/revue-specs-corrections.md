# Revue specs best-in-class + corrections actees (avant code)

**Date** : 2026-06-01
**Methode** : 2 relectures croisees (revue adversariale des specs + ancrage sur le code reel, chemins verifies ligne par ligne).
**Objectif** : zero tatonnement en Phase 3. Toute hypothese fausse corrigee ici fait foi sur les autres artefacts.

---

## A. Decisions tranchees (etaient ouvertes)

1. **URL : home portail = `/`, CRM sous `/crm`.** (Etait "a trancher Phase 2".) Decision finale.
2. **Mecanique de routes** (correction d'une erreur des specs) : pour obtenir le segment `/crm`, il faut un **dossier reel** `src/routes/crm/`, PAS un route group `(crm)` (les parentheses sont invisibles dans l'URL). Plan correct :
   - `src/routes/(app)/` (groupe actuel, sidebar + dashboard a `/`) -> renomme en **`src/routes/crm/`** (dossier reel) -> pages a `/crm/*`, dashboard a `/crm`, layout/sidebar = `crm/+layout.svelte`.
   - Home portail : **`src/routes/(portail)/+page.svelte`** (group invisible -> sert `/`) + **`src/routes/(portail)/+layout.svelte`** (header portail, sans sidebar).
   - `(mobile)` **n'existe pas** encore (V3 non mergee) : retirer cette mention des specs.

## B. Renommage : checklist exhaustive de fichiers (le pack en oubliait ~10)

Etat reel : `config.app.name = 'FilmPro CRM'` (pas "CRM FilmPro"). A renommer en **"FilmPro"** :

| Fichier | Quoi |
|---|---|
| `src/lib/config.ts:7` | `app.name` -> "FilmPro" |
| `src/lib/config.ts:9` | `app.description` -> "traitements pour vitrage (films + vernis)" (corrige "production audiovisuelle") |
| `src/app.html:12` | `<title>FilmPro CRM</title>` -> "FilmPro" |
| `static/manifest.webmanifest` | `"name": "FilmPro CRM"` -> "FilmPro" ; `theme_color: #00003B` a arbitrer vs `#2F5A9E` (mineur) ; `start_url:"/"` OK (= home portail) |
| 7 `<svelte:head><title>` de pages | reporting, veille/themes, aide, dashboard/couts, log (+ 2) : "... FilmPro CRM" -> "... FilmPro" |
| `src/lib/server/intelligence/email-recap.ts:23` | `CRM_URL='https://filmpro-crm.vercel.app'` -> env var (cf. C) |
| `src/lib/.../cross-check.ts:25` + `url-verify.ts:24` | User-Agent bot `FilmProBot +https://filmpro-crm...` -> env var |
| `src/lib/aide/content.ts` | texte d'aide mentionnant l'ancienne URL + "dossier CRM/" -> mettre a jour (chemin reel : src/lib/aide/, pas (app)/aide/) |
| **Template OTP Supabase (dashboard, hors repo)** | l'email OTP de login vit dans le dashboard Supabase, PAS dans le code. Probablement encore "CRM FilmPro" + ancienne URL. **Tache manuelle supervisee** (invisible au grep). |

Constat : `alt`/`aria-label` du logo = `config.app.name` (Sidebar, login) -> se corrigent automatiquement au renommage. "CRM" peut rester dans les **commentaires techniques** (doc interne, pas UI).

## C. URL publique : externaliser

4 hardcodes de `filmpro-crm.vercel.app` (email-recap, cross-check, url-verify, aide/content). -> Centraliser dans une **env var `PUBLIC_APP_URL`** + la consommer partout. Evite que la bascule d'adresse casse des liens.

## D. Redirections internes (favoris des fondateurs)

Si CRM passe sous `/crm`, les favoris internes sur `/pipeline`, `/signaux`, etc. donneront 404. -> Ajouter des **redirects 308** `/{pipeline,signaux,prospection,entreprises,contacts,veille,reporting,aide,log,dashboard/couts}` -> `/crm/...` (via `reroute` hook ou routes de redirection). + AC de test.

## E. Reprefixage : inventaire REEL (~21 fichiers, ~35 points, pas "7")

- `config.navigation` (11 entrees `href:'/...'`) -> prefixer `/crm`.
- ~16 `href="/..."` en dur dans 8 composants/pages (PipelineQuickAdvance, RelancesList x2, AlertesStrip x2, KpisBento x2, signaux x2, pipeline x2, entreprises x2, veille [id]/item).
- `goto('/')` login + `redirect(303,'/')` auth/callback + `hooks.server.ts:76` (login deja connecte) -> `/crm`.
- `redirect: '/pipeline'` action signaux:269 -> `/crm/pipeline`.
- `Sidebar isActive('/')` + `pageTitle` (layout) reposent sur `href==='/'` -> casser si `/` n'est plus le dashboard. A corriger dans le meme pass.
- **Approche** : introduire `const CRM_BASE = '/crm'` et prefixer, plutot que 35 remplacements string-by-string a la main.

## F. Re-login cross-domain (corrige une promesse erronee du PR/FAQ)

La bascule d'alias `filmpro-crm.vercel.app` -> `filmpro.vercel.app` **change d'origine** : les cookies de session httpOnly ne sont pas transferes. **Les 3 fondateurs devront se reconnecter** une fois sur la nouvelle adresse. -> Corriger le PR/FAQ ("sessions") + le message de communication doit le dire. Re-login = normal, pas un bug.

## G. Fondation referentiel partage : re-cadrage honnete (AC-014 / ADR-0002)

Le contrat disait "centraliser (cout nul si deja centralise)". **Faux** : aucun dossier `referentiel/` n'existe et les ecritures entreprises/contacts sont dispersees dans 5+ call sites :
- `(app)/entreprises/+page.server.ts` (insert/update/archive)
- `(app)/contacts/+page.server.ts:72` (insert entreprise) + `:129` (insert contact) + updates
- `api/contact-suggestions/[id]/resolve/+server.ts` (insert/delete contact)
- `api/visits` + `api/entreprises/search` (`getOrCreateEntreprise` dans geo-helpers)

La normalisation/dedup existe deja eparpillee (`text-normalize.ts`, `getOrCreateEntreprise`, unique index `20260510_001`). **Decision** : creer `src/lib/server/referentiel/{entreprises,contacts}.ts` qui **appelle la dedup existante** (ne la reinvente pas) + migrer les call sites des **2 pages critiques** (entreprises, contacts) ce chantier ; les call sites API restants = **dette nommee** (tracee, chantier 2 avec le Devis). Typer `EntrepriseUpsertInput` / `ContactUpsertInput` + regle de dedup explicite (raison_sociale normalisee + canton).

## H. Acceptance criteria : corrections

- `test_type` faux : AC-007 (config description) = **static check / grep**, pas Vitest unit. AC-012 (suite Vitest) OK mais AC-013 (svelte-check) = **commande CLI**, pas Vitest. Corriges dans `acceptance-criteria.json` v1.1.
- AC-006 (renommage) : passer de "manual verification" a **grep gate automatise** (CI) sinon regression silencieuse.
- AC manquants ajoutes (v1.1) : redirect URL interne testee, manifest/title check automatise, snapshot visuel home bloquant, env var URL, re-login cross-domain documente, template OTP Supabase.
- Liste des pages alignee : **11 pages** (dashboard, contacts, entreprises, pipeline, prospection, signaux, veille, reporting, aide, log, couts) + sous-routes veille (themes, item/[slug], [id]). "Smoke 7 pages" -> smoke 11 pages.

## I. Constats a graver (anti-tatonnement)

- `/api/*` et crons (`vercel.json`) sont **hors route group** -> la reorg ne les touche pas. Ne PAS les deplacer.
- **Service worker** : `src/service-worker.ts` **EXISTE** (verifie sur disque, divergence levee). Action : bumper le nom du cache SW (invalider l'ancien) au renommage + s'assurer que l'ancienne app n'est pas servie depuis le cache apres la bascule d'adresse. **AC a ajouter en Session 3** (verifier cache SW invalide post-bascule).
- `robots.txt` = tout crawlable : pour une app interne derriere OTP, **`Disallow: /`** recommande (best-in-class, mineur).
- RLS inchangee (mono-tenant plat) : OK pour 3 fondateurs, durcissement = autre chantier (4e user).

## Verdict

14 correctifs integres. Apres ces corrections, la reorg `(app)`->`crm/` + home `(portail)` a `/` est **mecaniquement faisable sans refonte** (confirme sur le code : groupes SvelteKit + `+layout.server.ts` se deplacent proprement, aucune dependance au path dans les `load`). Effort coding estime : ~1 session pour la reorg+renommage, +~0,5 session pour la couche referentiel, + QA.
