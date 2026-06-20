# ADR-0003 - Unités en millimètres entiers ; dimension de coupe = vitre + marge

## Status
Accepted (2026-06-05).

## Context
La découpe se joue au millimètre (vitrage, films). Le nesting additionne, compare et pivote des dimensions :
des flottants (cm avec décimales, m) accumuleraient des erreurs d'arrondi et rendraient les comparaisons
d'aires/longueurs fragiles. Par ailleurs, le brief (§4.4) impose que le nesting ne travaille **jamais** sur
les dimensions brutes de la vitre, mais sur les **dimensions de coupe**.

## Decision
1. **Toutes les longueurs sont des entiers en millimètres** côté données et côté algo : `largeur_mm`,
   `hauteur_mm`, `laizes_mm[]`, `marge_pose_mm`, `recouvrement_mm`. L'UI saisit/affiche en cm/m et convertit.
2. **Dimension de coupe** (entrée réelle du nesting) :
   `largeur_coupe = vitre.largeur_mm + produit.marge_pose_mm` ; idem pour la hauteur.
   La marge est **portée par le produit** (brief §4.4) ; elle n'est jamais stockée sur la vitre.
3. **Recouvrement de joint** (Q4) : `recouvrement_mm` est porté par le produit, **défaut 0**, et **intégré au
   calcul** uniquement lors d'une pose en lés (la largeur du recouvrement s'ajoute à la matière consommée à
   chaque jointure entre deux lés). À 0 : partage géométrique pur.

## Consequences
- (+) Maths de packing exactes (entiers), comparaisons fiables, pas de drift d'arrondi.
- (+) Règle métier « dimension de coupe » centralisée et testable (AC-006, AC-010, AC-011).
- (-) Conversions cm/m ↔ mm à gérer à la saisie/affichage (trivial, helpers testés).
- (-) Précision plafonnée au mm (acceptable et standard pour la découpe).

## References
- Brief §4.4 (dimensions de coupe), §6.4 (lés), cadrage Q4.
- `data-model.sql` (colonnes `*_mm`), `api-contracts.ts`, AC-006/010/011.
