# CRM FilmPro : CLAUDE.md

**Note migration** : ce fichier vit dans `CRM/CLAUDE.md` (path Vercel `rootDirectory: CRM`) ; container racine = stub. Contexte → `memory/project_appfactory_restructure.md`.

**Statut :** Portail FilmPro multi-outils en prod : CRM (`/crm`) + Découpe Films (`/decoupe`) sur `filmpro-portail.vercel.app`. Formation IA = projet autonome `Formation/` (`cc` option 5). Historique (V3 terrain, Signaux V4, golden v9, restructure S173-S174) → `archive/`.
**Dernière mise à jour :** 2026-07-10 (**veille : doublon email supprimé `ac744f3` + plancher dérive part locale 50%→30% `7e280c2`** → § Livré). Trunk = `main` ; Flag `ffCrmListesV2` **ON fondateurs**. Prod = `filmpro-portail.vercel.app` (push `main` auto-déploie, intermittent - cf. Watch). **À FAIRE Pascal** : variable Daily Email (§ Chez Pascal). **Prochain bug :** #001.
**Sessions précédentes (condensé)** - détails dans `archive/` (S165-S175, S122-S125, S70-S107).


---

## SOUS-PROJETS

Ce repo héberge le **CRM FilmPro** (app principale) depuis la restructuration 2026-06-01 (Formation = top-level, Consulting sous LED Studio ; mapping : `~/.claude/CLAUDE.md`).

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
- **Tests** : Vitest **2548** (dernier run vérifié 2026-07-10, +3 tests veille) + Playwright e2e (suite + P1/P2/P3 Prospection). Accessibilité : focus trap + ConfirmModal partout, axe-core 0 violation modale P3. Sécurité : Zod sur 20 form actions/endpoints, rate limiting 10/min (+ 60/min dédié routes publiques validation), headers CSP/XFO/referrer, timing-safe secrets

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

Le « **backlog dev** » ne liste QUE l'actionnable-par-Claude sans dépendance externe (gestes Pascal → § Chez Pascal ; attentes datées → § Parking ; idées → Watch). No-debt strict ; titre bloqué = `[BLOQUÉ - {qui/quoi débloque}] {action}`. → [[feedback_backlog_wip_anti_gonflement]]. **État 2026-07-03** : baseline saine (**2545 verts**, build OK ; +13 workflow validation révisé).

### Backlog dev (actionnable par Claude)

- [ ] **[EXÉCUTABLE]** e2e Playwright validation externe (base jetable Colima) : parcours public `/validation/<token>` (sans session → Garder/Retirer → re-clic annule → « Envoyer la validation » → lien révoqué/expiré) + parcours fondateur (générer → décisions → badge « Validation reçue » → appliquer retraits) + étiquettes « ignorer les Retirer ». Ferme la dette « déployé `8b90f6d` sans Playwright feature-spécifique » (couverte pour l'instant par 2545 unit + 3 audits 0 H/C + smoke Pascal + parcours navigateur réel piloté à la main le 03/07, scripts non conservés). → [[project_validation_externe_campagne_2026-07-02]].
- [ ] **[EXÉCUTABLE]** Emailing prospection automatisée : moteur d'envoi automatisé de séquences d'emails aux prospects (Resend, **templates pré-rédigés, zéro LLM** - règle dure). Étape 1 = cadrage court Pascal (contenu/cible/séquence/fréquence/déclencheur, **pas de réunion**), puis 1 session de code + gate ON/OFF (**OFF par défaut**). **Gate de mise en prod** (pas avant le dev) : (a) DNS `send.filmpro.ch` Resend, (b) base légale nLPD + mention, (c) contenu validé. (Ex-« Vague 4 ».)

### Chez Pascal (hors backlog dev - gestes manuels, quand tu veux)

- [ ] **[BLOQUÉ - toi : poser 1 variable Vercel]** Allumer l'envoi du Daily Email : `EMAIL_DAILY_ENABLED=true` en env Vercel Prod (zéro redéploiement, gate OFF = 0 envoi ; le smoke OTP prérequis est fait). → [[project_daily_email_module_2026-06-25]].

### Parking (attente datée - rien à faire avant la date)

**Vide.** (Dashboard qualité veille **retiré 2026-06-29** sur décision Pascal : il surveille le contenu de la veille manuellement chaque semaine et revient si besoin - pas d'écran webapp, pas de tâche, pas de watch.)

### Coupé du backlog (→ watch, plus des tâches)

- Chantier 3 portail : non cadré = pas une tâche.
- Durcissement RLS : conditionnel à un 4e user non-fondateur (inexistant) → [[feedback_rls_multitenant_durcissement_si_4_users]].
- knip : faux positif `MINUTE_MS|RATE_LIMIT_WINDOW_MS` assumé, **ne pas ré-investiguer** → [[feedback_knip_verify_grep_before_delete]].
- Time-box session Supabase : geste Dashboard one-shot chez Pascal, **non-faille** (délog 7 j suffit) → [[audit_secu_2026-06-29_session_delog_7j]].

### Livré cette session

- [x] ~~**Veille : doublon email hebdo supprimé (garder les alertes)**~~ - 2026-07-10 (**LIVRÉ PROD** `ac744f3`, demande Pascal). Chaque vendredi le pipeline envoyait 2 emails : le récap admin (mode `success`, sans logo, pascal@ seul) ET le brief éditorial brandé (logo FilmPro, antoine@ + pascal@). Le récap `success` **ne part plus** ; en régime normal le brief est le seul email. Les 2 alertes d'exploitation du même canal sont **conservées** (décision Pascal, question posée) : semaine creuse (mode `sparse`) + échec de génération (mode `failure`). Fix chirurgical dans `run-generation.ts` (envoi conditionné à `isSparse`) ; le mode `success` reste dans `email-recap.ts`, testé via `buildRecapPayload`, non déclenché en prod. Test régime normal ≥ 2 items ajouté (récap absent, brief présent). QA 2548 verts, typecheck 0. Effectif au prochain cron veille (GitHub Actions, vendredi W29).
- [x] ~~**Veille : plancher de dérive part locale recalibré 50 % → 30 %**~~ - 2026-07-10 (**LIVRÉ PROD** `7e280c2`, demande Pascal). Le canari `mix_drift` (`mix-select.ts`, warning de **logs** GHA, pas un email) alertait sous 50 % de part locale, ce qui frappait des semaines de bonne qualité mais à mix monde élevé (W28 ce matin : 3/8 local = 38 %). Le ratio géo n'est pas un proxy de qualité. Plancher abaissé à 30 % après **vérif sur l'historique réel W18-W28** (requête DB read-only) : ne se déclenche plus que sur une vraie dérive « tout-monde » (baseline 77 % monde = 23 % local ; semaines W20-W24 à 0 %). Cible éditoriale 2/3 local inchangée. 2 tests ajoutés (38 % ne déclenche pas, 20 % déclenche). QA 2548 verts.
- [x] ~~**Validation externe : workflow révisé (décidés affichés, confirmation finale, jamais bloquant)**~~ - 2026-07-03 (**LIVRÉ PROD** `d629cd3`, demande Pascal). (1) Page publique : les prospects décidés RESTENT affichés (vue « Tous » par défaut, filtre « À vérifier » en opt-in) - retour en arrière évident. (2) Bouton final « **Envoyer la validation** » (route publique `/confirmer`, `confirmed_at` par lien/round, renvoi possible - le dernier envoi prime) → badge vert « **Validation reçue le ...** » dans la carte Validation externe de la page campagne. Signal informatif : ne bloque RIEN. (3) Étiquettes : l'option devient « Ignorer les Retirer » (les non-vérifiés restent imprimables - une validation partielle ne vide plus la planche). Migration additive appliquée prod (voie pg) + rejouée from scratch local. **Parcours e2e prouvé en navigateur réel** (base jetable Colima : décider/annuler/changer d'avis → envoyer → renvoyer → badge CRM + option étiquettes vérifiés SSR). Piège attrapé par le test réel : 303 → /login sur le nouvel endpoint (allowlist exacte) + fallback client menteur - les 2 fixés. QA 2545 verts (+13), audit sécu **0 C/H/M/L** → [[audit_secu_2026-07-03_validation_confirmation_workflow]] + [[project_validation_externe_campagne_2026-07-02]].
- [x] ~~**Étiquettes : destinataire en semi-gras (hiérarchie nom > destinataire > adresse)**~~ - 2026-07-03 (**LIVRÉ PROD** `05b29a4`). Outfit SemiBold 600 embarqué comme famille jsPDF séparée « Outfit-SemiBold » (svg2pdf ne distingue que normal/bold par famille) ; `bold` → `weight 400|600|700` dans le moteur. **Vérifié PDF réel** (campagne régies, cellule Béguin : nom gras / Service Technique semi-gras / adresse normale, `/BaseFont /Outfit-SemiBold` présent). Au passage, vérif Pascal : adresse « Régie Immobilière P. Béguin, Cité Bois-Soleil C, 2208 Les Hauts-Geneveys » = **complète et exacte** (search.ch/local.ch/Yelp concordants ; source DB = search_ch, pas Google Places ; lotissement sans numéro de rue, « C » = bâtiment). QA 2532 verts.
- [x] ~~**Étiquettes : capitalisation du nom (sources Google Places tout-minuscules)**~~ - 2026-07-03 (**LIVRÉ PROD** `f8c1c0e`). « pharmacieplus du rond-point » → « Pharmacieplus du Rond-Point » (exemple verbatim Pascal) : majuscule par mot/segment de tiret, particules FR minuscules sauf en tête, élisions l'/d' préservées, JAMAIS de minusculisation (noms déjà casés identiques). Nom seulement - adresse 100 % verbatim Google. Source unique `toEtiquetteEntry` (aperçu = PDF). QA 2531 verts (+7).
→ Antérieurs (veille fix pause_turn + rattrapage W27 `2a5207e` 03/07 → [[feedback_pause_turn_reprise_pas_echec]] ; étiquettes aperçu = PDF réel zoomable & jamais tronqué `1643435` 03/07 → [[feedback_apercu_pdf_blob_iframe_pas_rendu_parallele]] ; message partage multi-valideurs `6f385c0` 03/07 ; bouton retour panneau `2f5b5b8` + panneau prospects in-page & fix 16 leads `c7efdd4` 02/07 ; Lots 1-3 refonte `db6182e`/`aff32cd`/`6c0dc71` 01/07 ; étiquettes page dédiée `e263240` ; Aide `d402fe7` ; Découpe `0af198d` ; fix session 7j `c7545ed` ; Blocs A/B/D ; veille ; Daily Email `d1db821`) → versions longues verbatim : `archive/claude-md-crm-livre-2026-07-03.md` + `archive/claude-md-crm-livre-2026-07-02.md` + `archive/claude-md-crm-livre-2026-06-26.md` + mémoires [[project_refonte_signaux_prospects_campagnes_2026-07-01]].

### Watch list active après pivot

- **[WATCH] Validation externe - 3 Low différés (bug-hunter 02/07)** : re-typer `patches` étiquettes + reset `[id]`/flash filtre (`{#key}`) - flux direct non-occurrent, validation protégée. Détail → [[project_validation_externe_campagne_2026-07-02]] + archive 07-03.
- **[WATCH] Surfaces refondues restantes** : OTP + page campagne + lien validation prouvés prod 03/07 ; à l'œil à l'usage (Signaux, Étiquettes, Aide, Découpe). Rollback = flag OFF ou `vercel rollback`. → [[project_campagnes_panneau_prospects_fix_etiquetage_2026-07-02]].
- **[WATCH] Récidive « importé mais non attaché »** : cause des 16 leads indéterminée ; depuis `c7efdd4` tout non-étiquetage est VISIBLE (modale sans preset, ou `console.warn` Vercel). → [[project_campagnes_panneau_prospects_fix_etiquetage_2026-07-02]].
- **[WATCH] Refonte CRM 1+2+3 activée fondateurs (`ffCrmListesV2`)** : surfaces premium à surveiller à l'usage. Rollback = flag OFF (`raw_app_meta_data`).
- **[WATCH] Veille W29 (vendredi 17/07)** = 1er cron après les 2 fixes veille du 10/07. Vérifier : (a) **un seul email** reçu (le brief brandé antoine@ + pascal@), plus le récap sans logo ; (b) **pas d'alerte `mix_drift`** dans les logs GHA si la part locale est ≥ 30 %. W28 (10/07) a passé sans intervention (succès, 8 items, 38 % local) = fix pause_turn validé ; densité toujours à l'œil (cible 8-12). → § Livré 10/07 + [[feedback_pause_turn_reprise_pas_echec]].
- **[WATCH] Socle vite 8 + Dependabot ré-activé (28/06)** : surveiller patches ; 1ère PR Dependabot `sveltekit` doit passer la CI avant merge ; **jamais `rm package-lock.json`**. → [[project_fix_deps_ci_vercel_2026-06-22]].
- **[WATCH] Svelte 5 `onDestroy` s'exécute en SSR Vercel** : window/localStorage/setInterval à cleanup via `$effect(() => {...; return () => cleanup})`. → `feedback_svelte5_ondestroy_ssr_window_undefined.md`.
- **[WATCH] Vercel auto-deploy git intermittent** (a raté `db6182e`) : vérifier `vercel ls` après chaque push, `vercel --prod` manuel au besoin.
- **[WATCH] Réactivation d'une source coupée V5** : flip de flag → re-vérifier les contrôles d'origine (Zod, quota, rate-limit, anti-hallu) AVANT prod. Réf `audit_secu_2026-06-07_v5_signaux_prospection.md` § I-3.

→ Watch list complète (Signaux V4 perf/contrats S189, S188, S186, S178, S171) déplacée dans `archive/2026-05-28-pivot-mobile-v3.md`. Restent triables si l'objet redevient actuel.

### Livré (référence historique)

→ Livré V2 + sessions antérieures (S171→S192bis) dans `archive/` (`2026-05-28-pivot-mobile-v3.md`, `2026-05-25/13/10/09/08-sessions.md`).

