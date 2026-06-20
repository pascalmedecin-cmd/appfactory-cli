# Pivot 2026-05-28 — Abandon refonte mobile V2, repart specs propre sur V3 outil terrain

**Décision Pascal 2026-05-28** : la refonte mobile V2 (product-architect Phase 3, S190bis → S192bis) est abandonnée. Constat smoke iPhone : « trop de fonctionnalités portées mobile, peu de lisibilité ». Le mobile doit être un **outil terrain minimum**, pas une version mobile du CRM desktop.

Cette archive consolide tout ce qui était attaché à V2 dans `CLAUDE.md § Prochaine session / Watch list / Consolidation cockpit / Livré` au moment du pivot, pour traçabilité historique.

## Nettoyage cockpit (clean state)

25 entries cockpit `subproject=crm` supprimées via `DELETE /api/entries/appfactory/<id>` :

- **V2 smoke iPhone Bloc #1 + #2 cockpit** : `ce6ff035`, `c78c859d`, `e940f943`, `40c02b35`, `d001fe14`, `28edd49d` (Smoke F1/F2/F3 + spot-check pages + tabs scroll + screenshot signaux).
- **V2 QA 360 B1 cockpit** : `81d72f82`, `1d26032d`, `c316243e`, `ec2e66e3`, `6d395512`, `2ffecd20` (audit-uiux 5 agents + Playwright snapshots desktop + axe-core + Lighthouse + audit sécu + e2e mobile flows).
- **V2 rollout B3 + B7 cockpit** : `1397967b`, `818c7bd9`, `71ebdf2c`, `439c761b`, `4f305ca2` (Canary Pascal + Beta Antoine + GA 3e fondateur).
- **Bugs smoke S192bis créés ce tour** : `c87db971` (badge ScorePill + notation 10/10), `b7a24c1b` (caractères bizarres cards Signaux).
- **Cascade gabarit CRM B2/B4/B5/B6 cockpit** : `479fc894` (Phase 3 généalogie /entreprises), `8d169891` (verdict + cascade gabarit), `f675d819` (cascader page 1), `2e70aae2` (cascader 5 pages restantes).
- **Pivot V3 créé ce tour** : `b66caae1` (Refonte mobile V3 outil terrain) supprimé pour repartir specs propre.
- **Bloc #1 cockpit reliquat** : `b8a43ba1` (e2e Playwright PipelineMobileAccordion S192).

Pack `.product-architect/` V2 (prd + acceptance-criteria + DESIGN + slo-sli + feature-flag-plan + 5 ADRs + cadrage Q&R + gates-signed) déplacé dans `archive/product-architect-v2-mobile-2026-05-24-abandonnee/`.

## État prod au pivot

- Branche `main` HEAD : `9339300` (docs clôture S192bis).
- Dernier commit code : `040f9f4` (fix 5 lots bugs mobile post-smoke iPhone Pascal, S192bis).
- Alias prod `filmpro-crm.vercel.app` aliasé sur le deploy `dpl_aiiyEKuKAF4pDAg7Z8kgUimB1K7y` (commit `9339300`).
- Feature flag `ff_crm_mobile_v2: true` posé sur `pascal@filmpro.ch` (Supabase Auth `raw_app_meta_data`). À arbitrer dans le cadrage V3 : rollback flag + repartir flag neuf `ff_crm_mobile_v3`, OU bascule sémantique sur le flag existant. Code V2 toujours présent dans `main` (composants `PipelineMobileAccordion`, `MobileEntityCard`, bandeaux `desktop-only` /reporting + /dashboard/couts, drawer Signaux masqué mobile, AideDiagram lightbox).

## Watch list au pivot (V2 + héritage)

### Watch list S192bis (post-smoke iPhone bugs fix)

- **[WATCH] 17 tests `hooks.server.test.ts` cassés depuis commit `d78ab37` (Sentry feat)** : confirmé via `git stash + checkout HEAD~1` même 17 failures. Sentry est paused (`enabled: false` via commit `c442e59`) mais les tests sont restés cassés. Erreur type : `expected undefined to be 303` / `expected true to be false` sur runHandle. Impact prod : aucun (rate limit fonctionne effectivement, juste les tests qui plantent). À fixer dans la tâche QA Sentry méta-projet (`~/.claude/CLAUDE.md` § Prochaine attaque QA Sentry 3 apps). Si Pascal réactive Sentry sans avoir fixé ça, prévoir investigation des mocks Sentry dans `hooks.server.test.ts` (probable : Sentry.init dans hooks.server.ts attend des globals non mockés par le test setup).
- **[WATCH] Lot 3 — Signaux details "caractères incorrects" reporté** : Pascal a vu un texte mal rendu sur cards Signaux iPhone, mais sans screenshot le root cause n'a pas pu être identifié. DB samples lus : apostrophes droites, accents préservés, pas de mojibake. Causes possibles non vérifiées : (a) highlight chunks NFD offset cassé sur certains caractères, (b) double-encoding HTML entity dans une source SIMAP, (c) char invisible Unicode, (d) font qui ne rend pas certains glyphes. À reprendre côté V3 si la page Signaux reste dans le périmètre mobile (probablement non).

### Watch list S189 (post-refonte Signaux V4)

- **[WATCH] Svelte 5 — `onDestroy` s'exécute en SSR (Vercel) mais pas en `vite preview`** (incident S189) : c'est la source du 500 prod V4 initial. Toute référence à `window`/`document`/`localStorage`/`setInterval` qui doit être cleanupée DOIT passer par `$effect(() => { ...; return () => cleanup; })`, jamais par `onMount`+`onDestroy`. Vite preview ne reproduit PAS le bug (polyfill SSR différent d'adapter-vercel) — toujours tester en **preview branch Vercel** pour les composants qui touchent window. Mémoire `feedback_svelte5_ondestroy_ssr_window_undefined.md` gravée. Surveiller : autre composant qui touche window dans un `onMount`/`onDestroy` (grep `onDestroy.*window` + `onDestroy.*document` + `onDestroy.*localStorage` à la prochaine refonte UI).
- **[WATCH] Trap Vercel `rollback` → alias prod verrouillé** (incident S189) : après `vercel rollback`, l'alias prod (`filmpro-crm.vercel.app`) reste figé sur le rollback target. Les `git push` suivants buildent côté Vercel mais ne promeuvent PAS automatiquement (auto-promote suspendu). Il faut `vercel promote <new-deploy-url> --yes` explicite. Sinon Pascal teste prod en croyant voir le nouveau push et voit toujours l'ancien rollback. → Toujours vérifier via `vercel inspect filmpro-crm.vercel.app` après push post-rollback que l'alias pointe bien sur le nouveau deploy. Documenté dans la mémoire ci-dessus.
- **[WATCH] Drift latent script ↔ runtime `computeFullScore`** (audit contracts S189 Low) : `scripts/rescore_signaux_v2.mjs:65-76` ré-implémente la logique canton+source+entreprise de `scoring.ts:101-162`. Le test de parité (`keywords.test.ts:374-417`) ne couvre que `countMatches`+`normalizeNFD` via `_keywords_pure.mjs` partagé. Si `scoring.ts` ajoute un composant futur (ex: bonus secteur, retrait source), le cron tournera sur ancienne logique en silence. Fix proposé : étendre `_keywords_pure.mjs` avec `computeFullScoreCore({canton, source, ...})` partagé, OU ajouter un test de parité applicable à 5 fixtures représentatives (Cœur SIMAP, Bonus zefix, Éviter NE, etc.). Non bloquant V1.
- **[WATCH] Perf `highlightKeywordsAndSearch` non memoizée + maxlength input search** (audit security S189 Info x2) : (1) `SignauxCards.svelte:111-119` appelle `highlightKeywordsAndSearch` inline dans le `{#each}` à chaque render. Sur > 500 signaux × 40+ keywords = ~20 000 ops/render. Self-DoS local sans impact sécu. Mémoiser si dataset croît. (2) `signaux/+page.svelte:178-185` — `searchDebounced` non borné. Un paste 100 000 chars saturerait `normalizeNFD` + `indexOf` en boucle. Mono-tenant donc self-DoS uniquement. Ajouter `maxlength="200"` sur l'input search (cosmétique).
- **[WATCH] Décote temporelle `calculerBonusVeille` (`weeksSince > decayWeeks`)** non touchée par V4 (S189) : strictement parlant, c'est aussi une « temporalité dans le scoring » que Pascal voulait retirer. Mais c'est sur un CONCEPT DIFFÉRENT (bonus Veille cross-table sur `prospect_leads`, pas sur `signaux_affaires` qui s'affichent sur `/signaux`). N'apparaît PAS sur la page Signaux. À trancher Pascal si jugé dérangeant. Si oui : retirer `decayWeeks` + `weeksSince > decayWeeks` early-return dans `calculerBonusVeille` (`scoring.ts:73-100`) + retirer `weeksSince` du type `IntelligenceSignalInput` (+ callers).
- **[WATCH] M1 contracts : `HighlightChunkV2` union discriminé** (audit contracts S188 Medium #1) : le type `{ text; cat: KeywordCategorie | null; search: boolean }` autorise `{ search: true, cat: 'coeur' }` même si l'invariant runtime stipule « search prime → cat=null ». Le consumer `SignauxCards.svelte:99` enchaîne `if (chunk.search) … else if (chunk.cat)`, ce qui marche en pratique mais TS ne refuse pas un futur appelant qui produirait un chunk hybride. Refactor proposé : union discriminée `{ kind: 'plain' } | { kind: 'keyword'; cat: KeywordCategorie } | { kind: 'search' }`. Coût ~6 lignes consumer + tests. Non bloquant V1.

### Watch list S188 / S186 — détails archivés

→ Watch lists S188 (5 entrées : asymétrie regex/substring search, gap e2e Playwright /signaux, 4 Info security S187, 3 gaps test coverage S187, 4 Low contracts S187) et S186 (4 entrées : brand type `FeedbackEntry.context`, parse sans try/catch, rate limiter commun 5 endpoints, rows pré-fix casse mixte) détaillées dans `2026-05-25-sessions.md` § Watch list S188/S186.

### Watch list S178 (post-V2c + post-V1) — archivées S187

→ Détail des [WATCH] V2c/V1 (rate limit /entreprises, TOCTOU Zefix, AbortSignal, cancelled flag, RLS multi-tenant, Tabs DOM untested, etc.) : `2026-05-13-sessions.md` § « Watch list S178 ».

### Watch list S171 — archivée S187

→ Détail des [WATCH] S171/S169 (quota search.ch, `prospect_leads.description` LLM future, `entry.sourceUrl` href client, race `addItem` veille, injection prompt LLM thème) : `2026-05-13-sessions.md` § « Watch list S171 ».

### Watch list TOUJOURS active après pivot

- **Durcissement RLS si 4e user non-fondateur** : tant que FilmPro = 3 fondateurs symétriques, RLS « tous voient/suppriment tout » assumée. Le jour où un 4e utilisateur non-fondateur est ajouté → ouvrir tâche `[EXÉCUTABLE]` policies `created_by = auth.uid()` + tests d'intégration RLS. → voir `memory/feedback_rls_multitenant_durcissement_si_4_users.md`. (CONSERVÉE dans CLAUDE.md § RISQUES OUVERTS, pas spécifique mobile V2.)

## Consolidation cockpit au pivot (état S192 2026-05-25)

**Blocs actionnables côté cockpit** : Bloc #1 (Pipeline mobile) + Bloc #2 (polish) fermés. Reste 1 entry `transmitted` du Bloc #1 cockpit (`b8a43ba1` e2e Playwright PipelineMobileAccordion). 1 entry nouvelle créée par pivot S192 (`2ffecd20` Playwright E2E 3 user flows). 1 entry continue (`20c37767`).

**Blocs bloqués** : B1 (Phase 4 QA, 6 entries) + B2 (Rollout canary/beta, 2 entries) + GA hors-bloc. 2 dead_ids résiduels dans `blocks-crm.json` collection `blocs_bloques` (anciens `1397967b` + `818c7bd9` du B2 Rollout, renommés cette session) — non bloquant, à nettoyer manuellement via cockpit UI.

**Skip consolidation LLM S192** : `/api/consolidate/start/appfactory?subproject=crm` a échoué (exit_code=1 sans stderr) après 3min32 de run, pattern WATCH Hygiène v2 connu (Opus 4.7 timeout silencieux sur prompts ≥ 30 KB, cf. `memory/feedback_hygiene_llm_execution_robustness_2026-05-21.md`).

Toutes ces entries ont été **supprimées** au clean state 2026-05-28 (voir § Nettoyage cockpit ci-dessus).

## Livré V2 (S187 → S192bis)

- **S192bis** (2026-05-26, xhigh, ~2h) — Fix 5 lots bugs mobile post-smoke iPhone Pascal (ScorePill 13/10 clamp + Tabs scroll-snap+fade + MobileEntityCard badge chaleur + /dashboard/couts mobile + AideDiagram lightbox). Trigger : Pascal smoke iPhone post-S192, remonte 6 bugs (note 13/10, barre tabs hors écran 6 pages, badge chaleur cassé, page coût API pas propre, diagrammes aide illisibles, caractères incorrects). Périmètre : (a) `clampDisplayScore(raw, maxPoints)` helper dans `signauxFormat.ts` + 7 tests, (b) `scorePillIcon(label)` helper dans `mobile-entity-card.helpers.ts` + 4 tests, (c) `Tabs.svelte` best-in-class scroll-snap + fade mask-image + auto-scrollIntoView, (d) `/dashboard/couts/+page.svelte` desktop-only + bandeau, (e) `AideDiagram.svelte` refactor snippet svgContent + bouton zoom modal fullscreen avec scroll lock SSR-safe. Lot 3 reporté faute de screenshot. Commit `040f9f4` (11 fichiers, +521/-176). 17 failures `hooks.server.test.ts` pré-existantes [WATCH]. Build prod OK.
- **S192** (2026-05-25, high, ~2h) — Refonte mobile CRM Blocs cockpit #1 + #2 (Pipeline accordéon + polish Reporting/Dashboard/Signaux). Périmètre : (a) `pipeline-mobile-accordion.helpers.ts` 7 fonctions + 22 tests Vitest TDD, (b) `PipelineMobileAccordion.svelte` 6 étapes header tappable 56px + animation transform scaleY 200ms + aria + prefers-reduced-motion, (c) `pipeline/+page.svelte` $effect matchMedia SSR-safe + featureFlags + switch accordéon/kanban, (d) `reporting/+page.svelte` desktop-only + bandeau mobile, (e) `(app)/+page.svelte` stagger off mobile, (f) `signaux/+page.svelte` drawer Keywords expert-only. Audit qualité 0 important / 0 any / 0 TODO / 0 onDestroy+window / 0 console.log / 0 code mort. Tests 1393/1393. Commits `bd0b930` + `4aef918`.
- **S191** (2026-05-25, high, ~1h) — Refonte mobile CRM Bloc #1 cockpit (helpers MobileEntityCard testés + Cards Prospection + Cards Entreprises). Helpers `.ts` purs + 25 tests Vitest TDD (Option B preserving-productive-tensions). Tests 1371/1371. Commit `09703bb` (9 fichiers, +781).
- **S190bis** (2026-05-24, xhigh, ~3h) — Refonte mobile CRM Phases 1+2 product-architect + Phase 3 partielle. Phase 1 cadrage (8 questions + audit factuel 10 pages). Phase 2 specs : pack `.product-architect/` (11 fichiers : prd.md + acceptance-criteria.json 27 critères + DESIGN.md + slo-sli.md + feature-flag-plan.md + 5 ADRs). Phase 3 partielle : `feature-flags.ts` + `app.d.ts` + `+layout.server.ts` + `MobileEntityCard.svelte` + `contacts/+page.svelte`. 1346/1346 tests verts. Pas de commit prod. Gates 1→2 et 2→3 signées. Pack désormais dans `archive/product-architect-v2-mobile-2026-05-24-abandonnee/`.
- **S190** (2026-05-18, low, ~0,2h) — Vérification crons signaux prod + relance manuelle veille W20. Zefix `creation_entreprise` 417/7j, SIMAP v2/v3 actif (11/41 matchés Cœur/Bonus/Éviter sur 7j), 0 erreur Vercel.
- **S187 → S189** : refonte Signaux V2/V3/V4 (scoring sans temporalité + drawer mots-clés + bug SSR onDestroy) — détail intégral dans `2026-05-25-sessions.md`.
