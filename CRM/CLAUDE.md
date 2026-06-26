# CRM FilmPro : CLAUDE.md

**Note migration** : ce fichier vit dans `CRM/CLAUDE.md` (path Vercel `rootDirectory: CRM`) ; container racine = stub. Contexte → `memory/project_appfactory_restructure.md`.

**Statut :** Portail FilmPro multi-outils en prod : CRM (`/crm`) + Découpe Films (`/decoupe`) sur `filmpro-portail.vercel.app`. Formation IA = projet autonome `Formation/` (`cc` option 5). Historique (V3 terrain, Signaux V4, golden v9, restructure S173-S174) → `archive/`.
**Derniere mise a jour :** 2026-06-25. Prod web = `filmpro-portail.vercel.app` = branche d'intégration **éditeur veille + Campagnes V3.2** (déployée par-dessus l'éditeur veille `69cd968`, flag `ffCrmListesV2` **OFF par défaut, ON pour `pascal@`+`antoine@`** → refonte 1+2+3 live pour les fondateurs). Veille cron sur `main` (`9bef41b`, W26) **intact, non touché** (trunk préservé pour le run de vendredi). **Derniere revue /optimize :** 2026-04-05. **Prochain bug :** #001.
**Session courante :** 2026-06-25 - **Vague 3.3 Dashboard temporel LIVRÉE + DÉPLOYÉE prod** (`ebacea6` ; deploy `dpl_BHY6kqmtGFMZcsxgzkCdHgpuhDyW` aliasé `filmpro-portail.vercel.app`, smoke 303 OK ; façon Capsule, flag `ffCrmListesV2` ON pour `pascal@`+`antoine@`, OFF byte-identique ; revue 5 lentilles 0 C/H/M ; bug racine timestamptz capté par preuve visuelle ; 2266 verts). Précédemment - **Déploiement Campagnes V3.2 par-dessus l'éditeur veille** (Option A : web prod = éditeur veille live + Campagnes gatée OFF ; trunk non touché pour protéger le cron W26 de vendredi ; reconciliation `main` post-W26). Éditeur veille étape 6/6 livrée+déployée 24/06 (`69cd968`, validée Pascal, migration `veille_sources` 238 en prod). Campagnes V3.2 UI complète (`c905952`, revue 5 lentilles, 11 findings corrigés). → [[project_module_campagnes_vague32_2026-06-22]] + [[project_editeur_veille_sources_editables_2026-06-24]].
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

- **Prod** : https://filmpro-portail.vercel.app (Vercel, déploiement CLI manuel `vercel deploy --prod` ; pas d'auto-deploy git) ; ancienne `filmpro-crm.vercel.app` conservée et redirigée 308 → nouvelle (hook). Supabase EU (projet `appfactory`, 10+ tables, RLS active, service role key configurée)
- **Auth** : OTP email 6 chiffres @filmpro.ch + session 7 jours httpOnly ; SMTP Resend (domaine verifié, free plan)
- **APIs** : Zefix REST + search.ch + fal.ai Flux 1.1 Pro Ultra (partage clé avec Enseignement) - Pexels/Unsplash supprimés S67
- **Crons** : `/api/cron/{signaux,alertes,nettoyage-crm,intelligence,intelligence-archive}` tous sécurisés `CRON_SECRET` + service role (Cron `media-enrich` supprimé S67)
- **Tests** : Vitest 2085 (dernier run vérifié 2026-06-23, +4 cross-check trust-by-source) + Playwright e2e (suite + P1/P2/P3 Prospection). Accessibilité : focus trap + ConfirmModal partout, axe-core 0 violation modale P3. Sécurité : Zod sur 20 form actions/endpoints, rate limiting 10/min, headers CSP/XFO/referrer, timing-safe secrets

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

**Prochaine attaque** (audit 360 réconcilié 26/06) : on attend le **cron W26** qui gèle `main` (cron sur `main`, pas encore tourné au 26/06 08:28 UTC - retard scheduler, rattrapage attendu 17:27 UTC). Tri par actionnabilité réelle :
- **Bloqué (attend le cron W26)** : **Bloc 0 reconciliation `main`** (merge `deploy-campagnes-editeur` → `main`, 23 commits d'avance ; le merge fait passer le sourcing ~120 → 238) → entraîne **Bloc 4 Daily Email deploy** (dépend du merge) + le push de `3ae6209` (warnings).
- **Gelé jusqu'au cron W26** (tout cible `main`) : **Bloc 2 - 3 PR Dependabot** (statut CI live : #20 ROUGE, #19/#21 vertes).
- **Exécutable maintenant sur la branche** (sûr pour W26, le cron tourne sur `main`) : **Bloc 3 veille Lot 3** (PDF de marque, pont veille→action, nettoyage enum RegBL, décompo mono-appel LLM) ; **Bloc 2** bumps lourds différés (supabase/typescript 6, migration socle SvelteKit).
- **Attend un input Pascal** (pas bloqué système, non actionnable par moi) : **Bloc 1 Vague 4 Emailing** (3 inputs : DNS `send.filmpro.ch`, base légale nLPD, 1er email réel).

Refonte CRM 1+2+3 DÉPLOYÉE + ACTIVÉE prod (flag `ffCrmListesV2` ON fondateurs). Prod = `deploy-campagnes-editeur`, `main` non touché. → [[project_refonte_crm_cadrage_2026-06-18]].

> Cadrage commun refonte UX/UI CRM (validé 2026-06-18) → [[project_refonte_crm_cadrage_2026-06-18]] + golden `CRM/.product-architect/refonte-vague3/golden-vague3-v1.html` (validé Chrome).

### 0. Reconciliation `main` post-W26 (éditeur veille + Campagnes → trunk) [SUPERVISÉ • high • ~30 min]

- **Pourquoi** : prod web tourne sur `deploy-campagnes-editeur` (éditeur veille + Campagnes, déployée 25/06), **hors `main`** pour protéger le cron veille W26. Le merge fait passer le cron de ~120 à 238 sources → à faire APRÈS le run W26. → [[project_editeur_veille_sources_editables_2026-06-24]] + [[project_module_campagnes_vague32_2026-06-22]].
- [ ] **[BLOQUÉ - après W26 (vendredi 26/06)]** Merger **`deploy-campagnes-editeur` → `main`**, pousser, **supprimer la branche** (local + origin), vérifier 1er run veille post-merge. Findings audit éditeur veille (f7/f10/f14/f15/f16/f21 + 2 cadratins `app.css`) = dette mineure tracée.

### 3. Veille - Lot 3 structurel (reste) [SUPERVISÉ • high • session dédiée]

- [ ] **[EXÉCUTABLE]** **Lot 3 - reste (optionnel)** : dashboard qualité + boucle feedback ; PDF de marque (`filmpro-pdf`) ; pont veille→action ; décomposer mono-appel LLM si plafond ; nettoyage enum RegBL. **Faisable maintenant** (PDF / pont / décompo / cleanup enum) ; seul le **dashboard qualité + boucle feedback** gagne à attendre la 1re mesure W26 (vendredi). → [[project_veille_sourcing_w26_2026-06-23]].

### 1. Vague 4 Emailing refonte CRM [SUPERVISÉ • xhigh • cascade]

- **Pourquoi** : toute la refonte Vagues 1+2+3 (3.1 Signaux + 3.2 Campagnes + 3.3 Dashboard) livrée + déployée + activée (25/06, flag `ffCrmListesV2` ON fondateurs). Reste l'emailing. → [[project-refonte-crm-cadrage-2026-06-18]] § Garde-fous emailing.
- [ ] **[EXÉCUTABLE]** **Vague 4 Emailing** (individuel → nLPD → groupé). Non codable tant que : (a) `send.filmpro.ch` vérifié Resend (DNS), (b) base légale nLPD + mention d'information validées, (c) 1er email réel décrit (réunion 3 fondateurs). **Pas lié à la veille → débloquée** : ces 3 prérequis sont des inputs côté Pascal (pas une dépendance système) ; dès qu'il les fournit, cadrage + code démarrent. → cadrage § Garde-fous emailing.

### 4. Module Daily Email - LIVRÉ + commité (prêt, gate OFF) [SUPERVISÉ • high]

- **LIVRÉ 26/06** (`d1db821`) : email quotidien des relances dues → 2 fondateurs, 100% déterministe (zéro LLM), gate `EMAIL_DAILY_ENABLED` OFF. Design Gouvernance + charte FilmPro (bandeau navy carré), weekly intact. 44 tests / 2310 verts / revue 4 lentilles 0 C/H. → [[project_daily_email_module_2026-06-25]] + [[audit_secu_2026-06-26_daily_email_module]].
- [ ] **[BLOQUÉ - 2 gestes Pascal, hors périmètre livraison]** **Déployer** (vient naturellement au merge reconciliation Bloc 0 post-W26 ; gate OFF = cron tourne en no-op, zéro envoi) puis **activer** quand feu vert : poser `EMAIL_DAILY_ENABLED=true` en env Vercel Prod (zéro redéploiement, lu via `$env/dynamic/private`). Avant ces 2 gestes : aucun envoi possible.

### 2. Suite hygiène deps/CI [MIXTE • medium • ~1h]

- **Livré 22/06** (PR #16 `b84b6f5`) : garde-fou CI + Dependabot durci + 6 bumps sûrs. **Ne JAMAIS `rm package-lock.json` pour bumper ce repo** (cause Vercel-fail = regen lockfile flote les transitifs). → [[project_fix_deps_ci_vercel_2026-06-22]].
- [ ] **[EXÉCUTABLE - gelé jusqu'au cron W26]** **Trier les 3 PR Dependabot** (toutes ciblent `main` → à geler tant que le cron W26 n'a pas tourné). **Statut CI live (audité 26/06)** : **#20** (groupe minor-patch, 8 updates) = **CI ROUGE** (Vercel fail + `verify` fail 8s, probable lockfile/transitifs cf. [[project_fix_deps_ci_vercel_2026-06-22]]) → NE PAS merger en l'état, diagnostiquer ; **#19** (`@types/node` 26 majeure) = **CI verte** (à arbitrer, lire le changelog) ; **#21** (`js-yaml` 5 majeure) = **CADUQUE** (js-yaml retiré comme dep morte le 26/06 → à fermer plutôt que merger).
- [ ] **[EXÉCUTABLE]** **Migration socle SvelteKit (vite 8 / plugin-svelte 7 / kit 2.66)** : différée (rolldown + layerchart incompatibles, issues #928/#1313). Rouvrir quand clean : lever les `ignore` socle `dependabot.yml`, monter le trio groupé, CI verte.
- [x] ~~**Bump @supabase/supabase-js 2.108**~~ - LIVRÉ 26/06 (`e420aca`) : 2.101.1 → 2.108.2 + 7 fixes type `RejectExcessProperties` (type-only, comportement identique) via `TablesUpdate/Insert<'table'>`. `@supabase/ssr` laissé à 0.10 (compatible ; bump 0.12 = auth/session, séparé). svelte-check 0/0, 2310 tests, build OK. **Reste = smoke auth OTP réel** (vérif login manuelle côté Pascal).
- [ ] **[EXÉCUTABLE]** **Bump TypeScript 6** : différé. Trier les erreurs de type que la majeure fait remonter (chantier d'upgrade, faisable sur la branche).
- [x] ~~**Nettoyer les 30 warnings svelte-check → 0**~~ - LIVRÉ 26/06 (voir « Livré cette session »).

### Réserve (hors backlog actif)
- Chantier 3 portail (non cadré) ; durcissement RLS si 4e user ([[feedback_rls_multitenant_durcissement_si_4_users]]).
- **[SIGNAL - non supprimé, décision Pascal]** knip liste ~30 fichiers `scripts/*.mjs|*.ts` (migrations passées `apply-*-migration`, seeds, QA Découpe `_decoupe_*`) + `.product-architect/*` (specs) comme « non importés ». Ce **n'est pas du code mort** (CLI-invoqués / artefacts de spec), donc **gardés**. Archivables un jour si Pascal le décide (ex : déplacer les `apply-*-migration` appliquées vers `archive/`). Les `playwright.*.config.ts` + `tests/mint-session.mjs` sont de l'**infra e2e vivante** (lancés par CLI) → garder.

### Livré cette session

- [x] ~~**Bump @supabase/supabase-js 2.108 + fixes type**~~ - 2026-06-26 (`e420aca`, branche prod, **pas encore poussé**) : 2.101.1 → 2.108.2 ; supabase 2.108 resserre le typage insert/update (`RejectExcessProperties`) → 7 sites corrigés en **type-only** (`TablesUpdate/Insert<'table'>`, comportement strictement identique). 1 fichier veille touché (`sources-repository.ts`) = cast type-only, n'atteint pas le cron W26 (cron sur `main`). svelte-check 0/0, 2310 tests, build OK. `@supabase/ssr` laissé à 0.10. Reste smoke auth OTP réel (manuel, Pascal).
- [x] ~~**Nettoyage code mort non-veille (zéro régression)**~~ - 2026-06-26 (`2968107` phase A + `a9b128b` phase B, branche prod, **pas encore poussé**) : détection `knip` + **vérification grep par symbole** (usage interne + externe src+tests, jamais de suppression aveugle). Retiré : 3 fichiers morts (`TemperatureSelect.svelte` 0 réf, `types/actions.ts` type H-14 jamais câblé, `lib/index.ts` placeholder vide), 5 devDeps mortes (`@fontsource/dm-sans` doublon du variable, `@sveltejs/adapter-auto` vs adapter-vercel, `js-yaml`+`@types/js-yaml`, `image-size` ; lockfile surgical 0 transitif flottant ; **rend PR Dependabot #21 caduque**), 2 symboles morts (`listActiveCampagnesLight`, `TabNavKey`). **Constat** : sur ~100 candidats knip non-veille, seuls 2 vraiment morts → codebase déjà propre, le reste = inférence de types (faux positifs knip). Pipeline veille **intact** (hors-scope). svelte-check 0/0, 2310 tests, build adapter-vercel OK.
- [x] ~~**Nettoyage 30 warnings svelte-check → 0**~~ - 2026-06-26 (`3ae6209`, branche prod `deploy-campagnes-editeur`, **pas encore poussé**) : vrai fix a11y (label `for`/`id` `AlerteModal`) + `svelte-ignore` justifié sur widgets composites déjà accessibles (`DataTable` resizer, `PipelineCard`, `MultiSelectDropdown`, `TemperatureSelect`) + `attribute_quoted` (`class={expr}` sur `<Icon>`) + `line-clamp` standard + `state_referenced_locally` (seeds de valeur initiale voulus, convention `svelte-ignore` déjà en place). svelte-check **0 err / 0 warn** ; **2310 tests verts**. Ride avec le merge Bloc 0. Cockpit réconcilié (entry `0ee5f6751bb3` livrée).
- [x] ~~**Audit 360 + nettoyage dette/statut projet**~~ - 2026-06-26 : réconciliation cockpit (entry svelte-check livrée), correction statut CI live des 3 PR Dependabot (#20 ROUGE, #19/#21 vertes), classification `bloqué` re-vérifiée (Bloc 0 = après cron W26 ✓, Bloc 4 = dépend de Bloc 0 ✓). Branche = 23 commits d'avance sur `main`.
- [x] ~~**Module Daily Email relances - LIVRÉ + commité (prêt, gate OFF)**~~ - 2026-06-26 (`d1db821`) : email quotidien relances dues → 2 fondateurs, 100% déterministe (zéro LLM), design Gouvernance + charte FilmPro (bandeau navy carré, validé Chrome), weekly intact. 44 tests / 2310 verts / svelte-check 0 err / revue 4 lentilles 0 C/H + 2 MEDIUM corrigés. Reste 2 gestes Pascal (deploy au merge + activer env var). → [[project_daily_email_module_2026-06-25]] + [[audit_secu_2026-06-26_daily_email_module]].
- [x] ~~**Vague 3.3 Dashboard temporel - LIVRÉE + DÉPLOYÉE prod**~~ - 2026-06-25 (`ebacea6`, flag ON 2 fondateurs, OFF byte-identique) : accueil `/crm` façon Capsule. Bug racine `date_relance_prevue` timestamptz capté par preuve visuelle, corrigé. Revue 5 lentilles 0 C/H/M ; 2266 verts. → [[audit_secu_2026-06-25_vague33_dashboard_temporel]].
- [x] ~~**Déploiement Campagnes V3.2 par-dessus éditeur veille (Option A)**~~ - 2026-06-25 : branche `deploy-campagnes-editeur`, flag OFF byte-identique, trunk non touché (cron W26 protégé). → [[project_module_campagnes_vague32_2026-06-22]].
→ Antérieurs (24/06 et avant) : éditeur veille 1-6 (`69cd968`) + Campagnes V3.2 UI (`c905952`) + W25/W26 + Lots 1+2 + Vagues 1/2/3.1 → mémoires veille 06-22/23/24 + `archive/`.

### Watch list active après pivot

- **[WATCH] Refonte CRM 1+2+3 activée fondateurs (`ffCrmListesV2`)** : surfaces premium à surveiller à l'usage. **Bug 5 résiduel** : menu `...` slideout Signaux (ouverture vers le haut en conteneur scrollable), à corriger s'il re-saute. Rollback = flag OFF (`raw_app_meta_data`).
- **[WATCH] W26 = 1er run cron sourcing `9bef41b` (~120 sources) + 1er brief réel antoine@**. Surveiller GHA : `keptByTrust`, densité (cible 8-12, W25=2), part locale, 0 `<cite>`/emoji. Cron sur `main` n'utilise PAS les 238 sources (passage à 238 = Bloc 0). → [[project_veille_sourcing_w26_2026-06-23]].
- **[WATCH] Svelte 5 `onDestroy` s'exécute en SSR Vercel** (pas en `vite preview`) : window/document/localStorage/setInterval à cleanup → `$effect(() => {...; return () => cleanup})`. Tester en preview branch. → `feedback_svelte5_ondestroy_ssr_window_undefined.md`.
- **[WATCH] Trap Vercel `rollback` → alias prod verrouillé** : après `vercel rollback`, les `git push` buildent mais ne promeuvent PAS automatiquement. Vérifier via `vercel inspect filmpro-portail.vercel.app` (domaine canonique) que l'alias pointe sur le nouveau deploy.
- **[WATCH] Réactivation d'une source coupée V5 (2026-06-07)** : flip de flag → re-vérifier les contrôles d'origine (Zod, quota, rate-limit, anti-hallu) AVANT de rallumer en prod. Réf `audit_secu_2026-06-07_v5_signaux_prospection.md` § I-3.

→ Watch list complète (Signaux V4 perf/contrats S189, S188, S186, S178, S171) déplacée dans `archive/2026-05-28-pivot-mobile-v3.md`. Restent triables si l'objet redevient actuel.

### Livré (référence historique)

→ Livré V2 + sessions antérieures (S171→S192bis) dans `archive/` (`2026-05-28-pivot-mobile-v3.md`, `2026-05-25/13/10/09/08-sessions.md`).

