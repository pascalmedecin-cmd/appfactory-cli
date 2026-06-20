# ADR-0005 - Export PDF du plan de découpe (vectoriel, côté client)

## Status
Accepted (2026-06-05). Tranche la sortie : Pascal demande un **export PDF** (pas seulement l'impression
navigateur). Le **template** FilmPro sera validé avec Pascal à un checkpoint dédié de la Phase 3.

## Context
Le plan de découpe est exécuté à l'atelier : il doit être imprimable proprement, lisible, et porter l'identité
FilmPro. Le plan est déjà rendu à l'écran en **SVG vectoriel** (rectangles positionnés + étiquettes) + une
table de repli + des métriques (laize, longueur, taux de chute) + liste commande + alertes.

Contraintes de la stack : app SvelteKit sur Vercel. Générer un PDF côté serveur via un navigateur headless
(Chromium @sparticuz) est **lourd et fragile** sur Vercel (taille de fonction, cold start) ; le redessiner via
une lib serveur (pdf-lib/pdfmake) obligerait à **réimplémenter la géométrie** déjà produite en SVG.

## Decision
**Export PDF côté client, vectoriel, à la demande.**
- L'utilisateur clique « Exporter en PDF » sur l'écran d'optimisation ; le PDF est généré **dans le navigateur**
  à partir du **SVG déjà calculé** (lib client **jsPDF + svg2pdf.js**), donc **vectoriel** (net à l'impression et
  au zoom, idéal atelier).
- **Pas** de génération serveur (ni Chromium headless, ni redessin lib serveur) : inutile pour un export à la
  demande, et évite la friction infra Vercel.
- Le **template** (en-tête FilmPro, bloc chantier(s)/produit, plan, métriques, table de repli, liste commande,
  alertes, pied de page) est conçu en HTML/SVG maîtrisé et **validé visuellement avec Pascal** à un checkpoint
  dédié, une fois l'écran d'optimisation fonctionnel (séquence Phase 3).

## Consequences
- (+) Léger, zéro infra PDF côté Vercel, rapide.
- (+) Réutilise le SVG du plan → fidélité écran↔PDF garantie, rendu vectoriel.
- (+) Template = artefact visuel validable par Pascal (WYSIWYG navigateur).
- (-) Dépend d'un navigateur client (acceptable : outil interne, usage desktop atelier/bureau).
- (-) Ajoute 2 dépendances client (jsPDF, svg2pdf.js) - légères, sans serveur.
- (-) Pas d'envoi PDF automatisé serveur (hors besoin : export manuel). Si un jour envoi email auto → réévaluer.

## Alternatives écartées
- **Chromium headless serveur** : meilleure fidélité HTML mais poids/fragilité Vercel, surdimensionné.
- **pdfmake / pdf-lib serveur** : pas de réutilisation du SVG, géométrie à redessiner.
- **Impression navigateur brute (print CSS)** : marges/en-têtes non maîtrisés, pas un vrai template FilmPro.

## References
- Brief §6.6 (sortie exploitable atelier), cadrage Q5 (2026-06-05), DESIGN.md § Export PDF.
- AC-024 (export produit), AC-025 (template validé Pascal).
