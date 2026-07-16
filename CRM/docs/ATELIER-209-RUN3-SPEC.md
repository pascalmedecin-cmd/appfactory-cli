# Atelier 209 - Run 3 : spec de code (import de liste + D2/D3/D4)

> Spec écrite AVANT la 1re ligne de code. Gate design validé par Pascal le 2026-07-15 (maquette
> `.atelier-209/run3-maquettes/atelier209-run3.html`, ouverte dans Chrome). Décisions validées :
> **flux 3 étapes**, **upload + mapping de colonnes assisté**, **tout compte connecté**,
> **ignorer les doublons** MAIS avec un **mécanisme de dédup robuste, multi-axes, stress-testé**
> (exigence Pascal explicite). Source de vérité d'exécution : `docs/ATELIER-209-SUIVI.md`.

## Objectif (une phrase)

Un écran d'import de liste (Prospection) qui transforme un fichier CSV/Excel d'exposants de salon ou
de commerces en `prospect_leads` de la marque active, **sans jamais créer de doublon** ni fuir entre
marques - et qui rembourse au passage 3 dettes du code (D2 import cassé, D3 mots-clés en 5 copies,
D4 source `manuel` absente).

## Périmètre (in / out)

**In** : (1) endpoint d'upload + parse + aperçu + import `prospect_leads` marque-scopé ; (2) module de
dédup multi-axes testé ; (3) UI modale 3 étapes (déposer → associer colonnes → aperçu & import) ;
(4) D4 migration + Zod ; (5) D3 source unique des mots-clés secteur, marque-aware ; (6) sources
re-paramétrées par marque (termes, pas activation).

**Out** (hors contrat) : refonte du CRM existant, écriture directe `entreprises`/`contacts` (l'import
alimente `prospect_leads` ; le passage entreprise+contact reste la RPC `transfer_lead_to_crm`),
emailing, automatisation LinkedIn, durcissement RLS (couplé au « 4e user »).

---

## 1. D4 - Valeur de source `manuel` (prérequis, petit)

**Fait** (vérifié, cartographie) : `manuel` retiré du CHECK par `20260411000001` ; dernière migration
qui fait foi = `20260512000003` (9 valeurs : zefix, simap, sitg, search_ch, fosc, regbl, minergie,
lead_express, google_places). Absent aussi de `SOURCES_LEAD` (Zod, `schemas.ts:179-181`).

**À faire** :
- Migration `supabase/migrations/20260716000001_prospect_leads_source_manuel.sql` : `DROP CONSTRAINT IF EXISTS prospect_leads_source_check` + `ADD CONSTRAINT ... CHECK (source = ANY(ARRAY[... les 9 ...,'manuel']::text[]))`. Élargissement pur (aucune ligne existante invalidée → pas d'UPDATE de données).
- `SOURCES_LEAD` (`schemas.ts:179-181`) : ajouter `'manuel'`.
- `sourceLabel` + `sourceOptions` (`prospection-utils.ts:111-132`) : ajouter `manuel: 'Import manuel'`.
- NE PAS toucher : `entreprisesFormat.ts:177` (gère déjà 'manuel'), `database.types.ts` (source = string brut), `SOURCES_LEAD_PREVIEW` (flux aperçu API, pas l'import de liste).
- Test anti-drift : `schemas.test.ts` asserte que `LeadCreateSchema` (ou le schéma d'import) accepte `source:'manuel'`.
- **Application prod** : voie manuelle `pg` (comme Run 2 `apply-marque-migration.mjs`), la prod n'auto-applique pas.

**Critère d'acceptation** : `supabase db reset` rejoue la migration ; un insert `source='manuel'` est accepté (DB + Zod) ; les 9 valeurs existantes restent valides.

---

## 2. Dédup multi-axes (le cœur - exigence Pascal : robuste + stress tests)

### Problème

La dédup existante (`candidate.ts fetchDedupSets`) ne mord que sur `source_id` d'API. Un import de
liste n'a pas de `source_id`, et l'index `UNIQUE(marque, source, source_id)` ne contraint rien quand
`source_id` est NULL (NULLs distincts en Postgres). De plus `normalizeCompanyName` **garde les
accents** (`contactsFormat.ts:35`, `[^a-zà-ü0-9]`) alors que l'index entreprises DB **les retire**
(`lower(immutable_unaccent(...))`) → « Régie » ≠ « Regie » côté JS. Robustesse insuffisante.

### Mécanisme (nouveau module `src/lib/server/prospection/import-dedup.ts`)

Un candidat est un **doublon** s'il correspond à un lead **existant de la même marque** OU à un autre
candidat **du même import**, sur **au moins un** des axes suivants (chacun sur sa clé normalisée ;
un axe sans valeur exploitable est ignoré pour cette ligne) :

| Axe | Clé normalisée | Exigence min. |
|---|---|---|
| **1. Nom + localité** (primaire, porté par `source_id`) | `normalizeLeadName(raison_sociale)` + `\|` + `normalizeLocalityKey(localite ?? npa)` | ≥ 1 caractère alphanumérique dans le nom |
| **2. Téléphone** | `normalizePhoneCH` : chiffres seuls, préfixes `+41`/`0041`/`0` retirés → 9 chiffres nationaux | ≥ 7 chiffres |
| **3. E-mail** | `normalizeNFDTrim(email)` (minuscule, sans accents, trim) | contient `@` et un `.` après |
| **4. Domaine web** | `normalizeDomain(site_web)` : sans protocole/`www.`/chemin/port, minuscule | contient un `.` |

- `normalizeLeadName` = **NFD (accents retirés)** + minuscule + retrait suffixes légaux (SA, SàRL,
  Sàrl, Sarl, GmbH, AG, S.A., S.à.r.l., Ltd, LLC, Inc, & Cie/Cie) + retrait non-alphanumérique +
  collapse. Plus robuste que `normalizeCompanyName` (qui garde les accents).
- **`source_id` synthétique** de la ligne `manuel` = hash déterministe de l'axe 1
  (`manuel_` + sha256(nameKey + '|' + localityKey).slice(0,24)). Ainsi l'index DB
  `UNIQUE(marque,'manuel',source_id)` **enforce l'axe 1 au niveau base** (ré-import idempotent, même
  en cas de course), et les axes 2-4 sont enforced en couche applicative (sets chargés + intra-payload).
- **Priorité de report** (pour l'UI « pourquoi doublon ») : nom+localité > téléphone > e-mail > domaine.
- **Marque-scopé** : tous les sets existants chargés avec `.eq('marque', marque)`. Un import LED ne
  peut JAMAIS matcher un lead FilmPro (invariant dur, testé).
- **Dédup intra-payload** : première occurrence gagne ; les suivantes sur n'importe quel axe = doublon.

### Fonctions pures (toutes testées)

```
normalizeLeadName(raison_sociale): string        // '' si pas d'alphanum → non dédupable par nom
normalizeLocalityKey(localite|npa): string
normalizePhoneCH(telephone): string | null       // null si < 7 chiffres
normalizeEmail(email): string | null
normalizeDomain(site_web): string | null
syntheticSourceId(nameKey, localityKey): string   // hash déterministe
buildLeadDedupKeys(row): { nameLoc, phone, email, domain }  // clés d'une ligne (null si axe absent)
dedupCandidates(rows, existingSets): { toImport, duplicates, invalid }  // orchestration pure
```

`existingSets` = `{ nameLoc: Set, phone: Set, email: Set, domain: Set }` chargés depuis
`prospect_leads` de la marque (nouvelle fonction `fetchLeadDedupSets(supabase, marque)` : SELECT
raison_sociale, localite, npa, telephone, email, site_web WHERE marque=... ; construit les 4 sets).

### Robustesse (stress tests obligatoires - Vitest, fonctions pures, 0 DB)

Matrice `import-dedup.test.ts` (chaque cellule = un test binaire) :

1. **Accents** : « Régie Naef » ≡ « Regie Naef ».
2. **Casse** : « MIROITERIE » ≡ « miroiterie ».
3. **Suffixes légaux** : « Naef & Cie SA » ≡ « Naef & Cie » ≡ « Naef & Cie Sàrl ».
4. **Espaces/ponctuation** : « Naef  &  Cie » ≡ « Naef, Cie » ≡ « Naef&Cie ».
5. **Téléphone formats** : « +41 22 839 39 39 » ≡ « 022 839 39 39 » ≡ « 0228393939 » ≡ « 0041228393939 ».
6. **E-mail** : « Contact@Naef.CH » ≡ « contact@naef.ch ».
7. **Domaine** : « https://www.naef.ch/contact » ≡ « naef.ch » ≡ « http://naef.ch/ ».
8. **Homonyme cross-localité NON fusionné** : « Boulangerie du Coin » (Genève) ≠ (Lausanne), SAUF si tel/email/domaine partagé.
9. **Match cross-axe** : noms différents mais **même téléphone** → doublon.
10. **Champs manquants** : ligne sans tel/email/domaine → dédup sur nom+localité seul (pas de crash).
11. **Cross-marque isolé** : le même exposant importé en LED ne matche jamais un lead FilmPro homonyme (sets marque-scopés).
12. **Idempotence** : ré-importer le MÊME fichier → 2e passe = 0 nouveau (via `source_id` synthétique + sets).
13. **Anti sur-fusion** : deux entreprises réellement distinctes (noms proches mais différents, localités différentes, aucun identifiant partagé) → 2 leads, pas 1.
14. **Fuzzing** : pour un jeu de N noms de base, toute perturbation aléatoire (casse/accents/espaces/suffixe) collapse vers 1 ; N noms distincts → N clés distinctes (oracle : nombre de clés uniques).
15. **Ligne invalide** : raison_sociale vide / non-alphanumérique → classée `invalid` (à corriger), jamais importée, jamais crash.

**Critère d'acceptation** : les 15 familles passent ; `dedupCandidates` est déterministe (même
entrée → même sortie) ; aucune exception sur entrée dégénérée (null, vide, unicode, très long).

---

## 3. D2 - Endpoint + parser + UI

### Endpoint `POST /api/prospection/import-liste` (nouveau)

- Auth requise (tout compte connecté). Lit `locals.marque`.
- 2 modes (comme les endpoints source) : **aperçu** (`preview: true`) parse + mappe + dédup → renvoie {toImport, duplicates, invalid, stats} SANS insert ; **import** insère les `toImport` re-validés + re-dédup TOCTOU (`fetchLeadDedupSets` au moment réel).
- Parse : réutiliser `parseCsv`/`csvToObjects`/`validateRows` (`csv-import.ts`, sain, 17 tests). Excel (.xlsx) : parser côté client → CSV, ou lib serveur (à trancher au code : reco parse CSV serveur, .xlsx converti en CSV côté client à l'upload pour ne pas ajouter de dépendance serveur lourde).
- Mapping : le client envoie la correspondance colonne→champ (issue de l'étape 2) ; le serveur applique + valide.
- Insert : `candidateToInsertRow({..., marque: locals.marque, source:'manuel', source_id: synthétique})` (source unique `candidate.ts`), statut='vide', score serveur (`scoreCandidate`). JAMAIS `scripts/import-csv.ts` (mapping périmé + pas de marque).
- Schéma Zod d'import dédié : `raison_sociale` requis (≥1 alphanum) ; **canton optionnel** (déduit du NPA si absent ; validé GE/VD/VS/NE/FR/JU seulement si fourni) ; npa tolérant ; feedback **par-ligne** (pas all-or-nothing).
- Rate-limit + borne : 5 000 lignes max, taille fichier bornée.

### Auto-mapping (étape 2)

Reconnaissance des en-têtes (insensible casse/accents/espaces) vers les champs CRM. Table de synonymes
(ex : NOM|RAISON SOCIALE|ENTREPRISE → raison_sociale ; ADRESSE|ADRESSE COMPLETE|RUE → adresse ;
NPA|CODE POSTAL|NP → npa ; VILLE|LOCALITE|COMMUNE → localite ; TELEPHONE|TEL|PHONE → telephone ;
CATEGORIE|SECTEUR|TYPE → secteur_detecte ; SITE WEB|WEBSITE|URL → site_web ; EMAIL|EMAILS|E-MAIL → email).
Colonnes non reconnues → « Ne pas importer » par défaut (ajustable). Canton : jamais mappé, déduit du NPA.

### UI (maquette validée)

Modale `ModalForm` accent (header var(--color-primary) teinté marque, `cloud_download`/upload icon,
max-w-3xl), stepper 3 étapes, montée depuis `crm/prospection/+page.svelte` via un bouton
« Importer une liste » (nouveau, à côté du CTA de recherche). Étapes : dropzone + modèle CSV ;
mapping assisté ; aperçu par-ligne (nouveaux / doublons ignorés / à corriger) + CTA
« Importer N prospects dans {marque} ». Reproduit fidèlement le chrome (non-régression, directive
« miroir exact »). Source pill « Import manuel » (neutre) sur les lignes.

**Critère d'acceptation** : import d'un CSV réel (format G7) en base jetable → N leads `manuel`/marque
active, 0 fuite ; ré-import → 0 nouveau ; ligne sans raison sociale → classée à corriger, non importée.

---

## 4. D3 - Source unique des mots-clés secteur (marque-aware)

**Fait** (cartographie) : `SECTEURS_KEYWORDS` en 3 copies runtime divergentes (`zefix/+server.ts:43-52`,
`searchch/helpers.ts:363-372`, `google-places/helpers.ts:269-279`) + 1 morte (`config.ts:163-172`) +
1 mirror client (`ImportModal.svelte GP_ACTIVITY_OPTIONS`). Le mot cœur « vitrerie » manque dans 2 des
3 copies. Zefix matche sans strip d'accents (bug latent), les 2 autres via `normalizeNFD`.

**À faire** :
- Nouveau `src/lib/prospection/secteurs.ts` ($lib, client+serveur) :
  `SECTEUR_KEYWORDS_BY_MARQUE: Record<Marque, Record<string,string[]>>` +
  `ACTIVITY_TYPES_BY_MARQUE: Record<Marque, readonly {key,label}[]>` +
  `detectSecteur(text, marque)` (normalise le haystack via `normalizeNFD`, mots-clés en ASCII sans accent).
- `filmpro` = super-ensemble nettoyé des 3 copies (reprendre google-places le + riche, **ré-ajouter** le terme ingénieur perdu, **garder `vitrerie`/`vitre` partout**), en ASCII sans accent.
- `led` = dérivé du brief LED (`clients/led-studio/.../LED_Studio_Brief.md`) + V2 sourcing : enseignes lumineuses/néons, cadres lumineux/murs LED, stands/montage de stands, signalétique, événementiel/salons, commerce/retail. **À faire valider par Pascal** (contenu métier) - marqué `[à valider]` dans le code, valeurs de départ raisonnables et sourcées.
- Câbler les 3 détecteurs sur `detectSecteur(..., locals.marque)` (marque déjà en portée : zefix:165, searchch:163, google-places:201). Re-grep exhaustif des appelants (fan-out).
- Supprimer `config.ts:163-172` (mort) + le mirror `ImportModal GP_ACTIVITY_OPTIONS` (importe la source).
- **Scoring** : `config.scoring.secteursCibles.keywords` reste FilmPro pour le Run 3 (les leads LED n'auront pas le bonus secteur tant que la liste LED n'est pas validée) - **flag explicite** dans la spec, pas un oubli (décision : ne pas rendre le scoring marque-aware sans les mots-clés LED validés par Pascal ; sinon simple à brancher après validation).

**Critères d'acceptation** :
- **Non-régression FilmPro (golden)** : pour un jeu d'entrées de référence, les 3 fonctions renvoient le MÊME secteur ET le lead FilmPro obtient le MÊME score qu'avant la fusion (test golden avant/après).
- Une « vitrerie » est classée `menuiserie` via les 3 sources (aujourd'hui : seulement search.ch).
- `led` : les nouveaux secteurs détectés sur un jeu LED (enseigne, stand, signalétique...).

---

## 5. Sources par marque (reco simple validée)

Ne PAS transformer `config.prospection.sources.*.enabled` en maps par marque. Garder l'activation de
source **globale** ; ne brancher par marque QUE (a) les mots-clés secteur (D3) et (b) les termes de
recherche pré-remplis proposés à l'UI (FilmPro : vitrerie/façade/thermique ; LED : agence
événementielle/stand/signalétique). Répond au brief « mêmes mécaniques, termes différents ».

---

## 6. QA (base jetable Colima + seed)

- `supabase db reset` (rejoue les 50 migrations + D4 + seed 2 marques).
- Étendre le seed OU un CSV factice d'exposants LED (`tests/fixtures/`) pour exercer l'import.
- Helper QA : poser `ff_crm_listes_v2`+`ff_decoupe` puis `mint-session.mjs`, basculer cookie `marque=led`.
- Étendre `marque-leak.test.ts` (RUN_INTEGRATION=1) : import LED → leads `marque='led'`, 0 fuite ; ré-import → 0 nouveau.
- Revue adversariale (bugs + sécu + contrats + non-régression) avec vérification indépendante ; audit sécu daté.

## Ordre d'implémentation

1. **D4** (migration + Zod/utils + test) - prérequis.
2. **Module dédup multi-axes** (`import-dedup.ts`) en **TDD + 15 familles de stress tests** - le cœur.
3. **Endpoint** `import-liste` (aperçu + import, `fetchLeadDedupSets`, réutilise `candidate.ts`).
4. **UI** modale 3 étapes (maquette validée) + bouton d'entrée Prospection.
5. **D3** source unique secteurs marque-aware (+ golden non-régression).
6. **QA** Colima + seed + `marque-leak` étendu + revue adversariale.

## Critères de succès (binaires, tous verts pour livrer) — ÉTAT 2026-07-16

- [x] D4 : insert `source='manuel'` accepté (DB reset + Zod) ; 9 valeurs existantes préservées. (migration `20260716000001` rejouée par `db reset` ; test anti-drift Zod)
- [x] Dédup : 15 familles de stress tests vertes ; déterministe ; 0 exception sur entrée dégénérée. (31 tests)
- [x] Import : CSV réel → N leads `manuel`/marque active, 0 fuite ; ré-import → 0 nouveau ; ligne invalide non importée. (test intégration « CSV réel format G7 bout en bout » en base réelle : parse→mapping→endpoint→DB)
- [x] Étanchéité : import LED ne matche/ne crée jamais côté FilmPro (test intégration base réelle). (15/15 verts)
- [x] D3 : golden FilmPro inchangé (google-places byte-identique via oracle ; zefix/searchch gagnent vitrerie/toiture = criterion intended, jamais de perte prouvée par oracle) ; « vitrerie » classée partout ; **3 copies divergentes + 1 morte supprimées** (config.ts + mirror ImportModal + mirror SourceSearchFields).
- [x] Non-régression : `svelte-check` **0/0**, build OK, Vitest **2801 verts** (baseline 2562 + 239), `db reset` OK.
- [x] Zéro dette : diff CRM cohérent (29 fichiers, 0 orphelin/artefact parasite) ; non-régression FilmPro prouvée (analyse + oracle + revue adversariale).
- [ ] **Reste (gate Pascal)** : application prod D4 + déploiement + sign-off visuel du flux live.
