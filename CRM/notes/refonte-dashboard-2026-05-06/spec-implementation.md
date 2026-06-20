# Spec implémentation /dashboard refonte v9

**Statut :** Mockup visuel validé Pascal 2026-05-06. Spec figée AVANT implémentation (TDD agent-driven).
**Tâche cockpit :** Bloc #1 `[8716d073]` Ajuster UI page dashboard.
**Reference visuelle :** `mockup.html` (sibling).
**Reference design system :** Golden v9 (`.claude/goldens/v9-2026-05-06/`).
**Effort estimé :** xhigh (Score 3/4) | ~2-3h.

---

## Objectif

Refondre `CRM/src/routes/(app)/+page.svelte` en respectant le mockup validé : 6 sections Bento asymétrique avec identité éditoriale propre (« inbox du matin du fondateur »), tokens golden v9, spring physics premium, données réelles depuis +page.server.ts existant.

**Identité propre figée** : ton humain et personnalisé (greeting + 1 phrase synthèse), Bento asymétrique 6+3+3 en KPIs (jamais 4-cards-equal), TriageQueue raffinée vedette, motion premium avec stagger 60ms.

---

## Critères d'acceptation (binaires : passe / passe pas)

### Structure
- [ ] **AC-1** : Page contient 6 sections dans cet ordre exact : (1) hero greeting, (2) KPIs Bento 12-cols, (3) section TriageQueue (avec section-head propre), (4) duo activité+relances 60/40, (5) alertes strip, (6) quick actions footer.
- [ ] **AC-2** : KPIs Bento : grid-template-columns 12 cols, vedette `col-span-6` primary-dark + 2 splits `col-span-3` chacun. Jamais 4 cards équivalentes.
- [ ] **AC-3** : Hero h1 « Bonjour {firstName} » avec firstName extrait de la session user (locals.user.email split @, capitalize). Si user inconnu → fallback « Bonjour ».
- [ ] **AC-4** : Hero summary dynamique : « X leads prioritaires, Y marchés, Z relances. {tail} » où tail = « Le reste peut attendre. » si X+Y+Z≤5, sinon « Concentre-toi sur l'essentiel. ». Counts depuis data.triage.total + data.stats.signaux + data.relances.length.
- [ ] **AC-5** : KPI vedette affiche `data.triage.total` + CTA « Voir les N autres » liée à `/prospection?statut=nouveau`.
- [ ] **AC-6** : KPI marchés ouverts affiche `data.stats.signaux` (placeholder cohérent existant). Trend +N hardcodé OK V1.
- [ ] **AC-7** : KPI relances dues affiche `data.relances.length`. Si l'une a `date_relance_prevue < today` → badge warn « 1 en retard », sinon trend flat.

### TriageQueue
- [ ] **AC-8** : Composant `TriageQueue.svelte` mis à jour pour adopter le layout du mockup (section-head avec kicker pulsing + h2 + sub, surface radius-3xl + shadow card subtle, footer dégradé avec CTA « Voir tous »).
- [ ] **AC-9** : Grid des items : `grid-template-columns: 96px 1fr auto auto;` pour aligner les noms sur Y indépendamment de la largeur du badge source.

### Activité timeline
- [ ] **AC-10** : Activité affiche les 5 items `data.activitesRecentes`. Icône contextuelle selon `type_activite` (appel→phone, email→mail, reunion→users, note→pencil, autre→default). Pas de timeline si liste vide → empty state "Rien pour le moment".
- [ ] **AC-11** : Affichage date relative : "HH:MM" si aujourd'hui, "Hier", "Lun." (jour court) cette semaine, sinon "DD/MM".

### Relances
- [ ] **AC-12** : Affiche les 3 premières `data.relances`, lien vers `/pipeline/[id]` ou opportunité fiche (selon route existante). Date_relance_prevue < today → badge rouge « Retard Nj », == today → « Aujourd'hui », > today → "Demain" / "DD/MM".

### Alertes
- [ ] **AC-13** : Section alertes affichée uniquement si `data.stats.signaux > 0` ou `data.alertes.length > 0`. Sinon section masquée (pas d'empty state).
- [ ] **AC-14** : Strip 2 cards 50/50 desktop, 1 col mobile. Border-left coloré 3px + icon tint background.

### Quick actions
- [ ] **AC-15** : 4 cards persistantes (Nouveau contact / Nouvelle entreprise / Nouvelle opportunité / Voir signaux). Hauteur cohérente, hover translateY(-1px) + shadow primary.

### Tokens / Design System
- [ ] **AC-16** : Aucun usage de `bg-primary/X` ou `border-primary/X` opacités custom. Tous tokens via classes Tailwind sémantiques (bg-primary, bg-primary-light, bg-primary-dark, etc.) depuis `app.css` golden v9.
- [ ] **AC-17** : Toutes les icônes via `<Icon name="..." />` Lucide (zéro Material Symbols). Aucune nouvelle icon-map manquante (vérifier `lucide_mapping.md`).
- [ ] **AC-18** : Boutons hauteur 40px (h-10) ou 36px (ActionButton) selon golden, pas de h-11 hérité.

### Motion + a11y
- [ ] **AC-19** : Stagger entry par section (delay 60ms × index). Implémentation : svelte/transition `fly` + `crossfade` ou CSS `animation-delay` calc(var(--i) * 60ms). Respect `prefers-reduced-motion`.
- [ ] **AC-20** : Transitions custom cubic-bezier(0.16, 1, 0.3, 1) sur hover cards. Pas de linear/ease-in-out.
- [ ] **AC-21** : Tous les éléments interactifs ont focus-visible (outline 2px primary, offset 2px).
- [ ] **AC-22** : `aria-label` sur boutons icônes ActionButton + sur tr-cliquable / kpi-card cliquable.
- [ ] **AC-23** : H1 sémantique unique par page (greeting hero). Section h2 pour TriageQueue + Alertes + Quick actions.

### Tests
- [ ] **AC-24** : `vitest run` baseline 666/666 verts (S171) → maintenue. Aucune régression.
- [ ] **AC-25** : `svelte-check` baseline 129/33 (S171) → maintenue ou améliorée. Pas de nouveau warning bloquant.
- [ ] **AC-26** : `npm run build` prod OK.
- [ ] **AC-27** : Test Playwright e2e simple : navigate to `/`, vérifier H1 présent, KPI vedette présent, TriageQueue présent. Pas de console error.
- [ ] **AC-28** : Audit `code-review:security-auditor` Opus sur diff : 0 Critical / 0 High / 0 Medium. Audit artefact daté `memory/audit_secu_2026-05-06_dashboard_v9.md`.

---

## Hors-scope explicite (ne PAS faire)

- Refonte sidebar / topbar (layout app global). Pas dans ce ticket.
- Implémentation des CTA fonctionnels nouveaux (création contact/entreprise/opportunité depuis dashboard) au-delà des liens existants — V2.
- Ajout sparklines / charts dans les KPIs (V2).
- Personnalisation par user role / permission différenciée (V2).
- Drag-and-drop sur queue / reorder (out of scope).
- Optimisation perf agressive type Server Components (Svelte 5 runes déjà en place suffit).
- Tests visuels regression (Percy / Chromatic).

---

## Métrique de succès post-livraison

- Pascal valide visuellement la prod après deploy preview.
- Aucun rollback dans les 24h post-deploy.
- Performance Lighthouse mobile ≥ baseline S124 sur `/`. Si dégrade > 5% → rollback.

---

## Plan implémentation détaillé (session suivante)

### Phase 1 : Composant SectionGreeting (15 min)
- Nouveau fichier `src/lib/components/dashboard/SectionGreeting.svelte`
- Props : `firstName: string | null`, `triageTotal: number`, `signauxCount: number`, `relancesCount: number`
- Logique tail string + format date+heure live `Date.now()` + `setInterval` 60s

### Phase 2 : Composant KpisBento (30 min)
- Nouveau fichier `src/lib/components/dashboard/KpisBento.svelte`
- Props : `triageTotal`, `signauxCount`, `relancesData: { total, retard, today }`
- 3 cards en grid 12 cols, vedette + 2 splits

### Phase 3 : Refactor TriageQueue (20 min)
- Modifier `src/lib/components/dashboard/TriageQueue.svelte` pour adopter section-head + grid 96px col + footer dégradé
- Préserver toute la logique d'actions existante (yes/no/later/view)

### Phase 4 : Composants ActiviteTimeline + RelancesList (30 min)
- Deux nouveaux fichiers `src/lib/components/dashboard/ActiviteTimeline.svelte` et `RelancesList.svelte`
- Props depuis data existant
- Format dates relatives helper dans `$lib/utils/dateFormat.ts`

### Phase 5 : Composant AlertesStrip + QuickActionsFooter (20 min)
- 2 nouveaux composants
- Logique conditionnelle stricte selon AC-13

### Phase 6 : Refactor +page.svelte (15 min)
- Importer les 6 composants
- Passer data props
- Stagger CSS via inline style `--i:N`

### Phase 7 : Tests + audit (30 min)
- vitest + svelte-check + build prod
- Playwright e2e basic
- code-review:security-auditor
- Commit + deploy preview

**Total estimé :** ~2h30 implémentation pure + ~30 min tests/audit/commit = **~3h**.

---

## Risques anticipés

1. **Drag conflict** : si quelqu'un travaille sur TriageQueue en parallèle → coordonner.
2. **Lighthouse régression** : la stagger animation + diffusion shadows peuvent dégrader CLS si mal géré. Mesurer avant/après.
3. **Mobile** : le mockup desktop est superbe, le responsive doit être vérifié devTools manuel x3 viewports (iPhone SE / iPhone 14 Pro Max / iPad).
4. **Type Date relative** : edge cases (timezone, DST). Tester avec `vi.setSystemTime`.
5. **firstName extraction** : si email user sans préfixe ou format imprévu → fallback robuste.

---

## Définition de "Done"

Tous les AC-1 à AC-28 cochés ✓. Audit sécu artefact daté livré. Commit pushed. Deploy preview validé visuellement par Pascal. Tâche cockpit `[8716d073]` livrée via `python3 ~/.claude/cockpit/bin/deliver.py appfactory 8716d073 --sub crm`.
