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
- **Parité bi-marque** : LED est un **miroir fonctionnel ET visuel** de FilmPro (présentation, copies, scoring, exports, pages publiques), pas seulement une base cloisonnée. La QA de sortie inclut une **checklist de parité par marque sur un env LED peuplé** - pas seulement la non-régression FilmPro. → section « Parité bi-marque » en fin de doc + `feedback_bi_marque_parity_qa_en_sortie`.
- **Zéro dette** : les 4 dettes du code (D1-D4) sont corrigées, pas contournées.
- **Tout est sourcé et vérifié.** Une affirmation invérifiable est marquée `[hypothèse]` avec le test qui la validerait.
- Hors scope : refonte du CRM existant, déménagement du module Découpe, renommage du dossier disque, emailing de masse, automatisation LinkedIn.

## Tableau des runs

| Run | Livrable | Statut | Écrans à valider (Pascal) |
|---|---|---|---|
| **0** | Les 7 vérifications | **Terminé (5/7)** le 2026-07-14 ; V6/V7 en attente comptes Pascal | - |
| 1 | Atelier 209 existe (nom, connexion refaite, droits admin réparés) | **DÉPLOYÉ prod le 2026-07-15** (identité + rôles/RLS + connexion 4 adresses). Seul le renommage d'URL `atelier209.vercel.app` est **différé** (config domaine Vercel à faire proprement) - app à `filmpro-portail.vercel.app` | Portail · Connexion **(validés)** |
| 2 | Les deux marques cloisonnées (sélecteur, menu teinté, étanchéité en base) + **golden CRM revu (couleurs + Inter partout, pas de refonte) + chrome (sidemenu/header/footer) décliné par marque LED/FilmPro pour distinguer** (note Pascal 15/07) | **DÉPLOYÉ prod le 2026-07-15** (migration marque appliquée + vérifiée, **non-régression prouvée**, smoke prod vert ; logo LED corrigé HD). Live `filmpro-portail.vercel.app`. LED reste vide jusqu'au Run 3. | Sélecteur · Menu teinté · Golden CRM **(validés)** |
| 3 | Les prospects LED entrent (import de liste, sources par marque, source unique secteurs) | **DÉPLOYÉ prod le 2026-07-16** (D4 appliquée, merge `4e3f149`, smoke vert). Reste : sign-off visuel Pascal sur la prod. | Import **(maquette validée ; sign-off prod à faire)** |
| 4 | On trouve le décideur (enrichissement **Dropcontact**, Hunter écarté 20/07) | Chez Pascal : décider l'abo | Enrichissement |
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
| 6 | Couverture Hunter → **RÉSOLU 20/07** | Testé : Hunter faible sur PME romandes → **Dropcontact retenu** | Run 4 = enrichir via Dropcontact |
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

- **V6 - Enrichissement décideur : RÉSOLU 2026-07-20 (Hunter écarté → Dropcontact).** Test réel sur 10 cibles romandes : Hunter faible sur PME < 50 pers. (rend des `info@`) ; **Dropcontact** retenu (6/10 emails nominatifs vérifiés propres, 0 `info@`, détection de changement de poste, RGPD-native/caution CNIL). Run 4 = bouton « enrichir » via Dropcontact ; repli micro-PME sans site = Zefix + téléphone. Geste Pascal = décider l'abo Starter 29 €/mois (500 crédits) quand le volume le justifie (compte gratuit 50 crédits déjà testé). → CLAUDE.md § Chez Pascal + [[project_veille_led_cadrage_test_2026-07-20]].
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

### Retouches page d'accueil (backlog, pas urgent - gate mockup, ajouté 2026-07-15)

Demande Pascal (à valider ensemble via maquette dans Chrome **avant** tout code ; `AtelierShell.svelte` partagé `/login` + `/`). Détail actionnable canonique : `CRM/CLAUDE.md` § Backlog dev. Quatre points : **(1)** hero plus grand **sans l'étirer** + **HD** (source native 1184×864 = cause du flou persistant → régénérer une source 2x), proportion cible **2/3 image / 1/3 bandeau noir** (aujourd'hui `banner` = `flex: 0 0 42vh`, l'inverse) ; **(2)** blocs du bandeau noir **aérés, 100 % alignés grille** ; **(3)** boutons OTP `« recevoir le code »` / `« Se connecter »` = **même largeur ET hauteur**, grille ; **(4)** **fondu premium et subtil** image↔bandeau béton (raffiner `.banner-fade`).

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
| **D4** | Aucune valeur de source « manuel » (supprimée de la base en 2026, jamais remise) - **confirmé en prod** : `prospect_leads.source` = `[zefix,simap,sitg,search_ch,fosc,regbl,minergie,lead_express,google_places]` (9 valeurs, dernière migration qui fait foi `20260512000003`), pas de `manuel` | `20260403000001:8` (origine) retiré par `20260411000001` (⚠️ corrigé 2026-07-15 : le SUIVI citait `20260510000002` par erreur - cette migration n'a fait qu'**ajouter** `lead_express`). Migration D4 = repartir des 9 valeurs de `20260512000003` **+ `manuel`** | **Run 3** |
| **D5** | **Aucun seed** de base jetable (`supabase/seed.sql` attendu par `config.toml`, jamais commité) | `config.toml:65` `sql_paths=["./seed.sql"]` ; fichier absent (`git ls-files` vide) | **Run 2** (avant la QA 360 avec données) |

## Hygiène du code existant (directive Pascal, 2026-07-14)

**Profiter du chantier pour nettoyer / corriger le code mort du CRM actuel** - au fil des runs, jamais en passe dédiée. Chaque run qui touche un fichier en profite pour retirer le code mort **avéré** qu'il rencontre (imports/variables/fonctions sans consommateur, fichiers orphelins), **sans** élargir en refonte UX/UI (hors scope contrat). Garde-fous obligatoires : `knip` **+ grep de confirmation** avant toute suppression (faux positifs connus `MINUTE_MS`/`RATE_LIMIT_WINDOW_MS`, cf. `feedback_knip_verify_grep_before_delete`) ; toute suppression passe par « Opération destructive » (lire le contenu avant de retirer). Le code mort **préexistant hors du diff d'un run** se **signale et s'inscrit ici**, il ne se supprime pas hors contexte. Objectif chantier : zéro code mort net à la fin des 7 runs.

---

# Gestes Pascal en attente

- ~~Réserver le domaine `atelier209.ch`~~ - **DÉCIDÉ : pas d'achat de domaine** (Pascal 2026-07-14). L'adresse = renommage de l'URL Vercel (`atelier209.vercel.app`, différé, cf. Run 1). `atelier209.ch` reste libre si Pascal change d'avis.
- [x] ~~Créer le compte Hunter~~ - **abandonné 2026-07-20** : Hunter écarté après test (faible sur PME romandes). Enrichissement = **Dropcontact** (compte gratuit déjà testé). Geste restant = décider l'abo Dropcontact quand le volume le justifie. → CLAUDE.md § Chez Pascal.
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

## Run 3 - Gate design VALIDÉ (2026-07-15)

Maquette `.atelier-209/run3-maquettes/atelier209-run3.html` (4 vues : point d'entrée FilmPro + les 3
étapes déposer/associer-colonnes/aperçu + version LED magenta pour l'étanchéité), ouverte dans Chrome.
Skills : `redesign-skill` + `ANTI-AI-SLOP.md`. Chrome reproduit fidèlement (corrigé vs Run 2 :
header 48px, filet header = var(--brand) prod). Format d'aperçu calé sur les **vraies listes** de Pascal
(scrapes Google Maps `Marketing/projets/FilmPro/` : NOM/ADRESSE/NPA/VILLE/TELEPHONE/CATEGORIE/SITE WEB/EMAILS)
- ce qui justifie le mapping assisté (en-têtes hétérogènes, pas de colonne canton).

**Décisions validées par Pascal** :
1. **Flux 3 étapes** (déposer → associer les colonnes → aperçu & import). Validé.
2. **Upload fichier + mapping de colonnes assisté** + modèle CSV. Validé.
3. **Tout compte connecté** (l'import n'est pas premium). Validé.
4. **Ignorer les doublons** à l'aperçu (n'entrent pas), MAIS avec un **mécanisme de dédup ROBUSTE,
   MULTI-AXES, STRESS-TESTÉ** (exigence Pascal explicite). → conçu dans la spec §2 : 4 axes
   (nom+localité, téléphone, e-mail, domaine), marque-scopé, `source_id` synthétique déterministe
   (idempotence), 15 familles de stress tests.

**Spec de code complète** : `docs/ATELIER-209-RUN3-SPEC.md` (D4 source manuel, module dédup multi-axes
+ matrice de stress, endpoint import-liste, UI, D3 source unique secteurs marque-aware, sources par marque,
QA Colima, critères d'acceptation binaires). Ordre : D4 → dédup (TDD) → endpoint → UI → D3 → QA.

**Point faible visé par l'exigence dédup** (diagnostiqué, cartographie) : la dédup actuelle
(`candidate.ts fetchDedupSets`) ne mord que sur `source_id` d'API (NULL pour un import → aucune dédup),
et `normalizeCompanyName` garde les accents (« Régie » ≠ « Regie »). Le multi-axes comble exactement ça.

### Avancement du code (2026-07-15)

- [x] **Module de dédup multi-axes** `src/lib/server/prospection/import-dedup.ts` (fonctions pures :
  `normalizeLeadName` NFD+formes juridiques, `normalizeLocalityKey`, `normalizePhoneCH`, `normalizeEmail`,
  `normalizeDomain`, `syntheticSourceId`, `buildLeadDedupKeys`, `dedupCandidates`). 4 axes, marque-scopé,
  cross-source, idempotent. **`import-dedup.test.ts` : 31 tests / 15 familles de stress, tous verts** (accents,
  casse, formes juridiques, tél tous formats, e-mail, domaine, homonyme cross-localité NON fusionné, match
  cross-axe, champs manquants, cross-marque, idempotence, intra-payload, anti sur-fusion, fuzzing, ligne invalide).
- [x] **D4 - source `manuel`** : migration `20260716000001_prospect_leads_source_manuel.sql` (DROP/ADD CHECK
  = 9 valeurs + `manuel`, élargissement pur), `SOURCES_LEAD` (schemas.ts), `sourceLabel`/`sourceOptions`
  (prospection-utils.ts), pastille `sourceMetaFor` → « Import manuel » (entreprisesFormat.ts), test anti-drift
  (schemas.test.ts). **130 tests verts**, svelte-check 0/0. Reste : `db reset` de vérif + application prod `pg`.
- [x] **Endpoint** `POST /api/prospection/import-liste` (aperçu + import). Auth + gate source `manuel` ;
  `fetchLeadDedupSets` (I/O marque-scopé, nouveau `import-dedup-server.ts`) ; mapping assaini serveur ;
  `npaToCanton` (déduction canton, nouveau `npa-canton.ts` + 30 tests d'ancres) ; `detectSecteur` marque-aware ;
  re-score ; **upsert idempotent** sur l'index unique `(marque,'manuel',source_id)` ; `ImportListeSchema` Zod (bornes
  5000 lignes/60 cols/500 chars). 9 tests d'endpoint (mock supabase) verts.
- [x] **UI** modale 3 étapes `ImportListeModal.svelte` (miroir de la maquette validée : dropzone CSV/TSV + modèle,
  mapping assisté auto-reconnu, aperçu statbar + table états). Parse client (`$lib/utils/csv` extrait, +TSV/`;`),
  auto-mapping (`import-mapping.ts` + 14 tests). Onglet **« Ma liste »** (source manuel) + bouton « Importer une liste »
  sur l'onglet Entreprises (fidèle maquette Écran 1) + CTA/empty-state sur Ma liste. `.xlsx` refusé proprement
  (message « Enregistrer sous CSV »).
- [x] **D3** source unique secteurs **marque-aware** (`$lib/prospection/secteurs.ts` : filmpro = super-ensemble
  google-places byte-identique + vitrerie/toiture partout ; led [à valider Pascal] enseigne/stand/signalétique/
  événementiel/retail). 3 détecteurs recâblés (`locals.marque`), copie morte `config.ts` + mirror `ImportModal`
  supprimés, mirror activités → source unique `activity-types.ts`. **Golden non-régression** (oracle) vert.
- [x] **QA base réelle Colima** : `supabase db reset` rejoue les **51 migrations (dont D4)** + seed ; `marque-leak.test.ts`
  **étendu — 15/15 verts en base réelle** (import LED → 0 fuite, idempotence, dédup marque-scopée, **CSV réel
  format G7 de bout en bout** parse→mapping→endpoint→DB avec canton GE + « Vitrerie »→menuiserie). Baseline :
  **Vitest 2801 verts** (2730 avant revue → +71 après les 6 trous de test comblés) + 15 intégration, **svelte-check 0/0**, **build prod OK**.
- [x] **Revue adversariale** (workflow 15 agents Opus : 5 dimensions review + verify indépendant par finding +
  critique de complétude). **8 findings confirmés (2 medium correctness/regression, 1 medium a11y, 5 low) TOUS
  corrigés** + 6 trous de test comblés (scoping dédup, course TOCTOU, bornes anti-DoS, invariant scoring, aperçu sans
  écriture, oracle non-régression). Correctifs clés : NPA canonique unique (round-trip dédup réparé), pagination
  `fetchLeadDedupSets` (>1000 leads), focus trap re-corralé, 3e miroir D3 (`SourceSearchFields`) dédupliqué.
  **0 Critical/High.** → [[audit_secu_2026-07-16_atelier209_run3_import_liste]].
- [x] **Application prod D4 + déploiement — FAIT le 2026-07-16.** Migration `20260716000001` appliquée en prod via `pg`
  (`scripts/apply-run3-d4-migration.mjs`) : CHECK `prospect_leads_source_check` élargi à 10 valeurs (`manuel` inclus),
  **312 leads existants préservés, 0 invalidée**. Merge `run3-import` → `main` (`4e3f149`), push, Vercel **Ready** (build 40s).
  **Smoke prod vert** : `/login` 200 + « Atelier 209 » ; `POST /api/prospection/import-liste` sans session → 303 (route
  déployée + gate auth actif). Live à `filmpro-portail.vercel.app`.
- [x] **QA visuelle + e2e Playwright + resize colonnes — DÉPLOYÉ le 2026-07-16** (`c106a67`). Flux d'import piloté en vrai
  navigateur (base jetable Colima) → **e2e Playwright** `tests/prospection-import-liste.test.ts` (dette Run 3 comblée :
  dépôt→mapping→aperçu→import→« Ma liste », oracle dédup) + **audit adversarial** (workflow 20 agents, 12 findings) →
  **7 défauts corrigés** et vérifiés à l'œil sur captures réelles : bloquant FR « 1 doublons ignorés » (cartes stats accordées
  sur la valeur), pied étape 3 (accord + sorti de la zone tronquée), bouton « Aucun prospect à importer » (plus de « 0 X »),
  dropzone « CSV » (jargon TSV retiré), apostrophes typographiques de l'empty-state « Ma liste », raison « Raison sociale vide »
  toujours visible. En marge : **resize de colonnes câblé sur Entreprises + Contacts** (parité Prospection/Veille, **zéro
  régression** prouvée avant/après) + helper `tests/mint-session-local.mjs` (session premium locale). Vitest **2801**, build OK,
  svelte-check **0/0**, smoke prod vert. Détail → [[project_atelier_209_run3_import_liste_2026-07-16]].
- [ ] **Sign-off visuel Pascal du flux d'import** : à faire **sur la prod directement** (décision Pascal 16/07 : personne
  ne l'utilise encore). Prochaine session commence par là : ouvrir Prospection → onglet « Ma liste » (ou bouton « Importer
  une liste » sur Entreprises) → déposer un CSV → colonnes → aperçu → import.

**Bloqués par un geste Pascal** (n'empêchent PAS le Run 3) : V6 Hunter (→ Run 4) et V7 Pingen (→ Run 5),
comptes à créer.

---

# Parité bi-marque LED ↔ FilmPro - audit (2026-07-17)

> **ÉTAT AU 2026-07-18 (fait foi) : parité UX/UI CLOSE hors veille.** Cette section est un log chronologique ;
> les mentions intermédiaires « Reste parité : 2 / 5-7 » sont **superseded**. État final : original 1-7 + ré-audit
> WP-A/B/C **tous déployés**, **bug 1 fermé** (breakpoint `md`, pas la marque). Reste **#8** seul (hero Signaux = Run 7).
> Voir les sections finales « Ré-audit exhaustif + WP-A/B » et « WP-C copies métier LED » en bas.

**Contexte** : Pascal a remonté à l'usage 2 défauts sur la prospection LED (bouton import « absent », dropdown
campagne vide « pas propre ») + une directive : **LED et FilmPro doivent être 100 % alignés en UX/UI**. Un
audit de parité (workflow 4 agents Opus, 91 tool-calls, findings vérifiés) a balayé toute la surface
prospection/campagnes.

**Verdict** : le **cloisonnement des données** est solide (chaque lecture DB est scopée `marque`, et
`secteurs.ts` détecte déjà par marque). La parité casse dans la couche **présentation + scoring** : des
littéraux FilmPro codés en dur **avant** la bascule bi-marque, jamais re-câblés. Un seam marque-aware
(`SECTEUR_KEYWORDS_BY_MARQUE`, chrome teinté) a été ajouté au coup par coup sans re-câbler ses consommateurs
aval. **8 divergences réelles**, dont **2 HIGH à régler avant que LED serve en vrai**. Cause profonde :
aucune checklist de parité ne gardait chaque « touche de marque », plus des décisions « non marque-aware
pour l'instant » documentées mais jamais refermées.

| # | Sévérité | Divergence | Fichier:ligne | Fix |
|---|---|---|---|---|
| 1 | **HIGH** · **CORRIGÉ 17/07** | Page de validation **externe publique** codée FilmPro : `<FilmProLogo/>`, « l'équipe FilmPro », footer. Le destinataire externe du lien d'une campagne LED voit la marque FilmPro. | `src/routes/validation/[token]/+page.svelte:156,260,271,280` ; le load `+page.server.ts` scope par `resolution.marque` mais ne le **retourne pas** (l.62-70) | FAIT : `marque` renvoyée par le load ; logo (LED magenta vs FilmPro) + « l'équipe {marque} » + footer par `marqueLabel(marque)` + teinte `[data-marque]` locale. |
| 2 | **HIGH** · **CORRIGÉ 17/07** | Scoring **non marque-aware** : tous les chemins d'import appellent `calculerScore` sans `keywords` → branche V1 qui matche la clé secteur contre la liste **vitrage FilmPro** (`config.ts:89`). Les 7 clés secteur LED n'y sont pas → **tout prospect LED score 0** (« Faible signal »), badge/température/tri faussés. | `src/lib/scoring.ts:138` + `src/lib/config.ts:89` ; 7 chemins d'import | FAIT : champ `marque` sur le lead → `secteursCiblesFor(marque)` (FilmPro inchangé, LED = `LED_SECTEURS_CIBLES`) ; câblé aux 10 sites de scoring LED (veille reste FilmPro) ; garde de couplage LED. |
| 3 | MEDIUM · **CORRIGÉ + DÉPLOYÉ 18/07** (`96dc026`) | PDF « liste des prospects » d'une campagne = **logo FilmPro en dur** (partageable, aucun param marque). | `src/lib/campagnes-pdf/pdf-liste-prospects.ts:414,421` | FAIT : nouveau `src/lib/pdf/ledstudio-logo.ts` (fragment SVG **verbatim** de l'asset validé, prouvé byte-identique) + dispatcher `marque-logo.ts` ; param `marque` threadé dans `exportListeProspectsPdf` (défaut `filmpro` = non-régression **byte-identique**, testée), passé `data.marqueActive` aux 2 call sites. QA réelle : rendu svg2pdf LED magenta net + FilmPro inchangé. |
| 4 | MEDIUM · **CORRIGÉ + DÉPLOYÉ 18/07** (`ae438e2`) | Modale d'import (recherche entreprises) = métier FilmPro en dur : activité par défaut `regies_syndics`, placeholders « vitrerie, façade… ». | `src/lib/components/prospection/ImportModal.svelte` | FAIT : prop `marque` ; défaut + placeholders + helper Zefix marque-aware via `prospection-copies.ts` (FilmPro byte-identique) + `gpActivityOptionsFor(marque)`. |
| 5 | MEDIUM · **CORRIGÉ + DÉPLOYÉ 18/07** (`ae438e2`) | Catégories Google Places = réseau partenaire FilmPro seul (« Non marque-aware pour l'instant » assumé en commentaire). | `src/lib/prospection/activity-types.ts` | FAIT : `ACTIVITY_TYPES_LED` (7 validées Pascal 18/07) + union serveur (`helpers.ts` résout les clés LED). Rétro-compat FilmPro. |
| 6 | MEDIUM · **CORRIGÉ + DÉPLOYÉ 18/07** (`ae438e2`) | Champs de recherche source (ajout de prospects sur /prospection ET détail campagne) = placeholders « vitrerie, façade, régie… ». | `src/lib/components/prospection/SourceSearchFields.svelte` | FAIT : prop `marque` + placeholders/erreurs/options marque-aware (`prospection-copies.ts`), threadée via `EntrepriseSearchModal`. |
| 7 (**bug 2 Pascal**) | MEDIUM · **CORRIGÉ + DÉPLOYÉ 18/07** (`96dc026`) | Filtre « Campagne » = `MultiSelectDropdown` **sans branche `{:else}`** → boîte blanche vide ~192px quand 0 campagne (LED). Le frère `CampagneCombo` gère « Aucune campagne ». | `src/lib/components/MultiSelectDropdown.svelte:88` | FAIT : prop `emptyLabel` (défaut « Aucune option ») + branche `{:else}` ; `emptyLabel="Aucune campagne"` aux 2 sites campagne de prospection. Brand-agnostic. QA réelle : 0 campagne → « Aucune campagne », peuplé inchangé. Canton/Source (AlerteModal inclus) = constantes jamais vides, défaut inoffensif. |
| 8 | LOW | Hero Signaux = « marché du vitrage » en dur (déjà masqué par cron `marque='filmpro'`). | `src/routes/crm/signaux/+page.svelte:371` | À plier dans le **cadrage Run 7** (veille LED) - déjà en WATCH. |

**Bug 1 Pascal (bouton « Importer une liste » absent sur LED) = NON reproduit en code.** Le bouton
(`src/routes/crm/prospection/+page.svelte:1079`) n'est verrouillé que par l'onglet (`data.tab !== 'maliste'`),
**jamais par la marque** ; l'onglet par défaut vient de `config.prospection.sources` (statique, non
marque-aware) → identique pour les deux marques. Causes probables à écarter par une repro sur l'env LED réel :
(a) onglet « Ma liste » où l'outlined est remplacé par le CTA bleu principal ; (b) build/cache prod ; (c)
fenêtre < `md` (bouton `hidden md:inline-flex`). **À reproduire sur un env LED peuplé avant de coder quoi que ce soit.**

**Posture de livraison** : chaque copie/logo visible passe par la règle « miroir exact + QA avant/après » et la
**checklist de parité par marque**. Les copies métier visibles (4, 5, 6) = **gate maquette Chrome** si on retouche
le libellé. → mémoire `feedback_bi_marque_parity_qa_en_sortie`.

## Correctif des 2 HIGH - LIVRÉ (code) le 2026-07-17 (go Pascal « reco ok »)

**Items 1 et 2 corrigés**, testés et **prouvés en conditions réelles**. Restent 3-7 (medium, groupés) + 8 (Run 7).

- **HIGH #2 - Scoring marque-aware** : `LeadScoring.marque` (optionnel, défaut `filmpro` = non-régression stricte) ;
  branche V1 de `calculerScore` résout ses cibles via `secteursCiblesFor(marque)` - FilmPro = `config.scoring.secteursCibles`
  **verbatim**, LED = `LED_SECTEURS_CIBLES` (secteurs.ts, [À VALIDER PASCAL]). `marque` câblée aux 10 sites qui scorent
  un lead LED (import-liste, action page prospection, enrichir-batch, search-ch, `scoreCandidate` + ses 4 appelants
  searchch/zefix/google-places/import-selected, `recompute-score` qui lit la colonne `marque`, `LeadSlideOut` via
  `data.marqueActive`). **Veille/Signaux laissés FilmPro** (frontière Q2) ; regbl/simap laissés FilmPro (sources
  coupées, métier construction). Garde de couplage LED ajouté (miroir du garde FilmPro).
- **HIGH #1 - Page de validation externe** : le load renvoie `marque` (token-bound, jamais input utilisateur) ;
  logo LED magenta (`/atelier209/ledstudio-magenta.svg`) vs FilmProLogo, « l'équipe {marque} », footer, et teinte
  `[data-marque='led']` locale (la page est hors `.crm-shell`, donc override co-localisé = miroir des tokens app.css).
- **Preuves** : Vitest **2838** (2827 + 11 : LED scoré +3, régression HIGH sans marque = 0, cloisonnement, non-régression
  filmpro ; + garde couplage LED). svelte-check **0/0**. Build **OK**. **QA réelle (base jetable Colima)** : campagne LED
  et FilmPro semées avec token de validation, les deux pages `/validation/<token>` rendues en navigateur - **LED** = logo
  LED + accent magenta + « LED Studio · … », **FilmPro** = logo navy + accent bleu inchangé (non-régression visuelle
  confirmée), 0 erreur console sur l'asset. Revue adversariale sécurité + bugs sur le diff.

## Correctif des 2 divergences gate-free (#3 + bug 2) - LIVRÉ + DÉPLOYÉ le 2026-07-18 (`96dc026`)

Les 2 seules divergences **actionnables sans gate maquette** ont été corrigées, testées, prouvées en
conditions réelles et déployées en prod (smoke vert, deploy Vercel Ready). **Restent 4** : #4/#5/#6 (copies
métier LED, gate maquette + validation mots-clés secteur LED) + bug 1 (à reproduire sur env LED réel).

- **#7 (bug 2 Pascal) - dropdown vide** : `MultiSelectDropdown.svelte` reçoit une prop `emptyLabel` (défaut
  « Aucune option ») + une branche `{:else}` ; `emptyLabel="Aucune campagne"` posé aux 2 sites campagne de
  `prospection/+page.svelte`. Brand-agnostic. Complétude des call sites vérifiée (déterministe) : seul le
  dropdown campagne peut être vide ; Canton/Source (y c. `AlerteModal`) = constantes jamais vides.
- **#3 - logo PDF marque-aware** : `src/lib/pdf/ledstudio-logo.ts` (fragment SVG **verbatim** de
  `static/atelier209/ledstudio-magenta.svg`, 9 tracés + transforms byte-identiques prouvés) + dispatcher
  `src/lib/pdf/marque-logo.ts` ; param `marque: Marque = 'filmpro'` threadé dans `exportListeProspectsPdf`,
  passé `data.marqueActive` aux 2 call sites campagnes. FilmPro = **byte-identique** (test `marqueLogoSvg('filmpro',…)
  === filmproLogoSvg(…)`).
- **Preuves** : Vitest **2847** (+9), svelte-check **0/0**, revue adversariale (workflow 4 lentilles + verify
  indépendant) **0 finding**, QA réelle (dev + Colima) : PDF LED rendu par **svg2pdf réel** (logo magenta net,
  cadre arrondi + glyphes Q + transforms imbriqués OK) + PDF FilmPro inchangé + dropdown vide → « Aucune
  campagne » / peuplé inchangé, tous rendus en vrai navigateur.
- **Reste (Pascal-gated)** : #4/#5/#6 = **maquette copies LED** (secteurs événementiel/enseigne/stand) + valider
  les mots-clés secteur LED de `secteurs.ts` [À VALIDER PASCAL] ; bug 1 = repro sur un env LED réel d'abord.

## Correctif des copies métier LED (#4/#5/#6) - LIVRÉ + DÉPLOYÉ le 2026-07-18 (`ae438e2`)

Maquette de validation des copies LED **validée par Pascal 18/07** (`.atelier-209/parite-copies-led/`,
ouverte dans Chrome). Copies + catégories codées marque-aware, non-régression FilmPro byte-identique, déployées.

- **#5 catégories Google** : `activity-types.ts` marque-aware. `ACTIVITY_TYPES_FILMPRO` (9, verbatim de
  l'ancien) + `ACTIVITY_TYPES_LED` (7 validées : agences événementielles, monteurs de stands, enseignistes,
  com visuelle, retail, archi d'intérieur/scénographes, mot-clé libre) + `ACTIVITY_TYPES_ALL` (union serveur :
  `helpers.ts` résout/valide les clés LED). `activityTypesFor`/`defaultActivityKey`/`gpActivityOptionsFor(marque)`.
- **#4/#6 copies** : nouveau `prospection-copies.ts` (source unique marque-aware, FilmPro **byte-identique** testé).
  `SourceSearchFields` + `ImportModal` reçoivent une prop `marque` : défaut d'activité, placeholders, messages,
  options Google et helper Zefix (reconstruit à l'identique en FilmPro) suivent la marque. `marque` threadée aux
  4 sites de rendu (`EntrepriseSearchModal` ×3 + `ImportModal`). `secteurs.ts` : mots-clés LED validés.
- **Sources FilmPro-only (SIMAP/RegBL/Minergie)** : déjà **coupées en V5** (`isProspectionSourceEnabled` false pour
  les 2 marques) → aucun source-gating à coder ; la matrice de la maquette est déjà satisfaite.
- **Fix revue adversariale (1 CONFIRMED)** : `$effect` re-ancre la clé d'activité sur le défaut de la marque si
  elle sort du jeu à une **bascule à chaud** (`invalidateAll` sans remount) - sinon un select LED garderait une clé
  FilmPro et une recherche partirait avec le mauvais keyword. Miroir du re-ancrage de source existant.
- **Preuves** : Vitest **2860** (+13), svelte-check **0/0**, revue adversariale 4 lentilles (1 CONFIRMED fixé,
  reste réfuté), **QA réelle 2 marques** (7 catégories LED + défaut « Agences événementielles » + placeholders
  « signalétique, stand, enseigne… » rendus en vrai navigateur ; FilmPro inchangé). Smoke prod vert.
- **Reste parité : 2** - **bug 1** (bouton import absent LED) = **repro sur env LED réel** avant tout code ;
  **#8** hero Signaux « vitrage » = **Run 7** (veille LED, déjà en WATCH).

## Ré-audit exhaustif + WP-A/B - LIVRÉ + DÉPLOYÉ le 2026-07-18 (`584e937`)

Le 1er audit de parité était **scopé prospection/campagnes**. Un **ré-audit full-surface** (workflow : 6 zones de
surface visible - dashboard/reporting, entreprises/contacts, pipeline/terrain, campagnes/exports, emails/pages
publiques, chrome/nav - chaque finding refute-vérifié adversarialement, dedup vs les 8 connues + exclusions dures
veille/aide/Découpe) a trouvé **~15 divergences que le 1er audit avait manquées**. Triées en 3 lots :

- **WP-A (mécanique, marqueLabel) - DÉPLOYÉ** : « FilmPro » codé en dur dans des `<title>`/hero résolu par
  `marqueLabel(data.marqueActive)` : titre + sous-titre hero Reporting (`+page.svelte:52,67`, + cadratin→tiret court),
  titre Log (`log/+page.svelte:58`), titre Coûts API (`dashboard/couts/+page.svelte:10`). Byte-identique FilmPro.
- **WP-B (mécanique, teinte échappée) - DÉPLOYÉ** : accents navy FilmPro codés en dur (`#2F5A9E`/rgba(47,90,158),
  `#0A1628`) routés vers le token marque-aware (`var(--color-primary*)` via `color-mix` pour le CSS ; param `accents`
  marque pour le PDF). Cibles : halos KPI Reporting/Coûts (3 composants), **15 tints** sélection/focus des 3 fichiers
  Campagnes, accents du **PDF liste** (pastille Maps + filet d'en-tête, `pdf-liste-prospects.ts` via `marqueAccents(marque)`,
  défaut filmpro = non-régression byte-identique testée), scrim de l'aperçu PDF étiquettes (`--color-primary-dark`).
  FilmPro reste `#2F5A9E`/`#0A1628` ; LED se teinte magenta `#C6007E` / navy LED `#01003B` par `.crm-shell[data-marque='led']`.
- **Preuves** : Vitest **2863** (+3 tests parité PDF : `marqueAccents` filmpro/led + rendu SVG pastille/filet), svelte-check
  **0/0**, build OK. **QA navigateur réelle 2 marques** (base jetable Colima, seed 2 marques) : titres/hero corrects,
  halo Reporting FilmPro `srgb 0.184 0.353 0.620` = `#2F5A9E` **identique** / LED `srgb 0.776 0 0.494` = `#C6007E` magenta ;
  0 casse layout. **Revue adversariale** (workflow 3 lentilles + verify) : **1 LOW** (scrim aperçu étiquettes navy-dark oublié)
  **corrigé** ; reste réfuté. Smoke prod vert (`k29rjd2so` Ready, `/login` 200 « Atelier 209 »).

- **bug 1 - FERMÉ (pas un bug de marque)** : reproduit sur un **vrai env LED peuplé** (Colima + seed 2 marques + session
  premium + cookie `marque=led`). À 1280px, le bouton « Importer une liste » est **visible et géométriquement identique**
  en LED comme en FilmPro (`display:flex`, 173×40, x=822). À 767px il passe `display:none` (`hidden md:inline-flex`)
  **pour les deux marques** → menu overflow « … ». Cause perçue = fenêtre < `md` (ou cache de build), **jamais la marque**.
  Option marque-indépendante parkée (backlog) : surfacer l'import sur mobile (gate mockup).

## WP-C copies métier LED - LIVRÉ + DÉPLOYÉ le 2026-07-18 (`0f27023`)

Maquette (`.atelier-209/parite-copies-led-wp-c/maquette-wp-c.html`) **validée par Pascal dans Chrome** ; #5 corrigé
par Pascal (« exploitants de salles et agences événementielles » au lieu de la 1re proposition). Les 6 copies métier
codées en dur (vitrage/façade/film solaire) sont désormais marque-aware via extension de `prospection-copies.ts`
(SOURCE UNIQUE) :

- **#1/#2 LeadExpress** (saisie rapide) : placeholders entreprise (`Ex : Enseignes Dupond Sàrl`) + note (`Ex : RDV 5 mai
  pose enseigne`). Prop `marque` ajoutée, threadée depuis dashboard + prospection.
- **#3 PipelineQuickAdvance** : placeholder action (`Ex : Envoi devis enseigne lumineuse`). Prop `marque` depuis Entreprises.
- **#4 PhotoGallery** : état vide (`…vue de l'enseigne ou du stand…`). Prop `marque` depuis LeadSlideOut + Entreprises.
- **#5 ImportModal helper Google** : `Idéal pour repérer exploitants de salles et agences événementielles dans un canton.
  Coût : 0 € jusqu'à 900 recherches/mois.` (routé par `activeHelper`, pattern #4).
- **#6 ImportListeModal modèle CSV** : ligne d'exemple `Enseignes Lumino Sàrl,…,Signalétique,…`.

**FilmPro byte-identique** (le helper Google reproduit les mêmes escapes `’`/nbsp/`€` que la source ImportModal - testé
au caractère près). **Preuves** : Vitest **2863**, svelte-check **0/0**, **QA runtime 2 marques** (PhotoGallery rendu réel :
FilmPro « façade ou vitrage » / LED « enseigne ou stand » via la vraie chaîne prospection→LeadSlideOut→PhotoGallery),
0 littéral métier ancien résiduel, tous les sites de montage threadés. Smoke prod vert (deploy Ready, `/login` 200).

**Parité UX/UI LED↔FilmPro = CLOSE hors veille.** Reste **#8** seul : hero Signaux « vitrage » = **Run 7** (veille LED).

---

# Run 7 - Veille LED Studio : CADRAGE VALIDÉ (2026-07-20)

Gate S1 validé par Pascal (« reste validé »). Artefact de relecture : `~/Desktop/cadrage-veille-led-studio.html` (v3, fond noir). Recherche sourcée (web + site ledstudio.ch live + silo `~/Claude/ledstudio.ch` + brochure V3). **Le « Run 7 » = le brief éditorial hebdo (moteur B `intelligence_reports`), PAS le radar signaux d'affaires (moteur A SIMAP/Zefix).**

**Cadrage v1 assumé** (Pascal : « on verra à l'usage ce qui est produit et on recadre si besoin »).

## Principe éditorial (le coeur, validé)

La veille est **éducative et éclairante, PAS une revue de presse**. Elle explique, met en perspective, et fait ressortir les **signaux forts** (opportunité claire, à actionner maintenant) et **signaux faibles** (tendance naissante, à garder à l'oeil). Chaque item répond à « qu'est-ce que ça veut dire, et qu'est-ce qu'on en fait ? », au service des objectifs business. **À inscrire comme critère éditorial dans le prompt de génération LED** (`intelligence/prompt.ts`, `BRAND_PROMPT_CONFIG.led`).

## Modèle produit (validé)

- **Brief hebdomadaire dédié LED**, miroir de FilmPro, monde propre. Mix **~70% business (100% romand) / 30% techno & produits (mondial)**, souple selon l'actu (pas de quota dur).
- **Cadence** : 1/semaine. **Budget** : ~+12-14 CHF/mois (aligné V1). **Zéro nouveau script IA** (moteur réutilisé, rendu marque-paramétrique).

### Volet BUSINESS (70%, romand) - thèmes
Salons/foires + exposants · ouvertures commerces/retail · ouvertures hôtellerie-resto · projets immobiliers commerciaux · événements/inaugurations/congrès · **architectes d'intérieur** (prescripteurs de néons sur leurs projets - activité **secondaire à surveiller**, hors coeur de cible, ajout Pascal 20/07).
Sources clés : **répertoires d'exposants publics** (Palexpo/Automnales, Beaulieu/Habitat-Jardin) + **SHAB/Zefix** (amont) = gisement direct ; calendriers venues (Palexpo, Beaulieu, Forum Fribourg, CERM Martigny, Espace Gruyère ; Polyexpo menacé) ; presse ouverte (RTS, 20min, FashionNetwork, Swiss Retail) + payante titres/chapôs (Le Temps, 24h, TdG, Nouvelliste, ArcInfo, AGEFI, Bilan) ; hôtellerie (GastroSuisse, HTR) ; chantiers (Batimag, Chantiers Magazine, JIM, Implenia).

### Volet TECHNO & PRODUITS (30%, mondial) - 2 AXES (validé)
Élargi (demande Pascal) : pas que les écrans LED, aussi **salon/stand/promotion visuelle**. Ancré sur le **site ledstudio.ch live** (plus à jour que la brochure). Deux axes explicites, sans rigidité, orientés business ; le tri signal fort/faible s'applique aux deux.

**Axe 1 - Veille PRODUITS (l'offre : quoi vendre)** - 3 statuts :
- *Existant (site)* : néons (+ configurateur), enseignes LED, cadres+toiles, écrans LED & affichage digital (mur 1x1, totem, chevalet, cube, sac à dos), stands, comptoirs, photocall, tentes + services (conception/PAO-3D/installation-stockage) + secteurs (resto/événementiel/retail/entreprise).
- *En discussion / à livrer* : **planchers LED / dance floors** (en brochure, absents du site = écart le plus net), lettres boîtier/channel letters, système **cadre alu réutilisable** (beMatrix/Octanorm - ils ont déjà l'alu-lit), configurateur néon interactif.
- *Non existant, à surveiller* : **LED transparente**, all-in-one dvLED, fan holographique, LED créative/courbe, **capture NFC/RFID sur stand**, projection interactive/3D.
- Table des ajouts priorisés **validée par Pascal** (planchers en tête, cadre alu, transparente, COB, NFC/RFID, all-in-one/holo/créative, éco, MicroLED/MIP=futur, MiniLED=hors scope).

**Axe 2 - Veille TECHNO & outils (avec quoi / comment)** :
- Packaging/densité : COB (mainstream), MIP (émergent), GOB (protection), SMD (base), MicroLED émissif (futur), MiniLED (hors scope=TV).
- Énergie & durabilité : common cathode (-30/-50%), carbone (**myclimate**), réutilisabilité = **passé de marketing à réglementaire** (Messe Frankfurt reporting déchets janv. 2026 ; IFEMA 100% recyclable 2027) = signal fort ESG.
- Impression/matériaux : UV, latex bas-COV, dye-sub textile.
- Pilotage & IA : Novastar (standard contrôle), Colorlight ; IA contenu/pilotage signalétique (dominant salons 2026).
- Interaction/expérientiel (outils) : projection mapping, AR/VR, tactile. Filtrer hype PME (AR hybride, avatars IA, Glambot).

Sources : invidis, LEDinside, AV Interactive, Graphiline ; salons EuroShop, FESPA/European Sign Expo, C!Print, Heavent + ISE/ISLE/InfoComm/DSS.

### Volet CONCURRENTIEL (dans les 30%)
Réutilise le **panel benchmark UX/UI (28 sites)** du silo ledstudio (`memory/benchmark-ux.md`) comme radar concurrentiel produits/offres/tunnels + **ratisser plus large** (studios internationaux via invidis/salons, concurrents romands, fabricants asiatiques 6-12 mois d'avance). Concurrents de proximité explicités par Pascal : **idneon.ch, vimineon.ch, adp-enseignes.com**. Étalons : logoenseigne.fr, sygns.com, digilor.fr.

## Destinataires (validé) - dynamiques par domaine
Brief FilmPro → users CRM `@filmpro.ch` ; brief LED → users CRM `@ledstudio.ch` + `@lamaisoncreativedirection.ch` (domaine **connu**, = domaine de login des rôles, cf. §148-152). **Aucun user `@ledstudio.ch` enregistré aujourd'hui** : mécanisme prêt, envoi dès qu'un compte au bon domaine existe. Seul point ouvert = enregistrer les users LED.

## Décision Zefix (validé) - correction d'une généralisation abusive
« Radar SIMAP/Zefix reste FilmPro-only » était faux pour Zefix. **SIMAP reste FilmPro** (appels d'offres construction). **Zefix devient marque-aware** (créations d'entreprise = neutre → nouveaux commerces = prospects enseigne LED, filtrés par mots-clés secteur LED). Petit lot distinct du brief éditorial (`SIGNAUX_ZEFIX_ENABLED` + mots-clés LED + `signaux_affaires.marque`).

## Points d'extension technique (spec Phase 2, prêts, file:line)
4 tables à rendre marque-aware (`veille_sources`, `veille_themes`, `signaux_mots_cles`, `intelligence_reports` : colonne `marque` + unicité composite, sinon la veille LED écrase FilmPro sur `onConflict: week_label`) ; loaders/repositories filtrés marque ; prompt `intelligence/prompt.ts` (100% FilmPro → `BRAND_PROMPT_CONFIG` par marque) ; `run-generation.ts` + `run-veille.ts --marque led` + 2e job (ou matrice) dans `.github/workflows/cron-veille.yml` ; UI `crm/veille/**` filtrée `locals.marque` ; renommer `impacts_filmpro`/`filmpro_relevance` en neutre + neutraliser enum `compliance_tag 'OK FilmPro'` (testé en dur dans `scoring.ts` `SIGNAL_VEILLE_SCORING`). FilmPro intact par `DEFAULT 'filmpro'` + fallback seed FilmPro. Estimation build : ~2-3 sessions + lot Zefix.

## ICP + deux lentilles (validé Pascal 2026-07-20, via test de veille)

- **ICP prospection = petits commerçants / artisans / indépendants / restaurateurs romands.** Les **grandes enseignes nationales/internationales sont EXCLUES** (Sézane, Media Markt, Apple, Sephora… : elles ont déjà des contrats fournisseurs, difficiles à accrocher ; LED Studio est dans l'artisanat à ce stade). Le scoring/prompt LED doit privilégier ce profil.
- **DEUX lentilles distinctes, à ne pas confondre dans le scoring** : (1) **volet prospection** (business romand, ICP petits commerçants) où un signal se juge sur « est-ce un prospect actionnable » ; (2) **volet veille techno/tendance** (mondial, éducatif) où les acteurs sont des salons internationaux et des fabricants (EuroShop, FESPA, Samsung…) - ce sont des **signaux de fond, PAS des prospects**, et ne doivent PAS être pénalisés comme « hors ICP ». Le prompt LED doit porter les deux régimes.

## Anti-hallucination : VALIDÉ (audit code + test réel 2026-07-20)

- **Audit code** : le filtre existe et est solide - 2e passage LLM externe (Sonnet 4.6) qui **refetche la page source** et vérifie faits/chiffres/dates/citations verbatim ; gate dur `facts_ok=false` → item **supprimé** ; URLs ancrées au web_search (jamais fabriquées) ; trust-by-source (dead_page conservée+marquée, domaine inconnu→strict, toxique→rejeté) ; ~1145 lignes de tests. Angles morts documentés/assumés (source qui ment sur sa page ; mode confiance sur absence ; extracteur texte grossier). La veille LED **hérite ce filtre** (moteur partagé).
- **Test réel de la discipline** : un fact-check adversarial (workflow, 10 agents refetch source) sur mon édition de test hand-built a trouvé **9 signaux/10 avec au moins un fait inventé/non sourcé** (ex : « 420 exposants » Foire du Valais inexistant ; invités d'honneur Goûts et Terroirs faux = Swissmilk+Arménie et non Liechtenstein ; « +4,9% » T1 2026 non confirmé ; « architecture d'intérieur » absent de la source espazium ; claims LED transparente/pliable non sourcés). **Leçon** : la génération LLM (même en session) hallucine facilement → le cross-check du moteur n'est pas optionnel, c'est lui qui rattrape ça avant publication. Édition de test corrigée (faits re-vérifiés) : `~/Desktop/veille-ledstudio-edition-test.html`.

## Format de rendu (golden validé au test)

L'édition LED se rend au **format éditorial golden** de la veille (répliqué depuis `/crm/veille/[id]/+page.svelte`), branché LED (navy `#01003B`, magenta `#C6007E`, logo LED verbatim blanc sur hero). **Export PDF conforme** : synthèse page 1, puis 1 article par page (CSS `break-before:page` + `break-inside:avoid`, `.sec-head + .item` sans saut), jamais de coupure au milieu d'un article.
