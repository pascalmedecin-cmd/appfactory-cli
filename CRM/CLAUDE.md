# CRM FilmPro : CLAUDE.md

**Note migration** : ce fichier vit dans `CRM/CLAUDE.md` (path Vercel `rootDirectory: CRM`) ; le container racine est un stub pointant vers les sous-projets. Contexte migration complet → `~/.claude/projects/-Users-pascal-Claude-Projets-FilmPro/memory/project_appfactory_restructure.md`.

**Statut :** Clean state 2026-05-28 — refonte mobile V2 **abandonnée** après smoke iPhone (overscope, lisibilité) → pivot **V3 outil terrain only** (`archive/2026-05-28-pivot-mobile-v3.md`). **Antérieur en prod** (Signaux V4, Log CRM, Aide, audit 360, Google Places, golden v9, migration restructure S173-S174) → détail `archive/2026-05-06-sessions.md` + Livré ci-dessous. Formation IA = sous-projet autonome `Formation/`, `cc` option 5.
**Derniere mise a jour :** 2026-06-05 (Découpe Films étape 3bis-b : golden v4 porté dans les 4 écrans Svelte, QA tolérance zéro 9/9 verte)
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** 2026-06-05 - **Chantier 2 portail = « Découpe Films »**. **Étape 3bis-b livrée = portage Svelte du golden v4** : 4 écrans `/decoupe` refondus (langage premium : KPI mis en scène, strip de remplissage coloré, cartes film, liste de coupe, callout/ordercard) + helpers de calcul UI extraits en `src/lib/decoupe/presenter.ts` pur (doctrine `.svelte`=e2e) ; `ChuteGauge`/`PlanDecoupeSvg` retirés. **QA tolérance zéro 9/9 verte** : Vitest 1589 (+29 presenter), svelte-check 0, build, e2e Playwright 9/9, axe 0 violation (4 écrans), sécu Opus 0 H/C/M (1 Low fixé), perf LCP 404ms warm/CLS 0, fidélité golden (screenshots). **Migration prod appliquée** (3 tables `decoupe_*` + RLS + bornes CHECK, flag `ffDecoupe` OFF → rien exposé). 2 fixes globaux bénéfiques : `app.html` autorise le zoom (WCAG 1.4.4) ; `tests/decoupe.test.ts` rejouable self-contained (gère son flag). Reste : étape 4 PDF, Phase 4 QA 360, Phase 5 livraison.
**Sessions précédentes (condensé)** - détails dans `archive/` (S165-S175 : `2026-05-06-sessions.md` ; S122-S125 : `2026-04-28-sessions.md` ; S70-S107 : `decisions-sessions-*.md` + `Formation/CLAUDE.md`).


---

## SOUS-PROJETS

L'arborescence d'AppFactory héberge des sous-projets autonomes (chacun a son propre repo Git, sa propre stack, son propre CLAUDE.md). Pascal navigue par thème depuis ce dossier.

| Dossier | Repo Git | Statut | URL prod | CLAUDE.md |
|---------|----------|--------|----------|-----------|
| `CRM/` (CRM FilmPro) | `pascalmedecin-cmd/appfactory-cli` (=racine actuelle) | Production | <https://filmpro-portail.vercel.app> (ancienne `filmpro-crm` conservée → 308) | (ce fichier) |
| `Formation/` | `pascalmedecin-cmd/onboarding-ia` (séparé, ignoré dans `.gitignore`) | S1→S7 livrés (12/12 modules en prod) | <https://onboarding-ia.vercel.app> | `Formation/CLAUDE.md` |

> Consulting est sibling autonome depuis 2026-05-07 (S175 Bloc 0 PLAN_ATTAQUE) : path `~/Claude/Projets/Consulting/`, repo Git séparé. Voir son `CLAUDE.md` propre dans `~/Claude/Projets/Consulting/CLAUDE.md`. `cc 4` cd vers ce path.

Pour travailler sur un sous-projet : taper `cc` au terminal et choisir `5. Formation IA` (ou `4. Consulting` qui pointe vers le sibling autonome). Claude Code atterrit directement dans le sous-dossier, charge son `CLAUDE.md` propre (plus léger), et les tâches sont scopées. Les tâches du sous-projet sont tracées dans son CLAUDE.md, pas dans celui-ci.

**`/start` à la racine AppFactory = scope CRM FilmPro** (slug=appfactory, subproject=crm). Affiche les tâches `transmitted` du sous-projet CRM uniquement. Formation IA a sa propre entrée au menu terminal `cc` (cd Formation/ → /start scope Formation IA). Source : `~/.claude/cockpit/projets/appfactory/entries.jsonl` filtré par subproject.

**Extensibilité pédago** (Formation IA) : l'ingestion d'une deep research markdown (marketing aujourd'hui, opération/commercial/autres demain) suit un workflow conversationnel Claude Code CLI piloté par **Opus 4.6**. Règles pédago dans `Formation/docs/PEDAGOGIE.md`, protocole d'ingestion dans `Formation/docs/INGESTION.md`.

---

## QUICK START

```bash
# Ce repo contient le code de l'app CRM FilmPro
# Stack : SvelteKit + Supabase + Vercel
# CLAUDE.md vit dans CRM/ ; le path Vercel rootDirectory est CRM
```

---

## ROLE

Product Engineer sur l'app CRM FilmPro (production, client interne FilmPro). Travail au CLI Claude Code, code-first.

## MÉTIER FILMPRO (référence dure, ne jamais inventer)

FilmPro = spécialiste des **traitements pour vitrage** (films et vernis) en Suisse romande. 3 enjeux : confort thermique, sécurité, discrétion. Posture conseil (analyse contexte avant solution, sélection restreinte de solutions éprouvées, normes SIA). Cibles : résidentiel + bâtiment pro (régies, architectes, facility managers, bureaux d'études) via réseau de partenaires.

**Le nom prête à confusion : FilmPro NE FAIT PAS de production vidéo.** « Film » = film pour vitrage.

→ Brief verbatim + règles d'application (scoring, prospection appels d'offres SIMAP, créations Zefix, copy UI) : `~/.claude/projects/-Users-pascal-Claude-Projets-FilmPro/memory/project_filmpro_metier.md` (consulter AVANT toute proposition de mots-clés, ciblage, ou wording orienté métier).

---

## STACK

| Couche | Outil | Role |
|--------|-------|------|
| Frontend | SvelteKit + Tailwind | App web, composants testables |
| Backend | Supabase (PostgreSQL) | BDD, auth, API, stockage |
| Hebergement | Vercel | Deploy auto, previews, domaines, CDN |
| Tests | Vitest + Playwright | Tests unitaires + navigation complete |
| Code | GitHub | Versionne |

---

## COUTS

→ Détail coûts (opérateur : Claude Code Max + Vercel Pro + GitHub + Supabase Free ≈ 120-220 EUR/mois ; par app client : Supabase + Vercel + domaine ≈ 0-26 EUR/mois) : `archive/2026-05-13-sessions.md`.


---


## DECISIONS STRUCTURELLES

- Repo separe `appfactory-cli` (ancien `appfactory` reste consultable)
- Workflow prioritaire : construire le cycle core avant d'attaquer FilmPro
- FilmPro = premier projet reel du nouveau workflow (dogfooding)
- Figma Pro abandonne (deep research 2026-04-04 : ratio cout/benefice defavorable pour solopreneur code-first)
- Design = approche code-first : composants custom + kits Figma Community gratuits comme inspiration
- Validation client = prototypes Vercel preview (pas de maquettes Figma)
- CSS scoped obligatoire pour le layout structurel (sidebar, header, nav) : Tailwind responsive (md:hidden, md:block) ne fonctionne pas avec Tailwind v4 pour ce cas
- HTML temporaires pour previsualisations client a chaque etape cle
- Ancien projet AppFactory v1 (Apps Script) = archive consultable, pas de migration

### Decisions UX + Prospection (G36)

→ Archive intégrale : `archive/decisions-structurelles-crm.md` (6 écrans principaux, slide-out panels, saisie rapide, 100% sources gratuites, modèle unifié `prospect_leads`, scoring auto 0-13). Specs prospection complètes : `docs/SPECS_PROSPECTION.md`.

### Doctrine styling : Tailwind utilities + CSS scoped

→ Règle tranchée S180 (audit 360 V3b I-04) : Tailwind utilities pour le détail réutilisable (spacing/couleurs via tokens/typo/états/responsive trivial côté contenu, jamais off-grid `p-[13px]`), `<style>` scoped Svelte pour le layout structurel (sidebar/header/kanban) + keyframes/transitions (token `--ease-out-expo`) + pseudo-éléments + `:global()` ciblés ; jamais de CSS global ad hoc hors `app.css` / `!important` / classe dupliquant un token ; primitives (`Button`/`Input`/`Card`/`Modal`/`DataTable`/`Tabs`) = source unique, on compose. Détail : `memory/feedback_crm_styling_doctrine.md`.


### Sécurité - décisions assumées (audit 360 V3b L-02, L-03)

- **CSP `unsafe-inline` (L-02)** : la `Content-Security-Policy` posée dans `hooks.server.ts` autorise `'unsafe-inline'` sur `script-src` et `style-src`. C'est un **prérequis de l'hydratation SvelteKit** (scripts inline + styles scoped injectés au runtime) ; le retirer imposerait un système de nonce/hash dynamique = refactor framework. Risque résiduel XSS jugé **acceptable** : CRM mono-tenant ≤ 10 admins `@filmpro.ch` (OTP), aucun contenu utilisateur tiers rendu en HTML brut, toutes les sorties dynamiques échappées (`esc()` / `escapeHtml`). À revisiter si SvelteKit expose une option nonce-based simple, ou si une surface UGC apparaît.
- **RLS « mono-tenant plat » (L-03 / L-04)** : ~11 tables ont une policy `FOR ALL TO authenticated USING (true)` — tout utilisateur authentifié voit/modifie/supprime tout (photos, visites, leads, opportunités, veille…). C'est une **décision design assumée** (S127 Q2 Pascal : 3 fondateurs FilmPro symétriques). Les endpoints DELETE photos/visits loggent quand un fondateur agit sur la donnée d'un autre (traçabilité), sans bloquer. **À DURCIR avant l'ajout d'un 4e utilisateur non-fondateur** : passer à des policies `created_by = auth.uid()` (ou rôle admin) + tests d'intégration RLS contre une vraie DB avec une session non-admin. Voir mémoire `feedback_rls_multitenant_durcissement_si_4_users.md` + § RISQUES OUVERTS (M-48, RLS non couverte par les tests Vitest).

---

## INFRA EN PLACE

- **Prod** : https://filmpro-portail.vercel.app (Vercel, déploiement CLI manuel `vercel deploy --prod` ; pas d'auto-deploy git) ; ancienne `filmpro-crm.vercel.app` conservée et redirigée 308 → nouvelle (hook). Supabase EU (projet `appfactory`, 10+ tables, RLS active, service role key configurée)
- **Auth** : OTP email 6 chiffres @filmpro.ch + session 7 jours httpOnly ; SMTP Resend (domaine verifié, free plan)
- **APIs** : Zefix REST + search.ch + fal.ai Flux 1.1 Pro Ultra (partage clé avec Enseignement) — Pexels/Unsplash supprimés S67
- **Crons** : `/api/cron/{signaux,alertes,nettoyage-crm,intelligence,intelligence-archive}` tous sécurisés `CRON_SECRET` + service role (Cron `media-enrich` supprimé S67)
- **Tests** : Vitest 1509 (100 fichiers) + Playwright e2e 34. Accessibilité : focus trap + ConfirmModal partout. Sécurité : Zod sur 19 form actions, rate limiting 10/min, headers CSP/XFO/referrer, timing-safe secrets

→ Détail intégral (env vars, BDD exhaustive, liste tests, liste crons, headers sécurité, pagination serveur) : `archive/infra-crm-detail.md`

## DOCUMENTATION

- `docs/SPECS_PROSPECTION.md` : Specs completes module prospection (sources, modele, scoring, UI, dedup)

→ Inventaire composants EN PLACE (11 composants, 6 pages, 4 API, scripts) archive dans archive/inventaire-composants.md : consulter si besoin de lister les composants existants avant d'en creer de nouveaux

### Historique condensé (archives)

- Sessions 1-8 : UX 6 écrans, design premium Untitled UI/SnowUI, wizards 5 étapes → `archive/decisions-sessions-1-8.md`
- Sessions 9-16 : auth OTP+MFA, Vercel root `template`, PWA, refonte prospection → `archive/decisions-sessions-9-16.md`
- Sessions 70-77 (formation-ia shared) : cadrage parcours + S1-S5 ingestion → `archive/decisions-sessions-70-77.md`
- Sessions 78-79 (formation-ia shared) : S6-S7 ingestion critère sortie → `archive/decisions-sessions-78-79.md`
- Sessions 122-125 (CRM, V1 mobile) : Lighthouse + Playwright mobile + V1 MOBILE CLOS → `archive/2026-04-28-sessions.md`
- Audit CRM 2026-04-04 (méthodo 5 agents, 4 sprints correctifs) → `archive/audit-crm-2026-04-04.md`

---

## NE PAS FAIRE

- Deployer sans tests (Vitest + Playwright minimum)
- Toucher des composants partages CRM sans audit cross-app

## TOUJOURS FAIRE

- Chaque etape produit un livrable concret et mesurable
- Review humaine visible dans le terminal avant tout deploy
- Tests automatises avant mise en preview
- **Inscription cockpit mid-session** : ne JAMAIS éditer `entries.jsonl` directement (même avec backup) pour ajouter une tâche. Voies sûres : (a) drag UI cockpit `Idée → Transmis`, (b) `POST /api/entries/appfactory` body `{title, summary, subproject:"crm"}` puis `POST /api/queue/appfactory` body `{tasks:[{id}]}`. Origine bug S177 2026-05-09 (entries CLI fraîches purgées par /fin-session parallèle). Fix structurel grace period 30 min livré S180 (`cockpit/lib/entry_protection.py`), mais la voie HTTP/UI reste la voie officielle. → voir `~/.claude/projects/-Users-pascal--claude/memory/feedback_cockpit_watcher_purge_cli_entries_S177.md`.

## RISQUES OUVERTS (sécurité)

- **RLS Supabase non couverte par les tests Vitest (audit 360 M-48, gravé S178 V3a-2)** : la suite Vitest mocke `@supabase/supabase-js` — les politiques RLS n'existent qu'au runtime Postgres, donc **aucun test unitaire ne prouve quoi que ce soit sur le comportement RLS réel**. ~25 vecteurs d'autorisation (form actions + endpoints qui lisent une table à RLS restrictive) sont donc « verts » sans garantie. Fixable seulement par une suite d'intégration contre une vraie DB avec une session user non-admin (pas prévu V1, mono-tenant ≤ 10 admins @filmpro.ch). Avant de construire par-dessus un contrôle d'autorisation : lire le code + vérifier manuellement en prod/staging avec un compte au rôle cible. Incident de référence : 2026-04-18 formation-ia (3 utilisateurs bloqués en prod avec 7 tests Vitest verts). Voir `~/.claude/rules/quality.md` § « RLS Postgres et tests avec mocks », mémoire `feedback_rls_mocks_insufficient_S99.md`, et `feedback_rls_auth_lookup_needs_service_role.md`.

## REGLES TECHNIQUES PROJET

→ Tests mobile/responsive : Chrome DevTools Device Toolbar manuel (Pascal) **obligatoire** ; Playwright `viewport:{width,height}` seul et MCP `resize_window` **interdits** comme substituts (Playwright preset `devices['iPhone 14 Pro Max']` OK pour findings OBJECTIFS uniquement — réf `CRM/tests/mobile.spec.ts`). Règle complète : `memory/feedback_crm_mobile_testing_devtools.md`.


## Prochaine session

**Prochaine attaque** : Bloc 1 - Découpe Films **étape 4 = checkpoint template PDF avec Pascal** (ADR-0005, AC-025) puis export PDF vectoriel, miroir de l'écran de résultat refondu. Débloquée par la livraison 3bis-b (golden v4 porté, QA 9/9). Étape supervisée : valider le template avec Pascal AVANT de coder. Sous QA tolérance zéro. → `memory/feedback_decoupe_tolerance_zero_qa.md`.

### 1. Chantier 2 Découpe Films - étape 4 PDF + clôture Phase 3/4/5 [MIXTE • xhigh • session dédiée]

- **Pourquoi** : cadrage + specs + cœur algo + data layer + **4 écrans premium portés du golden (3bis-b, QA 9/9 verte)** livrés. Reste l'export PDF (étape 4) puis la QA 360 finale (Phase 4) et la livraison (Phase 5, flag ON). Objectif : outil **premium, best-in-class, homogène CRM**.
- **Prérequis** : 3bis-b livrée (4 écrans + `presenter.ts` + e2e `tests/decoupe.test.ts` + migration prod appliquée flag OFF). Pack specs `.product-architect/decoupe/`.
- [ ] **[EXÉCUTABLE]** Étape 4 - **checkpoint template PDF avec Pascal** (ADR-0005, AC-025) puis export PDF vectoriel client (jsPDF + svg2pdf), miroir de l'écran de résultat refondu (KPI + strip + liste de coupe + commande). Sous QA tolérance zéro.
- [ ] **[EXÉCUTABLE]** **QA tolérance zéro (transversal)** (exigence Pascal 2026-06-05) : dérouler `.product-architect/decoupe/qa-tolerance-zero.md` (9 barrières) + `bash scripts/_decoupe_qa.sh` AVANT de fermer l'étape 4 et la Phase 4. Le QA script lance `tests/decoupe.test.ts` (le test gère son propre flag `ffDecoupe`). Aucune étape `done` sans 100 % vert. → `memory/feedback_decoupe_tolerance_zero_qa.md`.
- [ ] **[BLOQUÉ - étape 4 livrée]** Phase 4 QA 360 (pgTAP RLS, axe-core, Lighthouse, sécu 0 H/C/M, e2e) → Phase 5 livraison (flag `ffDecoupe` ON pour tous + `vercel deploy --prod` ; migration prod déjà appliquée 2026-06-05).

### Livré cette session

- [x] ~~Découpe Films étape 3bis-b : portage Svelte du golden v4 (4 écrans) sous QA tolérance zéro 9/9~~ - Livré 2026-06-05 (xhigh). 4 écrans `/decoupe` refondus au langage premium du golden v4 (KPI mis en scène + arc chute color-codé, strip de remplissage SVG par pièce, cartes film + pastille chute, liste de coupe groupée, callout alertes, ordercard, base produit tuiles+chips, colonne familles chantiers). Helpers de calcul UI extraits en `src/lib/decoupe/presenter.ts` PUR (+`presenter.test.ts` 29 tests, doctrine `.svelte`=e2e) ; `ChuteGauge`/`PlanDecoupeSvg` retirés ; DM Mono ajouté. **QA tolérance zéro 9/9** : Vitest 1589, svelte-check 0, build, e2e `tests/decoupe.test.ts` 9/9 (parcours + axe 0 violation 4 écrans), sécu Opus 0 H/C/M (1 Low DoS bornes fixé : Zod `.max` + CHECK DB `cardinality`), perf LCP 404ms warm/CLS 0, fidélité golden (4 screenshots `.product-architect/decoupe/qa-shots/`). **Migration prod appliquée** via `scripts/apply-decoupe-migration.mjs` (3 tables + RLS + bornes, flag `ffDecoupe` OFF). Fixes globaux : `app.html` zoom autorisé (WCAG 1.4.4) ; e2e self-contained (gère son flag). → `memory/audit_secu_2026-06-05_decoupe_films.md` + `feedback_decoupe_ui_premium_moderne_riche.md` (RÉSOLU) + `feedback_decoupe_tolerance_zero_qa.md`.
- [x] ~~Découpe Films étape 3bis-a : golden UI premium VALIDÉ (benchmark métier, golden v4 4/4) + dispositif QA tolérance zéro~~ - Livré 2026-06-05 (commit `2e6ef68`). → `feedback_decoupe_ui_premium_moderne_riche.md`.
- [x] ~~Découpe Films Phase 3 étape 3 : 4 écrans `/decoupe` + form actions (structure)~~ - Livré 2026-06-05 (`ac77969`/`142dbb9`). UI résultat rejetée 2× → refonte 3bis.
- [x] ~~Découpe Films Phase 3 étape 2 : data layer (migration + Zod + builders, 24 tests)~~ - Livré 2026-06-05 (`bab1c38`).
- [x] ~~Découpe Films Phase 3 étape 1 : cœur algo `optimiserDecoupe` (strip-packing FFDH, 24 tests TDD)~~ - Livré 2026-06-05 (`e15b678`).
→ Livré antérieur (Cadrage Phase 1 + specs Phase 2 pack `.product-architect/decoupe/` 5 ADR/25 AC ; Pivot « Devis »→« Découpe Films » `6b41f80` ; Dette référentiel Session 1 `e5a6cd4` ; bascule adresse portail `filmpro-portail.vercel.app` 2026-06-04 ; QA 360 portail + shell mobile V3 2026-06-01 ; V3 backend + specs 2026-05-31, S171→S192bis) → `memory/project_portail_filmpro_multi_outils.md` + `archive/2026-06-01-sessions.md` + audits `audit_secu_2026-06-0{1,4,5}_*.md`.

### Watch list active après pivot

- **[WATCH] Svelte 5 — `onDestroy` s'exécute en SSR (Vercel) mais pas en `vite preview`** : toute référence à `window`/`document`/`localStorage`/`setInterval` à cleanup DOIT passer par `$effect(() => { ...; return () => cleanup; })`. Toujours tester en preview branch Vercel pour les composants qui touchent window. Mémoire `feedback_svelte5_ondestroy_ssr_window_undefined.md`.
- **[WATCH] Trap Vercel `rollback` → alias prod verrouillé** : après `vercel rollback`, les `git push` suivants buildent mais ne promeuvent PAS automatiquement. Toujours vérifier via `vercel inspect filmpro-portail.vercel.app` (domaine canonique depuis la bascule 2026-06-04) que l'alias pointe bien sur le nouveau deploy.

→ Watch list complète (Signaux V4 perf/contrats S189, S188, S186, S178, S171) déplacée dans `archive/2026-05-28-pivot-mobile-v3.md`. Restent triables si l'objet redevient actuel.

### Livré (référence historique)

→ Livré V2 + sessions antérieures (S171→S192bis) dans `archive/` (`2026-05-28-pivot-mobile-v3.md`, `2026-05-25/13/10/09/08-sessions.md`).

