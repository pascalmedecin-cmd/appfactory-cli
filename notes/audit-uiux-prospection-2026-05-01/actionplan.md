# Action plan batch fixes - /prospection

**Date catalogue** : 2026-05-01
**Date batch fixes** : prochaine session (à valider Pascal)
**Méthode** : zéro fix pendant l'audit. Ce document = ordonnancement séquentiel des fixes pour 1 ou plusieurs sessions dédiées post-validation Pascal.
**Référence findings** : `findings.md` même dossier.

---

## Stratégie

**3 vagues séquentielles**, à exécuter dans l'ordre :

1. **Vague 1 - Bloquants prod** (Critical) : sécu + UX cassé qui bloque utilisateurs en prod aujourd'hui. Estimation 4h.
2. **Vague 2 - A11y baseline WCAG AA** (High a11y) : 11 fixes pour atteindre WCAG 2.2 AA conforme + clavier-accessible. Estimation 6h.
3. **Vague 3 - Cohérence golden + bench externe** (High direction artistique + Medium sweeps) : alignement charte + benchmarks Linear/Stripe/Notion. Estimation 6h.

**Total estimé** : 16h batch fixes (2 sessions xhigh de 6-8h chacune ou 3 sessions high de 5-6h).

**Pré-requis avant batch fixes** :
- [ ] Validation Pascal du catalogue findings (3 décisions de policy à trancher § ci-dessous).
- [ ] Pascal valide via DevTools manuel les findings ⚠ (H-12 contraste ScorePill, H-13 borders inputs, H-26 focus-visible) pour cross-check officiel avant fix.

---

## 3 décisions de policy à trancher avant batch fixes

### D1. Échelle spacing : étendre à 28px ou aligner indicateurs flat à 32px ?
- **Contradiction** : golden v7 décision 2 (échelle 4/8/12/16/24/32/48 retrait 2/6/10/20) vs spec 3.7d (`padding 28px 28px 28px 0`).
- **Reco** : étendre l'échelle à 28 (token `7xl` ou similaire) car les indicateurs flat sont déjà livrés et bien calibrés visuellement. Sinon dropping 28→32 modifie le rendu visuel premium.

### D2. Hauteur boutons mobile : exception HIG 44px documentée OU aligner h-10 ?
- **Status quo** : `h-11` (44px) sur mobile partout (LeadExpress, mobile menu kebab, etc.) vs décision 3 "h-10 uniforme".
- **Reco** : documenter explicitement dans golden v8 l'exception "mobile = h-11 (44px HIG iOS), desktop = h-10 (40px)". Pattern industriel standard.

### D3. H1 sémantique : Header global suffit ?
- **Status** : `<h1>` présent dans Header global (porté par store `pageSubtitle`), pas dans le template page.
- **Reco** : suffit, à condition que le `<h1>` Header global soit explicitement marqué comme `<h1>` réel sémantique (pas un `<div>` stylé). Vérifier `Header.svelte:33` - actuellement `<h1 class="header-title font-semibold text-text">{pageTitle}</h1>` ✓ OK.
- **Action** : retirer C-04 du backlog s'il est juste sémantique de naming. Garder uniquement L-08 (descendre `<h3>` empty state à `<h2>` une fois h1 confirmé).

---

## Vague 1 - Bloquants prod (4h)

### V1.1 - C-01 + H-18 Bouton Importer + CTA empty state (45 min)
- **Fichiers** : `+page.svelte:328+417+536`
- **Diff** : sortir Importer + Lead express + kebab du `{#if data.totalLeads > 0}`. Inclure CTA Importer dans empty state quand `data.totalLeads === 0` (filtres actifs ou onglet vide).
- **Test régression** : 4 onglets × 2 états (peuplé / vide) = 8 captures à comparer manuellement.

### V1.2 - C-02 Injection PostgREST search escapée (1h)
- **Fichiers** : `+page.server.ts:78+113`
- **Diff** : reproduire le pattern `all-ids/+server.ts:44` (2 .ilike() en parallèle + Set dédup) sur la query principale + `buildTabCount`. Tests vitest qui simulent search avec caractères mini-DSL `,`, `(`, `)`, `:`.
- **Audit** : exécuter `code-review:security-auditor` ciblé après fix pour confirmer 0 finding High/Critical.

### V1.3 - H-01 Scroll vertical tabs (cause racine ProspectionTabs.svelte) (30 min)
- **Fichiers** : `ProspectionTabs.svelte:71` (CSS scoped `.tabs-bar`)
- **Diff** : `overflow: auto` → `overflow-x: auto; overflow-y: visible`. `height: 60px` → `min-height: 60px`.
- **Bonus** : revert mon commit `2f7fa76` (cascade flex-1) qui n'était pas la bonne cause - mais **garder commit `0f19a84`** (prop embedded DataTable + sweeps cohérence golden) qui reste utile pour le double cadre.

### V1.4 - C-03 `<tr onclick>` clavier (45 min)
- **Fichiers** : `DataTable.svelte:339`
- **Diff** : `<tr tabindex="0" role="button" onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row); } }}>`.
- **Test** : Tab clavier sur 1ère row → Enter ouvre slideOut, Space ouvre aussi.

### V1.5 - H-03 Sélection persiste au switch onglet (15 min)
- **Fichiers** : `+page.svelte:240-243` (`selectTab`)
- **Diff** : `selectTab` ajoute `selectedIds = new Set()` avant goto. Idem `resetFilters` et au filtre change (debounced).

### V1.6 - H-07 Dedup createExpress (decision avec Pascal) (45 min ou 0)
- **Selon arbitrage Pascal** : option (a) match préfixe + Levenshtein, OU option (b) assumer match strict et documenter golden.

---

## Vague 2 - A11y baseline WCAG AA (6h)

### V2.1 - H-17 + H-25 ARIA tabs pattern complet (45 min)
- **Fichiers** : `ProspectionTabs.svelte:29-51+55` + `+page.svelte:570-624`
- **Diffs** :
  - `<button role="tab" id="tab-{tab}" aria-controls="tabpanel-{tab}">`
  - Wrapper DataTable dans `<div role="tabpanel" id="tabpanel-{data.tab}" aria-labelledby="tab-{data.tab}">`.
  - Handler `onkeydown` ArrowLeft/Right pour focus tabs adjacentes (pattern ARIA tablist).
  - `<select id="tabs-mobile-select" aria-label="Filtrer par nature de signal">`.

### V2.2 - H-15 col-resizer keyboard (45 min)
- **Fichiers** : `DataTable.svelte:316-323`
- **Diff** : `<div role="separator" tabindex="0" aria-orientation="vertical" aria-valuenow={width} aria-valuemin={minWidth} aria-valuemax={2000} onkeydown={onResizeKeydown}>`.
- Handler keydown : ArrowLeft/Right ±10px, Home/End reset/max.

### V2.3 - H-10 + H-11 Toast / errorMsg / selectAllNotice aria-live (45 min)
- **Fichiers** : `Toast.svelte:21` + `LeadExpress.svelte:236` + `+page.svelte:520`
- **Diffs** :
  - Toast wrapper : `<div role="region" aria-live="polite" aria-atomic="true" aria-label="Notifications">`.
  - errorMsg LeadExpress : `<div role="alert" class="...border-danger...">`.
  - selectAllNotice +page : `<div role="status" class="...">`.

### V2.4 - H-24 Input search aria-label + H-16 MultiSelectDropdown focus + aria (30 min)
- **Fichiers** : `DataTable.svelte` (search input) + `MultiSelectDropdown.svelte:67-77`
- **Diffs** :
  - Search input : `aria-label="Rechercher un prospect"`.
  - MSD trigger : `aria-haspopup="listbox" aria-expanded={open}` + classes `focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none`.

### V2.5 - H-26 Focus indicators clavier globaux (1h - dépend résultat DevTools Pascal)
- **Si confirmé absent par Pascal** :
  - Ajouter dans `app.css` règle globale : `:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }` puis spécialiser par composant si besoin.
  - Tests : Tab clavier sur tabs, search input, bouton Importer, ScorePill, ActionButton, row.

### V2.6 - H-12 ScorePill froid contraste (15 min)
- **Fichiers** : `ScorePill.svelte:74`
- **Diff** : `color: #475669` → `color: #3F4D5F` (≈ 4.92:1).
- **Validation** : Pascal mesure via axe DevTools extension OU calcul manuel webaim.org.

### V2.7 - H-13 Borders inputs token sémantique (45 min)
- **Fichiers** : `app.css` (token) + `LeadExpress.svelte:189-232` + `DataTable.svelte:449`
- **Diff** : créer `--color-border-input: #ADB5BD` (3:1 sur blanc) + `--color-border-strong` si déjà existant. Remplacer `border-border` → `border-border-input` sur inputs interactifs uniquement.

### V2.8 - H-14 Tooltip dismissible (30 min)
- **Fichiers** : `Tooltip.svelte:56+81`
- **Diff** : retirer `pointer-events: none` + ajouter handler global Escape qui ferme le tooltip ouvert (state global ou via portal).
- **Documenter golden 3.7g** : pattern dismissible/hoverable/persistent.

### V2.9 - H-09 ConfirmModal batch destructif + toast undo (1h)
- **Fichiers** : `BatchActionsBar.svelte` + nouveau composant `ConfirmModal.svelte` si pas existant
- **Diff** :
  - Action "Marquer écarté" sur ≥ 10 prospects : ConfirmModal avant submit.
  - Toast retour avec bouton "Annuler" qui rejoue inverse pendant 5s (réutiliser pattern Toast.svelte avec action button).

### V2.10 - H-08 errorMsg dans branche désambiguation (15 min)
- **Fichiers** : `LeadExpress.svelte:115-160`
- **Diff** : ajouter `{#if errorMsg}` après `<ul>` candidats dans la branche désambiguation.

### V2.11 - H-11 + M-31 LeadExpress step désambiguation focus + aria-live (15 min)
- **Fichiers** : `LeadExpress.svelte:115`
- **Diff** : `role="status" aria-live="polite"` sur block step + focus programmatique sur warning bandeau au mount.

---

## Vague 3 - Cohérence golden + bench externe + Mediums (6h)

### V3.1 - H-19 Pinned 1ère colonne raison sociale (45 min)
- **Fichiers** : `DataTable.svelte` (CSS th 1ère colonne)
- **Diff** : `position: sticky; left: 0; background: white;` + shadow conditionnel `box-shadow: 4px 0 4px -4px rgba(0,0,0,0.06)` quand `scrollLeft > 0`.

### V3.2 - H-20 Désaturer tabs + L-13 + L-14 micro-cleanup (45 min)
- **Fichiers** : `ProspectionTabs.svelte:121-158` + `app.css` tokens `--color-tab-*`
- **Diff** : 4 `tab-icon-wrap` en neutre repos `bg-zinc-100/text-zinc-500`. Couleur tokens uniquement sur tab active. Retirer `transform: scale(1.02)` + retirer `count bg primary-light` active.
- **Si Pascal préfère garder couleurs** : skip cette vague, doc golden v8 explicite.

### V3.3 - H-27 Calmer TriageQueue (1h)
- **Fichiers** : `TriageQueue.svelte:189+220-237`
- **Diff** : retirer bandeau primary-dark hero + ornements cercles `::before/::after`. Remplacer par section header sobre (kicker `BOLT À TRIER CE MATIN` + h2 `12 leads · file partagée` + sub line).
- **Compatible avec golden 3.7e v8** : faut MAJ doc.

### V3.4 - H-22 Bouton "Sauvegarder cette recherche" (45 min)
- **Fichiers** : `+page.svelte:454-488` (bandeau filtres) + `RecherchesPanel.svelte`
- **Diff** : bouton "Sauvegarder" visible quand `activeFilterCount > 0`, ouvre form modal nom/description, POST `/api/prospection/recherches`.

### V3.5 - Sweep spacing/typo/opacités custom (Mediums M-01 à M-28) (2h)
- **Périmètre** : `+page.svelte`, `ProspectionTabs.svelte`, `Tooltip.svelte`, `LeadSlideOut.svelte`, `BatchActionsBar.svelte`, `EnrichBatchModal.svelte`, `ImportModal.svelte`, `AlerteModal.svelte`, `RecherchesPanel.svelte`, `TriageQueue.svelte`, `LeadExpress.svelte`.
- **Stratégie** : 1 commit par fichier. Sed-grep cohérent puis review visuel. Ne pas exploser le tour, traiter par lot de 3 fichiers.
- **Risques** : changement spacing peut casser layout. Tester mobile + desktop après chaque fichier.

### V3.6 - Sémantique HTML / a11y baseline (Mediums M-29 à M-37) (45 min)
- Fixes listés findings.md M-29 à M-37 : fieldset/legend filtres, scope=col tables, `<dl>` indicateurs, role=toolbar BatchActionsBar, aria-labels boutons icônes.

---

## Fixes hors-scope batch (à reporter session dédiée ou backlog)

| ID | Description | Raison report |
|---|---|---|
| H-21 | Raccourcis clavier global Cmd+K + J/K | Chantier ≥ 8h, à cadrer V1 si dette confirmée |
| H-23 | Pattern accent-accent legacy | Vérifier survie `--color-accent` avant fix (5 min check) |
| M-46 | Vocabulaire SIMAP / Marchés publics | Discussion Pascal + impact URL bookmark + tests E2E |
| M-48 | Filtre temporel rapide chips | Cadrage UX + nouvelle feature, pas un fix |
| M-52 | Skeleton loading + aria-busy | Chantier transverse SvelteKit `$navigating` |
| M-44 | Scrollable tabs mobile au lieu de select | Chantier 4h, à arbitrer policy |
| L-12 | Migration `title=` natif vers Tooltip | Sweep transverse ≥ 1h, pas critique |

---

## Ordre d'exécution recommandé

**Session A (6h xhigh)** : Vague 1 + V2.1-V2.4 (bloquants prod + ARIA tabs + col-resizer + aria-live). Sortie : prod sécurisée + a11y critiques fixés.

**Session B (6h xhigh)** : V2.5-V2.11 + V3.1-V3.4 (focus indicators + ConfirmModal + LeadExpress + pinned colonne + désaturer tabs + calmer TriageQueue + sauvegarder recherche). Sortie : page modèle conforme golden + bench externe.

**Session C (4h high, optionnel)** : V3.5 + V3.6 + Lows backlog. Sortie : polish complet + cohérence sémantique.

---

## QA post-vague obligatoire

Après chaque vague :
- [ ] vitest run all (cible 410+ verts).
- [ ] svelte-check 0 nouvelle erreur.
- [ ] build prod OK.
- [ ] Pascal hard-refresh prod + validation visuelle (parcours P1-P4 du catalogue findings).
- [ ] Si vague touche auth/RLS/API/secrets : `code-review:security-auditor` ciblé.
- [ ] Audit a11y : axe DevTools extension Pascal sur 4 onglets × 6 états (couvre les findings WCAG sourcés).
- [ ] Lighthouse mobile + desktop sur prod après vague (couvre H-26 focus + perf).

---

## Verdict post-batch fixes

Une fois les 3 vagues complétées :
- Re-lancer audit complet 5 agents (méthode actuelle) pour validation page modèle.
- Si **0 Critical + 0 High a11y + ≤ 5 High direction artistique** : page modèle promue, gabarit pour les 6 autres pages CRM (/dashboard, /contacts, /entreprises, /pipeline, /signaux, /veille).
- Documenter dans golden v8 les patterns nouveaux validés (h-11 mobile, ARIA tabs, focus-visible, `--color-border-input`, etc.).
