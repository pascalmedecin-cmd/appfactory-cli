# CRM FilmPro : CLAUDE.md

**Note migration** : ce fichier vit dans `CRM/CLAUDE.md` (path Vercel `rootDirectory: CRM`) ; container racine = stub. Contexte → `memory/project_appfactory_restructure.md`.

**Statut :** Portail FilmPro multi-outils en prod : CRM (`/crm`) + Découpe Films (`/decoupe`) sur `filmpro-portail.vercel.app`. Formation IA = projet autonome `Formation/` (`cc` option 5). Historique (V3 terrain, Signaux V4, golden v9, restructure S173-S174) → `archive/`.
**Dernière mise à jour :** 2026-06-26. **Bloc 0 reconciliation `main` LIVRÉ 26/06** : merge `deploy-campagnes-editeur` → `main` (`1065fb1`, 36 commits, tree byte-identique à la branche prod testée), poussé, **branche supprimée (local + origin)**. `main` = trunk unique à nouveau (flag `ffCrmListesV2` **ON `pascal@`+`antoine@`** → refonte 1+2+3 live). Prod web = `filmpro-portail.vercel.app` (déploiement Vercel immuable, inchangé par le merge ; futurs deploys depuis `main`). Vérif adversariale pré-push 4 lentilles 0 blocker ; 2310 tests + build + svelte-check 0/0 verts sur le merge. **Prochain bug :** #001.
**Session courante :** 2026-06-26 - **Bloc 0 reconciliation `main` LIVRÉ** (merge `1065fb1`, branche supprimée) + livraison non-veille antérieure (30 warnings svelte-check → 0, code mort retiré, bumps supabase 2.108 + TypeScript 6, cron veille avancé 04:27 suisse) + cron W26 confirmé. Tout désormais sur `main` (trunk unique). Antérieur (Vague 3.3 Dashboard `ebacea6`, Campagnes V3.2 `c905952`, éditeur veille `69cd968`) → § « Livré » + `archive/`. → [[project_module_campagnes_vague32_2026-06-22]] + [[project_editeur_veille_sources_editables_2026-06-24]].
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
- **Tests** : Vitest 2310 (dernier run vérifié 2026-06-26, avec supabase 2.108 + TS6) + Playwright e2e (suite + P1/P2/P3 Prospection). Accessibilité : focus trap + ConfirmModal partout, axe-core 0 violation modale P3. Sécurité : Zod sur 20 form actions/endpoints, rate limiting 10/min, headers CSP/XFO/referrer, timing-safe secrets

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

**Prochaine attaque** : **Bloc 2 Dependabot** (post-reconciliation, dégelé) - trier les 3 PR ciblant `main` : **#20** (minor-patch, CI rouge à diagnostiquer, cf. [[project_fix_deps_ci_vercel_2026-06-22]]), **#19** (`@types/node` 26 majeure, CI verte, à arbitrer via changelog), **#21** (`js-yaml` caduque → fermer). Puis Bloc 3 veille Lot 3, Bloc 1 Vague 4 (attend 3 inputs Pascal), Bloc 4 Daily Email (déployer/activer). **Bloc 0 reconciliation `main` LIVRÉ 26/06** (merge `1065fb1` + fix CI `756037a`, branche supprimée, trunk unique). Refonte CRM 1+2+3 déployée+activée prod (flag `ffCrmListesV2` ON fondateurs), prod = trunk `main`. → [[project_refonte_crm_cadrage_2026-06-18]].

> Cadrage commun refonte UX/UI CRM (validé 2026-06-18) → [[project_refonte_crm_cadrage_2026-06-18]] + golden `CRM/.product-architect/refonte-vague3/golden-vague3-v1.html` (validé Chrome).

### 0. Reconciliation `main` post-W26 (éditeur veille + Campagnes → trunk) [SUPERVISÉ • high • ~30 min]

- **Pourquoi** : prod web tourne sur `deploy-campagnes-editeur` (hors `main`) pour protéger le cron W26. Le merge passe le cron 120→238 sources → à faire APRÈS le run W26. → [[project_editeur_veille_sources_editables_2026-06-24]] + [[project_module_campagnes_vague32_2026-06-22]].
- **DÉBLOQUÉ 26/06** : cron W26 a tourné (run `28230794599`, success, reportId `6db7c0e1`) : **7 items** (W25=2 ; sous plancher 8 mais nette amélioration), local 71%, `keptByTrust=1`, 0 apiError. Emails brief (pascal+antoine)+recap enabled - confirmer en boîte. 120→238 ne change que W27 → reconciliation sûre.
- [x] ~~**[LIVRÉ 26/06]** Merger `deploy-campagnes-editeur` → `main`~~ - merge `1065fb1` (36 commits, tree **byte-identique** à la branche prod testée ; conflit `CLAUDE.md` résolu en faveur de la branche, `09f8137` superseded), poussé, **branche supprimée (local + origin)** + 2 branches features stale nettoyées (`campagnes-vague32`, `editeur-veille-sources`). **CI post-merge rouge au 1er run** : svelte-check `daily-email/+server.ts` **env-dependent** (passe en local via `.env.local` qui fournit `RESEND_API_KEY`, échoue en CI sans) → **fix cause-racine `756037a`** (narrowing explicite des 4 vars, reproduit + prouvé en local sans `.env.local`), **CI verte**. Vérif adversariale pré-push 4 lentilles 0 blocker ; 2310 tests + build + svelte-check verts. Résidu `CRM/.product-architect/daily-email/` laissé untracked (jamais `git add -A`). Findings audit éditeur veille (f7/f10/f14/f15/f16/f21 + 2 cadratins `app.css`) = dette mineure tracée. → [[feedback_svelte_check_env_dependent_dynamic_private]].

### 3. Veille - Lot 3 structurel (reste) [SUPERVISÉ • high • session dédiée]

- [ ] **[EXÉCUTABLE]** **Lot 3 - reste (optionnel)** : dashboard qualité + boucle feedback ; PDF de marque (`filmpro-pdf`) ; pont veille→action ; décomposer mono-appel LLM si plafond ; nettoyage enum RegBL. **Faisable maintenant** (PDF / pont / décompo / cleanup enum) ; seul le **dashboard qualité + boucle feedback** gagne à attendre la 1re mesure W26 (vendredi). → [[project_veille_sourcing_w26_2026-06-23]].

### 1. Vague 4 Emailing refonte CRM [SUPERVISÉ • xhigh • cascade]

- **Pourquoi** : toute la refonte Vagues 1+2+3 (3.1 Signaux + 3.2 Campagnes + 3.3 Dashboard) livrée + déployée + activée (25/06, flag `ffCrmListesV2` ON fondateurs). Reste l'emailing. → [[project-refonte-crm-cadrage-2026-06-18]] § Garde-fous emailing.
- [ ] **[EXÉCUTABLE]** **Vague 4 Emailing** (individuel → nLPD → groupé). Non codable tant que : (a) `send.filmpro.ch` vérifié Resend (DNS), (b) base légale nLPD + mention d'information validées, (c) 1er email réel décrit (réunion 3 fondateurs). **Pas lié à la veille → débloquée** : ces 3 prérequis sont des inputs côté Pascal (pas une dépendance système) ; dès qu'il les fournit, cadrage + code démarrent. → cadrage § Garde-fous emailing.

### 4. Module Daily Email - LIVRÉ + commité (prêt, gate OFF) [SUPERVISÉ • high]

- **LIVRÉ 26/06** (`d1db821`) : email quotidien des relances dues → 2 fondateurs, 100% déterministe (zéro LLM), gate `EMAIL_DAILY_ENABLED` OFF. Design Gouvernance + charte FilmPro (bandeau navy carré), weekly intact. 44 tests / 2310 verts / revue 4 lentilles 0 C/H. → [[project_daily_email_module_2026-06-25]] + [[audit_secu_2026-06-26_daily_email_module]].
- [ ] **[EXÉCUTABLE - reconciliation faite]** Le code est sur `main`. **Déployer** = `vercel deploy --prod` manuel (le prod actuel tourne déjà l'artefact validé ; redéployer enregistre le cron `daily-email` en env Vercel - no-op tant que gate OFF, zéro envoi). Puis **activer** quand feu vert : poser `EMAIL_DAILY_ENABLED=true` en env Vercel Prod (zéro redéploiement, lu via `$env/dynamic/private`). Avant ces 2 gestes : aucun envoi possible.

### 2. Suite hygiène deps/CI [MIXTE • medium • ~1h]

- **Livré 22/06** (PR #16 `b84b6f5`) : garde-fou CI + Dependabot durci + 6 bumps sûrs. **Ne JAMAIS `rm package-lock.json` pour bumper ce repo** (cause Vercel-fail = regen lockfile flote les transitifs). → [[project_fix_deps_ci_vercel_2026-06-22]].
- [ ] **[EXÉCUTABLE - dégelé (cron W26 fait), à traiter avec/après la reconciliation `main`]** **Trier les 3 PR Dependabot** (ciblent `main`). **Statut CI live (audité 26/06)** : **#20** (groupe minor-patch, 8 updates) = **CI ROUGE** (Vercel fail + `verify` fail 8s, probable lockfile/transitifs cf. [[project_fix_deps_ci_vercel_2026-06-22]]) → NE PAS merger en l'état, diagnostiquer ; **#19** (`@types/node` 26 majeure) = **CI verte** (à arbitrer, lire le changelog) ; **#21** (`js-yaml` 5 majeure) = **CADUQUE** (js-yaml retiré comme dep morte le 26/06 → **à fermer**, pas merger).
- [ ] **[EXÉCUTABLE]** **Migration socle SvelteKit (vite 8 / plugin-svelte 7 / kit 2.66)** : différée (rolldown + layerchart incompatibles, issues #928/#1313). Rouvrir quand clean : lever les `ignore` socle `dependabot.yml`, monter le trio groupé, CI verte.
- [x] ~~**Bumps supabase 2.108 + TypeScript 6 + 30 warnings svelte-check**~~ - LIVRÉ 26/06 (détail § « Livré cette session »). Reste smoke auth OTP manuel post-supabase. `@supabase/ssr` laissé à 0.10 (bump 0.12 = auth/session, séparé).

### Réserve (hors backlog actif)
- Chantier 3 portail (non cadré) ; durcissement RLS si 4e user ([[feedback_rls_multitenant_durcissement_si_4_users]]).
- **[SIGNAL]** knip liste ~30 `scripts/*` + `.product-architect/*` + `playwright.*.config.ts` + `tests/mint-session.mjs` comme « non importés » : **pas du code mort** (CLI-invoqués / specs / infra e2e), gardés. Archivables un jour si Pascal le décide (ex : `apply-*-migration` appliquées → `archive/`).

### Livré cette session

- [x] ~~**Bloc 0 reconciliation `main` (merge `deploy-campagnes-editeur` → trunk)**~~ - 2026-06-26 : merge `1065fb1` (36 commits, **tree byte-identique** à la branche prod testée ; conflit `CLAUDE.md` résolu version branche ; embarque tous les commits non-veille ci-dessous, désormais sur `main`), poussé, **branche supprimée local + origin** + 2 branches stale nettoyées. Vérif adversariale pré-push 4 lentilles **0 blocker** (secrets, fichiers parasites, intégrité merge, CI/CD+cron). **CI rouge au 1er run** (svelte-check env-dependent sur `daily-email/+server.ts`) → **fix `756037a`** (narrowing explicite, prouvé en local sans `.env.local`) → **CI verte** (run `28236454839`). → [[feedback_svelte_check_env_dependent_dynamic_private]].
- [x] ~~**Cron veille avancé 06:27 → 02:27 UTC** (04:27 suisse)~~ - 2026-06-26 (`cron-veille.yml`, sur `main` depuis la reconciliation) : absorbe le retard scheduler GitHub (2-4h) → brief le matin. Live pour W27.
- [x] ~~**Bump TypeScript 6**~~ - 2026-06-26 (`658a8f7`, non poussé) : 5.9.3 → 6.0.3, 0 erreur (codebase déjà conforme). svelte-check 0/0, 2310 tests, build OK.
- [x] ~~**Bump @supabase/supabase-js 2.108 + 7 fixes type**~~ - 2026-06-26 (`e420aca`, non poussé) : 2.101.1 → 2.108.2, `RejectExcessProperties` type-only via `TablesUpdate/Insert`. Reste smoke auth OTP manuel (Pascal).
- [x] ~~**Nettoyage code mort non-veille**~~ - 2026-06-26 (`2968107`+`a9b128b`, non poussé) : knip + grep par symbole. 3 fichiers + 5 devDeps + 2 symboles morts. Constat : codebase déjà propre (2/~100 vraiment morts). Veille intacte.
- [x] ~~**Nettoyage 30 warnings svelte-check → 0**~~ - 2026-06-26 (`3ae6209`, non poussé) : a11y (vrai fix + `svelte-ignore` justifié) + attribute_quoted + line-clamp + state_referenced_locally. 2310 tests.
→ Antérieurs archivés (Audit 360, Daily Email `d1db821`, Vague 3.3 `ebacea6`, Campagnes V3.2) → `archive/claude-md-crm-livre-2026-06-26.md`. Plus anciens (24/06-) → mémoires veille 06-22/23/24 + `archive/`.

### Watch list active après pivot

- **[WATCH] Refonte CRM 1+2+3 activée fondateurs (`ffCrmListesV2`)** : surfaces premium à surveiller à l'usage. **Bug 5 résiduel** : menu `...` slideout Signaux (ouverture vers le haut en conteneur scrollable), à corriger s'il re-saute. Rollback = flag OFF (`raw_app_meta_data`).
- **[WATCH] W26 a tourné 26/06 (success, 7 items, local 71%, keptByTrust=1)** : confirmer le rendu du brief en boîte (0 `<cite>`/emoji, qualité). **W27** = 1er run sur 238 sources (post-reconciliation Bloc 0) + nouvel horaire 02:27 UTC → surveiller densité/mix/horaire réel. → [[project_veille_sourcing_w26_2026-06-23]].
- **[WATCH] Svelte 5 `onDestroy` s'exécute en SSR Vercel** (pas en `vite preview`) : window/document/localStorage/setInterval à cleanup → `$effect(() => {...; return () => cleanup})`. Tester en preview branch. → `feedback_svelte5_ondestroy_ssr_window_undefined.md`.
- **[WATCH] Trap Vercel `rollback` → alias prod verrouillé** : après `vercel rollback`, les `git push` buildent mais ne promeuvent PAS automatiquement. Vérifier via `vercel inspect filmpro-portail.vercel.app` (domaine canonique) que l'alias pointe sur le nouveau deploy.
- **[WATCH] Réactivation d'une source coupée V5 (2026-06-07)** : flip de flag → re-vérifier les contrôles d'origine (Zod, quota, rate-limit, anti-hallu) AVANT de rallumer en prod. Réf `audit_secu_2026-06-07_v5_signaux_prospection.md` § I-3.

→ Watch list complète (Signaux V4 perf/contrats S189, S188, S186, S178, S171) déplacée dans `archive/2026-05-28-pivot-mobile-v3.md`. Restent triables si l'objet redevient actuel.

### Livré (référence historique)

→ Livré V2 + sessions antérieures (S171→S192bis) dans `archive/` (`2026-05-28-pivot-mobile-v3.md`, `2026-05-25/13/10/09/08-sessions.md`).

