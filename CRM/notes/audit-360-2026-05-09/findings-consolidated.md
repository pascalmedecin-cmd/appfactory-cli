# Audit 360 CRM FilmPro - Findings consolidés

**Date** : 2026-05-09
**Méthode** : 360 batch S160 - 7 agents orthogonaux parallèles
**Agents** : bug-hunter, security-auditor, contracts-reviewer, code-reviewer, ui-auditor, test-coverage-reviewer, historical-context-reviewer
**Périmètre** : toute l'app CRM (`src/**`, migrations, tests)
**Cross-check** : findings dédupliqués entre agents, sévérité réharmonisée

---

## Compte global (post-dédup)

| Sévérité | Compte | Détail |
|----------|--------|--------|
| Critique | 7 | bloque livraison lundi 2026-05-11 |
| High | 28 | sécu/UX/data integrity |
| Medium | 48 | edge cases, drifts, dette structurelle |
| Low | 28 | polish, defense in depth |
| Info | 12 | bonnes pratiques validées |
| **Total** | **123** | (de 152 bruts post-dédup) |

## Top 10 risques (priorité absolue avant livraison lundi)

1. **[C-01] /reporting interroge colonnes inexistantes** - `contacts.date_creation` et `entreprises.date_creation` n'existent pas en DB. Page livrée S177 va crasher ou afficher KPI faux. **Bloque tâche #2 livraison.** Fix XS (~5 min).
2. **[C-02] /reporting KPI conversion toujours 0** - Compare `statut === 'transfere_crm'` au lieu de `'transfere'`. KPI conversion = 0% en permanence, faux signal client. Fix XS.
3. **[C-03] /api/export/leads crash** - `orderBy 'created_at'` qui n'existe pas + `score` au lieu de `score_pertinence`. Endpoint export inutilisable. Fix XS.
4. **[C-04] CSV injection cross-export** - `notes_libres` non échappé avec `=`/`+`/`-`/`@` peut exécuter formules Excel chez le destinataire. RCE indirect. Fix XS.
5. **[C-05] Race auto-création entreprise duplicate** - Pas de UNIQUE constraint sur `entreprises.raison_sociale`. Pattern check-then-insert crée doublons silencieux. Fix S.
6. **[C-06] DataTable listeners non cleanup** - searchTimer + pointer drag persistent attachés document après destroy. Memory leak progressif. Fix S.
7. **[C-07] LeadCreateSchema ↔ DB CHECK drift** - Zod accepte `'lead_express'`, DB CHECK refuse. Feature F3 V2 mobile cassée silencieusement. Fix XS (vérifier prod d'abord).
8. **[H-01] npm audit 5 CVEs** - `@sveltejs/kit` HIGH (DoS), `vite` HIGH (path traversal), `postcss` MOD XSS. `npm audit fix` 2 min.
9. **[H-02] Double H1 sur 4 pages** - reporting/dashboard-couts/veille/veille-id. Bloquant WCAG AA `page-has-heading-one`. Fix XS.
10. **[H-03] search-ch legacy 403 vs 429 collapse** - Anti-pattern S171 violé. Démo client = message trompeur. Fix XS (5 min).

---

## CRITIQUES (7)

### C-01 - /reporting colonnes inexistantes
- **Source** : contracts-reviewer #1
- **Fichier** : `src/routes/(app)/reporting/+page.server.ts:21-22`
- **Détail** : `contacts.date_creation` (vraie colonne `date_ajout`) + `entreprises.date_creation` (vraie colonne `date_import_ajout`)
- **Impact** : runtime crash ou silent zero KPIs sur tâche #2 livrée S177
- **Effort** : XS
- **Fix** : `select('date_creation:date_ajout')` alias PostgREST

### C-02 - /reporting KPI conversion toujours 0
- **Source** : contracts-reviewer #3
- **Fichier** : `src/routes/(app)/reporting/+page.server.ts:42`
- **Détail** : `l.statut === 'transfere_crm'` mais enum réel `'transfere'`
- **Impact** : KPI conversion 0% permanent, faux signal exec
- **Effort** : XS
- **Fix** : remplacer string + importer `STATUTS_LEAD` depuis schemas

### C-03 - /api/export/leads orderBy crash
- **Source** : contracts-reviewer #4
- **Fichier** : `src/routes/api/export/[entity]/+server.ts:91, 108, 110`
- **Détail** : orderBy `'created_at'` qui n'existe pas, lit `score` au lieu de `score_pertinence`. Exports contacts/entreprises ont aussi cellules vides (`date_creation` au lieu de `date_ajout`).
- **Impact** : 500 sur export leads, cellules vides exports contacts/entreprises
- **Effort** : XS
- **Fix** : renommer 5 occurrences

### C-04 - CSV injection (formula injection)
- **Source** : bug-hunter #1 + security-auditor #6 (DOUBLON confirmé 2 agents)
- **Fichier** : `src/lib/server/csv-export.ts:17-25`
- **Détail** : Cells commençant par `=`/`+`/`-`/`@`/`\t`/`\r` non neutralisées. `notes_libres = =cmd|'/c calc.exe'!A1` exécute formule Excel.
- **Impact** : RCE indirect chez destinataire (OWASP CSV Injection)
- **Effort** : XS
- **Fix** : préfixer `'` si 1er char dans `[=+\-@\t\r]`

### C-05 - Race auto-création entreprise duplicate
- **Source** : bug-hunter #2
- **Fichier** : `src/routes/(app)/contacts/+page.server.ts:34-58, 95-115`
- **Détail** : Pas de UNIQUE sur `entreprises.raison_sociale`. SELECT all + filter JS + INSERT crée doublons sous concurrence (Pascal terrain + main app simultané).
- **Impact** : doublons silencieux entreprises
- **Effort** : S
- **Fix** : index unique partial sur `lower(unaccent(raison_sociale))` + ON CONFLICT

### C-06 - DataTable listeners memory leak
- **Source** : bug-hunter #3
- **Fichier** : `src/lib/components/DataTable.svelte:117, 271, 198-211`
- **Détail** : searchTimer 300ms + pointermove/up sur document persistent après destroy. Composant utilisé sur 6 pages workspace.
- **Impact** : memory leak navigation rapide, surface large
- **Effort** : S
- **Fix** : `onDestroy(() => clearTimeout(searchTimer))` + cleanup pointer listeners

### C-07 - LeadCreateSchema ↔ DB CHECK drift
- **Source** : contracts-reviewer #2
- **Fichier** : `src/lib/schemas.ts:178-180` ↔ `supabase/migrations/20260411_001_sources_regbl_minergie.sql:6` ↔ `prospection/+page.server.ts:550`
- **Détail** : Zod accepte `'lead_express'`, DB CHECK refuse. F3 V2 mobile saisie rapide cassée OU drift silencieux migration manuelle prod.
- **Impact** : runtime CHECK violation 23514 sur F3 OU drift non versionné
- **Effort** : XS (vérifier prod via `pg_get_constraintdef` d'abord)
- **Fix** : migration ALTER CONSTRAINT si manquante

---

## HIGH (28)

### Sécurité
- **H-01 npm audit 5 CVEs** (security #1) - `@sveltejs/kit` HIGH DoS, `vite` HIGH path traversal, `postcss` MOD XSS, `cookie` LOW, `@anthropic-ai/sdk` MOD. Fix : `npm audit fix` (2 min).

### Bugs latents
- **H-02 Enrichir Zefix écrase notes_libres** (bug #4) - `entreprises/+page.server.ts:166-179` : `if (purpose) updates.notes_libres = purpose` overwrite inconditionnel. Pascal annote → clique Enrichir → note effacée. Fix XS : ne réécrire que si vide.
- **H-03 recheck-historical Promise.all illimité** (bug #5) - `api/intelligence/recheck-historical/+server.ts:49-62` : 500+ HEAD/GET parallèles, ban IP + timeout. Fix S : `runWithConcurrency(items, 4)` (existe déjà).
- **H-04 Cross-check garde items malgré verbatim_ok=false** (bug #6+21) - `intelligence/cross-check.ts:332-340` : si `{verbatim_ok:false, divergences:[]}`, item gardé. Brèche zéro hallu. Fix XS.
- **H-05 VisitsPanel geoloc Promise leak** (bug #7) - `VisitsPanel.svelte:71-138` : 15s timeout, navigation = mute state composant détruit. Fix S : `cancelled` flag.
- **H-06 Contact create SELECT entreprises sans LIMIT** (bug #8) - 10K entreprises = 500KB payload. Latence 2-5s. Fix S : index trigram + ILIKE prefix-bounded.
- **H-07 Schemas Zod date_publication permissif** (bug #9) - accepte `"not-a-date"`. UX : "Erreur opaque" sans contexte. Fix XS : regex `^\d{4}-\d{2}-\d{2}$`.
- **H-08 Compteur unread intelligence incohérent** (bug #10) - `+layout.server.ts:9-19` : ne tient pas compte archivés / supprimés. Badge 5 vs 7 cards visibles. Fix S.
- **H-09 addItem veille read-modify-write JSONB** (bug #11 + historical #2) - `veille/[id]/+page.server.ts:160-203` : 2 onglets = perte silencieuse. **Watch list S169 ouverte**. Fix M (optimistic locking).
- **H-10 transferer lead pas atomique** (bug #12) - `prospection/+page.server.ts:365-438` : 3 INSERTs séquentiels, état partiel possible. Fix M : RPC plpgsql.

### Contracts (drift types/schemas)
- **H-11 App.Locals.supabase typé sans <Database>** (contracts #5) - `src/app.d.ts:6` : permet aux drifts C-01/C-03 de passer `svelte-check`. Fix XS : `SupabaseClient<Database>`.
- **H-12 coutsFormat.CostRun cast as CostRun[]** (contracts #6) - `dashboard/couts/+page.server.ts:45` : pas de Zod parse. Régression silencieuse si DB CHECK étendu. Fix S.
- **H-13 IntelligenceItemSchema.rank 1-15 vs DB CHECK 1-10** (contracts #7) - addItem manuel rank 11-15 → CHECK violation 23514. Fix XS : aligner partout sur 15 (DB ALTER).
- **H-14 Form actions return shapes hétérogènes** (contracts #8) - `{success}` vs `fail()` vs `{ambiguous}` non documentés. Fix M : discriminated union.
- **H-15 DB schemas sans CHECK constraints** (contracts #9) - `signaux_affaires.statut_traitement`, `type_signal`, `opportunites.etape_pipeline` text libres. Drift cron silencieux possible. Fix S.

### Tests (gaps critiques)
- **H-16 Login form actions 0 tests** (test #1) - sendcode/verifycode auth. Régression OTP / hors domaine / cookie. Fix S.
- **H-17 Auth callback OTP 0 tests** (test #2) - 2 branches verifyOtp + exchangeCodeForSession. Fix S.
- **H-18 hooks.server.ts gate global 0 tests** (test #3) - rate limit, expiration 7j, whitelist email, AUTH_EXEMPT_ROUTES strict. Pattern S99 risk. Fix M.
- **H-19 Photos upload magic bytes 0 test régression** (test #4) - `detectImageType` défense unique anti MIME spoof. Fix M.
- **H-20 addItem veille manuel 0 tests** (test #5) - bypass partiel pipeline anti-hallu V2. Fix M.

### Code quality (dette structurelle)
- **H-21 CSS workspace .page-actions/.btn/.fab dupliqué 4 pages** (code #1) - 320 lignes drift. Première modif cross-pages = 4 fichiers à patcher. Fix M (~1h30).
- **H-22 5 implémentations inline NFD-normalize** (code #2) - text-utils + scoring + segment-mapper + ImportModal + searchch helpers. Drift `normalizeCompanyName` S176bis non propagé. Fix S.
- **H-23 CSS tokens sous-utilisés** (code #3) - 81 hardcodes radius vs 15 tokens, 37 hardcodes shadow vs 2 tokens. Modifier radius global = 81 endroits. Fix M.

### UI/UX (golden v9 + a11y)
- **H-24 6 hex hardcodés TriageQueue ActionButton** (ui #1) - `#6E9C8F #C28A86 #8A95A8 #7B8FAE #027A48 #C0391A`. Fix S : tokens `--color-success/danger/info/primary`.
- **H-25 3 gradients explicites dashboard** (ui #2) - `SectionGreeting.name` text gradient + `KpisBento` radial 280×280 + `TriageQueue` linear footer. Anti-pattern golden v9 § 6. Fix M : trancher exception ou retirer.
- **H-26 Heading hierarchy double H1** (ui #3) - reporting/dashboard-couts/veille/veille-id. Bloquant WCAG AA `page-has-heading-one`. Fix S : prop `hideHeaderTitle` ou h1→h2 local.
- **H-27 ARIA tablist sans roving tabindex** (ui #4) - 5 composants Tabs (contacts/entreprises/signaux/pipeline/reporting). Pas d'`ArrowLeft/Right`, pas de `tabindex="-1"`. Fix S : factoriser primitive Tabs.
- **H-28 /aide complètement hors charte** (ui #5) - 1443 lignes, 30+ off-grid spacing, borders 2px, font-size 0.625rem, no ARIA tablist. **Confirme tâche #4 livraison client refonte from scratch**. Fix L.
- **H-29 login SVG inline + font Inter + gap 2.5rem** (ui #6+21) - hors charte fonts/icons/scale. Fix XS+XS.
- **H-30 type scale hors échelle dashboard** (ui #7+22) - 17/40/44/56/76px hors `10/12/13/14/15/16/18/22`. Identité éditoriale assumée mais non documentée. Fix M : trancher exception ou ramener mag-display.
- **H-31 KpisBento radius 24px hors token** (ui #8) - tokens = 4/8/10/12/full. Fix XS.

### Historical
- **H-32 search-ch legacy 403 vs 429 collapse** (historical #1) - `api/prospection/search-ch/+server.ts:57-58`. Anti-pattern S171 violé. Démo client = message trompeur. Fix XS (5 min).

---

## MEDIUM (48)

### Sécurité
- **M-01** Fuite clé API search.ch via `String(err)` 4 endpoints (security #2) - `prospection/search-ch:132`, `enrichir-batch:172,245`, `zefix:112`, `simap:83`. Fix S : sanitizeError.
- **M-02** `lead.source_url` rendu href sans validation `https?://` (security #3) - `LeadSlideOut.svelte:216`. Defense in depth manquante (Svelte n'échappe pas schémas URL). Fix XS.
- **M-03** auth/callback encode `error.message` brut (security #4) - URL `/login?error=callback&detail=...` apparaît historique navigateur, logs Vercel referrer. Fix XS.
- **M-04** Rate limit ne couvre pas /login (security #5) - cost-burn SMTP Resend possible via `?/sendcode` bombing. Fix XS.

### Bugs latents
- **M-05** costTracker singleton non thread-safe (bug #13) - GHA + cron simultanés mutent même singleton. Fix M : DI explicite.
- **M-06** Dashboard relances inclut closed (bug #14) - `+page.server.ts:31-35` : pas de `.not('etape_pipeline','in','(gagne,perdu)')`. Fix XS.
- **M-07** +layout setTimeout sans cleanup (bug #15) - `+layout.svelte:23-29`. Fix XS.
- **M-08** Photos check+upload race cap 10 (bug #16) - `api/photos/+server.ts:138-156`. Fix S : trigger BEFORE INSERT.
- **M-09** applySignals + recompute non-atomic (bug #17) - 2 reports 1s d'écart = état intermédiaire visible. Fix S.
- **M-10** sanitizeForLog slice avant redact (bug #18) - leak du préfixe clé si index 470. Fix XS.
- **M-11** hooks setInterval module-level (bug #19) - HMR dev = multiplication. Fix XS.
- **M-12** recomputeLeadScoresBatch boucle séquentielle O(N) (bug #20) - 100 leads = 300 round-trips. Fix S.
- **M-13** Cron nettoyage-crm timeout-killer (bug #22) - 200×1.15s+retries possible >300s. Fix M : cap 100 ou GHA.
- **M-14** rateLimit Map cap 10000 DoS rotation IP (bug #23) - fail-closed bloque tous nouveaux. Fix M : Upstash/KV.
- **M-15** verifyUrlsBatch Promise.all illimité (bug #24) - cousin H-03. Fix S.

### Contracts
- **M-16** Pipeline opportunites cast non validé (contracts #10) - `pipeline/+page.server.ts:10`. Fix M.
- **M-17** extractForm coercion ad-hoc (contracts #11) - `=== 'true'` dupliqué partout. Fix S.
- **M-18** Regex sans `.max()` cap longueur (contracts #12) - `published_at`, `week_label`, `date_relance_prevue`. Fix XS partout.
- **M-19** intelligence_reports.items pas Zod parsé (contracts #13) - JSONB DB legacy peut diverger. Fix S.
- **M-20** prospect_visits FK type mismatch (contracts #14) - `entreprise_id TEXT` vs `prospect_lead_id UUID`. Fix L.
- **M-21** CSV export sans versioning (contracts #15) - rename colonne casse import client externe. Fix XS.
- **M-22** IntelligenceItemSchema.theme dupliqué validation slug (contracts #16) - run-generation + addItem. Fix S : factoriser.

### Code quality
- **M-23** 16 occurrences font-size demi-pixels (code #4) - PipelineCard/Column, dashboard sub-composants. Drift type scale stricte. Fix S.
- **M-24** 2 formatPercent divergents (code #5) - coutsFormat vs reportingFormat. Fix S.
- **M-25** Inconsistance casing tabs (code #6) - snake_case (signaux) vs kebab-case (contacts/entreprises) vs autres. Documenter asymétrie DB.
- **M-26** `(data as any)` cast dans contacts (code #7) - bypass PageData typé. Fix XS.
- **M-27** Couleurs hardcodées composants golden v9 (code #8) - ScorePill 5 hex, TriageQueue 6 hex (DOUBLON H-24). Fix S.
- **M-28** Comments saturés tags audit (code #9) - 42 occurrences. Volontaire methodo Pascal solo, ne pas fixer.
- **M-29** getElementById /aide (code #10 + historical #3) - 6 occurrences mais 5 légitimes (URL hash). Migration via tâche #4 refonte.

### UI/UX
- **M-30** FAB position right:20 bottom:20 off-grid (ui #9) - 4 pages. Fix XS : 16px ou doc HIG.
- **M-31** Modal h-11 vs spec h-10 (ui #10) - pipeline/contacts/entreprises. Fix XS ou doc.
- **M-32** Sidebar nav landmark + aria-current (ui #11) - pas de `<nav aria-label>`, état actif visuel-only. Fix XS.
- **M-33** Sidebar badge bg-amber-500 (ui #12) - drift hex Tailwind preset vs token warning. Fix XS.
- **M-34** h4 orphelins slide-out signaux (ui #13) - 4 occurrences. Fix XS.
- **M-35** h2 reporting font-size 14px (ui #14) - = body. Fix XS.
- **M-36** h1 dashboard-couts/reporting 24px hors scale (ui #15) - workspace = 22px. Fix XS.
- **M-37** TriageQueue h2 22px (ui #16) - = h1 workspace. Fix XS.
- **M-38** ActionButton 34×34 vs spec 36×36 (ui #17) - Fix XS.
- **M-39** EmptyState pas role status (ui #18) - filtre vidant pas annoncé. Fix XS.
- **M-40** rgba warning hardcoded signaux (ui #19) - Fix XS.
- **M-41** rgba red-500 alpha btn-danger hover (ui #20) - Fix XS.
- **M-42** KpisBento radial 280×280 hors gabarit (ui #26) - Fix S.
- **M-43** Sidebar `<aside>` au lieu de `<nav>` (ui #27) - sémantique cassée. Fix XS.
- **M-44** signaux empty-card h3 orphelin (ui #28) - hiérarchie cassée. Fix XS.
- **M-45** box-shadow rgba prolifération (ui #23) - 30+ cross-cards, pas dans tokens.shadow. Fix S.
- **M-46** tab aria-label sans unité (ui #24) - "Tous 47" sans "contacts". Fix S.
- **M-47** DataTable tr focusable + actions imbriquées (ui #25) - tab-order confus. Fix M.

### Tests
- **M-48** Mock Supabase ne valide pas RLS (test #6) - 25+ vecteurs non testés intégration (DOUBLON pattern S99). RISQUE OUVERT à documenter.
- **M-49** Couverture form actions ~5% (test #7) - 19 actions, 1 testée dédiée.
- **M-50** addItem JSONB concurrent writes 0 test (test #8) - DOUBLON H-09 watch S169.
- **M-51** Cron signaux happy path 0 test (test #9) - 314L handler. Fix M.
- **M-52** Cron alertes filter helper non testable (test #10) - extraire `buildScoreFilter`.
- **M-53** Visits geocoding + Haversine 0 test (test #11) - helpers non exportés. Fix M.
- **M-54** Export CSV handler 0 test (test #12) - Fix S.
- **M-55** Entreprises enrichir Zefix 0 test (test #13) - Fix S.
- **M-56** Couverture viewports Playwright (test #14) - 1 seul preset 430×932. Fix XS.
- **M-57** test.skip(true) orphelins mobile.spec.ts (test #15) - 7 occurrences DB-state-dependent. Fix S : seeder.

---

## LOW (28)

- **L-01** HSTS manquant (security #7) - `hooks.server.ts:113-121`. Fix XS.
- **L-02** CSP unsafe-inline (security #8) - SvelteKit hydratation requirement. À documenter.
- **L-03** RLS mono-tenant flat (security #9) - assumée 3 fondateurs. À durcir avant 4e user.
- **L-04** DELETE photos/visits sans ownership check (security #10) - tout fondateur supprime tout. Watch documenté.
- **L-05** ManualItemSchema URL z.string().url() (security #11) - défense réelle = verifyUrl. Mineur.
- **L-06** Zefix raw response loggée (security #12) - sanitizeForLog manquant. Fix XS.
- **L-07** escapeHtml email-recap couvre 5 entités (bug #25) - surface nulle today.
- **L-08** weekKey ISO 8601 frontière fin/début année non testé (bug #26) - Fix XS test.
- **L-09** formatTokens '0' pour valeurs négatives (bug #27) - cache bug amont. Fix XS.
- **L-10** Cron alertes drift `< 20h` au lieu `< 24h` (bug #28) - volontaire mais non documenté. Fix XS commentaire.
- **L-11** Cron signaux Zefix `new Date(invalid)` NaN silencieux (bug #29) - Fix XS guard isNaN.
- **L-12** parseSwissAddress sans NPA (bug #30) - structure dégradée. Fix XS.
- **L-13** TYPES_SIGNAL/STATUTS sans CHECK DB (bug #31) - DOUBLON H-15.
- **L-14** DataTable pageSizeOptions arbitraire (bug #32) - surface nulle today.
- **L-15** complianceTag `string | null` au lieu enum (contracts #17) - Fix XS.
- **L-16** date_publication regex inconsistant (contracts #18 + bug #9) - DOUBLON H-07.
- **L-17** App.PageData session non-nullable (contracts #19) - Fix S optionnel.
- **L-18** cost_audit_runs numeric(10,6) borne 9999 EUR (contracts #20) - Fix XS migration.
- **L-19** stores writable legacy (code #11) - choix conscient SSR-safe. Pas de fix.
- **L-20** Magic numbers temps Unix dispersés (code #12) - 13 occurrences. Fix XS constants.
- **L-21** Pages workspace ≥ 600 lignes (code #13) - justifié orchestration. Pas urgent.
- **L-22** eslint-disable sans justification (code #14) - 5 occurrences. Fix XS commentaires.
- **L-23** NFD-normalize inline ImportModal (code #15) - DOUBLON H-22.
- **L-24** gap dashboard 56/20px off-grid (ui #29) - Fix XS.
- **L-25** content padding 20/40px off-grid (ui #30) - Fix XS.
- **L-26** Tabs height 44 vs spec 40 (ui #31) - drift voulu mobile-first non documenté. Fix XS doc.
- **L-27** tab-count font 11px (ui #32) - hors type scale. Fix XS.
- **L-28** pipeline kanban dimensions 280/360/720 (ui #33) - off-grid. Fix XS.
- **L-29** login overlay sans aria-hidden (ui #34) - Fix XS.
- **L-30** filter-select height 32 vs 34 (ui #35) - Fix XS.
- **L-31** SignalBatchDeleteSchema 0 test régression (test #16) - Fix S 3 cases.
- **L-32** recompute-score frontière weeksSince (test #17) - Fix XS.
- **L-33** DataTable.svelte fragilité réactive Svelte 5 (test #18) - warnings state_referenced_locally. Fix M.
- **L-34** Composants a11y focus trap 0 test (test #19) - Fix S Playwright.
- **L-35** setInterval global hooks.server.ts (test #20 + bug #19) - DOUBLON M-11.
- **L-36** Drift CLAUDE.md "810 tests" réel 836 (test #21) - Fix XS doc.

---

## INFO (12 - bonnes pratiques validées)

- **I-01** cubic-bezier(0.16, 1, 0.3, 1) répété 30+ fois (code #16) - tokeniser `--ease-out-expo`.
- **I-02** padding 2px 8px tab pill 7 fois (code #17) - factorisé via cascade golden v9 OK.
- **I-03** setTimeout 200 magic non justifié (code #18) - mineur EnrichBatchModal.
- **I-04** Tailwind + CSS scoped doctrine non tranchée (code #19) - documenter dans CRM/CLAUDE.md.
- **I-05** Pas de Dependabot/Snyk (security #13) - drift NPM possible. `.github/dependabot.yml`.
- **I-06** safeGetSession fail-closed correct (security #14) - mériterait commentaire + test.
- **I-07** Description thème admin LLM injection sans escape (security #15) - watchlist S169 ok.
- **I-08** Icon wrapper appliqué partout (ui #36) - migration Lucide réussie.
- **I-09** Focus trap modaux cohérent cross-modaux (ui #37) - bonne hygiène.
- **I-10** Règle noDashedLines respectée (ui #38) - 0 occurrence cascade golden v9.
- **I-11** Ratio TDD helpers cascade médian ~13% (test #22) - bonne hygiène TDD.
- **I-12** Coverage outil non installé (test #23) - `@vitest/coverage-v8` absent.

---

## Recommandations exec (livraison lundi 2026-05-11)

**Avant lundi midi (~1h30 cumul) - tâche #3 audit + corrections** :
1. Fix 7 critiques (~30 min) : C-01/02/03/04/05/06/07
2. Fix top 5 high quick wins (~30 min) : H-01 npm audit + H-02 enrichir + H-04 cross-check + H-26 double H1 + H-32 search-ch 403/429
3. Fix 5 medium quick wins (~30 min) : M-03 callback URL + M-04 rate limit /login + M-06 dashboard relances + M-10 sanitizeForLog + M-44 h3 orphelin

**Post-livraison (S178+)** :
- 12 high résiduels (tests gate global, contracts cleanup, gradient dashboard arbitrage, cascade golden CSS dedup)
- 48 medium (dette structurelle, edge cases)
- 28 low (polish)
- 12 info (nice-to-have)

**Bloqués par scope tâche #4** :
- H-28 /aide hors charte → tâche #4 refonte
- M-29 getElementById /aide → tâche #4 refonte
