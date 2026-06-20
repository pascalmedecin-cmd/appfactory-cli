# Audit UX/UI 360 - /prospection - Catalogue findings consolidé

**Date** : 2026-05-01
**Référence golden** : v7 (`.claude/goldens/audit-uiux-golden-v7-2026-05-01.json`)
**Méthode** : 5 angles orthogonaux + cross-check ≥ 2 sources + zéro fix pendant l'audit
**Statut** : 5/5 agents terminés, consolidation finale

**Sources** :
- **S1** Code statique vs golden (code-review:code-reviewer) - 80+ findings
- **S2** Bugs logiques cachés (code-review:bug-hunter) - 36 findings
- **S3** Live machine (chrome MCP + axe-core via ui-auditor) - 8 findings + cause racine bugs Pascal
- **S4** Bench externe Linear/Stripe/Notion/Attio (taste-skill) - 17 patterns gaps
- **S5** Heuristic Nielsen + WCAG 2.2 AA non-axe-core (general-purpose) - 50 findings

---

## Résumé exécutif

**Findings bruts** : ~190 (avec doublons cross-sources)
**Findings dédupliqués post cross-check** : 90

**Sévérité agrégée** :

| Sévérité | Compte | Verdict page modèle |
|---|---|---|
| **Critical** | 4 | Bloque page modèle |
| **High** | 27 | Bloque page modèle |
| **Medium** | 38 | Autorisé page modèle si tracé + à batch fixer |
| **Low** | 17 | Backlog |
| **Info** | 5 | Documenté golden |

**Verdict provisoire** : /prospection **N'EST PAS** page modèle en l'état. **31 findings Critical+High** doivent être fixés avant promotion gabarit.

**3 axes prioritaires** (ROI) :
1. **Sécurité + UX cassée** : injection PostgREST + bouton Importer masqué + scroll vertical tabs + dedup faible (4 fixes Critical, 4h).
2. **A11y baseline WCAG AA** : H1 sémantique + clavier rows/resizer + contrastes ScorePill/inputs + Toast/errorMsg aria-live + ARIA tabs pattern (10 fixes High, 6h).
3. **Cohérence golden v7 + bench externe** : sweep opacités custom + spacing 10/22/28 + hauteurs boutons + typo + désaturer tabs + pinned colonne (15 fixes batch, 6h).

**Limitations harness signalées** :
- chrome MCP `resizeTo` bloqué → viewports 1920/1440/1024/430/932 non testés objectivement (validation manuelle Pascal DevTools nécessaire pour batch fixes responsive).
- CSP bloque axe-core CDN → audit a11y machine en mode heuristique inline (~12 règles couvertes vs ~30 axe-core complet).
- LCP/CLS rétroactifs inactifs → métriques perf à valider via Lighthouse manuel.

---

## CRITICAL (4)

### C-01 Bouton "Importer des prospects" disparaît sur onglets vides
- **Sources** : S2 (bug-hunter F1) + S3 (ui-auditor live confirmé) + Pascal terrain ✓ **triple cross-check**
- **Fichier** : `src/routes/(app)/prospection/+page.svelte:328+417`
- **Cause** : `{#if data.totalLeads > 0}` englobe TOUT le bloc actions primaires (Importer + Lead express + Enrichir + kebab).
- **Périmètre élargi (S3)** : confirmé sur tab Entreprises (0 rows) ET tab Terrain (0 rows). Pas seulement entreprises.
- **Impact** : si onglet courant vide → impossible d'importer pour peupler ce tab. Workflow cassé. Pas de CTA reset visible non plus dans empty state.
- **Reco** : sortir Importer + Lead express + kebab du `{#if}`. Garder le gate uniquement pour "Mes recherches" + "Enrichir cette page". Inclure CTA Importer dans empty state des onglets vides.

### C-02 Injection PostgREST `.or()` dans search non-escapée
- **Sources** : S2 (bug-hunter F31) + mémoire S120 `feedback_postgrest_or_filter_injection.md` ✓
- **Fichier** : `src/routes/(app)/prospection/+page.server.ts:78` + `:113`
- **Cause** : `search` non escapé dans `query.or('raison_sociale.ilike.%${search}%,...')`. Pattern S120 fixé sur `all-ids/+server.ts:44` mais jamais propagé sur +page.server.ts principal (gap audit cross-fichier).
- **Impact** : potentiel filter bypass / data exfiltration via mini-DSL PostgREST (`,`, `(`, `)`, `:`, `.`). **Critique sécu prod**.
- **Reco** : reproduire le pattern all-ids (2 .ilike() en parallèle + Set dédup) ou escape strict des wildcards SQL + caractères PostgREST.

### C-03 `<tr onclick>` non opérable au clavier
- **Sources** : S1 (A9-12) + S5 (Nielsen WCAG 2.1.1 + P1 walkthrough) + S3 (ui-auditor) ✓ **triple cross-check**
- **Fichier** : `src/lib/components/DataTable.svelte:339`
- **Cause** : `<tr ... onclick={onRowClick}>` non focalisable, pas de handler keydown.
- **Impact** : utilisateur clavier ne peut pas ouvrir le slideOut détail lead depuis la table. **Violation WCAG 2.1.1 niveau A** (bloquant).
- **Reco** : `<tr tabindex="0" role="button" onkeydown={Enter|Space → onRowClick}>` OU ajouter cellule "Voir" avec `<button>` explicite.

### C-04 H1 sémantique manquant sur la page
- **Sources** : S1 (A9-01 + H1-01) + S5 (WCAG 1.3.1 + Nielsen) + S3 (ui-auditor a noté `h1="Prospection"` dans Header global, mais pas dans le template page)
- **Fichier** : `src/routes/(app)/prospection/+page.svelte` (toute la page)
- **Cause** : aucun `<h1>` dans le template page. Header global porte un `<h1>` mais c'est le label du menu via store `pageSubtitle`. Saute directement à `<h3>` ligne 541 dans empty state.
- **Note S3** : h1="Prospection" présent au niveau page selon ui-auditor (Header global). À confirmer si compté comme h1 sémantique de la page ou pas (debat). S1+S5 disent que H1 doit être dans le template page, pas dans le shell.
- **Reco** : ajouter `<h1 class="sr-only md:not-sr-only ...">Prospection</h1>` au top du template page OU exposer le `pageSubtitle` Header comme `<h1>` réel sémantique.

---

## HIGH (27)

### H-01 Scroll vertical tabs persistant (cause racine identifiée)
- **Sources** : S2 (bug-hunter F2) + S3 (ui-auditor mesure exacte) + Pascal terrain ✓ **triple cross-check**
- **Fichier** : `src/lib/components/prospection/ProspectionTabs.svelte:71` (CSS scoped `.tabs-bar`)
- **Cause racine identifiée S3** : `.tabs-bar` a `overflow: auto` (X **et** Y) + `height: 60px` **figé** + `flex-wrap: nowrap`. Mesure machine : `scrollHeight = 158px` vs `clientHeight = 59px` → écart 99px scrollable Y. Le contenu interne de chaque tab (icône + label + count + tooltip wrapper) dépasse les 60px figés. Le commentaire CSS `::-webkit-scrollbar { height: 4px }` confirme intention scroll horizontal seul.
- **Mon fix précédent (commit 2f7fa76)** : ajout `flex-1` sur cascade wrapper Phase 2 + DataTable. **N'a PAS résolu le bug** (cause différente).
- **Reco** : (a) remplacer `overflow: auto` par `overflow-x: auto; overflow-y: visible` sur `.tabs-bar`. (b) Remplacer `height: 60px` par `min-height: 60px` pour accommoder contenu naturel.

### H-02 Lead express invisible sur desktop /prospection
- **Sources** : S5 (Nielsen P2 walkthrough)
- **Fichier** : `+page.svelte:357`
- **Cause** : `class="md:hidden ..."` sur le bouton Lead express → caché desktop ≥ 768px.
- **Impact** : workflow Lead express requiert détour dashboard. Pascal sur desktop ne peut pas créer lead rapidement depuis /prospection.
- **Reco** : retirer `md:hidden` ou ajouter variante desktop visible (kebab desktop si surcharge).

### H-03 Sélection persiste au switch onglet → actions batch sur leads invisibles
- **Sources** : S2 (bug-hunter F36)
- **Fichier** : `+page.svelte:243` + `BatchActionsBar`
- **Cause** : `selectTab` reset `page=0` mais ne reset PAS `selectedIds`. 50 leads SIMAP sélectionnés → switch Terrain → BatchActionsBar visible avec actions sur IDs SIMAP **invisibles**.
- **Impact** : actions batch destructives appliquées sur leads que l'utilisateur ne voit pas. **Risque data**.
- **Reco** : reset `selectedIds = new Set()` dans `selectTab`. Idem dans `resetFilters` et au filtre change.

### H-04 toggleSelectAll vide la sélection multi-page
- **Sources** : S2 (bug-hunter F26)
- **Fichier** : `DataTable.svelte:194-200`
- **Cause** : `selectedIds.size === paged.length` peut être true par hasard sur cross-page sélection (1500 ids puis 25 visibles, si N=25 par hasard) → click toggle vide tout au lieu de désélectionner les visibles.
- **Reco** : `if (selectedIds.size > paged.length) paged.forEach(r => next.delete(r.id))`. Ne jamais vider sélection multi-page sur toggle local.

### H-05 Filtres locaux désynchronisés du serveur après nav onglet
- **Sources** : S2 (bug-hunter F8)
- **Fichier** : `+page.svelte:100-103+151-157`
- **Cause** : `let filterX = $state(data.filters.X)` initialisé au mount uniquement, jamais resync sur `data` change après `goto`. Switch onglet → URL met à jour serveur → filtres locaux périmés.
- **Reco** : `$effect.pre` resync depuis `data.filters.X` quand `data` change (avec garde égalité pour éviter boucle).

### H-06 SlideOut auto silencieux si lead absent du filtre
- **Sources** : S2 (bug-hunter F7)
- **Fichier** : `+page.svelte:255-266`
- **Cause** : `?slideOut=<id>` depuis dashboard, mais lead hors onglet/filtre courant → `data.leads.find()` undefined → URL nettoyée sans slideout ni avertissement.
- **Reco** : si `targetId` mais lead absent, toast info "Lead introuvable dans la vue actuelle" + envisager fetch direct lead par ID indépendant des filtres.

### H-07 Dedup createExpress `escapeIlike` sans `%...%` = exact match
- **Sources** : S2 (bug-hunter F12)
- **Fichier** : `+page.server.ts:466-489`
- **Cause** : `.ilike('raison_sociale', escapeIlike(raison))` sans wildcards = match strict insensible casse. "Vitrerie Dupont" ≠ "Vitrerie Dupont SA".
- **Impact** : doublons subtils non détectés malgré la promesse "dedup multi-passes".
- **Reco** : trancher avec Pascal : (a) match préfixe `${escapeIlike(raison)}%` + post-traitement Levenshtein in-mem si initial vide, (b) assumer match strict explicitement et le documenter golden.

### H-08 errorMsg invisible en step désambiguation LeadExpress
- **Sources** : S2 (bug-hunter F14)
- **Fichier** : `LeadExpress.svelte:53-100+115-160`
- **Cause** : `errorMsg` rendu dans branche `else` (ligne 161+), pas dans branche `ambiguousCandidates.length > 0` (ligne 115). Submit force_create=true qui échoue → erreur silencieuse pendant step désambiguation.
- **Reco** : afficher `{#if errorMsg}` après `<ul>` candidats dans la branche désambiguation.

### H-09 Pas d'undo + pas de confirmation batch destructif
- **Sources** : S5 (Nielsen H3.3 + H5.3)
- **Fichier** : `BatchActionsBar.svelte` + `+page.svelte` flow batch
- **Cause** : "Marquer écarté" sur 50 leads en un clic, sans confirmation, sans toast undo.
- **Reco** : (a) ConfirmModal au-dessus de N=10 prospects avant action batch destructive. (b) Toast avec action "Annuler" qui rejoue l'inverse pendant 5s (pattern Gmail).

### H-10 Toast sans `role="status"` ni `aria-live`
- **Sources** : S5 (WCAG 4.1.3 + Nielsen H1.1)
- **Fichier** : `src/lib/components/Toast.svelte:21`
- **Cause** : composant Toast ne wrappe pas la liste dans `aria-live` region.
- **Impact** : aucune annonce lecteur d'écran sur succès/erreur. WCAG 4.1.3 niveau A.
- **Reco** : `<div role="region" aria-live="polite" aria-atomic="true" aria-label="Notifications">` autour de la liste.

### H-11 errorMsg + selectAllNotice sans `role="alert"`
- **Sources** : S5 (WCAG 4.1.3) + S1 (A9-45)
- **Fichier** : `LeadExpress.svelte:236` + `+page.svelte:520`
- **Reco** : `role="alert"` sur conteneur erreur LeadExpress, `role="status"` sur selectAllNotice.

### H-12 ScorePill froid contraste 4.43:1 sous WCAG AA 4.5:1
- **Sources** : S5 (WCAG 1.4.3 mesure manuelle)
- **Fichier** : `ScorePill.svelte:74`
- **Cause** : color `#475669` sur `var(--color-info-light)` (#EDF1F5 depuis S119 décision 8) ≈ 4.43:1.
- **Note S3** : axe-core machine non chargeable (CSP), mesure non confirmée live. Mesure manuelle Nielsen S5 fait foi pour cette session, à valider avec Lighthouse Pascal.
- **Reco** : foncer texte à `#3F4D5F` (≈ 4.92:1) OU clarifier fond.

### H-13 Borders inputs sous WCAG AA 1.4.11 contraste 3:1
- **Sources** : S5 (WCAG 1.4.11)
- **Fichier** : `LeadExpress.svelte:189+204+219+232` (`border-border`) + `DataTable.svelte:449` (`dt-info-mark`)
- **Cause** : `--color-border` ≈ #E4E7EC sur blanc → ratio ~1.4:1 (sous 3:1 requis pour composant UI WCAG 2.2 AA).
- **Reco** : créer `--color-border-input` ≥ #ADB5BD (3:1) OU tokens dédiés borders interactives.

### H-14 Tooltip non dismissible (WCAG 1.4.13)
- **Sources** : S5 (WCAG 1.4.13)
- **Fichier** : `Tooltip.svelte:56+81`
- **Cause** : tooltip visible `:hover` mais `pointer-events: none` → pas hoverable depuis tooltip lui-même + pas d'Escape global pour fermer.
- **Reco** : (a) retirer `pointer-events: none` ou ajouter handler Escape global. (b) Documenter pattern dismissible/hoverable/persistent dans golden 3.7g.

### H-15 col-resizer non opérable au clavier
- **Sources** : S1 (A9-35) + S5 (WCAG 2.1.1) ✓ 2 sources
- **Fichier** : `DataTable.svelte:316`
- **Cause** : `onpointerdown` seul. Pas de `onkeydown` ArrowLeft/Right. `role="separator"` sans tabindex.
- **Reco** : `role="separator" tabindex="0"` + handler keydown ArrowLeft/Right pour ajuster largeur ±10px.

### H-16 MultiSelectDropdown sans focus-visible + sans aria-haspopup
- **Sources** : S5 (WCAG 2.4.7 + 3.3.2)
- **Fichier** : `MultiSelectDropdown.svelte:67-77`
- **Cause** : trigger `<button>` avec `transition-colors hover:border-primary/40` mais aucun `focus-visible:ring-2 focus-visible:ring-primary`.
- **Reco** : ajouter focus-visible explicite + `aria-haspopup="listbox" aria-expanded={open}`.

### H-17 ARIA tabs pattern incomplet (`role="tabpanel"` + `aria-controls` manquants + nav clavier)
- **Sources** : S1 (A9-04) + S5 (Nielsen + WCAG) + S3 (ui-auditor live mesure : 0 `[role=tabpanel]`, 4 tabs avec `aria-controls=null`) ✓ **triple cross-check**
- **Fichier** : `ProspectionTabs.svelte:29-51` + `+page.svelte:570-624`
- **Cause** : DataTable rendu sous tabs sans `role="tabpanel"` ni `aria-labelledby`. Tabs sans navigation ArrowLeft/Right ARIA. Lecteurs d'écran ne peuvent pas annoncer relation tab↔panel.
- **Reco** : wrapper DataTable dans `<div role="tabpanel" id="tabpanel-{tab}" aria-labelledby="tab-{tab}">` + `id="tab-{tab}"` sur boutons. Ajouter handler `onkeydown` ArrowLeft/Right pour focus tabs adjacentes.

### H-18 Empty state filtres actifs sans CTA reset visible
- **Sources** : S2 (bug-hunter F3) + S5 (Nielsen H9.5) + S3 (ui-auditor confirmé empty state "Aucun prospect" sans CTA Importer dans tab vide)
- **Fichier** : `DataTable.svelte:331` + `+page.svelte:536`
- **Cause** : si `data.totalLeads === 0 && activeFilterCount > 0`, le DataTable affiche `emptyMessage="Aucun prospect..."` sans bouton "Réinitialiser" centré dans la zone tableau.
- **Reco** : empty state intermédiaire actionnable avec bouton "Réinitialiser les filtres" centré quand filtres actifs. Inclure CTA Importer dans tabs vides.

### H-19 Pas de pinned colonne raison sociale (scroll horizontal)
- **Sources** : S4 (taste-skill bench gap 2.3)
- **Fichier** : `DataTable.svelte` (CSS th 1ère colonne)
- **Cause** : scroll horizontal sur tablette/mobile fait perdre la raison sociale. Pattern Attio/Linear best-in-class.
- **Reco** : `position: sticky; left: 0; background: white; box-shadow: 4px 0 4px -4px rgba(0,0,0,0.06)` quand `scrollLeft > 0`.

### H-20 4 couleurs tabs simultanées = palette artisanale terreuse
- **Sources** : S4 (taste-skill bench gap 3.1+3.2)
- **Fichier** : `app.css` tokens `--color-tab-*` + `ProspectionTabs.svelte`
- **Cause** : palette bleu pétrole + terracotta + sauge + prune (saturations ~30-40%) = "café-restaurant" pas SaaS premium 2026 (Linear/Stripe = monochrome strict avec accent unique électrique).
- **Reco** : passer 4 `tab-icon-wrap` en neutre repos `bg-zinc-100/text-zinc-500`, garder couleur seulement sur tab active. 1 actif coloré vs 3 neutres.

### H-21 Pas de raccourcis clavier global
- **Sources** : S4 (taste-skill bench gap 1.5) + S5 (Nielsen H7.1)
- **Cause** : pattern Linear (`Cmd+K`, `J/K` navigation, `?` cheatsheet) absent. Power-users ~30 min/jour ici.
- **Reco** : phase ultérieure à cadrer V1 si dette. Liste : `1-4` switch tabs, `J/K` rows, `Y/N/L/V` triage, `/` search, `?` cheatsheet.

### H-22 Recherches sauvegardées : pas d'affordance création
- **Sources** : S5 (Nielsen H6.2)
- **Fichier** : `RecherchesPanel.svelte`
- **Cause** : "Mes recherches" affiché si `data.recherches.length > 0`, mais aucune affordance pour CRÉER une recherche depuis les filtres actifs.
- **Reco** : bouton "Sauvegarder cette recherche" dans le bandeau filtres quand `activeFilterCount > 0`.

### H-23 Pattern accent `accent-accent` Tailwind classes legacy
- **Sources** : S1 (A9-49)
- **Fichier** : `EnrichBatchModal.svelte:240+248`
- **Cause** : `class="accent-accent"` référence couleur `accent` dont le variant Badge a été retiré S118 décision 7. Si CSS var --color-accent existe encore, OK ; sinon broken.
- **Reco** : vérifier survie `--color-accent` dans `app.css`. Si retiré, remplacer par `accent-primary`.

### H-24 [NOUVEAU S3] Input "Rechercher un prospect..." sans label accessible
- **Sources** : S3 (ui-auditor live)
- **Fichier** : `DataTable.svelte` (search input dans header sticky)
- **Cause** : input avec placeholder mais sans `aria-label` ni `<label for>`.
- **Impact** : lecteurs d'écran annoncent "edit text" sans contexte.
- **Reco** : `aria-label="Rechercher un prospect"` sur l'input.

### H-25 [NOUVEAU S3] `<select id="tabs-mobile-select">` sans label accessible
- **Sources** : S3 (ui-auditor live)
- **Fichier** : `ProspectionTabs.svelte:55`
- **Cause** : `<select>` mobile fallback sans `aria-label` (visually-hidden label existe mais pas pour cet élément).
- **Note** : audit S1 (A9-02) avait noté que tablist était conforme côté desktop, mais le fallback mobile select n'est pas couvert par le `<label>` visually-hidden ligne 54.
- **Reco** : `aria-label="Filtrer par nature de signal"` sur le select.

### H-26 [NOUVEAU S3] Focus indicators clavier suspectés absents
- **Sources** : S3 (ui-auditor heuristique inline)
- **Fichier** : multiple - tabs `[role=tab]`, search input, bouton Importer
- **Cause** : `outline-style: none` partout, `box-shadow: none`, aucune règle `:focus-visible` custom dans les feuilles. JavaScript `.focus()` ne déclenche pas `:focus-visible` donc impossible à confirmer en JS.
- **Action requise Pascal** : DevTools manuel + Tab clavier sur /prospection, vérifier qu'un anneau focus visible apparaît sur chaque élément interactif.
- **Reco** : si confirmé absent, ajouter règles `:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }` sur tabs + buttons + inputs. WCAG 2.4.7 niveau AA.

### H-27 Bandeau hero TriageQueue + ornements cercles = pattern dashboard 2018-2020
- **Sources** : S4 (taste-skill bench gap 1.1+1.2)
- **Fichier** : `TriageQueue.svelte:189+220-237`
- **Cause** : bandeau primary-dark + count 88px + 2 ornements cercles `rgba(white, 0.04)` = pattern Mailchimp/HubSpot legacy. Linear/Stripe/Attio 2026 = sobre, monochrome.
- **Reco** : retirer hero dark + ornements, remplacer par section header sobre (kicker `BOLT À TRIER CE MATIN` + h2 `12 leads · file partagée`) + actions hover-reveal.

---

## MEDIUM (38)

### Spacing canonique violé (échelle 4/8/12/16/24/32/48 retrait 2/6/10/20)

| ID | Fichier:ligne | Code actuel | Reco |
|---|---|---|---|
| M-01 | `+page.svelte:339+352+391+402+431` | `px-1.5 py-0.5` (5 occurrences count badges) | `px-2 py-0.5` ou créer token `pill-xs` |
| M-02 | `ProspectionTabs.svelte:96` | `gap: 10px` | `gap: 8px` ou `12px` |
| M-03 | `ProspectionTabs.svelte:97` | `padding: 16px 22px` | `16px 24px` |
| M-04 | `ProspectionTabs.svelte:142` | `padding: 1px 8px` count | `2px 8px` ou `0 8px` |
| M-05 | `Tooltip.svelte:38+41` | `top: calc(100% + 10px)` + `padding: 10px 14px` | `12px` + `12px 16px` |
| M-06 | `LeadSlideOut.svelte:131-138` | `py-0.5` (2px) | `py-1` (4px) |
| M-07 | `BatchActionsBar.svelte:31+46+52` | `px-3 py-1.5` (6px) | `h-10 px-4 box-border` |
| M-08 | `EnrichBatchModal.svelte:230+239+247+261+304` | `p-3.5`, `p-2.5`, `gap-2.5` (10px) | Aligner 8/12 |
| M-09 | `ImportModal.svelte:128+141+155+163+177+221+236+272+277+286+296` | `px-3 py-1.5` partout | Refonte cohérente h-10 + box-border |
| M-10 | `AlerteModal.svelte:89+145+157` | `px-3.5 py-2.5` inputs | `h-[34px] px-3` (golden 3.2) |
| M-11 | `+page.svelte:298+307+316` | `px-7 py-7` (28px) indicateurs flat | À arbitrer : étendre échelle à 28 OU aligner 32 (3xl). Contradiction interne golden v7 (décision 2 vs 3.7d) |
| M-12 | `+page.svelte:467` | `h-3.5 w-3.5` checkbox (14px) | `h-4 w-4` (16px) |

### Hauteurs boutons hors h-10 (golden décision 3)

| ID | Fichier:ligne | Code actuel | Reco |
|---|---|---|---|
| M-13 | `LeadSlideOut.svelte:131+257+267+282` | `px-4 py-2` ~36px | `h-10 px-4 box-border` |
| M-14 | `LeadSlideOut.svelte:241` | `px-3 py-2` ~36px | `h-10 px-3` |
| M-15 | `BatchActionsBar.svelte:31+46+52` | divers | `h-10 px-4 box-border` |
| M-16 | `EnrichBatchModal.svelte:286+341+344+415` | `px-4 py-2` | `h-10 px-4 box-border` |
| M-17 | `LeadExpress.svelte:147+155+247+254` (mobile) | `h-11 + min-h-11` | Documenter exception mobile-44px (HIG) dans golden v8 OU aligner h-10 partout |
| M-18 | `+page.svelte:357+374` | `h-11` boutons mobile | Idem M-17 - policy doc à trancher |

### Typo hors échelle (12/14/16/18/22, micro=10)

| ID | Fichier:ligne | Code actuel | Reco |
|---|---|---|---|
| M-19 | `ProspectionTabs.svelte:81` | `font-size: 15px` tab | `14px` body ou `16px` h3 |
| M-20 | `ProspectionTabs.svelte:144` | `font-size: 11px` count | `12px` caption ou `10px` micro |
| M-21 | `TriageQueue.svelte:269` | `font-size: 12.5px` CTA aside | `12px` ou `13px` |
| M-22 | `TriageQueue.svelte:336+346` | `font-size: 15px` name + `13px` context | `14px`/`16px` + `13px` micro accepté |

### Opacités custom statiques (extension décision 6 validée Pascal)

| ID | Fichier:ligne | Code actuel | Reco |
|---|---|---|---|
| M-23 | `LeadSlideOut.svelte:131+241` | `bg-danger/10`, `bg-warning/10`, `border-warning/20` | tokens `bg-danger-light`, `border-warning` ou créer `border-warning-soft` |
| M-24 | `BatchActionsBar.svelte:18` | `color-mix` inline | token `--color-prosp-import-border-soft` |
| M-25 | `EnrichBatchModal.svelte:230+331` | `bg-prosp-enrich-bg/10`, `bg-surface-alt/50`, `border-prosp-enrich-border/10`, `border-border/50` | tokens pleins |
| M-26 | `RecherchesPanel.svelte:41+59+65` | `bg-surface-alt/60`, `border-border/50`, `hover:border-primary/20`, `bg-danger/10` | tokens pleins (hover transient OK) |
| M-27 | `AlerteModal.svelte:131-134` | `color-mix` inline | tokens `prosp-enrich-soft` |
| M-28 | `+page.svelte:558` | `border-warning/30` statique | `border-warning-soft` token |

### Sémantique HTML / a11y baseline

| ID | Fichier:ligne | Type | Reco |
|---|---|---|---|
| M-29 | `+page.svelte:298-324` | Indicateurs `<div>` non listés sémantiquement | Wrapper `<dl><dt><dd>` (label/valeur) |
| M-30 | `+page.svelte:445-449` | Filtres MultiSelect groupés sans fieldset/legend | `<fieldset><legend class="sr-only">Filtres</legend>` |
| M-31 | `LeadExpress.svelte:115-160` | Step désambiguation pas annoncé (focus + aria-live) | `role="status" aria-live="polite"` + focus programmatique sur warning bandeau |
| M-32 | `EnrichBatchModal.svelte:218+222` | h2 dialog sans id + close button sans aria-label | `id="enrich-modal-title"` + `aria-labelledby` + `aria-label="Fermer"` |
| M-33 | `RecherchesPanel.svelte:76` | Bouton supprimer icône sans aria-label | `aria-label="Supprimer la recherche {nom}"` |
| M-34 | `BatchActionsBar.svelte:18` | Pas de `role="toolbar"` | `role="toolbar" aria-label="Actions sélection"` |
| M-35 | `RecherchesPanel.svelte:32-83` + `TriageQueue.svelte:303-313` | Items répétés en `<div>` sans `<ul>/<li>` | Wrapper sémantique liste |
| M-36 | `DataTable.svelte:251+259` | `<th>` sans `scope="col"` | Ajouter scope=col |
| M-37 | `LeadSlideOut.svelte:215-223` | `<a target="_blank" rel="noopener">` | Ajouter `noreferrer` |

### Comportements / edge cases

| ID | Fichier:ligne | Description | Reco |
|---|---|---|---|
| M-38 | `+page.svelte:557-569` | Bandeau filtre source incompatible AVEC tableau vide en dessous = bruit | Si `sourceFilterIncompatible`, masquer DataTable (early return) |

### Comportements / cohérence patterns

| ID | Description | Source | Reco |
|---|---|---|---|
| M-39 | Bandeau hero TriageQueue + ornements cercles (HIGH H-27 si jugé bench-critical, sinon Medium si jugé direction artistique acceptable) | S4 taste 1.1+1.2 | À arbitrer : H-27 (bloquant page modèle) ou Medium (defensible) |
| M-40 | 4 boutons action permanents 4×12 = bruit visuel queue triage | S4 taste 1.3 | `opacity-0 group-hover:opacity-100` reveal au hover desktop, persist mobile |
| M-41 | ScorePill height 26px vs Stripe 20-22px Linear 22-24px | S4 taste 4.3 | `height: 22px; padding: 0 8px; font-size: 11px` densifier |
| M-42 | ScorePill min-width 130px gaspillage horizontal | S4 taste 4.2 | Retirer min-width sur compact (déjà partiel) |
| M-43 | Glyphe `target` sur "À qualifier" sémantiquement faible | S4 taste 4.5 | `list-checks` ou retirer icône (option Stripe) |
| M-44 | Mobile tabs = `<select>` natif perd identité visuelle | S4 taste 3.5 | Scrollable tabs horizontal au lieu de select |
| M-45 | Drag handle resize colonnes invisible avant hover | S4 taste 2.4 | `1px hairline border` au repos, `2px primary` au hover |

### Vocabulaire / aide

| ID | Description | Source | Reco |
|---|---|---|---|
| M-46 | Vocabulaire double "SIMAP" technique vs "Marchés publics" label | S5 Nielsen H2.1 | Standardiser : "Marchés publics" partout (URL `?tab=marches`) ou documenter mix |
| M-47 | "RegBL" acronyme opaque | S5 Nielsen H2.2 | "Chantiers (permis de construire)" sous-titre RegBL |
| M-48 | Pas de filtre temporel rapide ("Aujourd'hui / Cette semaine / Ce mois") | S5 Nielsen P1+H7.2 | Chip group au-dessus des filtres |
| M-49 | "Importer des prospects" ambigu (CSV ? Zefix ? sources publiques ?) | S5 Nielsen P3 | Sous-libellé "depuis registres publics" ou tooltip |
| M-50 | LeadExpress fail générique "Erreur lors de la création" | S5 Nielsen H9.1 | Mapper codes server (validation/dedup/network) en messages distincts |
| M-51 | Pas de retry button sur "Erreur réseau" | S5 Nielsen H9.2 | Bouton "Réessayer" inline dans toast |
| M-52 | Pas de skeleton/aria-busy pendant `goto` (filtres, tri, pagination) | S5 Nielsen H1.3+H1.4 | Skeleton row + `aria-busy` pendant `$navigating` |

### State / behaviour

| ID | Source | Description | Reco |
|---|---|---|---|
| M-53 | S2 F39 + F5 | `showSelectAllBanner` conditions strictes | Suivre intention explicite |
| M-54 | S2 F40 | `resetFilters` ne reset pas tab/search/page | Documenter |
| M-55 | S2 F41 + F10 | `showTransferred` filtré INclusivement avec filterStatuts | Sync UI |
| M-56 | S2 F42 + F17 | `alreadySnoozed:true` traité comme succès | UI lit body + toast info distinct |
| M-57 | S2 F43 + F15 | `$effect reset` au close même si `saving=true` | Ne pas reset si saving |
| M-58 | S2 F44 + F16 | Toast fire avant nav goto | Toast après await goto résolu |
| M-59 | S5 Nielsen H6.4 | Indicateurs flat sans contexte temporel | Sous-titre "depuis création" ou "30j" |

---

## LOW (17)

| ID | Fichier:ligne | Type | Reco |
|---|---|---|---|
| L-01 | `ProspectionTabs.svelte:108-109` | `border-radius: 7px` (hors échelle 4/8/10/12) | `8px` (md) |
| L-02 | `LeadSlideOut.svelte:128` | Card gradient non-tokenisé | Variant "card-emphasis" documenté |
| L-03 | `EnrichBatchModal.svelte:215` | Header gradient prosp tokens | Variant 3 documentée OU header accent |
| L-04 | `EnrichBatchModal.svelte:286+415` | `!bg-prosp-enrich` (`!important`) | Refacto specificity |
| L-05 | `Tooltip.svelte:51` | Custom shadow non-token | `--shadow-tooltip` |
| L-06 | `TriageQueue.svelte:268` | `rgba(190, 211, 235, 0.95)` magique | `--color-aside-cta-text` token |
| L-07 | `+page.svelte:299` | `radial-gradient` inline répété 3× | Classe utilitaire `.indicator-icon-bg` |
| L-08 | `+page.svelte:541` | `<h3>` empty state au lieu de `<h2>` (post fix C-04) | Aligner après H1 |
| L-09 | `EnrichBatchModal.svelte:208` | `rounded-2xl` modal (16px hors échelle) | `rounded-xl` (12) golden 3.4 |
| L-10 | `+page.svelte:32+311+320` | "Marché" mobile abrégé peut induire confusion | Tooltip ou texte complet |
| L-11 | `Toast.svelte:30` close button taille | Vérifier ≥ 24×24 (WCAG 2.5.5) | Padding minimum |
| L-12 | `MultiSelectDropdown.svelte:69` | `title=` natif (700ms+ délai, no clavier) | Migrer vers `Tooltip.svelte` (`:focus-within`) |
| L-13 | Tab scale 1.02 active animation imperceptible | S4 taste 3.3 | Retirer transform scale |
| L-14 | Tab count bg active `primary-light` (double signal) | S4 taste 3.4 | Retirer count bg active (1 seul signal sélection) |
| L-15 | `+page.svelte:151-157` | Pas de cleanup timeout debounce au démount | Optionnel cleanup |
| L-16 | `DataTable.svelte:329-334` | EmptyMessage table flash transitoire pendant goto | OK acceptable |
| L-17 | `triage/+server.ts:101-105` UPDATE filtre statut='nouveau' | Cohérent design | OK |

---

## INFO (5) - patterns à pérenniser dans golden v8

| ID | Description | Source |
|---|---|---|
| I-01 | ScorePill direction artistique (#C0391A rouge corail vs Linear #F2453D vif) défendable, garder | S4 taste 4.1 |
| I-02 | Anim spring `cubic-bezier(0.16, 1, 0.3, 1)` btn-action = directement Notion-grade | S4 taste sthèse |
| I-03 | Tabular-nums sur counts = règle taste-skill VISUAL_DENSITY respectée | S4 taste sthèse |
| I-04 | localStorage persistance widths colonnes avec bornes garde-fou + a11y native button = niveau Linear engineering | S4 taste sthèse |
| I-05 | Granularité 3 buckets vs Linear 5 niveaux | S4 taste 4.4 - hors scope V1, à reconsidérer post-utilisation |

---

## Cross-check matrice (sources confirmant chaque finding)

| ID | S1 code | S2 bug | S3 live | S4 taste | S5 nielsen | Statut |
|---|---|---|---|---|---|---|
| C-01 | | ✓ | ✓ | | | confirmé Pascal terrain - **3 sources** |
| C-02 | | ✓ | | | | + mémoire S120 = 2 sources |
| C-03 | ✓ | | ✓ | | ✓ | **3 sources** |
| C-04 | ✓ | | ⚠ | | ✓ | 2 sources (S3 ambigu sur h1 Header global) |
| H-01 | | ✓ | ✓ | | | + Pascal = **3 sources** + cause racine S3 |
| H-02 | | | | | ✓ | 1 source - parcours P2 |
| H-03 | | ✓ | | | | 1 source |
| H-04 | | ✓ | | | | 1 source |
| H-05 | | ✓ | | | | 1 source |
| H-06 | | ✓ | | | | 1 source |
| H-07 | | ✓ | | | | 1 source |
| H-08 | | ✓ | | | | 1 source |
| H-09 | | | | | ✓ | 1 source |
| H-10 | | | ✓ | | ✓ | 2 sources (S3 confirmé via heuristique inline) |
| H-11 | ✓ | | ✓ | | ✓ | **3 sources** |
| H-12 | | | ⚠ | | ✓ | 1 source mesure (CSP a bloqué axe-core machine) |
| H-13 | | | ⚠ | | ✓ | 1 source mesure (idem) |
| H-14 | | | | | ✓ | 1 source |
| H-15 | ✓ | | | | ✓ | 2 sources |
| H-16 | | | | | ✓ | 1 source |
| H-17 | ✓ | | ✓ | | ✓ | **3 sources** |
| H-18 | | ✓ | ✓ | | ✓ | **3 sources** |
| H-19 | | | | ✓ | | 1 source - bench externe |
| H-20 | | | | ✓ | | 1 source - bench externe |
| H-21 | | | | ✓ | ✓ | 2 sources |
| H-22 | | | | | ✓ | 1 source |
| H-23 | ✓ | | | | | 1 source |
| H-24 | | | ✓ | | | 1 source - nouveau S3 |
| H-25 | | | ✓ | | | 1 source - nouveau S3 |
| H-26 | | | ⚠ | | | 1 source suspecté - **Pascal valide via DevTools manuel** |
| H-27 | | | | ✓ | | 1 source - bench externe |

⚠ = mesure non finalisée par S3 (limitations chrome MCP : resize bloqué, CSP bloque axe-core).

**Findings à confirmer en batch fixes session suivante** (cross-check incomplet) :
- H-12, H-13 : axe DevTools extension Pascal nécessaire pour mesure machine officielle.
- H-26 : Pascal DevTools manuel + Tab clavier sur /prospection.
- C-04 : trancher policy "h1 Header global suffit-il ?" avec Pascal.
