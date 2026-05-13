# Spec - Refonte page Signaux (scoring mots-clés FilmPro)

**Statut** : à valider par Pascal avant code (étape 2 du chantier).
**Session cible** : S186 (CRM, 2026-05-13), exec autonome.
**Effort** : xhigh | Score 4/4 (structurelle multi-fichiers, multi-étapes contraintes croisées, itération coûteuse car push prod + cron tourne, UX/design partiellement non-mesurable).
**Estimé** : 3 à 4 h (0,5 spec + 2 code + 1 QA + 0,5 livraison).
**Origine** : demande Pascal session courante, sur une page `/signaux` qui ne distingue pas aujourd'hui les opportunités vitrage des appels d'offres voirie (hors scope métier FilmPro).
**Référence métier** : `~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/project_filmpro_metier.md` (brief verbatim, NE PAS INVENTER en dehors).

---

## 1. Objectif

Permettre à l'admin FilmPro (`pascal@filmpro.ch`, `antoine@filmpro.ch`, futur 3e fondateur) de maintenir directement sur la page `/signaux` une **liste de mots-clés catégorisée** (Cœur métier / Bonus / À éviter) qui pilote le scoring de tous les signaux (appels d'offres SIMAP + créations Zefix + ajouts manuels). Faire remonter les signaux pertinents vitrage et faire descendre / masquer les signaux hors-scope (voirie, génie civil pur). Modifier la liste rescore instantanément les signaux existants et retrie la page.

**Métrique de succès post-livraison** : sur les 131 signaux SIMAP actuels en BDD, après rescoring v2, ≥ 80 % des entrées en haut de liste (top quartile par score) sont jugées pertinentes vitrage par Pascal en une revue visuelle de 10 min ; ≥ 80 % des « réfection de chaussée » présentes ont un score ≤ 0 et sont masquées par le toggle hors-scope.

---

## 2. Critères d'acceptation (binaires, testables)

1. **Migration SQL** : `supabase/migrations/20260513_003_signaux_mots_cles.sql` crée la table `signaux_mots_cles` du § 4 ; RLS « tous voient, admins @filmpro.ch éditent » ; 3 index ; seed de la liste initiale du § 6 (Cœur / Bonus / À éviter).
2. **Module scoring v2** : `src/lib/scoring/keywords.ts` (nouveau) exporte `scoreKeywords(text, keywords): KeywordScore` ; lib pure, 100 % testable Vitest ; supporte expressions multi-mots, accents-insensible (réutilise `normalizeNFD`), match plein-mot (`\b...\b`) pour éviter `route` matchant `routine`.
3. **`calculerScore` (refondu)** : `src/lib/scoring.ts:calculerScore` accepte un 2e argument `keywords: KeywordRow[]` (au lieu de `config.scoring.secteursCibles`) ; rétro-compat : si keywords vide → score identique à aujourd'hui (test golden) ; le composant secteur de `criteres[]` est remplacé par les composants `Coeur "vitrage" (+5)`, `Bonus "régie" (+2)`, `Éviter "route" (-3)`.
4. **Plancher score** : score final clampé à `[-10, +20]` (audit Q-A2 figée) ; pill UI affiche `0` pour scores négatifs mais conserve la valeur réelle en tooltip + tri.
5. **Page `/signaux` : panneau latéral droit** : composant `SignauxKeywordsPanel.svelte` (nouveau), `width: 320px`, sticky, collapsible (chevron en haut, état persisté `localStorage:signaux.keywordsPanel`) ; 3 sections colorées Cœur (vert `--color-success`) / Bonus (bleu `--color-primary`) / À éviter (rouge `--color-danger`) ; chips éditables avec `x` pour retirer + bouton inline `[+ ajouter]` ; édition optimiste UI + rollback si erreur serveur.
6. **Layout 2 colonnes** : `+page.svelte` passe d'un layout 1 colonne à un layout `flex` (`cards-col` + `keywords-panel`) ; le slideout de détail signal s'ouvre **au-dessus** du panneau (z-index supérieur, pas de chevauchement coupé).
7. **Tri par défaut = Pertinence** : `+page.svelte` ajoute un segmented control `[Pertinence ▼] [Date]` (tokens) ; tri serveur OFF (le `+page.server.ts:load` continue `date_detection DESC` pour la baseline) ; tri client côté `$derived` à partir de `score_pertinence` (NULLs en queue de liste) ; persistance `localStorage:signaux.sort`.
8. **Toggle « Cacher les hors-scope »** : checkbox au-dessus de la liste, masque côté client tous les signaux avec `score_pertinence <= 0` (déterministe, pas de magic number) ; état persisté `localStorage:signaux.hideOutOfScope`.
9. **Surlignage des matchs** : dans `SignauxCards.svelte`, les mots-clés matchés dans `description_projet` sont rendus en `<mark class="cat-coeur|cat-bonus|cat-eviter">` ; échappement strict via fonction utilitaire (zéro `{@html}` non-échappé, zéro innerHTML, surlignage sur DOM rendu) ; pas de surlignage sur `maitre_ouvrage` ni `commune` (V1, V2 si demande).
10. **Tooltip score détaillé** : hover sur la pill score affiche la liste des critères matchés ligne par ligne (Cœur / Bonus / Éviter / Canton / Date / etc.) ; utilise champ existant `notes_libres` qui stocke déjà `score.criteres.join(', ')` ; ne pas ajouter de nouvelle colonne BDD.
11. **Form actions** : `+page.server.ts` expose `?/addKeyword` (terme, categorie) et `?/removeKeyword` (id) — admin gate `isAdminEmail(user.email)` côté serveur en tête, 403 sinon ; validation Zod (`terme` 2-50 chars, `categorie ∈ ['coeur','bonus','eviter']`) ; après mutation, **rescoring rétroactif** des signaux à statut `nouveau` ou `en_analyse` (UPDATE bulk en 1 query, voir § 5).
12. **Rescoring rétroactif déclenché en migration** : à la fin de la migration `_003`, un SQL `UPDATE signaux_affaires SET score_pertinence = ... WHERE statut_traitement IN ('nouveau', 'en_analyse')` rejoue le score v2 sur les 131 entrées existantes (logique scoring exposée en plpgsql `compute_score_v2(signal_id)` pour rester en BDD ; sinon Node script post-migration).
13. **Cron SIMAP modifié** : `src/routes/api/cron/signaux/+server.ts:importSimap` n'utilise plus `config.scoring.secteursCibles.keywords` pour filtrer à l'import (gate dur retiré, audit Q-A1 figée : on importe tout, le scoring trie) ; appelle `calculerScore(lead, keywords)` au lieu de `calculerScore(lead)` ; même refonte pour `importZefix`.
14. **Bouton « Ajouter » retiré de `/signaux`** : décision Pascal session courante (« aucun intérêt sur cette page ») ; suppression UI + form action `?/create` côté serveur (grep cross-ref pré-vérifié : 0 consumer externe) ; le state JS et la modale `ModalForm` de création sont supprimés ; le bouton « + Ajouter un signal » dans l'empty state est remplacé par un message statique « Pas encore de signaux. Le scanner remplit cette page chaque matin à 6 h ».
15. **Tests** : Vitest +25 minimum :
   - `keywords.test.ts` : match plein-mot, accents, multi-mots, exclusion, score positif/négatif/clamp.
   - `scoring.test.ts` : `calculerScore` avec keywords vides (golden = comportement v1), avec keywords mixés, plafonds par catégorie.
   - `signaux/+page.server.test.ts` : addKeyword / removeKeyword happy path + admin gate 403 + Zod gate 400 + rescoring déclenché.
   - `signaux-page-actions.test.ts` : retrait `?/create` ne casse aucun autre flow.
   - Total : Vitest 1253 baseline + ≥ 25 nouveaux verts ; svelte-check 0 erreur ; build OK.
16. **Audits Opus** : security-auditor 0 C/H/M (focus form actions admin + RLS table mots-clés) ; contracts-reviewer 0 C/H/M (focus alignement enums catégorie / poids / Zod / SQL CHECK) ; test-coverage-reviewer coverage ≥ 90 % sur lib pure `keywords.ts` ; artifacts datés dans `~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/audit_secu_2026-05-13_signaux_refonte.md` (et 2 autres).

---

## 3. Hors-scope nommé (refusé explicitement, no-debt)

- **Poids éditables par mot-clé** : V1 = poids figés par catégorie (+5 / +2 / -3). Si Pascal veut +7 sur « vitrage » et +3 sur « miroiterie » → V2.
- **Multi-listes par persona** (résidentiel vs bâtiment pro) : V2. V1 = liste unique partagée.
- **Recherche full-text avancée** (opérateurs `AND`, `OR`, `NOT`, `-`, `()`) : V2.
- **Catégories au-delà de 3** : V2.
- **Rescoring des signaux archivés** (`converti`, `ecarte`) : non rescoré (US5 explicite).
- **Sauvegarde de configurations de recherche** (snapshots de listes) : V2 (la table existante `recherches_sauvegardees` reste vide pour ça, à utiliser plus tard).
- **Édition manuelle d'un signal** : refusée (bouton « Ajouter » retiré, décision Pascal session courante).
- **Tri serveur par score** : V1 = tri client côté `$derived` ; passage en tri serveur si la table dépasse 500 entrées.
- **Audit / journal des modifications de mots-clés** : pas de table `signaux_mots_cles_history` V1 ; on garde `cree_par` + `cree_le` + `mis_a_jour_le`.

---

## 4. Modèle de données (table Supabase exacte)

```sql
-- supabase/migrations/20260513_003_signaux_mots_cles.sql
-- Spec : notes/refonte-signaux-2026-05-13/spec.md
-- Module : table de mots-clés pilotant le scoring v2 des signaux.

CREATE TABLE IF NOT EXISTS public.signaux_mots_cles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  terme         text NOT NULL CHECK (char_length(terme) BETWEEN 2 AND 50),
  -- terme normalisé NFD (sans accents, lowercase) pour comparaison déterministe
  -- côté SQL ET côté scoring TypeScript (réutilise normalizeNFD).
  terme_norm    text NOT NULL CHECK (char_length(terme_norm) BETWEEN 2 AND 50),
  categorie     text NOT NULL CHECK (categorie IN ('coeur', 'bonus', 'eviter')),
  -- poids signé : +5 (coeur) / +2 (bonus) / -3 (eviter) par défaut, figé V1.
  poids         integer NOT NULL DEFAULT 0 CHECK (poids BETWEEN -10 AND 10),
  cree_par      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cree_par_email text NOT NULL,
  cree_le       timestamptz NOT NULL DEFAULT now(),
  mis_a_jour_le timestamptz NOT NULL DEFAULT now(),
  UNIQUE (terme_norm)  -- pas de doublons « vitrage » + « Vitrage » + « vitrage » accentué
);

-- Index : lecture rapide par catégorie (panneau UI groupe par cat).
CREATE INDEX signaux_mots_cles_categorie_idx ON public.signaux_mots_cles(categorie);
CREATE INDEX signaux_mots_cles_terme_norm_idx ON public.signaux_mots_cles(terme_norm);
CREATE INDEX signaux_mots_cles_cree_le_idx ON public.signaux_mots_cles(cree_le DESC);

ALTER TABLE public.signaux_mots_cles ENABLE ROW LEVEL SECURITY;

-- SELECT : tous les authentifiés (cohérent doctrine mono-tenant FilmPro).
CREATE POLICY "signaux_mots_cles_select_all" ON public.signaux_mots_cles
  FOR SELECT TO authenticated USING (true);

-- INSERT / UPDATE / DELETE : admins @filmpro.ch uniquement (comparaison lower casing).
CREATE POLICY "signaux_mots_cles_admin_insert" ON public.signaux_mots_cles
  FOR INSERT TO authenticated
  WITH CHECK (lower(auth.jwt() ->> 'email') LIKE '%@filmpro.ch');

CREATE POLICY "signaux_mots_cles_admin_update" ON public.signaux_mots_cles
  FOR UPDATE TO authenticated
  USING (lower(auth.jwt() ->> 'email') LIKE '%@filmpro.ch')
  WITH CHECK (lower(auth.jwt() ->> 'email') LIKE '%@filmpro.ch');

CREATE POLICY "signaux_mots_cles_admin_delete" ON public.signaux_mots_cles
  FOR DELETE TO authenticated
  USING (lower(auth.jwt() ->> 'email') LIKE '%@filmpro.ch');

-- Trigger pour mis_a_jour_le.
CREATE TRIGGER signaux_mots_cles_set_updated
  BEFORE UPDATE ON public.signaux_mots_cles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- (réutilise la fonction trigger générique existante du repo, à vérifier au code)

-- Seed initial : voir § 6.
INSERT INTO public.signaux_mots_cles (terme, terme_norm, categorie, poids, cree_par_email) VALUES
  -- (à remplir depuis le § 6 après validation Pascal)
;
```

---

## 5. Mécanique de scoring v2

### Algorithme

Pour un signal donné (description + raison sociale + commune concaténés, normalisés NFD) :

1. **Match cœur** : pour chaque mot-clé `categorie='coeur'`, compter les matchs plein-mot (`\b...\b`). Score = `min(nb_matchs * 5, 10)` (plafond +10).
2. **Match bonus** : idem, score = `min(nb_matchs * 2, 4)` (plafond +4).
3. **Match éviter** : pour chaque mot-clé `categorie='eviter'`, si au moins 1 match → malus `-3` (pas de cumul, malus fixe par catégorie pour V1).
4. **Score keywords** = `min_match_coeur + min_match_bonus + malus_eviter`.
5. **Score final** = score_keywords + (autres composants existants v1 : canton, source, récence, téléphone, montant, signal veille).
6. **Clamp** : `max(-10, min(20, score_final))`.
7. **Label** : `chaud` si score ≥ 7, `tiede` si score ≥ 4, `froid` sinon.

### Migration des 131 signaux SIMAP existants

Au déploiement de la migration `_003`, on rejoue le score v2 sur tous les signaux à statut `nouveau` ou `en_analyse` :

```sql
-- Pseudo-code, version Node script ou plpgsql à trancher au code.
UPDATE signaux_affaires sa
SET score_pertinence = compute_score_v2(sa.id),
    notes_libres = compute_criteres_v2(sa.id)
WHERE statut_traitement IN ('nouveau', 'en_analyse');
```

Trade-off implémentation : Node script post-migration (plus simple, scoring vit côté TS) **vs** fonction plpgsql `compute_score_v2` (plus rapide, mais duplique logique scoring en SQL). **Reco : Node script** invoqué une fois manuellement après `pg push`, simple et auditable. Pas de plpgsql.

### Lecture des mots-clés au scoring (runtime)

Trade-off de perf : `calculerScore` est appelée à l'import (1× par signal Zefix/SIMAP) et au rescoring rétroactif (1× par signal nouveau/en_analyse). On a deux options :

- **A. Lecture des mots-clés en cache mémoire** : le cron lit `SELECT * FROM signaux_mots_cles` une fois en début de run, passe le tableau à `calculerScore`. Reco V1.
- **B. Lecture à chaque appel** : trop coûteux en BDD, refusé.

À chaque mutation côté admin (`?/addKeyword` / `?/removeKeyword`), on relit la liste à jour et on rejoue le scoring sur les signaux `nouveau`+`en_analyse`. Latence attendue : < 200 ms pour 131 entrées (testable, plafond 500).

---

## 6. Liste initiale de mots-clés (à valider par Pascal)

**Annotation** :
- (B) = mot extrait directement du **brief verbatim Pascal**
- (M) = mot dérivé du **vocabulaire métier standard du secteur traitement vitrage** (proposition à valider, hors brief)
- (P) = mot **exemple Pascal** explicite dans le fil de cette session

### Cœur métier (vocabulaire vitrage direct) - poids +5

| Terme proposé | Origine | Justification |
|---|---|---|
| vitrage | (B) | brief : « traitements pour vitrage » |
| film | (B) | brief : « films et vernis » (attention : risque match « film cinéma » dans description SIMAP, mais cohérent métier) |
| vernis vitre | (M) | dérivé brief « vernis » + qualificatif vitre pour exclure « vernis bois / parquet » |
| vernis vitrage | (M) | variante typographique |
| contrôle solaire | (M) | technique standard pour « confort thermique » du brief |
| anti-UV | (M) | technique standard pour « confort thermique » du brief |
| anti-effraction | (M) | technique standard pour « sécurité » du brief |
| bris de glace | (M) | technique standard pour « sécurité » du brief |
| anti-éblouissement | (M) | technique standard pour « confort thermique » du brief |
| miroiterie | (M) | métier amont du marché vitrage en Suisse |
| vitrerie | (M) | idem |
| store solaire | (M) | concurrent / complément technique du film solaire |
| façade vitrée | (M) | descripteur typique d'appels d'offres bâtiment |
| baie vitrée | (M) | idem résidentiel |
| véranda | (M) | application typique résidentiel |

### Bonus (cibles commerciales du brief) - poids +2

| Terme proposé | Origine | Justification |
|---|---|---|
| régie | (B) | brief : « régies » |
| architecte | (B) | brief : « architectes » |
| architecture | (M) | variante orthographique |
| facility manager | (B) | brief : « facility managers » |
| facility | (M) | match court |
| bureau d'études | (B) | brief : « bureaux d'études » |
| bureau technique | (M) | équivalent métier |
| ingénieur | (M) | métier d'interface fréquent |
| rénovation | (M) | déclencheur typique d'appel d'offres avec vitrage à traiter |
| réhabilitation | (M) | idem |
| transformation | (M) | idem |
| fenêtre | (M) | descripteur courant côté résidentiel |
| menuiserie extérieure | (M) | sous-traitant fréquent du vitrage |

### À éviter (hors-scope) - poids -3

| Terme proposé | Origine | Justification |
|---|---|---|
| route | (P) | exemple Pascal : « réfections de route hors scope » |
| chaussée | (M) | génie civil pur |
| asphalte | (M) | génie civil pur |
| voirie | (M) | génie civil pur |
| canalisation | (M) | génie civil pur |
| conduite | (M) | génie civil pur |
| pont | (M) | génie civil pur |
| tunnel | (M) | génie civil pur |
| terrassement | (M) | génie civil pur |
| pavage | (M) | génie civil pur |
| revêtement bitumineux | (M) | génie civil pur |

**Action Pascal** : cochez ce qui va, barrez ce qui ne va pas, ajoutez ce qui manque. Ou validez tel quel pour une V1 et on ajustera en usage. Reco : valider tel quel, ajuster dans les 2 semaines d'usage.

---

## 7. UX détaillée

### Layout
- Page = `<main class="signaux-layout">` avec 2 children : `<section class="cards-col">` (flex 1) + `<aside class="keywords-panel" data-collapsed={...}>` (320px).
- Panneau replié : largeur 48px (juste chevron + icône), titre vertical « PERTINENCE ».
- Responsive : sur `< 1024px`, le panneau passe en accordéon au-dessus des cards (pas de drawer pour V1, audit mobile CRM séparé).

### Chips
- Chip = `<button class="chip cat-X" aria-label="Retirer le mot-clé Y">Y <Icon close /></button>`.
- Hover : background plus saturé + icône `x` rouge.
- Optimistic : disparition immédiate à la suppression, réapparition + toast d'erreur si serveur 4xx/5xx.

### Bouton « + ajouter »
- Inline en pied de section : `<button class="chip chip-add">+ ajouter</button>`.
- Click → transforme en `<input class="chip-input" placeholder="ex: vitrage" autofocus>`.
- Entrée → submit POST `?/addKeyword&categorie={X}` ; Échap → annule sans toast.
- Validation client : 2-50 chars, sinon shake + tooltip d'erreur.

### Tri + toggle
- Au-dessus des cards, à droite du dropdown canton :
  - Segmented `[Pertinence ▼] [Date]`
  - Checkbox `☐ Cacher les hors-scope`

### Surlignage description
- Pas de `{@html}` : utilitaire `highlightKeywords(text, keywords): Array<{text, cat}>` qui retourne des chunks, rendu Svelte normal :
  ```svelte
  {#each chunks as c}
    {#if c.cat}<mark class="cat-{c.cat}">{c.text}</mark>{:else}{c.text}{/if}
  {/each}
  ```
- Échappement HTML automatique par Svelte (zéro vector XSS).

### Empty state
- Si BDD vide (cas extrême, mais utile en dev) : « Pas encore de signaux. Le scanner Zefix + SIMAP remplit cette page chaque matin à 6 h. Reviens demain. »

### Conflit slideout / panneau
- Slideout détail signal a `z-index: 50` (existant) → mettre `z-index: 60` pour qu'il s'ouvre par-dessus le panneau.

---

## 8. Plan de tests

### Vitest (lib pure)
- `keywords.test.ts` :
  - match plein-mot (`route` ne matche pas `routine`)
  - accents insensibles (`régie` matche `Regie`, `REGIE`, `régie`)
  - multi-mots (`contrôle solaire` matche, `contrôler le solaire` non)
  - score cœur capé à +10 (3 matchs `vitrage` = +10 et non +15)
  - score bonus capé à +4
  - score eviter fixe -3 quel que soit le nombre de matchs
  - score final clampé `[-10, +20]`

### Vitest (`scoring.ts`)
- Backward-compat : `calculerScore(lead, [])` doit retourner le même score que `calculerScore(lead)` v1 (test golden).
- Mix : signal avec 2 mots Cœur + 1 Bonus + 1 Éviter → score = `min(2*5,10) + min(1*2,4) + (-3) + canton + ...`
- Tri : 3 signaux avec scores variés rangés correctement.

### Vitest (form actions)
- `addKeyword` happy : admin pascal@filmpro.ch ajoute « vitrage » Cœur → INSERT OK + rescoring déclenché.
- `addKeyword` admin gate : email non-@filmpro.ch → 403.
- `addKeyword` Zod gate : terme = '' → 400 ; categorie = 'autre' → 400.
- `addKeyword` doublon : terme déjà présent (case-insensitive après NFD) → 409 + message clair.
- `removeKeyword` happy : DELETE + rescoring.
- `removeKeyword` admin gate : 403.

### Smoke prod
- Lancer le cron `/api/cron/signaux` manuellement via curl + CRON_SECRET → vérifier 0 erreur + apparition de nouvelles entrées Zefix scorées avec keywords v2.
- Smoke Chrome MCP sur prod : login admin, ouvrir `/signaux`, ajouter un mot Cœur, voir le réordonnancement, retirer, voir le retour à la baseline.

---

## 9. Plan de livraison (5 lots de commit)

1. **Lot 1 - DB + lib pure** : migration `_003` + seed initial + `src/lib/scoring/keywords.ts` + tests Vitest unitaires.
2. **Lot 2 - Refonte `scoring.ts`** : refondre `calculerScore` pour accepter le tableau de keywords + tests rétro-compat + tests mixtes.
3. **Lot 3 - UI panneau** : `SignauxKeywordsPanel.svelte` + intégration dans `+page.svelte` (layout 2 colonnes, tri client, toggle, surlignage cards) + suppression bouton « Ajouter » + suppression form action `?/create`.
4. **Lot 4 - Form actions admin** : `?/addKeyword`, `?/removeKeyword` + tests serveur + rescoring rétroactif déclenché.
5. **Lot 5 - Cron + rescoring rétroactif initial** : cron Zefix + SIMAP lisent la table mots-clés (au lieu de `config.scoring.secteursCibles`) + script one-shot Node pour rescorer les 131 SIMAP existants.

Gates entre lots : `npm test` vert + svelte-check 0 erreur après chaque lot.

---

## 10. Gates QA (Étape 4)

- ✅ Vitest 1253 baseline + ≥ 25 nouveaux verts (~1278).
- ✅ svelte-check 0 erreur (baseline 28 warnings non-régression).
- ✅ `npm run build` OK.
- ✅ Audit `code-review:security-auditor` : 0 C/H/M ; artifact `audit_secu_2026-05-13_signaux_refonte.md`.
- ✅ Audit `code-review:contracts-reviewer` : 0 C/H/M sur enums + Zod + SQL CHECK + types TS.
- ✅ Audit `code-review:test-coverage-reviewer` : coverage ≥ 90 % sur `keywords.ts`.
- ✅ Smoke prod Chrome MCP : 1 ajout mot-clé Cœur + 1 retrait + observation tri.

---

## 11. Livraison (Étape 5)

- Migration `_003` appliquée prod via skill `supabase` + `pg` lib (cf. `feedback_supabase_migration_via_pg_lib.md`).
- Script rescoring rétroactif lancé une fois en post-migration (Node script avec service role).
- Commit unique signé Claude Opus 4.7, push origin/main.
- Mise à jour `CRM/CLAUDE.md` : nouveau livré + watch list post-livraison.
- Entry cockpit deliver via `deliver.py`.
- Notification Pascal : « Refonte Signaux livrée, panneau de mots-clés actif, 131 signaux SIMAP rescorés. Va voir `/signaux`. »

---

## 12. Validation Pascal pour passer à l'étape 3 (code)

**3 cases à cocher** :

- [ ] La spec critère par critère 1-16 est OK (ou indiquer lesquels modifier).
- [ ] La liste initiale du § 6 est validée tel quel, ou Pascal indique les coupes/ajouts (vue 5 min suffit).
- [ ] Hors-scope nommé § 3 validé (ou Pascal réintègre un point dans la V1).

Dis « go étape 3 » + (éventuelles modifs liste § 6) et je code en autonomie les 5 lots avec les gates QA. Pas d'autre validation intermédiaire avant la livraison.
