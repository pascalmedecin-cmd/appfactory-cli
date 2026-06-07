# Spec V5 - Recentrage Signaux & Prospection sur l'affaire métier

**Date :** 2026-06-07. **Statut :** PÉRIMÈTRE VALIDÉ par Pascal 2026-06-07 - figé, prêt pour exécution.
**Origine :** challenge critique council + simplification-cascades (4 voix indépendantes) sur le deep dive `AUDIT_SIGNAUX_PROSPECTION_2026-06-07.md`.
**Effort :** xhigh. **Méthode :** software factory (spec d'abord, itération autonome jusqu'au vert, no-debt).

**Objectif transversal (Pascal) : mieux cadrer la prospection, focus QUALITÉ pas QUANTITÉ.** Le score doit être sélectif (peu de signaux, mais vraiment pertinents), la file par défaut courte, et aucun mécanisme d'acquisition de masse. Toute décision en cas de doute tranche vers « moins mais mieux ».

**Validation des 3 points ouverts (§8) :** (1) archivage soft des ~1227 Zefix existantes = OUI ; (2) couper l'import RegBL dans Prospection = OUI ; (3) liste de mots-clés vitrage calée en session d'exécution (avant/après mesurable) = OK.

---

## 0. Le principe directeur (validé Pascal 2026-06-07)

> **Le CRM n'est pas un outil marketing.** L'acquisition de FilmPro se fait ailleurs (mailing produit dans le projet Marketing via scripts + API Google Places, campagnes Instagram, bouche-à-oreille). Le CRM sert à **détecter et suivre les affaires métier réelles**, pas à constituer des listes de prospection de masse.

Conséquences directes (tranchées) :
- **Signaux** redevient un **radar d'affaires métier** centré sur SIMAP (un appel d'offres construction = une affaire vitrage potentielle, concrète et datée).
- **Prospection** redevient un **outil de qualification/recherche de contact à la demande** : quand un fondateur identifie une cible précise (une régie, un architecte), il retrouve ses coordonnées et la transfère en affaire. Ce n'est plus un moteur d'import de masse.
- Tout l'appareil d'**acquisition de masse** (robinet d'entreprises, imports batch multi-sources, alertes, recherches sauvegardées) sort du CRM. Il relève du marketing, qui vit déjà en autonomie dans le projet Marketing.

**Faits qui ont motivé ce recentrage (DB prod + scan Marketing 2026-06-07) :**
- Signaux : 1517 fiches, 99 % jamais triées, 0 conversion, 81 % = créations Zefix brutes hors-scope.
- Prospection : 185 leads, 1 transféré, 0 opportunité.
- Le mailing réel (543 commerces G7, 40 restaurants) est produit 100 % côté Marketing. Du CRM, ces scripts ne lisent **que la clé `GOOGLE_PLACES_API_KEY`** ; ils ne touchent ni les pages ni les tables du CRM. Contournement assumé (cibles commerce ≠ cibles métier CRM).

---

## 1. SIGNAUX V5 - radar d'affaires SIMAP

### Garder
- L'ingestion **SIMAP** (cron `importSimap`, `api/cron/signaux/+server.ts:240`) : appels d'offres construction Romandie, scorés, statut `nouveau`.
- Le détail de fiche, l'édition, l'écarter, la conversion en opportunité (le pont vers le pipeline métier).
- Le mécanisme de triage déjà présent (`config.ts` scoring.triage : `scoreMin 5`, `queueCap 25`, `visibleLimit 12`).

### Couper (réversible, par flag - PAS de suppression de code)
- **L'ingestion Zefix créations d'entreprises** : débrancher l'appel `importZefix` dans le `GET` du cron (`api/cron/signaux/+server.ts:380-384` ; `importZefix` appelé l.381, `importSimap` l.384 à garder) derrière un flag `signauxZefixEnabled = false`. Le code de `importZefix` reste en place (réactivable). Justification : 81 % du volume, une création d'entreprise n'a pas de lien causal avec un besoin de traiter du vitrage (cadre métier : pertinence faible + mauvais timing).
- **Les 1227 fiches Zefix existantes en base** : archivage **soft** (passage à un statut `archive` ou flag `archived = true`, jamais `DELETE`). Restaurables. Elles disparaissent de la file par défaut mais restent consultables via un filtre « archivées ».

### Recalibrer l'échelle de notation (Q3)
Le scoring actuel (`config.ts:72-121`, max 10) mélange deux logiques. Sans Zefix, deux critères perdent leur pouvoir discriminant :
- `entrepriseIdentifiee` (+1, sources `zefix`/`google_places`) : ne s'applique plus à un flux 100 % SIMAP → à retirer de la notation Signaux.
- `sourcesChaudes simap` (+2) : devient constant si tout est SIMAP → ne discrimine plus rien.

**Cible V5 du score Signaux = « pertinence métier de l'affaire »**, porté par :
- Mots-clés métier **vitrage** sur l'objet du marché (façade vitrée, fenêtres, rénovation thermique, garde-corps verre, écoles/bureaux/hôpitaux/résidentiel collectif...) - poids fort.
- Malus **génie civil pur** (routes, ponts, conduites, voirie) - hors-scope métier dur.
- Canton (prioritaire/secondaire), montant (≥ seuil), type de procédure.

Recaler les labels chaud/tiède/froid sur cette nouvelle échelle. La liste de mots-clés vit déjà en DB (`signaux_mots_cles`) : la recalibration = ajuster cette liste + les poids structurels de `config.ts`. **La liste de mots-clés métier sera validée avec Pascal** (décision métier, pas technique).

### Défaut d'affichage (Q5)
- Ouvrir la page sur la **file de triage courte** (les chaudes / « à décider », `queueCap`/`visibleLimit` déjà prévus), PAS sur les 1500 fiches `nouveau`. Le mur actuel décourage l'usage.

### Hors-scope Signaux V5 (no-debt, nommé)
- Simplification du workflow de tri à 5 statuts → **reportée** (le mécanisme de triage existe ; on mesure l'usage après recentrage avant d'y toucher).
- Ajout de nouvelles sources de signaux (permis de construire, etc.) → hors-scope (le type existe dans `config.signaux.types` mais aucune ingestion ; ne pas l'ouvrir ici).

---

## 2. PROSPECTION V5 - qualification/contact à la demande

### Garder
- **La recherche nominale d'une entreprise identifiée** (sources gratuites `zefix` + `search_ch`) pour récupérer ses coordonnées de contact et qualifier un prospect précis.
- **Le transfert atomique vers le CRM** (RPC entreprise + contact + opportunité) - c'est le pont qui crée de la valeur métier.
- **Lead express terrain** (saisie mobile) et le **pont Veille** (`source_intelligence_id`).
- Le slide-out détail, l'écarter/intéressé avec undo.

### Couper (réversible, par flag - PAS de suppression de code)
- **Import de masse Google Places** dans la page : désactiver l'entrée UI ; l'endpoint `api/prospection/google-places/+server.ts` répond « source désactivée » derrière un flag `prospectionGooglePlacesEnabled = false`.
  - **NE PAS toucher** à la variable d'env `GOOGLE_PLACES_API_KEY` ni la retirer du `.env.local` : les scripts Marketing la lisent. Couper l'usage CRM ≠ supprimer la clé.
- **Import de masse SIMAP** dans Prospection : redondant avec le radar Signaux → désactiver l'entrée d'import.
- **Import de masse RegBL** (registre des bâtiments / chantiers) : machinerie d'acquisition → désactiver.
- **Alertes** (cron `api/cron/alertes`) : désactiver (jamais converti, machinerie marketing).
- **Recherches sauvegardées** : masquer (machinerie de prospection de masse).
- **Enrichissement batch** : masquer le batch (le lookup unitaire d'une fiche reste possible).

### Hors-scope Prospection V5 (no-debt, nommé)
- Suppression dure de la table `prospect_leads` ou de la page → NON (option C du council écartée). On désactive des fonctions, on ne casse pas la structure.
- Fusion physique des tables `signaux_affaires` + `prospect_leads` (Q2 du deep dive) → **reportée**. Deux fonctions distinctes assumées : Signaux = radar passif SIMAP, Prospection = lookup actif. La fusion n'est rouverte que si l'usage prouve une vraie redondance.
- Refonte visuelle des pages → hors-scope (recentrage fonctionnel, pas re-design).

---

## 3. Critères d'acceptation (binaires - passe / passe pas)

**Signaux**
- [ ] Le cron quotidien n'insère plus aucune fiche `source_officielle = 'zefix'` (flag OFF), et continue d'insérer les fiches SIMAP.
- [ ] Les fiches Zefix existantes (~1227) sont archivées soft (aucune supprimée en dur ; restaurables ; absentes de la file par défaut ; consultables via filtre).
- [ ] Le scoring ne crédite plus `entrepriseIdentifiee` ni le `+2 simap` constant ; il discrimine sur mots-clés vitrage + canton + montant + malus génie civil. Labels chaud/tiède/froid recalés.
- [ ] La page ouvre par défaut sur la file courte (chaudes / à décider), pas sur l'ensemble `nouveau`.
- [ ] Le flag `signauxZefixEnabled` réactive l'ingestion Zefix sans redéploiement de code (réversibilité prouvée par test).

**Prospection**
- [ ] Les imports de masse (Google Places, SIMAP, RegBL), les alertes, les recherches sauvegardées sont inaccessibles depuis l'UI (flags OFF).
- [ ] L'endpoint Google Places répond « désactivé » quand le flag est OFF, sans appeler l'API Google (0 coût, 0 quota consommé).
- [ ] `GOOGLE_PLACES_API_KEY` est toujours présente dans le `.env.local` du CRM (non supprimée).
- [ ] La recherche nominale (Zefix/search.ch) d'une entreprise et le transfert atomique vers le CRM fonctionnent (e2e ou test d'intégration).
- [ ] Lead express terrain et pont Veille intacts.

**Sécurité / non-régression**
- [ ] `svelte-check` 0 erreur, build prod vert.
- [ ] Suite Vitest verte (aucun test cassé ; nouveaux tests sur le flag Zefix + l'endpoint Google Places désactivé).
- [ ] Audit `code-review:security-auditor` ciblé sur les fichiers touchés : 0 High/Critical (touche cron + endpoint + scoring).
- [ ] Aucune migration destructive : l'archivage Zefix est un `UPDATE` de statut, jamais un `DELETE`.

---

## 4. Métrique de succès post-livraison

- Volume Signaux divisé par ~5 à 10 (plus de robinet Zefix ; ~50 créations/jour en moins).
- La file Signaux par défaut tient sur un écran (≤ `visibleLimit`), exploitable en une session de tri.
- Prospection ne consomme plus de quota Google Places côté CRM (coût API CRM en baisse, vérifiable dans `/crm/dashboard/couts`).
- Flux mailing Marketing **non impacté** (clé Google intacte).
- Qualitatif : à confirmer à l'usage - Pascal utilise réellement Signaux comme radar SIMAP.

---

## 5. Garde-fous (issus du council)

- **Réversibilité d'abord** : tout ce qui est « coupé » l'est par flag, pas par suppression de code ou de données. On peut tout rallumer.
- **Pas de purge dure** : cycle de vente B2B long (6-18 mois) ; archivage soft uniquement, restaurable.
- **Le scoring n'est pas un juge silencieux** : tant qu'aucune conversion n'a validé l'échelle, garder une porte (filtre « archivées », filtre « tous statuts ») pour ne pas masquer définitivement ce que le score sous-note.

---

## 6. Pointeurs fichiers (pour l'exécution)

- Cron : `src/routes/api/cron/signaux/+server.ts` (`importZefix` l.120-237 à débrancher ; `importSimap` l.240 à garder ; `GET` l.380-384 le point de coupe).
- Scoring : `src/lib/config.ts:72-121` (critères + labels + triage) ; `src/lib/scoring.ts` + `src/lib/scoring/keywords.ts` ; mots-clés DB `signaux_mots_cles`.
- Endpoint Google Places : `src/routes/api/prospection/google-places/+server.ts` (clé l.45 à NE PAS toucher ; insertion `prospect_leads` l.257).
- Pages : `src/routes/crm/signaux/+page.svelte` (+ `+page.server.ts`) ; `src/routes/crm/prospection/+page.svelte` (+ `+page.server.ts`) ; `src/lib/prospection-utils.ts`.
- Sources config : `src/lib/config.ts` `prospection.sources` (l.124-153) - basculer `enabled: false` les sources de masse.
- Alertes : `src/routes/api/cron/alertes/+server.ts`.

---

## 7. Dépendance externe à connaître (hors scope cette session)

Les scripts Marketing (`Marketing/_studio/scripts/produce_*.py`) lisent la clé Google via un **chemin codé en dur `~/Claude/Projets/AppFactory/CRM/.env.local` qui n'existe plus** (le CRM a migré sous `FilmPro/CRM/`). Le prochain run mailing planterait sur « fichier introuvable ». Ce n'est PAS dans le périmètre de cette spec CRM, mais à corriger côté Marketing avant la prochaine campagne. À logger dans le backlog Marketing.

---

## 8. Points à confirmer avec Pascal avant le code

1. **Archivage des 1227 Zefix existantes** : soft-archive (masquées mais restaurables) - OK ? (reco : oui)
2. **RegBL** : confirmer qu'on désactive aussi l'import RegBL dans Prospection (registre des bâtiments = acquisition de masse) - OK ? (reco : oui)
3. **Liste de mots-clés métier vitrage** pour recalibrer le score SIMAP : à caler ensemble (décision métier) - le faire dans la session d'exécution ou maintenant ?
