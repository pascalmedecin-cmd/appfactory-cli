# CRM FilmPro : CLAUDE.md

**Note migration** : ce fichier vit dans `CRM/CLAUDE.md` (path Vercel `rootDirectory: CRM`) ; le container racine est un stub pointant vers les sous-projets. Contexte migration complet → `~/.claude/projects/-Users-pascal-Claude-Projets-FilmPro/memory/project_appfactory_restructure.md`.

**Statut :** Clean state 2026-05-28 — refonte mobile V2 **abandonnée** après smoke iPhone (overscope, lisibilité) → pivot **V3 outil terrain only** (`archive/2026-05-28-pivot-mobile-v3.md`). **Antérieur en prod** (Signaux V4, Log CRM, Aide, audit 360, Google Places, golden v9, migration restructure S173-S174) → détail `archive/2026-05-06-sessions.md` + Livré ci-dessous. Formation IA = sous-projet autonome `Formation/`, `cc` option 5.
**Derniere mise a jour :** 2026-06-04 (bascule adresse prod → `filmpro-portail.vercel.app`, chantier 1 portail clos)
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** 2026-06-04 - **Bascule adresse prod livrée (gate 5, chantier 1 portail clos)** : prod publique = `filmpro-portail.vercel.app` (domaine de projet Vercel = voie C contournant le mur SSO ; un alias serait resté protégé). `PUBLIC_APP_URL` + Supabase alignés ; redirect 308 ancien host → nouveau (`/api/*` exempté). Login OTP validé, audit 0 H/C/M, baseline figée. Détail → Livré ci-dessous. Reste : finitions Bloc 0 puis chantier 2 Devis.
**Sessions précédentes (condensé)** - détails dans `archive/` (S165-S175 : `2026-05-06-sessions.md` ; S122-S125 : `2026-04-28-sessions.md` ; S70-S107 : `decisions-sessions-*.md` + `Formation/CLAUDE.md`).


---

## SOUS-PROJETS

L'arborescence d'AppFactory héberge des sous-projets autonomes (chacun a son propre repo Git, sa propre stack, son propre CLAUDE.md). Pascal navigue par thème depuis ce dossier.

| Dossier | Repo Git | Statut | URL prod | CLAUDE.md |
|---------|----------|--------|----------|-----------|
| `CRM/` (CRM FilmPro) | `pascalmedecin-cmd/appfactory-cli` (=racine actuelle) | Production | <https://filmpro-portail.vercel.app> (ancienne `filmpro-crm` conservée → 308) | (ce fichier) |
| `Formation/` | `pascalmedecin-cmd/onboarding-ia` (séparé, ignoré dans `.gitignore`) | S1→S7 livrés (12/12 modules en prod) | <https://onboarding-ia.vercel.app> | `Formation/CLAUDE.md` |

> Consulting est sibling autonome depuis 2026-05-07 (S175 Bloc 0 PLAN_ATTAQUE) : path `~/Claude/Projets/Consulting/`, repo Git séparé. Voir son `CLAUDE.md` propre dans `~/Claude/Projets/Consulting/CLAUDE.md`. `cc 4` cd vers ce path.

Pour travailler sur un sous-projet : taper `cc` au terminal et choisir `5. Formation IA` (ou `4. Consulting` qui pointe vers le sibling autonome). Claude Code atterrit directement dans le sous-dossier, charge son `CLAUDE.md` propre (plus léger), et les tâches sont scopées. Les tâches du sous-projet sont tracées dans son CLAUDE.md, pas dans celui-ci.

**`/start` à la racine AppFactory = scope CRM FilmPro** (slug=appfactory, subproject=crm). Affiche les tâches `transmitted` du sous-projet CRM uniquement. Formation IA a sa propre entrée au menu terminal `cc` (cd Formation/ → /start scope Formation IA). Source : `~/.claude/cockpit/projets/appfactory/entries.jsonl` filtré par subproject.

**Extensibilité pédago** (Formation IA) : l'ingestion d'une deep research markdown (marketing aujourd'hui, opération/commercial/autres demain) suit un workflow conversationnel Claude Code CLI piloté par **Opus 4.6**. Règles pédago dans `Formation/docs/PEDAGOGIE.md`, protocole d'ingestion dans `Formation/docs/INGESTION.md`.

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

- Repo separe `appfactory-cli` (ancien `appfactory` reste consultable)
- Workflow prioritaire : construire le cycle core avant d'attaquer FilmPro
- FilmPro = premier projet reel du nouveau workflow (dogfooding)
- Figma Pro abandonne (deep research 2026-04-04 : ratio cout/benefice defavorable pour solopreneur code-first)
- Design = approche code-first : composants custom + kits Figma Community gratuits comme inspiration
- Validation client = prototypes Vercel preview (pas de maquettes Figma)
- CSS scoped obligatoire pour le layout structurel (sidebar, header, nav) : Tailwind responsive (md:hidden, md:block) ne fonctionne pas avec Tailwind v4 pour ce cas
- HTML temporaires pour previsualisations client a chaque etape cle
- Ancien projet AppFactory v1 (Apps Script) = archive consultable, pas de migration

### Decisions UX + Prospection (G36)

→ Archive intégrale : `archive/decisions-structurelles-crm.md` (6 écrans principaux, slide-out panels, saisie rapide, 100% sources gratuites, modèle unifié `prospect_leads`, scoring auto 0-13). Specs prospection complètes : `docs/SPECS_PROSPECTION.md`.

### Doctrine styling : Tailwind utilities + CSS scoped

→ Règle tranchée S180 (audit 360 V3b I-04) : Tailwind utilities pour le détail réutilisable (spacing/couleurs via tokens/typo/états/responsive trivial côté contenu, jamais off-grid `p-[13px]`), `<style>` scoped Svelte pour le layout structurel (sidebar/header/kanban) + keyframes/transitions (token `--ease-out-expo`) + pseudo-éléments + `:global()` ciblés ; jamais de CSS global ad hoc hors `app.css` / `!important` / classe dupliquant un token ; primitives (`Button`/`Input`/`Card`/`Modal`/`DataTable`/`Tabs`) = source unique, on compose. Détail : `memory/feedback_crm_styling_doctrine.md`.


### Sécurité - décisions assumées (audit 360 V3b L-02, L-03)

- **CSP `unsafe-inline` (L-02)** : la `Content-Security-Policy` posée dans `hooks.server.ts` autorise `'unsafe-inline'` sur `script-src` et `style-src`. C'est un **prérequis de l'hydratation SvelteKit** (scripts inline + styles scoped injectés au runtime) ; le retirer imposerait un système de nonce/hash dynamique = refactor framework. Risque résiduel XSS jugé **acceptable** : CRM mono-tenant ≤ 10 admins `@filmpro.ch` (OTP), aucun contenu utilisateur tiers rendu en HTML brut, toutes les sorties dynamiques échappées (`esc()` / `escapeHtml`). À revisiter si SvelteKit expose une option nonce-based simple, ou si une surface UGC apparaît.
- **RLS « mono-tenant plat » (L-03 / L-04)** : ~11 tables ont une policy `FOR ALL TO authenticated USING (true)` — tout utilisateur authentifié voit/modifie/supprime tout (photos, visites, leads, opportunités, veille…). C'est une **décision design assumée** (S127 Q2 Pascal : 3 fondateurs FilmPro symétriques). Les endpoints DELETE photos/visits loggent quand un fondateur agit sur la donnée d'un autre (traçabilité), sans bloquer. **À DURCIR avant l'ajout d'un 4e utilisateur non-fondateur** : passer à des policies `created_by = auth.uid()` (ou rôle admin) + tests d'intégration RLS contre une vraie DB avec une session non-admin. Voir mémoire `feedback_rls_multitenant_durcissement_si_4_users.md` + § RISQUES OUVERTS (M-48, RLS non couverte par les tests Vitest).

---

## INFRA EN PLACE

- **Prod** : https://filmpro-portail.vercel.app (Vercel, déploiement CLI manuel `vercel deploy --prod` ; pas d'auto-deploy git) ; ancienne `filmpro-crm.vercel.app` conservée et redirigée 308 → nouvelle (hook). Supabase EU (projet `appfactory`, 10+ tables, RLS active, service role key configurée)
- **Auth** : OTP email 6 chiffres @filmpro.ch + session 7 jours httpOnly ; SMTP Resend (domaine verifié, free plan)
- **APIs** : Zefix REST + search.ch + fal.ai Flux 1.1 Pro Ultra (partage clé avec Enseignement) — Pexels/Unsplash supprimés S67
- **Crons** : `/api/cron/{signaux,alertes,nettoyage-crm,intelligence,intelligence-archive}` tous sécurisés `CRON_SECRET` + service role (Cron `media-enrich` supprimé S67)
- **Tests** : Vitest 164 + Playwright 5 e2e. Accessibilité : focus trap + ConfirmModal partout. Sécurité : Zod sur 19 form actions, rate limiting 10/min, headers CSP/XFO/referrer, timing-safe secrets

→ Détail intégral (env vars, BDD exhaustive, liste tests, liste crons, headers sécurité, pagination serveur) : `archive/infra-crm-detail.md`

## DOCUMENTATION

- `docs/SPECS_PROSPECTION.md` : Specs completes module prospection (sources, modele, scoring, UI, dedup)

→ Inventaire composants EN PLACE (11 composants, 6 pages, 4 API, scripts) archive dans archive/inventaire-composants.md : consulter si besoin de lister les composants existants avant d'en creer de nouveaux

### Historique condensé (archives)

- Sessions 1-8 : UX 6 écrans, design premium Untitled UI/SnowUI, wizards 5 étapes → `archive/decisions-sessions-1-8.md`
- Sessions 9-16 : auth OTP+MFA, Vercel root `template`, PWA, refonte prospection → `archive/decisions-sessions-9-16.md`
- Sessions 70-77 (formation-ia shared) : cadrage parcours + S1-S5 ingestion → `archive/decisions-sessions-70-77.md`
- Sessions 78-79 (formation-ia shared) : S6-S7 ingestion critère sortie → `archive/decisions-sessions-78-79.md`
- Sessions 122-125 (CRM, V1 mobile) : Lighthouse + Playwright mobile + V1 MOBILE CLOS → `archive/2026-04-28-sessions.md`
- Audit CRM 2026-04-04 (méthodo 5 agents, 4 sprints correctifs) → `archive/audit-crm-2026-04-04.md`

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

- **RLS Supabase non couverte par les tests Vitest (audit 360 M-48, gravé S178 V3a-2)** : la suite Vitest mocke `@supabase/supabase-js` — les politiques RLS n'existent qu'au runtime Postgres, donc **aucun test unitaire ne prouve quoi que ce soit sur le comportement RLS réel**. ~25 vecteurs d'autorisation (form actions + endpoints qui lisent une table à RLS restrictive) sont donc « verts » sans garantie. Fixable seulement par une suite d'intégration contre une vraie DB avec une session user non-admin (pas prévu V1, mono-tenant ≤ 10 admins @filmpro.ch). Avant de construire par-dessus un contrôle d'autorisation : lire le code + vérifier manuellement en prod/staging avec un compte au rôle cible. Incident de référence : 2026-04-18 formation-ia (3 utilisateurs bloqués en prod avec 7 tests Vitest verts). Voir `~/.claude/rules/quality.md` § « RLS Postgres et tests avec mocks », mémoire `feedback_rls_mocks_insufficient_S99.md`, et `feedback_rls_auth_lookup_needs_service_role.md`.

## REGLES TECHNIQUES PROJET

→ Tests mobile/responsive : Chrome DevTools Device Toolbar manuel (Pascal) **obligatoire** ; Playwright `viewport:{width,height}` seul et MCP `resize_window` **interdits** comme substituts (Playwright preset `devices['iPhone 14 Pro Max']` OK pour findings OBJECTIFS uniquement — réf `CRM/tests/mobile.spec.ts`). Règle complète : `memory/feedback_crm_mobile_testing_devtools.md`.


## Prochaine session

**Prochaine attaque** : Bloc 1 - Chantier 2 portail, app Devis FilmPro (session dédiée, SUPERVISÉ). Bloc 0 (finitions post-bascule) clôturé 2026-06-05. Commencer par éponger la dette Session 1 (centraliser les call sites API référentiel), puis cadrage `/product`, puis build.

### 0. Finitions post-bascule adresse [MIXTE • low • ~30 min]

- **Pourquoi** : bascule d'adresse livrée + validée 2026-06-04 (audit sécu 0 H/C/M) ; reste 2 finitions issues de la session : retrait des références legacy + couverture de test du redirect host (F-1 audit, accepté non bloquant).
- [x] **[EXÉCUTABLE - SUPERVISÉ]** Retirer `template-rho-three/auth/callback` des Redirect URLs Supabase - Livré 2026-06-05 (Pascal ; OTP réel revalidé OK ; `filmpro-crm` conservé pour le 308). Voir « Livré cette session ».
- [x] **[EXÉCUTABLE]** Couvrir le redirect host (F-1 audit sécu) - Livré 2026-06-05 (voir « Livré cette session »).

### 1. Chantier 2 portail - app Devis [SUPERVISÉ • high • session dédiée]

- **Pourquoi** : le portail chantier 1 (CRM sous `/crm` + bascule d'adresse) est livré et en prod ; le chantier 2 ajoute le 2e outil du portail (Devis chantier).
- **Prérequis** : cadrage product-architect (`/product`) à lancer ; commencer par éponger la dette nommée Session 1 (centraliser les call sites API référentiel).
- [ ] **[EXÉCUTABLE]** Construire l'app Devis du portail FilmPro : (1) centraliser les call sites API référentiel (dette Session 1), (2) cadrage + specs via `/product`, (3) build. → voir `memory/project_portail_filmpro_multi_outils.md` + `.product-architect/portail/delivery-plan.md`.

### Livré cette session

- [x] ~~Nettoyer Redirect URLs Supabase (retrait legacy `template-rho-three/auth/callback`)~~ - Livré 2026-06-05 (low, SUPERVISÉ, ~0,1h). Pascal a retiré l'URL legacy du dashboard auth/url-configuration (projet `fmflvjubjtpidvxwhqab`) ; `filmpro-crm.vercel.app` **conservé** (le 308 du hook en a besoin) ; **login OTP réel revalidé OK**. Clôt le Bloc 0 (finitions post-bascule). → voir `feedback_filmpro_vercel_deploy_cli.md`.
- [x] ~~Couvrir le redirect host (F-1 audit sécu) + finitions bascule (F-3)~~ - Livré 2026-06-05 (xhigh, ~0,8h). Helper pur `legacyHostRedirect(host, pathname, search)` extrait de `hooks.server.ts` (`src/lib/server/legacy-redirects.ts`) + 4 Vitest (ancien host → cible, `/api/*` → null, nouveau host/inconnu → null, path+query préservés). Behavior-preserving → **redeploy inutile**. **Bonus no-debt** : (a) F-3 aligné (4 fallbacks `PUBLIC_APP_URL` → `filmpro-portail.vercel.app` : `app-url.ts`, `email-recap.ts`, `cross-check.ts`, `url-verify.ts` ; jamais atteints en prod, var posée) ; (b) **restauré les 17 tests sécu H-18 morts** (mal attribués « baseline Sentry » : en réalité kit 2.59 `sequence()` exige le request store + `sentryHandle()` throw sur event mocké → le test invoquait `handle` complet hors runtime kit, court-circuité). Fix propre = exporter `baseHandle` + le tester **en isolation** sur le host courant. **Suite : 1509/1509 verts** (était 1488 verts + 17 rouges ; baseline 17 rouges désormais à ZÉRO), svelte-check 0, security-auditor 0 H/C/M (3 Info). → voir `audit_secu_2026-06-05_finitions_bascule.md`.
- [x] ~~Bascule d'adresse portail → `filmpro-portail.vercel.app` (gate 5, clôture chantier 1)~~ - Livré 2026-06-04 (high, SUPERVISÉ, ~2h). **Blocage imprévu** : un alias `.vercel.app` créé via `vercel alias set` tombe derrière le mur SSO Vercel (`ssoProtection: all_except_custom_domains`) → résolu **voie C** = `vercel domains add filmpro-portail.vercel.app` (domaine de projet → exempté, zéro impact sécu, ancienne adresse intacte). `PUBLIC_APP_URL=production` (preuve HTML runtime) + Supabase Site URL/Redirect URLs (Pascal). Redirection 308 host ancien→nouveau dans `hooks.server.ts` (`/api/*` exempté → 5 crons protégés), **smoke 5/5**. **Login OTP réel validé Pascal**. 1488 Vitest verts (0 régression ; 17 rouges mal attribués « baseline Sentry » → en réalité kit 2.59 request-store + Sentry, **corrigés le 2026-06-05**, baseline désormais 0 rouge). `metrics-baseline.json` figé. → voir `feedback_filmpro_vercel_deploy_cli.md`, `.product-architect/portail/metrics-baseline.json`, `audit_secu_2026-06-04_bascule_adresse_portail.md`.
- [x] ~~QA 360 portail (Session 2) : AC bloquants phase 3-4 verts + 11 liens CRM racine fixés~~ - Livré 2026-06-01 (xhigh, ~2,5h, commit `1d298e1`). e2e 34/34 + terrain a11y 3/3 ; axe-core 0 serious/critical ; Lighthouse LCP 1985ms/CLS 0 ; security 0 H/C/M + OWASP 11/11 ; svelte-check 0 ; Vitest 1488. Session test **OTP-free** (service_role, `tests/mint-session.mjs`). Fix no-debt : 11 liens CRM racine repréfixés `CRM_BASE` + garde-fou Vitest `no-root-crm-links`. → voir `audit_secu_2026-06-01_portail`, `.product-architect/portail/delivery-plan.md`.
- [x] ~~axe-core shell terrain : 0 violation color-contrast (reste Phase 4 mobile V3, AC-012)~~ - Livré 2026-06-01 (high, ~20 min). `tests/terrain-a11y.test.ts` 3/3 verts au viewport mobile 390px (À faire, Rechercher, fiche entreprise), flag `ffCrmMobileV3` ON via session test : 0 violation color-contrast + 0 serious/critical sur les 3 écrans. → `audit_secu_2026-06-01_v3_mobile_shell.md` (Phase 4 fermée).
- [x] ~~Shell mobile V3 « outil terrain » (Phase 3 build) + deploy prod + smoke iPhone validé~~ - Livré 2026-06-01 (xhigh, ~4,5h). Route `/terrain` (flag `ffCrmMobileV3`, OFF = desktop intact), 2 onglets, fiche + 3 actions natives, compte-rendu (note/photos/GPS), brouillon contact → `contact_suggestions`, desktop queue Contacts. 11 composants sur primitives+tokens. TDD 28 helpers ; security 0 H/C/M ; bug-hunter 1 critique (AC-011) + 3 moyens fixés ; build prod vert ; 1487 Vitest. Deploy prod (`9756777`) + flag activé. **Smoke iPhone validé** (AC-017) + fix header portail mobile (`9321733`). → voir `audit_secu_2026-06-01_v3_mobile_shell` + `project_refonte_mobile_v3_terrain`.
- [x] ~~Portail FilmPro Session 1 (coding) : réorg `(app)→crm/` + home portail + redirects 308 + renommage + référentiel~~ - Livré 2026-06-01. svelte-check 0, build OK, smoke + logo validés Pascal. Dette nommée : call sites API référentiel à centraliser (chantier 2 Devis). → `project_portail_filmpro_multi_outils`, `.product-architect/portail/delivery-plan.md`.
→ Livré antérieur (cadrage Phase 1 + specs Phase 2 portail 2026-06-01, gates signés `.product-architect/portail/` ; V3 mobile terrain backend + specs 2026-05-31, S171→S192bis) → `archive/2026-06-01-sessions.md` + `archive/` (`2026-05-25/13/12/10/09/08-sessions.md`).

### Watch list active après pivot

- **[WATCH] 17 tests `hooks.server.test.ts` cassés depuis commit `d78ab37` (Sentry feat)** : Sentry est paused (`enabled: false` via `c442e59`), tests restés cassés. Impact prod : aucun. À fixer dans la tâche QA Sentry méta-projet (`~/.claude/CLAUDE.md` § Prochaine attaque QA Sentry 3 apps). Voir `archive/2026-05-28-pivot-mobile-v3.md` pour le détail.
- **[WATCH] Svelte 5 — `onDestroy` s'exécute en SSR (Vercel) mais pas en `vite preview`** : toute référence à `window`/`document`/`localStorage`/`setInterval` à cleanup DOIT passer par `$effect(() => { ...; return () => cleanup; })`. Toujours tester en preview branch Vercel pour les composants qui touchent window. Mémoire `feedback_svelte5_ondestroy_ssr_window_undefined.md`.
- **[WATCH] Trap Vercel `rollback` → alias prod verrouillé** : après `vercel rollback`, les `git push` suivants buildent mais ne promeuvent PAS automatiquement. Toujours vérifier via `vercel inspect filmpro-portail.vercel.app` (domaine canonique depuis la bascule 2026-06-04) que l'alias pointe bien sur le nouveau deploy.

→ Watch list complète (Signaux V4 perf/contrats S189, S188, S186, S178, S171) déplacée dans `archive/2026-05-28-pivot-mobile-v3.md`. Restent triables si l'objet redevient actuel.

### Livré (référence historique)

→ Livré V2 + sessions antérieures (S171→S192bis) dans `archive/` (`2026-05-28-pivot-mobile-v3.md`, `2026-05-25/13/10/09/08-sessions.md`).

