# Découpe Films - Dispositif QA « tolérance zéro »

**Règle d'or (Pascal, 2026-06-05) :** aucune étape de Découpe Films n'est marquée `done` tant que
**100 % des barrières ci-dessous ne sont pas vertes**. Zéro dette acceptée (no-debt rule). Chaque
critère est **binaire** (passe / passe pas) - jamais « globalement ok », jamais « on verra ».

Avant de fermer une étape : relire cette liste, cocher chaque ligne, coller les sorties dans le
message de session. Une barrière rouge = l'étape n'est pas livrée.

---

## 1. Cœur algo (`src/lib/decoupe/optimiser.ts`)

Invariants durs testés (Vitest), pas seulement des cas d'exemple :

- [ ] **Aucune pièce hors laize** : pour tout placement, `x_mm + largeur_placee_mm <= laize_mm`.
- [ ] **Aucun chevauchement** entre deux placements d'un même plan.
- [ ] **Surface cohérente** : `surface_pieces_mm2 <= laize_mm * longueur_consommee_mm` ; `taux_chute ∈ [0,1)`.
- [ ] **Conservation** : toute vitre × quantité est soit posée, soit en commande fournisseur, soit en alerte. Aucune pièce perdue, aucune dupliquée.
- [ ] **Coche fournisseur** : `sur_mesure_fournisseur=true` ⇒ ligne de commande, jamais nestée.
- [ ] **Garde-fou nestable** : `nestable=false` ⇒ commande ou alerte, jamais en découpe interne silencieuse.
- [ ] **Déterminisme** : mêmes entrées ⇒ mêmes sorties (snapshot stable).
- [ ] **Lés** : pièce > laize avec jointage ⇒ `poses_en_les` cohérent (recouvrement compté) ; sans jointage ⇒ alerte `piece_non_placable`.

## 2. Data layer (`src/lib/server/decoupe/builders.ts` + Zod)

- [ ] Schemas Zod rejettent toute entrée invalide (dimensions ≤ 0, 0 laize, quantité < 1).
- [ ] Builders : round-trip DB row ⇄ domaine sans perte.

## 3. Helpers UI (extraits en `.ts` purs - doctrine projet `.svelte` = e2e only)

- [ ] Formatage (`m`, `m2`, `pct`), `chuteClass`/seuils, regroupement liste de coupe, baseline « pose séquentielle » : testés Vitest. Aucun calcul métier non couvert dans le `.svelte`.

## 4. e2e Playwright (`tests/decoupe.spec.ts`)

Session mintée OTP-free (`tests/mint-session.mjs`). Parcours complets, pas de smoke superficiel :

- [ ] Base produit : créer / éditer / archiver un produit (attributs nesting persistés).
- [ ] Chantier : créer, saisir N vitres (saisie rapide, focus conservé), éditer/supprimer une vitre.
- [ ] Optimiser : le résultat affiche KPI (taux/longueur/économie), cartes films, strip, **liste de coupe ordonnée**, alertes, commande - cohérents avec l'algo.
- [ ] Lancer la découpe : confirmation ⇒ statut chantier `lancee`.
- [ ] Cas limites : pièce non plaçable ⇒ alerte visible ; produit non nestable ⇒ commande ; chantier vide ⇒ empty state.

## 5. Accessibilité (axe-core, session mintée)

- [ ] **0 violation** sur les 4 écrans (`/decoupe`, `/decoupe/produits`, `/decoupe/chantiers/[id]`, `/decoupe/optimisation`).
- [ ] Strip SVG : `role="img"` + `aria-label` ; la **table de coupe** reste la source lisible sans la vue.
- [ ] Couleur jamais seule porteuse d'info (badge taux = couleur + valeur ; famille = pastille + label).

## 6. Statique

- [ ] `npm run check` (svelte-check) : **0 erreur, 0 warning**.
- [ ] `npm run build` : **vert**.
- [ ] `npm test` (Vitest) : **100 % vert**, aucun test skip/only.

## 7. Sécurité (Definition of Done sécu projet)

- [ ] Zod sur 100 % des form actions Découpe ; rate limiting ; secrets timing-safe si applicable.
- [ ] `code-review:security-auditor` (Opus) sur les form actions + RLS Découpe ⇒ **0 High/Critical/Medium**, artefact daté `memory/audit_secu_<date>_decoupe.md`.
- [ ] RLS : rappel mocks Vitest ≠ RLS Postgres réelle ⇒ vérif manuelle prod/staging avec compte cible, OU test d'intégration, avant `done` (cf. `feedback_rls_mocks_insufficient_S99`).

## 8. Performance (Lighthouse, écran résultat + saisie)

- [ ] a11y = 100 ; best-practices ≥ 95 ; perf LCP < 2,5 s / CLS ≈ 0 (cap projet portail).

## 9. Fidélité golden ↔ Svelte

- [ ] Screenshot de l'écran Svelte réel comparé au golden validé (`golden-validated-2026-06-05/`) : même langage (KPI, badges, chips, strip, liste). Écart visuel = à corriger, pas à logger.

---

## Script d'automatisation

`scripts/_decoupe_qa.sh` enchaîne les barrières automatisables (§6 + §1-3 + e2e) et sort non-zéro si
une seule échoue. Les barrières humaines/audit (§7 audit Opus, §9 fidélité visuelle) restent
manuelles mais obligatoires. Exécuter le script + dérouler les barrières manuelles avant tout `done`.
