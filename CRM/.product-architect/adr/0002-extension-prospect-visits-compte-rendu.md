# ADR-0002 — Compte-rendu = extension de `prospect_visits` (pas une nouvelle table, pas `activites`)

## Status
Accepted (2026-05-31)

## Context
Le « compte-rendu de visite » V3 = résultat + note + photos + check-in GPS. Trois homes candidats existent :
1. `prospect_visits` : check-in GPS pur (lat/lng NOT NULL), XOR lead/entreprise, déjà en prod, photos déjà reliées au même owner. **Aucun champ texte.**
2. `activites` : log riche (`resume_contenu`, `prochaine_action`), mais lié à `contact_id`/`opportunite_id`, **pas à une entreprise** — une visite à une entreprise sans contact/opp précis n'aurait pas de home.
3. Nouvelle table dédiée `compte_rendu` : propre mais duplique l'entité terrain.

Le GPS doit devenir optionnel : sur le terrain, la géoloc peut être refusée, mais la note/le résultat restent utiles.

## Decision
Étendre `prospect_visits` : `ADD COLUMN resultat TEXT` (CHECK enum fermé) + `note TEXT` (≤ 2000), et rendre `lat`/`lng` nullable. 1 visite = 1 ligne = check-in GPS optionnel + résultat + note ; les photos restent dans `prospect_photos` (même owner `entreprise_id`).

## Implémentation requise (revue contracts H-1, à ne pas sous-estimer)
« Extension » ne signifie PAS no-op. Le code actuel `/api/visits/+server.ts` :
- POST **rejette en 400** si lat/lng absent ou non fini, et **n'insère pas** resultat/note.
- GET ne **SELECT pas** resultat/note ; il calcule `distance_from_zefix_m` inconditionnellement.

Phase 3 doit donc (tous changements additifs au contrat, mais réels) :
1. POST : relâcher la précondition GPS (plus de 400 si lat/lng absents = passage 400→201, relâchement de précondition à tracer) ; calcul distance **conditionnel** (`distance_from_zefix_m = NULL` + skip géocodage si pas de GPS, sinon CHECK `prospect_visits_distance_requires_gps_chk` casse) ; ajouter resultat/note à l'insert.
2. GET + POST : ajouter resultat/note au SELECT, **sans retirer** accuracy_m / distance_from_zefix_m / user_id (consommés par le desktop). `VisiteResume` reste un sur-ensemble.
3. Mettre à jour `geo-helpers.test.ts` + tests endpoint (le « 400 si pas de GPS » disparaît).

## Consequences
- (+) Entité terrain native, déjà XOR lead/entreprise, photos déjà reliées. Migration **additive** (add-column-only + DROP NOT NULL = relaxation rétro-compatible, les lignes existantes ont déjà lat/lng).
- (+) Évite le mismatch d'IDs `activites` (text PK, lié contact/opp) vs monde prospection (UUID).
- (-) La visite terrain n'apparaît pas dans le flux `activites` du dashboard desktop. Mitigation : la fiche entreprise desktop liste les `prospect_visits` (déjà le cas via `/api/visits`). Écriture d'une `activites` miroir = hors-scope V3 (évite double écriture).
- (-) `resultat` enum figé en DB (CHECK) : ajouter une valeur = migration. La liste DOIT être verrouillée avec Pascal AVANT d'écrire la migration (sinon dette migration immédiate). Acceptable (valeurs métier stables).

## References
- Schéma : `supabase/migrations/20260402_001_schema_filmpro.sql` (activites) + `20260430_001_prospect_photos_visits.sql` (prospect_visits).
- Council (voix Architecte : mobile écrit des faits terrain append-only).
- Revue contracts-reviewer 2026-05-31 (H-1 + cohérence lat/lng/distance).
- Best practice add-column-only : Supabase Vibe Coder's Guide.
