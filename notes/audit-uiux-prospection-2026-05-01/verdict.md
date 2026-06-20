# Verdict audit UX/UI 360 - /prospection

**Date** : 2026-05-01
**Méthode** : 5 angles orthogonaux + cross-check ≥ 2 sources + zéro fix pendant l'audit
**Statut** : audit complet, validation Pascal du catalogue requise avant batch fixes

---

## Verdict en une phrase

**/prospection N'EST PAS page modèle en l'état**. La page concentre 4 bugs Critical (sécu + UX cassé) et 27 High (a11y baseline + cohérence golden + direction artistique) qui doivent être fixés avant de la poser en gabarit pour les 6 autres pages CRM.

---

## Score global

| Dimension | Note | Commentaire |
|---|---|---|
| Sécurité | 4/10 | C-02 injection PostgREST `.or()` reproduit le pattern S120 jamais propagé |
| A11y baseline WCAG 2.2 AA | 5/10 | C-03 rows non-clavier + H-15 col-resizer + H-17 ARIA tabs incomplets + H-26 focus-visible + 4.43:1 ScorePill |
| Cohérence golden v7 | 7/10 | Patterns nouveaux livrés conformes (ScorePill, ActionButton, TriageQueue, indicateurs flat). Sweeps spacing/typo/opacités à finir |
| Direction artistique vs leaders | 6/10 | 3 tells anti-slop : hero TriageQueue + 4 couleurs tabs simultanées + boutons action permanents. ScorePill et anim spring déjà best-in-class |
| Workflow ergonomique | 6/10 | Lead express invisible desktop H-02. Sélection persiste switch onglet H-03. Pas d'undo batch H-09. Vocabulaire SIMAP/Marchés publics double H-46 |
| Performance | 7/10 | TTFB excellent 68ms. Render-blocking fonts résiduel hérité S124. LCP/CLS à mesurer Lighthouse |

**Note globale** : 5.8/10. Page solide en cohérence golden mais bloquante en sécu/a11y/UX.

---

## Compteurs findings

| Sévérité | Compte | Effort fix estimé |
|---|---|---|
| Critical | 4 | 4h |
| High | 27 | 12h |
| Medium | 38 | 6h |
| Low | 17 | 2h |
| Info | 5 | doc golden v8 |
| **Total** | **91 dédupliqués** | **~24h batch fixes** |

---

## 4 Critical (bloquants prod)

1. **C-01 Bouton Importer disparaît sur onglets vides** (entreprises + terrain). Workflow cassé : impossible d'importer pour peupler un tab vide.
2. **C-02 Injection PostgREST `.or()` search non-escapée**. Pattern de sécurité S120 jamais propagé hors all-ids/+server.ts.
3. **C-03 `<tr onclick>` non opérable au clavier**. WCAG 2.1.1 niveau A bloqué : impossible d'ouvrir slideOut détail au clavier.
4. **C-04 H1 sémantique manquant template page**. À trancher policy (Header global suffit ?).

---

## 3 axes prioritaires fixes (ROI)

### Axe 1 - Bloquants prod (4h, V1.1-V1.6)
Fix C-01, C-02, C-03, H-01 (scroll vertical tabs cause racine), H-03 (sélection switch onglet), H-07 (dedup createExpress).

### Axe 2 - A11y baseline WCAG 2.2 AA (6h, V2.1-V2.11)
Fix H-15 (col-resizer keyboard), H-17 (ARIA tabs pattern), H-10/11 (Toast aria-live), H-12 (ScorePill contraste), H-13 (borders inputs), H-14 (Tooltip dismissible), H-26 (focus-visible globaux), H-09 (ConfirmModal batch + undo), H-08/M-31 (LeadExpress step).

### Axe 3 - Cohérence golden v7 + bench externe (6h, V3.1-V3.6)
Fix H-19 (pinned 1ère colonne), H-20 (désaturer tabs), H-27 (calmer TriageQueue), H-22 (sauvegarder recherche), sweeps spacing/typo/opacités M-01 à M-28, sémantique M-29 à M-37.

---

## 3 décisions de policy à trancher avec Pascal

1. **Échelle spacing** : étendre à 28px ou aligner indicateurs flat à 32px ? Reco : étendre à 28 (token nouveau), garder rendu visuel premium déjà livré.
2. **Hauteur boutons mobile** : exception HIG 44px documentée OU aligner h-10 ? Reco : documenter `h-11` mobile + `h-10` desktop dans golden v8.
3. **H1 sémantique** : `<h1>` Header global suffit ? Reco : oui, Header.svelte:33 a un `<h1>` réel. Retirer C-04 du backlog.

---

## Patterns déjà best-in-class à pérenniser dans golden v8 (5 Info)

1. ScorePill direction artistique (#C0391A rouge corail) défendable face à Linear (#F2453D vif).
2. Anim spring `cubic-bezier(0.16, 1, 0.3, 1)` btn-action = directement Notion-grade.
3. Tabular-nums sur counts = règle taste-skill VISUAL_DENSITY respectée.
4. localStorage persistance widths colonnes avec bornes garde-fou + a11y native button = niveau Linear engineering.
5. Concurrency guards 409 queue partagée 3 fondateurs + anti-cumul snooze = pattern multi-utilisateurs solide.

---

## Limitations harness audit (à signaler avant validation Pascal)

- **Chrome MCP `resizeTo` bloqué** : viewports 1920/1440/1024/430/932 non testés objectivement. Validation manuelle Pascal DevTools Device Toolbar nécessaire pour batch fixes responsive.
- **CSP filmpro-crm.vercel.app bloque axe-core CDN** : audit a11y machine en mode heuristique inline (~12 règles couvertes vs ~30 axe-core complet). H-12 (contraste ScorePill) et H-13 (borders inputs) basés sur mesures manuelles Nielsen S5, à confirmer avec axe DevTools extension Pascal.
- **LCP/CLS PerformanceObserver inactif rétroactif** : métriques perf objectives à valider via Lighthouse manuel mobile + desktop.

---

## Suite immédiate (validation Pascal requise)

**Pascal valide** :
- [ ] Le catalogue findings.md tel quel ? (aucun ajout/suppression).
- [ ] Les 3 décisions de policy ci-dessus (D1, D2, D3).
- [ ] Le séquencement actionplan.md (3 vagues, ~16h batch fixes).
- [ ] Plan re-audit après batch fixes (re-spawn 5 agents pour validation page modèle).

**Une fois validé**, ouvrir Bloc dédié "Batch fixes /prospection - 3 vagues" en prochaine session. Cette session = catalogue figé, zéro fix.

---

## Livrables session

- `coverage.md` - matrice de couverture figée (Phase 0)
- `findings.md` - catalogue 91 findings dédupliqués cross-source (Phase 2)
- `actionplan.md` - ordonnancement 3 vagues batch fixes (Phase 3)
- `verdict.md` - synthèse exec + score + verdict page modèle (ce fichier)

Pas de screenshots/ ni sources/ ce run (limitations harness chrome MCP). Captures à produire en session batch fixes pour avant/après.

## MAJ 2026-05-03 (S163) — page modèle promue

Verdict initial S160 "N'EST PAS page modèle" levé. Validation prod autonome via Chrome MCP S163 OK sur 4 parcours (P1 onglets+Importer+empty states, P2 a11y clavier, P3 ConfirmModal Écarter ≥10, P4 direction artistique). 4 fixes V4 chaînés no-debt (commit `612b1ac`) : F-V4-01 CTA header dynamique par scope, F-V4-02 empty state Terrain dédié saisie, F-V4-03 empty state contextuel par scope, F-V4-04 aria-label tr descriptif. **/prospection promue page modèle** = page de référence pour la cascade gabarit sur 6 autres pages CRM.
