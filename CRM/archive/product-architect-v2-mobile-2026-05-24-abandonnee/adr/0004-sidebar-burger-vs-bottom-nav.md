# ADR-004 - Sidebar burger conservée (pas de bottom navigation bar)

## Status

Accepted (2026-05-24)

## Context

iOS-style apps utilisent souvent une bottom navigation bar (Mail, Phone, Messages, etc.) avec 3-5 onglets racines. Cela maximise l'accessibilité tactile (zone naturelle du pouce) et la découvrabilité.

Le CRM FilmPro utilise actuellement une sidebar gauche burger en mobile (acté S104). 9 entrées de navigation (Dashboard, Prospection, Contacts, Entreprises, Pipeline, Signaux, Veille, Reporting, Aide, Log).

Options envisagées :

- **Bottom navigation bar** : refonte navigation complète, 9 entrées -> trop pour bottom nav (max 5 conseillé), nécessite hiérarchisation + section « Plus ».
- **Sidebar burger conservée** : statu quo, 0 régression, déjà fonctionnelle.
- **Hybride** : 4 entrées primaires en bottom nav + sidebar pour le reste. Complexité doublée.

## Decision

Sidebar burger conservée telle quelle. Pas de bottom navigation bar en V1.

Aucun changement à la sidebar existante (`src/lib/components/Sidebar.svelte`), hormis correction du résidu S183 (tap link ferme drawer auto, à smoke en Phase 4).

## Consequences

- (+) 0 régression navigation.
- (+) 0 refonte complète de la hiérarchie navigation.
- (+) Pascal et Antoine connaissent déjà l'interface.
- (+) Capacité d'évolution : si V2 introduit une bottom nav, la sidebar reste en backup pour les entrées secondaires.
- (-) UX moins iOS-native qu'avec bottom nav.
- (-) Zone du pouce non optimisée (sidebar en haut gauche nécessite étirement).
- (-) Mitigation : FAB Lead express déjà en bottom-right (zone pouce), action principale terrain accessible sans burger.

## References

- Cadrage Phase 1 ajustement complémentaire D-04 + hors-scope Q7 (pas de bottom nav).
- Acté S104 (sidebar burger mobile).
- Résidu S183 à confirmer Phase 4 (tap link ferme drawer auto).
