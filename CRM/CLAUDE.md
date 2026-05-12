# CRM FilmPro : CLAUDE.md

**Note migration restructure** : ce fichier vit dans `CRM/CLAUDE.md`. Le sous-projet CRM FilmPro est dans `AppFactory/CRM/` (path Vercel `rootDirectory: CRM`). Voie A livrée S173 2026-05-06 (split container CLAUDE.md). Voie B livrée S174 2026-05-07 (rename `template/` → `CRM/` + retrait wizard méta + repointage Vercel). Le `AppFactory/CLAUDE.md` racine est un stub container minimal qui pointe vers les 3 sous-projets (CRM, Consulting, Formation). Voir `~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/project_appfactory_restructure.md` pour le contexte migration complet.

**Statut :** Phase C. **REFONTE PAGE AIDE LIVRÉE** (S182, 2026-05-12) : `/aide` reconstruite from scratch, 3 niveaux data-driven (Prise en main / Fonctions détaillées / Documentation technique), recherche full-text, 5 diagrammes SVG sur-mesure, zéro `getElementById`/`{@html}`, conforme GOLDEN v9 → résorbe H-28 + M-29 (les 2 findings délégués de la cascade audit 360). 1192 Vitest, svelte-check 0 err, build OK, audit secu 0C/0H/0M. Poussé sur main (commit `26fd3e8`), Vercel auto-deploy déclenché ; reste le smoke prod par Pascal. Détail § Livré. **CASCADE AUDIT 360 ENTIÈREMENT FERMÉE** (S180, 2026-05-12) : V1 + V2a + V2b + V2c + V3a-1 + V3a-2 + V3b livrées (S178→S180), 136 findings = 134 fixés + 2 (H-28/M-29) désormais résorbés par la refonte Aide ci-dessus. 13 migrations SQL prod cumul, audits Opus cumul 0C/0H/0M. Détail récent dans § Livré + `archive/2026-05-10-sessions.md`. **Backlog CRM cockpit vide.** **Cascade golden v9 6/6 pages COMPLÈTE** (dashboard S175 + pipeline/contacts/entreprises S176bis + signaux/veille S176ter). MIGRATION RESTRUCTURE VOIE A+B LIVRÉE (S173-S174 : `template/` → `CRM/`, stub container parent). GOLDEN STANDARD v9 LAYERED DS LIVRÉ (S172) + règle `noDashedLines` (S176bis) + § 14 décisions audit 360 V3a-2/V3b (S179-S180). search.ch 2e source découverte (S171). Pipeline veille ANTI-HALLUCINATION V2 (S168). /prospection FIGÉE PAGE MODÈLE GOLDEN V9 (S165). Cron veille externalisée GHA (S167). Audit UX/UI 360 (S160). V2 mobile terrain CLOS (S127α+S129β+S130γ). Formation IA = sous-projet autonome dans `Formation/`, `cc` option 5.
**Derniere mise a jour :** 2026-05-12 (S182 : **refonte page Aide CRM from scratch** — `/aide` reconstruite en 3 niveaux data-driven : couche logique `src/lib/aide/{content,search,checklist}.ts` + composants `AideBlock`/`AideDiagram`/`AideChecklist` + orchestrateur `(app)/aide/+page.svelte` (1443 → 553 lignes). 5 diagrammes SVG sur-mesure, recherche full-text insensible casse/accents, deep-link `?tab=&section=`, sommaire sticky + « sur cette page » IntersectionObserver, zéro `getElementById`/`{@html}`, conforme GOLDEN v9 (tokens, échelle 8px, pas de gradient/dashed, primitive `Tabs` réutilisée). Contenu : niveau 1 (parcours 5 min + checklist 7 étapes localStorage + carte mentale + 5 encarts), niveau 2 (10 fiches écran + 3 diagrammes de flux), niveau 3 (9 sections techniques + runbook ops 4 procédures). Résorbe H-28 + M-29. +39 Vitest (1192/1192). svelte-check 0 err (28 warn, sous baseline 35). Build OK. Audits Opus : security 0C/0H/0M + test-coverage 11/13 → 2 gaps Important comblés. Entry cockpit `eed7761c` livrée. Spec `notes/refonte-aide-2026-05-12/spec.md`. Poussé sur main (commit `26fd3e8`), Vercel auto-deploy déclenché ; reste le smoke prod `https://filmpro-crm.vercel.app/aide` → 303 → /login (Pascal). S181 = API Google Places livrée comme 7e source de prospection — endpoint `/api/prospection/google-places` + 2 migrations prod appliquées (`api_quota_log` + RPC + CHECK source) + UI ImportModal onglet « Google Places » avec options « type d'activité » = réseau de partenaires FilmPro validées par tests live + scoring + garde-fou quota 900/mois. +59 Vitest (1153/1153). svelte-check 0 err. Audits Opus : security 0C/0H/1M résolu + test-coverage 12/15 gaps comblés. Artefact `~/.claude/projects/-Users-pascal--claude/memory/audit_secu_2026-05-12_google-places.md`. Commits `fecc930` + `01980a4`. Clé Vercel prod posée. Spec `notes/google-places-2026-05-12/spec.md`. S180 = cascade audit 360 vague V3b livrée → **CASCADE ENTIÈREMENT FERMÉE**. 28 Low + 12 Info traités (8 SKIP hors-scope nommé). 3 commits mergés ff main (`b9e5dc6` L-01..L-16 sécu+bugs+contracts / `f9cc188` L-17..L-28+I-01..I-12 code+UI+infra / `<docs>` doctrine Tailwind + CSP/RLS assumées + GOLDEN § 14.4-14.5 + clôture). 1 migration SQL prod (`20260512_001` cost_audit_runs numeric 10,6→12,6). +17 Vitest (1094/1094). svelte-check 0 err / 35 warnings (baseline). Build OK. `npm run coverage` ajouté (≈58,5% lignes .ts). `.github/dependabot.yml` ajouté. Audits Opus : security 0C/0H/0M/0L/3I + test-coverage 13/15 (gaps comblés). Smoke prod 8 routes 303→/login + cron signaux 401. Tag `pre-v3b-2026-05-12` posé. Artefact `~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/audit_secu_2026-05-12_audit-360-vague-3b.md`. Détail dans § Livré ci-dessous. Historique des vagues antérieures : V3a-2 (S179) + V3a-1/V2c/V2b/V2a/V1 (S178) → `archive/2026-05-10-sessions.md` ; S176ter/S177 → `archive/2026-05-09-sessions.md` ; S171-S176bis → `archive/2026-05-08-sessions.md`.)
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** Session 182 (CRM, 2026-05-12, `/effort high`) - **Refonte page Aide CRM from scratch livrée en autonomie** : 3 niveaux data-driven, 5 diagrammes SVG, recherche full-text, zéro `getElementById`, conforme GOLDEN v9 ; +39 Vitest (1192/1192) ; svelte-check 0 err ; build OK ; audits Opus security 0C/0H/0M + test-coverage 11/13 (2 gaps Important comblés) ; entry cockpit `eed7761c` livrée ; commit `26fd3e8` poussé sur main (Vercel auto-deploy déclenché). Prochaine attaque : backlog CRM vide — attendre demande Pascal ou transmettre via UI cockpit une des tâches hors-scope (tour guidé, bouton « ? » contextuel, push première-connexion).
**Sessions précédentes (condensé)** - détail S165-S175 : `archive/2026-05-06-sessions.md` + S174-S175 dans Livré ci-dessous. Détail S122-S125 : `archive/2026-04-28-sessions.md`. Détail S78-S79 : `archive/decisions-sessions-78-79.md`. Détail S70-S77 : `archive/decisions-sessions-70-77.md`. Détail S80-S107 : `Formation/CLAUDE.md` (sous-projet autonome).


---

## SOUS-PROJETS

L'arborescence d'AppFactory héberge des sous-projets autonomes (chacun a son propre repo Git, sa propre stack, son propre CLAUDE.md). Pascal navigue par thème depuis ce dossier.

| Dossier | Repo Git | Statut | URL prod | CLAUDE.md |
|---------|----------|--------|----------|-----------|
| `CRM/` (CRM FilmPro) | `pascalmedecin-cmd/appfactory-cli` (=racine actuelle) | Production | <https://filmpro-crm.vercel.app> | (ce fichier) |
| `Formation/` | `pascalmedecin-cmd/onboarding-ia` (séparé, ignoré dans `.gitignore`) | S1→S7 livrés (12/12 modules en prod) | <https://onboarding-ia.vercel.app> | `Formation/CLAUDE.md` |

> Consulting est sibling autonome depuis 2026-05-07 (S175 Bloc 0 PLAN_ATTAQUE) : path `~/Claude/Projets/Consulting/`, repo Git séparé. Voir son `CLAUDE.md` propre dans `~/Claude/Projets/Consulting/CLAUDE.md`. `cc 4` cd vers ce path.

Pour travailler sur un sous-projet : taper `cc` au terminal et choisir `5. Formation IA` (ou `4. Consulting` qui pointe vers le sibling autonome). Claude Code atterrit directement dans le sous-dossier, charge son `CLAUDE.md` propre (plus léger), et les tâches sont scopées. Les tâches du sous-projet sont tracées dans son CLAUDE.md, pas dans celui-ci.

**`/start` à la racine AppFactory = scope CRM FilmPro** (slug=appfactory, subproject=crm). Affiche les tâches `transmitted` du sous-projet CRM uniquement. Formation IA a sa propre entrée au menu terminal `cc` (cd Formation/ → /start scope Formation IA). Source : `~/.claude/cockpit/projets/appfactory/entries.jsonl` filtré par subproject.

**Extensibilité pédago** (Formation IA) : l'ingestion d'une deep research markdown (marketing aujourd'hui, opération/commercial/autres demain) suit un workflow conversationnel Claude Code CLI piloté par **Opus 4.6**. Règles pédago dans `Formation/docs/PEDAGOGIE.md`, protocole d'ingestion dans `Formation/docs/INGESTION.md`.

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

### Fixes mensuels (operateur)
- Claude Code Max : 100-200 EUR/mois (deja en place)
- Vercel Pro : 20 EUR/mois
- GitHub : 0 EUR
- Supabase Free : 0 EUR (dev/staging)
- **Total : 120-220 EUR/mois**

### Par app client
- Supabase Free : 0 EUR (jusqu'a 500 Mo)
- Supabase Pro : 25 EUR/mois (si depassement)
- Vercel : inclus dans Pro
- Domaine : ~1 EUR/mois (~12 EUR/an)
- **Total : 0-26 EUR/app/mois**

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

### Doctrine styling : Tailwind utilities + CSS scoped (audit 360 V3b I-04)

Règle retenue (tranchée S180, 2026-05-12) : **Tailwind utilities pour le détail réutilisable, `<style>` scoped Svelte pour le layout structurel et les patterns visuels spécifiques d'un composant.**

- **Tailwind utilities** : spacing, couleurs (via tokens `bg-*`/`text-*`/`border-*` mappés sur `@theme`), typographie courante, états (`hover:`, `focus-visible:`), responsive trivial (`md:hidden` côté contenu — PAS côté layout structurel, cf. ligne ci-dessus). Pas de valeurs arbitraires off-grid (`p-[13px]`) : rester sur l'échelle § 4 du GOLDEN.
- **`<style>` scoped** : grilles et flex de layout (sidebar, header, kanban, hero éditorial), keyframes/transitions (référencer le token `--ease-out-expo`), pseudo-éléments décoratifs, sélecteurs `:global()` ciblés. C'est le seul endroit autorisé pour du CSS « custom ».
- **Jamais** : feuille CSS globale ad hoc hors `app.css` ; `!important` ; classe utilitaire dupliquant un token (`text-[#2F5A9E]` au lieu de `text-primary`) ; valeur arbitraire pour contourner l'échelle.
- Les primitives (`Button`, `Input`, `Card`, `Modal`, `DataTable`, `Tabs`…) restent la source unique : aucune surcharge locale, on compose.

### Sécurité - décisions assumées (audit 360 V3b L-02, L-03)

- **CSP `unsafe-inline` (L-02)** : la `Content-Security-Policy` posée dans `hooks.server.ts` autorise `'unsafe-inline'` sur `script-src` et `style-src`. C'est un **prérequis de l'hydratation SvelteKit** (scripts inline + styles scoped injectés au runtime) ; le retirer imposerait un système de nonce/hash dynamique = refactor framework. Risque résiduel XSS jugé **acceptable** : CRM mono-tenant ≤ 10 admins `@filmpro.ch` (OTP), aucun contenu utilisateur tiers rendu en HTML brut, toutes les sorties dynamiques échappées (`esc()` / `escapeHtml`). À revisiter si SvelteKit expose une option nonce-based simple, ou si une surface UGC apparaît.
- **RLS « mono-tenant plat » (L-03 / L-04)** : ~11 tables ont une policy `FOR ALL TO authenticated USING (true)` — tout utilisateur authentifié voit/modifie/supprime tout (photos, visites, leads, opportunités, veille…). C'est une **décision design assumée** (S127 Q2 Pascal : 3 fondateurs FilmPro symétriques). Les endpoints DELETE photos/visits loggent quand un fondateur agit sur la donnée d'un autre (traçabilité), sans bloquer. **À DURCIR avant l'ajout d'un 4e utilisateur non-fondateur** : passer à des policies `created_by = auth.uid()` (ou rôle admin) + tests d'intégration RLS contre une vraie DB avec une session non-admin. Voir mémoire `feedback_rls_multitenant_durcissement_si_4_users.md` + § RISQUES OUVERTS (M-48, RLS non couverte par les tests Vitest).

---

## INFRA EN PLACE

- **Prod** : https://filmpro-crm.vercel.app (Vercel, GitHub auto-deploy) + Supabase EU (projet `appfactory`, 10+ tables, RLS active, service role key configurée)
- **Auth** : OTP email 6 chiffres @filmpro.ch + session 7 jours httpOnly ; SMTP Resend (domaine verifié, free plan)
- **APIs** : Zefix REST + search.ch + fal.ai Flux 1.1 Pro Ultra (partage clé avec Enseignement) — Pexels/Unsplash supprimés S67
- **Crons** : `/api/cron/{signaux,alertes,nettoyage-crm,intelligence,intelligence-archive}` tous sécurisés `CRON_SECRET` + service role (Cron `media-enrich` supprimé S67)
- **Tests** : Vitest 164 + Playwright 5 e2e. Accessibilité : focus trap + ConfirmModal partout. Sécurité : Zod sur 19 form actions, rate limiting 10/min, headers CSP/XFO/referrer, timing-safe secrets

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

- **RLS Supabase non couverte par les tests Vitest (audit 360 M-48, gravé S178 V3a-2)** : la suite Vitest mocke `@supabase/supabase-js` — les politiques RLS n'existent qu'au runtime Postgres, donc **aucun test unitaire ne prouve quoi que ce soit sur le comportement RLS réel**. ~25 vecteurs d'autorisation (form actions + endpoints qui lisent une table à RLS restrictive) sont donc « verts » sans garantie. Fixable seulement par une suite d'intégration contre une vraie DB avec une session user non-admin (pas prévu V1, mono-tenant ≤ 10 admins @filmpro.ch). Avant de construire par-dessus un contrôle d'autorisation : lire le code + vérifier manuellement en prod/staging avec un compte au rôle cible. Incident de référence : 2026-04-18 formation-ia (3 utilisateurs bloqués en prod avec 7 tests Vitest verts). Voir `~/.claude/rules/quality.md` § « RLS Postgres et tests avec mocks », mémoire `feedback_rls_mocks_insufficient_S99.md`, et `feedback_rls_auth_lookup_needs_service_role.md`.

## REGLES TECHNIQUES PROJET

### Tests mobile via Chrome DevTools Device Toolbar (manuel) - OBLIGATOIRE

Tout test responsive / mobile / viewport (iPhone SE, iPhone 14 Pro Max, Pixel 7, etc.) se fait dans Chrome via **DevTools Device Toolbar** ouvert manuellement par Pascal (Cmd+Option+I → Cmd+Shift+M → sélectionner device dans le dropdown ou saisir width × height en mode "Responsive"). Claude guide la validation pas-à-pas (URL à charger, élément à inspecter, valeur attendue) ; Pascal exécute dans son DevTools et rapporte ce qu'il voit.

**Interdit** :
1. Tests Playwright avec `viewport: { width, height }` SEUL (sans `deviceScaleFactor`/`isMobile`/`hasTouch`/`userAgent`).
2. MCP `claude-in-chrome` `resize_window` + `javascript_tool` comme **substitut** à DevTools Device Toolbar (le MCP redimensionne la fenêtre Chrome desktop, pas le viewport émulé : pas de DPR mobile, pas d'UA mobile, pas de touch émulé, pas de viewport meta respecté → rendu non fidèle, écart constaté Session C 2026-04-27 : `resize_window(430, 932)` donne `innerWidth = 500`).

**Autorisé pour findings OBJECTIFS uniquement** (S125 dérogation /dig [B]) : Playwright avec `devices['iPhone 14 Pro Max']` preset complet (spread `...devices[...]` qui apporte userAgent Safari iOS + viewport 430×932 + deviceScaleFactor 3 + isMobile + hasTouch). Périmètre couvert : overflow horizontal, dimensions `getBoundingClientRect`, présence DOM, requêtes réseau (font self-host, etc.), boutons ≥ 44px, structure DOM, screenshots de référence.

**Reste obligatoire DevTools manuel pour findings QUALITATIFS** : rendu de police, perception visuelle, animations, scroll inertiel, jugement design, validation visuelle de screenshots golden. Référence d'implémentation : `CRM/tests/mobile.spec.ts` + `CRM/playwright.mobile.config.ts` (S125, 17/17 audits objectifs verts).

**Pourquoi DevTools manuel** : seule l'émulation Device Toolbar applique DPR (3 pour iPhone 14 Pro Max), UA mobile, touch émulé, viewport meta-tag, scrollbar overlay mobile → rendu fidèle au rendu réel sur device. Les media queries CSS Tailwind (`md:`, `lg:`) sont déclenchées par le viewport émulé, pas par la taille de fenêtre desktop.

**Quand le MCP reste OK** : pour mesurer `clientWidth`/`scrollWidth`/`getBoundingClientRect`/textContent en complément d'une session DevTools manuelle déjà ouverte, ou pour des audits de structure DOM non liés à la fidélité visuelle mobile.

**Comment appliquer** : si une tâche demande "tester mobile X" → demander à Pascal d'ouvrir DevTools Device Toolbar sur le viewport cible, lui donner l'URL à charger et la liste des points à vérifier (élément X visible ? overflow horizontal ? bouton Y ≥ 44px ?). Tests Playwright restent légitimes pour navigation desktop, redirects, formulaires, login (pas mobile).

Origine : Session C CRM mobile V1 2026-04-27, Pascal a explicitement refusé Playwright mobile **et** ensuite explicitement refusé MCP comme substitut à DevTools Device Toolbar manuel. Migrée du global méta vers projet AppFactory le 2026-05-01 (scope projet-only, hors-périmètre méta/Marketing/Enseignement).

## Prochaine session

**Prochaine attaque** : backlog CRM vide côté cockpit. La refonte page Aide est livrée (S182). Tâches suivantes possibles (hors-scope nommé de la spec Aide, à transmettre via UI cockpit quand voulu) : (a) tour guidé interactif (tooltips séquentiels), (b) bouton « ? » contextuel sur les 9 pages CRM, (c) push première-connexion vers /aide. Sinon, attendre une demande Pascal.

### 1. ~~Refonte page Aide CRM from scratch~~ — LIVRÉE S182 (2026-05-12)

3 niveaux data-driven livrés (Prise en main / Fonctions détaillées / Documentation technique). Voir § Livré cette session. H-28 (/aide hors charte) et M-29 (getElementById /aide) résorbés. Hors-scope nommé reporté en tâches suivantes (voir « Prochaine attaque » ci-dessus).

### Cascade audit 360 — LIVRÉE (S178→S180, 2026-05-10..12)

7 vagues, 134/136 findings fixés (7C V1 + 32H V2a/V2b/V2c + 57M V3a-1/V3a-2 + 28L+12I V3b), 2 délégués à la tâche #1 ci-dessus (H-28 /aide hors charte, M-29 getElementById /aide). 13 migrations SQL prod. Audits Opus cumul 0C/0H/0M. Vitest 1094/1094. Détails par vague : § Livré ci-dessous + `archive/2026-05-10-sessions.md`. Tags rollback : `pre-audit-360-cascade-2026-05-10` / `pre-v3b-2026-05-12` / `audit-360-cascade-close-2026-05-12`.

### Watch list S178 (post-V2c)

- **[WATCH] V3a rate limit /api/entreprises/*** : audit Opus security V2b L-1 a flaggé que l'endpoint search n'est pas couvert par le rate limit `hooks.server.ts:38-50`. Surface faible (auth gate OK, mono-tenant ≤10 admins, LIMIT 20 + GIN trigram). Reco V2c/V3a : ajouter `/api/entreprises/` ligne 39 (1 ligne).
- **[WATCH] V3a regen `supabase gen types`** : V2b a posé 3 casts `as never` (RPC `transfer_lead_to_crm`, RPC `entreprises_lookup_by_name`) + cast `'version' as 'id'`. Regroupe dette V2a M-19 (cast `as never` searchch insert). Regen post-cascade complète une fois 6 vagues mergées + V3a M-19 nettoyage Zod inserts.
- **[WATCH] V3a TOCTOU Zefix H-02** : Info I-3 audit security V2b. Window TOCTOU sub-2s entre SELECT existing.notes_libres et UPDATE. Fix possible côté DB : `UPDATE … SET notes_libres = COALESCE(NULLIF(notes_libres, ''), $purpose)` (atomicité native).
- **[WATCH] V3a `runWithConcurrency` AbortSignal** : Info I-4 audit. Si futur consumer fait write dans `fn`, side-effects post-reject possibles. Ajouter `AbortSignal` côté worker.
- **[WATCH] V3a pattern cancelled flag** : étendre H-05 VisitsPanel cleanup à PhotosPanel + autres panels async (race conditions UI silencieuses similaires).
- **[WATCH] V3a audit consumers `entreprises.raison_sociale`** : aligner toute recherche client-side sur `lower(immutable_unaccent(...))` ou bannir le pattern (forcer RPC). N1 LIKE injection a montré que la defense-in-depth client doit être à la source.
- **[WATCH] V3a CHECK constraint `jsonb_array_length(items) <= 15`** : defense-in-depth pour F1 cap saturated. Migration possible en V2c.
- **[WATCH] V3a audit cross-codebase UPDATE intelligence_reports** : trigger 009 force le bump auto. Vérifier qu'aucun caller ne dépend d'un comportement "no-op UPDATE" qui maintenait version stable (run-generation upsert running→published, cron archive, recheck-historical).
- **[WATCH] V3a feedback_rpc_atomique_idempotence.md à graver** : pattern checklist obligatoire pour toute nouvelle RPC plpgsql (idempotence + EXCEPTION handlers + ERRCODE distincts). F2 a montré que la spec V2b ne capturait pas l'idempotence comme contrainte de design.
- **[WATCH] V3a `Tabs.svelte` glue DOM non testée (post-V2c)** : la primitive `Tabs.svelte` n'a qu'un test sur la logique pure `tabsNav.ts` (14 tests), pas un test DOM du composant (`focusTabAt`, `e.preventDefault()`, binding `tabindex={active ? 0 : -1}`, `aria-selected`/`aria-controls`). Repo sans jsdom configuré (vitest env = node). Trigger d'ajout (jsdom + `@testing-library/svelte` + test composant) = 3e régression a11y sur les workspace tabs. Flaggé par test-coverage-reviewer (Low).
- **[WATCH] V3a `aria-controls` Tabs vers panels inexistants (post-V2c)** : `Tabs.svelte:65` `aria-controls={panel-${tab.key}}` pointe vers des IDs `panel-{key}` absents sur les pages workspace (contacts/entreprises/signaux/pipeline filtrent une table, pas de `<div role="tabpanel">`). Pré-existant (les 5 composants `*Tabs.svelte` avaient déjà ce câblage), centralisé en V2c. Reco : rendre `aria-controls` optionnel sur la primitive (passé seulement quand un panel existe — cas `/reporting`), ou ajouter `role="tabpanel"` sur les pages. Aucun impact sécurité. Flaggé par security-auditor (Info).
- **[WATCH] ~~cockpit entries CRM `blocked`/`block_role` stale (post-V3a-1)~~ - RÉSOLU 2026-05-11** : réconciliation manuelle de `entries.jsonl` + `blocks-crm.json` (backups `*.bak.<ts>-pre-reconcile-v3a`) : `78249fed4e8d` (V3a-2) → `blocked: false, block_role: actionable, block_num: 1` (Bloc #1) ; `14efa600e6ba` (V3b) → `block_role: bloque, block_num: B1` ; `dc3f7cf2133a` (Aide) → `blocked: true, block_role: bloque, block_num: B2`. `blocks-crm.json` retitré (Bloc #1 = « Cascade audit 360 V3a-2 », B1 = V3b, B2 = Aide). `/start` + `/api/consolidate/blocks` alignés sur la « Prochaine attaque » CLAUDE.md. Cause racine inchangée (`cli_pivot.py` ne réécrit pas `blocked`/`block_role`/`status` sur entries `source=cli` existantes) → si une future consolidation LLM s'applique, re-vérifier ; sinon stable.

### Watch list S178 (post-V1)

- **[WATCH] V2b H-06 trigram entreprises** : V1 a posé `.limit(1000)` garde-fou immédiat dans `getOrCreateEntreprise`, refonte trigram + ilike bounded prévue V2b H-06.
- **[WATCH] V3a M-19 Zod refit searchch insert** : V1 a posé cast `as never` minimal (`searchch/+server.ts:225`), refonte Zod côté construction `inserts` prévue V3a M-19.
- **[WATCH] F3 V2 mobile saisie lead express** : `lead_express` maintenant accepté par DB CHECK (migration `20260510_002`), prochain test terrain à confirmer (CHECK violation 23514 disparue).
- **[WATCH] svelte-check baseline 0 erreur** : V1 a ramené baseline de 4 → 0. Si V2a→V3b font remonter erreurs, viser maintien baseline 0 (zéro nouvelle erreur tolérée).
- **[WATCH] Consolidation cockpit S178 calculée mais apply refusé local strict** : audit déterministe a flaggé 2 tâches `effort.score=3` mais 4 critères True (incohérence LLM dans blocs cumulés bloqués V2b+V2c et V3a+V3b). Output reste mémoire serveur cockpit, ré-applicable via UI après ajustement manuel ou re-consolidation à la prochaine clôture.
- **[WATCH] Durcissement RLS si 4e user non-fondateur (post-V3b)** : tant que FilmPro = 3 fondateurs symétriques, RLS « tous voient/suppriment tout » assumée (cf. § DECISIONS STRUCTURELLES > « Sécurité - décisions assumées » + § RISQUES OUVERTS M-48). Le jour où Pascal mentionne un 4e utilisateur non-fondateur (commercial junior, terrain, prestataire) → ouvrir une tâche `[EXÉCUTABLE]` : policies `created_by = auth.uid()` + checks d'ownership applicatifs + tests d'intégration RLS contre une vraie DB. Checklist complète : `~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/feedback_rls_multitenant_durcissement_si_4_users.md`.


<!-- BEGIN CONSOLIDATION (auto-géré par cockpit, ne pas éditer) -->

### Consolidation cockpit (réconcilié S181 2026-05-12)

**Blocs actionnables** : aucun — la refonte page Aide (ex-Bloc #1) est livrée S182. Backlog CRM cockpit vide.

**Blocs bloqués** : aucun.

**Note** : la cascade audit 360 (V1→V3b) est entièrement fermée (S180) et la source Google Places est livrée (S181), donc les anciens blocs B1/B2 de cette section sont caducs. CRM n'a plus qu'une entry `transmitted` côté cockpit → la consolidation LLM ne se relance pas (< 2 entrées) ; ce bloc est tenu à la main jusqu'à ce qu'une 2ᵉ tâche soit en file.

<!-- END CONSOLIDATION -->


### Watch list S171 (post-livraison)

- **[WATCH] Compteur quota search.ch côté DB (post-S171)** (vu 2026-05-06) : search.ch ne fournit pas d'API publique pour lire le compteur quota mensuel (uniquement tableau de bord compte search.ch). Pour visibilité ops « il reste N requêtes ce mois » dans CRM → table `api_quota_log` ou colonne incrémentale `searchch_calls_YYYYMM`. Pas critique tant que Pascal contrôle l'usage, à graver tâche si l'usage atteint 50%+ du quota sur un mois.
- **[WATCH] `prospect_leads.description` consommée par LLM future (audit S171 Info #1)** (vu 2026-05-06) : description = `occupation + categories.join(' / ')` (categories user-influenced via `was=` query search.ch). Aucun pipeline LLM ne consume cette colonne aujourd'hui. Si pipeline future (scoring auto, qualification, génération mail) → appliquer cross-check verbatim pattern S168. → voir `memory/audit_secu_2026-05-06_searchch_endpoint.md`.
- **[WATCH] `entry.sourceUrl` rendu href client (audit S171 Info #2)** (vu 2026-05-06) : la nouvelle colonne `prospect_leads.source_url` peut désormais pointer vers une URL search.ch arbitraire. UI rendant `<a href={sourceUrl}>` doit confirmer filtrage `https?://` côté client (defense in depth Svelte). search.ch retourne uniquement `https://tel.search.ch/...` aujourd'hui, mais aucune garantie contractuelle. Audit visuel rapide LeadSlideOut + DataTable au prochain passage.
- **[WATCH] Race condition `addItem` veille (Low #3 audit S169)** : form action `addItem` sur `/veille/[id]` fait read-modify-write non-atomique sur `intelligence_reports.items` JSONB via service client. Si 2 admins ajoutent simultanément depuis 2 onglets, le second écrase le premier (perte silencieuse, pas exploitable). Mitigation suggérée : optimistic locking via colonne `version` si volume augmente. → voir `memory/audit_secu_2026-05-05_veille_themes_db.md` Low #3.
- **[WATCH] Injection prompt LLM via description thème (Info #1 audit S169)** : la description d'un thème admin est concaténée dans `SYSTEM_PROMPT` via `buildThemesPromptSection`. Validation Zod limite à 500 chars mais aucun escape. Modèle de menace = admin authentifié déjà accès complet au CRM (faible risque). Cross-check verbatim Sonnet S168 protège la sortie LLM. Mitigation suggérée si surface s'élargit : escape `\n` + délimiter `<themes_taxonomy>` XML-like. → voir `memory/audit_secu_2026-05-05_veille_themes_db.md` Info #1.

### Livré cette session (récents + archives)

→ Sessions antérieures : `archive/2026-05-10-sessions.md` (S178 cascade audit 360 V1 + V2a + V2b + V2c + V3a-1 ; S179-S180 V3a-2 + détails connexes) · `archive/2026-05-09-sessions.md` (S174 Voie B + cascade golden 6/6 fermée + S176ter T2/T3 + S177 dashboard coûts) · `archive/2026-05-08-sessions.md` (S171-S173 + S175 dashboard v9 + S176bis x3 cascade /pipeline /contacts /entreprises) · `archive/2026-05-04-sessions.md` (antérieures)

- [x] ~~S182 - Refonte page Aide CRM from scratch (3 niveaux, data-driven, GOLDEN v9)~~ - Fait 2026-05-12 (xhigh, ~2,5h ; Score 4/4 : structurelle (nouveau module + 3 composants + refonte route) + multi-étapes contraintes croisées (3 niveaux × contenu × charte × a11y × tests) + itération coûteuse (rebuild + audits) + non-mesurable (design/UX/pédagogie)). Spec figée `notes/refonte-aide-2026-05-12/spec.md` (10 critères binaires, hors-scope nommé). **Remplace** l'ancien `/aide/+page.svelte` de 1443 lignes (hors charte, `getElementById`, recherche bidon) → résorbe H-28 (/aide hors charte) + M-29 (getElementById /aide). **Couche logique (nouveaux `.ts`)** : `src/lib/aide/content.ts` (arbre typé `niveau → sections → blocks` ; types de blocs : paragraph / list / steps[checklist] / table / callout / code / diagram / link ; `KNOWN_ROUTES` pour valider les liens internes ; helpers `levelByKey` / `allChecklistStepIds`) ; `src/lib/aide/search.ts` (index full-text construit une fois depuis `aideContent`, `normalizeForSearch` minuscules + sans diacritiques, `searchAide` insensible casse/accents + tri `titleMatch` d'abord) ; `src/lib/aide/checklist.ts` (logique pure : `parseChecklistState` tolérant JSON corrompu, `serializeChecklistState` tableau trié stable, `toggleStep` immuable, `pruneChecklistState` nettoyage clés obsolètes, `checklistProgress` avec borne + arrondi, clé localStorage versionnée `crm.aide.checklist.v1`). **Composants** : `src/lib/components/aide/AideBlock.svelte` (dispatch sur `block.type`, zéro `{@html}`, tables/callouts/code sobres via tokens), `AideDiagram.svelte` (5 SVG sur-mesure inline : `ecosysteme` carte mentale des écrans, `cycle-opportunite` cycle pipeline 5 étapes + issues, `veille-hebdo` déroulé 4 étapes, `scoring-prospection` barres empilées sur 12, `architecture` 4 couches ; couleurs via `var(--color-*)`, pas de gradient/dashed, `role="img"` + `<title>`), `AideChecklist.svelte` (checklist 7 étapes, barre de progression `role=progressbar`, vraies cases `<input type=checkbox>` + `<label for>`, persistance localStorage via la couche pure, bouton réinitialiser). **Orchestrateur `(app)/aide/+page.svelte`** : primitive `Tabs` (3 niveaux, density comfortable, `aria-controls`/`aria-labelledby` câblés vers `#aide-panel-{key}`) + recherche dans le snippet `actions` ; sommaire sticky à gauche, contenu au centre, « sur cette page » à droite (IntersectionObserver, recréé au changement de niveau), repliés < 1024px ; deep-link `?tab=X&section=Y` via `goto` `replaceState`/`noScroll`/`keepFocus` ; **zéro `getElementById`** (registre `Map<id, HTMLElement>` via action `use:registerSection`) ; le H1 « Aide » reste porté par `Header.svelte`, la page ouvre en H2 ; `$pageSubtitle` = libellé du niveau actif. **Contenu** : niveau 1 (parcours 5 min narratif + diagramme `ecosysteme` + checklist 7 étapes + 5 encarts tip/warning/note + table des pastilles de score) ; niveau 2 (10 fiches écran : Dashboard, Contacts, Entreprises, Pipeline, Prospection, Signaux, Veille, Reporting, Coûts API, Aide — chacune : à quoi ça sert / actions clés / pièges / lien profond ; 3 diagrammes de flux) ; niveau 3 (9 sections : Architecture, Stack, BDD+RLS, Auth magic link, APIs externes, Crons, Déploiement, Sécurité, **Runbook ops 4 procédures** : réinitialiser un accès / appliquer une migration prod / régénérer les types / lancer la veille manuellement). Registre éditorial GOLDEN § 1 (vocabulaire métier vitrage FilmPro, zéro jargon SaaS, zéro emoji). **Tests** : 39 Vitest (`content.test.ts` : 3 niveaux ordonnés, ids uniques, liens internes ∈ KNOWN_ROUTES, liens externes en https, noms de diagrammes connus, tables cohérentes head/rows, couverture des 3 niveaux comme spécifié, `allChecklistStepIds` uniques, `levelByKey` fallback ; `search.test.ts` : normalisation accents/casse, index couvre toutes les sections, requête vide → [], terme dans le corps pas le titre, insensible casse/accents, tri titleMatch, dédup, terme absent, **cross-check résultats ↔ arbre** ; `checklist.test.ts` : parse null/corrompu/types mixtes, serialize trié + round-trip, toggle add/remove + immuable, prune filtre + immuable + no-op, progress arrondi/borne/total≤0) → **1192/1192 Vitest verts** (baseline 1153). `svelte-check` **0 erreur** (28 warnings, sous baseline 35). `npm run build` prod OK (~23 s). Greps de conformité : 0 `getElementById` (hors commentaires), 0 `{@html}`, 0 `dashed`/`dotted`, 0 hex hardcodé, 0 `gradient` dans les fichiers aide. **Audits Opus** : `code-review:security-auditor` **0 C/0 H/0 M** (surface minime par construction : contenu 100 % statique, aucune entrée serveur, page sous `(app)` ; 5 points d'attention demandés tous satisfaits — pas de `{@html}`, SVG inline sûr, localStorage sans PII, `rel=noopener noreferrer` sur `target=_blank`, deep-link/recherche sans vecteur DOM-XSS ; 1 Low couverture .svelte non testée, 3 Info) ; `code-review:test-coverage-reviewer` 11/13 → 2 gaps « Important » (immutabilité `pruneChecklistState` + cross-check `searchAide` résultats ↔ arbre) **comblés in-session** (+4 tests). **Reste** : commit `26fd3e8` poussé sur main → Vercel auto-deploy déclenché ; reste le smoke prod `https://filmpro-crm.vercel.app/aide` → 303 → /login par Pascal. **Hors-scope nommé reporté en tâches suivantes** : tour guidé interactif, bouton « ? » contextuel sur les 9 pages, push première-connexion vers /aide. **Tracking git** : nouveaux `src/lib/aide/{content,search,checklist}.ts` + `{content,search,checklist}.test.ts` + `src/lib/components/aide/{AideBlock,AideDiagram,AideChecklist}.svelte` ; modifié `src/routes/(app)/aide/+page.svelte` (1443 → 553 lignes) + CLAUDE.md. Entry cockpit `eed7761c` livrée via `deliver.py` (outcome loggé). Pas de migration SQL, pas de changement infra/sécurité, donc pas d'artefact `audit_secu_*` dédié au-delà du rapport security-auditor (0 H/C).

- [x] ~~S181 - API Google Places comme 7e source de prospection~~ - Fait 2026-05-12 (high, ~3,5h ; Score 3/4 : structurelle (nouvelle table + RPC + migrations + endpoint + scoring) + multi-étapes + itération coûteuse (migration prod + appels payants)). Spec figée `notes/google-places-2026-05-12/spec.md` (10 arbitrages tranchés, hors-scope nommé, 10 critères binaires). **Backend** : `src/routes/api/prospection/google-places/{+server.ts,helpers.ts}` (Places API New `places:searchText`, clé en header `X-Goog-Api-Key`, field mask figé serveur, timeout 10 s + cap 2 Mo, `includedType` mappés à 7 métiers, bounding boxes des 6 cantons romands, parsing `addressComponents→canton`, `detectSecteurFromPlace`, mapping → `prospect_leads`, dédup intra-source `(source,source_id=pid:placeId)` + écartés/transférés + **dédup cross-source vs entreprises Zefix** via RPC `entreprises_lookup_by_name` → lead conservé mais marqué « déjà connue (Zefix) », canton illisible → lead conservé `canton=null` + mention) + `google-places/quota/+server.ts` (GET quota restant) + `src/lib/server/quota.ts` (lecture/incrément `api_quota_log`). **Garde-fou quota** : réservation du slot (incrément atomique via RPC `api_quota_increment` SECURITY DEFINER) AVANT l'appel Google → ferme la fenêtre TOCTOU (audit secu) ; cap applicatif 900/mois, sous le seuil gratuit Google ~1000/mois (SKU Enterprise ~35 USD/1000 au-delà, tarif vérifié recherche web — coût réel 0 € à ce volume). **Migrations prod appliquées + vérifiées** (script `scripts/apply-migrations-google-places.mjs`) : `20260512_002_api_quota_log.sql` (table RLS lecture-seule + RPC) et `20260512_003_prospect_leads_source_google_places.sql` (CHECK source étendu). **Intégration** : `config.ts` (source + `google_places` ∈ `scoring.entrepriseIdentifiee.sources` → +1 pt), `api-limits.ts` (bloc + `googlePlacesQuotaStatus`), `schemas.ts` (`SOURCES_LEAD`), `prospection-utils.ts` (onglet Entreprises), `hooks.server.ts` inchangé (`/api/prospection/*` déjà rate-limité). **UI** : onglet « Google Places » dans `ImportModal.svelte` (3 cartes-source sur l'onglet Entreprises, select « type d'activité » comme champ principal + mot-clé optionnel + canton + compteur « il reste N recherches ce mois », token couleur dédié `--color-prosp-place` teal sobre, conforme GOLDEN v9 — pas de gradient/dashed) ; garde anti-`google_places` dans `saveRecherche` (→ 400, source payante interdite dans les recherches/alertes rejouables — A5). **Tests** : +59 Vitest (helpers, endpoint, `quota.ts`, `api-limits`, garde `saveRecherche`, prospection-utils) → **1153/1153 verts** (baseline 1094). `svelte-check` 0 erreur (35 warnings, baseline). Build prod OK. **Audits Opus** : `code-review:security-auditor` 0C/0H, 1 Medium (TOCTOU quota → résolu), 1 Low (LIKE escape → résolu côté caller), 6 Info ; artefact `~/.claude/projects/-Users-pascal--claude/memory/audit_secu_2026-05-12_google-places.md`. `code-review:test-coverage-reviewer` 12/15 → 3 gaps « Important » (api-limits, quota.ts, garde saveRecherche) **comblés in-session** → couverture complète. **Reste** : aucun — clé Vercel prod posée par Pascal en fin de session. **Tracking git** : nouveaux `src/routes/api/prospection/google-places/{+server,helpers,helpers.test,server.test}.ts` + `quota/+server.ts` + `src/lib/server/quota{,.test}.ts` + `src/lib/api-limits.test.ts` + `src/routes/(app)/prospection/saveRecherche-paid-source.test.ts` + `supabase/migrations/20260512_{002,003}_*.sql` + `scripts/apply-migrations-google-places.mjs` + `notes/google-places-2026-05-12/spec.md` ; modifiés `app.css`, `api-limits.ts`, `config.ts`, `schemas.ts`, `prospection-utils{,.test}.ts`, `ImportModal.svelte`, `prospection/+page.{server.ts,svelte}`, `.env.example`. Entry cockpit `f0cc23e7` livrée via `deliver.py`. [WATCH] : ajouter une clause `ESCAPE` à la RPC `entreprises_lookup_by_name` (défense en profondeur DB, couvre tous les callers — aligné [WATCH] V3a « audit consumers raison_sociale »).

- [x] ~~S180 - Cascade audit 360 vague V3b (28 Low + 12 Info) → CASCADE ENTIÈREMENT FERMÉE~~ - Fait 2026-05-12 (xhigh, ~5h ; Score 3/4 : structurelle defense-in-depth + multi-étapes + itération coûteuse rebuild). Session autonome. 3 commits mergés ff main : `b9e5dc6` (L-01..L-16 sécu+bugs+contracts) + `f9cc188` (L-17..L-28 + I-01..I-12 code+UI+infra) + `<docs>` (doctrine Tailwind + CSP/RLS assumées + GOLDEN § 14.4-14.5 + clôture). Tag rollback `pre-v3b-2026-05-12` posé. **Sécu (L-01..L-06)** : HSTS `max-age=63072000; includeSubDomains; preload` (`hooks.server.ts`) ; CSP `unsafe-inline` documentée (prérequis hydratation SvelteKit — commentaire + § DECISIONS STRUCTURELLES) ; DELETE photos/visits ownership-aware logging (`console.info` quand owner ≠ user) + 404 sur visite inexistante (modèle de rôles plat S127 assumé) ; `ManualItemSchema.url` veille `+ .regex(/^https?:\/\//i)` ; L-06 (sanitize Zefix log) déjà fait V2a/V3a-1 — vérifié. **Bugs (L-07..L-13)** : escapeHtml email-recap déjà 5 entités — vérifié ; `weekKey` frontières d'année 4 tests (W53, 2026-W53 à cheval 2027, 2027-W01, 2025-W01) ; `formatTokens` négatif → `console.warn` + `Math.abs` (au lieu de '0') ; cron alertes seuils 20h/140h commentés (marge jitter Vercel, intentionnel) ; cron signaux `Number.isNaN(sogcDate)` guard + trace + skip ; `parseSwissAddress` NPA déjà géré V3a-2 M-53 — vérifié ; `DataTable` `safePageSizeOptions` $derived (filtre entier > 0 ≤ 500, dédup, tri). **Contracts (L-14..L-16)** : `complianceTag` `string` → `ComplianceTag` (import `type`-only, narrowing `ComplianceTagEnum.safeParse` aux lectures DB `signal-lookup.ts`/`recompute-score.ts` ; `narrowComplianceTag` exporté + testé) ; `App.PageData.session` déjà `Session | null` — vérifié ; migration `20260512_001` `cost_audit_runs` `numeric(10,6)→numeric(12,6)` **appliquée prod + vérifiée** (`information_schema` → precision 12). **Code (L-17..L-20)** : `src/lib/utils/time-constants.ts` (`SECOND/MINUTE/HOUR/DAY/WEEK_MS` + `_S` + `SESSION_MAX_AGE_MS/S` + `RATE_LIMIT_WINDOW_MS`) ≈12 consumers migrés + 3 tests d'invariants ; commentaires eslint-disable (`icon-map.ts` ×2, `csv-import.ts` ×2, `veille/[id]/+page.server.ts` ×1) ; L-17 stores writable + L-19 pages 600+ lignes = SKIP hors-scope nommé. **UI (L-21..L-27)** : dashboard gap 56→48 / 20→24 ; contacts+pipeline padding 20/40→24/32 ; pipeline kanban 12px→16px ; login `aria-hidden` sur `<img>` bg + overlay décoratif ; L-23 Tabs height 48/44 documenté GOLDEN § 14.4 ; L-24 tab-count font déjà 12px (V3a-2 M-46) — vérifié ; L-27 ws-filter-select déjà 32px (V2c) — vérifié. **Tests (L-28)** : `SignalBatchDeleteSchema` 3 tests (CSV→array, rejet vide/non-uuid/mixte, cap 500 inclusif / 501 rejet). **INFO (I-01..I-12)** : token `--ease-out-expo` (`app.css @theme`) + remplacement bulk ~28 usages dans 13 fichiers + doc GOLDEN § 14.5 ; I-02 padding tab pill = SKIP (factorisé golden v9) ; constante `MODAL_CLOSE_TRANSITION_MS` (EnrichBatchModal) ; doctrine Tailwind utilities + CSS scoped → `CRM/CLAUDE.md § DECISIONS STRUCTURELLES` ; `.github/dependabot.yml` (npm `/CRM` hebdo lundi + github-actions `/`, PR groupées mineures/patch) ; `safeGetSession` fail-closed 2 tests + HSTS header test ; commentaire modèle de menace prompt injection thème (`theme-loader.ts`) ; 1 SVG inline login = doublon H-29 V2c — vérifié résolu ; I-09/I-10/I-11 (focus trap / noDashedLines / ratio TDD) = SKIP déjà validés ; `@vitest/coverage-v8` (4.1.6) + script `npm run coverage` + config `vite.config.ts` (provider v8, reporters text+html, include `src/**/*.ts`) → `coverage/index.html`, ≈58,5% lignes `.ts`. **Mémoire créée** : `feedback_rls_multitenant_durcissement_si_4_users.md` (checklist du durcissement RLS le jour d'un 4e user non-fondateur). **Gates** : Vitest 1094/1094 (+17 vs baseline V3a-2 1077) ; svelte-check 0 erreur / 35 warnings (baseline inchangée) ; build prod OK (~20s) ; `npm run coverage` OK ; smoke prod 8 routes 303→/login + `/api/cron/signaux` 401 ; migration `20260512_001` appliquée+vérifiée. **Audits Opus** : `code-review:security-auditor` 0C/0H/0M/0L/3I (Info : HSTS `preload` à réévaluer si migration domaine custom — conforme à la spec L-01 ; `console.info` audit trail volatile — table `audit_log` si traçabilité probante requise ; cast `as ComplianceTag` cosmétique post-`safeParse`) ; `code-review:test-coverage-reviewer` 13/15 — 5/5 fixes à logique testable couverts ; 2 gaps « Important » (L-11 NaN sogcDate, L-14 narrowing) **comblés in-session** (test cron L-11 + 3 tests `narrowComplianceTag` + 3 tests `time-constants`). Artefact `~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/audit_secu_2026-05-12_audit-360-vague-3b.md`. **Cascade audit 360 ENTIÈREMENT FERMÉE** : 136 findings — 134 fixés (7C V1 + 32H V2a/b/c+V1 + 57M V3a + 28L+12I V3b), 2 délégués tâche #4 refonte Aide (H-28 /aide hors charte, M-29 getElementById /aide). SKIP V3b tous documentés comme hors-scope nommé (spec `spec-vague-3b.md` § Hors-scope). **Reste cascade** : zéro. **Prochaine tâche** : #4 refonte page Aide CRM from scratch (débloquée). **Tracking git** : ~50 fichiers (dont nouveaux `src/lib/utils/time-constants.ts` + `.test.ts`, `src/lib/server/intelligence/signal-lookup.test.ts`, `supabase/migrations/20260512_001_*.sql`, `.github/dependabot.yml`). Entry cockpit `14efa600` à delivrer via `deliver.py appfactory 14efa600 --sub crm`. [WATCH] V3b (test-coverage) : extraire la logique `safePageSizeOptions` de DataTable en `.ts` testable ; `schemas.test.ts` réutiliser le helper `uuid(n)` dans le test du cap (cosmétique).

