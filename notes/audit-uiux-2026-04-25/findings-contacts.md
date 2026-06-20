# Findings — Audit /contacts golden v3 (Express, 2026-04-26)

URL : http://localhost:5175/contacts
Golden : v3 (`audit-uiux-golden-v3-2026-04-26.json`)
Méthode : chrome MCP + getComputedStyle (page + slideOut + modale)

## Synthèse

5 findings : 0 P0, 4 P1, 1 P2. Page sémantiquement saine (H1 22px/600 OK, DataTable et Badge déjà alignés via composants partagés S114, migration Lucide propre). Les écarts sont **TOUS sauf F3 et F5** d'origine **structurelle cross-app** :

- F1 (CTA `bg-accent` au lieu de `bg-primary`) → 23 fichiers utilisent `bg-accent`. Token CSS `--color-accent: #3B6CB7` (bleu intermédiaire) ne correspond pas à `accent` golden (`#F79009` ambre signaux).
- F2 (SlideOut 480px au lieu de 560px) → composant partagé `SlideOut.svelte` avec défaut 480px. Toutes les pages héritent (y compris /prospection gabarit S114 qui tournait aussi à 480 sans le savoir).
- F4 (focus state `accent` au lieu de `primary`) → conséquence directe de F1.

**STOP cascade** demandé pour décision Pascal sur F1, F2, F4 avant de continuer les pages 3-6.

## P0 — Bloquants livraison client

Aucun.

## P1 — Dégradation UX client-ready

### F1 — CTA en `bg-accent` (#3B6CB7 bleu) au lieu de `bg-primary` (#2F5A9E) + h-9 au lieu de h-10 + weight 500 au lieu de 600 [STRUCTUREL CROSS-APP]
- **Critère golden** : `decisions.1` (Primary = bleu #2F5A9E, accent ambre #F79009 réservé aux signaux), `decisions.3` (h-10 = 40px), `components.button.fontWeight: 600`
- **Constat** : 3 boutons (Ajouter L156, Modifier slideOut L284, Enregistrer modale L444) → `height: 36px`, `bg: #3B6CB7`, `font-weight: 500`. Classe `bg-accent` mappe à `--color-accent: #3B6CB7` (défini dans `src/app.css:10`).
- **Cause racine** : token CSS `--color-accent` = bleu intermédiaire historique, pas l'ambre golden. Le code a une **double-tonalité bleu** (primary structurel + accent CTA) que le golden ne définit pas. 23 fichiers utilisent `bg-accent` pour les CTA dans tout le CRM (composants partagés inclus : EmptyState, ModalForm, Badge, MultiSelectDropdown, etc.).
- **Impact** : palette CRM divergente de la décision golden #1, deux nuances de bleu coexistent en prod, perception "approximatif" niveau exec.
- **Reco LOCALE** (non recommandée seule) : `contacts/+page.svelte:156, 284, 444` migrer vers `bg-primary h-10 font-semibold`.
- **Reco STRUCTURELLE recommandée** : décision Pascal sur intent du token (cf. section "Décisions structurelles à arbitrer" en bas).

### F2 — SlideOut largeur 480px au lieu de 560px [STRUCTUREL CROSS-APP]
- **Critère golden** : `components.slideOut.width: "560px"`
- **Constat** : panneau `width: 480px` (défaut composant partagé `SlideOut.svelte:10`). Aucune page ne passe `width=` en prop → toutes héritent du défaut 480px (y compris /prospection gabarit S114).
- **Impact** : champs détail contact serrés (grid 2 cols ≈ 210px par col après padding 24px), risque troncature emails/téléphones longs. /prospection LeadSlideOut a probablement le même problème.
- **Reco STRUCTURELLE** : `src/lib/components/SlideOut.svelte:10,67` modifier le défaut `width = '480px'` → `'560px'`. Cross-app fix gratuit (toutes les pages héritent). À valider avec Pascal car impact visuel global.

### F3 — Cellules tableau `py-2.5` (10px) au lieu de `py-3` (12px) [LOCAL]
- **Critère golden** : `components.table.cellPaddingY: "12px"` (P2-06 résolu, spacing canonique).
- **Constat** : 8 occurrences `py-2.5` dans le row template (`<td class="px-4 py-2.5 ...">`).
- **Attendu** : `py-3` (12px).
- **Impact** : densité plus forte que golden, désaligné avec /prospection.
- **Reco LOCALE** : `contacts/+page.svelte` 8 × `py-2.5` → `py-3`.

### F4 — Input autocomplete entreprise : focus ring `accent/30` au lieu de `primary/20` [STRUCTUREL = conséquence F1]
- **Critère golden** : `components.input.borderColorFocus: "#2F5A9E"`, `shadow.focusRing: "rgba(47,90,158,0.2)"`.
- **Constat** : `focus:ring-accent/30 focus:border-accent` (L373) → focus prend la couleur `--color-accent` (#3B6CB7).
- **Cause racine** : même que F1 (mauvaise sémantique du token).
- **Reco** : dépend de la décision F1. Si on migre `bg-accent` → `bg-primary` partout, alors `focus:ring-accent/30` devient cohérent (l'accent restera la couleur secondaire bleue mais sans CTA). Sinon, à corriger en `focus:ring-primary/20 focus:border-primary`.

## P2 — Polish

### F5 — Bouton Archiver dans slideOut sans hover-bg + font-weight 400 [LOCAL]
- **Critère golden** : `components.button.variants.destructive` ou ghost-destructive.
- **Constat** : `text-danger` sur fond transparent, font-weight 400, sans border ni hover-bg, height non normalisée.
- **Reco LOCALE** : `contacts/+page.svelte:305` ajouter `font-medium hover:bg-error/5 rounded-lg h-10 box-border`.

---

## Décisions structurelles à arbitrer (avant cascade pages 3-6)

### Décision 1 — Token `--color-accent` : sémantique et migration

État actuel :
- `--color-primary: #2F5A9E` (bleu FilmPro structurel) ✓ conforme golden
- `--color-accent: #3B6CB7` (bleu intermédiaire CTA) ❌ pas dans golden
- `--color-warning: #F79009` (ambre) ✓ matche `accent` golden mais nommé "warning"

Le golden v3 reconnaît UN seul bleu (`primary`) et utilise l'ambre comme `accent` (signaux d'attention). Le code en prod a DEUX bleus (primary + accent) et nomme l'ambre `warning`.

Options :

- **Option A (golden gagne)** : migrer tous les `bg-accent` vers `bg-primary` (CTA = même bleu que header/sidebar). Supprimer le token `--color-accent` ou le remapper sur `--color-primary`. Renommer `--color-warning` → `--color-accent` côté code pour matcher le golden. Reco si on veut un système simple, single-blue, plus pro/cohérent.
- **Option B (code gagne)** : ajuster le golden pour reconnaître la double-tonalité (primary structurel + accent CTA). Pas de migration code, golden v4 documenté. Reco si la double-tonalité est intentionnelle.
- **Option C (hybride)** : laisser `bg-accent` tel quel pour les CTA, mais fixer le mapping (`--color-accent` reste #3B6CB7). Le golden est édité pour distinguer `primary` (#2F5A9E) et `accent` (#3B6CB7) en plus de l'ambre (renommée par exemple `signal`).

**Recommandation** : **Option A** (golden gagne, single-blue). Pourquoi : (1) plus simple, (2) palette cohérente avec décision golden #1 telle qu'arbitrée par Pascal en S113, (3) effort 1 sweep `bg-accent` → `bg-primary` sur 23 fichiers (script Python + grep facile). Coût : ~30 min, impact visuel limité (passage d'un bleu à un autre, légère intensification).

### Décision 2 — SlideOut largeur 480 → 560

Composant partagé `src/lib/components/SlideOut.svelte:10` défaut `width = '480px'`. Golden dit 560px. Toutes les pages héritent.

Options :

- **Option A (golden gagne)** : passer le défaut à `'560px'`. Toutes les pages bénéficient (4 colonnes plus respirantes).
- **Option B (statu quo)** : laisser 480px et ajuster le golden. Reco si Pascal trouve que 480 est volontairement compact.

**Recommandation** : **Option A**. Cross-app fix gratuit, aligne le code sur le golden extrait du gabarit /prospection.

### Décision 3 — F4 focus state

Si Décision 1 = Option A, F4 devient automatique (CTA migrent vers primary, focus migre aussi). Sinon F4 = fix local /contacts.

---

## Plan d'application proposé (après décisions Pascal)

1. **Si Option A décisions 1+2** : 
   - Sweep cross-app `bg-accent` → `bg-primary` (script Python sur 23 fichiers, audit chrome MCP avant/après)
   - Sweep `text-accent`, `border-accent`, `ring-accent`, `hover:bg-accent-dark` → variants `primary`
   - SlideOut défaut `'480px'` → `'560px'` 
   - Suppression token `--color-accent` (ou alias vers primary)
   - F3 (py-2.5 → py-3) + F5 polish sur /contacts dans le même commit
   - Cross-vérification chrome MCP sur /dashboard, /prospection, /contacts (3 pages déjà touchées)
   - Tests Vitest + svelte-check
   - Commit unifié `fix(crm): unification bleu primary single-source + slideOut 560 + 9 findings /contacts`

2. **Si Option B (statu quo) sur Décision 1+2** :
   - F3 + F5 uniquement sur /contacts → commit léger
   - Mise à jour golden v4 : ajouter token `accent-blue` + slideOut 480
   - Continuer cascade pages 3-6 sur le même pattern (audit local)

**STOP recommandé pour décision Pascal avant action.**
