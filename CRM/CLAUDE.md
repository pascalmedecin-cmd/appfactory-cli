# CRM FilmPro : CLAUDE.md

**Note migration** : ce fichier vit dans `CRM/CLAUDE.md` (path Vercel `rootDirectory: CRM`) ; container racine = stub. Contexte → `memory/project_appfactory_restructure.md`.

**Statut :** Portail FilmPro multi-outils en prod : CRM (`/crm`) + Découpe Films (`/decoupe`) sur `filmpro-portail.vercel.app`. Formation IA = projet autonome `Formation/` (`cc` option 5). Historique (V3 terrain, Signaux V4, golden v9, restructure S173-S174) → `archive/`.
**Dernière mise à jour :** 2026-07-02 (panneau prospects Campagnes + fix étiquetage `c7efdd4` → § Livré ; refonte 3 lots la veille → [[project_refonte_signaux_prospects_campagnes_2026-07-01]]). Trunk = `main` ; Flag `ffCrmListesV2` **ON `pascal@`+`antoine@`**. Prod = `filmpro-portail.vercel.app` (push `main` auto-déploie, intermittent - cf. Watch). **À FAIRE Pascal** : smoke OTP (workflow prospect + panneau Campagnes + 16 leads Mailing Commerces). **Prochain bug :** #001.
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

- **CSP `unsafe-inline` (L-02)** : prérequis de l'hydratation SvelteKit (scripts/styles inline runtime) ; retrait = refactor nonce. Risque XSS **acceptable** (mono-tenant ≤ 10 admins @filmpro.ch OTP, 0 UGC, sorties échappées `esc()`/`escapeHtml`). À revisiter si option nonce-based simple ou surface UGC.
- **RLS « mono-tenant plat » (L-03/L-04)** : ~11 tables `FOR ALL TO authenticated USING (true)` = tout authentifié voit/modifie tout. **Décision assumée** (S127 : 3 fondateurs symétriques). **À DURCIR avant un 4e user non-fondateur** (`created_by = auth.uid()` + tests RLS intégration). → [[feedback_rls_multitenant_durcissement_si_4_users]] + § RISQUES OUVERTS (M-48).

---

## INFRA EN PLACE

- **Prod** : https://filmpro-portail.vercel.app (Vercel : **git integration auto-déploie `main` en prod à chaque push**, vérifié live 26/06 ; `vercel deploy --prod` reste dispo en manuel) ; ancienne `filmpro-crm.vercel.app` conservée et redirigée 308 → nouvelle (hook). Supabase EU (projet `appfactory`, 10+ tables, RLS active, service role key configurée)
- **Auth** : OTP email 6 chiffres @filmpro.ch + session 7 jours httpOnly ; SMTP Resend (domaine verifié, free plan)
- **APIs** : Zefix REST + search.ch + fal.ai Flux 1.1 Pro Ultra (partage clé avec Enseignement) - Pexels/Unsplash supprimés S67
- **Crons** : **6 crons Vercel** `/api/cron/{signaux,alertes,lead-rescore,daily-email,intelligence-archive,nettoyage-crm}` sécurisés `CRON_SECRET` + service role. La **veille hebdo NE tourne PAS en cron Vercel** : GitHub Actions vendredi (cap durée Vercel). Le cron `intelligence` (génération veille) n'existe plus ; `media-enrich` supprimé S67.
- **Tests** : Vitest 2379 (dernier run vérifié 2026-07-02, panneau prospects + étiquetage import ; supabase 2.108 + TS6) + Playwright e2e (suite + P1/P2/P3 Prospection). Accessibilité : focus trap + ConfirmModal partout, axe-core 0 violation modale P3. Sécurité : Zod sur 20 form actions/endpoints, rate limiting 10/min, headers CSP/XFO/referrer, timing-safe secrets

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

**Prochaine attaque** : **Emailing prospection automatisée** (à cadrer avec Pascal - seul item de backlog dev restant). **Refonte CRM 3 lots COMPLÈTE et LIVRÉE PROD** : Lot 1 Signaux `db6182e`, Lot 2 Prospects+Pipeline `aff32cd`/`28b4848`, **Lot 3 Campagnes** (migration `campagnes.statut` appliquée prod en transaction : 2 campagnes → en_cours, 0 backfill nécessaire). Specs → [[project_refonte_signaux_prospects_campagnes_2026-07-01]]. **Geste Pascal** : smoke OTP prod (workflow prospect + page Campagnes Lot 3 : contrôle statut, bouton « Trouver des prospects », badge statut en prospection).

### Règle backlog (WIP-limité, gravée 2026-06-28)

Le « **backlog dev** » ne liste QUE l'actionnable-par-Claude **sans dépendance externe** ; le reste rangé à part (gestes Pascal → § Chez Pascal ; attentes datées → § Parking ; idées → Watch, jamais une tâche). **No-debt strict** : un finding se fixe/tranche dans la session, jamais différé. Anti-pattern banni : « 1 fermée → 2 ouvertes ». **Titre d'un item bloqué = explicite** : `[BLOQUÉ - {qui/quoi débloque}] {action claire}`, jamais cryptique. Détail + exemples → [[feedback_backlog_wip_anti_gonflement]]. **État 2026-07-02** : baseline saine (2379 verts, build OK ; +10 tests panneau prospects/étiquetage import).

### Backlog dev (actionnable par Claude)

- [ ] **[EXÉCUTABLE]** Emailing prospection automatisée : moteur d'envoi automatisé de séquences d'emails aux prospects (Resend, **templates pré-rédigés, zéro LLM** - règle dure). Étape 1 = cadrage court Pascal (contenu/cible/séquence/fréquence/déclencheur, **pas de réunion**), puis 1 session de code + gate ON/OFF (**OFF par défaut**). **Gate de mise en prod** (pas avant le dev) : (a) DNS `send.filmpro.ch` Resend, (b) base légale nLPD + mention, (c) contenu validé. (Ex-« Vague 4 ».)

### Chez Pascal (hors backlog dev - gestes manuels, quand tu veux)

- [ ] **[BLOQUÉ - toi : 1 login OTP en prod]** Faire le smoke OTP de production end-to-end (@filmpro.ch ; boot + login OK). Pages à vérifier : **Signaux refondu (`/crm/signaux` -> ouvrir un signal -> bouton « Statut » À suivre/Archivé + lien « Voir sur SIMAP », livré ce jour `db6182e`)**, Étiquettes, Centre d'aide, PDF Découpe, graphes layerchart. **Si KO → `vercel rollback`** (la migration Signaux se remappe).
- [ ] **[BLOQUÉ - toi : poser 1 variable Vercel après le smoke OTP]** Allumer l'envoi du Daily Email : `EMAIL_DAILY_ENABLED=true` en env Vercel Prod (zéro redéploiement, gate OFF = 0 envoi). → [[project_daily_email_module_2026-06-25]].

### Parking (attente datée - rien à faire avant la date)

**Vide.** (Dashboard qualité veille **retiré 2026-06-29** sur décision Pascal : il surveille le contenu de la veille manuellement chaque semaine et revient si besoin - pas d'écran webapp, pas de tâche, pas de watch.)

### Coupé du backlog (→ watch, plus des tâches)

- Chantier 3 portail : non cadré = pas une tâche (recadrer si l'objet redevient actuel).
- Durcissement RLS : conditionnel à un 4e user non-fondateur (inexistant) → [[feedback_rls_multitenant_durcissement_si_4_users]].
- knip : `apply-*-migration` archivables (cosmétique, cadré `6c477cf`) + 1 faux positif assumé `MINUTE_MS|RATE_LIMIT_WINDOW_MS` (deux exports live/intentionnels, audit L-18, **ne pas ré-investiguer**). Types morts veille `Theme`/`SearchTerm`/`LegacySearchTerm` soldés 30/06. → [[feedback_knip_verify_grep_before_delete]].
- Time-box session Supabase : geste Dashboard one-shot remis à Pascal, **non-faille** (le délog 7 j app suffit, prouvé prod) → pas une dette (procédure : Sessions → « Time-box user sessions » 168 h + « Detect refresh token reuse » ON). → [[audit_secu_2026-06-29_session_delog_7j]].
### Livré cette session

- [x] ~~**Campagnes : panneau prospects in-page + fix étiquetage import (incident 16 leads)**~~ - 2026-07-02 (**LIVRÉ PROD** `c7efdd4`). Panneau latéral « Prospects de la campagne » (compteur/nom/menu → SlideOut : liste, filtre accents, retrait inline, footer Prospection en choix) = fin des A/R obligés. Incident 16 leads Google non attachés : repro locale = chemin nominal correct, cause indéterminable (logs expirés) → étiquetage jamais silencieux (lot ENTIER au ré-import, retry, `campagneWarning` sur chaque chemin, bannières truthful/persistante) + **16 liens prod réparés** (lib pg). FAB z 90→35. 2379 verts (+10), bug-hunter 1H/1M/5L TOUS corrigés, sécu 0 C/H/M. → [[project_campagnes_panneau_prospects_fix_etiquetage_2026-07-02]] + [[audit_secu_2026-07-02_campagnes_panneau_etiquetage]] (verbatim : `archive/claude-md-crm-livre-2026-07-02.md`).
- [x] ~~**Lot 3 - Campagnes : cycle de vie + recherche embarquée + refonte page + badge prospection**~~ - 2026-07-01 (**LIVRÉ PROD** `6c0dc71`, migration `campagnes.statut` prod OK). Statut En cours/Active (migration prouvée postgres réel, source unique `CAMPAGNE_STATUTS`), « Trouver des prospects » par campagne (preset + import auto-étiqueté), refonte page (onglet « Ouvertes », statut inline segmenté), badge fusée en prospection. Revue 6 agents 0 C/H/M, 2369 verts. → [[project_refonte_signaux_prospects_campagnes_2026-07-01]] + [[audit_secu_2026-07-01_lot3_campagnes]].
- [x] ~~**Lot 2 - Prospects + Pipeline**~~ - 2026-07-01 (**LIVRÉ PROD** `aff32cd`+`28b4848`). Statut prospect vide/a_contacter/ecarte/transfere ; migration remap + `opportunites.prospect_lead_id` + RPC `mark_lead_for_contact` atomique + backfill + `transfer_lead_to_crm` FOR UPDATE (postgres réel) ; UI sidepane 2 boutons + Réactiver, pipeline « Convertir client ». Audit 14 agents 0 H/C. → [[project_refonte_signaux_prospects_campagnes_2026-07-01]] + [[audit_secu_2026-07-01_lot2_prospects_pipeline]].
- [x] ~~**Réparer stack Supabase local**~~ - 2026-07-01 (`7e21a18`). Format `YYYYMMDD_NNN` cassait le tracking version CLI → 42 migrations renommées 14 chiffres + analytics off (Colima). From-scratch validé, ports 127.0.0.1. A permis de prouver la DB des Lots 2/3 sur postgres réel.
- [x] ~~**Lot 1 - Refonte Signaux**~~ - 2026-07-01 (**LIVRÉ PROD** `db6182e`). Retrait « Créer opportunité »/« Modifier » ; bouton Statut À suivre/Archivé + Supprimer ; statuts nouveau/a_suivre/archive (migration prod) ; lien SIMAP `project-detail/{source_id}`. Audit 19 agents 0 C/H/M. → [[project_refonte_signaux_prospects_campagnes_2026-07-01]] + [[audit_secu_2026-07-01_signaux_statut_lot1]].
→ Antérieurs (Étiquettes page dédiée `e263240` 01/07 → [[project_etiquettes_destinataire_page_dediee_2026-07-01]] + `archive/claude-md-crm-livre-2026-07-02.md` ; Centre d'aide `d402fe7` + Découpe `0af198d` 30/06 → [[project_refonte_aide_crm_2026-06-30]] / [[project_decoupe_refonte_ui_2026-06-30]] ; Fix session 7j `c7545ed` 29/06 ; Bloc B vite 8 `e75919d`, Bloc A `4b3974e` 28/06 ; Bloc D `cd5426e` ; veille pont/PDF `b767056` 26/06 ; Daily Email `d1db821`) → `archive/claude-md-crm-livre-2026-06-26.md`.

### Watch list active après pivot

- **[WATCH] Smoke OTP Pascal (06-30→07-02)** : vérifier en prod Lot 2 (`aff32cd`), Signaux (`db6182e`), Étiquettes (`e263240`), Aide (`d402fe7`), Découpe (`0af198d`), **panneau prospects Campagnes (`c7efdd4`)** : clic « N prospects » → panneau sans navigation ; « Mailing Commerces - Vernis solaire » = **16 prospects réparés**. Rollback = flag OFF ou `vercel rollback`. → [[project_refonte_signaux_prospects_campagnes_2026-07-01]] + [[project_campagnes_panneau_prospects_fix_etiquetage_2026-07-02]].
- **[WATCH] Récidive « importé mais non attaché » (2026-07-02)** : la cause exacte de l'incident des 16 leads reste indéterminée (repro locale = chemin nominal correct ; logs prod expirés). Depuis `c7efdd4`, tout non-étiquetage est VISIBLE (toast d'erreur + bannière persistante + message de succès qui dit l'étiquetage). Si Pascal re-signale un lot non attaché SANS avoir vu d'alerte → chercher côté flux UI (modale ouverte depuis la Prospection sans preset) ; s'il a vu l'alerte → lire le `console.warn` Vercel dans l'heure. → [[project_campagnes_panneau_prospects_fix_etiquetage_2026-07-02]].
- **[WATCH] Refonte CRM 1+2+3 activée fondateurs (`ffCrmListesV2`)** : surfaces premium à surveiller à l'usage. (Bug 5 slideout Signaux superseded : slideout refondu au Lot 1.) Rollback = flag OFF (`raw_app_meta_data`).
- **[WATCH] Veille W27** = 1er run sur 238 sources (post Bloc 0) + horaire 02:27 UTC → surveiller densité/mix/horaire réel (W26 OK 26/06 : 7 items, local 71%, keptByTrust=1). → [[project_veille_sourcing_w26_2026-06-23]].
- **[WATCH] Socle vite 8 (rolldown) + Dependabot socle ré-activé (2026-06-28)** : vite 8.1.x major récent → surveiller patches. 1ère PR Dependabot `sveltekit` doit passer la CI avant merge ; **jamais `rm package-lock.json`**. → [[project_fix_deps_ci_vercel_2026-06-22]].
- **[WATCH] Svelte 5 `onDestroy` s'exécute en SSR Vercel** (pas en `vite preview`) : window/document/localStorage/setInterval à cleanup → `$effect(() => {...; return () => cleanup})`. → `feedback_svelte5_ondestroy_ssr_window_undefined.md`.
- **[WATCH] Vercel auto-deploy git intermittent** : a **raté** le push `db6182e` (01/07, déploiement manuel requis) mais a **fiché** `28b4848` (Lot 2, build Ready). Comportement variable → vérifier `vercel ls`/`vercel inspect` après un push et déployer manuel (`vercel --prod`) au besoin. Un `vercel rollback` passé peut épingler l'alias.
- **[WATCH] Réactivation d'une source coupée V5 (2026-06-07)** : flip de flag → re-vérifier les contrôles d'origine (Zod, quota, rate-limit, anti-hallu) AVANT de rallumer en prod. Réf `audit_secu_2026-06-07_v5_signaux_prospection.md` § I-3.

→ Watch list complète (Signaux V4 perf/contrats S189, S188, S186, S178, S171) déplacée dans `archive/2026-05-28-pivot-mobile-v3.md`. Restent triables si l'objet redevient actuel.

### Livré (référence historique)

→ Livré V2 + sessions antérieures (S171→S192bis) dans `archive/` (`2026-05-28-pivot-mobile-v3.md`, `2026-05-25/13/10/09/08-sessions.md`).

