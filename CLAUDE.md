# AppFactory : CLAUDE.md

**Statut :** Phase C, Skills et templates HTML + module Veille sectorielle refondu LEAN (S112, prod) + email récap cron veille (gated, actif) + export/import CSV + page /reporting + Golden Standards CRM v3 livré + Phase 4 application `/prospection` en prod (S114) + Migration Material Symbols → Lucide complète (S115) + **Cascade golden v3 pages 1-2 livrée + sweep structurel single-blue cross-app (S116, commits `7f2dac3` + `fc0bd6c` push main)**. Formation IA est un sous-projet autonome dans `formation-ia/`, accessible directement via `cc` option 2.
**Derniere mise a jour :** 2026-04-26 (session S116 CRM xhigh : /dashboard + /contacts livrées golden v3 + sweep structurel cross-app accent → primary 158 substitutions / 24 fichiers + SlideOut 560 + token --color-primary-hover. Vitest 344/344, svelte-check 0 régression.)
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** Session 116 (CRM, 2026-04-26, `/effort xhigh`). 2 commits majeurs. **Bloc 1a Phase 3+4 cascade page 1/6 `/dashboard`** : audit subagent ui-auditor (10 findings, 0 P0 / 7 P1 / 3 P2), 9 fixes appliqués (rounded-xl→lg sur 8 cards + alertes + raccourcis, KPI p-5→p-4, sections px-5→px-4, h2 +text-lg 18px, raccourcis h-10 box-border, gap-2.5→gap-2, KPI value text-3xl font-bold→text-2xl font-semibold, mt-0.5→mt-1). P2-02 (`bg-primary/5` opacités custom) reporté backlog. Vérification chrome MCP getComputedStyle 7/7 conforme. Commit `7f2dac3` push main. **Bloc 1a cascade page 2/6 `/contacts` + sweep structurel cross-app** : audit révèle 5 findings dont 3 STRUCTURELS (token `--color-accent: #3B6CB7` au lieu du primary, SlideOut 480px au lieu de 560, focus accent). STOP cascade demandé pour décision Pascal. Validation Pascal (single-blue + slideOut 560 + commit unifié). Sweep `bg-accent → bg-primary` via script Python ciblé sur préfixes Tailwind (158 substitutions / 24 fichiers, regex préservent variants TS Badge `'accent'`). CTA `px-4 py-2 font-medium` → `h-10 px-4 box-border font-semibold` via sed (15 occurrences / 6 fichiers). Cellules `px-4 py-2.5` → `px-4 py-3` (13 occurrences DataTable + snippets row). SlideOut défaut 480→560. Token golden ajouté `--color-primary-hover: #264C85`. `hover:bg-primary-dark` → `hover:bg-primary-hover` sur CTA login + prospection (primary-dark conservé Sidebar bg / veille éditorial / login bg). Fixes locaux /contacts F3 (cellules py-3) + F5 (Archiver ghost h-10 font-medium hover:bg-danger/5). Vérification chrome MCP 3 pages (/dashboard, /prospection, /contacts) : tous CTA bg primary h-40 fw-600, td paddingY 12px, slideOut 560, h1 22/600. Vitest 344/344, svelte-check 109 baseline = 109 (0 régression). Commit `fc0bd6c` push main 29 fichiers 207+/125-. Apprentissage clé S116 : audit Express 1 page peut masquer écarts structurels cross-app, faire émerger pattern systémique après 2-3 pages avant cascade complète (cf. mémoire `feedback_audit_uiux_cross_app_revelation`).
**Session -1 :** Session 115 (CRM, 2026-04-26, `/effort xhigh` AUTONOME). Bloc 1b Migration Material Symbols → Lucide : 207 occurrences éliminées commit atomique `f1a54c5`, wrapper `<Icon name="...">` + `icon-map.ts` (92 mappings), font Material retirée, validation chrome MCP 8 pages. Vitest 344/344, svelte-check 0 régression.
**Session -2 :** Session 114 (CRM, 2026-04-26, `/effort xhigh`). 3 livraisons. Bloc 1a Phase 4 `/prospection` : 12 findings P0+P1 corrigés commit `fbe1d81` push prod, 12/12 vérifiés chrome MCP getComputedStyle. Bloc 1c Golden v3 : snapshot v2 → v3 régularise règle skill « jamais d'écrasement ». Bloc 1d Investigation veille résolu : pas d'anomalie, W16 = première édition mathématiquement possible.
**Sessions précédentes (condensé)** - détail S78-S79 : `archive/decisions-sessions-78-79.md`. Détail S70-S77 : `archive/decisions-sessions-70-77.md`. Détail S80-S107 : `formation-ia/CLAUDE.md` (sous-projet autonome, sessions V2 formation-ia).

- **S105** (formation-ia, 2026-04-20) : refonte roadmap V2 post 6 demandes Pascal → plan 9 blocs séquencés ~23h. **Bloc 0 Pipeline images Phase 1-4 livré** (migration DB + bucket Supabase + résolveur signed URL + composant apprenant + helpers + script fal.ai Flux + 12 briefs + 12 images prod scores 7-9/10). 7 commits : `edc1822`, `141cf98`, `a74eebc`, `7bb05b6`, `d56b142`, `69e2ac6`, `b77a8c5`. Gates 578/0/0, vitest 25/25.
- **S104** (formation-ia, 2026-04-19) : refonte T9 multi-select libre `niveaux_ouverts text[]` + modal conflit retrait (commits `f71efc1`, `4adab94`).
- **S103** (formation-ia, 2026-04-19) : T5 ThemeCardPlaceholder (commit `07c3318`) + T9 initial (commit `ba26631`, invalidé S104).
- **S102** (formation-ia, 2026-04-18) : T8 `[VALIDÉ]` règle « Livrable fermé » + page emplacements + axe-core 0 serious 11 routes.
- **S101** (formation-ia, 2026-04-18) : T8 Cockpit vidéos v1+v2 livré prod bout en bout (~4h xhigh).
- **S100** (formation-ia, 2026-04-18) : groupe dette 1D (a11y 9→0 axe-core + tokens --deep + `scripts/audit-a11y/` + anti-hype intros).
- **S99** (formation-ia, 2026-04-18) : T7 Pack 2 V2 (DashboardResume + AnchorNav + 5 sections + 13 covers SVG + 19 logos + endpoint PDF pdfkit + 7 composants + 2 migrations DB).
- **S98** (formation-ia, 2026-04-18) : T6 Pack 1 MVP V2.

---

## SOUS-PROJETS

L'arborescence d'AppFactory héberge des sous-projets autonomes (chacun a son propre repo Git, sa propre stack, son propre CLAUDE.md). Pascal navigue par thème depuis ce dossier.

| Dossier | Repo Git | Statut | URL prod | CLAUDE.md |
|---------|----------|--------|----------|-----------|
| `template/` (CRM FilmPro) | `pascalmedecin-cmd/appfactory-cli` (=racine actuelle) | Production | <https://filmpro-crm.vercel.app> | (ce fichier) |
| `formation-ia/` | `pascalmedecin-cmd/onboarding-ia` (séparé, ignoré dans `.gitignore`) | S1→S7 livrés (12/12 modules en prod) | <https://onboarding-ia.vercel.app> | `formation-ia/CLAUDE.md` |

Pour travailler sur un sous-projet : taper `cc` au terminal et choisir `2. Formation IA`. Claude Code atterrit directement dans `formation-ia/`, charge son `CLAUDE.md` propre (plus léger), et les tâches sont scopées. Les tâches du sous-projet sont tracées dans son CLAUDE.md, pas dans celui-ci.

**`/start` à la racine AppFactory = menu CRM FilmPro scopé.** Plus de dispatcher 2 branches : Formation IA a sa propre entrée au menu terminal `cc`. Source : `.claude/start-menu.md`.

**Extensibilité pédago** (Formation IA) : l'option `[3] Intégrer un parcours` dans le menu Formation IA permet d'ingérer une deep research markdown (marketing aujourd'hui, opération/commercial/autres demain) via un workflow conversationnel Claude Code CLI piloté par **Opus 4.6**. Règles pédago dans `formation-ia/docs/PEDAGOGIE.md`, protocole d'ingestion dans `formation-ia/docs/INGESTION.md`.

---

## QUICK START

```bash
# Ce repo contient le workflow CLI premium AppFactory v2
# Stack : SvelteKit + Supabase + Vercel + Claude Code skills

# Structure
# skills/ : Skills Claude Code (cadrage, generate, deploy)
# template/ : Template SvelteKit reutilisable (scaffold pour chaque app)
# previews/ : Templates HTML Tailwind pour previsualisation client
# scripts/ : Scripts utilitaires (yaml-to-config, etc.)
```

---

## ROLE

Product Engineer. Workflow CLI premium pour generer des apps metier de qualite production.
Pilotage depuis le terminal via Claude Code skills.

---

## STACK

| Couche | Outil | Role |
|--------|-------|------|
| Design | Screenshots + kits Figma Community (inspiration) | References visuelles, pas de pipeline Figma |
| Pilotage | Claude Code + 3 skills | Cadrage, generation, deploiement |
| Frontend | SvelteKit + Tailwind | Apps web performantes, composants testables |
| Backend | Supabase (PostgreSQL) | BDD, auth, API, stockage |
| Hebergement | Vercel | Deploy auto, previews, domaines custom, CDN |
| Tests | Vitest + Playwright | Tests unitaires + navigation complete |
| Cadrage visuel | Templates HTML Tailwind | Pages de presentation pour validation client |
| Code | GitHub | 1 repo par app, versionne |

---

## WORKFLOW 6 ETAPES

1. **Cadrage** : Dialogue naturel terminal, pages HTML de validation client
2. **Generation** : Scaffold SvelteKit complet depuis specs (project.yaml) + design system code-first
3. **Preview et tests** : URL Vercel preview, tests automatises, client teste et donne feedback
4. **Iteration** : Feedback client → modifications code → redeploy (minutes)
5. **Mise en production** : Domaine personnalise, base propre, acces client

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

---

## INFRA EN PLACE

- **Prod** : https://filmpro-crm.vercel.app (Vercel, GitHub auto-deploy) + Supabase EU (projet `appfactory`, 10+ tables, RLS active, service role key configurée)
- **Auth** : OTP email 6 chiffres @filmpro.ch + session 7 jours httpOnly ; SMTP Resend (domaine verifié, free plan)
- **APIs** : Zefix REST + search.ch + fal.ai Flux 1.1 Pro Ultra (partage clé avec Enseignement) — Pexels/Unsplash supprimés S67
- **Crons** : `/api/cron/{signaux,alertes,nettoyage-crm,intelligence,intelligence-archive}` tous sécurisés `CRON_SECRET` + service role (Cron `media-enrich` supprimé S67)
- **Tests** : Vitest 164 + Playwright 5 e2e. Accessibilité : focus trap + ConfirmModal partout. Sécurité : Zod sur 19 form actions, rate limiting 10/min, headers CSP/XFO/referrer, timing-safe secrets

→ Détail intégral (env vars, BDD exhaustive, liste tests, liste crons, headers sécurité, pagination serveur) : `archive/infra-crm-detail.md`

## WORKFLOW APPFACTORY

```
/start (terminal) : menu standard + options projet
  ├─ [3] Modifier app existante → travail direct dans le code
  ├─ [4] Nouvelle app (entreprise existante) → /cadrage wizard HTML
  └─ [5] Nouvelle entreprise → wizard entreprise (navigateur) → /cadrage wizard HTML

/cadrage (wizard HTML navigateur, port 3334)
  Pitch → Entites → Pages → Regles → Recap → Valider
  → project.yaml genere + previews dans _previews/cadrage/

/generate → scaffold SvelteKit depuis project.yaml
/deploy preview → URL Vercel preview
/deploy prod → production + suppression _previews/
```

Fichiers cles :
- `registry.yaml` : registre entreprises/apps (source de verite)
- `branding/_catalogue.yaml` : 5 themes avec tokens complets
- `branding/_default.yaml` : theme par defaut (standard)
- `branding/[slug].yaml` : branding par entreprise
- `wizard/cadrage/` : 5 pages HTML + server.py + shared.css/js + logo
- `wizard/entreprise/` : wizard pre-cadrage entreprise (option 3), symlinks vers cadrage/shared.*
- `scripts/generate-branding-preview.ts` : genere previews/branding.html

## DOCUMENTATION

- `docs/SPECS_PROSPECTION.md` : Specs completes module prospection (sources, modele, scoring, UI, dedup)

→ Inventaire composants EN PLACE (11 composants, 6 pages, 4 API, scripts) archive dans archive/inventaire-composants.md : consulter si besoin de lister les composants existants avant d'en creer de nouveaux

### Historique condensé (archives)

- Sessions 1-8 : UX 6 écrans, design premium Untitled UI/SnowUI, wizards 5 étapes → `archive/decisions-sessions-1-8.md`
- Sessions 9-16 : auth OTP+MFA, Vercel root `template`, PWA, refonte prospection → `archive/decisions-sessions-9-16.md`
- Sessions 70-77 (formation-ia shared) : cadrage parcours + S1-S5 ingestion → `archive/decisions-sessions-70-77.md`
- Sessions 78-79 (formation-ia shared) : S6-S7 ingestion critère sortie → `archive/decisions-sessions-78-79.md`
- Audit CRM 2026-04-04 (méthodo 5 agents, 4 sprints correctifs) → `archive/audit-crm-2026-04-04.md`

---

## NE PAS FAIRE

- Generer du code sans specs validees (project.yaml)
- Construire de l'outillage sans projet reel pour le valider
- Utiliser l'ancien workflow AppFactory v1 pour generer du code
- Deployer sans tests (Vitest + Playwright minimum)
- Hardcoder des valeurs specifiques client dans le template

## TOUJOURS FAIRE

- Chaque etape produit un livrable concret et mesurable
- Review humaine visible dans le terminal avant tout deploy
- Tests automatises avant mise en preview
- project.yaml comme source de verite des specs
- Extraire le generique (template) du specifique (app client) en continu

## Prochaine session

**Prochaine attaque** : Bloc 1 - Cascade 4 pages CRM restantes Phase 3+4 (delta encore réduit après sweep structurel cross-app S116 — audits Express devraient être triviaux). Alternative session courte si date ≥ 2026-05-01 : Bloc 0 (validation cron veille).

### 0. Évaluation cron veille 01/05 + clôture S112 [SUPERVISÉ • low • ~15 min]

**Pourquoi** : la refonte LEAN est en prod (commit `83fd7fd`) avec hot-fix bias géo SR. Aucun re-test API en S112 (volonté Pascal). Le cron normal du vendredi 01/05 ~08h CEST tournera et produira W18 ; la qualité de cet email = test gratuit du fix géo. Si OK, on archive ; si KO, on creuse autrement.
**Prérequis** : être ≥ 2026-05-01, email cron reçu sur `pascal@filmpro.ch` ou consultation /veille.

- [ ] **[BLOQUÉ - date ≥ 2026-05-01]** Lire l'édition W18 reçue par email + sur /veille. Critères : (1) ≥1 item Suisse romande dans les rangs 1-3, (2) sources crédibles (pas de blog SEO bas de gamme), (3) anti-doublons W16/W17 respecté, (4) compliance_tag cohérent avec contenu, (5) volume 5-10 items. Si 4/5 critères OK → succès, archiver S112. Si < 3/5 → échec, désactiver cron + ouvrir session investigation. → voir `memory/project_veille_S112_apprentissages.md`
- [ ] **[BLOQUÉ - validation Pascal cron 01/05]** Drop stash `stash@{0}` (`git stash drop stash@{0}`) une fois la refonte LEAN considérée stable. Le stash contenait des éléments S110 chantier B déjà intégrés ou écartés.

### 1. Golden Standards Phase 3+4 sur 4 pages CRM restantes [SUPERVISÉ • xhigh • cascade 1-2 sessions]

**Pourquoi** : suite Bloc 1a après pages 1-2 livrées en S116 + sweep structurel cross-app. Les CTA, tokens, SlideOut, cellules de tableau sont déjà alignés golden v3 sur tout le repo. Audit Express attendu trivial sur chaque page restante (findings très locaux uniquement).
**Prérequis** : aucun.

- [ ] **[EXÉCUTABLE]** Audit Express + application page par page, ordre `/entreprises` → `/pipeline` → `/signaux` → `/veille`. 1 commit/page. Run audit dans `notes/audit-uiux-2026-04-25/` (réutilisable, snapshot golden v3 actif). Méthodo S116 validée (subagent ui-auditor opus + chrome MCP getComputedStyle). Si finding structurel détecté en cours (token CSS / composant partagé / pattern ≥3 fichiers) → STOP cascade + décision Pascal (cf. règle `feedback_audit_uiux_cross_app_revelation`). → voir `memory/project_golden_standards_crm_v2.md` § Backlog

### 2. Décision token P2-02 alerte dashboard [SUPERVISÉ • low • ~15 min]

**Pourquoi** : finding P2-02 différé S116 sur l'alerte signaux du dashboard. `bg-primary/5` et `bg-primary/8` sont des opacités custom hors palette golden. Décision token sémantique requise (introduire `bg-primary-pale` ou refonte alerte avec `bg-info-bg`). Local au composant, faible impact mais incohérence palette.
**Prérequis** : aucun.

- [ ] **[EXÉCUTABLE]** Trancher entre (a) introduire token `--color-primary-pale: rgba(47,90,158,0.05)` dans `app.css` + Tailwind config, ou (b) remplacer `bg-primary/5` par `bg-info-bg` (token sémantique existant) + `border-primary/12` par `border-info/30`. Reco (b) : aucun nouveau token, sémantique cohérente avec autres alertes (warning-bg, danger-bg). → voir `notes/audit-uiux-2026-04-25/findings-dashboard.md` § P2-02

### 3. Dashboard coûts CRM [BLOQUÉ • high • session dédiée]

- [ ] **[BLOQUÉ - session dashboard dédiée]** Dashboard coûts CRM `/dashboard/couts` : table `cost_audit_runs` + graphique 12 sem + split cron/catégorie + seuils. → voir `memory/project_dashboard_costs_crm.md`

### 4. Figma API [BLOQUÉ • medium • ~1h]

- [ ] **[BLOQUÉ - attente PAT Figma]** Figma API : PAT + plugin MCP figma scope projet

### 5. Harmonisation PDF FilmPro [BLOQUÉ • high • ~2h]

- [ ] **[BLOQUÉ - Tâche archi FilmPro ~/.claude/CLAUDE.md Bloc 6]** Harmoniser production PDF FilmPro : aligner `playbook-pdf` (WeasyPrint) et `filmpro-pdf-lite` (reportlab). Reco option [3] coexistence + combler gaps G1-G3-G5. → voir `memory/project_filmpro_pdf_harmonization.md`

### Livré cette session (5 derniers)

- [x] ~~Bloc 1a cascade page 2/6 `/contacts` + sweep structurel cross-app~~ - Fait 2026-04-26 (S116, xhigh) : audit révèle 3 findings structurels (token --color-accent, SlideOut 480, focus accent). STOP cascade pour décision Pascal validée (single-blue + slideOut 560 + commit unifié). Sweep `bg-accent → bg-primary` 158 substitutions / 24 fichiers via script Python ciblé préfixes Tailwind. CTA `px-4 py-2 font-medium` → `h-10 px-4 box-border font-semibold` 15 occurrences / 6 fichiers. Cellules `px-4 py-2.5` → `px-4 py-3` 13 occurrences. SlideOut défaut 480→560. Token `--color-primary-hover: #264C85` ajouté. `hover:bg-primary-dark` → `hover:bg-primary-hover` sur CTA login + prospection. Fixes locaux F3+F5 (cellules + Archiver ghost). Vérification chrome MCP getComputedStyle /dashboard + /prospection + /contacts. Vitest 344/344, svelte-check 0 régression. Commit `fc0bd6c` push main 29 fichiers 207+/125-.
- [x] ~~Bloc 1a cascade page 1/6 `/dashboard`~~ - Fait 2026-04-26 (S116, xhigh) : 9 findings P1+P2 (rounded-xl→lg sur 8 cards, KPI p-5→p-4, sections px-5→px-4, h2 +text-lg, raccourcis h-10 box-border gap-2, KPI value text-3xl font-bold→text-2xl font-semibold, mt-0.5→mt-1). P2-02 (bg-primary/5 opacités custom) reporté Bloc 2. Vérification chrome MCP 7/7 conforme. Vitest 344/344, svelte-check 0 régression. Commit `7f2dac3` push main.
- [x] ~~Bloc 1b Migration Material Symbols → Lucide (autonome)~~ - Fait 2026-04-26 (S115, xhigh AUTONOME) : 207 occurrences éliminées en commit atomique `f1a54c5` push prod. Stratégie wrapper `<Icon name="...">` + `icon-map.ts` (92 mappings, dont +2 hand-fix tune/sell). Script Python pour 200/207 cas + hand-fix 7 cas. Font Material retirée. Vitest 344/344, svelte-check 0 régression. Validation chrome MCP 8 pages.
- [x] ~~Bloc 1a Phase 4 application `/prospection`~~ - Fait 2026-04-26 (S114, xhigh) : 12 findings P0+P1 corrigés en commit atomique `fbe1d81` (Header span→h1, DataTable header + pagination, Badge, Sidebar items, MultiSelectDropdown filtres, KPI cards, boutons). Vérification chrome MCP 12/12 conformes. Tests Vitest 344/344.
- [x] ~~Bloc 1c Golden v3 CRM (régularisation règle skill)~~ - Fait 2026-04-26 (S114, xhigh) : snapshot v2 → v3 (`audit-uiux-golden-v3-2026-04-26.json`), symlink `audit-uiux-golden-current.json` → v3. Officialise correctifs cellPaddingY 12 + headerHeight 48 édités en S113.
