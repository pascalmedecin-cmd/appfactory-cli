# AppFactory - CLI — CLAUDE.md

**Statut :** Phase C — Skills et templates HTML (cadrage + generate + deploy)
**Derniere mise a jour :** 2026-04-07
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session precedente :** UX CRM 7 chantiers. Signaux : cards allegees (sans description preview), badge scoring colore (chaud/tiede/froid) sur cards + detail, slide-out restructure en sections (Acteurs/Localisation/Source/Scoring), selection multiple + suppression batch, filtrage SIMAP par mots-cles secteursCibles. Contacts : autocomplete entreprise avec creation a la volee et dedup fuzzy (normalisation nom sans SA/Sarl/GmbH), adresse exposee dans formulaire + slide-out, logo Clearbit. Entreprises : refonte DataTable → cards visuelles (logo, adresse Maps, compteur contacts, recherche), enrichissement Zefix (action serveur), creation manuelle + auto-creation depuis contacts. Cantons : composant CantonSelect.svelte reutilisable (dropdown 26 cantons, romands en premier) sur toutes les modals. Deploy prod valide (commit 344c6a9).

---

## QUICK START

```bash
# Ce repo contient le workflow CLI premium AppFactory v2
# Stack : SvelteKit + Supabase + Vercel + Claude Code skills

# Structure
# skills/          — Skills Claude Code (cadrage, generate, deploy)
# template/        — Template SvelteKit reutilisable (scaffold pour chaque app)
# previews/        — Templates HTML Tailwind pour previsualisation client
# scripts/         — Scripts utilitaires (yaml-to-config, etc.)
```

---

## ROLE

Product Engineer. Workflow CLI premium pour generer des apps metier de qualite production.
Pilotage depuis le terminal via Claude Code skills.

---

## STACK

| Couche | Outil | Role |
|--------|-------|------|
| Design | Screenshots + kits Figma Community (inspiration) | References visuelles, pas de pipeline Figma |
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
2. **Generation** — Scaffold SvelteKit complet depuis specs (project.yaml) + design system code-first
3. **Preview et tests** — URL Vercel preview, tests automatises, client teste et donne feedback
4. **Iteration** — Feedback client → modifications code → redeploy (minutes)
5. **Mise en production** — Domaine personnalise, base propre, acces client

---

## COUTS

### Fixes mensuels (operateur)
- Claude Code Max : 100-200 EUR/mois (deja en place)
- Vercel Pro : 20 EUR/mois
- GitHub : 0 EUR
- Supabase Free : 0 EUR (dev/staging)
- **Total : 120-220 EUR/mois**

### Par app client
- Supabase Free : 0 EUR (jusqu'a 500 Mo)
- Supabase Pro : 25 EUR/mois (si depassement)
- Vercel : inclus dans Pro
- Domaine : ~1 EUR/mois (~12 EUR/an)
- **Total : 0-26 EUR/app/mois**

---

## PLANNING INITIAL

→ Planning Phase A (jours 1-9, tous ✓) archive dans archive/planning-phase-a.md — consulter si besoin de comprendre l'ordre de construction du CRM
→ Phase B ANNULEE (decision 2026-04-04 : pas de Figma Pro)

### Phase C — Skills et templates HTML (jours 8-12)
- Jour 8-9 : Skill cadrage (dialogue -> project.yaml -> 4 pages HTML)
- Jour 10-11 : Skill generate (project.yaml + tokens -> SvelteKit scaffold)
- Jour 12 : Skill deploy (push -> Vercel preview/prod, test end-to-end)

---

## DECISIONS STRUCTURELLES

- Repo separe `appfactory-cli` (ancien `appfactory` reste consultable)
- Workflow prioritaire : construire le cycle core avant d'attaquer FilmPro
- FilmPro = premier projet reel du nouveau workflow (dogfooding)
- Figma Pro abandonne (deep research 2026-04-04 : ratio cout/benefice defavorable pour solopreneur code-first)
- Design = approche code-first : composants custom + kits Figma Community gratuits comme inspiration
- Validation client = prototypes Vercel preview (pas de maquettes Figma)
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
- **Page Aide** : documentation utilisateur integree (8 sections, sommaire, recherche)
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
- **Zefix REST** : credentials configures (local .env + Vercel prod/preview), compte actif depuis 2026-04-08
- **search.ch** : cle API configuree en local (.env) + Vercel prod
- **Securite** : email provider desactive (Google OAuth only), whitelist emails ALLOWED_EMAILS env var (pascal@filmpro.ch,pascal.medecin@gmail.com configure Vercel prod), validation Zod sur toutes les form actions (18 actions, 4+1 pages), dep Zod v4, rate limiting 10 req/min/IP sur /api/prospection/*, sanitisation SPARQL (lindas), protection JSON.parse (saveRecherche), scoring dates invalides/futures ignore, headers securite (CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy), timing-safe CRON_SECRET (crypto.timingSafeEqual), erreurs Supabase generiques cote client (console.error serveur), verification dependances avant delete entreprise, disabled sur boutons destructifs (anti double soumission)
- **Tests** : Vitest (113 tests : scoring + 19/19 schemas + validation + extractForm + API sparql/helpers) + Playwright (5 tests e2e : navigation + auth redirect)
- **Cron** : `/api/cron/signaux` quotidien 6h (veille Zefix+SIMAP) + `/api/cron/alertes` quotidien 7h, securises par CRON_SECRET (configure Vercel prod), service role client (bypass RLS)
- **SUPABASE_SERVICE_ROLE_KEY** : configuree local .env + Vercel prod (preview non configure — projet sans repo Git lie)

## WORKFLOW APPFACTORY

```
/start (terminal)
  ├─ 1. Modifier app existante → travail direct dans le code
  ├─ 2. Nouvelle app (entreprise existante) → /cadrage wizard HTML
  └─ 3. Nouvelle entreprise → wizard entreprise (navigateur) → /cadrage wizard HTML

/cadrage (wizard HTML navigateur, port 3334)
  Pitch → Entites → Pages → Regles → Recap → Valider
  → project.yaml genere + previews dans _previews/cadrage/

/generate → scaffold SvelteKit depuis project.yaml
/deploy preview → URL Vercel preview
/deploy prod → production + suppression _previews/
```

Fichiers cles :
- `registry.yaml` — registre entreprises/apps (source de verite)
- `branding/_catalogue.yaml` — 5 themes avec tokens complets
- `branding/_default.yaml` — theme par defaut (standard)
- `branding/[slug].yaml` — branding par entreprise
- `wizard/cadrage/` — 5 pages HTML + server.py + shared.css/js + logo
- `wizard/entreprise/` — wizard pre-cadrage entreprise (option 3), symlinks vers cadrage/shared.*
- `scripts/generate-branding-preview.ts` — genere previews/branding.html

## DOCUMENTATION

- `docs/SPECS_PROSPECTION.md` — Specs completes module prospection (sources, modele, scoring, UI, dedup)
- `docs/USER_GUIDE_DRAFT.md` — Guide utilisateur, alimente au fil du dev
- `docs/MAINTAINER_GUIDE_DRAFT.md` — Guide mainteneur, alimente au fil du dev

→ Inventaire composants EN PLACE (11 composants, 6 pages, 4 API, scripts) archive dans archive/inventaire-composants.md — consulter si besoin de lister les composants existants avant d'en creer de nouveaux

## OBJECTIF PROCHAINE SESSION

Test utilisateur complet dans le navigateur :
- Tester les 7 changements UX en prod (signaux, contacts, entreprises, cantons)
- Tester enrichissement Zefix (bouton sur fiche entreprise) — compte actif depuis 08.04
- Tester autocomplete entreprise sur page Contacts (creation, dedup fuzzy)
- Tester selection multiple + suppression batch sur Signaux
- Relancer cron Signaux pour valider le filtrage SIMAP (mots-cles secteur)
- Verifier bandeau alertes dashboard avec signaux neufs reels

**Aussi en attente :**
- Workflow complet /start → /cadrage → /generate → /deploy (reporte)
- Evaluation Agent Teams sur les autres projets Claude (prompt prepare, session separee)
- Env vars Vercel preview SUPABASE_SERVICE_ROLE_KEY : a configurer si besoin (bloque par absence de repo Git lie sur Vercel)

**Decisions session 2026-04-07 (8e session) :**
- 7 chantiers UX : signaux (lisibilite, scoring, filtrage SIMAP, selection batch), contacts (autocomplete entreprise, dedup fuzzy, adresse, logo), entreprises (cards, Zefix, Maps), cantons (dropdown)
- Composant CantonSelect.svelte reutilisable (26 cantons, romands en premier, optgroup)
- Autocomplete entreprise : normalisation fuzzy (strip SA/Sarl/GmbH, lowercase, alphanum) pour dedup a la creation
- Page Entreprises derivee des contacts (auto-creation) + creation manuelle possible
- Logo Clearbit via `logo.clearbit.com/{domain}` (fallback initiales si pas de site_web)
- Enrichissement Zefix : action serveur `/enrichir` (IDE, adresse, canton, description)
- Filtrage SIMAP a l'import : ne garde que les projets matchant les 19 mots-cles `secteursCibles`
- Suppression batch signaux : action `deleteBatch` avec validation Zod (ids comma-separated)
- Deploy prod valide (commit 344c6a9)

**Decisions session 2026-04-07 (7e session) :**
- Cron `/api/cron/signaux` : veille quotidienne 6h, Zefix (creations entreprises) + SIMAP (appels d'offres), 6 cantons romands
- Migration BDD : colonnes source_id (dedup) + score_pertinence (scoring auto) sur signaux_affaires
- Service role client Supabase (createSupabaseServiceClient) pour crons sans session utilisateur
- Scoring automatique calculerScore() branche sur les signaux importes
- Dedup sur source_officielle + source_id (unique index partiel)
- Test reel : 59 signaux SIMAP importes, score moyen 7/13, dedup validee (2e run = 0)
- Zefix 401 attendu (compte actif 08.04)
- Audit securite : erreurs internes masquees en reponse, cron alertes migre vers service role
- SUPABASE_SERVICE_ROLE_KEY : local + Vercel prod (preview bloque par absence repo Git)
- Deploy prod valide (commits 4e0f51c + 248e37c)

**Decisions session 2026-04-07 (6e session) :**
- Refonte page Signaux : vue tableau → vue cards visuelles (icone par type, badge statut, date relative)
- Modal creation allegee : 10 champs → 4 (type, description, canton, maitre d'ouvrage), champs complets en edition
- Bouton supprimer avec confirmation (action delete + SignalDeleteSchema)
- Bandeau explicatif permanent (veille automatique, ajout manuel)
- Compteurs par statut cliquables (filtrage rapide)
- Labels config.signaux.types[].label branches (corrige « Appel offres » → « Appel d'offres »)
- Bandeau alertes signaux neufs sur dashboard (avant bandeau prospection)
- Credentials Zefix configures : local .env + Vercel prod + Vercel preview, compte actif 08.04
- Deploy prod valide dans le navigateur (commit 6711b6b)

**Decisions session 2026-04-07 (5e session) :**
- Audit dual refactoring-ui + ux-guide sur CRM FilmPro (6 pages, 7 composants)
- Corrections P0 : accents FR dans 7 fichiers (config, pipeline, signaux, prospection, LeadSlideOut, ImportModal, dashboard)
- Corrections P0 : empty states avec CTA sur Contacts et Entreprises (composant EmptyState existant)
- Corrections P1 : dashboard onboarding « Pour demarrer » (3 etapes) + suggestions activite quand vide
- Corrections P1 : icone Pipeline filter_list → conversion_path (sidebar + stats cards)
- Corrections P1 : confirmation avant archivage contact, suppression entreprise, marquer perdu
- Corrections P1 : prospection/signaux vides = 2 blocs explicatifs (fonctionnalite + alertes automatiques)
- Corrections P2 : pagination DataTable icones Material, sidebar deconnexion contraste white/40 → white/60
- Corrections P2 : header affiche nom page courante, logo sidebar utilise logoWhite sur fond dark
- Score Refactoring UI : 6 → ~8/10
- Deploy prod valide dans le navigateur (commit 8819892)

**Decisions session 2026-04-07 (4e session) :**
- Audit dual ux-guide + refactoring-ui sur les 2 wizards (6 pages HTML total)
- 37 corrections appliquees (commit 513d3c8) : WCAG contraste --text-light, required *, polling timeout 30s, stepper cliquable, radio auth provider, drag feedback, confirmation recap double-clic, responsive entreprise, auto-save retour, Enter submit, logo file picker, boutons + labellises, empty state fallback, CTA labels standardises
- Score Refactoring UI : 6.5 → ~8/10
- Aucune regression constatee — valide par Pascal dans le navigateur

**Decisions session 2026-04-07 (3e session) :**
- Launcher CLI (`start.sh`) : menu dynamique → menu fixe 5 options, ordre choisi par Pascal
- Option 5 « Global » : travail sur regles/skills/commands cross-projets (cd ~/.claude/)
- AppFactory (v1) renomme « AppFactory - Archive » — consultable mais exclu du menu

**Decisions session 2026-04-07 (2e session) :**
- 2 skills design installes en bibliotheque : refactoring-ui (audit visuel, scoring 0-10) + ux-guide (audit UX, review P0/P1/P2)
- Audit conflits complet : sections Anti-AI Defaults retirees de ux-guide, bans de fonts retires de frontend-design
- Coherence verifiee entre 4 skills design (refactoring-ui, ux-guide, frontend-design, theme-factory) : 0 conflit, 0 NEVER/forbidden
- Principe : aucun skill ne prescrit de font ou couleur specifique — branding projet (branding/*.yaml) est le seul arbitre

**Decisions session 2026-04-07 (1re session) :**
- Wizard entreprise cree (wizard/entreprise/) : 3 etapes navigateur (infos → synthese IA → branding)
- Header simplifie : texte blanc 24px sans cadre, AppFactory | Entreprise
- Serveur unifie : --mode entreprise, --enterprise JSON pour contexte
- Charte graphique exportee vers projet Enseignement (shared.css, tokens AppFactory, header noir)
- clone-website skill recupere depuis JCodesMore/ai-website-cloner-template, stocke dans skills-library (inactif)
- plugins-reference.md restructure : architecture 3 niveaux (globaux / bibliotheque / plugins)

**Decisions session 2026-04-06 (2e session) :**
- /start cree : point d'entree unique avec 3 chemins (modifier app / nouvelle app / nouvelle entreprise)
- registry.yaml : registre central entreprises/apps (FilmPro + CRM pre-rempli)
- Catalogue branding : 5 themes (_catalogue.yaml), preview HTML generee par script
- Wizard cadrage HTML : 5 etapes (pitch, entites, pages, regles, recap), serveur Python port 3334
- Architecture wizard : polling /api/state, injection Claude, auto-navigation entre etapes

**Prerequis :**
- Aucun bloquant technique

→ Audit CRM FilmPro 2026-04-04 (4 sprints, tous corriges) archive dans archive/audit-crm-2026-04-04.md — consulter si regression securite/qualite/tests OU comme reference methodologique pour le prochain audit (5 agents, scoring par axe, sprints par severite)

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
