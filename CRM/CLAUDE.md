# CRM FilmPro : CLAUDE.md

**Note migration restructure** : ce fichier vit dans `CRM/CLAUDE.md`. Le sous-projet CRM FilmPro est dans `AppFactory/CRM/` (path Vercel `rootDirectory: CRM`). Voie A livrée S173 2026-05-06 (split container CLAUDE.md). Voie B livrée S174 2026-05-07 (rename `template/` → `CRM/` + retrait wizard méta + repointage Vercel). Le `AppFactory/CLAUDE.md` racine est un stub container minimal qui pointe vers les 3 sous-projets (CRM, Consulting, Formation). Voir `~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/project_appfactory_restructure.md` pour le contexte migration complet.

**Statut :** Phase C. **Cascade audit 360 en cours** : V1 + V2a + V2b + V2c + V3a-1 + V3a-2 livrées (S178/S179, 2026-05-10..12) - reste V3b (28 Low + 12 Info, ~6h) puis tâche #4 refonte Aide. Détail récent dans § Livré + `archive/2026-05-10-sessions.md`. 12 migrations SQL prod cumul, audits Opus cumul 0C/0H/0M, Vitest 1077/1077. **Cascade golden v9 6/6 pages COMPLÈTE** (dashboard S175 + pipeline/contacts/entreprises S176bis + signaux/veille S176ter). MIGRATION RESTRUCTURE VOIE A+B LIVRÉE (S173-S174 : `template/` → `CRM/`, stub container parent). GOLDEN STANDARD v9 LAYERED DS LIVRÉ (S172) + règle `noDashedLines` (S176bis) + § 14 décisions audit 360 (S179). search.ch 2e source découverte (S171). Pipeline veille ANTI-HALLUCINATION V2 (S168). /prospection FIGÉE PAGE MODÈLE GOLDEN V9 (S165). Cron veille externalisée GHA (S167). Audit UX/UI 360 (S160). V2 mobile terrain CLOS (S127α+S129β+S130γ). Formation IA = sous-projet autonome dans `Formation/`, `cc` option 5.
**Derniere mise a jour :** 2026-05-12 (S179 : cascade audit 360 vague V3a-2 livrée - 28 items UI golden v9 polish + couverture tests. 2 commits mergés ff main (`0c640c6` UI M-30..M-47 / `9233aa3` tests M-49/M-51..M-57). +64 Vitest (1077/1077). svelte-check 0 err / 35 warnings (baseline). Build OK. Audit Opus secu 0C/0H/0M/0L/2I + test-coverage ~47% form actions. Smoke prod 8 routes 303→/login + cron signaux 401. Tag `pre-v3b-2026-05-12` posé. Artefact `~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/audit_secu_2026-05-12_audit-360-vague-3a-2.md`. Détail dans § Livré ci-dessous. Historique des vagues antérieures : V3a-1/V2c/V2b/V2a/V1 (S178) → `archive/2026-05-10-sessions.md` ; S176ter/S177 → `archive/2026-05-09-sessions.md` ; S171-S176bis → `archive/2026-05-08-sessions.md`.)
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** Session 179 (CRM, 2026-05-12, `/effort xhigh`, autonome) - Cascade audit 360 V3a-2 livrée. **Reste cascade** : V3b (~6h) puis tâche #4 refonte Aide (`[BLOQUÉ - V3b non livrée]`). Détail dans § Livré ci-dessous.
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

### Fixes mensuels (operateur)
- Claude Code Max : 100-200 EUR/mois (deja en place)
- Vercel Pro : 20 EUR/mois
- GitHub : 0 EUR
- Supabase Free : 0 EUR (dev/staging)
- **Total : 120-220 EUR/mois**

### Par app client
- Supabase Free : 0 EUR (jusqu'a 500 Mo)
- Supabase Pro : 25 EUR/mois (si depassement)
- Vercel : inclus dans Pro
- Domaine : ~1 EUR/mois (~12 EUR/an)
- **Total : 0-26 EUR/app/mois**

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

### Tests mobile via Chrome DevTools Device Toolbar (manuel) - OBLIGATOIRE

Tout test responsive / mobile / viewport (iPhone SE, iPhone 14 Pro Max, Pixel 7, etc.) se fait dans Chrome via **DevTools Device Toolbar** ouvert manuellement par Pascal (Cmd+Option+I → Cmd+Shift+M → sélectionner device dans le dropdown ou saisir width × height en mode "Responsive"). Claude guide la validation pas-à-pas (URL à charger, élément à inspecter, valeur attendue) ; Pascal exécute dans son DevTools et rapporte ce qu'il voit.

**Interdit** :
1. Tests Playwright avec `viewport: { width, height }` SEUL (sans `deviceScaleFactor`/`isMobile`/`hasTouch`/`userAgent`).
2. MCP `claude-in-chrome` `resize_window` + `javascript_tool` comme **substitut** à DevTools Device Toolbar (le MCP redimensionne la fenêtre Chrome desktop, pas le viewport émulé : pas de DPR mobile, pas d'UA mobile, pas de touch émulé, pas de viewport meta respecté → rendu non fidèle, écart constaté Session C 2026-04-27 : `resize_window(430, 932)` donne `innerWidth = 500`).

**Autorisé pour findings OBJECTIFS uniquement** (S125 dérogation /dig [B]) : Playwright avec `devices['iPhone 14 Pro Max']` preset complet (spread `...devices[...]` qui apporte userAgent Safari iOS + viewport 430×932 + deviceScaleFactor 3 + isMobile + hasTouch). Périmètre couvert : overflow horizontal, dimensions `getBoundingClientRect`, présence DOM, requêtes réseau (font self-host, etc.), boutons ≥ 44px, structure DOM, screenshots de référence.

**Reste obligatoire DevTools manuel pour findings QUALITATIFS** : rendu de police, perception visuelle, animations, scroll inertiel, jugement design, validation visuelle de screenshots golden. Référence d'implémentation : `CRM/tests/mobile.spec.ts` + `CRM/playwright.mobile.config.ts` (S125, 17/17 audits objectifs verts).

**Pourquoi DevTools manuel** : seule l'émulation Device Toolbar applique DPR (3 pour iPhone 14 Pro Max), UA mobile, touch émulé, viewport meta-tag, scrollbar overlay mobile → rendu fidèle au rendu réel sur device. Les media queries CSS Tailwind (`md:`, `lg:`) sont déclenchées par le viewport émulé, pas par la taille de fenêtre desktop.

**Quand le MCP reste OK** : pour mesurer `clientWidth`/`scrollWidth`/`getBoundingClientRect`/textContent en complément d'une session DevTools manuelle déjà ouverte, ou pour des audits de structure DOM non liés à la fidélité visuelle mobile.

**Comment appliquer** : si une tâche demande "tester mobile X" → demander à Pascal d'ouvrir DevTools Device Toolbar sur le viewport cible, lui donner l'URL à charger et la liste des points à vérifier (élément X visible ? overflow horizontal ? bouton Y ≥ 44px ?). Tests Playwright restent légitimes pour navigation desktop, redirects, formulaires, login (pas mobile).

Origine : Session C CRM mobile V1 2026-04-27, Pascal a explicitement refusé Playwright mobile **et** ensuite explicitement refusé MCP comme substitut à DevTools Device Toolbar manuel. Migrée du global méta vers projet AppFactory le 2026-05-01 (scope projet-only, hors-périmètre méta/Marketing/Enseignement).

## Prochaine session

**Prochaine attaque** : Bloc #1 V3b - cascade audit 360 finale (V1+V2a+V2b+V2c+V3a-1+V3a-2 livrées S178/S179 2026-05-10..12 ; reste V3b = 28 Low + 12 Info polish/defense-in-depth, ~6h, spec figée `notes/audit-360-2026-05-09/spec-vague-3b.md` ; tag rollback `pre-v3b-2026-05-12` posé). Puis tâche #4 refonte Aide. **Arbitrage Pascal 2026-05-11** : finir 100% du CRM (cascade V3b) AVANT de produire la page Aide → la tâche #4 refonte Aide (H-28/M-29 délégués) reste `[BLOQUÉ - V3b non livrée]`, pas en parallèle.

### 1. Cascade audit 360 V2a - sécu + contracts + DB CHECK [LIVRÉ S178]

- [x] ~~Lancer V2a en nouveau terminal autonome~~ - Livré 2026-05-10 commit `10df838` push origin/main. 9 High + L-01 fixés zero-debt, 2 migrations SQL prod, audit Opus 0/0/0/0/4 Info, OWASP 11/11 verts, contracts 6 alignés 0 nouveau drift. Vitest 878/878 (+33 TDD). svelte-check 0 erreur. Smoke prod 5/5 routes 303→/login. Tag rollback `pre-v2b-2026-05-10` posé. Détail dans § Livré ci-dessous.

### 2. Cascade audit 360 V2b - concurrence + atomicité [LIVRÉ S178]

- [x] ~~Lancer V2b en nouveau terminal autonome~~ - Livré 2026-05-10 commits `fd4cbb7`+`f50af95`+`fed5081` mergé main. 7 High concurrence/atomicité + 6 zero-debt audit Opus bug-hunter F1..F6 + N1 LIKE escape zero-debt + 6 migrations SQL prod (trigram + version + RPC transfer_lead idempotent + trigger bump_version + RPC entreprises_lookup_by_name). Vitest 902/902 (+24 TDD), svelte-check 0 erreur, audit Opus security 0/0/0/1L+4I, bug-hunter 0 race résiduelle. Smoke prod 5/5. Tag rollback `pre-v2c-2026-05-10` posé. Détail dans § Livré ci-dessous.

### 3. Cascade audit 360 V2c - UI golden v9 + tests gate global + CSS dedup [LIVRÉ S178]

- [x] ~~Lancer V2c en nouveau terminal autonome~~ - Livré 2026-05-11 (S178 suite). 4 commits mergés ff main (`0d0ddd6` + `ecc61f4` + `1f62ea6` + `b685641`). 13 High fixés (H-16..H-20 tests gate global + extraction `image-validate.ts` testable + `Tabs.svelte`/`tabsNav.ts` primitive ARIA roving ; H-21 `workspace.css` factorisé ~340L dedup 4 pages ; H-23 token sweep radius/shadow + 3 nouveaux tokens app.css + color-mix ; H-24 6 hex TriageQueue → tokens ; H-25 gradients dashboard retirés ; H-26 H1 unique Header h1 / contenu h2 ; H-27 5 composants Tabs → wrappers ; H-29 login charte ; H-30 type scale éditoriale 24/40/56/76 GOLDEN § 3.2bis ; H-31 KpisBento radius → `var(--radius-2xl)` 16px). Vitest 968/968 (+66), svelte-check 0 erreur, build 14.6s. Audit Opus security 0/0/0/2I + test-coverage ~85-90% gate. Smoke prod 8 routes 303→/login + build confirmée déployée. Cockpit deliver `7b8be5e018c6`. Tag rollback `pre-v3a-2026-05-11` posé. AC 21/24 ✓ (AC-10 axe-core / AC-17 Playwright e2e / AC-21 ui-auditor non exécutés en session autonome — nécessitent `tests/auth-setup.ts` OTP interactif ; structure h1/h2 + Tabs code-reviewée). Détail dans § Livré ci-dessous + artefact `~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/audit_secu_2026-05-11_audit-360-vague-2c.md`.

### 4. Cascade audit 360 V3a (reste V3a-2) [AUTO • xhigh • ~8h]

**Pourquoi** : Vague 3a, 57 Medium toutes catégories. Découpée en deux : **V3a-1 (sécu+bugs+contracts+code, 29 items) LIVRÉ S178** ; reste V3a-2 = UI golden v9 polish M-30..M-47 + tests M-49/M-51..M-57 (28 items, ~8h). Skills V3a-2 : refactoring-ui + golden-standard + webapp-testing. Subagents : security-auditor + test-coverage-reviewer (+ ui-auditor si dispo).
**Prérequis V3a-2** : V3a-1 mergée main (✓ commit `d3b6513`), tag rollback `pre-v3a-2026-05-11` posé. Au lancement V3a-2 : poser `git tag pre-v3a2-2026-05-{date}` avant.

- [x] ~~Lancer V3a-1 (29 Medium sécu+bugs+contracts+code)~~ - Livré 2026-05-11 (S178 suite). 4 commits mergés ff main (`a9db0e3` sécu+bugs M-01..M-15 + `7291069` contracts+code M-16..M-27 + `2453e3d` migrations SQL M-08+M-20 + `d3b6513` retours 4 audits Opus). 2 migrations SQL prod appliquées+vérifiées (`20260511_001` trigger plafond photos atomique + `20260511_002` CHECK format UUID). Vitest 1013/1013 (+45), svelte-check 0 erreur, build OK. Audits Opus : security 0C/0H/0M/0L/5I OWASP 11/11 + contracts 0 nouveau drift 21/21 + bug-hunter 0 race résiduelle (1 Medium fonctionnel introduit par M-06 fixé : relances dashboard masquait opps stade NULL) + test-coverage ~85-90% gate. Tous findings actionnables corrigés zéro dette. Smoke prod 8 routes 303→/login + `/api/cron/signaux` 401. Artefact `~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/audit_secu_2026-05-11_audit-360-vague-3a-1.md`. M-28 (commentaires saturés tags audit) + M-29 (getElementById /aide → tâche #4) SKIP volontaire. Détail dans § Livré ci-dessous.
- [x] ~~Lancer V3a-2 (28 items UI golden v9 polish M-30..M-47 + tests M-49/M-51..M-57)~~ - Livré 2026-05-12 (S179, autonome). 2 commits mergés ff main (`0c640c6` UI golden v9 polish + `9233aa3` couverture tests). Tag rollback `pre-v3a2-2026-05-12` posé. UI : M-30 FAB 24px, M-32/M-43 Sidebar `<nav aria-label>` + aria-current, M-33 badge `bg-warning`, M-34 h4→h3 slide-out signaux, M-35 panel h2 18px, M-36 hero h1 22px, M-37 TriageQueue h2 18px, M-38 ActionButton 36×36, M-39 EmptyState `role=status`, M-40 warning rgba→color-mix, M-44 empty-card h3→h2, M-46 Tabs `countNoun`→aria-label compteur ; M-41 + M-45 déjà résorbés par V2c (vérifiés) ; M-31/M-42/M-47 = décisions tranchées documentées `GOLDEN_STANDARD.md § 14`. Tests : +64 Vitest (1077/1077) — M-49 form actions contacts/pipeline (14), M-51 cron signaux (5), M-52 `buildScoreFilter` extrait+testé (10), M-53 `geo-helpers` extraits+testés (21), M-54 export CSV handler (6) + bug `formatJoined` CSV fixé en passant, M-55 enrichir Zefix (8) ; M-56 Playwright +2 viewports (iPhone SE, Pixel 7), M-57 seeders e2e `tests/fixtures.ts` → 6/7 `test.skip(true)` déskippés (le 7e conditionnel par nature) ; M-48 RISQUE OUVERT RLS-mocks gravé `CRM/CLAUDE.md § RISQUES OUVERTS` + mémoire `feedback_rls_mocks_insufficient_S99.md` ; M-50 SKIP (doublon H-09). svelte-check 0 erreur / 35 warnings (baseline). Build OK. Audits Opus : security 0C/0H/0M/0L/2I + test-coverage ~47% form actions (>30% cible), 13/15. Smoke prod 8 routes 303→/login + cron signaux 401. AC-11 (Playwright e2e) + AC-17 (ui-auditor) non exécutés en session autonome (OTP interactif / Chrome MCP). Artefact `~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/audit_secu_2026-05-12_audit-360-vague-3a-2.md`.

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
- **[WATCH] ~~cockpit entries CRM `blocked`/`block_role` stale (post-V3a-1)~~ - RÉSOLU 2026-05-11** : réconciliation manuelle de `entries.jsonl` + `blocks-crm.json` (backups `*.bak.<ts>-pre-reconcile-v3a`) : `78249fed4e8d` (V3a-2) → `blocked: false, block_role: actionable, block_num: 1` (Bloc #1) ; `14efa600e6ba` (V3b) → `block_role: bloque, block_num: B1` ; `dc3f7cf2133a` (Aide) → `blocked: true, block_role: bloque, block_num: B2`. `blocks-crm.json` retitré (Bloc #1 = « Cascade audit 360 V3a-2 », B1 = V3b, B2 = Aide). `/start` + `/api/consolidate/blocks` alignés sur la « Prochaine attaque » CLAUDE.md. Cause racine inchangée (`cli_pivot.py` ne réécrit pas `blocked`/`block_role`/`status` sur entries `source=cli` existantes) → si une future consolidation LLM s'applique, re-vérifier ; sinon stable.

### 5. Cascade audit 360 V3b - 28 Low + 12 Info [AUTO • xhigh • ~6h]

**Pourquoi** : Vague 3b finale, polish + defense in depth + bonnes pratiques (HSTS, sanitize Zefix, ownership check photos/visits, magic numbers, off-grid UI, Dependabot, coverage outil). Cascade audit 360 fermée à 100% en fin de V3b (134 fixés + 2 délégués tâche #4 H-28/M-29).
**Prérequis** : V3a-1 + V3a-2 mergées main (✓ commits `d3b6513` / `9233aa3`), tag rollback `pre-v3b-2026-05-12` posé. Au lancement V3b : poser `git tag pre-v3b2-2026-05-{date}` si découpage.

- [ ] **[EXÉCUTABLE]** Lancer V3b en nouveau terminal autonome → voir `notes/audit-360-2026-05-09/spec-vague-3b.md`

### 6. Tâche #4 Refonte page Aide CRM from scratch [SUPERVISÉ • xhigh • session dédiée]

**Pourquoi** : Tâche #4 livraison client cadrée S177 (3 niveaux : prise en main débutants, détails fonctionnalités, doc technique architecte+admin). H-28 (/aide hors charte 1443 lignes) et M-29 (getElementById /aide) délégués à cette refonte from scratch. Skills refactoring-ui + golden-standard + frontend-design + ux-guide + taste-skill + doc-coauthoring + webapp-testing. Subagents security-auditor + test-coverage-reviewer.
**Prérequis** : **Arbitrage Pascal 2026-05-11** : finir 100% du CRM (cascade audit 360 V3a + V3b mergées) AVANT de produire la page Aide. Techniquement indépendante (fichier `/aide/+page.svelte` non touché par les vagues), mais l'ordre est arbitré : pas de parallélisation, Aide en dernier.

- [ ] **[BLOQUÉ - cascade audit 360 V3b non livrée (ordre arbitré Pascal : finir le CRM avant la refonte Aide)]** Refonte page Aide CRM 3 niveaux

### Watch list S178 (post-V1)

- **[WATCH] V2b H-06 trigram entreprises** : V1 a posé `.limit(1000)` garde-fou immédiat dans `getOrCreateEntreprise`, refonte trigram + ilike bounded prévue V2b H-06.
- **[WATCH] V3a M-19 Zod refit searchch insert** : V1 a posé cast `as never` minimal (`searchch/+server.ts:225`), refonte Zod côté construction `inserts` prévue V3a M-19.
- **[WATCH] F3 V2 mobile saisie lead express** : `lead_express` maintenant accepté par DB CHECK (migration `20260510_002`), prochain test terrain à confirmer (CHECK violation 23514 disparue).
- **[WATCH] svelte-check baseline 0 erreur** : V1 a ramené baseline de 4 → 0. Si V2a→V3b font remonter erreurs, viser maintien baseline 0 (zéro nouvelle erreur tolérée).
- **[WATCH] Consolidation cockpit S178 calculée mais apply refusé local strict** : audit déterministe a flaggé 2 tâches `effort.score=3` mais 4 critères True (incohérence LLM dans blocs cumulés bloqués V2b+V2c et V3a+V3b). Output reste mémoire serveur cockpit, ré-applicable via UI après ajustement manuel ou re-consolidation à la prochaine clôture.


<!-- BEGIN CONSOLIDATION (auto-géré par cockpit, ne pas éditer) -->

### Consolidation cockpit (maj 2026-05-11 S178 post-V2c)

**Blocs actionnables** (priorité cascade audit 360, V2c livrée) :

- **Bloc #1** - Lancer V3a en terminal autonome (15h, confiance Élevé)
  - Objectif : Lancement V3a en nouveau terminal autonome `--dangerously-skip-permissions` avec spec figée `notes/audit-360-2026-05-09/spec-vague-3a.md` (découpage facultatif V3a-1/V3a-2)
  - 57 Medium toutes catégories (sécu defense in depth, bugs latents, contracts cleanup, dette code, UI golden v9 polish, gaps tests)

**Blocs bloqués** (cascade séquentielle + arbitrage Pascal) :

- **Bloc B1** [BLOQUÉ - V3a non livrée] - Lancer V3b en terminal autonome (6h)
  - 28 Low + 12 Info polish final
- **Bloc B2** [BLOQUÉ - V3b non livrée, ordre arbitré Pascal] - Refonte page Aide CRM from scratch (6h, confiance Moyen)
  - Objectif : Refonte 3 niveaux page /aide CRM (prise en main, détails, doc technique) - livraison client tâche #4 ; H-28/M-29 délégués
  - Arbitrage Pascal 2026-05-11 : finir 100% du CRM (cascade V3a+V3b) avant la refonte Aide — pas de parallélisation malgré l'absence de conflit fichier

**Note cockpit** : l'entry `78249fed4e8d` (V3a) conserve `block_role: bloque` côté `entries.jsonl` (état figé par la dernière consolidation appliquée, antérieure à la livraison V2c) — la consolidation LLM relancée 2026-05-11 a produit un résultat régressif (summaries d'entries périmés citant « dépend de V2b ») donc non appliquée. Le pivot a remis `blocked: false` sur l'entry mais pas le `block_role`. À réconcilier au prochain `/start` (drag UI cockpit V3a vers actionnable, ou re-consolider après rafraîchissement des summaries). Ce bloc CLAUDE.md fait foi.

<!-- END CONSOLIDATION -->


### Watch list S171 (post-livraison)

- **[WATCH] Compteur quota search.ch côté DB (post-S171)** (vu 2026-05-06) : search.ch ne fournit pas d'API publique pour lire le compteur quota mensuel (uniquement tableau de bord compte search.ch). Pour visibilité ops « il reste N requêtes ce mois » dans CRM → table `api_quota_log` ou colonne incrémentale `searchch_calls_YYYYMM`. Pas critique tant que Pascal contrôle l'usage, à graver tâche si l'usage atteint 50%+ du quota sur un mois.
- **[WATCH] `prospect_leads.description` consommée par LLM future (audit S171 Info #1)** (vu 2026-05-06) : description = `occupation + categories.join(' / ')` (categories user-influenced via `was=` query search.ch). Aucun pipeline LLM ne consume cette colonne aujourd'hui. Si pipeline future (scoring auto, qualification, génération mail) → appliquer cross-check verbatim pattern S168. → voir `memory/audit_secu_2026-05-06_searchch_endpoint.md`.
- **[WATCH] `entry.sourceUrl` rendu href client (audit S171 Info #2)** (vu 2026-05-06) : la nouvelle colonne `prospect_leads.source_url` peut désormais pointer vers une URL search.ch arbitraire. UI rendant `<a href={sourceUrl}>` doit confirmer filtrage `https?://` côté client (defense in depth Svelte). search.ch retourne uniquement `https://tel.search.ch/...` aujourd'hui, mais aucune garantie contractuelle. Audit visuel rapide LeadSlideOut + DataTable au prochain passage.
- **[WATCH] Race condition `addItem` veille (Low #3 audit S169)** : form action `addItem` sur `/veille/[id]` fait read-modify-write non-atomique sur `intelligence_reports.items` JSONB via service client. Si 2 admins ajoutent simultanément depuis 2 onglets, le second écrase le premier (perte silencieuse, pas exploitable). Mitigation suggérée : optimistic locking via colonne `version` si volume augmente. → voir `memory/audit_secu_2026-05-05_veille_themes_db.md` Low #3.
- **[WATCH] Injection prompt LLM via description thème (Info #1 audit S169)** : la description d'un thème admin est concaténée dans `SYSTEM_PROMPT` via `buildThemesPromptSection`. Validation Zod limite à 500 chars mais aucun escape. Modèle de menace = admin authentifié déjà accès complet au CRM (faible risque). Cross-check verbatim Sonnet S168 protège la sortie LLM. Mitigation suggérée si surface s'élargit : escape `\n` + délimiter `<themes_taxonomy>` XML-like. → voir `memory/audit_secu_2026-05-05_veille_themes_db.md` Info #1.

### Livré cette session (récents + archives)

→ Sessions antérieures : `archive/2026-05-10-sessions.md` (S178 cascade audit 360 V1 + V2a + V2b + V2c + V3a-1) · `archive/2026-05-09-sessions.md` (S174 Voie B + cascade golden 6/6 fermée + S176ter T2/T3 + S177 dashboard coûts) · `archive/2026-05-08-sessions.md` (S171-S173 + S175 dashboard v9 + S176bis x3 cascade /pipeline /contacts /entreprises) · `archive/2026-05-04-sessions.md` (antérieures)

- [x] ~~S179 - Cascade audit 360 vague V3a-2 (28 items : 18 UI golden v9 polish M-30..M-47 + 10 tests M-49/M-51..M-57)~~ - Fait 2026-05-12 (xhigh, ~4,5h ; Score 3/4 : multi-étapes + itération coûteuse rebuild + UI non-mesurable). Session autonome. 2 commits mergés ff main : `0c640c6` (UI golden v9 polish) + `9233aa3` (couverture tests). Tag rollback `pre-v3a2-2026-05-12` posé. **UI (M-30..M-47)** : M-30 FAB `.ws-fab` 20px→24px (multiple 8) ; M-32/M-43 `Sidebar.svelte` `<aside>`→`<nav aria-label="Navigation principale">` + `aria-current="page"` sur lien actif + `+layout.svelte` `:global(aside)`→`:global(.sidebar-root)` ; M-33 badge `bg-amber-500`→`bg-warning` (token) ; M-34 slide-out signaux 4×`<h4>`→`<h3>` ; M-35 reporting `.panel-header h2` 14px→18px ; M-36 hero h1 reporting + dashboard/couts 24px→22px ; M-37 `TriageQueue .section-h2` 22px→18px ; M-38 `TriageQueue .ab` 34×34→36×36 ; M-39 `EmptyState` `role="status"`+`aria-live="polite"` ; M-40 signaux `.empty-card-icon.warning` rgba→`color-mix(... var(--color-warning) 10% ...)` ; M-44 signaux `.empty-card h3`→`h2` (+ sélecteur CSS) ; M-46 `Tabs.svelte` prop `countNoun`→badge compteur `aria-label="{count} {noun}"` (passé contacts/entreprises/signaux/pipeline) ; M-41 + M-45 déjà résorbés par V2c (workspace.css `color-mix` + 0 box-shadow rgba) — vérifiés, RAS ; M-31 (boutons pied de modal `h-11` 44px = cible tactile WCAG 2.5.5, ≠ `h-10` toolbar) + M-42 (disque décoratif translucide `.kpi-featured` 280×280 conservé, aplat pas gradient) + M-47 (ligne DataTable cliquable conservée + contrainte "pas de focusable imbriqué hors checkbox" gravée) = **décisions tranchées documentées `GOLDEN_STANDARD.md § 14`**. **Tests** : +64 Vitest (1077/1077) — M-49 form actions `contacts-actions.test.ts`(14, create/update/delete) + `pipeline-actions.test.ts`(7), M-51 `signaux/server.test.ts`(5, garde CRON_SECRET + happy path Zefix+SIMAP vides), M-52 `buildScoreFilter` extrait `cron/alertes/score-filter.ts` + dédup 2 branches via `applyScoreFilter()` + `score-filter.test.ts`(10), M-53 `api/visits/geo-helpers.ts` extrait (haversineMeters, parseOwner/parseOwnerFromBody, parseSwissAddress, geocodeAddress avec queryFn injectable) + `geo-helpers.test.ts`(21), M-54 `export/[entity]/server.test.ts`(6) + **bug `formatJoined` CSV fixé en passant** (repartait de la ligne au lieu de la valeur de cellule → colonne « Entreprise » du CSV contacts toujours vide), M-55 `enrichir-zefix.test.ts`(8, fetch mocké, H-02 préserve notes_libres) ; M-56 `playwright.mobile.config.ts` +2 projets (iphone-se 375×667, pixel-7 412×915) ; M-57 seeders `tests/fixtures.ts` (`ensureSeedLead`/`ensureSeedEntreprise` via form actions, best-effort) → 6/7 `test.skip(true)` de `mobile.spec.ts` déskippés (le 7e « bouton Étape suivante sur fiche entreprise » conditionnel par nature) ; M-48 RISQUE OUVERT « RLS Supabase non couverte par les tests Vitest » gravé `CRM/CLAUDE.md § RISQUES OUVERTS` + mémoire `feedback_rls_mocks_insufficient_S99.md` ; M-50 SKIP (doublon H-09 V2b). **Gates** : svelte-check 0 erreur / 35 warnings (baseline inchangée) ; Vitest 1077/1077 ; build prod OK (19,3s) ; smoke prod 8 routes 303→/login + `/api/cron/signaux` 401. **Audits Opus** : `code-review:security-auditor` 0C/0H/0M/0L/2I (Info : geocodeAddress 3 appels externes ≈7,5s par POST visites = déjà [WATCH] ; buildScoreFilter ne valide pas l'invariant des seuils mais config statique) ; `code-review:test-coverage-reviewer` ~47% des 32 form actions exercées (>30% cible), score 13/15 — gaps Low/Info → watchlist V3b. **Non exécuté en session autonome** : AC-11 (Playwright e2e — `storageState` OTP interactif), AC-17 (ui-auditor — Chrome MCP + app lancée) ; structure h1/h2 + tokens code-reviewés. Artefact `~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/audit_secu_2026-05-12_audit-360-vague-3a-2.md`. Tag rollback `pre-v3b-2026-05-12` posé. **Reste cascade** : V3b (28 Low + 12 Info, ~6h) puis tâche #4 refonte Aide. **Tracking git** : 30 fichiers (UI + tests + helpers + GOLDEN_STANDARD.md § 14 + CRM/CLAUDE.md § RISQUES OUVERTS). Entry cockpit `78249fed4e8d` delivered (bloc #1 marqué delivered). Cockpit deliver → re-réconcilier `entries.jsonl`/`blocks-crm.json` au prochain `/start` si V3b ne remonte pas en Bloc #1 (cause racine `cli_pivot.py` inchangée). **Watchlist V3b ajoutée** (test-coverage) : `entreprises` {create,update,delete} action tests (de-risque aussi le seeder e2e) ; `applyScoreFilter` switch + `swisstopoQuery` fetch/parse/`<b>`-strip branches non testés ; `parseSwissAddress` token numérique dans le nom de rue ; `tests/fixtures.ts` `actionOk` devrait parser le résultat d'action SvelteKit (pas juste HTTP 2xx) + purge des fixtures `[E2E]` en prod.

- [x] ~~Réconciliation drift cockpit CRM (entries.jsonl + blocks-crm.json) → aligné « Prochaine attaque » V3a-2~~ - Fait 2026-05-11 (low, ~0,3h). Au `/start` : `start_list.py` affichait Bloc #1 = « Refonte page Aide » (actionnable) et V3a/V3b en blocs bloqués B2/B3 — à rebours de la « Prochaine attaque » CLAUDE.md (V3a-2). Cause = `cli_pivot.py` ne réécrit pas `blocked`/`block_role`/`status` sur les entries `source=cli` existantes (cf. [WATCH] post-V3a-1). Fix manuel (backups `entries.jsonl.bak.<ts>-pre-reconcile-v3a` + `blocks-crm.json.bak.<ts>-pre-reconcile-v3a`, flock) : `78249fed` V3a-2 → `blocked:false, block_role:actionable, block_num:1` (Bloc #1) ; `14efa600` V3b → `block_role:bloque, block_num:B1` ; `dc3f7cf2` Aide → `blocked:true, block_role:bloque, block_num:B2`. `blocks-crm.json` : nouveau bloc actionnable #1 « Cascade audit 360 V3a-2 », B1 retitré « Cascade audit 360 V3b », B2 retitré « Refonte page Aide CRM from scratch » (enrichments préservés). Vérifié : `/start` rend l'ordre V3a-2 → V3b → Aide ; `/api/consolidate/blocks/appfactory?subproject=crm` aligné. Pivot `/fin-session` (`cli_pivot_repair.py`) re-run après : `created=7 updated=16 purged_cli=0` (les 7 créés = tâches Formation/Consulting non encore poussées, pas une régression CRM), `block_role`/`block_num`/`blocked` CRM préservés, `effort`/`complexity` rafraîchis. [WATCH] passé RÉSOLU. Bloc auto-géré `<!-- BEGIN CONSOLIDATION -->` du CLAUDE.md encore stale (cite « V3a dépend de V2b ») — se régénérera à la prochaine consolidation LLM, pas touché (zone « ne pas éditer »). `M CLAUDE.md` non commité (sur main, pas de demande de commit) ; `entries.jsonl`/`blocks-crm.json` dans `~/.claude/cockpit/projets/` (gitignored).

- [x] ~~S178 (suite) - CLAUDE.md CRM dégrossi de 108,6k à 41,6k chars (-62 %)~~ - Fait 2026-05-11 (low, ~0,3h). Historique des vagues audit 360 V1/V2a/V2b/V2c (S178) déplacé verbatim dans `archive/2026-05-10-sessions.md` (nouveau, 28,5k, format archives existantes) ; entrées Livré S177 + S176ter ×2 retirées du live (déjà condensées dans `archive/2026-05-09-sessions.md`) ; 4 lignes d'en-tête (Statut / Derniere mise a jour / Session courante / Sessions précédentes) compactées vers état courant + pointeurs vers archives ; pointeur § Livré mis à jour. Zéro régression : déplacement uniquement (rien supprimé, tout dans git history + archives) ; sections `## Prochaine session`, watch lists, Consolidation cockpit, STACK/COUTS/DECISIONS/INFRA/REGLES TECHNIQUES intactes. Reste 258 lignes / 41,6k chars : le seul gros poste résiduel = l'entry Livré V3a-1 (~11k), à archiver à la prochaine clôture pour passer strictement sous le seuil perf 40k. `M CLAUDE.md` + `archive/2026-05-10-sessions.md` non commités (sur main, pas de demande de commit ; à intégrer au prochain batch CRM ou commit dédié si Pascal veut).
