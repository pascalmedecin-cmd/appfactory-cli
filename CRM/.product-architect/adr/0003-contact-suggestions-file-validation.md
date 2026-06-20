# ADR-0003 — Contact terrain = table `contact_suggestions` (file de validation), pas d'écriture directe dans `contacts`

## Status
Accepted (2026-05-31)

## Context
Pascal veut capturer un contact croisé sur place, mais en **mode brouillon à valider** (réponse cadrage 2026-05-31). Le council a flaggé le dissent central : lecture-seule stricte force le retour papier (Architecte) ; écriture directe crée des doublons et des données divergentes qui ont tué la V2 (Critique). Le Critique a aussi averti du risque « file de validations jamais traitée ».

## Decision
Créer une table légère `contact_suggestions` (statut `en_attente`/`valide`/`rejete`, rattachée à `entreprise_id` + `visit_id` optionnel, au moins un identifiant requis). Le mobile y écrit une **suggestion**, jamais une ligne `contacts`. Le desktop expose un **badge compteur** (`COUNT statut='en_attente'`) + validation/rejet/fusion en 1 clic. La validation crée (ou fusionne sur) une ligne `contacts`.

Le badge desktop est un **critère bloquant** (AC-010) : sans lui, la feature brouillon est refusée (sinon file morte).

## Idempotence et cycle de vie (revue contracts)
- **Resolve idempotent** : transition d'état UNIQUE `en_attente -> valide|rejete`, irréversible. Un resolve sur une suggestion déjà résolue renvoie **409** (jamais une 2e ligne `contacts`). Protège du double-clic desktop = doublon (le mal exact que la file évite).
- **Cohérence DB** : CHECK `merged_contact_id IS NULL OR statut = 'valide'` + CHECK `(statut='en_attente') = (resolved_at IS NULL)` rendent la file auto-cohérente.
- **Cycle FK** : `entreprise_id` NOT NULL ON DELETE CASCADE (la suggestion appartient à l'entreprise) ; `visit_id` ON DELETE SET NULL (si la visite est supprimée, la suggestion survit, orpheline de sa visite mais pas de son entreprise). Le desktop doit gérer `visit_id = NULL`.
- **Traçabilité** : `created_by` et `resolved_by` DOIVENT être renseignés côté endpoint (`user.id`), jamais laissés NULL — sinon la traçabilité promise n'existe pas (la RLS plate ADR-0007 n'isole rien, ces champs sont la seule trace de l'auteur).

## Consequences
- (+) Isole le risque qualité de données hors du référentiel `contacts`.
- (+) Le commercial capture sur le moment (pas de retour papier), le desktop tranche au calme.
- (+) Traçabilité : qui a proposé, quand, validé par qui, fusionné vers quel contact.
- (-) Nouvelle table + 3 endpoints (create, list, resolve) + UI desktop de validation = travail Phase 3 non trivial.
- (-) Risque résiduel de file qui s'accumule si Pascal ne traite pas le badge — atténué par visibilité forte, pas éliminé.

## References
- Council (dissent Architecte vs Critique), session 2026-05-31.
- Cadrage Pascal 2026-05-31 : « contact en brouillon ».
- `memory/feedback_no_autre_in_lists.md` (qualité données).
