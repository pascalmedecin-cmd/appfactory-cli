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
- **Largeur max ancrée à gauche** (`--content-max` data ~1240 / `--reading-max` ~900 éditorial), `margin-inline:0`. Veille → gauche.
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

**Reste (part 2 + c + d) :**
- **[a11y différé - non flag-gated]** `SearchInput` : le bouton clear perd le focus (→ `<body>`) au clavier (se démonte sans refocaliser l'input). **Préexistant, déjà en prod** (Prospection/Signaux/Entreprises) → change séparé, non réversible par flag, à QA à part. Fix 1 ligne : `bind:this={inputEl}` + `inputEl?.focus()` dans `handleClear`.
- **États vides différés** (plumbing prop ou micro-états) : SignauxCards / EntreprisesCards / FeedbackTable (flag pas dispo en composant → passer `coherence` en prop), panneaux dashboard compacts + widgets premium signés « warm » (DashboardTemporel/ActivityFeed), `PipelineEmptyState` (échelle colonne kanban), fallback charts/tables/kanban/modale, messages inline (list-empty, aide-results, VisitsPanel, ProductCascade). Cas ambigu : `log/+page:63` (device-gate qui réplique le markup EmptyState).
- **Recherche Aide** (`bind:this` focus `/` + `<kbd>`) : `SearchInput` ne les expose pas → extension primitive ou différé.
- **Prospection CTAs desktop** (`hidden md:inline-flex`) : NON routés. Piège cascade : `.ws-btn` **non-layered** écrase `hidden` (layered) → visible en mobile. **Écarté `@layer components`** (blast-radius app-wide, casse OFF). Approche retenue : co-localisé / wrapper responsive, + le bouton « Enrichir cette page » (teinte sémantique propre) n'a pas de variante `.ws-btn` standard.
- **INC-10** hauteurs `Select`/`FormField`/`CantonSelect` (effet layout ON → QA soignée) ; **INC-8 scopé** : les kickers définis en `<style>` (dashboard/reporting/SignauxKeywordsPanel…) restent divergents (mécanique co-loc, INC séparé) ; **INC-9 utility-inline** (log:78 + veille/themes:190). Puis **c** (compteurs) et **d** (grille 8px). _(INC-4 modales, INC-6 surfaces, INC-8 inline, INC-9 scopé = LIVRÉS lot 2A ci-dessus.)_

**Gotchas gravés** (voir mémoires) : (a) `.ws-btn` non-layered vs Tailwind layered ; (b) QA locale : `updateUserById` **fusionne** `app_metadata` → pour désactiver un flag en test, mettre la clé à `null` (pas `delete`), sinon le « OFF » reste ON en silence.
