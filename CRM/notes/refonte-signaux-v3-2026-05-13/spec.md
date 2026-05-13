# Refonte Page Signaux V3 — spec figée

**Session :** S188 (2026-05-13)
**Effort :** xhigh, ~4h mono-session (réduit de 6h post-cadrage, retrait éditeur de poids)
**Trigger :** 3 axes retour Pascal post-livraison V2 (S187)

---

## 1. Objectif (1 phrase)

Améliorer la lisibilité visuelle (surlignage premium) + faciliter la recherche dans 130+ signaux (input search client) + élargir le vocabulaire Cœur métier pour que le tri Pertinence remonte de vrais signaux métier en tête plutôt que des Bonus génériques.

## 2. Décisions actées (cadrage S188)

| Axe | Décision | Pourquoi |
|---|---|---|
| Q1 surlignage | Option A "Underline typo éditorial" : Cœur = font-weight 700 + underline 2px color-success offset 3px ; Bonus = color-primary font-weight 500 seul ; Éviter = color-danger + line-through subtile (text-decoration-thickness 1px, opacité 55%). Aucun fond saturé. | Mockup `mockup-surlignage.html` validé Pascal. Pattern Linear/Stripe : emphasis typo qui ne sature pas la card. |
| Q2 recherche | Input search au-dessus des cards. Filtre client sur 3 champs (`description_projet + maitre_ouvrage + commune`). Debounce 200ms. Persistance `localStorage.signaux.search`. Highlight jaune des matches dans `description_projet` (distinct du surlignage catégorie). Pas de search dans le panneau mots-clés. | 130 rows en mémoire, filtre client = zéro coût serveur. Jaune se distingue des 3 couleurs catégorie (vert/bleu/rouge). |
| Q3 scoring | Poids figés par catégorie maintenus (`POIDS_PAR_CATEGORIE` inchangé). Pas d'éditeur de poids. SEUL le seed Cœur métier est étendu via script idempotent. | Pas de sur-engineering — on verra à l'usage si un éditeur de poids devient nécessaire. |

## 3. Hors-scope nommé

- **Pas d'éditeur de poids par mot-clé** (cf. Q3). Le `kw.poids` reste = `POIDS_PAR_CATEGORIE[kw.categorie]` à l'insert (côté form action `?/addKeyword`).
- **Pas de migration BDD** : pas de changement de schéma. L'extension du seed Cœur passe par un script `seed_keywords_extend_coeur.mjs` idempotent (INSERT … ON CONFLICT (terme_norm) DO NOTHING).
- **Pas de search côté serveur** (filtre client client suffit pour 130 rows).
- **Pas de search dans le panneau mots-clés** : 39 chips visibles direct, pas besoin de filtre.
- **Pas de tri secondaire date dans Pertinence** : ordre existant conservé (pertinence DESC, puis date_detection DESC côté serveur).
- **Pas de nouvelle catégorie de mots-clés** ("Cœur secondaire" évoqué = rejeté).
- **Pas d'icône catégorie dans le surlignage** (rompt le flow textuel, option A choisie).

## 4. Critères d'acceptation binaires (12)

Cochés en fin de session lors du smoke prod (Chrome MCP + manuel Pascal).

### Axe 1 — Surlignage premium (option A)

- [ ] **C1** : un mot Cœur dans la description d'une card est rendu en `font-weight: 700` + `text-decoration: underline` couleur `var(--color-success)` épaisseur 2px offset 3px, **sans fond**.
- [ ] **C2** : un mot Bonus est rendu en `color: var(--color-primary)` `font-weight: 500`, **sans underline**, **sans fond**.
- [ ] **C3** : un mot Éviter est rendu en `color: var(--color-danger)` avec `text-decoration: line-through` épaisseur 1px, opacité ~55% (rgba(240,68,56,0.55) ou `color-mix`).
- [ ] **C4** : le rendu visuel des 3 cartes A/B/C du mockup HTML est reproduit fidèlement en prod (smoke screenshot vs mockup local).

### Axe 2 — Recherche client

- [ ] **C5** : un input search est présent au-dessus de la grille de cards, avec placeholder « Rechercher dans description, maître d'ouvrage, commune… » et icône loupe à gauche.
- [ ] **C6** : taper « Lausanne » filtre les cards à celles dont `description_projet` OU `maitre_ouvrage` OU `commune` contient (case-insensitive, NFD-normalized) « lausanne ». Debounce 200ms (200ms après dernière frappe avant filtrage).
- [ ] **C7** : les matches du terme recherché sont surlignés en jaune (`background: #FEF9C3` + `color: inherit`, sans gras) DANS `description_projet`. Ce highlight jaune se superpose proprement au surlignage catégorie (Cœur/Bonus/Éviter) sans bg conflict (le jaune prime visuellement car c'est l'action utilisateur courante).
- [ ] **C8** : la valeur du search est persistée dans `localStorage` clé `signaux.search` et restaurée au reload (mais ré-appliquée au filtre dès le mount).
- [ ] **C9** : un bouton croix « Effacer » apparaît à droite de l'input quand non vide ; clic = vide la valeur + supprime la clé localStorage.

### Axe 3 — Seed Cœur étendu

- [ ] **C10** : un script `scripts/seed_keywords_extend_coeur.mjs` existe, en mode `--dry-run` par défaut, `--apply` pour insérer. Idempotent (ON CONFLICT (terme_norm) DO NOTHING).
- [ ] **C11** : le script ajoute au moins **15 termes Cœur** validés par le brief métier FilmPro (cf. § 5), poids = `POIDS_PAR_CATEGORIE.coeur` (= 5), `cree_par_email = 'system@filmpro.ch'`.
- [ ] **C12** : après exécution `--apply`, un rescoring des 130+ signaux actifs est déclenché via `scripts/rescore_signaux_v2.mjs --apply` (existant S187). Le nombre de SIMAP avec **au moins 1 match Cœur** doit passer de 0 (état S187) à **> 0** (mesure binaire ; pas de seuil chiffré strict).

## 5. Termes Cœur à ajouter au seed (axe 3)

Vocabulaire ancré sur le brief métier (`project_filmpro_metier.md` § « Scoring CRM » + verbatim Pascal). 15 termes proposés (poids +5, cumul plafonné Cœur +10) :

| Terme | Justification métier |
|---|---|
| `façade vitrée` | Cible projet vitrage typique SIMAP. |
| `verrière` | Élément architectural vitrage. |
| `double vitrage` | Vocabulaire bâtiment courant. |
| `survitrage` | Solution rénovation thermique vitrage. |
| `baie vitrée` | Élément résidentiel courant. |
| `paroi vitrée` | Élément bureau / commerce. |
| `vitrerie` | Activité miroitier (cible Zefix). |
| `miroiterie` | Activité partenaire installateur. |
| `contrôle solaire` | Fonction principale film. |
| `protection solaire` | Synonyme commercial. |
| `store solaire` | Solution proche (concurrente / complémentaire). |
| `pare-soleil` | Vocabulaire SIA bâti. |
| `brise-soleil` | Vocabulaire SIA bâti. |
| `film solaire` | Produit FilmPro direct. |
| `anti-effraction` | Sécurité bris de glace (enjeu #2 FilmPro). |

Note : pas de doublons avec les 15 mots Cœur déjà seedés S187 (à vérifier au moment du `--dry-run` ; les doublons seront skippés via ON CONFLICT).

## 6. Fichiers concernés

| Fichier | Modif |
|---|---|
| `src/lib/components/signaux/SignauxCards.svelte` | Réécriture des 3 sélecteurs `:global(mark.kw-coeur)`, `.kw-bonus`, `.kw-eviter` (lignes 246-266). Pas de modif logique. Composition avec highlight search (chunks imbriqués). |
| `src/routes/(app)/signaux/+page.svelte` | Ajout `let search = $state('')`, `searchDebounced` derived avec debounce 200ms, modif `filteredSignaux` derived pour filtrer aussi par search, persistance localStorage `signaux.search`, UI input search au-dessus de `<SignauxCards>`. |
| `src/lib/scoring/keywords.ts` | (Optionnel) Helper `highlightSearch(text, searchTerm)` qui retourne des chunks pour superposition propre. À voir si on compose en post-traitement plutôt. |
| `scripts/seed_keywords_extend_coeur.mjs` | **Nouveau**. Script idempotent --dry-run / --apply. Pattern aligné `rescore_signaux_v2.mjs`. |
| `src/lib/components/signaux/SignauxCards.test.ts` | (Si existe) Vérifier surlignage A + composition search-yellow. |

## 7. Plan d'exec (5 lots)

| Lot | Contenu | Durée | Tests |
|---|---|---|---|
| L1 | Surlignage option A : modif CSS `SignauxCards.svelte` (3 sélecteurs). | 30 min | Snapshot manuel mockup vs rendu réel. |
| L2 | Search input + filtre client + debounce + localStorage + bouton clear. | 1h | Tests Vitest sur le filtre derivé (search « lausanne » → filtre OK). |
| L3 | Highlight jaune search dans `description_projet`, compose propre avec surlignage catégorie. | 1h | Tests Vitest sur la fonction de composition chunks. |
| L4 | Script `seed_keywords_extend_coeur.mjs` + exec dry-run + apply prod + rescore. | 30 min | Smoke prod : « SELECT COUNT(*) FROM signaux WHERE score_coeur > 0 » passe de 0 à > 0. |
| L5 | 3 audits Opus parallèles (security / contracts / test-coverage) + smoke Chrome MCP prod + push. | 1h | 0 C/H sur les 3 audits, smoke 12/12 critères. |

## 8. Gates QA (DoD)

- [ ] `npx svelte-check --output human` → 0 erreurs (32 warnings préexistants tolérés).
- [ ] `npx vitest run` → 100% verts (~1306 tests baseline S187, +N nouveaux pour search/highlight).
- [ ] `npx vite build` → 0 erreur.
- [ ] 12/12 critères d'acceptation cochés.
- [ ] 3 audits Opus parallèles : 0 C/H. Findings Medium/Low/Info tolérés mais loggés en watch list.
- [ ] Smoke prod manuel Pascal sur Chrome (desktop) : compare mockup vs prod sur 1 card SIMAP, recherche « Lausanne », rescoring effectif.

## 9. Métrique de succès post-livraison

- **Score 1** : surlignage rendu identique au mockup option A (critères C1-C4 cochés).
- **Score 2** : recherche fonctionnelle bout-en-bout (C5-C9 cochés).
- **Score 3** : ≥ 1 SIMAP avec match Cœur après rescore (C10-C12 cochés).
- **Loggés outcome cockpit** : duration réelle, success yes/no/partial, 1 ligne ce qui a marché/coincé.

## 10. Non-objectifs (rappel)

- Pas une refonte d'ergonomie globale de la page.
- Pas un audit UX/UI 360 (séparé, Bloc #4 `[d068a79d]`).
- Pas une refonte du scoring v2 (déjà livré S187, ne pas y toucher hors seed extension).
- Pas de touche au cron Signaux (`/api/cron/signaux`, livré S187, scoping inchangé).
