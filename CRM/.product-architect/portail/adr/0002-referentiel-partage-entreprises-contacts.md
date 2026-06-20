# ADR-0002 - Referentiel partage entreprises/contacts via couche de service

## Status
Accepted (2026-06-01)

## Context
Pour que les outils "se parlent" sans double saisie ni divergence, les entreprises et contacts doivent etre une source unique de verite, partagee par tous les outils (CRM aujourd'hui, Devis demain). Techniquement, les tables `entreprises` et `contacts` existent deja et sont propres (index trgm, FK `entreprise_id`, dedup unaccent). Le risque n'est pas le schema mais la **dispersion des acces** : si chaque outil ecrit en direct via des appels Supabase epars, on perd la normalisation (casse, accents, dedup, canton) et il n'y a plus un seul endroit a auditer.

## Decision
Formaliser `entreprises`, `contacts` (et `utilisateurs`) comme **referentiel partage** du portail, avec deux regles :
1. Toute creation/mise a jour d'une entreprise ou d'un contact passe par une **couche de service partagee** `src/lib/server/referentiel/` (fonctions nommees, testables), pas par des appels Supabase directs disperses dans chaque outil.
2. Les endpoints `/api/entreprises/*` et `/api/contacts/*` restent **partages** (sans prefixe outil) et sont la seule voie d'ecriture du referentiel cote API.

Ce chantier identifie/centralise cette couche (refactor a cout mesure si des acces directs existent) ; il ne change pas le schema.

## Consequences
- (+) Un seul endroit garantit normalisation + dedup + un seul point d'audit securite.
- (+) Le futur outil Devis lit/ecrit le referentiel via la meme couche : zero re-saisie, zero divergence.
- (+) Facilite un futur durcissement RLS (un seul chemin d'ecriture a controler).
- (-) Demande de router les ecritures existantes du CRM vers la couche service si certaines sont en direct (audit a faire Phase 3 ; si deja centralise, cout nul).
- (-) Convention a tenir dans la duree (revue de code : pas d'INSERT/UPDATE direct sur entreprises/contacts hors couche service).

## References
- Cadrage Q3 (referentiel + actions croisees), data-model-fondations.md sections 2 et 4
- Memoire feedback_postgrest_or_filter_injection (normalisation cote service)
