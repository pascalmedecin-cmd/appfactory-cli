# CRM FilmPro : CLAUDE.md

**Note migration restructure** : ce fichier vit dans `CRM/CLAUDE.md`. Le sous-projet CRM FilmPro est dans `AppFactory/CRM/` (path Vercel `rootDirectory: CRM`). Voie A livrée S173 2026-05-06 (split container CLAUDE.md). Voie B livrée S174 2026-05-07 (rename `template/` → `CRM/` + retrait wizard méta + repointage Vercel). Le `AppFactory/CLAUDE.md` racine est un stub container minimal qui pointe vers les 3 sous-projets (CRM, Consulting, Formation). Voir `~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/project_appfactory_restructure.md` pour le contexte migration complet.

**Statut :** Phase C. **REFONTE PAGE SIGNAUX V3 LIVRÉE + SMOKES PROD + FIX UX LOG** (S188, 2026-05-13) : surlignage option A « underline typo éditorial » (Cœur font 700 + underline 2px vert offset 3px ; Bonus color primary 500 seul ; Éviter line-through subtil opacité 55% ; zéro fond saturé), input search client + debounce 200ms + highlight jaune `#FEF9C3` + localStorage `signaux.search` + clear btn, seed Cœur étendu (15 termes : verrière, double vitrage, survitrage, paroi vitrée, protection solaire, pare-soleil, brise-soleil, film solaire, film thermique, film de protection, vitrage isolant, vitrage feuilleté, vitrage de sécurité, film opacifiant, triple vitrage), pluriel FR toléré dans `makeWordRegex` (suffix `s?`). 117 SIMAP rescorés v3 : 15 modifiés dont **1 atteint Cœur** (YPERIA OIKEN Vitrages, score 4→9 top tri Pertinence). Spec 12/12 critères verts, audits Opus 0 C/H/M/L, OWASP 11/11, 1332 Vitest, commit `c3dd58e` pushed. **Smokes prod Bloc #1** : login admin/Antoine, expiration session 7j, fix UX collapse `/log` admin (row se ferme après « Enregistrer la note », pas après statut), commits `cc13e36`+`1683eb0`. **Antérieur** : Refonte Signaux V2 + cron Zefix S187, Page Log CRM S185+S186, refonte page Aide S182+S183, cascade audit 360 fermée S178→S180 (136 findings, 134 fixés), API Google Places S181, cascade golden v9 6/6 (S175-S176ter), migration restructure Voie A+B (S173-S174). Formation IA = sous-projet autonome dans `Formation/`, `cc` option 5.
**Derniere mise a jour :** 2026-05-13 (S188 : Refonte Signaux V3 + smokes prod Bloc #1 + fix UX collapse Log)
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** S188 livrée (xhigh, ~5h). Détails dans § Livré ci-dessous.
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

**Prochaine attaque** : Bloc 2 - Audit mobile CRM transverse (~3h xhigh) - Bloc 1 est date-locked au 14/05 matin (vérif cron signaux ~5 min, sera la 1re action du jour suivant), le 2 est la vraie session de fond. Skill `audit-uiux` + golden v9 ; objectif réduire les pages CRM à l'essentiel sur breakpoint < 1024px.

### 1. Vérifier crons signaux prod le 14/05 [SUPERVISÉ • low • 5 min • date-locked 14/05]

- **Pourquoi** : 2 changements crons poussés S187 qui s'exécutent à 6h UTC le lendemain. (1) Cron Zefix passé de `/company/search` (saturait HTTP 400) à `/sogc/bydate/{date}` (test local 350 créations Romandie/7j, cible 40-80 importées en prod, commit `8a534f2`). (2) Cron SIMAP utilise désormais scoring v2 BDD (Cœur/Bonus/Éviter) + retrait filtre dur à l'import (commit `0e0ba4b`). Note S188 : seed Cœur étendu à 30 termes + pluriel FR `s?` toléré dans `makeWordRegex`, le cron prendra automatiquement la nouvelle règle via `calculerScore`.

- [ ] **[EXÉCUTABLE]** Le 14/05 après 7h CH : ouvrir `/signaux`, vérifier (a) **entrées `creation_entreprise` source `zefix`** (impossible avant S187 ; cible 40-80 sur 7j), (b) **SIMAP scorées via mots-clés v2/v3** (`notes_libres` montre `Bonus rénovation×N (+2)` / `Coeur vitrage×1 (+5)` / `Éviter route (-3)` ; le `s?` permet matche pluriel), (c) **0 erreur Vercel logs** sur `/api/cron/signaux`. Si KO → `vercel logs` filter `cron/signaux` + entry cockpit avec payload exact.

→ voir entry cockpit `f983a9eb` (transmitted ; remplace `d63c416f` purgé S188 après réécriture du texte du bloc, raw_key déterministe).

### 2. Audit mobile CRM - réduire à l'essentiel [SUPERVISÉ • xhigh • ~3h]

- **Pourquoi** : objectif explicite Pascal S185 lors du cadrage page Log : « Audit mobile CRM - réduire fonctionnalités à l'essentiel ». La livraison page Log a été desktop-only via media query `< 1024px` pour ne pas polluer mobile, mais le reste du CRM n'a pas encore subi cette discipline. **Renforcé S188** : 2 smokes mobile du Bloc #1 ont été reportés explicitement dans cet audit (gating mobile Log Chrome DevTools breakpoint < 1024 px + nav burger mobile ferme auto après tap lien — résidu S183 polish). Entry cockpit `d068a79d` transmitted, summary enrichi des 2 checks reportés.

- [ ] **[EXÉCUTABLE]** Audit transverse mobile toutes pages CRM (dashboard, prospection, contacts, entreprises, signaux, pipeline, veille, aide, log) + cockpit, arbitrage par page : (a) quelles fonctions garder, (b) quelles fonctions masquer ou simplifier, (c) breakpoint < 1024px appliqué via media query `.desktop-only-nav` ou prop `desktopOnly:true` dans `config.navigation`. Inclure : (d) re-validation Chrome DevTools Device Toolbar (preset iPhone 14 Pro Max) sur `/log` : FAB absent, entrée sidebar Log absente, page /log rend uniquement encart desktop_windows ; (e) smoke burger mobile : tap un lien ferme le menu. Skill `audit-uiux` + golden v9.

→ voir entry cockpit `20c37767` (transmitted ; remplace `d068a79d` purgé S188 après réécriture du texte du bloc, raw_key déterministe ; summary enrichi S188 avec 2 checks mobile reportés du Bloc #1).

### Watch list S188 (post-refonte Signaux V3)

- **[WATCH] M1 contracts : `HighlightChunkV2` union discriminé** (audit contracts S188 Medium #1) : le type `{ text; cat: KeywordCategorie | null; search: boolean }` autorise `{ search: true, cat: 'coeur' }` même si l'invariant runtime stipule « search prime → cat=null ». Le consumer `SignauxCards.svelte:99` enchaîne `if (chunk.search) … else if (chunk.cat)`, ce qui marche en pratique mais TS ne refuse pas un futur appelant qui produirait un chunk hybride. Refactor proposé : union discriminée `{ kind: 'plain' } | { kind: 'keyword'; cat: KeywordCategorie } | { kind: 'search' }`. Coût ~6 lignes consumer + tests. Non bloquant V1.
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

- [x] ~~S188 - Refonte Signaux V3 + Smokes prod Bloc #1 + Fix UX collapse /log~~ - Fait 2026-05-13 (xhigh, ~5h ; Score effort 4/4). **Bloc #1 Smokes prod** (livré entièrement, 5/5 entries traitées) : (a) smoke admin Log Pascal (FAB + create + statut + export JSON compliant + admin notes), 1 finding UX collapse fixé in-session (no-debt rule, Pascal a corrigé l'idée cockpit que j'avais ouvert) → `FeedbackTable.svelte:177` row se ferme uniquement après « Enregistrer la note » success (pas après statut, sinon admin doit re-cliquer pour saisir note), commits `cc13e36` puis `1683eb0` ; (b) login antoine OTP → /log lecture seule (0 boutons statut/export/notes) ; (c) login + expiration session 7j vérifiée prod via DevTools cookie login_at = 1000000000000 → redirect /login?error=expired, message Session expirée. Confirmé OTP-only via `src/routes/login/+page.server.ts:22`, pas de password. Mécanique testée `hooks.server.test.ts:139`. Row fictive smoke S185 (`04f25276`) supprimée via supabase service_role. (d) 2 smokes mobile reportés vers Bloc #4 audit mobile (`37224d74` + `726d18c4` supprimées du cockpit, summary `d068a79d` enrichi avec les 2 checks). **Bloc #3 Refonte Signaux V3** (livré entièrement, 4/4 entries) cadrage→spec→exec→parapluie : (1) **Surlignage option A « underline typo éditorial »** validé Pascal via mockup HTML `notes/refonte-signaux-v3-2026-05-13/mockup-surlignage.html` : Cœur `font-weight 700 + underline 2px var(--color-success) + offset 3px + 0 fond`, Bonus `color primary + 500 + 0 fond + 0 underline`, Éviter `color danger + line-through 1px opacity 55% + 0 fond` (CSS `SignauxCards.svelte:251-273`). (2) **Recherche client** : input search au-dessus toolbar + icône loupe + bouton clear, debounce 200ms via `$effect` Svelte 5 (cleanup auto), filtre client case+accent insensitive sur `description_projet + maitre_ouvrage + commune`, persistance `localStorage.signaux.search` restaurée au mount, highlight jaune `#FEF9C3` des matches (painter char-par-char dans `highlightKeywordsAndSearch`, search override cat=null). (3) **Seed Cœur étendu** : nouveau script `scripts/seed_keywords_extend_coeur.mjs` idempotent (`ON CONFLICT (terme_norm) DO NOTHING`), 15 termes ajoutés en prod (verrière, double vitrage, triple vitrage, survitrage, paroi vitrée, protection solaire, pare-soleil, brise-soleil, film solaire, film thermique, film de protection, vitrage isolant, vitrage feuilleté, vitrage de sécurité, film opacifiant). (4) **Pluriel FR toléré** dans `makeWordRegex` (suffix `s?` optionnel sauf si terme finit déjà en `s`) — décision in-flight après diagnostic factuel « 0 SIMAP Cœur sur 117 actifs même avec 30 termes » : le mot prod « Vitrages » (pluriel) ne matchait pas `\bvitrage\b` strict. Aligné aussi dans `scripts/rescore_signaux_v2.mjs` via nouveau module partagé `scripts/_keywords_pure.mjs` (refactor M2 audit contracts). (5) **Rescore prod** via `rescore_signaux_v2.mjs --apply` : **15 SIMAP modifiés** dont **1 atteint Cœur** (YPERIA OIKEN Vitrages, score 4→9, top tri Pertinence), pluriels architectes/ingénieurs/fenêtres/routes détectés correctement. **Audits Opus 3 parallèles xhigh** : **Security** 0 C/H/M/L + 3 Info non-bloquants (perf > 500 cards, ligature ß edge, parsing .env naïf), OWASP 11/11. **Contracts** 0 C/H + 2 Medium (M1 union discriminé HighlightChunkV2 watchlist, M2 drift script ↔ runtime fixé in-session via `_keywords_pure.mjs` partagé + 9 tests parité) + 3 Low (L1 POIDS_COEUR constante fixée). **Test coverage** 0 C/H + 3 Medium gap e2e (watchlist). **Tests** : +26 Vitest (11 highlightKeywordsAndSearch V3 + 6 pluriel + 9 parité), suite 1332/1332 verts, svelte-check 0 err, build 16s. **Smoke prod Chrome MCP** sur https://filmpro-crm.vercel.app/signaux : 12/12 critères C1-C12 verts. Vitrages détecté pluriel (`text: "Vitrages"`), styles Cœur/Bonus/Éviter conformes spec, input search filtre 131→52 cards avec 76 marks jaunes `#FEF9C3`, localStorage `signaux.search`, clear btn → restaure tout, top Pertinence = SIMAP Cœur Vitrages score 9. Commit `c3dd58e` pushed. **Mémoire gravée** : `feedback_autonomie_findings_in_session_fix_pas_idea_cockpit.md` (no-debt rule : un finding ≤ 30 min trouvé en cours de smoke se fixe in-session, pas en entry idée — correction Pascal sur UX collapse). **Spec figée** : `notes/refonte-signaux-v3-2026-05-13/spec.md` (12 critères binaires, 5 lots, hors-scope explicite : pas d'éditeur de poids par mot-clé, pas de migration BDD, pas de search côté serveur). 3 commits prod pushed : `cc13e36`+`1683eb0` (collapse Log) + `c3dd58e` (refonte V3). **Tracking git** : `src/lib/scoring/keywords.ts` + `keywords.test.ts` + `src/lib/components/signaux/SignauxCards.svelte` + `src/routes/(app)/signaux/+page.svelte` + `src/lib/components/FeedbackTable.svelte` + `scripts/_keywords_pure.mjs` (nouveau) + `scripts/seed_keywords_extend_coeur.mjs` (nouveau) + `scripts/rescore_signaux_v2.mjs` + `notes/refonte-signaux-v3-2026-05-13/`.
- [x] ~~S187 - Refonte page Signaux V2 (panneau mots-clés, scoring v2 BDD, 39 mots seed, 117 SIMAP rescorés) + cron Zefix~~ : détail dans `archive/2026-05-13-sessions.md`
- [x] Détail livraisons S182-S186bis (refonte Aide + page Log + cleanup + fix cron Zefix) : `archive/2026-05-13-sessions.md`

