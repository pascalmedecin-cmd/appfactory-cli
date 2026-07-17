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
3. **[LIVRÉ 2026-07-17 - 4/5 ; Veille = mockup à valider]** Pages à en-tête bespoke. **Décision Pascal 2026-07-17** : uniformité. **Reporting, Aide, Dashboard, Prospection** alignés sur le bandeau standard (commit `b4fe644`, derrière `ff_page_bandeau` OFF) :
   - **Reporting** : hero → PageBand (drop-in propre).
   - **Aide** : `.aide-head` (titre = niveau dynamique) → PageBand statique « Aide » ; le niveau actif reste porté par les onglets. `let { data }` ajouté (absent avant).
   - **Prospection** : PageBand en tête du conteneur `100dvh` (wrap `shrink-0`, la table absorbe le reste) + pastille `totalLeads`. Layout préservé (QA visuelle OK).
   - **Dashboard** : PageBand « Tableau de bord » **au-dessus** du greeting (seul cas d'ajout, pas de remplacement). En **vue premium** (celle des fondateurs) le bandeau 30px domine le greeting 24px → hiérarchie correcte ; revue adversariale : 1 low subjectif (stacking), non bloquant. **Option ouverte** : alléger le greeting quand le bandeau est ON si Pascal le souhaite.
   - **Veille** = **traitement particulier** (identité magazine) : **mockup produit** (`.atelier-209/coherence-ui/veille-bandeau-mockup.html`), bandeau standard en tête + peau magazine (couvertures, archives) conservée dessous → **en attente de validation Pascal** avant code.
   - Pages détail (`[id]`) : hors copy validée, non couvertes.
4. **[LIVRÉ - mécanisme générique en place]** Bascule du `Header` : le gate `pageTitle`/`$pageSubtitle` est **automatique par route** via `isBandeauActive(data.featureFlags, page.url.pathname)` dans `+layout.svelte` (`Header.hideTitle`). Ajouter une route à `BANDEAU_ROUTES` gate le Header pour cette route sans autre code. Audit a11y (un seul `h1`) : **vérifié sur les 9 pages migrées** (Entreprises + inc 2 + inc 3 hors Veille) - preuve navigateur, 1 seul `h1` (celui du bandeau) sur chaque. La **relecture cohérence transverse finale** se fera une fois Veille tranchée (+ éventuel allègement greeting Dashboard).

## QA (directive permanente Pascal : zéro régression + miroir exact + avant/après)

- Chaque page : capture avant (flag OFF) / après (flag ON) sur la vraie vue, session premium locale.
- `npm run check` (0 erreur), Vitest complet vert, e2e des flux touchés.
- Un seul `h1` visible par page (le titre du bandeau) ; le `Header` n'émet plus de `h1` concurrent quand le flag est ON.
- Mobile : test manuel DevTools par Pascal (règle `feedback_crm_mobile_testing_devtools`) - vérifier la bascule desc → variante courte.
