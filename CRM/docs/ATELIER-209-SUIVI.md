# Atelier 209 - Suivi d'exécution

> **Ce document est la source de vérité de l'exécution du chantier Atelier 209.** Statut par run,
> décisions, preuves. À lire au démarrage de toute session du chantier.
>
> Le « pourquoi » (cadrage figé, décisions actées par Pascal le 2026-07-14) vit hors-repo, en
> archive : `~/Claude/Lab/memory/atelier-209/` (`00-contrat.md`, `01-etat-du-code.md`, `02-runs.md`,
> `03-lot0.md`, `04-risques-et-dettes.md`). Cette archive n'est plus maintenue - la vérité vivante
> est ici.

## Le chantier en une phrase

Faire du CRM FilmPro l'outil de prospection **des deux marques** (LED Studio + FilmPro), sous un
**portail neutre « Atelier 209 »**, avec deux environnements **étanches**. Un seul outil, une seule
base : ni fork, ni deuxième application. Livraison par **runs** pilotés par `/product`.

## Règles non négociables (rappel)

- Pascal valide **chaque maquette d'écran** dans Chrome avant toute ligne de code.
- **Non-régression garantie** : colonne `marque` par défaut `filmpro` ; le CRM se comporte exactement comme avant.
- **Zéro dette** : les 4 dettes du code (D1-D4) sont corrigées, pas contournées.
- **Tout est sourcé et vérifié.** Une affirmation invérifiable est marquée `[hypothèse]` avec le test qui la validerait.
- Hors scope : refonte du CRM existant, déménagement du module Découpe, renommage du dossier disque, emailing de masse, automatisation LinkedIn.

## Tableau des runs

| Run | Livrable | Statut | Écrans à valider (Pascal) |
|---|---|---|---|
| **0** | Les 7 vérifications | **Terminé (5/7)** le 2026-07-14 ; V6/V7 en attente comptes Pascal | - |
| 1 | Atelier 209 existe (nom, adresse, connexion refaite, droits admin réparés) | À venir | Portail · Connexion |
| 2 | Les deux marques cloisonnées (sélecteur, menu teinté, étanchéité en base) | À venir | Sélecteur · Menu teinté |
| 3 | Les prospects LED entrent (import de liste, sources par marque, source unique secteurs) | À venir | Import |
| 4 | On trouve le décideur (connecteur Hunter) | Bloqué par V6 | Enrichissement |
| 5 | On envoie et on mesure (Pingen, relance, provenance, rendement) | Bloqué par V7 | Envoi postal · Provenance |
| 6 | L'email personnalisé (moteur, plafond, expéditeurs de marque) | À venir | Email + plafond |
| 7 | La veille LED Studio (produit + technique) | À venir (gate : cadrage en session) | Veille LED |

---

# Run 0 - Rapport des vérifications (2026-07-14)

**Méthode** : environnement réel du projet, lecture seule sur la production, vraies API, base jetable
locale. Les 3 vérifications déléguées (V1, V3, V5) ont tourné en workflow parallèle avec une **passe
de vérification adversariale** sur le point sécurité. V2 et V4 conduits en direct (API réelles, base
locale exclusive).

| # | Vérification | Résultat | Décide |
|---|---|---|---|
| 1 | Coût de la veille FilmPro | **11-13 CHF/mois** (run publié) | Budget veille LED ~23-27 CHF/mois |
| 2 | Sources actuelles + termes LED | **Import = nécessité** (pas confort) ; API = bon complément | Run 3 : import de liste indispensable |
| 3 | Base de prod vs migrations | **Conforme** (schéma en phase ; ledger seul obsolète) | Feu vert sécurité pour le run 1, **sous 5 conditions** |
| 4 | Base jetable en local | **Fonctionne** (48/48 migrations rejouées, ports 127.0.0.1) | QA 360 possible ; **dette : seed absent** |
| 5 | Domaine « Atelier 209 » | **`atelier209.ch` LIBRE** | Adresse web du run 1 |
| 6 | Couverture Hunter | En attente (compte Pascal) | Forme du run 4 |
| 7 | Format et coût Pingen | En attente (compte Pascal) | Feu vert run 5 |

## V1 - Coût réel de la veille FilmPro

**Résultat** : la veille coûte **11 à 13 CHF/mois** en régime normal (un run publié par semaine).

- Stockage : table `cost_audit_runs` (colonne `total_usd` = vraie valeur ; la base ne stocke **aucun CHF**, seulement USD + un EUR au taux fixe 0,92). Source : `src/lib/server/intelligence/cost-tracker.ts:198,211-212,44-45` ; écriture en fin de run `run-generation.ts:62-83`.
- Mesure sur 9 semaines (W20 -> W28, 2026-05-15 -> 2026-07-10) : run publié moyen **2,96 USD/semaine** ; tendance récente (opus-4-8 + prompt enrichi, W26-W28) plus haute, ~3,5 USD/semaine.
- Conversion CHF au taux indicatif 0,88 `[hypothèse, non stockée]`.

**Décide** : le budget de la **veille LED Studio** (run 7). Projection à deux veilles = **~23-27 CHF/mois** `[hypothèse : profil identique]`. Ce chiffre sera réaffiné au cadrage du run 7 (volume de sources et modèle LED à définir).

**Réserve importante** : le **facturé réel** dépasse le coût d'un run quand les retries d'erreur se déclenchent (W25 = 17,4 USD sur 6 runs ; W27 = 10,5 USD sur 3 runs, bug `pause_turn` corrigé en W28). Si ce bug réapparaît, le facturé hebdo peut doubler ponctuellement. Une deuxième veille double aussi cette exposition.

## V2 - Les sources actuelles avec des termes LED Studio

**Résultat** : il faut distinguer deux besoins de sourcing LED.

1. **Trouver les entreprises du secteur événementiel/enseigne** (agences, monteurs de stands, signalétique) : les API existantes suffisent, et sont même riches.
   - **Google Places** (mot-clé libre) : abondant. GE/VD, termes « agence événementielle », « stand exposition », « signalétique enseigne », « aménagement de stand » -> souvent **20 résultats (plafond atteint)**, très pertinents : Mydisplay, Eigenmann Expo, Expo Exhibition Stands, Espace Montage (monteurs de stands), Cometpub, Epigraph, PS Publicité, Led Sticker Studio (enseignistes).
   - **search.ch** (annuaire pro, `was` = activité) : correct, avec téléphone/adresse. Comptages Genève/Lausanne : « agence événementielle » 26-30, « stand exposition » 5, « enseigne publicitaire »/« signalétique » 5-11.
   - **Zefix** : **faible** pour du thématique (il ne cherche que la raison sociale + canton). `name~"signalétique"` = 0, `name~"événement"` = 0, `name~"enseigne"` = 2. À réserver à l'enrichissement d'une société déjà nommée, pas au sourcing par activité.

2. **Trouver les exposants d'un salon donné** (le coeur de cible LED : des entreprises de tous secteurs qui exposent et ont besoin de stands / écrans) : **aucune** des trois API ne sait énumérer « qui expose au Salon X ». C'est une liste, pas une catégorie d'activité.

**Décide** : l'**import d'une liste de prospects (run 3) est une nécessité, pas un confort** - c'est le seul moyen de faire entrer les exposants d'un salon. En parallèle, les sources existantes restent utiles pour le sourcing par activité et seront **re-paramétrées par marque** (mêmes mécaniques, termes LED). Confirme le découpage du run 3.

## V3 - La base de production correspond-elle au code ?

**Résultat** : **schéma de production conforme aux migrations**. Seul le *ledger* `schema_migrations` est obsolète (10 versions enregistrées vs 48 fichiers) - artefact connu et documenté (« la prod applique le SQL manuellement via pg », cf. `feedback_supabase_migration_via_pg_lib`). Les objets des migrations non-ledgerisées **existent bien en prod, à l'identique des fichiers** (policies, contraintes, colonnes vérifiées une à une).

**Zone sécurité (les policies que le run 1 va réécrire)** : les **7 policies** des tables `signaux_mots_cles` et `feedback_entries` correspondent **au caractère près** aux fichiers `20260513000003` et `20260513000001`. Aucune policy ajoutée/rencommée/modifiée à la main, aucune fonction ou vue cachée qui code `filmpro.ch` en dur, RLS active sur les deux tables. **Feu vert sécurité : oui.** (Preuve : re-interrogation `pg_policies`, `pg_proc`, `pg_views` en lecture seule, deux agents indépendants.)

**MAIS - piège majeur remonté par la passe adversariale (risque run 1 = moyen)** : les deux droits admin **ne sont pas symétriques**.

| Table | Condition admin réelle en prod | Opérateur | Périmètre |
|---|---|---|---|
| `feedback_entries` | `= 'pascal@filmpro.ch'` | `=` | **un seul email** |
| `signaux_mots_cles` | `~~ '%@filmpro.ch'` | `LIKE` | **tout le domaine** |

Une **seule** variable de configuration ne peut pas préserver les deux : si elle vaut « pascal exact », `signaux` se resserre de 3 fondateurs à 1 ; si elle vaut « le domaine », `feedback` s'élargit de pascal-seul à tout `@filmpro.ch` = **élargissement de privilège silencieux** sur le second filet feedback.

**Conditions à respecter au run 1** (à porter dans la spec) :
1. **Deux réglages distincts** : email exact (feedback) vs motif de domaine (signaux). Pas une variable unique.
2. **Préserver l'opérateur par table** (`=` vs `LIKE`).
3. Garder alignés le **gate serveur** (`isAdminEmail`, `src/lib/feedback/admin.ts` + actions `log` et `signaux`) et la **RLS** (second filet). Aujourd'hui, le gate serveur est pascal-seul et strict ; la RLS de `signaux` est déjà plus large (domaine).
4. Si le réglage passe par un **GUC** (`current_setting('app.admin_email', …)`) : le câbler **à chaque requête** (Supabase mutualise les connexions ; un GUC non positionné -> prédicat NULL -> RLS refuse -> admin verrouillé). Aucun `set_config`/`current_setting` n'existe aujourd'hui (pattern net-neuf, à tester). **Recommandation : rester sur la lecture du JWT `auth.jwt() ->> 'email'`** (déjà en place, sans état de session) plutôt qu'un GUC.
5. **Test de refus après réécriture** : `pascal` passe sur les deux tables ; `antoine@filmpro.ch` reste bloqué sur feedback (comportement mono-admin actuel, assumé). Bascule vers `@lamaisoncreativedirection.ch` sans casser les deux écrans.

**Décide** : le run 1 peut réécrire les policies admin sans écraser un état non tracé, **à condition** de traiter les deux tables séparément (ci-dessus). D1 est donc plus subtil que « une variable » : c'est **deux réglages typés**.

## V4 - La base jetable en local

**Résultat** : **fonctionne**. `colima start` + `supabase db reset` rejoue les **48 migrations** sur une base fraîche, sans erreur (« Finished supabase db reset on branch main. » ; seuls des `NOTICE ... skipping` bénins = garde-fous idempotents). La reproductibilité est prouvée -> **QA 360 possible**.

- **Sécurité confirmée** : `override.yaml` de durcissement en place ; les ports (54321-54324) n'écoutent que sur **`127.0.0.1`** côté Mac (tunnel Lima) - jamais exposés au réseau.
- **Observation d'environnement** : un stack Supabase **résiduel** de Gouvernance (projet « Consulting ») occupait les ports ; arrêté proprement (`supabase stop`, volume conservé) pour libérer la place, conformément à la règle « une seule base à la fois ». Rien à restaurer côté FilmPro.

**Dette découverte (D5) : aucun seed**. `config.toml` attend `./seed.sql` (`sql_paths`), le fichier **n'existe pas** et n'a **jamais** été commité (`WARN: no files matched pattern: supabase/seed.sql`). La base se reconstruit donc **vide de données**. Sans impact sur run 0/run 1 (pas de données requises), mais **la QA 360 des runs 2+ a besoin d'un jeu de test** : créer un `supabase/seed.sql` versionné (schéma réel, données factices, jamais de dump prod) avant le premier run qui teste du contenu. À planifier au run 2.

## V5 - Le nom de domaine

**Résultat** : **`atelier209.ch` est LIBRE** (preuve : RDAP SWITCH `rdap.nic.ch` -> 404 « objet inexistant », avec contrôle probant 200 sur `switch.ch`/`google.ch` le même jour). **Reco principale** : `atelier209.ch` (le `.ch` prime pour une PME romande, portail neutre, version sans tiret plus mémorisable).

| Domaine | Statut | Note |
|---|---|---|
| **atelier209.ch** | **libre** | Reco principale |
| atelier-209.ch | libre | Repli (tiret se dicte mal à l'oral) |
| atelier209.com | **pris** | Enregistré depuis 2015 (GoDaddy) - pas bloquant pour un portail suisse |
| atelier-209.com | libre | Seul `.com` disponible (compromis médiocre) |
| atelier209.studio | libre | Colle au concept « Studio », TLD moderne, défensif |
| atelier209.io | libre | Connoté tech, peu adapté PME locale |

**Décide** : adresse web du run 1 = **`atelier209.ch`**, avec redirection permanente de l'ancienne (`filmpro-portail.vercel.app`). `atelier209.studio` en réservation défensive optionnelle. **Geste Pascal** : réserver le domaine chez le registrar (Infomaniak recommandé pour un `.ch`).

## V6 / V7 - En attente d'un geste de Pascal

Ces deux vérifications ne bloquent **que** les runs 4 et 5. Les runs 1, 2 et 3 démarrent sans elles.

- **V6 - Hunter (bloque run 4)** : Pascal crée le **compte gratuit** (25 recherches/mois, 0 CHF, hunter.io/pricing). Claude testera la couverture sur 20 entreprises romandes réelles. Résultat -> le run 4 livre un bouton « enrichir » (couverture > ~4/10) ou une **saisie assistée** (couverture faible).
- **V7 - Pingen (bloque run 5)** : Pascal crée le compte (sans abonnement, ~1,58 CHF/lettre sous 500/mois, pingen.com/en/prices). Claude enverra une vraie lettre à l'adresse de Pascal -> valide format, coût réel, qualité, délai.

---

# Dettes du code (à corriger dans le chantier)

| # | Dette | Preuve | Run |
|---|---|---|---|
| **D1** | Droits admin `pascal@filmpro.ch` **en dur**, à passer en config - **et les deux tables sont asymétriques** (voir V3) : email exact (feedback) vs domaine (signaux) | `src/lib/feedback/admin.ts:5` + policies `20260513000001:52-55` (`=`) et `20260513000003:35-48` (`~~`) | **Run 1** |
| **D2** | Import CSV développeur cassé (mapping périmé sur 3 entités, zéro dédup) | `scripts/import-csv.ts` vs migrations ; `csv-import.ts` (157 lignes) sans consommateur | **Run 3** (remplacé par le vrai écran d'import) |
| **D3** | Mots-clés de secteur en **5 copies, dont 3 ont divergé** ; la copie « officielle » n'est lue par personne | `zefix/+server.ts:43-52` · `searchch/helpers.ts:363-372` · `google-places/helpers.ts:269-279` · `ImportModal.svelte` · `config.ts` (morte) | **Run 3** (source unique) |
| **D4** | Aucune valeur de source « manuel » (supprimée de la base en 2026, jamais remise) - **confirmé en prod** : `prospect_leads.source` = `[zefix,simap,sitg,search_ch,fosc,regbl,minergie,lead_express,google_places]`, pas de `manuel` | `20260403000001:8` (origine) retiré par `20260510000002` | **Run 3** |
| **D5** | **Aucun seed** de base jetable (`supabase/seed.sql` attendu par `config.toml`, jamais commité) | `config.toml:65` `sql_paths=["./seed.sql"]` ; fichier absent (`git ls-files` vide) | **Run 2** (avant la QA 360 avec données) |

---

# Gestes Pascal en attente

- [ ] **Réserver le domaine `atelier209.ch`** (registrar, Infomaniak recommandé). Débloque l'adresse du run 1. (`atelier209.studio` en défensif optionnel.)
- [ ] **Créer le compte Hunter gratuit** (25 recherches/mois, 0 CHF). Débloque V6 -> run 4.
- [ ] **Créer le compte Pingen** (sans abonnement, ~1,58 CHF/lettre). Débloque V7 -> run 5.

---

# Prochaine étape

**Run 1 - Atelier 209 existe.** Piloté par `/product` (5 phases à portes). Contenu : renommage du
portail existant (`src/routes/(portail)/`), nouvelle adresse `atelier209.ch` + redirection permanente,
page de connexion refaite (`soft-skill`), login `@lamaisoncreativedirection.ch` (variable
d'environnement), correction de la dette D1 (**deux réglages admin typés**, voir V3). Maquettes à
valider par Pascal dans Chrome : **Portail** et **Connexion**, avant toute ligne de code.
