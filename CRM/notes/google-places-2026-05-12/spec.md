# Spec — API Google Places comme source de prospection (CRM FilmPro)

**Statut :** figée, validée Pascal le 2026-05-12 (S181). Prête à implémenter en session dédiée `/effort xhigh`.
**Tâche cockpit :** `f0cc23e7` (subproject `crm`).
**Pattern de référence :** intégration `search.ch` (S171) — `src/routes/api/prospection/searchch/`.

---

## 1. Objectif

Ajouter **Google Places (API New)** comme 7e source de découverte de leads dans le CRM, à côté de Zefix / SIMAP / search.ch / RegBL / saisie terrain / veille. Cas d'usage : repérer des entreprises locales (régies immobilières, entreprises générales, corps d'état : électriciens, sanitaire, toiture, peinture) dans un canton cible, récupérer **nom + adresse + téléphone + site web**, créer des `prospect_leads` avec dédup `(source, source_id)` + dédup cross-source vs entreprises Zefix connues + scoring auto.

**Métrique de succès post-livraison :** un import Google Places réel depuis l'UI crée ≥ 1 lead correctement géolocalisé (canton renseigné), avec téléphone quand Google le fournit, sans doublon, et le compteur de quota mensuel s'incrémente.

---

## 2. Arbitrages tranchés (validés Pascal)

| # | Décision | Détail |
|---|---|---|
| A1 | **API : Places API (New)**, endpoint `POST https://places.googleapis.com/v1/places:searchText` | header `X-Goog-Api-Key` + `X-Goog-FieldMask` **figés côté serveur** (jamais reçus du client) |
| A2 | **Périmètre géographique : 6 cantons cibles uniquement** (GE, VD, VS, NE, FR, JU) | via `locationRestriction.rectangle` (bounding boxes statiques § 5.4) + canton concaténé à la query texte |
| A3 | **Champ principal UI = menu déroulant « type d'activité »** mappé aux `includedType` Google + champ texte secondaire optionnel | cf. § 6.2 |
| A4 | **Quota : table générique `api_quota_log`** partagée Google Places + search.ch (résout le [WATCH] S171) | refus HTTP 429 si cap mensuel atteint |
| A5 | **Import manuel uniquement en V1** — Google Places **interdit** dans les alertes/recherches sauvegardées automatiques | garde-fou budget ; à rouvrir plus tard avec plafond $ |
| A6 | **Dédup cross-source** : avant insert, lookup trigram vs `entreprises` (`raison_sociale` + NPA) ; si match → lead conservé mais marqué « déjà connue (Zefix) » dans `description` | pattern best-in-class, à généraliser plus tard |
| A7 | **Volumétrie cappée à 20 résultats** par recherche (les autres sources montent à 50/100) | maîtrise du coût ; expliqué dans le footer UI |
| A8 | **Field mask « lead complet »** : id, displayName, formattedAddress, addressComponents, types, location, businessStatus, **nationalPhoneNumber, websiteUri**, googleMapsUri | téléphone+site = tier de prix supérieur, assumé |
| A9 | **Scoring** : `google_places` ajouté à `config.scoring.entrepriseIdentifiee.sources` (+1 pt, entreprise active vérifiée). Pas de bonus « source chaude/intervention ». `maxPoints` inchangé (12). | |
| A10 | **Clé API** : `GOOGLE_PLACES_API_KEY` (déjà dans `.env.local`, à ajouter aussi dans Vercel prod au déploiement) | accès via `$env/dynamic/private` |

---

## 3. Hors-scope (V1) — nommé explicitement

- Place Details en 2 temps (récupérer + tard d'autres champs sur les leads sélectionnés) : non, on prend tout en un appel via le field mask.
- Nearby Search (recherche par rayon GPS autour d'un point/chantier) : non, V1 = Text Search par type + canton uniquement.
- Photos / horaires / avis Google : non.
- Inclusion dans les crons d'alerte (`/api/cron/alertes`) ou les recherches sauvegardées rejouables (`RecherchesPanel`) : non (A5).
- Suisse entière : non (A2).
- Tableau de bord visuel du budget $ consommé : non en V1 ; on stocke les compteurs dans `api_quota_log`, l'affichage UI se limite au « il reste N recherches ce mois » dans le panneau d'import (§ 6.2). Un vrai dashboard quota = tâche ultérieure.
- Refonte du dédup cross-source des sources existantes (Zefix↔search.ch etc.) : non, on l'applique seulement à Google Places (A6) et on le note comme pattern à généraliser.

---

## 4. Architecture technique

### 4.1 Nouveaux fichiers

```
src/routes/api/prospection/google-places/
  +server.ts            # POST handler : auth, Zod, quota check, fetch Places, dédup, batch insert, incrément quota, lien signal Veille optionnel
  helpers.ts            # validation input, builder de requête, parse réponse, addressComponents→canton, source_id, detectSecteur depuis types
  helpers.test.ts       # tests unitaires helpers
  server.test.ts        # tests endpoint (auth gate, dédup, refus quota, batch)
src/lib/server/quota.ts # (nouveau) lecture/incrément api_quota_log — service client ; helpers getMonthlyUsage(source) / incrementUsage(source, n)
supabase/migrations/
  20260512_xxx_api_quota_log.sql
  20260512_xxx_prospect_leads_source_google_places.sql
notes/google-places-2026-05-12/spec.md   # ce fichier
```

### 4.2 Fichiers modifiés

- `src/lib/config.ts` § `prospection.sources` → ajouter `google_places: { label: 'Google Places (entreprises locales)', enabled: true, cantons: ['GE','VD','VS','NE','FR','JU'] }`.
- `src/lib/config.ts` § `scoring.entrepriseIdentifiee.sources` → `['zefix','google_places']`.
- `src/lib/api-limits.ts` → ajouter bloc `google_places: { monthlyRequestCap: 900, freeMonthlyAllowance: 1000, costPerRequestUsdBeyondFree: 0.035, warningThreshold: 0.8, criticalThreshold: 0.95, maxResultsPerQuery: 20, batchDelay: 0 }` + helper `estimateGooglePlacesCost(requestCount)`. **Tarif confirmé (recherche web 2026-05-12)** : Text Search (New) facturé au SKU le plus cher du field mask ; `nationalPhoneNumber` + `websiteUri` → SKU **Enterprise** ≈ 35 USD / 1000 requêtes, **MAIS** quota mensuel gratuit ≈ 1000 événements/mois sur le SKU Enterprise (depuis le changement Google de mars 2025, qui a remplacé le crédit universel de 200 USD/mois). Donc cap applicatif à 900 = sous le seuil gratuit → coût réel **0 USD/mois** à ce volume ; le `costPerRequestUsdBeyondFree` ne sert qu'à l'affichage d'alerte si on dépasse un jour. Sources : developers.google.com/maps/billing-and-pricing/{pricing,march-2025}, woosmap.com/blog/google-maps-api-pricing-breakdown.
- `src/lib/prospection-utils.ts` → `TAB_SOURCE_MAP.entreprises = ['zefix','search_ch','google_places']` ; `sourceLabel('google_places')` ; ajouter à `sourceOptions()`.
- `src/lib/scoring.ts` → `google_places` reconnu comme entreprise identifiée (lit déjà depuis config, vérifier que la liste élargie est bien prise).
- `src/lib/components/prospection/ImportModal.svelte` → 5e entrée `SourceMeta` + panneau de saisie Google Places (§ 6.2) + grille du sélecteur de source passe de `repeat(4, 1fr)` à `repeat(auto-fit, minmax(...))` pour absorber 3 ou 5 cartes proprement.
- `src/routes/(app)/prospection/+page.svelte` (+ `+page.server.ts`) → exposer la source dans l'onglet « entreprises » ; `RecherchesPanel` : empêcher la sauvegarde d'une recherche/alerte sur `source = 'google_places'` (A5).
- `src/hooks.server.ts` → ajouter `/api/prospection/google-places` à la liste rate-limitée (`hooks.server.ts:38-50`).
- `.env.example` → `GOOGLE_PLACES_API_KEY=your-google-places-api-key` (fait).
- `src/lib/prospection-utils.test.ts` → cas `TAB_SOURCE_MAP` + `sourceLabel`.
- (si présent) le schéma Zod des form actions / le fichier `schemas.ts` → ajouter `GooglePlacesImportSchema`.

### 4.3 Migration `api_quota_log`

```sql
create table public.api_quota_log (
  source     text not null check (source in ('search_ch','google_places')),
  year_month text not null check (year_month ~ '^\d{4}-\d{2}$'),
  calls      integer not null default 0 check (calls >= 0),
  updated_at timestamptz not null default now(),
  primary key (source, year_month)
);
alter table public.api_quota_log enable row level security;
create policy "api_quota_log read" on public.api_quota_log
  for select to authenticated using (true);
-- pas de policy write : écriture uniquement via service role (incrément serveur)
```
Incrément atomique : `insert ... on conflict (source, year_month) do update set calls = api_quota_log.calls + excluded.calls, updated_at = now()`.

### 4.4 Migration `prospect_leads.source`

```sql
alter table public.prospect_leads drop constraint prospect_leads_source_check;
alter table public.prospect_leads add constraint prospect_leads_source_check
  check (source in ('zefix','simap','sitg','search_ch','fosc','regbl','minergie','lead_express','google_places'));
```
(reprendre la liste exacte de la dernière migration `20260510_002` + ajouter `google_places`).

---

## 5. Détail API Google Places

### 5.1 Requête

```
POST https://places.googleapis.com/v1/places:searchText
Headers:
  Content-Type: application/json
  X-Goog-Api-Key: <GOOGLE_PLACES_API_KEY>
  X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.addressComponents,places.types,places.location,places.businessStatus,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri
Body:
  {
    "textQuery": "<libellé type d'activité FR> <texte complémentaire?> <nom du canton>",
    "languageCode": "fr",
    "regionCode": "CH",
    "pageSize": 20,
    "includedType": "<type Google si dispo, sinon omis>",
    "locationRestriction": { "rectangle": { "low": {"latitude": ..,"longitude": ..}, "high": {"latitude": ..,"longitude": ..} } }
  }
```
Timeout réseau : 10 s. Cap taille réponse : 2 Mo. Tout `X-Goog-Api-Key` retiré des logs/erreurs (helper `sanitize`, comme search.ch).

### 5.2 Mapping `includedType` (Places API New, Table A)

| Libellé UI (FR) | `includedType` Google | Fallback |
|---|---|---|
| Régies immobilières | `real_estate_agency` | — |
| Entreprises générales / construction | `general_contractor` | — |
| Électriciens | `electrician` | — |
| Sanitaire / chauffage | `plumber` | — |
| Toiture / étanchéité | `roofing_contractor` | — |
| Peinture / plâtrerie | `painter` | — |
| Architectes / bureaux d'études | *(pas de type natif)* | `includedType` omis, mot-clé « architecte » forcé dans `textQuery` |

À vérifier à l'implémentation que ces `includedType` sont bien dans la Table A « usable for Text Search » de la doc Google ; sinon basculer en mot-clé texte.

### 5.3 Mapping réponse → `prospect_lead`

| Colonne `prospect_leads` | Source |
|---|---|
| `source` | `'google_places'` |
| `source_id` | `place.id` |
| `source_url` | `place.googleMapsUri` (fallback `https://www.google.com/maps/place/?q=place_id:<id>`) |
| `raison_sociale` | `place.displayName.text` |
| `adresse` | `route` + `street_number` depuis `addressComponents` (fallback `formattedAddress` tronqué) |
| `npa` | `postal_code` depuis `addressComponents` (4 chiffres, sinon null) |
| `localite` | `locality` (fallback `postal_town`) |
| `canton` | `administrative_area_level_1` (shortText, ex. « GE ») → validé contre l'enum cantons ; si hors 6 cibles ou illisible → lead conservé, `canton` null, mention dans `description` |
| `telephone` | `place.nationalPhoneNumber` (sinon null) |
| `site_web` | `place.websiteUri` (filtré `^https?://`, sinon null) |
| `email` | toujours null (Google ne le fournit pas) |
| `secteur_detecte` | `detectSecteur()` réutilisé, alimenté par `place.types[]` + `displayName.text` |
| `mots_cles_match` | mots du secteur trouvés |
| `description` | `formattedAddress` + types lisibles ; `+ " — déjà connue (Zefix)"` si dédup cross-source A6 ; `+ " — canton non déterminé"` si canton null |
| `score_pertinence` | `calculerScore()` (canton + secteur + entrepriseIdentifiee +1 + téléphone +1 si présent) |
| `montant`, `date_publication` | null |
| `statut` | `'nouveau'` |
| `date_import` | now |
| `source_intelligence_id` / `source_intelligence_term` | renseignés si l'import vient d'un signal Veille (param `from_intelligence` / `from_term`, comme search.ch) |

`businessStatus !== 'OPERATIONAL'` → lead ignoré (fermé définitivement / temporairement).

### 5.4 Bounding boxes cantonales (WGS84, à affiner au besoin)

Valeurs de départ (low = SW, high = NE) :
- GE : low {46.12, 5.95} / high {46.37, 6.32}
- VD : low {46.18, 6.05} / high {47.00, 7.25}
- VS : low {45.86, 6.77} / high {46.65, 8.48}
- NE : low {46.84, 6.43} / high {47.16, 7.06}
- FR : low {46.43, 6.74} / high {47.02, 7.38}
- JU : low {47.18, 6.85} / high {47.50, 7.55}

(Ces boîtes débordent légèrement sur les cantons voisins — acceptable, on filtre ensuite sur `administrative_area_level_1`. Si trop de bruit, on resserrera.)

---

## 6. UI / UX

### 6.1 Emplacement

Onglet « Entreprises » de la page Prospection → la fenêtre `ImportModal` montre alors **3 cartes-source** : Zefix, search.ch, Google Places. La grille du sélecteur passe en `auto-fit` (gère 1, 3 ou 5 cartes sans casser le layout). Conforme GOLDEN v9 : pas de gradient, pas de dashed, tokens couleur, échelle spacing § 4, icône Lucide.

### 6.2 Panneau de saisie « Google Places »

Champs (ordre vertical, primitives `Input` / `Select` existantes) :

1. **Type d'activité** — `<select>` obligatoire, options = libellés FR du § 5.2 (7 options) + option « Autre (mot-clé libre) » qui révèle le champ 2 comme principal.
2. **Mot-clé complémentaire** — `Input` texte, optionnel (obligatoire si type = « Autre »), min 3 chars, max 80, denylist générique réutilisée de search.ch (`sa`, `sarl`, `gmbh`, …).
3. **Canton** — `Select`, options = 6 cantons cibles, défaut GE.
4. **Volumétrie** — radio, valeur unique **20** affichée (pas de choix ; présent pour cohérence visuelle + libellé explicatif).

Métadonnées `SourceMeta` :
- `code`: « GP » ; `title`: « Google Places » ; `subtitle`: « Entreprises locales »
- hero : kicker « Cartographie d'entreprises » / promesse « Nom, adresse, téléphone direct et site web depuis Google Maps » / helper « Idéal pour repérer régies, entreprises générales et corps d'état dans un canton »
- action : icône `search`, label « Rechercher sur Google Places », pendingLabel « Recherche en cours… »
- footer : icône `wallet` / texte « Max 20 résultats par recherche. Il reste **N** recherches ce mois (gratuit jusqu'à 900). » (N = `monthlyRequestCap − usage` lu via `api_quota_log`, passé en prop depuis le `+page.server.ts` ou un petit endpoint GET `/api/prospection/google-places/quota`)
- `cssVar` / `bgCssVar` / `borderCssVar` : nouvelle couleur source dédiée à ajouter à la palette des sources (ton sobre, pas le rouge/jaune Google criard — rester dans le registre FilmPro).

### 6.3 Comportement

- POST `/api/prospection/google-places` body `{ activityType, keyword?, canton, from_intelligence?, from_term? }` (volumétrie figée serveur à 20).
- Si quota mensuel atteint → 429 + message « Quota Google Places épuisé pour ce mois (N/N). Réessayez le mois prochain. » ; le bouton reste désactivé tant que N = 0 (état lu au chargement).
- Succès → message « X leads importés, Y doublons ignorés (dont Z déjà connues via Zefix). » + `invalidateAll()`.
- Erreur réseau / clé invalide / réponse Google en erreur → message générique « La recherche Google Places a échoué, réessayez. » (détail technique en logs serveur, jamais à l'écran, clé masquée).

---

## 7. Sécurité (Definition of Done)

1. Clé API en **header** (jamais query string) + retirée de toute trace logs/erreurs.
2. `/api/prospection/google-places` ajouté au rate limiting (`hooks.server.ts`).
3. **Zod** sur le body : `activityType` ∈ enum fermée (7 libellés + « autre »), `canton` ∈ enum 6 cantons, `keyword` borné + denylist, `from_intelligence` UUID optionnel, `from_term` borné optionnel. `pageSize` / `regionCode` / `includedType` / field mask **jamais reçus du client**.
4. Auth gate identique aux autres endpoints prospection (session admin @filmpro.ch).
5. `api_quota_log` : pas de policy write (RLS), écriture service role uniquement.
6. Incrément quota **atomique** (`on conflict do update calls = calls + 1`).
7. `site_web` rendu côté UI filtré `^https?://` (defense in depth).
8. Audit `code-review:security-auditor` ciblé sur les fichiers modifiés → **0 High/Critical** avant « done ». Artefact daté `~/.claude/projects/-Users-pascal--claude/memory/audit_secu_<date>_google-places.md`.
9. Audit `code-review:test-coverage-reviewer` → gaps « Important » comblés in-session.

---

## 8. Tests (Vitest)

- `helpers.test.ts` : validation input (type valide/invalide, keyword trop court, keyword générique rejeté, canton hors liste rejeté) ; builder de requête (textQuery composé, includedType présent/omis, rectangle du bon canton) ; parse réponse (entrée complète, entrée sans téléphone, entrée sans site, `businessStatus` non-OPERATIONAL ignorée) ; `addressComponents → canton` (les 6 cantons + cas illisible → null) ; `source_id = place.id` ; `detectSecteur` depuis `types` ; sanitize clé dans logs.
- `server.test.ts` : auth gate (401 sans session) ; dédup intra-source (source_id existant ignoré) ; dédup écartés/transférés ignorés ; refus 429 si quota atteint ; incrément quota appelé après succès ; batch insert correct ; lien signal Veille appelé si `from_intelligence`.
- `prospection-utils.test.ts` : `TAB_SOURCE_MAP.entreprises` contient `google_places` ; `sourceLabel('google_places')` retourne le libellé config.
- `schemas.test.ts` (si fichier existant) : `GooglePlacesImportSchema` accepte un body valide, rejette type inconnu / canton inconnu / keyword vide quand type=autre.
- Suite complète verte (`npm test`), `svelte-check` 0 erreur (baseline inchangée), `npm run build` OK.

---

## 9. Critères d'acceptation (binaires)

1. [ ] `config.prospection.sources.google_places` existe et `sourceLabel('google_places')` renvoie un libellé non vide.
2. [ ] Migration `prospect_leads_source` appliquée en prod : `source = 'google_places'` accepté par le CHECK (vérifié via `information_schema` ou insert test).
3. [ ] Migration `api_quota_log` appliquée en prod ; lecture autorisée aux `authenticated`, écriture refusée sauf service role.
4. [ ] `POST /api/prospection/google-places` avec un body Zod-valide renvoie 200 et crée ≥ 1 `prospect_leads` (test contre vraie clé ou mock fidèle en CI).
5. [ ] Un lead créé via Google Places a `canton` renseigné quand l'adresse Google le permet ; sinon `canton` null + mention dans `description` (pas de crash).
6. [ ] Dédup : un 2e import du même `place.id` ne crée pas de doublon ; un `place.id` correspondant à une entreprise Zefix connue crée le lead mais le marque « déjà connue (Zefix) ».
7. [ ] Le quota mensuel s'incrémente après chaque appel réussi ; à `cap` atteint, l'endpoint renvoie 429 et le bouton UI est désactivé.
8. [ ] La fenêtre d'import affiche un 5e/3e onglet « Google Places » conforme GOLDEN v9 (pas de gradient/dashed, tokens, Lucide), avec le compteur « il reste N recherches ce mois » exact.
9. [ ] Impossible de sauvegarder une recherche/alerte automatique sur `source = 'google_places'` (A5).
10. [ ] `code-review:security-auditor` = 0 High/Critical sur les fichiers modifiés ; `code-review:test-coverage-reviewer` sans gap « Important » résiduel ; suite Vitest verte ; `svelte-check` 0 erreur ; build OK.

---

## 10. Effort & dépendances

- Effort : `xhigh` (score 3/4 : structurelle — nouvelle table + migrations + endpoint + config + scoring ; multi-étapes ; itération coûteuse — migration prod + appels payants).
- Skills : `frontend-design`, `refactoring-ui`, `ux-guide`, `golden-standard` (panneau ImportModal). GOLDEN_STANDARD.md = contrainte dure.
- Subagents DoD : `code-review:security-auditor` + `code-review:test-coverage-reviewer`.
- Prérequis : ✓ clé `GOOGLE_PLACES_API_KEY` dans `.env.local` (collée S181). Reste : l'ajouter dans les variables Vercel prod au moment du déploiement.
