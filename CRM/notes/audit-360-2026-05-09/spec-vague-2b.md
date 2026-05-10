# Spec V2b - High bugs concurrence + atomicité

**Lire avant d'attaquer** : `README-vagues.md` (workflow obligatoire toutes vagues).
**Pré-requis** : V1 et V2a déjà mergés en main.

**Objectif (1 phrase)** : Fixer les 7 High de concurrence (Promise.all illimité, race conditions, leaks post-unmount) et atomicité (read-modify-write, multi-INSERTs séquentiels) qui peuvent corrompre l'état applicatif sous charge.

**Effort** : ~4h
**Branche** : `fix/audit-360-vague-2b`
**Skills** : test-driven-development, supabase, webapp-testing
**Subagents** : code-review:security-auditor, code-review:bug-hunter (concurrence/race conditions)

---

## Items à fixer (7, ordre par fichier)

### H-02 Enrichir Zefix écrase notes_libres saisi (~10 min)

`src/routes/(app)/entreprises/+page.server.ts:166-179` : `if (purpose) updates.notes_libres = purpose` overwrite inconditionnel. Pascal annote → clique Enrichir → note effacée silencieusement.

**Fix** : `if (purpose && !existing.notes_libres) updates.notes_libres = purpose;` (ne réécrire que si vide). Ou concat `existing.notes_libres + '\n---\n' + purpose` selon UX préférée. Test Vitest TDD : note existante préservée après enrichir.

### H-03 recheck-historical Promise.all illimité (~30 min)

`src/routes/api/intelligence/recheck-historical/+server.ts:49-62` : 500+ HEAD/GET parallèles → ban IP cible + timeout serveur.

**Fix** : utiliser `runWithConcurrency(items, 4, fn)` (helper existe déjà dans `src/lib/server/intelligence/url-verify.ts` selon audit S168). Si absent, créer dans `src/lib/server/utils/concurrency.ts`. Tests Vitest TDD : 100 items, concurrence max 4 mesurée via timing log.

### H-05 VisitsPanel geoloc Promise leak (~30 min)

`src/lib/components/VisitsPanel.svelte:71-83, 85-138` : 15s timeout, navigation = mute state composant détruit (warning console + memory leak).

**Fix** : flag `let cancelled = false;` dans `onDestroy`, check `if (cancelled) return;` avant tout `state =`. Test manuel : ouvrir /prospection slide-out lead → cliquer Visites → quitter avant 15s → pas de warning console.

### H-06 Contact create SELECT entreprises sans LIMIT (~30 min)

`src/routes/(app)/contacts/+page.server.ts:35-39, 96-101` : `SELECT * FROM entreprises` (10K rows = 500 KB payload, latence 2-5s).

**Fix** : index trigram + ILIKE prefix-bounded :
- migration `supabase/migrations/20260510_005_entreprises_raison_sociale_trgm.sql` : `CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE INDEX entreprises_raison_sociale_trgm ON entreprises USING gin (raison_sociale gin_trgm_ops);`
- code : `.ilike('raison_sociale', \`\${q}%\`).limit(20)` au lieu de SELECT *
- frontend autocomplete : envoyer query `q` au server (pas de pré-fetch full list)

Test Vitest : mock Supabase retourne 20 max, query trigram déclenchée.

### H-08 Compteur unread intelligence incohérent (~30 min)

`src/routes/(app)/+layout.server.ts:9-19` : ne tient pas compte des items archivés / supprimés → badge sidebar 5 vs 7 cards visibles.

**Fix** : aligner SELECT count avec SELECT items affichés dans `/veille` (mêmes filtres : not archived, not deleted, not read). Tests Vitest : mock Supabase 7 items dont 2 archivés + 1 deleted → unread count = 4.

### H-09 addItem veille read-modify-write JSONB non atomique (~1h)

`src/routes/(app)/veille/[id]/+page.server.ts:160-203` : 2 onglets simultanés = perte silencieuse (lost update).

**Fix** : optimistic locking via colonne `version`. Migration `20260510_006_intelligence_reports_version.sql` :

```sql
ALTER TABLE intelligence_reports ADD COLUMN version INTEGER DEFAULT 0 NOT NULL;
```

Code : SELECT version + UPDATE WHERE version = $1 RETURNING version → si 0 rows updated, retry (max 3) ou erreur conflit. Tests Vitest : 2 SELECTs concurrents simulés → 1 succeed, 1 retry+succeed (ou erreur 409).

### H-10 transferer lead pas atomique (~1h)

`src/routes/(app)/prospection/+page.server.ts:365-438` : 3 INSERTs séquentiels (entreprise → contact → opportunité), si l'un échoue → état partiel corrompu.

**Fix** : RPC plpgsql `transfer_lead_to_crm(lead_id uuid)` qui fait les 3 INSERTs dans une transaction atomique (BEGIN; ... ; COMMIT;). Migration `20260510_007_rpc_transfer_lead.sql`. Code SvelteKit : `supabase.rpc('transfer_lead_to_crm', { lead_id })`. Tests Vitest : mock RPC succeed, mock RPC fail → rollback simulé.

---

## Critères d'acceptation BINAIRES

| # | Critère | Mesure |
|---|---------|--------|
| AC-1 | H-02 notes_libres préservé | test Vitest input note existante + enrichir → note conservée |
| AC-2 | H-03 concurrence cap 4 | test Vitest 100 items → max 4 fetch concurrents (timing log) |
| AC-3 | H-05 VisitsPanel cleanup | test manuel naviguation < 15s → 0 warning console state mutation post-unmount |
| AC-4 | H-06 SELECT bounded | code utilise `.ilike(...).limit(20)`, migration trigram appliquée prod |
| AC-5 | H-08 unread aligné | test Vitest mock 7 items / 2 archives / 1 deleted → unread = 4 |
| AC-6 | H-09 addItem atomique | test Vitest 2 writes concurrents → exactement 2 items visibles (pas de lost update) |
| AC-7 | H-10 transferer atomique | RPC créé + tests Vitest succeed/rollback |
| AC-8 | svelte-check baseline | zéro nouvelle erreur |
| AC-9 | Vitest 100% verts | baseline V2a + ≥6 nouveaux tests |
| AC-10 | Build prod OK | exit 0 |
| AC-11 | Audit Opus security-auditor | 0 C / 0 H / 0 M |
| AC-12 | Audit Opus bug-hunter | 0 race condition résiduelle sur diff |
| AC-13 | Migrations SQL prod | 3 migrations appliquées (trigram, version, rpc) |
| AC-14 | Smoke prod 4 routes | /entreprises, /contacts, /veille, /prospection ⇒ 303 ou 200 |
| AC-15 | Artefact daté audit sécu | `audit_secu_2026-05-10_audit-360-vague-2b.md` posé |
| AC-16 | Cockpit deliver V2b | entry delivered |

---

## Hors-scope NOMMÉ

- High V2c (UI golden v9 + tests gate global + CSS dedup)
- Tous Medium / Low / Info
- H-28, M-29

---

## Définition de done V2b

- [ ] AC-1 à AC-16 verts
- [ ] 3 migrations SQL appliquées prod
- [ ] CRM/CLAUDE.md « Livré cette session » : entry V2b
- [ ] Tag Git `pre-v2c-2026-05-{date}` posé

---

## Métrique outcome cockpit

```json
{"duration_h": 4, "success": "yes", "note": "V2b 7 High concurrence+atomicité fixés. RPC + version optimistic locking. Audit Opus 0/0/0. Push prod OK."}
```
