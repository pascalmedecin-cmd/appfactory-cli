# AppFactory - CLI — CLAUDE.md

**Statut :** Phase A — Jour 9 termine + polish UX, Phase B a venir
**Derniere mise a jour :** 2026-04-03
**Prochain bug :** #001
**Session precedente :** UX polish — toasts notifications (21 form actions), animations SlideOut/ModalForm, coherence design tokens (login + dashboard + prospection), focus visible CSS, nettoyage ActionData inutilise. Decision : pas de Figma Pro ni shadcn/ui migration, ameliorations ciblees de l'existant

---

## QUICK START

```bash
# Ce repo contient le workflow CLI premium AppFactory v2
# Stack : SvelteKit + Supabase + Vercel + Figma + Claude Code skills

# Structure
# skills/          — Skills Claude Code (cadrage, generate, deploy)
# template/        — Template SvelteKit reutilisable (scaffold pour chaque app)
# previews/        — Templates HTML Tailwind pour previsualisation client
# scripts/         — Scripts utilitaires (extraction tokens Figma, etc.)
```

---

## ROLE

Product Engineer. Workflow CLI premium pour generer des apps metier de qualite production.
Pilotage depuis le terminal via Claude Code skills.

---

## STACK

| Couche | Outil | Role |
|--------|-------|------|
| Design | Figma Pro + Plugin custom | Maquettes uniques par client, tokens exportables |
| Tokens | Tokens Studio + script | Design Figma -> config Tailwind auto |
| Pilotage | Claude Code + 3 skills | Cadrage, generation, deploiement |
| Frontend | SvelteKit + Tailwind | Apps web performantes, composants testables |
| Backend | Supabase (PostgreSQL) | BDD, auth, API, stockage |
| Hebergement | Vercel | Deploy auto, previews, domaines custom, CDN |
| Tests | Vitest + Playwright | Tests unitaires + navigation complete |
| Cadrage visuel | Templates HTML Tailwind | Pages de presentation pour validation client |
| Code | GitHub | 1 repo par app, versionne |

---

## WORKFLOW 6 ETAPES

1. **Cadrage** — Dialogue naturel terminal, pages HTML de validation client
2. **Design Figma** — Maquettes generees depuis specs, client commente
3. **Extraction tokens** — Figma -> tailwind.config automatique
4. **Generation** — Scaffold SvelteKit complet depuis specs + tokens
5. **Preview et tests** — URL Vercel preview, tests automatises, client teste
6. **Mise en production** — Domaine personnalise, base propre, acces client

---

## COUTS

### Fixes mensuels (operateur)
- Claude Code Max : 100-200 EUR/mois (deja en place)
- Vercel Pro : 20 EUR/mois
- Figma Pro : 15 EUR/mois
- GitHub : 0 EUR
- Supabase Free : 0 EUR (dev/staging)
- **Total : 135-235 EUR/mois**

### Par app client
- Supabase Free : 0 EUR (jusqu'a 500 Mo)
- Supabase Pro : 25 EUR/mois (si depassement)
- Vercel : inclus dans Pro
- Domaine : ~1 EUR/mois (~12 EUR/an)
- **Total : 0-26 EUR/app/mois**

---

## PLANNING INITIAL

### Phase A — Migration CRM FilmPro (jours 1-9)
- Jour 1 : Init SvelteKit + Supabase + Tailwind + Auth Google OAuth + deploy Vercel ✓
- Jour 2 : Schema BDD — migration tables Sheets -> PostgreSQL + RLS ✓
- Jour 3-4 : Layout + design system + pages Contacts + Entreprises + Dashboard ✓
- Jour 5 : Pipeline kanban + opportunites + signaux d'affaires ✓
- Jour 6 : Prospection multi-sources (table prospect_leads, UI, scoring, dedup, batch) ✓
- Jour 7 : Integration APIs (LINDAS, SIMAP fonctionnels + Zefix, search.ch prets) ✓
- Jour 8 : Recherches sauvegardees + alertes cron + responsive + rate limiting + tests ✓
- Jour 9 : Page Aide (doc utilisateur integree) + extraction template (project.yaml + config.ts) + env vars prod ✓

### Phase B — Plugin Figma + Outillage (jours 1-5, parallele)
- Jour 1-2 : Design system Figma (composants de base, tokens)
- Jour 3-4 : Plugin Figma bidirectionnel (specs -> frames, export tokens)
- Jour 5 : Script extraction tokens (JSON -> tailwind.config.js)

### Phase C — Skills et templates HTML (jours 8-12)
- Jour 8-9 : Skill cadrage (dialogue -> project.yaml -> 4 pages HTML)
- Jour 10-11 : Skill generate (project.yaml + tokens -> SvelteKit scaffold)
- Jour 12 : Skill deploy (push -> Vercel preview/prod, test end-to-end)

---

## DECISIONS STRUCTURELLES

- Repo separe `appfactory-cli` (ancien `appfactory` reste consultable)
- Workflow prioritaire : construire le cycle core avant d'attaquer FilmPro
- FilmPro = premier projet reel du nouveau workflow (dogfooding)
- Figma = moyen/long terme, plugin custom 3-5 jours dev
- Commencer sans plugin Figma (tokens manuels), le plugin est un accelerateur
- HTML temporaires pour previsualisations client a chaque etape cle
- Ancien projet AppFactory v1 (Apps Script) = archive consultable, pas de migration

### Decisions UX (G36)

- **6 ecrans principaux** au lieu de 15 : Dashboard, Contacts, Entreprises, Pipeline, Prospection, Signaux + Parametres en menu secondaire
- **Slide-out panels** au lieu de pages detail separees (liste reste visible)
- **Saisie rapide** (6 champs) + accordeon "Plus de details" pour les formulaires
- **Pas de page Prescripteurs** : filtre + badge dans Contacts
- **Pas de page Journal equipe** : section dashboard + timeline sur les fiches
- **Relances du jour** : bandeau dashboard + badges pipeline (pas une page separee)
- **Prospection = page a part entiere** avec multi-sources, scoring, alertes, dedup, actions batch
- **Page Aide** : vide pour l'instant, alimentee en dernier quand tout fonctionne
- **Documentation au fil de l'eau** : USER_GUIDE_DRAFT.md + MAINTAINER_GUIDE_DRAFT.md mis a jour a chaque session

### Decisions Prospection (G36)

- **100% sources gratuites** : Zefix REST + LINDAS SPARQL + SIMAP + SITG (GE) + search.ch + FOSC
- **Pas de Google Places** ni source payante
- **Modele unifie `prospect_leads`** : toutes les sources alimentent une table unique
- **Scoring automatique** (0-13 points) : canton, secteur, signal chaud, recence, enrichissement
- **Dedup a l'import** sur source+source_id, leads ecartes/transferes jamais reimportes
- **Selection multiple + actions batch** : interesse / ecarter / transferer vers CRM
- **Raccourcis clavier** pour traitement rapide en volume
- **Recherches sauvegardees + alertes** (cron quotidien/hebdomadaire)
- **Specs completes** : voir `docs/SPECS_PROSPECTION.md`

---

## INFRA EN PLACE

- **Vercel** : https://template-rho-three.vercel.app (prod), env vars configurees (PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY)
- **Supabase** : projet `appfactory` (fmflvjubjtpidvxwhqab), region EU
- **Google OAuth** : projet `appfactory-492107`, client ID `705315536802-...`
- **Auth** : Google OAuth via Supabase, redirect callback configure
- **Runtime** : Node.js 22.x sur Vercel
- **Supabase CLI** : v2.84.2, projet linke (fmflvjubjtpidvxwhqab)
- **BDD** : 10 tables PostgreSQL (+ prospect_leads, recherches_sauvegardees), FK, index, RLS (authenticated full access), types TS generes
- **Zefix REST** : Pascal a repondu a zefix@bj.admin.ch (username pascal@filmpro.ch), en attente du mot de passe (plusieurs jours)
- **search.ch** : cle API configuree en local (.env) + Vercel prod
- **Securite** : email provider desactive (Google OAuth only), validation Zod sur toutes les form actions (18 actions, 4+1 pages), dep Zod v4, rate limiting 10 req/min/IP sur /api/prospection/*
- **Tests** : Vitest (34 tests : scoring + schemas + validation) + Playwright (5 tests e2e : navigation + auth redirect)
- **Cron** : `/api/cron/alertes` quotidien 7h (vercel.json), securise par CRON_SECRET (configure Vercel prod)

## DOCUMENTATION

- `docs/SPECS_PROSPECTION.md` — Specs completes module prospection (sources, modele, scoring, UI, dedup)
- `docs/USER_GUIDE_DRAFT.md` — Guide utilisateur, alimente au fil du dev
- `docs/MAINTAINER_GUIDE_DRAFT.md` — Guide mainteneur, alimente au fil du dev

## EN PLACE (Jour 9)

- **Design system** : CSS variables primary/accent, font DM Sans, Material Symbols icons
- **Layout** : sidebar 220px collapsible (56px) + header 48px, groupe route `(app)/`, responsive mobile (burger menu + overlay)
- **9 composants** : `src/lib/components/` — DataTable (selectable avec $bindable), SlideOut (anime slide-in), ModalForm (anime scale), FormField, Badge, EmptyState, Header, Sidebar, Toast (notifications succes/erreur/warning/info)
- **Toast store** : `src/lib/stores/toast.ts` — store Svelte avec methodes success/error/warning/info, auto-dismiss 4-6s
- **Focus visible** : CSS global (app.css) — outline accent sur boutons/liens en navigation clavier
- **Validation** : `src/lib/schemas.ts` — 18+ schemas Zod (contacts, entreprises, opportunites, signaux, leads, recherches) + helper `validate()`
- **Scoring** : `src/lib/scoring.ts` — calcul 0-13 points (canton, secteur, signal, recence, tel, montant)
- **Page Contacts** : CRUD complet (create/update/archive), DataTable tri/recherche, SlideOut detail, ModalForm 6 champs
- **Page Entreprises** : CRUD complet (create/update/delete), contacts rattaches dans SlideOut
- **Dashboard** : 4 stats cards, relances du jour, derniere activite, raccourcis, bandeau alertes prospection (nouveaux leads)
- **Page Pipeline** : Vue kanban 6 colonnes (Identification→Perdu), drag & drop HTML5 natif, total montant/colonne, CRUD opportunites (create/update/archive), SlideOut detail avec liens contact/entreprise, relances en retard en rouge
- **Page Signaux** : DataTable avec 3 filtres (type/canton/statut), SlideOut detail, CRUD signal, action "Creer opportunite" (conversion + redirect pipeline), action "Ecarter", 5 statuts (nouveau/en_analyse/interesse/ecarte/converti)
- **Page Prospection** : DataTable selectable, 4 filtres (source/canton/statut/score), SlideOut detail avec scoring detaille, creation manuelle, actions unitaires + batch (interesse/ecarter), transfert vers CRM (cree entreprise + contact), dedup source+source_id, recherches sauvegardees (save/load/delete), alertes avec compteur nouveaux leads
- **API Prospection** : 4 routes API dans `src/routes/api/prospection/`
  - `lindas/` — SPARQL registre du commerce par canton + mots-cles (fonctionnel, teste)
  - `simap/` — Marches publics construction par canton + periode (fonctionnel, teste)
  - `zefix/` — Import bulk registre du commerce complet (pret, attend env vars ZEFIX_USERNAME/PASSWORD)
  - `search-ch/` — Enrichissement telephone par lead (cle API configuree en local)
- **API Cron** : `src/routes/api/cron/alertes/` — execution recherches sauvegardees, comptage nouveaux leads
- **UI Import** : modal 3 sources (LINDAS, Zefix, SIMAP), bouton "Enrichir telephone" dans SlideOut, notifications succes/erreur
- **Page Aide** : documentation utilisateur integree, sommaire cliquable, recherche texte, IntersectionObserver pour section active, 8 sections (connexion, navigation, dashboard, contacts, entreprises, pipeline, prospection, signaux)
- **Extraction template** : `project.yaml` (source de verite specs client) + `src/lib/config.ts` (miroir TS importe par le code). scoring.ts, Sidebar.svelte, pipeline/+page.svelte et lindas/+server.ts migres pour lire la config

## OBJECTIF PROCHAINE SESSION

Continuer l'extraction template :
- Script de generation config.ts depuis project.yaml (eviter maintenance manuelle des deux fichiers)
- Migrer les pages restantes (contacts, entreprises, signaux, dashboard, prospection) pour lire config.ts
- Finaliser les sections "A documenter" du USER_GUIDE_DRAFT.md (Connexion details, Dashboard, Contacts, Entreprises, Parametres)

**En attente :**
- Credentials Zefix (email envoye a zefix@bj.admin.ch)

**Decisions session :**
- Figma Pro non necessaire pour le workflow actuel (pas de client qui attend des maquettes, pas de gain tokens)
- Pas de migration shadcn/ui (risque regression, version Svelte moins mature), ameliorations ciblees a la place
- Objectif design best-in-class : references visuelles + bonnes pratiques UI directement dans le code

**Prerequis :**
- Objectif mesurable : script yaml→config.ts fonctionnel

---

## NE PAS FAIRE

- Generer du code sans specs validees (project.yaml)
- Construire de l'outillage sans projet reel pour le valider
- Utiliser l'ancien workflow AppFactory v1 pour generer du code
- Deployer sans tests (Vitest + Playwright minimum)
- Hardcoder des valeurs specifiques client dans le template

## TOUJOURS FAIRE

- Chaque etape produit un livrable concret et mesurable
- Review humaine visible dans le terminal avant tout deploy
- Tests automatises avant mise en preview
- project.yaml comme source de verite des specs
- Extraire le generique (template) du specifique (app client) en continu
- Mettre a jour USER_GUIDE_DRAFT.md apres chaque feature implementee
- Mettre a jour MAINTAINER_GUIDE_DRAFT.md apres chaque decision technique
- Checklist fin de session : docs/USER_GUIDE_DRAFT.md et docs/MAINTAINER_GUIDE_DRAFT.md a jour ?
