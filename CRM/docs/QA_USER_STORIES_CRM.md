# QA - User stories & parcours utilisateurs (CRM FilmPro)

> **But** : référentiel exhaustif des parcours utilisateurs couvrant 100 % des fonctionnalités du CRM FilmPro. Ce fichier est l'**entrée** de la session de test agents (prochaine session) qui vérifiera, en profondeur, que l'UX/UI est totalement fonctionnelle. Chaque story est testable, avec données exactes, résultat attendu et critères binaires.
>
> **Rédigé** : 2026-06-07. Source : inventaire code exhaustif (5 agents Explore, fichier:ligne cités). **Lecture seule lors de la rédaction (aucune modification du code).**

---

## 0. Mode d'emploi (pour la session de test)

### Périmètre couvert
- Authentification & accès (login OTP, garde de session, expiration, restriction domaine).
- Portail d'accueil (`/`) + navigation/layout CRM.
- 11 pages CRM : Dashboard, Contacts, Entreprises, Pipeline, Prospection, Signaux, Veille (4 sous-pages), Reporting, Coûts API, Aide, Log.
- Outil terrain mobile (`/terrain` : accueil, recherche, fiche entreprise, compte-rendu de visite, brouillon contact).
- Endpoints API transverses (export, photos, visits, contact-suggestions, recherche entreprises).
- **Régressions bugs connus** (§16, dont suppression entreprise impossible).
- **Régressions désactivations V5** (§17 : ce qui DOIT être coupé/403/masqué).
- **Anomalies & dette détectées à vérifier** (§18).

**Hors périmètre CRM** (outil distinct, déjà blindé fuzzing+golden) : Découpe Films (`/decoupe`). À tester séparément si besoin.

### Rôles
- **Fondateur** (rôle unique mono-tenant) : tout utilisateur dont l'email passe l'allowlist `@filmpro.ch`. RLS « plate » : tout authentifié voit/modifie tout (`hooks.server.ts:84-103`, `isEmailAllowed` `lib/server/auth.ts:6`).
- **Admin** = `pascal@filmpro.ch` **en dur** (`lib/feedback/admin.ts:5`, `isAdminEmail`). Seuls droits supplémentaires réels :
  - Log : changer statut, éditer notes admin, exporter (`crm/log/+page.server.ts:87,108` + bouton export `+page.svelte:109`).
  - Signaux : ajouter/supprimer un mot-clé (`crm/signaux/+page.server.ts:105,153`).
  - Toutes les autres pages traitent les 3 fondateurs symétriquement (aucune action admin-only).

### Feature flags (JWT `app_metadata`, valeur stricte `=== true`, défaut OFF)
| Flag | Effet | Réf |
|---|---|---|
| `ff_crm_mobile_v2` (`ffCrmMobileV2`) | Cartes mobiles + masque table < 1024px (Entreprises, Contacts, Pipeline) | `feature-flags.ts:32` |
| `ff_crm_mobile_v3` (`ffCrmMobileV3`) | Garde d'accès au shell `/terrain` (OFF -> redirect `/crm`) | `terrain/+layout.server.ts:10-15` |
| `ff_decoupe` (`ffDecoupe`) | Card Découpe active/`soon` + accès `/decoupe` | `(portail)/+page.svelte:12` |

> Pour tester le terrain et les cartes mobiles : activer les flags via UPDATE SQL sur `auth.users.raw_app_meta_data` pour le compte de test (`feature-flags.ts:5-6`).

### Environnement de test recommandé
- **Session authentifiée sans brûler l'OTP** : `tests/mint-session.mjs` (`admin.generateLink` -> `verifyOtp` -> cookies `@supabase/ssr` -> `storageState` gitignoré). Réf mémoire `feedback_test_session_otp_free_mint.md`.
- **Préchauffer le serveur dev** (curl des routes) avant Playwright pour éviter le timeout `networkidle` à froid. Réf `feedback_e2e_warm_devserver_before_playwright.md`.
- **Données éphémères** : créer/purger dans un `finally` ; ne pas polluer la prod. Tester en preview branche Vercel pour les composants qui touchent `window` (bug `onDestroy` SSR ne reproduit pas en `vite preview`).
- **Mobile / terrain** : Chrome DevTools Device Toolbar **manuel** obligatoire (Pascal) ; Playwright `viewport` seul interdit comme substitut, preset `devices['iPhone 14 Pro Max']` OK pour findings objectifs uniquement (`tests/mobile.spec.ts`, mémoire `feedback_crm_mobile_testing_devtools.md`).

### Format d'une story
```
#### US-XXX-NN - Titre
- Rôle / préconditions
- Parcours (étapes + données exactes)
- Attendu
- Critères (binaires, à cocher)
- Réf code (fichier:ligne)
```
Champ **Statut test** à remplir la prochaine session : ✅ OK / ❌ KO / ⚠️ partiel / ⬜ non testé. Défaut : ⬜.

> **Convention des réfs code** : les chemins `fichier:ligne` sont relatifs à la racine `CRM/` ; les fichiers `src/` sont parfois cités en forme abrégée (ex. `schemas.ts` = `src/lib/schemas.ts`, `+page.server.ts` = sous `src/routes/...`). Vérifier le chemin complet avant tout fix.

### Légende sévérité (pour reporter un KO)
C = bloquant (page inutilisable/données perdues/sécu) · H = régression UX visible/a11y serious · M = micro-bug/edge case · L = polish · I = info.

---

## 1. Authentification & accès (US-AUTH)

#### US-AUTH-01 - Recevoir un code OTP avec un email autorisé
- Rôle : visiteur non connecté. Précondition : email `@filmpro.ch` valide.
- Parcours : aller sur `/login` -> saisir `prenom@filmpro.ch` -> cliquer « Recevoir le code ».
- Attendu : l'écran bascule sur l'étape « saisie code 6 chiffres », email rappelé.
- Critères : [ ] bascule étape 2 ; [ ] email affiché ; [ ] pas d'erreur.
- Réf : `login/+page.server.ts:11-32`, `+page.svelte:32-36,122-148`.

#### US-AUTH-02 - Refus d'un email hors domaine
- Précondition : email hors allowlist (ex. `test@gmail.com`).
- Parcours : `/login` -> saisir l'email -> « Recevoir le code ».
- Attendu : erreur 403 « Seules les adresses @filmpro.ch sont acceptées », reste à l'étape 1.
- Critères : [ ] message 403 exact ; [ ] pas d'envoi OTP ; [ ] reste étape 1.
- Réf : `login/+page.server.ts:17-19`, `lib/server/auth.ts:6-23`.

#### US-AUTH-03 - Email vide
- Parcours : `/login` -> « Recevoir le code » sans saisir.
- Attendu : bouton désactivé (vide) ; si forcé, `fail(400)` « Adresse email requise ».
- Critères : [ ] bouton disabled si vide ; [ ] message 400 si soumission forcée.
- Réf : `login/+page.server.ts:13-15`, `+page.svelte:139-146`.

#### US-AUTH-04 - Saisir le bon code et se connecter
- Précondition : OTP reçu (ou session mintée).
- Parcours : saisir le code 6 chiffres -> « Se connecter ».
- Attendu : redirection vers `/` (portail), cookie `login_at` posé (httpOnly, 7 jours).
- Critères : [ ] redirection `/` ; [ ] cookie `login_at` présent ; [ ] session active.
- Réf : `login/+page.server.ts:40-72`, `+page.svelte:37-40`.

#### US-AUTH-05 - Code incorrect / expiré
- Parcours : saisir un code faux (ex. `000000`) -> « Se connecter ».
- Attendu : « Code incorrect » (ou « Code expiré. Demandez un nouveau code. » si expiré), reste étape 2.
- Critères : [ ] message distinct selon cas ; [ ] `codeSent` conservé ; [ ] pas de connexion.
- Réf : `login/+page.server.ts:55-61`.

#### US-AUTH-06 - Format de code invalide
- Parcours : saisir `12ab` ou `1234567`.
- Attendu : bouton désactivé tant que `length !== 6` ; si forcé, `fail(400)` « Le code doit contenir 6 chiffres ».
- Critères : [ ] bouton disabled ; [ ] regex `^\d{6}$` appliquée serveur.
- Réf : `login/+page.server.ts:44-46`, `+page.svelte:84-102`.

#### US-AUTH-07 - Changer d'adresse email
- Parcours : à l'étape 2, cliquer « Changer d'adresse email ».
- Attendu : retour à l'étape 1, champ email réinitialisé.
- Critères : [ ] retour étape 1 ; [ ] état reset.
- Réf : `login/+page.svelte:112-118,43-48`.

#### US-AUTH-08 - Trop de tentatives (rate limit)
- Parcours : répéter « Recevoir le code » en rafale.
- Attendu : `fail(429)` « Trop de tentatives » (rate limit Supabase) + rate limiter global 10/min/IP.
- Critères : [ ] message 429 ; [ ] pas de crash.
- Réf : `login/+page.server.ts:25-27`, `hooks.server.ts:15,61-68`.

#### US-AUTH-09 - Accès direct à une URL protégée sans session
- Parcours (non connecté) : ouvrir `/crm/entreprises` directement.
- Attendu : redirect 303 vers `/login`.
- Critères : [ ] redirection `/login` ; [ ] pas de fuite de contenu.
- Réf : `hooks.server.ts:92-94`.

#### US-AUTH-10 - Session expirée (> 7 jours)
- Précondition : cookie `login_at` antérieur à 7 jours (simuler).
- Parcours : naviguer vers une page CRM.
- Attendu : cookie supprimé + signOut + redirect `/login?error=expired`, message « session expirée ».
- Critères : [ ] redirection avec `?error=expired` ; [ ] message FR affiché.
- Réf : `hooks.server.ts:106-113`, `login/+page.svelte:20-29`.

#### US-AUTH-11 - Email retiré de l'allowlist après login
- Précondition : user connecté dont l'email n'est plus autorisé.
- Parcours : prochain hit sur une route protégée.
- Attendu : signOut forcé + redirect `/login?error=unauthorized`.
- Critères : [ ] signOut ; [ ] `?error=unauthorized`.
- Réf : `hooks.server.ts:97-103`.

#### US-AUTH-12 - Déjà connecté visite /login
- Parcours (connecté) : ouvrir `/login`.
- Attendu : redirect 303 vers `/`.
- Critères : [ ] redirection `/`.
- Réf : `hooks.server.ts:115-118`.

#### US-AUTH-13 - Callback magic link / PKCE
- Parcours : ouvrir `/auth/callback?token_hash=...&type=email` (ou `?code=...`).
- Attendu : session posée + redirect `/` ; en erreur, redirect `/login?error=callback&detail=...` (detail sanitizé).
- Critères : [ ] succès -> `/` ; [ ] erreur -> `?error=callback` ; [ ] detail tronqué/sanitizé.
- Réf : `auth/callback/+server.ts:9-49`.

#### US-AUTH-14 - Déconnexion
- Parcours (connecté, portail) : cliquer « Déconnexion » dans le `PortailHeader`.
- Attendu : `signOut()` + redirection `/login`.
- Critères : [ ] session détruite ; [ ] retour `/login` ; [ ] re-accès protégé impossible.
- Réf : `PortailHeader.svelte:26-29,40`. **Note** : le shell `/terrain` n'a PAS de bouton déconnexion (à vérifier comme limitation, voir ANO).

---

## 2. Portail d'accueil (US-PORT)

#### US-PORT-01 - Affichage des cards outils
- Parcours (connecté) : ouvrir `/`.
- Attendu : titre « Bonjour, par où commencer ? », card CRM active (`/crm`), footer signature « FilmPro - Traitements pour vitrage - Suisse romande ».
- Critères : [ ] card CRM cliquable ; [ ] titre + footer présents.
- Réf : `(portail)/+page.svelte:20-39,63-65`.

#### US-PORT-02 - Card Découpe selon flag
- Parcours : ouvrir `/` avec `ff_decoupe` OFF puis ON.
- Attendu : OFF -> card « Découpe Films » état `soon` (badge « bientôt »), non cliquable ; ON -> card active `href=/decoupe`.
- Critères : [ ] OFF = soon non cliquable ; [ ] ON = active ; [ ] ariaLabel adapté.
- Réf : `(portail)/+page.svelte:12,41-59`.

#### US-PORT-03 - Header portail (logo, avatar, responsive)
- Parcours : ouvrir `/`, observer le header ; rétrécir < 640px puis < 380px.
- Attendu : logo cliquable -> `/` ; avatar à initiales (2 lettres de l'email) ; logo réduit < 640px ; avatar masqué < 380px.
- Critères : [ ] logo -> `/` ; [ ] initiales correctes ; [ ] responsive aux 2 seuils.
- Réf : `PortailHeader.svelte:19-24,34,141-164`.

---

## 3. Navigation & layout CRM (US-NAV)

#### US-NAV-01 - Ordre et liens du menu primaire
- Parcours (connecté) : ouvrir `/crm`, observer la sidebar.
- Attendu : 8 items dans l'ordre Dashboard, Contacts, Entreprises, Pipeline, Prospection, Signaux, Veille Sectorielle, Reporting ; chacun navigue vers sa route.
- Critères : [ ] 8 items dans l'ordre ; [ ] navigation OK ; [ ] icône par item.
- Réf : `config.ts:206-247`, `Sidebar.svelte:51-74`.

#### US-NAV-02 - Menu secondaire (Log, Aide, Coûts API)
- Attendu : Log (`external` _blank, `desktopOnly` masqué < 1023px), Aide (`external` _blank), Coûts API (`/crm/dashboard/couts`).
- Critères : [ ] Log ouvre nouvel onglet ; [ ] Log masqué en mobile ; [ ] Aide nouvel onglet ; [ ] Coûts navigue.
- Réf : `config.ts:248-267`, `Sidebar.svelte:78-100,128-132`.

#### US-NAV-03 - Item actif (aria-current)
- Parcours : naviguer entre pages.
- Attendu : item courant surligné `aria-current="page"` ; Dashboard match exact, autres `startsWith`.
- Critères : [ ] surlignage correct ; [ ] Dashboard pas surligné sur sous-routes.
- Réf : `Sidebar.svelte:12-17`.

#### US-NAV-04 - Badge « non lu » Veille
- Précondition : >= 1 édition veille publiée non lue par l'utilisateur.
- Attendu : badge numérique (warning) sur l'item Veille ; disparaît après lecture.
- Critères : [ ] badge = nombre non lus ; [ ] mise à jour après lecture d'une édition.
- Réf : `+layout.server.ts:13-32`, `Sidebar.svelte:63-72`.

#### US-NAV-05 - Réduire / étendre la sidebar
- Parcours : cliquer le bouton chevron.
- Attendu : bascule collapsed/expanded.
- Critères : [ ] toggle visuel ; [ ] icônes restent lisibles collapsed.
- Réf : `Sidebar.svelte:102-110`.

#### US-NAV-06 - Logo retour portail
- Parcours : cliquer le logo dans la sidebar.
- Attendu : navigation vers `/` (hors CRM).
- Critères : [ ] arrive sur le portail.
- Réf : `Sidebar.svelte:31-48`.

#### US-NAV-07 - Déconnexion depuis le CRM
- Parcours : cliquer « Déconnexion » dans la sidebar.
- Attendu : `signOut()` + `window.location.href='/login'`.
- Critères : [ ] session détruite ; [ ] retour login.
- Réf : `Sidebar.svelte:112-121,19-22`.

#### US-NAV-08 - Menu mobile (burger)
- Parcours (viewport < 1024px) : ouvrir le burger du Header.
- Attendu : overlay + slide-in sidebar ; fermeture auto sur navigation et clic lien.
- Critères : [ ] overlay s'ouvre ; [ ] ferme après clic lien ; [ ] titre de page correct.
- Réf : `Header.svelte:23-31`, `+layout.svelte:33-57`.

#### US-NAV-09 - Bouton feedback global présent partout
- Parcours : sur n'importe quelle page CRM, repérer le bouton feedback flottant.
- Attendu : bouton présent, ouvre un modal (accessible à tous).
- Critères : [ ] bouton visible ; [ ] modal s'ouvre.
- Réf : `+layout.svelte:72`, `FeedbackButton.svelte:12,29`.

---

## 4. Dashboard CRM / Home (US-DASH)

#### US-DASH-01 - Affichage des 6 sections bento
- Parcours : ouvrir `/crm`.
- Attendu : greeting personnalisé (prénom dérivé email), KPIs (triage/signaux/relances), TriageQueue, duo Activité+Relances, AlertesStrip (masquée si 0 signal & 0 alerte), QuickActionsFooter.
- Critères : [ ] greeting prénom ; [ ] 4 KPIs ; [ ] TriageQueue ; [ ] AlertesStrip conditionnelle.
- Réf : `crm/+page.svelte:53-115`, `+page.server.ts:28-54`.

#### US-DASH-02 - KPIs corrects
- Précondition : jeu de données connu (N contacts, M entreprises, etc.).
- Attendu : compteurs = contacts non archivés, entreprises, opportunités, signaux `nouveau`.
- Critères : [ ] chaque KPI = valeur DB attendue.
- Réf : `crm/+page.server.ts:28-35`.

#### US-DASH-03 - File de triage (leads chauds)
- Précondition : leads `nouveau` avec `score_pertinence >= 5`, non snoozés.
- Attendu : leads triés score DESC puis date DESC, cap 25.
- Critères : [ ] tri correct ; [ ] cap 25 ; [ ] snoozés exclus.
- Réf : `crm/+page.server.ts:18-26`.

#### US-DASH-04 - Ouvrir un lead depuis le triage (slide-out)
- Parcours : cliquer un lead de la TriageQueue.
- Attendu : `LeadSlideOut` s'ouvre sans changer de page.
- Critères : [ ] slide-out ouvre ; [ ] URL inchangée.
- Réf : `crm/+page.svelte:33-36,94`.

#### US-DASH-05 - Nouveau lead express (mobile/tablette)
- Parcours (viewport < lg) : cliquer « Nouveau lead express ».
- Attendu : composant `LeadExpress` s'ouvre (redirect après création).
- Critères : [ ] modal ouvre ; [ ] création -> redirection.
- Réf : `crm/+page.svelte:76-90,117`.

#### US-DASH-06 - Relances en retard
- Précondition : opportunités `date_relance_prevue <= today`, non closes.
- Attendu : liste limitée à 10, deals clos exclus.
- Critères : [ ] clos exclus ; [ ] limit 10 ; [ ] tri asc.
- Réf : `crm/+page.server.ts:36-41`.

#### US-DASH-07 - Dégradation gracieuse si migration triage absente
- Précondition : colonne `triage_snoozed_until` manquante (cas dégradé).
- Attendu : dashboard ne casse pas, queue vide, erreur loggée serveur.
- Critères : [ ] page rendue ; [ ] `triageLeads=[]` ; [ ] pas de 500.
- Réf : `crm/+page.server.ts:59-63`.

---

## 5. Entreprises (US-ENT)

> CRUD complet. **Bug prod suppression** traité en §16 (REG-01).

#### US-ENT-01 - Lister les entreprises (vue table)
- Parcours : ouvrir `/crm/entreprises`.
- Attendu : table 6 colonnes (logo, raison sociale, secteur, canton, contacts, statut), tri sur colonnes sortable, tri par défaut date modif DESC.
- Critères : [ ] colonnes présentes ; [ ] tri fonctionne ; [ ] logos ou fallback initiale.
- Réf : `entreprises/+page.svelte:265-306,214-221`, `+page.server.ts:17-49`.

#### US-ENT-02 - Basculer table / cards
- Parcours : cliquer le toggle vue.
- Attendu : bascule cards <-> table, persistée en localStorage (survit au reload).
- Critères : [ ] bascule ; [ ] persistance après reload.
- Réf : `entreprises/+page.svelte:245-247,68-74`.

#### US-ENT-03 - Filtrer par onglet
- Parcours : cliquer Toutes / Qualifiées / À qualifier / Sans contact.
- Attendu : la liste filtre, les compteurs d'onglet sont corrects.
- Critères : [ ] chaque onglet filtre ; [ ] counts justes ; [ ] empty message contextuel si vide.
- Réf : `entreprises/+page.svelte:234-249,95-102`.

#### US-ENT-04 - Recherche texte
- Parcours : saisir un terme (raison sociale / secteur / canton).
- Attendu : filtrage client en direct.
- Critères : [ ] filtre live ; [ ] empty si 0 résultat.
- Réf : `entreprises/+page.svelte:238-243,104-112`.

#### US-ENT-05 - Ouvrir la fiche (SlideOut détail)
- Parcours : cliquer une ligne / carte.
- Attendu : SlideOut s'ouvre (coordonnées, contacts, opportunités, photos, visites, lien Maps, site web).
- Critères : [ ] slide-out ouvre ; [ ] données cohérentes.
- Réf : `entreprises/+page.svelte:328-511,138-141`.

#### US-ENT-06 - Créer une entreprise
- Parcours : « Ajouter » (header ou FAB) -> remplir raison sociale = `Test Vitrage SA`, canton = `VD` -> Enregistrer.
- Attendu : toast « Entreprise créée », statut `nouveau`, apparaît dans la liste.
- Critères : [ ] toast succès ; [ ] présente après reload ; [ ] statut `nouveau`.
- Réf : `entreprises/+page.svelte:514-533`, `+page.server.ts:52-63`.

#### US-ENT-07 - Éditer une entreprise
- Parcours : SlideOut -> « Modifier » -> changer le secteur -> Enregistrer.
- Attendu : toast « Entreprise modifiée », valeur mise à jour.
- Critères : [ ] toast succès ; [ ] modification persistée.
- Réf : `entreprises/+page.svelte:450-456`, `+page.server.ts:65-77`.

#### US-ENT-08 - Enrichir via Zefix
- Parcours : SlideOut -> « Enrichir » sur une entreprise avec raison sociale reconnue.
- Attendu : IDE/canton/adresse/purpose remplis ; `notes_libres` réécrit **uniquement si vide** (préservation saisie).
- Critères : [ ] champs enrichis ; [ ] notes existantes préservées ; [ ] échec propre si credentials absents.
- Réf : `entreprises/+page.server.ts:105-168`. **Note** : l'enrichissement manuel Zefix n'est PAS coupé par le flag V5 `SIGNAUX_ZEFIX_ENABLED` (qui ne vise que le cron).

#### US-ENT-09 - Lien Google Maps & site web
- Parcours : SlideOut -> cliquer « Voir sur Google Maps » et le lien site.
- Attendu : ouverture nouvel onglet vers Maps / site.
- Critères : [ ] Maps ouvre ; [ ] site ouvre ; [ ] `_blank`.
- Réf : `entreprises/+page.svelte:371-384`.

#### US-ENT-10 - Empty state global
- Précondition : aucune entreprise.
- Attendu : EmptyState avec CTA création.
- Critères : [ ] empty affiché ; [ ] CTA fonctionnel.
- Réf : `entreprises/+page.svelte:257-264`.

#### US-ENT-11 - Photos dans la fiche (galerie)
- Parcours : SlideOut -> ajouter une photo (< 5 Mo, image valide) puis la supprimer.
- Attendu : upload OK (URL signée), cap 10 photos (au-delà : 409), suppression OK.
- Critères : [ ] upload ; [ ] refus > 5 Mo (413) ; [ ] refus 11e photo (409) ; [ ] suppression.
- Réf : `api/photos/+server.ts:88-169`, `api/photos/[id]/+server.ts`.

#### US-ENT-12 - Vue cards forcée en mobile (flag V2)
- Précondition : `ff_crm_mobile_v2` ON, viewport < 1024px.
- Attendu : vue cards forcée, toggle masqué.
- Critères : [ ] cards forcées ; [ ] toggle absent.
- Réf : `entreprises/+page.svelte:79-90,245`.

---

## 6. Contacts (US-CON)

> « Suppression » = **archivage (soft-delete)**, pas de hard-delete contact.

#### US-CON-01 - Lister les contacts
- Parcours : ouvrir `/crm/contacts`.
- Attendu : table 8 colonnes, contacts archivés exclus (`statut_archive=false`), tri par défaut date modif DESC.
- Critères : [ ] colonnes ; [ ] archivés exclus ; [ ] tri.
- Réf : `contacts/+page.server.ts:8-26`, `+page.svelte:349-372`.

#### US-CON-02 - Filtrer par onglet
- Parcours : Tous / Prescripteurs / À qualifier / Sans entreprise.
- Attendu : filtrage + compteurs corrects + empty message contextuel (4 messages).
- Critères : [ ] chaque onglet filtre ; [ ] counts ; [ ] empty message juste.
- Réf : `contacts/+page.svelte:302,73-81,174-186`.

#### US-CON-03 - Créer un contact avec entreprise existante (autocomplete)
- Parcours : « Ajouter » -> nom `Jean Test` -> taper le début d'une entreprise existante -> sélectionner la suggestion -> Enregistrer.
- Attendu : `entreprise_id` fixé, toast « Contact créé ».
- Critères : [ ] autocomplete renvoie des résultats (>= 2 chars, debounce 250ms) ; [ ] sélection fixe l'id ; [ ] toast.
- Réf : `contacts/+page.svelte:570-616,83-124`, `+page.server.ts:29-48`.

#### US-CON-04 - Créer un contact avec entreprise nouvelle (auto-création)
- Parcours : « Ajouter » -> nom `Marie Test` -> saisir une entreprise inexistante `Nouvelle Vitre Sàrl` SANS sélectionner de suggestion -> Enregistrer.
- Attendu : hint « sera créée automatiquement » affiché ; à l'enregistrement, l'entreprise est créée (dédup anti-race) et liée.
- Critères : [ ] hint affiché ; [ ] entreprise créée ; [ ] contact lié.
- Réf : `contacts/+page.svelte:618-631`, `referentiel/entreprises.ts:73-108`.

#### US-CON-05 - Anti-race autocomplete
- Parcours : taper vite plusieurs lettres successives.
- Attendu : seule la dernière réponse pertinente s'affiche (jeton `searchSeq` invalide les obsolètes).
- Critères : [ ] pas de résultats périmés affichés.
- Réf : `contacts/+page.svelte:68-108`.

#### US-CON-06 - Éditer un contact
- Parcours : SlideOut -> « Modifier » -> changer la fonction -> Enregistrer.
- Attendu : toast « Contact modifié », valeur à jour.
- Critères : [ ] toast ; [ ] persistance.
- Réf : `contacts/+page.svelte:480-486`, `+page.server.ts:50-69`.

#### US-CON-07 - Archiver un contact
- Parcours : SlideOut -> « Archiver » -> confirmer.
- Attendu : toast « Contact archivé », disparaît de la liste (UPDATE `statut_archive=true`, pas de DELETE).
- Critères : [ ] toast ; [ ] absent après reload ; [ ] aucune FK violée (soft-delete).
- Réf : `contacts/+page.svelte:487-530`, `+page.server.ts:71-82`.

#### US-CON-08 - Actions rapides carte mobile (appeler / email)
- Précondition : `ff_crm_mobile_v2` ON, viewport < 1024px.
- Parcours : sur une carte mobile, taper « Appeler » puis « Email ».
- Attendu : lien `tel:` / `mailto:` déclenché.
- Critères : [ ] `tel:` ; [ ] `mailto:`.
- Réf : `contacts/+page.svelte:270-285`.

#### US-CON-09 - File de suggestions terrain à valider
- Précondition : >= 1 brouillon `contact_suggestions` en attente.
- Parcours : ouvrir Contacts, repérer `ContactSuggestionQueue`.
- Attendu : la file affiche les brouillons ; résolution crée/fusionne un contact.
- Critères : [ ] file visible ; [ ] résolution crée le contact ; [ ] double-clic géré (409).
- Réf : `contacts/+page.svelte:300`, `api/contact-suggestions/[id]/resolve/+server.ts`.

#### US-CON-10 - Empty state global
- Précondition : aucun contact.
- Attendu : EmptyState.
- Critères : [ ] empty affiché.
- Réf : `contacts/+page.svelte:311-320`.

---

## 7. Pipeline (US-PIPE)

#### US-PIPE-01 - Vue kanban + onglets
- Parcours : ouvrir `/crm/pipeline`.
- Attendu : colonnes par étape ; onglets `en-cours` (4 col), `closed` (2 col), `toutes` (6 col) ; indicateurs (count actif + valeur).
- Critères : [ ] colonnes selon onglet ; [ ] indicateurs corrects.
- Réf : `pipeline/+page.svelte:276,287-306,532-541`.

#### US-PIPE-02 - Créer une opportunité
- Parcours : « Nouvelle opportunité » -> titre `Devis Vitrage Test`, entreprise, montant -> Enregistrer.
- Attendu : toast succès, carte en étape `identification` par défaut.
- Critères : [ ] toast ; [ ] carte créée étape identification.
- Réf : `pipeline/+page.svelte:444-457`, `+page.server.ts:46-70`.

#### US-PIPE-03 - Créer dans une colonne précise
- Parcours : cliquer « + » dans la colonne « qualification ».
- Attendu : modal pré-rempli sur l'étape `qualification`.
- Critères : [ ] étape pré-remplie.
- Réf : `pipeline/+page.svelte:303`.

#### US-PIPE-04 - Drag & drop entre étapes
- Parcours : glisser une carte d'« identification » vers « proposition ».
- Attendu : `etape_pipeline` mis à jour (form `?/move`), toast, feedback visuel pendant le drag.
- Critères : [ ] étape persistée ; [ ] toast ; [ ] drop d'id inconnu ignoré silencieusement.
- Réf : `pipeline/+page.svelte:208-260`, `+page.server.ts:96-110`.

#### US-PIPE-05 - Éditer une opportunité
- Parcours : carte -> SlideOut -> « Modifier » -> changer montant -> Enregistrer.
- Attendu : toast, valeur à jour.
- Critères : [ ] toast ; [ ] persistance.
- Réf : `pipeline/+page.svelte:398`, `+page.server.ts:72-94`.

#### US-PIPE-06 - Marquer perdu
- Parcours : SlideOut -> « Marquer perdu » -> saisir un motif -> confirmer.
- Attendu : étape `perdu`, motif + date de clôture enregistrés.
- Critères : [ ] étape perdu ; [ ] motif sauvegardé ; [ ] date clôture.
- Réf : `pipeline/+page.svelte:404-432,508-519`, `+page.server.ts:112-129`.

#### US-PIPE-07 - Accordéon mobile (flag V2)
- Précondition : `ff_crm_mobile_v2` ON, viewport < 1024px.
- Attendu : `PipelineMobileAccordion` au lieu du kanban.
- Critères : [ ] accordéon affiché ; [ ] actions disponibles.
- Réf : `pipeline/+page.svelte:117-119,284-285`.

#### US-PIPE-08 - Lignes opportunités invalides écartées
- Précondition : ligne `opportunites` malformée en DB.
- Attendu : ligne ignorée + loggée, page rendue.
- Critères : [ ] pas de crash ; [ ] ligne absente.
- Réf : `pipeline/+page.server.ts:27-36`.

#### US-PIPE-09 - Action « prochaine action » (updateNextAction)
- Note : form action exposée (`updateNextAction`, MAJ date relance + notes) **sans déclencheur UI visible** dans le fichier. À vérifier : déclencheur réel ou action morte (voir ANO).
- Réf : `pipeline/+page.server.ts:131-146`.

---

## 8. Prospection (US-PROS)

> V5 a coupé les imports de masse. Les fonctions **désactivées** sont testées en §17 (régression 403/masquage). Ci-dessous : fonctions **actives**.

#### US-PROS-01 - Navigation par onglets (nature de signal)
- Parcours : ouvrir `/crm/prospection`, parcourir onglets `simap` (défaut), `regbl`, `entreprises`, `terrain`.
- Attendu : chaque onglet affiche sa DataTable serveur paginée (25/50/100), colonnes adaptées.
- Critères : [ ] 4 onglets ; [ ] défaut `simap` ; [ ] colonnes par onglet.
- Réf : `prospection/+page.svelte:225-254`, `prospection-utils.ts:10-21`.

#### US-PROS-02 - Recherche, tri, pagination, perPage (serveur)
- Parcours : saisir une recherche, changer le tri, paginer, changer perPage.
- Attendu : URL params serveur, résultats cohérents, recherche sécurisée (3 ilike escapés).
- Critères : [ ] recherche serveur ; [ ] tri ; [ ] pagination ; [ ] perPage.
- Réf : `prospection/+page.svelte:957-989`, `+page.server.ts:86-125`.

#### US-PROS-03 - Filtres (statut/température/canton/source)
- Parcours : appliquer chaque filtre.
- Attendu : URL params, debounce 200ms, bannière si source incompatible avec l'onglet.
- Critères : [ ] chaque filtre ; [ ] bannière incompatibilité.
- Réf : `prospection/+page.svelte:670-690,881-892`, `+page.server.ts:31-77`.

#### US-PROS-04 - Recherche nominale Zefix (import par nom)
- Parcours : ouvrir l'ImportModal -> onglet Zefix -> nom `Vitrerie` + canton `VD` -> importer.
- Attendu : leads créés dans `prospect_leads`, bannière de résultat.
- Critères : [ ] leads importés ; [ ] dédup par source_id ; [ ] erreurs propres (401/503/502/400 canton requis).
- Réf : `ImportModal.svelte:271-279`, `api/prospection/zefix/+server.ts`.

#### US-PROS-05 - Recherche nominale search.ch
- Parcours : ImportModal -> search.ch -> terme + canton/ville -> importer.
- Attendu : leads importés annuaire.
- Critères : [ ] import ; [ ] erreurs 503/429/502 propres.
- Réf : `ImportModal.svelte:281-289`, `api/prospection/searchch/+server.ts`.

#### US-PROS-06 - Enrichir le téléphone d'un lead (lookup unitaire)
- Parcours : ouvrir un lead (slide-out) -> « Enrichir téléphone ».
- Attendu : tel/adresse remplis via search.ch, re-scoring du lead.
- Critères : [ ] tel rempli ; [ ] re-score ; [ ] 403/429/502 gérés.
- Réf : `LeadSlideOut.svelte:74-98`, `api/prospection/search-ch/+server.ts`.

#### US-PROS-07 - Marquer Intéressé / Écarter
- Parcours : slide-out -> « Marquer Intéressé » ; sur un autre -> « Écarter ».
- Attendu : statut `interesse` / `ecarte`, toast, slide-out se ferme.
- Critères : [ ] statut maj ; [ ] toast.
- Réf : `LeadSlideOut.svelte:257-275`, `+page.server.ts:330-344`.

#### US-PROS-08 - Transférer un lead vers le CRM
- Parcours : slide-out -> « Transférer vers CRM ».
- Attendu : RPC atomique crée entreprise + contact + opportunité, lead -> `transfere`.
- Critères : [ ] entreprise+contact+opportunité créés ; [ ] statut `transfere` ; [ ] atomicité (pas de demi-création).
- Réf : `+page.server.ts:372-407`.

#### US-PROS-09 - Lead express (terrain) + désambiguïsation
- Parcours : « Lead express » -> saisir une entreprise potentiellement existante -> gérer la modale de désambiguïsation -> créer.
- Attendu : dedup multi-passes, insert source `lead_express`.
- Critères : [ ] dédup proposée ; [ ] création ; [ ] source correcte.
- Réf : `LeadExpress.svelte`, `+page.server.ts:481-553`.

#### US-PROS-10 - Triage matin (oui/non/plus-tard)
- Parcours : depuis le dashboard ou widget triage -> répondre oui / non / plus-tard.
- Attendu : statut maj (snooze 7 jours pour « plus-tard »), concurrency-safe (409 si conflit).
- Critères : [ ] 3 actions ; [ ] snooze ; [ ] 409 sur conflit.
- Réf : `api/prospection/triage/[action]/+server.ts`.

#### US-PROS-11 - Sélection batch + statut groupé
- Parcours : sélectionner plusieurs leads -> BatchActionsBar -> appliquer un statut.
- Attendu : tous mis à jour.
- Critères : [ ] sélection multiple ; [ ] batch statut appliqué.
- Réf : `prospection/+page.svelte:808`, `+page.server.ts:346-370`.

#### US-PROS-12 - Sélection « tous correspondants »
- Parcours : cocher « tout sélectionner » sur un filtre large.
- Attendu : fetch `all-ids` (cap 5000).
- Critères : [ ] sélection globale ; [ ] cap 5000.
- Réf : `prospection/+page.svelte:76-99`, `api/prospection/all-ids/+server.ts`.

#### US-PROS-13 - Toggle « Afficher les transférés »
- Parcours : activer le toggle.
- Attendu : leads `transfere` affichés (off par défaut).
- Critères : [ ] toggle ; [ ] transférés visibles.
- Réf : `prospection/+page.svelte:693-700`.

#### US-PROS-14 - Empty states contextuels
- Précondition : onglet sans donnée / filtre sans résultat.
- Attendu : message distinct « jamais peuplé » vs « filtré ».
- Critères : [ ] empty global ; [ ] empty filtré distinct.
- Réf : `prospection/+page.svelte:813-938`.

---

## 9. Signaux (US-SIG)

> Radar d'affaires métier centré SIMAP. Saisie manuelle supprimée (le cron remplit la page).

> Modèle de statut simplifié (2026-07-01) : `nouveau` (à trier) / `a_suivre` / `archive`.
> Le tri passe par le bouton « Statut » du slide-out. Plus d'édition libre ni de conversion
> signal -> opportunité (le pipeline part des prospects, pas des signaux).

#### US-SIG-01 - Onglets + file courte
- Parcours : ouvrir `/crm/signaux`.
- Attendu : onglets `À trier` (`nouveau`, défaut) et `À suivre` (`a_suivre`) ; sur `À trier` sans filtre, file capée 25 + bouton « Voir plus ». Indicateurs : Signaux / À trier / À suivre.
- Critères : [ ] 2 onglets ; [ ] cap 25 ; [ ] « Voir plus » déplie.
- Réf : `signaux/+page.svelte` (tabsSpec, queueCap), `signauxFormat.ts`.

#### US-SIG-02 - Vue Archivées
- Parcours : cliquer « Archivées » (visible si count > 0).
- Attendu : `?vue=archivees` affiche les signaux `statut_traitement='archive'` (Zefix soft-archivés + signaux archivés depuis la file), bannière + bouton retour.
- Critères : [ ] vue archivées ; [ ] bannière ; [ ] retour ; [ ] bouton masqué si 0 archivé.
- Réf : `signaux/+page.svelte`, `+page.server.ts` (load, showArchived).

#### US-SIG-03 - Détail d'un signal (slide-out) + lien SIMAP
- Parcours : cliquer un signal.
- Attendu : acteurs, localisation, source, scoring détaillé. Pour une source SIMAP : lien « Voir sur SIMAP » (`https://www.simap.ch/fr/project-detail/{source_id}`, nouvel onglet) ; aucune source non-SIMAP n'affiche de lien.
- Critères : [ ] slide-out complet ; [ ] lien SIMAP présent et correct sur source `simap` uniquement.
- Réf : `signaux/+page.svelte` (section Source & dates).

#### US-SIG-04 - Bouton Statut (À suivre / Archivé) + restauration
- Parcours : slide-out -> « Statut » -> choisir « À suivre » ou « Archivé » ; depuis la vue archivées -> « À suivre » (restauration).
- Attendu : `updateStatut` pose le statut choisi (borné DB à `nouveau`/`a_suivre`/`archive`), toast ; l'option courante est désactivée (« Actuel ») ; restaurer depuis la vue archivées renavigue vers la file active.
- Critères : [ ] statut posé ; [ ] toast ; [ ] option courante disabled ; [ ] restauration -> file active.
- Réf : `signaux/+page.svelte` (menu Statut, statutEnhance), `+page.server.ts` (updateStatut).

#### US-SIG-07 - Supprimer un signal (hard delete)
- Parcours : slide-out -> « Supprimer » -> ConfirmModal -> confirmer.
- Attendu : DELETE dur, signal disparaît.
- Critères : [ ] confirm requis ; [ ] suppression effective.
- Réf : `signaux/+page.svelte:702-728`, `+page.server.ts:218-229`.

#### US-SIG-08 - Suppression batch
- Parcours : activer le mode sélection -> cocher plusieurs -> ConfirmModal -> confirmer.
- Attendu : tous supprimés.
- Critères : [ ] sélection ; [ ] confirm ; [ ] suppression groupée.
- Réf : `signaux/+page.svelte:470-514`, `+page.server.ts:232-246`.

#### US-SIG-09 - Mots-clés : ADMIN ajoute un mot-clé + rescore
- Précondition : connecté en `pascal@filmpro.ch`.
- Parcours : ouvrir le drawer mots-clés -> ajouter `pare-soleil` (catégorie coeur) -> valider.
- Attendu : insert `signaux_mots_cles` + re-score rétroactif des signaux de la file active (`nouveau`+`a_suivre`).
- Critères : [ ] mot-clé ajouté ; [ ] scores recalculés.
- Réf : `signaux/+page.server.ts:103-150`, `SignauxKeywordsPanel`.

#### US-SIG-10 - Mots-clés : NON-ADMIN bloqué (sécu)
- Précondition : connecté avec un fondateur != `pascal@filmpro.ch`.
- Parcours : tenter `addKeyword` / `removeKeyword` (via UI ou POST direct).
- Attendu : **403** (gate `isAdminEmail`).
- Critères : [ ] 403 ; [ ] aucun mot-clé créé/supprimé. **(Test de refus obligatoire, sécu.)**
- Réf : `signaux/+page.server.ts:105,153`.

#### US-SIG-11 - Tri / recherche / hide hors-scope
- Parcours : changer le tri (pertinence/date, persisté localStorage), rechercher (debounce 200ms), activer « Cacher hors-scope ».
- Attendu : comportements respectés, persistance tri.
- Critères : [ ] tri persistant ; [ ] recherche ; [ ] toggle hors-scope.
- Réf : `signaux/+page.svelte:387-456`.

#### US-SIG-12 - Empty state (radar)
- Précondition : aucun signal.
- Attendu : message « Le radar SIMAP remplit cette page chaque matin à 6h ».
- Critères : [ ] message exact.
- Réf : `signaux/+page.svelte:464-468`.

#### US-SIG-13 - Cron radar SIMAP (vérification d'ingestion)
- Parcours : déclencher `GET /api/cron/signaux` avec `CRON_SECRET` valide.
- Attendu : `importSimap` exécuté (6 cantons romands, fenêtre 7j) ; `importZefix` court-circuité (flag env OFF -> 0 importé).
- Critères : [ ] SIMAP importe ; [ ] Zefix = 0 importé ; [ ] auth `CRON_SECRET` (401 sinon).
- Réf : `api/cron/signaux/+server.ts:386-394`.

---

## 10. Veille sectorielle (US-VEI)

### 10.1 Liste (fil magazine)

#### US-VEI-01 - Affichage du kiosque
- Parcours : ouvrir `/crm/veille`.
- Attendu : édition « à la une » (la plus récente) + jusqu'à 2 archives (limit 3 total), badge « Nouveau » si non lu.
- Critères : [ ] featured + archives ; [ ] limit 3 ; [ ] badge non-lu.
- Réf : `veille/+page.server.ts:35,46-49`, `+page.svelte:103-333`.

#### US-VEI-02 - Empty veille
- Précondition : aucune édition publiée.
- Attendu : « Aucune édition publiée ».
- Critères : [ ] empty.
- Réf : `veille/+page.svelte:95-102`.

#### US-VEI-03 - Naviguer vers le détail / item
- Parcours : cliquer « Lire l'édition complète » ; cliquer un titre de preview.
- Attendu : navigation vers `/crm/veille/{id}` (détail) et item public.
- Critères : [ ] détail ouvre ; [ ] item ouvre. **(Vérifier l'incohérence de préfixe `/veille` vs `/crm/veille`, voir ANO.)**
- Réf : `veille/+page.svelte:175-247`.

### 10.2 Détail édition `[id]`

#### US-VEI-04 - Lecture du détail + auto-marquage lu
- Parcours : ouvrir une édition.
- Attendu : couverture + signaux détaillés + impacts FilmPro + termes ; l'édition est marquée lue (upsert `intelligence_reads`) -> badge non-lu disparaît.
- Critères : [ ] contenu complet ; [ ] marquée lue ; [ ] badge nav décrémente.
- Réf : `veille/[id]/+page.server.ts:43-50`.

#### US-VEI-05 - Ajouter un item manuellement
- Parcours : « Ajouter un item » -> titre (>= 10 c.), résumé (>= 40 c.), pertinence FilmPro (>= 20 c.), URL valide existante -> Enregistrer.
- Attendu : item créé (validation Zod + verify URL bloquant + denylist), 2 chips par défaut générés.
- Critères : [ ] item ajouté ; [ ] URL morte/paywall/denylist -> 400 ; [ ] chips générés.
- Réf : `veille/[id]/+page.server.ts:110-264`.

#### US-VEI-06 - Cap 15 items / édition
- Précondition : édition à 15 items.
- Parcours : tenter d'ajouter un 16e.
- Attendu : 409 « Édition saturée ».
- Critères : [ ] 409 ; [ ] pas d'ajout.
- Réf : `veille/[id]/+page.server.ts:200-205`.

#### US-VEI-07 - Optimistic locking (édition concurrente)
- Précondition : 2 sessions sur la même édition.
- Parcours : ajouter un item depuis chaque session quasi-simultanément.
- Attendu : retry (max 3) ; si conflit non résolu -> 409.
- Critères : [ ] pas de lost-update ; [ ] 409 en dernier recours.
- Réf : `veille/[id]/+page.server.ts:164-260`.

#### US-VEI-08 - Copier les termes / lancer une recherche
- Parcours : « Copier les N » (presse-papier) ; cliquer un chip « Lancer la recherche ».
- Attendu : copie OK ; chip -> POST `/api/prospection/from-intelligence` puis redirection prospection.
- Critères : [ ] copie ; [ ] recherche lancée ; [ ] anti double-clic (`chipLoading`).
- Réf : `veille/[id]/+page.svelte:170-206,447-527`.

### 10.3 Item public `[slug]`

#### US-VEI-09 - Vue article isolée
- Parcours : ouvrir `/crm/veille/item/<uuid>-<rank>`.
- Attendu : article complet (badges, résumé, pertinence, deep-dive, source, chips).
- Critères : [ ] article rendu ; [ ] chips fonctionnels.
- Réf : `veille/item/[slug]/+page.svelte:105-227`.

#### US-VEI-10 - Slug invalide / item masqué
- Parcours : ouvrir un slug mal formé ; ouvrir un item dont le rank est dans `items_hidden`.
- Attendu : 404 (slug invalide) ; « Signal retiré » (masqué).
- Critères : [ ] 404 slug ; [ ] message masqué.
- Réf : `veille/item/[slug]/+page.server.ts:8-28`.

### 10.4 Gestion des thèmes

#### US-VEI-11 - Lister les thèmes
- Parcours : ouvrir `/crm/veille/themes`.
- Attendu : DataTable (slug/label/catégorie/ordre/actif), recherche, tri, pagination 25, colonnes redimensionnables persistées.
- Critères : [ ] table ; [ ] recherche/tri ; [ ] persistance largeur colonnes.
- Réf : `veille/themes/+page.svelte:127-213`.

#### US-VEI-12 - Créer un thème
- Parcours : « Nouveau thème » -> slug `films_solaires`, label `Films solaires`, catégorie Coeur métier -> Enregistrer.
- Attendu : thème créé, `sort_order` auto = max+10 ; conflit slug -> 409.
- Critères : [ ] création ; [ ] 409 si slug existant ; [ ] slug snake_case validé.
- Réf : `veille/themes/+page.server.ts:34-65`.

#### US-VEI-13 - Éditer un thème (slug verrouillé)
- Parcours : « Modifier » -> changer le label -> Enregistrer.
- Attendu : label maj, **slug immuable** (champ disabled).
- Critères : [ ] label maj ; [ ] slug non éditable.
- Réf : `veille/themes/+page.svelte:241`, `+page.server.ts:67-100`.

#### US-VEI-14 - Activer / désactiver un thème
- Parcours : icône eye -> ConfirmModal -> confirmer.
- Attendu : `active` basculé ; n'affecte que les futures générations LLM (pas les éditions passées).
- Critères : [ ] toggle ; [ ] message confirm correct.
- Réf : `veille/themes/+page.server.ts:102-125`.

---

## 11. Reporting (US-REP)

#### US-REP-01 - Onglets de synthèse
- Parcours : ouvrir `/crm/reporting`, parcourir `synthese`, `pipeline`, `activite`, `export`.
- Attendu : indicateurs (pipeline actif total, conversion, activités) + graphes (pipeline par étape, évolution mensuelle 12 mois) + cartes activité.
- Critères : [ ] 4 onglets ; [ ] graphes rendus ; [ ] indicateurs.
- Réf : `reporting/+page.svelte:55-140`, `+page.server.ts:18-63`.

#### US-REP-02 - Taux de conversion & pipeline actif
- Attendu : conversion = leads `transfere` / total leads ; pipeline actif = somme montants hors gagne/perdu.
- Critères : [ ] conversion cohérente ; [ ] pipeline actif exclut clos.
- Réf : `reporting/+page.server.ts:42-52`.

#### US-REP-03 - Export CSV (desktop only)
- Parcours (desktop) : onglet Export -> télécharger un CSV.
- Attendu : téléchargement ; en mobile, bandeau « optimisé ordinateur ».
- Critères : [ ] CSV téléchargé ; [ ] table détaillée desktop-only ; [ ] bandeau mobile.
- Réf : `reporting/+page.svelte:127-139,100-102`.

#### US-REP-04 - Robustesse données vides
- Précondition : tables vides.
- Attendu : pas de crash, graphes/cartes en empty.
- Critères : [ ] page rendue ; [ ] empty propre.
- Réf : `reporting/+page.server.ts:29-32`.

---

## 12. Dashboard Coûts API (US-COUT)

#### US-COUT-01 - Affichage 12 semaines
- Parcours (desktop) : ouvrir `/crm/dashboard/couts`.
- Attendu : KPIs + graphique évolution sur 84 jours / 12 semaines glissantes (total hebdo en euros).
- Critères : [ ] KPIs ; [ ] graphe 12 semaines.
- Réf : `dashboard/couts/+page.server.ts:30-62`, `+page.svelte:25-32`.

#### US-COUT-02 - Desktop only
- Parcours (viewport < 1024px) : ouvrir la page.
- Attendu : contenu masqué + bandeau « optimisé pour ordinateur ».
- Critères : [ ] bandeau ; [ ] contenu masqué.
- Réf : `dashboard/couts/+page.svelte:24,36-38,93-100`.

#### US-COUT-03 - Garde auth + robustesse schéma
- Parcours : accès sans session ; cas mismatch schéma.
- Attendu : 401 sans session ; mismatch -> fallback empty + warning loggé (pas de crash).
- Critères : [ ] 401 ; [ ] fallback empty.
- Réf : `dashboard/couts/+page.server.ts:25-59`.

---

## 13. Aide (US-AIDE)

#### US-AIDE-01 - Navigation par onglets/niveaux
- Parcours : ouvrir `/crm/aide`, changer d'onglet.
- Attendu : layout 3 colonnes (sommaire / contenu / sur cette page), URL synchronisée (`?tab=`).
- Critères : [ ] onglets ; [ ] URL `?tab=`.
- Réf : `aide/+page.svelte:135-155,57-62`.

#### US-AIDE-02 - Recherche full-text
- Parcours : saisir un terme.
- Attendu : mode recherche (remplace le corps), compteur « N section(s) », empty si 0.
- Critères : [ ] résultats ; [ ] compteur ; [ ] empty message.
- Réf : `aide/+page.svelte:158-181,28-30`.

#### US-AIDE-03 - Clic résultat / TOC / deep-link
- Parcours : cliquer un résultat ; cliquer un lien TOC ; ouvrir `?tab=X&section=Y`.
- Attendu : switch niveau si besoin + scroll vers section + URL maj ; deep-link restaure l'état au montage.
- Critères : [ ] scroll vers section ; [ ] URL `?section=` ; [ ] deep-link restauré.
- Réf : `aide/+page.svelte:64-91,241-250`.

#### US-AIDE-04 - Section active suivie au scroll
- Parcours : scroller le contenu.
- Attendu : highlight TOC suit la section visible (IntersectionObserver).
- Critères : [ ] highlight dynamique.
- Réf : `aide/+page.svelte:94-116`.

---

## 14. Log / Feedback (US-LOG)

#### US-LOG-01 - Créer un retour (tous fondateurs)
- Parcours : ouvrir `/crm/log` (desktop) -> « Nouveau retour » -> type `bug`, description -> Envoyer.
- Attendu : insert `feedback_entries` (status `nouveau`, email normalisé lower), toast « Retour envoyé ».
- Critères : [ ] toast ; [ ] entrée créée ; [ ] severity null sauf type=bug.
- Réf : `log/+page.server.ts:57-83`, `FeedbackForm.svelte:70-94`.

#### US-LOG-02 - Filtre statut
- Parcours : changer le select de statut.
- Attendu : table filtrée client.
- Critères : [ ] filtre.
- Réf : `log/+page.svelte:96-107`.

#### US-LOG-03 - ADMIN change le statut d'un retour
- Précondition : `pascal@filmpro.ch`.
- Parcours : dans la table, changer le statut d'une entrée.
- Attendu : `updateStatus` OK.
- Critères : [ ] statut maj ; [ ] compteurs par statut à jour.
- Réf : `log/+page.server.ts:85-104`.

#### US-LOG-04 - ADMIN édite les notes admin
- Parcours : éditer le champ notes d'une entrée.
- Attendu : `updateAdminNotes` OK (trim, '' -> null).
- Critères : [ ] notes sauvegardées.
- Réf : `log/+page.server.ts:106-128`.

#### US-LOG-05 - ADMIN exporte en JSON
- Parcours : « Exporter en JSON » (filtré ou tous).
- Attendu : téléchargement blob ; bouton désactivé si 0 entrée.
- Critères : [ ] export ; [ ] disabled si vide ; [ ] bouton absent pour non-admin.
- Réf : `log/+page.svelte:37-48,109-118`.

#### US-LOG-06 - NON-ADMIN bloqué sur statut/notes (sécu)
- Précondition : fondateur != `pascal@filmpro.ch`.
- Parcours : tenter `updateStatus` / `updateAdminNotes` (POST direct).
- Attendu : **403**.
- Critères : [ ] 403 ; [ ] aucune modification. **(Test de refus obligatoire, sécu.)**
- Réf : `log/+page.server.ts:87-89,107-110`.

#### US-LOG-07 - Desktop only
- Parcours (viewport < 1024px) : ouvrir `/crm/log`.
- Attendu : encart « Disponible uniquement depuis ordinateur ».
- Critères : [ ] encart ; [ ] contenu masqué.
- Réf : `log/+page.svelte:61-73`.

---

## 15. Outil terrain mobile (US-TER)

> Précondition globale : `ff_crm_mobile_v3` ON. Tester en Chrome DevTools Device Toolbar (manuel).

#### US-TER-01 - Garde d'accès au shell
- Parcours : ouvrir `/terrain` avec flag OFF puis ON.
- Attendu : OFF -> redirect `/crm` ; ON -> shell plein écran + tabbar 2 onglets.
- Critères : [ ] OFF redirige ; [ ] ON affiche shell.
- Réf : `terrain/+layout.server.ts:10-15`.

#### US-TER-02 - Tabbar 2 onglets
- Parcours : observer la barre du bas.
- Attendu : exactement 2 onglets « À faire » et « Rechercher », cibles >= 44px, safe-area respectée, `aria-current` sur l'actif.
- Critères : [ ] 2 onglets ; [ ] cibles tactiles >= 44px ; [ ] indicateur actif.
- Réf : `MobileTabBar.svelte:10-64`.

#### US-TER-03 - Accueil « À faire » (relances)
- Précondition : opportunités avec `date_relance_prevue <= today`, non closes.
- Parcours : ouvrir `/terrain`.
- Attendu : liste des relances (cap 15), chaque ligne -> `/terrain/entreprise/{id}` ; empty « Rien à relancer aujourd'hui » sinon.
- Critères : [ ] relances listées ; [ ] empty si 0 ; [ ] erreur -> « Réessayer ».
- Réf : `terrain/+page.server.ts:14-25`, `+page.svelte:17-43`.

#### US-TER-04 - Recherche entreprise
- Parcours : onglet « Rechercher » -> taper >= 2 lettres (`Vitr`).
- Attendu : autocomplete (debounce 300ms, anti-désordre réseau), résultats -> fiche ; « Aucune entreprise pour … » si 0 ; bouton effacer.
- Critères : [ ] résultats ; [ ] anti-zoom iOS (font 16px) ; [ ] effacer ; [ ] empty.
- Réf : `terrain/rechercher/+page.svelte:14-101`, `api/entreprises/search/+server.ts:35-62`.

#### US-TER-05 - Fiche entreprise terrain (lecture)
- Parcours : ouvrir une fiche.
- Attendu : identité (secteur, adresse, contact+rôle), opportunités en cours, historique terrain (visites antéchronologiques, pastille par résultat, date relative). Lecture seule (aucun champ structurant éditable).
- Critères : [ ] identité ; [ ] opportunités ; [ ] historique.
- Réf : `terrain/entreprise/[id]/+page.server.ts:19-61`, `+page.svelte:62-124`.

#### US-TER-06 - Actions natives (appeler / itinéraire / email)
- Parcours : taper « Appeler », « Itinéraire » (Apple Maps), « Email ».
- Attendu : `tel:` / `maps.apple.com` / `mailto:` ; boutons grisés (non masqués) si donnée absente, cible >= 56px.
- Critères : [ ] 3 actions ; [ ] grisé si vide ; [ ] cibles >= 56px.
- Réf : `NativeActionBar.svelte:21-52`, `native-actions.ts:59-73`.

#### US-TER-07 - Compte-rendu de visite (résultat + note)
- Parcours : « Compte-rendu de visite » -> choisir un résultat (Intéressé / À relancer / Absent / Non pertinent) -> note (optionnelle, max 2000) -> Enregistrer.
- Attendu : POST `/api/visits`, retour `/terrain` ; résultat obligatoire (jamais « Autre »).
- Critères : [ ] résultat requis ; [ ] note max 2000 ; [ ] enregistrement -> retour terrain.
- Réf : `CompteRenduForm.svelte:191-225`, `api/visits/+server.ts:66`.

#### US-TER-08 - Photos de visite (capture native + retry)
- Parcours : dans le compte-rendu, taper « Photo » -> prendre/choisir des images.
- Attendu : capture caméra arrière (`capture=environment`), upload par photo vers `/api/photos`, badge état (envoi/envoyé/échec), retry au tap sur vignette en échec, cap 10, max 5 Mo.
- Critères : [ ] upload ; [ ] retry échec ; [ ] cap 10 (409) ; [ ] > 5 Mo refusé (413) ; [ ] pas de fuite blob.
- Réf : `CompteRenduForm.svelte:56-111,256-264`.

#### US-TER-09 - GPS optionnel + géocodage distance
- Parcours : cocher « Enregistrer ma position » puis Enregistrer ; refaire en refusant la géoloc.
- Attendu : si GPS capté -> distance Zefix calculée (swisstopo) ; si refusé/indispo -> visite sans coordonnées (jamais bloquante).
- Critères : [ ] GPS capté -> distance ; [ ] refus -> visite enregistrée sans coords.
- Réf : `CompteRenduForm.svelte:113-129`, `geo-helpers.ts:69-167`.

#### US-TER-10 - Photos en échec : pas de perte silencieuse
- Parcours : provoquer un échec d'upload (couper le réseau) puis « Enregistrer ».
- Attendu : warning « Enregistrer sans ces photos » + confirmation explicite avant de quitter ; attente des uploads en vol.
- Critères : [ ] warning ; [ ] confirmation requise ; [ ] pas de perte sans accord.
- Réf : `CompteRenduForm.svelte:131-151`.

#### US-TER-11 - Brouillon contact rencontré
- Parcours : « Contact rencontré » -> remplir au moins un identifiant (prénom/nom/tel/email) -> Envoyer.
- Attendu : POST `/api/contact-suggestions` (crée toujours un brouillon `en_attente`, jamais un contact direct), toast « Contact à valider au bureau ».
- Critères : [ ] CTA désactivé si aucun identifiant ; [ ] brouillon créé ; [ ] toast.
- Réf : `ContactBrouillonForm.svelte:43-97`, `api/contact-suggestions/+server.ts:24-74`.

#### US-TER-12 - Deep-link fiche sans historique
- Parcours : ouvrir directement une fiche puis « retour ».
- Attendu : fallback `/terrain` (pas d'écran blanc).
- Critères : [ ] retour vers `/terrain`.
- Réf : `MobileShell.svelte:38-40`.

---

## 16. Régressions - bugs connus (REG)

> Priorité haute. À reproduire et caractériser avant tout fix (no-debt : fix dans une session dédiée).

#### REG-01 - Impossible de supprimer une entreprise (bug prod signalé par Pascal)
- Symptôme : la suppression d'une entreprise échoue.
- **3 causes hypothétiques identifiées en analyse code** (à confirmer en test) :
  1. **Garde applicative trop stricte** (`entreprises/+page.server.ts:84-95`) : si l'entreprise a >= 1 contact OU >= 1 opportunité rattaché -> `fail(400)` « Impossible de supprimer : N contact(s) et M opportunite(s) rattache(s) ». En usage réel quasi toute entreprise a un contact -> blocage quasi systématique avec **message clair**. (Au niveau DB ces FK sont `ON DELETE SET NULL`, donc la garde appli est plus stricte que nécessaire = choix produit à trancher.)
  2. **FK silencieuse `prospect_leads.transfere_vers_entreprise_id`** sans `ON DELETE` (`20260403_001:38`, NO ACTION/RESTRICT) : si un lead a été transféré vers l'entreprise, le DELETE Postgres échoue (`23503`) et `dbFail` renvoie un message **générique** (« Erreur lors de l'operation ») non explicite. Non couvert par la garde appli (qui ne compte que contacts+opportunités). **Candidat le plus probable d'un bug « inexpliqué ».**
  3. **Mismatch type id** : `EntrepriseDeleteSchema.id = requiredUUID` (`schemas.ts:102-104`) alors que `entreprises.id` est `text` en DB. Pour des ids historiques non-UUID (imports legacy) -> `fail(400)` Zod avant la DB.
- Parcours de test : (a) entreprise SANS dépendance -> doit se supprimer (US-ENT manquant) ; (b) entreprise AVEC contact -> message clair attendu ; (c) entreprise cible d'un lead transféré -> reproduire le 23503 et vérifier le message.
- Critères : [ ] cas (a) supprime ; [ ] cas (b) message explicite ; [ ] cas (c) reproduit + message à améliorer ; [ ] décision produit sur la garde appli.
- **Non en cause** : RLS (policy `FOR ALL` permissive) ; FK photos/visits/suggestions (toutes CASCADE).

---

## 17. Régressions - désactivations V5 (V5)

> Ces fonctions DOIVENT rester coupées (qualité, pas quantité). Tester que le gate fonctionne (403 / UI masquée / cron inerte), PAS un parcours positif.

| ID | Fonction | Attendu | Réf |
|---|---|---|---|
| V5-01 | Import masse Google Places | POST `/api/prospection/google-places` -> **403** (avant tout appel Google & avant quota) ; source masquée onglet entreprises | `google-places/+server.ts:51-53` |
| V5-02 | Import masse SIMAP (Prospection) | POST `/api/prospection/simap` -> **403** ; CTA import masqué | `simap/+server.ts:35-37` |
| V5-03 | Import masse RegBL | POST `/api/prospection/regbl` -> **403** ; CTA masqué | `regbl/+server.ts:53-55` |
| V5-04 | Enrichissement batch | POST `/api/prospection/enrichir-batch` -> **403** ; bouton « Enrichir cette page » masqué | `enrichir-batch/+server.ts:88-93` |
| V5-05 | Recherches sauvegardées | action `saveRecherche` -> **403** ; `data.recherches` toujours vide -> UI « Mes recherches » invisible | `prospection/+page.server.ts:413-415,241` |
| V5-06 | Alertes | cron `/api/cron/alertes` -> 200 « Alertes désactivées », 0 vérifiée ; boutons « Créer une alerte » masqués | `alertes/+server.ts:67-69` |
| V5-07 | Ingestion Zefix (cron signaux) | `importZefix` jamais appelé (flag env OFF) -> 0 importé | `api/cron/signaux/+server.ts:386-392` |
| V5-08 | Pont Veille -> Prospection (transitif) | chip `simap`/`regbl` propage le 403 du sous-endpoint ; chip `zefix` aboutit | `from-intelligence/+server.ts` |

Critères globaux : [ ] chaque endpoint gated renvoie bien 403/inerte ; [ ] chaque entrée UI correspondante est masquée ; [ ] la clé `GOOGLE_PLACES_API_KEY` n'est jamais exposée.

---

## 18. Anomalies & dette détectées à vérifier (ANO)

> Détectées en lecture de code pendant la rédaction. À confirmer/qualifier en test ; ne pas corriger sans validation (sauf trivial < 30 min in-session selon no-debt rule).

| ID | Constat | Impact présumé | Réf |
|---|---|---|---|
| ANO-01 | Pas de pagination Entreprises ni Contacts (`SELECT *` non borné, filtre/recherche 100 % client) | Perf/payload quand le volume croît | `entreprises/+page.server.ts:17-21`, `contacts/+page.server.ts:14-18` |
| ANO-02 | Incohérence préfixe de liens dans la liste Veille : `/veille/...` vs `/crm/veille/...` | Liens potentiellement cassés selon le routing | `veille/+page.svelte:175-247` |
| ANO-03 | Cron `intelligence` documenté (CLAUDE.md) mais **inexistant** sur disque (réel = `signaux` + `intelligence-archive`) | Doc périmée | `api/cron/` |
| ANO-04 | Double surface d'écriture des thèmes : form actions (utilisées) vs endpoints REST `api/veille/themes` (non appelés par la page) | Dette / risque divergence | `api/veille/themes/+server.ts` |
| ANO-05 | Endpoint `/api/veille/read` orphelin (le marquage lu réel se fait dans le `load` du détail) | Code mort présumé | `api/veille/read/+server.ts` |
| ANO-06 | Rate-limit feedback **absent** au niveau de l'action `create` du Log (le 10/min est global infra, pas local) | Abus possible du formulaire | `log/+page.server.ts:57-83` |
| ANO-07 | Pas de file offline persistante terrain (résilience in-memory seulement, pas de localStorage/IndexedDB/SW) | Perte de saisie si app fermée hors ligne | `CompteRenduForm.svelte:144` |
| ANO-08 | `/api/export/[entity]` accessible par URL directe sans bouton dans Entreprises/Contacts | Surface non découvrable / à documenter | `api/export/[entity]/+server.ts` |
| ANO-09 | `DELETE /api/photos/[id]` et `DELETE /api/visits/[id]` sans garde ownership (modèle plat assumé, simple log) | À durcir au 4e user non-fondateur | `api/photos/[id]/+server.ts:27-35`, `api/visits/[id]/+server.ts:19-33` |
| ANO-10 | Pipeline : action `updateNextAction` exposée sans déclencheur UI visible | Action morte ? ou déclencheur ailleurs | `pipeline/+page.server.ts:131-146` |
| ANO-11 | Shell `/terrain` sans bouton de déconnexion | Pas de logout en mobile terrain | `terrain/+layout.svelte` |

---

## 19. Matrice de couverture (page -> stories)

| Surface | Stories |
|---|---|
| Login / Auth / garde | US-AUTH-01..14 |
| Portail `/` | US-PORT-01..03 |
| Layout / nav CRM | US-NAV-01..09 |
| Dashboard `/crm` | US-DASH-01..07 |
| Entreprises | US-ENT-01..12 + REG-01 |
| Contacts | US-CON-01..10 |
| Pipeline | US-PIPE-01..09 |
| Prospection | US-PROS-01..14 + V5-01..05,08 |
| Signaux | US-SIG-01..13 + V5-06,07 |
| Veille (4 sous-pages) | US-VEI-01..14 |
| Reporting | US-REP-01..04 |
| Coûts API | US-COUT-01..03 |
| Aide | US-AIDE-01..04 |
| Log / Feedback | US-LOG-01..07 |
| Terrain mobile | US-TER-01..12 |
| Endpoints transverses | couverts via UI (US-ENT-11, US-TER-07..11) + tests directs V5/REG |
| Régressions / anomalies | REG-01, V5-01..08, ANO-01..11 |

**Total : ~110 stories + 8 régressions V5 + 1 régression bug prod + 11 anomalies.**

---

## 20. Protocole de test (prochaine session)

1. Lire `audit-uiux/SKILL.md`. Vérifier le golden actif (`.claude/audit-uiux-golden-current.json`) ; si absent, lancer `/golden-standard` d'abord (Phase 0 bloquante).
2. Minter une session de test (`tests/mint-session.mjs`) + activer les flags de test (`ff_crm_mobile_v3`, `ff_crm_mobile_v2`, `ff_decoupe`) sur le compte. Préchauffer le serveur (curl) avant Playwright.
3. Dérouler les stories module par module. Pour chaque story : reporter le **Statut test** (✅/❌/⚠️/⬜) + sévérité + preuve (screenshot/log) si KO.
4. Prioriser §16 (REG-01 suppression entreprise) et §17 (régressions V5) en premier.
5. Consolider les KO en findings (sévérité C/H/M/L/I), figer le catalogue, valider avec Pascal AVANT tout batch fixes (règle « zéro fix pendant l'audit »).
6. Pour les tests de refus sécu (US-SIG-10, US-LOG-06) : prouver le 403 avec un compte non-admin réel, pas un mock.

> **Rappel** : les `.svelte` se testent en e2e (doctrine projet), pas en jsdom. Mobile/terrain en DevTools Device Toolbar manuel (Pascal).
