# CRM FilmPro : CLAUDE.md

**Note migration** : ce fichier vit dans `CRM/CLAUDE.md` (path Vercel `rootDirectory: CRM`) ; container racine = stub. Contexte → `memory/project_appfactory_restructure.md`.

**Statut :** Portail FilmPro multi-outils en prod : CRM (`/crm`) + Découpe Films (`/decoupe`) sur `filmpro-portail.vercel.app`. Formation IA = projet autonome `Formation/` (`cc` option 5). Historique (V3 terrain, Signaux V4, golden v9, restructure S173-S174) → `archive/`.
**Derniere mise a jour :** 2026-06-23. Prod = `filmpro-portail.vercel.app` sur `291ae02` (veille W25 mergée+déployée : libellés humanisés + tri d'importance + strip enum-en-prose ; refonte CRM flag `ffCrmListesV2` OFF). **Derniere revue /optimize :** 2026-04-05. **Prochain bug :** #001.
**Session courante :** 2026-06-23 (session 5) - **Chantier veille W25 TERMINÉ + DÉPLOYÉ** (`291ae02`) : merge + flake fix + strip enum-en-prose (6e défaut attrapé au smoke, garde liste close + cause racine prompt, revue adversariale 3 sceptiques), 2 deploys prod, data W25 nettoyée, smoke clean. → [[project_veille_fix_w25_commentaires_2026-06-23]]. WIP Campagnes 3.2 intact → [[project_module_campagnes_vague32_2026-06-22]].
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

- **Prod** : https://filmpro-portail.vercel.app (Vercel, déploiement CLI manuel `vercel deploy --prod` ; pas d'auto-deploy git) ; ancienne `filmpro-crm.vercel.app` conservée et redirigée 308 → nouvelle (hook). Supabase EU (projet `appfactory`, 10+ tables, RLS active, service role key configurée)
- **Auth** : OTP email 6 chiffres @filmpro.ch + session 7 jours httpOnly ; SMTP Resend (domaine verifié, free plan)
- **APIs** : Zefix REST + search.ch + fal.ai Flux 1.1 Pro Ultra (partage clé avec Enseignement) - Pexels/Unsplash supprimés S67
- **Crons** : `/api/cron/{signaux,alertes,nettoyage-crm,intelligence,intelligence-archive}` tous sécurisés `CRON_SECRET` + service role (Cron `media-enrich` supprimé S67)
- **Tests** : Vitest 2098 (dernier run vérifié 2026-06-23, +18 strip-enum-artifacts + W25 + flake) + Playwright e2e (suite + P1/P2/P3 Prospection). Accessibilité : focus trap + ConfirmModal partout, axe-core 0 violation modale P3. Sécurité : Zod sur 20 form actions/endpoints, rate limiting 10/min, headers CSP/XFO/referrer, timing-safe secrets

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

**Prochaine attaque** : **Campagnes Vague 3.2 - UI (Phase 5)** : migration prod + backend testé FAITS le 23/06 (37 tests). **ATTENTION : reprendre depuis la branche `campagnes-vague32` (`3e27c49`), PAS `main`** - le schéma DB prod est en avance (tables `campagnes` + RLS live) mais le code qui les consomme n'est commité QUE sur la branche (non mergée). Reste filtre relationnel load/export + colonne liste + fiche + écran `/crm/campagnes` + revues. → [[project_module_campagnes_vague32_2026-06-22]]. Veille W25 **TERMINÉE + DÉPLOYÉE** (prod `291ae02`, bloc 0). **W26 (vendredi 26/06) = 1er run cron sur le code W25 + 1er brief réel antoine@**, à surveiller (densité, ordre local-actionnable, 0 underscore, so-what sans cible inventée, et que le cron ne re-dumpe plus l'enum en prose).

> Cadrage commun (refonte UX/UI CRM, validé Pascal 2026-06-18) → `~/.claude/projects/-Users-pascal-Claude-Projets-FilmPro/memory/project_refonte_crm_cadrage_2026-06-18.md` + golden Vague 3 `CRM/.product-architect/refonte-vague3/golden-vague3-v1.html` (validé Chrome).

### 0. Veille - Lot 3 structurel (reste) [SUPERVISÉ • high • session dédiée]

- [x] ~~**Chantier veille W25 - TERMINÉ + DÉPLOYÉ 2026-06-23**~~ : round-2 trust-by-source + 5 commentaires Pascal + strip enum-en-prose (prod `291ae02`). → [[project_veille_fix_w25_commentaires_2026-06-23]] + [[project_veille_trust_by_source_2026-06-23]].
- [x] ~~**Pré-flight QA veille avant W26 - TERMINÉ + sur main 2026-06-23**~~ (mandat Pascal « zéro dette, 100% QA, prêt pour vendredi ») : audit fan-out 5 dimensions (cron/infra, anti-hallu, pipeline, éditorial, dette) + vérif adversariale par finding. **2 dettes fermées** (commit `5401d78`, CI main verte, merge FF) : (1) `<cite>` fuyait dans `impacts_filmpro[].note` du brief client - `stripCitationsFromReport` était le seul des 3 jumeaux de la chaîne à ne pas couvrir les impacts (aligné + 2 tests) ; (2) 2 emojis retirés du recap **interne** (pascal@, semaine-creuse/échec). **d2 non touché** = résiduel tracé (`resilience-validation-spec.md:54-56`, council 4/4 : cross-check items-only par design ; `executive_summary`/`impacts` non cross-checkés ; durcissement = feature post-W26 optionnelle, garde déterministe « chiffre/date hors items » = faux positifs sur synthèse). 3 gates verts (2100 tests). Reste : nits info à surveiller au smoke W26 (enum-en-titre, doc EMAIL_RECAP). → memory au `/fin-session`.
- [ ] **[BLOQUÉ - après mesure W26+]** **Lot 3 - structurel (optionnel)** : élargir sources (OFS/assos/salons) ; dashboard qualité + boucle feedback ; PDF de marque (`filmpro-pdf`) ; pont veille→action ; décomposer mono-appel LLM si plafond ; nettoyage enum RegBL. → [[project_veille_refonte_lots12_livree_2026-06-22]].

### 1. Vague 3 (suite) + Vague 4 refonte CRM [SUPERVISÉ • xhigh • cascade par chantiers]

- **Pourquoi** : golden Vague 3 validé Chrome (3 écrans). Chantier 3.1 Signaux + export CSV Prospection livrés. Reste Campagne, Dashboard, Emailing.
- **Payload** → cadrage [[project-refonte-crm-cadrage-2026-06-18]] + golden `CRM/.product-architect/refonte-vague3/golden-vague3-v1.html` + audits [[audit-secu-2026-06-19-vague3-export-csv]] + [[audit-secu-2026-06-19-vague3-signaux-actions]].
- **Fait** : golden validé ; chantier 3.1 Signaux (`5e0c369`) + export CSV Prospection (`6626818`), flag OFF non déployé, revues 0 C/H/M.
- [ ] **[EXÉCUTABLE]** **Vague 3.2 Module Campagnes (multi-étiquetage N-N), backend FAIT, reste l'UI** : scope élargi par Pascal (2026-06-22) - relation N-N + écran dédié + édition fiche + couleur. **FAIT (2026-06-23, GO Pascal)** : golden validé ; Phase 3 fusion des 3 filtres ; **Phase 2 migration APPLIQUÉE EN PROD** (2 tables + RLS, GRANT parité vérifiée, types régénérés) ; **Phase 4 backend** = module source-unique `src/lib/server/campagnes.ts` (CRUD + assign/retrait N-N + filtre + comptage) + endpoints `POST /api/campagnes` & `POST/DELETE /api/prospection/lead-campagnes` + **37 tests** (suite full 2137 verts sur branche, check 0). **Commité sur branche `campagnes-vague32` (`3e27c49`), pas mergé sur main.** **RESTE** : Phase 4 UI (modale import) + Phase 5 (filtre relationnel load/export/all-ids + colonne liste + fiche + écran `/crm/campagnes` + sidebar + `.camp` app.css, charger `redesign-skill`) + Phase 6 (revues + preuve visuelle flag ON + livraison). Décisions, file:line, pièges → **Payload** [[project_module_campagnes_vague32_2026-06-22]].
- [ ] **[EXÉCUTABLE]** **Vague 3.3 Dashboard temporel** : refonte `/crm/+page.svelte` façon Capsule (En retard / Aujourd'hui / Cette semaine + fil d'activité « Ce qui s'est passé »), flag `ffCrmListesV2`, golden validé.
- [ ] **[BLOQUÉ - prérequis externes Pascal]** **Vague 4 Emailing** individuel → nLPD → groupé gaté. Non codable tant que : (a) sous-domaine `send.filmpro.ch` créé + vérifié Resend (DNS), (b) base légale nLPD du stock + mention d'information validées, (c) 1er email réel décrit (réunion 3 fondateurs). → cadrage § Garde-fous emailing.
- [ ] **[EXÉCUTABLE - décision Pascal]** **Déployer la refonte CRM** (Vagues 1+2+3) : codé/commité, **jamais activé**. `vercel deploy --prod` puis bascule flag JWT (`raw_app_meta_data` `ff_crm_listes_v2`) + smoke prod feature-flag (ordre deploy→flag, alias canonique `vercel inspect`, cf. [[feedback_smoke_prod_feature_flag_livraison]]). **Au flip : vérifier visuellement le positionnement du menu `...` du slideout Signaux** (Bug 5 résiduel : ouverture vers le haut en conteneur scrollable, à confirmer sur fiche courte).

### 2. Suite hygiène deps/CI + veille (livré 22/06, reste différés documentés) [EXÉCUTABLE]

- **Livré 22/06** (PR #16 mergée `b84b6f5`, CI+Vercel verts) : garde-fou CI (build+check+1869 tests sur PR/main) + Dependabot durci (socle groupé+ignoré) + cron `checkout@v7` + 6 bumps ciblés sûrs (anthropic 0.105, pg 8.22, playwright 1.61, axe 4.12, adapters). Cause Vercel-fail = **regen lockfile flote des transitifs** (pas kit/svelte). **Ne JAMAIS `rm package-lock.json` pour bumper ce repo.** → [[project_fix_deps_ci_vercel_2026-06-22]].
- [ ] **[EXÉCUTABLE]** **Trier les 3 PR Dependabot régénérées** (sortie ATTENDUE de la nouvelle config, ~2 min post-merge) : **#20** (groupe patch dont vite/svelte patches socle autorisés → merger si CI verte = preuve du gate) ; **#19** (`@types/node` 26 majeure) + **#21** (`js-yaml` 5 majeure) à arbitrer.
- [ ] **[EXÉCUTABLE]** **Migration socle SvelteKit (vite 8 / plugin-svelte 7 / kit 2.66)** : différée (vite 8 = bundler rolldown, bug amont ouvert TS-strip `.svelte` + layerchart incompatible). Rouvrir quand plugin-svelte/rolldown/layerchart clean (re-vérifier issues #928/#1313) : lever les `ignore` socle de `dependabot.yml` + monter le trio GROUPÉ, vérifié par la CI.
- [ ] **[EXÉCUTABLE]** **Bump @supabase/* 2.108 + typescript 6** : différés. supabase = 6 erreurs type `RejectExcessProperties` à corriger (6 sites insert/update : photos, enrichir-batch, search-ch, triage, visits, entreprises) + **smoke auth OTP réel** (Vitest mocke supabase). typescript 6 = trier les erreurs.
- [x] ~~**Veille Lot 2 fix anti-hallu**~~ - LIVRÉ 2026-06-22 (`de05779`, GO Pascal en session) : cross-check sépare faits/interprétation, gate déterministe inchangé, W18 intacte. Voir Bloc 0. → [[project_veille_refonte_lots12_livree_2026-06-22]].

### Réserve (retirée du backlog actif le 2026-06-07)
- Chantier 3 portail (non cadré, observer V5 d'abord) ; durcissement RLS 4e user (conditionnel, [[feedback_rls_multitenant_durcissement_si_4_users]]).

### Livré cette session

- [x] ~~**Veille pré-flight QA avant W26 - shippé main**~~ - 2026-06-23 : audit fan-out 5 dimensions + vérif adversariale ; 2 dettes fermées (`<cite>` dans `impacts` du brief client + emojis recap interne, `5401d78`, CI verte) ; d2 (exec_summary/impacts non cross-checkés) = résiduel tracé, non touché. 3 gates verts.
- [x] ~~**Campagnes V3.2 backend - migration prod + module + API**~~ - 2026-06-23 (GO Pascal) : Phase 2 migration LIVE (GRANT vérifiés) + `campagnes.ts` + endpoints, 37 tests (suite 2137 **sur branche**). Sécurisé sur branche `campagnes-vague32` (`3e27c49`), pas mergé. Reste l'UI Phase 5. → [[project_module_campagnes_vague32_2026-06-22]].
- [x] ~~**Veille W25 TERMINÉ + DÉPLOYÉ**~~ - 2026-06-23 : merge FF + strip enum-en-prose, prod `291ae02`, 6e défaut fermé au smoke. → [[project_veille_fix_w25_commentaires_2026-06-23]].
→ Livrés antérieurs (06-18/22) → `archive/claude-md-crm-livre-2026-06-19.md` + `_2026-06-18.md` + mémoires veille 06-22/23.

### Watch list active après pivot

- **[WATCH] W26 (vendredi 26/06) = 1er run cron SUR LE CODE ROUND-2 + 1er brief brandé RÉEL à antoine@** (round-2 mergé sur main `47841d9` → le cron en bénéficie). Surveiller : densité items (W25 a fait 3 ; cible 8-10), mix géo (`mix_drift`, W25 = 33% local), rendu brief (Gmail/Outlook), **0 balise `<cite>` dans les impacts + 0 emoji dans le recap** (fixes pré-flight `5401d78`). Si densité/mix insuffisants → Lot 3 « élargir sources ». → [[project_veille_trust_by_source_2026-06-23]].
- **[WATCH] Svelte 5 - `onDestroy` s'exécute en SSR (Vercel) mais pas en `vite preview`** : toute référence à `window`/`document`/`localStorage`/`setInterval` à cleanup DOIT passer par `$effect(() => { ...; return () => cleanup; })`. Toujours tester en preview branch Vercel pour les composants qui touchent window. Mémoire `feedback_svelte5_ondestroy_ssr_window_undefined.md`.
- **[WATCH] Trap Vercel `rollback` → alias prod verrouillé** : après `vercel rollback`, les `git push` buildent mais ne promeuvent PAS automatiquement. Vérifier via `vercel inspect filmpro-portail.vercel.app` (domaine canonique) que l'alias pointe sur le nouveau deploy.
- **[WATCH] Réactivation d'une source coupée en V5 (2026-06-07)** : flip de flag (`SIGNAUX_ZEFIX_ENABLED`, `config.prospection.sources.*.enabled`, `features.*`) → re-vérifier les contrôles d'origine (Zod, quota, rate-limit, anti-hallu) AVANT de rallumer en prod (le risque = la réactivation). Encodage Zefix corrigé (`decode-response.ts`). Réf `memory/audit_secu_2026-06-07_v5_signaux_prospection.md` § I-3.

→ Watch list complète (Signaux V4 perf/contrats S189, S188, S186, S178, S171) déplacée dans `archive/2026-05-28-pivot-mobile-v3.md`. Restent triables si l'objet redevient actuel.

### Livré (référence historique)

→ Livré V2 + sessions antérieures (S171→S192bis) dans `archive/` (`2026-05-28-pivot-mobile-v3.md`, `2026-05-25/13/10/09/08-sessions.md`).

