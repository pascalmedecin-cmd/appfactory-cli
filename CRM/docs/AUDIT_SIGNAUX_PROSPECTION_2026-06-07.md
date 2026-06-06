# Deep dive 360 - Pages Signaux & Prospection (matière pour council critique)

**Date :** 2026-06-07. **Statut :** deep dive factuel TERMINÉ (lecture seule, 0 code modifié). **Le council/challenge se fait la PROCHAINE session.** Ce document est la matière : faits + chiffres réels + questions cadrées. Il ne tranche rien.

**Objectif de l'exercice (mots de Pascal) :** auditer de façon critique et objective les + et les - des pages Signaux et Prospection. Tout ce qui est inclus est-il pertinent ? Peut-on simplifier et se concentrer sur ce qui ajoute vraiment de la valeur ? Exemple donné : Signaux affiche toutes les créations d'entreprises reçues via Zefix - « ça pollue » (1000+ fiches à trier).

**Méthode prochaine session :** skills `council` (4 voix : Architecte / Sceptique / Pragmatique / Critique) + `simplification-cascades` (quel insight élimine plusieurs composants). Effort `xhigh`.

---

## 1. Les chiffres qui cadrent le débat (requêtes DB prod 2026-06-07)

### Signaux (`signaux_affaires`) - 1517 fiches
| Mesure | Valeur | Lecture |
|---|---|---|
| Total | **1517** | Le « 1000 à trier » de Pascal est en réalité 1500+ |
| Statut `nouveau` | **1503 (99 %)** | Quasi rien n'est trié |
| Statut `ecarte` | 14 | |
| Statut `interesse` / `en_analyse` / `converti` | **0 / 0 / 0** | **Le workflow de tri n'est pas utilisé. 0 conversion.** |
| Source `zefix` | **1227 (81 %)** | Créations d'entreprises Romandie, brutes |
| Source `simap` | 290 (19 %) | Appels d'offres publics |
| Score >= 7 (chaud) | **47 (3,1 %)** | 97 % du contenu est tiède/froid |
| Score <= 0 (hors-scope) | 36 (2,4 %) | Le toggle « cacher hors-scope » ne masque que 36 fiches |
| `nouveau` + plus de 30 j | 99 | Backlog qui dort |
| Fiche la plus vieille | 38 j | Pas de purge |

### Prospection (`prospect_leads`) - 185 leads
| Mesure | Valeur | Lecture |
|---|---|---|
| Total | 185 | Volume gérable |
| Statut `nouveau` | 141 | |
| Statut `ecarte` | 42 | |
| Statut `interesse` | **1** | |
| Statut `transfere` | **1** | |
| Opportunités créées (`opportunites`) | **0** | **Le funnel prospection -> CRM -> opportunité a produit ~0 en prod.** |
| Entreprises au CRM (`entreprises`) | 2 | |
| Score >= 7 (chaud) | 82 (44 %) | Bon ratio (imports ciblés) |
| Score 4-6 (tiède) | 75 | |
| Score <= 3 (froid) | 28 | |
| Sources | simap 81, regbl 50, search_ch 25, google_places 20, zefix 9 | Imports manuels mixtes |
| Leads liés à un signal Veille | 15 | Le pont Veille est peu alimenté |

**Constat brut, sans interprétation :** Signaux est un robinet (1500+ fiches, 99 % non triées, 0 conversion, 3 % chaud). Prospection est une machine sophistiquée (5 sources, 4 onglets, batch, enrichissement, alertes) qui tourne sur 185 leads pour 1 transfert et 0 opportunité.

---

## 2. Page Signaux - ce qui est inclus

**Route :** `/crm/signaux` (refonte V4 2026-05-13). **Rôle (code) :** trieur de fiches brutes importées quotidiennement de Zefix (créations d'entreprises) et SIMAP (appels d'offres), scorées par mots-clés, à convertir en opportunités.

**Affiché :**
- 4 KPIs (Total / À triager / À convertir / Convertis).
- 5 onglets statut (nouveau / en_analyse / interesse / converti / ecarte) avec compteurs.
- Filtres type + canton, recherche texte (3 champs, debounce, persistée localStorage), tri Pertinence/Date.
- Bouton « Mots-clés » (desktop, admin) ouvrant un drawer de gestion des mots-clés (Cœur / Bonus / Éviter, poids).
- Toggle « Cacher hors-scope » (masque score <= 0).
- Mode sélection + suppression batch.
- Cards (bandeau couleur selon mot-clé dominant, surlignage Cœur/Bonus/Éviter dans la description, pastille score, badge statut).
- SlideOut détail (description, acteurs, localisation, source/dates, critères de scoring, opportunité liée).
- Modales : édition, conversion en opportunité, confirmations.

**Actions :** filtrer/trier/chercher, ouvrir détail, éditer, écarter, supprimer (unitaire + batch), créer opportunité, gérer les mots-clés (admin) avec rescoring rétroactif.

**Source & flux :** cron `/api/cron/signaux` quotidien 6h UTC. Zefix : scanne 7 j, filtre cantons romands + créations (`status.neu`), dédup `(source, source_id)`, score, INSERT statut `nouveau`. SIMAP : scanne 7 j, projets construction par canton, INSERT. **Aucune purge** (par design : audit trail, tri manuel attendu).

**Scoring :** mots-clés en BDD (`signaux_mots_cles`, 39 termes seed : 15 Cœur / 13 Bonus / 11 Éviter), poids signés, matching plein-mot + pluriel + NFD. Score = canton + mots-clés (Cœur cap 10 / Bonus cap 4 / Éviter malus) + source + entreprise + téléphone + montant. Labels chaud >= 7 / tiède 4-6 / froid. *(Poids exacts par critère à reconfirmer par lecture finale `config.ts` - 2 rapports d'agents divergeaient sur canton +2 vs +3 ; non bloquant pour le débat de périmètre.)*

**Tests :** unitaires keywords/cron OK ; e2e quasi nul (rend sans erreur seulement). Pas d'e2e du tri, détail, conversion.

---

## 3. Page Prospection - ce qui est inclus

**Route :** `/crm/prospection` (Phase 2 onglets, 2026-05-01). **Rôle (code+specs) :** hub de découverte/qualification/conversion de leads issus de 4-5 sources, scoring 0-13, dédup, action batch.

**Affiché :**
- 3 KPIs honnêtes (actifs / marchés SIMAP ouverts / transférés ce mois).
- 4 onglets par nature (Marchés publics SIMAP / Chantiers RegBL / Entreprises Zefix-search.ch-Google Places / Terrain) avec colonnes variables.
- Filtres multi-select : statut, température, canton, source + toggle « afficher transférés ».
- Recherches sauvegardées + alertes (cron `/api/cron/alertes`).
- DataTable resizable + pagination (25/50/100) + tri serveur + recherche ; cards mobiles (flag `ffCrmMobileV2`).
- Sélection batch globale (pattern Gmail, cap 5000) + barre d'actions batch (intéressé / écarter avec undo / enrichir).
- SlideOut détail (scoring détaillé, coordonnées, métier, photos, visites, actions statut + enrichir téléphone + transfert atomique vers CRM).
- Modales : import (1 par source), Lead express (terrain), enrichissement batch, alerte, panel recherches.

**Sources :** SIMAP, RegBL, Zefix, search.ch (gratuites) + Google Places (payante, ~0,10 $/requête, interdite en alerte auto) + lead_express (terrain) + pont Veille (`source_intelligence_id`). Dédup `(source, source_id)` + dédup fuzzy lead express (raison sociale + téléphone).

**Scoring :** même moteur `calculerScore()` que Signaux + bonus Veille décroissant (cron `/api/cron/lead-rescore` quotidien, décroît sur 4 semaines, cap +4). Transfert vers CRM = RPC atomique (entreprise + contact + opportunité).

**Tests :** unitaires solides (dédup express, anti-injection search, RPC transfert, source payante). E2e partiel (pagination, colonnes, onglets). Pas d'e2e imports/transfert.

---

## 4. Observations structurelles transversales (à challenger)

1. **Deux pipelines parallèles pour des objets voisins.** `signaux_affaires` ET `prospect_leads` sont deux tables d'ingestion distinctes, alimentées en partie par les MÊMES sources (Zefix nourrit les deux : 1227 en signaux via cron, 9 en prospection via import manuel ; SIMAP idem : 290 vs 81), avec le MÊME moteur de scoring. Candidat `simplification-cascades` : Signaux et Prospection sont-ils deux vues du même « lead brut à qualifier » ? A-t-on besoin des deux ?

2. **Le robinet Zefix.** 81 % du volume Signaux = toutes les créations d'entreprises romandes, sans filtre de pertinence à l'ingestion (le scoring trie après coup, pas avant). Résultat : 97 % de tiède/froid, 3 % de chaud noyés. Question centrale de Pascal.

3. **Workflow de tri non utilisé.** Signaux : 1503/1517 restent `nouveau`, 0 conversion. La machinerie (5 onglets de statut, conversion, batch) existe mais n'est pas exercée. Soit l'outil ne sert pas, soit il sert mal (friction, volume décourageant).

4. **Funnel prospection à vide.** 185 leads -> 1 intéressé -> 1 transféré -> 0 opportunité. Beaucoup de surface (imports multi-sources, enrichissement, alertes, recherches sauvegardées) pour un débit quasi nul. Sur-ingénierie probable vs valeur réelle.

5. **Pas de purge nulle part.** Croissance ~700+ fiches/mois sans suppression. Le volume va empirer mécaniquement.

6. **Scoring affiné mais sur du bruit.** Le système de mots-clés Cœur/Bonus/Éviter est soigné, mais s'applique massivement à des créations d'entreprises dont la majorité n'a aucun rapport avec le vitrage.

---

## 5. Questions cadrées pour le council (la session prochaine tranche)

Chaque question = un nœud de valeur. Reco = hypothèse de travail à attaquer, pas une décision.

**Q1 - Faut-il continuer à ingérer TOUTES les créations Zefix ?**
Hypothèse à challenger : filtrer à l'ingestion (seuil de score minimal, ou mots-clés Cœur obligatoires) plutôt qu'afficher tout et trier après. Risque : rater un signal faible. Bénéfice : diviser le volume par ~10-30.

**Q2 - Signaux et Prospection doivent-ils rester deux pages/pipelines distincts ?**
Hypothèse `simplification-cascades` : fusionner en un seul flux « leads bruts -> qualifiés » (une table, une page, des vues filtrées). Élimine la double ingestion, le double scoring, la confusion « où est ma fiche ».

**Q3 - Le workflow de tri Signaux (5 statuts, conversion) sert-il vraiment ?**
0 conversion en prod. Soit le simplifier radicalement (garder/écarter binaire + remontée des seuls chauds), soit comprendre pourquoi il n'est pas utilisé avant de le refaire.

**Q4 - Quelle machinerie Prospection garder ?**
5 sources, enrichissement batch, alertes, recherches sauvegardées, Google Places payant : lesquelles ont produit de la valeur (1 transfert, 0 opportunité) ? Candidates au retrait : sources jamais converties, alertes jamais déclenchées, Google Places payant si ROI nul.

**Q5 - Que montrer par défaut ?**
Aujourd'hui Signaux ouvre sur 1503 fiches `nouveau`. Hypothèse : ouvrir sur les seuls chauds (47 fiches) ou sur une file « à décider aujourd'hui » courte. Le défaut actuel décourage l'usage.

**Q6 - Rétention / purge.**
Faut-il archiver/purger automatiquement les vieilles fiches non chaudes pour que le volume reste utilisable ?

---

## 6. Pointeurs (fichiers clés pour le council)

- **Signaux :** `src/routes/crm/signaux/+page.svelte` (1109 l), `+page.server.ts`, `src/lib/components/signaux/*`, `src/lib/scoring.ts`, `src/lib/scoring/keywords.ts`, `src/lib/config.ts` (§ scoring 72-121).
- **Prospection :** `src/routes/crm/prospection/+page.svelte`, `+page.server.ts`, `src/lib/prospection-utils.ts`, `../docs/SPECS_PROSPECTION.md` (racine container FilmPro, PAS sous CRM/).
- **Flux :** `src/routes/api/cron/{signaux,alertes,lead-rescore,nettoyage-crm}/+server.ts`, `src/lib/server/intelligence/apply-signals.ts`.
- **Données :** migrations `20260402_001` (signaux_affaires), `20260403_001` (prospect_leads), `20260513_003` (signaux_mots_cles + seed 39 termes), `20260427_001` (prospect_lead_signals).
- **Métier (cadre dur) :** `~/.claude/projects/-Users-pascal-Claude-Projets-FilmPro/memory/project_filmpro_metier.md` - FilmPro = traitements vitrage, cibles régies/architectes/FM/bureaux d'études.

---

## 7. Comment démarrer la prochaine session

1. Charger ce document + `project_filmpro_metier.md`.
2. Lancer `council` sur Q1 et Q2 d'abord (les plus structurantes : robinet Zefix + fusion des deux pipelines).
3. Appliquer `simplification-cascades` sur Q2/Q3/Q4 (quel insight élimine le plus de composants).
4. Sortir une cible « V5 » par page : ce qu'on garde, ce qu'on coupe, ce qu'on fusionne, avec justification valeur. Spec écrite AVANT tout code.
5. Ne RIEN coder cette session-là tant que la cible n'est pas validée par Pascal (décision de périmètre produit).
