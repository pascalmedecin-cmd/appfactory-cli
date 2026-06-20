# DESIGN.md - Refonte mobile CRM FilmPro

Système de design mobile sémantique. Anti-generic UI, naming conventions, composants réutilisés/créés, patterns d'interaction. Hérite des tokens projet (`src/lib/design/tokens.css`) et du golden v9.

## Principes directeurs

1. **Mobile = task-first**. Une page mobile expose 2-3 actions clés. Le reste est masqué ou repoussé en SlideOut.
2. **Cards > Tables**. Toute donnée tabulaire en desktop devient grille de cartes en mobile (< 1024px).
3. **Tap targets >= 44x44 CSS pixels**. Norme Apple HIG + WCAG AA. Utility `min-w-[44px] min-h-[44px]` obligatoire.
4. **Aucune divergence tokens**. Couleurs, fonts, spacing : tous puisés dans `src/lib/design/tokens.css`. Pas de hex inline.
5. **Animations transform-only**. Pas d'animation sur `height` ou `width` (jank + CLS). `transform: translateY/scaleY` + `opacity`.
6. **Safe area iOS**. `env(safe-area-inset-bottom)` sur FAB et SlideOut. `env(safe-area-inset-top)` sur sidebar burger.

## Breakpoints

Un seul breakpoint mobile : `(max-width: 1023.98px)`. Strict, pas de cascade Tailwind `md:` / `lg:` mélangée.

```css
/* CSS scoped Svelte */
@media (max-width: 1023.98px) {
  /* mobile rules */
}
```

Pour Tailwind utilities : utiliser `max-lg:` (Tailwind v4 supporte les variants `max-*`).

## Composants

### MobileEntityCard (nouveau)

Path : `src/lib/components/mobile/MobileEntityCard.svelte`

Carte universelle pour Prospection / Contacts / Entreprises / Signaux en mobile.

```typescript
interface MobileEntityCardProps {
  title: string;           // ex: "YPERIA OIKEN"
  subtitle?: string;       // ex: "Genève - Tertiaire"
  badges?: Array<{
    label: string;
    variant: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  }>;
  scorePill?: {
    score: number;
    label: 'chaud' | 'tiède' | 'froid' | 'unscored';
  };
  actions?: Array<{
    icon: string;          // Lucide icon name
    label: string;         // a11y label
    href?: string;         // tel:, mailto:, route
    onClick?: () => void;
  }>;
  onTap: () => void;       // ouvre SlideOut détail
}
```

Layout (mobile) :
- Container : `padding: 16px`, `gap: 12px`, `border-radius: 12px`, `background: var(--color-card)`, `box-shadow: var(--shadow-card)`.
- Bandeau dominant 3px optionnel (réutilise `data-dominant=coeur|bonus|eviter|neutral` du pattern Signaux V4).
- Header : titre `font-weight: 600; font-size: 16px; line-height: 1.3`, score pill à droite.
- Sous-titre : `font-size: 14px; color: var(--color-text-muted); margin-top: 4px`.
- Badges : flex wrap, gap 6px, marge top 8px.
- Actions footer : flex row, gap 12px, marge top 12px, chaque action `min-w-[44px] min-h-[44px]`.
- Tap area : toute la carte (sauf zone actions footer) déclenche `onTap` (event delegation via wrapper button).

État : hover/focus visible (`outline: 2px solid var(--color-primary); outline-offset: 2px`).

### PipelineMobileAccordion (nouveau)

Path : `src/lib/components/pipeline/PipelineMobileAccordion.svelte`

Accordéon des 6 étapes pipeline en mobile.

```typescript
interface PipelineMobileAccordionProps {
  etapes: Array<{
    key: string;
    label: string;
    icon: string;
    opportunites: Array<Opportunite>;
    montantTotal: number;
  }>;
  onOppTap: (opp: Opportunite) => void;
}
```

Layout :
- Chaque étape : header `<button>` (tap target full width, min-h 56px), corps `<div role="region">`.
- Header contient : icône Lucide, label étape, count opps badge, somme CHF formatée, chevron rotate selon état.
- Corps : grille cards opps 1 col, `padding: 12px 0`, séparées par `border-top: 1px solid var(--color-border-soft)`.
- Animation expand : `transform: scaleY(0/1)` + `opacity` 200ms ease-out-expo, `transform-origin: top`. Pas de `height: 0/auto`.
- Header active : `aria-expanded="true|false"`, `aria-controls="etape-<key>-region"`.
- Clavier : Enter / Space toggle, Tab navigue header par header.

État vide : étape sans opp affiche message « Aucune opportunité dans cette étape ».

### ReportingMobile (modifié)

Path : `src/routes/(app)/reporting/+page.svelte`

En mobile, masquer `<ReportingPipelineTable />` et les CTA Export. Garder Indicators + Charts + ActivityCards.

```svelte
{#if !isMobile}
  <ReportingPipelineTable {data} />
  <ReportingExportCSV />
{/if}
```

`isMobile` derived from `$app/stores` page width via media query observer ou directement via CSS `@media (max-width: 1023.98px) { .desktop-only { display: none; } }`.

### Pattern « Encart desktop-only »

Déjà acté sur page Log (S185). Réutiliser le même composant `<DesktopOnlyBanner>` si nécessaire pour ReportingPipelineTable.

```svelte
<div class="desktop-only-banner">
  <Icon name="desktop_windows" size={48} />
  <h3>Cette section est optimisée pour ordinateur</h3>
  <p>Ouvrez le CRM depuis un ordinateur pour accéder à ce tableau.</p>
</div>
```

## Patterns d'interaction

### Sidebar burger

Conservée telle quelle. Tap burger -> drawer slide-in left. Tap lien -> drawer ferme auto + navigate.

Ajustement V1 (issue S183 résiduelle) : confirmer que le drawer ferme bien après tap link (test Playwright à ajouter en Phase 4).

### FAB Lead express

Conservé tel quel. Visible mobile uniquement sur Dashboard. Position fixed bottom-right, padding `env(safe-area-inset-bottom)`.

### SlideOut

Déjà responsive (`width: 100%` mobile, `560px` desktop). Pas de modification.

### ModalForm

Déjà responsive (bottom sheet mobile, center modal desktop). Pas de modification.

### Tabs

Déjà responsive (scroll horizontal si overflow). Pas de modification.

### Données « état vide »

Tous les écrans data-dependent (cards Prospection vide, accordéon Pipeline étape vide, Contacts vide, Entreprises vide, Reporting sans data) DOIVENT avoir un empty state explicite avec icône Lucide neutre + message clair en 1 phrase + CTA action si applicable.

Convention message : « Aucun(e) <entité> <contexte>. <CTA action>. »

Exemple : « Aucun prospect dans cette catégorie. Créez votre première fiche terrain. » + bouton « Lead express ».

### Données « état loading »

Skeletons rectangle avec animation pulse (`animation: pulse 1.5s ease-in-out infinite`) sur cards en attendant data fetch. 3-5 skeletons selon hauteur viewport.

### Erreurs réseau

Banner top de page rouge sang : « Connexion impossible. Vérifiez votre réseau. » + bouton « Réessayer » (déclenche refetch).

## Tokens utilisés (sans modification)

| Token | Usage |
|---|---|
| `--color-primary` | Boutons CTA, focus ring, accordéon header active |
| `--color-card` | Background MobileEntityCard, PipelineMobileAccordion |
| `--color-border-soft` | Séparateurs internes |
| `--color-text-muted` | Sous-titres cards, labels secondaires |
| `--color-success` / `--color-warning` / `--color-danger` | Badges variants |
| `--shadow-card` | Box-shadow MobileEntityCard |
| `--shadow-card-hover` | Hover/focus MobileEntityCard |
| `--ease-out-expo` | Toutes animations transform |
| `--radius-card` | Border-radius cards |

## Naming conventions

- Composants mobile-only : `src/lib/components/mobile/<Name>.svelte`.
- Composants partagés modifiés (ajout variant mobile) : path inchangé, ajout prop optionnelle `variant: 'desktop' | 'mobile'` par défaut auto-détecté.
- Classes CSS mobile : préfixe `.mobile-*` ou wrap dans `@media (max-width: 1023.98px)`.
- Variables Svelte mobile : préfixe `mobile`, ex: `mobileOpen`, `isMobileViewport`.

## Anti-patterns interdits

- `display: none` sans `aria-hidden` (lecteur écran lit quand même).
- Animations `height: 0 / auto` (jank + CLS).
- Hex inline `#FF0000` (pas dans tokens).
- Tap target < 44x44 (a11y AA).
- Scroll horizontal sur viewport < 1024px (objectif livraison).
- Table HTML dans pages MOBILE-ESSENTIEL en viewport < 1024px (objectif livraison).
- Skeletons avec `width: 100%` sans `max-width` (déborde sur mobile petit).
- Modal centré desktop sans bottom sheet mobile (UX iOS dégradée).

## Référentiel visuel

Golden v9 (`~/.claude/goldens/audit-uiux-golden-v9-2026-05-06.json`) reste la source de vérité visuelle CRM. La refonte mobile suit ses tokens et composants existants ; aucune divergence stylistique nouvelle introduite.
