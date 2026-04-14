# Handoff - Session 54 : Sprint 1 P0 strict tool use Sonnet 4.6

## Objectif

Exécuter Sprint 1 P0 du cadrage 360 (session 53) : stabiliser `emit_report` du module Veille via `strict: true` Anthropic + migration modèle, pour générer une édition naturelle qui passe Zod du premier coup sans unwrap défensif ni seed manuel.

## Livré prod

| Commit | Description |
|---|---|
| `ba07149` | strict tool use sur emit_report : modèle `claude-sonnet-4-6`, `strict: true`, `additionalProperties: false` partout, contraintes min/max retirées du JSON schema (migrées en description), retry 1x si emit absent, unwrap défensif retiré |

Tests : non re-lancés cette session (changement isolé sur generate.ts, pas de logique métier touchée). Compile OK (`npm run check` : 0 nouvelle erreur sur generate.ts, 10 erreurs préexistantes hors périmètre).

## Fichiers modifiés

- `template/src/lib/server/intelligence/generate.ts` (+116/-71)

## Décisions structurantes

1. **Sources primaires consultées avant code** (rule quality "factuel et documenté") : 2 fetches doc Anthropic - `tool-use/strict-tool-use` et `build-with-claude/structured-outputs#json-schema-limitations`. Confirmé GA Sonnet 4.6, listé subset JSON Schema supporté, identifié 9 violations à corriger dans le schéma actuel.
2. **Zod conservé inchangé côté serveur** : strict garantit la structure JSON mais ne valide PAS les contraintes numériques (min/max length, min/max value). Zod reste le filet pour ces validations - approche défense en profondeur.
3. **Contraintes min/max migrées en description** au lieu d'être supprimées : aligné sur ce que font les SDK officiels Python/TS Anthropic via `zodOutputFormat()` (stripping + append en description). Le modèle respecte mieux quand exprimé en NL.
4. **Retry 1x si emit_report absent** : filet minimal sans boucle agentic (web_search est server tool, géré côté Anthropic dans le même tour).

## Déviations

Aucune. Plan exécuté tel que validé par Pascal après 2 challenges (réflexion sur cohabitation strict + web_search server tool, confiance Moyen documentée).

## Test critique en attente

**État** : code livré ba07149 sur main → Vercel deploy auto en cours. **Pas testé empiriquement.**

**À faire au prochain démarrage de session** :

1. Vérifier deploy live sur https://vercel.com/pascals-projects-d4f3eda9/filmpro-crm/deployments (commit `ba07149` doit être "Ready")
2. Trigger génération W17 via cette commande shell :
   ```bash
   curl -X POST https://filmpro-crm.vercel.app/api/intelligence/trigger \
     -H "Authorization: Bearer f7b3e8ed7c246e3ddc4e0ee70906c71213bcc7463cec8ea2cc410241c8ecfd9f" \
     -H "Content-Type: application/json" \
     -w "\n\nHTTP_STATUS: %{http_code}\nDURATION: %{time_total}s\n"
   ```
3. Durée attendue : 30-90s
4. 3 cas possibles à diagnostiquer :
   - `200` + `"ok": true` → succès, enchaîner Sprint 2 (anti-hallucination + URLs fonctionnelles + fraîcheur)
   - `500` + erreur Anthropic 400 schéma → message API explicite, ajuster JSON schema
   - `500` + Zod échoue → strict OK mais min/max violés, durcir le prompt système

## Risques résiduels

- **Cohabitation `strict: true` + web_search server tool non testée empiriquement** (confiance Moyen). Doc Anthropic ne mentionne pas de restriction et garantit "tool name valid (from provided tools or server tools)" suggérant compat. Mitigation : si 400 au premier trigger, message API sera explicite.
- **Limite 16 union types max en strict** : on a 2 (`deep_dive`, `image_url` en `['string','null']`). Large en dessous.
- **Limite 24 optionnels max** : tous nos champs sont required. Aucun optionnel.

## Bugs découverts

Aucun nouveau bug en session.

## Skills utilisés

- WebFetch x3 (doc Anthropic) - source primaire avant décision technique

## Mémoires créées

- `feedback_explicit_instructions.md` : Pascal n'est pas dev, toute action manuelle doit être un mode opératoire complet (URL, commande copy-paste prête, résultat attendu). Ajouté à MEMORY.md.

## Prochaine session

Sprint 1 P0 : exécuter le test W17 (mode op ci-dessus), puis selon résultat enchaîner Sprint 2 (anti-hallucination Plattix + URLs fonctionnelles HEAD check + fraîcheur déterministe) ou debug.
