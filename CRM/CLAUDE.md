# CRM FilmPro : CLAUDE.md

**Note migration restructure** : ce fichier vit dans `CRM/CLAUDE.md`. Le sous-projet CRM FilmPro est dans `AppFactory/CRM/` (path Vercel `rootDirectory: CRM`). Voie A livrée S173 2026-05-06 (split container CLAUDE.md). Voie B livrée S174 2026-05-07 (rename `template/` → `CRM/` + retrait wizard méta + repointage Vercel). Le `AppFactory/CLAUDE.md` racine est un stub container minimal qui pointe vers les 3 sous-projets (CRM, Consulting, Formation). Voir `~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/project_appfactory_restructure.md` pour le contexte migration complet.

**Statut :** Phase C. Refonte page Signaux V4 livrée prod (S189, 2026-05-13) : scoring sans temporalité + drawer mots-clés overlay + ScorePill saturée gradient + bandeau dominante 3px par card + cards line-clamp 4 + tab underline 3px ; fix SSR 500 `onDestroy`→`$effect`. Détail complet + tests/audits/deploy : § Livré S189 ci-dessous + mémoire `feedback_svelte5_ondestroy_ssr_window_undefined.md`. **Antérieur** : Refonte Signaux V3 S188 + cron Zefix S187, Page Log CRM S185+S186, refonte page Aide S182+S183, cascade audit 360 fermée S178→S180 (136 findings, 134 fixés), API Google Places S181, cascade golden v9 6/6 (S175-S176ter), migration restructure Voie A+B (S173-S174). Formation IA = sous-projet autonome dans `Formation/`, `cc` option 5.
**Derniere mise a jour :** 2026-05-25 (S192 : refonte mobile Pipeline accordéon + polish Reporting/Dashboard/Signaux ; Blocs cockpit #1 + #2 fermés)
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** S192 livrée (high, ~2h, Score 2/4 helpers + 4/4 sur l'enchaînement). Blocs cockpit #1 (Pipeline mobile accordéon) + #2 (polish 4 pages MOBILE-OK) fermés en autonomie après réordonnancement TDD-first (tâche 6 helpers AVANT tâche 1 composant). Périmètre livré : (a) `pipeline-mobile-accordion.helpers.ts` (.ts purs, 7 fonctions + 4 types) + 22 tests Vitest TDD red-green, (b) `PipelineMobileAccordion.svelte` (6 étapes header tappable min-h 56px, animation transform-only scaleY 200ms ease-out-expo, aria-expanded/controls, Enter/Space toggle, prefers-reduced-motion), (c) intégration `pipeline/+page.svelte` ($effect matchMedia SSR-safe + featureFlags.ffCrmMobileV2 + buildAccordionStages), (d) Reporting `desktop-only` + bandeau mobile, (e) Dashboard stagger off mobile, (f) Signaux drawer Keywords expert-only. Audit qualité avant commit : 0 `!important` / 0 `any` / 0 TODO / 0 onDestroy+window / 0 code mort / `:global()` retiré. Tests 1393/1393 verts (+22), 0 erreur typecheck, 28 warnings baseline, build prod 14s. 2 commits pushed : `bd0b930` (docs CLAUDE.md cleanup -43%) + `4aef918` (feat mobile). Restant : smoke Pascal iPhone réel sur preview Vercel AVANT Phase 4 QA.
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

**Prochaine attaque** : Bloc 1 - Smoke iPhone réel Pascal sur preview Vercel (validation visuelle 3 user flows F1/F2/F3) avant Phase 4 QA (~15 min SUPERVISÉ). Blocs cockpit #1 (Pipeline accordion) + #2 (polish 4 pages) livrés ce tour (S192 2026-05-25, commits `bd0b930` + `4aef918`, 1393/1393 tests verts +22, 0 erreur typecheck, build prod 14s). Phase 3 product-architect du PRD refonte mobile désormais complète côté code (Phase 4 QA peut démarrer si smoke validé).

### 1. Smoke iPhone réel Pascal sur preview Vercel [SUPERVISÉ • low • ~15min]

- **Pourquoi** : Incident V4 S189 a prouvé que build local + 1393 tests verts ≠ rendu prod (`onDestroy` SSR-unsafe non reproductible en vite preview). Avant de débloquer Phase 4 QA (audits + Playwright + Lighthouse), validation visuelle Pascal sur iPhone réel sur les 5 pages refondues mobile.

- **Prérequis** : Aucun. Auto-promote Vercel actif (pas de rollback récent). Vérifier alias prod via `vercel inspect filmpro-crm.vercel.app` post-deploy.

- [ ] **[EXÉCUTABLE]** Activer le feature flag `ff_crm_mobile_v2` pour Pascal via SQL UPDATE Supabase (`auth.users.raw_app_meta_data`). Préalable au smoke (sinon les refontes mobile sont invisibles).
- [ ] **[EXÉCUTABLE]** Smoke F1 (Signal→prospect→relance) sur iPhone : ouvrir `/signaux` (drawer Keywords masqué), tap signal → SlideOut détail, créer prospect, retour `/prospection` (cards visibles, pas de table).
- [ ] **[EXÉCUTABLE]** Smoke F2 (fiche terrain+photo+appel) : ouvrir `/contacts` (cards visibles), tap contact, vérifier action `tel:` fonctionne sur iPhone réel.
- [ ] **[EXÉCUTABLE]** Smoke F3 (pipeline→faire avancer) : ouvrir `/pipeline` (accordéon 6 étapes au lieu du kanban), tap header étape → expand 200ms, tap opp → SlideOut détail.
- [ ] **[EXÉCUTABLE]** Spot-check pages MOBILE-OK : `/reporting` (table pipeline + export CSV masqués, bandeau « optimisé ordinateur » visible), `/` Dashboard (pas d'animation stagger), `/veille` + `/aide` (responsive existant intact).

### 2. Phase 4 QA 360 refonte mobile CRM [AUTO • xhigh • ~2h]

- **Pourquoi** : Gate 3→4 atteinte une fois Bloc 1 smoke validé. Cf. `.product-architect/prd.md § 10 Plan de test` + `acceptance-criteria.json` (24 critères bloquants Phase 4). 6 sous-tâches enchaînables en autonomie.

- **Prérequis** : Bloc 1 smoke iPhone validé OK (sinon ajustements ciblés AVANT Phase 4).

- [ ] **[BLOQUÉ - smoke OK]** audit-uiux Mode A (5 agents parallèles : composants, typo, interactions, responsive, accessibilité) sur les 5 pages refondues + 4 polish. 0 finding Critical, ≤ 2 High justifiés hors-scope.
- [ ] **[BLOQUÉ - smoke OK]** Playwright E2E 3 user flows critiques (F1/F2/F3) sur preset `iPhone 14 Pro Max`. Tests `tests/mobile-flows.spec.ts`. Inclut e2e PipelineMobileAccordion (entry cockpit `b8a43ba1` couverte ici).
- [ ] **[BLOQUÉ - smoke OK]** Playwright snapshots desktop verrouillés (0 régression). Assertions : `scrollWidth <= clientWidth` mobile + `page.locator('table').count() === 0` viewport < 1024px sur 5 pages.
- [ ] **[BLOQUÉ - smoke OK]** axe-core via `@axe-core/playwright` : 0 sérieux/critique, 100% tap targets >= 44x44 CSS px.
- [ ] **[BLOQUÉ - smoke OK]** Lighthouse CI mobile (preset mobile, Vercel preview) : >= 90 sur Perf / A11y / Best Practices / SEO, 5 pages refondues.
- [ ] **[BLOQUÉ - smoke OK]** code-review:security-auditor + bug-hunter + contracts-reviewer (subagents Opus). 0 H/C/M, 0 Critical, 0 breaking change. Artifact `~/.claude/projects/-Users-pascal--claude/memory/audit_secu_2026-05-XX_crm_mobile_v2.md` persisté.

### 3. Phase 5 livraison refonte mobile CRM [SUPERVISÉ • high • ~1h]

- **Pourquoi** : Gate 5 nécessite validation Pascal. Rollout canary→beta→GA via SQL UPDATE `auth.users.raw_app_meta_data` (feature flag JWT custom claim).

- **Prérequis** : Phase 4 verte, audit secu artifact daté.

- [ ] **[BLOQUÉ - Phase 4 verte]** Canary Pascal SQL UPDATE + smoke J+1 (flows F1+F2+F3) sur iPhone réel.
- [ ] **[BLOQUÉ - canary OK]** Beta Antoine SQL UPDATE + smoke J+2.
- [ ] **[BLOQUÉ - beta OK]** GA 3ᵉ fondateur SQL UPDATE, snapshot DB pré-livraison, CHANGELOG.md, mise à jour CLAUDE.md Livré, entry cockpit outcome (durée + succès + 1 ligne). Cleanup flag après J+7 stable GA.

→ voir pack spec complet : `CRM/.product-architect/prd.md` + `acceptance-criteria.json` + `DESIGN.md` + `feature-flag-plan.md` + `adr/*.md`. Gates signées : `.product-architect/gates-signed.jsonl` (1→2 et 2→3 OK). État Phase 3 : foundation feature flag + MobileEntityCard + 4 pages refondues (Contacts S190bis, Prospection + Entreprises S191, Pipeline S192) + polish 4 pages (S192). Entry cockpit `20c37767` reste transmitted (livrable continu, fermée après Phase 5 GA).

### Watch list S189 (post-refonte Signaux V4)

- **[WATCH] Svelte 5 — `onDestroy` s'exécute en SSR (Vercel) mais pas en `vite preview`** (incident S189) : c'est la source du 500 prod V4 initial. Toute référence à `window`/`document`/`localStorage`/`setInterval` qui doit être cleanupée DOIT passer par `$effect(() => { ...; return () => cleanup; })`, jamais par `onMount`+`onDestroy`. Vite preview ne reproduit PAS le bug (polyfill SSR différent d'adapter-vercel) — toujours tester en **preview branch Vercel** pour les composants qui touchent window. Mémoire `feedback_svelte5_ondestroy_ssr_window_undefined.md` gravée. Surveiller : autre composant qui touche window dans un `onMount`/`onDestroy` (grep `onDestroy.*window` + `onDestroy.*document` + `onDestroy.*localStorage` à la prochaine refonte UI).
- **[WATCH] Trap Vercel `rollback` → alias prod verrouillé** (incident S189) : après `vercel rollback`, l'alias prod (`filmpro-crm.vercel.app`) reste figé sur le rollback target. Les `git push` suivants buildent côté Vercel mais ne promeuvent PAS automatiquement (auto-promote suspendu). Il faut `vercel promote <new-deploy-url> --yes` explicite. Sinon Pascal teste prod en croyant voir le nouveau push et voit toujours l'ancien rollback. → Toujours vérifier via `vercel inspect filmpro-crm.vercel.app` après push post-rollback que l'alias pointe bien sur le nouveau deploy. Documenté dans la mémoire ci-dessus.
- **[WATCH] Drift latent script ↔ runtime `computeFullScore`** (audit contracts S189 Low) : `scripts/rescore_signaux_v2.mjs:65-76` ré-implémente la logique canton+source+entreprise de `scoring.ts:101-162`. Le test de parité (`keywords.test.ts:374-417`) ne couvre que `countMatches`+`normalizeNFD` via `_keywords_pure.mjs` partagé. Si `scoring.ts` ajoute un composant futur (ex: bonus secteur, retrait source), le cron tournera sur ancienne logique en silence. Fix proposé : étendre `_keywords_pure.mjs` avec `computeFullScoreCore({canton, source, ...})` partagé, OU ajouter un test de parité applicable à 5 fixtures représentatives (Cœur SIMAP, Bonus zefix, Éviter NE, etc.). Non bloquant V1.
- **[WATCH] Perf `highlightKeywordsAndSearch` non memoizée + maxlength input search** (audit security S189 Info x2) : (1) `SignauxCards.svelte:111-119` appelle `highlightKeywordsAndSearch` inline dans le `{#each}` à chaque render. Sur > 500 signaux × 40+ keywords = ~20 000 ops/render. Self-DoS local sans impact sécu. Mémoiser si dataset croît. (2) `signaux/+page.svelte:178-185` — `searchDebounced` non borné. Un paste 100 000 chars saturerait `normalizeNFD` + `indexOf` en boucle. Mono-tenant donc self-DoS uniquement. Ajouter `maxlength="200"` sur l'input search (cosmétique).
- **[WATCH] Décote temporelle `calculerBonusVeille` (`weeksSince > decayWeeks`)** non touchée par V4 (S189) : strictement parlant, c'est aussi une « temporalité dans le scoring » que Pascal voulait retirer. Mais c'est sur un CONCEPT DIFFÉRENT (bonus Veille cross-table sur `prospect_leads`, pas sur `signaux_affaires` qui s'affichent sur `/signaux`). N'apparaît PAS sur la page Signaux. À trancher Pascal si jugé dérangeant. Si oui : retirer `decayWeeks` + `weeksSince > decayWeeks` early-return dans `calculerBonusVeille` (`scoring.ts:73-100`) + retirer `weeksSince` du type `IntelligenceSignalInput` (+ callers).
- **[WATCH] M1 contracts : `HighlightChunkV2` union discriminé** (audit contracts S188 Medium #1) : le type `{ text; cat: KeywordCategorie | null; search: boolean }` autorise `{ search: true, cat: 'coeur' }` même si l'invariant runtime stipule « search prime → cat=null ». Le consumer `SignauxCards.svelte:99` enchaîne `if (chunk.search) … else if (chunk.cat)`, ce qui marche en pratique mais TS ne refuse pas un futur appelant qui produirait un chunk hybride. Refactor proposé : union discriminée `{ kind: 'plain' } | { kind: 'keyword'; cat: KeywordCategorie } | { kind: 'search' }`. Coût ~6 lignes consumer + tests. Non bloquant V1.

### Watch list S188 / S186 — détails archivés

→ Watch lists S188 (5 entrées : asymétrie regex/substring search, gap e2e Playwright /signaux, 4 Info security S187, 3 gaps test coverage S187, 4 Low contracts S187) et S186 (4 entrées : brand type `FeedbackEntry.context`, parse sans try/catch, rate limiter commun 5 endpoints, rows pré-fix casse mixte) détaillées dans `archive/2026-05-25-sessions.md` § Watch list S188/S186.

### Watch list S178 (post-V2c + post-V1) — archivées S187

→ Détail des [WATCH] V2c/V1 (rate limit /entreprises, TOCTOU Zefix, AbortSignal, cancelled flag, RLS multi-tenant, Tabs DOM untested, etc.) : `archive/2026-05-13-sessions.md` § « Watch list S178 ».

Seul [WATCH] toujours actif au global :
- **Durcissement RLS si 4e user non-fondateur** : tant que FilmPro = 3 fondateurs symétriques, RLS « tous voient/suppriment tout » assumée. Le jour où un 4e utilisateur non-fondateur est ajouté → ouvrir tâche `[EXÉCUTABLE]` policies `created_by = auth.uid()` + tests d'intégration RLS. → voir `memory/feedback_rls_multitenant_durcissement_si_4_users.md`.


<!-- BEGIN CONSOLIDATION (auto-géré par cockpit, ne pas éditer) -->

### Consolidation cockpit (état S192 2026-05-25)

**Blocs actionnables côté cockpit** : Bloc #1 (Pipeline mobile) + Bloc #2 (polish) fermés ce tour. Reste 1 entry `transmitted` du Bloc #1 cockpit (`b8a43ba1` e2e Playwright PipelineMobileAccordion → couverte par Phase 4 QA dans CLAUDE.md Bloc 2). 1 entry nouvelle créée par pivot (`2ffecd20` Playwright E2E 3 user flows, alimente Phase 4 QA). 1 entry continue (`20c37767`, fermée après Phase 5 GA).

**Blocs bloqués** : B1 (Phase 4 QA, 6 entries) + B2 (Rollout canary/beta, 2 entries) + GA hors-bloc. 2 dead_ids résiduels dans `blocks-crm.json` collection `blocs_bloques` (anciens `1397967b` + `818c7bd9` du B2 Rollout, renommés cette session) — non bloquant, à nettoyer manuellement via cockpit UI.

**Skip consolidation LLM S192** : `/api/consolidate/start/appfactory?subproject=crm` a échoué (exit_code=1 sans stderr) après 3min32 de run, pattern WATCH Hygiène v2 connu (Opus 4.7 timeout silencieux sur prompts ≥ 30 KB, cf. `memory/feedback_hygiene_llm_execution_robustness_2026-05-21.md`). Skip noté pour cette clôture, à relancer prochaine session si nécessaire. Pivot + sync livraisons réussis (étapes amont OK).

<!-- END CONSOLIDATION -->


### Watch list S171 — archivée S187

→ Détail des [WATCH] S171/S169 (quota search.ch, `prospect_leads.description` LLM future, `entry.sourceUrl` href client, race `addItem` veille, injection prompt LLM thème) : `archive/2026-05-13-sessions.md` § « Watch list S171 ».

### Livré cette session (récents + archives)

→ Sessions antérieures : `archive/2026-05-25-sessions.md` (S187-S191 détaillé + watch lists archivées) · `archive/2026-05-13-sessions.md` (S180 cascade V3b closure + S181 Google Places) · `archive/2026-05-10-sessions.md` (S178 cascade audit 360 + V3a-1) · `archive/2026-05-09-sessions.md` (S174 Voie B + S177 dashboard coûts) · `archive/2026-05-08-sessions.md` (S171-S173 + S176bis cascade)

- [x] ~~S192 - Refonte mobile CRM Blocs cockpit #1 + #2 (Pipeline accordéon + polish Reporting/Dashboard/Signaux)~~ - Fait 2026-05-25 (high, ~2h ; Score 2/4 helpers TDD + 4/4 enchaînement). **Trigger** : 5 entries cockpit (Bloc #1 cockpit Pipeline 3 tâches + Bloc #2 cockpit Polish 2 tâches + Bloc #3 cockpit Tests helpers). Réordonnancement pré-attaque validé par Pascal (TDD-first : tâche 6 helpers AVANT tâche 1 composant, e2e Playwright tâche 2 reportée Phase 4 QA). **Périmètre livré** : (a) `src/lib/components/pipeline/pipeline-mobile-accordion.helpers.ts` (.ts purs, 7 fonctions exportées — `createCollapsedState`, `toggleStageExpansion`, `isStageExpanded`, `expandAllStages`, `buildAccordionStages`, `formatStageCount`, `formatStageMontantTotal` — réutilise `formatMontantCompact` `fr-CH` apostrophe). (b) `pipeline-mobile-accordion.helpers.test.ts` 22 tests Vitest TDD red-green strict (createCollapsedState, toggleStageExpansion immutable, isStageExpanded, expandAllStages, buildAccordionStages distribution opps+ordre+bucket défaut+count+sum+label+icon, formatStageCount pluriel, formatStageMontantTotal CHF). (c) `PipelineMobileAccordion.svelte` : 6 étapes header tappable min-h 56px, animation transform scaleY 200ms ease-out-expo, aria-expanded/controls, Enter/Space toggle, état vide « Aucune opportunité dans cette étape », prefers-reduced-motion, opp tap-to-detail via callback. (d) `pipeline/+page.svelte` : import + state `isMobileViewport` via `$effect` matchMedia SSR-safe + derived `useMobileAccordion = isMobileViewport && featureFlags.ffCrmMobileV2` + `accordionStages` via `buildAccordionStages`, switch `{#if useMobileAccordion}accordéon{:else}kanban{/if}`. (e) `reporting/+page.svelte` : `ReportingPipelineTable` + section Export CSV wrappés `.desktop-only` (CSS scoped, sans `:global` ni `!important`), bandeau `.mobile-only-banner` explicatif. (f) `(app)/+page.svelte` : animation `stagger` désactivée `@media (max-width: 1023.98px)` (perf mobile). (g) `signaux/+page.svelte` : drawer Keywords trigger `.desktop-only-inline` (expert-only mobile). **Doctrine** : pattern Option B respectée (`.svelte=e2e` projet, e2e Playwright reporté Phase 4 QA). Pattern `$effect` matchMedia jamais `onDestroy+window` (incident SSR V4 S189). **Audit qualité pré-commit** : 0 `!important` / 0 `any` / 0 TODO/FIXME/HACK / 0 `onDestroy+window` / 0 `console.log` / 0 code mort (`onMobileOppTap` fantôme évité) / `:global(.desktop-only)` retiré (markup direct → scope Svelte auto). Tap targets ≥ 44px (56 header + 48 opp). **Validation** : `npm run check` 0 erreur (28 warnings baseline inchangé), `npm test` 1393/1393 verts (+22 vs baseline 1371, 0 régression), `npm run build` 14s adapter-vercel OK. **Cockpit** : 5 entries delivered via deliver.py mid-session, Blocs #2 et #3 cockpit auto-fermés (`block_marked_delivered: true`), Bloc #1 cockpit reste 1 entry transmitted (`b8a43ba1` e2e Playwright reportée Phase 4 QA). **Commits pushed** : `bd0b930 docs(crm): nettoyer CLAUDE.md - archiver détails S187-S191 (-43%, 53k → 30k chars)` (2 fichiers, +98/-18) + `4aef918 feat(crm): refonte mobile Blocs #1+#2 - Pipeline accordéon + polish Reporting/Dashboard/Signaux` (7 fichiers, +597/-23). **Restant pour Gate 3→4** : smoke iPhone réel Pascal sur preview Vercel (5 user flows). **Tracking git** : `CRM/src/lib/components/pipeline/PipelineMobileAccordion.svelte` (nouveau) + `pipeline-mobile-accordion.helpers.ts` (nouveau) + `pipeline-mobile-accordion.helpers.test.ts` (nouveau) + `CRM/src/routes/(app)/pipeline/+page.svelte` (modifié) + `CRM/src/routes/(app)/reporting/+page.svelte` (modifié) + `CRM/src/routes/(app)/+page.svelte` (modifié) + `CRM/src/routes/(app)/signaux/+page.svelte` (modifié) + `CRM/CLAUDE.md` (nettoyé + Prochaine session ré-écrite) + `CRM/archive/2026-05-25-sessions.md` (nouveau, archive S187-S191).
- [x] ~~S191 - Refonte mobile CRM Bloc #1 cockpit (helpers MobileEntityCard testés + Cards Prospection + Cards Entreprises)~~ - Fait 2026-05-25 (high, ~1h ; Score 2/4). Helpers `.ts` purs + 25 tests Vitest TDD (arbitrage Option B preserving-productive-tensions : doctrine projet `.svelte=e2e` respectée). Cards Prospection (5 helpers `leadCard*` + wrapper `.prospection-shell[data-mobile-enabled]`). Cards Entreprises (matchMedia + derived `forceMobileCards`/`effectiveView` + toggle masqué via `$effect` cleanup SSR-safe). Tests 1371/1371 verts (+25), `npm run check` 0 erreur. Commit prod `09703bb` (9 fichiers, +781 lignes, foundation S190bis incluse). → détail intégral `archive/2026-05-25-sessions.md`.
- [x] ~~S190bis - Refonte mobile CRM Phases 1+2 product-architect + Phase 3 partielle~~ - Fait 2026-05-24 (xhigh, ~3h ; Score 4/4). Phase 1 cadrage (8 questions + audit factuel 10 pages CRM via agent Explore). Phase 2 specs : pack `.product-architect/` (11 fichiers : prd.md + acceptance-criteria.json 27 critères + DESIGN.md + slo-sli.md + feature-flag-plan.md + 5 ADRs). Phase 3 partielle : `feature-flags.ts` + `app.d.ts` + `+layout.server.ts` + `MobileEntityCard.svelte` (350+ lignes) + `contacts/+page.svelte`. 1346/1346 tests verts. Pas de commit prod. Gates 1→2 et 2→3 signées. → détail intégral `archive/2026-05-25-sessions.md`.
- [x] ~~S190 - Vérification crons signaux prod + relance manuelle veille W20~~ - Fait 2026-05-18 (low, ~0,2h). Zefix `creation_entreprise` 417/7j (cible CLAUDE.md sous-estimée), SIMAP v2/v3 actif (11/41 matchés Cœur/Bonus/Éviter sur 7j), 0 erreur Vercel. Veille W20 relancée via `gh workflow run cron-veille.yml` après skip vendredi 15/05 (crédit API insuffisant) → édition publiée. → détail `archive/2026-05-25-sessions.md`.
- [x] ~~S189 - Refonte Signaux V4 (scoring sans temporalité + drawer mots-clés + UI premium) + fix SSR `onDestroy → $effect`~~ - Fait 2026-05-13 (xhigh, ~3h30 ; Score 4/4). Bloc Récence retiré de `scoring.ts`, `maxPoints` 12→10. Tab Tous retiré, défaut Nouveau. Drawer 440px slide-in droit. Toggle hors-scope visible. ScorePill gradient saturé + bandeau dominante 3px par card + cards line-clamp 4. **Bug SSR 500 prod identifié + fixé** : `onDestroy(() => window.removeEventListener(...))` plante en SSR Svelte 5 (`ReferenceError: window`). Fix : `$effect(() => { ...; return cleanup })`. Vite preview ne reproduit pas. Mémoire `feedback_svelte5_ondestroy_ssr_window_undefined.md`. 117 signaux rescorés. 11/12 critères smoke prod verts. Commits `e02bd88` + `a6c5440`. → détail intégral `archive/2026-05-25-sessions.md`.
- [x] ~~S188 - Refonte Signaux V3 + Smokes prod + Fix UX collapse /log~~ - Fait 2026-05-13 (xhigh, ~5h ; Score 4/4). Surlignage typo éditorial (Cœur underline 2px / Bonus primary 500 / Éviter line-through). Recherche client debounce 200ms + persistance localStorage. Seed Cœur étendu (15 termes idempotents). Pluriel FR toléré (`s?`) via `_keywords_pure.mjs` partagé. Rescore prod : 15 SIMAP modifiés dont 1 atteint Cœur. Audits Opus 3× verts. 1332/1332 tests verts. 12/12 critères smoke verts. Mémoire `feedback_autonomie_findings_in_session_fix_pas_idea_cockpit.md`. Commits `cc13e36` + `1683eb0` + `c3dd58e`. → détail intégral `archive/2026-05-25-sessions.md`.
- [x] ~~S187 - Refonte page Signaux V2 (panneau mots-clés, scoring v2 BDD, 39 mots seed, 117 SIMAP rescorés) + cron Zefix~~ : détail dans `archive/2026-05-13-sessions.md`
- [x] Détail livraisons S182-S186bis (refonte Aide + page Log + cleanup + fix cron Zefix) : `archive/2026-05-13-sessions.md`

