# Spec V2a - High sécurité + contracts + DB CHECK constraints

**Lire avant d'attaquer** : `README-vagues.md` (workflow obligatoire toutes vagues).
**Pré-requis** : V1 déjà mergé en main (svelte-check baseline mise à jour, drifts cachés révélés via H-11 doivent être déjà fixés).

**Objectif (1 phrase)** : Fixer les 9 High sécurité/contracts/DB CHECK qui durcissent la surface d'attaque, alignent Zod ↔ DB, et bouchent les fuites de clé API + drifts critiques.

**Effort** : ~5h
**Branche** : `fix/audit-360-vague-2a`
**Skills** : test-driven-development, supabase, webapp-testing
**Subagents** : code-review:security-auditor (gate QA), code-review:contracts-reviewer (audit drifts résiduels)

---

## Items à fixer (9, ordre par axe)

### Sécurité (3 items)

#### H-01 npm audit 5 CVEs (~10 min)

`npm audit fix` (ou `pnpm audit --fix`) → vérifier zéro régression Vitest + build prod.
Si `npm audit fix` propose breaking change `@sveltejs/kit` major, valider Pascal en pause (sinon `--force` avec smoke prod renforcé).

#### H-04 Cross-check garde items malgré verbatim_ok=false (~15 min)

`src/lib/server/intelligence/cross-check.ts:332-340` : si `{verbatim_ok: false, divergences: []}`, l'item est gardé alors qu'il devrait être rejeté (brèche zéro hallu).

**Fix** : forcer rejet si `verbatim_ok === false` quelle que soit la longueur de `divergences`. Test TDD avant fix : input `{verbatim_ok: false, divergences: []}` → return rejeté.

#### H-32 search-ch legacy 403 vs 429 collapse (~15 min)

`src/routes/api/prospection/search-ch/+server.ts:57-58` : status 403 (clé invalide) collapsé avec 429 (quota) → message trompeur démo client.

**Fix** : mapper 403 → message "Clé API search.ch invalide ou bloquée, contacter admin" ; 429 → "Quota mensuel search.ch atteint". Aligner pattern S171 (`feedback_searchch_key_validation.md`).

### Contracts (5 items - drifts schémas)

#### H-07 Schemas Zod date_publication permissif (~15 min)

`src/lib/schemas.ts` (lignes 96-99, 124, 138, 197-207) : `z.string()` accepte `"not-a-date"`.

**Fix** : `z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD requis")` partout. 5 occurrences. Tests TDD : input invalide → fail Zod, input valide → passe.

#### H-12 coutsFormat.CostRun cast as CostRun[] (~30 min)

`src/routes/(app)/dashboard/couts/+page.server.ts:45` : cast `as CostRun[]` sans Zod parse → régression silencieuse si DB CHECK étendu.

**Fix** : créer `CostRunSchema` Zod (champs cost_audit_runs alignés migration `20260509_001_cost_audit_runs.sql`) ; `.parse()` ou `.safeParse()` avec fallback. Tests TDD : payload valide passe, payload invalide rejette.

#### H-13 IntelligenceItemSchema.rank 1-15 vs DB CHECK 1-10 (~20 min)

`src/lib/server/intelligence/schema.ts:86` accepte rank 1-15 mais migration `20260427_001_lead_signals.sql:13` CHECK 1-10.

**Fix** : ALTER CHECK DB pour étendre à 15 (aligner cap Zod) :

```sql
-- supabase/migrations/20260510_003_intelligence_items_rank_15.sql
ALTER TABLE intelligence_reports
  DROP CONSTRAINT IF EXISTS items_rank_check;  -- nom à confirmer via pg_constraint
ALTER TABLE intelligence_reports
  ADD CONSTRAINT items_rank_check CHECK (...);  -- nouvelle borne 1-15
```

**Vérifier d'abord** la définition exacte du CHECK existant via `pg_get_constraintdef`. Application prod via Session pooler.

#### H-14 Form actions return shapes hétérogènes (~1h)

`src/routes/(app)/prospection/+page.server.ts:533, 564` + `signaux:111, 146` : `{success}` vs `fail()` vs `{ambiguous}` non documentés → frontend ne sait pas quoi consommer.

**Fix** : créer type discriminated union `ActionResult` dans `src/lib/types/actions.ts` :

```ts
export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string; field?: string };
```

Refactorer 4 form actions pour retourner ce shape cohérent. Tests Vitest : 1 par action couverte.

#### H-15 DB schemas sans CHECK constraints critiques (~30 min)

`supabase/migrations/20260402_001_schema_filmpro.sql:77, 87, 101` : `signaux_affaires.statut_traitement`, `signaux_affaires.type_signal`, `opportunites.etape_pipeline` text libres → drift cron silencieux possible.

**Fix** : nouvelle migration `20260510_004_db_check_constraints_signaux_opportunites.sql` qui ajoute 3 CHECK constraints alignées sur valeurs Zod (`STATUTS_SIGNAL`, `TYPES_SIGNAL`, `ETAPES_PIPELINE`). Vérifier avant : `SELECT DISTINCT statut_traitement FROM signaux_affaires;` etc. — si valeurs hors enum existent → audit data + nettoyage avant ALTER.

### Code (1 item - dette structurelle)

#### H-22 5 implémentations inline NFD-normalize (~30 min)

`text-utils.ts:6` / `scoring.ts:56` / `segment-mapper.ts:225` / `ImportModal.svelte:81` / `searchch/helpers.ts:34` : 5 implémentations inline drift `normalizeCompanyName` S176bis non propagé.

**Fix** : factoriser dans `src/lib/utils/text-normalize.ts` (créer si absent) avec helper `normalizeNFD(s: string): string`. Importer depuis 5 sites. Tests TDD : 6+ cas (accents, casse, unicode, vide, null).

### History (déjà couvert H-32 ci-dessus)

---

## Critères d'acceptation BINAIRES

| # | Critère | Mesure |
|---|---------|--------|
| AC-1 | npm audit clean | `pnpm audit` retourne 0 vulnérabilité High/Critical |
| AC-2 | Cross-check verbatim strict | test Vitest input `{verbatim_ok: false}` → reject confirmé |
| AC-3 | search-ch 403/429 distincts | curl direct API simule 403 → message dédié, 429 → message dédié |
| AC-4 | Zod date_publication strict | 5 occurrences regex `^\d{4}-\d{2}-\d{2}$` posées + tests verts |
| AC-5 | CostRunSchema Zod parse | `+page.server.ts:45` utilise `.parse()` + tests Vitest |
| AC-6 | rank 1-15 DB aligné | migration appliquée prod, `pg_get_constraintdef` confirme borne 1-15 |
| AC-7 | ActionResult uniforme | 4 form actions refactorisées, tests Vitest 4/4 |
| AC-8 | DB CHECK signaux/opportunites | 3 CHECK ajoutées, vérif `SELECT DISTINCT` pré-migration documentée dans commit message |
| AC-9 | NFD-normalize unifié | 5 sites importent helper unique, tests Vitest 6+ verts, baseline Vitest +N |
| AC-10 | svelte-check baseline | `pnpm check` ≤ baseline V1 (zéro nouvelle erreur) |
| AC-11 | Vitest 100% verts | `pnpm test:unit -- --run` 100% verts |
| AC-12 | Build prod OK | `pnpm build` exit 0 |
| AC-13 | Audit Opus security-auditor | 0 C / 0 H / 0 M sur diff |
| AC-14 | Audit Opus contracts-reviewer | aucun nouveau drift Zod/DB sur diff |
| AC-15 | Smoke prod 5 routes | /reporting, /dashboard/couts, /signaux, /pipeline, /api/prospection/search-ch ⇒ 200 ou 303 |
| AC-16 | Artefact daté audit sécu | `audit_secu_2026-05-10_audit-360-vague-2a.md` posé |
| AC-17 | Cockpit deliver V2a | nouvelle entry créée via API HTTP + delivered |

---

## Hors-scope NOMMÉ

- High V2b (concurrence/atomicité bugs)
- High V2c (UI golden v9 + tests gate global + CSS dedup)
- Tous Medium / Low / Info
- H-28, M-29 (refonte /aide tâche #4)

---

## Définition de done V2a

- [ ] AC-1 à AC-17 verts
- [ ] 5 migrations SQL appliquées prod (H-13 + H-15 + éventuel cleanup)
- [ ] CRM/CLAUDE.md « Livré cette session » : entry V2a
- [ ] Tag Git `pre-v2b-2026-05-{date}` posé sur HEAD main après merge

---

## Métrique outcome cockpit

```json
{"duration_h": 5, "success": "yes", "note": "V2a 9 High sécu+contracts+DB CHECK fixés. Migrations SQL appliquées. Audit Opus 0/0/0. Push prod OK."}
```
