# Décisions clés Phase 1

## Décisions structurelles tranchées

| ID | Décision | Alternative écartée | Raison |
|---|---|---|---|
| D-01 | Breakpoint mobile = `< 1024px` | `< 768px` (md Tailwind) ou `< 640px` (sm) | Cohérence avec page Log + sidebar burger déjà acté. Tablette portrait = mobile UX. |
| D-02 | Composant générique `<MobileEntityCard>` | Cards ad hoc par page | DRY + cohérence visuelle cross-page. Évite divergence Signaux vs Contacts vs Entreprises. |
| D-03 | Pipeline = accordéon par étape | Bottom-sheet vertical / Swipe entre colonnes | Accordéon = pattern web standard, 0 lib externe, contrôle clavier OK. Drag-drop remplacé par bouton « Faire avancer » dans SlideOut. |
| D-04 | Sidebar burger conservée | Bottom navigation bar iOS-like | Sidebar déjà actée en S104, fonctionne en mobile. Bottom nav = refonte de plus grande envergure (V2). |
| D-05 | Pas de PWA / push / offline | PWA + manifest + Service Worker | Hors-scope V1 (Q7). Webapp Vercel suffit pour usage actuel. |
| D-06 | Tableaux desktop conservés tels quels >= 1024px | Migration totale vers cards desktop aussi | Desktop = densité info utile, mobile = task-first. Pas de régression desktop (Q5). |
| D-07 | Feature flag `ff_crm_mobile_v2` côté Supabase JWT custom claims | GrowthBook cloud free tier | < 10 users, RLS+JWT custom claims natif Supabase suffit (MVP <100 users best practice). |

## Modes d'échec anticipés (équivalent /premortem condensé)

| Mode d'échec | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Régression desktop (media query mal placée) | Moyenne | Élevé | Snapshots Playwright desktop verrouillés en Phase 4. Toute media query nouvelle = `@media (max-width: 1023.98px)` strict. |
| MobileEntityCard trop générique -> friction d'usage | Moyenne | Moyen | Itération en Phase 3 : commencer par 1 page (Contacts), valider visuellement, propager. |
| Pipeline accordéon UX confuse vs kanban familier | Faible | Moyen | Audit-uiux Mode A en Phase 4 (5 agents parallèles). Pascal teste F3 sur iPhone réel avant gate Phase 5. |
| Tap targets < 44x44 px (a11y AA) | Élevée | Élevé | axe-core obligatoire en Phase 4 + utility CSS `min-w-[44px] min-h-[44px]` sur tous les boutons mobile. |
| Lighthouse mobile < 90 sur Perf (CLS sur accordéon Pipeline) | Faible | Moyen | Animations CSS `transform` only (pas `height`), `aspect-ratio` sur cards, lazy loading images. |
| Modal bottom sheet déborde + scroll bloqué | Moyenne | Moyen | `overflow-y: auto` + `max-h: 90vh` + `overscroll-behavior: contain`. Tests Playwright iPhone 14 Pro Max. |

## Angles morts couverts (équivalent /blindspot condensé)

- Mode offline : explicitement hors-scope (Q7). Choix tranché, pas angle mort.
- Notifications push : idem.
- Permissions caméra iOS : F2 utilise sélecteur natif iOS (input file accept image/*), pas de demande de permission webapp.
- Rate limiting : tap repeté sur bouton "Faire avancer" -> bouton disabled le temps du POST (anti-double-click).
- Empty states : tous les écrans data-dependent (cards Prospection vide, accordéon Pipeline étape vide, etc.) doivent avoir un message clair (audit ux-guide Phase 4).
- Loading states : skeletons sur cards pendant data fetch (audit ux-guide Phase 4).
- Erreur réseau : retry button + message lisible mobile.
- Dark mode iOS : non géré V1, vérifier que le forçage light reste cohérent.
- Safe area iOS (notch + home indicator) : utiliser `env(safe-area-inset-*)` sur sidebar + bottom du SlideOut.
- Saisie clavier iOS : forms doivent scroll automatiquement (input focus = scrollIntoView).

## Sources

- Doctrine styling : `memory/feedback_crm_styling_doctrine.md` (S180).
- Tests mobile : `memory/feedback_crm_mobile_testing_devtools.md`.
- RLS mono-tenant : `memory/feedback_rls_multitenant_durcissement_si_4_users.md`.
- Golden standard CRM v9 : `~/.claude/goldens/audit-uiux-golden-v9-2026-05-06.json`.
- Audit factuel des 10 pages CRM (cette session, agent Explore) : voir contexte de session.
