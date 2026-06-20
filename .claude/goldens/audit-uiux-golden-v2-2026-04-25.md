# Golden Standard CRM FilmPro — v2 (décisions tranchées)

**Créé** : 2026-04-25
**Source** : Extraction `/prospection` + arbitrage Pascal sur 5 anomalies
**Supersède** : v1 (extraction brute avec anomalies non arbitrées)
**Symlink courant** : `.claude/audit-uiux-golden-current.json` → v2

## Décisions tranchées (5 / 5)

| # | Décision | Choix |
|---|---|---|
| 1 | Hiérarchie couleur | **Primary bleu `#2F5A9E`** (statu quo) — accent ambre réservé aux signaux |
| 2 | Échelle spacing | **Tailwind canonique `4 / 8 / 12 / 16 / 24 / 32 / 48`** (retrait 2/6/10/20) |
| 3 | Hauteur boutons | **40px uniforme** (`h-10` Tailwind, box-sizing border-box) |
| 4 | Sémantique titre | **H1 obligatoire** en haut de chaque page |
| 5 | Bibliothèque icônes | **Migration vers Lucide** (override : cohérence cross-projet + perf) |

## Palette sémantique (11 tokens)

| Rôle | Hex | Usage |
|---|---|---|
| `background` | `#FFFFFF` | Fond principal |
| `surface` | `#F9FAFB` | Surface secondaire (slate-50) |
| `text` | `#111827` | Texte principal (slate-900) |
| `textMuted` | `#6B7280` | Texte secondaire (slate-500) |
| `border` | `#E5E7EB` | Bordures (slate-200) |
| `primary` | `#2F5A9E` | CTA principal |
| `primaryHover` | `#264C85` | Hover bouton primary |
| `accent` | `#F79009` | Signal d'attention (badges, alertes) |
| `accentBg` | `#FFFAEB` | Fond doux pour zones d'attention |
| `success` | `#538B6B` | Succès (sauge FilmPro) |
| `warning` | `#F79009` | Avertissement |
| `warningBg` | `#FFFAEB` | Fond doux warning |
| `error` | `#F04438` | Erreur |
| `errorBg` | `#FEF3F2` | Fond doux erreur |
| `info` | `#5A7190` | Info (ardoise FilmPro) |

### Extras (charte FilmPro complète, hors scope golden)

`#5A7190` ardoise, `#7B6A9A` violet, `#538B6B` sauge, `#917548` brun, `#EDF1F5` bleu pâle veille.
**Règle** : ne pas utiliser hors pages métier explicitement scopées (ex: signaux, marchés sectoriels).

## Typographie

- **Heading + Body** : `"DM Sans", system-ui, -apple-system, sans-serif`
- **Mono** : `Menlo, Consolas, monospace`

| Token | Taille | Weight | Line-height |
|---|---|---|---|
| `h1` | 22px | 600 | 1.0 |
| `h2` | 18px | 600 | 1.2 |
| `h3` | 16px | 600 | 1.3 |
| `h4` | 15px | 600 | 1.4 |
| `body` | 14px | 400 | 1.43 |
| `bodyMedium` | 14px | 500 | 1.43 |
| `caption` | 12px | 400 | 1.33 |
| `captionMedium` | 12px | 500 | 1.33 |
| `label` | 12px | 600 | 1.33 |
| `micro` | 10px | 500 | 1.5 |

**Weights** : 400 / 500 / 600 / 700.

## Spacing (échelle Tailwind canonique)

| Token | Valeur | Tailwind |
|---|---|---|
| `xs` | 4px | `*-1` |
| `sm` | 8px | `*-2` |
| `md` | 12px | `*-3` |
| `lg` | 16px | `*-4` |
| `xl` | 24px | `*-6` |
| `2xl` | 32px | `*-8` |
| `3xl` | 48px | `*-12` |

**Interdits** : 2px, 6px, 10px, 20px (anomalies à corriger lors de la Phase 4 d'application).

## Radius

| Token | Valeur | Usage |
|---|---|---|
| `sm` | 4px | Bordures fines (separators) |
| `md` | 8px | Inputs |
| `lg` | 10px | **Default** — buttons, cards, badges |
| `xl` | 12px | Modals |
| `full` | 9999px | Dots, avatars |

## Shadows

| Token | Valeur |
|---|---|
| `xs` | `0 1px 2px rgba(16,24,40,0.05)` |
| `sm` | `0 1px 3px rgba(16,24,40,0.1), 0 1px 2px rgba(16,24,40,0.06)` |
| `md` | `0 4px 8px -2px rgba(16,24,40,0.1), 0 2px 4px -2px rgba(16,24,40,0.06)` |
| `focusRing` | `0 0 0 3px rgba(47, 90, 158, 0.2)` |

## Composants (extrait)

### Button (4 variants)
- `height: 40px` (h-10), `borderRadius: 10px`, `padding: 8px 16px`
- `font: 14px / 600`, `box-sizing: border-box`
- Variants : primary (bleu) · secondary (outline violet) · tertiary (ghost) · destructive (rouge)

### Input
- `height: 34px`, `borderRadius: 8px`, `border: 1px solid #E5E7EB`
- `padding: 6px 12px`, `font: 14px / 400`
- Focus : border `#2F5A9E` + ring `0 0 0 3px rgba(47,90,158,0.2)`

### Card
- `borderRadius: 10px`, `border: 1px solid #E5E7EB`, `padding: 16px`
- `shadow: xs`, `bg: #FFFFFF`

### Modal
- `borderRadius: 12px`, `padding: 24px`, `maxWidth: 560px`
- `shadow: md`, backdrop `rgba(0,0,0,0.4)`

### Table
- Header : `12px / 600`, color `#6B7280`, height `44px`
- Cells : `padding 10px 16px`, `font: 14px`
- Hover row : `bg #F9FAFB`
- **Règle S48** : `table-fixed` obligatoire pour respecter max-w sur td/th

### Badge
- `borderRadius: 10px`, `padding: 4px 8px`, `font: 12px / 500`
- 5 variants : default, info, success, warning, error

### Slide-out
- `width: 560px` (desktop), `100vw` (mobile)
- `padding: 24px`
- Backdrop `rgba(0,0,0,0.4)`, shadow `-8px 0 16px rgba(16,24,40,0.1)`
- **Règle S45** : header sticky avec fond opaque + border-bottom

### Sidebar
- `width: 240px` ouvert, `64px` réduit
- Items : `height 40px`, `borderRadius 10px`, `padding-x 12px`

## Icônes (Lucide post-migration)

- Library : **lucide-svelte**
- Sizes : xs 14 / sm 16 / md 20 / lg 24
- `stroke-width: 2`, `color: currentColor`
- **Migration** : ~120 occurrences Material Symbols → Lucide. Tâche backlog ouverte.

## Accessibilité

- Contraste min : WCAG AA (4.5:1 body, 3:1 UI large)
- Focus visible : `outline 2px solid #2F5A9E, offset 2px`
- Headings : H1 unique par page, hiérarchie sémantique stricte
- Boutons : `<button>` ou `<a>` sémantique, jamais `<div onclick>`
- Modals : focus trap, Escape, return focus
- CI : axe-core 0 violation serious/critical

## Règles d'application transverses

- **table-fixed** obligatoire (S48)
- **sticky/fixed** doit avoir bg opaque + séparateur (S45)
- **batch actions bar** flex-wrap sous 640px (S45)
- **Pas d'option « Autre »** dans les select
- **Image aspect ratio** préservé (jamais width+height forcés sans calcul)
- **Icon library** : lucide-svelte (post-migration)
- **H1 sémantique** obligatoire en haut de chaque page
- **Button height** : 40px uniforme avec box-sizing border-box

## Fichiers

- JSON : `.claude/goldens/audit-uiux-golden-v2-2026-04-25.json`
- MD : `.claude/goldens/audit-uiux-golden-v2-2026-04-25.md`
- Symlink : `.claude/audit-uiux-golden-current.json` → v2
- Doc humain exhaustif : `docs/GOLDEN_STANDARDS.md`
