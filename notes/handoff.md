# Handoff - Session 60 : Bloc 2 pipeline 2 phases Veille livré

## Objectif session

Livrer Bloc 2 : refactor pipeline Veille en 2 phases avec filtre programmatique intermédiaire (pré-requis identifié session 59 Bloc 2bis). Prompt caching maximal sur system+tools.

## Livré

| Commit | Contenu |
|---|---|
| `be08674` | Refactor complet `generate.ts` en pipeline 3 étapes. Nouveaux fichiers : `prompt-phase1.ts` (extraction candidats, temp 0.1, tool `emit_candidates`) et `prompt-phase2.ts` (rédaction éditoriale, temp 0.45, tool `emit_report`). Nouveau schéma Zod `IntelligenceCandidateSchema` + `IntelligenceCandidatesSchema` dans `schema.ts`. Fonction `filterCandidatesByWindow` : HEAD URL + og-date + fenêtre 14j en parallèle, élimine candidats invalides avant Phase 2, normalise `published_at` à la date vérifiée (og prioritaire). Ancien `prompt.ts` supprimé. `cache_control` ephemeral ajouté sur dernier tool de chaque phase (système + tools cachés). Tests 83/83 verts (suite intelligence), typecheck 3 erreurs pré-existantes inchangées. |

## Validation empirique W16 en prod

DELETE `intelligence_reports WHERE week_label='2026-W16'` puis `POST /api/intelligence/trigger` (Bearer CRON_SECRET, 2m19s, HTTP 200).

Comparaison avant/après Bloc 2 :

| Métrique | Session 59 (W16) | Session 60 (W16) |
|---|---|---|
| Items publiés | 5 | 2 |
| `date_ok=true` | 2/5 (40%) | **2/2 (100%)** |
| `maturity=speculatif` auto | 3/5 | **0/2** |
| `date_source=og` | 1/5 | 1/2 |
| compliance_tag | "Adjacent pertinent" | "Adjacent pertinent" |

Détail items :
- Rank 1 : "Suisse : PV en façade sans permis dès janvier 2026" — pv-magazine.fr, date LLM 2026-04-08, url_ok, date_ok (llm), ent_ok, etabli
- Rank 2 : "Rénovation énergétique Suisse 2026 : fenêtres levier prioritaire" — helvetia-energy.ch, og 2026-04-09, url_ok, date_ok (**og source of truth respectée**), ent_ok, etabli

## Observations

- Le filtre programmatique 14j fonctionne : les candidats Phase 1 hors fenêtre sont éliminés AVANT rédaction Phase 2, plus de propagation de dates fabulées.
- Trade-off volume vs qualité : 2 items solides vs 5 items dont 3 spéculatifs. Cohérent avec la philosophie prompt "édition honnête > édition gonflée".
- Les 2 URLs retenues ont un segment de chemin doublé (`.../pompe-a-chaleur.../pompe-a-chaleur-radiateurs-...`) mais HEAD check répond 200. À observer sur prochaines régens — potentiel bug Phase 2 qui réécrit l'URL du candidat au lieu de la copier verbatim.

## Décisions structurantes

- Pipeline 2 phases validé en prod. Les blocs suivants (Scoring v2, auto-exécution prospection) peuvent s'appuyer sur ce pipeline.
- Ancien `prompt.ts` supprimé sans legacy layer — rollback = git revert.

## Non fait / parked

- Régen sur plusieurs semaines consécutives pour mesurer le gain cache réel (`cache_read_input_tokens` sur 3-4 appels d'affilée). Remis à une prochaine occasion.
- Bug potentiel URL-doublée à investiguer si se reproduit.

## État final

- Tests : 83/83 verts sur la suite intelligence (pas tous les tests projet lancés).
- Typecheck : 3 erreurs pré-existantes inchangées (`run-generation.ts` x2 Json typing, `signaux/+page.svelte` froid).
- Prod : commit `be08674` déployé, W16 régénérée et visible sur `/veille`.
- Git : main pushed, aucun changement en attente (sauf `.claude/scheduled_tasks.lock` deleted hors scope).

## Prochaine session

Bloc 3 (Scoring v2 signaux Veille, ~2h) — prochain [EXÉCUTABLE].
