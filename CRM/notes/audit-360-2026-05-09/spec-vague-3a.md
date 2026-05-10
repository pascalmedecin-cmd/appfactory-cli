# Spec V3a - 57 Medium

**Lire avant d'attaquer** : `README-vagues.md` (workflow obligatoire toutes vagues).
**Pré-requis** : V1, V2a, V2b, V2c mergés en main.

**Objectif (1 phrase)** : Fixer les 57 Medium (sécu defense-in-depth, bugs latents, contracts cleanup, dette code, UI golden v9 polish, gaps tests) en groupant par fichier pour limiter rebuild, sans régression sur les High déjà fixés.

**Effort** : ~15h (peut s'étaler sur 2 sessions V3a-1 / V3a-2 si fatigue ; ordre figé)
**Branche** : `fix/audit-360-vague-3a` (ou `-3a-1` / `-3a-2`)
**Skills** : test-driven-development, supabase, refactoring-ui, golden-standard, webapp-testing
**Subagents** : code-review:security-auditor, code-review:contracts-reviewer, code-review:bug-hunter, code-review:test-coverage-reviewer

---

## Items à fixer (57, ordre par axe puis par fichier)

### Sécurité (4 items - defense in depth)

- **M-01** Fuite clé API search.ch via `String(err)` (4 endpoints) : prospection/search-ch:132, enrichir-batch:172,245, zefix:112, simap:83 → `sanitizeForLog` (réutiliser helper S167 `sanitize.ts`).
- **M-02** `lead.source_url` href sans validation `https?://` : `LeadSlideOut.svelte:216` → guard URL côté Svelte (whitelist protocole).
- **M-03** auth/callback encode error.message brut : `src/routes/auth/callback/+server.ts:14-22` → `sanitizeForLog` + truncate 200 chars.
- **M-04** Rate limit ne couvre pas /login (cost-burn SMTP Resend) : `src/hooks.server.ts:38-50` → ajouter /login à `RATE_LIMITED_ROUTES`.

### Bugs latents (11 items)

- **M-05** costTracker singleton non thread-safe : `cost-tracker.ts:227` → DI explicite ou wrap thread-safe.
- **M-06** Dashboard relances inclut closed : `+page.server.ts:31-35` → `.not('etape_pipeline','in','(gagne,perdu)')`.
- **M-07** `+layout.svelte` $effect setTimeout sans cleanup : `+layout.svelte:23-29` → `return () => clearTimeout(...)`.
- **M-08** Photos check+upload race cap 10/owner : `api/photos/+server.ts:138-156` → trigger BEFORE INSERT (migration SQL) ou check atomique.
- **M-09** applySignals + recompute non-atomic : `apply-signals.ts:138-156` → wrap dans transaction RPC ou ordering.
- **M-10** sanitizeForLog slice avant redact (leak demi-clé) : `sanitize.ts:19-30` → redact PUIS slice.
- **M-11** hooks setInterval module-level (HMR multiplication) : `hooks.server.ts:29-34` → guard `if (!globalThis.__interval)` ou nettoyer en HMR dispose.
- **M-12** recomputeLeadScoresBatch boucle séquentielle O(N) : `recompute-score.ts:97-109` → `runWithConcurrency(items, 4)`.
- **M-13** Cron nettoyage-crm timeout-killer : `api/cron/nettoyage-crm/+server.ts:85-119` → cap 100 par run OU externaliser GHA.
- **M-14** rateLimit Map fail-closed cap 10000 (DoS rotation IP) : `hooks.server.ts:18` → migrer vers Upstash/KV ou implémenter LRU eviction.
- **M-15** verifyUrlsBatch Promise.all illimité (cousin H-03) : `url-verify.ts:128-131` → `runWithConcurrency`.

### Contracts (7 items)

- **M-16** Pipeline opportunites cast non validé : `pipeline/+page.server.ts:10` → Zod parse OpportuniteSchema.
- **M-17** extractForm coercion ad-hoc dupliqué : `schemas.ts:33-39` + `prospection/+page.server.ts:443-457` → factoriser helper unique `coerceFormBoolean(value: FormDataEntryValue | null): boolean`.
- **M-18** Regex sans `.max()` cap longueur : `intelligence/schema.ts:106-110` (published_at, week_label, date_relance_prevue) → ajouter `.max(50)` partout.
- **M-19** intelligence_reports.items pas Zod parsé : `veille/+page.server.ts:66` + `veille/[id]/+page.server.ts:52-54` → `IntelligenceItemSchema.array().parse()`.
- **M-20** prospect_visits FK type mismatch : `20260430_001_prospect_photos_visits.sql:67-69` → migration `ALTER COLUMN entreprise_id TYPE uuid USING entreprise_id::uuid` (audit data avant : valeurs non-uuid à fixer).
- **M-21** CSV export sans X-Export-Schema-Version : `api/export/[entity]/+server.ts` → ajouter header `X-Export-Schema-Version: 1` + colonne version dans 1ère ligne CSV.
- **M-22** IntelligenceItemSchema.theme validation slug dupliquée : `intelligence/schema.ts:98` + `veille/[id]/+page.server.ts:130-134` → factoriser `validateThemeSlug` helper.

### Code (7 items)

- **M-23** 16 occurrences font-size demi-pixels (drift type scale v9) : PipelineCard/Column + dashboard sub-composants → ramener à entiers stricts.
- **M-24** 2 formatPercent divergents : `coutsFormat.ts:52,96` vs `reportingFormat.ts:73,84` → factoriser dans `src/lib/utils/format-percent.ts`.
- **M-25** Inconsistance casing taxonomies tabs : signauxFormat (snake) / contactsFormat (kebab) / entreprisesFormat (kebab) / pipelineFormat (kebab+anglicisme) → documenter asymétrie DB dans CLAUDE.md (snake = aligné DB enum, kebab = UI-only).
- **M-26** `(data as any)` cast bypassant PageData : `contacts/+page.svelte:58` → typer correctement.
- **M-27** Couleurs hardcodées composants golden v9 (DOUBLON H-24 partiel) : ScorePill 5 hex + TriageQueue 6 hex (déjà fait V2c) → vérifier ScorePill et fixer les 5 hex restants.
- **M-28** Comments saturés tags audit historique (42 occurrences) : DataTable.svelte + composants golden v9 → SKIP (volontaire methodo Pascal solo, ne pas fixer, documenter dans commit message).
- **M-29** getElementById /aide : DOUBLON H-28, scope tâche #4 → SKIP (exclu cascade audit 360).

### UI golden v9 polish (18 items)

- **M-30** FAB position right:20 bottom:20 off-grid (4 pages) : contacts/pipeline/entreprises/signaux → 16px ou 24px (multiple 8px).
- **M-31** Modal h-11 vs spec h-10 (3 pages) : pipeline/contacts/entreprises → trancher in-session : aligner h-10 OU mettre à jour spec.
- **M-32** Sidebar nav landmark + aria-current : `Sidebar.svelte:23-108` → `<nav aria-label="Navigation principale">` + `aria-current="page"` sur lien actif.
- **M-33** Sidebar badge bg-amber-500 (drift hex Tailwind) : `Sidebar.svelte:53, 59` → token `--color-warning`.
- **M-34** h4 orphelins slide-out signaux (4) : `signaux/+page.svelte:389, 416, 431, 450` → h3 (hiérarchie continue h2 → h3 → h4).
- **M-35** h2 reporting font-size 14px (= body) : `reporting/+page.svelte:184` → 16px ou 18px (cf. type scale).
- **M-36** h1 dashboard-couts/reporting 24px hors scale : ramener à 22px (scale workspace).
- **M-37** TriageQueue h2 22px (= h1 workspace) : `TriageQueue.svelte:215-219` → h3 ou réduire à 18px.
- **M-38** ActionButton 34×34 vs spec 36×36 : `TriageQueue.svelte:339-340` → 36×36 strict.
- **M-39** EmptyState pas role=status : `EmptyState.svelte` → ajouter `role="status"` + `aria-live="polite"`.
- **M-40** signaux warning rgba hardcoded : `signaux/+page.svelte:837` → token.
- **M-41** signaux btn-danger hover rgba red-500 alpha : `signaux/+page.svelte:761` → token `--color-danger-light` ou similaire.
- **M-42** KpisBento radial 280×280 hors gabarit : `KpisBento.svelte:128-147` → décision in-session : retirer (alignement V2c H-25) OU documenter.
- **M-43** Sidebar `<aside>` au lieu de `<nav>` : `Sidebar.svelte:23` + `+layout.svelte:50` → sémantique `<nav>` (DOUBLON M-32).
- **M-44** signaux empty-card h3 orphelin : `signaux/+page.svelte:253, 268` → h2 ou retirer (suit hierarchy locale).
- **M-45** box-shadow rgba prolifération (30+ cards) : EntreprisesCards / KpisBento / AlertesStrip / RelancesList / ActiviteTimeline / TriageQueue / QuickActionsFooter → étendre tokens.shadow et utiliser `var(--shadow-*)`.
- **M-46** tab aria-label sans unité : `ContactsTabs.svelte:32` + autres → `aria-label="Tous (47 contacts)"` (avec unité).
- **M-47** DataTable tr focusable + actions imbriquées (tab-order confus) : `DataTable.svelte:412-432` → soit row click → action, soit actions imbriquées non-focusable, trancher in-session.

### Tests (10 items)

- **M-48** Mock Supabase ne valide pas RLS (~25 vecteurs) : DOUBLON pattern S99 → DOCUMENTER comme RISQUE OUVERT dans `CRM/CLAUDE.md` (pas fixable par mocks, exigerait suite intégration DB).
- **M-49** Couverture form actions ~5% : 19 actions, 1 testée → ajouter ≥10 tests par axe (sécu, contracts, return shape).
- **M-50** addItem JSONB concurrent writes (DOUBLON H-09 V2b) : SKIP, déjà fixé.
- **M-51** Cron signaux happy path 0 test (314L handler) : `api/cron/signaux/+server.ts` → tests Vitest mock Zefix/Search-ch.
- **M-52** Cron alertes filter helper non testable : `api/cron/alertes/+server.ts` → extraire `buildScoreFilter` helper testable.
- **M-53** Visits geocoding + Haversine 0 test : `api/visits/+server.ts:31-133` → exporter helpers + tests.
- **M-54** Export CSV handler 0 test : `api/export/[entity]/+server.ts` → tests Vitest 3 entités.
- **M-55** Entreprises enrichir Zefix 0 test : `entreprises/+page.server.ts:132-184` → tests Vitest.
- **M-56** Couverture viewports Playwright manquante : `playwright.mobile.config.ts` → ajouter iPhone SE + Pixel 7 + iPhone 14 Pro Max.
- **M-57** test.skip(true) orphelins mobile.spec.ts (7) : créer seeder DB-state pour les déskipper.

---

## Critères d'acceptation BINAIRES

| # | Critère | Mesure |
|---|---------|--------|
| AC-1 | Sécu (M-01..M-04) | sanitize unifié 4 endpoints + URL guard LeadSlideOut + rate limit /login + callback truncate |
| AC-2 | Bugs latents (M-05..M-15) | 11 fixes appliqués + ≥10 tests Vitest TDD couvrant régressions |
| AC-3 | Contracts (M-16..M-22) | 7 fixes appliqués + 1 migration SQL FK uuid + Zod parse partout |
| AC-4 | Code (M-23..M-27) | type scale entiers + format-percent factorisé + cast `as any` retiré |
| AC-5 | M-28 / M-29 documentés SKIP | commit message explicite |
| AC-6 | UI golden v9 (M-30..M-47) | 18 fixes posés OU décisions documentées GOLDEN_STANDARD.md |
| AC-7 | Tests (M-49, M-51..M-57) | ≥30 nouveaux tests Vitest + Playwright étendu |
| AC-8 | M-48 RISQUE OUVERT documenté | `CRM/CLAUDE.md` mention explicite ; mémoire `feedback_rls_mocks_insufficient_S99.md` validée |
| AC-9 | svelte-check baseline | zéro nouvelle erreur |
| AC-10 | Vitest 100% verts | baseline V2c + ≥40 nouveaux tests |
| AC-11 | Playwright e2e verts | iPhone SE + Pixel 7 + iPhone 14 Pro Max passent |
| AC-12 | Build prod OK | exit 0 |
| AC-13 | Audit Opus security-auditor | 0 C / 0 H / 0 M |
| AC-14 | Audit Opus contracts-reviewer | 0 nouveau drift |
| AC-15 | Audit Opus bug-hunter | 0 race condition résiduelle |
| AC-16 | Audit Opus test-coverage-reviewer | couverture form actions ≥30% |
| AC-17 | ui-auditor visual check | 0 régression golden v9 |
| AC-18 | Smoke prod 8 routes | toutes 200 ou 303 |
| AC-19 | Artefact daté audit sécu | `audit_secu_2026-05-{date}_audit-360-vague-3a.md` posé |
| AC-20 | Cockpit deliver V3a | entry delivered |

---

## Hors-scope NOMMÉ

- H-28 /aide refonte (tâche #4)
- Tous Low / Info (V3b)
- M-29 getElementById /aide (doublon H-28)
- M-50 addItem JSONB (doublon H-09 V2b)

---

## Découpage facultatif si fatigue (V3a-1 / V3a-2)

Si la session devient > 4h continue, splitter au point sain :
- **V3a-1** : Sécu + Bugs latents + Contracts + Code (29 items, ~7h)
- **V3a-2** : UI + Tests (28 items, ~8h)

Tag Git intermédiaire : `pre-v3a-2-2026-05-{date}`.

---

## Définition de done V3a

- [ ] AC-1 à AC-20 verts
- [ ] 1 migration SQL appliquée prod (M-20 FK uuid)
- [ ] CRM/CLAUDE.md « Livré cette session » : entry V3a détaillée
- [ ] GOLDEN_STANDARD.md mis à jour (UI décisions tranchées)
- [ ] Tag Git `pre-v3b-2026-05-{date}` posé

---

## Métrique outcome cockpit

```json
{"duration_h": 15, "success": "yes", "note": "V3a 57 Medium fixés (4 sécu + 11 bugs + 7 contracts + 5 code + 18 UI + 12 tests). 1 migration FK uuid. Audit Opus 0/0/0. Push prod OK."}
```
