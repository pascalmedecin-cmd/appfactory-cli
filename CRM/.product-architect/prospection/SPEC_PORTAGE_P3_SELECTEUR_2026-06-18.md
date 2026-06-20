# Spec portage P3 - Sélecteur de source premium + import sélectif

**Date :** 2026-06-18. **Statut :** golden v1 **VALIDÉ par Pascal** (verbatim « Valider, go portage », gate franchi). Prêt pour exécution autonome.
**Golden de référence :** `.product-architect/prospection/golden-selecteur-source-v1.html` (3 cartes Annuaire/Google/Registre, champ adaptatif, résultats à cocher).
**Spec parent :** `CRM/docs/SPEC_MINIPROJET_PROSPECTION_SOURCES_2026-06-18.md` § BLOC P3 (critères d'acceptation).
**Méthode :** software factory, no-debt. **1 session autonome dédiée.** Effort xhigh.

---

## 0. Le changement de contrat (cœur du portage)

**Aujourd'hui :** « Rechercher » importe DIRECTEMENT en base. Les 3 endpoints (`zefix`, `searchch`, `google-places`) parsent → dédup → scorent → **insèrent** → renvoient `{imported, skipped, message}`.

**Cible (golden validé) :** « Rechercher » = **aperçu** (parse + dédup, **0 insert**) → l'utilisateur **coche** → « Importer » = insert des **sélectionnés** uniquement.

C'est une refonte du flux d'import des 3 sources + un nouveau chemin d'import sélectif. Le quota Google reste débité **à la recherche/aperçu** (inchangé, conforme).

---

## 1. Backend - design

### 1.1 Mode aperçu (les 3 endpoints search)
Ajouter un mode `preview` (flag body `preview: true`) à `zefix/searchch/google-places/+server.ts` :
- Exécute auth → gate flag → validation Zod → (Google : quota check + increment) → fetch → **parse + dédup** (existants / écartés-transférés / connus-Zefix), comme aujourd'hui jusqu'à l'étape « build ».
- **N'INSÈRE PAS.** Renvoie `{ candidates: Candidate[], quota?, total_results }`.
- `Candidate` = la ligne d'insert candidate + un `status_hint` ∈ `new | exists | dismissed | known_zefix` + un `tempId` stable (= `source_id`). Champs : `source, source_id, source_url, raison_sociale, adresse, npa, localite, canton, telephone, site_web, secteur_detecte, description, score_pertinence, status_hint`.
- Les candidats `exists`/`dismissed` sont renvoyés mais **pré-décochés et marqués** (« déjà dans le CRM ») - l'UI les grise.

### 1.2 Endpoint import sélectif (nouveau)
`POST /api/prospection/import-selected` :
- Body : `{ source: 'zefix'|'search_ch'|'google_places', candidates: CandidateInput[] }` (les cochés).
- **Sécurité (règle dure) : NE JAMAIS faire confiance au payload client.** Pour chaque candidat :
  - Valider via **Zod strict** (schéma `CandidateImportSchema` : `source` enum, `source_id` pattern, `raison_sociale` 1-200, `telephone`/`canton`/`npa`/`site_web` formats, lengths bornées, pas de champ libre non borné).
  - **Re-scorer serveur** (`calculerScore`) - jamais le score client.
  - **Re-dédupliquer serveur** (existants + écartés + connus-Zefix) au moment de l'import (TOCTOU : un autre admin a pu importer entre l'aperçu et le clic).
  - Re-construire la ligne d'insert serveur (id UUID serveur, `date_import`/`date_modification` serveur, `statut: 'nouveau'`).
- Insert les valides non-doublons. Renvoie `{ imported, skipped, message }`.
- Auth 401, gate flag 403 (source désactivée), rate limit (déjà couvert par `/api/prospection/*`).
- **Quota Google : NON re-débité** à l'import (déjà payé à l'aperçu). L'import sélectif n'appelle aucune API externe.

### 1.3 Refactor partagé (anti-duplication)
Extraire en helpers purs réutilisés par aperçu ET import-selected :
- `buildCandidateRow(entry, ctx)` (la construction de ligne + scoring), aujourd'hui inline dans chaque endpoint.
- `dedupStatus(supabase, source, sourceIds)` → map sourceId → `new|exists|dismissed`.
- `CandidateImportSchema` (Zod) dans `schemas.ts`.
Garder le comportement Veille (`from_intelligence`/`linkImportSignals`) : porté côté import-selected (la liaison signal se fait à l'insert réel).

---

## 2. Frontend - design

### 2.1 Composants (charte, primitives existantes)
- `SourceSelector.svelte` : 3 cartes (Annuaire/Google/Registre) façon golden, une active, identité couleur par source (tokens `--color-prosp-*`), pills « ce que ça ramène », coût (Gratuit / compteur Google `X/900`). Réutilise le compteur quota P2 (`data.googlePlacesQuota`).
- Champ **adaptatif** : Zefix = 1 champ « nom » ; search.ch/Google = « activité » + « lieu (canton/NPA) ». Réutilise les validations existantes (`gpInvalid`, `zefixNameInvalid`, etc.).
- `ResultsChecklist.svelte` : liste des `candidates` à cocher (checkbox + avatar initiales + tél/site + localité + tag « nouveau »/« déjà dans le CRM » grisé), select-all, bouton « Importer N sélectionnés ».
- Intégration : remplace le flux import-direct de `ImportModal` sur l'onglet Entreprises (Zefix/search.ch/Google). Terrain/SIMAP/RegBL inchangés.

### 2.2 Flux client
1. Sélection source → champ adaptatif.
2. « Rechercher » → POST `{preview:true}` → affiche `candidates` (cochables, doublons grisés/décochés).
3. Sélection (defaut : tous les `new` cochés).
4. « Importer N » → POST `/import-selected` avec les cochés → `invalidateAll()` → toast résultat.

### 2.3 Cohérence charte
DM Sans, tokens, primitives `Button/Input/Card`, palette workflow. Pas de CSS ad hoc hors charte. Audit `refactoring-ui` post-portage (critère ≥ 2 pages cohérentes).

---

## 3. Critères d'acceptation (binaires, repris de la spec parent § P3)
- [ ] 3 cartes rendues, une seule active ; champ adaptatif selon la source.
- [ ] Chaque carte explique en clair ce qu'elle ramène ; seule Google affiche le compteur quota.
- [ ] Résultats en liste à cocher ; **import sélectif fonctionnel** (e2e : rechercher → cocher 2/5 → importer → 2 leads en base, pas 5).
- [ ] Aucun insert au moment de la recherche (aperçu pur) - test (preview ne touche pas `prospect_leads.insert`).
- [ ] Dédup re-vérifiée à l'import (un candidat `exists` ne crée pas de doublon).
- [ ] `import-selected` rejette un payload client malformé (Zod) + re-score serveur (test : score client falsifié ignoré).
- [ ] Cohérence visuelle ≥ 2 autres pages CRM (audit `refactoring-ui`).
- [ ] `svelte-check` 0, build vert, Vitest vert, e2e vert, axe-core 0 violation.
- [ ] Pas de régression sur la recherche existante.
- [ ] Audit `code-review:security-auditor` sur le nouvel endpoint d'écriture : **0 High/Critical** (payload client non fiable, validation stricte, dédup, re-score).

## 4. Hors-scope (no-debt)
- Consolidation multi-source / dédup cross-source à l'affichage → exclu (1 source à la fois).
- Pagination Google > 20 → non.
- SIMAP/RegBL dans Prospection → retirés (P1).

## 5. Skills (nommés, règle skills-routing)
`redesign-skill` (stack Tailwind/tokens), `soft-skill` (barre qualité premium, déjà appliquée au golden), `ui-ux-pro-max` (patterns cartes de sélection), `anydesign` (tokens charte, déjà extraits), `refactoring-ui` (audit cohérence post-portage).

## 6. Risque / revue
Build conséquent (3 endpoints refactorés + 1 endpoint d'écriture nouveau + 3 composants + tests + 2 revues). Endpoint d'écriture = surface sécu → security-auditor obligatoire. Bug-hunter sur le flux aperçu→import (TOCTOU dédup, payload client).
