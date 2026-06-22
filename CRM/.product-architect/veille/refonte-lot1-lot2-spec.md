# Veille FilmPro — refonte éditoriale Lots 1+2 (spec, 2026-06-22)

GO Pascal 2026-06-22 (« GO - refonte ciblée complète »). Touche le blindage
anti-hallu validé → cette spec prouve qu'aucune protection n'est défaite.

## Diagnostic 360 prouvé (run réel W25, reportId `3ef350af`)

7 items générés, 0 publié. Décomposition prouvée (lecture code + curl live) :

| # | Source | URL live | Sort réel | Cause |
|---|--------|----------|-----------|-------|
| 1 | RTS canicule degré 3 | 200 | rejeté cross-check | verbatim tue la voix d'analyste |
| 2 | RTS canicule 28°C | 200 | rejeté cross-check | idem |
| 3 | RTS nuit tropicale GE | 200 | rejeté cross-check | idem |
| 7 | Blick recours UV GE | 200 | rejeté cross-check | idem |
| 4 | Kontrast décret `/ts` | 404 | rejeté preCheck | suffixe parasite non strippé |
| 5 | 3M `/j` (b...013) | 000 | rejeté preCheck | URL ALTÉRÉE (citation = 3msuisse.ch b...011) |
| 6 | CoolVu `/sd` | 404 | rejeté preCheck | suffixe parasite non strippé |

**Deux causes indépendantes** : (A) cross-check verbatim rejette l'interprétation
d'analyste ; (B) URLs mal-formées au filtre amont.

## Invariants à préserver (NE PAS défaire)

- **I1 zéro-hallu sur les FAITS** : un chiffre/date/entité/citation fabriqué ou
  déformé reste rejeté (incident W18 : 2,88 Md paraphrasé 2,66 Md). Source unique
  de cette garantie = `cross-check.ts` (Sonnet relit la page réelle).
- **I2** : un item non vérifiable (page morte/API down) n'est JAMAIS publié
  (`rejectUnfetchable:true`, `systemicError`).
- **I3** : aucune donnée fabriquée par le serveur (pas de réécriture de résumé,
  pas d'URL inventée — la récupération d'URL n'utilise QUE des URLs réellement
  retournées par web_search).
- **I4** : SSRF guard (`isSafeUrlForFetch`) sur tout fetch sortant.

## Lot 2 — le blindage (faits vs interprétation)

### AC-1 : cross-check sépare faits et interprétation
- Le vérificateur valide UNIQUEMENT les **faits vérifiables** (chiffres, dates,
  noms propres, citations entre guillemets, énumérations).
- Une phrase d'**interprétation/analyse** (le « so what », implication, mise en
  perspective) qui n'introduit AUCUN fait vérifiable nouveau n'est JAMAIS flaggée.
- Gate : item rejeté SSI ≥1 divergence **fatale sur un fait** (fabriqué/contredit).
- Renommage `verbatim_ok` → `facts_ok` (honnêteté sémantique). Quand `facts_ok=false`,
  le vérificateur DOIT nommer le fait fautif (ferme la brèche H-04).
- **Test I1** : un résumé identique mais avec un chiffre injecté faux → toujours rejeté.
- **Test rejeu W25** : les 4 items vivants (RTS×3, Blick) — leurs ATOMES FACTUELS
  sont présents dans la page réelle (prouvé par fetch+grep, sans appel LLM) → donc
  publiables sous le contrat faits-only ; sous l'ancien contrat ils étaient rejetés.

### AC-2 : récupération d'URL mal-formée (déterministe, zéro fabrication)
- Extraire les URLs réelles des blocs `web_search_tool_result` (ground truth).
- Si l'URL d'un item échoue (404/network), tenter de la remplacer par une URL de
  citation **même hostname + même chemin à un suffixe parasite près**. Re-vérifier.
- JAMAIS de substitution cross-domaine ou de chemin différent (le 3M altéré
  reste rejeté — c'est l'anti-hallu qui marche). `url_mutated:true` loggé.

### AC-3 : mix romand garanti côté serveur + alerte dérive
- Remplacer `sort(rank)+slice(10)` par une sélection geo-aware (cible 2/3 local,
  cap monde) qui ne force jamais un item inexistant.
- Logger un warning de dérive si la part romande/locale publiée < seuil (canari).

## Lot 1 — éditorial (gratuit, prompt + rendu)

### AC-4 : persona analyste sénior + so-what structuré
- `prompt.ts` : « moteur de veille » → analyste sectoriel sénior vitrage/bâtiment
  Suisse romande conseillant le dirigeant.
- `filmpro_relevance` structuré : opportunité concrète + segment + déclencheur +
  action. Reconcilier l'instruction verbatim : les FAITS du résumé viennent de la
  source ; l'INTERPRÉTATION (so-what) est attendue et ne sera pas rejetée.
- Direction éditoriale + few-shot (2 exemples excellents + 1-2 contre-exemples).

### AC-5 : filet anti-générique DÉTERMINISTE (rétrogradation, pas rejet)
- Post-LLM : un `filmpro_relevance` qui ne nomme NI segment NI action est
  rétrogradé (pénalité de rank) + loggé. Jamais rejeté (on combat la famine).

### AC-6 : email = vrai brief
- Édito (executive_summary) en tête + signaux `action_directe` avec leur so-what +
  lien par item + `impacts_filmpro`. Tableau de coûts replié en bas. Retirer le
  montant EUR du subject.

### AC-7 : bouton prospection réparé
- `detectKind` défaut `simap` → `zefix` (simap/regbl désactivés, config.ts V5).
- Prompt : ne plus instruire l'émission de chips `simap` (source coupée) ; zefix
  pour entreprise nommée, sinon tableau vide.

### AC-8 : page index
- Remonter un extrait de `filmpro_relevance` dans « À retenir ».
- Retirer le `line-clamp-5` qui tronque l'executive_summary de la Une.

## Métrique de succès post-livraison

- W25 rejoué : ≥4 items réels publiables (les 4 locaux) vs 0, +2 si récup URL OK.
- 0 régression : suite Vitest verte (baseline 1869) + svelte-check 0 erreur.
- Revue adversariale : bug-hunter 0 C/H/M + security-auditor 0 C/H/M + ≥3 skeptics
  zéro-hallu (aucun ne prouve qu'un fait fabriqué passe).

## PREUVE DU REJEU W25 (live, 2026-06-22)

Rejeu des 7 items réels sur les filtres corrigés (fetch live des vraies pages) :

- **4 items locaux (RTS×3 + Blick)** : tous les FAITS présents dans la page réelle
  (HTTP 200). Items 1/2/3 : faits OK (degré 3 / 37°, niveau 4 / 28°, nuit tropicale /
  Genève / 20°), interprétation absente de la page (« pression estivale », « enjeu
  sanitaire », « santé publique ») → l'ANCIEN contrat les jetait, le NOUVEAU les garde.
  Item 7 (Blick) : « 28'500 » EST sur la page mais encodé `28&#x27;500` (entité hex non
  décodée) → ajout du décodage d'entités numériques dans `htmlToPlainText` (évite un faux
  « chiffre absent »). Tous les chiffres (3500, communes) présents.
- **3 items monde** : citations W25 contiennent les vraies URLs. Récupération :
  Kontrast `.../conformite/` → HTTP **200** (récupéré, le `/ts` était parasite) ;
  CoolVu `.../safer-home/` → HTTP **200** (récupéré) ; 3M `.../b5005059013/` → HTTP 000
  (3m.com bloque le bot ; re-vérifié → rejeté si pas de réponse, gardé sinon ; pas de
  fabrication). NB : le 3M N'EST PAS une altération cross-domaine (citation même-domaine
  `b5005059013` existe) — hypothèse initiale corrigée.
- **Bilan W25** : 0 → **6 items** publiables (4 locaux + Kontrast + CoolVu), 3M conditionnel
  à la réponse de 3m.com. Anti-hallu intact : les chiffres publiés sont tous présents dans
  les pages réelles (vérifié par fetch+grep).
- Suite : **1922 Vitest verts** (baseline 1869 + 53 nouveaux), **svelte-check 0 erreur**.

## Hors-scope (nommé)

- Réécriture de résumé (« corriger le chiffre divergent ») — Lot 3, trop risqué.
- 2e appel LLM, décomposition multi-appels — Lot 3 (si plafond persiste).
- Mémoire longue, dashboard qualité, PDF de marque, pont veille→action fin — Lot 3.
- Nettoyage enum RegBL désynchronisé — Lot 3.
