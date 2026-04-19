# Specifications : Module Prospection FilmPro CRM

**Version :** 1.0
**Date :** 2026-04-02
**Statut :** Valide (pre-implementation)

---

## 1. Vision

Un flux continu de leads B2B qualifies, scores et filtrables, alimentes par des sources publiques suisses gratuites. L'utilisateur ne cherche pas : les leads viennent a lui, pre-qualifies et dedupliques.

**Utilisateurs :** 3 fondateurs FilmPro (commerciaux terrain, pas tech).
**Frequence :** Usage quotidien (consultation alertes) + hebdomadaire (imports bulk).

---

## 2. Sources de donnees

### 2.1 Zefix REST API (registre du commerce)

- **Endpoint :** `https://www.zefix.admin.ch/ZefixPublicREST/api/v1`
- **Auth :** Credentials gratuits (demande par email a zefix@bj.admin.ch), DEMANDE EN COURS
- **Donnees :** raison sociale, adresse, UID, but social, capital nominal, organe de revision, publications FOSC, fusions/reprises, anciens noms
- **Pas disponible :** noms des dirigeants (extraits cantonaux uniquement), telephone, email, site web
- **Usage :** Import bulk par canton + mots-cles dans le but social, veille FOSC quotidienne (nouvelles inscriptions)

### 2.2 LINDAS SPARQL (fallback Zefix)

- **Endpoint :** `https://lindas.admin.ch/query/`
- **Auth :** Aucune (acces libre)
- **Donnees :** Sous-ensemble de Zefix REST (nom, adresse, UID, but social, sans capital, revision, FOSC)
- **Usage :** Bulk queries SPARQL quand Zefix REST est indisponible ou pour des jointures complexes avec d'autres datasets federaux

### 2.3 SIMAP (marches publics)

- **URL :** `https://www.simap.ch/`
- **Auth :** Gratuit
- **Donnees :** Appels d'offres publics construction (objet, pouvoir adjudicateur, montant estime, delais, codes CPV/BKP)
- **Integration :** MCP server open source disponible (github.com/Digilac/simap-mcp)
- **Usage :** Surveillance des appels d'offres construction par canton, leads chauds avec budgets

### 2.4 SITG Geneve (permis de construire)

- **URL :** `https://ge.ch/sitg/`
- **Auth :** Gratuit (WMS/WFS OGC)
- **Donnees :** Autorisations de construire geolocalisees, mandataires, type de projet
- **Limitation :** Canton de Geneve uniquement
- **Usage :** Detection automatique des projets construction GE, identification des architectes mandates

### 2.5 search.ch (enrichissement telephonique)

- **API :** `https://tel.search.ch/api/`
- **Auth :** Cle API gratuite (1000 requetes/mois)
- **Donnees :** Telephone, adresse (annuaire officiel suisse)
- **Usage :** Enrichissement des leads existants (ajouter le telephone a une fiche Zefix)

### 2.6 FOSC/SHAB (veille nouvelles entreprises)

- **Acces :** Via l'API Zefix REST (endpoint publications SOGC par date)
- **Donnees :** Nouvelles inscriptions au registre du commerce, modifications, radiations
- **Usage :** Veille quotidienne, nouvelles entreprises construction/batiment = leads chauds (besoin de tout au demarrage)

---

## 3. Modele de donnees

### 3.1 Table `prospect_leads`

```sql
CREATE TABLE prospect_leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source
  source            TEXT NOT NULL CHECK (source IN ('zefix', 'lindas', 'simap', 'sitg', 'search_ch', 'fosc', 'manuel')),
  source_id         TEXT,                    -- ID dans la source (UID, n° marche, n° permis)
  source_url        TEXT,                    -- Lien vers la page originale
  
  -- Identite
  raison_sociale    TEXT NOT NULL,
  nom_contact       TEXT,                    -- Si disponible (rare, surtout SIMAP/SITG)
  
  -- Coordonnees
  adresse           TEXT,
  npa               TEXT,
  localite          TEXT,
  canton            TEXT CHECK (canton IN ('GE', 'VD', 'VS', 'NE', 'FR', 'JU', 'Autre')),
  telephone         TEXT,                    -- Enrichi via search.ch
  site_web          TEXT,
  email             TEXT,
  
  -- Qualification
  secteur_detecte   TEXT,                    -- Deduit du but social ou categorie source
  mots_cles_match   TEXT[],                  -- Mots-cles qui ont matche la recherche
  score_pertinence  INTEGER DEFAULT 0,       -- Score calcule (voir section 5)
  
  -- Contexte source
  description       TEXT,                    -- But social (Zefix), objet marche (SIMAP), desc projet (SITG)
  montant           NUMERIC,                -- Montant marche (SIMAP) ou capital (Zefix)
  date_publication  TIMESTAMPTZ,            -- Date dans la source originale
  
  -- Workflow
  statut            TEXT NOT NULL DEFAULT 'nouveau' CHECK (statut IN ('nouveau', 'interesse', 'ecarte', 'transfere')),
  transfere_vers_contact_id    UUID REFERENCES contacts(id),
  transfere_vers_entreprise_id UUID REFERENCES entreprises(id),
  
  -- Meta
  date_import       TIMESTAMPTZ NOT NULL DEFAULT now(),
  importe_par       UUID REFERENCES utilisateurs(id),
  date_modification TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Dedup : un lead = une source + un source_id unique
  UNIQUE(source, source_id)
);

-- Index pour les filtres frequents
CREATE INDEX idx_leads_statut ON prospect_leads(statut);
CREATE INDEX idx_leads_canton ON prospect_leads(canton);
CREATE INDEX idx_leads_score ON prospect_leads(score_pertinence DESC);
CREATE INDEX idx_leads_source ON prospect_leads(source);
CREATE INDEX idx_leads_date ON prospect_leads(date_import DESC);
```

### 3.2 Table `recherches_sauvegardees`

```sql
CREATE TABLE recherches_sauvegardees (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom               TEXT NOT NULL,              -- "Architectes GE+VD"
  utilisateur_id    UUID REFERENCES utilisateurs(id),
  
  -- Criteres
  sources           TEXT[],                     -- ['zefix', 'simap']
  cantons           TEXT[],                     -- ['GE', 'VD']
  mots_cles         TEXT[],                     -- ['architecte', 'bureau technique']
  secteurs          TEXT[],                     -- ['architecture', 'construction']
  score_minimum     INTEGER,
  
  -- Alertes
  alerte_active     BOOLEAN DEFAULT true,
  frequence_alerte  TEXT DEFAULT 'quotidien' CHECK (frequence_alerte IN ('quotidien', 'hebdomadaire')),
  dernier_check     TIMESTAMPTZ,
  nb_nouveaux       INTEGER DEFAULT 0,          -- Nombre de nouveaux leads depuis dernier check
  
  -- Meta
  date_creation     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.3 RLS

```sql
-- Meme politique que le reste du CRM : authenticated = full access
ALTER TABLE prospect_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE recherches_sauvegardees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON prospect_leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON recherches_sauvegardees
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

---

## 4. Mapping sources → modele unifie

| Champ unifie | Zefix REST | LINDAS | SIMAP | SITG (GE) | search.ch | FOSC |
|---|---|---|---|---|---|---|
| raison_sociale | `name` | `schema:legalName` | pouvoir adjudicateur | maitre d'ouvrage | `name` | `name` |
| adresse | `address.street` | `locn:thoroughfare` | adresse avis | adresse chantier | `street` | `address` |
| npa | `address.swissZipCode` | `locn:postCode` | – |, | `zip` | – |
| localite | `address.city` | `locn:postName` | – | commune | `city` | `city` |
| canton | `canton` | `admin:municipality` → canton | canton publication | `GE` (fixe) | deduit NPA | `canton` |
| description | `purpose` | `schema:description` | objet du marche | description projet | – | but social |
| montant | `capitalNominal` | – | valeur estimee | – | : | – |
| source_id | UID (CHE-xxx) | UID | n° publication | n° autorisation | tel.search ID | n° FOSC |
| source_url | lien zefix.ch | – | lien simap.ch | lien SITG | – | lien shab.ch |
| secteur_detecte | parse `purpose` | parse `description` | code CPV | type permis | categorie | parse but social |

---

## 5. Scoring automatique

### 5.1 Criteres et ponderation

| Critere | Points | Logique |
|---------|--------|---------|
| Canton prioritaire (GE, VD, VS) | +3 | Marche principal FilmPro |
| Canton secondaire (NE, FR, JU) | +1 | Marche accessible |
| Secteur match (construction, architecture, HVAC, regie, facility) | +3 | Coeur de cible |
| Signal chaud (permis de construire ou marche public) | +2 | Projet actif avec budget |
| Nouvelle entreprise (inscription < 30 jours) | +2 | Besoin immediat de services |
| Recence moderee (inscription < 90 jours) | +1 | Entreprise recente |
| Telephone disponible | +1 | Contact direct possible |
| Montant > 100k CHF (SIMAP) | +1 | Projet significatif |

**Score maximum theorique :** 13 points

### 5.2 Classification

| Score | Label | Affichage |
|-------|-------|-----------|
| 8+ | Chaud | Badge rouge |
| 5-7 | Tiede | Badge orange |
| 2-4 | Froid | Badge gris |
| 0-1 | Non qualifie | Pas de badge |

### 5.3 Implementation

Le score est calcule a l'import et recalcule si le lead est enrichi (ex: telephone ajoute). Stocke en base pour permettre le tri sans recalcul.

```typescript
function calculerScore(lead: ProspectLead): number {
  let score = 0;
  
  // Canton
  if (['GE', 'VD', 'VS'].includes(lead.canton)) score += 3;
  else if (['NE', 'FR', 'JU'].includes(lead.canton)) score += 1;
  
  // Secteur
  const secteursCibles = ['construction', 'architecte', 'hvac', 'chauffage',
    'ventilation', 'climatisation', 'regie', 'facility', 'batiment',
    'menuiserie', 'charpente', 'electricite', 'plomberie', 'peinture'];
  const desc = (lead.description || '').toLowerCase();
  const nom = (lead.raison_sociale || '').toLowerCase();
  if (secteursCibles.some(s => desc.includes(s) || nom.includes(s))) score += 3;
  
  // Signal chaud
  if (['simap', 'sitg'].includes(lead.source)) score += 2;
  
  // Recence
  if (lead.date_publication) {
    const joursDepuis = differenceEnJours(new Date(), lead.date_publication);
    if (joursDepuis <= 30) score += 2;
    else if (joursDepuis <= 90) score += 1;
  }
  
  // Enrichissement
  if (lead.telephone) score += 1;
  
  // Montant significatif
  if (lead.montant && lead.montant > 100000) score += 1;
  
  return score;
}
```

---

## 6. Deduplication

### 6.1 A l'import

Avant insertion, check `UNIQUE(source, source_id)` :
- **Meme source + meme ID :** Le lead existe deja
  - Si `statut = ecarte` ou `transfere` → **skip silencieux** (ne pas reimporter)
  - Si `statut = nouveau` ou `interesse` → **update** des champs qui ont change (description, montant, date)
- **Source differente, meme entreprise :** Detection par `raison_sociale` + `npa` + `localite` (fuzzy)
  - Si match > 90% → marquer les deux comme potentiels doublons (pas de fusion auto)
  - L'utilisateur decide via action "Fusionner"

### 6.2 Cross-source

Un lead Zefix et un lead SIMAP peuvent etre la meme entreprise. La dedup cross-source se fait sur :
1. UID (si disponible dans les deux sources) → match exact
2. Raison sociale normalisee + NPA → match fuzzy (Levenshtein > 0.9)

Les doublons cross-source sont signales par un badge, pas fusionnes automatiquement.

---

## 7. Interface utilisateur

### 7.1 Page `/prospection`

```
┌──────────────────────────────────────────────────────────────┐
│  Prospection                          [Importer des leads ▾] │
│                                                              │
│  ┌─ Filtres ──────────────────────────────────────────────┐  │
│  │ Source: [Toutes ▾]  Canton: [Tous ▾]  Secteur: [Tous ▾]│  │
│  │ Statut: [Nouveau + Interesse]  Score: [Tous ▾]         │  │
│  │ Recherche: [________________________]                   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Alertes sauvegardees ─────────────────────────────────┐  │
│  │ "Architectes GE+VD" : 4 nouveaux   [Voir]              │  │
│  │ "HVAC Suisse romande" : 0 nouveau                      │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  234 leads  │  Tri: Score ▾                                  │
│                                                              │
│  ☐ │ Score │ Raison sociale      │ Canton │ Secteur  │ Source│
│  ──┼───────┼─────────────────────┼────────┼──────────┼──────│
│  ☐ │ 🔴 11 │ Dupont Architectes  │ GE     │ Archi    │ Zefix│
│  ☐ │ 🔴 9  │ Renovation Léman SA │ VD     │ Constr.  │ SIMAP│
│  ☐ │ 🟠 6  │ Thermo-Confort Sàrl │ VS     │ HVAC     │ Zefix│
│  ☐ │ ⚪ 3  │ Bureau XYZ          │ NE     │ Autre    │ FOSC │
│                                                              │
│  ┌─ Barre actions (visible si selection) ─────────────────┐  │
│  │ 3 selectionnes  [Interesse] [Ecarter] [Transferer ➜ CRM]│ │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 7.2 Modale "Importer des leads"

```
┌─ Importer des leads ──────────────────────────────┐
│                                                    │
│  Source : ○ Registre commerce (Zefix)               │
│           ○ Marches publics (SIMAP)                 │
│           ○ Permis de construire (SITG - GE)        │
│           ○ Veille FOSC (nouvelles entreprises)     │
│           ○ Saisie manuelle                         │
│                                                    │
│  ── Options Zefix ──                               │
│  Cantons : [GE] [VD] [VS] [NE] [FR] [JU]          │
│  Mots-cles : [construction, architecte, HVAC____]  │
│                                                    │
│  ☐ Sauvegarder comme recherche                     │
│    Nom : [_________________________]               │
│    ☐ Activer les alertes (quotidien)               │
│                                                    │
│           [Annuler]  [Lancer l'import]              │
└────────────────────────────────────────────────────┘
```

### 7.3 Slide-out detail lead

Click sur un lead → panneau lateral (pas une nouvelle page) :

```
┌─ Detail lead ──────────────────────────┐
│                                        │
│  Dupont Architectes SA        🔴 11    │
│  Source: Zefix  │  UID: CHE-123.456.789│
│                                        │
│  ── Coordonnees ──                     │
│  Adresse : Rue du Lac 12, 1201 Geneve  │
│  Tel : +41 22 123 45 67 (search.ch)    │
│  Web : : │
│                                        │
│  ── But social ──                      │
│  "Bureau d'architectes specialise      │
│   dans la renovation et construction   │
│   de batiments commerciaux"            │
│                                        │
│  ── Scoring ──                         │
│  Canton GE (+3) Secteur archi (+3)     │
│  Recent < 30j (+2) Tel dispo (+1)      │
│  Signal SIMAP (+2)                     │
│                                        │
│  [Enrichir tel]  [Voir source ↗]       │
│                                        │
│  ── Actions ──                         │
│  [Interesse]  [Ecarter]                │
│  [Transferer vers CRM ➜]              │
│                                        │
└────────────────────────────────────────┘
```

### 7.4 Transfert vers CRM

Le bouton "Transferer vers CRM" :
1. Cree une fiche `entreprises` pre-remplie (raison_sociale, adresse, canton, UID comme numero_ide, secteur)
2. Si `nom_contact` dispo → cree aussi une fiche `contacts` rattachee
3. Le lead passe en `statut = transfere` avec les FK vers les fiches creees
4. Toast de confirmation avec lien vers la fiche creee

### 7.5 Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| `↑` `↓` | Naviguer dans la liste |
| `Espace` | Toggle selection du lead courant |
| `Enter` | Ouvrir le slide-out detail |
| `E` | Ecarter la selection |
| `I` | Marquer interesse |
| `T` | Transferer la selection vers CRM |
| `Ctrl+A` | Selectionner tout (filtres appliques) |
| `Escape` | Fermer le slide-out / deselectionner tout |

---

## 8. Alertes et veille automatique

### 8.1 Fonctionnement

Les recherches sauvegardees avec `alerte_active = true` sont re-executees periodiquement :
- **Quotidien :** FOSC (nouvelles inscriptions), SITG (nouveaux permis GE)
- **Hebdomadaire :** Zefix (nouvelles entreprises par canton), SIMAP (nouveaux marches)

A chaque execution :
1. Lancer la recherche avec les criteres sauvegardes
2. Filtrer les resultats dont le `source_id` n'existe pas deja dans `prospect_leads`
3. Inserer les nouveaux leads avec `statut = nouveau`
4. Incrementer `nb_nouveaux` dans `recherches_sauvegardees`

### 8.2 Affichage

Les alertes apparaissent :
- En haut de la page Prospection (bandeau avec compteur "X nouveaux leads")
- Sur le Dashboard (card "Prospection : X nouveaux leads cette semaine")
- Badge sur l'icone Prospection dans la sidebar

### 8.3 Implementation technique

Vercel Cron Job ou Supabase Edge Function sur schedule :
- `0 7 * * 1-5` (7h, lundi-vendredi) pour les alertes quotidiennes
- `0 7 * * 1` (7h, lundi) pour les alertes hebdomadaires

---

## 9. Enrichissement

### 9.1 search.ch

Action unitaire sur un lead : bouton "Enrichir telephone".
1. Appel API search.ch avec `raison_sociale` + `localite`
2. Si match → ajouter `telephone` au lead, recalculer le score
3. Si pas de match → toast "Aucun resultat dans l'annuaire"

Quota : 1000 requetes/mois. Afficher le compteur restant dans la modale d'import.

### 9.2 Enrichissement batch

Depuis la selection multiple : "Enrichir les X leads selectionnes".
- Traitement sequentiel avec barre de progression
- Respect du quota (arret si quota atteint)
- Resume : "12/15 enrichis, 3 non trouves"

---

## 10. Vues par defaut

| Vue | Filtres appliques | Tri |
|-----|-------------------|-----|
| **Par defaut** | statut = nouveau + interesse | Score DESC |
| **Nouveaux** | statut = nouveau | Date import DESC |
| **Ecartes** | statut = ecarte | Date modification DESC |
| **Transferes** | statut = transfere | Date modification DESC |
| **Tous** | Aucun filtre | Score DESC |

---

## 11. Integration avec le CRM

### 11.1 Lien bidirectionnel

- Lead → CRM : Le transfert cree les fiches et stocke les FK (`transfere_vers_contact_id`, `transfere_vers_entreprise_id`)
- CRM → Lead : Sur la fiche entreprise/contact, un badge "Origine: Prospection" avec lien vers le lead source

### 11.2 Compteurs dashboard

Le dashboard CRM affiche :
- Leads importes cette semaine
- Leads transferes ce mois
- Taux de conversion leads → opportunites

---

## 12. Roadmap implementation

### Phase 1 (Jour 3-4) : Structure
- Table `prospect_leads` + `recherches_sauvegardees` dans Supabase
- Page `/prospection` avec liste, filtres, actions batch, slide-out
- Import manuel (saisie directe)
- Scoring automatique
- Transfert vers CRM

### Phase 2 (Jour 5-6) : Sources
- Integration Zefix REST (quand credentials recus)
- Integration LINDAS SPARQL (fallback immediat)
- Integration search.ch (enrichissement)
- Veille FOSC via Zefix

### Phase 3 (Jour 7+) : Avance
- Integration SIMAP
- Integration SITG (GE)
- Alertes automatiques (cron jobs)
- Recherches sauvegardees avec notifications
- Dedup cross-source

---

## 13. Decisions techniques

- **Pas de scraping FAO** : trop fragile, pas d'API, maintenance lourde. On utilise SITG pour GE et saisie manuelle pour les autres cantons.
- **Scoring cote serveur** : calcule a l'insert/update, stocke en base. Pas de recalcul cote client.
- **Dedup a l'import, pas en background** : l'utilisateur voit immediatement si un lead existe deja.
- **search.ch = enrichissement, pas source primaire** : on ne fait pas d'import bulk depuis search.ch (quota 1000/mois), on enrichit les leads Zefix/SIMAP un par un ou en petit batch.
- **Slide-out plutot que page detail** : la liste reste visible, l'utilisateur garde le contexte.
