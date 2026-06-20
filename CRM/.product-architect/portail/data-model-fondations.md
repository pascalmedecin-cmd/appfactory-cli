# Fondations partagees - Portail FilmPro multi-outils

**Le coeur du chantier.** Ce document fige le contrat qui permet aux outils de "se parler" sans se marcher dessus. Esquisse conceptuelle Phase 1 ; le SQL precis (migrations, RLS, FK) est produit en Phase 2.

> ⚠️ **PIVOT 2026-06-05 - chantier 2 = « Decoupe Films », pas « Devis ».** Le 2e outil du portail
> est devenu un **optimiseur de decoupes de film** (reduction des chutes), plus un generateur de devis.
> En consequence : la **section 3 « Devis »** (tables `catalogue_produits`/`devis`/`devis_lignes`) et la
> **section 4 « passerelles »** (A creer devis depuis fiche, B devis accepte -> opportunite) sont
> **CADUQUES** pour le chantier 2. Le perimetre reel de Decoupe Films (ce qu'on optimise, ses tables,
> son eventuel lien au referentiel/CRM) reste **a cadrer via `/product`** - rien n'est decide.
> Ce qui RESTE valable : sections 1, 2, 5, 6 (referentiel partage, regle d'isolation, routing, no-debt)
> = acquis du chantier 1 livre. La section 3 ne valait que comme *preuve* que le referentiel suffisait ;
> cette preuve ne presuppose plus le contenu du chantier 2.

---

## 1. Principe directeur : referentiel partage + tables scopees par outil

```
                    +-----------------------------+
                    |   REFERENTIEL PARTAGE        |   <- noyau commun, unique
                    |   entreprises | contacts     |       (1 client = 1 ligne, vu par tous)
                    +--------------+--------------+
                                   |
            +----------------------+----------------------+
            |                      |                      |
     +------v------+        +------v------+        +------v------+
     |   CRM       |        |   DEVIS     |        |  TERRAIN    |
     | (outil 1)   |        | (outil 2)   |        | (V3, futur) |
     +-------------+        +-------------+        +-------------+
     opportunites           devis                  prospect_visits
     signaux_affaires       devis_lignes           prospect_photos
     intelligence_*         catalogue_produits      contact_suggestions
     prospect_leads
```

**Regle d'or** : chaque outil possede ses propres tables metier, mais TOUTES pointent vers le meme referentiel via `entreprise_id` / `contact_id`. Aucun outil ne duplique entreprises/contacts. Aucun outil n'ecrit dans les tables metier d'un autre, SAUF via une "action croisee" explicite et tracee (cf. section 4).

---

## 2. Referentiel partage (existe deja, a formaliser comme contrat)

| Table | Statut | Role portail |
|---|---|---|
| `entreprises` | Existe (index trgm, canton) | Source unique de verite "client". Cle pivot de tous les outils. |
| `contacts` | Existe (FK `entreprise_id`) | Personnes rattachees a une entreprise. Partage par CRM et Devis. |
| `utilisateurs` | Existe | Auth + tracabilite (`auteur_id` sur actions sensibles). |

**Contrat de partage (a ecrire en ADR Phase 2)** :
- Toute creation/modification d'entreprise ou contact se fait via une **couche de service partagee** (`src/lib/server/referentiel/`), pas par des appels Supabase epars par outil. Garantit normalisation (dedup unaccent, casse, canton) et un seul endroit a auditer.
- Les endpoints `/api/entreprises/*` et `/api/contacts/*` restent **partages** (hors prefixe outil).

---

## 3. Tables scopees par outil

### CRM (outil 1, existant - a ranger, pas a refaire)
`opportunites`, `signaux_affaires`, `prospect_lead_signals`, `prospect_leads`, `intelligence_reports`, `activites`.
-> Restent telles quelles. Aucune migration destructrice. Juste un rangement logique (les endpoints CRM-specifiques pourront migrer sous `/api/crm/*` en Phase 2/3, decision non bloquante).

### Devis (outil 2, futur - fondations dimensionnees ici, build chantier 2)
Esquisse (NON cree ce chantier, documente pour valider que le referentiel suffit) :
- `catalogue_produits` : traitements (films, vernis), `prix_m2`, unite, categorie. Referentiel produits FilmPro.
- `devis` : `entreprise_id` (FK partage), `contact_id` (FK partage), `statut` (brouillon/envoye/accepte/refuse), `total_ht`, `date_validite`, `auteur_id`.
- `devis_lignes` : `devis_id`, `produit_id` (FK catalogue), `surface_m2`, `prix_unitaire`, `montant`.
-> **Validation fondation** : ces 3 tables se branchent sur `entreprises`/`contacts` sans rien modifier au referentiel existant. Le partage tient. C'est la preuve que le chantier 1 pose des fondations correctes.

### Terrain V3 (outil 3, en cours Phase 3 - hors portail pour l'instant)
`prospect_visits`, `prospect_photos`, `contact_suggestions` (deja en prod). Rejoindra le portail comme 3e card apres livraison.

---

## 4. Mecanisme "les outils se parlent" (actions croisees - decision Q3)

Deux passerelles concretes a livrer quand le Devis existera (chantier 2). Documentees ici car elles **contraignent les fondations** posees maintenant :

### Passerelle A : "Creer un devis depuis une fiche entreprise" (CRM -> Devis)
- Depuis une fiche `entreprises` du CRM, un bouton "Creer un devis" ouvre l'outil Devis pre-rempli avec `entreprise_id` + contacts disponibles.
- Fondation requise : le referentiel doit etre partage (OK) + une convention de navigation inter-outils (`/devis/nouveau?entreprise_id=...`). A poser en Phase 2.

### Passerelle B : "Devis accepte -> avance l'opportunite" (Devis -> CRM)
- Quand un `devis` passe au statut `accepte`, l'affaire correspondante avance dans le pipeline CRM (`opportunites.etape`).
- Fondation requise : un lien optionnel `opportunite_id` sur `devis`, OU une regle de service qui retrouve/cree l'opportunite. Decision Phase 2 (chantier 2). **Point a anticiper maintenant** : ne pas fermer cette porte (garder la possibilite d'un FK croise).

**Anti-pattern a eviter (grave dans la regle d'or)** : un outil qui ecrit en direct dans la table d'un autre. Toute action croisee passe par une fonction de service nommee, tracee (`auteur_id`, timestamp), testable - jamais un `UPDATE` sauvage cross-outil.

---

## 5. Architecture de routes cible (CORRIGEE post-revue, ancree sur le code reel)

DECISION ACTEE : home portail = `/`, CRM sous `/crm`.

POINT TECHNIQUE (corrige une erreur des specs initiales) : pour obtenir le segment
`/crm`, il faut un **dossier reel** `crm/`, PAS un route group `(crm)` (les parentheses
sont invisibles dans l'URL). Le groupe actuel s'appelle `(app)` (pas `(crm)`), et
`(mobile)` n'existe pas encore.

```
src/routes/
+-- +layout.svelte              [garde] racine (auth, CSP) - partage par tout
+-- (portail)/                  [NOUVEAU] group invisible -> sert "/"
|   +-- +layout.svelte          [NOUVEAU] header portail (logo FilmPro, deconnexion, SANS sidebar)
|   +-- +page.svelte            [NOUVEAU] home cards (CRM actif + Devis bientot)
+-- crm/                        [REORG] dossier REEL (ex groupe (app)) -> sert "/crm/*"
|   +-- +layout.svelte          [MOVE] ex (app)/+layout.svelte (sidebar CRM)
|   +-- +layout.server.ts       [MOVE] ex (app)/+layout.server.ts (unreadIntelligence)
|   +-- +page.svelte            [MOVE] dashboard -> "/crm"
|   +-- contacts|entreprises|pipeline|prospection|signaux|veille|reporting|aide|log|dashboard/couts/
+-- api/                        [SHARED, INCHANGE] entreprises, contacts, visits, photos, contact-suggestions, cron/*
+-- login/ auth/                [garde] (redirects post-login -> /crm)
```

**Mecanique confirmee sur le code** : les `+layout.server.ts` / `+page.server.ts` se
deplacent proprement (les `load` utilisent `locals.supabase`, aucune dependance au path).
`/api/*` et les crons (`vercel.json`) sont hors group -> NON deplaces.

**Reprefixage reel** : ~21 fichiers / ~35 points (config.navigation 11 entrees + ~16
`href="/..."` en dur + `goto`/`redirect` login/auth + `isActive('/')` + `pageTitle`).
Centraliser via `const CRM_BASE = '/crm'`. Ajouter des redirects 308 des anciennes
URLs internes -> `/crm/*` (favoris fondateurs). Detail complet : `revue-specs-corrections.md` E.

---

## 6. Ce qui N'EST PAS touche (no-debt, hors-scope explicite)

- Aucune table metier supprimee ou restructuree.
- Aucune politique RLS modifiee (mono-tenant plat conserve ; durcissement = autre chantier conditionne au 4e user).
- Aucune fonction CRM supprimee ou degradee.
- Le devis n'est PAS construit ce chantier (fondations seulement).
- Mobile V3 n'est PAS integre au portail ce chantier.
