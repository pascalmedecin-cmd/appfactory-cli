# CRM FilmPro : CLAUDE.md

**Note migration** : ce fichier vit dans `CRM/CLAUDE.md` (path Vercel `rootDirectory: CRM`) ; le container racine est un stub pointant vers les sous-projets. Contexte migration complet → `~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/project_appfactory_restructure.md`.

**Statut :** Clean state 2026-05-28 — refonte mobile V2 **abandonnée** après smoke iPhone (overscope, lisibilité) → pivot **V3 outil terrain only** (`archive/2026-05-28-pivot-mobile-v3.md`). **Antérieur en prod** (Signaux V4, Log CRM, Aide, audit 360, Google Places, golden v9, migration restructure S173-S174) → détail `archive/2026-05-06-sessions.md` + Livré ci-dessous. Formation IA = sous-projet autonome `Formation/`, `cc` option 5.
**Derniere mise a jour :** 2026-06-01 (shell mobile V3 terrain livré + déployé prod + smoke iPhone validé)
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** 2026-06-01 - **Shell mobile V3 « outil terrain » livré + en prod** : route `/terrain` (flag `ffCrmMobileV3`), 2 onglets, fiche + 3 actions natives, compte-rendu (photo/GPS), brouillon contact, desktop queue. TDD 28 helpers, security 0 H/C/M, bug-hunter 1 critique (AC-011) + 3 moyens fixés, build prod vert, **smoke iPhone Pascal validé (AC-017)** + fix header portail mobile. `main` promu prod (tout est en prod). Reste : QA 360 formelle portail + bascule adresse (supervisé, différés).
**Sessions précédentes (condensé)** - détails dans `archive/` (S165-S175 : `2026-05-06-sessions.md` ; S122-S125 : `2026-04-28-sessions.md` ; S70-S107 : `decisions-sessions-*.md` + `Formation/CLAUDE.md`).


---

## SOUS-PROJETS

L'arborescence d'AppFactory héberge des sous-projets autonomes (chacun a son propre repo Git, sa propre stack, son propre CLAUDE.md). Pascal navigue par thème depuis ce dossier.

| Dossier | Repo Git | Statut | URL prod | CLAUDE.md |
|---------|----------|--------|----------|-----------|
| `CRM/` (CRM FilmPro) | `pascalmedecin-cmd/appfactory-cli` (=racine actuelle) | Production | <https://filmpro-crm.vercel.app> | (ce fichier) |
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

→ Brief verbatim + règles d'application (scoring, prospection appels d'offres SIMAP, créations Zefix, copy UI) : `~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/project_filmpro_metier.md` (consulter AVANT toute proposition de mots-clés, ciblage, ou wording orienté métier).

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

- **Prod** : https://filmpro-crm.vercel.app (Vercel, GitHub auto-deploy) + Supabase EU (projet `appfactory`, 10+ tables, RLS active, service role key configurée)
- **Auth** : OTP email 6 chiffres @filmpro.ch + session 7 jours httpOnly ; SMTP Resend (domaine verifié, free plan)
- **APIs** : Zefix REST + search.ch + fal.ai Flux 1.1 Pro Ultra (partage clé avec Enseignement) — Pexels/Unsplash supprimés S67
- **Crons** : `/api/cron/{signaux,alertes,nettoyage-crm,intelligence,intelligence-archive}` tous sécurisés `CRON_SECRET` + service role (Cron `media-enrich` supprimé S67)
- **Tests** : Vitest 164 + Playwright 5 e2e. Accessibilité : focus trap + ConfirmModal partout. Sécurité : Zod sur 19 form actions, rate limiting 10/min, headers CSP/XFO/referrer, timing-safe secrets

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

**Prochaine attaque** : **QA 360 formelle portail (3fc5b372)** puis **bascule adresse (79ec4f5d, supervisé)**. **Tout est désormais en prod** : `main` a été promu 2026-06-01 (shell V3 terrain + portail Session 1 + backend V3). Le shell V3 `/terrain` est livré et **smoke iPhone validé** (AC-017) ; le portail est en prod, header mobile validé par smoke. Reste : (1) QA 360 formelle portail (audit-uiux home + axe-core + Lighthouse + Playwright e2e redirects 308 + post-login `/`) ; (2) bascule adresse = alias `filmpro.vercel.app` + template OTP Supabase + com re-login aux 2 autres fondateurs ; (3) optionnel axe-core AA shell terrain (AC-012). **Pack + plan : `.product-architect/portail/delivery-plan.md`**. **NB OTP Supabase** : quota limité — pour les e2e qui exigent un login, utiliser l'alias de branche stable, pas une URL jetable → `feedback_vercel_branch_alias_pour_smoke`.

### 1. Portail FilmPro - Session 1 coding (réorg + renommage + fondation) [MIXTE • xhigh • ~1 session]

- **Pourquoi** : cadrage Phase 1 + specs Phase 2 validés best-in-class cette session (gates 1→2 et 2→3 signés). Refonte structurelle (routing) + UI golden-validée → MIXTE (specs verrouillées → exécution auto, smoke home supervisé).
- **Prérequis** : OK démarrage Pascal. NB : service worker présent (`src/service-worker.ts`) → bumper le nom du cache SW au renommage + invalider après bascule d'adresse (sinon ancienne app servie depuis le cache).
- [x] ~~**[EXÉCUTABLE]** Réorg `(app)/`→`crm/` + home portail `/` + redirects 308 + `CRM_BASE` + renommage + `PUBLIC_APP_URL` + référentiel.~~ **Livré 2026-06-01** (détail + écarts vs spec + dette nommée → « Livré cette session » ci-dessous).

### 2. Portail - Session 2 QA 360 [SUPERVISÉ • xhigh • ~0,5-1 session]

- **Pourquoi** : valider les 24 critères d'acceptation (v1.1) avant la bascule d'adresse.
- [ ] **[EXÉCUTABLE]** (débloqué : Bloc 1 livré 2026-06-01) audit-uiux + axe-core home, Playwright e2e (nav `/crm/*` + redirects 308 + **post-login → `/`** + entrée/sortie portail) — **mettre à jour les e2e qui pointent les anciens paths**, snapshot home, Lighthouse home, `code-review:security-auditor` 0 H/C/M (artefact daté AC-016), bug-hunter + contracts-reviewer (centré routing + couche référentiel). QA sur la preview de branche `portail-session-1` (pas prod). → voir `.product-architect/portail/delivery-plan.md` (Session 2).

### 3. Portail - Session 3 livraison + bascule adresse [SUPERVISÉ • high • ~0,5 session]

- **Pourquoi** : bascule URL = seul vrai risque (accès fondateurs), faite avec Pascal (type update Vercel).
- [ ] **[BLOQUÉ - Bloc 2 vert]** Promotion prod, ajout alias `filmpro.vercel.app` + redirection ancienne→nouvelle, template OTP Supabase (dashboard), communication nouveau lien + **re-login cross-domain** aux 3 fondateurs, metrics-baseline figée, clôture. Trap : vérifier `vercel inspect` après tout rollback. → voir `.product-architect/portail/delivery-plan.md` (Session 3) + `feature-flag-plan.md`.

### 4. Build mobile V3 outil terrain [SUPERVISÉ • xhigh • ~2 sessions]

- **Pourquoi** : pack specs complet validé (PRD + data-model + RLS + contrats + 20 AC + 7 ADR + DESIGN + golden). Backend déjà en **prod** (migration `20260531_001` + endpoints, 70 tests, livré 2026-05-31). Reste UI à valider sur iPhone réel → SUPERVISÉ.

- [x] ~~**[EXÉCUTABLE]** Shell mobile PWA : câbler `ffCrmMobileV3` + routing `/terrain` + 2 onglets + fiche + 3 actions natives + compte-rendu + brouillon contact + desktop badge.~~ **Livré 2026-06-01** (voir Livré ci-dessous).
- [x] ~~**[BLOQUÉ - shell livré]** Déploiement prod + QA + smoke iPhone (AC-016/AC-017).~~ **Livré 2026-06-01** : deploy prod + security 0 H/C/M + bug-hunter (1 critique AC-011 fixé) + smoke iPhone Pascal validé. axe-core AA + Playwright e2e **différés** (décision Pascal : smoke réel = acceptation).

→ Specs : `.product-architect/` + `docs/SPECS_CRM_MOBILE_V3_TERRAIN.md` + mémoire `project_refonte_mobile_v3_terrain.md`. Audit sécu shell : `audit_secu_2026-06-01_v3_mobile_shell.md`.

### Reste ouvert (portail, après V3)

- [ ] **[EXÉCUTABLE]** QA 360 formelle portail (3fc5b372) : audit-uiux home + axe-core + Lighthouse + Playwright e2e (redirects 308 + post-login → `/`). Header mobile déjà validé par smoke. → `.product-architect/portail/delivery-plan.md` (Session 2).
- [ ] **[EXÉCUTABLE]** Bascule adresse portail (79ec4f5d, supervisé) : alias `filmpro.vercel.app` + template OTP Supabase + communication re-login aux 2 autres fondateurs. Code déjà en prod. → `.product-architect/portail/delivery-plan.md` (Session 3).
- [ ] **[optionnel]** axe-core AA contraste sur le shell terrain (AC-012) : vérif légère différée, conçu AA mais non mesuré automatiquement.

### Livré cette session

- [x] ~~Shell mobile V3 « outil terrain » (Phase 3 build) + deploy prod + smoke iPhone validé~~ - Livré 2026-06-01 (xhigh, ~4,5h). Route `/terrain` gardée par flag `ffCrmMobileV3` (OFF → CRM desktop intact, AC-013) ; 2 onglets (À faire = relances dues / Rechercher) ; fiche lecture seule + 3 actions natives `tel:`/maps/`mailto:` (grisées si absente) + historique visites ; compte-rendu (résultat enum fermé + note + photos état envoi/échec/réessayer + GPS optionnel) ; brouillon contact → `contact_suggestions` en_attente ; desktop = file Valider/Fusionner/Rejeter sur page Contacts (`ContactSuggestionQueue`). 11 composants composent les primitives + tokens `app.css` (zéro thème). TDD 28 helpers (native-actions/relative-date/contact-draft). **QA** : security-auditor 0 H/C/M (artefact `audit_secu_2026-06-01_v3_mobile_shell`) ; bug-hunter Opus 1 critique (AC-011 photos larguées en silence) + 3 moyens (fuite blob URL, race recherche, localId collision) **fixés in-session** ; svelte-check 0 ; build prod vert ; 1487 Vitest verts (17 baseline Sentry). **Deploy prod** (main FF, commits `64f21ea`/`9756777`) + flag activé sur `pascal@filmpro.ch` (via `pg` lib, MCP read-only). **Smoke iPhone Pascal validé** (AC-017) : cards + nav OK, boucle compte-rendu/brouillon OK. **Fix post-smoke** : header portail mobile (logo wordmark ratio 5.7:1 à 44px débordait → réduit 28-32px + déconnexion ramenée dans l'écran, vérifié Playwright 320/375/390, commit `9321733`). axe-core AA + Playwright e2e différés (décision Pascal). → mémoire `audit_secu_2026-06-01_v3_mobile_shell` + `project_refonte_mobile_v3_terrain`.
- [x] ~~Portail FilmPro Session 1 (coding) : réorg `(app)→crm/` + home portail `/` + redirects 308 + `CRM_BASE` + renommage FilmPro + `PUBLIC_APP_URL` + couche référentiel~~ - Livré 2026-06-01. Branche `portail-session-1` (commits `bb0a737`/`bdd1dab`/`57aa994`, **pas mergée prod** → Session 3). svelte-check 0, 1459 Vitest verts (17 baseline Sentry), build OK, smoke + logo validés Pascal sur preview branche. Logo : cause racine = sous-chemins tronqués lors de la reconstruction (« Film » en blocs pleins au lieu d'évidés) → tracés verbatim asset marque. Post-login → home portail `/` (révision AC-015, décision Pascal). **Dette nommée** : call sites API référentiel (visits/contact-suggestions/search) à centraliser sur `referentiel/` (chantier 2 Devis) ; e2e Playwright anciens paths à MAJ en Session 2 (gardés OK par les 308). → `.product-architect/portail/delivery-plan.md` + mémoires `project_portail_filmpro_multi_outils`, `feedback_vercel_branch_alias_pour_smoke`.
- [x] ~~Portail FilmPro : cadrage Phase 1 + specs Phase 2 (product-architect), validés best-in-class~~ - Fait 2026-06-01 : CRM devient un outil d'un portail multi-outils FilmPro (home 2 cards, renommage + nouvelle adresse, référentiel partagé ; Devis = chantier 2). Revue 2 agents → 14 corrections, gates 1→2 et 2→3 signés, golden validé, plan 3 sessions. Specs only. → voir `.product-architect/portail/` + mémoire `project_portail_filmpro_multi_outils`.
- [x] ~~Backend V3 mobile terrain (migration prod + endpoints, 70 tests Vitest, TDD)~~ - Livré 2026-05-31. Reste Phase 3 UI → `docs/HANDOFF_V3_PHASE3_BUILD.md`.
- [x] ~~Cadrage + pack specs V3 mobile terrain (council 4 voix + product-architect, 16 fichiers, gate 2→3 ouvert)~~ - Fait 2026-05-31 → `.product-architect/` + `project_refonte_mobile_v3_terrain.md`.

### Watch list active après pivot

- **[WATCH] 17 tests `hooks.server.test.ts` cassés depuis commit `d78ab37` (Sentry feat)** : Sentry est paused (`enabled: false` via `c442e59`), tests restés cassés. Impact prod : aucun. À fixer dans la tâche QA Sentry méta-projet (`~/.claude/CLAUDE.md` § Prochaine attaque QA Sentry 3 apps). Voir `archive/2026-05-28-pivot-mobile-v3.md` pour le détail.
- **[WATCH] Svelte 5 — `onDestroy` s'exécute en SSR (Vercel) mais pas en `vite preview`** : toute référence à `window`/`document`/`localStorage`/`setInterval` à cleanup DOIT passer par `$effect(() => { ...; return () => cleanup; })`. Toujours tester en preview branch Vercel pour les composants qui touchent window. Mémoire `feedback_svelte5_ondestroy_ssr_window_undefined.md`.
- **[WATCH] Trap Vercel `rollback` → alias prod verrouillé** : après `vercel rollback`, les `git push` suivants buildent mais ne promeuvent PAS automatiquement. Toujours vérifier via `vercel inspect filmpro-crm.vercel.app` que l'alias pointe bien sur le nouveau deploy.

→ Watch list complète (Signaux V4 perf/contrats S189, S188, S186, S178, S171) déplacée dans `archive/2026-05-28-pivot-mobile-v3.md`. Restent triables si l'objet redevient actuel.

### Livré (référence historique)

→ Livré V2 + sessions antérieures (S171→S192bis) dans `archive/` (`2026-05-28-pivot-mobile-v3.md`, `2026-05-25/13/10/09/08-sessions.md`).

