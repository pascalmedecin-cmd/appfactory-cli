# CRM FilmPro : CLAUDE.md

**Note migration** : ce fichier vit dans `CRM/CLAUDE.md` (path Vercel `rootDirectory: CRM`) ; le container racine est un stub pointant vers les sous-projets. Contexte migration complet → `~/.claude/projects/-Users-pascal-Claude-Projets-FilmPro/memory/project_appfactory_restructure.md`.

**Statut :** Clean state 2026-05-28 — refonte mobile V2 **abandonnée** après smoke iPhone (overscope, lisibilité) → pivot **V3 outil terrain only** (`archive/2026-05-28-pivot-mobile-v3.md`). **Antérieur en prod** (Signaux V4, Log CRM, Aide, audit 360, Google Places, golden v9, migration restructure S173-S174) → détail `archive/2026-05-06-sessions.md` + Livré ci-dessous. **Portail FilmPro multi-outils : CRM (`/crm`) + Découpe Films (`/decoupe`) en prod sur `filmpro-portail.vercel.app` (2026-06-05).** Formation IA = sous-projet autonome `Formation/`, `cc` option 5.
**Derniere mise a jour :** 2026-06-07 (REG-01 suppression entreprise LIVRÉE EN PROD `dd99ae8` : migration FK lead transféré `SET NULL` appliquée prod + modale dépendances détachables + avertissement cascade terrain chiffré [I-2 inclus, décision Pascal] ; audit sécu Opus 0 C/H/M/L, smoke prod 4/4. Avant : Vague 2 a11y, Vague 1 nav `c51309c`, V5 `364bd1f`).
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** 2026-06-07 - **REG-01 suppression entreprise LIVRÉE EN PROD** (`dd99ae8`, reprise après interruption CLI). Cause racine 2 = FK `prospect_leads.transfere_vers_entreprise_id` NO ACTION → `ON DELETE SET NULL` (migrée prod via `pg` car MCP read-only) ; cause 1 = garde contacts/opportunités conservée mais explicitée (`DependencyBlockModal`) ; `dbFail` discrimine `23503`. **I-2 inclus (décision Pascal)** : cascade terrain (photos/visites/suggestions) désormais confirmée + chiffrée (flow preview→confirm→force) au lieu d'effacement silencieux ; fail-secure (I-1) + log traçabilité (I-3). Audit sécu Opus **0 C/H/M/L**, **smoke prod 4/4** (session mintée), 1696 Vitest, svelte-check 0, build 0. Branche `portail-session-1`. Détail « Livré cette session ». Avant : Vagues 1+2.
**Sessions précédentes (condensé)** - détails dans `archive/` (S165-S175 : `2026-05-06-sessions.md` ; S122-S125 : `2026-04-28-sessions.md` ; S70-S107 : `decisions-sessions-*.md` + `Formation/CLAUDE.md`).


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
- **Tests** : Vitest 1619 (104 fichiers) + Playwright e2e 34. Accessibilité : focus trap + ConfirmModal partout. Sécurité : Zod sur 19 form actions, rate limiting 10/min, headers CSP/XFO/referrer, timing-safe secrets

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

**Prochaine attaque** : Bloc 1 (Vague 1 nav) + Bloc 2 (Vague 2 a11y) + **REG-01 (suppression entreprise, I-2 inclus)** = **LIVRÉS EN PROD 2026-06-07** (cf. Livré). Suivant : Vague 4 (dette M/L). Audit live complet figé + validé Pascal le 2026-06-07 (`docs/QA_FINDINGS_CRM_2026-06-07.md`).

### 1. Vague 4 - dette M/L audit live + dette a11y découverte au gate Vague 2 [MIXTE • high • ~2-3h]
- **Pourquoi** : findings moyens/cosmétiques de l'audit live, non bloquants + dette a11y systémique révélée par le gate axe exhaustif (hors les 4 familles H, jamais flaggée en live).
- [ ] **[EXÉCUTABLE]** M audit live : empty contextuels (LIVE-M1), H1 sémantique (LIVE-M6), vue Archivées paginée (LIVE-M2), **mojibake Zefix archivés** (LIVE-M3, corruption migration V5, à investiguer), autocomplete combobox (LIVE-M4). L : radius cards 12→10, coquilles, « Closed » EN, séparateurs `<title>`, doc cron périmée ANO-03. → voir `docs/QA_FINDINGS_CRM_2026-06-07.md` §E/E.2.
- [ ] **[EXÉCUTABLE - dette a11y découverte au gate axe Vague 2]** (a) **contraste palette « prospection workflow »** (`--color-prosp-*`/`--color-tab-*`, ex. slate `#5A7190`, bronze) utilisée en **texte** sur badges segment/onglet (Veille/Signaux/Prospection) ≈ 4.0-4.4:1 < AA → variante `-deep` par couleur, **décision design Pascal** (palette de marque dédiée, `palette_workflow`, cf. [[feedback_palette_workflow]]) ; (b) **gris muted/décoratif** en texte (`text-muted` ≈ 4.0:1, gros chiffres filigrane `#ced0d4` 1.54:1) → revoir l'échelle muted ; (c) **`aria-required-children`** structure ARIA du Kanban Pipeline (role list/listitem, ~164 nœuds). Gate axe `playwright.vague2-a11y.config.ts` prêt à étendre (allowlist `STATUS_FG`/`OUT_OF_SCOPE_RULES` à lever au fur et à mesure).

### 2. Re-audit live avec données seedées [MIXTE • high • ~2h]
- **Pourquoi** : la DB prod est quasi vide (Contacts 0, Pipeline 0, Entreprises 2) → l'audit live n'a PAS validé les comportements sur données peuplées (tri, pagination serveur, slide-out détail rempli, drag&drop kanban, counts d'onglets).
- [ ] **[EXÉCUTABLE]** seed sur preview branch + session mintée (`tests/mint-session.mjs`, [[feedback_test_session_otp_free_mint]]), re-dérouler les stories liste/tri/pagination/slide-out/drag&drop des pages concernées (Entreprises/Contacts/Pipeline). → voir `docs/QA_USER_STORIES_CRM.md` + `docs/QA_FINDINGS_CRM_2026-06-07.md` §C (limite de couverture).

### Réserve (retirée du backlog actif le 2026-06-07)
- Chantier 3 portail = non cadré, pas voulu maintenant (observer l'usage V5 d'abord). Durcissement RLS 4e user = conditionnel non déclenché (tracé §RISQUES OUVERTS + [[feedback_rls_multitenant_durcissement_si_4_users]], redéclenche au 4e user non-fondateur). Corpus golden optimiseur Découpe = déjà livré (5 cas gelés, `68c4965`/`99476f1`).

### Livré cette session

- [x] ~~**REG-01 - suppression entreprise (FK lead transféré + modale dépendances + cascade terrain)**~~ - Livré 2026-06-07 (xhigh, **EN PROD**, `dd99ae8`, reprise après interruption CLI). **Cause 2 (racine)** : migration FK `prospect_leads.transfere_vers_entreprise_id` NO ACTION → `ON DELETE SET NULL` appliquée prod via `pg` ([[feedback_supabase_migration_via_pg_lib]], MCP read-only). **Cause 1** : garde contacts/opportunités CONSERVÉE (décision Pascal) mais explicitée via `DependencyBlockModal` (a11y `aria-labelledby`+`trapFocus`) ; `dbFail` discrimine `23503`. **I-2 inclus (décision Pascal)** : cascade terrain (photos/visites/suggestions, FK `ON DELETE CASCADE`) désormais confirmée + chiffrée (flow preview→confirm→`force`, [[feedback_sveltekit_force_resubmit_deserialize]]) au lieu d'effacement silencieux ; garde détachables jamais contournée par `force`. Durcissements sécu : fail-secure sur erreurs de requête (I-1), log traçabilité décompte cascade (I-3). Audit sécu Opus **0 C/H/M/L** (`memory/audit_secu_2026-06-07_reg01_suppression_entreprise.md`). **Smoke prod 4/4** (session mintée OTP-free, données éphémères purgées) : garde→blocked, I-2 preview→needsConfirm, force→cascade supprimée, REG-01→SET NULL. 1696 Vitest (+4), svelte-check 0, build 0. → `docs/QA_FINDINGS_CRM_2026-06-07.md` §A REG-01.
- [x] ~~**Vague 2 - batch a11y (4 familles H audit live)**~~ - Livré 2026-06-07 (xhigh, **EN PROD**, `080fe83`/`753a1a9`). H3 dialogs nommés (`SlideOut`+`ModalForm` `aria-labelledby` via `$props.id()`) ; H2 focus restitué (fix single-point `trapFocus` : restitution différée `requestAnimationFrame` + `isConnected`, couvre 6 dialogs) ; H5 `scope="col"` 7 `<th>` Log ; H4 contraste texte AA (4 tokens `-deep`, 162 subs / 48 fichiers, usages texte + `.ts` + bg pleins ; extension success/info au-delà de l'ambre/rouge validé = même famille H4). Gate axe dédié (`playwright.vague2-a11y.config.ts`) 8/8 local + prod. 1682 Vitest, svelte-check 0, build 0. Dette hors-familles → Vague 4. → [[feedback_a11y_deep_tokens_with_axe_gate]].
- [x] ~~**Vague 1 - liens nav internes sous `/crm`**~~ - Livré 2026-06-07 (xhigh, **EN PROD**, `c51309c`). 5 liens (LIVE-H1 KPI, ANO-02 Veille ×3, + 2 même famille `RelancesList`/`buildRedirect` non exercés DB vide) + garde `no-root-crm-links` durcie (`TPL_LINK`+`RETURN_LINK`). Smoke prod authentifié OK. → [[feedback_smoke_prod_feature_flag_livraison]], [[feedback_test_session_otp_free_mint]].
- [x] ~~**Audit live UX/UI CRM - 13 surfaces (~135 stories)**~~ - Fait 2026-06-07 (xhigh). 10 agents `ui-auditor` sur prod, non destructif, 0 story bloquante. 5 familles H (LIVE-H1..H5). Décision REG-01 (garder blocage + modale). → [[feedback_chrome_mcp_subagents_inherit_browser]] + `docs/QA_FINDINGS_CRM_2026-06-07.md`.
- [x] ~~**QA CRM - bloc prioritaire figé**~~ - Fait 2026-06-07. REG-01 confirmé prod (`23503` masqué) ; V5 8/8 ; 11 anomalies qualifiées. Catalogue `docs/QA_FINDINGS_CRM_2026-06-07.md`.
- [x] ~~**V5 recentrage Signaux & Prospection**~~ - Livré 2026-06-07 (xhigh, TDD, **EN PROD**, `364bd1f`). Zefix coupé par flag + SIMAP recalibré + imports masse coupés + migration prod (1227 archivés, 276 re-notés). Audit sécu Opus 0 H/C/M/L. → [[project_audit_signaux_prospection_2026-06-07]] + `memory/audit_secu_2026-06-07_v5_signaux_prospection.md`.
→ Livré antérieur (Challenge Signaux/Prospection + spec V5 ; Veille bump opus-4-8 `aa306fa` + validation résiliente `e0aef36` → [[feedback_splitter_deterministe_post_llm]] ; Découpe hub `60bf9a0`, filet optimiseur `68c4965`/`99476f1` → [[feedback_verifier_optimisation_heuristic_fuzzing]], fiche `69c9618`, pages pleine largeur `8c46e06`, Phase 5 prod, Phase 3) → [[project_audit_signaux_prospection_2026-06-07]] + `archive/2026-06-06-sessions.md` + `archive/2026-06-05-decoupe-films.md` + `archive/2026-06-01-sessions.md`.

### Watch list active après pivot

- **[WATCH] Svelte 5 — `onDestroy` s'exécute en SSR (Vercel) mais pas en `vite preview`** : toute référence à `window`/`document`/`localStorage`/`setInterval` à cleanup DOIT passer par `$effect(() => { ...; return () => cleanup; })`. Toujours tester en preview branch Vercel pour les composants qui touchent window. Mémoire `feedback_svelte5_ondestroy_ssr_window_undefined.md`.
- **[WATCH] Trap Vercel `rollback` → alias prod verrouillé** : après `vercel rollback`, les `git push` suivants buildent mais ne promeuvent PAS automatiquement. Toujours vérifier via `vercel inspect filmpro-portail.vercel.app` (domaine canonique depuis la bascule 2026-06-04) que l'alias pointe bien sur le nouveau deploy.
- **[WATCH] Réactivation d'une source coupée en V5 (2026-06-07)** : flip de flag (`SIGNAUX_ZEFIX_ENABLED=true`, ou `config.prospection.sources.*.enabled=true` / `features.*=true`) → re-vérifier que les contrôles d'origine (Zod, quota, rate-limit, anti-hallu) sont bien ceux validés S189/S192 AVANT de rallumer en prod. Le moment du risque = la réactivation, pas la coupure. Réf audit `memory/audit_secu_2026-06-07_v5_signaux_prospection.md` § I-3.

→ Watch list complète (Signaux V4 perf/contrats S189, S188, S186, S178, S171) déplacée dans `archive/2026-05-28-pivot-mobile-v3.md`. Restent triables si l'objet redevient actuel.

### Livré (référence historique)

→ Livré V2 + sessions antérieures (S171→S192bis) dans `archive/` (`2026-05-28-pivot-mobile-v3.md`, `2026-05-25/13/10/09/08-sessions.md`).

