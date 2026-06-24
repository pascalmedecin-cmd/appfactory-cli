# CRM FilmPro : CLAUDE.md

**Note migration** : ce fichier vit dans `CRM/CLAUDE.md` (path Vercel `rootDirectory: CRM`) ; container racine = stub. Contexte → `memory/project_appfactory_restructure.md`.

**Statut :** Portail FilmPro multi-outils en prod : CRM (`/crm`) + Découpe Films (`/decoupe`) sur `filmpro-portail.vercel.app`. Formation IA = projet autonome `Formation/` (`cc` option 5). Historique (V3 terrain, Signaux V4, golden v9, restructure S173-S174) → `archive/`.
**Derniere mise a jour :** 2026-06-24. Veille cron sur main `6f8de17` (presse romande + règle traduction, W26) ; web prod inchangé (flag `ffCrmListesV2` OFF). **Prochain bug :** #001.
**Session courante :** 2026-06-24 (session 9) - **Éditeur veille étapes 4 + 5 livrées** (branche `editeur-veille-sources`, reste étape 6 = migration + déploiement). Étape 4 (`f547e7c`) section sources du prompt depuis le bundle ; 5a (`5c213d6`) régime calculé ; 5b (`c39d832`+`3109f4b`) UI route `/crm/veille/editeur` 2 onglets, vérif adversariale **sécu 0 C/H/M**. **2165 tests verts, svelte-check 0.** ⚠ Page non rendue avant migration `veille_sources` appliquée ; branche non déployée, prod + cron W26 intacts. Détail → [[project_editeur_veille_sources_editables_2026-06-24]] + [[audit_secu_2026-06-24_editeur_veille_etape5]]. WIP Campagnes 3.2 → [[project_module_campagnes_vague32_2026-06-22]].
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
- **Tests** : Vitest 2085 (dernier run vérifié 2026-06-23, +4 cross-check trust-by-source) + Playwright e2e (suite + P1/P2/P3 Prospection). Accessibilité : focus trap + ConfirmModal partout, axe-core 0 violation modale P3. Sécurité : Zod sur 20 form actions/endpoints, rate limiting 10/min, headers CSP/XFO/referrer, timing-safe secrets

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

**Prochaine attaque** : **Éditeur de la veille - étape 6/6 (clôture + déploiement)** : appliquer la migration `veille_sources` (jamais exécutée) → débloque le rendu de la page editeur → validation visuelle Chrome + retrait hardcode runtime + QA 360 + déploiement. Détail dans le bloc 0 ci-dessous. **Reprendre depuis la branche `editeur-veille-sources`** (étapes 1-5 livrées là). Campagnes 3.2 (branche `campagnes-vague32`) en attente derrière.

> Cadrage commun refonte UX/UI CRM (validé 2026-06-18) → [[project_refonte_crm_cadrage_2026-06-18]] + golden `CRM/.product-architect/refonte-vague3/golden-vague3-v1.html` (validé Chrome).

### 0. Éditeur de la veille (étape 6/6) [SUPERVISÉ • xhigh • cascade pas-à-pas]

- **Pourquoi** : page Éditeur 2 onglets, mockup **v2 VALIDÉ**. Objectif Pascal : **zéro source en dur**, tests régression abo (jamais clé API). **Payload** (plan 6 étapes, décisions UI, schéma, archi étapes 2-5 + audits) → [[project_editeur_veille_sources_editables_2026-06-24]].
- **Fait** : étapes 1-5 livrées 24/06 (seed 238 + loader + moteur branché + prompt depuis bundle + régime calculé + UI editeur 2 onglets, **sécu 0 C/H/M**). 2165 verts. ⚠ Page non rendue tant que migration non appliquée. → [[audit_secu_2026-06-24_editeur_veille_etape5]].
- [x] ~~**Étapes 4 + 5** : prompt depuis bundle + régime calculé + UI editeur 2 onglets + bouton « Éditeur »~~ - 2026-06-24 (`f547e7c`/`5c213d6`/`c39d832`/`3109f4b`). 2 vérifs adversariales (4× + 3× lentilles), sécu 0 C/H/M, findings clos no-debt. Flags advocacy/preprint/denylist seed-only v1.
- [ ] **[EXÉCUTABLE]** **Étape 6** : appliquer migration `veille_sources` (jamais exécutée) + `supabase gen types` ; validation visuelle Chrome + UI/UX audit du rendu (impossible avant migration) ; retrait hardcode `source-allowlist` runtime (filet ou supprimé - question ouverte) ; QA 360 + déploiement. **La migration DOIT partir AVEC le code** (le bouton « Éditeur » lit la table).

### 3. Veille - Lot 3 structurel (reste) [SUPERVISÉ • high • session dédiée]

- [ ] **[BLOQUÉ - après mesure W26+]** **Lot 3 - reste (optionnel)** : dashboard qualité + boucle feedback ; PDF de marque (`filmpro-pdf`) ; pont veille→action ; décomposer mono-appel LLM si plafond ; nettoyage enum RegBL. → [[project_veille_sourcing_w26_2026-06-23]]. (Veille W26/W25 livrés 23/06, voir mémoires veille.)

### 1. Vague 3 (suite) + Vague 4 refonte CRM [SUPERVISÉ • xhigh • cascade par chantiers]

- **Pourquoi** : golden Vague 3 validé Chrome (3 écrans). Chantier 3.1 Signaux + export CSV Prospection livrés. Reste Campagne, Dashboard, Emailing.
- **Payload** → cadrage [[project-refonte-crm-cadrage-2026-06-18]] + golden `CRM/.product-architect/refonte-vague3/golden-vague3-v1.html` + audits [[audit-secu-2026-06-19-vague3-export-csv]] + [[audit-secu-2026-06-19-vague3-signaux-actions]].
- **Fait** : golden validé ; chantier 3.1 Signaux (`5e0c369`) + export CSV Prospection (`6626818`), flag OFF non déployé, revues 0 C/H/M.
- [ ] **[EXÉCUTABLE]** **Vague 3.2 Module Campagnes (N-N) - backend FAIT, reste l'UI** : migration prod LIVE + module + endpoints + 37 tests **commités sur branche `campagnes-vague32` (`3e27c49`), pas mergés** (reprendre depuis la branche). RESTE : modale import + Phase 5 (filtre relationnel, colonne liste, fiche, écran `/crm/campagnes`, sidebar ; `redesign-skill`) + Phase 6 (revues + flag ON). Décisions/file:line/pièges → **Payload** [[project_module_campagnes_vague32_2026-06-22]].
- [ ] **[EXÉCUTABLE]** **Vague 3.3 Dashboard temporel** : refonte `/crm/+page.svelte` façon Capsule (En retard / Aujourd'hui / Cette semaine + fil d'activité « Ce qui s'est passé »), flag `ffCrmListesV2`, golden validé.
- [ ] **[BLOQUÉ - prérequis externes Pascal]** **Vague 4 Emailing** (individuel → nLPD → groupé). Non codable tant que : (a) `send.filmpro.ch` vérifié Resend (DNS), (b) base légale nLPD + mention d'information validées, (c) 1er email réel décrit (réunion 3 fondateurs). → cadrage § Garde-fous emailing.
- [ ] **[EXÉCUTABLE - décision Pascal]** **Déployer la refonte CRM** (Vagues 1+2+3) : codé/commité, **jamais activé**. `vercel deploy --prod` puis flip flag JWT `ff_crm_listes_v2` + smoke prod feature-flag (ordre deploy→flag, alias via `vercel inspect`, cf. [[feedback_smoke_prod_feature_flag_livraison]]). **Au flip : vérifier le menu `...` du slideout Signaux** (Bug 5 résiduel : ouverture vers le haut en conteneur scrollable).

### 2. Suite hygiène deps/CI + veille (livré 22/06, reste différés documentés) [EXÉCUTABLE]

- **Livré 22/06** (PR #16 `b84b6f5`) : garde-fou CI + Dependabot durci + 6 bumps sûrs. **Ne JAMAIS `rm package-lock.json` pour bumper ce repo** (cause Vercel-fail = regen lockfile flote les transitifs). → [[project_fix_deps_ci_vercel_2026-06-22]].
- [ ] **[EXÉCUTABLE]** **Trier les 3 PR Dependabot régénérées** (sortie ATTENDUE de la nouvelle config, ~2 min post-merge) : **#20** (groupe patch dont vite/svelte patches socle autorisés → merger si CI verte = preuve du gate) ; **#19** (`@types/node` 26 majeure) + **#21** (`js-yaml` 5 majeure) à arbitrer.
- [ ] **[EXÉCUTABLE]** **Migration socle SvelteKit (vite 8 / plugin-svelte 7 / kit 2.66)** : différée (rolldown + layerchart incompatibles, issues #928/#1313). Rouvrir quand clean : lever les `ignore` socle `dependabot.yml`, monter le trio groupé, CI verte.
- [ ] **[EXÉCUTABLE]** **Bump @supabase/* 2.108 + typescript 6** : différés. supabase = 6 erreurs type `RejectExcessProperties` (insert/update : photos, enrichir-batch, search-ch, triage, visits, entreprises) + smoke auth OTP réel. typescript 6 = trier les erreurs.

### Réserve (hors backlog actif)
- Chantier 3 portail (non cadré) ; durcissement RLS si 4e user ([[feedback_rls_multitenant_durcissement_si_4_users]]).

### Livré cette session

- [x] ~~**Éditeur veille étape 5/6 : UI 2 onglets + régime calculé**~~ - 2026-06-24 (`5c213d6`/`c39d832`/`3109f4b`) : route `/crm/veille/editeur` (Thèmes + Sources, mockup v2) ; régime calculé (lecture seule) ; vérif 3 lentilles sécu 0 C/H/M, findings clos (thème né inactif fixé, badge régime par-ligne, toggle resync). 2165 verts. → [[audit_secu_2026-06-24_editeur_veille_etape5]].
- [x] ~~**Éditeur veille étape 4/6 : section sources du prompt depuis le bundle**~~ - 2026-06-24 (`f547e7c`) : `buildSourcesPromptSection` (groupé par famille) ; dérive 120→238 corrigée (`glass-for-europe.eu` mort retiré) ; vérif 4× PASS. → [[project_editeur_veille_sources_editables_2026-06-24]].
- [x] ~~**Éditeur veille étape 3/6 : moteur branché sur le bundle**~~ - 2026-06-24 (`5af0cbd`) : `loadSourcesBundle` threadé generate+cross-check+addItem ; fallback seed=code, 0 régression. → [[project_editeur_veille_sources_editables_2026-06-24]].
- [x] ~~**Éditeur veille étape 2/6 : sources-loader + classifieur**~~ - 2026-06-24 (`13db5b5`) : politique régime factorisée code↔DB, équivalence `domainRegime` byte-identique. → [[project_editeur_veille_sources_editables_2026-06-24]].
- [x] ~~**Éditeur veille étape 1/6 + mockup v2 + presse romande W26 + bouton supprimer thèmes**~~ - 2026-06-24 (`6f8de17`) : table+seed 238+repo+tests ; mockup validé ; +9 sources presse + règle traduction (main, cron W26) ; `deleteTheme`+UI. → [[project_editeur_veille_sources_editables_2026-06-24]].
→ Livrés 23/06 (W26, W25, pré-flight QA, Campagnes 3.2 backend) + antérieurs → mémoires veille 06-23 + `archive/`.

### Watch list active après pivot

- **[WATCH] W26 (vendredi 26/06) = 1er run cron sur le nouveau sourcing (`9bef41b`) + 1er brief brandé réel antoine@**. Surveiller GHA : `keptByTrust`/`keptByTrustTitles`, densité (cible 8-12, W25=2), part locale (↑ vs 33%), 0 `<cite>`/emoji/underscore. **NB : les sources presse cantonales/frontalières de cette session ne seront sur W26 que si déployées avant vendredi.** → [[project_veille_sourcing_w26_2026-06-23]].
- **[WATCH] Svelte 5 `onDestroy` s'exécute en SSR Vercel** (pas en `vite preview`) : window/document/localStorage/setInterval à cleanup → `$effect(() => {...; return () => cleanup})`. Tester en preview branch. → `feedback_svelte5_ondestroy_ssr_window_undefined.md`.
- **[WATCH] Trap Vercel `rollback` → alias prod verrouillé** : après `vercel rollback`, les `git push` buildent mais ne promeuvent PAS automatiquement. Vérifier via `vercel inspect filmpro-portail.vercel.app` (domaine canonique) que l'alias pointe sur le nouveau deploy.
- **[WATCH] Réactivation d'une source coupée V5 (2026-06-07)** : flip de flag → re-vérifier les contrôles d'origine (Zod, quota, rate-limit, anti-hallu) AVANT de rallumer en prod. Réf `audit_secu_2026-06-07_v5_signaux_prospection.md` § I-3.

→ Watch list complète (Signaux V4 perf/contrats S189, S188, S186, S178, S171) déplacée dans `archive/2026-05-28-pivot-mobile-v3.md`. Restent triables si l'objet redevient actuel.

### Livré (référence historique)

→ Livré V2 + sessions antérieures (S171→S192bis) dans `archive/` (`2026-05-28-pivot-mobile-v3.md`, `2026-05-25/13/10/09/08-sessions.md`).

