# CRM FilmPro : CLAUDE.md

**Note migration** : ce fichier vit dans `CRM/CLAUDE.md` (path Vercel `rootDirectory: CRM`) ; container racine = stub. Contexte → `memory/project_appfactory_restructure.md`.

**Statut :** Portail FilmPro multi-outils en prod : CRM (`/crm`) + Découpe Films (`/decoupe`) sur `filmpro-portail.vercel.app`. Formation IA = projet autonome `Formation/` (`cc` option 5). Historique (V3 terrain, Signaux V4, golden v9, restructure S173-S174) → `archive/`.
**Dernière mise à jour :** 2026-06-26. **Reconciliation `main` + triage Dependabot complet LIVRÉS** : merge `deploy-campagnes-editeur` → `main` (`1065fb1`), branche supprimée, trunk unique ; Dependabot trié (#19 mergé, #22→8 bumps sûrs `b29fac4`, #20/#21/#23 fermées, svelte tenu 5.55.5 `dc1264c`), **0 PR ouverte**, CI verte. Flag `ffCrmListesV2` **ON `pascal@`+`antoine@`** → refonte 1+2+3 live. Prod = `filmpro-portail.vercel.app` (deploy Vercel immuable, futurs deploys depuis `main`). **Mails de plantage : racine coupée (Bloc A LIVRÉ `f357e68`)** : preview Vercel des PR Dependabot désactivées (`vercel.json` → `git.deploymentEnabled {"dependabot/**": false}`, minimatch globstar vérifié source primaire + minimatch réel du projet) + patch socle gelé (`dependabot.yml`) + 4 branches stale supprimées → trunk = `main` seule. CI `f357e68` vert, 0 PR ouverte. **Prochain bug :** #001.
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

**Prochaine attaque** : **Bloc B - Daily Email : déploiement prod + activation** (deploy = `vercel deploy --prod` enregistre le cron, no-op gate OFF ; activation = `EMAIL_DAILY_ENABLED=true` env Vercel, **bloquée feu vert Pascal**). **Séquence de clôture du projet refonte CRM** : ~~A~~ → **B** (Daily Email deploy) → C (Lot 3 optionnel) → **D (audit UI 360 = porte de clôture avant livraison)**. **Bloc A LIVRÉ `f357e68`** (mails de plantage coupés à la racine). Refonte Vagues 1+2+3 livrée + déployée + activée prod (flag `ffCrmListesV2` ON fondateurs), prod = trunk `main`. → [[project_refonte_crm_cadrage_2026-06-18]] + [[project_bloc_a_mails_plantage_2026-06-26]].

> Cadrage refonte UX/UI CRM (validé 2026-06-18) + golden `CRM/.product-architect/refonte-vague3/golden-vague3-v1.html` → [[project_refonte_crm_cadrage_2026-06-18]]. **1 bloc = 1 session autonome.** Séquence : A → B → C → D (porte de clôture).

### 1. Bloc B - Daily Email : déploiement prod + activation [SUPERVISÉ • medium • court]

- Code sur `main` (`d1db821`), 100% déterministe, gate `EMAIL_DAILY_ENABLED` OFF. → [[project_daily_email_module_2026-06-25]] + [[audit_secu_2026-06-26_daily_email_module]].
- [ ] **[EXÉCUTABLE]** **Déployer** = `vercel deploy --prod` (enregistre le cron `daily-email` en env Vercel - no-op tant que gate OFF, zéro envoi).
- [ ] **[BLOQUÉ - feu vert Pascal sur activation]** **Activer** = poser `EMAIL_DAILY_ENABLED=true` en env Vercel Prod (zéro redéploiement, lu via `$env/dynamic/private`). Avant ces 2 gestes : aucun envoi possible.

### 2. Bloc C - Veille Lot 3 structurel (reste, optionnel) [AUTO • high • session dédiée]

- [ ] **[EXÉCUTABLE]** PDF de marque (`filmpro-pdf`) ; pont veille→action ; décomposer le mono-appel LLM si plafond ; nettoyage enum RegBL. **Faisables maintenant.** Le **dashboard qualité + boucle feedback** gagne à attendre la 1re mesure W27. → [[project_veille_sourcing_w26_2026-06-23]].

### 3. Bloc D - Audit UI 360 final (PORTE DE CLÔTURE avant livraison complète) [SUPERVISÉ • xhigh • session dédiée]

- **Skill** : `audit-uiux` (+ golden standards `golden-standard`). Annoncé au plan (couche skill).
- [ ] **[EXÉCUTABLE]** Audit 360 de **toute la refonte** (Signaux, Pipeline, Entreprises, Prospection, Campagnes, Dashboard temporel, Éditeur veille) : vérifier que chaque écran est **propre, 100% fonctionnel**, conforme aux golden standards. Inclure : **zéro code mort** (knip + grep par symbole), **zéro fichier orphelin** (`cockpit/bin/detect_session_residues.py` + revue `.product-architect/`, `scripts/`). **Fixer tous les findings (no-debt)**. C'est la porte avant de déclarer le projet refonte CRM **clos**.

### 4. Bloqués - Vague 4 emailing + migration socle (dépendances réelles, pas dette active) [SUPERVISÉ • xhigh • bloqué]

- [ ] **[BLOQUÉ - 3 inputs Pascal]** **Vague 4 Emailing** (individuel → nLPD → groupé) : (a) DNS `send.filmpro.ch` vérifié Resend, (b) base légale nLPD + mention d'information validées, (c) 1er email réel décrit (réunion 3 fondateurs). Dès fourniture → cadrage + code (pas une dépendance système). → cadrage § Garde-fous emailing.
- [ ] **[BLOQUÉ - amont rolldown/layerchart]** **Migration socle SvelteKit (vite 8 / plugin-svelte 7 / kit 2.66)** : issues amont #928/#1313 ouvertes. Rouvrir quand l'amont est clean : lever les `ignore` socle `dependabot.yml`, monter le trio groupé, CI verte. **Ne JAMAIS `rm package-lock.json`** (regen flote les transitifs). → [[project_fix_deps_ci_vercel_2026-06-22]].

### Réserve (hors backlog actif)
- Chantier 3 portail (non cadré) ; durcissement RLS si 4e user ([[feedback_rls_multitenant_durcissement_si_4_users]]).
- **[SIGNAL]** knip liste ~30 `scripts/*` + `.product-architect/*` + `playwright.*.config.ts` + `tests/mint-session.mjs` comme « non importés » : **pas du code mort** (CLI-invoqués / specs / infra e2e), gardés. Archivables un jour si Pascal le décide (ex : `apply-*-migration` appliquées → `archive/`).

### Livré cette session

- [x] ~~**Bloc A - couper les mails de plantage à la racine (Vercel previews Dependabot + gel patch socle + branches stale)**~~ - 2026-06-26 (ultracode/xhigh) : commit `f357e68` poussé sur `main`, CI **vert** (svelte-check + 2310 Vitest + build). (1) `vercel.json` → `git.deploymentEnabled {"dependabot/**": false}` : coupe les preview deploys aveugles des PR Dependabot (source des mails « preview failed »). **Globstar prouvé** déterministiquement (minimatch réel du projet : `**` bloque les branches multi-segments `dependabot/npm_and_yarn/CRM/...`, `*` simple ne matche pas) ET par source primaire (doc Vercel « Use minimatch syntax » + changelog granular branch matching). (2) `dependabot.yml` → gel du **patch** socle (vite, @sveltejs/vite-plugin-svelte, @sveltejs/kit, svelte-check ; svelte déjà gelé) + commentaires alignés : un patch socle suffit à casser le build. (3) 4 branches stale supprimées (`portail-session-1`, `veille-preflight-qa-cite-emoji`, `veille-w25-qualite-selection`, `chore/deps-ci-hygiene` - toutes vérifiées mergées/squashées dans `main`) → **trunk = `main` seule**. (4) résidu `daily-email/preview-daily-email.html` gitignoré (pattern decoupe). **Vérif adversariale 3 lentilles (Vercel glob / Dependabot ignore / collatéral) : 0 blocker.** Régime live exercé : push a ré-appliqué le config, runs Dependabot Updates **success, 0 PR ouverte**. Branch protection `main` 404 + rulesets vides = aucun check Vercel requis (bonnes PR Dependabot mergeables). **Observation** (hors scope) : Dependabot security updates **OFF** sur le repo. → [[project_bloc_a_mails_plantage_2026-06-26]].
- [x] ~~**Bloc 0 reconciliation `main` (merge `deploy-campagnes-editeur` → trunk)**~~ - 2026-06-26 : merge `1065fb1` (36 commits, **tree byte-identique** à la branche prod testée ; conflit `CLAUDE.md` résolu version branche ; embarque tous les commits non-veille ci-dessous, désormais sur `main`), poussé, **branche supprimée local + origin** + 2 branches stale nettoyées. Vérif adversariale pré-push 4 lentilles **0 blocker** (secrets, fichiers parasites, intégrité merge, CI/CD+cron). **CI rouge au 1er run** (svelte-check env-dependent sur `daily-email/+server.ts`) → **fix `756037a`** (narrowing explicite, prouvé en local sans `.env.local`) → **CI verte** (run `28236454839`). → [[feedback_svelte_check_env_dependent_dynamic_private]].
- [x] ~~**Bloc 2 Dependabot - triage complet**~~ - 2026-06-26 : **#19** `@types/node` 26 mergé (vert, dev-only, `fcf6cd1`) ; **#22** groupe → **8 bumps sûrs** appliqués chirurgicalement depuis le lockfile sain (`b29fac4`, jamais `rm lockfile`), svelte exclu ; **#20/#21/#23** fermées ; **svelte tenu exact 5.55.5** (`dc1264c`, 5.55.10 casse le build avec le plugin tenu). **0 PR ouverte**, trunk vert, `npm ci` propre + 2310 tests + build vérifiés. Reste (Bloc A) : couper les preview Vercel Dependabot + geler le socle (la racine des mails de plantage). → [[feedback_svelte_patch_coupled_vite_plugin]].
- [x] ~~**Non-veille 26/06 (cron veille 02:27 UTC, TS6 `658a8f7`, supabase 2.108 `e420aca`, code mort, 30 warnings→0)**~~ - 2026-06-26 : tous **embarqués dans la reconciliation `1065fb1`** (donc sur `main`), détail en git + entrée reconciliation. Reste smoke auth OTP manuel post-supabase (Pascal).
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

