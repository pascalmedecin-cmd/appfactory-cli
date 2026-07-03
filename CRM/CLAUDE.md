# CRM FilmPro : CLAUDE.md

**Note migration** : ce fichier vit dans `CRM/CLAUDE.md` (path Vercel `rootDirectory: CRM`) ; container racine = stub. Contexte → `memory/project_appfactory_restructure.md`.

**Statut :** Portail FilmPro multi-outils en prod : CRM (`/crm`) + Découpe Films (`/decoupe`) sur `filmpro-portail.vercel.app`. Formation IA = projet autonome `Formation/` (`cc` option 5). Historique (V3 terrain, Signaux V4, golden v9, restructure S173-S174) → `archive/`.
**Dernière mise à jour :** 2026-07-03 après-midi (**veille : fix racine pause_turn `2a5207e`, W27 publiée par rattrapage GHA** ; **étiquettes : aperçu = PDF réel zoomable + « jamais tronqué » `1643435`, vérifié navigateur réel** → § Livré ; matin : workflow campagne e2e clos `640cda2`+`6f385c0`, smoke prod Pascal OK). Trunk = `main` ; Flag `ffCrmListesV2` **ON fondateurs**. Prod = `filmpro-portail.vercel.app` (push `main` auto-déploie, intermittent - cf. Watch). **À FAIRE Pascal** : variable Daily Email (§ Chez Pascal). **Prochain bug :** #001.
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

→ Archive intégrale : `../archive/decisions-structurelles-crm.md` (6 écrans principaux, slide-out panels, saisie rapide, 100% sources gratuites, modèle unifié `prospect_leads`, scoring auto 0-13). Specs prospection complètes : `../docs/SPECS_PROSPECTION.md`.

### Doctrine styling : Tailwind utilities + CSS scoped

→ Règle tranchée S180 (audit 360 V3b I-04) : Tailwind utilities pour le détail réutilisable (spacing/couleurs via tokens/typo/états/responsive trivial côté contenu, jamais off-grid `p-[13px]`), `<style>` scoped Svelte pour le layout structurel (sidebar/header/kanban) + keyframes/transitions (token `--ease-out-expo`) + pseudo-éléments + `:global()` ciblés ; jamais de CSS global ad hoc hors `app.css` / `!important` / classe dupliquant un token ; primitives (`Button`/`Input`/`Card`/`Modal`/`DataTable`/`Tabs`) = source unique, on compose. Détail : `memory/feedback_crm_styling_doctrine.md`.


### Sécurité - décisions assumées (audit 360 V3b L-02, L-03)

- **CSP `unsafe-inline` (L-02)** : prérequis de l'hydratation SvelteKit (scripts/styles inline runtime) ; retrait = refactor nonce. Risque XSS **acceptable** (mono-tenant ≤ 10 admins @filmpro.ch OTP, 0 UGC, sorties échappées `esc()`/`escapeHtml`). À revisiter si option nonce-based simple ou surface UGC.
- **RLS « mono-tenant plat » (L-03/L-04)** : ~11 tables `FOR ALL TO authenticated USING (true)` = tout authentifié voit/modifie tout. **Décision assumée** (S127 : 3 fondateurs symétriques). **À DURCIR avant un 4e user non-fondateur** (`created_by = auth.uid()` + tests RLS intégration). → [[feedback_rls_multitenant_durcissement_si_4_users]] + § RISQUES OUVERTS (M-48).

---

## INFRA EN PLACE

- **Prod** : https://filmpro-portail.vercel.app (Vercel : **git integration auto-déploie `main` en prod à chaque push**, vérifié live 26/06 ; `vercel deploy --prod` reste dispo en manuel) ; ancienne `filmpro-crm.vercel.app` conservée et redirigée 308 → nouvelle (hook). Supabase EU (projet `appfactory`, 10+ tables, RLS active, service role key configurée)
- **Auth** : OTP email 6 chiffres @filmpro.ch + session 7 jours httpOnly ; SMTP Resend (domaine verifié, free plan)
- **APIs** : Zefix REST + search.ch + fal.ai Flux 1.1 Pro Ultra (partage clé avec Enseignement) - Pexels/Unsplash supprimés S67
- **Crons** : **6 crons Vercel** `/api/cron/{signaux,alertes,lead-rescore,daily-email,intelligence-archive,nettoyage-crm}` sécurisés `CRON_SECRET` + service role. La **veille hebdo NE tourne PAS en cron Vercel** : GitHub Actions vendredi (cap durée Vercel). Le cron `intelligence` (génération veille) n'existe plus ; `media-enrich` supprimé S67.
- **Tests** : Vitest 2531 (dernier run vérifié 2026-07-03 : fix veille pause_turn +4, étiquettes jamais-tronqué +2 nets dont fuzz 200, capitalisation nom +7 ; supabase 2.108 + TS6) + Playwright e2e (suite + P1/P2/P3 Prospection). Accessibilité : focus trap + ConfirmModal partout, axe-core 0 violation modale P3. Sécurité : Zod sur 20 form actions/endpoints, rate limiting 10/min, headers CSP/XFO/referrer, timing-safe secrets

→ Détail intégral (env vars, BDD exhaustive, liste tests, liste crons, headers sécurité, pagination serveur) : `../archive/infra-crm-detail.md`

## DOCUMENTATION

- `../docs/SPECS_PROSPECTION.md` : specs module prospection (sources, scoring, UI, dedup) - vit au niveau container FilmPro.

→ Inventaire composants EN PLACE → `../archive/inventaire-composants.md` (consulter avant d'en créer de nouveaux).

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
- **Inscription cockpit mid-session** : ne JAMAIS éditer `entries.jsonl` directement ; voies sûres = drag UI cockpit ou `POST /api/entries/appfactory` puis `/api/queue/appfactory`. → `feedback_cockpit_watcher_purge_cli_entries_S177.md` (verbatim : `archive/claude-md-crm-livre-2026-07-02.md`).

## RISQUES OUVERTS (sécurité)

- **RLS Supabase non couverte par les tests Vitest (audit 360 M-48)** : Vitest mocke supabase-js → aucun test unitaire ne prouve la RLS réelle. **Avant de construire sur un contrôle d'autorisation : lire le code + vérifier avec un compte au rôle cible.** Détail : `rules/quality.md` § RLS + `feedback_rls_mocks_insufficient_S99.md`.

## REGLES TECHNIQUES PROJET

→ Tests mobile/responsive : Chrome DevTools Device Toolbar manuel (Pascal) **obligatoire** ; Playwright `viewport:{width,height}` seul et MCP `resize_window` **interdits** comme substituts (Playwright preset `devices['iPhone 14 Pro Max']` OK pour findings OBJECTIFS uniquement - réf `CRM/tests/mobile.spec.ts`). Règle complète : `memory/feedback_crm_mobile_testing_devtools.md`.


## Prochaine session

**Prochaine attaque** : **Emailing prospection automatisée** (à cadrer, § Backlog dev). Workflow campagne e2e **clos et prouvé prod 03/07** : câblage page dédiée livré (`640cda2`), message de partage enrichi (`6f385c0`), smoke Pascal fait (login OTP + lien de validation réel). **Geste Pascal restant** : variable Daily Email (§ Chez Pascal).

### Règle backlog (WIP-limité, gravée 2026-06-28)

Le « **backlog dev** » ne liste QUE l'actionnable-par-Claude sans dépendance externe (gestes Pascal → § Chez Pascal ; attentes datées → § Parking ; idées → Watch). No-debt strict ; titre bloqué = `[BLOQUÉ - {qui/quoi débloque}] {action}`. → [[feedback_backlog_wip_anti_gonflement]]. **État 2026-07-03** : baseline saine (2518 verts, build OK ; 2521 - 3 tests du GET groupes retiré avec l'ex-panneau).

### Backlog dev (actionnable par Claude)

- [ ] **[EXÉCUTABLE]** e2e Playwright validation externe (base jetable Colima) : parcours public `/validation/<token>` (sans session → Garder/Retirer → re-clic annule → lien révoqué/expiré) + parcours fondateur (générer → décisions → appliquer retraits) + étiquettes « validés seulement ». Ferme la dette « déployé `8b90f6d` sans Playwright feature-spécifique » (couverte pour l'instant par 2521 unit + 2 audits 0 H/C + smoke Pascal). → [[project_validation_externe_campagne_2026-07-02]].
- [ ] **[EXÉCUTABLE]** Emailing prospection automatisée : moteur d'envoi automatisé de séquences d'emails aux prospects (Resend, **templates pré-rédigés, zéro LLM** - règle dure). Étape 1 = cadrage court Pascal (contenu/cible/séquence/fréquence/déclencheur, **pas de réunion**), puis 1 session de code + gate ON/OFF (**OFF par défaut**). **Gate de mise en prod** (pas avant le dev) : (a) DNS `send.filmpro.ch` Resend, (b) base légale nLPD + mention, (c) contenu validé. (Ex-« Vague 4 ».)

### Chez Pascal (hors backlog dev - gestes manuels, quand tu veux)

- [x] ~~Faire le smoke OTP de production end-to-end~~ - Fait 2026-07-03 : login OTP prod OK + lien de validation réel généré et parcouru (verbatim Pascal « lien généré en prod ok »). Les autres surfaces refondues (Signaux, Étiquettes, Aide, Découpe) restent à l'œil en Watch, utilisées au quotidien.
- [ ] **[BLOQUÉ - toi : poser 1 variable Vercel]** Allumer l'envoi du Daily Email : `EMAIL_DAILY_ENABLED=true` en env Vercel Prod (zéro redéploiement, gate OFF = 0 envoi ; le smoke OTP prérequis est fait). → [[project_daily_email_module_2026-06-25]].

### Parking (attente datée - rien à faire avant la date)

**Vide.** (Dashboard qualité veille **retiré 2026-06-29** sur décision Pascal : il surveille le contenu de la veille manuellement chaque semaine et revient si besoin - pas d'écran webapp, pas de tâche, pas de watch.)

### Coupé du backlog (→ watch, plus des tâches)

- Chantier 3 portail : non cadré = pas une tâche (recadrer si l'objet redevient actuel).
- Durcissement RLS : conditionnel à un 4e user non-fondateur (inexistant) → [[feedback_rls_multitenant_durcissement_si_4_users]].
- knip : `apply-*-migration` archivables (cosmétique, cadré `6c477cf`) + 1 faux positif assumé `MINUTE_MS|RATE_LIMIT_WINDOW_MS` (deux exports live/intentionnels, audit L-18, **ne pas ré-investiguer**). Types morts veille `Theme`/`SearchTerm`/`LegacySearchTerm` soldés 30/06. → [[feedback_knip_verify_grep_before_delete]].
- Time-box session Supabase : geste Dashboard one-shot remis à Pascal, **non-faille** (le délog 7 j app suffit, prouvé prod) → pas une dette (procédure : Sessions → « Time-box user sessions » 168 h + « Detect refresh token reuse » ON). → [[audit_secu_2026-06-29_session_delog_7j]].

### Livré cette session

- [x] ~~**Étiquettes : capitalisation du nom (sources Google Places tout-minuscules)**~~ - 2026-07-03 (**LIVRÉ PROD** `f8c1c0e`). « pharmacieplus du rond-point » → « Pharmacieplus du Rond-Point » (exemple verbatim Pascal) : majuscule par mot/segment de tiret, particules FR minuscules sauf en tête, élisions l'/d' préservées, JAMAIS de minusculisation (noms déjà casés identiques). Nom seulement - adresse 100 % verbatim Google. Source unique `toEtiquetteEntry` (aperçu = PDF). QA 2531 verts (+7).
- [x] ~~**Veille : fix racine pause_turn + rattrapage W27 publié**~~ - 2026-07-03 (**LIVRÉ PROD** `2a5207e`). Cron W27 du matin en échec : l'API met le tour en pause (`stop_reason=pause_turn`, boucle server-side web_search ~10 itérations) et le pipeline traitait ce cas documenté comme un échec. Fix : reprise du tour (contenu assistant renvoyé verbatim, borne 6 reprises, coûts tracés par appel, segments fusionnés pour la ground truth URLs). **Prouvé en run réel local** (pause reproduite → reprise auto, 6 items) ; insert DB local raté sur aléa réseau (non-bug) → **rattrapage par le chemin prod GHA : W27 publiée** (reportId `1b09fb07`, 4 items, 100 % local, low_volume 4<8, 0 divergence). Zéro réduction de périmètre (238 sources, prompt et budget de recherche intacts). QA 2522 verts (+4 tests reprise). → [[feedback_pause_turn_reprise_pas_echec]].
- [x] ~~**Étiquettes : aperçu = le PDF réel (zoomable) + règle « jamais tronqué »**~~ - 2026-07-03 (**LIVRÉ PROD** `1643435`, supersède le patch CSS `8c31709` insuffisant - cause réelle : flex-shrink écrasait les planches dans la colonne scrollable). (1) Aperçu : rendu SVG parallèle SUPPRIMÉ → blob jsPDF (même builder que le téléchargement, à l'octet près) en iframe, lecteur PDF natif : toutes les planches, zoom natif, lien plein écran - pattern MarketingPreviewModal Gouvernance, demande Pascal. CSP `frame-src 'self' blob:`. (2) PDF du mailing réel : noms/rues coupés « ... » → `labelLayout` wrap aux avances réelles + réduction police par paliers 5 % (invariants durs : texte intégral, ligne ≤ largeur utile, bloc ≤ cellule ; cas réels + fuzz 200). **Vérifié navigateur réel** (dev server + session mintée + Chrome headless : screenshot lecteur OK, PDF téléchargé relu zéro troncature). Audit sécu **0 C/H/M** (diff net positif : {@html} retiré). QA 2524 verts. → [[feedback_apercu_pdf_blob_iframe_pas_rendu_parallele]] + [[audit_secu_2026-07-03_etiquettes_apercu_pdf_csp]].
- [x] ~~**Message de partage du lien de validation : mention usage à plusieurs**~~ - 2026-07-03 (**LIVRÉ PROD** `6f385c0`). Vérifié code : le token EST l'autorisation (pas d'identité), dernier choix gagne par prospect → 1 ligne dans le message copié. **Smoke prod Pascal fait** (« lien généré en prod ok ») : workflow campagne e2e clos. 2518 verts.
- [x] ~~**Câblage liste Campagnes → page campagne dédiée (module validation atteignable)**~~ - 2026-07-03 (**LIVRÉ PROD** `640cda2`). Trou de livraison de `8b90f6d` : page dédiée orpheline dans l'UI (« je ne trouve pas le module »). Fix spec §2 « un seul chemin » : nom/compteur/menu → page dédiée ; panneau SUPPRIMÉ (parité vérifiée) ; retour Étiquettes → campagne ; aide réécrite ; GET groupes orphelin retiré (-3 tests → **baseline 2518**). Bug-hunter 0 critique, 4 findings soldés même commit. Migration prod re-vérifiée live (SQL). → [[project_validation_externe_campagne_2026-07-02]] (§ Trou de câblage) + [[feedback_pas_claim_visible_sans_chemin_verifie]].
- [x] ~~**Validation externe des prospects d'une campagne + page campagne dédiée**~~ - 2026-07-02 (**LIVRÉ PROD** `8b90f6d`, migration voie pg). Lien secret sans compte (TTL 2 j, révocable) → Garder/Retirer → page campagne dédiée ; retrait = geste fondateur. Porte publique durcie (kill-switch, minimisation, cap 1000, index partiel « 1 lien actif »). Option étiquettes « validés seulement ». **Sécu 0 C/H/M, bug-hunter 0 High.** → [[project_validation_externe_campagne_2026-07-02]] + [[audit_secu_2026-07-02_validation_externe]].
- [x] ~~**Campagnes : groupes de prospects + étiquettes groupées avec intercalaires**~~ - 2026-07-02 (**LIVRÉ PROD** `8124fdf`, backfill 108/108). Groupes PAR campagne (lien N-N, FK composite) : chips-filtres, « + Groupe » pré-rempli, déplacement multiple. Intercalaires gras 15 pt CAPITALES multi-lignes (`5313502`+`f911cac`), flux continu zéro cellule perdue ; PDF liste sectionné. Sécu 0 C/H/M ; bug-hunter 0 High. → [[project_groupes_campagne_etiquettes_transition_2026-07-02]] + [[audit_secu_2026-07-02_groupes_campagne]].
- [x] ~~**Campagnes : export PDF liste des prospects + noms de fichiers explicites**~~ - 2026-07-02 (**LIVRÉ PROD** `4040870`+`8be03a2`). A4 paysage, pastilles Maps cliquables, template validé Pascal ; noms `Prospects|Étiquettes - <Campagne> - date.pdf` (source unique `pdf-filename.ts`), logo partagé. Sécu 0 C/H/M ; 1 HIGH course async corrigé. → [[project_pdf_liste_prospects_campagne_2026-07-02]] + [[audit_secu_2026-07-02_pdf_liste_prospects_campagne]].
→ Antérieurs (bouton retour panneau `2f5b5b8` + panneau prospects in-page & fix 16 leads `c7efdd4` 02/07 ; Lots 1-3 refonte Signaux/Prospects/Campagnes `db6182e`/`aff32cd`/`6c0dc71` 01/07 ; étiquettes page dédiée `e263240` ; Aide `d402fe7` ; Découpe `0af198d` ; fix session 7j `c7545ed` ; Blocs A/B/D ; veille ; Daily Email `d1db821`) → versions longues verbatim : `archive/claude-md-crm-livre-2026-07-02.md` + `archive/claude-md-crm-livre-2026-06-26.md` + mémoires [[project_refonte_signaux_prospects_campagnes_2026-07-01]].

### Watch list active après pivot

- **[WATCH] Validation externe - 3 Low différés (bug-hunter 2026-07-02)** : (1) re-typer `patches` étiquettes en `ProspectCampagne` (fragile si le `select` prospects est rétréci) ; (2+3) reset `[id]` incomplet + flash filtre → `{#key campagne.id}`, mais flux campagne→campagne direct non-occurrent (retour via liste = remount). Validation protégée (filtre lu de `data.prospects`). → [[project_validation_externe_campagne_2026-07-02]] + [[audit_secu_2026-07-02_validation_externe]].
- **[WATCH] Surfaces refondues restantes (smoke partiel fait 07-03)** : login OTP + page campagne dédiée + lien de validation **prouvés prod par Pascal 03/07**. Restent à l'œil à l'usage quotidien (pas de re-test dédié demandé) : Signaux refondu, Étiquettes, Aide, PDF Découpe, graphes layerchart, 16 prospects « Mailing Commerces » réparés. Rollback = flag OFF ou `vercel rollback` (les migrations groupes sont additives, le code d'avant les ignore). → [[project_campagnes_panneau_prospects_fix_etiquetage_2026-07-02]] + [[project_groupes_campagne_etiquettes_transition_2026-07-02]].
- **[WATCH] Récidive « importé mais non attaché » (2026-07-02)** : cause des 16 leads indéterminée (logs expirés) ; depuis `c7efdd4` tout non-étiquetage est VISIBLE. Re-signalement SANS alerte vue → flux UI (modale sans preset) ; AVEC alerte → `console.warn` Vercel dans l'heure. → [[project_campagnes_panneau_prospects_fix_etiquetage_2026-07-02]].
- **[WATCH] Refonte CRM 1+2+3 activée fondateurs (`ffCrmListesV2`)** : surfaces premium à surveiller à l'usage. (Bug 5 slideout Signaux superseded : slideout refondu au Lot 1.) Rollback = flag OFF (`raw_app_meta_data`).
- **[WATCH] Veille W28 (vendredi 10/07)** = 1er cron auto post-fix pause_turn : vérifier qu'il passe sans intervention (W27 : cron du 03/07 en échec pause_turn → fix `2a5207e` + rattrapage manuel publié 4 items / 100 % local / low_volume ; le 2e cron anti-skip du soir doit faire idempotent_skip). Densité à l'œil : 2 runs W27 ont donné 6 puis 4 items gardés (variance réelle, cible 8-12 jamais atteinte depuis Bloc 0). → [[project_veille_sourcing_w26_2026-06-23]] + [[feedback_pause_turn_reprise_pas_echec]].
- **[WATCH] Socle vite 8 (rolldown) + Dependabot socle ré-activé (2026-06-28)** : vite 8.1.x major récent → surveiller patches. 1ère PR Dependabot `sveltekit` doit passer la CI avant merge ; **jamais `rm package-lock.json`**. → [[project_fix_deps_ci_vercel_2026-06-22]].
- **[WATCH] Svelte 5 `onDestroy` s'exécute en SSR Vercel** (pas en `vite preview`) : window/document/localStorage/setInterval à cleanup → `$effect(() => {...; return () => cleanup})`. → `feedback_svelte5_ondestroy_ssr_window_undefined.md`.
- **[WATCH] Vercel auto-deploy git intermittent** : a raté `db6182e` (01/07) mais fiché les pushes du 02/07. Vérifier `vercel ls` après chaque push, `vercel --prod` manuel au besoin.
- **[WATCH] Réactivation d'une source coupée V5 (2026-06-07)** : flip de flag → re-vérifier les contrôles d'origine (Zod, quota, rate-limit, anti-hallu) AVANT de rallumer en prod. Réf `audit_secu_2026-06-07_v5_signaux_prospection.md` § I-3.

→ Watch list complète (Signaux V4 perf/contrats S189, S188, S186, S178, S171) déplacée dans `archive/2026-05-28-pivot-mobile-v3.md`. Restent triables si l'objet redevient actuel.

### Livré (référence historique)

→ Livré V2 + sessions antérieures (S171→S192bis) dans `archive/` (`2026-05-28-pivot-mobile-v3.md`, `2026-05-25/13/10/09/08-sessions.md`).

