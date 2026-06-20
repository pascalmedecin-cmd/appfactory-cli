# DESIGN.md - Outil « Découpe Films »

**Principe** : réutilise les tokens existants du portail/CRM (couleurs, typo Inter, spacing, primitives
`Button`/`Input`/`Card`/`Modal`/`DataTable`/`Tabs`). Pas de nouvelle palette, pas de CSS global ad hoc.
Doctrine styling projet : Tailwind utilities pour le détail, `<style>` scoped Svelte pour le layout
(cf. CRM CLAUDE.md § Doctrine styling). Ton : sobre, lisible en 2 secondes (atelier), pas ludique.

## Écrans (4)

### 1. `/decoupe` - Liste des chantiers
- En-tête : titre « Découpe Films » + bouton primaire « Nouveau chantier » + lien « Base produit ».
- `DataTable` chantiers : nom, client, nb vitres, statut (badge `en_saisie` / `lancee`), date.
- Empty state : « Aucun chantier. Créez-en un pour saisir vos vitres. » + CTA.

### 2. `/decoupe/chantiers/[id]` - Fiche + saisie vitres
- En-tête chantier (nom éditable, client, statut).
- Formulaire ligne vitre : L, H (mm), quantité, type de vitrage, produit (select base produit),
  coche « sur-mesure fournisseur ». Saisie rapide répétée (ajout en ligne, focus conservé).
- `DataTable` vitres du chantier (édition/suppression). Pastille produit (famille).
- Actions : « Optimiser ce chantier » (primaire) ; encart « Consolidation suggérée » si chantiers
  `en_saisie` partagent produit × laize (lien vers optimisation consolidée).

### 3. `/decoupe/produits` - Base produit
- `DataTable` produits : référence, nom, famille, fabricant, fournisseur, laizes, badges
  (orientation imposée / jointage / **nestable**), marge de pose, recouvrement.
- `Modal` add/edit produit (tous les attributs data-model). Archive = soft-delete (`actif=false`).
- Validation Zod inline (dimensions > 0, ≥ 1 laize…).

### 4. `/decoupe/optimisation?chantiers=...` - Résultat
- **Le coeur visuel.** Par produit (carte) :
  - **Plan de placement SVG** : la bande (laize × longueur), chaque pièce = rectangle positionné, étiqueté
    (réf vitre, dimensions de coupe, « pivotée » / « lé n/N » le cas échéant). Échelle indiquée.
  - Bandeau métriques : laize retenue, longueur consommée, **taux de chute** (jauge + %).
- **Liste de commande fournisseur** : vitres sur-mesure + non nestables, avec raison.
- **Alertes** : pièces non plaçables, incohérences (couleur d'alerte, jamais masquées).
- Bouton « Lancer la découpe » → passe les chantiers en `lancee` (confirmation `ConfirmModal`).

## Export PDF (ADR-0005, AC-024/025)
Bouton « Exporter en PDF » sur l'écran d'optimisation → PDF **vectoriel** généré côté client à partir du SVG
déjà calculé (jsPDF + svg2pdf.js). Le **template FilmPro** (en-tête logo + identité, bloc chantier(s)/produit,
plan vectoriel, métriques laize/longueur/taux de chute, table de repli des pièces, liste de commande, alertes,
pied de page) est conçu en HTML/SVG maîtrisé et **validé visuellement avec Pascal** à un checkpoint dédié de la
Phase 3 (une fois l'écran d'optimisation fonctionnel). Réutilise les tokens et le logo FilmPro existants.

## Accessibilité du plan SVG (AC-017)
Le plan est exécuté à l'atelier → il doit rester lisible sans la vue graphique :
- SVG avec `role="img"` + `aria-label` résumant le plan,
- **table de repli** (même donnée : pièce → position x/y, dimensions, rotation, lé) lisible lecteur d'écran
  et imprimable. La table est la source exécutable ; le SVG l'illustre.

## Sémantique / naming
- Composants : `ChantierTable`, `VitreForm`, `VitreTable`, `ProduitTable`, `ProduitModal`,
  `PlanDecoupeSvg`, `PlanDecoupeTable`, `ChuteGauge`, `CommandeFournisseurList`, `AlerteList`.
- Statut chantier : badge sémantique (`en_saisie` neutre, `lancee` validé/vert).
- Famille produit : pastille (solaire / sécurité / discrétion) - couleurs distinctes, jamais porteuses seules
  d'info critique (texte toujours présent).

## Anti-generic
- Pas de dashboard à vanity-metrics : l'écran d'optimisation est orienté action (lire le plan, commander, lancer).
- Le taux de chute est le signal central, présenté visuellement (jauge) + chiffre.
