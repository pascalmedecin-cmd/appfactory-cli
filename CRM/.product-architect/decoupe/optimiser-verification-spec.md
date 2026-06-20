# Optimiseur Découpe - Spec de vérification « certitude »

But (Pascal, 2026-06-06) : être **certain** que l'optimiseur (`src/lib/decoupe/optimiser.ts`) n'a
**aucun bug** (plan jamais physiquement faux) et que ses propositions sont **correctes** (bonnes,
contrôlées). L'algo est une **heuristique** (FFDH en étagères, strip-packing 1D) : l'optimum
mathématique absolu est NP-difficile et hors-scope. On vise : *prouvable-sûr* + *démontré-proche-optimal* + *validé-réel*.

Les critères ci-dessous sont **binaires** (passe / passe pas). Aucune étape `done` tant que 100 % ne sont pas verts.

---

## Niveau 1 - Règles dures (fuzzing) → « zéro bug physique »

Pour **toute** entrée (générée au hasard, dizaines de milliers de cas), le résultat
d'`optimiserDecoupe` DOIT satisfaire toutes les règles ci-dessous. Vérifiées par
`optimiser.invariants.ts::checkInvariants()` (retourne la liste des violations, vide = OK).

- **I1 - Dans la laize** : tout placement `x ≥ 0` et `x + largeur_placee ≤ laize` ; `y ≥ 0` et `y + hauteur_placee ≤ longueur_consommee`.
- **I2 - Pas de chevauchement** : dans un même plan, deux placements ne se recouvrent jamais (bords jointifs autorisés).
- **I3 - Conservation** :
  - I3a : aucune vitre n'est à la fois posée (placements) ET en commande fournisseur.
  - I3b : toute vitre d'entrée apparaît dans au moins un de {placements, commandes, alertes} (rien n'est silencieusement perdu).
  - I3c : une vitre posée a un produit existant, `nestable=true`, `sur_mesure_fournisseur=false`.
  - I3d : pour une vitre interne de quantité Q : (nb de `piece_index` distincts posés) + (nb d'alertes `piece_non_placable` de cette vitre) = Q. Chaque pièce résolue exactement une fois.
  - I3e : une ligne de commande a une raison cohérente avec l'entrée (`non_nestable` ⇒ produit non nestable ; `sur_mesure_fournisseur` ⇒ coche vraie). Au plus une commande par vitre.
- **I4 - Surface & chute** : `surface_pieces_mm2` = somme réelle des aires posées ; `surface ≤ laize × longueur` ; `taux_chute = (aire-surface)/aire` et `∈ [0,1)` ; `laize_mm ∈ produit.laizes_mm` ; `longueur > 0` si ≥ 1 placement.
- **I5 - Coche** : `sur_mesure_fournisseur=true` (produit nestable) ⇒ commande `sur_mesure_fournisseur`, jamais posée.
- **I6 - Garde-fou nestable** : produit `nestable=false` ⇒ jamais posé, commande `non_nestable`.
- **I7 - Lés** : pour chaque `pose_en_les` : `nb_les ≥ 2` ; `largeur_bande ≤ laize` ; exactement `nb_les` placements pour ce `(vitre, piece_index)`, chacun de largeur = `largeur_bande` ; couverture `nb·bande - (nb-1)·recouvrement ≥ dimension d'origine`.
- **I8 - Déterminisme** : mêmes entrées ⇒ sorties identiques (deep equal sur 2 exécutions).
- **I9 - Borne basse physique** : `longueur_consommee ≥ max(hauteur_placee)` du plan (la pièce la plus haute doit tenir sur le rouleau).

## Niveau 2 - Qualité des propositions (oracle) → « proche de l'optimal »

- **O1 - Optimum prouvé sur familles construites** (égalité dure) :
  - N pièces identiques, k par étagère ⇒ longueur = `⌈N/k⌉ × h`.
  - 1 pièce ⇒ longueur = sa dimension « le long ».
  - pièces qui pavent exactement une étagère (largeurs = laize, même hauteur) ⇒ longueur = h.
- **O2 - Écart au meilleur packing-étagère** (petits cas N ≤ 6, force brute sur toutes les permutations, orientation figée) : `longueur(FFDH) ≤ meilleur_ordre × 1.5`. Le ratio réel est loggé. **Mesuré 2026-06-06 : médian = 1.000 (heuristique = meilleur ordre dans le cas médian), max = 1.392** sur 1200 cas - cohérent avec la borne théorique FFDH (~1,7×). Tout dépassement de 1,5 = finding.

## Niveau 3 - Corpus réel (golden) → « colle au métier »

- Cas issus du vrai catalogue (produits 3M réels + chantiers types). Plan validé **une fois à l'œil par Pascal**, puis figé en snapshot. Toute évolution future qui change un plan repasse devant Pascal.

---

## Hors-scope (assumé, tracé)

- Optimum mathématique global garanti (NP-difficile ; heuristique partout dans le métier).
- Packing non-étagère (guillotine / maxrects) : l'algo est volontairement shelf-based (explicable atelier).

## Métrique de succès

`optimiser.invariants.ts` + `optimiser.fuzz.test.ts` + `optimiser.oracle.test.ts` verts ;
≥ 20 000 cas fuzzés sans violation ; ratio O2 médian loggé. Tout bug trouvé par le fuzzing est
corrigé à la **cause racine** dans l'algo (jamais masqué), avec le cas minimal reproductible ajouté en test de non-régression.
