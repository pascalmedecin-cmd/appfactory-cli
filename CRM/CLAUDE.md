# CRM FilmPro : CLAUDE.md

**Note migration restructure** : ce fichier vit dans `CRM/CLAUDE.md`. Le sous-projet CRM FilmPro est dans `AppFactory/CRM/` (path Vercel `rootDirectory: CRM`). Voie A livrée S173 2026-05-06 (split container CLAUDE.md). Voie B livrée S174 2026-05-07 (rename `template/` → `CRM/` + retrait wizard méta + repointage Vercel). Le `AppFactory/CLAUDE.md` racine est un stub container minimal qui pointe vers les 3 sous-projets (CRM, Consulting, Formation). Voir `~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/project_appfactory_restructure.md` pour le contexte migration complet.

**Statut :** Phase C. Refonte page Signaux V4 livrée prod (S189, 2026-05-13) : scoring sans temporalité + drawer mots-clés overlay + ScorePill saturée gradient + bandeau dominante 3px par card + cards line-clamp 4 + tab underline 3px ; fix SSR 500 `onDestroy`→`$effect`. Détail complet + tests/audits/deploy : § Livré S189 ci-dessous + mémoire `feedback_svelte5_ondestroy_ssr_window_undefined.md`. **Antérieur** : Refonte Signaux V3 S188 + cron Zefix S187, Page Log CRM S185+S186, refonte page Aide S182+S183, cascade audit 360 fermée S178→S180 (136 findings, 134 fixés), API Google Places S181, cascade golden v9 6/6 (S175-S176ter), migration restructure Voie A+B (S173-S174). Formation IA = sous-projet autonome dans `Formation/`, `cc` option 5.
**Derniere mise a jour :** 2026-05-25 (S191 : refonte mobile CRM Bloc #1 cockpit - helpers MobileEntityCard testés + Cards Prospection + Cards Entreprises)
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** S191 livrée (high, ~1h, Score 2/4). Bloc #1 cockpit refonte mobile fermé : (1) Helpers MobileEntityCard extraits en `.ts` pur + 25 tests Vitest TDD (arbitrage Option B preserving-productive-tensions : doctrine projet `.svelte=e2e` respectée, aucune nouvelle dep jsdom/testing-library). (2) Cards Prospection : 5 helpers `leadCard*` + wrapper `.prospection-shell[data-mobile-enabled]` + CSS-only switch. (3) Cards Entreprises : matchMedia + derived `forceMobileCards`/`effectiveView`, toggle masqué mobile (`onMount`/`onDestroy` évités, $effect cleanup SSR-safe). Tests 1371/1371 verts (+25 vs baseline), typecheck 0 erreur. Commit prod `09703bb` (9 fichiers, +781). Prochaine session : Bloc 1 cockpit Pipeline (PipelineMobileAccordion + tests + intégration `pipeline/+page.svelte`) puis Bloc 2 polish Reporting + 4 pages MOBILE-OK puis Phase 4 QA + Phase 5 livraison. Date cible : 2026-05-31.
**Sessions précédentes (condensé)** - détail S165-S175 : `archive/2026-05-06-sessions.md` + S174-S175 dans Livré ci-dessous. Détail S122-S125 : `archive/2026-04-28-sessions.md`. Détail S78-S79 : `archive/decisions-sessions-78-79.md`. Détail S70-S77 : `archive/decisions-sessions-70-77.md`. Détail S80-S107 : `Formation/CLAUDE.md` (sous-projet autonome).


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

**Prochaine attaque** : Bloc 1 - Refonte mobile CRM Pipeline (créer PipelineMobileAccordion + tests + intégration page) (~2h xhigh). Bloc #1 cockpit livré ce tour (S191 2026-05-25, commit `09703bb`, 1371/1371 tests verts +25, 0 régression typecheck) : Helpers MobileEntityCard testés (25 tests Vitest, pattern Option B « préserver tension productive » helpers .ts purs + e2e Playwright à venir B1, doctrine projet .svelte=e2e respectée), Cards mobile Prospection (5 helpers leadCard* + wrapper data-mobile-enabled), Cards mobile Entreprises (matchMedia + derived `forceMobileCards`/`effectiveView` + toggle masqué).

### 1. Refonte mobile CRM - Pipeline (composant + tests + intégration) [AUTONOME • xhigh • ~2h]

- **Pourquoi** : Composant `PipelineMobileAccordion` reste à créer et intégrer. Pattern TDD éprouvé sur MobileEntityCard (Option B : helpers .ts extraits + tests Vitest purs, e2e Playwright laissé pour B1 QA). Spec : `.product-architect/prd.md` + acceptance-criteria.json + DESIGN.md § Composants.

- **Prérequis** : Aucun, pattern MobileEntityCard validé (Bloc #1 cockpit livré ce tour).

- [ ] **[EXÉCUTABLE]** Créer `src/lib/components/pipeline/PipelineMobileAccordion.svelte` (spec DESIGN.md § Composants) : 6 étapes header tappable (icon + label + count opps + somme CHF formatée + chevron rotate), animation transform-only scaleY 200ms ease-out-expo, aria-expanded/aria-controls, clavier Enter/Space, état vide « Aucune opportunité dans cette étape ».

- [ ] **[EXÉCUTABLE]** Tests Vitest helpers PipelineMobileAccordion : extraire logique pure (formatage CHF, expand/collapse state, mapping étape→sommes/counts) dans `pipeline-mobile-accordion.helpers.ts` + ≥10 tests TDD. Pattern Option B (cf. memory/feedback_svelte5_tests_option_b_preserving_tension.md à créer si nouvelle convention).

- [ ] **[EXÉCUTABLE]** Modifier `src/routes/(app)/pipeline/+page.svelte` : guard `isMobile && featureFlags.ffCrmMobileV2` (pattern matchMedia + $effect cleanup déjà utilisé sur entreprises +page.svelte), remplacer kanban par PipelineMobileAccordion, SlideOut détail opp avec bouton « Faire avancer » (dropdown 5 étapes alternatives).

### 2. Refonte mobile CRM - Polish Reporting + 4 pages MOBILE-OK [AUTONOME • high • ~2h]

- **Pourquoi** : 5 pages restantes à polish CSS-only mobile (masquage éléments desktop-only). Pas de refonte structurelle.

- **Prérequis** : Aucun, indépendant Bloc 1 ci-dessus.

- [ ] **[EXÉCUTABLE]** Modifier `src/routes/(app)/reporting/+page.svelte` : masquer ReportingPipelineTable + export CSV en mobile (CSS media query `< 1024px` + class `desktop-only`). KPI + charts + activity cards restent visibles.

- [ ] **[EXÉCUTABLE]** Polish 4 pages MOBILE-OK : Dashboard (masquer animations stagger mobile, perf), Signaux (masquer drawer Keywords mobile, expert-only), Veille (masquer sommaire droit sticky mobile), Aide (masquer sommaire TOC droit mobile). Audit visuel rapide Chrome DevTools iPhone preset.

### 3. Refonte mobile CRM - Phase 4 QA 360 [AUTONOME • xhigh • ~2h]

- **Pourquoi** : Gate 3->4 atteinte une fois Bloc 1 terminé. Cf. `.product-architect/prd.md § 10 Plan de test` + acceptance-criteria.json (24 critères bloquants Phase 4).

- **Prérequis** : Bloc 1 terminé, 1346+ tests verts, typecheck 0 erreur.

- [ ] **[BLOQUÉ - Bloc 1 livré]** audit-uiux Mode A (5 agents parallèles : composants, typo, interactions, responsive, accessibilité) sur les 5 pages refondues + 4 polish. 0 finding Critical, ≤ 2 High justifiés hors-scope.

- [ ] **[BLOQUÉ - Bloc 1 livré]** Playwright E2E 3 user flows critiques (F1 Signal→prospect→relance, F2 fiche terrain+photo+appel, F3 pipeline→faire avancer) sur preset `iPhone 14 Pro Max`. Tests `tests/mobile-flows.spec.ts`.

- [ ] **[BLOQUÉ - Bloc 1 livré]** Playwright snapshots desktop verrouillés (0 régression). Assertions Playwright : `scrollWidth <= clientWidth` mobile + `page.locator('table').count() === 0` viewport < 1024px sur 5 pages.

- [ ] **[BLOQUÉ - Bloc 1 livré]** axe-core via `@axe-core/playwright` : 0 sérieux/critique, 100% tap targets >= 44x44 CSS px.

- [ ] **[BLOQUÉ - Bloc 1 livré]** Lighthouse CI mobile (preset mobile, Vercel preview) : >= 90 sur Perf / A11y / Best Practices / SEO, 5 pages refondues.

- [ ] **[BLOQUÉ - Bloc 1 livré]** code-review:security-auditor + bug-hunter + contracts-reviewer (subagents Opus). 0 H/C/M, 0 Critical, 0 breaking change. Artifact `~/.claude/projects/-Users-pascal--claude/memory/audit_secu_2026-05-XX_crm_mobile_v2.md` persisté.

### 4. Refonte mobile CRM - Phase 5 livraison [SUPERVISÉ • high • ~1h]

- **Pourquoi** : Gate 5 nécessite validation Pascal. Rollout canary->beta->GA via SQL UPDATE auth.users (feature flag JWT custom claims).

- **Prérequis** : Phase 4 verte, audit secu artifact daté.

- [ ] **[BLOQUÉ - Phase 4 verte]** Canary Pascal (SQL UPDATE) + smoke J+1 (flows F1+F2+F3) sur iPhone réel.
- [ ] **[BLOQUÉ - canary OK]** Beta Antoine (SQL UPDATE) + smoke J+2.
- [ ] **[BLOQUÉ - beta OK]** GA 3ᵉ fondateur (SQL UPDATE), snapshot DB pré-livraison, CHANGELOG.md, mise à jour CLAUDE.md Livré, entry cockpit outcome (durée + succès + 1 ligne). Cleanup flag après J+7 stable GA.

→ voir pack spec complet : `CRM/.product-architect/prd.md` + `acceptance-criteria.json` + `DESIGN.md` + `feature-flag-plan.md` + `adr/*.md`. Gates signées : `.product-architect/gates-signed.jsonl` (1->2 et 2->3 OK). État Phase 3 partiel : foundation feature flag + MobileEntityCard + page Contacts mobile livrés. Entry cockpit `20c37767` reste transmitted (livrable continu, fermée après Phase 5 GA).

### Watch list S189 (post-refonte Signaux V4)

- **[WATCH] Svelte 5 — `onDestroy` s'exécute en SSR (Vercel) mais pas en `vite preview`** (incident S189) : c'est la source du 500 prod V4 initial. Toute référence à `window`/`document`/`localStorage`/`setInterval` qui doit être cleanupée DOIT passer par `$effect(() => { ...; return () => cleanup; })`, jamais par `onMount`+`onDestroy`. Vite preview ne reproduit PAS le bug (polyfill SSR différent d'adapter-vercel) — toujours tester en **preview branch Vercel** pour les composants qui touchent window. Mémoire `feedback_svelte5_ondestroy_ssr_window_undefined.md` gravée. Surveiller : autre composant qui touche window dans un `onMount`/`onDestroy` (grep `onDestroy.*window` + `onDestroy.*document` + `onDestroy.*localStorage` à la prochaine refonte UI).
- **[WATCH] Trap Vercel `rollback` → alias prod verrouillé** (incident S189) : après `vercel rollback`, l'alias prod (`filmpro-crm.vercel.app`) reste figé sur le rollback target. Les `git push` suivants buildent côté Vercel mais ne promeuvent PAS automatiquement (auto-promote suspendu). Il faut `vercel promote <new-deploy-url> --yes` explicite. Sinon Pascal teste prod en croyant voir le nouveau push et voit toujours l'ancien rollback. → Toujours vérifier via `vercel inspect filmpro-crm.vercel.app` après push post-rollback que l'alias pointe bien sur le nouveau deploy. Documenté dans la mémoire ci-dessus.
- **[WATCH] Drift latent script ↔ runtime `computeFullScore`** (audit contracts S189 Low) : `scripts/rescore_signaux_v2.mjs:65-76` ré-implémente la logique canton+source+entreprise de `scoring.ts:101-162`. Le test de parité (`keywords.test.ts:374-417`) ne couvre que `countMatches`+`normalizeNFD` via `_keywords_pure.mjs` partagé. Si `scoring.ts` ajoute un composant futur (ex: bonus secteur, retrait source), le cron tournera sur ancienne logique en silence. Fix proposé : étendre `_keywords_pure.mjs` avec `computeFullScoreCore({canton, source, ...})` partagé, OU ajouter un test de parité applicable à 5 fixtures représentatives (Cœur SIMAP, Bonus zefix, Éviter NE, etc.). Non bloquant V1.
- **[WATCH] Perf `highlightKeywordsAndSearch` non memoizée + maxlength input search** (audit security S189 Info x2) : (1) `SignauxCards.svelte:111-119` appelle `highlightKeywordsAndSearch` inline dans le `{#each}` à chaque render. Sur > 500 signaux × 40+ keywords = ~20 000 ops/render. Self-DoS local sans impact sécu. Mémoiser si dataset croît. (2) `signaux/+page.svelte:178-185` — `searchDebounced` non borné. Un paste 100 000 chars saturerait `normalizeNFD` + `indexOf` en boucle. Mono-tenant donc self-DoS uniquement. Ajouter `maxlength="200"` sur l'input search (cosmétique).
- **[WATCH] Décote temporelle `calculerBonusVeille` (`weeksSince > decayWeeks`)** non touchée par V4 (S189) : strictement parlant, c'est aussi une « temporalité dans le scoring » que Pascal voulait retirer. Mais c'est sur un CONCEPT DIFFÉRENT (bonus Veille cross-table sur `prospect_leads`, pas sur `signaux_affaires` qui s'affichent sur `/signaux`). N'apparaît PAS sur la page Signaux. À trancher Pascal si jugé dérangeant. Si oui : retirer `decayWeeks` + `weeksSince > decayWeeks` early-return dans `calculerBonusVeille` (`scoring.ts:73-100`) + retirer `weeksSince` du type `IntelligenceSignalInput` (+ callers).
- **[WATCH] M1 contracts : `HighlightChunkV2` union discriminé** (audit contracts S188 Medium #1) : le type `{ text; cat: KeywordCategorie | null; search: boolean }` autorise `{ search: true, cat: 'coeur' }` même si l'invariant runtime stipule « search prime → cat=null ». Le consumer `SignauxCards.svelte:99` enchaîne `if (chunk.search) … else if (chunk.cat)`, ce qui marche en pratique mais TS ne refuse pas un futur appelant qui produirait un chunk hybride. Refactor proposé : union discriminée `{ kind: 'plain' } | { kind: 'keyword'; cat: KeywordCategorie } | { kind: 'search' }`. Coût ~6 lignes consumer + tests. Non bloquant V1.

### Watch list S188 (post-refonte Signaux V3) — partiellement archivée

- **[WATCH] Asymétrie regex `\b...\b` vs substring search** (audit contracts S188 Low #3) : surlignage et scoring keyword utilisent `\bvitrage(s?)\b` (plein-mot + pluriel), mais le filtre search dans `+page.svelte:179-186` utilise `String.includes` (substring). Conséquence : taper `vit` (≥ 2 chars) filtre les cartes contenant `vitrage`/`vitrine`/`activité`, mais `highlightKeywordsAndSearch` peut highlighter aussi `vit` dans `activité` (substring sur normStr). À surveiller si Pascal trouve le surlignage « trop bruyant » à 2-3 chars.
- **[WATCH] Gap e2e Playwright signaux** (audit test-coverage S188 Medium) : 0 test e2e Playwright sur le parcours search /signaux. La logique de filtre client est lisible et 100 % derived, mais une régression d'intégration (input × debounce × filter × rendu chunks) serait invisible aux tests Vitest. Coût ~20-30 min : `tests/signaux-search.spec.ts` + config dédiée + storageState. À planifier si une refonte V4 touche cette zone.
- **[WATCH] Audit security signaux refonte 4 Info (S187)** : (1) `ADMIN_EMAIL` TS check vs RLS SQL pattern `LIKE '%@filmpro.ch'` divergents. Surface étroite (3 fondateurs). (2) `cree_par_email` accepte sentinelle `'unknown'` côté insert si session.user.email null. RLS empêche en pratique. (3) `rescoreActiveSignaux` non borné — couvert par rate limit /signaux fixé S187. (4) ReDoS théorique sur `makeWordRegex` (escape regex bien fait, validé empiriquement S188 sur `s?` suffix). Tracés `memory/audit_secu_2026-05-13_signaux_refonte.md`.
- **[WATCH] Test coverage 3 gaps Medium S187** : (1) test `addKeyword` avec `insertError.code !== '23505'` → assert `fail(500)`. (2) test `load` qui vérifie `canEditKeywords = false` pour antoine. (3) assertion sur le payload `score_pertinence` dans le test happy path `addKeyword`. À ajouter au prochain pass de tests signaux.
- **[WATCH] Audit contracts signaux 4 Low S187** : (1) asymétrie SQL `CHECK poids BETWEEN -10 AND 10` vs TS `KEYWORD_SCORE_CEIL = 20` (volontaire : poids unitaire vs score total cumulé). (2) `cree_par_email` sentinelle `'unknown'` cosmétique. (3) `terme_norm` calculé TS (pas extension `unaccent` Postgres). (4) Mention défensive `Zod trim().min(2)` aligné avec SQL CHECK.

### Watch list S186 (post-cleanup page Log)

- **[WATCH] Brand type `FeedbackEntry.context` vs `Database['Row'].context: Json`** (audit contracts S186 Low #4) : `types.ts:24` exige `FeedbackContext` non-nullable, mais `Database['feedback_entries']['Row'].context: Json` (Supabase régénéré). Le `load` normalise via `FeedbackContextSchema.parse(row.context ?? {})` donc le contrat est honoré à la frontière unique d'entrée des données. Si un futur consumer (RPC server-side, script ops, export endpoint) lit les rows sans passer par `load`, le type ment. Mitigation propre : (a) brand type `ParsedFeedbackEntry` côté load qui marque le contrat strict ; (b) ou `FeedbackEntry.context: FeedbackContext | null` au type domaine et fallback côté composant. Option (a) préférable (load = frontière unique aujourd'hui). Non-bloquant V1 (aucun consumer ne bypasse le load).
- **[WATCH] `FeedbackContextSchema.parse` sans try/catch au load** (audit secu S186 Info-2) : `+page.server.ts:load` parse chaque row sans wrapper safeParse. Si une row a un context corrompu (overflow `viewport.w` > 20_000, `recentErrors` cardinalité > 3, etc.), le load throw et casse `/log` pour tous les users. Vecteur résiduel = script ops malveillant via service_role. Mitigation defense-in-depth : wrapper `safeParse` + fallback `DEFAULT_CONTEXT`. Non exploitable par utilisateur final.
- **[WATCH] Rate limiter unique commun 5 endpoints** (audit secu S186 Info-3) : `hooks.server.ts:25` partage le même quota 10 req/min/IP entre `/api/prospection/*`, `/api/photos*`, `/api/visits*`, `POST /login`, `POST /log/*`. Couplage UX : spammer `/log?/create` consomme aussi le quota des autres endpoints (et inversement). Pas un problème sécu. Si usage augmente : 2 buckets (un pour actions lourdes, un pour `/log` + `/login`). YAGNI V1.
- **[WATCH] Rows pré-fix `created_by_email` casse mixte** (audit secu S186 Info-1) : depuis S186 `user.email.trim().toLowerCase()` à l'insert, mais les rows pré-S186 (≤ 5 rows smoke, Pascal en minuscule via OTP) peuvent contenir une casse mixte. Une requête SQL ad hoc `WHERE created_by_email = 'pascal@filmpro.ch'` les raterait. Surface nulle en pratique. Mitigation : `UPDATE … SET created_by_email = lower(...)` one-shot OU index expression-based `(lower(created_by_email))` si besoin de SELECT case-insensitive performant. Optionnel.

### Watch list S178 (post-V2c + post-V1) — archivées S187

→ Détail des [WATCH] V2c/V1 (rate limit /entreprises, TOCTOU Zefix, AbortSignal, cancelled flag, RLS multi-tenant, Tabs DOM untested, etc.) : `archive/2026-05-13-sessions.md` § « Watch list S178 ».

Seul [WATCH] toujours actif au global :
- **Durcissement RLS si 4e user non-fondateur** : tant que FilmPro = 3 fondateurs symétriques, RLS « tous voient/suppriment tout » assumée. Le jour où un 4e utilisateur non-fondateur est ajouté → ouvrir tâche `[EXÉCUTABLE]` policies `created_by = auth.uid()` + tests d'intégration RLS. → voir `memory/feedback_rls_multitenant_durcissement_si_4_users.md`.


<!-- BEGIN CONSOLIDATION (auto-géré par cockpit, ne pas éditer) -->

### Consolidation cockpit (réconcilié S181 2026-05-12)

**Blocs actionnables** : aucun — la refonte page Aide (ex-Bloc #1) est livrée S182. Backlog CRM cockpit vide.

**Blocs bloqués** : aucun.

**Note** : la cascade audit 360 (V1→V3b) est entièrement fermée (S180) et la source Google Places est livrée (S181), donc les anciens blocs B1/B2 de cette section sont caducs. CRM n'a plus qu'une entry `transmitted` côté cockpit → la consolidation LLM ne se relance pas (< 2 entrées) ; ce bloc est tenu à la main jusqu'à ce qu'une 2ᵉ tâche soit en file.

<!-- END CONSOLIDATION -->


### Watch list S171 — archivée S187

→ Détail des [WATCH] S171/S169 (quota search.ch, `prospect_leads.description` LLM future, `entry.sourceUrl` href client, race `addItem` veille, injection prompt LLM thème) : `archive/2026-05-13-sessions.md` § « Watch list S171 ».

### Livré cette session (récents + archives)

→ Sessions antérieures : `archive/2026-05-13-sessions.md` (S180 cascade V3b closure + S181 Google Places + recaps LIVRÉE) · `archive/2026-05-10-sessions.md` (S178 cascade audit 360 V1 + V2a + V2b + V2c + V3a-1 ; S179-S180 V3a-2 + détails connexes) · `archive/2026-05-09-sessions.md` (S174 Voie B + cascade golden 6/6 fermée + S176ter T2/T3 + S177 dashboard coûts) · `archive/2026-05-08-sessions.md` (S171-S173 + S175 dashboard v9 + S176bis x3 cascade /pipeline /contacts /entreprises) · `archive/2026-05-04-sessions.md` (antérieures)

- [x] ~~S191 - Refonte mobile CRM Bloc #1 cockpit (helpers MobileEntityCard testés + Cards Prospection + Cards Entreprises)~~ - Fait 2026-05-25 (high, ~1h ; Score effort 2/4 : multi_etapes + non_mesurable UX). **Trigger** : 3 entries cockpit Bloc #1 (`769c67d7` tests, `48e32268` Prospection, `a59661c7` Entreprises). Réorganisation pré-attaque : Pascal a validé split tests Vitest intercalés (TDD-like) → 2 entries cockpit créées (`769c67d7` + `b8a43ba1` PipelineMobileAccordion à venir), Bloc cockpit réorganisé 4→3 blocs. **Arbitrage Option B (preserving-productive-tensions skill activé)** : la config Vitest projet exclut `.svelte` (commentaire littéral vite.config.ts + CLAUDE.md M-48). Tension productive entre spec Phase 2 product-architect (« ≥10 tests Vitest ») et doctrine projet (`.svelte`=e2e). Décision : extraire helpers .ts purs + Vitest sur helpers + e2e Playwright laissé pour Bloc B1 QA. Aucune dep nouvelle (jsdom/testing-library/svelte évités), 0 régression sur les 81 tests existants, écart spec documenté (Phase 2 ne pouvait pas savoir). **Périmètre livré** : (1) **Tests MobileEntityCard** : `mobile-entity-card.helpers.ts` (6 helpers — `scorePillModifier` gère accent 'tiède'→'tiede', `scorePillClass`, `scorePillTitle`, `actionVariant` défaut 'neutral', `shouldInvokeOnClick` href vs onClick, `isValidDominant`) + `mobile-entity-card.helpers.test.ts` (25 tests TDD strict red-green vérifié). `MobileEntityCard.svelte` refacto pour consommer les helpers (ligne inline `tiède→tiede` supprimée, `?? 'neutral'`, `` `Score ${value}` ``). `contacts/+page.svelte` import types depuis helpers.ts (source unique). (2) **Cards Prospection** : 5 helpers `leadCard*` (`Subtitle` canton+localité+source, `ScorePill` via `scoreToCategory` avec mapping 'tiede'→'tiède', `Badges`, `FooterItems` date publication relative + montant CHF k, `Actions` tel: si phone, `AriaLabel`). Wrapper `.prospection-shell[data-mobile-enabled]` sur bloc bg-white parent (englobe tabs + tabpanel). Wrapper `.prospection-table-wrap flex flex-1 flex-col min-h-0` autour du DataTable pour switch CSS propre. Bloc `<style>` avec `@media (max-width: 1023.98px)` : cards visibles + table cachée si flag ON, 1 col puis 2 cols à 600px+. (3) **Cards Entreprises** : pattern différent (vue cards existe déjà desktop via toggle). State réactif `isMobileViewport` via `window.matchMedia('(max-width: 1023.98px)')` + `$effect` cleanup (jamais `onMount`/`onDestroy` SSR-unsafe, cf. memory `feedback_svelte5_ondestroy_ssr_window_undefined.md` incident S189). Derived `forceMobileCards = isMobileViewport && featureFlags.ffCrmMobileV2` + `effectiveView = forceMobileCards ? 'cards' : view`. Toggle `EntreprisesViewToggle` conditionné `{#if !forceMobileCards}`. Aucun wrapper data-attribute requis, switch JS pur. **Validation** : `npm run check` 0 erreur (28 warnings pré-session inchangés), `npm test` 1371/1371 verts (+25 vs baseline 1346, 0 régression), suite 4.3s. **Cockpit** : 3 entries delivered via deliver.py mid-session, `block_marked_delivered: true` au 3e (Bloc #1 cockpit fermé). **Commit prod pushed** : `09703bb feat(crm): refonte mobile Bloc #1 - cards Contacts/Prospection/Entreprises + helpers MobileEntityCard` (9 files changed, 781 insertions, foundation S190bis incluse — app.d.ts + feature-flags.ts + +layout.server.ts nécessaires au build). **Tracking git** : `CRM/src/routes/(app)/contacts/+page.svelte` (modifié) + `CRM/src/routes/(app)/prospection/+page.svelte` (modifié) + `CRM/src/routes/(app)/entreprises/+page.svelte` (modifié) + `CRM/src/lib/components/mobile/MobileEntityCard.svelte` (modifié — consomme helpers) + `CRM/src/lib/components/mobile/mobile-entity-card.helpers.ts` (nouveau) + `CRM/src/lib/components/mobile/mobile-entity-card.helpers.test.ts` (nouveau, 25 tests) + `CRM/src/app.d.ts` + `CRM/src/routes/+layout.server.ts` + `CRM/src/lib/types/feature-flags.ts` (foundation S190bis).
- [x] ~~S190bis - Refonte mobile CRM Phases 1+2 product-architect + Phase 3 partielle (foundation + MobileEntityCard + page Contacts mobile)~~ - Fait 2026-05-24 (xhigh, ~3h ; Score effort 4/4 : structurelle multi-fichiers + multi-étapes + itération coûteuse + non-mesurable UX). **Trigger** : entry cockpit `20c37767` (audit mobile CRM + finir fonctionnalités sur mobile, pas de tableau / liste invisible). Pascal a demandé approche `/product` product-architect : specs détaillées cette session, exec sessions suivantes. **Phase 1 Cadrage** : 8 questions structurantes validées (utilisateurs = 3 fondateurs FilmPro iPhone, problème = 0 scroll H + 0 tableau illisible mobile, critères succès = Lighthouse mobile >= 90 + 0 table HTML viewport < 1024px + 0 scroll H, 3 user flows F1 Signal->prospect / F2 fiche terrain+photo+appel / F3 pipeline->faire avancer, contraintes a11y AA + 0 régression desktop + 0 régression RLS, stack figée SvelteKit5+Tailwind4+Supabase, hors-scope strict pas PWA/push/offline/swipe avancés/bottom-nav/refonte data model, date 2026-05-31). Audit factuel 10 pages CRM délégué à agent Explore opus (rapport exhaustif par page : Dashboard MOBILE-OK, Prospection MOBILE-ESSENTIEL, Contacts MOBILE-ESSENTIEL, Entreprises MOBILE-ESSENTIEL [forçage cards], Pipeline MOBILE-ESSENTIEL [accordéon], Signaux MOBILE-OK, Veille MOBILE-OK, Aide MOBILE-OK, Log DESKTOP-ONLY S185 conservé, Reporting MOBILE-ESSENTIEL [masquer table]). **Phase 2 Specs** : pack complet `.product-architect/` (11 fichiers) : `prd.md` 12 sections + `acceptance-criteria.json` 27 critères atomiques (24 bloquants Phase 4) + `DESIGN.md` design system mobile sémantique (composants, breakpoints, tokens, naming, anti-patterns) + `slo-sli.md` 7 SLIs (LCP/INP/CLS/FCP/TTFB + error rate + crash rate) + `feature-flag-plan.md` rollout JWT custom claims canary->beta->GA + 5 ADRs (breakpoint 1024px, MobileEntityCard composant générique, Pipeline accordéon vs alternatives, sidebar burger conservée, feature flag Supabase vs GrowthBook). Skip justifiés : data-model.sql + rls-policies.sql + api-contracts.ts (refonte UI pure, 0 changement BDD/API/RLS). Gates 1->2 et 2->3 signées dans `.product-architect/gates-signed.jsonl`. **Phase 3 partielle (foundation + 1 page test)** : (1) `src/lib/types/feature-flags.ts` (nouveau) type `FeatureFlags` + `readFeatureFlags(appMetadata)` lit JWT custom claim `ff_crm_mobile_v2`. (2) `src/app.d.ts` ajout `featureFlags: FeatureFlags` dans `PageData`. (3) `src/routes/+layout.server.ts` propage featureFlags depuis `user.app_metadata`. (4) `src/lib/components/mobile/MobileEntityCard.svelte` (nouveau, 350+ lignes) : composant générique réutilisable (titre, sous-titre, badges variant, score pill avec classes globales `.signal-score-pill--*`, bandeau dominant 3px coeur/bonus/eviter, footer items icon+text, actions tactiles >= 44x44px avec variant primary/neutral/danger, safe-area-inset-bottom, focus-visible primary, prefers-reduced-motion). (5) `src/routes/(app)/contacts/+page.svelte` : import MobileEntityCard + helpers `contactCardSubtitle` / `contactCardBadges` / `contactCardActions` (tap-to-call `tel:` + email `mailto:`), wrapper `contacts-shell[data-mobile-enabled='true']` + CSS-only switch via `@media (max-width: 1023.98px)` (mobile cards visible + table cachée si flag ON, sinon fallback table existante). **Validation** : `npm run check` 0 erreur (28 warnings pré-existants inchangés), `npm test` 1346/1346 verts (0 régression). Pas de commit prod (pack spec + code Phase 3 partielle, attend smoke test Pascal puis propagation 4 pages restantes + composant PipelineMobileAccordion + tests Vitest sur composants nouveaux). **Tracking git** : `CRM/.product-architect/*` (11 fichiers nouveaux) + `CRM/src/lib/types/feature-flags.ts` (nouveau) + `CRM/src/app.d.ts` (modifié) + `CRM/src/routes/+layout.server.ts` (modifié) + `CRM/src/lib/components/mobile/MobileEntityCard.svelte` (nouveau) + `CRM/src/routes/(app)/contacts/+page.svelte` (modifié) + `CRM/CLAUDE.md` (Prochaine session décomposée Phase 3 propagation / Phase 4 QA / Phase 5 livraison).
- [x] ~~S190 - Vérification crons signaux prod + relance manuelle veille W20~~ - Fait 2026-05-18 (low, ~0,2h ; Score effort 1/4 : vérification mécanique chiffres BDD + déclenchement workflow externe). **Vérif crons signaux** (entry cockpit `97257baa` livrée) : query Supabase service_role sur 7 jours. (a) **Zefix `creation_entreprise` : 417/7j** — la cible CLAUDE.md 40-80 s'avère sous-estimée ; le test local pré-S187 prédisait déjà 350, prod confirme la même magnitude. Échantillon Romandie (GE/VD) du jour = cron a tourné aujourd'hui. (b) **SIMAP v2/v3 actif** : sur 5 derniers SIMAP, `notes_libres` enrichies (`Éviter route (-3)`, `Bonus ingénieur×2 (+4)`, `Signal SIMAP (+2)`) ; 11/41 SIMAP ont matché Cœur/Bonus/Éviter sur 7j (les autres = pas de mot-clé pertinent dans description, attendu). (c) **0 erreur Vercel** : entrées fraîches datées 2026-05-18 = preuve directe que `/api/cron/signaux` a tourné sans erreur aujourd'hui. **Relance manuelle veille W20** : cron Anthropic GitHub Actions (vendredi 06:00 UTC) avait skip vendredi 15/05 pour crédit API insuffisant. Trigger via `gh workflow run cron-veille.yml -f week=2026-W20` (run [26029538709](https://github.com/pascalmedecin-cmd/actions/runs/26029538709)). **Succès** : pipeline 452,9s, total job 7m58s, `reportId=901c3385-e565-484a-a058-482dc44fd415` publié, édition W20 visible sur `/veille` en prod. **Note CLAUDE.md** : cible « 40-80 Zefix/7j » à ajuster vers `~350-500/7j` au prochain ajustement de bloc (info, non bloquant). Aucun commit prod (lecture seule + déclenchement workflow externe).
- [x] ~~S189 - Refonte Signaux V4 (scoring sans temporalité + drawer mots-clés + ScorePill saturée + bandeau dominante + cards line-clamp 4 + tab 3px) + fix SSR `onDestroy → $effect`~~ - Fait 2026-05-13 (xhigh, ~3h30 ; Score effort 4/4 : structurelle multi-fichiers + multi-étapes + itération coûteuse + non-mesurable UX). **Trigger** : demande explicite Pascal post-V3 « revoir signaux pour lisibilité + premium UI/UX cohérent golden ». 5 questions tranchées en cadrage (Q1=retirer toute temporalité, Q2=drawer overlay droit, Q3=retirer tab Tous + défaut Nouveau, Q4=garder hideOutOfScope mais rendre visible, Q5=accents couleur sur a+b+c). Skills activés (déjà globaux) : `refactoring-ui`, `taste-skill`, `ux-guide`, `golden-standard v9` (référence dure CRM). **Périmètre livré** : (1) **Scoring sans temporalité** : bloc Récence retiré de `scoring.ts:169-187` + `differenceEnJours` supprimée + import `DAY_MS` retiré. `config.scoring.recence` retiré, `scoring.maxPoints` 12→10. `scoreLabel` seuils par défaut alignés sur `config.scoring.labels` : chaud≥7 / tiède≥4 / froid≥1. Tests Vitest adaptés (2 tests récence remplacés par « ne donne aucun bonus » + cumul lead chaud 11→9 = perte +2). Script `rescore_signaux_v2.mjs` aligné (bloc temporel retiré du `computeFullScore` + SELECT date_publication retiré). (2) **UX défauts** : `activeTab` default `'tous'`→`'nouveau'`, tab `Tous` retiré de `tabsSpec`, hardcoded localStorage non utilisé pour le tab. (3) **Drawer mots-clés** : `SignauxKeywordsPanel.svelte` réécrit (props `open`/`onClose`), drawer 440px slide-in droit avec backdrop overlay rgba(17,24,39,0.4) cliquable + Échap, animation 240ms ease-out-expo, role=dialog aria-modal. Bouton trigger `Mots-clés` dans toolbar (visible pour tous) avec icône `tune` + badge count primary blanc. Layout `signaux-layout` 2 colonnes retiré (page utilise flex column standard, 100% largeur cards). State `keywordsDrawerOpen=$state(false)`. (4) **Toggle hors-scope visible** : derived `outOfScopeCount` (compte signaux que `hideOutOfScope` masquerait, calculé sur `filteredBeforeScope` = `tab+type+canton+search` sans le filtre hideOutOfScope lui-même), label dynamique `(N masqué·s)` warning ou `(0)` grisé + case désactivée si N=0. Refactor : extraction de la chaîne filtres en derived `filteredBeforeScope` réutilisée par `outOfScopeCount` ET `filteredSignaux`. (5) **UI premium** : `app.css` ajout classes globales `.signal-score-pill--{chaud,tiede,froid,unscored}` (custom props `--score-pill-from/to/shadow`, linear-gradient 135deg saturé, box-shadow inset 1px hairline + drop shadow 1-2px). `SCORE_STYLES` refondu (`bgClass:''` partout, `colorClass:'signal-score-pill--chaud'` etc.) — appliqué automatiquement dans SignauxCards et SlideOut +page.svelte. Bandeau 3px coloré en top de chaque card via `data-dominant=coeur|bonus|eviter|neutral` + nouvelle fonction `dominantKeywordCategory(text, keywords): KeywordCategorie | null` dans `keywords.ts` (priorité Cœur > Bonus > Éviter > null, court-circuit sur 1er match Cœur). CSS `.card-signal-band` 3px linear-gradient 90deg, overflow:hidden sur card pour clip border-radius. Cards : padding 16→20, gap 16→20, line-clamp 2→4, hover translateY(-3px) + shadow-card-hover, font-size desc 13→14. Sort-btn h-28 + padding 14px + ring focus-visible primary + active box-shadow ring inset. Tab actif underline 2px→3px primary (Tabs.svelte cross-page CRM). (6) **Cleanup** : suppression CSS unused `.empty-card-*` (résidus ancien empty grid 2 cards jamais activé). **Bug SSR identifié + fixé** : déploiement V4 e02bd88 a renvoyé 500 prod sur `/signaux`. Cycle diag : (i) rollback immédiat S188 (1s, service restauré), (ii) verifier code local OK (1346 tests + build + npm run preview), (iii) capturer stack via cycle promote V4 5s + Chrome MCP refresh authenticated + read_page + rollback immédiat. Stack capturée : `ReferenceError: window is not defined at .svelte-kit/output/server/entries/pages/(app)/signaux/_page.svelte.js:330:7 at #close_render`. Cause racine : `onDestroy(() => window.removeEventListener(...))` dans SignauxKeywordsPanel.svelte. **En Svelte 5, `onDestroy` s'exécute aussi côté SERVER** (cleanup post-render SSR), contrairement à `onMount` (client-only). Fix : `$effect(() => { window.addEventListener(...); return () => window.removeEventListener(...); })` — `$effect` ne tourne jamais en SSR, son cleanup non plus. Idiom Svelte 5 propre. Pourquoi local ne reproduisait pas : `vite preview` polyfill le scope global SSR différemment d'`@sveltejs/adapter-vercel`. Commit fix `a6c5440`. **Mémoire gravée** : `feedback_svelte5_ondestroy_ssr_window_undefined.md` (règle + trap vite preview + trap alias prod verrouillé après rollback). **Trap Vercel rollback** : après un `vercel rollback`, l'alias prod se verrouille sur le rollback target. Les pushes suivants buildent mais ne promeuvent plus auto. Il faut `vercel promote <new-deploy-url> --yes` explicite. **Audits Opus 2 parallèles** : security 0 C/H/M/L + 2 Info non-bloquants watchlist (memoization highlight si dataset>500, maxlength input search), OWASP 11/11 ; contracts 0 C/H + 1 Medium fixé in-session (collision CSS `.score-pill--*` entre app.css globales V4 et classes scopées `ScorePill.svelte` prospection → renommé en `.signal-score-pill--*` namespace exclusif, vérifié 0 régression /prospection) + 2 Low watchlist (drift latent script ↔ runtime `computeFullScore` non couvert par parité, SELECT `date_publication` orphelin retiré in-session). **Tests** : +14 Vitest (11 `dominantKeywordCategory` + 3 `scoreLabel`/`scoreStyle` V4), suite 1346/1346 verts, svelte-check 0 erreur (warnings réduits 33→28 via cleanup CSS unused). **Build** : 17s, adapter-vercel OK. **Deploy** : commits `e02bd88` (V4 initiale buggée SSR) + `a6c5440` (fix). Rollback transitoire vers S188 `filmpro-izyf135qr` (5 min total downtime). Re-promote explicite V4-fix `filmpro-5vt1dqlmb` après push (alias prod verrouillé post-rollback). **Rescore prod** via `node scripts/rescore_signaux_v2.mjs --apply` : **117 signaux modifiés** (SIMAP standard `4→2` = perte exacte du +2 récence, top SIMAP Cœur Vitrage `9→7` = `Cœur vitrage +5 + SIMAP +2 = 7`, signaux Éviter route/terrassement `-2→-4` etc.). **Smoke prod 12 critères Chrome MCP** sur <https://filmpro-crm.vercel.app/signaux> : C1-C3 ✓ + C5-C12 ✓ (11/12 verts), C4 (Zefix `creation_entreprise` à score 0) non testable aujourd'hui car 0 Zefix actif en BDD (cron Zefix v2 attendu 14/05 matin via task Bloc 1 de Prochaine session). Validé indirectement : tests Vitest récence + rescore SIMAP `4→2` prouvent le retrait du composant temporel toutes sources confondues. **Spec figée + 12 critères** : `notes/refonte-signaux-v4-2026-05-13/spec.md`. 2 commits prod pushed : `e02bd88` + `a6c5440`. **Tracking git** : `src/lib/scoring.ts` + `scoring.test.ts` + `src/lib/scoring/keywords.ts` + `keywords.test.ts` + `src/lib/utils/signauxFormat.ts` + `signauxFormat.test.ts` + `src/lib/config.ts` + `src/lib/prospection-utils.ts` (commentaire) + `src/lib/components/Tabs.svelte` (underline 3px) + `src/lib/components/signaux/SignauxCards.svelte` + `src/lib/components/signaux/SignauxKeywordsPanel.svelte` (réécrit + fix SSR) + `src/routes/(app)/signaux/+page.svelte` + `src/app.css` + `scripts/rescore_signaux_v2.mjs` + `notes/refonte-signaux-v4-2026-05-13/spec.md` (nouveau).
- [x] ~~S188 - Refonte Signaux V3 + Smokes prod Bloc #1 + Fix UX collapse /log~~ - Fait 2026-05-13 (xhigh, ~5h ; Score effort 4/4). **Bloc #1 Smokes prod** (livré entièrement, 5/5 entries traitées) : (a) smoke admin Log Pascal (FAB + create + statut + export JSON compliant + admin notes), 1 finding UX collapse fixé in-session (no-debt rule, Pascal a corrigé l'idée cockpit que j'avais ouvert) → `FeedbackTable.svelte:177` row se ferme uniquement après « Enregistrer la note » success (pas après statut, sinon admin doit re-cliquer pour saisir note), commits `cc13e36` puis `1683eb0` ; (b) login antoine OTP → /log lecture seule (0 boutons statut/export/notes) ; (c) login + expiration session 7j vérifiée prod via DevTools cookie login_at = 1000000000000 → redirect /login?error=expired, message Session expirée. Confirmé OTP-only via `src/routes/login/+page.server.ts:22`, pas de password. Mécanique testée `hooks.server.test.ts:139`. Row fictive smoke S185 (`04f25276`) supprimée via supabase service_role. (d) 2 smokes mobile reportés vers Bloc #4 audit mobile (`37224d74` + `726d18c4` supprimées du cockpit, summary `d068a79d` enrichi avec les 2 checks). **Bloc #3 Refonte Signaux V3** (livré entièrement, 4/4 entries) cadrage→spec→exec→parapluie : (1) **Surlignage option A « underline typo éditorial »** validé Pascal via mockup HTML `notes/refonte-signaux-v3-2026-05-13/mockup-surlignage.html` : Cœur `font-weight 700 + underline 2px var(--color-success) + offset 3px + 0 fond`, Bonus `color primary + 500 + 0 fond + 0 underline`, Éviter `color danger + line-through 1px opacity 55% + 0 fond` (CSS `SignauxCards.svelte:251-273`). (2) **Recherche client** : input search au-dessus toolbar + icône loupe + bouton clear, debounce 200ms via `$effect` Svelte 5 (cleanup auto), filtre client case+accent insensitive sur `description_projet + maitre_ouvrage + commune`, persistance `localStorage.signaux.search` restaurée au mount, highlight jaune `#FEF9C3` des matches (painter char-par-char dans `highlightKeywordsAndSearch`, search override cat=null). (3) **Seed Cœur étendu** : nouveau script `scripts/seed_keywords_extend_coeur.mjs` idempotent (`ON CONFLICT (terme_norm) DO NOTHING`), 15 termes ajoutés en prod (verrière, double vitrage, triple vitrage, survitrage, paroi vitrée, protection solaire, pare-soleil, brise-soleil, film solaire, film thermique, film de protection, vitrage isolant, vitrage feuilleté, vitrage de sécurité, film opacifiant). (4) **Pluriel FR toléré** dans `makeWordRegex` (suffix `s?` optionnel sauf si terme finit déjà en `s`) — décision in-flight après diagnostic factuel « 0 SIMAP Cœur sur 117 actifs même avec 30 termes » : le mot prod « Vitrages » (pluriel) ne matchait pas `\bvitrage\b` strict. Aligné aussi dans `scripts/rescore_signaux_v2.mjs` via nouveau module partagé `scripts/_keywords_pure.mjs` (refactor M2 audit contracts). (5) **Rescore prod** via `rescore_signaux_v2.mjs --apply` : **15 SIMAP modifiés** dont **1 atteint Cœur** (YPERIA OIKEN Vitrages, score 4→9, top tri Pertinence), pluriels architectes/ingénieurs/fenêtres/routes détectés correctement. **Audits Opus 3 parallèles xhigh** : **Security** 0 C/H/M/L + 3 Info non-bloquants (perf > 500 cards, ligature ß edge, parsing .env naïf), OWASP 11/11. **Contracts** 0 C/H + 2 Medium (M1 union discriminé HighlightChunkV2 watchlist, M2 drift script ↔ runtime fixé in-session via `_keywords_pure.mjs` partagé + 9 tests parité) + 3 Low (L1 POIDS_COEUR constante fixée). **Test coverage** 0 C/H + 3 Medium gap e2e (watchlist). **Tests** : +26 Vitest (11 highlightKeywordsAndSearch V3 + 6 pluriel + 9 parité), suite 1332/1332 verts, svelte-check 0 err, build 16s. **Smoke prod Chrome MCP** sur https://filmpro-crm.vercel.app/signaux : 12/12 critères C1-C12 verts. Vitrages détecté pluriel (`text: "Vitrages"`), styles Cœur/Bonus/Éviter conformes spec, input search filtre 131→52 cards avec 76 marks jaunes `#FEF9C3`, localStorage `signaux.search`, clear btn → restaure tout, top Pertinence = SIMAP Cœur Vitrages score 9. Commit `c3dd58e` pushed. **Mémoire gravée** : `feedback_autonomie_findings_in_session_fix_pas_idea_cockpit.md` (no-debt rule : un finding ≤ 30 min trouvé en cours de smoke se fixe in-session, pas en entry idée — correction Pascal sur UX collapse). **Spec figée** : `notes/refonte-signaux-v3-2026-05-13/spec.md` (12 critères binaires, 5 lots, hors-scope explicite : pas d'éditeur de poids par mot-clé, pas de migration BDD, pas de search côté serveur). 3 commits prod pushed : `cc13e36`+`1683eb0` (collapse Log) + `c3dd58e` (refonte V3). **Tracking git** : `src/lib/scoring/keywords.ts` + `keywords.test.ts` + `src/lib/components/signaux/SignauxCards.svelte` + `src/routes/(app)/signaux/+page.svelte` + `src/lib/components/FeedbackTable.svelte` + `scripts/_keywords_pure.mjs` (nouveau) + `scripts/seed_keywords_extend_coeur.mjs` (nouveau) + `scripts/rescore_signaux_v2.mjs` + `notes/refonte-signaux-v3-2026-05-13/`.
- [x] ~~S187 - Refonte page Signaux V2 (panneau mots-clés, scoring v2 BDD, 39 mots seed, 117 SIMAP rescorés) + cron Zefix~~ : détail dans `archive/2026-05-13-sessions.md`
- [x] Détail livraisons S182-S186bis (refonte Aide + page Log + cleanup + fix cron Zefix) : `archive/2026-05-13-sessions.md`

