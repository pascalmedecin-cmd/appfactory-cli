# ADR-0001 - Découpe Films est un outil du portail, pas un module siloé

## Status
Accepted (2026-06-05). Tranche Q1 du cadrage.

## Context
Le brief fonctionnel v2.0 décrit un « module autonome » dont les entrées/sorties seraient consommées par
un CRM externe plus tard. Or ce brief a été rédigé par un autre Claude **sans connaître le contexte de ce
projet CLI** (Pascal, 2026-06-05) : FilmPro est déjà un **portail SvelteKit unique** (CRM sous `/crm`,
base Supabase partagée, référentiel `entreprises`/`contacts` en place). Traiter Découpe Films comme un
module isolé dupliquerait l'auth, la base, et le shell, et fermerait inutilement la porte à une intégration
future au référentiel/CRM.

## Decision
Découpe Films est un **outil du portail**, au même titre que le CRM :
- **même app SvelteKit, même base Supabase**, mêmes garde (auth, CSP, hooks) ;
- **entrée par la card « Découpe Films » existante** sur la home portail (déjà posée, `state="soon"`) ;
- **route `/decoupe`** (dossier réel, comme `/crm`) ;
- ses tables (`decoupe_*`) sont **propres à l'outil** (isolation métier façon ADR portail-0001/0002), mais
  vivent dans la même base → l'intégration au référentiel/CRM est possible **quand utile**, sans refonte ;
- au MVP, le **rattachement client** est un **champ texte léger optionnel** (`decoupe_chantiers.client`),
  pas un FK `entreprises` (Q1 + Q2 simplicité). Le brancher plus tard = ajouter une colonne FK nullable.

## Consequences
- (+) Zéro duplication d'infra (auth, base, shell, design) ; cohérence portail.
- (+) Intégration CRM future ouverte (même base) sans dette de migration.
- (+) Respecte « entrée par la card existante » (Q1) et la philosophie « simple, on enrichit au fil de l'eau » (Q2).
- (-) On renonce à l'isolation physique « module autonome » du brief - assumé : le brief ignorait le portail.
- (-) Le rattachement client est un champ libre non normalisé tant que le CRM n'est pas branché (acceptable au MVP).

## References
- Cadrage Q1 (2026-06-05), `cadrage.md`.
- `memory/project_portail_filmpro_multi_outils.md` (pivot 2026-06-05).
- ADR portail `0001-une-app-route-groups` / `0002-referentiel-partage`.
