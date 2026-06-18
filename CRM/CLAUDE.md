# CRM FilmPro : CLAUDE.md

**Note migration** : ce fichier vit dans `CRM/CLAUDE.md` (path Vercel `rootDirectory: CRM`) ; le container racine est un stub pointant vers les sous-projets. Contexte migration complet → `~/.claude/projects/-Users-pascal-Claude-Projets-FilmPro/memory/project_appfactory_restructure.md`.

**Statut :** Clean state 2026-05-28 - refonte mobile V2 **abandonnée** après smoke iPhone (overscope) → pivot **V3 outil terrain only** (`archive/2026-05-28-pivot-mobile-v3.md`). **Portail FilmPro multi-outils : CRM (`/crm`) + Découpe Films (`/decoupe`) en prod sur `filmpro-portail.vercel.app` (2026-06-05).** Formation IA = sous-projet autonome `Formation/`, `cc` option 5. Antérieur en prod (Signaux V4, Log, audit 360, golden v9, restructure S173-S174) → `archive/2026-05-06-sessions.md`.
**Derniere mise a jour :** 2026-06-18 (**Vague 1 cohérence LIVRÉE** : SearchInput+searchMatch, 4 fuites enum→FR+garde, retrait filtre Type Signaux ; 1746 verts, svelte-check 0, build vert, e2e 3/3+cross-app, audit sécu 0 H/C/M - **non commité/déployé**. Avant : cadrage refonte CRM 2 specs ; 10 bugs racine déployés prod `6b9f6e1`). Prod = alias `filmpro-portail.vercel.app` sur `810f2e6` (dernière promotion ; `6b9f6e1` les 10 bugs mergé `main`, déployé prod via CLI manuel). Historique deploys (cron veille `e2daee8`, copy Prospection V5 `a2dbe62`, Vagues 4a→4d, V5 `364bd1f`) → « Livré » + archives.
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** 2026-06-18 - **Vague 1 cohérence LIVRÉE** (code+tests, non commité). 4 nouveaux fichiers (SearchInput, searchMatch+test, garde) + 9 modifiés. Détail → « Livré cette session ». NB cron veille (durcissement `e2daee8` 12/06, anti-skip + actions v6) : code non exécuté par la prod Vercel (runner GHA), prochaine livraison CRM l'embarquera.
**Sessions précédentes (condensé)** - détails dans `archive/` (S165-S175 : `2026-05-06-sessions.md` ; S122-S125 : `2026-04-28-sessions.md` ; S70-S107 : `decisions-sessions-*.md` + `Formation/CLAUDE.md`).


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
- **Tests** : Vitest 1725 (dernier run vérifié 2026-06-18) + Playwright e2e 34. Accessibilité : focus trap + ConfirmModal partout. Sécurité : Zod sur 19 form actions, rate limiting 10/min, headers CSP/XFO/referrer, timing-safe secrets

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

**Prochaine attaque** : Bloc 2 - Prospection P1 (Entreprises + Terrain, retrait onglets SIMAP/RegBL par flag) - sans prérequis, sans risque. La **Vague 1 cohérence est LIVRÉE** 2026-06-18 (voir « Livré cette session »).

> Cadrage commun (refonte UX/UI CRM, validé Pascal 2026-06-18 : audit 360 + benchmark 9 outils + réflexion adverse) → `~/.claude/projects/-Users-pascal-Claude-Projets-FilmPro/memory/project_refonte_crm_cadrage_2026-06-18.md` + doc HTML `CRM/.product-architect/cadrage-refonte-crm-2026-06-18.html`.

### 1. Vague 1 - cohérence CRM [MIXTE • high • session dédiée]

- **Pourquoi** : 3 maux transverses diagnostiqués (recherche en 5 implémentations, libellés techniques affichés, filtre mort). Spec écrite et tranchée 2026-06-18.
- **Payload** → `docs/SPEC_VAGUE1_COHERENCE_2026-06-18.md` (3 critères globaux G1/G2/G3 + chantiers A/B/C).
- [x] ~~**[EXÉCUTABLE]** SearchInput partagé + `searchMatch` (Prospection + Signaux, visible mobile), 3 fuites enum→helpers FR + garde anti-régression, retrait du filtre Type Signaux (mono-type)~~ - **Livré 2026-06-18** (voir « Livré cette session »).

### 2. Prospection Bloc P1 - Entreprises + Terrain [AUTO • medium • ~1 session]

- **Pourquoi** : V5 confirmée, page recentrée sur la recherche de contact à la demande. Sans risque.
- **Payload** → `docs/SPEC_MINIPROJET_PROSPECTION_SOURCES_2026-06-18.md` Bloc P1.
- [ ] **[EXÉCUTABLE]** Retrait onglets SIMAP/RegBL (réversible par flag dérivé + garde de route `?tab=`), page = Entreprises + Terrain.

### 3. Prospection Bloc P2 - Google Places + garde-fou quota [SUPERVISÉ • high • ~1 session]

- **Pourquoi** : rétablir Google comme source de recherche, avec compteur quota visible et zéro débit garanti.
- **Prérequis LEVÉ 2026-06-18** : Pascal a posé `SearchTextRequest per day = 30` dans Google Cloud Console (930/mois max < 1000 gratuits ; garant principal = cap applicatif 900 déjà codé). Re-confirmer visuellement au go prod.
- **Payload** → même spec, Bloc P2.
- [ ] **[EXÉCUTABLE]** Réactiver flag Google, compteur « X/900 restantes » avant recherche, blocage dur 429, audit sécu clé API.

### 4. Prospection Bloc P3 - sélecteur de source premium [SUPERVISÉ • xhigh • session dédiée]

- **Pourquoi** : présenter les 3 sources (search.ch/Google/Zefix) en 3 cartes claires, une active à la fois, champ adaptatif, résultats à cocher. Pas de consolidation (décision Pascal).
- **Payload** → même spec, Bloc P3.
- [ ] **[BLOQUÉ - golden validé + P1 + P2 livrés]** Golden HTML validé Pascal AVANT code, puis portage. Skills nommés : `redesign-skill` + `soft-skill` + `ui-ux-pro-max` + `anydesign` + `golden-standard`.

### 5. Vagues 2-4 refonte CRM [SUPERVISÉ • xhigh • cascade par vagues]

- **Pourquoi** : listes/fiches premium, Signaux condensés, Dashboard temporel, emailing. Cadrées, à spécifier vague par vague après la Vague 1.
- **Payload** → mémoire cadrage (ordre des vagues + garde-fous).
- [ ] **[BLOQUÉ - Vague 1 + mini-projet Prospection livrés]** Listes/fiches premium page par page ; Signaux condensés + Prospection CSV + Dashboard façon Capsule ; emailing individuel → nLPD → groupé. Garde-fous : golden « ligne premium riche » avant cascade, recherche visible pas Cmd+K, sous-domaine d'envoi + base légale nLPD du stock avant 1er email, réunion 3 fondateurs pour les retraits.

### Réserve (retirée du backlog actif le 2026-06-07)
- Chantier 3 portail = non cadré, pas voulu maintenant (observer l'usage V5 d'abord). Durcissement RLS 4e user = conditionnel non déclenché (tracé §RISQUES OUVERTS + [[feedback_rls_multitenant_durcissement_si_4_users]], redéclenche au 4e user non-fondateur). Corpus golden optimiseur Découpe = déjà livré (5 cas gelés, `68c4965`/`99476f1`).

### Livré cette session

- [x] ~~**Vague 1 cohérence CRM (3 chantiers A/B/C)**~~ - Livré 2026-06-18 (ultracode/xhigh, **NON commité/déployé** - prêt à commit+`vercel deploy --prod`). **A** : primitive `SearchInput.svelte` (icône+clear+a11y, null-safe) + helper pur `searchMatch.ts` (matchesQuery/matchesAnyField sur `normalizeNFD`, 13 tests) + debounce unifié 250ms (`SEARCH_DEBOUNCE_MS`). Câblée dans `DataTable` (couvre Contacts/Découpe/veille - cross-app vérifié neutre) ET Signaux. **Prospection** : sortie de DataTable (`searchable={false}`) + `SearchInput` standalone en tête de tabpanel **visible desktop ET mobile** (Option B - corrige le vrai bug A1 « caché mobile » prouvé en e2e : `ffCrmMobileV2=true` masque la DataTable < 1024px). **B** : 4 fuites enum→helpers FR (B1 pipeline `formatTypeLabel`, B2 terrain `etapeLabel`, B3 prospection aria `statutLabel` ×2, **B4 dashboard RelancesList `etapeLabel`** trouvé en route) ; `etapeLabel` **promu** local→`pipelineFormat.ts` (source unique) ; garde Vitest `no-brute-enum-render` (rouge-sans-fix/vert-avec, scan réel = 0 enum brut). **C** : filtre Type Signaux retiré (mono-type `appel_offres`), Canton gardé, `filterType` dormant + commentaire réversibilité, `config.signaux.types` conservé. **Preuves** : svelte-check 0 erreur, **1746 Vitest verts** (+21), build prod vert, **e2e 3/3** (Signaux clear, Prospection desktop+mobile, Contacts) + cross-app DataTable `decoupe/produits` vert + axe a11y. Revue adversariale (workflow 12 agents) : **0 H/C/M** (audit sécu daté [[audit-secu-2026-06-18-vague1-coherence]]), 2 findings low (durcis/documentés). **Dette tracée (hors-scope nommé)** : (1) 3 recherches non migrées vers SearchInput (Entreprises `:331`, Aide `:148`, terrain/rechercher `:68` - vague ultérieure, pas A1/A2) ; (2) accent-insensible Prospection serveur différé (exige `unaccent`/migration DB) ; (3) garde mono-ligne+.svelte only (documenté). → [[project-refonte-crm-cadrage-2026-06-18]].

- [x] ~~**Cadrage refonte CRM : spec Vague 1 + mini-projet Prospection (3 blocs) + vérif facturation Google**~~ - Livré 2026-06-18 (xhigh). 2 specs écrites et tranchées : `docs/SPEC_VAGUE1_COHERENCE_2026-06-18.md` (3 critères globaux + chantiers A recherche unique visible / B 3 fuites enum→FR / C Signaux mono-type) + `docs/SPEC_MINIPROJET_PROSPECTION_SOURCES_2026-06-18.md` (P1 Entreprises+Terrain, P2 Google+quota, P3 sélecteur source premium). Décisions Pascal : RegBL retiré (0 contact actionnable), SIMAP→Signaux only, Google rétabli sans consolidation, sélecteur 3 cartes. Facturation Google vérifiée (sources officielles) : SKU Enterprise 1000 gratuits/mois, garant zéro débit = cap applicatif 900 + quota `SearchTextRequest per day=30` posé par Pascal. 3 skills design lus (ui-ux-pro-max, anydesign, algorithmic-art). → [[project-refonte-crm-cadrage-2026-06-18]].
- [x] ~~**Audit 360 CRM + 10 bugs corrigés racine déployés prod + cadrage refonte validé**~~ - Livré 2026-06-18 (ultracode/xhigh, **DÉPLOYÉ PROD `6b9f6e1`**, alias vérifié, smoke 303). Audit UX/UI/code 360 (18 agents) + benchmark 9 outils + council/premortem + 5 passes réflexion → doc cadrage HTML validé Pascal. **10 bugs corrigés racine** (1 H bug « Film » ; 4 M ; 5 L), 2 faux positifs écartés, **1725 tests verts**, svelte-check 0, **audit sécu 0 H/C/M/L**. → [[project-refonte-crm-cadrage-2026-06-18]] + [[audit-secu-2026-06-18-corrections-bugs-360]].
- [x] ~~**Surveillance run rattrapage veille W24**~~ - Livré 2026-06-13 (low). Run 12/06 19:26 UTC : completed success, `phase=published` (2 items). Filet anti-skip `e2daee8` a tenu. Bémol : `costs_persisted status=partial` (non bloquant).
- [x] ~~**Durcissement cron veille hebdo (audit + revue 360 + 3 fix)**~~ - Livré 2026-06-12 (xhigh, `e2daee8`, `main`). Double cron anti-skip (`27 6` + rattrapage `27 17` `--only-if-absent`), actions v4→v6, lien email échec → runs GHA. +8 tests, 1719 verts.
→ Livrés antérieurs (Bloc 2 copy empty Prospection V5 `a2dbe62`, Bloc 1 merge `main` `810f2e6`, re-audit + bug HIGH pipeline, Vague 4d mojibake, 4c a11y) → `archive/claude-md-crm-livre-2026-06-18.md` + `archive/2026-06-07-sessions.md` + `memory/project_vague4_palette_deep_2026-06-07.md`.

### Watch list active après pivot

- **[WATCH] Svelte 5 — `onDestroy` s'exécute en SSR (Vercel) mais pas en `vite preview`** : toute référence à `window`/`document`/`localStorage`/`setInterval` à cleanup DOIT passer par `$effect(() => { ...; return () => cleanup; })`. Toujours tester en preview branch Vercel pour les composants qui touchent window. Mémoire `feedback_svelte5_ondestroy_ssr_window_undefined.md`.
- **[WATCH] Trap Vercel `rollback` → alias prod verrouillé** : après `vercel rollback`, les `git push` suivants buildent mais ne promeuvent PAS automatiquement. Toujours vérifier via `vercel inspect filmpro-portail.vercel.app` (domaine canonique depuis la bascule 2026-06-04) que l'alias pointe bien sur le nouveau deploy.
- **[WATCH] Réactivation d'une source coupée en V5 (2026-06-07)** : flip de flag (`SIGNAUX_ZEFIX_ENABLED=true`, ou `config.prospection.sources.*.enabled=true` / `features.*=true`) → re-vérifier que les contrôles d'origine (Zod, quota, rate-limit, anti-hallu) sont bien ceux validés S189/S192 AVANT de rallumer en prod. Le moment du risque = la réactivation, pas la coupure. **Encodage Zefix : corrigé 2026-06-07** (`lib/server/decode-response.ts`, fallback Windows-1252) → la réactivation ne re-corrompt plus les accents (cf. Livré 4d-mojibake). Réf audit `memory/audit_secu_2026-06-07_v5_signaux_prospection.md` § I-3.

→ Watch list complète (Signaux V4 perf/contrats S189, S188, S186, S178, S171) déplacée dans `archive/2026-05-28-pivot-mobile-v3.md`. Restent triables si l'objet redevient actuel.

### Livré (référence historique)

→ Livré V2 + sessions antérieures (S171→S192bis) dans `archive/` (`2026-05-28-pivot-mobile-v3.md`, `2026-05-25/13/10/09/08-sessions.md`).

