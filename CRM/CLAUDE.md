# CRM FilmPro : CLAUDE.md

**Note migration** : ce fichier vit dans `CRM/CLAUDE.md` (path Vercel `rootDirectory: CRM`) ; le container racine est un stub pointant vers les sous-projets. Contexte migration complet → `~/.claude/projects/-Users-pascal-Claude-Projets-FilmPro/memory/project_appfactory_restructure.md`.

**Statut :** Clean state 2026-05-28 — refonte mobile V2 **abandonnée** après smoke iPhone (overscope, lisibilité) → pivot **V3 outil terrain only** (`archive/2026-05-28-pivot-mobile-v3.md`). **Antérieur en prod** (Signaux V4, Log CRM, Aide, audit 360, Google Places, golden v9, migration restructure S173-S174) → détail `archive/2026-05-06-sessions.md` + Livré ci-dessous. **Portail FilmPro multi-outils : CRM (`/crm`) + Découpe Films (`/decoupe`) en prod sur `filmpro-portail.vercel.app` (2026-06-05).** Formation IA = sous-projet autonome `Formation/`, `cc` option 5.
**Derniere mise a jour :** 2026-06-07 (**branche `portail-session-1` DÉPLOYÉE PROD** `fb84ecd` : Vagues 4a→4d + retrait Sentry `e561747` + fix Pipeline HIGH `8c74885`, alias canonique `filmpro-portail.vercel.app`, smoke prod OK. `main` reste à `aa306fa` - non mergée. EN PROD avant : REG-01 `dd99ae8`, V5 `364bd1f`. Détail « Livré cette session »).
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** 2026-06-07 - **Bloc 1 re-audit seedé LIVRÉ + DÉPLOYÉ PROD** (`fb84ecd`, alias canonique `filmpro-portail.vercel.app` → `dpl_A7i6...`). Le déploiement prod embarque tout le backlog branche jusque-là en checkpoint : **Vagues 4a→4d + retrait Sentry (`e561747`) + fix Pipeline HIGH (`8c74885`)**. **Bug prod HIGH débusqué + fixé** : Pipeline vide quelles que soient les données (embed PostgREST `signaux_affaires` ambigu, PGRST201). **Smoke prod OK** : pipeline rend les opportunités en live (seed éphémère purgé, 0 résidu). 1711 Vitest, svelte-check 0, build 0. Détail « Livré cette session ».
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
- **Tests** : Vitest 1711 (118 fichiers) + Playwright e2e 34. Accessibilité : focus trap + ConfirmModal partout. Sécurité : Zod sur 19 form actions, rate limiting 10/min, headers CSP/XFO/referrer, timing-safe secrets

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

**Prochaine attaque** : pas de gros chantier. Bloc 1 (merge → `main`) **livré** 2026-06-07 (`main` = prod `810f2e6`). Bloc 2 (copy empty Prospection) **livré** 2026-06-07 (commité local, **pas encore déployé prod** - décision de déploiement à prendre). Reliquat ouvert : onglets SIMAP/RegBL encore affichés post-V5 (finding tracé Bloc 2) → relève de la « Cascade gabarit /prospection [à re-cadrer post-V5] ».

### 1. Hygiène git - merge `portail-session-1` → `main` [AUTO • low • ~15min]
- **Pourquoi** : prod tourne sur `portail-session-1` (déployé `fb84ecd`), `main` (`aa306fa`) reste en arrière. Merger pour que `main` = prod (déploiement FilmPro = CLI manuel, pas git-auto → pas urgent, mais propre).
- [x] ~~**[EXÉCUTABLE]** merger la branche dans `main` (Vagues 4 + retrait Sentry + fix Pipeline déjà en prod), pousser.~~ - Livré 2026-06-07 (fast-forward `aa306fa`..`810f2e6`, 18 commits, 0 conflit, poussé GitHub). `main` = prod.

### 2. Vague 4d reliquat - drift copy empty Prospection [LIVRÉ • low]
- [x] ~~**[EXÉCUTABLE]** aligner copy empty Prospection (`prospection/+page.svelte:356,820,905`, mentions Zefix/import masse pré-V5) sur le périmètre V5 - sensible métier, ne pas inventer le wording.~~ - Livré 2026-06-07 (xhigh). Blocage **soft** levé : périmètre V5 défini dans `config.ts` (sources gardées zefix+search.ch, coupées SIMAP/RegBL/Google Places, cadrage « recherche de contact à la demande »). Wording validé par Pascal avant ship (zéro claim inventé, chaque mot mappe sur `config.ts`). **6 surfaces réalignées** « import masse → recherche à la demande » : body entreprises (l.356), body empty global (l.820, retrait « marchés publics / registre des bâtiments » = sources coupées), body empty filtré (l.905), titre « Aucune entreprise importée » → « pour l'instant », CTA `headerCTA`/`emptyStateCopy` entreprises (label+icône `search`), titre modale import entreprises (la modale est déjà search-first en interne). 1711 Vitest, svelte-check 0.

> **[FINDING tracé - hors scope, zone re-cadrage]** Les onglets **SIMAP** (« Marchés publics ») et **RegBL** (« Chantiers ») restent affichés (`tabsConfig` non filtré par les flags V5) alors que leurs sources sont coupées. Leurs états vides portent encore « Lancez un import des appels d'offres SIMAP… / du registre fédéral des bâtiments… » **sans bouton** (CTA masqué, `showImportCta=false`). Réalignement = décision métier (ex: rediriger SIMAP vers le radar Signaux, cf. commentaire `config.ts` « simap redondant avec le radar Signaux ») → relève de la « Cascade gabarit /prospection [à re-cadrer post-V5] » (tâche globale `~/.claude/CLAUDE.md`). Non corrigé sans validation périmètre.

### Réserve (retirée du backlog actif le 2026-06-07)
- Chantier 3 portail = non cadré, pas voulu maintenant (observer l'usage V5 d'abord). Durcissement RLS 4e user = conditionnel non déclenché (tracé §RISQUES OUVERTS + [[feedback_rls_multitenant_durcissement_si_4_users]], redéclenche au 4e user non-fondateur). Corpus golden optimiseur Découpe = déjà livré (5 cas gelés, `68c4965`/`99476f1`).

### Livré cette session

- [x] ~~**Bloc 1 - Re-audit live seedé + bug prod HIGH pipeline**~~ - Livré 2026-06-07 (xhigh, `8c74885`, **DÉPLOYÉ PROD** `fb84ecd`, smoke prod OK). Seed prod éphémère 15/22/30 (`seedaudit-*`, purgé, DB restaurée 0 résidu). **Bug prod HIGH** débusqué (invisible car pipeline prod toujours vide) : 2 FK `opportunites↔signaux_affaires` → embed nu PostgREST PGRST201 → `oppsRes.data=null` → Pipeline vide quelles que soient les données. Fix : embed via FK nommée + remontée d'erreur (`oppsRes.error` n'était plus avalé) + test de régression. Re-audit a11y : `vague2-a11y` 8/8 AVEC données, `aria-required-children` enforced (Kanban peuplé 6 `role=list`/30 `role=listitem`). Stories peuplées vertes (counts = badges, tri, slide-out rempli, empty M1 contextuel). 1711 Vitest, svelte-check 0. → `scripts/_audit_seed.mjs` + [[feedback_postgrest_embed_ambigu_2fk]].
- [x] ~~**Vague 4d (mojibake) - cause racine encodage Zefix**~~ - Livré 2026-06-07 (xhigh, EN PROD via `fb84ecd`). Diagnostic (MCP read-only) : mojibake = ingestion Zefix (`resp.json()` force UTF-8 sur SOGC Latin-1 → accents détruits en U+FFFD avant stockage, **lossy, irréversible en base** ; 1227 archivées), PAS la migration V5 (flag only). **Décision Pascal : pas de backfill + fix cause racine** : `lib/server/decode-response.ts` (UTF-8 + fallback Windows-1252) sur les 2 points d'ingestion Zefix + test déterministe → réactivation future ne re-corrompt plus. → `docs/QA_FINDINGS_CRM_2026-06-07.md` §E (LIVE-M3).
- [x] ~~**Vague 4c - a11y structurels**~~ - Livré 2026-06-07 (xhigh, EN PROD via `fb84ecd`). 6 findings : `<th>` logo nommé (DataTable partagé), Log 1 seul h1 + `<tr>`→bouton focusable `aria-expanded`/`aria-controls` (M9), item Veille `<article>`/`<time>` (M7), combobox Contacts `role=combobox/listbox/option` (M4), empty contextuel Entreprises (M1), Kanban `role=list` conditionnel (anti `aria-required-children` colonne vide). M6 Veille h1 générique accepté en l'état (hiérarchie WCAG valide, décision Pascal). Gate Playwright non lancé → enforcement `aria-required-children` basculé au re-audit seedé. → `docs/QA_FINDINGS_CRM_2026-06-07.md` §E/E.2.
- [x] ~~**Vague 4b - palette prospection `-deep` + radius**~~ - Livré 2026-06-07 (xhigh, EN PROD via `fb84ecd`). 6 tokens `-deep` AA (revérifiés WCAG sur `-bg` ET blanc) + 13 usages TEXTE migrés (badges Veille ×2, chips/boutons Prospection, AlerteModal, EnrichBatchModal, BatchActionsBar) ; icônes laissées vives (SVG 3:1). Gate axe étendu (STATUS_FG + palette) + test déterministe `src/lib/palette-contrast.test.ts`. Écart tracé : 4/6 teintes en texte (place + tab-regbl latents). Radius : carte 12→10 (SignauxCards) + ModalForm 16→12 (portail CRM+Découpe, décision Pascal) ; champs 10→8 descopé (coupling champs/boutons). → `memory/project_vague4_palette_deep_2026-06-07.md`.
- [x] ~~**Vague 4a - cohérence i18n + a11y localisé**~~ - Livré 2026-06-07 (xhigh, `fa0c728`, EN PROD via `fb84ecd`). i18n : « Closed »→« Conclues », séparateurs `<title>`→`·`, ligature « Cœur ». a11y localisé : repli sidebar nommé (M8), `aria-pressed` Log, `aria-current` Aide. → `memory/project_vague4_palette_deep_2026-06-07.md`.
→ REG-01 suppression entreprise (FK lead `SET NULL` + `DependencyBlockModal` + cascade terrain, **EN PROD** `dd99ae8`, audit sécu 0 C/H/M/L) + Vagues 1 (`c51309c`) + 2 a11y EN PROD : détail `archive/2026-06-07-sessions.md` + `memory/audit_secu_2026-06-07_reg01_suppression_entreprise.md`.
→ Livré antérieur 2026-06-07 : audit live UX/UI (13 surfaces, 10 agents) ; V5 recentrage Signaux/Prospection **prod** `364bd1f` (Zefix coupé, SIMAP recalibré, 1227 archivés) ; Veille bump opus-4-8 ; Découpe hub/optimiseur. Détail → [[project_audit_signaux_prospection_2026-06-07]] + `archive/2026-06-06-sessions.md` + `2026-06-05-decoupe-films.md` + `2026-06-01-sessions.md`.

### Watch list active après pivot

- **[WATCH] Svelte 5 — `onDestroy` s'exécute en SSR (Vercel) mais pas en `vite preview`** : toute référence à `window`/`document`/`localStorage`/`setInterval` à cleanup DOIT passer par `$effect(() => { ...; return () => cleanup; })`. Toujours tester en preview branch Vercel pour les composants qui touchent window. Mémoire `feedback_svelte5_ondestroy_ssr_window_undefined.md`.
- **[WATCH] Trap Vercel `rollback` → alias prod verrouillé** : après `vercel rollback`, les `git push` suivants buildent mais ne promeuvent PAS automatiquement. Toujours vérifier via `vercel inspect filmpro-portail.vercel.app` (domaine canonique depuis la bascule 2026-06-04) que l'alias pointe bien sur le nouveau deploy.
- **[WATCH] Réactivation d'une source coupée en V5 (2026-06-07)** : flip de flag (`SIGNAUX_ZEFIX_ENABLED=true`, ou `config.prospection.sources.*.enabled=true` / `features.*=true`) → re-vérifier que les contrôles d'origine (Zod, quota, rate-limit, anti-hallu) sont bien ceux validés S189/S192 AVANT de rallumer en prod. Le moment du risque = la réactivation, pas la coupure. **Encodage Zefix : corrigé 2026-06-07** (`lib/server/decode-response.ts`, fallback Windows-1252) → la réactivation ne re-corrompt plus les accents (cf. Livré 4d-mojibake). Réf audit `memory/audit_secu_2026-06-07_v5_signaux_prospection.md` § I-3.

→ Watch list complète (Signaux V4 perf/contrats S189, S188, S186, S178, S171) déplacée dans `archive/2026-05-28-pivot-mobile-v3.md`. Restent triables si l'objet redevient actuel.

### Livré (référence historique)

→ Livré V2 + sessions antérieures (S171→S192bis) dans `archive/` (`2026-05-28-pivot-mobile-v3.md`, `2026-05-25/13/10/09/08-sessions.md`).

