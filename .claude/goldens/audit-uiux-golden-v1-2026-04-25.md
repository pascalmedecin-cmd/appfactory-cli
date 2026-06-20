# Golden Standard CRM FilmPro - v1

**Créé** : 2026-04-25
**Source** : Extraction `/prospection` (gabarit exclusif) + `/veille` refondue S112 (palette extras)
**Méthode** : chrome MCP `getComputedStyle`, top frequency
**Inspiration** : DM Sans + palette ardoise/ambre FilmPro, spacing aéré, radius 10px dominant

## Palette

| Rôle | Hex | Usage |
|---|---|---|
| background | `#FFFFFF` | Fond principal |
| surface | `#F9FAFB` | Surface secondaire (slate-50) |
| text | `#111827` | Texte principal (slate-900) |
| textMuted | `#6B7280` | Texte secondaire (slate-500) |
| border | `#E5E7EB` | Bordures (slate-200) |
| primary | `#2F5A9E` | Bouton primaire (bleu) |
| accent | `#F79009` | Accent visuel (ambre) |
| success | `#538B6B` | Succès (sauge FilmPro) |
| warning | `#F79009` | Avertissement (ambre) |
| error | `#F04438` | Erreur (rouge clair) |
| info | `#5A7190` | Info (ardoise FilmPro) |

## Typographie

- **Heading + Body** : `"DM Sans", system-ui, -apple-system, sans-serif`
- **Mono** : `Menlo, Consolas, monospace`

| Niveau | Taille | Line-height |
|---|---|---|
| h1 | 22px | 1.0 |
| h2 | 18px | 1.0 |
| h3 | 16px | 1.0 |
| h4 | 15px | 1.0 |
| body | 14px | 1.43 |
| caption | 12px | 1.43 |

**Weights** : 400 (regular) / 500 (medium) / 600 (semibold) / 700 (bold)

## Spacing

- **Base** : 4
- **Échelle** : 2 / 4 / 6 / 8 / 10 / 12 / 16 / 20 / 24 / 32 / 48

## Composants

### Button
- `border-radius: 10px`
- `padding: 8px 16px`
- `font: 14px / 600`

### Input
- `border-radius: 8px`
- `border-width: 1px`
- `padding: 6px 12px`
- `font-size: 14px`

### Card
- `border-radius: 10px`
- `padding: 16px`
- `box-shadow: 0 1px 2px rgba(16,24,40,0.05)`
- `border-width: 1px`

### Modal
- `border-radius: 12px`
- `padding: 24px`
- `max-width: 560px`

### Table
- Header : `12px / 600`, color `#6B7280`
- Cells : `padding 10px 16px`

### Badge
- `border-radius: 10px`
- `padding: 4px 8px`
- `font: 12px / 500`

## Extras détectés (non retenus en tokens primaires)

### Charte FilmPro complète
- Ardoise `#5A7190`
- Violet `#7B6A9A`
- Sauge `#538B6B`
- Brun `#917548`

### Backgrounds doux
- Ambré `#FFFAEB`
- Rosé `#FEF3F2`
- Bleu pâle veille `#EDF1F5`

### Tailles micro
- 10px/400, 10px/500, 10px/600 (caption magazine /veille)

### Radii alternatifs
- 8px (inputs), 12px (modals), 4px (borders fines)

### Shadow medium
- `0 4px 8px -2px rgba(16,24,40,0.1), 0 2px 4px -2px rgba(16,24,40,0.06)`

## Anomalies à arbitrer

1. **Primary bleu vs accent ambre** : le bouton primary est `#2F5A9E` (bleu) alors que l'accent visuel dominant est `#F79009` (ambre). Choisir 1 unique stratégie de hiérarchie (primary=ambre OU primary=bleu charte).
2. **Spacing 6 et 10** : base 4 stricte exclurait ces valeurs. Décider si on garde l'échelle empirique ou on aligne sur 4/8/12/16/24.
3. **Hauteur boutons** : `Enrichir` h:42px vs `Importer` h:40px. Normaliser à 40px.
4. **Pas de H1 vrai** : le titre `Prospection` est `22px/600` dans un `<div>`. Confirmer hiérarchie.
5. **Icônes** : Material Symbols Outlined sur CRM (vs Lucide sur formation-ia). Convention à figer dans le golden.

## Fichiers

- JSON : `.claude/goldens/audit-uiux-golden-v1-2026-04-25.json`
- MD : `.claude/goldens/audit-uiux-golden-v1-2026-04-25.md`
- Symlink courant : `.claude/audit-uiux-golden-current.json`
