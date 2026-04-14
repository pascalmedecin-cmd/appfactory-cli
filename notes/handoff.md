# Handoff - Session 59 : Bloc 2bis qualité sources LLM Veille

## Objectif session

Livrer Bloc 2bis : corriger qualité sources LLM Veille en combinant levier (1) élargir fenêtre à 14j + levier (2) durcir prompt système. Reporter levier (3) filtre programmatique au Sprint 4.

## Livré

| Commit | Contenu |
|---|---|
| `122082b` | Fenêtre 14j : fn `extendedWindowStart(range, days=14)` dans `week-utils.ts`, param `windowStart?` sur `GenerateInput`, utilisation dans `isWithinWindow`. `run-generation.ts` passe `extendedWindowStart(week, 14)`. Prompt système durci (règle critique vérifiabilité date, og:published_time requis, rejet si absente/hors 14j/future). User prompt mentionne tolérance technique. 3 tests ajoutés. |
| `3f75134` | Allowlist `/api/intelligence/trigger` dans `hooks.server.ts` (même pattern que `/api/intelligence/recheck-historical` session 57, nécessaire pour régen manuelle via CLI — endpoint est protégé par `CRON_SECRET` Bearer). |
| `ecdc28f` | Log debug temporaire `[veille:date-check]` pour diagnostiquer pourquoi 1ère régen retournait date_ok=false sur 2026-04-01. Cause identifiée : 1ère régen tournait encore sur build 15 min avant, 2nde régen a confirmé windowStart=2026-03-30 bien appliqué. |
| `ad84222` | Retrait log debug. |

Tests : 250/250 verts (vs 247/247 session 58, +3 sur `extendedWindowStart`).

## Validation empirique W16 après fix

DELETE `intelligence_reports WHERE week_label='2026-W16'` puis `POST /api/intelligence/trigger` (Bearer CRON_SECRET, 122s, HTTP 200).

5 items générés (vs 7 régen précédente → prompt durci a réduit volume) :

| Rank | published_at LLM | og-date | date_ok | url_ok | Note |
|---|---|---|---|---|---|
| 1 | 2026-04-10 | null | **true** | false | Dans fenêtre 14j ✓ |
| 2 | 2026-02-01 | null | false | true | Hors fenêtre, correct |
| 3 | (ignoré) | 2026-02-02 | false | true | **og > llm** source of truth ✓ |
| 4 | 2026-04-08 | 2026-04-08 | **true** | true | Meilleur item, tout OK ✓ |
| 5 | 2026-01-01 | null | false | false | Hors fenêtre + URL morte |

**2/5 items date_ok=true (vs 0/7 régen précédente)** → amélioration nette. Fenêtre 14j opérationnelle. og-date source of truth respectée (rank 3 basculé à false par og vs llm).

## Correction endpoint trigger

Le handoff session 55 disait d'utiliser `GET /api/cron/intelligence` car `/api/intelligence/trigger` était bloqué par middleware. **Depuis session 59, `/api/intelligence/trigger` est dans l'allowlist** et accepte POST avec Bearer CRON_SECRET. Les deux endpoints fonctionnent maintenant.

```bash
curl -sS -X POST https://filmpro-crm.vercel.app/api/intelligence/trigger \
  -H "Authorization: Bearer f7b3e8ed7c246e3ddc4e0ee70906c71213bcc7463cec8ea2cc410241c8ecfd9f" \
  --max-time 400
```

## Validation Chrome MCP

`GET /veille` (prod) :
- 5 items en fil chrono ✓
- Counts sticky bar corrects : 5 signals · 2 Action directe · 3 Veille active ✓
- 17 occurrences DOM du badge "Non vérifié" (rendu sur items url_ok=false ou date_ok=false) ✓
- Pas de régression visuelle

## Limite résiduelle

3/5 items LLM pointent encore vers articles anciens (fév/jan 2026) malgré prompt durci. Le LLM continue de "compléter" avec des sources hors fenêtre. Solution complète = **Bloc 2 (Sprint 4)** avec filtre programmatique phase 1 : rejeter candidats hors fenêtre 14j AVANT phase 2 rédaction, relancer web_search si pool vide. Incorporé dans la description Bloc 2.

## Prochaine session

Bloc 2 (Sprint 4) : prompt caching 90% + pipeline 2 phases température + filtre programmatique 14j. ~2h, autonome.

## Files modifiés

- `template/src/lib/server/intelligence/week-utils.ts` (+ test)
- `template/src/lib/server/intelligence/generate.ts`
- `template/src/lib/server/intelligence/run-generation.ts`
- `template/src/lib/server/intelligence/prompt.ts`
- `template/src/hooks.server.ts`

Git status : clean, main à jour avec origin/main (ad84222).
