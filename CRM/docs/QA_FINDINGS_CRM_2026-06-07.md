# QA — Catalogue de findings figé (CRM FilmPro)

> **Session** : 2026-06-07. **Mode** : audit (zéro fix — aucun code modifié). **Méthode** : agents statiques (lecture code, fichier:ligne) + confirmation runtime (curl session mintée OTP-free + repro DB éphémère purgée). Browser live (ui-auditor Chrome) = pages cœur, voir §C.
> **Source des stories** : `docs/QA_USER_STORIES_CRM.md`. **Sévérité** : C bloquant · H régression visible · M micro-bug · L polish · I info.
> **Statut** : ✅ OK / ❌ KO / ⚠️ partiel / ⬜ non testé.
>
> **À valider avec Pascal AVANT tout batch de fixes** (règle « zéro fix pendant l'audit »).

---

## A. Bloc prioritaire — Régressions (statique + RUNTIME confirmé)

### REG-01 — Suppression d'entreprise impossible — ❌ **CONFIRMÉ (bug prod réel)**

Caractérisé par analyse code (3 causes) + **reproduit en live** (form action réel + DB).

| Cause | Statut | Preuve |
|---|---|---|
| **1. Garde applicative** (contacts + opportunités) | ✅ active, **message clair** | `crm/entreprises/+page.server.ts:84-95`. Live : entreprise + 1 contact → `failure 400 « Impossible de supprimer : 1 contact(s) rattache(s) »`. Comportement par design mais plus strict que la DB (`contacts`/`opportunites.entreprise_id` sont `ON DELETE SET NULL`). |
| **2. FK `prospect_leads.transfere_vers_entreprise_id` sans `ON DELETE`** | ❌ **RACINE — sévérité H** | `20260403_001_prospect_leads.sql:38` (aucun `ON DELETE` → NO ACTION). **Live confirmé** : entreprise cible d'un lead transféré → form action renvoie `failure 400 « Erreur lors de l'operation »` (générique, aucune mention du lead) et l'entreprise **reste**. DB direct = `23503 prospect_leads_transfere_vers_entreprise_id_fkey`. `dbFail` (`lib/server/db-helpers.ts:8-12`) renvoie un message fixe quel que soit le code Postgres. |
| **3. Mismatch type id Zod `uuid()` vs `entreprises.id text`** | ⚠️ improbable | `schemas.ts:9,102-104` vs `20260402_001:23`. Ids tous générés `randomUUID()` (`referentiel/entreprises.ts:87,114`) ; audit data 2026-05-11 = « 0 ligne hors format UUID ». Voie ouverte seulement pour imports legacy non-UUID, non observés. |

**Cartographie FK → `entreprises.id`** : `contacts` SET NULL · `opportunites` SET NULL · **`prospect_leads.transfere_vers_entreprise_id` NO ACTION (bloque)** · `prospect_photos` CASCADE · `prospect_visits` CASCADE · `contact_suggestions` CASCADE.

**Impact utilisateur** : toute entreprise issue d'un transfert de lead (parcours produit normal) est définitivement non supprimable, avec un message incompréhensible et sans contournement UI. C'est le « bug inexpliqué » signalé par Pascal.

**Pistes de fix (NON appliquées — décision produit requise)** :
- (a) Ajouter `ON DELETE SET NULL` à la FK `prospect_leads.transfere_vers_entreprise_id` (migration) → aligne sur les autres FK.
- (b) Discriminer le code `23503` dans `dbFail` → message explicite (« référencée par un lead transféré »).
- (c) Trancher la garde appli (cause 1) : la garde est plus stricte que la DB (SET NULL). Garder le blocage clair OU autoriser la suppression avec détachement ? = **décision produit**.

> **Décision Pascal 2026-06-07** : GARDER le blocage (cause 1), mais remplacer le message générique par une **modale UI explicite** (liste les N contacts / M opportunités rattachés + invite à les détacher d'abord) ; fixer la cause 2 (migration FK `ON DELETE SET NULL` + discriminer `23503`). → exécution = backlog Bloc 3 (`CRM/CLAUDE.md` § Prochaine session).

> **✅ RÉSOLU EN PROD 2026-06-07** (commit `dd99ae8`). (a) Migration FK `prospect_leads.transfere_vers_entreprise_id` → `ON DELETE SET NULL` appliquée prod (vérifiée `confdeltype` `a`→`n`). (b) `dbFail` discrimine `23503` (message explicite). (c) `DependencyBlockModal` (a11y conforme) liste les dépendances détachables ; garde conservée. **+ I-2 traité (décision Pascal « inclure maintenant »)** : la cascade terrain (`prospect_photos`/`prospect_visits`/`contact_suggestions`, FK `ON DELETE CASCADE`) n'efface plus silencieusement → flow preview→confirm→`force` qui chiffre la perte dans la modale ; la garde détachables n'est jamais contournée par `force`. Durcissements sécu : fail-secure (I-1), log traçabilité cascade (I-3). **Audit sécu Opus 0 C/H/M/L** ; **smoke prod 4/4** (garde→blocked, I-2 preview→needsConfirm, force→cascade supprimée, REG-01→SET NULL `leadFK=null`) ; 1696 Vitest, svelte-check 0, build 0.

### V5 — Désactivations (doivent rester coupées) — ✅ **8/8 conformes**

| ID | Gate | UI masquée | Runtime |
|---|---|---|---|
| V5-01 Google Places | ✅ 403 avant clé+quota (`google-places/+server.ts:51-53`) | ✅ source retirée onglet entreprises (`filterEnabledSources`) | ✅ **403 live** |
| V5-02 SIMAP | ✅ 403 avant `request.json()` (`simap/+server.ts:35-37`) | ✅ tab + CTA masqués | ✅ **403 live** |
| V5-03 RegBL | ✅ 403 (`regbl/+server.ts:53-55`) | ✅ tab + CTA masqués | ✅ **403 live** |
| V5-04 Enrichir batch | ✅ 403 (`enrichir-batch/+server.ts:88-93`) | ✅ bouton masqué | ✅ **403 live** |
| V5-05 Recherches sauvées | ✅ `fail(403)` (`prospection/+page.server.ts:413-415`), `data.recherches` vide (`:241`) | ✅ « Mes recherches » + « Sauvegarder » gated | ✅ **body action `status:403` « Recherches sauvegardées désactivées »** |
| V5-06 Alertes (cron) | ✅ inerte 200 `{checked:0}` (`cron/alertes/+server.ts:67-69`) | ✅ « Créer une alerte » gated | ✅ **live : `{"message":"Alertes désactivées (recentrage Prospection V5)","checked":0}`** |
| V5-07 Zefix (cron signaux) | ✅ flag env `SIGNAUX_ZEFIX_ENABLED` strict, `importZefix` non appelé (`cron/signaux/+server.ts:386`) | s.o. | statique (cron non déclenché live) |
| V5-08 Pont Veille→Prospection | ✅ propage `resp.status` 403 du sous-endpoint (`from-intelligence/+server.ts:70-72,101-103`) ; chip `zefix` aboutit | s.o. | statique (le 400 obtenu en curl = validation d'input sur payload incomplet, **pas** une régression ; propagation confirmée code) |

**Clé `GOOGLE_PLACES_API_KEY`** : ✅ jamais exposée (lue via `$env/dynamic/private`, 0 occurrence `PUBLIC_*`, gate 403 tombe avant lecture de la clé → 0 coût/0 quota).

---

## B. Anomalies & dette (ANO) — statique, 11 vérifiées

| ID | Statut | Sévérité | Trivial/Décision | Constat |
|---|---|---|---|---|
| ANO-01 | CONFIRMÉE | L (M à l'échelle) | Décision | Pas de pagination Entreprises/Contacts (`SELECT *` non borné, filtre 100% client). `entreprises/+page.server.ts:18-21`, `contacts/+page.server.ts:14-18`. |
| ANO-02 | NUANCÉE | I | Trivial | Liens Veille `/veille/...` non cassés (redirect 308 `hooks.server.ts`) mais aller-retour HTTP superflu. `crm/veille/+page.svelte:176,212,244`. |
| ANO-03 | CONFIRMÉE | I (doc) | Trivial | Cron `intelligence` documenté mais inexistant (réel : signaux, intelligence-archive, alertes, nettoyage-crm, lead-rescore). `CLAUDE.md:111` vs `vercel.json`. |
| ANO-04 | CONFIRMÉE | L | Décision | Endpoint REST `api/veille/themes` jamais appelé (écritures via form actions). Dette / divergence. |
| ANO-05 | CONFIRMÉE | I (code mort) | Trivial | `/api/veille/read` orphelin (marquage lu réel dans le `load` du détail). |
| ANO-06 | **RÉFUTÉE** | — | — | Le rate-limit 10/min S'APPLIQUE bien à `/crm/log` POST (`rate-limit-paths.ts:19`, câblé `hooks.server.ts:60-69`). Constat d'origine erroné. |
| ANO-07 | CONFIRMÉE | **M** | Décision | Pas de file offline persistante terrain (in-memory only). Message UI « saisie conservée » **trompeur** (volatile). `terrain/CompteRenduForm.svelte:138-177`. |
| ANO-08 | NUANCÉE | I | Décision | Export découvrable via Reporting (onglet Export CSV) mais pas de bouton dans Entreprises/Contacts ; export masqué en mobile. Endpoint gardé session. |
| ANO-09 | CONFIRMÉE (assumée) | L (conditionnel) | Décision | DELETE photos/visits sans garde ownership (modèle plat 3 fondateurs documenté, log si owner≠acteur). À durcir au 4e user. |
| ANO-10 | **RÉFUTÉE** | — | — | `updateNextAction` a un déclencheur UI : `PipelineQuickAdvance.svelte:115,243` (modale), monté `entreprises/+page.svelte:397`. Constat d'origine erroné. |
| ANO-11 | CONFIRMÉE | L | Décision | Shell `/terrain` sans bouton déconnexion (`terrain/+layout.svelte`, `MobileTabBar` 2 onglets). |

Récap : 7 confirmées · 2 nuancées · 2 réfutées. Sévérités : 0 C/H · 1 M (ANO-07) · 4 L · 4 I.

---

## C. Sweep UX live - pages cœur - ✅ FAIT (2026-06-07, Chrome MCP connecté)

Passe live S3 déroulée le 2026-06-07 via agents `ui-auditor` séquentiels (1 seul Chrome, session prod authentifiée Pascal, golden v9 actif, **audit non destructif : aucune mutation soumise sur la prod**). Le blocage « extension Chrome non connectée » est levé (session CLI keychain dédiée ; les sous-agents héritent du navigateur sélectionné par le thread principal via le serveur MCP).

**Statuts (51 stories, 5 pages)** : 27 ✅ · 14 ⚠️ (vérif visuelle seule : mutation non exécutée sur prod, OU non exerçable car DB vide) · 10 ⬜ (non testable : cas dégradé, flag mobile non actif, compte non-admin requis, cron) · **0 ❌**.

| Surface | Stories | ✅ | ⚠️ | ⬜ | Note données réelles |
|---|---|---|---|---|---|
| Dashboard `/crm` | US-DASH-01..07 | 4 | 2 | 1 | peuplé (96 leads triage, 276 signaux) |
| Entreprises | US-ENT-01..12 | 5 | 6 | 1 | DB = 2 entreprises (vues qualifiées/cards non stressées) |
| Contacts | US-CON-01..10 | 4 | 5 | 1 | **DB = 0 contact** → liste/tri/slide-out non exerçables |
| Pipeline | US-PIPE-01..09 | 4 | 0 | 5 | **pipeline vide (0 opportunité)** → drag/édit/perdu non exerçables |
| Signaux | US-SIG-01..13 | 10 | 1 | 2 | peuplé (276 + 1227 archivés) → audit riche |

**Passe 2 - autres surfaces (2026-06-07)** : Auth (US-AUTH) volontairement ⬜ - la tester en live (déconnexion/OTP) casserait la session prod + brûlerait le quota → couverte en statique (§A protocole).

| Surface | Stories | Statuts | Note |
|---|---|---|---|
| Portail | US-PORT-01..03 | 3 ✅ | cards/header/responsive conformes ; `ff_decoupe` ON (état `soon` non observable) |
| Nav / layout | US-NAV-01..09 | 7 ✅ · 1 ⚠️ · 1 ⬜ | menu/aria-current/badge OK ; déconnexion non cliquée ; burger <1024px = DevTools manuel |
| Prospection | US-PROS-01..14 | 6 ✅ · 8 ⚠️ | onglets/recherche/tri OK ; mutations non soumises ; **V5 8/8 imports coupés reconfirmé live** |
| Veille (×4) | US-VEI-01..14 | 7 ✅ · 7 ⚠️ | kiosque/thèmes/item/404 OK ; édition non-lue préservée (badge intact) |
| Reporting | US-REP-01..04 | 3 ✅ · 1 ⚠️ | conversion/export/empty OK ; graphes peuplés non vérifiables (DB vide) |
| Coûts API | US-COUT-01..03 | 2 ✅ · 1 ⚠️ | données réelles, graphe 12 sem OK |
| Aide | US-AIDE-01..04 | 4 ✅ | recherche/TOC/scroll-spy/deep-link **sans faute** |
| Log / Feedback | US-LOG-01..07 | 3 ✅ · 3 ⚠️ · 1 ⬜ | liste/filtre/export présents ; actions admin non exécutées ; refus non-admin = ⬜ |
| Auth / garde | US-AUTH-01..14 | 14 ⬜ | non testable live sans casser la session prod ; couvert statique |

**Limite de couverture (à arbitrer)** : 3 des 5 pages sont quasi vides en prod (Contacts 0, Pipeline 0, Entreprises 2). La passe live a validé structure, états vides, a11y, cohérence golden v9 et parcours non destructifs ; elle n'a PAS pu valider les comportements sur données peuplées (tri, pagination serveur, slide-out détail rempli, drag&drop kanban, counts d'onglets). Seul Signaux fournit un jeu réel. → décision : re-auditer avec données (seed/preview branch) ou accepter la couverture états-vides.

## D. Hors 1re passe (figé ⬜ → passe 2)

Auth/garde (US-AUTH), Portail (US-PORT), Nav/layout (US-NAV), Prospection parcours positifs (US-PROS), Veille 4 sous-pages (US-VEI), Reporting (US-REP), Coûts API (US-COUT), Aide (US-AIDE), Log (US-LOG), Terrain mobile (US-TER). Terrain/mobile = DevTools Device Toolbar **manuel (Pascal)** par règle projet.

---

## E. Findings passe live (S3 Chrome) - 2026-06-07

> Catalogue dédupliqué cross-page. Cross-check : ≥2 sources = catalogue ferme ; 1 source live = vérif code par le thread principal. **Zéro fix appliqué** (règle audit). Tous les défauts sont des findings transverses (aucun KO bloquant de story).

### High (4 familles)

| ID | Titre | Sources | Pages | Constat + preuve mesurée | Réf code |
|---|---|---|---|---|---|
| LIVE-H1 | KPI dashboard sort du CRM | live + code (2) | Dashboard | Carte KPI principale « À trier ce matin » (96 leads) → `href="/prospection?statut=nouveau"` **sans `/crm`** → `fetch` = `opaqueredirect` (sort du CRM, garde hooks → login). Voisins corrects (`/crm/signaux`, et `TriageQueue.svelte:125` = `/crm/prospection?...`). La garde Vitest `no-root-crm-links` ne couvre pas les liens stockés en variable. **✅ CORRIGÉ 2026-06-07** : `KpisBento.svelte:23` → `/crm/prospection?statut=nouveau` (cohérent avec ses voisins) + garde `no-root-crm-links` renforcée (couvre les liens stockés en variable), test vert. **Non encore déployé.** | `KpisBento.svelte:23,39` |
| LIVE-H2 | Focus non restitué au déclencheur après fermeture | live ×3 | Entreprises, Contacts, Signaux | Fermeture slide-out/modale (Escape) → `document.activeElement = <body>`, pas la ligne/carte déclencheuse (WCAG 2.4.3). Le focus-trap à l'ouverture est OK. **Systémique** composant SlideOut/Modal. | SlideOut / ModalForm |
| LIVE-H3 | Dialog sans nom accessible | live ×4 | Dashboard, Entreprises, Contacts, Signaux | slide-out détail + modales create = `role=dialog aria-modal=true` SANS `aria-label`/`aria-labelledby` (titre `<h2>` non lié) → lecteur d'écran annonce « dialog » nu (WCAG 4.1.2/1.3.1). Le drawer mots-clés Signaux (`aria-labelledby="kw-drawer-title"`) = **modèle conforme à répliquer**. **Systémique**. | SlideOut / ModalForm |
| LIVE-H4 | Contrastes AA fail (composants porteurs d'info) | live + tokens (2) | Signaux, Entreprises | ScorePill « chaud » texte blanc sur dégradé rouge `#F65447→#D5392C` = **3.35:1** (bord clair) ; badge statut « Nouveau » `#F79009` sur `#FFFAEB` = **2.25:1**. Sous AA 4.5:1 (texte 12px porteur d'info). **Systémique tokens** (cf. `feedback_a11y_deep_tokens_with_axe_gate` : variante `--deep`). | ScorePill, Badge statut, `app.css:36-37` |

### Medium (5)

| ID | Titre | Sources | Pages | Constat |
|---|---|---|---|---|
| LIVE-M1 | Empty « 0 résultat » non contextuel | live | Entreprises (risque Contacts) | Recherche sans résultat affiche l'empty **global** (« Aucune entreprise. Ajoutez-en une… ») au lieu d'« aucun résultat » → trompeur (les entreprises existent, juste filtrées). |
| LIVE-M2 | Vue Archivées non paginée | live | Signaux | `?vue=archivees` rend **~1000-1227 cartes DOM d'un coup** (la vue active cape à 25, l'archive non) → risque de jank. Lié à ANO-01. |
| LIVE-M3 | Mojibake encodage données Zefix archivées | live | Signaux | Cartes archivées affichent « fond� », « à l'�tranger », « en Suisse et � l'�tranger » → corruption d'encodage des données (probablement la migration V5 soft-archive 1227 Zefix). Donnée, pas UI, mais visible. |
| LIVE-M4 | Autocomplete entreprise sans sémantique combobox | live | Contacts | input sans `role/aria-expanded/aria-autocomplete/aria-controls`, dropdown `<div>` sans `role=listbox`, items sans `role=option` (mitigé : items = vrais `<button>` focusables). |
| LIVE-M5 | Radius modale formulaire 16px vs golden 12px | live ×2 | Contacts, Pipeline | `ModalForm` `border-radius:16px` ; golden `modal.borderRadius=12px`. Divergence cohérence (sur les modales formulaire ; les slide-out latéraux 0px = OK). |

### Low (groupés)

- Saut de niveau de titre H1→H3 sans H2 ; libellés d'étape en `<span>` non-heading (Pipeline). Empty `<h3>` weight 500 vs golden 600 (Contacts).
- Carte signal `radius 12px` vs golden 10px (Signaux) ; input modale `radius 10px` vs golden 8px (Contacts).
- Coquille FR « Voir les N autres **signalaux** » (Signaux). Ligature incohérente « Cœur » vs « Coeur vitrage » (Signaux).
- Onglet « **Closed** » (anglais) au milieu d'une UI FR (Pipeline).
- 1re colonne table (logo) `<th>` vide sans `srLabel`/`aria-label` (Entreprises ; golden exige `Column.srLabel`).

### Faux positif écarté (cross-check)

- Pipeline « `outline:none` sur les tabs » (1 source) → **INFIRMÉ** par Signaux : `.tab:focus-visible { outline:2px solid var(--color-primary); outline-offset:2px }` et idem `.card-signal:focus-visible` sont présents → focus clavier conforme golden. L'agent Pipeline n'avait pas déclenché l'heuristique `:focus-visible`. Retiré du catalogue.

### Positifs notables (cohérence golden v9 tenue)

H1 22px/600 #111827 DM Sans sur toutes les pages ; primary CTA #2F5A9E ; boutons primitifs 40px/radius 10px ; icônes Lucide ; ScorePill systémique ; tablist `aria-label` ; tri tableau `aria-sort` ; 0 erreur console runtime sur les chemins exercés ; tous les liens internes préfixés `/crm` **sauf** LIVE-H1.

---

## E.2 Findings passe 2 (agents 6-10) - extensions & nouveaux

> Mêmes règles (cross-check, zéro fix). La passe 2 confirme/étend les familles passe 1 et ajoute quelques findings.

### Extensions des familles High
- **LIVE-H1** : ✅ **CORRIGÉ** (cf. §E). MAIS **ANO-02 confirmée en live** : les liens de la liste Veille (`/veille/<id>`, `/veille/item/<slug>`) sont **sans `/crm`** (ne marchent que via redirect 308) → **même famille**, NON corrigé (dette `veille/+page.svelte`). 2e trou de garde : template literals `href={`/veille/${id}`}`. **À grouper avec LIVE-H1.**
- **LIVE-H2 (return focus manquant)** : confirmé aussi sur Veille + Log → touche Entreprises, Contacts, Signaux, Veille, Log. **Exception conforme = Prospection `LeadSlideOut`** (restaure le focus) → composant **modèle**.
- **LIVE-H3 (dialog sans nom accessible)** : confirmé sur Prospection (slide-out + ImportModal) + Veille (3 modales). **Exceptions conformes = Log `FeedbackForm` (`aria-labelledby`) + Signaux drawer mots-clés** → modèles.
- **LIVE-H4 (contrastes AA fail)** : élargi en **défaut de tokens systémique**. Ambre `#F79009` en **texte** échoue partout (badge « Nouveau » Entreprises/Signaux/Veille 2.25-2.35 ; KPI tendance Coûts 2.35 ; badge « À actionner » Log 2.25). + ScorePill « chaud » blanc/rouge 3.35 (Signaux/Prospection) + badges rouge `#F04438`/`#FEF3F2` 3.46 (Log).

### Nouveaux findings passe 2
| ID | Sév. | Page(s) | Constat |
|---|---|---|---|
| LIVE-H5 | H (a11y) | Log | 7 `<th>` **sans `scope`** → table non navigable au lecteur d'écran. |
| LIVE-M6 | M | Veille (×4), Log | H1 non sémantique : H1 générique identique sur les 4 sous-pages Veille (titre réel en H2) ; **2 `<h1>`** sur Log (header + main). |
| LIVE-M7 | M | Veille | Item public sans `<article>` ni `<time>` (archétype editorial). |
| LIVE-M8 | M | Nav | Bouton de repli sidebar perd son nom accessible en mode réduit (icône-seule sans `aria-label`). |
| LIVE-M9 | M | Log | `<tr>` cliquable sans `aria-label`/`role`. |
| LIVE-L+ | L | multi | radius cards 12 vs 10 (Reporting/Coûts/Signaux) ; `<title>` séparateurs incohérents (`-` vs `·`) ; H1 portail 30px / Log 24px vs 22px ; badges Log custom (pill 9999px) hors primitive ; `aria-pressed` absent (boutons statut Log) ; `aria-current` absent (scroll-spy Aide) ; drift copy empty Prospection (mentionne import masse pré-V5). |

### Reconfirmations positives
- **V5 8/8 désactivations reconfirmées EN LIVE** (Prospection) : imports masse coupés, ImportModal = recherche nominale RC/TEL seule, clé Google jamais exposée.
- **Aide 4/4 ✅** sans faute. Cohérence golden tenue (primary, DM Sans, Lucide, `:focus-visible` global, `aria-current` nav, 0 erreur console runtime). Modèles a11y conformes : `FeedbackForm`, `LeadSlideOut`, drawer mots-clés Signaux.

---

## Synthèse finale (statique figé + passe live complète 2026-06-07)

- **Bloc statique/runtime (§A/B)** inchangé : 1 bug prod confirmé (REG-01 cause 2, FK lead transféré, H) ; 1 comportement à arbitrer produit (REG-01 cause 1) ; **0 régression V5 (8/8, reconfirmé live)** ; 1 M (ANO-07) + dette ; 2 anomalies réfutées (ANO-06, ANO-10).
- **Passe live 13 surfaces (§C/E/E.2)** : **0 KO bloquant de story**. ~135 stories couvertes (live + statique). Pas de page cassée.
- **Findings live = 5 familles H** : LIVE-H1 (lien KPI, **✅ corrigé**) ; LIVE-H2 (return focus) ; LIVE-H3 (dialog sans nom) ; LIVE-H4 (contrastes tokens ambre/rouge) ; LIVE-H5 (th sans scope Log). **4 des 5 sont des défauts a11y portés par des composants/tokens partagés** → un fix par composant/token corrige plusieurs pages (fort ROI). + ~5 familles M + dette L. 1 faux positif écarté (cross-check).
- **Modèles à répliquer** identifiés en live : `LeadSlideOut` (return focus), `FeedbackForm` + drawer mots-clés (nom accessible). Le batch a11y = aligner les composants partagés sur ces modèles.
- **Couverture bornée par les données prod vides** (Contacts 0, Pipeline 0, Entreprises 2) : comportement sur données peuplées (tri/pagination/slide-out rempli/drag&drop) reste à valider (seed/preview). Seuls Signaux, Coûts, Prospection étaient peuplés.
- **Règle cross-app** : tout fix passe par audit du composant partagé avant déploiement.
