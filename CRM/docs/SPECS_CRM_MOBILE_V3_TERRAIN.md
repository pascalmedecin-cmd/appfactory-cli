# SPEC — CRM FilmPro mobile V3 « outil terrain » (résumé exécutif)

> **Source de vérité = le pack product-architect** `CRM/.product-architect/` (PRD, data-model.sql, rls-policies.sql, api-contracts.ts, acceptance-criteria.json, adr/0001-0007, DESIGN.md, slo-sli.md, feature-flag-plan.md, user-flows.md, golden-standard.html). Ce fichier-ci est le résumé lisible ; en cas de divergence, le pack fait foi.

**Statut :** résumé du cadrage. Décisions verrouillées (plus de décision produit ouverte).
**Date :** 2026-05-31
**Remplace :** refonte mobile V2 (S190bis → S192bis), abandonnée le 2026-05-28 (« trop de fonctionnalités, peu de lisibilité »).
**Méthode :** brainstorm council (4 voix) → arbitrage → spec écrite avant code (software factory TDD).

---

## 1. Objectif (1 phrase)

Donner au commercial FilmPro, sur son iPhone en visite/déplacement, un outil **terrain minimum** qui suit une boucle unique : **j'arrive → je sais qui c'est → je laisse une trace exploitable**, le tout extrêmement lisible et en 2 onglets sans menu.

## 2. Pourquoi (contexte)

- La V2 a porté 4 pages desktop + polish + scoring → illisible sur iPhone réel. Verdict Pascal : le mobile n'est **pas** un outil de prospection/découverte/recherche, seulement un outil terrain à fonctions minimum.
- Le council (Architecte / Sceptique / Pragmatique / Critique) converge : mobile = **consultation lecture seule du référentiel + capture d'une trace terrain** (visite + photo). Tout le reste reste desktop, assumé.

## 3. Réponses Pascal (cadrage, 2026-05-31)

| Question | Réponse |
|---|---|
| Usage terrain réel | **Consulter + capture brute** (1 photo + note courte sur place, détail au bureau) |
| Visites planifiées dans le CRM ? | **Parfois** → garder accueil + recherche par nom |
| Contact croisé sur place | **Oui, en mode brouillon** (suggestion à valider au desktop, pas d'écriture directe) |

## 4. Périmètre

### IN (V3)
1. **Écran d'accueil « À faire »** : ma liste de relances/opportunités dues (lecture). Voir § 8 (décision ouverte sur le contenu exact).
2. **Recherche client** : 1 seul champ par nom d'entreprise → fiche. Porte d'entrée pour visite non agendée.
3. **Fiche client (lecture seule)** : raison sociale, adresse, canton, opportunité(s) en cours, historique court (dernières visites + dernières activités) + 3 actions natives (Appeler / Itinéraire / Email).
4. **Compte-rendu de visite** (la seule écriture « plein ») : résultat prédéfini + note courte + photos + check-in GPS (réutilise l'infra existante).
5. **Brouillon contact** : capture d'un contact rencontré sur place en mode « à valider » (jamais écrit direct dans `contacts`).

### OUT (assumé, renvoi desktop via court message)
Prospection (SIMAP / Zefix), signaux, scoring, veille, reporting, dashboard coûts, log, kanban pipeline, édition de champs structurants (statut pipeline, score, qualification), filtres avancés, création/édition directe d'entreprises ou contacts.

### Frontière data (invariant dur)
Le mobile **lit** le référentiel (`entreprises`, `contacts`, `opportunites`) et **écrit uniquement** la trace terrain (`prospect_visits` étendue, `prospect_photos`) + une suggestion de contact en file de validation. **Aucun** champ structurant n'est mutable depuis le mobile.

## 5. Navigation (lisibilité = profondeur 1)

- **2 onglets bas**, zéro menu burger, zéro tiroir, zéro sous-niveau.
  - Onglet 1 : **À faire** (accueil).
  - Onglet 2 : **Rechercher**.
- Tout le reste est en drill-down depuis une fiche (fiche → compte-rendu), bouton retour suffit.
- Cibles tactiles ≥ 44×44 px, texte ≥ 16 px, contraste AA (tokens `--deep` existants), une intention par écran.

## 6. Écrans (détail)

### 6.1 À faire (accueil)
- Liste courte (cap 10-15) de ce qui demande une action aujourd'hui. Source réelle : `opportunites.date_relance_prevue <= today` ET étape non close (déjà calculé côté desktop dans `+page.server.ts`).
- Chaque ligne : nom entreprise + 1 ligne de contexte (titre opportunité, date relance). Tap → fiche client.
- Empty state honnête (« Rien à traiter aujourd'hui ») + raccourci vers Rechercher.

### 6.2 Rechercher
- 1 champ unique (nom entreprise), recherche serveur sur `entreprises.raison_sociale` (index trgm existant `20260510_005`). Pas de filtres.
- Résultats : liste nom + canton. Tap → fiche.

### 6.3 Fiche client (lecture seule)
- En-tête : raison sociale, canton, adresse siège.
- 3 boutons natifs pleins : **Appeler** (`tel:` sur 1er contact avec téléphone), **Itinéraire** (`maps:` sur adresse), **Email** (`mailto:` sur 1er contact avec email). Bouton grisé si la donnée manque.
- Bloc « Opportunité(s) en cours » (lecture).
- Bloc « Historique » : dernières visites (`prospect_visits`) + dernières activités (`activites`), 5 max.
- **Bouton dominant bas : « Compte-rendu de visite »** → 6.4.

### 6.4 Compte-rendu de visite
- Champ **Résultat** : boutons radio prédéfinis (valeurs à définir avec Pascal, ex. « Visité — intéressé », « Visité — à relancer », « Absent », « Pas pertinent »). **Pas d'option « Autre »** (règle UX projet).
- Champ **Note** courte (texte ; dictée iOS native suffit, pas de transcription custom).
- **Photos** : capture appareil photo → upload (`prospect_photos`, max 10). État d'envoi visible par photo (« envoi… / envoyé / échec → réessayer »).
- **Check-in GPS** : capturé silencieusement à l'ouverture du compte-rendu (`prospect_visits`), best-effort (si géoloc refusée, on enregistre la visite sans coordonnées).
- Bouton **Enregistrer** : append-only, remonte au desktop. Pas de modification a posteriori depuis le mobile (édition au desktop).

### 6.5 Brouillon contact
- Accessible depuis la fiche client (« + Contact rencontré »).
- Champs minimaux : prénom/nom, rôle/fonction, téléphone, email (tous optionnels sauf au moins un identifiant).
- Crée une **suggestion** (statut `en_attente`), jamais une ligne `contacts`. Rattachée à l'entreprise + à la visite courante.
- **Mitigation file morte (risque Critique)** : badge compteur visible sur le desktop (« N contacts terrain à valider ») + validation/fusion 1 clic. Sans ce badge, la feature est refusée.

## 7. Décisions techniques tranchées (recos, modifiables sur objection)

- **Livraison = PWA** sur le webapp SvelteKit existant (route group dédié, ex. `(mobile)` ou `/terrain`, gated par flag + viewport), icône écran d'accueil iPhone. Pas d'app native.
- **Feature flag neuf `ff_crm_mobile_v3`** (sémantique propre) ; rollback complet de `ff_crm_mobile_v2`. Mécanisme JWT claims existant (`feature-flags.ts`).
- **Pas d'offline** en V3 (couverture CH bonne). Si une photo échoue : état « échec → réessayer » explicite, pas de file offline silencieuse. Offline réévalué seulement sur cas de zone blanche documenté.
- **Compte-rendu = extension de `prospect_visits`** : ajouter colonnes `resultat text` (CHECK valeurs prédéfinies) + `note text`. Raison : entité terrain native, déjà XOR lead/entreprise, photos déjà reliées au même owner. Évite le mismatch `activites` (lié contact/opp, pas entreprise). Migration additive, rétro-compatible.
- **Brouillon contact = nouvelle table légère `contact_suggestions`** (id, entreprise_id, visit_id, payload contact, statut, created_by, created_at) + endpoint validation desktop. Isole le risque qualité de données hors de `contacts`.
- **Réutilisation V2** : `prospect_photos` + `prospect_visits` + leurs API = **gardés**. UI V2 (`PipelineMobileAccordion`, bandeaux desktop-only, drawer masqué, Tabs scroll-snap…) = **rollback** par défaut ; `MobileEntityCard` candidat à repurpose pour la fiche (à auditer fichier par fichier).

## 8. Écran d'accueil — DÉCIDÉ (Pascal, 2026-05-31)

**Option A retenue** : accueil « À faire » = relances/opportunités dues, dérivées de `opportunites.date_relance_prevue <= today` (étape non close). Zéro nouveau modèle, données déjà calculées côté desktop. **Pas** d'agenda de visites planifiées en V3 (Option B écartée, rouvrable plus tard si besoin terrain documenté).

## 9. Critères d'acceptation (binaires, testables)

1. La V3 n'expose que les écrans IN du § 4 ; aucun lien vers prospection/signaux/veille/reporting/dashboard/log/kanban n'est atteignable depuis le shell mobile.
2. Navigation = exactement 2 onglets, aucun menu burger/tiroir, profondeur max 2 (onglet → fiche → compte-rendu).
3. Recherche par nom renvoie une entreprise existante en ≤ 1 champ, sans filtre.
4. Depuis une fiche : Appeler/Itinéraire/Email ouvrent l'action native correspondante (ou bouton grisé si donnée absente) — testé sur iPhone réel.
5. Un compte-rendu (résultat + note + ≥1 photo) s'enregistre et est **relisible au desktop** sur la même entreprise (visite + photo + note présentes).
6. Aucun champ structurant (statut pipeline, score, qualification, raison sociale) n'est modifiable depuis le mobile (vérifié : pas d'endpoint d'écriture exposé côté mobile sur ces champs).
7. Un brouillon contact crée une suggestion `en_attente` (jamais une ligne `contacts`) ET le desktop affiche un badge compteur + permet validation/fusion 1 clic.
8. État d'envoi photo visible (envoi/envoyé/échec) ; un échec réseau est rattrapable par « réessayer » sans perte de la note saisie.
9. Lisibilité : cibles ≥ 44 px, texte ≥ 16 px, contraste AA (axe-core 0 violation color-contrast sur les écrans mobile).
10. Flag `ff_crm_mobile_v3` OFF → comportement desktop inchangé (zéro régression) ; ON → shell mobile servi sur viewport mobile.

## 10. Hors-scope nommé (no-debt)

Offline/sync, transcription vocale custom, édition de visite depuis mobile, planification de RDV (sauf si Option B § 8 retenue), notifications push, mode hors-ligne photos, multi-utilisateur différencié (RLS reste mono-tenant plat, cf. CLAUDE.md).

## 11. Métrique de succès (post-livraison)

Smoke iPhone réel Pascal : la boucle complète (ouvrir fiche → 3 actions natives → compte-rendu avec photo → relecture desktop) tient en ≤ 5 taps et est jugée lisible « du premier coup d'œil ». Verdict binaire oui/non par Pascal (le même test qui a recalé la V2).

## 12. Effort

`xhigh` | Score 4/4 (structurelle, multi-étapes contraintes croisées, itération ratée coûteuse, non-mesurable).

## 13. Sécurité (Definition of Done)

Touche auth/RLS/données (nouvelles colonnes + table + endpoints) → audit `code-review:security-auditor` ciblé obligatoire, 0 High/Critical pour livrer, artefact daté. RLS reste mono-tenant plat assumé (cf. CLAUDE.md L-03/L-04). Rappel : tests Vitest mockent supabase-js → ne prouvent rien sur la RLS réelle ; vérif manuelle prod/staging requise sur les nouveaux endpoints d'écriture.
