# Spec V1 - 7 Critiques + H-11 cause racine

**Lire avant d'attaquer** : `README-vagues.md` (workflow obligatoire toutes vagues).

**Objectif (1 phrase)** : Fixer les 7 Critiques de l'audit 360 + H-11 (typage `App.Locals.supabase<Database>`) qui est la cause racine ayant laissé passer C-01/C-02/C-03 via svelte-check, push prod avant lundi midi 2026-05-11.

**Effort** : ~2h30
**Branche** : `fix/audit-360-vague-1`
**Date cible push prod** : dimanche 10/05/2026 ou lundi 11/05/2026 matin (avant midi)
**Skills** : test-driven-development, supabase, webapp-testing
**Subagents** : code-review:security-auditor (gate QA)

---

## Critères d'acceptation BINAIRES (passe / passe pas)

Tous OBLIGATOIRES verts avant push prod. Si un critère tombe → STOP, root-cause, fix, retest.

| # | Critère | Mesure |
|---|---------|--------|
| AC-1 | H-11 typage Database | `App.Locals.supabase` typé `SupabaseClient<Database>` dans `src/app.d.ts` ; `pnpm check` remonte automatiquement les drifts cachés |
| AC-2 | C-01 reporting colonnes existantes | `pnpm check` 0 erreur sur `reporting/+page.server.ts` ; smoke prod /reporting affiche KPIs non-zéro (ou justifie zéro légitime) |
| AC-3 | C-02 KPI conversion non-zéro | KPI conversion `/reporting` lit enum `STATUTS_LEAD.transfere` (pas `'transfere_crm'`) ; test unit ou smoke confirme valeur >0 si data |
| AC-4 | C-03 export leads HTTP 200 | `curl -s -o /dev/null -w "%{http_code}" 'https://filmpro-crm.vercel.app/api/export/leads?...'` retourne 200 (avec auth cookie test) ; CSV non-vide |
| AC-5 | C-04 CSV injection neutralisée | `csv-export.ts` préfixe `'` si 1er char ∈ `[=+\-@\t\r]` ; ≥4 nouveaux tests Vitest TDD (formula injection cas, valeurs propres, cellule vide, tab/cr edge) |
| AC-6 | C-05 race entreprise duplicate impossible | Migration SQL appliquée prod : `CREATE UNIQUE INDEX entreprises_raison_sociale_normalized_unique ON entreprises (lower(unaccent(raison_sociale)))` ; INSERT `ON CONFLICT DO NOTHING` ou re-fetch dans `contacts/+page.server.ts` (2 endroits lignes 34-58 + 95-115) |
| AC-7 | C-06 DataTable cleanup | `onDestroy(() => { clearTimeout(searchTimer); document.removeEventListener('pointermove', ...); document.removeEventListener('pointerup', ...); })` dans `DataTable.svelte` ; test : navigation rapide entre 6 pages workspace ne fait pas grimper RAM Chrome dev tools |
| AC-8 | C-07 LeadCreateSchema ↔ DB CHECK aligné | `psql ... -c "SELECT pg_get_constraintdef(...) FROM pg_constraint WHERE conname LIKE '%source%'"` confirme valeurs autorisées DB ; Zod aligné OU migration ALTER CHECK ; F3 V2 mobile saisie rapide testable manuellement sans 23514 |
| AC-9 | svelte-check baseline ou mieux | `pnpm check` ≤ 4 erreurs strict (baseline avant V1) ; idéalement 0 nouvelle erreur |
| AC-10 | Vitest 100% verts | `pnpm test:unit -- --run` 100% verts (baseline 810 + ≥4 tests TDD csv-export + tests éventuels migration C-05) |
| AC-11 | Build prod OK | `pnpm build` exit 0, taille bundle stable ±2% |
| AC-12 | Audit Opus security-auditor | Subagent `code-review:security-auditor` sur diff branche : 0 Critical / 0 High / 0 Medium ; Low/Info acceptés watchlist |
| AC-13 | OWASP Top 10 verts | 11/11 (alignement audits S168+) |
| AC-14 | Smoke prod 4 routes | `https://filmpro-crm.vercel.app/{reporting,api/export/leads,contacts,signaux}` HTTP 303 → /login OU 200 |
| AC-15 | Artefact daté audit sécu | `~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/audit_secu_2026-05-10_audit-360-vague-1.md` créé |
| AC-16 | Cockpit deliver V1 | `python3 ~/.claude/cockpit/bin/deliver.py appfactory 7ed58fdb --sub crm --outcome '{"duration_h":2.5,"success":"yes","note":"V1 7C+H-11 fixés"}'` retourne `{ok:true}` |

---

## Items à fixer (8, ordre déterministe par fichier)

### 1. H-11 - `src/app.d.ts` (~10 min)

**Avant** : `supabase: SupabaseClient`
**Après** : `supabase: SupabaseClient<Database>` (importer `Database` depuis `$lib/database.types`)

**Pourquoi en premier** : faire remonter via `pnpm check` les drifts cachés C-01/C-02/C-03 et tout autre drift latent. Si nouveaux drifts apparaissent → les fixer in-session (zéro dette).

### 2. C-01 + C-02 - `src/routes/(app)/reporting/+page.server.ts` (~25 min)

**C-01** lignes 21-22 : `select('date_creation')` sur `contacts` et `entreprises`. La vraie colonne :
- `contacts.date_ajout` → utiliser alias PostgREST : `select('date_creation:date_ajout')`
- `entreprises.date_import_ajout` → idem alias

**C-02** ligne 42 : `l.statut === 'transfere_crm'` → importer `STATUTS_LEAD` depuis `$lib/schemas` et utiliser la bonne valeur (`'transfere'` ou équivalent réel selon enum).

**Vérification** : `pnpm check` ne signale plus drift sur ce fichier après typage `<Database>` (AC-1 + AC-2 + AC-3).

### 3. C-03 - `src/routes/api/export/[entity]/+server.ts` (~15 min)

Lignes 91, 108, 110 : 5 occurrences à renommer.
- `orderBy('created_at')` → vraie colonne (probablement `date_ajout` selon entité)
- `score` → `score_pertinence`
- `date_creation` → `date_ajout` (cellules contacts/entreprises actuellement vides)

**Test** : préview CSV export pour les 3 entités (`leads`, `contacts`, `entreprises`) → cellules non-vides, tri OK.

### 4. C-04 - `src/lib/server/csv-export.ts` + tests TDD (~25 min)

**Avant** : valeur cellule renvoyée brute, peut commencer par `=`/`+`/`-`/`@`/`\t`/`\r`.
**Après** : préfixer apostrophe `'` si 1er char dans cette liste (OWASP CSV Injection mitigation).

**Tests Vitest TDD obligatoires (≥4)** :
- `'=cmd|...!A1'` → `"'=cmd|...!A1"`
- `'+1234567890'` → `"'+1234567890"` (numéros téléphone)
- `'@user'` → `"'@user"` (mentions)
- valeur normale `'Hello'` → `"Hello"` (pas de préfix)
- cellule vide / null / undefined → `""`
- tab `'\tcol'`, CR `'\r'` → préfixés

Fichier tests : `src/lib/server/csv-export.test.ts` (créer si absent).

### 5. C-05 - migration UNIQUE + ON CONFLICT (~30 min)

**Migration SQL** : `supabase/migrations/20260510_001_entreprises_unique_raison_sociale.sql`

```sql
-- Anti race condition C-05 audit 360 2026-05-09
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE UNIQUE INDEX IF NOT EXISTS entreprises_raison_sociale_normalized_unique
  ON entreprises (lower(unaccent(raison_sociale)))
  WHERE raison_sociale IS NOT NULL;
```

**Application prod** : via Session pooler eu-west-1 IPv4 (cf. pattern S177 task 1, `DATABASE_URL_ADMIN` dans `.env.local` gitignored).

**Si index échoue (doublons existants)** : audit doublons en amont, dé-dupliquer manuellement (garder le plus ancien, fusionner contacts liés), puis re-tenter.

**Code** : `src/routes/(app)/contacts/+page.server.ts` lignes 34-58 et 95-115. Pattern check-then-insert remplacé par INSERT avec `.upsert()` + `onConflict: 'lower_unaccent_raison_sociale'` ou try/catch sur 23505 → re-fetch + utiliser id existant.

### 6. C-06 - `src/lib/components/DataTable.svelte` (~20 min)

Cleanup listeners :
- ligne 117 : `searchTimer` (debounce search 300ms) → `onDestroy(() => clearTimeout(searchTimer))`
- lignes 198-211 : pointer drag (column resize) → stocker handlers en variables, `removeEventListener` dans `onDestroy`
- ligne 271 : pointermove/pointerup attachés à `document` → idem cleanup

**Test manuel** : navigation rapide /contacts → /entreprises → /signaux → /pipeline → /contacts (cycle 5x), Chrome DevTools Memory tab : pas de croissance >5 MB par cycle.

### 7. C-07 - schemas + migration source CHECK (~15 min)

**Vérifier prod d'abord** :

```bash
psql "$DATABASE_URL_ADMIN" -c "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname LIKE '%prospect_leads_source%' OR conrelid = 'prospect_leads'::regclass AND contype = 'c';"
```

Si CHECK refuse `'lead_express'` ET cette valeur est utilisée par F3 V2 mobile :
- **Option A (recommandée)** : migration `ALTER TABLE prospect_leads DROP CONSTRAINT ...; ADD CONSTRAINT ... CHECK (source IN (..., 'lead_express'));`
- **Option B** : retirer `'lead_express'` du `LeadCreateSchema` Zod (`src/lib/schemas.ts:178-180`) si feature non utilisée.

Fichier ALTER : `supabase/migrations/20260510_002_prospect_leads_source_lead_express.sql` si Option A.

### 8. Final - QA 360 + push (~30 min)

Voir AC-9 à AC-16. Pas de raccourci.

---

## Hors-scope NOMMÉ (ne pas attaquer V1)

- **High** : H-01 à H-32 sauf H-11 (V2a/b/c)
- **Medium** : tous (V3a)
- **Low** : tous (V3b)
- **Info** : tous (V3b)
- **H-28** /aide refonte : tâche #4 livraison client distincte
- **M-29** getElementById /aide : doublon H-28

Si un nouveau finding émerge pendant V1 et n'est pas dans la liste 8 items → logger dans `notes/audit-360-2026-05-09/findings-v1-emergents.md`, continuer V1, traiter dans la vague appropriée.

---

## Définition de done V1

- [ ] AC-1 à AC-16 verts (pas un seul rouge)
- [ ] CRM/CLAUDE.md « Livré cette session » : entry V1 détaillée (commits, audit Opus, smoke prod, watchlist)
- [ ] CRM/CLAUDE.md tâche #3 cochée [x] dans Bloc #1 Prochaine session
- [ ] Cockpit deliver `7ed58fdb` exécuté
- [ ] Artefact `audit_secu_2026-05-10_audit-360-vague-1.md` posé
- [ ] Tag rollback Git : `git tag pre-v2a-2026-05-10` posé sur HEAD main après merge V1

---

## Métrique de succès post-livraison V1 (à logger dans entry cockpit `outcome`)

```json
{
  "duration_h": 2.5,
  "success": "yes",
  "note": "V1 7C+H-11 fixés. svelte-check N erreurs (baseline X→Y), Vitest M/M, audit Opus 0/0/0, push prod OK. Vague 2a démarrable."
}
```

---

## Si blocage insurmontable

STOP. Écrire dans `notes/audit-360-2026-05-09/blocage-v1-{timestamp}.md` :
- Critère bloqué (AC-X)
- Tentatives faites (commandes, erreurs)
- Hypothèse cause racine
- Proposition Pascal (option A / B avec reco)

Ne PAS push prod si AC-1 à AC-14 incomplets. Ne PAS marquer tâche cockpit delivered si V1 partiel.
