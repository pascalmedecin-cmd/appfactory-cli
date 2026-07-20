# Increment d1 - plan d'implémentation (cartographié 2026-07-20, prêt à coder)

Cible validée (mockup `coherence-bcd-mockup.html` § d, « ok validé » 17/07) : sous `ff_ui_coherence` ON,
CHAQUE page a **un retrait horizontal unique 32px** (24 @≤1024, 16 @≤768) + **largeur bornée ancrée à
gauche** (`margin-inline:0`, jamais centrée). Veille passe de centrée à calée à gauche (peau magazine dessous
intacte). OFF ⇒ `.coherence-ui` absent ⇒ byte-identique. Source de la carto : workflow `coherence-d1-gutter-map`
(7 scopes) + lecture directe. Blast-radius vérifié : `/decoupe` a son propre layout (hors périmètre).

## Mécanique retenue : SOCLE CENTRALISATEUR (une source de gouttière, tout le reste à 0)

Aujourd'hui = **double-gouttière** : socle `main>div.p-4.md:p-6` (16/24px, +layout.svelte:83) **+** gouttière
propre de chaque brique (32/24/16). Effectif 48/56/64px. Le fix : le SOCLE porte la gouttière unique + la
borne ; **chaque brique met sa gouttière horizontale à 0** (`padding-inline`/`margin-inline` SEUL → le
vertical reste, ex. dégagement FAB 96px @≤768). C'est **tout ou rien** : changer le socle sans neutraliser
une brique = double-retrait 64px sur cette page.

### Décision design : `--content-max = 1440px` (CONFIRMÉ Pascal 2026-07-20)
Aucune borne n'existe aujourd'hui (les pages s'étirent plein écran). La borne est à AJOUTER, valeur **1440px**
(data) - ne mord que sur grand écran (> ~1680px de zone contenu). Une seule valeur pour d1 (les colonnes de
lecture internes - `.aide-section-body` max 700 - restent bornées séparément). Ajustable = 1 token si besoin.

## Édits exacts (≈13 fichiers)

### 1. `src/app.css` (tokens + socle, à côté des blocs `.coherence-ui` existants ~l.210)
```css
.coherence-ui { --page-gutter: 32px; --content-max: 1440px; }
@media (max-width:1024px){ .coherence-ui{ --page-gutter:24px; } }
@media (max-width:768px){  .coherence-ui{ --page-gutter:16px; } }
.coherence-ui .crm-page-wrap { padding-inline: var(--page-gutter); max-width: var(--content-max); }
/* margin-inline:0 = défaut = ancré à gauche. Custom props héritent à travers display:contents (.crm-shell). */
```

### 2. `src/routes/crm/+layout.svelte:83` : ajouter la classe hook
`<div class="p-4 md:p-6 crm-page-wrap">` (le socle devient la coquille unique).

### 3. `src/lib/styles/workspace.css` (plain CSS, global ; 0-2-0 bat 0-1-0 base + media)
```css
.coherence-ui .ws-content { padding-inline: 0; }
.coherence-ui .ws-page-actions { padding-inline: 0; }
```
(couvre contacts/entreprises/pipeline/signaux. Vertical + FAB 96px préservés.)

### 4. `src/lib/components/PageBand.svelte` (co-localisé) : `:global(.coherence-ui) .pband { padding-inline: 0; }`
(`.pband--flush` déjà à 0, inchangé - Veille : bandeau flush + contenu magazine calent tous 2 sur le socle 32.)

### 5. `src/lib/components/KpiStrip.svelte` (co-localisé) : `:global(.coherence-ui) .kpi-strip { padding-inline: 0; }`

### 6. Pages bespoke (co-localisé `:global(.coherence-ui) …`, 0-3-0 bat le shorthand `padding:` des media 0-2-0)
- **reporting/+page.svelte** : `.hero`, `.content` → `padding-inline:0`. Vérifier `.page` max-width (l.184) : la borne vient du socle, la retirer/laisser.
- **campagnes/+page.svelte** : `.head`, `.toolbar`, `.import-alert`, `.listcard`, `.empty` → padding/margin-inline:0 ; `.ws-bound` (l.586) max-width via socle. NE PAS toucher le `@media(max-width:720px)` (il re-pose 16px - mais l'override non-media 0-3-0 gagne). `.empty` = branche OFF-only ⇒ inutile de le neutraliser (mort sous ON).
- **contacts/+page.svelte** : `.table-wrap` (l.845), `.contacts-empty-wrap` (l.841) → padding-inline:0 (garder bottom 96px @768).
- **pipeline/+page.svelte** : `.kanban-wrap` (l.714) → padding-inline:0. `.kanban--closed` max-width:720 (l.728) = contrainte de colonne interne, NE PAS toucher.
- **prospection/+page.svelte** (100dvh, outlier) : le bord partagé = les CARTES (`.prospection-shell` l.1027, carte filtres l.876, save-panel l.928, bannières l.973/989) + `.prospection-search-wrap` px-4 (l.1108) + `dl.grid-cols-3` non-premium (l.712, cellules px-5). Poser la gouttière/borne sur le conteneur 100dvh (l.679) ou uniformiser les cartes à 0 + laisser le socle. Ne toucher que padding-INLINE (le -3rem du calc = vertical). Cas le plus délicat → traiter en dernier, QA 767 soignée.
- **veille/+page.svelte:56** : wrapper `max-w-[1280px] mx-auto px-4 md:px-10` → sous coherence `margin-inline:0` + `padding-inline:0` (socle porte 32) + borne via socle. Ajouter une classe hook (le wrapper n'a que des utilities). Peau magazine dessous = décalage en bloc, NE PAS lui ajouter de gouttière. Frères `veille/[id]:169`, `veille/item/[slug]:76` (max-w-5xl mx-auto) : inclure si on veut la cohérence des pages détail (sinon noter).
- **aide/+page.svelte** : `.aide` (l.325-326 `max-width:1280px; margin:0 auto`) → `margin-inline:0` + borne via socle. Colonne de lecture `.aide-section-body` 700 (l.696) inchangée. `@media(max-width:1024px)` .aide-body (1 col, l.700) cohabite.
- **dashboard** : `.dash` (+page.svelte:145) + `.dt` (DashboardTemporel:145, branche premium) → borne via socle (les 2 branches exclusives). `.kpis` bento (KpisBento:95) = identité signée, NE PAS toucher la grille (juste hériter la borne). Faux-ami : `.pcount{margin-left:auto}` = alignement interne, NE PAS toucher.

## Pièges (de la carto) - checklist QA
- **padding-INLINE seul** partout (jamais `padding:0`) → préserver vertical + FAB 96px @≤768.
- Ne PAS toucher `<main>` padding-left inline (offset sidebar = bord de référence).
- Breakpoints unifiés PAR le token (`--page-gutter` 32/24/16) ; ne pas répliquer les paliers hétérogènes (640/720/767.98/1024) des briques.
- `.pband--flush` (Veille) : vérifier bord gauche bandeau == bord contenu magazine sous coherence.
- `.empty`/EmptyState OFF-only : ne pas gaspiller d'override.
- Blast-radius : le socle touche TOUTES les routes /crm (pas /decoupe). QA les 10 pages.

## QA (avant/après, critère dur « attention aux espaces »)
Harness DOM : pour chaque page, mesurer le **bord gauche du contenu** (getBoundingClientRect().left du 1er
bloc de contenu, relatif à la zone `main`) = doit valoir 32/24/16 selon breakpoint sous ON, et **inchangé sous
OFF**. Vérifier la borne (max-width appliquée sur grand écran, `margin-inline:0` = pas centré). Veille : `margin-left`
du wrapper == 0 (dé-centré). + captures avant/après réelles des types de page (ws-page, Veille, Dashboard,
Prospection) pour validation visuelle Pascal. Puis revue adversariale (double-gouttière, régression OFF, 100dvh, flush).

## Ordre d'implémentation le plus sûr
tokens+socle → shared briques (ws-content/ws-page-actions/pband/kpi) → QA les 4 ws-pages → pages bespoke une par
une (reporting, campagnes, contacts, pipeline, veille, aide, dashboard) avec QA après chaque → prospection en
DERNIER (100dvh, plus délicat) → revue adversariale → captures avant/après.
