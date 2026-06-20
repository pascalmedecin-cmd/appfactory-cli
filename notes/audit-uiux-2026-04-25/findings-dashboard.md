# Findings — Audit /dashboard golden v3 (Express, 2026-04-26)

URL : http://localhost:5175/
Golden : v3 (audit-uiux-golden-v3-2026-04-26.json)
Méthode : chrome MCP + getComputedStyle

## Synthèse

10 findings : 0 P0, 7 P1, 3 P2. Page globalement saine côté sémantique (H1 22px/600 conforme, DM Sans, 0 résidu Material Symbols, grid gaps OK 16/24px). Composants partagés (Badge, Header) OK. Le delta vient du custom dashboard (alertes, KPI cards, raccourcis maison, sections wrappers) qui n'a pas suivi le sweep golden v3 du commit `fbe1d81` car il ne passe pas par les composants partagés.

Décisions golden v3 violées : #2 (spacing canonique 4/8/12/16/24/32/48 — `p-5`/`py-3.5`/`gap-2.5`/`mt-0.5` hors scale), #3 (boutons 40px — raccourcis 50px). Radius `rounded-xl` (12px) systématique au lieu de `rounded-lg` (10px). Décision golden non strictement violée mais non respectée : `typography.scale.h2` (18px attendu, 16px constaté).

## P0 — Bloquants livraison client

Aucun.

## P1 — Dégradation UX client-ready

### P1-01 — Radius 12px sur 8+ cards/alertes/raccourcis (golden 10px)
- **Critère** : `components.card.borderRadius: "10px"` / `radius.lg: "10px"`.
- **Constat** : `rounded-xl` (12px) sur alerte signaux (L40), KPI cards (L83), bloc Relances (L99), bloc Activité (L128), bloc Onboarding (L182), 4 raccourcis (L213/217/221/225).
- **Attendu** : `rounded-lg` (10px). 12px réservé au `modal`.
- **Impact utilisateur** : incohérence vs /prospection, /signaux, /contacts (rounded-lg golden v3).
- **Reco** : `+page.svelte:40,83,99,128,182,213,217,221,225` `rounded-xl` → `rounded-lg`.

### P1-02 — H2 sections sous-dimensionnées (16px au lieu de 18px)
- **Critère** : `typography.scale.h2: { size: "18px", weight: 600, lineHeight: 1.2 }`.
- **Constat** : `h2 { font-size: 16px }` ("Relances du jour", "Dernière activité", "Pour démarrer").
- **Attendu** : 18px (`text-lg`).
- **Impact utilisateur** : hiérarchie visuelle aplatie, sections moins lisibles.
- **Reco** : `+page.svelte:101,130,183` ajouter `text-lg` à la classe `font-semibold text-text`.

### P1-03 — KPI cards padding 20px hors scale canonique
- **Critère** : decisions.2 (spacing 4/8/12/16/24/32/48, retrait du 20).
- **Constat** : `p-5` (20px) sur KPI cards.
- **Attendu** : `p-4` (16px) — `card.padding` golden.
- **Reco** : `+page.svelte:83` `p-5` → `p-4`.

### P1-04 — Sections wrappers padding hors scale canonique
- **Critère** : decisions.2.
- **Constat** : header `px-5 py-4` (20px X), body `p-5` (20px).
- **Attendu** : `px-4 py-4` / `p-4` (16px partout).
- **Reco** : `+page.svelte:100,106,129,132` `px-5`/`p-5` → `px-4`/`p-4`.

### P1-05 — Raccourcis : hauteur 50px hors norme bouton 40px
- **Critère** : decisions.3 (hauteur boutons 40px) + spacing canonique.
- **Constat** : `py-3.5` (14px) → height 50px.
- **Attendu** : `h-10` (40px) avec `py-2` (8px) ou simplement `h-10` + flex centering.
- **Reco** : `+page.svelte:213,217,221,225` `py-3.5` → retirer, ajouter `h-10`.

### P1-06 — Gap raccourcis 10px hors scale canonique
- **Critère** : decisions.2.
- **Constat** : `gap-2.5` (10px).
- **Attendu** : `gap-2` (8px).
- **Reco** : `+page.svelte:213,217,221,225` `gap-2.5` → `gap-2`.

### P1-07 — Valeur KPI font-weight 700 + 30px casse hiérarchie h1
- **Critère** : `typography.scale.h1: { size: "22px", weight: 600 }`.
- **Constat** : `text-3xl font-bold` → 30px / 700. Dépasse le h1 sémantique (22px/600).
- **Attendu** : `text-2xl font-semibold` (24px / 600). Reste lisible mais sous la sémantique h1 et dans la scale typo.
- **Reco** : `+page.svelte:91` `text-3xl font-bold` → `text-2xl font-semibold`.

## P2 — Polish

### P2-01 — Alerte signaux rounded-xl vs alerte prospection rounded-lg
- Couvert par P1-01 (mêmes corrections).

### P2-02 — `bg-primary/5` et `bg-primary/8` opacités custom hors palette
- **Constat** : alerte signaux L40 utilise opacités 5%/8% non listées dans palette golden.
- **Décision** : non corrigé cette session. Demande décision token (introduire `bg-primary-pale` dans tokens) ou refonte alerte avec `bg-info/light`. Backlog.

### P2-03 — `mt-0.5` (2px) hors scale canonique
- **Critère** : decisions.2 (scale `4/8/...`).
- **Constat** : `mt-0.5` (2px) sur sous-labels alerte (L49) et KPI label (L92).
- **Attendu** : `mt-1` (4px).
- **Reco** : `+page.svelte:49,92` `mt-0.5` → `mt-1`.

---

## Corrections appliquées

P1-01 à P1-07 + P2-01 + P2-03 → 9 findings adressés dans la session.
P2-02 → backlog (décision token à arbitrer).
