# Golden Standards — CRM FilmPro

**Statut** : v7 (refonte /prospection phases 0+1 + scoring 2026-05-01)
**Source** : extraction `/prospection` chrome MCP + arbitrage 5 anomalies + mockup Phase 0+1 validé
**Scope** : transverse à toutes les pages CRM (prospection, contacts, entreprises, pipeline, signaux, dashboard, veille). Wizards et formulaires de cadrage hors scope.
**Référence machine** : `.claude/goldens/audit-uiux-golden-v7-2026-05-01.json` (consommé par `/audit-uiux`)
**Référence responsive** : voir aussi [`GOLDEN_STANDARDS_RESPONSIVE.md`](./GOLDEN_STANDARDS_RESPONSIVE.md) pour les règles spécifiques mobile / tablette
**Spec métier prospection** : voir [`SPECS_PROSPECTION.md`](./SPECS_PROSPECTION.md)

---

## 1. Décisions tranchées

5 anomalies identifiées en Phase 1 d'extraction, tranchées par Pascal le 2026-04-25 via wizard HTML interactif.

| # | Anomalie | Décision |
|---|---|---|
| 1 | Hiérarchie couleur (bleu vs ambre) | **Primary = bleu `#2F5A9E`** (statu quo). Accent ambre `#F79009` réservé aux signaux d'attention (badges chauds, alertes, états exceptionnels). Aucune migration. |
| 2 | Échelle spacing | **Tailwind canonique** : `4 / 8 / 12 / 16 / 24 / 32 / 48`. Retrait de 2, 6, 10, 20 (anomalies issues de `*-1.5`, `*-2.5`). Migration ciblée Phase 4. |
| 3 | Hauteur boutons | **40px uniforme** (`h-10` Tailwind). `box-sizing: border-box` pour neutraliser l'effet bordure 1px (cas du bouton outline `Enrichir` qui passait à 42px). |
| 4 | Sémantique titre | **`<h1>` obligatoire** en haut de chaque page CRM. Rendu Tailwind `text-[22px] font-semibold leading-none`. A11y + cohérence cross-projet (formation-ia est passé en H1 sémantique en S100). |
| 5 | Bibliothèque icônes | **Migration vers Lucide** (`lucide-svelte`). Override de la reco statu quo (Material Symbols Outlined). Cohérence cross-projet avec formation-ia + gain perf -80kb (font Material supprimée). Migration ~120 occurrences = tâche dédiée backlog. |

---

## 2. Tokens

### 2.1 Palette sémantique

11 tokens primaires utilisés sur toute l'app. Toute couleur hors de cette liste doit être justifiée par une règle métier (ex: charte FilmPro complète sur pages signaux).

| Token | Valeur | Usage |
|---|---|---|
| `--bg` | `#FFFFFF` | Fond principal |
| `--surface` | `#F9FAFB` | Surface secondaire (zones grisées, hovers) |
| `--text` | `#111827` | Texte principal |
| `--text-muted` | `#6B7280` | Texte secondaire, captions, headers de tables |
| `--border` | `#E5E7EB` | Bordures inputs, cards, séparateurs |
| `--primary` | `#2F5A9E` | CTA principal (Importer, Enregistrer, Convertir) |
| `--primary-hover` | `#264C85` | Hover bouton primary |
| `--accent` | `#F79009` | Signal d'attention (badge chaud, état exceptionnel) |
| `--accent-bg` | `#FFFAEB` | Fond doux pour zones d'attention |
| `--success` | `#538B6B` | Succès (sauge FilmPro) |
| `--warning` | `#F79009` | Avertissement |
| `--warning-bg` | `#FFFAEB` | Fond doux warning |
| `--error` | `#F04438` | Erreur |
| `--error-bg` | `#FEF3F2` | Fond doux erreur |
| `--info` | `#5A7190` | Info (ardoise FilmPro) |

**Règle d'usage du primary vs accent** :
- `primary` (bleu) = action structurelle. L'utilisateur appuie pour avancer dans son workflow.
- `accent` (ambre) = signal sensoriel. Quelque chose attire l'attention, pas une action à faire.
- Ne jamais utiliser ambre en `<button>` standard. Toujours dans badges, dots, surlignages, fonds doux.

### 2.2 Charte FilmPro complète (extras)

Hors scope golden. Réservée à des pages métier explicitement scopées.

- `#5A7190` ardoise · `#7B6A9A` violet · `#538B6B` sauge · `#917548` brun · `#EDF1F5` bleu pâle (utilisé sur `/veille`)

### 2.3 Typographie

**Font unique** : `"DM Sans", system-ui, -apple-system, sans-serif`
**Mono** : `Menlo, Consolas, monospace` (rare, pour codes, IDs)

| Token | Taille | Weight | Line-height | Usage |
|---|---|---|---|---|
| `h1` | 22px | 600 | 1.0 | Titre de page (1 seul par page) |
| `h2` | 18px | 600 | 1.2 | Section dans une page |
| `h3` | 16px | 600 | 1.3 | Sous-section, titre de card |
| `h4` | 15px | 600 | 1.4 | Petit titre |
| `body` | 14px | 400 | 1.43 | Corps de texte par défaut |
| `body-medium` | 14px | 500 | 1.43 | Body emphasis (labels, valeurs) |
| `caption` | 12px | 400 | 1.33 | Métadonnées, hints |
| `caption-medium` | 12px | 500 | 1.33 | Métadonnées avec emphasis |
| `label` | 12px | 600 | 1.33 | Headers de tables, labels en CAPITALES |
| `micro` | 10px | 500 | 1.5 | Caption magazine /veille |

**Weights utilisés** : 400 (regular), 500 (medium), 600 (semibold), 700 (bold).

### 2.4 Spacing

Échelle stricte Tailwind canonique. Tout pixel hors de cette échelle est une violation à corriger.

| Token | Valeur | Tailwind |
|---|---|---|
| `xs` | 4px | `*-1` |
| `sm` | 8px | `*-2` |
| `md` | 12px | `*-3` |
| `lg` | 16px | `*-4` |
| `xl` | 24px | `*-6` |
| `2xl` | 32px | `*-8` |
| `3xl` | 48px | `*-12` |

**Interdits** : 2, 6, 10, 20. Détection en Phase 3 via `grep -rE "[pmg]-(1\.5|2\.5|5)\b"`.

### 2.5 Radius

| Token | Valeur | Usage |
|---|---|---|
| `sm` | 4px | Séparateurs fins, indicateurs |
| `md` | 8px | Inputs, selects |
| `lg` | 10px | **Default** — buttons, cards, badges, sidebar items |
| `xl` | 12px | Modals |
| `full` | 9999px | Dots, avatars |

### 2.6 Shadows

| Token | Valeur | Usage |
|---|---|---|
| `xs` | `0 1px 2px rgba(16,24,40,0.05)` | Cards, surfaces subtiles |
| `sm` | `0 1px 3px rgba(16,24,40,0.1), 0 1px 2px rgba(16,24,40,0.06)` | Cards élevées, dropdowns |
| `md` | `0 4px 8px -2px rgba(16,24,40,0.1), 0 2px 4px -2px rgba(16,24,40,0.06)` | Modals, popovers |
| `focus-ring` | `0 0 0 3px rgba(47, 90, 158, 0.2)` | État focus (cumulable avec border-color) |

---

## 3. Composants

### 3.1 Button

**Base** :
- `height: 40px`, `box-sizing: border-box`
- `border-radius: 10px` (`rounded-lg`)
- `padding: 8px 16px`
- `font: 14px / 600`, `letter-spacing: 0`, `text-transform: none`

**4 variants** :

| Variant | Background | Color | Border | Font-weight |
|---|---|---|---|---|
| primary | `#2F5A9E` | `#FFFFFF` | none | 600 |
| secondary | transparent | `#7B6A9A` | `1px solid rgba(123,106,154,0.3)` | 500 |
| tertiary (ghost) | transparent | `#111827` | none | 400 |
| destructive | `#F04438` | `#FFFFFF` | none | 600 |

**Hover** :
- primary → `#264C85`
- destructive → `#C9342A`
- secondary / tertiary → `bg #F9FAFB`

**Focus** : ring `0 0 0 3px rgba(47,90,158,0.2)`.

**Avec icône** : `gap: 6px`, icône à gauche. Lucide `size: 16` (sm) ou `20` (md selon densité).

### 3.2 Input

- `height: 34px`
- `border: 1px solid #E5E7EB`, `border-radius: 8px`
- `padding: 6px 12px`
- `font: 14px / 400`
- `color: #111827`, `placeholder: #6B7280`
- `background: #FFFFFF`

**Focus** : `border-color: #2F5A9E` + ring focus.

### 3.3 Card

- `border-radius: 10px`, `border: 1px solid #E5E7EB`
- `padding: 16px`
- `shadow: xs`
- `background: #FFFFFF`

### 3.4 Modal

- `border-radius: 12px`, `padding: 24px`, `max-width: 560px`
- `shadow: md`, backdrop `rgba(0,0,0,0.4)`
- **A11y** : focus trap, Escape ferme, return focus au déclencheur

### 3.5 Table

- Header : `font: 12px / 600`, `color: #6B7280`, `height: 48px`
- Cells : `padding: 12px 16px`, `font: 14px`
- Hover row : `bg: #F9FAFB`
- Border : `1px solid #E5E7EB`
- **Règle S48** : `table-fixed` obligatoire pour respecter `max-w` sur td/th. Largeurs en `w-[X%]`.

### 3.6 Badge

- `border-radius: 10px`, `padding: 4px 8px`, `font: 12px / 500`

| Variant | Background | Color |
|---|---|---|
| default | `#F9FAFB` | `#6B7280` |
| info | `#EDF1F5` | `#5A7190` |
| success | `#ECFDF5` | `#538B6B` |
| warning | `#FFFAEB` | `#B95400` |
| error | `#FEF3F2` | `#C9342A` |

### 3.7 Dot (indicateur statut)

- `size: 8px`, `border-radius: 9999px`
- Sans texte. Variants par couleur sémantique (success, warning, error, info).
- Usage : températures de prospects, statuts de sync, online/offline.

### 3.7b ScorePill (priorité prospect, v7 2026-05-01)

Pill sémantique qui remplace l'ancien Badge "Chaud / Tiède / Froid". Pattern Linear Priority.

- **Composant** : `src/lib/components/prospection/ScorePill.svelte`
- **Props** : `score: number, breakdown?: string, compact?: boolean`
- **Layout** : `height: 26px, padding: 0 11px, border-radius: 6px, gap: 7px, font: 12px / 600, letter-spacing: 0.005em`
- **Glyphe Lucide à gauche** (14px, stroke 2) :
  - `flame` → Prioritaire (score ≥ 7)
  - `target` → À qualifier (score 4-6)
  - `eye` → Faible signal (score < 4)
- **Couleurs sémantiques calibrées (modernes, pas criardes)** :

| Niveau | Background | Text | Stroke icône |
|---|---|---|---|
| Prioritaire (chaud) | `#FFF1EC` (rosé pâle) | `#C0391A` (rouge corail) | `#E04F2E` |
| À qualifier (tiède) | `#FFF7E6` (crème) | `#B54708` (ambre) | `#DC8915` |
| Faible signal (froid) | `var(--color-info-light)` | `#475669` (ardoise) | `#5A7190` |

- **Variante `--compact`** : sans `min-width: 130px`, pour cellules de table denses. Utilisée dans la table `/prospection`.
- **Variante par défaut** : `min-width: 130px` pour alignement tabulaire.
- **Tooltip natif via `title`** : breakdown des points (ex. `"Canton GE +2 · Secteur construction +3 · SIMAP +2 · Récent +2 = 9/12"`).
- **Sémantique tags métier** (remplace Chaud/Tiède/Froid) : *Prioritaire / À qualifier / Faible signal*.

### 3.7c ActionButton (boutons icône queue triage, v7 2026-05-01)

Pattern Notion / Stripe property buttons : icône colorée discrète au repos qui se révèle au hover.

- **Layout** : `width: 36px, height: 36px, padding: 0, border-radius: 8px`
- **Repos** : `background: transparent, border: 1px solid transparent`. Icône colorée saturation faible (`#6E9C8F` verdâtre / `#C28A86` rosé / `#8A95A8` ardoise / `#7B8FAE` ardoise-bleuté). On lit le bouton sans hover.
- **Hover** : `transform: translateY(-1px)`, background tinté `color-mix(...)` doux, icône saturation 100%, `box-shadow: 0 4px 12px -3px rgba(sémantique 22%)`. Spring physics `cubic-bezier(0.16, 1, 0.3, 1)`, 220ms.
- **Active** : `transform: scale(0.96) translateY(0)`, transition 80ms.
- **Focus visible** : `box-shadow: 0 0 0 3px rgba(47,90,158,0.30)`.
- **Disabled** : opacity 0.5, cursor wait, pas de transform.
- **Mobile** : `width: 100%, height: 44px`, label visible via `::after` (HIG iOS 44×44 minimum).
- **Pas de label texte au repos desktop** : tooltip natif `title=` + `aria-label` suffisent.

### 3.7d Indicateurs flat premium (header de page liste, v7 2026-05-01)

Remplace les cartes "funnel" décoratives (Importer/Enrichir/Qualifier/Convertir). Pattern : valeur factuelle sans suggestion de parcours linéaire.

- **Layout** : grid 3 cols (desktop), border-y 1px, séparateurs verticaux 1px. Mobile : empilé 1 col.
- **Item** : `padding: 28px 28px 28px 0` (28px à droite, 0 à gauche par défaut, 28px gauche pour les items 2 et 3).
- **Icône** : `44×44 px`, `border-radius: 12px`, `background: radial-gradient(circle at 30% 30%, rgba(primary, 0.10), rgba(primary, 0.02))`, glyphe Lucide 22px stroke 1.5 ardoise.
- **Valeur** : `font-size: 36px, font-weight: 700, font-variant-numeric: tabular-nums, color: primary-dark, letter-spacing: -0.025em, line-height: 1`.
- **Label** : `font-size: 13px, color: text-muted, font-weight: 500`.
- **Trend optionnel** : `font-size: 11px, color: success/info/muted`, glyphe Lucide 12px (chevron-up / minus / etc.). Format `+3 cette semaine` / `stable cette semaine`. Tabular-nums.

**Indicateurs canoniques sur `/prospection`** :
1. Leads actifs (icône `users`, statut ∈ {nouveau, interesse})
2. Marchés publics ouverts (icône `landmark`, source=simap ET statut!=ecarte)
3. Transférés ce mois (icône `repeat`, statut=transfere ET date_modification dans le mois courant)

### 3.7e TriageQueue (widget dashboard "À trier ce matin", v7 2026-05-01)

Inbox du matin : leads chauds non touchés, queue partagée multi-fondateurs, 4 actions inline par lead.

- **Composant** : `src/lib/components/dashboard/TriageQueue.svelte`
- **Props** : `leads: Lead[], total: number, visibleLimit: number = 12`
- **Critères queue côté serveur** : `statut=nouveau ET score_pertinence>=5 ET (triage_snoozed_until IS NULL OR triage_snoozed_until <= now())`. Order : `score_pertinence DESC, date_import DESC`. Cap `25` (top 12 visibles + "+N en file" sur l'aside).
- **Layout** :
  - Card globale `border-radius: 16px, border: 1px solid var(--color-border), shadow xs`
  - Grid 2 cols desktop (`280px aside | 1fr corps`)
  - Mobile (≤ 1024px) : aside passe en bandeau horizontal top
- **Aside primary-dark** :
  - Background `--color-primary-dark` (#0A1628)
  - Padding 32px 28px desktop, 20px 24px mobile
  - 2 ornements cercles `rgba(255,255,255,0.04)` en pseudo-éléments (top-right + bottom-left)
  - Kicker uppercase 11px tracking 0.16em rgba(white, 0.6) avec icône `bolt` 16px
  - Numéro tabular-nums `font-size: 88px desktop / 44px mobile, font-weight: 700, letter-spacing: -0.04em, line-height: 1`
  - Label `font-size: 14px rgba(white, 0.75)`
  - **CTA cliquable** : "Voir les N autres en file" (border-bottom 1px ardoise pâle saturée), aside entier est `role="button" tabindex="0"`, hover assombrit (#050C18) et révèle l'underline. Pas de pill voyante.
- **Lead item** :
  - Padding `16px 24px`, border-bottom 1px
  - Animation entrée `fadeUp 280ms ease both`, `animation-delay: calc(var(--i) * 50ms)` (cascade)
  - Hover background `var(--color-surface-alt)`
  - State `is-pending` : opacity 0.55, pointer-events none (race lock par leadId)
  - **Ligne 1** : Badge source pastel + nom (font-weight 600, max-width 320px ellipsis) + ScorePill (compact, marge auto droite)
  - **Ligne 2** : context via `formatLeadContext(lead)` (text-muted 13px), 1 phrase courte adaptée à la source
- **Actions** : 4 ActionButton (cf. 3.7c) : Intéressant / Écarter / Snooze 7 j / Détails
- **Empty state** : si `leads.length === 0`, message "Rien à trier ce matin. Votre fond de pipe travaille pour vous. Les nouveaux leads chauds atterriront ici dès le prochain import."

### 3.7f Onglets prospection (v8 2026-05-01)

Pattern segmentation par nature de signal pour les pages liste data-rich. Cas pilote : `/prospection` Phase 2 (4 onglets).

- **Composant** : `src/lib/components/prospection/ProspectionTabs.svelte` + tokens `--color-tab-{simap,regbl,entreprises,terrain}` dans `app.css`
- **Surface** : sticky tabs desktop sous le header, `<select>` dropdown plein-largeur sur mobile (<768px)
- **Layout onglet** : icône puce 26x26 rounded-md (fond pastel + trait coloré) + label + count tabular-nums dans badge `bg-surface-alt`
- **Couleurs segmentation premium subtile** :
  - SIMAP marchés publics : bleu pétrole `#3D6B8A` sur fond `#ECF1F5` (autorité publique)
  - Chantiers RegBL : terracotta atténué `#B07A5A` sur fond `#F7EFE8` (terre, bâti)
  - Entreprises (Zefix+search.ch) : sauge profond `#4F7252` sur fond `#EEF3EE` (institution)
  - Terrain (lead_express+veille) : prune sourde `#6F4F6E` sur fond `#F2ECF1` (humain, mobile)
- **État actif** : underline 2px primary + label primary-dark semibold + icône scale(1.02)
- **Onglet vide (count 0)** : badge count opacity-25 + icône stroke-width 2.2 (signal "vide" sans triste)
- **A11y** : `role="tablist"`/`tab` + `aria-selected` + `aria-label` count
- **URL state** : `?tab=simap|regbl|entreprises|terrain` (whitelist server-side, fallback `simap`)

### 3.7g Tooltip (composant réutilisable, v8 2026-05-01)

Tooltip subtil premium sur hover, pour expliciter en-têtes ambigus, onglets, ou métiques.

- **Composant** : `src/lib/components/Tooltip.svelte`
- **Style** : fond blanc + `border 1px var(--color-border)` + ombre douce 2 couches `0 6px 20px rgba(15,23,41,0.10), 0 1px 3px rgba(15,23,41,0.05)`
- **Texte** : `font-size: 12px`, `color: text-body`, line-height 1.5, mot-clé en `<strong class="text-primary-dark">` semi-bold
- **Chevron** : 9x9 rotated 45°, `border-top + border-left` blanc pour cohérence
- **Animation** : fade + translateY 160ms ease (zéro quand `:hover` ou `:focus-within`)
- **Variantes** : `anchor="center"` (défaut, ancré au centre du host), `anchor="start"` (ancré à gauche, label court type en-tête de tableau)
- **Usage**:
  ```svelte
  <Tooltip content="Score 0-12 calculé automatiquement..." anchor="start">
    <span>Priorité</span>
  </Tooltip>
  ```

### 3.7h Tableau dense + colonnes redimensionnables + tri stack (v8 2026-05-01)

Extension `DataTable.svelte` opt-in via props (rétrocompat 100% : `/contacts` consomme l'ancien comportement).

- **`dense={true}`** : padding cellules 7px (vs 12 baseline) + `font-size: 13px` + headers 11px uppercase
- **`resizable={true}` + `storageKey="prospection-{tab}"`** : drag handle 6px sur séparateur d'en-tête (hover bleu, traits gris au repos), largeur persistée localStorage par scope, validation Number.isFinite + bornes [40, 2000]
- **`pageSizeOptions={[25, 50, 100]}` + `onPageSizeChange`** : sélecteur compact dans le footer du tableau, persistant via URL `?perPage=`
- **Tri stack bidirectionnel** : 2 chevrons up+down empilés 9x5px à droite du label, `opacity 0.35` au repos / `0.7` au hover de la colonne / chevron actif `primary` opacity 1 + autre opacity 0.25 quand sortée. Pattern Linear/Stripe Dashboard. `aria-sort="ascending|descending|none"` sur `<th>`.
- **Tooltip header (`Column.infoTooltip`)** : petit cercle "i" 13px italic à côté du label, hover révèle le tooltip subtil (3.7g)
- **Pattern reset** : bouton "Largeurs" en haut à droite du tableau qui efface localStorage et restaure les defaultWidths

### 3.8 Slide-out panel

- Desktop : `width: 560px`, attaché à droite
- Mobile : `width: 100vw`
- `padding: 24px`
- Backdrop : `rgba(0,0,0,0.4)`
- Shadow : `-8px 0 16px rgba(16,24,40,0.1)`
- **Règle S45** : header sticky doit avoir `bg-white border-b border-border` (sinon overlap visuel au scroll)

### 3.9 Navigation

**Header** :
- `height: 64px`
- `border-bottom: 1px solid #E5E7EB`
- `background: #FFFFFF`

**Sidebar** :
- `width: 240px` ouverte, `64px` repliée (mode collapsed)
- `background: #FFFFFF`
- `border-right: 1px solid #E5E7EB`
- Items : `height: 40px`, `border-radius: 10px`, `padding-x: 12px`
- Item actif : `bg: #F9FAFB`, `color: #2F5A9E`, weight 600

---

## 4. Patterns

### 4.1 Layout standard

```
┌──────────────────────────────────────────────┐
│  Header 64px (logo + user menu)              │
├──────┬───────────────────────────────────────┤
│      │  H1 page (22px/600)                   │
│ Side │  ──────────────                       │
│ bar  │  Toolbar / filtres                    │
│ 240  │  ──────────────                       │
│      │  Contenu principal (table, cards...)  │
│      │                                       │
└──────┴───────────────────────────────────────┘
```

- Mobile (<768px) : sidebar passe en drawer overlay, contenu pleine largeur

### 4.2 Saisie rapide

Pattern G36 (cf. `archive/decisions-structurelles-crm.md`) : champ unique + autocomplete contextuel + save automatique au blur. Pas de bouton « Enregistrer » par champ.

### 4.3 Slide-out vs modal

- **Slide-out** : édition contextuelle d'une entité de la liste sans quitter la page (lead, contact, entreprise)
- **Modal** : action ponctuelle isolée (import, confirmation destructive, wizard court)

Règle : ne jamais empiler 2 slide-outs ou 2 modals.

### 4.4 Batch actions bar

Affichée quand >0 lignes sélectionnées. Sticky en bas du conteneur de table.
- **Règle S45** : `flex-wrap` obligatoire sous 640px, jamais d'overflow horizontal

### 4.5 Empty states

Tout écran liste doit avoir un empty state explicite avec :
- Icône Lucide 48-64px en `--text-muted`
- Titre H3 (`16px / 600`)
- Phrase d'accompagnement (`14px / 400 muted`)
- 1 CTA primary suggéré (créer, importer)

---

## 5. Accessibilité

- **Contraste** : WCAG AA (4.5:1 pour body, 3:1 pour UI large). Vérifier après tout changement de couleur.
- **Focus visible** : `outline 2px solid #2F5A9E, offset 2px` + ring sur composants stylés
- **Headings** : H1 unique par page, hiérarchie sémantique stricte (jamais de saut H1 → H3)
- **Boutons** : `<button>` ou `<a>` sémantique, jamais `<div onclick>`
- **Modals** : focus trap obligatoire, Escape ferme, return focus au déclencheur
- **Forms** : `<label for>` lié à chaque input, error messages annoncés via `aria-describedby`
- **CI** : axe-core 0 violation serious/critical (pipeline à monter cf. AppFactory CLAUDE.md S100 formation-ia)

---

## 6. Icônes

- **Library** : `lucide-svelte` (post-migration depuis Material Symbols)
- **Sizes** : xs 14 / sm 16 / md 20 / lg 24
- `stroke-width: 2`
- `color: currentColor` (hérite du parent)
- **Sémantique** : ne jamais utiliser une icône comme seul indicateur (toujours doublé d'un texte ou aria-label)

**Migration en cours** : ~120 occurrences à remplacer un-par-un. Voir tâche backlog.

---

## 7. Règles transverses (do / don't)

### Do
- Utiliser les tokens sémantiques (`var(--primary)`) plutôt que les hex en dur
- Réutiliser les composants standardisés (`<Button variant="primary">`)
- `table-fixed` sur toute table (S48)
- `flex-wrap` sur toute barre d'actions (S45)
- `<h1>` sémantique en haut de chaque page
- `box-sizing: border-box` partout
- `box-shadow` au lieu de `border` pour la profondeur

### Don't
- Pas d'option « Autre » dans les select (règle UX session 42)
- Pas de spacing 2/6/10/20px
- Pas de hauteur de bouton hors 40px
- Pas de `<div onclick>` (utiliser `<button>` ou `<a>`)
- Pas de Material Symbols dans nouveau code (migration en cours)
- Pas de width+height forcés sur les images sans calcul de ratio
- Pas de couleur hex hors palette sémantique sans justification

---

## 8. Workflow d'audit delta (Phases 3-4)

Référentiel terminé. Étapes restantes du chantier Bloc 1a :

### Phase 3 — Audit delta

Pour chaque page CRM (`/prospection`, `/contacts`, `/entreprises`, `/pipeline`, `/signaux`, `/dashboard`, `/veille`) :

1. Lancer `/audit-uiux` avec `--golden v2`
2. L'agent compare la page contre `audit-uiux-golden-current.json`
3. Output : findings groupés par sévérité (P0 / P1 / P2) avec fichier + ligne + recommandation
4. Consigner dans `docs/audit-delta-{page}.md`

### Phase 4 — Application

1 commit par page traitée. Ordre suggéré :
1. `/prospection` (gabarit déjà extrait, faible delta attendu)
2. `/dashboard` (page d'entrée)
3. `/contacts`, `/entreprises` (pages liste à fort impact)
4. `/pipeline`, `/signaux`, `/veille`

Chaque commit :
- Applique les tokens golden
- Corrige les violations spacing / button / H1
- Reste sur le périmètre de la page (pas de refacto cross-page)

### Tâche dédiée migration Lucide

Indépendante des Phases 3-4. À planifier séparément :
- ~120 occurrences `<span class="material-symbols-outlined">X</span>` à remplacer par composants `<X />` Lucide
- Mapping exhaustif `material → lucide` à établir d'abord (tableau dans la PR)
- Retirer la font Material Symbols du `<head>` à la fin (gain -80kb)
- Tests visuels sur toutes les pages avant merge

---

## 9. Maintenance

- **Versioning** : toute modification du golden = nouvelle version (v3, v4...). Jamais d'écrasement de v2.
- **Symlink courant** : `.claude/audit-uiux-golden-current.json` doit toujours pointer vers la version active
- **Process** : pour modifier, lancer `/golden-standard` → option édition d'une version → wizard HTML
- **Revue** : ce doc devrait être relu à chaque mise à jour majeure (>10 changements). Sinon il décroche du JSON.
