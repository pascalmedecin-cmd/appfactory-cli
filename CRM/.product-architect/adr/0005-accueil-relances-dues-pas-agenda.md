# ADR-0005 — Écran d'accueil = relances dues (pas d'agenda de visites planifiées)

## Status
Accepted (2026-05-31, décision Pascal)

## Context
L'écran d'accueil mobile doit montrer « ce qu'il y a à faire en arrivant ». Or le CRM **ne stocke pas de visites planifiées** (pas de calendrier, pas de `date_visite_prevue`). Ce qui existe : `opportunites.date_relance_prevue` (relances dues), déjà calculé côté desktop dans `(app)/+page.server.ts`. Pascal a répondu « visites parfois planifiées » mais la planification réelle passe par les relances sur opportunités.

## Decision
Accueil « À faire » = liste des relances/opportunités dues (`date_relance_prevue <= today` ET étape non close), cap 15, triées par date. **Option B écartée** (créer un vrai concept de visite planifiée = nouveau modèle + écran de planification desktop + saisie). Choix Pascal validé via mockup comparatif 2026-05-31.

## Consequences
- (+) Zéro nouveau modèle de données, requête déjà existante et testée (dashboard).
- (+) Honnête : l'écran montre des données réelles, pas un faux agenda vide.
- (-) Ce n'est pas un « agenda du jour » au sens calendaire : si une visite n'est liée à aucune opportunité avec relance, elle n'apparaît pas. Porte d'entrée alternative = recherche par nom (AC-004).
- (-) Option B rouvrable plus tard si un besoin terrain de planification est documenté.

## References
- `src/routes/(app)/+page.server.ts` (requête relances : `date_relance_prevue <= today`, exclusion étapes closes — audit 360 M-06).
- Décision Pascal 2026-05-31 (mockup A vs B).
