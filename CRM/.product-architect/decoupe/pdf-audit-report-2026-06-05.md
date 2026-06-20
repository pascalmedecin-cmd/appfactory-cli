# Audit visuel approfondi du PDF Découpe Films — rapport

**Date :** 2026-06-05 · **Effort :** xhigh · **Méthode :** backbone déterministe + panel d'agents Opus (7 axes) + vérification adversariale (anti-hallucination §8).

## Dispositif (anti-hallucination)
- **Backbone déterministe** (`scripts/_decoupe_pdf_audit.ts`) : 10 fixtures obligatoires → `layoutDecoupePdf` + parsing du SVG exact → métriques JSON (`audit/metrics.json`) : bornes `y+h ≤ CONTENT_BOTTOM`, marges, grille des `x`, rythme vertical (gaps), contraste WCAG **réel** texte/fond, troncatures, cohérence typo.
- **Rendus** : PNG ≈240 dpi par page A4 par fixture (`scripts/_decoupe_pdf_shots.mjs` → `audit-shots/`).
- **Panel** : 7 agents Opus, un par axe (grille, rythme, typo, contraste, fidélité golden, pagination, exactitude métier), chacun ancré sur PNG + métriques, consigne « cite une mesure, défaut RAS ».
- **Adversarial** : findings douteux re-tranchés contre code/maquette (donut, tag pivotée, padding KPI).

## Fixtures (10)
villa-leman (golden), un-seul-film, stress-26 (split), libelles-longs, huit-alertes, six-commandes, multi-chantiers (3 films), rouleau-court (0,3 m), rouleau-long (15 m, 40 pièces), pivot-les.

## Findings corrigés in-session (no-debt)

| # | Sév. | Défaut | Fix | Vérif |
|---|------|--------|-----|-------|
| 1 | Haute | Donut/jauge du KPI « Taux de chute » omis vs maquette validée (L202) | `gauge()` (anneau + arc segments, robuste svg2pdf) sur la carte chute | PNG villa/libelles/stress |
| 2 | Haute | « À découper » collé à « Laize… » (toutes cartes film) | gap `IX+52`→`IX+62` | déterministe + PNG |
| 3 | Haute | Titre long chevauche la pastille statut | troncature dynamique (réserve largeur pastille) | PNG libelles-longs |
| 4 | Haute | Section « DÉCOUPE INTERNE » orpheline + ½ page vide | `keepNext` = GAP + lead réel du 1er film + 2 lignes | tags six-commandes/huit-alertes |
| 5 | Haute | Tiret cadratin « — » (footer, alertes, suite) — règle FR | « — »→« · » + normalisation `[—–]→-` dans `esc()` | PNG + grep |
| 6 | Moy. | Contraste `faint` 2,54:1 (kicker, footer, en-têtes, légendes) | `faint` #9CA3AF→**#70757E** (4,63:1) | metrics : 0 issue |
| 7 | Moy. | Labels strip 3,1–4,2:1 + minuscules illisibles (5,4 px) | couleur deep par pièce (≥4,6:1) + plancher 6,5 px (masque) | metrics : 0 issue |
| 8 | Moy. | Ellipsis « (vernis… » parenthèse ouverte | `ellipsize` coupe avant « ( » non refermée | metrics : 0 |
| 9 | Moy. | Veuve de split (page de continuation à 2 lignes) | anti-veuve : ≥ 3 lignes sur la continuation | PNG rouleau-long-p3 |
| 10 | Basse | Pastille chute / remplissage = 2 sources | remplissage dérivé de `1 - taux_chute` (source unique) | code |
| 11 | Haute | **Strip rouleau-long : pièces hors cadre** (gate Pascal) | `stripLayout` couvre l'étendue réelle des pièces (robustesse) + fixture F9 réaliste (longueur cohérente) | PNG rouleau-long-p1 |

## Écarté (faux positifs / hors scope, tracé)
- **Tag « pivotée » sur dims non inversées** : faux positif — l'algo garantit l'invariant (`optimiser.ts:87,90`). La fixture de démo était incohérente → corrigée (source v-1200 = 800×1200).
- **Padding interne KPI vs carte film** : side-bearing de glyphe, pas un désalignement (2 agents).
- **Dernière page partiellement vide** : comportement document standard (assumé, comme golden §5b). Le cas pathologique (section orpheline) est corrigé (#4).
- **Espaces insécables chiffre+unité** : non visible (SVG mono-ligne), partagé avec l'écran (risque e2e). Conformité FR non-visuelle — hors scope de cet audit **visuel** (à traiter si besoin global FR).

## Métriques avant/après
- Débordements : 0 → **0** (régression maintenue, 10 fixtures).
- Rythme inter-blocs : 11 pt partout (inchangé).
- Issues contraste WCAG : **plusieurs récurrentes → 0**.
- Troncatures parenthèse ouverte : présentes → **0**.
- Sections orphelines : 2 → **0**.

## Reste (étape de clôture, débloquée)
- Câbler le bouton « Exporter en PDF » sur `optimisation/+page.svelte` (appel `exportDecoupePdf`).
- Tests Vitest du moteur de flux (pagination, split, anti-veuve, garde 0 débordement, `gauge`, troncature dynamique).
- **Valider le donut sur le VRAI PDF** (svg2pdf) en e2e (la preview navigateur le rend ; confiance élevée car `<circle>` + path M/L déjà rendus par svg2pdf, mais à confirmer sur PDF généré).
- QA tolérance zéro complète (`qa-tolerance-zero.md` + `scripts/_decoupe_qa.sh`) + audit sécu Opus.

## Artefacts
- `audit/metrics.json`, `audit/<fixture>.html`, `audit/index.html`
- `audit-shots/<fixture>-pN.png` (19 PNG)
- Code : `src/lib/decoupe/pdf-export.ts`, `presenter.ts`
