# Audit veille 2026-04-25 (S111)

Spec validée à appliquer en Phase 4 implémentation.

## Décisions tranchées

| Décision | Choix |
|---|---|
| Modèle LLM | **Opus 4.7** conservé (xhigh, adaptive thinking). Sonnet écarté pour minimiser hallucinations. |
| Architecture | **Option [A] 1-phase**. Suppression Phase 2 + retries + vérifs post-génération redondantes. |
| Géographie | **Élargi avec priorités** : Suisse romande priorité absolue (rank 1-3), puis Suisse alémanique, France, Belgique francophone, DACH (rank 4+). Reste du monde pour innovations technologiques majeures uniquement. |
| Fenêtre temporelle | **30 jours** (vs 14j actuel) |
| Cron | **`0 6 * * 5`** = vendredi 6h UTC (= 7h CEST été / 8h CEST hiver). Email récap reçu vendredi matin. |
| Volume cible | 5-10 items/sem, accepter 0-3 sur semaines creuses, alerte si < 2 items |
| UX page /veille | **Magazine 3 cards édition** (depuis stash chantier B, à trier). Suppression badge "Non vérifié", `is_hot`, `recurrence_count`, filtres globaux 6 axes |
| Détail | `/veille/[id]` (existant, à conserver) |

## Suppression code

- `prompt-phase1.ts` (fusionné dans prompt unique)
- `entity-verify.ts` (Zefix entity check, source de faux positifs)
- `fetch-og-date.ts` (vérif date programmatique, déléguée au LLM)
- Retry Phase 2 (devient phase unique)
- Filtre programmatique 14j (`filterCandidatesByWindow` dans generate.ts)
- Vérifs post-génération redondantes (`generate.ts:485-535`)
- Logique fingerprint + recurrence + is_hot dans `+page.server.ts`
- Filtres URL params `pertinence/segment/geo/theme/hot/recurrent`
- UI badge "Non vérifié" `+page.svelte:369-376`

## Conservation code

- `cost-tracker.ts`
- `email-recap.ts` (avec ajout flag « Semaine creuse, à investiguer » si items < 2)
- `week-utils.ts`
- `url-verify.ts` (allégé, sans `trivial_path` strict)
- `chip-normalize.ts` (rétro-compat lecture anciennes éditions)
- `parse-date.ts` (simplifié)
- Cron `/api/cron/intelligence-archive` (inchangé)

## Architecture cible

**1 appel LLM** : `claude-opus-4-7` avec `web_search_20250305 max_uses=15` + tool `emit_report` strict (12 champs/item, segment/actionability/chips inclus).

**Vérif serveur minimale** : URL parseable + HEAD 2xx + date dans fenêtre 30j paramétrable. Pas de fetch og:published_time. Pas de Zefix entity. Pas de URL_MUTATED detection (puisque plus de Phase 2 à muter).

**Anti-doublons** : URL canonical des items des 4 dernières éditions, injecté dans prompt comme « items déjà couverts, INTERDIT de re-proposer sauf si article plus récent sur le même sujet (mention is_update + previous_url) ».

**Alerte** : si `items.length < 2` après vérif → email distinct « [ALERTE] Veille FilmPro Wxx, semaine creuse N items, à investiguer ».

## Coût attendu

| Scénario | Coût/run | Coût/an (52 runs) |
|---|---|---|
| Actuel (Opus 4.7 xhigh, 2-phases) | ~$1.50-2.00 | ~$80-100 |
| **Cible (Opus 4.7 xhigh, 1-phase)** | **~$0.30-0.60** | **~$15-30** |

## Plan Phase 4 (implémentation, 1 commit/étape)

1. Refonte `generate.ts` 1-phase + suppression Phase 2/retries
2. Suppression `entity-verify.ts`, `fetch-og-date.ts`, simplification `url-verify.ts`
3. Refonte `+page.server.ts` + `+page.svelte` cards magazine (depuis stash chantier B, trié)
4. Alerte 0-1 items + email récap simplifié
5. Cron schedule `0 6 * * 5`
6. Tests Vitest mis à jour
7. **1 run prod manuel via `/api/intelligence/trigger`** avec instrumentation, validation Pascal AVANT redeploy cron normal

**Effort estimé** : ~3-4h. Pas de session monolithique.

## Risques + mesures

| Risque | Mesure |
|---|---|
| 1-phase + web_search Anthropic non-déterministe | Si 2 runs consécutifs trop divergents → bascule Perplexity/Gemini Grounding (Option B) |
| Suppression Zefix entity verify = hallucinations entités CH | Accepter sur 1ère édition, monitorer manuellement, réintroduire si problème |
| Cassures rétro-compat lecture anciennes éditions | `chip-normalize` legacy + défauts `segment/actionability` conservés dans `+page.server.ts` |
| Variance LLM Phase 1 reste (cause amont) | Volume cible bas (5-10) + alerte semaine creuse compense |

## Stash à exploiter

`git stash show -p stash@{0}` (= `stash@{0}: WIP S110 chantier B`) contient :
- Prompt élargi DACH/France (à reprendre, ajuster avec priorités rank)
- Fenêtre paramétrable env `VEILLE_WINDOW_DAYS` (à garder)
- Anti-doublons URL+date intelligent avec `is_update`/`previous_url` (à garder)
- Schema URL `max(2000)` + `candidates optional default([])` (à garder)
- UI 3 cards magazine (`+page.server.ts` + `+page.svelte`) (à reprendre, base)
- Cron `0 5 * * 5` (à corriger en `0 6 * * 5`)
- Debug `__debug_phase1` en raw_response (à retirer, plus pertinent en 1-phase)
