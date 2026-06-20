# Spec d'implémentation — Refonte /pipeline v9

**Origine** : cascade gabarit golden v9 sur page /pipeline (page 2 après /dashboard livré S175). Bloc #1 cockpit actif.
**Référence design** : `notes/refonte-pipeline-2026-05-08/mockup.html` (validé Pascal 2026-05-08).
**Golden** : `~/.claude/goldens/v9-2026-05-06/` (archétype workspace + tokens + primitives v9, règle `noDashedLines` ajoutée S176bis).
**Effort** : xhigh — Score 4/4 (structurelle, multi-étapes, itération coûteuse, non-mesurable).
**Estimation** : 3h00 impl + 30 min audit/tests = **3h30**.
**Branch** : `feat/pipeline-v9`.

---

## 1. Critères d'acceptation (binaires)

Chaque critère se lit "vrai / faux". Pas de "presque", pas de "à voir". Tous doivent être verts avant push prod.

### Tokens & typographie
1. **AC-01** — `+page.svelte` consomme uniquement les tokens CSS v9 (`var(--c-primary)`, `var(--c-primary-light)`, `var(--c-text)`, `var(--c-text-muted)`, `var(--c-border)`, `var(--c-hairline)`, etc.). Zéro couleur hardcodée hex/rgb dans le scoped CSS de la page.
2. **AC-02** — Police DM Sans héritée du layout global (aucun `font-family` ré-déclaré localement).
3. **AC-03** — Spacing 4/8/12/16/24/32/48 uniquement (cohérent Tailwind canonique). Aucun 2/6/10/20.

### Header condensé
4. **AC-04** — H1 sémantique « Pipeline » géré par layout app via `pageSubtitle` store (pattern existant) ; subtitle dynamique du type `12 opportunités actives · 213 600 CHF en cours`.
5. **AC-05** — Bouton « Nouvelle opportunité » primary à droite du header de page (preserve la position actuelle, juste alignée v9).

### Indicateurs flat premium
6. **AC-06** — Composant `PipelineIndicators.svelte` créé. 4 cards flat horizontales : Opportunités actives (count), Valeur pipeline (sum montant_estime des étapes actives, formaté `k CHF` ou `CHF`), Gagné en mai (count + valeur), Relances en retard (count overdue).
7. **AC-07** — Layout `grid-template-columns: repeat(4, 1fr)` desktop, `repeat(2, 1fr)` < 1024 px, `1fr` < 768 px. Séparateurs verticaux 1px `var(--c-border)` entre indicateurs (uniquement desktop, retirés sur 2-col et 1-col).
8. **AC-08** — IconBox 44×44, radius 12px, `radial-gradient(circle at 30% 30%, rgba(47,90,158,.10), rgba(47,90,158,.02))`. Icône Lucide stroke 1.5, 22 px. L'indicateur "Relances en retard" emploie une variante rouge (`rgba(192,57,26,.12)` → `rgba(192,57,26,.02)`, color `var(--c-error)`).
9. **AC-09** — Valeur 36 px, weight 700, `font-variant-numeric: tabular-nums`, `letter-spacing: -0.025em`, line-height 1.

### Tabs ARIA
10. **AC-10** — Composant `PipelineTabs.svelte` ARIA strict : `<div role="tablist">` parent, 3 `<button role="tab" aria-selected aria-controls>` (En cours / Closed / Toutes), pas de `<select>` déguisé. `<div role="tabpanel" aria-labelledby>` autour du Kanban.
11. **AC-11** — Tab actif : `border-bottom: 2px solid var(--c-primary)`, color primary, weight 600. Tab inactif : `border-bottom: 2px solid transparent`, color text-muted. Pas de `dashed`.
12. **AC-12** — Tabs filtrent les colonnes Kanban : « En cours » → 4 colonnes (identification → négociation), « Closed » → 2 colonnes (gagné, perdu), « Toutes » → 6 colonnes scroll horizontal. Switch instantané sans rechargement DOM (via `$state` + `$derived`).
13. **AC-13** — Tabs-bar sticky `top: <header-height>` z-index 8, fond opaque `var(--c-surface)`, `border-bottom: 1px solid var(--c-border)`.

### Kanban — colonnes
14. **AC-14** — Composant `PipelineColumn.svelte` extrait. Props : `etape` (object), `opps` (array), `onCardClick`, `onAddClick`, `dragOverEtape`. Émet `dragenter/leave/drop` typés.
15. **AC-15** — Header colonne : icon 36×36 box radius 10 (`var(--r-lg)`), svg 20×20 stroke 1.75, fond/color sémantique par étape (info, primary-light, warning, success, success, error). Titre 16px weight 600 letter-spacing -0.01em line-height 1.2. Count 11px pill `var(--c-surface-alt)`. Add button 24×24 plus icon discrète.
16. **AC-16** — Header colonne contient une fine progress bar (3 px, radius pill) **pour les 4 étapes actives uniquement** (pas sur gagné/perdu) — width visuelle progressive 60/75/85/95 % calculée par index étape.
17. **AC-17** — Total CHF par colonne formaté `XX.X` + suffixe `<span class="currency">k CHF</span>` muted (ou `CHF` si total < 1 000). Tabular-nums.
18. **AC-18** — `data-dragover="true"` (Svelte attribute binding) applique : bg `var(--c-primary-light)`, border `var(--c-primary)`, shadow diffuse. Transition spring 220 ms.

### Kanban — cards
19. **AC-19** — Composant `PipelineCard.svelte` extrait. Props : `opp`, `dragging` (booléen), handlers drag. Affiche : titre 13.5px line-clamp 2, entreprise 12 px muted line-clamp 1, montant primary tabular-nums (muted text-soft si null), relance avec icône calendar (overdue → icône alert-circle + color error font-weight 600), footer (avatar 18 px monochrome, contact, signal indicator si `signal_affaires_id`).
20. **AC-20** — Card `cursor: grab`, hover `translateY(-1px)` + shadow card-hover, animation entry `cardEnter 320ms` avec stagger `--i × 50ms` cap à 8 (max stagger 400 ms). `prefers-reduced-motion` respecté (animation disabled).
21. **AC-21** — `tabindex="0"` + `aria-label` complet (`titre, entreprise, montant, statut relance`). `Enter` ou `Space` ouvre SlideOut détail (handler existant `openDetail`). Focus-visible global outline 2 px primary offset 2 px.

### Drag & drop
22. **AC-22** — Drop placeholder visible pendant drag (entre cards à la position du curseur). Style : `bg var(--c-primary-light)`, `box-shadow: inset 0 0 0 2px rgba(47,90,158,0.35)`, label « Déposer ici » 11.5 px weight 600 uppercase color primary, animation pulse 1.6 s. **Aucune `border-style: dashed`** (golden v9 § noDashedLines).
23. **AC-23** — Drop sur colonne déclenche le form action `?/move` existant (preserve la logique serveur). Toast `Opportunité déplacée vers {etape}` au succès, `Erreur lors du déplacement` au fail. (Toast déjà présent côté SlideOut, étendu à move).
24. **AC-24** — Card en cours de drag : `opacity: 0.4`, `transform: scale(0.98)`, `cursor: grabbing`. State propre nettoyé sur `dragend` (cas drop hors zone OK).

### Empty states
25. **AC-25** — Composant `PipelineEmptyState.svelte` extrait. Props : `etape` (object). Affiche : Lucide icon dans avatar 40×40 surface-alt + h3 (« Aucune opportunité ») + description contextualisée (`Glissez une opp depuis {étape précédente}` pour les étapes intermédiaires, `Créez la première opportunité` pour identification, `Aucune opp gagnée ce mois-ci` pour gagné, `Pas de perte cette semaine` pour perdu) + CTA secondaire « Ajouter dans {etape.label} » sauf gagné/perdu.

### CTA "Ajouter" bas de colonne
26. **AC-26** — Bouton sticky `col-foot-add` 36 px hauteur, bg `var(--c-surface-alt)`, border 1px transparent, radius lg. Hover : bg `var(--c-primary-light)`, color primary, border `rgba(47,90,158,0.25)`. **Aucune `border-style: dashed`** (golden v9 § noDashedLines). Présent sauf colonnes gagné/perdu.

### SlideOut & ConfirmModal (preserve)
27. **AC-27** — SlideOut détail conservé (composant existant), preserve les sections actuelles (badge étape, grid 2 cols infos, signaux liés, motif perte, notes, footer Modifier / Marquer perdu). Aucune régression de comportement.
28. **AC-28** — ConfirmModal pour `Marquer perdu` conservé (composant existant). `window.confirm()` interdit.

### Mobile
29. **AC-29** — En < 768 px : tabs étape sticky en haut (6 onglets scroll horizontal natif), 1 colonne plein écran sous les tabs. Le drag inter-colonnes reste fonctionnel (long-press) mais non principal. FAB « Nouvelle opportunité » bottom-right (56×56 radius pill, primary, shadow `0 8px 24px -6px rgba(47,90,158,.45)`).
30. **AC-30** — En `< 1024 px` desktop intermédiaire : indicators 2-col, kanban 2-col scroll vertical infinie (preserve le mode multi-colonnes).

### A11y, sécurité, perf
31. **AC-31** — `axe-core` 0 violation serious/critical sur la page chargée avec données réelles (audit dev runtime, pas obligatoire en CI).
32. **AC-32** — Build prod vert (`cd CRM && npm run build`), `svelte-check` baseline strict zéro régression vs S175 (5/33 ou mieux).
33. **AC-33** — Vitest 682/682 +N tests (+ N pour helpers `formatRelance`, `progressByEtape`, `totalsByEtape` si extraits ; cible : ≥ 8 tests neufs).
34. **AC-34** — Audit `code-review:security-auditor` Opus sur diff complet : **0 Critical, 0 High, 0 Medium** obligatoire avant merge ff main. Artefact `~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/audit_secu_2026-05-08_pipeline_v9.md`.

---

## 2. Hors scope V1 (différé V2)

Listé ici pour qu'aucun finding « manque X » ne soit traité en cours d'impl. Si un de ces items émerge en S176bis ou plus tard → tâche dédiée, jamais glissé dans la PR.

- **Drag a11y clavier** (Alt + flèches pour bouger une opp). Aria-label déjà complet → l'opp reste accessible au lecteur d'écran via SlideOut.
- **ImportModal** (CSV opps, depuis lead/signal premium 3 parcours). Le bouton Importer est masqué en V1 — bouton « Nouvelle » seul. (Sur le mockup il y avait Importer en demo, retiré V1.)
- **Filtres responsable / Sort / Vue liste**. Les actions contextuelles « Responsable » et « Trier » du mockup sont retirées V1.
- **Activity timeline** dans SlideOut (historique mouvements + interactions). V2.
- **Batch actions** (sélection multiple + actions de masse). V2.
- **Search inline** (sidebar nav suffit pour V1).
- **Snap-back animation** si drop hors cible. V1 = simple cancel via `dragend` sans animation custom.
- **Optimistic UI** sur le move (refresh full SvelteKit `update()` suffit V1).
- **Notification visuelle** quand une opp dépasse N jours dans une étape (heatmap, urgency dot). V2.

---

## 3. Architecture composants

### Avant
```
+page.svelte (465 lignes)
└─ tout en mono-fichier : indicators absents, kanban inline, drag handlers inline
```

### Après
```
+page.svelte (≤ 220 lignes orchestrateur)
├─ PipelineIndicators.svelte    (~80 lignes)
├─ PipelineTabs.svelte          (~50 lignes)
├─ PipelineColumn.svelte        (~120 lignes)
│   ├─ PipelineCard.svelte      (~90 lignes)
│   ├─ PipelineDropPlaceholder.svelte (~25 lignes)
│   └─ PipelineEmptyState.svelte (~60 lignes)
└─ utils/pipelineFormat.ts (helpers extraits + tests)
```

Les composants `SlideOut`, `ModalForm`, `ConfirmModal`, `Select`, `FormField`, `Badge`, `Icon` sont conservés tels quels.

---

## 4. Phases d'implémentation chronologiques

### Phase 1 — Setup branch + tokens CSS + helpers (≈ 30 min)
1. `git checkout -b feat/pipeline-v9`.
2. Créer `src/lib/utils/pipelineFormat.ts` avec : `formatMontantCompact(n)` (ex: `28 500 CHF` ou `213.6 k CHF`), `formatRelance(d)` (ex: `06 mai · J-2` overdue, `À planifier` null, `18 mai · J+10` future), `progressByEtape(etape, opps)` (% visuel par étape active), `totalsByEtape(opps)`.
3. Tests Vitest unitaires associés (≥ 8 cas par helper).

### Phase 2 — Composants présentationnels purs (≈ 1h)
1. `PipelineIndicators.svelte` : props `{ active, value, won, overdue }`, 4 cards flat. Tests rendu count + currency formatting.
2. `PipelineEmptyState.svelte` : props `{ etape, onAdd? }`. Tests rendu CTA conditionnel.
3. `PipelineCard.svelte` : props `{ opp, dragging, onClick, onDragStart, onDragEnd }`. Tests rendu overdue + signal indicator.
4. `PipelineDropPlaceholder.svelte` : composant trivial 25 lignes, label localisable.

### Phase 3 — Composant interactif Column (≈ 30 min)
1. `PipelineColumn.svelte` : props `{ etape, opps, draggedId, dragOverEtape, onDragOver, onDragLeave, onDrop, onCardClick, onAddClick }`. Header + body + foot CTA. Drop placeholder injecté entre les cards à la position calculée (V1 = à la fin si drag-over actif, V2 = position calculée par mouseY).

### Phase 4 — Refonte +page.svelte orchestrateur (≈ 30 min)
1. State : `activeTab` ($state 'en-cours' | 'closed' | 'toutes'), `slideOutOpen`, `selectedOpp`, `modalOpen`, `editMode`, `saving`, `archiving`, `confirmArchiveOpen`, `draggedId`, `dragOverEtape`.
2. Derived : `oppsByEtape`, `totalByEtape`, `indicators` (count/value/won/overdue calculs centralisés), `etapesVisible` (filtre selon `activeTab`).
3. Markup : `PipelineIndicators` → `PipelineTabs` (sticky) → `kanban-wrap` avec `{#each etapesVisible as etape}` rendant `PipelineColumn`.
4. Hidden form `?/move` preserve, handler `onDrop` preserve.
5. SlideOut + ModalForm + ConfirmModal preserve.

### Phase 5 — Mobile + responsive (≈ 30 min)
1. Media queries 1024 et 768 dans le scoped CSS de `+page.svelte` ou dans les composants concernés.
2. Mobile layout : tabs étape sticky scroll-x, 1 col plein écran, FAB. Tester chrome MCP `tabs_create_mcp` + DevTools manuel iPhone 14 (Pascal).
3. Drag inter-colonnes mobile : preserve, mais workflow prioritaire = tap card → SlideOut → Modifier → champ étape.

### Phase 6 — Polish + tests + audit (≈ 30 min)
1. Vitest cumul : `npm run test`. Cible ≥ 690/690.
2. svelte-check baseline : `npm run check`. Cible 5/33 ou mieux.
3. Build prod : `npm run build`. Cible vert.
4. Audit security-auditor Opus sur diff complet, artefact `audit_secu_2026-05-08_pipeline_v9.md`.
5. Smoke desktop Chrome MCP + mobile DevTools manuel (tabs étape, FAB, swipe).
6. Commit granulaire : 1 commit par phase.
7. Push branch + preview Vercel + validation visuelle Pascal.
8. Merge ff main + push origin + smoke prod live + cleanup branch (locale + remote).

---

## 5. Risques anticipés + mitigations

| # | Risque | Probabilité | Mitigation |
|---|---|---|---|
| R1 | Drag/drop CSS conflict en mobile (tap déclenche drag accidentel) | Moyenne | `touch-action: manipulation` sur card mobile + tester DevTools manuel iPhone 14. Si bug → désactiver `draggable` < 768 px (drag desktop only). |
| R2 | aria-selected ↔ tabpanel mismatch (axe-core violation serious) | Faible | Test smoke axe-core dev runtime. Pattern figé S164 sur /prospection à recopier strictement. |
| R3 | Stagger 50 cards = animation cumulative 2.5 s | Faible | Cap `--i` à `min(index, 8)` dans le composant Card (pattern dashboard S175). |
| R4 | Sticky tabs-bar overlap avec topbar header global | Moyenne | `top: 56px` (header-height var) + z-index 8 (sous topbar 10). Tester scroll chrome MCP. |
| R5 | Empty state CTA n'appelle pas `openCreate(etape)` correctement | Faible | Prop callback `onAdd: (etape) => void` typée, test rendu unit. |
| R6 | `progressByEtape` divise par 0 si total opps actives = 0 | Faible | Guard `if (total === 0) return 0`. Test cas vide. |
| R7 | Refonte casse signal_affaires_id rendu (existant ligne 311 +page.svelte SlideOut) | Faible | SlideOut preserve full → diff git review avant push. |
| R8 | Build cassé Vercel sur Component type any (legacy lucide-svelte) | Faible | Pattern S175 déjà appliqué `Record<string, any>` icon-map.ts → aucun changement nécessaire. |

---

## 6. Done explicite

Le merge ff vers main est autorisé uniquement quand **TOUTES** les conditions suivantes sont vraies :

- [ ] AC-01 à AC-30 cochés un par un (revue spec contre code).
- [ ] AC-31 axe-core dev 0 serious/critical.
- [ ] AC-32 build prod vert + svelte-check baseline.
- [ ] AC-33 Vitest ≥ 690/690 (baseline 682 + 8 nouveaux helpers).
- [ ] AC-34 audit security-auditor Opus 0 C/H/M, artefact daté écrit.
- [ ] Preview Vercel branch verte + validation visuelle Pascal sur preview URL stable.
- [ ] Smoke prod live `https://filmpro-crm.vercel.app/pipeline` HTTP 303 → /login HTTP 200.
- [ ] Branche locale + remote nettoyées post-merge.
- [ ] Entry cockpit `e4c19304` (Cascader gabarit pages 3-6) reste **bloquée** tant que les 4 pages /contacts /entreprises /signaux /veille ne sont pas livrées.
- [ ] `CRM/CLAUDE.md` mis à jour (Livré S175 : pipeline ; Prochaine session : pages 3-6).

---

## 7. Pointeurs

- Mockup validé Pascal : `notes/refonte-pipeline-2026-05-08/mockup.html` (2026-05-08).
- Golden v9 layered : `~/.claude/goldens/v9-2026-05-06/` (tokens + primitives + archetype-workspace).
- Charte projet : `CRM/GOLDEN_STANDARD.md` (anti-patterns mis à jour S176bis avec `dashed/dotted` interdit).
- Référence implémentation /dashboard (cascade page 1) : `notes/refonte-dashboard-2026-05-06/spec-implementation.md` + commits `5f96e65` + `74e6b8d` + `cc00d57` (S175).
- Mémoires Pascal : `feedback_svelte5_store_ssr_safe.md`, `feedback_zero_technical_debt.md`, `feedback_geocoding_ch_et_permissions_policy.md` (Permissions-Policy non concerné ici, juste vigilance générale).
