# CRM FilmPro : CLAUDE.md

## Chantier « Atelier 209 » (démarré 2026-07-14)

Le CRM FilmPro devient l'outil de prospection **des deux marques** (LED Studio + FilmPro), sous un **portail neutre « Atelier 209 »**, deux environnements **étanches** (une base, ni fork ni 2e app). Livraison en **8 runs** (`/product`).

- **Source de vérité de l'exécution → `docs/ATELIER-209-SUIVI.md`** (statut par run, décisions, preuves, gate prod ; « pourquoi » figé `~/Claude/Lab/memory/atelier-209/`). Règles non négociables : Pascal valide chaque maquette dans Chrome avant tout code ; non-régression garantie (défaut `marque='filmpro'`) ; zéro dette ; tout sourcé. Skills design : `redesign-skill`, `soft-skill`, `theme-factory`, `ANTI-AI-SLOP.md`.
- **État : Run 1/2/3 DÉPLOYÉS EN PROD** (import liste + « Ma liste » + D3/D4 + QA/e2e + 8 retours macro Pascal). V6 Hunter / V7 Pingen en attente comptes Pascal. Détail → `docs/ATELIER-209-SUIVI.md` + [[project_atelier_209_run3_import_liste_2026-07-16]].

**Note migration** : ce fichier vit dans `CRM/CLAUDE.md` (Vercel `rootDirectory: CRM`) ; container racine = stub. → `memory/project_appfactory_restructure.md`.

**Statut :** Portail multi-outils en prod : CRM (`/crm`) + Découpe (`/decoupe`) sur `filmpro-portail.vercel.app`. Trunk = `main` (push auto-déploie, intermittent - cf. Watch) ; Flag `ffCrmListesV2` **ON fondateurs**. **À FAIRE Pascal** : comptes Hunter & Pingen + variable Daily Email (§ Chez Pascal). Historique (V3 terrain, Signaux V4, restructure S173-S174) → `archive/`.
**Dernière mise à jour :** 2026-07-18 (parité bi-marque - **ré-audit exhaustif** (le 1er audit scopé prospection/campagnes avait manqué **~15 divergences**) puis **WP-A/B/C TOUS déployés** : `584e937` (titres/hero `marqueLabel` + teinte échappée navy→token : halos, 15 tints campagnes, accents PDF, scrim) + `0f27023` (WP-C 6 copies métier LED marque-aware via `prospection-copies.ts`, maquette validée Pascal dont #5 « exploitants de salles + agences événementielles »). FilmPro byte-identique partout, LED magenta + copies LED. **bug 1 RÉGLÉ** (env LED réel = breakpoint `md`, pas la marque). Vitest **2863**, svelte-check 0/0, QA réelle 2 marques, revue adversariale (1 LOW corrigé). **Parité UX/UI close hors veille** ; reste #8 = Run 7. → `docs/ATELIER-209-SUIVI.md`). **Prochain bug :** #001.


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

→ Règle tranchée S180 : Tailwind utilities pour le détail réutilisable (spacing/couleurs via tokens, jamais off-grid `p-[13px]`) ; `<style>` scoped Svelte pour le layout structurel + keyframes/transitions + `:global()` ciblés ; jamais de CSS global ad hoc hors `app.css` / `!important` ; primitives (`Button`/`Input`/`Card`/`Modal`/`DataTable`/`Tabs`) = source unique, on compose. Détail : `memory/feedback_crm_styling_doctrine.md`.


### Sécurité - décisions assumées (audit 360 V3b L-02, L-03)

- **CSP `unsafe-inline` (L-02)** : prérequis de l'hydratation SvelteKit (scripts/styles inline runtime) ; retrait = refactor nonce. Risque XSS **acceptable** (mono-tenant ≤ 10 admins @filmpro.ch OTP, 0 UGC, sorties échappées `esc()`/`escapeHtml`). À revisiter si option nonce-based simple ou surface UGC.
- **RLS « mono-tenant plat » (L-03/L-04)** : ~11 tables `FOR ALL TO authenticated USING (true)` = tout authentifié voit/modifie tout. **Décision assumée** (S127 : 3 fondateurs symétriques). **À DURCIR avant un 4e user non-fondateur** (`created_by = auth.uid()` + tests RLS intégration). → [[feedback_rls_multitenant_durcissement_si_4_users]] + § RISQUES OUVERTS (M-48).

---

## INFRA EN PLACE

- **Prod** : https://filmpro-portail.vercel.app (Vercel : **git integration auto-déploie `main` en prod à chaque push**, vérifié live 26/06 ; `vercel deploy --prod` reste dispo en manuel) ; ancienne `filmpro-crm.vercel.app` conservée et redirigée 308 → nouvelle (hook). Supabase EU (projet `appfactory`, 10+ tables, RLS active, service role key configurée)
- **Auth** : OTP email 6 chiffres @filmpro.ch + session 7 jours httpOnly ; SMTP Resend (domaine verifié, free plan)
- **APIs** : Zefix REST + search.ch + fal.ai Flux 1.1 Pro Ultra (partage clé avec Enseignement) - Pexels/Unsplash supprimés S67
- **Crons** : **6 crons Vercel** `/api/cron/{signaux,alertes,lead-rescore,daily-email,intelligence-archive,nettoyage-crm}` sécurisés `CRON_SECRET` + service role. La **veille hebdo NE tourne PAS en cron Vercel** : GitHub Actions vendredi (cap durée Vercel). Le cron `intelligence` (génération veille) n'existe plus ; `media-enrich` supprimé S67.
- **Tests** : Vitest **2863** (dernier run vérifié 2026-07-18, parité WP-A/B) + Playwright e2e (suite + P1/P2/P3 Prospection). Accessibilité : focus trap + ConfirmModal partout, axe-core 0 violation modale P3. Sécurité : Zod sur 20 form actions/endpoints, rate limiting 10/min (+ 60/min dédié routes publiques validation), headers CSP/XFO/referrer, timing-safe secrets

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

**Prochaine attaque** : **Parité bi-marque - ré-audit exhaustif + WP-A/B/C TOUS DÉPLOYÉS 18/07** (`584e937` WP-A/B teinte+titres ; `0f27023` WP-C 6 copies métier LED validées maquette Pascal). **bug 1 RÉGLÉ** (repro env LED réel). **Reste parité = #8 seul** (hero Signaux « vitrage » = Run 7, gated cadrage veille LED). **La parité UX/UI LED↔FilmPro est donc close hors veille.** Autres tracks : Cohérence UI PART 2 lot 2+c+d (`ff_ui_coherence` OFF), bandeau (a), Run 7 veille LED, option mobile import (gate mockup). Run 4/5 bloqués (Hunter/Pingen chez Pascal). Micro validé AVANT Pascal (→ [[feedback_qa_micro_mon_ressort_gate_pas_excuse]]).

### Directive permanente (Pascal 2026-07-15) : zéro régression + miroir exact + QA avant/après

**Toute intervention sur le CRM préserve 100 % de l'existant** (miroir exact, zéro régression) + **check QA avant/après** sur la vraie vue ; corriger le défaut nommé, jamais « redessiner » ce qui marche. **Piège** : la preview locale par défaut est non-premium → poser `ff_crm_listes_v2 = true` (+ `ff_decoupe`) sur l'utilisateur local avant de minter.

### Règle backlog (WIP-limité, gravée 2026-06-28)

Le « **backlog dev** » ne liste QUE l'actionnable-par-Claude sans dépendance externe (gestes Pascal → § Chez Pascal ; attentes datées → § Parking ; idées → Watch). No-debt strict ; titre bloqué = `[BLOQUÉ - {qui/quoi débloque}] {action}`. → [[feedback_backlog_wip_anti_gonflement]]. Baseline saine (**2860 verts**, build OK).

### Backlog dev (actionnable par Claude)

- [ ] **[EXÉCUTABLE - option, marque-indépendant, GATE mockup]** Surfacer le bouton « Importer une liste » sur mobile (<768px) : aujourd'hui `hidden md:inline-flex` → planqué dans le menu « … » **pour les 2 marques** (cause perçue de bug 1). À décider avec toi (maquette) si tu veux le rendre proéminent sur mobile. → bug 1 fermé, [[feedback_qa_micro_mon_ressort_gate_pas_excuse]].
- [ ] **[EXÉCUTABLE]** URL Atelier 209 : configurer `atelier209.vercel.app` comme domaine de prod **public** (réglages Vercel), vérifier 200 public, PUIS activer le redirect 308 de `filmpro-portail`. Renommer ne suffit pas (SSO). → [[project_atelier_209_run1_deploiement_2026-07-15]].
- [ ] **[EXÉCUTABLE]** Emailing prospection automatisée : moteur de séquences d'emails aux prospects (Resend, **templates pré-rédigés, zéro LLM**). Étape 1 = cadrage court Pascal (pas de réunion), puis code + gate OFF par défaut. Gate prod : DNS `send.filmpro.ch`, base légale nLPD, contenu validé. (Ex-« Vague 4 ».)
- [ ] **[EXÉCUTABLE - pas urgent, GATE mockup d'abord]** Retouches accueil (`AtelierShell.svelte`) : hero HD plus grand (source 2x), proportion 2/3 image / 1/3 bandeau, blocs aérés/alignés grille, boutons OTP mêmes dimensions, fondu premium image↔bandeau. `redesign-skill`, maquette Chrome d'abord. → `docs/ATELIER-209-SUIVI.md` § Retouches accueil.
- [ ] **[EXÉCUTABLE]** Cohérence UI b/c/d - **PART 2 lot 2 + c + d** (lot 1 livré `7518cc1` : états vides→`EmptyState`, recherches→`SearchInput`, fix ancrage campagnes). Reste b : états vides des composants partagés (SignauxCards/EntreprisesCards/FeedbackTable via prop `coherence` ; panneaux dashboard ; `PipelineEmptyState`), **a11y `SearchInput` clear-focus** (fix 1 ligne, **NON flag-gated** = change à part, déjà en prod), recherche Aide (raccourci `/`), CTAs prospection (piège cascade, `@layer` écarté), INC-6/8/9/10/4 ; puis **c** (compteurs) + **d** (grille 8px). Page par page derrière `ff_ui_coherence`, QA OFF/ON au DOM (toggle : clé `null` pas `delete`), zéro régression. `redesign-skill`+`refactoring-ui`. Détail → `docs/COHERENCE-UI-BANDEAU.md` + [[feedback_gouvernance_benchmark_layout_lisibilite]].
- [ ] **[EXÉCUTABLE]** Bandeau (a) : allumer `ff_page_bandeau` sur les fondateurs quand tu veux (option : alléger le greeting Dashboard en vue premium). Rendu déjà en prod derrière le flag OFF. → `docs/COHERENCE-UI-BANDEAU.md`.
- [ ] **[EXÉCUTABLE - pas urgent, maquette validée]** Outil « Coûts des outils » : sortir la page Coûts du CRM → 3e outil sur l'accueil (premium « Heure bleue »). Agrège 3 sources live : veille Claude API (`cost_audit_runs`), fal.ai (tous coûts, sans mention Enseignement), Firecrawl (abo intermittent). Exclut l'abo Claude perso. Maquette `.atelier-209/retours-maquettes/atelier209-retours.html`. (Pascal 16/07 : pas urgent.)
- [ ] **[BLOQUÉ - CRM bi-marque 100 % livré]** Mettre à jour les 2 pages d'aide (FilmPro + LED Studio) : contenu majoritairement commun, mais **les spécificités de chaque marque** prises en compte. À faire une fois le CRM bi-marque terminé. (Retour Pascal 16/07.)

### Chez Pascal (hors backlog dev - gestes manuels, quand tu veux)

- [ ] **[BLOQUÉ - toi : créer le compte gratuit]** Compte Hunter (25 recherches/mois, 0 CHF, hunter.io). Débloque V6 → Run 4 (enrichissement décideur). → `docs/ATELIER-209-SUIVI.md`.
- [ ] **[BLOQUÉ - toi : créer le compte]** Compte Pingen (sans abonnement, ~1,58 CHF/lettre, pingen.com). Débloque V7 → Run 5 (envoi postal). → `docs/ATELIER-209-SUIVI.md`.
- [ ] **[BLOQUÉ - toi : poser 1 variable Vercel]** Allumer l'envoi du Daily Email : `EMAIL_DAILY_ENABLED=true` en env Vercel Prod (zéro redéploiement, gate OFF = 0 envoi ; le smoke OTP prérequis est fait). → [[project_daily_email_module_2026-06-25]].
- [ ] **[BLOQUÉ - toi : sign-off visuel sur la prod]** Valider le flux d'import de liste (Run 3) directement sur la prod : Prospection → onglet « Ma liste » (ou bouton « Importer une liste » sur Entreprises) → déposer un CSV → colonnes → aperçu → import. → `docs/ATELIER-209-SUIVI.md` (Run 3).

### Coupé du backlog (→ watch, plus des tâches)

Décisions tranchées (détail en mémoire) : domaine `atelier209.ch` = pas d'achat (URL = renommage Vercel) ; durcissement RLS conditionnel à un « user normal » non-fondateur → [[feedback_rls_multitenant_durcissement_si_4_users]] + [[audit_secu_2026-07-15_atelier209_run1_roles_rls]] ; knip faux positif `MINUTE_MS`/`RATE_LIMIT_WINDOW_MS` assumé, ne pas ré-investiguer → [[feedback_knip_verify_grep_before_delete]] ; time-box session Supabase = geste one-shot chez Pascal, non-faille → [[audit_secu_2026-06-29_session_delog_7j]].

### Livré cette session

- [x] ~~**Parité bi-marque - WP-C 6 copies métier LED DÉPLOYÉ prod (`0f27023`)**~~ - 2026-07-18 (ultracode). Maquette validée Pascal dans Chrome (#5 corrigé « exploitants de salles + agences événementielles »). Extension `prospection-copies.ts` (source unique) : LeadExpress entreprise+note, PipelineQuickAdvance action, PhotoGallery vide, ImportModal helper Google, modèle CSV ; `marque` threadée dans 5 composants + LeadSlideOut + 3 pages. FilmPro **byte-identique** (helper Google testé au caractère près, mêmes escapes `’/ /€`), LED = libellés validés. Vitest 2863, svelte-check 0/0, **QA runtime 2 marques** (PhotoGallery rendu réel : FilmPro « façade ou vitrage » / LED « enseigne ou stand »). **Parité UX/UI close hors veille (#8=Run 7).** → [[feedback_bi_marque_parity_qa_en_sortie]] + `docs/ATELIER-209-SUIVI.md`.
- [x] ~~**Parité bi-marque - ré-audit exhaustif + WP-A/B DÉPLOYÉS prod (`584e937`)**~~ - 2026-07-18 (ultracode). Ré-audit workflow (6 zones, refute adversarial) : 1er audit scopé prospection/campagnes → **~15 divergences manquées**. WP-A (marqueLabel : titres/hero Reporting/Log/Coûts + cadratin) + WP-B (teinte navy→`var(--color-primary*)`/color-mix : halos KPI, 15 tints campagnes, accents PDF pastille+filet, scrim aperçu étiquettes). FilmPro byte-identique, LED magenta. Vitest **2863** (+3 parité PDF), svelte-check 0/0, QA navigateur réelle 2 marques, revue adversariale (1 LOW scrim corrigé). **bug 1 fermé** (repro env LED réel Colima : bouton import identique 2 marques, gaté par breakpoint `md` seul). → [[feedback_bi_marque_parity_qa_en_sortie]] + `docs/ATELIER-209-SUIVI.md`.
- [x] ~~**Parité bi-marque - copies métier LED #4/#5/#6 DÉPLOYÉES prod (`ae438e2`)**~~ - 2026-07-18 (ultracode). Maquette validée Pascal. `activity-types.ts` marque-aware (7 cibles LED + union serveur) + `prospection-copies.ts` source unique (FilmPro byte-identique, LED signalétique/stand/enseigne) ; fix revue `$effect` re-ancrage. Vitest 2860, QA réelle 2 marques. → [[feedback_bi_marque_parity_qa_en_sortie]] + `docs/ATELIER-209-SUIVI.md`.
- [x] ~~**Parité bi-marque - 2 divergences gate-free (logo PDF + dropdown vide) DÉPLOYÉES prod (`96dc026`)**~~ - 2026-07-18 (ultracode). Logo PDF liste marque-aware (LED verbatim / FilmPro byte-identique) + `MultiSelectDropdown` emptyLabel « Aucune campagne ». Vitest 2847, revue 0 finding, QA réelle 2 marques. → [[feedback_bi_marque_parity_qa_en_sortie]] + `docs/ATELIER-209-SUIVI.md`.
- [x] ~~**Parité bi-marque - 2 HIGH corrigés + déployés (`2b27819`)**~~ - 2026-07-17 (ultracode). Validation externe pilotée par marque + scoring marque-aware. Vitest 2838, audit sécu 0 H/C. → [[feedback_bi_marque_parity_qa_en_sortie]].
- [x] ~~**Cohérence UI - increment b PART 2 lot 1**~~ - 2026-07-17 (`7518cc1`, flag OFF). États vides→EmptyState + recherches→SearchInput + fix ancrage campagnes. Vitest 2827. → [[project_coherence_ui_increment_b_part2_2026-07-17]].
- [x] ~~**Cohérence UI - part 1 (`3976d6e`) + mockup b/c/d + bandeau 10 pages**~~ - 2026-07-17 (flags OFF). Boutons→.ws-btn + bandeau de page complet. → [[project_coherence_ui_increment_b_part1_2026-07-17]] + `docs/COHERENCE-UI-BANDEAU.md`.
→ Antérieurs (Campagnes, e2e validation, Retours macro, Run 3 QA/import + Run 2 + Run 1, login OTP, veille/étiquettes/refonte/Aide/Découpe/Daily Email) → archives `claude-md-crm-livre-2026-07-{17,16,15,14,03,02}.md` + `-06-26.md` ; mémoires [[project_atelier_209_run3_import_liste_2026-07-16]], [[project_atelier_209_run2_cablage_2026-07-15]], [[project_login_otp_smtp_supabase_2026-07-14]].

### Watch list active après pivot

- **[WATCH] Parité bi-marque LED ↔ FilmPro - CLOSE hors veille (18/07)** : ré-audit exhaustif + WP-A/B/C **tous déployés** ; **bug 1 fermé** (breakpoint `md`, pas la marque). **Reste #8 seul** (hero Signaux « vitrage » = Run 7). Surveiller à l'usage LED réel : rien d'attendu, mais toute nouvelle surface LED doit passer la checklist de parité. **Leçon gravée** : un audit scopé rate une classe entière - le ré-audit full-surface a trouvé ~15 divergences que le 1er (prospection/campagnes) avait manquées. → `docs/ATELIER-209-SUIVI.md` § Parité + [[feedback_bi_marque_parity_qa_en_sortie]].
- **[WATCH] URL `atelier209.vercel.app` différée (15/07)** : renommer le projet Vercel ne rend pas le domaine public (SSO de déploiement). Cutover = config domaine de production Vercel + redirect 308, étape dédiée. App canonique = `filmpro-portail.vercel.app`. → [[project_atelier_209_run1_deploiement_2026-07-15]].
- **[WATCH] RLS mono-tenant plate à durcir avant un « user normal » (15/07)** : tout compte connecté voit tout le PII client ; les rôles ne protègent que l'édition mots-clés + retours. Recrutement à venir = trigger (durcir `created_by = auth.uid()` + tests RLS). → [[audit_secu_2026-07-15_atelier209_run1_roles_rls]] + [[feedback_rls_multitenant_durcissement_si_4_users]].
- **[WATCH] Veille/Signaux LED = copie FilmPro tant que Run 7 non cadré (16/07)** : en env LED, Signaux affiche du contenu FilmPro (cron `marque='filmpro'` fixe). **NE PAS livrer la veille LED en copiant FilmPro** : Run 7 = GATE cadrage (modèle + sources LED) AVANT tout code. Mots-clés secteur LED `secteurs.ts` validés 18/07 ; token « led » nu écarté du scoring (« Ledermann »/« Toledo »). → `docs/ATELIER-209-SUIVI.md` (Run 7).
- **[WATCH] Login OTP dépend d'un réglage Supabase hors-repo + clé Resend (14/07)** : rechute **silencieuse** si clé Resend rotée / domaine perd sa vérif Resend / changement de domaine oublie ce canal. → [[project_login_otp_smtp_supabase_2026-07-14]].
- **[WATCH] Validation externe - 3 Low différés (bug-hunter 02/07)** : flux direct non-occurrent, validation protégée. → [[project_validation_externe_campagne_2026-07-02]].
- **[WATCH] Surfaces refondues premium (`ffCrmListesV2` ON fondateurs)** : Signaux/Étiquettes/Aide/Découpe + campagnes à l'œil à l'usage ; récidive « importé mais non attaché » visible depuis `c7efdd4`. Rollback = flag OFF / `vercel rollback`. → [[project_campagnes_panneau_prospects_fix_etiquetage_2026-07-02]].
- **[WATCH] Veille W29 (vendredi 17/07)** = 1er cron après les 2 fixes du 10/07. Vérifier : (a) **un seul email** (brief brandé antoine@+pascal@), (b) **pas d'alerte `mix_drift`** GHA si part locale ≥ 30 %. W28 OK sans intervention ; densité à l'œil (cible 8-12). → [[feedback_pause_turn_reprise_pas_echec]].
- **[WATCH] Vercel auto-deploy git intermittent** (a raté `db6182e`) : vérifier `vercel ls` après chaque push, `vercel --prod` manuel au besoin.
- **[WATCH] Gotchas techniques persistants** (détail en mémoire) : jamais `rm package-lock.json` (CI Dependabot → [[project_fix_deps_ci_vercel_2026-06-22]]) ; Svelte 5 `onDestroy` en SSR → cleanup via `$effect` ([[feedback_svelte5_ondestroy_ssr_window_undefined]]) ; réactiver une source V5 coupée = re-vérifier Zod/quota/rate-limit/anti-hallu + **scoring marque-aware** (regbl/simap NON threadés : sources coupées métier construction=FilmPro ; si réactivées en LED, câbler `marque`). → [[audit_secu_2026-06-07_v5_signaux_prospection]].

→ Watch list complète (Signaux V4 perf/contrats S189, S188, S186, S178, S171) déplacée dans `archive/2026-05-28-pivot-mobile-v3.md`. Restent triables si l'objet redevient actuel.

### Livré (référence historique)

→ Livré V2 + sessions antérieures (S171→S192bis) dans `archive/` (`2026-05-28-pivot-mobile-v3.md`, `2026-05-25/13/10/09/08-sessions.md`).

