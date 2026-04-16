# AppFactory — CLAUDE.md

**Statut :** Phase C — Skills et templates HTML + module Veille sectorielle en production + pipeline images 4 niveaux (Flux 1.1 Pro Ultra + audits Vision) + sous-projet `formation-ia/` S2 livrée
**Derniere mise a jour :** 2026-04-16 (session 68 fin : formation-ia S2 livrée — charte Anthropic appliquée, features core DB branchées, 34 tests verts, deploy prod)
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session precedente -3 :** Session 64. Fix UI breakdown scoring (commit `7ca08e5` pushed). Slide-out prospection affiche désormais ligne synthétique `Signal Veille (+N)` quand `score_pertinence` DB > somme critères recalculés + total aligné sur la DB. 285/285 tests verts.
**Session precedente -2 :** Session 65 (très courte). Bascule cron Veille vendredi 8h → jeudi 7h (commit `126e246` pushed, `template/vercel.json`). Suppression row W16 en DB.
**Session precedente -1 :** Session 66 (Bloc 6bis livré complet). Bibliothèque photo FilmPro : table `media_library` Postgres + bucket Supabase Storage `media-library` (public, CDN) + module upload idempotent dedup SHA256 + scoring qualité 0-10. Seed 30 images iCloud + module enrich Pexels/Unsplash + cron hebdo jeudi 8h UTC + fallback /veille. 41 images en DB. 299/299 tests verts. Commits `e260e05` + `b9b3272`.
**Session precedente :** Session 67 (Bloc 6ter/quater livré, **QA visuel images rejeté en fin de session**). Pipeline images refondu en cascade 4 niveaux : (1) og:image filtrée (filtres URL pattern + HEAD content-type/size), (2) fal.ai **Flux 1.1 Pro Ultra** ($0.06/img, 2K natif) avec brief LLM Sonnet 4.6 structuré JSON (ancrage métier vitrages) + audit Vision Sonnet 4.6 pertinence ≥6/10, (3) media_library picker top-N quality_score, (4) gradient. **Retrait complet Pexels + Unsplash** (code, cron, env vars Vercel, refs). Lib purgée manuellement via viewer HTML (156 → 44 images : 27 seed + 10 pexels + 7 unsplash). Bascule Veille text Sonnet → **Opus 4.6**. Vision audit initialement Opus → Sonnet (contrainte timeout 300s Vercel Hobby). `maxDuration=300` sur `/api/cron/intelligence`. 334/334 tests verts (+35 nouveaux : segment-mapper, og-image-quality, veille-fallback, test-fal-prompt). Régen W16 prod : item 1 og Springer (niveau 1, schéma scientifique probablement non conforme), item 2 fal.ai Flux 2752×1536 (niveau 2). Commits `46d368e` + `146256f` + `c269bd1` + `d3a6792` + `fd24ebb` pushed. Migration DB `media_library_source_check` étendue à 'fal-ai' via Management API. **Pascal a signalé en fin de session : "image veille test non conformes, continuer cadrage QA prochaine session"** — voir `memory/project_qa_images_veille.md` pour contexte + actions à évaluer.

---

## SOUS-PROJETS

L'arborescence d'AppFactory héberge des sous-projets autonomes (chacun a son propre repo Git, sa propre stack, son propre CLAUDE.md). Pascal navigue par thème depuis ce dossier.

| Dossier | Repo Git | Statut | URL prod | CLAUDE.md |
|---------|----------|--------|----------|-----------|
| `template/` (CRM FilmPro) | `pascalmedecin-cmd/appfactory-cli` (=racine actuelle) | Production | <https://filmpro-crm.vercel.app> | (ce fichier) |
| `formation-ia/` | `pascalmedecin-cmd/onboarding-ia` (séparé, ignoré dans `.gitignore`) | S1 + CP2 livrés | <https://onboarding-ia.vercel.app> | `formation-ia/CLAUDE.md` |

Pour travailler sur un sous-projet : `cd formation-ia/` puis lire son `CLAUDE.md` propre. Les tâches du sous-projet sont tracées dans son CLAUDE.md, pas dans celui-ci.

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
- CSS scoped obligatoire pour le layout structurel (sidebar, header, nav) — Tailwind responsive (md:hidden, md:block) ne fonctionne pas avec Tailwind v4 pour ce cas
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
- **Documentation** : integree dans la page /aide interactive

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

- **Vercel** : https://filmpro-crm.vercel.app (prod), GitHub lie (repo appfactory-cli, deploys auto), env vars configurees prod+preview (9 variables)
- **Supabase** : projet `appfactory` (fmflvjubjtpidvxwhqab), region EU
- **Auth** : OTP code email 6 chiffres via Supabase (signInWithOtp sans emailRedirectTo), domaine @filmpro.ch valide cote serveur (form action), login 2 ecrans (email → code), session max 7 jours via cookie httpOnly login_at (hooks.server.ts), callback /auth/callback conserve pour compatibilite
- **SMTP** : Resend (free plan permanent, 3000 emails/mois), domaine filmpro.ch verifie, sender noreply@filmpro.ch, DNS Infomaniak (DKIM + MX + SPF sur sous-domaine send)
- **Runtime** : Node.js 22.x sur Vercel
- **Supabase CLI** : v2.90.0, projet linke (fmflvjubjtpidvxwhqab)
- **BDD** : 10 tables PostgreSQL (+ prospect_leads, recherches_sauvegardees), FK, index, RLS (authenticated full access), types TS generes
- **Zefix REST** : credentials configures (local .env + Vercel prod/preview), compte actif depuis 2026-04-08
- **search.ch** : cle API configuree en local (.env) + Vercel prod+preview
- **fal.ai** : FAL_KEY configurée local .env + Vercel prod (session 67, clé partagée avec Enseignement). Modèle utilisé : Flux 1.1 Pro Ultra ($0.06/image, aspect 16:9 2K natif) pour génération niveau 2 cascade /veille
- **Pexels + Unsplash** : SUPPRIMÉS session 67 (local + Vercel prod). Labels 'pexels'/'unsplash' conservés en DB media_library comme historique, mais plus aucun import nouveau
- **Securite** : OTP code email @filmpro.ch (validation domaine serveur, Google OAuth desactive, email provider active), ALLOWED_DOMAINS + ALLOWED_EMAILS env vars, session 7 jours max (cookie login_at), validation Zod sur toutes les form actions (19 actions, 4+1 pages), dep Zod v4, rate limiting 10 req/min/IP sur /api/prospection/*, sanitisation SPARQL (lindas), protection JSON.parse (saveRecherche), scoring dates invalides/futures ignore, headers securite (CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy), timing-safe CRON_SECRET (crypto.timingSafeEqual), erreurs Supabase generiques cote client (console.error serveur), verification dependances avant delete entreprise, disabled sur boutons destructifs (anti double soumission)
- **Tests** : Vitest (164 tests : scoring + 19/19 schemas + validation + extractForm + API sparql/helpers + 16 auth email + prospection-utils) + Playwright (5 tests e2e : navigation + auth redirect)
- **Accessibilité** : focus trap clavier (trapFocus action) sur toutes les modales et slide-outs, role="dialog" aria-modal="true", confirmations destructives via ConfirmModal (plus de window.confirm)
- **Pagination serveur** : page prospection paginée côté serveur (URL params page/sort/dir/source/canton/statut/temp/q, Supabase count+range, 25/page)
- **Cron** : `/api/cron/signaux` quotidien 6h (veille Zefix+SIMAP) + `/api/cron/alertes` quotidien 7h + `/api/cron/nettoyage-crm` mensuel 3h le 1er (archive entreprises radiees Zefix, batch 200 FIFO) + `/api/cron/intelligence` hebdo jeudi 7h UTC (Opus 4.6 + génération fal.ai Flux + audit Vision Sonnet, maxDuration=300s contrainte Hobby) + `/api/cron/intelligence-archive` quotidien 4h. Tous sécurisés par CRON_SECRET (Vercel prod), service role client (bypass RLS). Cron `media-enrich` SUPPRIMÉ session 67.
- **SUPABASE_SERVICE_ROLE_KEY** : configuree local .env + Vercel prod (preview non configure — projet sans repo Git lie)

## WORKFLOW APPFACTORY

```
/start (terminal) — menu standard + options projet
  ├─ [3] Modifier app existante → travail direct dans le code
  ├─ [4] Nouvelle app (entreprise existante) → /cadrage wizard HTML
  └─ [5] Nouvelle entreprise → wizard entreprise (navigateur) → /cadrage wizard HTML

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

→ Inventaire composants EN PLACE (11 composants, 6 pages, 4 API, scripts) archive dans archive/inventaire-composants.md — consulter si besoin de lister les composants existants avant d'en creer de nouveaux

### Condensé thématique (sessions 9-16)

→ Détail chronologique : `archive/decisions-sessions-9-16.md`

**Auth / Sécurité :**
- Migration Google OAuth → magic link Supabase (email OTP + PKCE), validation domaine @filmpro.ch serveur
- MFA TOTP ajouté (Google Authenticator), obligatoire pour tous, allowlist routes auth (defense in depth)
- Magic link Safari mobile OK (rate limit était la seule cause d'échec, pas PKCE)
- 16 tests auth dont 7 refus, session permanente (CRM privé 2 utilisateurs)
- Audit sécurité : 1 HIGH + 1 MEDIUM corrigés

**Infra / Deploy :**
- Vercel Root Directory → `template`, skip deployments hors template/
- Projet renommé filmpro-crm (pas de domaine custom, URL Vercel suffit)
- Node.js 22.x → 24.x (auto Vercel)

**PWA :**
- Manifest + icônes Logo FP (192/512/apple-touch), plein écran, theme-color, validé iPhone

**UX / Design :**
- Design premium Untitled UI + SnowUI + CRM Kit : tokens ombres multi-niveaux, radius 8-12px, badges dot+border
- 13 grilles responsives, colonnes Contacts redistribuées
- CSS scoped pour layout structurel (cf. DECISIONS STRUCTURELLES)

**Prospection :**
- 60 signaux corrompus nettoyés, 58 réimportés propres, scoring différencié par canton
- Enrichissement Zefix validé, 6 bugs corrigés (typo, canton, autocomplete, pluriels)

### Condensé thématique (sessions 1-8)

→ Détail chronologique : `archive/decisions-sessions-1-8.md`

**UX / Design :**
- 6 ecrans principaux (Dashboard, Contacts, Entreprises, Pipeline, Prospection, Signaux) + Parametres secondaire
- Slide-out panels (liste reste visible), saisie rapide 6 champs + accordeon details
- Design premium Untitled UI + SnowUI : ombres multi-niveaux, radius 8-12px, sidebar 240px, badges dot+border
- Score Refactoring UI : 6 → ~8/10 (CRM) et 6.5 → ~8/10 (wizards) apres 2 audits dual
- Empty states avec CTA, dashboard onboarding 3 etapes, confirmations destructives, pagination Material
- CantonSelect reutilisable (26 cantons, romands en premier)

**Signaux / Prospection :**
- Vue cards visuelles (icone type, badge statut, date relative), compteurs cliquables
- Modal creation allegee 4 champs, edition complete en slide-out
- Crons quotidiens : `/api/cron/signaux` (6h, Zefix+SIMAP) + `/api/cron/alertes` (7h)
- Dedup source_officielle+source_id (unique index partiel), scoring 0-13 auto
- Filtrage SIMAP sur 19 mots-cles secteursCibles, suppression batch Zod
- Autocomplete entreprise fuzzy (strip SA/Sarl/GmbH), logo Clearbit, enrichissement Zefix `/enrichir`

**Wizards :**
- Wizard cadrage : 5 etapes HTML (pitch, entites, pages, regles, recap), serveur Python port 3334
- Wizard entreprise : 3 etapes (infos → synthese IA → branding), serveur unifie --mode entreprise
- Architecture : polling /api/state, injection Claude via curl, auto-navigation
- 37 corrections WCAG appliquees (contraste, required, stepper cliquable, responsive)

**Infra / Skills :**
- registry.yaml registre central, catalogue branding 5 themes, preview HTML generee
- Branding : aucun skill ne prescrit font/couleur — branding/*.yaml est l'arbitre unique
- 4 skills design coherents (refactoring-ui, ux-guide, frontend-design, theme-factory) : 0 conflit

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

## Prochaine session

- [ ] **[EXÉCUTABLE — PRIORITÉ]** QA cadrage images /veille W16 (rejet Pascal fin session 67) : parcours visuel des 2 images W16 actuelles, listing problèmes précis (cadrage, sujet, type schéma vs photo, pertinence), puis proposition structurée (audit Vision Opus vs Sonnet, durcir seuil ≥7 ou ≥8, étendre filtrage og:image pour rejeter schémas/infographies, retry fal.ai si rejet, éventuel upgrade Vercel Pro pour libérer 300s). Script test isolé `scripts/test-fal-prompt.ts` à relancer avec ajustements avant toute modif pipeline. Spec/contexte → voir `memory/project_qa_images_veille.md`.
- [x] ~~Validation live fallback /veille~~ — Fait 2026-04-16 session 67 : item 1 og:image Springer niveau 1, item 2 fal.ai Flux Pro Ultra niveau 2.
- [x] ~~Déclenchement manuel cron media-enrich~~ — Fait 2026-04-16 session 67 (113 images insérées, lib 41→154 avant purge) puis cron retiré en fin de session (pivot sans Pexels/Unsplash).
- [x] ~~Décision bug URL mutated~~ — Fait 2026-04-16 session 67 : régen W16 fresh avec Flux+Vision = 0 url_mutated sur 2 items, décision observer 3 régens avant retrait dead code (W17, W18, W19).
- [x] ~~Bloc 6ter/quater — pipeline images + retrait Pexels/Unsplash~~ — Fait 2026-04-16 session 67 (commits `46d368e` + `146256f` + `c269bd1` + `d3a6792` + `fd24ebb` pushed) : pipeline 4 niveaux (og → fal.ai Flux 1.1 Pro Ultra avec brief Sonnet + audit Vision Sonnet ≥6/10 → media_library → gradient). Retrait complet Pexels/Unsplash (code, cron, env Vercel, refs). Lib purgée 156 → 44 images (Pascal via viewer HTML). Veille text Opus 4.6. Vision Sonnet (contrainte 300s Vercel Hobby). 334/334 tests verts.
- [ ] **[BLOQUÉ ← observation 3 régens W17/W18/W19]** Décision retrait détection `url_mutated` : si 0 occurrence confirmée sur W17+W18+W19, retirer code défensif dans `generate.ts` (set candidateUrlSet + console.warn [URL_MUTATED] + bascule speculatif + champ Zod `verification.url_mutated`). Si ≥1 occurrence → durcir prompt Phase 2 OU hard reject. Ref : commit `921e71a` session 63.
- [ ] **[EXÉCUTABLE]** Email récap veille post-cron : email HTML léger synthétique vers `pascal@filmpro.ch` après chaque `/api/cron/intelligence` (succès + mode alerte échec), split coûts Claude API + fal.ai, via Resend SMTP (déjà configuré). Spec complète → voir `memory/project_email_veille_recap.md` (modules `cost-tracker.ts` + `email-recap.ts`, instrumentation via `response.usage` Anthropic SDK, tarifs publics Opus/Sonnet 4-6 à vérifier au moment impl).
- [ ] **[BLOQUÉ ← email récap livré + session page dashboard]** Dashboard coûts CRM : page `/dashboard/couts` avec historique persistant table `cost_audit_runs` + graphique 12 semaines + split par cron/catégorie + métriques YTD + alerte seuil. Spec complète → voir `memory/project_dashboard_costs_crm.md`.
- [ ] **[EXÉCUTABLE — option — à évaluer après 3-4 régens prod]** Audit Vision cadrage niveau 3 fallback media_library : pour chaque pick top-N dans la lib, demander à Vision si cadrage/composition OK pour og:image 16:9. Si rejet → top-N+1. Objectif : justifier décision crop/positionnement comme demandé Pascal. Coût estimé ~$0.09/sem (9 items × $0.01 Sonnet). Non urgent tant que lib 44 images professionnelles Pexels/Unsplash/seed servent cadrage déjà correct.
- [ ] **[EXÉCUTABLE — Bloc 5 — autonome ~10h, 3-4 sessions]** Golden standards UX/UI complets CRM (gabarit exclusif `/prospection`, wizards AppFactory hors périmètre). Phase 1 extraction + Phase 2 rédaction `docs/GOLDEN_STANDARDS.md` (absorbe + remplace `docs/GOLDEN_STANDARDS_RESPONSIVE.md`) + Phase 3 audit delta par page + Phase 4 application (1 commit atomique par page, Vitest + Playwright + screenshots before/after Chrome MCP après chaque).
  - Périmètre complet : charte graphique (palette workflow ardoise/violet/ambre/sauge, Inter, tokens CSS, radius, shadows, accents FR), layout/responsive, composants (boutons, cards, modales, slide-outs, stepper, badges, tables, filtres multi-select, pagination serveur, batch actions bar), états (hover/focus/disabled/loading/empty/error/success), feedback (toasts, ConfirmModal, messages scoped), micro-interactions, accessibilité (focus trap, touch targets 44px, aria, contraste), ton/copie (labels explicites, pas d'« Autre », accents FR)
  - Règle table-fixed (session 48) : `table-fixed` obligatoire dès contraintes largeur sur td/th, préférer `w-[X%]` aux pixels
  - Ingérer palette /prospection ET patterns /veille refondue (Bloc 1 livré)
- [ ] **[EXÉCUTABLE — Bloc 7 — autonome ~4h]** Import/export CSV + Dashboard/reporting (batchés, patterns SQL + tableaux partagés) :
  - CSV : export bouton Contacts/Entreprises/Leads (form action SELECT → CSV) + import validation Zod ligne par ligne + preview erreurs
  - Reporting : requêtes SQL agrégées (pipeline par mois, taux conversion par source, activité 30/90j) + graphiques légers
- [ ] **[BLOQUÉ ← attente PAT Figma]** Figma API : Personal Access Token + plugin MCP figma scope projet
- [ ] **[EXÉCUTABLE — premier run e2e]** Tester `/golden-standard` + `/audit-uiux` Express sur 1 page CRM. Système construit le 2026-04-14 sans projet cible, jamais éprouvé en interaction browser réelle. Checklist complète + angles morts (wizard HTML, extracteur, auto-close onglet, firewall macOS, détection routes) → voir `~/.claude/projects/-Users-pascal--claude/memory/project_audit_uiux_first_e2e_test.md`. Bugs trouvés → `parked.md` ou tâche fix dans CLAUDE.md global.
- [ ] **[EXÉCUTABLE — faible priorité]** Revoir validité des 3 commandes custom AppFactory (`cadrage`, `generate`, `deploy` dans `.claude/commands/`). Pascal n'est pas sûr qu'elles soient encore valides suite à l'évolution du workflow. Vérifier que chaque commande correspond à l'usage réel actuel (skills wizard HTML port 3334, scaffold SvelteKit depuis project.yaml, deploy Vercel preview/prod). Si obsolète → actualiser ou supprimer. Contexte : exclues du guide PDF des commandes customs produit le 2026-04-16 en raison de cette incertitude.

### Séquence

1. **[PRIORITÉ] QA cadrage images /veille** (démarre la prochaine session).
2. **Email récap veille** (EXÉCUTABLE, bloc isolé ~4h, spec prête dans memory).
3. **Bloc 5 — Golden standards UX/UI** (gros chantier 3-4 sessions).
4. **Bloc 7 — CSV + Reporting**.
5. **Audit Vision cadrage niveau 3** (dépend conclusions QA #1).
6. **Décision retrait url_mutated** (bloqué W17+W18+W19).
7. **Dashboard coûts CRM** (bloqué email récap + session page dashboard dédiée).
- Hors séquence (BLOQUÉ) : Figma (attente PAT)
