# ADR-001 - Breakpoint mobile = (max-width: 1023.98px)

## Status

Accepted (2026-05-24)

## Context

La refonte mobile CRM doit définir un breakpoint unique pour basculer entre UI desktop (tableaux, kanban, sidebar fixe) et UI mobile (cards, accordéon, sidebar burger).

Options envisagées :

- Tailwind `sm` (max-width: 639.98px) : trop strict, tablette portrait considérée desktop.
- Tailwind `md` (max-width: 767.98px) : tablette portrait passe mobile, mais paysage desktop.
- Tailwind `lg` (max-width: 1023.98px) : tablette portrait + paysage mobile, desktop dès 1024px.
- Custom 900px ou 960px : aucun précédent dans le projet.

## Decision

Breakpoint mobile = `(max-width: 1023.98px)`.

Tout viewport < 1024px reçoit l'UI mobile. Tout viewport >= 1024px reçoit l'UI desktop strictement inchangée.

## Consequences

- (+) Cohérent avec la sidebar burger existante qui bascule déjà à `lg` (< 1024px).
- (+) Cohérent avec la page Log livrée S185 (encart desktop-only à `< 1024px`).
- (+) Tablette portrait ET paysage en mobile UX, ce qui matche l'usage terrain (iPad jamais utilisé pour CRM par les fondateurs, mais si jamais c'est mieux mobile).
- (+) Tailwind `max-lg:*` variants utilisables directement, pas de custom config.
- (-) Tablette paysage en mobile UX pourrait sembler étrange pour un user occasionnel sur iPad, mais hors target user (Q1 : 3 fondateurs iPhone).
- (-) Si un 4ᵉ user émerge qui utilise iPad paysage régulièrement, V2 pourrait introduire un breakpoint intermédiaire `tablet`.

## References

- Cadrage Phase 1 Q1 (users iPhone uniquement).
- Page Log livrée S185 (CRM/CLAUDE.md, breakpoint identique).
- Tailwind v4 default breakpoints docs.
