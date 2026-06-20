# DESIGN.md - Portail FilmPro (couche UI)

> Périmètre : ce document cadre uniquement la **couche d'enveloppe du portail** - la page
> d'accueil à cards (`PortailHome`) et le header qui chapeaute les outils (`PortailHeader`).
> Les pages internes du CRM existent déjà et ne sont **pas** redéfinies ici. Source de vérité
> visuelle : `golden-standard.html` (validé Pascal, 2026-06-01). Source de vérité des tokens :
> `theme-tokens.css`, lui-même extrait de `CRM/src/app.css` (`@theme`). Zéro nouveau token couleur.

---

## 1. Intention

Le portail est la **porte d'entrée** de FilmPro : l'écran qu'on voit en arrivant, avant de
plonger dans un outil. Il doit faire ressentir trois choses, dans cet ordre.

- **« Vos outils, au même endroit. »** Un point de départ unique, calme, qui range. On n'arrive
  pas dans un tableau de bord chargé : on arrive devant un choix clair et court (aujourd'hui 2
  cards, demain 3 ou 4). La densité d'information est volontairement basse.
- **Premium éditorial, pas tableau de bord SaaS.** Beaucoup d'espace blanc, une accroche centrée,
  des cartes posées sur un fond très légèrement teinté, des ombres douces et profondes (jamais
  plates). Le registre est celui d'une page de magazine bien composée, pas d'un back-office.
- **Ludique et plaisant, jamais Duolingo, jamais austère.** L'accent bleu FilmPro, le petit
  mouvement de la flèche au survol, le badge « Bientôt disponible » qui donne envie : ça respire
  la confiance et la qualité. On évite à la fois la froideur corporate et l'infantilisation
  colorée. Cible : 3 fondateurs FilmPro non-tech, qui doivent comprendre où aller en 2 secondes.

Contrainte métier : FilmPro = traitements pour vitrage (films et vernis), Suisse romande. Aucune
référence vidéo. Le footer le rappelle discrètement (« Traitements pour vitrage - Suisse romande »).

---

## 2. Composants sémantiques

Quatre composants, nommés par responsabilité. On décrit le rôle, les états, et les tokens réels
mobilisés - pas l'implémentation complète.

### `PortailHeader`

**Rôle** : enveloppe haute persistante du portail. Présente l'identité (logo) et l'accès au
compte. Sert aussi de **retour portail** : le logo est cliquable et ramène à la home (`/`).

**Structure** :
- Header `sticky` en haut (`top: 0`), hauteur ~72px, `z-index` élevé (au-dessus du contenu).
- Fond translucide blanc (`rgba(255,255,255,0.85)`) + `backdrop-filter: saturate(180%) blur(8px)`
  pour l'effet verre dépoli quand le contenu défile dessous. Bordure basse fine
  (`1px solid var(--color-border)`).
- Contenu contraint : `max-width: 1120px`, centré, `padding: 0 24px`, items répartis
  (`justify-content: space-between`).
- **Gauche** : logo FilmPro en SVG inline (vrai logo, pas un placeholder), `height: 44px`,
  `width: auto`. Le logo est un `<a href="/">` avec `aria-label` explicite (« Accueil portail
  FilmPro »).
- **Droite** (`header-right`, `gap: 16px`) : avatar à initiales + lien Déconnexion.

**Avatar (initiales)** : pastille ronde 32px, `border-radius: var(--radius-full)`, fond
`var(--color-primary-light)` (#F0F4F8), texte `var(--color-primary)` (#2F5A9E), initiales en
600, `font-size: 12px`, anneau interne discret (`inset 0 0 0 1px rgba(47,90,158,0.12)`).
Décoratif côté affichage (`aria-hidden`) si une étiquette texte accompagne ; sinon porter le nom.

**Déconnexion** : lien texte sobre, `var(--color-text-muted)` (#6B7280), 13.5px, qui fonce vers
`var(--color-text-body)` au survol. Focus visible obligatoire (voir §4).

**Tokens** : `--color-border`, `--color-primary`, `--color-primary-light`, `--color-text-muted`,
`--color-text-body`, `--radius-full`, `--color-logo` (#00003B, couleur du SVG logo), `--ease-out-expo`.

### `PortailHome`

**Rôle** : page d'accueil du portail. Compose l'accroche, le sous-titre, et la grille de cards.
C'est un écran **statique** (aucune donnée live au chantier 1).

**Structure** :
- `<main>` contraint `max-width: 960px`, centré, généreusement aéré
  (`padding: 64px 24px 48px`, réduit à ~44px en haut sous 420px).
- Bloc d'accueil centré (`welcome`) : `<h1>` accroche + `<p>` sous-titre.
- Grille de cards (`ToolCardGrid`).
- Footer signature FilmPro en bas, centré, `var(--color-text-muted)`, 12.5px.

**Contenu de référence (golden, à respecter)** :
- Accroche : « Bonjour, par où commencer ? »
- Sous-titre : « Vos outils FilmPro, au même endroit. »
- Footer : « FilmPro - Traitements pour vitrage - Suisse romande »

**Tokens** : `--color-text` (titre), `--color-text-muted` (sous-titre / footer), `--font-sans`.

### `ToolCard`

**Rôle** : carte d'un outil du portail. C'est le composant central et le seul qui porte une
machine à états. **Props conceptuelles** : `titre`, `sous-titre`, `icône` (slot SVG ligne),
`href`, `state` (`active` | `soon`).

Tronc commun (toutes cartes) : conteneur en colonne, `background: var(--color-surface)` (#FFFFFF),
`border-radius: var(--radius-2xl)` (16px), `box-shadow: var(--shadow-card)`, `padding: 24px`,
`min-height: ~196px`. Une pastille d'icône en haut, un titre, un sous-titre, et (état actif) un
CTA poussé en bas (`margin-top: auto`).

**Pastille d'icône (`icon-tile`)** : carré 44px, `border-radius: 12px` (`--radius-xl`), icône
ligne 24px centrée (stroke 1.75, style Lucide). Deux variantes :
- `active` : fond `var(--color-primary-light)`, icône `var(--color-primary)`.
- `muted` (état soon) : fond `var(--color-surface-alt)`, icône `var(--color-text-muted)`,
  anneau interne `inset 0 0 0 1px var(--color-border)`.

**État `active`** (carte = lien navigant) :
- Le composant est rendu comme un **vrai `<a href>`** (navigable clavier + lecteur d'écran).
- Curseur `pointer`. CTA en bas : « Ouvrir l'outil » + flèche, en `var(--color-primary)`, 600, 14px.
- Survol : `transform: translateY(-3px)` + `box-shadow: var(--shadow-card-hover)` complété d'un
  anneau bleu (`--ring-active`, `0 0 0 1px rgba(47,90,158,0.16)`). La flèche du CTA glisse de +4px
  (`translateX(4px)`). Transition `--ease-out-expo`, ~250ms.
- Appui (`:active`) : lift réduit à `translateY(-1px)` (feedback tactile).
- Focus visible : `outline: 2px solid var(--color-primary)`, `outline-offset: 3px`.

**État `soon`** (carte atténuée, non navigante) :
- Rendue comme un conteneur **non interactif** (`<div>` ou `<a>` neutralisé), `aria-disabled="true"`,
  `cursor: not-allowed`, opacité globale ~0.72.
- Badge « Bientôt disponible » en haut à droite (voir hiérarchie typo §3) :
  `var(--color-info)` sur `var(--color-info-light)`, pilule `var(--radius-full)`.
- Pas de CTA, pas de lift au survol, pas de focus link. Le sous-titre passe en
  `var(--color-text-muted)`.

**Référence golden** : card 1 = CRM (`active`, `href="/crm"`, icône deux barres = signal /
pipeline, sous-titre « Prospection, pipeline, signaux, veille sectorielle. »). Card 2 = Devis
(`soon`, icône document, sous-titre « Chiffrez un traitement de vitrage en quelques clics. »).

**Tokens** : `--color-surface`, `--color-surface-alt`, `--radius-2xl`, `--radius-xl`,
`--shadow-card`, `--shadow-card-hover`, `--ring-active` (via app.css), `--color-primary`,
`--color-primary-light`, `--color-info`, `--color-info-light`, `--color-text`, `--color-text-body`,
`--color-text-muted`, `--color-border`, `--radius-full`, `--ease-out-expo`.

### `ToolCardGrid`

**Rôle** : grille responsive qui dispose les `ToolCard`. Aucun état propre, pure mise en page.

**Comportement** :
- `display: grid`, `gap: 24px`.
- **≥ 720px** : 2 colonnes (`grid-template-columns: 1fr 1fr`).
- **< 720px** : 1 colonne (`grid-template-columns: 1fr`).
- Les cartes s'étirent en hauteur de façon homogène (le CTA reste collé en bas via
  `margin-top: auto` côté `ToolCard`), ce qui garde un rythme régulier même avec des sous-titres
  de longueurs différentes.

**Tokens** : aucun token couleur. Espacement via l'échelle (gap 24px = palier standard du projet).

---

## 3. Hiérarchie typographique sémantique

Police unique : **DM Sans** (`--font-sans`), antialiasée. DM Mono est réservé à des usages
techniques (n'apparaît pas dans la home portail, sauf bandeau golden non déployable).

| Niveau sémantique | Usage | Taille | Poids | Couleur (token) | Notes |
|---|---|---|---|---|---|
| **Accroche** | `<h1>` « Bonjour, par où commencer ? » | 30px (25px < 420px) | 600 | `--color-text` (#111827) | `letter-spacing: -0.025em`, `line-height: 1.2`, centré |
| **Sous-titre home** | `<p>` sous l'accroche | 16px | 400 | `--color-text-muted` (#6B7280) | `margin-top: 10px`, centré |
| **Titre de card** | `<h2>` « CRM », « Devis » | 20px | 600 | `--color-text` (#111827) | `letter-spacing: -0.01em` |
| **Sous-titre de card** | description de l'outil | 14.5px | 400 | `--color-text-body` (#374151) ; `--color-text-muted` si `soon` | `line-height: 1.5` |
| **CTA card** | « Ouvrir l'outil » | 14px | 600 | `--color-primary` (#2F5A9E) | actif uniquement |
| **Badge** | « Bientôt disponible » | 11.5px | 500 | `--color-info` (#5A7190) sur `--color-info-light` | `letter-spacing: 0.01em` |
| **Lien header** | « Déconnexion » | 13.5px | 400 | `--color-text-muted` → `--color-text-body` au survol | |
| **Avatar** | initiales | 12px | 600 | `--color-primary` | `letter-spacing: 0.02em` |
| **Footer** | signature FilmPro | 12.5px | 400 | `--color-text-muted` | centré |

Principe : le contraste de hiérarchie passe d'abord par la **taille + le poids + la couleur de
texte** (titre foncé / corps gris moyen / muet gris clair), jamais par des effets décoratifs.
Les négatifs de `letter-spacing` sur les gros titres donnent le grain éditorial.

---

## 4. Patterns d'interaction

- **Hover lift (card active uniquement)** : `translateY(-3px)` + passage de `--shadow-card` à
  `--shadow-card-hover` + anneau bleu `--ring-active`. La flèche du CTA glisse de +4px en parallèle.
  Donne l'impression que la carte « se soulève vers la main ».
- **Appui** : `translateY(-1px)` sur `:active` (la carte redescend légèrement, feedback physique).
- **Focus visible (clavier)** : `outline: 2px solid var(--color-primary)` + `outline-offset: 3px`
  sur tout élément focusable (card active, lien Déconnexion, logo). Jamais de `outline: none` sans
  remplacement visible.
- **Transition** : `--ease-out-expo` (`cubic-bezier(0.16, 1, 0.3, 1)`), durée ~250ms (`--dur`).
  Courbe qui démarre vite puis décélère longuement = sensation premium, pas mécanique.
- **État `soon` non interactif** : aucun lift, aucun curseur pointer, aucun focus de lien. La
  carte est inerte au survol comme au clavier. L'atténuation (opacity 0.72) + le badge portent le
  message « pas encore là ».
- **Retour portail** : un seul chemin évident - cliquer le logo dans `PortailHeader` ramène à `/`.
  Pas de fil d'Ariane, pas de bouton « retour » séparé (le portail est plat : home → outil).
- **Réduction de mouvement** : respecter `prefers-reduced-motion: reduce` (neutraliser
  `transform`/`transition` du lift et du glissement de flèche). À implémenter même si absent du
  golden, c'est une exigence d'accessibilité du projet.

---

## 5. Accessibilité

- **Card active = vrai `<a>`** : focusable au clavier, annoncé comme lien par les lecteurs
  d'écran, activable Entrée/Espace nativement. `aria-label` riche qui décrit la destination
  (golden : « Ouvrir le CRM : prospection, pipeline, signaux, veille sectorielle »).
- **Card soon = non focusable comme lien** : `aria-disabled="true"`, pas dans l'ordre de
  tabulation, pas de rôle lien. L'`aria-label` annonce explicitement l'indisponibilité (« Devis :
  bientôt disponible »). Le badge texte « Bientôt disponible » est lisible, pas seulement une
  couleur - l'information n'est jamais portée par la couleur seule.
- **Contraste AA** : tous les couples texte/fond respectent WCAG AA 4.5:1 pour le texte courant.
  Points à valider en pipeline (axe-core, gate a11y du projet) : badge `--color-info` (#5A7190)
  sur `--color-info-light` (#EDF1F5), et sous-titre `--color-text-muted` (#6B7280) sur surface
  blanche. Si un couple passe sous 4.5:1, basculer sur une variante `--deep` testée (doctrine
  projet `feedback_a11y_deep_tokens_with_axe_gate.md`), jamais un commentaire « contraste OK » non
  prouvé.
- **Icônes décoratives** : les SVG d'icône et la flèche du CTA sont `aria-hidden="true"` (le sens
  est porté par le titre + le label du lien, l'icône ne doit pas être lue deux fois).
- **Cible tactile** : la zone cliquable de la card active couvre toute la carte (`min-height`
  ~196px), bien au-dessus du minimum 44px.
- **Logo** : `role="img"` + `aria-label="FilmPro"` sur le SVG ; le lien parent porte le label de
  navigation (« Accueil portail FilmPro »).

---

## 6. États (empty / loading / erreur)

**Non applicables au chantier 1.** La home portail est **statique** : la liste des outils et leur
état (`active` / `soon`) sont définis dans le code, pas chargés depuis une source de données. Il
n'y a donc :

- pas d'état **loading** (rien à attendre, le rendu est immédiat) ;
- pas d'état **empty** (la grille a toujours au moins les cartes codées en dur) ;
- pas d'état **erreur** de chargement (aucun appel réseau pour peupler la home).

Le seul « état » modélisé est l'état **par card** (`active` vs `soon`), décrit en §2. Si un futur
chantier rend la liste des outils dynamique (droits par utilisateur, activation progressive), il
faudra alors spécifier loading/empty/erreur - hors périmètre ici, à noter explicitement.

---

## 7. Anti-generic - ce qu'on évite

- **Pas de card Bootstrap générique** : pas de bordure 1px grise uniforme tout autour, pas de
  header coloré plein, pas de `box-shadow` plat type `0 2px 4px`. L'ombre du projet est
  multi-couche et profonde (`--shadow-card`), elle donne du poids sans tapage.
- **Pas d'ombre plate uniforme** : on utilise le couple `--shadow-card` / `--shadow-card-hover`
  (déjà calibré dans app.css), qui combine un liseré très fin + une ombre portée diffuse. Jamais
  une ombre unique dure.
- **Pas d'icônes décoratives gratuites** : chaque icône a un sens (signal/pipeline pour le CRM,
  document pour le Devis), en trait fin Lucide (stroke 1.75), cohérent avec le CRM. Pas
  d'illustration 3D, pas d'emoji, pas de pictos colorés hors charte.
- **Pas de dégradés criards** : le seul dégradé est le fond de page, un `radial-gradient` très
  subtil blanc → `--color-surface-alt` qui crée une lumière douce en haut de l'écran. Aucun
  dégradé sur les boutons, les cards ou les badges.
- **Pas de couleur hors tokens** : tout vient de `theme-tokens.css` (= app.css). Aucune valeur
  hexadécimale en dur, aucun palier de spacing off-grid (`p-[13px]` interdit, doctrine projet).

**Piste de détail signature (non imposée)** : le logo FilmPro porte un motif de **trois carrés en
cascade diagonale** (opacités 0.24 / 0.62 / 1, dans le SVG). Ce motif pourrait inspirer un détail
discret du portail - par exemple un filigrane très léger en coin de page, ou un micro-accent dans
l'état vide d'un futur outil. À considérer comme une **piste**, pas une exigence : ne l'ajouter
que s'il renforce sans charger, et toujours en respectant la sobriété (faible opacité, jamais au
premier plan). Le golden validé n'en contient pas : ne pas l'introduire sans validation Pascal.

---

## 8. Mapping vers l'implémentation (doctrine projet)

Doctrine CRM (tranchée S180) : **Tailwind utilities pour le détail réutilisable** (spacing/couleurs
via tokens, typo, états triviaux), **`<style>` scoped Svelte pour le layout structurel**
(header/grille, keyframes/transitions, pseudo-éléments), **primitives = source unique qu'on compose**.

### Répartition recommandée

| Élément | Implémentation | Pourquoi |
|---|---|---|
| **`PortailHeader`** (sticky, backdrop-blur, max-width, répartition) | `<style>` scoped Svelte | Layout structurel + `backdrop-filter` + sticky = exactement le cas « CSS scoped pour le structurel » de la doctrine |
| **`ToolCardGrid`** (grid 2↔1 colonnes au breakpoint 720px) | `<style>` scoped Svelte (media query) | Le responsive de layout passe par CSS scoped, pas par `md:*` Tailwind v4 (cf. décision structurelle CRM) |
| **`ToolCard`** (tronc carte, lift, ring, transition flèche) | `<style>` scoped Svelte pour les transitions/hover/`:active`/pseudo-état ; détail (padding, typo, couleurs de texte) via utilities Tailwind sur tokens | Le mouvement et les états visuels sont du structurel ; le détail réutilisable reste en utilities |
| **Avatar, badge, CTA, liens** | utilities Tailwind sur tokens + classes scoped si pseudo-état | Détail réutilisable trivial |
| **Bouton/lien actif** | composer la **primitive existante** si elle couvre le besoin (CTA = lien, pas bouton form) ; sinon styler le `<a>` directement | Ne pas dupliquer une primitive ; le CTA « Ouvrir l'outil » est un lien stylé, pas un `Button` |

`ToolCard` n'est pas une primitive générique de plus : c'est un composant **portail** spécifique
(deux états métier `active`/`soon`). Il **compose** les tokens et, si pertinent, réutilise les
primitives existantes pour ses sous-parties - il ne les redéfinit pas.

### Emplacement des fichiers (suggestion)

```
src/lib/components/portail/
├── PortailHeader.svelte     # header sticky + logo (retour /) + avatar + déconnexion
├── ToolCard.svelte          # carte outil, props { titre, sousTitre, icone, href, state }
├── ToolCardGrid.svelte      # grille responsive 2↔1
└── (logo)                   # SVG FilmPro inline dans PortailHeader, ou composant Logo.svelte dédié
```

La page d'accueil elle-même (`PortailHome`) vit dans le routing SvelteKit (ex. `src/routes/+page.svelte`
ou le route group du portail), et **compose** `PortailHeader` + l'accroche + `ToolCardGrid`
contenant les `ToolCard`. Les tokens sont déjà disponibles globalement via `app.css` (`@theme`) :
aucun import de `theme-tokens.css` en prod, ce fichier reste un extrait de référence pour le golden.

### Garde-fous d'implémentation

- Zéro nouveau token couleur (décision cadrage D). Si un besoin émerge, le mapper sur un token
  existant ou remonter à Pascal.
- `prefers-reduced-motion` à câbler sur les transitions (non présent dans le golden, exigence a11y).
- Card active = `<a>` réel ; card soon = conteneur `aria-disabled`, hors tab order (cf. §5).
- Tester en **preview branch Vercel**, pas seulement en `vite preview` : le sticky/backdrop et tout
  code touchant `window` peuvent diverger (cf. `feedback_svelte5_ondestroy_ssr_window_undefined.md`).
- Gate a11y axe-core AA avant livrable (doctrine projet).
