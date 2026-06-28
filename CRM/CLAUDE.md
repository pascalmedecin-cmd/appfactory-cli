# CRM FilmPro : CLAUDE.md

**Note migration** : ce fichier vit dans `CRM/CLAUDE.md` (path Vercel `rootDirectory: CRM`) ; container racine = stub. Contexte → `memory/project_appfactory_restructure.md`.

**Statut :** Portail FilmPro multi-outils en prod : CRM (`/crm`) + Découpe Films (`/decoupe`) sur `filmpro-portail.vercel.app`. Formation IA = projet autonome `Formation/` (`cc` option 5). Historique (V3 terrain, Signaux V4, golden v9, restructure S173-S174) → `archive/`.
**Dernière mise à jour :** 2026-06-26. Trunk unique = `main` (reconciliation `1065fb1`, branche supprimée ; Dependabot trié, 0 PR ouverte). Flag `ffCrmListesV2` **ON `pascal@`+`antoine@`** → refonte Vagues 1+2+3 live. Prod = `filmpro-portail.vercel.app` : **push `main` auto-déploie en production** (vérifié live 26/06 ; détail → WATCH Vercel). Livraisons → § « Livré cette session ». **Prochain bug :** #001.
**Session courante :** 2026-06-28 - **Bloc A refonte serveur Entreprises LIVRÉ PROD** (`4b3974e`, push direct validé Pascal, smoke 303 OK). Page `/crm/entreprises` 100 % serveur (filtre/pagination/tri/recherche URL ; counts+KPI séparés exacts). Revue 5 relecteurs 0 H/C, 3 MEDIUM corrigés. 2315 verts. **À FAIRE Pascal** : valider visuellement Entreprises (onglets/recherche/pagination/cartes) + checklist Daily Email (smoke OTP + `EMAIL_DAILY_ENABLED=true`). Détail → § Livré + [[project_bloc_a_refonte_serveur_entreprises_2026-06-28]].
**Sessions précédentes (condensé)** - détails dans `archive/` (S165-S175, S122-S125, S70-S107).


---

## SOUS-PROJETS

Depuis la restructuration `~/Claude/Projets` (2026-06-01), ce repo héberge le **CRM FilmPro** (app principale). Formation (ex sous-projet) est désormais top-level (`~/Claude/Projets/Formation`) ; Consulting est sous LED Studio. Mapping complet : `~/.claude/CLAUDE.md`.

| Dossier | Repo Git | Statut | URL prod |
|---------|----------|--------|----------|
| `CRM/` | `pascalmedecin-cmd/appfactory-cli` (=racine) | Production | <https://filmpro-portail.vercel.app> (ex `filmpro-crm` → 308) |

**`/start` ici = scope CRM FilmPro** (slug=`filmpro`, subproject=`crm` ; ex-`appfactory`, migré 2026-06-01). Source : `~/.claude/cockpit/projets/filmpro/entries.jsonl` filtré par subproject.

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

- Repo `appfactory-cli` (ancien `appfactory` reste consultable)
- Design code-first : composants custom + kits Figma Community gratuits (Figma Pro abandonné, deep research 2026-04-04). Validation client = prototypes Vercel preview.
- CSS scoped obligatoire pour le layout structurel (sidebar, header, nav) : Tailwind responsive (md:hidden/md:block) ne marche pas en Tailwind v4 pour ce cas.

### Decisions UX + Prospection (G36)

→ Archive intégrale : `archive/decisions-structurelles-crm.md` (6 écrans principaux, slide-out panels, saisie rapide, 100% sources gratuites, modèle unifié `prospect_leads`, scoring auto 0-13). Specs prospection complètes : `docs/SPECS_PROSPECTION.md`.

### Doctrine styling : Tailwind utilities + CSS scoped

→ Règle tranchée S180 (audit 360 V3b I-04) : Tailwind utilities pour le détail réutilisable (spacing/couleurs via tokens/typo/états/responsive trivial côté contenu, jamais off-grid `p-[13px]`), `<style>` scoped Svelte pour le layout structurel (sidebar/header/kanban) + keyframes/transitions (token `--ease-out-expo`) + pseudo-éléments + `:global()` ciblés ; jamais de CSS global ad hoc hors `app.css` / `!important` / classe dupliquant un token ; primitives (`Button`/`Input`/`Card`/`Modal`/`DataTable`/`Tabs`) = source unique, on compose. Détail : `memory/feedback_crm_styling_doctrine.md`.


### Sécurité - décisions assumées (audit 360 V3b L-02, L-03)

- **CSP `unsafe-inline` (L-02)** : la `Content-Security-Policy` posée dans `hooks.server.ts` autorise `'unsafe-inline'` sur `script-src` et `style-src`. C'est un **prérequis de l'hydratation SvelteKit** (scripts inline + styles scoped injectés au runtime) ; le retirer imposerait un système de nonce/hash dynamique = refactor framework. Risque résiduel XSS jugé **acceptable** : CRM mono-tenant ≤ 10 admins `@filmpro.ch` (OTP), aucun contenu utilisateur tiers rendu en HTML brut, toutes les sorties dynamiques échappées (`esc()` / `escapeHtml`). À revisiter si SvelteKit expose une option nonce-based simple, ou si une surface UGC apparaît.
- **RLS « mono-tenant plat » (L-03 / L-04)** : ~11 tables ont une policy `FOR ALL TO authenticated USING (true)` - tout utilisateur authentifié voit/modifie/supprime tout (photos, visites, leads, opportunités, veille…). C'est une **décision design assumée** (S127 Q2 Pascal : 3 fondateurs FilmPro symétriques). Les endpoints DELETE photos/visits loggent quand un fondateur agit sur la donnée d'un autre (traçabilité), sans bloquer. **À DURCIR avant l'ajout d'un 4e utilisateur non-fondateur** : passer à des policies `created_by = auth.uid()` (ou rôle admin) + tests d'intégration RLS contre une vraie DB avec une session non-admin. Voir mémoire `feedback_rls_multitenant_durcissement_si_4_users.md` + § RISQUES OUVERTS (M-48, RLS non couverte par les tests Vitest).

---

## INFRA EN PLACE

- **Prod** : https://filmpro-portail.vercel.app (Vercel : **git integration auto-déploie `main` en prod à chaque push**, vérifié live 26/06 ; `vercel deploy --prod` reste dispo en manuel) ; ancienne `filmpro-crm.vercel.app` conservée et redirigée 308 → nouvelle (hook). Supabase EU (projet `appfactory`, 10+ tables, RLS active, service role key configurée)
- **Auth** : OTP email 6 chiffres @filmpro.ch + session 7 jours httpOnly ; SMTP Resend (domaine verifié, free plan)
- **APIs** : Zefix REST + search.ch + fal.ai Flux 1.1 Pro Ultra (partage clé avec Enseignement) - Pexels/Unsplash supprimés S67
- **Crons** : `/api/cron/{signaux,alertes,nettoyage-crm,intelligence,intelligence-archive}` tous sécurisés `CRON_SECRET` + service role (Cron `media-enrich` supprimé S67)
- **Tests** : Vitest 2324 (dernier run vérifié 2026-06-26, avec supabase 2.108 + TS6 ; +2 garde icon-map) + Playwright e2e (suite + P1/P2/P3 Prospection). Accessibilité : focus trap + ConfirmModal partout, axe-core 0 violation modale P3. Sécurité : Zod sur 20 form actions/endpoints, rate limiting 10/min, headers CSP/XFO/referrer, timing-safe secrets

→ Détail intégral (env vars, BDD exhaustive, liste tests, liste crons, headers sécurité, pagination serveur) : `archive/infra-crm-detail.md`

## DOCUMENTATION

- `docs/SPECS_PROSPECTION.md` : specs module prospection (sources, scoring, UI, dedup).

→ Inventaire composants EN PLACE → `archive/inventaire-composants.md` (consulter avant d'en créer de nouveaux).

### Historique condensé (archives)

- Détail S1-16 (UX 6 écrans, auth OTP+MFA, PWA, prospection), S70-79 (formation-ia ingestion), S122-125 (V1 mobile clos), audit CRM 2026-04-04 → `archive/decisions-sessions-*.md` + `archive/2026-04-28-sessions.md` + `archive/audit-crm-2026-04-04.md`.

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

- **RLS Supabase non couverte par les tests Vitest (audit 360 M-48, gravé S178 V3a-2)** : Vitest mocke `@supabase/supabase-js` → **aucun test unitaire ne prouve le comportement RLS réel** (~25 vecteurs d'autorisation « verts » sans garantie). Mono-tenant ≤ 10 admins @filmpro.ch, suite d'intégration non prévue V1. **Avant de construire par-dessus un contrôle d'autorisation : lire le code + vérifier manuellement en prod/staging avec un compte au rôle cible** (incident réf : 2026-04-18 formation-ia, 3 users bloqués prod avec 7 tests verts). Détail : `rules/quality.md` § RLS + `feedback_rls_mocks_insufficient_S99.md` + `feedback_rls_auth_lookup_needs_service_role.md`.

## REGLES TECHNIQUES PROJET

→ Tests mobile/responsive : Chrome DevTools Device Toolbar manuel (Pascal) **obligatoire** ; Playwright `viewport:{width,height}` seul et MCP `resize_window` **interdits** comme substituts (Playwright preset `devices['iPhone 14 Pro Max']` OK pour findings OBJECTIFS uniquement - réf `CRM/tests/mobile.spec.ts`). Règle complète : `memory/feedback_crm_mobile_testing_devtools.md`.


## Prochaine session

**Prochaine attaque** : **Bloc B migration socle SvelteKit** (EXÉCUTABLE, NON TRIVIAL, ~1 session worktree, peer-deps) - **Bloc A Entreprises LIVRÉ prod 28/06** (`4b3974e`). Refonte CRM 1+2+3 live, **Bloc D CLOS** (`cd5426e`). 5 tâches restantes → 3 blocs + checklist ci-dessous. **Prod = `main` auto-déployée** → push **après validation** (pattern Bloc D : preview → validation → push). → [[project_refonte_crm_cadrage_2026-06-18]] + [[project_bloc_d_audit_360_PROGRESS]].

> **État vérifié 2026-06-28** : Bloc A livré prod (`4b3974e`). Reste 5 tâches (B socle EXÉCUTABLE, C dashboard BLOQUÉ W27, D Vague 4 BLOQUÉ + 2 gestes Pascal checklist). Baseline saine : **2315 tests verts**, build OK, knip 3 justifiés. **1 bloc = 1 session.** Golden cadrage refonte → [[project_refonte_crm_cadrage_2026-06-18]] + `CRM/.product-architect/refonte-vague3/golden-vague3-v1.html`.

#### Blocs codables en autonomie

##### B. Migration socle SvelteKit [EXÉCUTABLE • NON TRIVIAL • ~1 session worktree]

- [ ] **[EXÉCUTABLE]** **Raison de blocage CORRIGÉE 2026-06-28** : l'ancienne (« amont rolldown/layerchart #928/#1313 ouvertes ») est **FAUSSE** - ces 2 issues sont dans `sveltejs/vite-plugin-svelte`, **fermées**, fix présent dans vps 7. **Vrai blocage** = conflit `ERESOLVE` peer-deps quand on monte `vite@8`+`vps@7` sur l'arbre actuel (vitest/kit acceptent déjà vite 8 ; `@tailwindcss/vite` aussi). Il faut monter le socle **complet et cohérent**, pas le seul trio. Test worktree 2026-06-28 = bump trio échoue dès l'install npm.
- À faire en worktree isolé : monter vite 8 + vps 7 + kit latest (+ deps vite-consommatrices) **ensemble**, résoudre la chaîne de peers, `check`+`test`+`build` verts, lever les `ignore` socle `dependabot.yml`, **jamais `rm package-lock.json`**. → [[project_fix_deps_ci_vercel_2026-06-22]].

#### Blocs en attente d'un déblocage externe

##### C. Dashboard qualité veille [BLOQUÉ - attend 1re mesure W27 (~03/07)]

- [ ] **[BLOQUÉ - attend 1re mesure W27]** dashboard qualité veille + boucle feedback (décision Pascal : après la 1re mesure réelle du sourcing élargi). Puis 1 session autonome. → [[project_veille_sourcing_w26_2026-06-23]].

##### D. Vague 4 Emailing [BLOQUÉ - 3 inputs Pascal]

- [ ] **[BLOQUÉ - 3 inputs Pascal]** (individuel → nLPD → groupé) : (a) DNS `send.filmpro.ch` vérifié Resend, (b) base légale nLPD + mention d'information validées, (c) 1er email réel décrit (réunion 3 fondateurs). Dès fourniture → cadrage + code 1 session (pas une dépendance système).

#### Checklist gestes Pascal (manuels, hors session de code) - Bloc B Daily Email

Code en prod (`d1db821`), gate `EMAIL_DAILY_ENABLED` **OFF** = 0 envoi tant que non activé. → [[project_daily_email_module_2026-06-25]] + [[audit_secu_2026-06-26_daily_email_module]].

- [ ] **[BLOQUÉ - geste Pascal : login OTP @filmpro.ch]** **Smoke OTP prod** : 1 login OTP en prod (supabase 2.108 + TS6 déjà live, push `f357e68` ; boot + page login OK 26/06, reste le flux OTP end-to-end). **Si KO → `vercel rollback` immédiat.**
- [ ] **[BLOQUÉ - geste Pascal : accès env Vercel]** **Activer Daily Email** = poser `EMAIL_DAILY_ENABLED=true` en env Vercel Prod (zéro redéploiement, lu via `$env/dynamic/private`). À faire **APRÈS** le smoke OTP.

### Réserve (hors backlog actif)
- Chantier 3 portail (non cadré) ; durcissement RLS si 4e user ([[feedback_rls_multitenant_durcissement_si_4_users]]).
- **knip cadré 2026-06-28 (zéro code mort)** : `knip.json` (entry points CLI `scripts/**` + `playwright.*.config.ts` + `tests/*`, générés ignorés, `axe-core`/`playwright` = deps CLI/e2e) → knip **72 → 3 findings**. **Vrais morts retirés** (symbole exporté retiré = 0-ref ; attention homonymes VIVANTS distincts : `STATUTS_CHANTIER`→const regbl `[1004,1005]`, `Canton`→tokens scoring, `SearchChip`→interface chip-normalize) : `StatusEnum`, `_internals`, `FamilleProduit`, `STATUTS_CHANTIER`, types `Canton`/`SearchChip` + 2 scripts `scripts/media/*` **cassés** (import `media-library` supprimé). **3 résiduels JUSTIFIÉS** (PAS du code mort) : `Theme`+`SearchTerm` (alias `@deprecated` gardés volontairement, doc inline) + `MINUTE_MS`/`RATE_LIMIT_WINDOW_MS` (alias sémantique, les deux utilisés). `axe-core` gardé (moteur a11y épinglé derrière `@axe-core/playwright`, le retirer ferait floter la version). `apply-*-migration` (appliquées) archivables un jour si Pascal le décide.
### Livré cette session

- [x] ~~**Bloc A - refonte serveur page Entreprises** (filtre/pagination/tri/recherche)~~ - 2026-06-28 (ultracode/xhigh, **LIVRÉ PROD** `4b3974e`, push direct validé Pascal, smoke 303 OK + alias canonique sur nouveau build `87s0nnmrj`). `/crm/entreprises` chargeait `select('*')` non borné + filtrait/comptait 100 % client → refonte **100 % serveur** façon `/prospection` (URL params), counts d'onglet + KPI via `count:'exact'` SÉPARÉES (sans limit), contacts+opps gardés entiers (fiche/pastilles), anti-join `sans-contact` `.not('id','in',(uuids))` garde UUID, `affairesEnCours` réutilise `buildActiveStageByEntreprise`, `avecContact = total - sansContact`. Nouveau helper pur `$lib/server/entreprises-query` + tests. DataTable serverMode + footer pagination vue cartes (mirror) + `selectTab` annule le timer. **4 helpers d'agrégat client morts retirés** + type `EntrepriseLite` + tests (knip 3 justifiés). **Revue adversariale 5 relecteurs : 0 High/Critical** ; 3 MEDIUM corrigés (recherche multi-pages union exacte/pages disjointes vs count `max()`+saut/dup ; tri stable tiebreaker `.order('id')` ; anti double-nav onglet) ; bornes « à l'échelle » tracées (IN-list, `escapeIlike *` pré-existant, affaires cap 500 hérité). **2315 verts** (+ test invariant counts/KPI/anti-join + disjonction pages), svelte-check 0/0, build OK. Parité sémantique counts/KPI confirmée EXACTE. → [[project_bloc_a_refonte_serveur_entreprises_2026-06-28]] + [[audit_secu_2026-06-28_entreprises_refonte_serveur]].
- [x] ~~**Backlog consolidé en blocs 1-session + zéro code mort (knip cadré)**~~ - 2026-06-28 (ultracode/xhigh, commit LOCAL `main` non poussé). 6 tâches confirmées encore à livrer → 4 blocs « 1 session » (A Entreprises EXÉCUTABLE, B migration socle EXÉCUTABLE, C dashboard BLOQUÉ W27, D Vague 4 BLOQUÉ) + checklist 2 gestes Pascal. **Migration socle : raison de blocage corrigée** (issues #928/#1313 fermées ; vrai blocage = conflit peer-deps, testé en worktree isolé). **Cockpit/backlog propre** : id stale `15eed976` purgé, PROGRESS Bloc D condensé en clôture. **Zéro code mort** : `knip.json` (entry CLI + `ignoreExportsUsedInFile`) → knip 72→3 findings (3 justifiés) ; 5 morts retirés (StatusEnum, _internals, FamilleProduit, STATUTS_CHANTIER, types Canton/SearchChip) + 2 scripts media cassés. svelte-check 0/0, **2301 verts**, build OK. session-auditor GO. **NON poussé** (push=prod, attend validation Pascal). → [[feedback_knip_verify_grep_before_delete]].
- [x] ~~**Bloc D audit 360 (90 findings) + 8 différés livrés EN PROD**~~ - 2026-06-27 (`fea3cec`→`cd5426e` + `fe1eaa7`, push prod + smoke OK). Pastille→ScorePill, empty→P3, motif perte, KpiStrip/AideDiagram, won't-fix tracés ; Entreprises différé (→ Bloc A). bug-hunter 1 HIGH corrigé, audit sécu 0 C/H/M/L, 2301 verts. Détail intégral → [[project_bloc_d_audit_360_PROGRESS]] + [[audit_secu_2026-06-27_bloc_d_v4_v5_fixes]].
- [x] ~~Fix icônes « ? » prod (`a6ae0e1`) + Bloc C veille pont/RegBL + PDF de marque (`b767056`)~~ - 2026-06-26 → archive.
→ Antérieurs archivés (Bloc A `f357e68`, Bloc 0 `1065fb1`, Bloc 2 Dependabot, Non-veille 26/06, Audit 360, Daily Email `d1db821`, Vague 3.3 `ebacea6`, Campagnes V3.2) → `archive/claude-md-crm-livre-2026-06-26.md`. Plus anciens (24/06-) → mémoires veille 06-22/23/24 + `archive/`.

### Watch list active après pivot

- **[WATCH] Refonte CRM 1+2+3 activée fondateurs (`ffCrmListesV2`)** : surfaces premium à surveiller à l'usage. **Bug 5 résiduel** : menu `...` slideout Signaux (ouverture vers le haut en conteneur scrollable), à corriger s'il re-saute. Rollback = flag OFF (`raw_app_meta_data`).
- **[WATCH] W26 a tourné 26/06 (success, 7 items, local 71%, keptByTrust=1)** : confirmer le rendu du brief en boîte (0 `<cite>`/emoji, qualité). **W27** = 1er run sur 238 sources (post-reconciliation Bloc 0) + nouvel horaire 02:27 UTC → surveiller densité/mix/horaire réel. → [[project_veille_sourcing_w26_2026-06-23]].
- **[WATCH] Svelte 5 `onDestroy` s'exécute en SSR Vercel** (pas en `vite preview`) : window/document/localStorage/setInterval à cleanup → `$effect(() => {...; return () => cleanup})`. Tester en preview branch. → `feedback_svelte5_ondestroy_ssr_window_undefined.md`.
- **[WATCH] Vercel : push `main` AUTO-PROMEUT en prod** (git integration, vérifié live 26/06 ; contredit l'ancienne note « deploy manuel »). Exception = après un `vercel rollback` l'alias peut rester épinglé (un push builde sans promouvoir) ; vérifier via `vercel inspect filmpro-portail.vercel.app`.
- **[WATCH] Réactivation d'une source coupée V5 (2026-06-07)** : flip de flag → re-vérifier les contrôles d'origine (Zod, quota, rate-limit, anti-hallu) AVANT de rallumer en prod. Réf `audit_secu_2026-06-07_v5_signaux_prospection.md` § I-3.

→ Watch list complète (Signaux V4 perf/contrats S189, S188, S186, S178, S171) déplacée dans `archive/2026-05-28-pivot-mobile-v3.md`. Restent triables si l'objet redevient actuel.

### Livré (référence historique)

→ Livré V2 + sessions antérieures (S171→S192bis) dans `archive/` (`2026-05-28-pivot-mobile-v3.md`, `2026-05-25/13/10/09/08-sessions.md`).

