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
| 1 | Atelier 209 existe (nom, connexion refaite, droits admin réparés) | **DÉPLOYÉ prod le 2026-07-15** (identité + rôles/RLS + connexion 4 adresses). Seul le renommage d'URL `atelier209.vercel.app` est **différé** (config domaine Vercel à faire proprement) - app à `filmpro-portail.vercel.app` | Portail · Connexion **(validés)** |
| 2 | Les deux marques cloisonnées (sélecteur, menu teinté, étanchéité en base) + **golden CRM revu (couleurs + Inter partout, pas de refonte) + chrome (sidemenu/header/footer) décliné par marque LED/FilmPro pour distinguer** (note Pascal 15/07) | **DÉPLOYÉ prod le 2026-07-15** (migration marque appliquée + vérifiée, **non-régression prouvée**, smoke prod vert ; logo LED corrigé HD). Live `filmpro-portail.vercel.app`. LED reste vide jusqu'au Run 3. | Sélecteur · Menu teinté · Golden CRM **(validés)** |
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
| 5 | Domaine « Atelier 209 » | `atelier209.ch` libre, mais **pas d'achat** (Pascal 14/07) | Adresse = **renommage de l'URL Vercel** |
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

**Décide** : adresse web du run 1 = **renommage de l'URL Vercel** (décision Pascal 2026-07-14 : **pas d'achat de domaine**, ni `atelier209.ch` ni autre). Cible : `atelier209.vercel.app` (repli `atelier-209.vercel.app` si le sous-domaine est pris), avec redirection permanente de l'ancienne (`filmpro-portail.vercel.app`). **Geste Claude** au build du run 1 (ce n'est plus un geste Pascal) : renommer le projet/alias Vercel + poser la redirection 308. `atelier209.ch` reste **libre** si Pascal change d'avis plus tard - aucun blocage.

## V6 / V7 - En attente d'un geste de Pascal

Ces deux vérifications ne bloquent **que** les runs 4 et 5. Les runs 1, 2 et 3 démarrent sans elles.

- **V6 - Hunter (bloque run 4)** : Pascal crée le **compte gratuit** (25 recherches/mois, 0 CHF, hunter.io/pricing). Claude testera la couverture sur 20 entreprises romandes réelles. Résultat -> le run 4 livre un bouton « enrichir » (couverture > ~4/10) ou une **saisie assistée** (couverture faible).
- **V7 - Pingen (bloque run 5)** : Pascal crée le compte (sans abonnement, ~1,58 CHF/lettre sous 500/mois, pingen.com/en/prices). Claude enverra une vraie lettre à l'adresse de Pascal -> valide format, coût réel, qualité, délai.

---

# Run 1 - Réalisation (2026-07-15)

**Statut : DÉPLOYÉ en prod le 2026-07-15** (identité + rôles/RLS + connexion 4 adresses). **Seul le renommage d'URL `atelier209.vercel.app` est différé** (voir plus bas) : l'app tourne à `filmpro-portail.vercel.app`, sous l'identité « Atelier 209 ».

## Modèle de rôles (validé par Pascal le 15/07)

| Rôle | Adresses | Connexion | Éditer mots-clés Signaux | Traiter retours (/log) |
|---|---|---|---|---|
| **Admin** | pascal@filmpro.ch + pascal@lamaisoncreativedirection.ch | oui | oui | oui |
| **Superuser** | antoine@filmpro.ch + antoine@lamaisoncreativedirection.ch | oui | oui | non |
| **User** | (à recruter) | oui | non | non |

Connexion autorisée : **4 adresses nommées** (pascal + antoine, sur filmpro.ch et lamaisoncreativedirection.ch), **aucun domaine ouvert** (décision Pascal 15/07 ; la RLS mono-tenant plate impose des adresses nommées plutôt qu'un domaine entier - sinon toute boîte du domaine accéderait à tout le fichier client). Chaque personne garde ses deux adresses (transition non verrouillante). Décision Pascal : @filmpro.ch et @ledstudio.ch serviront d'**expéditeurs** au futur module d'emailing (hors Run 1).

## Ce qui a été codé

- **Rôles + D1** : `src/lib/server/roles.ts` (source unique admin/superuser/user, lecture env `ADMIN_EMAILS`/`SUPERUSER_EMAILS` avec défauts versionnés) remplace `src/lib/feedback/admin.ts` (supprimé). Gate `/log` -> `isAdmin`, gate `/signaux` -> `isEditor`. Migration `20260715000000_roles_admin_superuser.sql` réécrit les policies RLS (feedback = admin `IN`, signaux = éditeurs `IN` ; l'ancien `LIKE '%@filmpro.ch'` de signaux est **resserré** à des personnes nommées). Garde-fou anti-dérive : `roles.test.ts` compare les emails SQL de la migration aux constantes TS.
- **Connexion** : coexistence 2 domaines via `ALLOWED_DOMAINS` (env) ; copy de domaine neutralisée (plus de « @filmpro.ch » codé en dur). Logique auth (`auth.ts`, `hooks.server.ts`) **inchangée**.
- **Refonte visuelle** (direction « Heure bleue », maquette validée) : `AtelierShell.svelte` (coquille bandeau + béton, tokens, Inter, reveal) partagée par `/login` (flux OTP 2 étapes) et `/` (portail « Par où commencer ? », header transparent, 2 outils sans cadre). Image `bar-off-1.png` -> `static/atelier209/hero-{480,768,1184}.webp` (1,27 Mo -> 30 Ko). Inter self-hosté (`@fontsource-variable/inter`, CSP-safe). Titre/manifest/theme-color -> « Atelier 209 ». `ToolCard`/`ToolCardGrid` supprimés (code mort après refonte) ; `PortailHeader` conservé (utilisé par Découpe).
- **URL Vercel** : `legacy-redirects.ts` redirige `filmpro-portail.vercel.app` -> `atelier209.vercel.app` (308, `/api/*` exempté).

## Vérifications (preuves)

- **Vitest 2559 verts** (176 fichiers ; baseline 2548 + rôles/coexistence/superuser, - tests admin obsolètes). **Build prod OK**. **svelte-check 0 erreur / 0 warning**.
- **4 écrans capturés en navigateur réel** (Playwright headless, dev local) et **conformes à la maquette** : login desktop + mobile, portail desktop + mobile (session mintée sans OTP ; le portail ne fait aucune requête DB). Bug reveal (référence keyframe) trouvé et corrigé à la capture, re-vérifié.
- **Revue adversariale** (sécurité rôles/RLS/D1 + bugs + contrats + non-régression, avec vérification indépendante des findings) : voir statut ci-dessous / audit sécu daté.

## Déploiement prod (fait le 2026-07-15)

- **Matrice de rôles confirmée par Pascal** (admin = Pascal ×2, superuser = Antoine ×2, connexion = les 4 adresses).
- **Migration RLS appliquée en prod** (via `pg` / `DATABASE_URL_ADMIN`, transaction commitée, policies re-vérifiées : feedback = 2 admin, signaux = 4 éditeurs). Le MCP Supabase étant read-only, `apply_migration`/`execute_sql` refusent le DDL - passer par `pg`.
- **Variables Vercel Production** posées : `ALLOWED_EMAILS` = les 4 adresses, `ALLOWED_DOMAINS` **retiré** (vérifié par `vercel env pull`). Aucun compte actif coupé (seuls `pascal@`/`antoine@filmpro.ch` existent ; un vieux `pascal.medecin@gmail.com` était déjà hors périmètre).
- **Code poussé sur `main`** (auto-déploie). L'app tourne à `filmpro-portail.vercel.app` sous l'identité « Atelier 209 » (titre, PWA, écrans).

### Différé (à faire proprement, hors risque) : renommage d'URL `atelier209.vercel.app`

Le renommage du projet Vercel (`filmpro-portail` -> `atelier209`) a été testé puis **annulé** : renommer ne rattache pas automatiquement `atelier209.vercel.app` comme **domaine de production public** (il reste protégé par le SSO Vercel de déploiement, 302 vers `vercel.com/sso-api`), alors qu'un alias manuel pointe vers l'URL de déploiement protégée. Le pousser en l'état aurait cassé le redirect `filmpro-portail -> atelier209` (cible 404/protégée). **Décision : garder `filmpro-portail.vercel.app` comme URL canonique** ; le cutover vers `atelier209.vercel.app` se fera dans une étape dédiée (configurer `atelier209.vercel.app` comme **domaine de production** du projet dans les réglages Vercel, vérifier qu'il sert en 200 public, PUIS activer le redirect 308 de `filmpro-portail`). Le code du redirect (`legacy-redirects.ts`) a été remis à son état d'origine pour ce déploiement. `atelier209.ch` reste libre si Pascal préfère un vrai domaine.

---

# Run 2 - DÉPLOYÉ EN PROD (2026-07-15)

**Statut : Run 2 EN PROD.** Gate visuel franchi (Pascal a validé les 2 marques dans Chrome ; le logo LED
du sidemenu, signalé « flou », a été régénéré HD et validé), migration `marque` appliquée + vérifiée en
prod, code mergé sur `main` (`48d0e66`), déploiement Vercel Ready, smoke prod vert. Live à
`filmpro-portail.vercel.app` sous l'identité Atelier 209. L'environnement LED existe mais est **vide**
(les prospects LED entrent au Run 3).

## Ce qui a été livré (branche `run2-marque`)

- **Cloisonnement DB de bout en bout** : `locals.marque` (cookie httpOnly) threadé partout ; 7 hubs +
  ~50 fichiers de prod (pages, endpoints, exports, terrain, cron) filtrés (`.eq('marque', ...)`) et
  inserts marqués. Export CSV dynamique verrouillé (fuite PII fermée). Flux public validation scopé via
  la marque portée par le token. `contact_suggestions` scopée par héritage (entreprise parente).
- **Chrome teinté** : sélecteur d'environnement (`BrandSwitcher`), pastille + filet header, teinte LED
  bleu nuit `#01003B` + magenta sous `[data-marque="led"]`. FilmPro strictement inchangé (aucun override).
  Logo LED dans `static/atelier209/`.
- **Golden Lot B** : Inter partout (`--font-sans`, imports, config, golden doc). Chrome FilmPro `#0A1628` intact.
- **Correctif d'archi (compilateur)** : FK composites créaient un embed PostgREST ambigu → DROP des FK
  simples redondantes (cohérence + embed OK). Types régénérés (diff 0 dérive).
- **Preuve DoD** : `src/lib/server/marque-leak.test.ts` **10/10** sur base réelle (à travers les vrais
  hubs). Vitest **2562 verts**, svelte-check **0**, build OK.
- **Revue adversariale 4 dimensions + vérif** (18 agents) : 6 findings confirmés (2 MEDIUM
  `contact_suggestions` + 4 LOW simap/regbl) **tous corrigés**, 8 réfutés (décisions assumées).
  Audit sécu daté : `audit_secu_2026-07-15_atelier209_run2_marque.md` (0 Critical/High).

## QA de non-régression avant/après (2026-07-15, directive Pascal « strictement identique »)

Objectif : **prouver** que `run2-marque` @filmpro est **strictement identique** à `main` (0 régression) et
que @led est un **miroir exact** teinté. Résultat : **0 régression FilmPro confirmée.**

- **Analyse différentielle adversariale** (workflow, 22 agents Opus, 7 partitions × analyse + vérif +
  critique de complétude) sur les 81 fichiers du diff `main...run2-marque` : **0 régression confirmée**,
  78 iso-confirmations positives. Tous les findings candidats (asymétrie mutations campagnes par id,
  `activites` non cloisonné, FK composites, DELETE photo/visit par id) **réfutés** à la vérification :
  soit byte-identiques à `main` (invariant 1 intact), soit décisions assumées tracées (SPEC §A1, Q2, RLS
  mono-tenant plate). Les 3 seuls changements FilmPro sont ceux **validés au gate design** : Inter (police),
  BrandSwitcher (tête de sidebar), pastille/filet de marque au header.
- **Baseline mécanique verte** : svelte-check **0/0**, build prod **OK**, `supabase db reset` from-scratch
  **OK** (migration `marque` reproductible, 49 migrations), Vitest **2562** passed / 10 skipped.
- **QA visuel avant/après** (base jetable Colima, seed 2 marques, session premium locale `ff_crm_listes_v2`) :
  **16/16 écrans HTTP 200** en FilmPro **et** LED (dashboard, entreprises, contacts, prospection, campagnes,
  pipeline, signaux, reporting), **0 erreur objective** (seul bruit = scripts Vercel Analytics externes bloqués
  par CSP locale). Cloisonnement **visuellement confirmé** : FilmPro ne voit que FilmPro, LED que LED ; KPI
  cloisonnés (Signaux FilmPro=1 / LED=0) ; miroir teinté exact (même layout/colonnes, chrome magenta LED).
- **2 points de cohérence LED DORMANTS** (pas des régressions FilmPro ; à traiter quand LED sera peuplé) :
  1. Widget « Activités récentes » du dashboard lit `activites` (journal global, hors 12, **SPEC §A1 assumé**) :
     en LED il montrerait les activités globales. Dormant (« Rien de récent » au seed). → arbitrer au Run 3+
     (cloisonner par héritage `contact.marque` vs garder global).
  2. Message d'état vide de l'écran Signaux en LED cite « radar SIMAP (marchés publics construction) »
     (texte FilmPro, **Q2 veille FilmPro-only**) : trompeur pour LED. → adapter au Run 7 (veille LED).

## Gate prod - FAIT le 2026-07-15 (go explicite de Pascal)

1. **Validation visuelle Pascal** : les 2 marques regardées dans Chrome (preview locale premium, base
   jetable Colima seed 2 marques). Seul défaut : logo LED sidemenu « flou » → régénéré HD (Poppins
   Bold/SemiBold, studio agrandi), validé. Reste « ok ».
2. **Migration prod appliquée + vérifiée** via `node scripts/apply-marque-migration.mjs`
   (`DATABASE_URL_ADMIN`, transaction unique). Contrôles : 12 colonnes `marque` + 12 CHECK + 2 clés
   composites + 3 FK de cohérence + FK simples redondantes supprimées + fonctions réécrites. **Preuve de
   non-régression** : 100 % des lignes existantes en `filmpro` (prospect_leads 312, contacts 1, campagnes
   2, opportunités 1 ; entreprises vide), zéro ligne non-filmpro.
3. **Déploiement** : merge `run2-marque` → `main` (`48d0e66`), push, Vercel auto-deploy **Ready**.
4. **Smoke prod vert** : `/login` 200 + titre « Atelier 209 », logo LED HD servi (viewBox 895),
   `/api/marque` 303 (route déployée, gate auth actif).

## Correctif pendant le gate visuel (2026-07-15)

- **Logo LED du sidemenu régénéré (rendu HD net à 22px).** Défaut signalé par Pascal au gate : « studio »
  trop petit/fin lisait « flou ». **Cause racine** (diagnostiquée, pas devinée) : la reconstruction horizontale
  V1 sous-dimensionnait « studio » (scale 0,097 vs 0,136 pour « LED ») - **pas** un raster basse-déf (le SVG
  était déjà vectoriel). **Fix** : régénéré depuis la vraie police Poppins de la marque (`Poppins-Bold` pour
  « LED », `Poppins-SemiBold` pour « studio », agrandi et rééquilibré), fidèle au logo officiel LED Studio
  (`~/Claude/shared/led-studio/logos/`). Asset : `static/atelier209/ledstudio-magenta.svg` (viewBox 895×191,
  studio cap=104). Générateur reproductible + paramétrable : `.atelier-209/gen-led-logo.py`. **Validé
  visuellement** (rendu réel du sidemenu en capture retina 2x à 22px + zoom 96px, tracés impeccables). Consommateur
  unique : `BrandSwitcher.svelte`. Rendu HD confirmé côté Claude ; Pascal a délégué la validation visuelle.

## Rappel - Gate design VALIDÉ par Pascal le 2026-07-15 (« ok validé »)

Maquette des 3 écrans : `.atelier-209/run2-maquettes/atelier209-run2.html`. Skills design engagés :
`redesign-skill` + `soft-skill` + `theme-factory` + filtre `ANTI-AI-SLOP.md`. Reproduction fidèle du
chrome CRM réel (Sidebar/Header), teinté par marque, contenu clair en Inter, données factices FilmPro vs LED.

Décisions design validées :
1. **Sélecteur** = bascule d'environnement en tête du menu (logo seul + chevron), menu : pastilles couleur de marque (bleu FilmPro / magenta LED), sans description. Mention « environnements étanches ». **Validé.**
2. **Chrome LED = Option B** (bleu nuit `#01003B` + accents magenta ; en-tête = filet magenta + pastille). **Validé.**
3. **Golden revu** = Inter partout + ajout palette LED, FilmPro inchangé (non-régression). **Validé.**

**Logo LED Studio horizontal produit (vectoriel, fidèle)** : le vrai logo est un mark carré (cadre
lumineux + « LED » + « studio »), sans version horizontale ni SVG existants. Reconstruit en SVG à partir
de Poppins (police de marque) converti en tracés : magenta exact `#FF05A8`, cadre lumineux, « LED »
encadré + « studio » à côté (variante V1, retenue), horizontal, calé à la taille du logo FilmPro.
Asset définitif : `.atelier-209/logo-led/ledstudio-horizontal-magenta.svg` (à déplacer dans `static/`
au moment du code). fal.ai écarté (ne reproduit pas fidèlement les lettres d'une marque). Sources de
marque : FilmPro `branding/filmpro.yaml` ; LED Studio (brochure officielle) `~/Claude/shared/led-studio/brand/brand.md`.

## Décisions techniques (arbitrées par Pascal le 2026-07-15, toutes la reco)

- **Q1 - un même client dans les 2 marques** : **OUI, indépendamment** → `UNIQUE(marque, source, source_id)` sur `prospect_leads` + `(marque, lower(unaccent(raison_sociale)))` sur `entreprises`.
- **Q2 - veille/signaux** : **FilmPro-only pour le Run 2** → pas de colonne `marque` sur les tables veille ; cron signaux insère `marque='filmpro'` fixe.
- **Q3 - sélecteur de marque** : **par-appareil (cookie httpOnly)**.

## Fix prod livré en marge (Run 1) le 2026-07-15

- Hero d'accueil du portail ré-encodé haute qualité (flou corrigé) + footer « La Maison Creative Direction **SA** ». Commit `93e13a0`, poussé/déployé.

## Spec technique du code (prête, read-only, vérifiée file:line)

Feuille de route complète : **`docs/ATELIER-209-RUN2-SPEC.md`** (modèle de données `marque`, threading
par cookie httpOnly, filtrage centralisé dans les hubs, golden Inter, seed D5, ordre d'implémentation,
critères d'acceptation, points chauds de non-régression). Décision transverse tranchée : `marque` =
filtre de vue applicatif + FK composites de cohérence en base ; le GUC+RLS infalsifiable est reporté
et couplé au durcissement RLS « avant un 4e user ».

**3 arbitrages Pascal pour la session de code** (détail + reco dans la spec §F) : Q1 un même tiers
peut-il exister dans les 2 marques (reco oui, indépendamment) ; Q2 veille/signaux restent FilmPro-only
au Run 2 (reco oui) ; Q3 sélecteur par-appareil ou cross-appareil (reco par-appareil, cookie).

---

# Dettes du code (à corriger dans le chantier)

| # | Dette | Preuve | Run |
|---|---|---|---|
| **D1** | ~~Droits admin `pascal@filmpro.ch` **en dur**~~ **CORRIGÉ (code) 2026-07-15** : modèle de rôles `src/lib/server/roles.ts` + migration RLS `20260715000000`. Déploiement prod : en attente. | ~~`src/lib/feedback/admin.ts:5`~~ (supprimé) | **Run 1 (code fait)** |
| **D2** | Import CSV développeur cassé (mapping périmé sur 3 entités, zéro dédup) | `scripts/import-csv.ts` vs migrations ; `csv-import.ts` (157 lignes) sans consommateur | **Run 3** (remplacé par le vrai écran d'import) |
| **D3** | Mots-clés de secteur en **5 copies, dont 3 ont divergé** ; la copie « officielle » n'est lue par personne | `zefix/+server.ts:43-52` · `searchch/helpers.ts:363-372` · `google-places/helpers.ts:269-279` · `ImportModal.svelte` · `config.ts` (morte) | **Run 3** (source unique) |
| **D4** | Aucune valeur de source « manuel » (supprimée de la base en 2026, jamais remise) - **confirmé en prod** : `prospect_leads.source` = `[zefix,simap,sitg,search_ch,fosc,regbl,minergie,lead_express,google_places]`, pas de `manuel` | `20260403000001:8` (origine) retiré par `20260510000002` | **Run 3** |
| **D5** | **Aucun seed** de base jetable (`supabase/seed.sql` attendu par `config.toml`, jamais commité) | `config.toml:65` `sql_paths=["./seed.sql"]` ; fichier absent (`git ls-files` vide) | **Run 2** (avant la QA 360 avec données) |

## Hygiène du code existant (directive Pascal, 2026-07-14)

**Profiter du chantier pour nettoyer / corriger le code mort du CRM actuel** - au fil des runs, jamais en passe dédiée. Chaque run qui touche un fichier en profite pour retirer le code mort **avéré** qu'il rencontre (imports/variables/fonctions sans consommateur, fichiers orphelins), **sans** élargir en refonte UX/UI (hors scope contrat). Garde-fous obligatoires : `knip` **+ grep de confirmation** avant toute suppression (faux positifs connus `MINUTE_MS`/`RATE_LIMIT_WINDOW_MS`, cf. `feedback_knip_verify_grep_before_delete`) ; toute suppression passe par « Opération destructive » (lire le contenu avant de retirer). Le code mort **préexistant hors du diff d'un run** se **signale et s'inscrit ici**, il ne se supprime pas hors contexte. Objectif chantier : zéro code mort net à la fin des 7 runs.

---

# Gestes Pascal en attente

- ~~Réserver le domaine `atelier209.ch`~~ - **DÉCIDÉ : pas d'achat de domaine** (Pascal 2026-07-14). L'adresse = renommage de l'URL Vercel (`atelier209.vercel.app`, différé, cf. Run 1). `atelier209.ch` reste libre si Pascal change d'avis.
- [ ] **Créer le compte Hunter gratuit** (25 recherches/mois, 0 CHF). Débloque V6 -> run 4.
- [ ] **Créer le compte Pingen** (sans abonnement, ~1,58 CHF/lettre). Débloque V7 -> run 5.

---

# Prochaine étape

**Run 3 - Les prospects LED entrent.** Run 1 **et** Run 2 sont **déployés en prod** (cf. sections
ci-dessus). Le Run 3 fait entrer les prospects LED et rembourse 3 dettes du code (D2/D3/D4).

**Contenu du Run 3** :
- **Écran d'import de liste** (remplace la dette **D2**, import CSV développeur cassé) - c'est le **seul**
  moyen de faire entrer les exposants d'un salon (cf. V2 : ni Zefix, ni Google Places, ni search.ch ne
  savent énumérer « qui expose au Salon X » ; c'est une liste, pas une catégorie d'activité).
- **Sources re-paramétrées par marque** : mêmes mécaniques, termes LED (agences événementielles, monteurs
  de stands, signalétique/enseigne - cf. V2).
- **Source unique des mots-clés secteur** (dette **D3** : aujourd'hui 5 copies dont 3 ont divergé).
- **Valeur de source `manuel`** (dette **D4** : supprimée de la base en 2026, jamais remise).

**Gate design d'abord (règle non négociable)** : la maquette de l'écran d'import est **validée par Pascal
dans Chrome AVANT toute ligne de code**. Skills design : `redesign-skill` + `ANTI-AI-SLOP.md`. Non-régression
+ zéro dette + QA 360 (base jetable Colima + seed).

**Bloqués par un geste Pascal** (n'empêchent PAS le Run 3) : V6 Hunter (→ Run 4) et V7 Pingen (→ Run 5),
comptes à créer.
