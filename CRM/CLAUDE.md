# CRM FilmPro : CLAUDE.md

**Note migration** : ce fichier vit dans `CRM/CLAUDE.md` (path Vercel `rootDirectory: CRM`) ; container racine = stub. Contexte → `memory/project_appfactory_restructure.md`.

**Statut :** Portail FilmPro multi-outils en prod : CRM (`/crm`) + Découpe Films (`/decoupe`) sur `filmpro-portail.vercel.app`. Formation IA = projet autonome `Formation/` (`cc` option 5). Historique (V3 terrain, Signaux V4, golden v9, restructure S173-S174) → `archive/`.
**Dernière mise à jour :** 2026-07-01 (Étiquettes migrées en **PAGE DÉDIÉE + destinataire de mailing**, **LIVRÉ PROD** `e263240` ; détail → § Livré). Trunk unique = `main` ; Flag `ffCrmListesV2` **ON `pascal@`+`antoine@`** (Vagues 1+2+3 live). Prod = `filmpro-portail.vercel.app` : **push `main` auto-déploie en production** (vérifié 26/06). **Prochain bug :** #001.
**Session courante :** 2026-07-01 - **Étiquettes : page dédiée `/crm/campagnes/[id]/etiquettes` + destinataire de mailing LIVRÉES PROD** (`e263240`). Destinataire éditable inline (générique, **non persisté = 0 migration**) imprimé **sous** la raison sociale ; **édition en lot** (barre d'actions groupées) ; **aperçu de la planche Avery réelle** au clic Télécharger (SVG du moteur + Outfit en FontFace = PDF au pixel près). Adresse incomplète ni sélectionnable ni imprimable. Ancien volet `EtiquettesPanel.svelte` retiré, menu campagne -> navigation, marges Campagnes resserrées. QA : **2379 vitest** (14 neufs TDD), svelte-check 0/0, build OK, **e2e 4/4** (Outfit réel). Revue adversariale **18 agents** (6 lentilles x vérif) : 5 correctifs, **sécu 0 C/H**. **À FAIRE Pascal** : smoke OTP. Détail → [[project_etiquettes_destinataire_page_dediee_2026-07-01]] + [[audit_secu_2026-07-01_etiquettes_destinataire_page]] + § Livré.
**Sessions précédentes (condensé)** - détails dans `archive/` (S165-S175, S122-S125, S70-S107).


---

## SOUS-PROJETS

Depuis la restructuration `~/Claude/Projets` (2026-06-01), ce repo héberge le **CRM FilmPro** (app principale). Formation (ex sous-projet) est désormais top-level (`~/Claude/Projets/Formation`) ; Consulting est sous LED Studio. Mapping complet : `~/.claude/CLAUDE.md`.

| Dossier | Repo Git | Statut | URL prod |
|---------|----------|--------|----------|
| `CRM/` | `pascalmedecin-cmd/appfactory-cli` (=racine) | Production | <https://filmpro-portail.vercel.app> (ex `filmpro-crm` → 308) |

**`/start` ici = scope CRM FilmPro** (slug=`filmpro`, subproject=`crm` ; ex-`appfactory`, migré 2026-06-01). Source : `~/.claude/cockpit/projets/filmpro/entries.jsonl` filtré par subproject.

---

## QUICK START

```bash
# Ce repo contient le code de l'app CRM FilmPro
# Stack : SvelteKit + Supabase + Vercel
# CLAUDE.md vit dans CRM/ ; le path Vercel rootDirectory est CRM
```

---

## ROLE

Product Engineer sur l'app CRM FilmPro (production, client interne FilmPro). Travail au CLI Claude Code, code-first.

## MÉTIER FILMPRO (référence dure, ne jamais inventer)

FilmPro = spécialiste des **traitements pour vitrage** (films et vernis) en Suisse romande. 3 enjeux : confort thermique, sécurité, discrétion. Posture conseil (analyse contexte avant solution, sélection restreinte de solutions éprouvées, normes SIA). Cibles : résidentiel + bâtiment pro (régies, architectes, facility managers, bureaux d'études) via réseau de partenaires.

**Le nom prête à confusion : FilmPro NE FAIT PAS de production vidéo.** « Film » = film pour vitrage.

→ Brief verbatim + règles d'application (scoring, prospection appels d'offres SIMAP, créations Zefix, copy UI) : `~/.claude/projects/-Users-pascal-Claude-Projets-FilmPro/memory/project_filmpro_metier.md` (consulter AVANT toute proposition de mots-clés, ciblage, ou wording orienté métier).

---

## STACK

| Couche | Outil | Role |
|--------|-------|------|
| Frontend | SvelteKit + Tailwind | App web, composants testables |
| Backend | Supabase (PostgreSQL) | BDD, auth, API, stockage |
| Hebergement | Vercel | Deploy auto, previews, domaines, CDN |
| Tests | Vitest + Playwright | Tests unitaires + navigation complete |
| Code | GitHub | Versionne |

---

## COUTS

→ Détail coûts (opérateur : Claude Code Max + Vercel Pro + GitHub + Supabase Free ≈ 120-220 EUR/mois ; par app client : Supabase + Vercel + domaine ≈ 0-26 EUR/mois) : `archive/2026-05-13-sessions.md`.


---


## DECISIONS STRUCTURELLES

- Repo `appfactory-cli` (ancien `appfactory` reste consultable)
- Design code-first : composants custom + kits Figma Community gratuits (Figma Pro abandonné, deep research 2026-04-04). Validation client = prototypes Vercel preview.
- CSS scoped obligatoire pour le layout structurel (sidebar, header, nav) : Tailwind responsive (md:hidden/md:block) ne marche pas en Tailwind v4 pour ce cas.

### Decisions UX + Prospection (G36)

→ Archive intégrale : `archive/decisions-structurelles-crm.md` (6 écrans principaux, slide-out panels, saisie rapide, 100% sources gratuites, modèle unifié `prospect_leads`, scoring auto 0-13). Specs prospection complètes : `docs/SPECS_PROSPECTION.md`.

### Doctrine styling : Tailwind utilities + CSS scoped

→ Règle tranchée S180 (audit 360 V3b I-04) : Tailwind utilities pour le détail réutilisable (spacing/couleurs via tokens/typo/états/responsive trivial côté contenu, jamais off-grid `p-[13px]`), `<style>` scoped Svelte pour le layout structurel (sidebar/header/kanban) + keyframes/transitions (token `--ease-out-expo`) + pseudo-éléments + `:global()` ciblés ; jamais de CSS global ad hoc hors `app.css` / `!important` / classe dupliquant un token ; primitives (`Button`/`Input`/`Card`/`Modal`/`DataTable`/`Tabs`) = source unique, on compose. Détail : `memory/feedback_crm_styling_doctrine.md`.


### Sécurité - décisions assumées (audit 360 V3b L-02, L-03)

- **CSP `unsafe-inline` (L-02)** : la `Content-Security-Policy` posée dans `hooks.server.ts` autorise `'unsafe-inline'` sur `script-src` et `style-src`. C'est un **prérequis de l'hydratation SvelteKit** (scripts inline + styles scoped injectés au runtime) ; le retirer imposerait un système de nonce/hash dynamique = refactor framework. Risque résiduel XSS jugé **acceptable** : CRM mono-tenant ≤ 10 admins `@filmpro.ch` (OTP), aucun contenu utilisateur tiers rendu en HTML brut, toutes les sorties dynamiques échappées (`esc()` / `escapeHtml`). À revisiter si SvelteKit expose une option nonce-based simple, ou si une surface UGC apparaît.
- **RLS « mono-tenant plat » (L-03 / L-04)** : ~11 tables ont une policy `FOR ALL TO authenticated USING (true)` - tout utilisateur authentifié voit/modifie/supprime tout (photos, visites, leads, opportunités, veille…). C'est une **décision design assumée** (S127 Q2 Pascal : 3 fondateurs FilmPro symétriques). Les endpoints DELETE photos/visits loggent quand un fondateur agit sur la donnée d'un autre (traçabilité), sans bloquer. **À DURCIR avant l'ajout d'un 4e utilisateur non-fondateur** : passer à des policies `created_by = auth.uid()` (ou rôle admin) + tests d'intégration RLS contre une vraie DB avec une session non-admin. Voir mémoire `feedback_rls_multitenant_durcissement_si_4_users.md` + § RISQUES OUVERTS (M-48, RLS non couverte par les tests Vitest).

---

## INFRA EN PLACE

- **Prod** : https://filmpro-portail.vercel.app (Vercel : **git integration auto-déploie `main` en prod à chaque push**, vérifié live 26/06 ; `vercel deploy --prod` reste dispo en manuel) ; ancienne `filmpro-crm.vercel.app` conservée et redirigée 308 → nouvelle (hook). Supabase EU (projet `appfactory`, 10+ tables, RLS active, service role key configurée)
- **Auth** : OTP email 6 chiffres @filmpro.ch + session 7 jours httpOnly ; SMTP Resend (domaine verifié, free plan)
- **APIs** : Zefix REST + search.ch + fal.ai Flux 1.1 Pro Ultra (partage clé avec Enseignement) - Pexels/Unsplash supprimés S67
- **Crons** : **6 crons Vercel** `/api/cron/{signaux,alertes,lead-rescore,daily-email,intelligence-archive,nettoyage-crm}` sécurisés `CRON_SECRET` + service role. La **veille hebdo NE tourne PAS en cron Vercel** : GitHub Actions vendredi (cap durée Vercel). Le cron `intelligence` (génération veille) n'existe plus ; `media-enrich` supprimé S67.
- **Tests** : Vitest 2327 (dernier run vérifié 2026-06-30, refonte aide ; supabase 2.108 + TS6) + Playwright e2e (suite + P1/P2/P3 Prospection). Accessibilité : focus trap + ConfirmModal partout, axe-core 0 violation modale P3. Sécurité : Zod sur 20 form actions/endpoints, rate limiting 10/min, headers CSP/XFO/referrer, timing-safe secrets

→ Détail intégral (env vars, BDD exhaustive, liste tests, liste crons, headers sécurité, pagination serveur) : `archive/infra-crm-detail.md`

## DOCUMENTATION

- `docs/SPECS_PROSPECTION.md` : specs module prospection (sources, scoring, UI, dedup).

→ Inventaire composants EN PLACE → `archive/inventaire-composants.md` (consulter avant d'en créer de nouveaux).

### Historique condensé (archives)

- Détail S1-16 (UX 6 écrans, auth OTP+MFA, PWA, prospection), S70-79 (formation-ia ingestion), S122-125 (V1 mobile clos), audit CRM 2026-04-04 → `archive/decisions-sessions-*.md` + `archive/2026-04-28-sessions.md` + `archive/audit-crm-2026-04-04.md`.

---

## NE PAS FAIRE

- Deployer sans tests (Vitest + Playwright minimum)
- Toucher des composants partages CRM sans audit cross-app

## TOUJOURS FAIRE

- Chaque etape produit un livrable concret et mesurable
- Review humaine visible dans le terminal avant tout deploy
- Tests automatises avant mise en preview
- **Inscription cockpit mid-session** : ne JAMAIS éditer `entries.jsonl` directement (même avec backup) pour ajouter une tâche. Voies sûres : (a) drag UI cockpit `Idée → Transmis`, (b) `POST /api/entries/appfactory` body `{title, summary, subproject:"crm"}` puis `POST /api/queue/appfactory` body `{tasks:[{id}]}`. Origine bug S177 2026-05-09 (entries CLI fraîches purgées par /fin-session parallèle). Fix structurel grace period 30 min livré S180 (`cockpit/lib/entry_protection.py`), mais la voie HTTP/UI reste la voie officielle. → voir `~/.claude/projects/-Users-pascal--claude/memory/feedback_cockpit_watcher_purge_cli_entries_S177.md`.

## RISQUES OUVERTS (sécurité)

- **RLS Supabase non couverte par les tests Vitest (audit 360 M-48, gravé S178 V3a-2)** : Vitest mocke `@supabase/supabase-js` → **aucun test unitaire ne prouve le comportement RLS réel** (~25 vecteurs d'autorisation « verts » sans garantie). Mono-tenant ≤ 10 admins @filmpro.ch, suite d'intégration non prévue V1. **Avant de construire par-dessus un contrôle d'autorisation : lire le code + vérifier manuellement en prod/staging avec un compte au rôle cible** (incident réf : 2026-04-18 formation-ia, 3 users bloqués prod avec 7 tests verts). Détail : `rules/quality.md` § RLS + `feedback_rls_mocks_insufficient_S99.md` + `feedback_rls_auth_lookup_needs_service_role.md`.

## REGLES TECHNIQUES PROJET

→ Tests mobile/responsive : Chrome DevTools Device Toolbar manuel (Pascal) **obligatoire** ; Playwright `viewport:{width,height}` seul et MCP `resize_window` **interdits** comme substituts (Playwright preset `devices['iPhone 14 Pro Max']` OK pour findings OBJECTIFS uniquement - réf `CRM/tests/mobile.spec.ts`). Règle complète : `memory/feedback_crm_mobile_testing_devtools.md`.


## Prochaine session

**Prochaine attaque** : **Emailing prospection automatisée** (§ Backlog dev) - à cadrer (contenu/cible/séquence, pas de réunion), puis 1 session de code + gate OFF par défaut. Sinon gestes Pascal (§ Chez Pascal : smoke OTP dont la nouvelle page Étiquettes, Daily Email).

### Règle backlog (WIP-limité, gravée 2026-06-28)

Le « **backlog dev** » ne liste QUE l'actionnable-par-Claude **sans dépendance externe** ; le reste rangé à part (gestes Pascal → § Chez Pascal ; attentes datées → § Parking ; idées → Watch, jamais une tâche). **No-debt strict** : un finding se fixe/tranche dans la session, jamais différé. Anti-pattern banni : « 1 fermée → 2 ouvertes ». **Titre d'un item bloqué = explicite** : `[BLOQUÉ - {qui/quoi débloque}] {action claire}`, jamais cryptique. Détail + exemples → [[feedback_backlog_wip_anti_gonflement]]. **État 2026-06-30** : baseline saine (2327 verts, build OK).

### Backlog dev (actionnable par Claude)

- [ ] **[EXÉCUTABLE]** Emailing prospection automatisée : moteur d'envoi automatisé de séquences d'emails aux prospects (Resend, **templates pré-rédigés, zéro LLM** - règle dure). Étape 1 = cadrage court Pascal (contenu/cible/séquence/fréquence/déclencheur, **pas de réunion**), puis 1 session de code + gate ON/OFF (**OFF par défaut**). **Gate de mise en prod** (pas avant le dev) : (a) DNS `send.filmpro.ch` Resend, (b) base légale nLPD + mention, (c) contenu validé. (Ex-« Vague 4 ».)

### Chez Pascal (hors backlog dev - gestes manuels, quand tu veux)

- [ ] **[BLOQUÉ - toi : 1 login OTP en prod]** Faire le smoke OTP de production end-to-end (@filmpro.ch ; boot + page login déjà OK). **Le délog 7 j est désormais validé par test réel contre prod** (sessions mintées, 29/06) - le smoke ne reste utile que pour le login OTP réel + pages authentifiées : **Étiquettes de publipostage (Campagnes -> menu campagne -> « Étiquettes d'adresses » -> cocher -> « Compléter » -> « Télécharger le PDF », livré prod 30/06)**, Centre d'aide (3 niveaux), PDF Découpe, graphes layerchart. **Si KO → `vercel rollback`.**
- [ ] **[BLOQUÉ - toi : poser 1 variable Vercel après le smoke OTP]** Allumer l'envoi du Daily Email : `EMAIL_DAILY_ENABLED=true` en env Vercel Prod (zéro redéploiement, gate OFF = 0 envoi). → [[project_daily_email_module_2026-06-25]].

### Parking (attente datée - rien à faire avant la date)

**Vide.** (Dashboard qualité veille **retiré 2026-06-29** sur décision Pascal : il surveille le contenu de la veille manuellement chaque semaine et revient si besoin - pas d'écran webapp, pas de tâche, pas de watch.)

### Coupé du backlog (→ watch, plus des tâches)

- Chantier 3 portail : non cadré = pas une tâche (recadrer si l'objet redevient actuel).
- Durcissement RLS : conditionnel à un 4e user non-fondateur (inexistant) → [[feedback_rls_multitenant_durcissement_si_4_users]].
- knip : `apply-*-migration` archivables (cosmétique, cadré `6c477cf`) + 1 faux positif assumé `MINUTE_MS|RATE_LIMIT_WINDOW_MS` (deux exports live/intentionnels, audit L-18, **ne pas ré-investiguer**). Types morts veille `Theme`/`SearchTerm`/`LegacySearchTerm` soldés 30/06. → [[feedback_knip_verify_grep_before_delete]].
- Time-box session Supabase : geste Dashboard one-shot remis à Pascal, **non-faille** (le délog 7 j app suffit, prouvé prod) → pas une dette (procédure : Sessions → « Time-box user sessions » 168 h + « Detect refresh token reuse » ON). → [[audit_secu_2026-06-29_session_delog_7j]].
### Livré cette session

- [x] ~~**Étiquettes : page dédiée `/crm/campagnes/[id]/etiquettes` + destinataire de mailing**~~ - Fait 2026-07-01 (**LIVRÉ PROD** `e263240`, ultracode/xhigh). Migration du volet V1 vers une page dédiée (golden v2). Destinataire éditable inline (générique tout mailing, **non persisté = 0 migration DB**) imprimé **sous** la raison sociale sur l'étiquette Avery (1 ligne ellipsée, cellule préservée). **Édition en lot** (barre d'actions groupées, un seul concept de sélection). **Aperçu de la planche Avery réelle** au clic Télécharger (SVG du moteur + Outfit en FontFace data-URL = PDF au pixel près). Adresse incomplète ni sélectionnable ni imprimable. Ancien volet `EtiquettesPanel.svelte` retiré, menu campagne -> navigation, marges Campagnes resserrées (1160px). TDD (14 tests neufs), **2379 vitest**, svelte-check 0/0, build OK, **e2e 4/4** (police Outfit réelle après fix). Preuve visuelle réelle (moteur + page CSS/tokens réels). Revue adversariale **18 agents** : 8 confirmés -> 5 correctifs (race inter-campagnes, fuite d'état aperçu, maxlength, défense sélection⊆complète, e2e Outfit) ; 4 rejetés ; **sécu 0 C/H**. → [[project_etiquettes_destinataire_page_dediee_2026-07-01]] + [[audit_secu_2026-07-01_etiquettes_destinataire_page]].
- [x] ~~**Étiquettes de publipostage (page Campagnes, volet V1)**~~ - Fait 2026-06-30 (**LIVRÉ PROD** `187f2ae`, ultracode/xhigh). *(Migré en page dédiée le 01/07, ci-dessus.)* Page Campagnes -> volet sélection prospects -> **PDF planche Avery 6122** (24/page 70×36 mm, texte centré, NOM gras, police **Outfit** embarquée) jsPDF+svg2pdf (doctrine Découpe, géométrie portée du pipeline étiquettes Marketing) + bouton **« Compléter »** par ligne (lookup **unitaire** search-ch, V5-compatible, pas de batch). **Adresse lue du stock, zéro API à la génération** ; complétion = au moment des recherches / du bouton. **Tout sur la page Campagnes** (aucune navigation). UI premium (redesign-skill). QA : 2365 vitest (73 feature), svelte-check 0, build OK, e2e PDF Outfit 3/3, visuels validés. Revue 16 agents : sécu 0 finding, 8 med/low/info tous corrigés. **Reste Pascal : smoke OTP.** → [[project_etiquettes_publipostage_campagnes_2026-06-30]] + [[audit_secu_2026-06-30_etiquettes_publipostage]].
- [x] ~~**Refonte exhaustive du Centre d'aide (`/crm/aide`) : contenu à jour + UI premium**~~ - 2026-06-30 (**LIVRÉ PROD** `d402fe7`+clôtures, ultracode/xhigh). Découverte 7 lecteurs → rédaction main-thread → vérif adversariale 4 lentilles (**fact-checker 0 finding**). Contenu remis à jour : portail multi-outils, fiche Campagnes, Entreprises serveur, éditeur veille, Daily Email, **6 crons** (avant 5), Prospection V5, Coûts API recadrés, Log, auth OTP. UI premium golden v9 (masthead, rail sommaire, raccourci `/`, 0 animation scroll). Fix 2 diagrammes pré-existants (flèches invisibles). **Clôture zéro-dette** : `prerender=false` sur la route aide + 3 tests portail rendus flag-robustes (34/34) + 3 types morts veille soldés. QA : vitest 2327, svelte-check 0, **gate a11y permanent 4/4**, portail 34/34, sécu 0 C/H/M, knip clean. → [[project_refonte_aide_crm_2026-06-30]] + [[feedback_svg_flow_arrow_paint_order]] + [[feedback_e2e_tests_robustes_au_feature_flag]].
- [x] ~~**Refonte UI Découpe Films**~~ - 2026-06-30 (**LIVRÉ PROD** `0af198d`, ultracode/xhigh). Diagrammes échelle PARTAGÉE + cote laize/règle + pièces V1/V2/mono + légende ; lignes-cartes + recherche ; header/KPI unifiés 5 écrans. Golden validé 1er coup. QA tolérance zéro (2327 tests, e2e 13/13 axe 0, sécu 0, CLS 0). 2 bugs fixés (`:global()` CSS plain ; libellé d'axe tronqué). → [[project_decoupe_refonte_ui_2026-06-30]] + [[feedback_global_invalid_in_plain_css_file]].
- [x] ~~**Fix expiration session 7j + re-vérif prouvée prod (audits 360, 0 faille)**~~ - 2026-06-29 (`c7545ed`, **LIVRÉ PROD**). Plafond 7j était code mort (cookie `login_at` s'auto-supprimait au seuil, session `sb-*` survivait 400j) → fix fail-secure + 2 tests. « Pas de délog » = timing, prouvé prod (session mintée + curl, 3 scénarios). Audits 360 (23 + 12 agents) : **0 exploitable**. → [[audit_secu_2026-06-29_session_delog_7j]] + [[feedback_cookie_maxage_equals_threshold_dead_check]].
- [x] ~~**Bloc B - migration socle SvelteKit (vite 8 rolldown + vps 7 + kit 2.68 + svelte 5.56.4)**~~ - 2026-06-28 (**LIVRÉ PROD** `e75919d`, PR #24). Gates verts, 0 finding supply-chain. Jamais `rm package-lock.json`. → [[project_fix_deps_ci_vercel_2026-06-22]].
→ Antérieurs (Bloc A Entreprises `4b3974e`, Backlog `6c477cf` 28/06 ; Bloc D `cd5426e` → [[project_bloc_d_audit_360_PROGRESS]] ; icônes `a6ae0e1`, veille pont/PDF `b767056` 26/06 ; Bloc 0/2, Daily Email `d1db821`, Vague 3.3, Campagnes) → `archive/claude-md-crm-livre-2026-06-26.md` + mémoires veille 06-22/23/24.

### Watch list active après pivot

- **[WATCH] Étiquettes = PAGE DÉDIÉE + destinataire en prod (`e263240`, 2026-07-01)** : `/crm/campagnes/[id]/etiquettes` (le menu campagne y navigue, le volet V1 est retiré). Reste **smoke OTP** Pascal du flux complet (sélection -> destinataire inline / édition en lot -> Compléter -> aperçu -> PDF). Surveiller : (a) rendu PDF Avery réel avec la ligne destinataire sous le nom (police Outfit ; l'aperçu la charge en FontFace data-URL), (b) le moteur ellipse le destinataire à 1 ligne par prudence (0.62 em, comme les autres lignes) - si Pascal trouve la coupe trop agressive sur des destinataires longs, calibrer un facteur dédié (jamais au prix d'un débordement), (c) bouton « Compléter » = quota search.ch (1000/mois, 1 requête/clic ; pas de batch V5), (d) flag `ffCrmListesV2` (fondateurs). Rollback = `vercel rollback` ou flag OFF. → [[project_etiquettes_destinataire_page_dediee_2026-07-01]].
- **[WATCH] Refonte Centre d'aide en prod (`d402fe7`+clôtures, 2026-06-30)** : build prod Ready, routes OK, rendu authentifié OK (portail AC-004). Reste **smoke OTP** Pascal des 3 niveaux. Gate a11y `playwright.aide.config.ts` (mint-session avant run). Sécu : `prerender=false` sur la route (niveau 3 jamais public). → [[project_refonte_aide_crm_2026-06-30]].
- **[WATCH] Refonte UI Découpe déployée prod (`0af198d`, 2026-06-30)** : Découpe flag-gé `ff_decoupe` (fondateurs). Vérifier le build Vercel prod ; **smoke OTP Pascal** des écrans authentifiés (diagrammes + PDF Découpe). `vercel rollback` si souci. À CONNAÎTRE : l'échelle partagée rend les films courts « petits » dans une grande carte (validé, honnête) - revoir le compromis seulement si re-demandé. → [[project_decoupe_refonte_ui_2026-06-30]].
- **[WATCH] Refonte CRM 1+2+3 activée fondateurs (`ffCrmListesV2`)** : surfaces premium à surveiller à l'usage. **Bug 5 résiduel** : menu `...` slideout Signaux (ouverture vers le haut en conteneur scrollable), à corriger s'il re-saute. Rollback = flag OFF (`raw_app_meta_data`).
- **[WATCH] Veille W27** = 1er run sur 238 sources (post Bloc 0) + horaire 02:27 UTC → surveiller densité/mix/horaire réel (W26 OK 26/06 : 7 items, local 71%, keptByTrust=1). → [[project_veille_sourcing_w26_2026-06-23]].
- **[WATCH] Socle vite 8 (rolldown) jeune + Dependabot socle ré-activé (2026-06-28)** : vite 8.1.x = major récent → surveiller les patches à l'usage. Les `ignore` socle étant **levés**, la 1ère PR Dependabot groupe `sveltekit` post-migration doit passer la CI (gate `npm ci`+check+test+build) avant merge ; **jamais `rm package-lock.json`**. Pages authentifiées non re-smokées par Claude (OTP) : si un rendu casse (PDF Découpe, graphes layerchart), `vercel rollback`. → [[project_fix_deps_ci_vercel_2026-06-22]].
- **[WATCH] Svelte 5 `onDestroy` s'exécute en SSR Vercel** (pas en `vite preview`) : window/document/localStorage/setInterval à cleanup → `$effect(() => {...; return () => cleanup})`. Tester en preview branch. → `feedback_svelte5_ondestroy_ssr_window_undefined.md`.
- **[WATCH] Vercel : push `main` AUTO-PROMEUT en prod** (git integration, vérifié live 26/06 ; contredit l'ancienne note « deploy manuel »). Exception = après un `vercel rollback` l'alias peut rester épinglé (un push builde sans promouvoir) ; vérifier via `vercel inspect filmpro-portail.vercel.app`.
- **[WATCH] Réactivation d'une source coupée V5 (2026-06-07)** : flip de flag → re-vérifier les contrôles d'origine (Zod, quota, rate-limit, anti-hallu) AVANT de rallumer en prod. Réf `audit_secu_2026-06-07_v5_signaux_prospection.md` § I-3.

→ Watch list complète (Signaux V4 perf/contrats S189, S188, S186, S178, S171) déplacée dans `archive/2026-05-28-pivot-mobile-v3.md`. Restent triables si l'objet redevient actuel.

### Livré (référence historique)

→ Livré V2 + sessions antérieures (S171→S192bis) dans `archive/` (`2026-05-28-pivot-mobile-v3.md`, `2026-05-25/13/10/09/08-sessions.md`).

