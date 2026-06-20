# Spec : résilience de validation du pipeline de veille (par-article)

**Date** : 2026-06-06
**Statut** : spec à valider (gate Pascal) — aucune ligne de code avant validation
**Origine** : incident cron W23 (2026-06-05). Un article généré avec `search_terms` à 1 élément (schéma exige `min(2)`) a fait échouer le `safeParse` global → toute l'édition rejetée, run exit 1, ~5 min d'appel Anthropic jetés.
**Décision** : validée par council 4 voix (Architect/Skeptic/Pragmatist/Critic) → Option A fusionnée avec B + 3 garde-fous. Retry LLM (option C) rejeté à l'unanimité.

---

## 1. Objectif (1 phrase)

Un article non conforme ne doit plus jamais faire échouer toute l'édition de veille : valider **article par article**, conserver les valides, écarter individuellement les fautifs — **sans jamais fabriquer de donnée** et **sans masquer une dérive du modèle**.

---

## 2. Cause racine (rappel)

`generate.ts:326` : `IntelligenceReportSchema.safeParse(emitBlock.input)` est **tout-ou-rien**. Le schéma article (`IntelligenceItemSchema`) porte ~10 contraintes dures ; n'importe laquelle, violée par n'importe lequel des ~15 articles, fait tomber l'édition entière. `search_terms.min(2)` n'était que la 1ʳᵉ occurrence ; les 9 autres contraintes sont des bombes à retardement identiques.

---

## 3. Taxonomie des contraintes (le cœur de la décision)

Chaque contrainte est classée. **C'est cette table que tu valides en priorité.**

### 3a. PRÉFÉRENCE produit → relâcher au schéma (l'article passe)

| Champ | Contrainte actuelle | Action | Justification |
|---|---|---|---|
| `search_terms` (plancher) | `min(2)` | `min(1)` | Chips de prospection cliquables. L'aval (`apply-signals.ts`) tolère déjà 1 chip (voire 0). « 2 angles » est un confort éditorial, pas une garantie. |

C'est la **seule** vraie préférence. Tout le reste = intégrité.

### 3b. INTÉGRITÉ → article écarté entier si violé (drop + log), JAMAIS réparé

| Champ | Contrainte | Pourquoi intégrité |
|---|---|---|
| `rank` | int 1-15 | ordre/affichage |
| `title` | 10-200 chars | article vide ou aberrant = inexploitable |
| `summary` | 40-1500 chars | contenu requis |
| `filmpro_relevance` | 20-1200 chars | cœur métier |
| `maturity`, `geo_scope`, `segment`, `actionability` | enums | alimentent scoring + filtres + jointures |
| `source.name` | 2-120 chars | attribution |
| `source.url` | https valide | **l'anti-hallucination en dépend** |
| `source.published_at` | regex date | **le filtre fenêtre temporelle en dépend** |
| `search_terms` (plafond + chips) | `max(4)`, bornes par chip | au-delà = sortie aberrante, drop |

Règle absolue (council 4/4) : un article qui viole une contrainte d'intégrité est **écarté entier**, comme le fait déjà le filtre URL/date existant. **Aucune troncature, aucun remplissage, aucune coercition** : on ne persiste jamais un article « réparé » qui aurait l'air valide mais serait fabriqué.

**Garde-fou d'implémentation n°1 (issu de l'investigation historique, non négociable)** : `kept[]` DOIT être produit par `IntelligenceItemSchema.safeParse(item)` **réutilisé à l'identique, champ pour champ**. La SEULE modification autorisée au schéma article est `search_terms.min(2)→min(1)`. Interdit de réécrire un schéma article « allégé » qui relâcherait `source.url` (`HttpsUrl`, refuse `javascript:`/`data:`/`file:`), la regex `published_at`, ou les bornes de longueur — ce sont les invariants dont l'anti-hallucination dépend indirectement. Un article sans URL https valide ou sans date conforme n'est JAMAIS « gardé ».

### 3c. NIVEAU ÉDITION → échec run bruyant (inchangé)

`meta` (`week_label`, `generated_at`, `compliance_tag`, `executive_summary`) **ET `impacts_filmpro`**. Ce ne sont pas des articles : ils ne sont validés QUE par le parse global aujourd'hui.

**Garde-fou d'implémentation n°2 (issu de l'investigation historique, non négociable)** : `IntelligenceEditionSchema` (meta) et `ImpactFilmproSchema` restent en **parse strict tout-ou-rien**. Seul le tableau `items` passe en per-article. Si le découpage par-article contourne le parse strict du `meta`, un `executive_summary` halluciné ou un `week_label` malformé pourrait passer → régression. À éviter explicitement.

---

## 4. Garde anti-dérive (3ᵉ garde-fou, non négociable)

Sans ça, la tolérance par-article **éteint l'alarme** : un modèle qui se dégrade (1 article jeté cette semaine, 4 dans un mois, 9 ensuite) passerait inaperçu.

1. **Log par drop** : chaque article écarté est loggé avec le chemin exact de la contrainte violée (ex. `items[2].source.url`) + persisté dans le tracker de coûts du run.
2. **Seuil d'échec bruyant** : si, sur une édition, le nombre d'articles écartés dépasse le seuil **OU** s'il reste **0 article valide** → le run **échoue (exit 1)** avec un message listant les contraintes violées.
   - **Réutiliser l'infra de volume existante plutôt qu'inventer un seuil divergent** (garde-fou agent code) : `LOW_VOLUME_THRESHOLD` (8) et `SPARSE_WEEK_THRESHOLD` + statut `partial`/`low_volume` + `PUBLISHED_ITEMS_CAP` (10) existent déjà dans `run-generation.ts` et logguent/alertent déjà sur édition maigre. Le nouveau seuil de drop doit s'aligner sur cette infra, pas créer un nombre concurrent.
   - Seuil de drop **VALIDÉ (Pascal 2026-06-06)** : `> 3 articles écartés` **OU** `> 30 % du batch` **OU** `0 article final` → exit 1. (Sous le seuil = édition produite + warning loggé, puis l'infra `partial`/`low_volume` existante prend le relais sur le volume publié.)

---

## 5. Critères d'acceptation (binaires : passe / passe pas)

1. **W23 reproduit** : batch avec 1 article à 1 chip → édition produite, cet article **conservé** (reclassé préférence), N articles au total.
2. **Drop intégrité** : batch avec 1 article à URL invalide → cet article **droppé**, édition produite avec N-1 articles, drop **loggé** avec la contrainte.
3. **Zéro fabrication** : un article à `summary` trop courte est **droppé**, jamais complété/tronqué pour passer.
4. **Non-régression happy path** : batch 100 % valide → comportement identique à aujourd'hui (N articles, aucun changement).
5. **Article conservé = 100 % conforme** : chaque article persisté repasse `IntelligenceItemSchema.safeParse` au vert (on ne persiste jamais un article partiellement valide).
6. **Garde anti-dérive haute** : batch au-dessus du seuil OU 0 article valide → run **exit 1** avec message des contraintes violées.
7. **Garde niveau édition** : `meta` invalide → run échoue (inchangé).
8. **Tests existants verts**, sauf `schema.test.ts` « rejette moins de 2 search_terms » mis à jour pour refléter `min(1)` (+ nouveau test « accepte 1 search_term »).

---

## 6. Hors-scope (nommé)

- **Pas de retry LLM** sur échec de validation (option C, rejetée par le council : re-paye ~5 min, peut re-échouer à l'identique, masque la dérive).
- **Pas de refonte du prompt** ni du JSON schema strict-mode envoyé au modèle.
- **Pas d'assouplissement des contraintes d'intégrité** (url, dates, enums restent dures).
- **Pas de « réparation » d'article** (aucune donnée fabriquée).

---

## 7. Implémentation (esquisse, TDD strict)

- `schema.ts` : `search_terms` `.min(2)` → `.min(1)`.
- `generate.ts:326` : remplacer le `safeParse` global par : (a) parse strict de `meta` ; (b) boucle `IntelligenceItemSchema.safeParse` par article → `kept[]` / `dropped[]` (avec contrainte) ; (c) application du seuil anti-dérive ; (d) le reste du pipeline (theme fallback, sanitize URL, filtre anti-hallu) tourne sur `kept[]` comme aujourd'hui.
- Pattern déjà présent dans le repo : `report-items.ts` fait déjà du `safeParse` par-array tolérant en lecture. On applique le même esprit au write, en plus strict (drop, pas raw-fallback).
- Tests : un fichier dédié reproduisant les 8 critères ci-dessus.

---

## 8. Métrique de succès post-livraison

0 édition de veille perdue à cause d'un seul article non conforme sur les prochains runs ; les drops par-article sont visibles dans les logs + tracker de coûts (dérive mesurable). Rattrapage W23 via le bouton manuel `workflow_dispatch` (champ `week` = `2026-W23`) une fois le fix livré.

---

## 9. Vérification anti-régression anti-hallucination (investigation historique)

Demande explicite de Pascal : ne pas défaire le blindage anti-hallucination validé en sessions précédentes. Investigation menée en lecture seule (2 agents : git/audits + code), sources concordantes.

**Verdict : aucun des 2 changements ne défait une protection anti-hallucination validée.** Preuves :

- **Le blindage anti-hallu est intégralement EN AVAL du `safeParse` global et est DÉJÀ article-par-article.** Couches (toutes après `generate.ts:326`, sur `parsed.data.items`) : `sanitizeUrlsBatch` (nettoyage URL) → `filterAndAnnotateItems` (URL parseable + denylist hôte + `verifyUrl` HTTP/paywall/garde SSRF + date dans la fenêtre, rejet **individuel**) → `crossCheckBatch` (2ᵉ LLM Sonnet refetch la page, valide verbatim chiffres/dates/entités/citations, rejet **individuel** + `rejectUnfetchable:true`). Passer le parse en per-article fait tourner ces couches sur `kept[]` (articles eux aussi 100 % conformes per-item) : entrée bit-pour-bit équivalente, aucune couche affaiblie, aucun invariant inter-articles perdu.
- **`search_terms.min(2)` n'a jamais été anti-hallu** : origine commit `d9973d7` (choix produit « attribution commerciale par item »), borne déjà variée librement (`min(8).max(15)` globaux → `min(2).max(4)` par item). Les chips = `{kind enum, canton enum, query, label}`, aucune donnée factuelle, **jamais soumis au cross-check** (`cross-check.ts` n'envoie que url/name/date/title/summary/deep_dive). `min(2)→min(1)` = au pire 1 piste de prospection au lieu de 2. Zéro impact véracité.
- **Le `safeParse` tout-ou-rien n'a jamais été une décision de sécurité** : commit d'origine `ab4091c` (2026-04-14, avant tout travail anti-hallu) ; le commit anti-hallu V2 `0dba1a8` ne l'a pas touché. Il a au contraire causé des pannes répétées (`6eeceef` W18 executive_summary trop long, `c4285d5` S112), toujours résolues en l'assouplissant.

**Invariants validés à préserver absolument** (déjà couverts par les garde-fous §3b/§3c) :
- URL active obligatoire (item à `source.url` non résolvable → exclu) — règle immuable (`feedback_veille_url_active_obligatoire.md`).
- Date dans la fenêtre, cross-check verbatim, garde SSRF `isSafeUrlForFetch`, sanitize logs (repo public), cap publication `PUBLISHED_ITEMS_CAP=10` (jamais publier dégradé).

**Sources** : `audit_secu_2026-05-05_veille_anti_hallu.md`, `project_veille_anti_hallucination_pipeline.md`, `feedback_veille_url_active_obligatoire.md` ; commits `ab4091c`, `d9973d7`, `0dba1a8`, `ef8c6bf`, `6eeceef`, `c4285d5` ; code `generate.ts:169-380`, `run-generation.ts:384-448`, `cross-check.ts:304-351`, `url-verify.ts`, `schema.ts`.
