# CRM FilmPro : CLAUDE.md

## Chantier « Atelier 209 » (démarré 2026-07-14)

Le CRM FilmPro devient l'outil de prospection **des deux marques** (LED Studio + FilmPro), sous un **portail neutre « Atelier 209 »**, deux environnements **étanches** (une base, ni fork ni 2e app). Livraison en **8 runs** (`/product`).

- **Source de vérité de l'exécution → `docs/ATELIER-209-SUIVI.md`** (statut par run, décisions, preuves, gate prod ; « pourquoi » figé `~/Claude/Lab/memory/atelier-209/`). Règles non négociables : Pascal valide chaque maquette dans Chrome avant tout code ; non-régression garantie (défaut `marque='filmpro'`) ; zéro dette ; tout sourcé. Skills design : `redesign-skill`, `soft-skill`, `theme-factory`, `ANTI-AI-SLOP.md`.
- **État : Run 1/2/3 DÉPLOYÉS EN PROD** (import liste + « Ma liste » + D3/D4 + QA/e2e + 8 retours macro Pascal). Run 4 Dropcontact / Run 5 Pingen en attente comptes Pascal. → `docs/ATELIER-209-SUIVI.md` + [[project_atelier_209_run3_import_liste_2026-07-16]].

**Note migration** : ce fichier vit dans `CRM/CLAUDE.md` (Vercel `rootDirectory: CRM`) ; container racine = stub. → `memory/project_appfactory_restructure.md`.

**Statut :** Portail multi-outils en prod : CRM (`/crm`) + Découpe (`/decoupe`) sur `filmpro-portail.vercel.app`. Trunk = `main` (push auto-déploie, intermittent - cf. Watch) ; Flag `ffCrmListesV2` **ON fondateurs**. **À FAIRE Pascal** : comptes Dropcontact & Pingen + variable Daily Email (§ Chez Pascal). Historique → `archive/`.
**Dernière mise à jour :** 2026-07-20 (Cohérence UI lot 2A livré `4e45bb8` derrière `ff_ui_coherence` OFF ; veille LED cadrage v1 validé ; Twenty/ScrapeGraph → Dropcontact remplace Hunter, timeline prio 1, MCP parké. Vitest **2863**. → `docs/ATELIER-209-SUIVI.md` + `docs/COHERENCE-UI-BANDEAU.md`). **Prochain bug :** #001.


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

- **Prod** : https://filmpro-portail.vercel.app (Vercel git auto-déploie `main`, intermittent ; `vercel deploy --prod` manuel dispo) ; ancienne `filmpro-crm.vercel.app` → 308. Supabase EU (projet `appfactory`, 10+ tables, RLS active).
- **Auth** : OTP email 6 chiffres @filmpro.ch + session 7j httpOnly ; SMTP Resend (domaine vérifié, free plan).
- **APIs** : Zefix REST + search.ch + fal.ai Flux 1.1 Pro Ultra (clé partagée Enseignement).
- **Crons** : 6 crons Vercel `/api/cron/{signaux,alertes,lead-rescore,daily-email,intelligence-archive,nettoyage-crm}` (`CRON_SECRET` + service role). Veille hebdo = GitHub Actions vendredi (pas cron Vercel).
- **Tests** : Vitest **2863** (vérifié 2026-07-20, lot 2A) + Playwright e2e (P1/P2/P3 Prospection). a11y : focus trap + ConfirmModal, axe-core 0 violation. Sécurité : Zod 20 endpoints, rate limiting 10/min (+60/min routes publiques), headers CSP/XFO, secrets timing-safe.

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

**Prochaine attaque** : chantier Atelier 209 à **3/7 runs en prod** ; reste 4 runs + les améliorations CRM, livrés en **5 phases logiques** (pas de priorisation, on a le temps → tout est à livrer) : (1) figer la base visuelle, (2) poser la timeline, (3) rendre LED autonome (Run 7 veille), (4) compléter le pipeline de contact (Runs 4/6/5), (5) coiffer (outil Coûts + aide bi-marque). Runs 4/5 bloqués chez Pascal (comptes Dropcontact/Pingen). On **enchaîne par la Phase 1** (Cohérence UI lot 2B, mockup b/c/d déjà validé, `ff_ui_coherence` OFF). Résumé exécutif validé Pascal 2026-07-20. Micro validé AVANT Pascal (→ [[feedback_qa_micro_mon_ressort_gate_pas_excuse]]).

### Directive permanente (Pascal 2026-07-15) : zéro régression + miroir exact + QA avant/après

**Toute intervention sur le CRM préserve 100 % de l'existant** (miroir exact, zéro régression) + **check QA avant/après** sur la vraie vue ; corriger le défaut nommé, jamais « redessiner » ce qui marche. **Piège** : la preview locale par défaut est non-premium → poser `ff_crm_listes_v2 = true` (+ `ff_decoupe`) sur l'utilisateur local avant de minter.

### Règle backlog (WIP-limité, gravée 2026-06-28)

Le « **backlog dev** » ne liste QUE l'actionnable-par-Claude sans dépendance externe (gestes Pascal → marqueur `[BLOQUÉ - toi : ...]` ; attentes datées → § Parking ; idées → Watch). No-debt strict ; titre bloqué = `[BLOQUÉ - {qui/quoi débloque}] {action}`. → [[feedback_backlog_wip_anti_gonflement]]. Baseline saine (**2863 verts**, build OK).

### Plan de livraison - 5 phases (ordre logique, tout à livrer, sans priorisation)

Ordre par dépendances, pas par urgence (on a le temps → tout est à livrer). `[BLOQUÉ - toi : ...]` = geste chez Pascal (compte/variable/sign-off) ; le reste = actionnable par Claude. Estimations + « pourquoi cet ordre » : résumé exécutif validé Pascal 2026-07-20.

**Phase 1 - Figer la base visuelle** (avant d'ajouter de nouvelles surfaces)

- [ ] **[EXÉCUTABLE]** Cohérence UI b/c/d - **PART 2 lot 2B + c + d** (lot 1 `7518cc1`, lot 2A `4e45bb8` livrés). Reste : INC-10 hauteurs champs ; états vides composants partagés (prop `coherence`) ; a11y `SearchInput` clear-focus ; recherche Aide ; CTAs prospection ; kickers scopés + titres utility inline ; puis **c** (compteurs) + **d** (grille 8px). Page par page derrière `ff_ui_coherence`, QA OFF/ON DOM, zéro régression. → `docs/COHERENCE-UI-BANDEAU.md` + [[project_coherence_ui_lot2a_2026-07-20]].
- [ ] **[EXÉCUTABLE - GATE mockup]** Retouches accueil (`AtelierShell.svelte`) : hero HD plus grand (source 2x), proportion 2/3 image / 1/3 bandeau, blocs aérés/alignés grille, boutons OTP mêmes dimensions, fondu premium image↔bandeau. `redesign-skill`, maquette Chrome d'abord. → `docs/ATELIER-209-SUIVI.md` § Retouches accueil.
- [ ] **[EXÉCUTABLE - GATE mockup]** Surfacer le bouton « Importer une liste » sur mobile (<768px) : aujourd'hui `hidden md:inline-flex` → planqué dans le menu « … » **pour les 2 marques** (cause perçue de bug 1). À décider avec toi (maquette) si tu veux le rendre proéminent sur mobile. → bug 1 fermé, [[feedback_qa_micro_mon_ressort_gate_pas_excuse]].
- [ ] **[EXÉCUTABLE]** Bandeau (a) : allumer `ff_page_bandeau` sur les fondateurs quand tu veux (option : alléger le greeting Dashboard en vue premium). Rendu déjà en prod derrière le flag OFF. → `docs/COHERENCE-UI-BANDEAU.md`.

**Phase 2 - Poser la mémoire du prospect** (le journal que les canaux de contact alimenteront)

- [ ] **[EXÉCUTABLE - GATE mockup]** Timeline d'interactions par prospect : brancher la table `activites` (dormante depuis l'origine, jamais lue dans `src/`) en journal chronologique (appel/email/note/statut/prochaine action) sur la fiche entreprise + slide-out. Pattern `VisitsPanel` (mode timeline) + endpoints d'écriture + parité bi-marque. Comble le trou CRM le plus visible ; schéma déjà en base. Mockup Chrome AVANT code. → analyse concurrentielle Twenty/ScrapeGraph 2026-07-19.

**Phase 3 - Rendre LED autonome (bi-marque complet)**

- [ ] **[EXÉCUTABLE]** Run 7 - Veille LED Studio : construire le moteur de veille de l'environnement LED (volet business romand + volet techno/produits mondial), cadrage v1 validé 20/07 (2 axes produits/techno, ICP petits commerçants, 2 lentilles prospection≠techno, Zefix marque-aware, format golden). Aujourd'hui l'env LED affiche encore du contenu FilmPro (cron `marque='filmpro'` fixe). Anti-hallu du moteur hérité + validé. → `docs/ATELIER-209-SUIVI.md` (Run 7) + [[project_veille_led_cadrage_test_2026-07-20]].

**Phase 4 - Compléter le pipeline de contact** (trouver le décideur → contacter → mesurer ; Runs 4/6/5)

- [ ] **[EXÉCUTABLE]** Emailing prospection automatisée : moteur de séquences d'emails aux prospects (Resend, **templates pré-rédigés, zéro LLM**). Étape 1 = cadrage court Pascal (pas de réunion), puis code + gate OFF par défaut. Gate prod : DNS `send.filmpro.ch`, base légale nLPD, contenu validé. (Ex-« Vague 4 ».)
- [ ] **[BLOQUÉ - toi : décider l'abonnement quand le volume le justifie]** Enrichissement décideur = **Dropcontact** (choisi vs Hunter). Validé test réel 20/07 (6/10 nominatifs propres, 0 `info@`, RGPD-native) ; compte gratuit testé, passer au Starter **29 €/mois** quand le volume le justifie. Repli micro-PME sans site = Zefix + appel. Débloque Run 4. → `docs/ATELIER-209-SUIVI.md` + [[project_veille_led_cadrage_test_2026-07-20]].
- [ ] **[BLOQUÉ - toi : créer le compte]** Compte Pingen (sans abonnement, ~1,58 CHF/lettre, pingen.com). Débloque V7 → Run 5 (envoi postal). → `docs/ATELIER-209-SUIVI.md`.

**Phase 5 - Coiffer : observer et documenter**

- [ ] **[EXÉCUTABLE - maquette validée]** Outil « Coûts des outils » : sortir la page Coûts du CRM → 3e outil sur l'accueil (premium « Heure bleue »). Agrège 4 sources : veille Claude API, fal.ai, Firecrawl, Dropcontact (29 €/mois fixe). Exclut l'abo Claude perso. Maquette `.atelier-209/retours-maquettes/atelier209-retours.html`.
- [ ] **[BLOQUÉ - CRM bi-marque 100 % livré]** Mettre à jour les 2 pages d'aide (FilmPro + LED Studio) : contenu majoritairement commun, mais **les spécificités de chaque marque** prises en compte. À faire une fois le CRM bi-marque terminé. (Retour Pascal 16/07.)

### Gestes Pascal transverses (hors phases, quand tu veux)

- [ ] **[EXÉCUTABLE]** URL Atelier 209 : configurer `atelier209.vercel.app` comme domaine de prod **public** (réglages Vercel), vérifier 200 public, PUIS activer le redirect 308 de `filmpro-portail`. Renommer ne suffit pas (SSO). → [[project_atelier_209_run1_deploiement_2026-07-15]].
- [ ] **[BLOQUÉ - toi : poser 1 variable Vercel]** Allumer l'envoi du Daily Email : `EMAIL_DAILY_ENABLED=true` en env Vercel Prod (zéro redéploiement, gate OFF = 0 envoi ; le smoke OTP prérequis est fait). → [[project_daily_email_module_2026-06-25]].
- [ ] **[BLOQUÉ - toi : sign-off visuel sur la prod]** Valider le flux d'import de liste (Run 3) directement sur la prod : Prospection → onglet « Ma liste » (ou bouton « Importer une liste » sur Entreprises) → déposer un CSV → colonnes → aperçu → import. → `docs/ATELIER-209-SUIVI.md` (Run 3).

### Coupé du backlog (→ watch, plus des tâches)

Décisions tranchées (détail en mémoire) : domaine `atelier209.ch` = pas d'achat (URL = renommage Vercel) ; durcissement RLS conditionnel à un « user normal » → [[feedback_rls_multitenant_durcissement_si_4_users]] ; knip faux positif `MINUTE_MS`/`RATE_LIMIT_WINDOW_MS` assumé → [[feedback_knip_verify_grep_before_delete]] ; time-box session Supabase = geste one-shot, non-faille → [[audit_secu_2026-06-29_session_delog_7j]].

### Livré cette session

- [x] ~~**Cockpit renommé « Atelier 209 » + synchro complète des tâches (14 propres)**~~ - 2026-07-20 (ultracode). Label FilmPro→Atelier 209 (6 emplacements cockpit, slug/dépôt intacts) ; Run 7 veille LED créé (pivot `created=1/updated=13`, 0 churn) ; 2 doublons (Hunter, ancienne Cohérence UI) supprimés + tombstone ; blocs remappés (Dropcontact, nouvelle Cohérence) ; intégrité 0 id mort. CLAUDE.md « Prochaine session » restructuré en 5 phases. Fix a11y SearchInput écrit puis reverté (non prouvé e2e, doc `COHERENCE-UI-BANDEAU.md`). → [[reference_cockpit_pivot_orphelins_manuels_2026-07-20]].
- [x] ~~**Cohérence UI lot 2A - modales/surfaces/eyebrows/titres**~~ - 2026-07-20 (ultracode). `4e45bb8` derrière `ff_ui_coherence` OFF (16 fichiers) : INC-4 modales→radius-2xl (bottom-sheet mobile préservé), INC-6 shadow-card (reporting/campagnes), INC-8 21 eyebrows gatés, INC-9 titres→700. QA OFF/ON DOM réel + mobile + adversarial 3 lentilles REFUTED-clean, svelte-check 0/0, Vitest 2863. → [[project_coherence_ui_lot2a_2026-07-20]].
- [x] ~~**Veille LED Studio - cadrage v1 + test golden + anti-hallu**~~ - 2026-07-20 (ultracode). Run 7 cadrage figé (2 axes produits/techno, ICP petits commerçants, signaux forts/faibles, Zefix marque-aware, format golden) ; test réel golden + anti-hallu prouvé (fact-check attrape 9/10 hallucinations). → [[project_veille_led_cadrage_test_2026-07-20]], `docs/ATELIER-209-SUIVI.md`.
- [x] ~~**Parité bi-marque WP-A/B/C + 2 HIGH + 2 gate-free (5 déploiements prod 17-18/07)**~~ - condensé → `archive/claude-md-crm-livre-2026-07-20.md` + [[feedback_bi_marque_parity_qa_en_sortie]].
→ Antérieurs (Analyse concurrentielle Twenty/ScrapeGraph 19/07, Cohérence UI b, Campagnes, e2e validation, Run 3/2/1, login OTP, veille/étiquettes/refonte/Aide/Découpe/Daily Email) → archives `claude-md-crm-livre-2026-07-{20,18,17,16,15,14,03,02}.md` + `-06-26.md` ; mémoires [[project_coherence_ui_increment_b_part2_2026-07-17]], [[project_atelier_209_run3_import_liste_2026-07-16]].

### Watch list active après pivot

- **[WATCH] MCP FilmPro (piloter le CRM en langage naturel) - parké 2026-07-20** : faisable (connecteurs MCP distants sur Claude.ai/Cowork/Desktop) MAIS serveur MCP public = expose PII → décision structurelle nLPD à cadrer (lecture seule, OAuth) AVANT build. Parké jusqu'à livraison timeline (prio 1). → analyse concurrentielle Twenty/ScrapeGraph 2026-07-19.
- **[WATCH] URL `atelier209.vercel.app` différée (15/07)** : renommer le projet Vercel ne rend pas le domaine public (SSO de déploiement). Cutover = config domaine de production Vercel + redirect 308, étape dédiée. App canonique = `filmpro-portail.vercel.app`. → [[project_atelier_209_run1_deploiement_2026-07-15]].
- **[WATCH] RLS mono-tenant plate à durcir avant un « user normal » (15/07)** : tout compte connecté voit tout le PII client ; les rôles ne protègent que l'édition mots-clés + retours. Recrutement à venir = trigger (durcir `created_by = auth.uid()` + tests RLS). → [[audit_secu_2026-07-15_atelier209_run1_roles_rls]] + [[feedback_rls_multitenant_durcissement_si_4_users]].
- **[WATCH] Veille LED = cadrage v1 VALIDÉ (20/07), build Run 7 à faire** : cadrage figé (2 axes produits/techno, ICP petits commerçants, signaux forts/faibles, Zefix marque-aware, format golden). Tant que le build n'est pas fait, l'env LED affiche du contenu FilmPro (cron `marque='filmpro'` fixe). Anti-hallu du moteur validé (hérité). `secteurs.ts` LED validés ; token « led » nu écarté (« Ledermann »/« Toledo »). → `docs/ATELIER-209-SUIVI.md` (Run 7) + [[project_veille_led_cadrage_test_2026-07-20]].
- **[WATCH] Login OTP dépend d'un réglage Supabase hors-repo + clé Resend (14/07)** : rechute **silencieuse** si clé Resend rotée / domaine perd sa vérif Resend / changement de domaine oublie ce canal. → [[project_login_otp_smtp_supabase_2026-07-14]].
- **[WATCH] Validation externe - 3 Low différés (bug-hunter 02/07)** : flux direct non-occurrent, validation protégée. → [[project_validation_externe_campagne_2026-07-02]].
- **[WATCH] Surfaces refondues premium (`ffCrmListesV2` ON fondateurs)** : Signaux/Étiquettes/Aide/Découpe + campagnes à l'œil ; rollback = flag OFF / `vercel rollback`. → [[project_campagnes_panneau_prospects_fix_etiquetage_2026-07-02]].
- **[WATCH] Veille FilmPro (crons du vendredi)** : vérifier un seul email (brief brandé antoine@+pascal@) + pas d'alerte `mix_drift` GHA si part locale ≥ 30 % ; densité cible 8-12. → [[feedback_pause_turn_reprise_pas_echec]].
- **[WATCH] Vercel auto-deploy git intermittent** (a raté `db6182e`) : vérifier `vercel ls` après chaque push, `vercel --prod` manuel au besoin.
- **[WATCH] Gotchas techniques persistants** (détail en mémoire) : jamais `rm package-lock.json` (CI Dependabot → [[project_fix_deps_ci_vercel_2026-06-22]]) ; Svelte 5 `onDestroy` en SSR → cleanup via `$effect` ([[feedback_svelte5_ondestroy_ssr_window_undefined]]) ; réactiver une source V5 coupée = re-vérifier Zod/quota/rate-limit/anti-hallu + **scoring marque-aware** (regbl/simap NON threadés : sources coupées métier construction=FilmPro ; si réactivées en LED, câbler `marque`). → [[audit_secu_2026-06-07_v5_signaux_prospection]].

→ Watch list complète (Signaux V4 perf/contrats S189, S188, S186, S178, S171) déplacée dans `archive/2026-05-28-pivot-mobile-v3.md`. Restent triables si l'objet redevient actuel.

### Livré (référence historique)

→ Livré V2 + sessions antérieures (S171→S192bis) dans `archive/` (`2026-05-28-pivot-mobile-v3.md`, `2026-05-25/13/10/09/08-sessions.md`).

