# Findings — Audit /prospection (Express, 2026-04-25)

Référence : `golden-snapshot.json` (v2 du 2026-04-25)

URL auditée : `https://filmpro-crm.vercel.app/prospection`
Méthode : chrome MCP + `getComputedStyle` (mesures réelles).
Note screenshot : capture macOS bloquée par sandbox. Mesures DOM brutes archivées (suffisantes pour Express).

## Synthèse

19 findings au total : **3 P0**, **9 P1**, **7 P2**.

Décision golden la plus violée = **#2 (spacing canonique `4/8/12/16/24/32/48`)** : 16 occurrences de `2/6/10` détectées via `getComputedStyle`. Décisions **#3 (boutons 40px)** et **#4 (h1 sémantique)** cassées. Décision **#5 (Lucide)** : 100% des icônes encore en Material Symbols. Côté positif : décision **#1 OK** (primary `#2F5A9E` correctement appliqué sur "Importer"), `table-fixed` OK, bouton "Importer" 100% conforme tokens.

---

## P0 — Bloquants livraison client

### P0-01 — Aucun `<h1>` sémantique sur la page (décision golden #4)
- **Critère** : `accessibility.headings` + `rules.headingSemantics` du golden v2 — H1 unique obligatoire au top de chaque page.
- **Constat** : `document.querySelectorAll('h1').length === 0`. Le titre "Prospection" est rendu dans un `<span class="header-title font-semibold text-text">`. Aucun `<h2>` non plus.
- **Attendu** : `<h1>Prospection</h1>` (les classes Tailwind actuelles donnent déjà 22px / fw 600 — pas de changement visuel).
- **Impact utilisateur** : a11y serious (lecteurs d'écran, navigation par headings cassée), SEO dégradé. Bloquant client-ready selon `accessibility.axeCore: "0 violation serious/critical"`.
- **Reco** : remplacer `<span class="header-title ...">` par `<h1 class="header-title ...">`. Localisation : grep `header-title` dans `template/src/lib/`.

### P0-02 — Couleur header de table = noir pur, pas muted
- **Critère** : `components.table.headerColor: "#6B7280"`, `headerFontWeight: 600`.
- **Constat** : `<th>` mesurés → `color: rgb(0, 0, 0)`, `font-weight: 700`.
- **Attendu** : `color: #6B7280`, `font-weight: 600`.
- **Impact utilisateur** : hiérarchie typo cassée. Headers (Raison sociale, Canton, Localité…) "crient" autant que les valeurs en cellule, fatigue lecture sur 66 prospects.
- **Reco** : remplacer la classe utilitaire de `<th>` par `text-muted font-semibold`.

### P0-03 — Pagination : boutons radius 4px (golden 10px) + hauteur 38px (golden 40px)
- **Critère** : `components.button.height: "40px"`, `borderRadius: "10px"`.
- **Constat** : `arrow_back` / `arrow_forward` → `height: 38px`, `borderRadius: 4px`.
- **Attendu** : 40px / 10px.
- **Impact utilisateur** : radius 4px ressemble à du legacy au milieu d'une UI radius 10px.
- **Reco** : aligner sur la classe `<Button>` standard, variant icon-only (`h-10 w-10 rounded-lg`).

---

## P1 — Dégradation UX client-ready

### P1-01 — Bouton "Enrichir cette page" h:42px (décision #3)
- **Critère** : `button.height: "40px"`, `boxSizing: "border-box"`. Décision #3 explicitement listée.
- **Constat** : `height: 42px`, fw 500, border 1px secondary, padding 8/12 (12px paddingX au lieu de 16).
- **Attendu** : 40px exact, paddingX 16px. Border absorbée par `border-box`.
- **Impact utilisateur** : cible de l'arbitrage Pascal du 2026-04-25. À côté de "Importer" (40px) et "Créer une alerte" (38px) → 3 hauteurs côte à côte.
- **Reco** : `box-sizing: border-box; height: 40px;` sur le bouton secondary, paddingX → 16px.

### P1-02 — 4 boutons filtre h:46px (golden 40px)
- **Critère** : `button.height: "40px"`.
- **Constat** : Statut/Température/Canton/Source → 46px (paddingY 10px = spacing interdit).
- **Attendu** : 40px (h-10), paddingY 8px.
- **Impact utilisateur** : barre filtres 6px plus grosse que la norme, casse rythme vertical.
- **Reco** : aligner sur `<Button variant="filter">`.

### P1-03 — Bouton "Créer une alerte" h:38px, paddingY 6px
- **Critère** : `button.height: "40px"`, paddingY 8px.
- **Constat** : 38px / paddingY 6px (6 = spacing interdit).
- **Attendu** : 40px / paddingY 8px.
- **Impact utilisateur** : 3e variation de hauteur dans la même zone d'actions.
- **Reco** : tokens golden.

### P1-04 — KPI cards radius 12px (golden card 10px)
- **Critère** : `card.borderRadius: "10px"`.
- **Constat** : 4 stat blocks → `border-radius: 12px` (`rounded-xl`).
- **Attendu** : 10px (`rounded-lg`). 12px réservé au `modal`.
- **Impact utilisateur** : radius incohérent vs reste de l'app.
- **Reco** : `rounded-xl` → `rounded-lg`.

### P1-05 — Badges radius 8px + padding 2px/10px (golden 10px / 4px 8px)
- **Critère** : `badge.borderRadius: "10px"`, `paddingY: "4px"`, `paddingX: "8px"`.
- **Constat** : `<span>` badges → `border-radius: 8px`, `padding: 2px 10px`. Couleurs OK.
- **Attendu** : radius 10px, padding 4px 8px.
- **Impact utilisateur** : 132 occurrences (66 lignes × 2 badges) → effet "bulles écrasées" répété massivement.
- **Reco** : composant `<Badge>` shared aligné golden. `rounded-md` → `rounded-lg`, `px-2 py-0.5` → `px-2 py-1`.

### P1-06 — Sidebar items hauteur 44px + paddingY 10px (golden 40px)
- **Critère** : `navigation.sidebar.itemHeight: "40px"`. Décision #2.
- **Constat** : items → 44px, padding 10px 12px, fontSize 15px.
- **Attendu** : item 40px, padding 8px 12px.
- **Impact utilisateur** : sidebar +28px verticaux sur la nav. Risque de drift cross-pages.
- **Reco** : `py-2.5` → `py-2`, `text-[15px]` → `text-sm`.

### P1-07 — Dots 6px × 6px (golden 8px)
- **Critère** : `dot.size: "8px"`.
- **Constat** : 4 dots colorés (rouge `#F04438`, ambre `#F79009`) → 6px × 6px.
- **Attendu** : 8px × 8px (6 = spacing interdit).
- **Impact utilisateur** : indicateurs température/statut peu visibles à 6px sur 66 lignes.
- **Reco** : `w-1.5 h-1.5` → `w-2 h-2`. Vérifier contraste WCAG AA.

### P1-08 — Cellules table couleur `#000` (golden body `#111827`)
- **Critère** : `palette.text: "#111827"`.
- **Constat** : `<td>` color = `rgb(0, 0, 0)`.
- **Attendu** : `#111827`.
- **Impact utilisateur** : contraste exagéré, dur visuellement.
- **Reco** : `text-text` au lieu de `text-black`.

### P1-09 — Bouton "Créer une alerte" gap 6px (golden 8px)
- **Critère** : décision #2.
- **Constat** : gap = 6px.
- **Attendu** : `gap: 8px`.
- **Reco** : `gap-1.5` → `gap-2`.

---

## P2 — Polish et amélioration

### P2-01 — Migration Lucide non démarrée (décision #5)
- **Constat** : ~30+ `.material-symbols-outlined` sur cette page, 0 SVG Lucide.
- **Statut** : BACKLOG (tâche dédiée à créer). Pas urgent, dette tracée.

### P2-02 — `<main>` paddingTop 56px (hors scale 48/64)
- **Constat** : `padding-top: 56px`.
- **Reco** : `pt-14` → `pt-12` ou `pt-16` (probablement lié à la hauteur header fixée).

### P2-03 — Container KPI gap 12px ✓ canonique
- Contrôle positif, conforme.

### P2-04 — Sidebar fontSize 15px hors scale typo
- **Constat** : `font-size: 15px` (pas dans typography.scale pour body/nav).
- **Reco** : `text-sm` (14px) ou `text-base` (16px).

### P2-05 — `<th>` fontSize 14px (golden header 12px)
- **Critère** : `table.headerFontSize: "12px"`.
- **Constat** : `font-size: 14px`.
- **Reco** : `text-sm` → `text-xs`. Combiner avec P0-02.

### P2-06 — Cell padding (10px, 16px) — conflit interne golden RÉSOLU
- **Conflit initial** : `components.table.cellPaddingY = 10px` vs `spacing.scale = [4,8,12,16,24,32,48]` (10 absent).
- **Décision arbitrage main thread** : aligner `cellPaddingY` à **12px** dans le golden (cohérence avec spacing canonique). Header height passe de 44 → 48px (proche), cell height passe de 40 → 44px (matche header). Modification dans `golden-snapshot.json` (run figé) **non appliquée** : seul le golden source `audit-uiux-golden-v2-2026-04-25.json` est mis à jour. Pour la prochaine session d'audit, prévoir un golden v3.
- **Reco** : appliquer `paddingY: 12px` aux `<td>` et `<th>` lors de l'application Phase 4.

### P2-07 — `table-fixed` ✓ + pas de colgroup
- Contrôle positif (S48 OK).

---

## Conformités positives

- ✓ Bouton "Importer" primary : **100% golden v2** (40px / radius 10px / bg #2F5A9E / fw 600 / padding 8-16 / color white).
- ✓ Palette primary `#2F5A9E` correctement utilisée (décision #1).
- ✓ Palette accent ambre `#F79009` réservée aux signaux/badges (décision #1).
- ✓ Badge color mapping : warning/error matchent la palette (seuls radius/padding fautifs).
- ✓ `table-fixed` présent (règle S48).
- ✓ Police DM Sans appliquée globalement.
- ✓ Header title fontSize 22px / fw 600 / lineHeight 22px → matche `h1` golden (seul le tag est faux, voir P0-01).
- ✓ Sidebar items radius 10px conforme.
