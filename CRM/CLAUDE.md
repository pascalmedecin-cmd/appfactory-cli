# CRM FilmPro : CLAUDE.md

**Note migration restructure** : ce fichier vit dans `CRM/CLAUDE.md`. Le sous-projet CRM FilmPro est dans `AppFactory/CRM/` (path Vercel `rootDirectory: CRM`). Voie A livrée S173 2026-05-06 (split container CLAUDE.md). Voie B livrée S174 2026-05-07 (rename `template/` → `CRM/` + retrait wizard méta + repointage Vercel). Le `AppFactory/CLAUDE.md` racine est un stub container minimal qui pointe vers les 3 sous-projets (CRM, Consulting, Formation). Voir `~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/project_appfactory_restructure.md` pour le contexte migration complet.

**Statut :** Phase C. **CLEANUP POST-LIVRAISON PAGE LOG + SMOKE PROD ADMIN** (S186, 2026-05-13) : 7 fix audit S185 (a-g) + 3 polish Low contracts in-session, commit `62015ea` pushed, migration prod `_002` (CHECK `admin_notes '' ` rejeté) appliquée via `pg` lib. 1253 Vitest, svelte-check 0 err (baseline 7 → 0 post regen `database.types.ts`), build OK. Audits Opus 0 C/H/M (security 3 Info, contracts 20/20 + 1 Low brand type [WATCH]). Smoke prod admin via Chrome MCP : **10/10 critères verts** (FAB→modale→submit→toast→/log→expand→statut→export JSON). 3 résidus Pascal restants (Antoine OTP + mobile DevTools + nav burger mobile) → entry cockpit `9e0ff2ac` transmitted, 5-10 min. **PAGE LOG CRM LIVRÉE** (S185, 2026-05-13) : 15 critères binaires verts, 58 Vitest, 0 C/H/M audits, migration `_001` appliquée prod via skill `supabase` + `pg` lib. **POLISH PAGE AIDE + NAV MOBILE + E-MAIL LANCEMENT** (S183, 2026-05-12) : 5 diagrammes SVG de `/aide` audités/corrigés + schéma « écosystème » refondu en vue d'ensemble pédagogique + chiffres recentrés dans les bulles d'étape ; tirets longs retirés + respiration accrue ; nav mobile = menu latéral se ferme à la sélection d'une page ; e-mail HTML de lancement créé pour `antoine@filmpro.ch` (`CRM/notes/email-lancement-antoine-2026-05-12.html`, non commité, 2 arbitrages Pascal en attente). 1192 Vitest, svelte-check 0 err, build OK. Commits `0f820a2`+`e1eed24` poussés ; reste smoke prod `/aide`+nav mobile. **REFONTE PAGE AIDE LIVRÉE** (S182) : `/aide` reconstruite from scratch, 3 niveaux data-driven, recherche full-text, 5 diagrammes SVG, zéro `getElementById`/`{@html}`, GOLDEN v9 → résorbe H-28 + M-29. **CASCADE AUDIT 360 ENTIÈREMENT FERMÉE** (S178→S180) : 136 findings = 134 fixés + 2 (H-28/M-29) résorbés par la refonte Aide. 13 migrations SQL prod cumul, audits Opus cumul 0C/0H/0M. **API Google Places = 7e source prospection** livrée (S181). **Backlog CRM cockpit vide.** Antérieur : cascade golden v9 6/6 pages COMPLÈTE (S175-S176ter) ; migration restructure Voie A+B (S173-S174 : `template/`→`CRM/`, stub container parent) ; GOLDEN v9 layered DS (S172) + règle `noDashedLines` (S176bis) + § 14 décisions audit 360 (S179-S180) ; search.ch 2e source (S171) ; pipeline veille anti-hallucination V2 (S168) ; /prospection figée page modèle (S165) ; cron veille GHA (S167) ; audit UX/UI 360 (S160) ; V2 mobile terrain CLOS (S127-S130). Formation IA = sous-projet autonome dans `Formation/`, `cc` option 5.
**Derniere mise a jour :** 2026-05-13 (S186 : Cleanup post-livraison page Log LIVRÉ - 7 fix audit S185 + 3 polish Low contracts, commit `62015ea` pushed, migration prod `20260513_002` appliquée, 1253 Vitest, 0 err svelte-check, audits Opus 0 C/H/M. Smoke prod admin déroulé via Chrome MCP : 10/10 critères verts. 3 résidus côté Pascal en cockpit `9e0ff2ac` : Antoine + mobile + nav burger).
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** Session 186 (CRM, 2026-05-13, `/effort high`) - **Cleanup post-livraison page Log LIVRÉ** : 7 fix audit S185 (a-g) + 3 polish Low audit contracts in-session → 1253/1253 Vitest (1250 baseline + 3 nouveaux `error-capture.browser.test.ts`), svelte-check 0 err (baseline 7 résolus post regen `database.types.ts`), build 20 s OK. Migration prod `_002` (CHECK admin_notes `'' ` rejeté) appliquée via `pg` lib. Audits Opus parallèles : security 0 C/H/M/L + 3 Info ; contracts 20/20 0 C/H/M + 4 Low dont 3 fixés in-session (drift spec § 4 lower(), Zod transform admin_notes, refactor +page.server). Commit `62015ea` pushed origin/main. **Smoke prod admin via Chrome MCP** : 10/10 critères verts (FAB visible → modale → submit Bug+Gênant+/contacts 216 chars → toast vert → /log entry « à l'instant » → expand context URL/viewport/UA → click À actionner badge orange + compteurs sync → export JSON tableau d'objets UTF-8 « Gênant » accent OK + 10 keys + status `a_actionner`). Entries cockpit `1284b617` + `b6f6e211` delivered ; nouvelle entry `9e0ff2ac` transmitted pour 3 résidus côté Pascal (Antoine + mobile + nav burger).
**Sessions précédentes (condensé)** - détail S165-S175 : `archive/2026-05-06-sessions.md` + S174-S175 dans Livré ci-dessous. Détail S122-S125 : `archive/2026-04-28-sessions.md`. Détail S78-S79 : `archive/decisions-sessions-78-79.md`. Détail S70-S77 : `archive/decisions-sessions-70-77.md`. Détail S80-S107 : `Formation/CLAUDE.md` (sous-projet autonome).


---

## SOUS-PROJETS

L'arborescence d'AppFactory héberge des sous-projets autonomes (chacun a son propre repo Git, sa propre stack, son propre CLAUDE.md). Pascal navigue par thème depuis ce dossier.

| Dossier | Repo Git | Statut | URL prod | CLAUDE.md |
|---------|----------|--------|----------|-----------|
| `CRM/` (CRM FilmPro) | `pascalmedecin-cmd/appfactory-cli` (=racine actuelle) | Production | <https://filmpro-crm.vercel.app> | (ce fichier) |
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

- **Prod** : https://filmpro-crm.vercel.app (Vercel, GitHub auto-deploy) + Supabase EU (projet `appfactory`, 10+ tables, RLS active, service role key configurée)
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

**Prochaine attaque** : Bloc 1 Finir smoke prod page Log (3 résidus Pascal manuel, 5-10 min). Une fois fait, la livraison page Log est 100% bout-en-bout en prod. Tâches dormantes possibles (hors-scope nommé S182, à transmettre via UI cockpit) : tour guidé interactif, bouton « ? » contextuel sur les 9 pages, push première-connexion vers /aide.

### 1. Finir smoke prod page Log : 3 résidus côté Pascal [SUPERVISÉ • low • 5-10min]

- **Pourquoi** : cleanup S186 livré (7 fix audit S185 + 3 polish Low contracts, commit `62015ea` pushed, migration prod `_002` appliquée). Smoke admin via Chrome MCP en S186 = 10/10 critères verts (FAB→modale→submit→toast→/log→expand→statut→export JSON). Restent 3 smokes manuels qui ne peuvent pas être pilotés via Chrome MCP : Antoine nécessite un OTP différent (Pascal seul), mobile breakpoint nécessite Chrome DevTools Device Toolbar (règle CRM : `resize_window` MCP interdit comme substitut), nav burger mobile aussi. Entry cockpit `9e0ff2ac` transmitted.

- [ ] **[EXÉCUTABLE]** Smoke prod user `antoine@filmpro.ch` : logout pascal → login antoine via OTP → vérifier FAB visible bottom-right → modale s'ouvre → peut créer un retour bug/suggestion/question → voit la liste `/log` en lecture seule : 0 boutons statut (Nouveau/À actionner/Traité/Loggé invisibles), 0 bouton « Exporter en JSON » dans le toolbar, 0 textarea « Note interne (admin uniquement) » dans l'expand.
- [ ] **[EXÉCUTABLE]** Chrome DevTools manuel breakpoint < 1024 px (preset iPhone 14 Pro Max) sur <https://filmpro-crm.vercel.app/> : FAB absent (display:none via media query), entrée sidebar « Log » absente (`.desktop-only-nav` masquée), page `/log` rend uniquement l'encart « Disponible uniquement depuis ordinateur » avec icône `desktop_windows`.
- [ ] **[EXÉCUTABLE]** Smoke nav burger mobile (résidu S183 polish) : en breakpoint mobile, ouvrir le menu latéral via le bouton burger → tap un lien du menu → le menu doit se fermer automatiquement (livré S183, à confirmer en prod).

→ voir entry cockpit `9e0ff2ac` (transmitted). Si un point KO : créer une entry idée cockpit avec le symptôme exact + screenshot.

### Watch list S186 (post-cleanup page Log)

- **[WATCH] Brand type `FeedbackEntry.context` vs `Database['Row'].context: Json`** (audit contracts S186 Low #4) : `types.ts:24` exige `FeedbackContext` non-nullable, mais `Database['feedback_entries']['Row'].context: Json` (Supabase régénéré). Le `load` normalise via `FeedbackContextSchema.parse(row.context ?? {})` donc le contrat est honoré à la frontière unique d'entrée des données. Si un futur consumer (RPC server-side, script ops, export endpoint) lit les rows sans passer par `load`, le type ment. Mitigation propre : (a) brand type `ParsedFeedbackEntry` côté load qui marque le contrat strict ; (b) ou `FeedbackEntry.context: FeedbackContext | null` au type domaine et fallback côté composant. Option (a) préférable (load = frontière unique aujourd'hui). Non-bloquant V1 (aucun consumer ne bypasse le load).
- **[WATCH] `FeedbackContextSchema.parse` sans try/catch au load** (audit secu S186 Info-2) : `+page.server.ts:load` parse chaque row sans wrapper safeParse. Si une row a un context corrompu (overflow `viewport.w` > 20_000, `recentErrors` cardinalité > 3, etc.), le load throw et casse `/log` pour tous les users. Vecteur résiduel = script ops malveillant via service_role. Mitigation defense-in-depth : wrapper `safeParse` + fallback `DEFAULT_CONTEXT`. Non exploitable par utilisateur final.
- **[WATCH] Rate limiter unique commun 5 endpoints** (audit secu S186 Info-3) : `hooks.server.ts:25` partage le même quota 10 req/min/IP entre `/api/prospection/*`, `/api/photos*`, `/api/visits*`, `POST /login`, `POST /log/*`. Couplage UX : spammer `/log?/create` consomme aussi le quota des autres endpoints (et inversement). Pas un problème sécu. Si usage augmente : 2 buckets (un pour actions lourdes, un pour `/log` + `/login`). YAGNI V1.
- **[WATCH] Rows pré-fix `created_by_email` casse mixte** (audit secu S186 Info-1) : depuis S186 `user.email.trim().toLowerCase()` à l'insert, mais les rows pré-S186 (≤ 5 rows smoke, Pascal en minuscule via OTP) peuvent contenir une casse mixte. Une requête SQL ad hoc `WHERE created_by_email = 'pascal@filmpro.ch'` les raterait. Surface nulle en pratique. Mitigation : `UPDATE … SET created_by_email = lower(...)` one-shot OU index expression-based `(lower(created_by_email))` si besoin de SELECT case-insensitive performant. Optionnel.

### Watch list S178 (post-V2c)

- **[WATCH] V3a rate limit /api/entreprises/*** : audit Opus security V2b L-1 a flaggé que l'endpoint search n'est pas couvert par le rate limit `hooks.server.ts:38-50`. Surface faible (auth gate OK, mono-tenant ≤10 admins, LIMIT 20 + GIN trigram). Reco V2c/V3a : ajouter `/api/entreprises/` ligne 39 (1 ligne).
- **[WATCH] V3a regen `supabase gen types`** : V2b a posé 3 casts `as never` (RPC `transfer_lead_to_crm`, RPC `entreprises_lookup_by_name`) + cast `'version' as 'id'`. Regroupe dette V2a M-19 (cast `as never` searchch insert). Regen post-cascade complète une fois 6 vagues mergées + V3a M-19 nettoyage Zod inserts.
- **[WATCH] V3a TOCTOU Zefix H-02** : Info I-3 audit security V2b. Window TOCTOU sub-2s entre SELECT existing.notes_libres et UPDATE. Fix possible côté DB : `UPDATE … SET notes_libres = COALESCE(NULLIF(notes_libres, ''), $purpose)` (atomicité native).
- **[WATCH] V3a `runWithConcurrency` AbortSignal** : Info I-4 audit. Si futur consumer fait write dans `fn`, side-effects post-reject possibles. Ajouter `AbortSignal` côté worker.
- **[WATCH] V3a pattern cancelled flag** : étendre H-05 VisitsPanel cleanup à PhotosPanel + autres panels async (race conditions UI silencieuses similaires).
- **[WATCH] V3a audit consumers `entreprises.raison_sociale`** : aligner toute recherche client-side sur `lower(immutable_unaccent(...))` ou bannir le pattern (forcer RPC). N1 LIKE injection a montré que la defense-in-depth client doit être à la source.
- **[WATCH] V3a CHECK constraint `jsonb_array_length(items) <= 15`** : defense-in-depth pour F1 cap saturated. Migration possible en V2c.
- **[WATCH] V3a audit cross-codebase UPDATE intelligence_reports** : trigger 009 force le bump auto. Vérifier qu'aucun caller ne dépend d'un comportement "no-op UPDATE" qui maintenait version stable (run-generation upsert running→published, cron archive, recheck-historical).
- **[WATCH] V3a feedback_rpc_atomique_idempotence.md à graver** : pattern checklist obligatoire pour toute nouvelle RPC plpgsql (idempotence + EXCEPTION handlers + ERRCODE distincts). F2 a montré que la spec V2b ne capturait pas l'idempotence comme contrainte de design.
- **[WATCH] V3a `Tabs.svelte` glue DOM non testée (post-V2c)** : la primitive `Tabs.svelte` n'a qu'un test sur la logique pure `tabsNav.ts` (14 tests), pas un test DOM du composant (`focusTabAt`, `e.preventDefault()`, binding `tabindex={active ? 0 : -1}`, `aria-selected`/`aria-controls`). Repo sans jsdom configuré (vitest env = node). Trigger d'ajout (jsdom + `@testing-library/svelte` + test composant) = 3e régression a11y sur les workspace tabs. Flaggé par test-coverage-reviewer (Low).
- **[WATCH] V3a `aria-controls` Tabs vers panels inexistants (post-V2c)** : `Tabs.svelte:65` `aria-controls={panel-${tab.key}}` pointe vers des IDs `panel-{key}` absents sur les pages workspace (contacts/entreprises/signaux/pipeline filtrent une table, pas de `<div role="tabpanel">`). Pré-existant (les 5 composants `*Tabs.svelte` avaient déjà ce câblage), centralisé en V2c. Reco : rendre `aria-controls` optionnel sur la primitive (passé seulement quand un panel existe — cas `/reporting`), ou ajouter `role="tabpanel"` sur les pages. Aucun impact sécurité. Flaggé par security-auditor (Info).

### Watch list S178 (post-V1)

- **[WATCH] V2b H-06 trigram entreprises** : V1 a posé `.limit(1000)` garde-fou immédiat dans `getOrCreateEntreprise`, refonte trigram + ilike bounded prévue V2b H-06.
- **[WATCH] V3a M-19 Zod refit searchch insert** : V1 a posé cast `as never` minimal (`searchch/+server.ts:225`), refonte Zod côté construction `inserts` prévue V3a M-19.
- **[WATCH] F3 V2 mobile saisie lead express** : `lead_express` maintenant accepté par DB CHECK (migration `20260510_002`), prochain test terrain à confirmer (CHECK violation 23514 disparue).
- **[WATCH] svelte-check baseline 0 erreur** : V1 a ramené baseline de 4 → 0. Si V2a→V3b font remonter erreurs, viser maintien baseline 0 (zéro nouvelle erreur tolérée).
- **[WATCH] Consolidation cockpit S178 calculée mais apply refusé local strict** : audit déterministe a flaggé 2 tâches `effort.score=3` mais 4 critères True (incohérence LLM dans blocs cumulés bloqués V2b+V2c et V3a+V3b). Output reste mémoire serveur cockpit, ré-applicable via UI après ajustement manuel ou re-consolidation à la prochaine clôture.
- **[WATCH] Durcissement RLS si 4e user non-fondateur (post-V3b)** : tant que FilmPro = 3 fondateurs symétriques, RLS « tous voient/suppriment tout » assumée (cf. § DECISIONS STRUCTURELLES > « Sécurité - décisions assumées » + § RISQUES OUVERTS M-48). Le jour où Pascal mentionne un 4e utilisateur non-fondateur (commercial junior, terrain, prestataire) → ouvrir une tâche `[EXÉCUTABLE]` : policies `created_by = auth.uid()` + checks d'ownership applicatifs + tests d'intégration RLS contre une vraie DB. Checklist complète : `~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/feedback_rls_multitenant_durcissement_si_4_users.md`.


<!-- BEGIN CONSOLIDATION (auto-géré par cockpit, ne pas éditer) -->

### Consolidation cockpit (réconcilié S181 2026-05-12)

**Blocs actionnables** : aucun — la refonte page Aide (ex-Bloc #1) est livrée S182. Backlog CRM cockpit vide.

**Blocs bloqués** : aucun.

**Note** : la cascade audit 360 (V1→V3b) est entièrement fermée (S180) et la source Google Places est livrée (S181), donc les anciens blocs B1/B2 de cette section sont caducs. CRM n'a plus qu'une entry `transmitted` côté cockpit → la consolidation LLM ne se relance pas (< 2 entrées) ; ce bloc est tenu à la main jusqu'à ce qu'une 2ᵉ tâche soit en file.

<!-- END CONSOLIDATION -->


### Watch list S171 (post-livraison)

- **[WATCH] Compteur quota search.ch côté DB (post-S171)** (vu 2026-05-06) : search.ch ne fournit pas d'API publique pour lire le compteur quota mensuel (uniquement tableau de bord compte search.ch). Pour visibilité ops « il reste N requêtes ce mois » dans CRM → table `api_quota_log` ou colonne incrémentale `searchch_calls_YYYYMM`. Pas critique tant que Pascal contrôle l'usage, à graver tâche si l'usage atteint 50%+ du quota sur un mois.
- **[WATCH] `prospect_leads.description` consommée par LLM future (audit S171 Info #1)** (vu 2026-05-06) : description = `occupation + categories.join(' / ')` (categories user-influenced via `was=` query search.ch). Aucun pipeline LLM ne consume cette colonne aujourd'hui. Si pipeline future (scoring auto, qualification, génération mail) → appliquer cross-check verbatim pattern S168. → voir `memory/audit_secu_2026-05-06_searchch_endpoint.md`.
- **[WATCH] `entry.sourceUrl` rendu href client (audit S171 Info #2)** (vu 2026-05-06) : la nouvelle colonne `prospect_leads.source_url` peut désormais pointer vers une URL search.ch arbitraire. UI rendant `<a href={sourceUrl}>` doit confirmer filtrage `https?://` côté client (defense in depth Svelte). search.ch retourne uniquement `https://tel.search.ch/...` aujourd'hui, mais aucune garantie contractuelle. Audit visuel rapide LeadSlideOut + DataTable au prochain passage.
- **[WATCH] Race condition `addItem` veille (Low #3 audit S169)** : form action `addItem` sur `/veille/[id]` fait read-modify-write non-atomique sur `intelligence_reports.items` JSONB via service client. Si 2 admins ajoutent simultanément depuis 2 onglets, le second écrase le premier (perte silencieuse, pas exploitable). Mitigation suggérée : optimistic locking via colonne `version` si volume augmente. → voir `memory/audit_secu_2026-05-05_veille_themes_db.md` Low #3.
- **[WATCH] Injection prompt LLM via description thème (Info #1 audit S169)** : la description d'un thème admin est concaténée dans `SYSTEM_PROMPT` via `buildThemesPromptSection`. Validation Zod limite à 500 chars mais aucun escape. Modèle de menace = admin authentifié déjà accès complet au CRM (faible risque). Cross-check verbatim Sonnet S168 protège la sortie LLM. Mitigation suggérée si surface s'élargit : escape `\n` + délimiter `<themes_taxonomy>` XML-like. → voir `memory/audit_secu_2026-05-05_veille_themes_db.md` Info #1.

### Livré cette session (récents + archives)

→ Sessions antérieures : `archive/2026-05-13-sessions.md` (S180 cascade V3b closure + S181 Google Places + recaps LIVRÉE) · `archive/2026-05-10-sessions.md` (S178 cascade audit 360 V1 + V2a + V2b + V2c + V3a-1 ; S179-S180 V3a-2 + détails connexes) · `archive/2026-05-09-sessions.md` (S174 Voie B + cascade golden 6/6 fermée + S176ter T2/T3 + S177 dashboard coûts) · `archive/2026-05-08-sessions.md` (S171-S173 + S175 dashboard v9 + S176bis x3 cascade /pipeline /contacts /entreprises) · `archive/2026-05-04-sessions.md` (antérieures)

- [x] ~~S186 - Cleanup post-livraison page Log + smoke prod admin Chrome MCP (7 fix audit S185 + 3 polish Low contracts + smoke 10/10)~~ - Fait 2026-05-13 (high, ~2h ; Score effort 2/4 : multi-étapes contraintes croisées, itération coûteuse jour de livraison client). Exec en 1 passe propre (vs ~1h30 estimé Bloc 2). **7 fix audit S185 (a-g)** : (a) `src/hooks.server.ts:19-26` ajout `/log/* POST` à `isRateLimitedPath` (Info-1 audit secu, anti-spam form actions), (b) `notes/page-log-2026-05-13/spec.md:70` retrait `NOT NULL` sur `created_by` pour aligner avec choix migration nullable + `ON DELETE SET NULL` (M-1 contracts), (c) `+page.server.ts:55-64` `user.email.trim().toLowerCase()` à l'insert (L-2 contracts), (d) `+page.server.ts:load` normalisation `context` via `FeedbackContextSchema.parse(row.context ?? {})` + cast intermédiaire des enums (`type`/`severity`/`status` cast vers `FeedbackEntry`) pour honorer type TS strict sur rows legacy (L-4 contracts), (e) regen complète `src/lib/database.types.ts` via `supabase gen types typescript --project-id fmflvjubjtpidvxwhqab` (1229 lignes, `feedback_entries` ajouté avec Row/Insert/Update typés, **les 7× `as never` retirés** dans `+page.server.ts` — cascade dette V2a/V2b/V3a M-19 résolue), (f) `src/lib/feedback/error-capture.browser.test.ts` nouveau (3 tests happy path `install()` avec mock `$app/environment` browser=true + window stub minimal + listeners capture pour exec event + idempotence double-install ; coverage Low audit), (g) `supabase/migrations/20260513_002_feedback_admin_notes_check_lower_bound.sql` (CHECK durci `admin_notes IS NULL OR char_length BETWEEN 1 AND 2000` — `'' ` rejeté désormais, defense-in-depth avec Zod transform et form action `trim() || null`). **Migration `_002` appliquée en prod** via skill `supabase` + `pg` lib (pattern S185 `memory/feedback_supabase_migration_via_pg_lib.md`) avec `dotenv` chargement explicite `.env.local` (corrigé après échec connexion 127.0.0.1) → smoke DB `pg_get_constraintdef` confirme `CHECK (((admin_notes IS NULL) OR ((char_length(admin_notes) >= 1) AND (char_length(admin_notes) <= 2000))))`. Script ESM one-shot supprimé après application. **3 polish Low audit contracts (in-session)** : drift spec `§ 4 lignes 108-109` (policy RLS UPDATE non-`lower()` alors que migration livrée utilise `lower(auth.jwt() ->> 'email')`) → patché spec en miroir + commentaire ajouté ; `FeedbackUpdateNotesSchema` `transform` Zod ajouté pour normaliser au boundary (trim + `'' → null`) au lieu de dupliquer la logique côté `+page.server.ts` ; `updateAdminNotes` form action simplifiée (1 ligne payload `admin_notes: parsed.data.admin_notes` au lieu du double `trim() || ''` puis `=== '' ? null : trimmed`). **Polish post-regen tests** : `src/routes/(app)/log/log-actions.test.ts` `callLoad` helper cast retour vers `{entries, isAdmin, userEmail}` car `PageServerLoad` est typé `MaybeWithVoid<...>` (7 erreurs TS résolues, baseline 7 → 0). **Gates** : 1253/1253 Vitest verts (1250 baseline + 3 nouveaux `error-capture.browser.test.ts`), svelte-check 0 err (baseline 7 résolus post-regen), `npm run build` 20 s OK. **Audits Opus parallèles** : `security-auditor` 0 C/H/M/L + 3 Info non bloquants (`created_by_email` rows pré-fix possiblement mixed-case, `FeedbackContextSchema.parse` sans try/catch fallback, rate limiter unique commun 5 endpoints — couplage UX non sécu), 11/11 OWASP verts, artifact `audit_secu_2026-05-13_page_log_cleanup.md` ; `contracts-reviewer` 20/20 contract quality score, 0 C/H/M + 4 Low dont 3 fixés in-session (drift spec, refactor admin_notes, Zod transform) et 1 brand type `FeedbackEntry.context` strict vs `Database['Row'].context: Json` reporté en [WATCH]. **Smoke prod admin via Chrome MCP** : 10/10 critères verts en 5 min de pilotage (FAB visible bottom-right session pascal@filmpro.ch déjà active → modale s'ouvre avec 3 type + 3 sévérité + dropdown page + textarea description → submit Bug + Gênant + /contacts + 216 chars « Longueur OK » → toast vert « Retour envoyé, merci » bottom-right + modale ferme → /log entry « à l'instant » BUG/GÊNANT/contacts/pascal@... NOUVEAU avec compteurs 1/0/0/0 → click ligne expand inline avec DESCRIPTION COMPLÈTE + CONTEXTE TECHNIQUE URL+viewport+UA + STATUT 4 boutons + NOTE INTERNE admin → click bouton « À actionner » badge passe orange + compteurs sync 0/1/0/0 → click « Exporter en JSON » → JS interception du Blob via `URL.createObjectURL` override confirme `isArray:true, count:1, utf8Ok:true (« Gênant » accent), 10 keys [id, created_at, created_by_email, type, severity, page, description, context, status, admin_notes], status:'a_actionner'`). Entrée smoke prod `04f25276-2215-43bf-bb63-5dfad1d1ec05` persiste en prod (étiquetée « Smoke test S185+1... Ignorer ce retour ») — Pascal arbitrera (marque Loggé/Traité, ou purge via service_role). **Smoke résidu S183 `/aide`** validé visuellement (3 onglets Prise en main/Fonctions détaillées/Documentation technique + 9 sections + sommaire double + 65 SVG + accents OK + 0 tiret long). **3 résidus côté Pascal restants** (Antoine OTP différent + mobile Chrome DevTools manuel + nav burger mobile) → entry cockpit `9e0ff2ac` transmitted, 5-10 min. **Commit `62015ea` pushed** origin/main (8 fichiers, +575/-17). **Entries cockpit `1284b617` (UI) + `b6f6e211` (CLI doublon) delivered** via `deliver.py meta` avec outcomes. Tracking git : `src/hooks.server.ts` + `src/lib/database.types.ts` (regen complète) + `src/lib/schemas.ts` (export `FeedbackContextSchema` + transform `FeedbackUpdateNotesSchema`) + `src/routes/(app)/log/+page.server.ts` (suppression 7 `as never` + normalisation email/context/admin_notes) + `src/routes/(app)/log/log-actions.test.ts` (cast helper retour) + `src/lib/feedback/error-capture.browser.test.ts` (nouveau, 3 tests) + `supabase/migrations/20260513_002_feedback_admin_notes_check_lower_bound.sql` (nouveau, appliqué prod) + `notes/page-log-2026-05-13/spec.md` (patch ligne 70 + § 4 lignes 108-109 lower) + CLAUDE.md.
- [x] ~~S185 - Page Log CRM LIVRÉE (15 critères binaires, 58 nouveaux Vitest, 0 C/H/M audits Opus)~~ - Fait 2026-05-13 (xhigh, ~3h ; Score effort 4/4 : structurelle multi-fichiers, multi-étapes contraintes croisées, itération coûteuse livraison client jour même, UX partiellement non-mesurable). Exec spec § 12 en 5 lots commit. **Lot 1 (DB + lib pure + schemas)** : `supabase/migrations/20260513_001_feedback_entries.sql` (table + 3 RLS policies + 2 CHECK + 3 index + trigger updated_at + comparaison `lower(auth.jwt()->>'email')` post audit secu LOW-1) ; 6 modules `src/lib/feedback/*.ts` (types, options, admin `isAdminEmail` toLowerCase, pages `pagesForUrl` prefix-match, export `toExportJson` Blob UTF-8, error-capture singleton cap 3 + purge 60 s) ; 3 schemas Zod (`FeedbackCreateSchema` avec `.refine` bug↔severity + transform context JSON parseable→null si invalide, `FeedbackUpdateStatusSchema`, `FeedbackUpdateNotesSchema`). **Lot 2 (composants + intégration)** : `FeedbackButton.svelte` (FAB `bottom:1.5rem` `z-90`, masqué CSS `<1024px`+`/log`+`/login*`, modale `trapFocus`), `FeedbackForm.svelte` (radio cards type/sévérité, severity conditionnelle si bug, dropdown page pré-rempli `pagesForUrl`, textarea 10-1000 chars compteur, context hidden input JSON, `use:enhance` POST `/log?/create`, toast succès), `FeedbackTable.svelte` (7 cols desktop / 3 cols mobile, expand inline avec context formaté + boutons statut admin + textarea admin_notes), modif `src/lib/config.ts` (entrée `Log` première position `navigation.secondary` + flag `desktopOnly:true`), modif `src/lib/components/Sidebar.svelte` (lecture flag + `<style>` scoped `@media (max-width:1023px){.desktop-only-nav{display:none!important}}`), modif `src/routes/(app)/+layout.svelte` (montage `<FeedbackButton />` après `<Toast />`). **Lot 3 (page + actions)** : `src/routes/(app)/log/+page.svelte` (encart mobile `desktop_windows` + Aide-like header + toolbar `+ Nouveau retour` + filtre statut + compteurs admin + bouton export client-side Blob+`URL.createObjectURL`), `src/routes/(app)/log/+page.server.ts` (load + 3 form actions `create`/`updateStatus`/`updateAdminNotes` ; defense in depth `isAdminEmail(user.email)` check serveur AVANT chaque mutation admin ; `as never` cast Supabase types non régénérés, dette tracée [WATCH]). **Lot 4 (tests)** : `src/lib/feedback.test.ts` 45 tests (8 describe : schemas + admin + pages + export + error-capture + options ; bonus : 3 cas subtils — limite min 10 chars inclusive, exportFilename TZ-locale tolérée, errorCapture purge sur read ET sur add) ; `src/routes/(app)/log/log-actions.test.ts` 13 tests (auth gate 401, admin gate 403, Zod gate 400, happy paths insert/update + load `isAdmin` résolu pour pascal vs antoine). 1250/1250 Vitest verts (1192 baseline + 58), svelte-check 0 err (28 warnings baseline pré-existants, mes nouveaux fichiers zéro warning), `npm run build` OK 16 s. **Lot 5 (audits Opus + docs)** : 3 audits parallèles `security-auditor` (artifact `audit_secu_2026-05-13_page_log.md` : 0 C/0 H/0 M / 1 Low fixé in-session = RLS UPDATE `lower(email)` / 4 Info ; OWASP 11/11 verts ; bypass admin double-bloqué ; `created_by` non forgeable ; zéro XSS ; CSRF natif SvelteKit OK) + `test-coverage-reviewer` (7/7 critères § 8 couverts + gap actions serveur fixé via 13 tests dédiés ; coverage ~95 % lib pure) + `contracts-reviewer` (enums alignés 4 sources : SQL CHECK / Zod / TS unions / options.ts ; CHECK `feedback_severity_iff_bug` ↔ `.refine` Zod ↔ form action ternaire = triple defense in depth ; 0 C/0 H / 1 M documentaire = spec § 4 ligne 70 `NOT NULL` incohérent avec choix migration / 4 L cosmétiques cleanup post-MVP). Bouton flottant + page /log **desktop-only** (audit mobile CRM différé en entry cockpit `d068a79d`). Spec : `notes/page-log-2026-05-13/spec.md`. Entry cockpit `af586294` à livrer via `deliver.py`. Tracking git : 9 fichiers nouveaux + 4 fichiers modifiés + CLAUDE.md. **Migration prod appliquée in-session** via skill `supabase` + `pg` lib (npm install --no-save) + script ESM one-shot avec `DATABASE_URL_ADMIN` (12 statements en 0,1 s, smoke vérif DB OK : `table=1, policies=3, index=4, RLS=true, trigger=1`) ; **reste côté Pascal pour clôturer la livraison** : (1) smoke prod login admin + login Antoine + saisie via bouton flottant, (2) Chrome DevTools manuel mobile breakpoint pour confirmer FAB et /log absents.
- [x] ~~S185 - Cadrage page Log CRM (feedback bugs/suggestions livraison Antoine) + spec figée 15 critères + entry idée cockpit audit mobile global~~ - Fait 2026-05-13 (xhigh, ~1h). /dig 360 sur la demande (page Log + bouton flottant + export JSON Claude Code CLI) → cadrage exec en termes simples (4 sections obligatoires `rules/communication.md`) → lecture exhaustive code existant via Explore agent puis lectures ciblées : Sidebar (`config.navigation.secondary` + `external: true` + target=_blank + onNavigate), `(app)/+layout.svelte` (Sidebar bind + Toast monté `z-[100]` + breakpoint mobile 1023px), hooks auth (`safeGetSession` → `{session, user}` ; admin par email allowlist, pas de table), schemas Zod (`extractForm` + `validate` + pattern Schema.create/update), migrations RLS récentes (pattern `FOR ALL TO authenticated USING (true)` + index + CHECK + `gen_random_uuid()`), `content.ts` Aide post-S182 (data-driven, types TS, KNOWN_ROUTES), ConfirmModal `trapFocus` + `aria-modal="true"`. Spec rédigée `CRM/notes/page-log-2026-05-13/spec.md` (~440 lignes, 15 critères binaires testables, schéma DB exact, format export JSON, statuts, helpers admin, tests, gates QA). 4 questions Pascal tranchées : Q1 bouton flottant OK + raccourci clavier RETIRÉ ; Q2 nom de menu = « Log » (vs « Retours ») ; Q3 lecture seule post-envoi ; Q4 export JSON tableau d'objets. Arbitrage mobile S185 : bouton flottant et page /log **desktop-only** via media query `@media (max-width: 1023px)` (alignée breakpoint sidebar) ; entry cockpit `d068a79d` créée en idée AppFactory/CRM via POST HTTP `/api/entries/appfactory` (voie officielle, 100% propre, jamais d'édition `entries.jsonl` directe) pour traçer le futur chantier « Audit mobile CRM - réduire fonctionnalités à l'essentiel » (objectif explicite : aligner aussi cockpit). Aucun code, aucun audit secu (cadrage seul). Tâche email Antoine `adc89b4b` (S183 BLOQUÉE) delivered via `deliver.py meta` au /start (Pascal l'a envoyée hors session). Tracking : `CRM/notes/page-log-2026-05-13/spec.md` (nouveau).
- [x] ~~S184 - Cleanup hygiène cockpit : 2 entries livrées (branches mortes caduque + image > 1 Mo)~~ - Fait 2026-05-13 (high, ~0,3h). T1 `0d00274c` (« 1 mergee(s) dans AppFactory ») caduque : `git branch --merged main` ne retourne que `* main`, plus rien à supprimer. T2 `3815a446` (« 2 image(s) > 1 Mo dans CRM ») : 2 PNG identifiés = `docs/golden/v5/mobile/signaux.png` (7.2 Mo, archive S125 sans référence) + `docs/golden/v6/mobile/signaux.png` (7.2 Mo, **régénéré activement** par `tests/mobile.spec.ts:7,134` via `SCREENSHOTS_DIR=docs/golden/v6/mobile`). Décision : supprimer uniquement v5 (zéro régression code/tests, archive récupérable via `git show 95eed00`). v6 conservé (le retirer = recréation au prochain `pnpm test:mobile`). Commit `20fa290` poussé sur main (`75d1acd..20fa290`). Pas d'audit secu (rien de sensible touché). Tracking : `CRM/docs/golden/v5/mobile/signaux.png` supprimé.
- [x] ~~S183 - Polish page Aide (diagrammes + respiration + tirets longs) + fermeture menu mobile + e-mail de lancement Antoine~~ - Fait 2026-05-12 (high, ~3h). 5 diagrammes SVG `/aide` audités/corrigés (clip « +3 pts » → barres 88→80px, textes débordants raccourcis, flèches nettoyées), schéma « écosystème » refondu en vue d'ensemble pédagogique (tableau de bord en bandeau + 6 écrans en 2 familles, zéro flèche), chiffres recentrés dans les bulles d'étape (`dominant-baseline: central`) ; tirets longs retirés de tous les fichiers Aide ; respiration accrue (line-height 1.6→1.7, paddings sections 24/32→32/40, etc., échelle 8px) ; nav mobile : menu latéral se ferme à la sélection (`onNavigate` sur `Sidebar.svelte` + fix `$effect` cassé dans `(app)/+layout.svelte` — `prevPath` repassé en `let` non réactif) ; e-mail HTML de lancement `notes/email-lancement-antoine-2026-05-12.html` créé (tables + CSS inline + 600px, logo FilmPro inline SVG blanc, 3 étapes connexion, 4 fonctions clés, mini-schéma, non commité). Gates : 1192/1192 Vitest, svelte-check 0 err, build OK. Commits `0f820a2`+`e1eed24` poussés. Reste : smoke prod `/aide` + nav mobile + arbitrage Pascal sur l'e-mail (logo PNG hébergé vs SVG inline ; voie d'envoi Gmail draft vs Resend). Pas d'audit secu (rien de sensible touché). Détail complet : `archive/2026-05-12-sessions.md`.
- [x] ~~S182 - Refonte page Aide CRM from scratch (3 niveaux, data-driven, GOLDEN v9)~~ - Fait 2026-05-12 (xhigh, ~2,5h). `/aide` reconstruite : couche logique `src/lib/aide/{content,search,checklist}.ts` + composants `AideBlock`/`AideDiagram`/`AideChecklist` + orchestrateur `(app)/aide/+page.svelte` (1443→553 lignes). 3 niveaux (Prise en main / Fonctions détaillées / Doc technique), 5 diagrammes SVG, recherche full-text insensible casse/accents, deep-link `?tab=&section=`, sommaire sticky, zéro `getElementById`/`{@html}`, GOLDEN v9. Résorbe H-28 + M-29. +39 Vitest (1192/1192), svelte-check 0 err, build OK. Audits Opus : security 0C/0H/0M ; test-coverage 11/13 → 2 gaps comblés. Entry cockpit `eed7761c` livrée. Spec `notes/refonte-aide-2026-05-12/spec.md`. Commit `26fd3e8` poussé. Hors-scope reporté : tour guidé, bouton « ? » contextuel, push première-connexion. Détail complet : `archive/2026-05-12-sessions.md`.

