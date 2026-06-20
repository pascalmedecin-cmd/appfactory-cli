# ADR-003 - Pipeline mobile = accordéon par étape

## Status

Accepted (2026-05-24)

## Context

Le kanban Pipeline desktop a 6 colonnes (Identification / Qualification / Proposition / Négociation / Gagné / Perdu) avec drag-drop. En mobile (< 1024px), le kanban est impossible : scroll horizontal infernal, drag-drop tactile maladroit, aucune colonne visible en entier.

Options envisagées :

- **Kanban mobile maintenu** : inutilisable, abandonné.
- **Bottom-sheet vertical** (1 étape visible, swipe vertical entre étapes style Cards Apple) : nécessite lib externe ou code custom complexe, gestures swipe = hors-scope (Q7).
- **Swipe horizontal entre colonnes** (style Android Material) : lib externe (Swiper.js ou équivalent) + gestures hors-scope.
- **Accordéon par étape** : pattern web standard, 0 lib externe, contrôle clavier natif, animation transform-only.
- **Liste à plat avec filtre étape en tabs** : possible mais perd la visibilité « combien d'opps dans chaque étape ».

## Decision

Accordéon vertical à 6 étapes (un par défaut fermé), header tappable avec nom étape + count opps + somme CHF, expand révèle la liste des opps de l'étape (cards 1 col).

Drag-drop tactile remplacé par bouton « Faire avancer » dans le SlideOut détail de chaque opp (dropdown 5 étapes alternatives).

Animation expand : `transform: scaleY(0/1)` + `opacity` 200ms ease-out-expo, `transform-origin: top`. Pas de `height: 0 / auto` (CLS).

Composant : `src/lib/components/pipeline/PipelineMobileAccordion.svelte`.

## Consequences

- (+) 0 lib externe, 0 dépendance nouvelle.
- (+) Contrôle clavier natif (Tab, Enter, Space) compatible a11y AA.
- (+) `aria-expanded` + `aria-controls` natifs.
- (+) Animation transform-only -> 0 CLS, score Lighthouse Perf OK.
- (+) Visibilité multi-étapes : Pascal voit en un coup d'œil quelle étape concentre les opps + le CHF total.
- (-) Pas de visualisation pipeline globale type kanban (perdu en mobile, présent en desktop).
- (-) Drag-drop tactile abandonné : remplacé par bouton, 1 tap de plus pour faire avancer une opp.
- (-) Mitigation : bouton « Faire avancer » accessible directement dans le SlideOut (pas un détour majeur).

## References

- Cadrage Phase 1 ajustement complémentaire D-03.
- Audit factuel cette session : Pipeline = état mobile « CASSÉ » identifié comme priorité.
- Hors-scope (Q7) : pas de gestures swipe avancés en V1.
