# CRM FilmPro : CLAUDE.md

**Note migration** : ce fichier vit dans `CRM/CLAUDE.md` (path Vercel `rootDirectory: CRM`) ; le container racine est un stub pointant vers les sous-projets. Contexte migration complet → `~/.claude/projects/-Users-pascal-Claude-Projets-FilmPro/memory/project_appfactory_restructure.md`.

**Statut :** Clean state 2026-05-28 - refonte mobile V2 **abandonnée** après smoke iPhone (overscope) → pivot **V3 outil terrain only** (`archive/2026-05-28-pivot-mobile-v3.md`). **Portail FilmPro multi-outils : CRM (`/crm`) + Découpe Films (`/decoupe`) en prod sur `filmpro-portail.vercel.app` (2026-06-05).** Formation IA = sous-projet autonome `Formation/`, `cc` option 5. Antérieur en prod (Signaux V4, Log, audit 360, golden v9, restructure S173-S174) → `archive/2026-05-06-sessions.md`.
**Derniere mise a jour :** 2026-06-19 (**Vague 3 démarrée** : chantier 3.1 Signaux condensés + actions `5e0c369` + export CSV Prospection `6626818` ; golden Vague 3 validé Chrome. Vague 2 CLOSE 5/5 antérieurement. Flag `ffCrmListesV2` OFF, **non déployé**, 1850 Vitest, revues 0 C/H/M/L). Prod = alias `filmpro-portail.vercel.app` sur `810f2e6`. Détail → « Livré cette session » + archives.
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** 2026-06-19 - **Vague 3 démarrée** (golden 3 écrans validé Chrome après 1 itération) : **chantier 3.1 Signaux condensés + actions** (`5e0c369` : Archiver réversible + slideout premium menu `...`, OFF byte-identique, 6 bugs bug-hunter corrigés) + **export CSV Prospection filtré** (`6626818` : miroir du load, cap non-silencieux). Flag `ffCrmListesV2` OFF, **non déployé**. Revues adversariales 0 C/H/M/L. Reste cascade : 3.2 Campagne (migration), 3.3 Dashboard, Vague 4 emailing (bloquée). Détail → « Livré cette session » + audits 19/06 ([[audit-secu-2026-06-19-vague3-signaux-actions]], [[audit-secu-2026-06-19-vague3-export-csv]]). NB : non déployé, cf. tâche Déployer.
**Sessions précédentes (condensé)** - détails dans `archive/` (S165-S175 : `2026-05-06-sessions.md` ; S122-S125 : `2026-04-28-sessions.md` ; S70-S107 : `decisions-sessions-*.md` + `Formation/CLAUDE.md`).


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

- Repo separe `appfactory-cli` (ancien `appfactory` reste consultable)
- Workflow prioritaire : construire le cycle core avant d'attaquer FilmPro
- FilmPro = premier projet reel du nouveau workflow (dogfooding)
- Figma Pro abandonne (deep research 2026-04-04 : ratio cout/benefice defavorable pour solopreneur code-first)
- Design = approche code-first : composants custom + kits Figma Community gratuits comme inspiration
- Validation client = prototypes Vercel preview (pas de maquettes Figma)
- CSS scoped obligatoire pour le layout structurel (sidebar, header, nav) : Tailwind responsive (md:hidden, md:block) ne fonctionne pas avec Tailwind v4 pour ce cas
- HTML temporaires pour previsualisations client a chaque etape cle
- Ancien projet AppFactory v1 (Apps Script) = archive consultable, pas de migration

### Decisions UX + Prospection (G36)

→ Archive intégrale : `archive/decisions-structurelles-crm.md` (6 écrans principaux, slide-out panels, saisie rapide, 100% sources gratuites, modèle unifié `prospect_leads`, scoring auto 0-13). Specs prospection complètes : `docs/SPECS_PROSPECTION.md`.

### Doctrine styling : Tailwind utilities + CSS scoped

→ Règle tranchée S180 (audit 360 V3b I-04) : Tailwind utilities pour le détail réutilisable (spacing/couleurs via tokens/typo/états/responsive trivial côté contenu, jamais off-grid `p-[13px]`), `<style>` scoped Svelte pour le layout structurel (sidebar/header/kanban) + keyframes/transitions (token `--ease-out-expo`) + pseudo-éléments + `:global()` ciblés ; jamais de CSS global ad hoc hors `app.css` / `!important` / classe dupliquant un token ; primitives (`Button`/`Input`/`Card`/`Modal`/`DataTable`/`Tabs`) = source unique, on compose. Détail : `memory/feedback_crm_styling_doctrine.md`.


### Sécurité - décisions assumées (audit 360 V3b L-02, L-03)

- **CSP `unsafe-inline` (L-02)** : la `Content-Security-Policy` posée dans `hooks.server.ts` autorise `'unsafe-inline'` sur `script-src` et `style-src`. C'est un **prérequis de l'hydratation SvelteKit** (scripts inline + styles scoped injectés au runtime) ; le retirer imposerait un système de nonce/hash dynamique = refactor framework. Risque résiduel XSS jugé **acceptable** : CRM mono-tenant ≤ 10 admins `@filmpro.ch` (OTP), aucun contenu utilisateur tiers rendu en HTML brut, toutes les sorties dynamiques échappées (`esc()` / `escapeHtml`). À revisiter si SvelteKit expose une option nonce-based simple, ou si une surface UGC apparaît.
- **RLS « mono-tenant plat » (L-03 / L-04)** : ~11 tables ont une policy `FOR ALL TO authenticated USING (true)` — tout utilisateur authentifié voit/modifie/supprime tout (photos, visites, leads, opportunités, veille…). C'est une **décision design assumée** (S127 Q2 Pascal : 3 fondateurs FilmPro symétriques). Les endpoints DELETE photos/visits loggent quand un fondateur agit sur la donnée d'un autre (traçabilité), sans bloquer. **À DURCIR avant l'ajout d'un 4e utilisateur non-fondateur** : passer à des policies `created_by = auth.uid()` (ou rôle admin) + tests d'intégration RLS contre une vraie DB avec une session non-admin. Voir mémoire `feedback_rls_multitenant_durcissement_si_4_users.md` + § RISQUES OUVERTS (M-48, RLS non couverte par les tests Vitest).

---

## INFRA EN PLACE

- **Prod** : https://filmpro-portail.vercel.app (Vercel, déploiement CLI manuel `vercel deploy --prod` ; pas d'auto-deploy git) ; ancienne `filmpro-crm.vercel.app` conservée et redirigée 308 → nouvelle (hook). Supabase EU (projet `appfactory`, 10+ tables, RLS active, service role key configurée)
- **Auth** : OTP email 6 chiffres @filmpro.ch + session 7 jours httpOnly ; SMTP Resend (domaine verifié, free plan)
- **APIs** : Zefix REST + search.ch + fal.ai Flux 1.1 Pro Ultra (partage clé avec Enseignement) — Pexels/Unsplash supprimés S67
- **Crons** : `/api/cron/{signaux,alertes,nettoyage-crm,intelligence,intelligence-archive}` tous sécurisés `CRON_SECRET` + service role (Cron `media-enrich` supprimé S67)
- **Tests** : Vitest 1850 (dernier run vérifié 2026-06-19) + Playwright e2e (suite + P1/P2/P3 Prospection). Accessibilité : focus trap + ConfirmModal partout, axe-core 0 violation modale P3. Sécurité : Zod sur 20 form actions/endpoints, rate limiting 10/min, headers CSP/XFO/referrer, timing-safe secrets

→ Détail intégral (env vars, BDD exhaustive, liste tests, liste crons, headers sécurité, pagination serveur) : `archive/infra-crm-detail.md`

## DOCUMENTATION

- `docs/SPECS_PROSPECTION.md` : Specs completes module prospection (sources, modele, scoring, UI, dedup)

→ Inventaire composants EN PLACE (11 composants, 6 pages, 4 API, scripts) archive dans archive/inventaire-composants.md : consulter si besoin de lister les composants existants avant d'en creer de nouveaux

### Historique condensé (archives)

- Sessions 1-8 : UX 6 écrans, design premium Untitled UI/SnowUI, wizards 5 étapes → `archive/decisions-sessions-1-8.md`
- Sessions 9-16 : auth OTP+MFA, Vercel root `template`, PWA, refonte prospection → `archive/decisions-sessions-9-16.md`
- Sessions 70-77 (formation-ia shared) : cadrage parcours + S1-S5 ingestion → `archive/decisions-sessions-70-77.md`
- Sessions 78-79 (formation-ia shared) : S6-S7 ingestion critère sortie → `archive/decisions-sessions-78-79.md`
- Sessions 122-125 (CRM, V1 mobile) : Lighthouse + Playwright mobile + V1 MOBILE CLOS → `archive/2026-04-28-sessions.md`
- Audit CRM 2026-04-04 (méthodo 5 agents, 4 sprints correctifs) → `archive/audit-crm-2026-04-04.md`

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

→ Tests mobile/responsive : Chrome DevTools Device Toolbar manuel (Pascal) **obligatoire** ; Playwright `viewport:{width,height}` seul et MCP `resize_window` **interdits** comme substituts (Playwright preset `devices['iPhone 14 Pro Max']` OK pour findings OBJECTIFS uniquement — réf `CRM/tests/mobile.spec.ts`). Règle complète : `memory/feedback_crm_mobile_testing_devtools.md`.


## Prochaine session

**Prochaine attaque** : Bloc 1 - **Vague 3.2 Prospection Campagne** : fusionner d'abord les 3 filtres leads dupliqués (`prospection-query.ts`), puis migration `campagne TEXT` + import + colonne + filtre + colonne CSV. Golden Vague 3 validé, chantier 3.1 Signaux + export CSV déjà livrés. Reste ensuite 3.3 Dashboard temporel ; Vague 4 emailing **bloquée** (prérequis externes Pascal).

> Cadrage commun (refonte UX/UI CRM, validé Pascal 2026-06-18) → `~/.claude/projects/-Users-pascal-Claude-Projets-FilmPro/memory/project_refonte_crm_cadrage_2026-06-18.md` + golden Vague 3 `CRM/.product-architect/refonte-vague3/golden-vague3-v1.html` (validé Chrome).

### 1. Vague 3 (suite) + Vague 4 refonte CRM [SUPERVISÉ • xhigh • cascade par chantiers]

- **Pourquoi** : golden Vague 3 validé Chrome (3 écrans). Chantier 3.1 Signaux + export CSV Prospection livrés. Reste Campagne, Dashboard, Emailing.
- **Payload** → cadrage [[project-refonte-crm-cadrage-2026-06-18]] + golden `CRM/.product-architect/refonte-vague3/golden-vague3-v1.html` + audits [[audit-secu-2026-06-19-vague3-export-csv]] + [[audit-secu-2026-06-19-vague3-signaux-actions]].
- **Fait** : golden validé (1 itération : colonnes Statut/Source séparées) ; **chantier 3.1 Signaux** (`5e0c369` : Archiver réversible + menu premium `...`, flag OFF byte-identique, 6 bugs bug-hunter corrigés) + **export CSV Prospection** (`6626818` : miroir du load, cap non-silencieux). Flag OFF, non déployé, revues 0 C/H/M.
- [ ] **[EXÉCUTABLE]** **Vague 3.2 Prospection Campagne** : (prérequis interne) fusionner les **3 filtres leads dupliqués** (load / `/api/prospection/all-ids` / export) dans `$lib/server/prospection-query.ts` AVANT d'ajouter la campagne ; puis migration légère `campagne TEXT NULL` sur `prospect_leads` (saisie à l'import, optionnelle, **cumulative** : plusieurs imports → même campagne) + champ modale import + colonne Campagne premium + filtre par campagne + colonne export CSV.
- [ ] **[EXÉCUTABLE]** **Vague 3.3 Dashboard temporel** : refonte `/crm/+page.svelte` façon Capsule (En retard / Aujourd'hui / Cette semaine + fil d'activité « Ce qui s'est passé »), flag `ffCrmListesV2`, golden validé.
- [ ] **[BLOQUÉ - prérequis externes Pascal]** **Vague 4 Emailing** individuel → nLPD → groupé gaté. Non codable tant que : (a) sous-domaine `send.filmpro.ch` créé + vérifié Resend (DNS), (b) base légale nLPD du stock + mention d'information validées, (c) 1er email réel décrit (réunion 3 fondateurs). → cadrage § Garde-fous emailing.
- [ ] **[EXÉCUTABLE - décision Pascal]** **Déployer la refonte CRM** (Vagues 1+2+3) : codé/commité, **jamais activé**. `vercel deploy --prod` puis bascule flag JWT (`raw_app_meta_data` `ff_crm_listes_v2`) + smoke prod feature-flag (ordre deploy→flag, alias canonique `vercel inspect`, cf. [[feedback_smoke_prod_feature_flag_livraison]]). **Au flip : vérifier visuellement le positionnement du menu `...` du slideout Signaux** (Bug 5 résiduel : ouverture vers le haut en conteneur scrollable, à confirmer sur fiche courte).

### 2. Hygiène working tree FilmPro [SUPERVISÉ • low • ~30 min]

- **Pourquoi** : le working tree FilmPro charrie ~120 fichiers anciens non commités sans rapport avec la refonte (archives mai, PNG, notes, `branding/`, scripts, `.product-architect/`, hors-CRM `../`). Constaté en débloquant la Prospection le 19/06. Non bulldozé (propriété ambiguë, règle opération destructive).
- [ ] **[EXÉCUTABLE]** Passe de tri du working tree : catégoriser puis trancher par catégorie (committer / `.gitignore` / supprimer), grep cross-ref avant toute suppression, STOP au moindre doute. Ne PAS faire `git add -A`. Périmètre = repo FilmPro (`CRM/` + racine container). Distinguer ce qui est livrable de ce qui est scratch/débris de sessions passées.

### Réserve (retirée du backlog actif le 2026-06-07)
- Chantier 3 portail = non cadré (observer l'usage V5 d'abord). Durcissement RLS 4e user = conditionnel ([[feedback_rls_multitenant_durcissement_si_4_users]], redéclenche au 4e user non-fondateur). Corpus golden optimiseur Découpe = livré (`68c4965`/`99476f1`).

### Livré cette session

- [x] ~~**Vague 3.1 Signaux condensés + actions**~~ - 2026-06-19 (`5e0c369`, flag OFF, non déployé). Archiver réversible (`?/archive`/`?/unarchive`, gardes défensives) + slideout premium menu `...` (Archiver/Restaurer/Écarter/Supprimer, clic-hors/Échap/scroll) ; OFF byte-identique ; fix label statut `archive`. Revue sécu **0 C/H/M/L** + 6 bugs bug-hunter corrigés no-debt. → [[audit-secu-2026-06-19-vague3-signaux-actions]].
- [x] ~~**Vague 3.2 (partiel) - export CSV Prospection filtré**~~ - 2026-06-19 (`6626818`, non déployé). Bouton « Exporter CSV » = miroir exact des filtres du load ; colonnes partagées (/reporting byte-identique) ; cap non-silencieux (X-Export-Truncated + label). Dette tracée : fusionner les 3 filtres dupliqués avant la colonne Campagne. → [[audit-secu-2026-06-19-vague3-export-csv]].
- [x] ~~**Vague 2 cascade 5/5 - Prospection premium**~~ - 2026-06-19 (`8c5d84d`, flag OFF). KpiStrip agrégats globaux + ligne premium + fiche crm-facts. 1832 Vitest, **0 C/H/M**, 1 Low a11y corrigé `98f017d`. → [[audit-secu-2026-06-19-vague2-prospection-premium]].
- [x] ~~**Rattrapage commit Prospection P1/P2/P3**~~ - 2026-06-19 (`6c4230a`). Travail 18/06 commité (lot Prospection) → débloque la cascade.
- [x] ~~**Fiches Entreprises+Contacts « golden complet »**~~ - 2026-06-19 (`87a1842`, flag OFF). Grille bordée + timeline ; revue **0 C/H/M/L**. → [[audit-secu-2026-06-19-vague2-fiches-golden-complet]].
→ Livrés antérieurs : Vague 2 Pipeline (`35d7df7`) + Signaux premium (`0800b03`), listes/fiches Entreprises+Contacts (`60a583c`), mini-projet Prospection P1/P2/P3 (18/06), Vague 1 cohérence (`676a9d4`) → `archive/claude-md-crm-livre-2026-06-19.md`. Plus anciens (Cadrage refonte, Audit 360 + 10 bugs `6b9f6e1`, cron veille, copy V5, Vague 4) → `archive/claude-md-crm-livre-2026-06-18.md` + `archive/2026-06-07-sessions.md`.

### Watch list active après pivot

- **[WATCH] Svelte 5 — `onDestroy` s'exécute en SSR (Vercel) mais pas en `vite preview`** : toute référence à `window`/`document`/`localStorage`/`setInterval` à cleanup DOIT passer par `$effect(() => { ...; return () => cleanup; })`. Toujours tester en preview branch Vercel pour les composants qui touchent window. Mémoire `feedback_svelte5_ondestroy_ssr_window_undefined.md`.
- **[WATCH] Trap Vercel `rollback` → alias prod verrouillé** : après `vercel rollback`, les `git push` suivants buildent mais ne promeuvent PAS automatiquement. Toujours vérifier via `vercel inspect filmpro-portail.vercel.app` (domaine canonique depuis la bascule 2026-06-04) que l'alias pointe bien sur le nouveau deploy.
- **[WATCH] Réactivation d'une source coupée en V5 (2026-06-07)** : flip de flag (`SIGNAUX_ZEFIX_ENABLED=true`, ou `config.prospection.sources.*.enabled=true` / `features.*=true`) → re-vérifier que les contrôles d'origine (Zod, quota, rate-limit, anti-hallu) sont bien ceux validés S189/S192 AVANT de rallumer en prod. Le moment du risque = la réactivation, pas la coupure. **Encodage Zefix : corrigé 2026-06-07** (`lib/server/decode-response.ts`, fallback Windows-1252) → la réactivation ne re-corrompt plus les accents (cf. Livré 4d-mojibake). Réf audit `memory/audit_secu_2026-06-07_v5_signaux_prospection.md` § I-3.

→ Watch list complète (Signaux V4 perf/contrats S189, S188, S186, S178, S171) déplacée dans `archive/2026-05-28-pivot-mobile-v3.md`. Restent triables si l'objet redevient actuel.

### Livré (référence historique)

→ Livré V2 + sessions antérieures (S171→S192bis) dans `archive/` (`2026-05-28-pivot-mobile-v3.md`, `2026-05-25/13/10/09/08-sessions.md`).

