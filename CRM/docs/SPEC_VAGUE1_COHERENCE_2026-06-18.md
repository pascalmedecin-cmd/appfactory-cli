# Spec Vague 1 - Cohérence (refonte UX/UI CRM FilmPro)

**Date :** 2026-06-18. **Statut :** PÉRIMÈTRE PROPOSÉ - en attente validation Pascal (30 s) avant exécution.
**Origine :** cadrage refonte validé 2026-06-18 (audit 360 / 18 agents + benchmark 9 outils + council/premortem + 5 passes réflexion). Cartographie code de la Vague 1 faite cette session (recherches, statuts, onglets morts).
**Effort :** xhigh. **Méthode :** software factory (spec d'abord, itération autonome jusqu'au vert, no-debt).
**Payload cadrage :** `~/.claude/projects/-Users-pascal-Claude-Projets-FilmPro/memory/project_refonte_crm_cadrage_2026-06-18.md` + `CRM/.product-architect/cadrage-refonte-crm-2026-06-18.html`.

**Objectif transversal (Pascal) : CRM plus utile + plus premium + parcours plus instinctif, SANS ajouter de fonctions** (sauf emailing, vague 4). La Vague 1 ne touche pas l'esthétique premium des listes (vague 2) : elle supprime les **incohérences** et les **coquilles mortes** qui sabotent la lisibilité, à coût et risque faibles.

---

## 0. Critères de succès GLOBAUX de la refonte (binaires, posés une fois)

Valables pour toutes les vagues. Évalués à la livraison de chaque vague.

- **G1 - Cohérence vérifiable** : une seule façon de chercher (un composant `SearchInput` partagé), un seul rendu par statut / type / étape (100 % via les helpers FR centralisés), zéro coquille morte visible (onglet/option sans source). *Mesure : grep d'audit = 0 rendu d'enum brut dans le DOM + 1 seul composant de saisie de recherche + 0 onglet visible sans source active.*
- **G2 - Parcours raccourci** : depuis n'importe quelle page CRM, retrouver une entité de la page courante et ouvrir sa fiche/slide-out en **≤ 2 interactions** (taper dans la recherche visible → cliquer le résultat). *Mesure : e2e Playwright sur Entreprises, Contacts, Signaux, Prospection.*
- **G3 - Verdict des 3 fondateurs** : en réunion de 30 min, les 3 fondateurs valident « plus clair / plus fluide » sur les surfaces livrées. *Mesure : verdict nominal oral, PAS de métrique d'usage (base de démarrage vide, cf. cadrage). Aucun retrait de fonction sans ce verdict.*

> G1 et G2 sont automatisables (grep + e2e). G3 est le garde-fou humain qui autorise les retraits définitifs (date d'expiration § 8).

---

## 1. Chantier A - Recherche unique VISIBLE

### Constat (cartographie code)
La recherche existe en **5 implémentations divergentes**, sans primitive partagée :

| # | Surface | Fichier:ligne | Implémentation | Placement |
|---|---|---|---|---|
| A1 | Recherche Prospection | `routes/crm/prospection/+page.svelte:747` (+ `+page.server.ts:35,90-98`) | Serveur, `.ilike()` 3 colonnes + dédup Set, URL `?q=` | Input nu au-dessus des filtres, **caché sur mobile** |
| A2 | Recherche Signaux | `routes/crm/signaux/+page.svelte:387-406` (+ `74-106,180-189`) | Client, filtre mémoire NFD accent-insensible, persisté `localStorage signaux.search` | Barre visible permanente, icône `search` + clear `X` |
| A3 | Filtre statut Prospection | `+page.svelte:681-692` + `prospection-utils.ts:138-143` | `MultiSelectDropdown` réutilisable, URL multi-valeurs | Fieldset filtres |
| A4 | Filtre type+canton Signaux | `+page.svelte:351-370` | `<select>` natifs, filtre client | Toolbar sticky |
| A5 | Autocomplete entreprise (Zefix/search.ch) | `lib/components/prospection/ImportModal.svelte:270-434` | POST API externes | Modal import |

**A3/A4/A5 ne sont pas en scope Vague 1** : A3/A4 sont des filtres (pas de la recherche texte) ; A5 est une recherche d'API externe dans une modale (logique métier distincte). Le chantier porte sur **A1 et A2** : les deux vraies recherches texte de liste, aujourd'hui incohérentes (une serveur / une client, une cachée mobile / une visible, comportements et styles différents).

### Décision (validée au cadrage : recherche unifiée PAR PAGE, pas cross-entité globale)
1. **Créer une primitive partagée `SearchInput`** (`lib/components/ui/SearchInput.svelte`) : champ visible persistant, icône `search` à gauche, bouton clear `X` quand non vide, placeholder explicite par page, accessible (label, `type="search"`, aria). C'est la « recherche » nommée des primitives partagées du cadrage.
2. **Extraire le matching accent-insensible** (NFD, aujourd'hui inline `signaux/+page.svelte:180-189`) vers un helper pur testable `lib/utils/searchMatch.ts` (`normalizeForSearch(s)` + `matchesQuery(haystack, query)`).
3. **Câbler A1 et A2 sur `SearchInput`** sans changer leur stratégie de données (Prospection reste serveur car paginé ; Signaux reste client car borné) - seuls l'UI et le contrat d'interaction sont unifiés. La recherche Prospection devient **visible aussi sur mobile** (corrige A1 caché).
4. **Contrat de comportement commun** (identique sur A1 et A2) : visible en tête de zone liste (jamais replié dans les filtres, jamais Cmd+K), debounce cohérent (250 ms), clear remet la liste complète, recherche accent-insensible.

### User stories
- **US-A1** : En tant que fondateur, je vois une barre de recherche au même endroit et avec le même look sur Entreprises, Contacts, Signaux et Prospection, pour ne pas réapprendre à chaque page.
- **US-A2** : En tant que fondateur sur mobile, je peux chercher dans Prospection (aujourd'hui impossible, champ caché).
- **US-A3** : En tant que fondateur, je tape « zürich » et je trouve « Zürich » (insensible aux accents) partout, comme déjà le cas dans Signaux.

### Hors-scope chantier A (no-debt, nommé)
- Recherche **globale cross-entité** (un champ qui cherche entreprises + contacts + signaux d'un coup) → vague 2 (relève de la fiche/liste premium et du modèle de navigation).
- Migration de A1 (Prospection) du serveur vers le client ou inversement → non : on garde la stratégie de données, on unifie l'UI seulement.
- Refonte de A5 (modal import Zefix/search.ch) → non (logique API externe, hors « cohérence des listes »).
- Style premium de la ligne de résultat (badges/pills) → vague 2 (golden d'abord).

---

## 2. Chantier B - Statuts / types / étapes en FR (cohérence)

### Constat (cartographie + vérification ciblée)
Tous les enums **ont** déjà un libellé FR centralisé (source unique) :
- Statuts leads : `prospection-utils.ts:83-91` (`statutLabel`)
- Statuts signaux : `lib/utils/signauxFormat.ts:37-51` (`STATUT_LABELS`)
- Étapes pipeline : `config.ts:31-69` (`pipeline.etapes[].label`)
- Types signaux : `config.ts:172-202` + `signauxFormat.ts:53-61` (`formatTypeLabel`)
- Sources : `prospection-utils.ts:105-115` (`sourceLabel`)

Le problème n'est donc PAS « du contenu anglais » mais **3 rendus qui bypassent les helpers** et affichent l'enum brut (technique, en minuscules avec underscores) :

| # | Fichier:ligne | Rendu brut actuel | Devrait être |
|---|---|---|---|
| B1 | `routes/crm/pipeline/+page.svelte:377` | `{selectedOpp.signaux_affaires.type_signal}` → « appel_offres » | `formatTypeLabel(...)` → « Appel d'offres » |
| B2 | `routes/terrain/entreprise/[id]/+page.svelte:94` | `{o.etape_pipeline}` → « negociation » | label via `config.pipeline.etapes` → « Négociation » |
| B3 | `routes/crm/prospection/+page.svelte:529,981` | `` `statut ${lead.statut}` `` (aria-label) → « statut interesse » | `` `statut ${statutLabel(lead.statut)}` `` → « statut Intéressé » |

### Décision
- **Router B1, B2, B3 par les helpers FR existants** (zéro nouveau mapping, on réutilise la source unique). B1/B2 sont visibles à l'écran (priorité haute) ; B3 est un aria-label (a11y lecteurs d'écran, priorité moyenne mais inclus, même pass).
- **Garde-fou anti-régression** : ajouter une garde déterministe (test Vitest de type « grep AST/source ») qui échoue si un enum `statut` / `statut_traitement` / `etape_pipeline` / `type_signal` est interpolé directement dans un template `.svelte` sans passer par un helper de label. Évite que B4… réapparaisse. (Pattern « splitter/garde déterministe post-fix », cf. doctrine projet.)

### User stories
- **US-B1** : En tant que fondateur, je ne vois jamais de libellé technique (« appel_offres », « negociation ») dans l'interface ; toujours le mot français lisible.
- **US-B2** : En tant qu'utilisateur de lecteur d'écran, les statuts annoncés sont en français lisible, pas l'enum brut.

### Hors-scope chantier B (no-debt, nommé)
- Renommer les **valeurs DB** (enums Postgres) → non, jamais (migration risquée, aucune valeur d'affichage dans la DB).
- Recolorier / réharmoniser les **variants de badge** (couleurs des statuts) → vague 2 (relève de la charte premium, pas de la cohérence FR).
- Internationalisation (i18n multi-langue) → hors-scope total (app mono-langue FR).

---

## 3. Chantier C - Signaux = appels d'offres only (retrait du filtre Type mort)

> **Décision de cadrage 2026-06-18 (Pascal) - changement de répartition** : les onglets **SIMAP et RegBL de la page Prospection** ne sont PLUS traités ici. Ils migrent vers le **mini-projet « Prospection recentrée », Bloc P1** (`docs/SPEC_MINIPROJET_PROSPECTION_SOURCES_2026-06-18.md`), pour ne pas toucher deux fois la même page (`prospection/+page.svelte`) dans deux vagues. Le Chantier C de la Vague 1 se recentre donc sur la **page Signaux uniquement**.

### Constat (cartographie code, état V5)
La page Signaux n'est plus alimentée que par **SIMAP** (radar d'appels d'offres). Or le filtre **Type** propose toujours 7 options héritées de sources coupées :

| Élément | Fichier:ligne | État | Problème |
|---|---|---|---|
| Filtre **Type** Signaux (7 options) | `routes/crm/signaux/+page.svelte:351-360` + `config.ts:172-201` | SIMAP ne produit que `appel_offres` ; les 6 autres types (`creation_entreprise`, `permis_construire`, `demenagement`, `expansion`, `fusion_acquisition`, `autre`) venaient de Zefix/RegBL, coupés V5 → zéro donnée neuve | Un filtre à 7 options dont 1 seule discrimine = filtre inutile qui ne ramène que de l'historique ou rien |

### Décision
1. **Signaux est mono-type (`appel_offres`)** → **retirer entièrement le filtre Type** de la page Signaux (`+page.svelte:351-360`). Un filtre à une seule valeur utile n'a pas de raison d'être : c'est une fonction en moins, pas une option restreinte. Garder le filtre **Canton** (lui discrimine réellement).
2. **Réversibilité** : si une future source rouvrait d'autres types (hors V5), le filtre Type se re-dérive de `config.signaux.types` ; on documente le point de réintroduction en commentaire plutôt que de garder un `<select>` mort.
3. **Aucune suppression de `config.signaux.types`** : l'enum reste (les libellés FR servent encore au rendu d'un type via `formatTypeLabel`, cf. B1). On retire l'UI du filtre, pas la donnée.

### User stories
- **US-C1** : En tant que fondateur, la page Signaux ne me propose plus un filtre « Type » à 7 entrées dont 6 ne ramènent jamais rien ; l'interface ne montre que des filtres qui servent (Canton).
- **US-C2 (réversibilité)** : En tant qu'admin, si une source rouvre d'autres types de signaux, le filtre Type peut être réintroduit depuis `config.signaux.types` sans dette.

### Hors-scope chantier C (no-debt, nommé)
- Onglets SIMAP/RegBL de Prospection → **mini-projet Bloc P1** (déplacé, plus ici).
- Supprimer l'enum `config.signaux.types` → non (les libellés servent au rendu FR, cf. B1).
- Refonte de l'**empty state** Signaux premium → vague 2.
- Recalibrage du scoring Signaux / réouverture d'une source → hors refonte (décision V5 figée).

---

## 4. Critères d'acceptation (binaires - passe / passe pas)

**Chantier A - Recherche**
- [ ] Un composant unique `lib/components/ui/SearchInput.svelte` existe et est utilisé par Prospection (A1) et Signaux (A2) ; aucune autre implémentation de champ de recherche texte de liste ne subsiste.
- [ ] Le helper `lib/utils/searchMatch.ts` est extrait, pur, et couvert par ≥ 6 tests Vitest (accents, casse, vide, multi-mots, no-match, normalisation NFD).
- [ ] La recherche Prospection est **visible sur mobile** (plus de `hidden` desktop-only sur le champ).
- [ ] Comportement identique A1/A2 vérifié e2e : icône search, clear `X` qui réinitialise, debounce, accent-insensible (« zurich » trouve « Zürich »).
- [ ] G2 vérifié : ouvrir une entité depuis la recherche en ≤ 2 interactions (e2e Prospection + Signaux).

**Chantier B - Statuts FR**
- [ ] B1 `pipeline/+page.svelte:377` affiche `formatTypeLabel(type_signal)` (« Appel d'offres », plus « appel_offres »).
- [ ] B2 `terrain/entreprise/[id]/+page.svelte:94` affiche le label FR de l'étape (« Négociation », plus « negociation »).
- [ ] B3 `prospection/+page.svelte:529,981` : l'aria-label passe par `statutLabel(...)`.
- [ ] Une garde Vitest échoue si un enum `statut`/`statut_traitement`/`etape_pipeline`/`type_signal` est interpolé brut dans un `.svelte` sans helper de label (test exécuté sur la garde elle-même = rouge sans le fix, vert avec).
- [ ] Grep d'audit final : 0 rendu d'enum brut dans le DOM (G1).

**Chantier C - Signaux mono-type** (onglets Prospection SIMAP/RegBL → mini-projet Bloc P1, plus ici)
- [ ] Le filtre « Type » est **retiré** de la page Signaux (mono-type `appel_offres`) ; le filtre Canton est conservé.
- [ ] L'enum `config.signaux.types` n'est PAS supprimé (les libellés FR servent encore au rendu via `formatTypeLabel`, cf. B1) ; seul l'UI du filtre est retiré.
- [ ] Un commentaire documente le point de réintroduction du filtre Type si une source rouvrait d'autres types (réversibilité sans dette).

**Sécurité / non-régression (transverse)**
- [ ] `svelte-check` 0 erreur, build prod vert.
- [ ] Suite Vitest verte (1725+), aucun test cassé ; nouveaux tests (searchMatch, garde enum) ajoutés.
- [ ] e2e Playwright verts (parcours recherche Prospection + Signaux ; Signaux sans filtre Type).
- [ ] Audit `code-review:security-auditor` ciblé sur les fichiers touchés : 0 High/Critical. (Surface faible : UI + helpers, pas d'auth/RLS/secret nouveau ; artefact daté quand même.)
- [ ] Aucune migration DB, aucune suppression de code/données : Vague 1 = masquage par flag + routage par helpers existants.

---

## 5. Hors-scope GLOBAL de la Vague 1 (no-debt, nommé)

- Esthétique premium des listes/fiches (ligne riche Linear, toggle Table/Cards, golden) → **vague 2**.
- Signaux condensés + actions, Prospection colonne Campagne/CSV, Dashboard façon Capsule → **vague 3**.
- Emailing individuel → nLPD → groupé → **vague 4**.
- Recherche globale cross-entité, suppression dure du code mort, recalibrage de sources → hors-scope (cf. chantiers).
- Tout ajout de fonction (sauf emailing en vague 4) → interdit par l'objectif Pascal.

---

## 6. Garde-fous (issus de la réflexion 360, à respecter)

- **Recherche VISIBLE persistante, jamais Cmd+K** (charte « label compris en 2s » ; Cmd+K rejoue le rejet « SaaS dev hors cadre métier »). Réf `[[feedback_ux_style_crm]]`.
- **Réversibilité d'abord** : tout retrait (onglets, filtres) par flag/condition dérivée, jamais par suppression. On peut tout rallumer en flippant `config.ts`.
- **Source unique** : la visibilité d'un onglet et le label d'un statut dérivent d'**un seul** endroit (flag `config.ts` / helper FR). Pas de duplication de la condition.
- **Primitives nommées** : `SearchInput` + `searchMatch` sont les briques partagées qui font durer « premium » à 12 mois (garde-fou cadrage).
- **Pas de premium déguisé** : la Vague 1 ne change pas le style des lignes ni les couleurs de badges (c'est la vague 2, golden d'abord pour éviter un 3e rejet visuel, cf. `[[feedback_decoupe_ui_premium_moderne_riche]]`).
- **G3 avant retrait définitif** : le masquage est réversible ; la **suppression** du code mort attend le verdict des 3 fondateurs (§ 8).

---

## 7. Pointeurs fichiers (pour l'exécution)

**Recherche**
- A1 Prospection : `src/routes/crm/prospection/+page.svelte:747` + `+page.server.ts:35,90-98`.
- A2 Signaux : `src/routes/crm/signaux/+page.svelte:387-406,74-106,180-189`.
- À créer : `src/lib/components/ui/SearchInput.svelte` + `src/lib/utils/searchMatch.ts` (+ tests).

**Statuts FR**
- Helpers (réutiliser, ne pas dupliquer) : `src/lib/prospection-utils.ts:83-91,105-115` ; `src/lib/utils/signauxFormat.ts:37-61` ; `src/lib/config.ts:31-69,172-202`.
- À corriger : `src/routes/crm/pipeline/+page.svelte:377` ; `src/routes/terrain/entreprise/[id]/+page.svelte:94` ; `src/routes/crm/prospection/+page.svelte:529,981`.
- Garde : nouveau test Vitest (scan source `.svelte`).

**Signaux mono-type (retrait filtre Type)**
- Filtre Type Signaux à retirer : `src/routes/crm/signaux/+page.svelte:351-360` (+ filtre Canton à conserver `:351-370`).
- Enum à NE PAS supprimer : `src/lib/config.ts:172-201` (`signaux.types`, libellés FR utilisés par `formatTypeLabel`).
- (Onglets Prospection SIMAP/RegBL : voir `docs/SPEC_MINIPROJET_PROSPECTION_SOURCES_2026-06-18.md` Bloc P1.)

---

## 8. Dates d'expiration des retraits (garde-fou anti code zombie)

Le filtre Type retiré cette vague laisse l'enum `config.signaux.types` en place (réversible, et toujours utile au rendu FR). Pour éviter le code zombie (garde-fou cadrage « 90j caché sans réactivation → suppression git ») :

- **2026-09-18** (90 j) : si aucune source n'a rouvert d'autres types de signaux et que le verdict fondateurs (G3) confirme l'abandon → réévaluer si l'UI du filtre Type doit rester définitivement retirée (l'enum, lui, reste tant que `formatTypeLabel` l'utilise).
- Les dates d'expiration des onglets SIMAP/RegBL de Prospection sont gérées dans le mini-projet (`SPEC_MINIPROJET_PROSPECTION_SOURCES_2026-06-18.md` § 6).

---

## 9. Décisions validées (Pascal, 2026-06-18)

1. **Filtre Type Signaux** : **retrait total** (mono-type `appel_offres`), pas une simple restriction. **Validé Pascal** (décision explicite en session : « garder seulement appels d'offres, les autres catégories n'ont pas de valeur ajoutée »).
2. **Recherche Prospection serveur vs Signaux client** : on garde les deux stratégies de données, seul l'UI est unifié. **Auto-décision** (choix technique mineur, réversible : Prospection paginée serveur, Signaux borné client ; tout migrer = vague 2).
3. **A11y B3** : correction de l'aria-label incluse dans cette vague. **Auto-décision** (coût marginal, même pass).

> Question structurante (filtre Type) tranchée par Pascal ; les deux micro-choix techniques sont des auto-décisions tracées. Spec prête pour exécution.
