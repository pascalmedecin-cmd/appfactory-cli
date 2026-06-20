# Rapport d'audit — `/prospection` Express vs Golden v2

**Date** : 2026-04-25
**Profondeur** : Express (1 passe, structure + composants majeurs)
**Méthode** : chrome MCP + `getComputedStyle` (mesures réelles, pas estimations)
**Référence** : [`golden-snapshot.json`](./golden-snapshot.json) (golden v2)
**Findings détaillés** : [`findings.md`](./findings.md)

---

## Verdict global

**État** : la page est conforme à 30 % au golden v2. La structure est cohérente (table-fixed, palette primary, DM Sans) mais 16 violations de la décision spacing canonique + boutons à 4 hauteurs différentes + absence de `<h1>` sémantique mettent l'écart en évidence.

**Coût correction estimé** : ~1h30 sur 1 commit `/prospection` (Phase 4) si tous les composants (Button, Badge, Card) sont déjà factorisés. ~3h si chaque correction est inline dans la page.

---

## Compteurs

| Sévérité | Count | Description |
|---|---|---|
| **P0** | **3** | Bloquants livraison client (a11y serious, hiérarchie typo cassée, radius legacy) |
| **P1** | **9** | Dégradations UX visibles (hauteurs boutons, radius cards, badges, dots, sidebar) |
| **P2** | **7** | Polish (migration Lucide, micro-spacing, contrôles positifs) |

---

## Top 3 critiques (à fixer en priorité)

### 1. P0-01 — Aucun `<h1>` sémantique
- **Symptôme** : titre "Prospection" dans un `<span>`, lecteurs d'écran ratent la structure
- **Fix** : `<span class="header-title">` → `<h1 class="header-title">`. Aucun changement visuel.
- **Effort** : 2 min
- **Risque** : nul. Décision golden #4 explicite.

### 2. P0-02 — Headers de table en `#000` / 700
- **Symptôme** : sur 66 lignes, headers Raison sociale/Canton/Localité/etc. crient autant que les valeurs en cellule
- **Fix** : classe `<th>` → `text-muted font-semibold` (`#6B7280` / 600)
- **Effort** : 5 min
- **Bénéfice** : hiérarchie typo retrouvée, fatigue lecture diminuée

### 3. P0-03 — Pagination radius 4px / h:38px
- **Symptôme** : boutons fléchés ressemblent à du legacy au milieu d'une UI radius 10px
- **Fix** : aligner sur `<Button>` standard variant icon-only (`h-10 w-10 rounded-lg`)
- **Effort** : 10 min
- **Bénéfice** : cohérence visuelle pied de table

---

## Décisions golden — état de conformité

| Décision | Conformité | Findings concernés |
|---|---|---|
| **#1 Primary bleu / accent ambre** | ✓ Conforme | (bouton Importer 100% OK) |
| **#2 Spacing canonique 4/8/12/16/24/32/48** | ✗ 16 violations | P0-03, P1-01/02/03/06/07/09, P2-02 |
| **#3 Button 40px uniforme** | ✗ 4 hauteurs différentes (38, 40, 42, 46) | P0-03, P1-01, P1-02, P1-03 |
| **#4 H1 sémantique** | ✗ Aucun `<h1>` sur la page | P0-01 |
| **#5 Migration Lucide** | ✗ 0% (~30 occurrences Material) | P2-01 (BACKLOG) |

---

## Conflit interne golden v2 résolu

**Problème détecté pendant l'audit** : `components.table.cellPaddingY = 10px` contredisait `spacing.scale = [4,8,12,16,24,32,48]` (10 absent).

**Décision** : aligner `cellPaddingY` sur **12px** (cohérent spacing canonique). `headerHeight` passe de 44 → 48px en conséquence.

**Application** :
- `golden-snapshot.json` du run **non modifié** (figé pour traçabilité)
- `audit-uiux-golden-v2-2026-04-25.json` source mis à jour (note `_note` ajoutée)
- `docs/GOLDEN_STANDARDS.md` § 3.5 mis à jour
- Findings P2-06 documente la résolution

Pour le prochain audit, créer un golden v3 (table.cellPaddingY: 12) plutôt que continuer à patcher v2 — règle skill golden-standard : « jamais d'écrasement ».

---

## Backlog généré

1. **Phase 4 application** sur `/prospection` : corriger les 12 findings P0+P1 (~1h30, 1 commit)
2. **Migration Material Symbols → Lucide** (P2-01) : tâche dédiée, ~120 occurrences cross-pages, indépendante de Phase 4
3. **Golden v3 anticipé** : intégrer cellPaddingY 12 + headerHeight 48 (déjà mergé dans v2 mais à figer en v3 lors du prochain run d'audit)
4. **Phases 3+4 sur les 6 autres pages CRM** : `/dashboard`, `/contacts`, `/entreprises`, `/pipeline`, `/signaux`, `/veille`

---

## Recommandations méthodo (pour les prochains audits)

- ✓ Express (1 passe) suffit pour caler les violations majeures sur 1 page
- ✓ chrome MCP + `getComputedStyle` = source de vérité fiable, supérieure aux screenshots manuels (que macOS sandbox bloque de toute façon)
- ⚠ Subagent ui-auditor ne peut pas écrire de fichiers : prévoir le report via main thread
- ⚠ Toujours faire passer 1ère page en Express avant Standard/Exhaustif sur les autres → chasse les conflits internes du golden (cas P2-06)

---

## Étape suivante

Phase 3 du Bloc 1a partiellement complétée (1 page sur 7). Pour finaliser, soit :
- **Option A** : enchaîner les 6 pages restantes en Express (~1h30, 1 session de loop ou 6 sub-sessions)
- **Option B** : passer directement Phase 4 sur `/prospection` (corriger les 12 findings P0+P1) avant d'auditer les autres
- **Option C** : clôturer la session ici, traiter le reste en sessions dédiées

Reco : **B** — fixer `/prospection` d'abord donne un gabarit propre comme référence pour les Phase 3 suivantes (réduit le delta sur les autres pages, qui partagent les mêmes composants).
