# CRM FilmPro : CLAUDE.md

## Chantier « Atelier 209 » (démarré 2026-07-14)

Le CRM FilmPro devient l'outil de prospection **des deux marques** (LED Studio + FilmPro), sous un **portail neutre « Atelier 209 »**, deux environnements **étanches** (une base, ni fork ni 2e app). Livraison en **8 runs** (`/product`).

- **Source de vérité de l'exécution → `docs/ATELIER-209-SUIVI.md`** (statut par run, décisions, preuves, gate prod ; « pourquoi » figé `~/Claude/Lab/memory/atelier-209/`). Règles non négociables : Pascal valide chaque maquette dans Chrome avant tout code ; non-régression garantie (défaut `marque='filmpro'`) ; zéro dette ; tout sourcé. Skills design : `redesign-skill`, `soft-skill`, `theme-factory`, `ANTI-AI-SLOP.md`.
- **État : Run 1, Run 2 ET Run 3 DÉPLOYÉS EN PROD.** Run 3 : import de liste + « Ma liste » + D3/D4, puis **QA visuelle + e2e + resize colonnes déployés le 16/07** (`c106a67`, 7 défauts micro corrigés, smoke vert, 0 C/H). **Reste = revue MACRO de Pascal** (direction d'ensemble) ; le micro (détails UX/FR/états) est **déjà validé de mon côté**, il n'a pas à le chasser. V6 Hunter / V7 Pingen en attente comptes Pascal. Détail → `docs/ATELIER-209-SUIVI.md` + [[project_atelier_209_run3_import_liste_2026-07-16]].

**Note migration** : ce fichier vit dans `CRM/CLAUDE.md` (Vercel `rootDirectory: CRM`) ; container racine = stub. → `memory/project_appfactory_restructure.md`.

**Statut :** Portail multi-outils en prod : CRM (`/crm`) + Découpe (`/decoupe`) sur `filmpro-portail.vercel.app`. Trunk = `main` (push auto-déploie, intermittent - cf. Watch) ; Flag `ffCrmListesV2` **ON fondateurs**. **À FAIRE Pascal** : comptes Hunter & Pingen + variable Daily Email (§ Chez Pascal). Historique (V3 terrain, Signaux V4, restructure S173-S174) → `archive/`.
**Dernière mise à jour :** 2026-07-16 (e2e validation externe + fix UUID seed `31ff965` ; retours macro Pascal livrés prod `a987f6d`. Vitest 2817). **Prochain bug :** #001.


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
- **Tests** : Vitest **2817** (dernier run vérifié 2026-07-16, e2e validation externe) + Playwright e2e (suite + P1/P2/P3 Prospection). Accessibilité : focus trap + ConfirmModal partout, axe-core 0 violation modale P3. Sécurité : Zod sur 20 form actions/endpoints, rate limiting 10/min (+ 60/min dédié routes publiques validation), headers CSP/XFO/referrer, timing-safe secrets

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
- Review humaine avant tout push main (le push auto-déploie la prod ; un vercel --prod manuel de rattrapage redéploie ce même code déjà reviewé)
- Tests automatises avant mise en preview
- **Inscription cockpit mid-session** : ne JAMAIS éditer `entries.jsonl` directement ; voies sûres = drag UI cockpit ou `POST /api/entries/appfactory` puis `/api/queue/appfactory`. → `feedback_cockpit_watcher_purge_cli_entries_S177.md` (verbatim : `archive/claude-md-crm-livre-2026-07-02.md`).

## RISQUES OUVERTS (sécurité)

- **RLS Supabase non couverte par les tests Vitest (audit 360 M-48)** : Vitest mocke supabase-js → aucun test unitaire ne prouve la RLS réelle. **Avant de construire sur un contrôle d'autorisation : lire le code + vérifier avec un compte au rôle cible.** Détail : `rules/quality.md` § RLS + `feedback_rls_mocks_insufficient_S99.md`.

## REGLES TECHNIQUES PROJET

→ Tests mobile/responsive : Chrome DevTools Device Toolbar manuel (Pascal) **obligatoire** ; Playwright `viewport:{width,height}` seul et MCP `resize_window` **interdits** comme substituts (Playwright preset `devices['iPhone 14 Pro Max']` OK pour findings OBJECTIFS uniquement - réf `CRM/tests/mobile.spec.ts`). Règle complète : `memory/feedback_crm_mobile_testing_devtools.md`.


## Prochaine session

**Prochaine attaque** : la **revue macro de Pascal est faite (16/07)** et ses **8 retours sont livrés en prod** (`a987f6d` : logo LED blanc, bouton import proéminent sur Prospection, Campagnes pleine largeur, **12 bugs de robustesse import corrigés + testés**, cf. « Livré cette session »). **Ensuite** : Run 4 (Hunter, bloqué compte Pascal) / Run 7 (veille LED, **cadrage en session**) ; backlog dev = tracker « Coûts des outils » (maquette validée) + items existants ; **[à valider Pascal] mots-clés secteur LED** de `secteurs.ts` (dont le token « led » trop court, cf. WATCH). Micro sous ma responsabilité, validé AVANT Pascal (→ [[feedback_qa_micro_mon_ressort_gate_pas_excuse]]). Détail → [[project_atelier_209_run3_import_liste_2026-07-16]].

### Directive permanente (Pascal 2026-07-15) : zéro régression + miroir exact + QA avant/après

**Toute intervention sur le CRM doit préserver 100 % de l'existant** (miroir exact, zéro régression) avec
**check QA avant/après** sur la vraie vue. Ne jamais « redessiner » ce qui marche ; corriger le défaut nommé,
rien de plus. **Piège** : la preview locale par défaut est non-premium → poser `ff_crm_listes_v2 = true`
(+ `ff_decoupe`) sur l'utilisateur local avant de minter la session.

### Règle backlog (WIP-limité, gravée 2026-06-28)

Le « **backlog dev** » ne liste QUE l'actionnable-par-Claude sans dépendance externe (gestes Pascal → § Chez Pascal ; attentes datées → § Parking ; idées → Watch). No-debt strict ; titre bloqué = `[BLOQUÉ - {qui/quoi débloque}] {action}`. → [[feedback_backlog_wip_anti_gonflement]]. Baseline saine (**2817 verts**, build OK).

### Backlog dev (actionnable par Claude)

- [ ] **[EXÉCUTABLE]** URL Atelier 209 : configurer `atelier209.vercel.app` comme domaine de prod **public** (réglages Vercel), vérifier 200 public, PUIS activer le redirect 308 de `filmpro-portail`. Renommer ne suffit pas (SSO). → [[project_atelier_209_run1_deploiement_2026-07-15]].
- [ ] **[EXÉCUTABLE]** Emailing prospection automatisée : moteur de séquences d'emails aux prospects (Resend, **templates pré-rédigés, zéro LLM**). Étape 1 = cadrage court Pascal (pas de réunion), puis code + gate OFF par défaut. Gate prod : DNS `send.filmpro.ch`, base légale nLPD, contenu validé. (Ex-« Vague 4 ».)
- [ ] **[EXÉCUTABLE - pas urgent, GATE mockup d'abord]** Retouches accueil (`AtelierShell.svelte`) : hero plus grand HD sans l'étirer (image encore floue → source 2x, cf. SUIVI), proportion 2/3 image / 1/3 bandeau (aujourd'hui l'inverse), blocs bandeau aérés + alignés grille, boutons OTP même largeur ET hauteur, fondu premium image↔bandeau. `redesign-skill`, maquette Chrome d'abord. → `docs/ATELIER-209-SUIVI.md` § Retouches accueil.
- [ ] **[EXÉCUTABLE - GATE check visuel grille]** Page **Campagnes** CRM : retirer le bloc de texte **hors bandeau** « Campagnes · Regrouper les prospects par action commerciale. Une entreprise peut porter plusieurs campagnes. » (duplicatif du bandeau du haut) + réaligner proprement le placement du bouton « Nouvelle campagne ». Check visuel alignement grille en sortie. `redesign-skill`. (Pascal 16/07.)
- [ ] **[EXÉCUTABLE - GATE mockup à valider Pascal]** **Cohérence UI globale du CRM** - benchmark = app **Gouvernance** (→ [[feedback_gouvernance_benchmark_layout_lisibilite]]) : (a) bandeau de page sur toutes les pages façon Gouvernance (icône premium + nom + description 1 ligne, humour subtil ; check alignement icône↔titre) ; (b) standardiser les composants transverses (compteurs, onglets, boutons) → app cohérente « comme chez soi », rationnel pas inventé ; (c) compteurs agrandis, visuels, consistants ; (d) grille à 2 niveaux (niv. 1 = éléments principaux, niv. 2 = page). `redesign-skill` + `refactoring-ui`. **Mockup Chrome validé AVANT code.** (Pascal 16/07.)
- [ ] **[EXÉCUTABLE - pas urgent, maquette validée]** Outil « Coûts des outils » : sortir la page Coûts du CRM → 3e outil sur l'accueil (premium « Heure bleue »). Agrège 3 sources live : veille Claude API (`cost_audit_runs`), fal.ai (tous coûts, sans mention Enseignement), Firecrawl (abo intermittent). Exclut l'abo Claude perso. Maquette `.atelier-209/retours-maquettes/atelier209-retours.html`. (Pascal 16/07 : pas urgent.)
- [ ] **[BLOQUÉ - CRM bi-marque 100 % livré]** Mettre à jour les 2 pages d'aide (FilmPro + LED Studio) : contenu majoritairement commun, mais **les spécificités de chaque marque** prises en compte. À faire une fois le CRM bi-marque terminé. (Retour Pascal 16/07.)

### Chez Pascal (hors backlog dev - gestes manuels, quand tu veux)

- [x] ~~Revue MACRO de la prod Atelier 209~~ **FAITE le 16/07** : Pascal a donné 8 retours, tous livrés en prod (`a987f6d`). → « Livré cette session ».
- [ ] **[BLOQUÉ - toi : créer le compte gratuit]** Compte Hunter (25 recherches/mois, 0 CHF, hunter.io). Débloque V6 → Run 4 (enrichissement décideur). → `docs/ATELIER-209-SUIVI.md`.
- [ ] **[BLOQUÉ - toi : créer le compte]** Compte Pingen (sans abonnement, ~1,58 CHF/lettre, pingen.com). Débloque V7 → Run 5 (envoi postal). → `docs/ATELIER-209-SUIVI.md`.
- [ ] **[BLOQUÉ - toi : poser 1 variable Vercel]** Allumer l'envoi du Daily Email : `EMAIL_DAILY_ENABLED=true` en env Vercel Prod (zéro redéploiement, gate OFF = 0 envoi ; le smoke OTP prérequis est fait). → [[project_daily_email_module_2026-06-25]].

### Coupé du backlog (→ watch, plus des tâches)

- Réserver `atelier209.ch` : Pascal a tranché « pas d'achat de domaine » (URL = renommage Vercel). Domaine reste libre s'il change d'avis.
- Durcissement RLS : conditionnel à un « user normal » non-fondateur (recrutement à venir) → [[feedback_rls_multitenant_durcissement_si_4_users]] + [[audit_secu_2026-07-15_atelier209_run1_roles_rls]].
- knip : faux positif `MINUTE_MS|RATE_LIMIT_WINDOW_MS` assumé, **ne pas ré-investiguer** → [[feedback_knip_verify_grep_before_delete]].
- Time-box session Supabase : geste Dashboard one-shot chez Pascal, **non-faille** (délog 7 j suffit) → [[audit_secu_2026-06-29_session_delog_7j]].

### Livré cette session

- [x] ~~**e2e validation externe (fondateur → public → étiquettes ignore retirer → appliquer) + fix UUID seed RFC-4122**~~ - 2026-07-16 (ultracode). `31ff965` : spec Playwright vert depuis état propre (reset→mint→test). Cause racine fermée = UUID du seed en version 0 rejetés par Zod v4 (404/400 sur routes id-validées) → v4 valides + fixtures `marque-leak` alignées. Vitest 2817 verts, marque-leak intégration 15/15. Ferme la dette `8b90f6d`. → [[feedback_seed_uuid_rfc4122_zod_strict]] + [[project_validation_externe_campagne_2026-07-02]].
- [x] ~~**Retours macro Pascal : robustesse import + logo LED + bouton import + Campagnes pleine largeur (PROD)**~~ - 2026-07-16. 8 retours livrés (`a987f6d` smoke vert) dont 12 bugs robustesse import. Vitest 2817. → [[project_atelier_209_run3_import_liste_2026-07-16]].
- [x] ~~**Run 3 : QA visuelle import + e2e + resize colonnes (PROD)**~~ - 2026-07-16. 7 défauts micro corrigés, `c106a67` smoke vert. → [[project_atelier_209_run3_import_liste_2026-07-16]].
- [x] ~~**Run 3 : import de liste (PROD)**~~ - 2026-07-16. Écran import CSV/TSV marque-scopé + Ma liste + D3/D4, `4e3f149` smoke vert. → [[project_atelier_209_run3_import_liste_2026-07-16]] + [[audit_secu_2026-07-16_atelier209_run3_import_liste]].
- [x] ~~**Atelier 209 Run 2 DÉPLOYÉ EN PROD + logo LED HD**~~ - 2026-07-15. Cloisonnement bi-marque + migration `marque` (0 fuite), merge `48d0e66` smoke vert. → [[project_atelier_209_run2_cablage_2026-07-15]] + SUIVI.
→ Antérieurs (étapes Run 2, Run 1 déployé, login OTP 14/07, veille/étiquettes/refonte Lots 1-3/Aide/Découpe/Daily Email) → `archive/claude-md-crm-livre-2026-07-15.md` + `-07-14.md` + `-07-03.md` + `-07-02.md` + `-06-26.md` ; mémoires [[project_atelier_209_run2_cablage_2026-07-15]], [[project_login_otp_smtp_supabase_2026-07-14]].

### Watch list active après pivot

- **[WATCH] URL `atelier209.vercel.app` différée (15/07)** : renommer le projet Vercel ne rend pas le domaine public (SSO de déploiement). Cutover = config domaine de production Vercel + redirect 308, étape dédiée. App canonique = `filmpro-portail.vercel.app`. → [[project_atelier_209_run1_deploiement_2026-07-15]].
- **[WATCH] RLS mono-tenant plate à durcir avant un « user normal » (15/07)** : tout compte connecté voit tout le PII client ; les rôles ne protègent que l'édition mots-clés + retours. Recrutement à venir = trigger (durcir `created_by = auth.uid()` + tests RLS). → [[audit_secu_2026-07-15_atelier209_run1_roles_rls]] + [[feedback_rls_multitenant_durcissement_si_4_users]].
- **[WATCH] Veille/Signaux LED = copie FilmPro tant que Run 7 non cadré (16/07)** : en env LED, Signaux affiche du contenu FilmPro (cron `marque='filmpro'` fixe). **NE PAS livrer la veille LED en copiant FilmPro** : Run 7 = GATE cadrage (modèle + sources LED) AVANT tout code. Aussi mots-clés secteur LED `secteurs.ts` [à valider Pascal], token « led » trop court (« Ledermann »/« Toledo »). → `docs/ATELIER-209-SUIVI.md` (Run 7).
- **[WATCH] Login OTP dépend d'un réglage Supabase hors-repo + clé Resend (14/07)** : rechute **silencieuse** si clé Resend rotée / domaine perd sa vérif Resend / changement de domaine oublie ce canal. → [[project_login_otp_smtp_supabase_2026-07-14]].
- **[WATCH] Validation externe - 3 Low différés (bug-hunter 02/07)** : flux direct non-occurrent, validation protégée. → [[project_validation_externe_campagne_2026-07-02]].
- **[WATCH] Surfaces refondues premium (`ffCrmListesV2` ON fondateurs)** : Signaux/Étiquettes/Aide/Découpe + campagnes à l'œil à l'usage ; récidive « importé mais non attaché » visible depuis `c7efdd4`. Rollback = flag OFF / `vercel rollback`. → [[project_campagnes_panneau_prospects_fix_etiquetage_2026-07-02]].
- **[WATCH] Veille W29 (vendredi 17/07)** = 1er cron après les 2 fixes du 10/07. Vérifier : (a) **un seul email** (brief brandé antoine@+pascal@), (b) **pas d'alerte `mix_drift`** GHA si part locale ≥ 30 %. W28 OK sans intervention ; densité à l'œil (cible 8-12). → [[feedback_pause_turn_reprise_pas_echec]].
- **[WATCH] Vercel auto-deploy git intermittent** (a raté `db6182e`) : vérifier `vercel ls` après chaque push, `vercel --prod` manuel au besoin.
- **[WATCH] Gotchas techniques persistants** (détail en mémoire) : jamais `rm package-lock.json` (Dependabot `sveltekit` doit passer la CI, → [[project_fix_deps_ci_vercel_2026-06-22]]) ; Svelte 5 `onDestroy` en SSR → cleanup window/localStorage via `$effect` (`feedback_svelte5_ondestroy_ssr_window_undefined.md`) ; réactiver une source V5 coupée = re-vérifier Zod/quota/rate-limit/anti-hallu avant prod (`audit_secu_2026-06-07_v5_signaux_prospection.md`).

→ Watch list complète (Signaux V4 perf/contrats S189, S188, S186, S178, S171) déplacée dans `archive/2026-05-28-pivot-mobile-v3.md`. Restent triables si l'objet redevient actuel.

### Livré (référence historique)

→ Livré V2 + sessions antérieures (S171→S192bis) dans `archive/` (`2026-05-28-pivot-mobile-v3.md`, `2026-05-25/13/10/09/08-sessions.md`).

