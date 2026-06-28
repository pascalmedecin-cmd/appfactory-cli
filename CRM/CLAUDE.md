# CRM FilmPro : CLAUDE.md

**Note migration** : ce fichier vit dans `CRM/CLAUDE.md` (path Vercel `rootDirectory: CRM`) ; container racine = stub. Contexte → `memory/project_appfactory_restructure.md`.

**Statut :** Portail FilmPro multi-outils en prod : CRM (`/crm`) + Découpe Films (`/decoupe`) sur `filmpro-portail.vercel.app`. Formation IA = projet autonome `Formation/` (`cc` option 5). Historique (V3 terrain, Signaux V4, golden v9, restructure S173-S174) → `archive/`.
**Dernière mise à jour :** 2026-06-26. Trunk unique = `main` (reconciliation `1065fb1`, branche supprimée ; Dependabot trié, 0 PR ouverte). Flag `ffCrmListesV2` **ON `pascal@`+`antoine@`** → refonte Vagues 1+2+3 live. Prod = `filmpro-portail.vercel.app` : **push `main` auto-déploie en production** (vérifié live 26/06 ; détail → WATCH Vercel). Livraisons → § « Livré cette session ». **Prochain bug :** #001.
**Session courante :** 2026-06-27 - **Bloc D audit 360 CLOS EN PROD** (`cd5426e`, push direct prod, smoke OK). 8 différés arbitrés (Pascal) + livrés ; 2301 verts, bug-hunter opus 1 HIGH corrigé. **À FAIRE Pascal** : valider visuellement (pastille Signaux / modale motif) + Bloc B (smoke OTP + `EMAIL_DAILY_ENABLED=true`) + revue PDF veille. Détail → § Livré + `memory/project_bloc_d_audit_360_PROGRESS.md`.
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

- **Prod** : https://filmpro-portail.vercel.app (Vercel : **git integration auto-déploie `main` en prod à chaque push**, vérifié live 26/06 ; `vercel deploy --prod` reste dispo en manuel) ; ancienne `filmpro-crm.vercel.app` conservée et redirigée 308 → nouvelle (hook). Supabase EU (projet `appfactory`, 10+ tables, RLS active, service role key configurée)
- **Auth** : OTP email 6 chiffres @filmpro.ch + session 7 jours httpOnly ; SMTP Resend (domaine verifié, free plan)
- **APIs** : Zefix REST + search.ch + fal.ai Flux 1.1 Pro Ultra (partage clé avec Enseignement) - Pexels/Unsplash supprimés S67
- **Crons** : `/api/cron/{signaux,alertes,nettoyage-crm,intelligence,intelligence-archive}` tous sécurisés `CRON_SECRET` + service role (Cron `media-enrich` supprimé S67)
- **Tests** : Vitest 2324 (dernier run vérifié 2026-06-26, avec supabase 2.108 + TS6 ; +2 garde icon-map) + Playwright e2e (suite + P1/P2/P3 Prospection). Accessibilité : focus trap + ConfirmModal partout, axe-core 0 violation modale P3. Sécurité : Zod sur 20 form actions/endpoints, rate limiting 10/min, headers CSP/XFO/referrer, timing-safe secrets

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

**Prochaine attaque** : **Bloc D CLOS EN PROD** (8 différés arbitrés+livrés 2026-06-27, `cd5426e`, smoke OK). Reste, par ordre : (1) **gestes Pascal Bloc B - Daily Email** : smoke OTP prod + activer `EMAIL_DAILY_ENABLED=true` ; (2) **Bloc C dashboard qualité veille** (attend 1re mesure W27) ; (3) **chantier différé #3 : refonte serveur page Entreprises** (filtre/pagination serveur + count par onglet + KPI globaux, façon /prospection - voir tâche dédiée ci-dessous, à déclencher si le volume grossit) ; (4) **Vague 4 Emailing** (bloqué 3 inputs Pascal). **Séquence refonte CRM** : ~~A~~ → ~~C (faisables)~~ → B (gestes Pascal) → ~~D (audit UI 360 + 8 différés)~~ CLOS. Refonte Vagues 1+2+3 live (flag `ffCrmListesV2` ON fondateurs). **Prod = `main` auto-déployée (Vercel git).** → [[project_bloc_d_audit_360_PROGRESS]] + [[project_refonte_crm_cadrage_2026-06-18]].

> Cadrage refonte UX/UI CRM (validé 2026-06-18) + golden `CRM/.product-architect/refonte-vague3/golden-vague3-v1.html` → [[project_refonte_crm_cadrage_2026-06-18]]. **1 bloc = 1 session autonome.** Séquence : A → B → C → D (porte de clôture).

### 1. Bloc B - Daily Email : smoke OTP a posteriori + activation [SUPERVISÉ • medium • court]

- Code sur `main` (`d1db821`), 100% déterministe, **déjà AUTO-DÉPLOYÉ en prod** (push main → Vercel git integration). Gate `EMAIL_DAILY_ENABLED` **OFF** → 0 envoi tant que non activé. → [[project_daily_email_module_2026-06-25]] + [[audit_secu_2026-06-26_daily_email_module]].
- [ ] **[BLOQUÉ - geste manuel Pascal (login OTP @filmpro.ch)]** **Smoke OTP prod A POSTERIORI (à faire vite)** : supabase 2.108 + TS6 sont DÉJÀ live (push `f357e68` 17:20, auto-deploy non anticipé par les sessions précédentes). Vérifier 1 login OTP en prod. **Si KO → `vercel rollback` immédiat.** (Boot + page login OK, vérifiés live 26/06 ; reste le flux OTP end-to-end.)
- [ ] **[BLOQUÉ - geste manuel Pascal (accès env Vercel)]** **Activer Daily Email** = poser `EMAIL_DAILY_ENABLED=true` en env Vercel Prod (zéro redéploiement, lu via `$env/dynamic/private`). Gate OFF = aucun envoi avant ce geste.

### 2. Bloc C - Veille Lot 3 : reste dashboard qualité [SUPERVISÉ • high • session dédiée]

- [x] ~~PDF de marque + pont veille→action (fix cul-de-sac chips vers sources dormantes RegBL/SIMAP) + nettoyage enum RegBL + décision NO-OP « décomposer le mono-appel LLM »~~ - LIVRÉ + AUTO-DÉPLOYÉ prod 2026-06-26 (`b767056`, push main → Vercel, CI verte). Workflow adversarial 4 lentilles 0 C/H. → [[project_veille_bloc_c_pont_pdf_2026-06-26]] + [[audit_secu_2026-06-26_bloc_c_veille_pont_pdf]].
- [ ] **[BLOQUÉ - attend 1re mesure W27]** dashboard qualité veille + boucle feedback (décision Pascal : après la 1re mesure réelle du sourcing élargi). → [[project_veille_sourcing_w26_2026-06-23]].

### 3. Bloc D - Audit UI 360 [CLOS EN PROD 2026-06-27]

- [x] ~~Audit 360 (90 findings) + V1→V5f + 8 différés livrés EN PROD~~ - 2026-06-27 (`fe1eaa7`→`cd5426e`). Détail § Livré + [[project_bloc_d_audit_360_PROGRESS]] § DIFFÉRÉS.

### 3bis. Chantier différé - Refonte serveur page Entreprises (#3 Bloc D) [EXÉCUTABLE - différé décision Pascal • high]

- [ ] **[EXÉCUTABLE - différé Pascal 2026-06-27, déclencher si le volume grossit]** **Refonte serveur `/crm/entreprises`** : passer le filtrage onglet + recherche en URL params traités côté serveur (filtre + pagination Postgres) façon `/prospection`, PLUS requêtes `count:'exact'` par onglet, PLUS agrégats KPI globaux séparés. Aujourd'hui : `select('*')` sans `.limit()` + filtrage 100% client-side (golden §6 « filtrage client-side > 50 lignes » + §9.2). **Impact réel faible au volume actuel** (mono-tenant) → différé. **Ne PAS appliquer un `.limit()` nu ni un filtre serveur partiel** : casse silencieusement les compteurs d'onglets + KPI (qui itèrent sur la liste complète). Refonte complète uniquement. Golden L444 « À refondre ». → `memory/project_bloc_d_findings_restants_handoff.md` (finding entreprises/+page.server.ts) + [[feedback_kpi_premium_global_aggregates_not_paginated_page]].

### 4. Bloqués - Vague 4 emailing + migration socle (dépendances réelles, pas dette active) [SUPERVISÉ • xhigh • bloqué]

- [ ] **[BLOQUÉ - 3 inputs Pascal]** **Vague 4 Emailing** (individuel → nLPD → groupé) : (a) DNS `send.filmpro.ch` vérifié Resend, (b) base légale nLPD + mention d'information validées, (c) 1er email réel décrit (réunion 3 fondateurs). Dès fourniture → cadrage + code (pas une dépendance système). → cadrage § Garde-fous emailing.
- [ ] **[BLOQUÉ - amont rolldown/layerchart]** **Migration socle SvelteKit (vite 8 / plugin-svelte 7 / kit 2.66)** : issues amont #928/#1313 ouvertes. Rouvrir quand l'amont est clean : lever les `ignore` socle `dependabot.yml`, monter le trio groupé, CI verte. **Ne JAMAIS `rm package-lock.json`** (regen flote les transitifs). → [[project_fix_deps_ci_vercel_2026-06-22]].

### Réserve (hors backlog actif)
- Chantier 3 portail (non cadré) ; durcissement RLS si 4e user ([[feedback_rls_multitenant_durcissement_si_4_users]]).
- **[SIGNAL]** knip liste ~30 `scripts/*` + `.product-architect/*` + `playwright.*.config.ts` + `tests/mint-session.mjs` comme « non importés » : **pas du code mort** (CLI-invoqués / specs / infra e2e), gardés. Archivables un jour si Pascal le décide (ex : `apply-*-migration` appliquées → `archive/`).
### Livré cette session

- [x] ~~**Bloc D audit 360 - 8 différés arbitrés + livrés EN PROD (clôture)**~~ - 2026-06-27 (ultracode/xhigh, `cd5426e`, push direct prod + smoke OK). Décisions Pascal (AskUserQuestion) : #1 pastille Signaux uniformisée sur **ScorePill** (modes value/full + variante temperature ; système saturé `signal-score-pill` supprimé code+CSS+helpers+tests ; dégradé golden §6 + échec WCAG AA réglés), #4 empty-state prospection → recherche P3 (**e2e migré + relancé vert**), #8 saisie motif de perte (liste fermée + champ libre + ré-affichage fiche) ; #3 refonte serveur Entreprises **différée** (→ §3bis) ; #2 KpiStrip documenté golden §3.2bis, #5/#6 won't-fix tracés (commentaires code), #7 AideDiagram aligné config scoring réelle. 6 commits `fea3cec`→`cd5426e`. **bug-hunter opus** : 1 HIGH (motif contaminait l'opp suivante si annulé) trouvé + corrigé (reset à l'ouverture + toutes sorties). 2301 verts, check 0/0, build OK. → [[project_bloc_d_audit_360_PROGRESS]] + [[audit_secu_2026-06-27_bloc_d_v4_v5_fixes]].
- [x] ~~**Bloc D V4+V5 (63 findings) LIVRÉ EN PROD**~~ - 2026-06-27 (`fe1eaa7`) : 63 findings traités, audit sécu 0 C/H/M/L, -247 lignes (code mort + fuite Clearbit). 2319 verts. → [[project_bloc_d_audit_360_PROGRESS]].
- [x] ~~Fix icônes « ? » prod (`a6ae0e1`) + Bloc C veille pont/RegBL + PDF de marque (`b767056`)~~ - 2026-06-26 → archive.
→ Antérieurs archivés (Bloc A `f357e68`, Bloc 0 `1065fb1`, Bloc 2 Dependabot, Non-veille 26/06, Audit 360, Daily Email `d1db821`, Vague 3.3 `ebacea6`, Campagnes V3.2) → `archive/claude-md-crm-livre-2026-06-26.md`. Plus anciens (24/06-) → mémoires veille 06-22/23/24 + `archive/`.

### Watch list active après pivot

- **[WATCH] Refonte CRM 1+2+3 activée fondateurs (`ffCrmListesV2`)** : surfaces premium à surveiller à l'usage. **Bug 5 résiduel** : menu `...` slideout Signaux (ouverture vers le haut en conteneur scrollable), à corriger s'il re-saute. Rollback = flag OFF (`raw_app_meta_data`).
- **[WATCH] W26 a tourné 26/06 (success, 7 items, local 71%, keptByTrust=1)** : confirmer le rendu du brief en boîte (0 `<cite>`/emoji, qualité). **W27** = 1er run sur 238 sources (post-reconciliation Bloc 0) + nouvel horaire 02:27 UTC → surveiller densité/mix/horaire réel. → [[project_veille_sourcing_w26_2026-06-23]].
- **[WATCH] Svelte 5 `onDestroy` s'exécute en SSR Vercel** (pas en `vite preview`) : window/document/localStorage/setInterval à cleanup → `$effect(() => {...; return () => cleanup})`. Tester en preview branch. → `feedback_svelte5_ondestroy_ssr_window_undefined.md`.
- **[WATCH] Vercel : push `main` AUTO-PROMEUT en prod** (git integration, vérifié live 26/06 ; contredit l'ancienne note « deploy manuel »). Exception = après un `vercel rollback` l'alias peut rester épinglé (un push builde sans promouvoir) ; vérifier via `vercel inspect filmpro-portail.vercel.app`.
- **[WATCH] Réactivation d'une source coupée V5 (2026-06-07)** : flip de flag → re-vérifier les contrôles d'origine (Zod, quota, rate-limit, anti-hallu) AVANT de rallumer en prod. Réf `audit_secu_2026-06-07_v5_signaux_prospection.md` § I-3.

→ Watch list complète (Signaux V4 perf/contrats S189, S188, S186, S178, S171) déplacée dans `archive/2026-05-28-pivot-mobile-v3.md`. Restent triables si l'objet redevient actuel.

### Livré (référence historique)

→ Livré V2 + sessions antérieures (S171→S192bis) dans `archive/` (`2026-05-28-pivot-mobile-v3.md`, `2026-05-25/13/10/09/08-sessions.md`).

