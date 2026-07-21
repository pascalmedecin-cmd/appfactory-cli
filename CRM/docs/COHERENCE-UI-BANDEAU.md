# Cohérence UI - Bandeau de page (spec d'implémentation)

**Statut : mockup validé par Pascal le 2026-07-16.** Direction retenue, prête à coder.
Mockup de référence (gitignoré) : `.atelier-209/coherence-ui/bandeau-mockup.html`.
Benchmark : le `PageHeader` de l'app Gouvernance (`~/Claude/Projets/Gouvernance/components/PageHeader.tsx`).
Principe directeur : on prend la **discipline de structure** de Gouvernance, jamais sa peau. → [[feedback_gouvernance_benchmark_layout_lisibilite]].

## Décisions validées (Pascal, 16/07)

1. **Direction : bandeau in-page + barre du haut allégée.** Chaque page reçoit un bandeau (icône + sur-titre + nom + description) en tête du contenu ; le `Header` fixe du haut ne garde que la pastille marque, le filet d'accent, le compte utilisateur et le burger mobile. Le titre ne vit plus qu'à un seul endroit (fin du double-titre).
2. **Description sur UNE ligne, toujours.** Jamais de retour à la ligne. Desktop = phrase complète ; sous 768px, une variante courte prend le relais (pattern `subtitleMobile` de Gouvernance). Garde-fou CSS : `white-space: nowrap; text-overflow: ellipsis`. Si un texte déborde, il est trop long : le raccourcir.
3. **Pastille compteur partout.** Le compteur live (« 8 entreprises ») migre du sous-titre du `Header` vers une pastille à droite du bandeau, sur toutes les pages - même quand un KPI répète le total (doublon assumé, cohérence prioritaire).
4. **Textes = première base à affiner ensemble**, page par page, au fil de l'implémentation.

## Le composant `PageBand.svelte` (à créer)

En-tête **purement typographique** : filet de séparation en bas, **jamais de carte** (ni fond, ni ombre, ni bordure fermée). La hiérarchie vient du poids du titre, pas d'un conteneur décoré.

Props : `{ icon, eyebrow, title, desc, descMobile?, count?, actions? (snippet) }`.

Structure (grille, pas flex - c'est la clé de l'alignement icône↔titre) :

```
header.pband (.pband--icon si icon)
  div.pband__bar            flex, space-between, align-items:flex-end, flex-wrap
    div.pband__heading      GRID 2 cols : [auto icône] [minmax(0,1fr) texte]
      span.pband__icon      grid-col 1, grid-row 2 (rangée du titre), align-self:center
      p.pband__eyebrow      grid-col 2, grid-row 1 - MAJUSCULES, 11px, ls 0.08em, couleur = var(--color-primary)
      h1.pband__title       grid-col 2, grid-row 2 - Inter 700, ~30px, ls -0.022em, lh 1.1
    div.pband__aside        pastille compteur + actions (boutons), align droite
  p.pband__desc             hors barre, indentée margin-left:calc(icon+gap), UNE ligne
```

Points de discipline (repris de Gouvernance, cf. mockup § « La discipline ») :
- Icône = set d'icônes du CRM (pas d'emoji, pas de nouvelle dépendance Phosphor), couleur `--color-text-muted` (grise, jamais l'accent), calée sur le **centre optique du titre** (grid-row du h1 + `align-self:center`), pas sur le centre du bloc entier.
- `--pb-icon-size` 44px / `--pb-icon-gap` 16px (resserrés en mobile), l'indent de la description suit le même `calc`.
- Sur-titre à la **couleur de marque** (`--color-primary` : bleu FilmPro / magenta LED), jamais l'orange de Gouvernance.
- Filet `border-bottom: 1px var(--color-border)`, `padding-bottom 16px`, `margin-bottom ~22px`.

## Peau Atelier 209 (préservée, NON négociable)

Tokens réels du CRM (`src/app.css`), re-teintés par `data-marque` : bleu FilmPro `#2F5A9E` (défaut, zéro override) / magenta LED `#c6007e`. Police **Inter** (voix unique, ne pas réintroduire une autre police). Ombres/rayons Untitled UI. Chrome sombre sidebar navy/bleu nuit. Le mockup prouve le re-teintage complet en bascule FilmPro↔LED. Détail : sortie du workflow `coherence-ui-bandeau-understand`.

## Résolution du double-titre (déjà cadrée dans le code)

Le `Header` fixe (`src/lib/components/Header.svelte`) affiche aujourd'hui `pageTitle` (label de nav, calculé dans `+layout.svelte`) + `$pageSubtitle`. Réintroduire un titre in-page dupliquerait le nom (la page Campagnes documente ce retrait, `+page.svelte:531-536`).

Résolution : **le bandeau in-page devient l'unique foyer du titre.** Sur les pages dotées du bandeau, gater `pageTitle`/`$pageSubtitle` du `Header` (le `{#if pageTitle}` conditionnel existe déjà) ; le `Header` ne garde que pastille marque + filet + email + burger. Le compteur `$pageSubtitle` se déplace dans la pastille du bandeau.

## Feature flag

Nouveau flag JWT par-user (même mécanique que `ff_crm_listes_v2`, cf. `src/lib/types/feature-flags.ts`), ex. `ff_page_bandeau`. OFF = rendu actuel strict (zéro régression). ON = bandeau + `Header` allégé. Bascule réversible, testable en local via mint premium.

## Copy (première base à affiner - décision 4)

Sur-titre imagé (MAJUSCULES, accents inclus) + description factuelle une ligne, ton « Heure bleue » (sobre, clin d'œil discret, registre FilmPro : vitrage/prospection, jamais vidéo).

| Page | Sur-titre | Description (desktop, 1 ligne) | Variante mobile |
|---|---|---|---|
| Tableau de bord | La vue d'ensemble | Ce qui compte aujourd'hui, en un coup d'œil. | (idem) |
| Contacts | Les interlocuteurs | Les bonnes personnes chez vos prospects : qui décide, qui rappeler. | Qui décide, qui rappeler. |
| Entreprises | Le répertoire | Toutes les sociétés repérées, qualifiées ou à qualifier. | Repérées, qualifiées, à qualifier. |
| Pipeline | Les affaires | De la première piste au devis signé, où en est chaque opportunité. | De la piste au devis signé. |
| Prospection | Le terrain | Les entreprises à contacter, triées par potentiel. | Triées par potentiel. |
| Campagnes | Les actions | Regrouper les prospects par action commerciale. | Grouper par action commerciale. |
| Signaux | Le radar | Ce qui bouge sur le marché du vitrage : chantiers, permis, appels d'offres. | Chantiers, permis, appels d'offres. |
| Veille | L'hebdo | La revue de la semaine sur le marché du vitrage. | La revue de la semaine. |
| Reporting | Les chiffres | Métriques d'activité et de pipeline. | (idem) |
| Aide | Le mode d'emploi | Comment l'outil marche, section par section. | Section par section. |

## Increments d'implémentation

1. **[LIVRÉ 2026-07-16]** Composant + flag + 1 page témoin (Entreprises) derrière `ff_page_bandeau`. QA avant/après.
2. **[LIVRÉ 2026-07-17]** Pages liste **calques exacts** du pattern Entreprises : **Contacts, Pipeline, Signaux, Campagnes**. QA par page verte (svelte-check 0/0, Vitest 2824, build OK, revue adversariale 5 dims 0 finding, avant/après vraie vue : 4 pages ON = 1 seul h1 + copy/icône/pastille corrects, mobile desc→variante OK, OFF = bandeau absent + ws-page-actions/FAB présents). Commit `5e0eea3`.
   - **Prospection SORTIE de cet increment** : sa mise en page est dense et **ancrée à la hauteur du viewport** (`md:h-[calc(100dvh-var(--header-height)-3rem)]`) ; y insérer le bandeau mange ce calc et déplace la table. → traité à l'increment 3 (décision design), pas un drop-in mécanique.
3. **[LIVRÉ 2026-07-17 - 5/5]** Pages à en-tête bespoke. **Décision Pascal 2026-07-17** : uniformité. **Reporting, Aide, Dashboard, Prospection** alignés sur le bandeau standard (commit `b4fe644`, derrière `ff_page_bandeau` OFF) :
   - **Reporting** : hero → PageBand (drop-in propre).
   - **Aide** : `.aide-head` (titre = niveau dynamique) → PageBand statique « Aide » ; le niveau actif reste porté par les onglets. `let { data }` ajouté (absent avant).
   - **Prospection** : PageBand en tête du conteneur `100dvh` (wrap `shrink-0`, la table absorbe le reste) + pastille `totalLeads`. Layout préservé (QA visuelle OK).
   - **Dashboard** : PageBand « Tableau de bord » **au-dessus** du greeting (seul cas d'ajout, pas de remplacement). En **vue premium** (celle des fondateurs) le bandeau 30px domine le greeting 24px → hiérarchie correcte ; revue adversariale : 1 low subjectif (stacking), non bloquant. **Option ouverte** : alléger le greeting quand le bandeau est ON si Pascal le souhaite.
   - **Veille** = **LIVRÉ 2026-07-17** (mockup validé Pascal, commit `e60f1b6`). Traitement particulier : le masthead magazine « Filtrer l'essentiel » est remplacé (ON) par le bandeau standard (icône radar, « L'hebdo / Veille », pastille éditions, bouton Éditeur), **la peau magazine (couvertures navy, synthèse, à retenir, archives) est conservée dessous**. Nouveau prop `PageBand flush` (gouttière horizontale 0) : Veille porte déjà ses marges (`max-w-[1280px] px-10`), le bandeau s'aligne pile sur le contenu (géré desktop + mobile). Additif, défaut inchangé pour les 9 autres pages.
   - Pages détail (`[id]`) : hors copy validée, non couvertes.
4. **[LIVRÉ - mécanisme générique + a11y vérifié sur les 10 pages]** Bascule du `Header` : le gate `pageTitle`/`$pageSubtitle` est **automatique par route** via `isBandeauActive(data.featureFlags, page.url.pathname)` dans `+layout.svelte` (`Header.hideTitle`). Ajouter une route à `BANDEAU_ROUTES` gate le Header pour cette route sans autre code. Audit a11y (un seul `h1`) : **vérifié sur les 10 pages migrées** - preuve navigateur, 1 seul `h1` (celui du bandeau) sur chaque. **Reste optionnel** : allègement du greeting Dashboard (Pascal : laisser tel quel pour l'instant).

## Convention « kicker / sur-titre de section » = 12px (Pascal 2026-07-17)

Le petit label majuscule qui introduit une section/un bloc (« ce type de titre ») est uniformisé à **12px** pour la lisibilité, sur 3 familles : `pband__eyebrow` (sur-titre du bandeau), `mag-kicker` (kickers Veille : masthead, à la une, synthèse, à retenir…) et les labels de section inline des panneaux (déjà à 12px `text-xs` pour la plupart ; l'écart `SourceSelector` 10px corrigé). Les **badges/pilules** (statuts, « Nouveau », segments) ne sont **pas** ce type de titre → inchangés. Commit `d51fd31`.

## QA (directive permanente Pascal : zéro régression + miroir exact + avant/après)

- Chaque page : capture avant (flag OFF) / après (flag ON) sur la vraie vue, session premium locale.
- `npm run check` (0 erreur), Vitest complet vert, e2e des flux touchés.
- Un seul `h1` visible par page (le titre du bandeau) ; le `Header` n'émet plus de `h1` concurrent quand le flag est ON.
- Mobile : test manuel DevTools par Pascal (règle `feedback_crm_mobile_testing_devtools`) - vérifier la bascule desc → variante courte.

---

# Increments b/c/d - direction VALIDÉE (Pascal 2026-07-17)

**Statut : direction validée dans Chrome le 2026-07-17 (« ok validé »).** À coder **derrière un flag,
increment par increment (b, puis c, puis d), page par page, QA avant/après**. Rien n'est encore codé.

Mockup validé + inventaires détaillés (scratch local **gitignore**, ne voyagent pas par git) :
`.atelier-209/coherence-ui/coherence-bcd-mockup.html` + `inventory-{b-composants,c-compteurs,d-grille,gouvernance-benchmark}.md`.
Méthode : inventaire du CRM réel (file:line) + benchmark Gouvernance (structure, pas peau) + critique
adversariale 6 lentilles (27 corrections). Principe directeur inchangé : **discipline de structure de
Gouvernance, peau Atelier 209** (Inter, tokens `app.css`, bleu FilmPro / magenta LED). → [[feedback_gouvernance_benchmark_layout_lisibilite]].

**Q1 tranchée (Pascal 17/07)** : largeur du contenu = **bornée ET ancrée à gauche** (jamais centrée).
Conséquence visible : la **Veille passe de centrée (max-w-1280 mx-auto) à calée à gauche** ; sa peau
magazine dessous reste intacte.

**Directive Pascal 17/07 : attention aux espaces.** Le rythme vertical 8px (increment d) et l'absence de
collage (labels inline → block, gouttières cohérentes) sont un critère d'acceptation dur, vérifié avant/après.

## Normes à coder (résumé durable ; détail file:line dans les inventaires scratch)

**b - Composants transverses** (10 incohérences INC-1→10) :
- Bouton : primitive unique, primaire/secondaire/discret **40px** (`rounded-lg`, ombre légère) ; **44px réservé au tactile mobile** pleine largeur. Extraire `Button.svelte`.
- Pastilles : anatomie unique `radius-full`, 12px, 600, la teinte porte le sens (cible = famille `.crm-chip`). `ScorePill` `radius-sm` = exception **à confirmer** (garder ou aligner).
- Recherche : `SearchInput` **partout** (40px), bannir les 3 recodes scopés (campagnes/aide/etc.).
- Surfaces : **2 niveaux** documentés = panneau de contenu (`radius-xl` + `shadow-card` + hairline, pad 24) / carte entité (`radius-lg` + `shadow-card`→hover, pad 16-20).
- État vide : **typographique** (icône 48 / titre / desc / action), 1 seule primitive `EmptyState` (≈14 réimplémentations à router) - **jamais une carte** (garde-fou peau).
- Kicker/eyebrow 0.12em partout ; hauteurs de contrôles toolbar 40px vs champs de formulaire (tokeniser).

**c - Compteurs** : 3 rôles, la forme suit la fonction.
- A **KPI** = chip `KpiStrip` canonique (19-20px, `--color-primary-dark`, tabular), **toujours agrégat GLOBAL** (jamais `array.length` d'un slice). Bento dashboard = exception signée, jamais dupliquée.
- B **pastille inline** = `radius-full` 12-13px/600, 2 variantes (neutre `surface-alt` / marque `primary-light`), **ambre = attention seule** (non lus, sans contact).
- C **compte texte** = muet, tabular, sans pilule ; « X résultats » = **filtré** (le mot le dit).
- Corrige le bug entreprises (pastille global 8 vs pied filtré 5) + les pastilles `.length` (signaux/pipeline/contacts/veille).

**d - Grille 2 niveaux** :
- Gouttière **unique tokenisée** `--page-gutter: 32px` (24 @1024, 16 @768), posée une fois (aujourd'hui 24/56/64 selon la page). Padding-bas > haut.
- **Largeur max ancrée à gauche** (`--content-max` **1440px** confirmé Pascal 20/07 / `--reading-max` ~900 éditorial pour d2), `margin-inline:0`. Veille → gauche.
- **4 zones** : 1 identité (bandeau) · 2 pouls (KPI discrets) · 3 filtres/outils · 4 contenu. Le titre domine.
- **Trame de colonnes commune** (piste de carte unique `minmax(300px,1fr)` façon Gouvernance / 12-col) → bords alignés niveau 2.
- Rythme vertical 8px tokenisé (bandeau→pouls 16, →filtres 16, →contenu 24, sections 32, identité dashboard 48).

**Non-régression** : peau Atelier 209, peau magazine Veille, grande tuile bento dashboard (identité signée) - inchangées. Flag OFF = rendu actuel strict.

---

## État d'implémentation - increment b (flag `ff_ui_coherence`)

**Mécanique (2 canaux, un seul flag par-user `ff_ui_coherence`, patron `ffCrmListesV2`) :**
1. **class-swap dans les pages** : `class={coherence ? 'ws-btn ws-btn-VARIANT' : '<classes legacy exactes>'}`.
   Handlers + enfants restent source unique (jamais dupliqués). `isCoherenceActive(data.featureFlags)` (`src/lib/ui/coherence.ts`).
2. **override CSS co-localisé** : le layout pose `.coherence-ui` sur `.crm-shell` quand ON ; chaque brique
   partagée porte `:global(.coherence-ui) .hook` dans son `<style>` scopé (spécificité 0-3-0 fiable + hook namespacé).

**Livré (part 1, 2026-07-17)** - QA OFF/ON prouvée au DOM (badge 10px/src 8px/search 39px OFF → 9999px/9999px/40px ON) :
- **INC-1/2 Boutons** : la primitive EXISTANTE `.ws-btn` (`workspace.css`) est la cible (pas de nouveau `Button.svelte` - décision : l'extraire en pur refactor APRÈS promotion du flag). 3 variantes ajoutées (`.ws-btn-soft`, `.ws-btn-outline`, `.ws-btn-danger-ghost`) + `.ws-btn-primary:disabled`. Routés : entreprises, contacts, pipeline, signaux, prospection (panneau « sauvegarder recherche »). « Annuler » = `ws-btn-tertiary ws-btn-tertiary-muted` (hover conservé).
- **INC-3 Pastilles** : `Badge` (hook `crm-badge`, PAS `badge` nu - collision `:global(.badge)` de FeedbackTable) + `SourcePill` → `radius-full`. `StagePill`/`.crm-chip`/`.camp` déjà full. `ScorePill` garde `radius-sm` (exception documentée). `Badge` = famille bordée conservée (radius-full + 600).
- **INC-10 (partiel)** : `SearchInput` → 40px pile.
- **INC-8 (partiel)** : classe `.eyebrow` (gated `.coherence-ui`, pas globale - collision `class="eyebrow"` portail/login) ; 1 call-site (entreprises).
- Revue adversariale 5 lentilles → 7 findings confirmés corrigés (dont 2 régressions OFF : Badge `.badge` global + `.eyebrow` global). svelte-check 0/0, Vitest 2827.

**Livré (part 2 - lot 1, 2026-07-17)** - QA OFF/ON prouvée au DOM + revue adversariale 4 dimensions (2 findings réels : 1 corrigé, 1 différé) :
- **INC-7 états vides (7 page-level)** → `<EmptyState>` : campagnes (dynamique 3 branches + action conditionnelle), campagnes/[id] (action conditionnelle !archived), etiquettes (statique + dynamique 2 branches), veille (carte→plain), signaux (`<p>` unique scindé titre/desc), contacts (mobile, titre dynamique). Pattern component-swap `{#if coherence}<EmptyState/>{:else}<legacy VERBATIM>{/if}`.
- **INC-5 recherches recodées (5)** → `<SearchInput>` : campagnes, campagnes/[id], etiquettes, veille/editeur (thèmes + sources). `value + oninput={(v)=>x=v}` ≡ `bind:value` legacy.
- **Fix placement (finding medium confirmé)** : le `.search` legacy de campagnes portait `margin-left:auto; width:280px` (ancré à droite) que le swap `SearchInput` perdait → wrapper `.coh-search` (ON only, absent du DOM OFF) restaure l'ancrage. Vérifié DOM (280px right-anchored, h 40px) + visuel. Les autres pages (etiquettes 300px, veille/editeur min-240px) : delta de largeur mineur **vérifié acceptable** (layout préservé), laissé tel quel.
- QA : svelte-check 0/0, Vitest 2827, DOM OFF/ON (veille carte→EmptyState icône 48px ; campagnes search 40px ancré + empty). 7 fichiers, tous OFF `{:else}` byte-verbatim (ré-indentation seule).

**Livré (part 2 - lot 2A « surfaces & typo », 2026-07-20)** - QA OFF/ON prouvée au DOM sur éléments RÉELS + revue adversariale 3 lentilles + Vitest 2863 :
- **INC-4 rayon des modales → radius-2xl (16px desktop)** : classe globale gatée `@media(min-width:768px){.coherence-ui .crm-modal-shell{border-radius:var(--radius-2xl)}}` (app.css) + append `crm-modal-shell` sur ModalForm + ImportListeModal (**bottom-sheet mobile PRÉSERVÉ**, prouvé : mobile ON bas carré 0px) ; override co-localisé `:global(.coherence-ui) .prev` (modale d'aperçu PDF centrée etiquettes, sans garde @media). ModalForm est partagé avec Découpe = **inerte hors `.coherence-ui`** (Découpe hors périmètre, aucune régression).
- **INC-6 surfaces** : override co-localisé `box-shadow: var(--shadow-card)` sur reporting `.panel` (ombre absente) + campagnes/[id] `.card` (shadow-xs). Les 5 autres cibles = déjà conformes ou identité signée (KpisBento bento, PipelineCard densité kanban) → **NON touchées**.
- **INC-8 sur-titres inline (21 call-sites)** : append de la classe gatée `eyebrow` (12px/700/0.12em/muted) sur les sur-titres de section **muted** : signaux ×4, LeadSlideOut ×5, veille/item ×4, DependencyBlockModal ×2, PipelineQuickAdvance ×2, VisitsPanel, PhotoGallery, EnrichBatchModal, SourceSelector. **Exclus** (accent intentionnel / field-label / colonne) : log:77 + veille/item:134 (`text-primary`), FeedbackTable field-labels (weight 400), en-têtes DataTable, AlerteModal/ImportModal kickers colorés.
- **INC-9 poids de titres → 700** : override co-localisé sur `.aide-title` (600→700), `.aide-section-title` (600→700), `.cp-title` (800→700). Couleur `.aide-section-title` laissée en `--color-text` (passage `--color-primary-dark` optionnel, non fait). log/veille-themes (utility inline) + veille/editeur (peau magazine assumée §3.2) **NON touchés**.
- QA : svelte-check 0/0, Vitest 2863, DOM OFF/ON sur vrais éléments (panel none→shadow-card, titres 600/800→700, cp-title 800→700, card shadow-xs→shadow-card, modale 12→16px desktop **/ bas mobile 0px préservé**, eyebrow 600/0.05em→700/0.12em), harness `tests/_qa-coherence-lot2a.mjs`. Mécanique : override co-localisé (classe scopée) / classe globale gatée appendée - **OFF inerte par construction** (`.coherence-ui` absent).

**Livré (part 2 - lot 2B « champs, vides, recherche aide, kickers », 2026-07-20)** - QA OFF/ON prouvée au DOM sur vraies vues + preuve e2e a11y (souris+clavier) + revue adversariale 4 lentilles = **4× REFUTED-clean, 0 régression** + svelte-check 0/0 + Vitest 2863 :
- **INC-10 hauteur des champs → 40px** : classe globale gatée `.coherence-ui .crm-field-control{height:40px}` (app.css, non-layered ⇒ bat `h-[34px]` layered) + append `crm-field-control` sur Select / FormField (input, PAS la textarea) / CantonSelect + input inline « Entreprise » de la modale contacts. Les 3 primitives ne servent QUE dans des modales (jamais toolbar, jamais /decoupe → grep vérifié). Preuve DOM (modale entreprises) : champ 34px OFF → 40px ON.
- **INC-7 états vides partagés (3)** → `<EmptyState>` via prop `coherence` (component-swap `{#if coherence}<EmptyState/>{:else}<legacy VERBATIM/>{/if}`, défaut false = OFF) : SignauxCards (`filter_alt_off`), EntreprisesCards (`business`, matche le vide page-level), FeedbackTable (`inbox`). Plombage `{coherence}` sur les 3 call-sites (signaux/entreprises derived existant ; log = ajout `isCoherenceActive` + derived). Preuve DOM (vides filtrés) : `role=status` false→true OFF/ON.
- **INC-8 kickers SCOPÉS (6, sous-ensemble SÛR = alignement pur)** : override co-localisé `:global(.coherence-ui) .hook{font-weight:700; font-size:12px}` sur `.panel-meta` (RelancesList/ActiviteTimeline), `.section-meta` (AlertesStrip/QuickActionsFooter), `.activity-grid .card h4` (ReportingActivityCards, ANCRÉ), `.aide-toc-title`/`.aide-onthispage-title`. Couleur inchangée. Preuve DOM : reporting kicker 600/0.04em→700/0.12em, aide TOC 600/0.06em→700/0.12em. (Dashboard panel-meta/section-meta non rendus en vue premium/fondateurs → inertes par construction, même mécanique.)
- **INC-9 titre log → 700** : classe globale gatée `.coherence-ui .coh-title{font-weight:700}` + append `coh-title` sur le h2. Preuve DOM 600→700. L'eyebrow `text-primary` ligne 77 (accent intentionnel) NON touché.
- **INC-5 recherche Aide → SearchInput** : la primitive EST étendue, additive à default-absent (inerte pour les 11 autres call-sites, prouvé) - prop snippet `trailing` (indice `/`) + `export function focus()`. aide class-swap `{#if coherence}<SearchInput trailing kbd>{:else}<.aide-search legacy VERBATIM>{/if}` + styles ON-only `.coh-search`/`.aide-kbd-coh`. Preuve DOM : champ 36px/radius-md → 40px/radius-lg + kbd présent + `/` focus OK OFF ET ON.
- **a11y SearchInput clear-focus (NON flag-gated, re-livré AVEC preuve cette fois)** : `bind:this={inputEl}` + `inputEl?.focus()` en fin de `handleClear` (le bouton clear se démonte quand vide → sans ça le focus tombe sur `<body>`). Touche tous les users + /decoupe = **amélioration, jamais pire** (les 2 seuls `onclear` signaux/prospection restent égal-ou-mieux ; adversarial a11y sur 12 consommateurs = clean). Preuve e2e `tests/_qa-a11y-search-clear.mjs` : souris ET clavier → focus revient dans l'input, bouton démonté. C'est la preuve qui manquait au revert précédent.
- Harnesses QA gardés : `tests/_qa-coherence-lot2b.mjs` (DOM OFF/ON) + `tests/_qa-a11y-search-clear.mjs` (e2e focus).

**Livré (increment c « compteurs » - lot 2C, 2026-07-20)** - QA DOM OFF/ON prouvée sur vraies vues (3 sondes, dont le cas onglet-actif-vide) + revue adversariale 4 lentilles (off-inertness clean, semantics 2× REFUTED, 1 CSS CONFIRMÉ corrigé, 1 complétude veille adressée) + svelte-check 0/0 + Vitest 2863 :
- **ProspectionTabs → aligné sur la primitive `Tabs`** (override co-localisé `:global(.coherence-ui)`, OFF inerte) : `.tab-count` radius `999px` → `--radius-full` (visuellement identique, source-unité) + count actif `--color-primary-dark` → `--color-primary` (cf. `Tabs.svelte`). **Garde `:not(.tab--empty)`** (finding CSS confirmé) : un onglet actif ET vide garde son « 0 » en gris muted (border), jamais primary - preuve DOM onglet « terrain » vide = `rgb(229,231,235)` (border) OFF **et** ON. Radius/hauteur du shell (12px / 64px) délibérément HORS increment c (relèvent des surfaces, increment d).
- **Pastille bandeau signaux → global de vue** : `filteredSignaux.length` (compte FILTRÉ client, réactif aux onglets/recherche) → `data.signaux.length` (toute la vue chargée, non paginée ~430 < cap PostgREST). Preuve : band = « 2 signaux » stable sur l'onglet « À trier » (1 fiche visible) ET après recherche sans match (liste → 0). Aligne signaux sur les pages sœurs. Rendu seulement sous `ff_page_bandeau`.
- **Non touchés, justifiés** : contacts (`data.contacts.length`) + pipeline (`data.opportunites.length`) = load **non paginé** (ni `range` ni `limit`, vérifié `+page.server.ts`) ⇒ `.length` = global. entreprises = déjà conforme (band `tabCounts.toutes` global + pied « X résultats » filtré libellé). filter-badge prospection = déjà norme B (`rounded-full bg-primary-light text-primary`).
- **Veille = exemption rôle C SIGNÉE** : `data.editions.length` est **cappé par design** (`EDITIONS_LIMIT=3`, front magazine = featured + 2 archives, **aucune navigation vers les éditions plus anciennes sur cette vue**) ⇒ un compte global impliquerait faussement du contenu atteignable ici = pire UX. La pastille reflète les éditions récentes montrées (le sous-titre OFF dit déjà « récentes »). Non touché, exemption documentée (comme le bento dashboard). Correction d'une prémisse fausse initiale (« veille non paginé ») remontée par la revue.
- Harness QA : `tests/_qa-coherence-lot2c.mjs` (setter de flags intégré).

**Reste (d + reliquats esthétiques + CTAs prospection) :**
- **[DÉFÉRÉ - mockup Pascal requis]** Changements ESTHÉTIQUES (pas de l'alignement pur ⇒ maquette Chrome à valider avant ON, jamais de gate auto-déclaré mid-run) : micro-kickers `KpisBento`/`TriageQueue` (10px/0.18em → 12px/0.12em, resserrement + agrandissement visibles), h3 `SignauxKeywordsPanel` (couleur `--color-text` → muted = baisse de prominence), kicker héros `SectionGreeting` (horodaté capitalize, pas un vrai eyebrow), titre `veille/themes` (ambiguïté peau magazine §3.2).
- **[DÉFÉRÉ - passe dédiée]** CTAs desktop Prospection (5, `hidden md:inline-flex`) : **risque de faux-vert** (l'ancêtre `.tabs-shell display:none @767` masque tout bug mobile) ⇒ QA 767px OFF/ON soignée obligatoire ; teinte « Enrichir cette page » = décision design (garder le signal métier `prosp-enrich` vs standardiser). Mécaniques candidates : wrapper responsive `hidden md:inline-flex`+`.ws-btn` (source-unique) OU colocated-override `.coh-prosp-btn-*`. Détail file:line dans l'inventaire scratch.
- **c** compteurs = **LIVRÉ lot 2C** (ci-dessus) : signaux band→global, ProspectionTabs→tokens/primary, contacts/pipeline/entreprises/filter-badge déjà conformes, veille exemptée rôle C.
- **d** grille 8px (page-gutter tokenisé, largeur ancrée à gauche, Veille→gauche, rythme vertical).
  - **d1 (gouttière unique + largeur bornée/ancrée à gauche) = LIVRÉ 2026-07-20** (`ff_ui_coherence` OFF). Mécanique **socle centralisateur** : le socle `.crm-page-wrap` porte, sous `.coherence-ui`, la gouttière UNIQUE (`--page-gutter` 32/24/16) + la borne (`--content-max: 1440px`, ancrée à gauche, pas de margin-inline) ; **chaque brique remet sa gouttière horizontale à 0** (`padding-inline`/`margin-inline` seul → vertical + FAB 96px préservés) ; Veille/Aide/Couts dé-centrées. **24 fichiers** (la carto initiale « ~13 / 8 pages » sous-estimait : le socle est global aux 18 routes /crm → 6 `*Indicators` + primitive `Tabs` + 6 sous-pages en plus). QA DOM prouvée (`tests/_qa-coherence-d1.mjs`) : gutter unique 32/24/16 sur 11 types ON, borne 1440 ancrée à gauche @2000, legacy inchangé OFF (1440/2000/1000) ; svelte-check 0/0, Vitest 2863 ; revue adversariale 5 lentilles (4 REFUTED-clean + 1 medium Tabs `:not(.compact)` ≤1024 corrigé en 0-4-0). Diagnostic d'origine : double-gouttière (socle 16/24 + brique 32 = 48/56/64 effectif). `/decoupe` = layout séparé, non touché. → `memory/project_coherence_ui_d1_grille_2026-07-20.md`.
  - **d2 + d3 (4 zones / trame commune + rythme vertical échelle de 8) = LIVRÉ 2026-07-21** (`ff_ui_coherence` OFF).
    **Scope resserré par la mesure** (cartographie fraîche des 10 pages, harnais DOM avant/après) : l'app avait
    **déjà largement convergé** vers l'échelle de 8 (contacts + pipeline **déjà 16/16/24** ; bandeau→pouls = 16
    partout via kpi-strip 4/16). d2 « 4 zones + bords alignés » = **déjà réalisé au niveau 1 par d1** (gouttière
    unique). La conversion **KpiStrip flex→grille** et le **« 12-col partout »** (proposés dans le scratch
    `inventory-d-grille.md` D3/D6) sont **HORS scope** : le mockup validé dit noir sur blanc « KpiStrip inchangé »
    et « rien n'est redessiné » → ce serait un redessin, **parqué en `[GATE mockup]`**. d3 = les seules
    divergences réelles, **7 fixes chirurgicaux** (tous co-localisés/gatés, OFF byte-identical) :
    (1) `.ws-content` pt 32→24 (signaux, entreprises) ; (2) reporting `.content` pt 32→24 ; (3) reporting
    `.indicators` 24/24→4/16 (aligné KpiStrip) ; (4) reporting `.panel.mt-24` 24→32 (entre sections, D4/D6) ;
    (5) campagnes `.toolbar` 6/18→0/24 ; (6) aide `.aide-bar .tabs-bar` pt 0→4 ; (7) prospection `.pband` mb→0
    (rythme uniforme 24, exception 100dvh). Tokens `--rhythm-tools-content:24 / --rhythm-section:32` (app.css).
    **Exemptions signées** (forcer = redessin, non touché) : dashboard LIVE compact « Capsule » (uniforme 16, PAS
    48), veille magazine (56/80), **sections aide** éditoriales 32/48. `.ws-content` fix gardé `min-width:769px`
    (au-dessus mobile ; supprime le trou fractionnaire 1024.01-1024.99).
    **Leçon (revue adversariale 4 lentilles, 3 findings corrigés)** : `ff_ui_coherence` et `ff_page_bandeau` sont
    **indépendants** → tout fix ADJACENT au bandeau (reporting indicators, aide onglets) doit être **scopé au
    bandeau présent** (`.pband + X`), sinon l'état mixte (coherence ON / bandeau OFF) dégrade un gap legacy déjà
    sur l'échelle. QA : property-check DOM (états ON / coh-only / OFF), breakpoints 1440/1024/1025/1000/390,
    svelte-check 0/0, Vitest 2863. Cibles d3 : bandeau→pouls 16 · pouls→filtres 16 · filtres→contenu 24 ·
    sections 32 · identité dashboard 48. → `memory/project_coherence_ui_d3_grille_2026-07-21.md`.

**Gotchas gravés** (voir mémoires) : (a) `.ws-btn` non-layered vs Tailwind layered ; (b) QA locale : `updateUserById` **fusionne** `app_metadata` → pour désactiver un flag en test, mettre la clé à `null` (pas `delete`), sinon le « OFF » reste ON en silence.
