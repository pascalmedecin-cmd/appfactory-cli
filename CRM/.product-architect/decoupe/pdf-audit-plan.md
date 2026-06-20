# Audit visuel approfondi du PDF Découpe Films — plan (session dédiée)

**Statut au 2026-06-05 :** moteur d'export PDF construit et fonctionnellement robuste (moteur de flux,
split de tableau multi-pages, 0 débordement prouvé). **Visuel jugé « pas encore assez propre » par
Pascal** → audit détaillé multi-axes, presque pixel par pixel, AVANT de clôturer l'étape 4 et de
câbler le bouton en production.

## Contexte / artefacts existants
- Moteur : `src/lib/decoupe/pdf-export.ts` (PUR : `layoutDecoupePdf`, `buildPageSvgStrings` ; impur :
  `exportDecoupePdf` = jsPDF + svg2pdf + polices `pdf-fonts.ts`).
- Helpers visuels partagés écran/PDF : `src/lib/decoupe/presenter.ts` (`stripGeometry` orientation-aware).
- Référence visuelle validée par Pascal (checkpoint AC-025) : `pdf-template-mockup.html`.
- Aperçus de dev (= SVG exact que svg2pdf convertit, prévisualisable navigateur) :
  `scripts/_decoupe_pdf_preview.ts` (cas Villa Léman) + `scripts/_decoupe_pdf_stress.ts` (26 pièces, split).
- **Piège connu (à respecter) :** `reference_pdf_golden_rules.md` §8 — *les subagents hallucinent
  régulièrement sur l'audit visuel PDF* (fausses détections sur PDF pixel-clean). L'audit DOIT être
  ancré sur des mesures déterministes, pas sur de l'œil d'agent.

## Principe directeur (anti-hallucination)
On ne demande JAMAIS à un agent « est-ce propre ? ». On (1) calcule des **métriques déterministes**
depuis le modèle de page (`layoutDecoupePdf`) et le SVG, (2) on donne aux agents la **référence
validée + les rendus haute déf + le rapport de métriques**, (3) chaque finding doit **citer une
coordonnée/mesure précise**, (4) chaque finding est **contre-vérifié** (2e agent ou re-mesure), (5)
**Pascal ouvre chaque page personnellement** = gate final non skippable.

## Architecture de l'audit (4 temps)

### 1. Backbone déterministe (script, PAS d'agent)
Depuis `layoutDecoupePdf(input)` + parsing du SVG de `buildPageSvgStrings`, calculer sur toutes les
fixtures :
- marges réelles (haut/bas/gauche/droite) vs cibles ;
- **grille d'alignement** : ensemble des `x` de départ de texte/blocs → repérer les désalignements
  (x qui devraient coïncider et diffèrent de > seuil) ;
- **rythme vertical** : liste des gaps entre blocs et entre lignes → repérer les irréguliers ;
- tailles/poids de police par rôle (cohérence hiérarchie) ;
- **contraste WCAG** texte/fond pour chaque couple couleur (ratio ≥ 4.5 corps, ≥ 3 gros) ;
- **bornes** : tout `y+h ≤ CONTENT_BOTTOM` (déjà prouvé, à garder en régression) ;
- troncatures (ellipsis) effectives → légitimes ou symptôme de largeur mal calibrée.
Sortie : rapport de métriques JSON + **PNG 300 dpi par page par fixture** (rendu via le SVG dans un
navigateur headless, ou conversion du vrai PDF via `pdftoppm`).

### 2. Panel d'agents par axe (opus, parallèle, 1 lentille chacun)
Chaque agent reçoit : maquette golden validée + PNG haute déf de toutes les fixtures + rapport de
métriques + checklist chiffrée de son axe. **Consigne stricte** : tout finding cite une mesure/coord ;
par défaut « rien à signaler » sauf écart mesurable (contre le biais faux-positif). Axes :
1. **Grille & alignement** (marges, colonnes, baselines, x récurrents).
2. **Rythme vertical & aération** (gaps/paddings cohérents, aucun bloc tassé, respiration).
3. **Typographie & hiérarchie** (tailles/poids, veuves/orphelines, ellipsis légitimes, accents FR,
   tirets courts — cf. REDACTION-FR.md).
4. **Couleur & contraste** (WCAG + daltonisme : couleur jamais seule porteuse d'info).
5. **Fidélité au golden validé** (écart vs maquette AC-025, langage premium).
6. **Pagination & robustesse** (split, en-têtes répétés, cadres par segment, anti-orphelin) sur TOUTES
   les fixtures.
7. **Exactitude métier** (chiffres du PDF == sortie algo : taux, longueurs, dimensions, liste de coupe,
   commande, alertes) — **critique tolérance zéro** : un PDF joli mais faux = mauvais bon de coupe.

### 3. Vérification adversariale
Chaque finding repassé par un 2e agent OU re-mesuré déterministiquement contre les coordonnées du SVG.
On ne garde que les findings confirmés (tue les hallucinations §8).

### 4. Synthèse + gate humain
Synthèse priorisée (sévérité × axe × localisation exacte × fix concret). Puis **Pascal ouvre chaque
page** (toutes fixtures) = validation finale.

## Fixtures obligatoires (l'audit n'a de sens que multi-scénarios)
Golden Villa Léman ; 1 seul film ; stress 26 pièces (split) ; libellés produits longs ; 8+ alertes ;
6+ commandes ; consolidation multi-chantiers (titre « N chantiers consolidés ») ; rouleau très court
(0,3 m) ; rouleau très long (15 m) ; tous statuts (prêt / à vérifier) ; pièces pivotées + en lés.

## Outils
- Réutiliser la **structure du skill `audit-uiux`** (360 batch, loop) MAIS adaptée PDF : rendu PNG +
  backbone déterministe au lieu du chrome-MCP live.
- Grilles de lentille : `refactoring-ui` (hiérarchie/spacing/depth), `ux-guide` (lisibilité/Nielsen),
  `taste-skill` (anti-slop, direction premium), `soft-skill` (finition haut de gamme).
- `pre-mortem` déjà appliqué à la pagination (couvert par le moteur de flux).
- Routage modèle : **opus partout** (audit visuel critique).

## Effort
Session dédiée, **xhigh** (décision design + multi-étapes + sortie non mesurable + itération coûteuse).

## Sortie attendue
Rapport d'audit daté + findings priorisés corrigés in-session (no-debt) → puis reprise de la QA
tolérance zéro (`qa-tolerance-zero.md`) et clôture étape 4 (câblage bouton, fidélité §9 verte).
