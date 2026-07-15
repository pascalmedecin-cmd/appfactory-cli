# CRM FilmPro : CLAUDE.md

## Chantier « Atelier 209 » (démarré 2026-07-14)

Le CRM FilmPro devient l'outil de prospection **des deux marques** (LED Studio + FilmPro), sous un **portail neutre « Atelier 209 »**, avec deux environnements **étanches**. Un seul outil, une seule base : ni fork, ni deuxième application. Livraison en **8 runs** pilotés par `/product`.

- **Source de vérité de l'exécution → `docs/ATELIER-209-SUIVI.md`** : statut par run, décisions, preuves. À lire au démarrage de toute session du chantier.
- **Le « pourquoi » (cadrage figé, archive hors-repo)** : `~/Claude/Lab/memory/atelier-209/` (contrat, état du code, découpage en runs, risques). Non maintenu - la vérité vivante est le suivi ci-dessus.
- **Règles non négociables** : Pascal valide **chaque maquette d'écran** dans Chrome avant toute ligne de code ; **non-régression** garantie (colonne `marque`, défaut `filmpro` : le CRM se comporte exactement comme avant) ; **zéro dette** (les 4 dettes du code sont corrigées, pas contournées) ; tout **sourcé et vérifié**, jamais inventé. Hors scope : refonte du CRM existant, déménagement du module Découpe, renommage du dossier disque.
- **Skills design (runs 1+, annoncés au plan)** : `redesign-skill`, `soft-skill`, `theme-factory`, filtre `ANTI-AI-SLOP.md`. **État : Run 0 terminé (5/7 vérifs)** ; V6 Hunter / V7 Pingen en attente comptes Pascal. **Prochaine étape : Run 1** (portail renommé, `atelier209.ch`, connexion refaite, admin réparé) - voir suivi.

**Note migration** : ce fichier vit dans `CRM/CLAUDE.md` (path Vercel `rootDirectory: CRM`) ; container racine = stub. Contexte → `memory/project_appfactory_restructure.md`.

**Statut :** Portail FilmPro multi-outils en prod : CRM (`/crm`) + Découpe Films (`/decoupe`) sur `filmpro-portail.vercel.app`. Formation IA = projet autonome `Formation/` (`cc` option 5). Historique (V3 terrain, Signaux V4, golden v9, restructure S173-S174) → `archive/`.
**Dernière mise à jour :** 2026-07-14 (**chantier Atelier 209 démarré - Run 0 des vérifications livré** → § Chantier en tête + `docs/ATELIER-209-SUIVI.md`). Trunk = `main` ; Flag `ffCrmListesV2` **ON fondateurs**. Prod = `filmpro-portail.vercel.app` (push `main` auto-déploie, intermittent - cf. Watch). **À FAIRE Pascal** : réserver `atelier209.ch` + comptes Hunter & Pingen + variable Daily Email (§ Chez Pascal). **Prochain bug :** #001.
**Sessions précédentes (condensé)** - détails dans `archive/` (S165-S175, S122-S125, S70-S107).


---

## SOUS-PROJETS

Ce repo héberge le **CRM FilmPro** (app principale) depuis la restructuration 2026-06-01 (Formation = top-level, Consulting sous LED Studio ; mapping : `~/.claude/CLAUDE.md`).

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

→ Archive intégrale : `../archive/decisions-structurelles-crm.md` (6 écrans principaux, slide-out panels, saisie rapide, 100% sources gratuites, modèle unifié `prospect_leads`, scoring auto 0-13). Specs prospection complètes : `../docs/SPECS_PROSPECTION.md`.

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
- **Tests** : Vitest **2548** (dernier run vérifié 2026-07-10, +3 tests veille) + Playwright e2e (suite + P1/P2/P3 Prospection). Accessibilité : focus trap + ConfirmModal partout, axe-core 0 violation modale P3. Sécurité : Zod sur 20 form actions/endpoints, rate limiting 10/min (+ 60/min dédié routes publiques validation), headers CSP/XFO/referrer, timing-safe secrets

→ Détail intégral (env vars, BDD exhaustive, liste tests, liste crons, headers sécurité, pagination serveur) : `../archive/infra-crm-detail.md`

## DOCUMENTATION

- `../docs/SPECS_PROSPECTION.md` : specs module prospection (sources, scoring, UI, dedup) - vit au niveau container FilmPro.

→ Inventaire composants EN PLACE → `../archive/inventaire-composants.md` (consulter avant d'en créer de nouveaux).

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
- **Inscription cockpit mid-session** : ne JAMAIS éditer `entries.jsonl` directement ; voies sûres = drag UI cockpit ou `POST /api/entries/appfactory` puis `/api/queue/appfactory`. → `feedback_cockpit_watcher_purge_cli_entries_S177.md` (verbatim : `archive/claude-md-crm-livre-2026-07-02.md`).

## RISQUES OUVERTS (sécurité)

- **RLS Supabase non couverte par les tests Vitest (audit 360 M-48)** : Vitest mocke supabase-js → aucun test unitaire ne prouve la RLS réelle. **Avant de construire sur un contrôle d'autorisation : lire le code + vérifier avec un compte au rôle cible.** Détail : `rules/quality.md` § RLS + `feedback_rls_mocks_insufficient_S99.md`.

## REGLES TECHNIQUES PROJET

→ Tests mobile/responsive : Chrome DevTools Device Toolbar manuel (Pascal) **obligatoire** ; Playwright `viewport:{width,height}` seul et MCP `resize_window` **interdits** comme substituts (Playwright preset `devices['iPhone 14 Pro Max']` OK pour findings OBJECTIFS uniquement - réf `CRM/tests/mobile.spec.ts`). Règle complète : `memory/feedback_crm_mobile_testing_devtools.md`.


## Prochaine session

**Prochaine attaque** : **Atelier 209 - Run 2** (les deux marques cloisonnées). Sélecteur de marque + **chrome (sidemenu/header/footer) teinté par marque LED/FilmPro** pour distinguer + étanchéité en base + seed jetable (dette D5) ; en même temps, revoir le **golden CRM** (ajustements couleurs + **Inter partout**, PAS de refonte). Le **Run 1 est déployé en prod** (identité + rôles/RLS + connexion 4 adresses ; URL `atelier209.vercel.app` différée). Suivi → `docs/ATELIER-209-SUIVI.md`.

### Règle backlog (WIP-limité, gravée 2026-06-28)

Le « **backlog dev** » ne liste QUE l'actionnable-par-Claude sans dépendance externe (gestes Pascal → § Chez Pascal ; attentes datées → § Parking ; idées → Watch). No-debt strict ; titre bloqué = `[BLOQUÉ - {qui/quoi débloque}] {action}`. → [[feedback_backlog_wip_anti_gonflement]]. **État 2026-07-03** : baseline saine (**2545 verts**, build OK ; +13 workflow validation révisé).

### Backlog dev (actionnable par Claude)

- [ ] **[EXÉCUTABLE]** Atelier 209 - Run 2 (marques cloisonnées) : sélecteur de marque + chrome (sidemenu/header/footer) teinté par marque LED/FilmPro pour distinguer + étanchéité en base + seed jetable (dette D5) ; en même temps revoir le golden CRM (couleurs + Inter partout, pas de refonte). → `docs/ATELIER-209-SUIVI.md` + [[project_atelier_209_run1_deploiement_2026-07-15]].
- [ ] **[EXÉCUTABLE]** URL Atelier 209 : configurer `atelier209.vercel.app` comme domaine de production **public** du projet Vercel (réglages), vérifier 200 public, PUIS activer le redirect 308 de `filmpro-portail` (code remis à l'origine pour le Run 1). Renommer le projet ne suffit pas (reste protégé SSO). → [[project_atelier_209_run1_deploiement_2026-07-15]].
- [ ] **[EXÉCUTABLE]** e2e Playwright validation externe (base jetable Colima) : parcours public `/validation/<token>` + parcours fondateur + étiquettes « ignorer les Retirer ». Ferme la dette « déployé `8b90f6d` sans Playwright feature-spécifique ». → [[project_validation_externe_campagne_2026-07-02]].
- [ ] **[EXÉCUTABLE]** Emailing prospection automatisée : moteur d'envoi automatisé de séquences d'emails aux prospects (Resend, **templates pré-rédigés, zéro LLM** - règle dure). Étape 1 = cadrage court Pascal (contenu/cible/séquence/fréquence/déclencheur, **pas de réunion**), puis 1 session de code + gate ON/OFF (**OFF par défaut**). **Gate de mise en prod** (pas avant le dev) : (a) DNS `send.filmpro.ch` Resend, (b) base légale nLPD + mention, (c) contenu validé. (Ex-« Vague 4 ».)

### Chez Pascal (hors backlog dev - gestes manuels, quand tu veux)

- [ ] **[BLOQUÉ - toi : créer le compte gratuit]** Compte Hunter (25 recherches/mois, 0 CHF, hunter.io). Débloque V6 → Run 4 (enrichissement décideur). → `docs/ATELIER-209-SUIVI.md`.
- [ ] **[BLOQUÉ - toi : créer le compte]** Compte Pingen (sans abonnement, ~1,58 CHF/lettre, pingen.com). Débloque V7 → Run 5 (envoi postal). → `docs/ATELIER-209-SUIVI.md`.
- [ ] **[BLOQUÉ - toi : poser 1 variable Vercel]** Allumer l'envoi du Daily Email : `EMAIL_DAILY_ENABLED=true` en env Vercel Prod (zéro redéploiement, gate OFF = 0 envoi ; le smoke OTP prérequis est fait). → [[project_daily_email_module_2026-06-25]].

### Coupé du backlog (→ watch, plus des tâches)

- Réserver `atelier209.ch` : Pascal a tranché « pas d'achat de domaine » (URL = renommage Vercel). Domaine reste libre s'il change d'avis.
- Durcissement RLS : conditionnel à un « user normal » non-fondateur (recrutement à venir) → [[feedback_rls_multitenant_durcissement_si_4_users]] + [[audit_secu_2026-07-15_atelier209_run1_roles_rls]].
- knip : faux positif `MINUTE_MS|RATE_LIMIT_WINDOW_MS` assumé, **ne pas ré-investiguer** → [[feedback_knip_verify_grep_before_delete]].
- Time-box session Supabase : geste Dashboard one-shot chez Pascal, **non-faille** (délog 7 j suffit) → [[audit_secu_2026-06-29_session_delog_7j]].

### Livré cette session

- [x] ~~**Atelier 209 - Run 1 DÉPLOYÉ EN PROD**~~ - 2026-07-15 (ultracode, SUPERVISÉ). Identité « Atelier 209 » (portail + connexion « Heure bleue », Inter, PWA) + **rôles 3 niveaux + RLS** (D1 : admin Pascal ×2, superuser Antoine ×2, user) + **connexion = 4 adresses nommées** (aucun domaine ouvert - RLS mono-tenant plate). Migration RLS en prod via `pg` (MCP read-only), env Vercel posée, code déployé (`a564d64`, `vercel deploy --prod` depuis la racine, auto-deploy git non fired). 4 écrans vérifiés navigateur + **anti-verrouillage prouvé** (session prod pascal → 200). Revue 11 agents (3 findings corrigés). **URL `atelier209.vercel.app` différée** (config domaine Vercel). → [[project_atelier_209_run1_deploiement_2026-07-15]] + [[audit_secu_2026-07-15_atelier209_run1_roles_rls]].
- [x] ~~Atelier 209 - Run 1 maquettes validées (gate design)~~ - 2026-07-15. « Heure bleue » verrouillée, `bar-off-1.png`. → [[project_atelier_209_run1_maquettes_2026-07-15]].
- [x] ~~Atelier 209 - Run 0 (vérifications, 5/7)~~ - 2026-07-14. Veille coût, sources LED (import indispensable), base prod conforme, base jetable, domaine. → `docs/ATELIER-209-SUIVI.md`.
- [x] ~~Login CRM réparé (code OTP)~~ - 2026-07-14. Expéditeur Supabase Auth hors-repo resté sur filmpro.ch mort ; fix Management API. → [[project_login_otp_smtp_supabase_2026-07-14]].
→ Antérieurs (veille doublon email `ac744f3` + plancher part locale `7e280c2` 10/07 ; pause_turn/W27 `2a5207e`, étiquettes PDF `1643435`, refonte Lots 1-3, Aide, Découpe, Daily Email, etc.) → `archive/claude-md-crm-livre-2026-07-14.md` + `-07-03.md` + `-07-02.md` + `-06-26.md`.

### Watch list active après pivot

- **[WATCH] URL `atelier209.vercel.app` différée (15/07)** : renommer le projet Vercel ne rend pas le domaine public (SSO de déploiement). Cutover = config domaine de production Vercel + redirect 308, étape dédiée. App canonique = `filmpro-portail.vercel.app`. → [[project_atelier_209_run1_deploiement_2026-07-15]].
- **[WATCH] RLS mono-tenant plate à durcir avant un « user normal » (15/07)** : tout compte connecté voit tout le PII client ; les rôles ne protègent que l'édition mots-clés + retours. Recrutement à venir = trigger (durcir `created_by = auth.uid()` + tests RLS). → [[audit_secu_2026-07-15_atelier209_run1_roles_rls]] + [[feedback_rls_multitenant_durcissement_si_4_users]].
- **[WATCH] Login OTP dépend d'un réglage Supabase hors-repo + de la clé Resend (14/07)** : l'expéditeur du code vit dans Supabase Auth (invisible au git), mot de passe = clé Resend. Rechute **silencieuse** si clé Resend rotée, OU `lamaisoncreativedirection.ch` perd sa vérif Resend, OU futur changement de domaine oublie ce canal. → [[project_login_otp_smtp_supabase_2026-07-14]].
- **[WATCH] Validation externe - 3 Low différés (bug-hunter 02/07)** : re-typer `patches` étiquettes + reset `[id]`/flash filtre (`{#key}`) - flux direct non-occurrent, validation protégée. Détail → [[project_validation_externe_campagne_2026-07-02]] + archive 07-03.
- **[WATCH] Surfaces refondues restantes** : OTP + page campagne + lien validation prouvés prod 03/07 ; à l'œil à l'usage (Signaux, Étiquettes, Aide, Découpe). Rollback = flag OFF ou `vercel rollback`. → [[project_campagnes_panneau_prospects_fix_etiquetage_2026-07-02]].
- **[WATCH] Récidive « importé mais non attaché »** : cause des 16 leads indéterminée ; depuis `c7efdd4` tout non-étiquetage est VISIBLE (modale sans preset, ou `console.warn` Vercel). → [[project_campagnes_panneau_prospects_fix_etiquetage_2026-07-02]].
- **[WATCH] Refonte CRM 1+2+3 activée fondateurs (`ffCrmListesV2`)** : surfaces premium à surveiller à l'usage. Rollback = flag OFF (`raw_app_meta_data`).
- **[WATCH] Veille W29 (vendredi 17/07)** = 1er cron après les 2 fixes veille du 10/07. Vérifier : (a) **un seul email** reçu (le brief brandé antoine@ + pascal@), plus le récap sans logo ; (b) **pas d'alerte `mix_drift`** dans les logs GHA si la part locale est ≥ 30 %. W28 (10/07) a passé sans intervention (succès, 8 items, 38 % local) = fix pause_turn validé ; densité toujours à l'œil (cible 8-12). → § Livré 10/07 + [[feedback_pause_turn_reprise_pas_echec]].
- **[WATCH] Socle vite 8 + Dependabot ré-activé (28/06)** : surveiller patches ; 1ère PR Dependabot `sveltekit` doit passer la CI avant merge ; **jamais `rm package-lock.json`**. → [[project_fix_deps_ci_vercel_2026-06-22]].
- **[WATCH] Svelte 5 `onDestroy` s'exécute en SSR Vercel** : window/localStorage/setInterval à cleanup via `$effect(() => {...; return () => cleanup})`. → `feedback_svelte5_ondestroy_ssr_window_undefined.md`.
- **[WATCH] Vercel auto-deploy git intermittent** (a raté `db6182e`) : vérifier `vercel ls` après chaque push, `vercel --prod` manuel au besoin.
- **[WATCH] Réactivation d'une source coupée V5** : flip de flag → re-vérifier les contrôles d'origine (Zod, quota, rate-limit, anti-hallu) AVANT prod. Réf `audit_secu_2026-06-07_v5_signaux_prospection.md` § I-3.

→ Watch list complète (Signaux V4 perf/contrats S189, S188, S186, S178, S171) déplacée dans `archive/2026-05-28-pivot-mobile-v3.md`. Restent triables si l'objet redevient actuel.

### Livré (référence historique)

→ Livré V2 + sessions antérieures (S171→S192bis) dans `archive/` (`2026-05-28-pivot-mobile-v3.md`, `2026-05-25/13/10/09/08-sessions.md`).

