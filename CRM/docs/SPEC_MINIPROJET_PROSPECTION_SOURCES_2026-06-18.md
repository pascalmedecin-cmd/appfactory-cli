# Mini-projet : Prospection recentrée - sélecteur de source multi-annuaire

**Date :** 2026-06-18. **Statut :** PÉRIMÈTRE PROPOSÉ - décisions tranchées en session, blocs à valider avant exécution.
**Origine :** discussion de cadrage 2026-06-18 (suite refonte CRM). Chantier séparé de la Vague 1 « cohérence » à la demande de Pascal (production UI premium = mérite son golden).
**Effort :** xhigh. **Méthode :** software factory (spec d'abord, golden avant code UI, no-debt). **1 bloc = 1 session autonome.**
**Cadrage parent :** `~/.claude/projects/-Users-pascal-Claude-Projets-FilmPro/memory/project_refonte_crm_cadrage_2026-06-18.md`.

---

## 0. Objectif et décisions figées

**Objectif :** la page Prospection devient un **outil de recherche de contact à la demande**, clair et premium, sans acquisition de masse (V5 confirmée). L'utilisateur choisit explicitement **une source à la fois**, l'UI lui explique ce que chaque source ramène, et le coût (quota Google) est visible et borné à zéro débit.

**Décisions tranchées (Pascal, 2026-06-18) :**
1. **Prospection = 2 onglets** : **Entreprises** (Zefix + search.ch + Google) + **Terrain** (saisie manuelle). SIMAP et RegBL **retirés** de Prospection.
2. **SIMAP** reste actif uniquement comme **radar de la page Signaux** (appels d'offres). Le retirer de Prospection supprime un doublon.
3. **RegBL retiré** (valeur faible : ne ramène qu'un identifiant de bâtiment + adresse, **aucun contact ni entreprise** - inactionnable pour de la prospection de contact). Masqué par flag d'abord, suppression dure à 90j (§ 6).
4. **Google Places rétabli** avec garde-fou quota **visible** (compteur de recherches restantes ce mois). Le quota se consomme **à la recherche**, pas à l'import (vérifié dans le code).
5. **Pas de consolidation multi-source** (Pascal pas confiant sur la qualité de l'output fusionné). Une source à la fois = zéro doublon par construction.
6. **Zefix gardé** comme source de recherche par **nom** d'entreprise (seule source qui retrouve une entreprise précise nommée).

**Faits techniques vérifiés (confiance élevée) :**
- Google Places (New) Text Search, champs `nationalPhoneNumber` + `websiteUri` = SKU **Enterprise** = **1 000 recherches gratuites/mois** (Google, mars 2025, inchangé). **1 recherche = 1 événement** (pas multiplié par les 20 résultats). Cap applicatif **900/mois** → **0,00 USD**, marge 100.
- Blocage dur déjà codé : `google-places/+server.ts:78` renvoie **429 sans appel API** quand le cap est atteint.
- Quota débité **avant** le fetch et l'import (`:84` `incrementUsage`) → 1 recherche non importée consomme déjà 1 unité.

**Garant du zéro débit (ordre corrigé après vérif Google 2026-06-18) :**
1. **Garant principal = compteur applicatif** (notre code, cap 900/mois, blocage 429 déjà codé `google-places/+server.ts:78`). Déterministe, sous notre contrôle. C'est lui qui garantit le zéro débit en usage normal.
2. **Ceinture complémentaire = quota Google `SearchTextRequest per day` abaissé à 30** (Cloud Console → `console.cloud.google.com/apis/api/places.googleapis.com/quotas`). 30/jour × 31 = 930/mois max < 1000 gratuits → vrai hard cap par jour, protège même si le compteur applicatif a un trou (bug, appel hors app). **POSÉ par Pascal le 2026-06-18** (verbatim « ok pour 30, fait » ; non vérifiable côté Claude, pas d'accès au compte Google - à re-confirmer visuellement au moment du go prod P2).
3. **Filet = budget alert à 1 CHF** (Billing → Budgets) : alerte e-mail seulement, n'arrête rien (Google : les quotas/budgets ne sont pas un disjoncteur natif).

NB : les quotas Google Maps sont **par minute/par jour, jamais mensuels**, et Google avertit qu'ils ne sont « pas un plafond de dépense » (latence d'enforcement). La marge 930→1000 absorbe cette latence. Le mensuel reste borné par le compteur applicatif.

---

## 1. Capacités réelles des 3 sources (base de l'UX)

| Source | Type de recherche | « Tous les X d'un NPA » ? | Ramène un contact ? | Coût |
|---|---|---|---|---|
| **search.ch** | activité + lieu | Oui | Téléphone, adresse annuaire | Gratuit (1000/mois) |
| **Google Places** | activité + lieu | Oui | **Téléphone + site web** (le + complet) | Gratuit sous 900/mois, puis bloqué |
| **Zefix** | **nom** d'entreprise | Non (registre, pas annuaire catégoriel) | Données légales (UID, forme juridique, canton) | Gratuit |

Conséquence UX : Zefix répond à « je connais le nom », search.ch/Google répondent à « tous les opticiens de telle ville ». Trois besoins distincts → trois cartes distinctes.

---

## BLOC P1 - Prospection = Entreprises + Terrain (retrait SIMAP/RegBL)

**1 session autonome. Sans risque, sans Google, sans refonte visuelle. Base propre pour P2/P3.**

### Objectif
Retirer les onglets SIMAP et RegBL de la Prospection ; la page n'expose plus que **Entreprises** et **Terrain**. Réversible par flag.

### Périmètre (fichiers)
- `src/routes/crm/prospection/+page.svelte:231-260` (rendu des onglets) : dériver la visibilité de chaque onglet depuis `isProspectionSourceEnabled` (`lib/prospection-flags.ts`, déjà utilisé `:344`). Un onglet sans source active n'est pas rendu.
- Garde de route : `?tab=simap` / `?tab=regbl` par URL directe sur onglet masqué → rediriger vers le premier onglet actif (`+page.server.ts` ou redirection client). Pas d'écran fantôme.
- `+page.svelte:819` : empty state global revu (ne plus compter simap/regbl dans la condition).
- Aucune modification de `config.ts` (les flags `simap.enabled=false` / `regbl.enabled=false` sont déjà bons).

### Critères d'acceptation (binaires)
- [ ] La page Prospection n'affiche que **Entreprises** + **Terrain** ; SIMAP et RegBL non rendus tant que `enabled=false`.
- [ ] `?tab=simap` / `?tab=regbl` redirige vers Entreprises (test e2e), pas d'onglet vide.
- [ ] Réversibilité prouvée par test : `sources.simap.enabled=true` (fixture) fait réapparaître l'onglet sans autre modif.
- [ ] `svelte-check` 0, build vert, Vitest vert (+ tests visibilité onglet & redirection).

### Hors-scope (no-debt)
- Suppression dure du code SIMAP/RegBL → non (réversible par flag ; suppression = § 6 à 90j).
- Refonte visuelle des onglets restants → Bloc P3.

### Skills
Aucun skill design (retrait logique, pas de production visuelle). `redesign-skill` non requis ici.

---

## BLOC P2 - Rétablir Google Places + garde-fou quota visible

**1 session autonome. PRÉREQUIS : quota cap posé côté Google Cloud Console par Pascal (sinon flag reste OFF en prod).**

### Objectif
Réactiver Google Places comme source de recherche d'entreprises, avec un garde-fou quota **visible et compréhensible** (pas de jargon API), borné à zéro débit.

### Périmètre (fichiers)
- `src/lib/config.ts:138` : `google_places.enabled` → `true` (réversible).
- `src/routes/api/prospection/google-places/+server.ts` : vérifier que la garde 429 au cap (`:78`) et l'incrément (`:84`) sont intacts ; rien à recoder côté quota (déjà fait).
- **Compteur quota dans l'UI** : exposer `googlePlacesQuotaStatus(used)` (`lib/api-limits.ts`) à la page (via `+page.server.ts` load) et afficher « X recherches Google restantes ce mois » à côté de la carte Google (avant la recherche). Avertissement à 80 %, critique à 95 %, désactivation du bouton si épuisé.
- Wording : « recherches restantes ce mois », jamais « requêtes API / quota SKU » (charte « compris en 2s »).

### Critères d'acceptation (binaires)
- [ ] Google Places est interrogeable depuis la Prospection (recherche activité + canton → résultats).
- [ ] Le compteur « X/900 recherches restantes ce mois » s'affiche **avant** la recherche ; il décroît de 1 par recherche (même sans import).
- [ ] À 80 % : bandeau d'avertissement ; à 100 % : bouton désactivé + message, **0 appel API** (vérifié : 429 sans fetch).
- [ ] Aucune recherche ne consomme le crédit payant : test confirmant que le cap applicatif bloque avant 1000, + doc du quota cap Google posé (capture/checklist Pascal).
- [ ] `GOOGLE_PLACES_API_KEY` lue côté serveur uniquement, jamais exposée au client (audit sécu).
- [ ] `svelte-check` 0, build vert, Vitest vert (+ tests compteur & seuils 80/95/100).
- [ ] Audit `code-review:security-auditor` ciblé : 0 High/Critical (touche endpoint + clé API).

### Hors-scope (no-debt)
- Refonte visuelle des cartes de source → Bloc P3 (ici, câblage fonctionnel minimal du compteur).
- Pagination Google (> 20 résultats) → non (1 page = 1 recherche, suffisant et borne le quota).

### Skills
Aucun skill design (câblage fonctionnel). La présentation premium du compteur est portée par P3.

---

## BLOC P3 - Sélecteur de source UX premium (golden d'abord)

**2 temps dans 1 session : (a) golden validé par Pascal [gate humain], puis (b) portage Svelte autonome. Dépend de P1 + P2.**

### Objectif
Présenter les 3 sources en **3 cartes claires** (une active à la fois), chacune expliquant ce qu'elle ramène, dans la charte CRM et cohérente avec les autres pages. Champ de saisie adaptatif. Résultats en liste à cocher.

### Gate humain (obligatoire avant le code)
Produire un **golden HTML** du sélecteur + de la liste de résultats, l'ouvrir dans Chrome (cache-buster), le faire **valider par Pascal** avant toute ligne de Svelte. Évite le 3e rejet visuel (cf. `[[feedback_decoupe_ui_premium_moderne_riche]]`). Gate auto-déclaré = bloquant (AskUserQuestion, pas texte libre).

### Spécification UX
- **3 cartes côte à côte** : Annuaire (search.ch), Google, Registre (Zefix). Une seule active.
  - Chaque carte : titre clair, sous-titre « par activité + lieu » / « par nom », exemple de requête, « ce que ça ramène » (tél / site / données légales), mention coût (« gratuit » ou compteur Google).
- **Champ de saisie adaptatif** : Zefix = 1 champ « nom » ; search.ch/Google = 2 champs « activité » + « lieu (canton/NPA) ». Pas de champ inutile affiché.
- **Résultats en liste à cocher** : après recherche, les ≤ 20 résultats s'affichent ; l'utilisateur coche ceux qu'il importe (le quota est déjà payé, montrer tout est gratuit).
- **Cohérence charte** : tokens, primitives (`Button`/`Input`/`Card`), palette workflow FilmPro ; pas de CSS ad hoc hors charte.

### Critères d'acceptation (binaires)
- [ ] Golden HTML validé par Pascal (verbatim « go ») avant le portage.
- [ ] 3 cartes rendues, une seule active à la fois ; le champ de saisie s'adapte à la source choisie.
- [ ] Chaque carte explique en clair ce qu'elle ramène ; seule Google affiche un compteur de quota.
- [ ] Résultats en liste à cocher, import sélectif fonctionnel (e2e).
- [ ] Cohérence visuelle avec ≥ 2 autres pages CRM vérifiée (mêmes tokens/primitives ; audit `refactoring-ui`).
- [ ] `svelte-check` 0, build vert, Vitest vert, e2e vert, axe-core 0 violation.
- [ ] Pas de régression sur la recherche existante (Zefix/search.ch déjà en place).

### Hors-scope (no-debt)
- Consolidation multi-source / dédup → exclue par décision (une source à la fois).
- Recherche globale cross-entité → vague 2 refonte.

### Skills (nommés au plan, règle skills-routing)
- `redesign-skill` (refonte dans la stack Tailwind/Lucide/tokens existants).
- `soft-skill` (rendu premium : ombres, espacement, cartes « expensive feel »).
- `ui-ux-pro-max` (banque de références : patterns de cartes de sélection / segmented choice, ne pas inventer la direction).
- `anydesign` (extraire les tokens des pages CRM existantes → garantir la cohérence charte de façon vérifiable).
- `golden-standard` (wizard de création du golden) + `refactoring-ui` (audit cohérence post-portage).

---

## 6. Dates d'expiration des retraits (anti code zombie)

- **2026-09-18 (90 j)** : si SIMAP-dans-Prospection et RegBL ne sont pas réactivés et que le verdict des 3 fondateurs confirme l'abandon → tâche de **suppression dure** du code des onglets + imports SIMAP/RegBL de la Prospection. Tracé ici.

---

## 7. Ordre d'exécution et dépendances

| Bloc | Dépend de | Prérequis humain | Risque |
|---|---|---|---|
| **P1** Entreprises + Terrain | - | - | Faible |
| **P2** Google + quota | - | **Quota cap Google Cloud posé par Pascal** | Moyen (API externe + facturation) |
| **P3** Sélecteur UX | P1 + P2 | **Golden validé par Pascal** | Moyen (production UI premium) |

Ordre recommandé : **P1 → P2 → P3**. P1 et P2 sont indépendants (parallélisables si besoin), P3 les consomme tous deux.

---

## 8. Points à confirmer avec Pascal avant le code

1. **Découpe en 3 blocs P1/P2/P3** (1 session chacun) te convient, ou tu veux fusionner/scinder ? | Reco : garder 3. | Pourquoi : P3 a un gate golden humain qui doit rester isolé.
2. **Quota cap Google** : tu poses bien le cap dur côté Google Cloud Console avant que je passe P2 en prod ? | Reco : oui. | Pourquoi : seul garant du zéro débit en cas de bug.
3. **Compteur quota** : afficher « X/900 restantes » (chiffre brut) ou seulement un état (« quota OK / bientôt épuisé ») ? | Reco : chiffre brut. | Pourquoi : tu veux voir où tu en es, pas un voyant opaque.
