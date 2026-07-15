# CRM FilmPro - Golden Standard

**Version** v9 - 2026-05-06 (split layered design system + 2 archétypes sources stricts).
**Sources figées** : `.claude/goldens/v9-2026-05-06/` (`tokens.json`, `primitives.json`, `archetype-workspace.json`, `archetype-editorial.json`, `mapping.md`).
**Charte CSS implémentée** : GitHub `pascalmedecin-cmd/appfactory-cli`, path `template/src/app.css` (Tailwind v4 `@theme`). **Pas de clone local** : la charte vit dans le repo applicatif.
**Pages sources figées** : `/prospection` (archétype workspace, S164+S165) + `/veille` (archétype editorial, S132/S168).
**Production** : `https://filmpro-crm.vercel.app`.

Cette charte est la source de vérité pour toute page rendue dans le CRM. Tout écart doit être tracé en commentaire de PR ou dans `audits/<date>_visuel.md` avec justification + accord Pascal explicite.

**Activité FilmPro** : entreprise suisse romande qui pose films et vernis de protection sur vitrages de bâtiments. Le CRM est un outil **interne** : utilisateurs métier (commercial, terrain, direction) qui qualifient des leads, suivent un pipeline, lisent une veille sectorielle.

---

## 1. Posture éditoriale

**CRM interne, pas SaaS B2B générique.** Outil de travail quotidien, lu en station debout entre deux rendez-vous, pas en démo investisseur.

- L'utilisateur principal connaît son métier. Pas de tooltip pédagogique, pas de tour onboarding, pas de vidéo explicative.
- Les libellés sont en français, vocabulaire métier filmpro (films, vernis, vitrage, marché, lot, soumission). Jamais de jargon SaaS (« onboard », « engage », « activate », « nurture »).
- Les chiffres parlent. Score de priorité, dates de relance, nom d'entreprise. Aucune métrique inventée pour remplir un tableau de bord.
- Densité contrôlée. La table de prospection affiche 30-50 lignes lisibles d'un coup. Pas de carrousel, pas d'animation au scroll.

### Banni

- Jargon agence digitale : « expérience utilisateur premium », « parcours optimisé », « engagement », « conversion funnel », « activation ».
- Anglicismes inutiles quand un mot français existe (lead → lead OK, par convention métier ; insights → enseignements ; quick wins → gains rapides ; pipeline → pipeline OK).
- Jargon Big4 / SaaS : « value driver », « synergies », « best-in-class », « north star », « leverage », « playbook ».
- Jamais de référence audiovisuel ou facilities. FilmPro = vitrages bâtiments. Confusion à bannir absolument.

---

## 2. Palette - tokens universels

Tokens définis dans `tokens.json` (couche universelle), implémentés dans `template/src/app.css` via Tailwind v4 `@theme`. Tous les composants consomment ces variables. **Aucune couleur hardcodée hors tokens.**

### 2.1 Surfaces

| Token | Valeur | Usage |
|---|---|---|
| `background` | `#FFFFFF` | Fond de page CRM standard |
| `surface` | `#F9FAFB` | Surfaces atténuées, hover row table |
| `surfaceAlt` | `#F3F4F6` | Surfaces alternées, ScorePill `unscored` |

### 2.2 Texte

| Token | Valeur | Usage |
|---|---|---|
| `text` | `#111827` | Texte principal, titres |
| `textBody` | `#374151` | Corps éditorial enrichi |
| `textMuted` | `#6B7280` | Labels, métadonnées, placeholders |

### 2.3 Accent FilmPro Blue (mono-tenant, fixe)

Le CRM est mono-tenant FilmPro. **Aucune dérivation par client.** Le bleu FilmPro `#2F5A9E` est l'accent primary unique, posé une fois pour toutes.

| Token | Valeur | Usage |
|---|---|---|
| `primary` | `#2F5A9E` | CTA primary, focus ring, sidebar active, ScorePill outline |
| `primaryHover` | `#264C85` | Hover sur CTA primary |
| `primaryLight` | `#F0F4F8` | Sidebar background, hero éditorial veille, login ambiance |
| `primaryDark` | `#0A1628` | Bandeau aside hero éditorial, login premium |

**Règle stricte** : `primaryLight` + `primaryDark` sont **réservés** à l'archétype editorial + sidebar + login. Interdiction d'usage dans le flux workspace standard (table prospection, dashboard, slide-out).

### 2.4 Bordures

| Token | Valeur | Usage |
|---|---|---|
| `border` | `#E5E7EB` | Bordures cartes, dividers, tables |
| `borderInput` | `#D1D5DB` | Bordures champs de formulaire |

### 2.5 Statuts

| Token | Valeur | Usage |
|---|---|---|
| `success` | `#538B6B` | Vert sourd (validé, OK, terminé) |
| `successBg` | `#ECFDF5` | Fond pill success |
| `warning` | `#F79009` | Ambre (attention, à qualifier, en cours) |
| `warningBg` | `#FFFAEB` | Fond pill warning |
| `error` | `#F04438` | Rouge (destructif, erreur, refus) |
| `errorBg` | `#FEF3F2` | Fond pill error |
| `info` | `#5A7190` | Bleu sourd (neutre, faible signal) |
| `infoBg` | `#EDF1F5` | Fond pill info, ScorePill `froid` |

### 2.6 Layout

| Token | Valeur | Usage |
|---|---|---|
| `sidebar.width` | `240px` | Sidebar fixe ouverte |
| `sidebar.widthCollapsed` | `64px` | Sidebar collapsée |
| `header.height` | `48px` | Header app horizontal |
| `radius.default` | `10px` | Radius standard cartes, boutons, sidebar items |
| `radius.sm` | `6px` | Petits éléments, focus ring radius (implémentation : `--radius-sm: 6px`) |
| `radius.md` | `8px` | Inputs, slide-out |
| `radius.lg` | `10px` | Cartes, ActionButton, boutons workspace |
| `radius.xl` | `12px` | Modal, archive cards éditoriales |
| `radius.2xl` | `16px` | Cartes éditoriales dashboard (bento KPIs, TriageQueue, RelancesList, ActiviteTimeline) — S178 V2c |
| `radius.full` | `9999px` | Pills, dot indicateur |

### 2.7 Charte étendue (paletteExtras)

Disponible pour pages métier spécifiques (signaux, marchés). Ne pas utiliser hors scope défini.

| Token | Valeur | Usage |
|---|---|---|
| `filmproCharte.ardoise` | `#5A7190` | Couleur charte FilmPro étendue |
| `filmproCharte.violet` | `#7B6A9A` | Couleur charte FilmPro étendue, secondary button color |
| `filmproCharte.sauge` | `#538B6B` | Couleur charte FilmPro étendue |
| `filmproCharte.brun` | `#917548` | Couleur charte FilmPro étendue |

### 2.8 ScorePill (calibrée)

3 variantes calibrées (rouge corail moderne, ambre, bleu sourd), pas de danger criard.

| Variante | Bg | Color | Icon | Score |
|---|---|---|---|---|
| `chaud` (Prioritaire) | `#FFF1EC` | `#C0391A` | `flame` | ≥ 7 |
| `tiede` (À qualifier) | `#FFF7E6` | `#B54708` | `target` | 4-6 |
| `froid` (Faible signal) | `#EDF1F5` | `#475669` | `eye` | 0-3 |
| `unscored` (Non scoré) | `surfaceAlt` | `textMuted` | `schedule` | - |

---

## 3. Hiérarchie typographique - Inter

**Polices** : `Inter` pour heading et body (Atelier 209 Run 2 : voix typographique unique de l'outil, alignée sur le portail « Heure bleue » ; remplace DM Sans), `DM Mono` pour mono (rare, code interne uniquement). Self-hosted (`@fontsource-variable/inter`, axe roman + italique), CSP `font-src 'self'`. Pas de fallback décoratif.

### 3.1 Échelle universelle

| Niveau | Size | Weight | Line height | Usage |
|---|---|---|---|---|
| `h1` | `22px` | 600 | 1.0 | Titre page unique (workspace) |
| `h2` | `18px` | 600 | 1.2 | Section dans une page |
| `h3` | `16px` | 600 | 1.3 | Sous-section, slide-out section |
| `h4` | `15px` | 600 | 1.4 | Bloc, card title |
| `body` | `14px` | 400 | 1.43 | Texte courant |
| `bodyMedium` | `14px` | 500 | 1.43 | Body emphasis (ligne sélectionnée) |
| `caption` | `12px` | 400 | 1.33 | Métadonnée, sous-texte |
| `captionMedium` | `12px` | 500 | 1.33 | Métadonnée emphasis |
| `label` | `12px` | 600 | 1.33 | Label de formulaire, header table |
| `micro` | `10px` | 500 | 1.5 | Micro-label, footer technique |

Poids Inter utilisés : 400 (regular), 500 (medium), 600 (semibold), 700 (bold). Ne pas charger d'autres poids.

### 3.2bis Échelle éditoriale dashboard (S178 V2c)

Le **dashboard** (`/`) porte une identité éditoriale assumée (« inbox du matin du fondateur ») : titres de section et valeurs KPI plus grands que l'échelle workspace. **Échelle distincte, strictement bornée** : `24 / 40 / 56 / 76`. **Réservée au dashboard.** Toute autre page workspace s'aligne sur l'échelle universelle § 3.1.

| Usage | Size |
|---|---|
| Section h2 (TriageQueue, blocs dashboard) | `22-24px` |
| Hero greeting h2 (`SectionGreeting`) | `40px` (32px mobile) |
| KPI value standard (`KpisBento.kpi-value`) | `56px` |
| KPI value vedette (`KpisBento.kpi-featured`) | `76px` |
| KPI value split | `40px` (32px mobile) |

**Extension sanctionnée - bandeau KPI compact (`KpiStrip`, audit 360 Bloc D)** : le strip premium `KpiStrip` (consommé par Entreprises / Contacts / Signaux / Prospection / Pipeline / Dashboard sous `ffCrmListesV2`) porte une échelle **compacte délibérée**, distincte du barème : valeur `19px`, libellé `11.5px`, gap `10px`. Choix tenu (lecture dense en tête de liste, validé visuellement et en prod). Toute évolution de ces valeurs se fait **dans la primitive** `KpiStrip.svelte` (jamais en surcharge locale) et est re-validée en Chrome sur ses pages consommatrices.

### 3.3 Tokens d'ombre carte (S178 V2c)

Pattern récurrent des cartes éditoriales (ring hairline + diffusion douce), exposé en tokens pour éviter la duplication :

| Token | Usage |
|---|---|
| `--shadow-card` | Carte éditoriale au repos (KpisBento, RelancesList, ActiviteTimeline, AlertesStrip, PipelineCard/Column, TriageQueue, SignauxCards, EntreprisesCards) |
| `--shadow-card-hover` | Survol carte (lift accentué) |
| `--shadow-card-active` | État hover/drag (ring `primary`) |

Toute nouvelle carte éditoriale consomme ces tokens. **Aucune ombre multi-couche hardcodée** en composant. Les presets génériques `--shadow-xs/sm/md/lg/xl/2xl` restent disponibles pour boutons, dropdowns, modals, tooltips.

### 3.2 Échelle éditoriale (mag-*)

**Réservée** à l'archétype editorial (`/veille` + sous-pages). Interdite hors module veille.

| Classe | Size | Weight | Letter spacing | Usage |
|---|---|---|---|---|
| `mag-kicker` | `11px` | 700 | `0.14em` UPPERCASE | Kicker éditorial (catégorie, segment) |
| `mag-display` | `40px → 6xl` | 800 | `-0.03em` | Display principal (h1 hero veille) |
| `mag-display2` | - | 800 | `-0.025em` | Display secondaire |
| `mag-display3` | - | 700 | `-0.02em` | Display tertiaire (titres articles) |
| `mag-body` | `17px` | 400 | line-height 1.7 | Corps éditorial enrichi (deep-dive) |

---

## 4. Espacements - grille Tailwind canonique

Échelle alignée Tailwind canonique : `4`, `8`, `12`, `16`, `24`, `32`, `48`. **Retrait définitif** des valeurs `2`, `6`, `10`, `20` (décision 2 v5).

| Token | Valeur |
|---|---|
| `xs` | `4px` |
| `sm` | `8px` |
| `md` | `12px` |
| `lg` | `16px` |
| `xl` | `24px` |
| `2xl` | `32px` |
| `3xl` | `48px` |

Patterns récurrents :
- Padding cellule table : `12px 16px` (cellPaddingY × cellPaddingX).
- Padding card : `16px`.
- Padding modal : `24px`.
- Padding hero éditorial : `8px md:10px lg:10px` côté aside.
- Header app : `48px` height.
- Sidebar item : `40px` height, padding-x `12px`.

---

## 5. Composants types - primitives universelles

Tous documentés dans `primitives.json`. Implémentés dans le repo applicatif. Aucune surcharge locale autorisée.

### 5.1 Button (4 variantes)

Hauteur `40px` uniforme (h-10), `borderRadius 10px`, `padding 8px 16px`, `font-size 14px / weight 600`, `box-sizing: border-box`.

| Variante | Bg | Color | Border | Hover |
|---|---|---|---|---|
| `primary` | `#2F5A9E` | `#FFFFFF` | none | `#264C85` |
| `secondary` | transparent | `#7B6A9A` (violet charte) | `1px rgba(123,106,154,0.3)` | - |
| `tertiary` | transparent | `#111827` | none | - |
| `destructive` | `#F04438` | `#FFFFFF` | none | `#C9342A` |

### 5.2 Input

Hauteur `34px`, radius `8px`, border `1px #E5E7EB`, focus border `#2F5A9E`, padding `6px 12px`, font-size `14px`.

### 5.3 Card

Radius `10px`, border `1px #E5E7EB`, padding `16px`, shadow `xs` (`0 1px 2px rgba(16,24,40,0.05)`), bg blanc.

### 5.4 Modal

Radius `12px`, padding `24px`, max-width `560px`, shadow `md`, backdrop `rgba(0,0,0,0.4)`.

Variantes header :
- `default` : header neutre border-b border, titre text-text.
- `accent` : header `bg-primary text-white` (emphasis fort, pattern ImportModal).

### 5.5 ConfirmModal (S164 systémique)

Toute action destructive (suppression, retrait, désactivation) **DOIT** passer par ConfirmModal. **Pas de `window.confirm()`.**

Structure : Header (titre + close) + body (description + impacts) + footer (`Annuler` tertiary + `Confirmer` destructive ou primary).

### 5.6 ImportModal (S164 figé /prospection)

Modal contextuel premium 3 parcours pour import multi-source. Pattern réutilisable pour toute opération multi-source structurée.

- Parcours : `fichier_csv`, `saisie_manuelle`, `depuis_source_externe`.
- Header bg-primary (variant `accent`).
- Sélecteur 3 parcours + back button entre étapes.
- Validation Zod côté action SvelteKit, feedback inline par champ, blocage submit si erreurs.

### 5.7 ScorePill (universal)

Pill sémantique de priorité commerciale (Linear Priority pattern). Universal : `/prospection` table + LeadSlideOut + dashboard TriageQueue + `/contacts` + `/entreprises`.

Spec : height `26px`, padding `0 11px`, radius `6px`, gap `7px`, font `12px / 600`, letter-spacing `0.005em`. Min-width `130px` (default) ou `auto` (compact).

Icône `14px stroke 2` Lucide. **Jamais de Badge custom pour température/score.** Toujours ScorePill (décision 9 v7).

### 5.8 Badge

Radius `10px`, padding `4px 8px`, font `12px / 500`. 6 variantes : `default`, `info`, `success`, `warning`, `error`, `muted`. **Variant `accent` supprimé S118**, remplacé par modal headerVariant `accent`.

### 5.9 ActionButton (Notion / Stripe property-style)

Universal : queue triage dashboard + slide-outs + tables denses.

- Size `36×36 px`, radius `8px`, border `1px solid transparent (repos)`.
- Icon `17px stroke 1.75` Lucide.
- Hover : `transform: translateY(-1px)` + bg tinté + icône saturation 100%.
- Active : `transform: scale(0.96)`, transition 80ms.
- Focus visible : `box-shadow 0 0 0 3px rgba(47,90,158,0.30)`.
- 4 variantes : `yes` (vert), `no` (rouge), `later` (info), `view` (primary).
- Mobile : full-width 44px (HIG iOS), grid 2x2.

### 5.10 SlideOut (S45 + S164)

Panneau latéral droit pour détail entité (lead, contact, entreprise).

- Width `560px` desktop, `100vw` mobile.
- Padding `24px`. Backdrop `rgba(0,0,0,0.4)`. Shadow `-8px 0 16px rgba(16,24,40,0.1)`.
- **Sticky header obligatoire** : fond opaque blanc + border-bottom 1px. Focus trap. Escape ferme. Return focus au déclencheur.
- Structure : Header sticky (titre + close + actions) + body scrollable + footer sticky (actions principales).

### 5.11 DataTable

Header `48px` height, font `12px / 600 #6B7280`. Cellule padding `12px 16px`, font `14px`. Alignement vertical ajusté `+4px` pour contenu mixte text + ScorePill (S165).

- **Layout `table-fixed` obligatoire** pour respecter max-w (S48).
- **2 colonnes sticky gauche** (identifiant + nom) sur mobile et < 1280px.
- `aria-label` obligatoire sur `<tr>` cliquable. Formule : `${entity.name}, score ${entity.score}, statut ${entity.status}`.
- Type `Column.srLabel` obligatoire pour cellules header vides (a11y axe-core, S165).
- Empty states **contextuels** : « Aucun lead pour ce filtre » ≠ « Aucun lead dans la base ». Pas de fallback générique.

### 5.12 Tabs ARIA

Pattern distinctif underline figé S164.

- `<div role="tablist">` + `<button role="tab" aria-selected aria-controls>` + `<div role="tabpanel" aria-labelledby>`.
- Onglet : `h-10 px-4`, font `14px / 500`, border-b-2 border-transparent.
- Onglet actif : border-b-2 `border-primary`, color `primary`, font weight 600.
- Focus visible : `outline-2 outline-offset-2 outline-primary`.
- **Tout changement de scope** (Entreprise / Marchés / Particuliers) DOIT passer par tabs ARIA. Pas de select déguisé en tabs.

### 5.13 Dot

Indicateur statut 8×8px, radius `9999px`, sans texte. Variantes par couleur sémantique.

---

## 6. Anti-patterns - jamais

| Banni | Pourquoi | À la place |
|---|---|---|
| **Tailwind compilé lourd** (CDN play, runtime JIT) | Surcharge réseau, dépendance build instable | Tailwind v4 `@theme` côté repo applicatif (déjà en place) |
| **Gradient** (linear, radial) | Esthétique 2010, trahit l'IA-générique | Aplats avec tokens + radial-gradient discret iconBox indicateur (44×44, opacity 10% max). S178 V2c : gradients dashboard retirés (texte prénom `SectionGreeting`, radial 280×280 `KpisBento`, linear footer `TriageQueue`) → aplats `var(--color-*)` |
| **Ombre lourde** (box-shadow > 4px blur) | Esthétique « card material design » datée | Token shadow `xs / sm / md / lg`. Cards = `xs`. Modal = `md`. Slide-out = `-8px 0 16px` (latéral). |
| **Emoji Unicode** dans le rendu | Casse la posture pro, dépendance OS | Icônes Lucide en SVG inline via wrapper `<Icon name="..." />` + `icon-map.ts` (92 mappings) |
| **Material Symbols** | Migration LIVRÉE S115 (-207 occurrences, 28 fichiers) | Lucide uniquement, interdit hors fichiers legacy non migrés |
| **Police décorative** (autre que Inter / mag-* Inter) | Cohérence visuelle | Inter pour tout, sans exception |
| **Couleur hardcodée** dans un composant | Empêche maintenance + conflit tokens | Toujours via tokens `tokens.json` ou Tailwind v4 `@theme` |
| **Opacités custom statiques primary** (`bg-primary/X`, `border-primary/X`) | Décision S118, divergence palette | Tokens sémantiques (`bg-primary-light`, `bg-info-light`, `border-primary`). Hover/focus/ring transients tolérés (pattern UA). |
| **Charts génériques** (Chart.js, ApexCharts, ECharts) | Defaults trop génériques, palette saturée par défaut | Pas de chart générique dans le CRM V1. Si besoin de viz, custom D3 minimal aligné tokens. |
| **`window.confirm()` / `window.alert()`** | Pattern OS-natif désaligné | ConfirmModal pour destructive, Toast pour feedback |
| **Drag & drop sur DataTable** | Désaligné densité contrôlée + édition serveur | Édition via formulaires sobres + filtres URL params + actions inline |
| **Filtrage client-side > 50 lignes** | Ne tient pas à l'échelle | URL params (`?canton=GE&source=zefix`) + serveur SvelteKit |
| **Funnel décoratif / progress steps imaginaires** | Fausse promesse de parcours linéaire (décision 10 v7) | Indicateurs flat factuels (Leads actifs / Marchés ouverts / Transférés ce mois) |
| **Option « Autre »** dans les select | Décision tokens.json `noAutreInLists` | Toujours liste fermée + champ libre dédié si justifié |
| **`<div onclick>`** | A11y cassée | `<button>` ou `<a>` sémantique obligatoire |
| **Hero éditorial sur page workspace** | Désaligne archétypes | Hero réservé `/veille`, header condensé 2 rows pour workspace |
| **Hero workspace sur page éditoriale** | Idem inverse | Layout max-w 1280 + border-b-2 primary-dark pour editorial |
| **Bordure / séparateur / placeholder en `dashed` ou `dotted`** | Réflexe IA-générique daté, lecture floue, anti-premium | Trait `solid 1px var(--c-hairline)` ou `var(--c-border)` ; pour drop-zone drag : fill subtil `primary-light` + `box-shadow: inset 0 0 0 2px rgba(47,90,158,0.35)` + animation pulse, jamais `border: dashed`. Décision S176bis 2026-05-08, voir `tokens.json § rules.noDashedLines`. |

---

## 7. Personnalisation - mono-tenant FilmPro

Le CRM est **mono-tenant**. Aucune dérivation par client.

- Accent fixe `#2F5A9E` (FilmPro Blue), figé. Pas de bouton « changer le thème ».
- Logo FilmPro posé une fois en sidebar header (placeholder ou asset figé).
- Pas de white-label, pas de multi-tenant côté UI (multi-tenant peut exister côté data model si activité distincte demain, mais hors scope golden).

**Conséquence** : tout composant qui consommerait un token `--accent` paramétrable doit être considéré comme erreur d'architecture. Les tokens `primary` / `primaryHover` / `primaryLight` / `primaryDark` sont des **constantes** dans `tokens.json`.

---

## 8. Référence visuelle figée

Les **2 pages sources figées** sont la source de vérité visuelle :

- **`/prospection`** (archétype workspace, S164+S165) : page modèle pour table dense + filtres + slide-out détail + ImportModal. Toute nouvelle page workspace s'aligne sur cette page.
- **`/veille`** (archétype editorial, S132/S168) : gabarit magazine pour contenu long-form + hero + sticky bar. Toute nouvelle page éditoriale s'aligne sur cette page.

**Production** : `https://filmpro-crm.vercel.app`. Authentification magic link nécessaire pour voir les pages réelles.

**Visualizer interactif** : `.claude/goldens/v9-2026-05-06/visualizer.html` (statique, ouvrir dans le navigateur).

Toute divergence entre l'implémentation et la page source figée doit être :
- soit corrigée pour s'aligner sur la source,
- soit tracée dans `audits/<date>_visuel.md` avec justification + accord Pascal explicite.

---

## 9. Architecture en couches + 2 archétypes

Le golden v9 repose sur un **modèle layered design system** avec 2 archétypes sources stricts.

```
┌────────────────────────────────────────────────────┐
│ tokens.json     (couleurs, typo, spacing, radius)  │ ← UNIVERSEL
│ primitives.json (Button, Modal, ScorePill, …)      │ ← UNIVERSEL
└────────────────────────────────────────────────────┘
              ↑ source figée            ↑ source figée
              │                         │
┌─────────────┴────┐             ┌──────┴──────────────┐
│ workspace        │             │ editorial           │
│ /prospection     │             │ /veille             │
└──────────────────┘             └─────────────────────┘
              ↓ cascade                  ↓ cascade
┌─────────────────────────────────────────────────────┐
│ Pages consommatrices                                │
│ /dashboard · /pipeline · /contacts · /entreprises   │
│ /signaux · /veille/themes · /veille/[id] · /login   │
└─────────────────────────────────────────────────────┘
```

### 9.1 Couche universelle (tokens + primitives)

Source unique de vérité pour couleurs, typo, spacing, radius, shadow, a11y, et primitives (Button, Input, Card, Modal, Badge, ScorePill, ActionButton, Dot, SlideOut, ConfirmModal, ImportModal, DataTable, Navigation).

**Aucune surcharge locale autorisée.** Si une page a besoin d'un comportement non couvert : étendre la primitive (pas inventer de variante locale).

### 9.2 Archétype workspace

**Pages denses operables** : listes/tables d'entités CRM avec filtres, actions inline, slide-out détail. Tâche utilisateur principale = triage / qualification / opération sur volume.

**Référence figée** : `/prospection` (S164+S165).

**Layout type** :
- Container `max-w-full` (pleine largeur sous header), pas de max-w restrictif.
- Header condensé 2 rows (S164) : row 1 = titre de page (h2 — le h1 est porté par `Header.svelte`) + actions globales, row 2 = tabs ARIA + actions contextuelles.
- Filtres horizontaux serveur-side (URL params).
- Indicateurs flat optionnels (3 cols desktop, empilés mobile, indicateurs factuels).
- DataTable avec sticky 2 cols left + row cliquable + actions inline.
- SlideOut pour détail entité.

**Coquille partagée (S178 V2c)** : la chrome workspace (`.ws-page` / `.ws-page-actions` / `.ws-content` / `.ws-btn*` / `.ws-filter-select` / `.ws-fab` + media queries) vit dans `src/lib/styles/workspace.css`, importée une fois dans `(app)/+layout.svelte`. Les pages workspace consomment ces classes ; pas de re-définition locale. Le tablist underline vit dans la primitive `src/lib/components/Tabs.svelte` (roving tabindex + navigation clavier ArrowLeft/Right/Home/End) ; les composants `*Tabs.svelte` sont de simples wrappers.

### 9.3 Archétype editorial

**Pages contenu long-form** : hiérarchie typographique magazine, lecture, profondeur. Tâche principale = consulter une édition / un article.

**Référence figée** : `/veille` (S132/S168).

**Layout type** :
- Container `max-w-[1280px] mx-auto px-4 md:px-10 py-8 md:py-12` (respiration éditoriale).
- Header avec border-b-2 `border-primary-dark` (pas border standard) + kicker + mag-display + subtitle.
- Hero pattern : aside primary-dark gauche (4 cols, count édition n°) + body white droit (8 cols, synthèse + items numérotés).
- Sections suivantes (À retenir, Détails, Sources) avec mag-kicker + mag-body.
- Sticky bar bas extracted from flex scrollable (pattern fix S168).

**Cet archétype HÉRITE** des tokens + primitives ET ÉTEND avec palette éditoriale (`primaryLight`, `primaryDark`) + typo `mag-*`. **Aucune contradiction tokens, uniquement extension.**

---

## 10. Cascade des pages CRM

### 10.1 Pages SOURCES (figées, intouchables)

| Page | Archétype | Statut |
|---|---|---|
| `/prospection` | **workspace** | Page modèle figée S164+S165 |
| `/veille` | **editorial** | Gabarit magazine S132/S168 |

### 10.2 Pages CONSOMMATRICES

Héritent tokens + primitives + patterns archétype, identité propre figée à leur refonte.

| Page | Archétype consommé | Statut | Identité propre |
|---|---|---|---|
| `/dashboard` | mix workspace + spécifique | À refondre Bloc #1 cockpit actif | Layout synthèse 60s + TriageQueue + KPIs + alertes signaux |
| `/pipeline` | workspace | À refondre (priorité métier S170) | Drag prospects spécifique |
| `/contacts` | workspace | À refondre | - |
| `/entreprises` | workspace | À refondre | - |
| `/signaux` | workspace | À refondre | - |
| `/veille/themes` | workspace | Aligné S169, audit éclair | Admin taxonomie |
| `/veille/[id]`, `/veille/item/[slug]` | editorial | Conformes S132/S168 | Corps long-form |
| `/login` | spécial (palette éditoriale primary-dark) | Validé | Page hors flux app, ambiance premium |

### 10.3 Ordre d'attaque recommandé

1. **`/dashboard`** (Bloc #1 cockpit actif).
2. **`/pipeline`** (priorité métier drag prospects, S170 reco).
3. **`/contacts`**, **`/entreprises`**, **`/signaux`** (cascade workspace).
4. **`/veille/themes`** (déjà aligné S169, audit éclair).
5. **`/veille/[id]`** + **`/veille/item/[slug]`** (cascade editorial, audit éclair).
6. **`/login`** (audit séparé, palette éditoriale validée).

### 10.4 Règles cascade

1. **Toujours partir de** tokens.json + primitives.json + l'archétype mappé. Aucune autre source.
2. **Une page consommatrice peut emprunter PARTIELLEMENT** à l'archétype consommé ET développer son identité propre. Pas de copie aveugle qui dénature la nature du contenu.
3. **Comportement non couvert** : 90 % des cas = étendre la primitive ; 10 % = pattern composite spécifique à la page (documenté dans son code).
4. **Pas de divergence locale silencieuse.** Toute divergence documentée en commentaire de PR.
5. **Audit éclair par page avant cascade** : 5-10 min, identifier écarts critiques (a11y, sémantique, tokens, composants partagés).

---

## 11. Principes UI cardinaux

À appliquer en complément des sections § 1-10. Force prescriptive haute, ces principes prévalent en cas de conflit avec une décision composant ad-hoc.

### 11.1 Densité contrôlée

- 30-50 lignes lisibles d'un coup sur table workspace.
- Pas de pagination prématurée. Pas de scroll infinite.
- Si la page « manque de place », c'est qu'elle a trop de blocs. Réduire, pas compresser.

### 11.2 Hiérarchie verticale forte

- En haut de page = essentiel (H1, indicateurs, ScorePill, statut).
- En bas de page = profondeur (détail markdown, table dense, footer méta).
- L'utilisateur métier scanne le haut. S'il a besoin du fond, il scrolle. Pas l'inverse.

### 11.3 Statuts signifiants, pas décoratifs

- Maximum 3-4 états par axe de statut. Au-delà, fusionner.
- Toujours **couleur + libellé**. Jamais couleur seule (a11y + lecture rapide).
- Couleurs statuts cantonnées au § 2.5 (`success / warning / error / info`). Pas d'extension chromatique pour distinguer plus d'états : on regroupe ou on retire.

### 11.4 Pas de drag & drop pour les data tables

- Tables CRM (prospection, contacts, entreprises, signaux) **n'acceptent pas le drag & drop**. Édition via formulaires sobres + actions inline + slide-out détail.
- Exception : `/pipeline` (drag prospects entre colonnes statut), pattern dédié, hors workspace standard.

### 11.5 Édition via formulaires sobres + ConfirmModal destructive

- Toute action destructive (suppression, retrait, désactivation) **DOIT** passer par ConfirmModal (S164). Pas de `window.confirm()`.
- Tout import multi-source **DOIT** passer par ImportModal (S164, 3 parcours). Pas d'upload silencieux.
- Toute opération longue (≥ 2 secondes) **DOIT** afficher feedback (Toast / loading state). Pas de bouton qui « rien ne se passe ».

### 11.6 H1 unique par page + sémantique stricte

- 1 seul H1 par page. Hiérarchie sémantique stricte H2/H3/H4 (décision 4 v5).
- `axe-core` : 0 violation serious / critical en CI.
- Focus visible **global** : `outline 2px primary, offset 2px` sur tout élément interactif (boutons, links, inputs, `<tr>` cliquable).

### 11.7 Le chantier est l'unité de navigation (URL stable)

- Toute fiche entité a une URL stable, deep-linkable. Format : `/prospection/<id>`, `/contacts/<id>`, etc.
- Slide-out s'ouvre via clic ligne ou via URL `?lead=<id>` (deep-linkable, partageable).

---

## 12. Anti-patterns supplémentaires

Compléments à la table § 6.

| Banni | Pourquoi | À la place |
|---|---|---|
| **Charts Tableau / PowerBI / dashboards génériques** | Esthétique reporting corpo, hiérarchie typo molle | Indicateurs flat (§ archetype-workspace) + pas de viz V1 |
| **Notifications email auto** | Bruit, friction | Toast in-app + side pane Claude pour arbitrages |
| **Search bar globale** | Sidebar nav fixe + filtres URL params suffisent | Filtres workspace par page |
| **Édition in-browser type CMS léger** | Hors scope CRM interne | Édition via formulaires SvelteKit + actions Zod |
| **Tracking analytics tiers** | Vie privée + simplicité | Aucun tracker tiers en V1 |
| **Multi-langue** | Mono-tenant FR | Français uniquement V1 |
| **Modal de confirmation systématique non destructive** | Ralentit la navigation | Action directe + Toast feedback ; ConfirmModal **uniquement** destructive |
| **Avatar utilisateur fictif** | Pas de social CRM, pas de profil public | Initiales monochromes ou rien |
| **Overlays grisants intrusifs** | Coupe le contexte | SlideOut sans overlay grisant ; ConfirmModal **avec** overlay (justifié) |
| **Animation au scroll, parallax, fade-in** | Esthétique landing page, hors scope outil métier | Aucune animation décorative. Animations seulement sur interaction (hover button, slide-out open). |

---

## 13. Authentification - magic link

Le CRM utilise un **magic link** (lien envoyé par email), pas de mot de passe.

- **Page `/login`** : palette éditoriale `primary-dark` (`#0A1628`), ambiance premium. Page hors flux app validée.
- **Champ email** : input full-width, padding `14px 16px`, font-size `body 14px`, border `1px borderInput #D1D5DB`, focus ring `3px rgba(47,90,158,0.20)`.
- **Bouton primary** : `bg primary #2F5A9E`, color blanc, padding `14px 24px`, radius `10px`, hover `#264C85`.
- **Message « Lien envoyé »** : card sobre `bg-white border 1px border #E5E7EB`, copy : « Un lien de connexion a été envoyé à <email>. Vérifie ta boîte (et les spams). » Pas d'animation, pas d'icône décorative.
- **Page magic link expiré / invalide** : même layout, copy explicite (« Lien expiré, en demander un nouveau »), bouton secondaire vers `/login`.
- **Pas de mot de passe**, pas d'OAuth tiers, pas de fallback. **1 seul chemin auth.**

A11y :
- H1 unique « Connexion ».
- Label associé à l'input email (`<label for="email">`).
- Focus visible ring 2px primary sur input + bouton.
- Annonce statut envoi via `aria-live="polite"` après submit.

---

## 14. Décisions tranchées - audit 360 V3a-2 + V3b (S179-S180, 2026-05-12)

Findings UI demandant un arbitrage in-session (« aligner X **OU** mettre à jour la spec »). Décisions actées ici :

### 14.1 Hauteur des boutons d'action en pied de modal — `h-11` (44px), pas `h-10` (M-31)

Les boutons d'action principaux en pied de modal (`ModalForm`, `PipelineQuickAdvance`, `LeadExpress`, footers des pages pipeline / contacts / entreprises) restent en **`h-11` (44px)**, distincts des `h-10` (40px) de la barre d'outils workspace (§ 5.1). Raison : le pied de modal est une zone d'action confirmatoire souvent atteinte au pouce sur mobile → on respecte la cible tactile minimale WCAG 2.5.5 (44×44 CSS px). La barre d'outils workspace (`.ws-btn`) reste en `h-10` car elle vit en haut de page, hors zone de pouce, et la densité y prime. Pas de régression : c'est l'état actuel, on le grave.

### 14.2 Disque décoratif translucide du KPI vedette — conservé (M-42)

Le pseudo-élément `::before` 280×280 (et `::after` 180×180) du `.kpi-featured` (KpisBento) déborde volontairement du gabarit de la carte (`top/right: -64px`, `pointer-events: none`, `border-radius: 50%`). C'est un **aplat translucide** (`rgba(255,255,255,0.045)` / `0.025` sur fond `--color-primary-dark`), pas un gradient — il respecte donc l'interdiction § 6 (gradients bannis ; V2c H-25 a retiré le radial-gradient). On le **conserve** : il ajoute une profondeur subtile à l'unique carte sombre du bento sans bruit visuel. Tout autre élément décoratif hors gabarit reste interdit ailleurs.

### 14.3 Ligne de DataTable cliquable + descendants focusables — pattern conservé, contrainte gravée (M-47)

La ligne cliquable de `DataTable` (`<tr role="button" tabindex="0">` → ouvre le détail) est le pattern retenu (aligné Gmail / Linear / Notion). **Contrainte dure** : un `rowSnippet` ne doit JAMAIS imbriquer d'élément focusable (`<button>` / `<a>` / `<input>`) **autre que** la case à cocher de sélection — celle-ci vit dans un `<td>` qui stoppe la propagation `click` + `keydown`, donc l'activation de la ligne reste sans ambiguïté de tab-order. Les actions par ligne (éditer, désactiver…) se font soit dans le panneau de détail, soit sur une page **sans** `onRowClick` (la ligne n'est alors ni focusable ni `role=button` — cf. `/veille/themes`). Commentaire de rappel posé dans `DataTable.svelte` au niveau du `<tr>`.

### 14.4 Hauteur de la barre d'onglets de navigation — 48px (confortable) / 44px (compact), pas 40px (V3b L-23)

La primitive `Tabs.svelte` (§ 5.12) rend la **barre d'onglets** en `height: 48px` en variante `comfortable` (par défaut, `padding-x 32px`) et `height: 44px` en variante `compact` (`padding-x 24px`) — et non `h-10` (40px) comme le suggérait la note historique de § 5.12. Décision : la barre d'onglets est une zone de navigation tapée au doigt sur mobile/tablette ; 44px = cible tactile minimale HIG iOS / WCAG 2.5.5. Le `h-10` de § 5.12 reste valable pour le *bouton* d'onglet individuel hors barre (cas rare) ; pour la barre, c'est 48/44. Pas de régression : c'est l'état actuel post-V3a-2 (M-46), on le grave.

### 14.5 Courbe d'easing éditoriale — token `--ease-out-expo` (V3b I-01)

Toutes les transitions/animations « éditoriales » (fadeUp dashboard, hover des cartes bento, slide-out panels, cartes pipeline/signaux/entreprises, etc.) utilisent désormais le token `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)` défini dans `app.css` (`@theme`). Interdit de réintroduire la valeur littérale `cubic-bezier(0.16, 1, 0.3, 1)` en dur : référencer `var(--ease-out-expo)`. Une autre courbe peut être introduite comme nouveau token (ex. `--ease-in-out-quad`) si un besoin distinct apparaît, jamais en littéral inline.
