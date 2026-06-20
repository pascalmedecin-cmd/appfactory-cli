# Audit UX/UI 360 - /prospection - Matrice de couverture

**Date** : 2026-05-01
**Effort** : xhigh
**Méthode** : 5 angles orthogonaux + cross-check ≥ 2 sources + zéro fix pendant l'audit
**Référence** : golden v7 (`.claude/goldens/audit-uiux-golden-v7-2026-05-01.json`) + GOLDEN_STANDARDS.md
**Verdict cible** : /prospection page modèle pour les 6 autres pages CRM ?

---

## Périmètre exhaustif

### URL prod
- https://filmpro-crm.vercel.app/prospection

### Code source
- `src/routes/(app)/prospection/+page.svelte` (654 lignes)
- `src/routes/(app)/prospection/+page.server.ts` (511 lignes)
- `src/routes/(app)/prospection/createExpress.test.ts`
- `src/routes/api/prospection/triage/[action]/+server.ts`
- `src/routes/api/prospection/all-ids/+server.ts`

### Composants enfants (10)
- `src/lib/components/prospection/ProspectionTabs.svelte`
- `src/lib/components/prospection/LeadExpress.svelte`
- `src/lib/components/prospection/LeadSlideOut.svelte`
- `src/lib/components/prospection/ScorePill.svelte`
- `src/lib/components/prospection/BatchActionsBar.svelte`
- `src/lib/components/prospection/EnrichBatchModal.svelte`
- `src/lib/components/prospection/ImportModal.svelte`
- `src/lib/components/prospection/AlerteModal.svelte`
- `src/lib/components/prospection/RecherchesPanel.svelte`
- `src/lib/components/prospection/TemperatureSelect.svelte`
- `src/lib/components/dashboard/TriageQueue.svelte` (hors page mais lié)

### Composants partagés impactants
- `src/lib/components/DataTable.svelte` (extension dense/resizable Phase 2)
- `src/lib/components/Tooltip.svelte`
- `src/lib/components/Header.svelte` (porte le H1 sémantique)
- `src/lib/components/Badge.svelte`
- `src/lib/components/Icon.svelte` + `icon-map.ts`
- `src/lib/components/MultiSelectDropdown.svelte`
- `src/lib/components/ModalForm.svelte`

### Utils
- `src/lib/prospection-utils.ts` (PROSPECTION_TABS, TAB_SOURCE_MAP, scoring helpers, sourceLabel, formatLeadContext, cantonNoms)

### CSS tokens spécifiques
- `--color-tab-{simap,regbl,entreprises,terrain}` + `-bg`
- `--color-prosp-{import,enrich,qualify,convert}` + `-bg` + `-border`

---

## 10 axes d'audit

| # | Axe | Source primaire |
|---|---|---|
| 1 | Hiérarchie visuelle | Refactoring UI principles + heuristic 8 Nielsen (aesthetic and minimalist design) |
| 2 | Responsive layout | golden v7 + GOLDEN_STANDARDS_RESPONSIVE.md |
| 3 | A11y (axe-core + clavier + sémantique) | WCAG 2.2 quickref (w3.org/WAI/WCAG22/quickref) |
| 4 | Feedback states (loading, error, success, empty) | Heuristic 1 Nielsen (visibility of system status) |
| 5 | Cohérence golden v7 (tokens, composants, patterns) | golden v7 JSON + GOLDEN_STANDARDS.md |
| 6 | Micro-interactions (hover, focus, click, transitions) | Material Design Motion + Linear/Stripe patterns |
| 7 | Workflow ergonomique (parcours utilisateur réel) | Cognitive walkthrough Nielsen |
| 8 | Performance (LCP, CLS, INP, JS unused) | Web.dev Lighthouse + Core Web Vitals 2026 |
| 9 | Sémantique HTML + contrastes | WCAG 2.2 + HTML Living Standard |
| 10 | Bench externe (Linear, Stripe, Notion, Attio) | taste-skill direction artistique cross-app |

---

## Matrice viewport × état × onglet

### Viewports (5)

| Code | Largeur | Hauteur | Profil |
|---|---|---|---|
| D1920 | 1920px | 1080px | Desktop large (cinéma, dual screen) |
| D1440 | 1440px | 900px | Desktop standard (MacBook 14") |
| T1024 | 1024px | 768px | Tablette landscape |
| MP430 | 430px | 932px | Mobile portrait (iPhone 14 Pro Max) |
| ML932 | 932px | 430px | Mobile landscape (iPhone 14 Pro Max pivoté) |

### États (6)

| Code | Description | Trigger |
|---|---|---|
| E-VIDE | Empty state global (système jamais peuplé) | `data.tabCounts.* === 0 ET activeFilterCount === 0` |
| E-FILT | Empty filtre (résultats nuls sur filtres actifs) | Filtre incompatible source × onglet OU filtre canton inexistant |
| E-DATA | Affichage normal (données présentes) | Cas par défaut prod |
| E-LOAD | Loading (chargement initial + selectAll) | 1ʳᵉ requête + clic "Sélectionner tous" |
| E-ERR | Error réseau / timeout / 500 | API down + selectAllNotice type=error + import échec |
| E-MULTI | Sélection multi-rows (banner sélection globale) | ≥ 2 selectedIds + showSelectAllBanner |

### Onglets (4)

- SIMAP (marchés publics)
- RegBL (chantiers permis bâtiment)
- Entreprises (Zefix + search.ch)
- Terrain (lead_express + veille)

### Combinaisons signifiantes (~103 cellules)

| Axe | × Viewport | × État | × Onglet | Total |
|---|---|---|---|---|
| 1. Hiérarchie | 5 | 3 (E-VIDE, E-FILT, E-DATA) | - (constante) | 15 |
| 2. Responsive | 5 | 1 (E-DATA) | 4 | 20 |
| 3. A11y axe-core | 5 | 6 | - | 30 |
| 4. Feedback states | 1 (D1440) | 6 | 1 (SIMAP) | 6 |
| 5. Cohérence golden | 1 (D1440) | 1 | 4 | 4 |
| 6. Micro-interactions | 1 (D1440) | 1 (E-DATA) | 4 (hover/focus/click sur tabs/scorepill/dt-row/actionbtn) | 4 |
| 7. Workflow ergonomique | 1 (D1440) + 1 (MP430) | 1 (parcours matin) | - | 2 |
| 8. Performance | 2 (D1440 + MP430) | 1 (E-DATA) | 1 (SIMAP) | 2 |
| 9. Sémantique | 5 | 1 | - | 5 |
| 10. Bench externe | 1 | 1 | 4 patterns × 4 concurrents | 16 |
| **TOTAL** | | | | **103** |

---

## 5 angles d'investigation (subagents parallèles)

### A. Code statique vs golden (subagent code-review:code-reviewer)
- Cibles : axes 1, 5, 9
- Outputs : findings code violations golden v7 (tokens, spacing, opacités, sémantique)
- Format : `{fichier:ligne, type, sévérité, code actuel, attendu golden, recommandation}`

### B. Bugs logiques cachés (subagent code-review:bug-hunter)
- Cibles : axes 4, 7
- Outputs : conditions if/else suspectes, edge cases états vides, flux brisés (ex: bouton Importer masqué sur tab Entreprises vide), cascade hauteur flex, race conditions
- Format : `{fichier:ligne, scénario reproductible, impact utilisateur, sévérité}`

### C. Comportement live machine (chrome MCP + Playwright + axe-core)
- Cibles : axes 2, 3, 6, 8
- Outputs : screenshots × matrice viewport × état × onglet, axe-core violations, dimensions, overflow, INP/LCP/CLS Lighthouse
- Format : `{viewport, état, onglet, capture, mesure, sévérité}`

### D. Bench externe (taste-skill + general-purpose)
- Cibles : axes 1, 6, 10
- Outputs : comparaison patterns Linear (Inbox triage + Issues table) / Stripe Dashboard (queue triage actions) / Notion Database (tableau dense + onglets) / Attio (CRM tableau dense + filters)
- Format : `{pattern, concurrents, gap /prospection vs best-in-class, reco prioritisée}`

### E. Heuristic evaluation (general-purpose Nielsen + WCAG)
- Cibles : axes 4, 7, 9
- Outputs : violations 10 heuristiques Nielsen + WCAG 2.2 niveau AA non couverts par axe-core (ex: relation labels/inputs, ordre lecture, cognitive load)
- Format : `{heuristique #, violation, sévérité, reco}`

---

## Cross-check (règle dure)

- **Confirmé** : finding listé dans ≥ 2 angles → catalogue.
- **À vérifier** : finding dans 1 seul angle → vérification manuelle ciblée par moi avant catalogue.
- **Tracé même hors-scope** : tout finding listé, justification si non-fixable cette session (ex: "perf RUM hors scope, dépend déploiement Sentry/Vercel Analytics").

---

## Sévérité (grille stricte)

| Code | Définition | Verdict page modèle |
|---|---|---|
| C - Critical | Bug bloquant utilisateur (page inutilisable, sécurité, données perdues) | Bloque page modèle |
| H - High | Bug visible / a11y violation serious / régression UX significative | Bloque page modèle |
| M - Medium | Cohérence golden, micro-bug UX, edge case rare | À batch fixer (autorisé page modèle si tracé) |
| L - Low | Polish cosmétique, optimisation mineure | Backlog |
| I - Info | Documentation manquante, pattern à pérenniser | Documenté golden |

---

## Livrables (notes/audit-uiux-prospection-2026-05-01/)

- `coverage.md` (ce fichier) - matrice de couverture figée
- `findings.md` - catalogue par axe × sévérité × preuve cross-checkée
- `screenshots/` - captures matrice (~103 fichiers max)
- `sources/` - extraits référence (Nielsen, WCAG, bench externe)
- `actionplan.md` - ordonnancement fixes batch session suivante par impact × effort
- `verdict.md` - synthèse exec : page modèle ? prérequis chiffrés ?

---

## Garde-fous

1. **Aucun fix pendant l'audit** (anti-pattern session précédente : 4 fixes au fil = audit dérivé).
2. **Cross-check ≥ 2 sources** obligatoire pour catalogue. Sinon vérification ciblée.
3. **Tout finding tracé** même hors-scope (justification explicite).
4. **Validation Pascal du catalogue** avant batch fixes (qui sera Bloc dédié session suivante).
5. **Découpe possible** si l'audit déborde la session : Phase 0+1+2 → session A, Phase 3 livrables + verdict → session B.
