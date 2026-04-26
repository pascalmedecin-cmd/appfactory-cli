# AppFactory : CLAUDE.md

**Statut :** Phase C, Skills et templates HTML + module Veille sectorielle refondu LEAN (S112, prod) + email récap cron veille (gated, actif) + export/import CSV + page /reporting + Golden Standards CRM v3 livré + Phase 4 application `/prospection` en prod (S114) + **Migration Material Symbols → Lucide complète en autonome (S115, commit `f1a54c5` push main, 207→0 occurrences, 28 fichiers, 92 pictos mappés via wrapper Icon)**. Formation IA est un sous-projet autonome dans `formation-ia/`, accessible directement via `cc` option 2.
**Derniere mise a jour :** 2026-04-26 (session S115 CRM autonome : migration Lucide livrée bout en bout via wrapper Icon + script Python + hand-fix 7 cas multi-line/style. Vitest 344/344, svelte-check 0 régression, validation visuelle chrome MCP sur 8 pages. Font Material retirée de app.html.)
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** Session 115 (CRM, 2026-04-26, `/effort xhigh`, AUTONOME). 1 livraison majeure. **Bloc 1b Migration Material Symbols → Lucide** : 207 occurrences éliminées en 1 commit atomique `f1a54c5`. Stratégie wrapper `<Icon name="...">` + `icon-map.ts` (92 mappings) qui préserve l'API string existante (config.ts navigation, TYPE_ICONS signaux, props `icon=` des composants partagés ImportModal/AlerteModal/MultiSelectDropdown/EmptyState/ModalForm). Script Python pour 200/207 cas + hand-fix 7 cas (1 multi-line span Sidebar avec badge nested, 6 spans avec attribut `style="color: var(...)"` dans ImportModal/AlerteModal). Ajout 2 pictos (`tune` → SlidersHorizontal, `sell` → Tag) découverts en hand-fix. Font Material Symbols retirée de `src/app.html` (gain perf attendu -80kb). Tests Vitest 344/344, svelte-check 109 erreurs baseline = 109 après (0 régression). Validation chrome MCP sur 8 pages : 0 résidu `material-symbols-outlined`, 0 fallback `CircleHelp` (tous pictos résolus), sidebar 7/7 nav icons mappés (layout-dashboard, contact, building-2, workflow, search, bell, radar), DevTools Network 0 requête `fonts.googleapis.com/icon`. Push `a035a38..f1a54c5 main`. Garde-fous autonome non déclenchés (aucun picto manquant, aucune régression visuelle).
**Session -1 :** Session 114 (CRM, 2026-04-26, `/effort xhigh`). 3 livraisons. Bloc 1a Phase 4 `/prospection` : 12 findings P0+P1 corrigés commit `fbe1d81` push prod, 12/12 vérifiés chrome MCP getComputedStyle. Bloc 1c Golden v3 : snapshot v2 → v3 régularise règle skill « jamais d'écrasement ». Bloc 1d Investigation veille résolu : pas d'anomalie, W16 = première édition mathématiquement possible.
**Session -2 :** Session 113 (CRM, 2026-04-25, `/effort xhigh`). Bloc 1a Golden Standards Phases 1+2 livrées + Phase 3 sur 1/7 pages. Phase 1 extraction chrome MCP → golden v1. Phase 2 : 5 anomalies arbitrées par Pascal via wizard HTML interactif → golden v2 + `docs/GOLDEN_STANDARDS.md`. Phase 3 audit Express `/prospection` → 19 findings (3 P0 / 9 P1 / 7 P2). Aucun commit code.
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

**Prochaine attaque** : Bloc 1 - Cascade 6 pages CRM Phase 3+4 (delta réduit grâce aux composants partagés déjà alignés golden v3 + Lucide via S114-S115). Alternative session courte si date ≥ 2026-05-01 : Bloc 0 (validation cron veille).

### 0. Évaluation cron veille 01/05 + clôture S112 [SUPERVISÉ • low • ~15 min]

**Pourquoi** : la refonte LEAN est en prod (commit `83fd7fd`) avec hot-fix bias géo SR. Aucun re-test API en S112 (volonté Pascal). Le cron normal du vendredi 01/05 ~08h CEST tournera et produira W18 ; la qualité de cet email = test gratuit du fix géo. Si OK, on archive ; si KO, on creuse autrement.
**Prérequis** : être ≥ 2026-05-01, email cron reçu sur `pascal@filmpro.ch` ou consultation /veille.

- [ ] **[BLOQUÉ - date ≥ 2026-05-01]** Lire l'édition W18 reçue par email + sur /veille. Critères : (1) ≥1 item Suisse romande dans les rangs 1-3, (2) sources crédibles (pas de blog SEO bas de gamme), (3) anti-doublons W16/W17 respecté, (4) compliance_tag cohérent avec contenu, (5) volume 5-10 items. Si 4/5 critères OK → succès, archiver S112. Si < 3/5 → échec, désactiver cron + ouvrir session investigation. → voir `memory/project_veille_S112_apprentissages.md`
- [ ] **[BLOQUÉ - validation Pascal cron 01/05]** Drop stash `stash@{0}` (`git stash drop stash@{0}`) une fois la refonte LEAN considérée stable. Le stash contenait des éléments S110 chantier B déjà intégrés ou écartés.

### 1. Golden Standards Phase 3+4 sur 6 pages CRM restantes [SUPERVISÉ • xhigh • cascade 3 sessions]

**Pourquoi** : suite Bloc 1a après gabarit `/prospection` fixé en S114 (commit `fbe1d81` push main). Composants partagés (Header, DataTable, Badge, Sidebar, MultiSelectDropdown) déjà alignés golden v3 → delta attendu réduit sur les 6 pages restantes (mais audit Express requis sur chacune pour identifier les findings spécifiques).
**Prérequis** : aucun (Bloc 1a Phase 4 prospection livré + push S114).

- [ ] **[EXÉCUTABLE]** Audit Express + application page par page, ordre `/dashboard` → `/contacts` → `/entreprises` → `/pipeline` → `/signaux` → `/veille`. 1 commit/page. Run audit dans `notes/audit-uiux-2026-04-25/` (réutilisable, snapshot golden v3 actif). Méthodo validée S113 (subagent ui-auditor opus + chrome MCP getComputedStyle). → voir `memory/project_golden_standards_crm_v2.md` § Backlog

### 2. Dashboard coûts CRM [BLOQUÉ • high • session dédiée]

- [ ] **[BLOQUÉ - session dashboard dédiée]** Dashboard coûts CRM `/dashboard/couts` : table `cost_audit_runs` + graphique 12 sem + split cron/catégorie + seuils. → voir `memory/project_dashboard_costs_crm.md`

### 3. Figma API [BLOQUÉ • medium • ~1h]

- [ ] **[BLOQUÉ - attente PAT Figma]** Figma API : PAT + plugin MCP figma scope projet

### 4. Harmonisation PDF FilmPro [BLOQUÉ • high • ~2h]

- [ ] **[BLOQUÉ - Tâche archi FilmPro ~/.claude/CLAUDE.md Bloc 6]** Harmoniser production PDF FilmPro : aligner `playbook-pdf` (WeasyPrint) et `filmpro-pdf-lite` (reportlab). Reco option [3] coexistence + combler gaps G1-G3-G5. → voir `memory/project_filmpro_pdf_harmonization.md`

### Livré cette session (5 derniers)

- [x] ~~Bloc 1b Migration Material Symbols → Lucide (autonome)~~ - Fait 2026-04-26 (S115, xhigh AUTONOME) : 207 occurrences éliminées en commit atomique `f1a54c5` push prod. Stratégie wrapper `<Icon name="...">` + `icon-map.ts` (92 mappings, dont +2 hand-fix tune/sell) qui préserve l'API string existante (config.ts navigation, TYPE_ICONS signaux, props `icon=`). Script Python pour 200/207 cas + hand-fix 7 cas (multi-line span Sidebar nested badge, 6 spans `style="color: var(...)"` ImportModal/AlerteModal). Font Material retirée de `src/app.html`. Vitest 344/344, svelte-check 0 régression (109 baseline = 109 après). Validation chrome MCP sur 8 pages (/, /prospection, /signaux, /contacts, /entreprises, /pipeline, /veille, /aide, /reporting) : 0 résidu, 0 fallback CircleHelp, sidebar 7/7 nav icons mappés, DevTools Network 0 requête `fonts.googleapis.com/icon`. Push `a035a38..f1a54c5 main`. → `template/lucide_mapping.md` documente la table complète.
- [x] ~~Bloc 1a Phase 4 application `/prospection`~~ - Fait 2026-04-26 (S114, xhigh) : 12 findings P0+P1 corrigés en commit atomique `fbe1d81` (Header span→h1, DataTable header button text-muted/600/uppercase + pagination h-10 w-10 rounded-lg, Badge rounded-lg px-2 py-1 + dot 8px, Sidebar items 40px text-sm, MultiSelectDropdown filtres h-10 box-border, KPI cards rounded-xl→rounded-lg, boutons Enrichir/Importer/Mes recherches/Créer alerte h-10 box-border gap-2). Vérification chrome MCP `getComputedStyle` 12/12 conformes. Tests Vitest 344/344. Push `83fd7fd..fbe1d81 main`.
- [x] ~~Bloc 1c Golden v3 CRM (régularisation règle skill)~~ - Fait 2026-04-26 (S114, xhigh) : snapshot v2 → v3 (`audit-uiux-golden-v3-2026-04-26.json` + `.md`), symlink `audit-uiux-golden-current.json` → v3, aucun changement fonctionnel. Officialise les correctifs édités directement dans v2 source en S113 (cellPaddingY 12, headerHeight 48).
- [x] ~~Bloc 1d Investigation veille manquantes (résolu : pas d'anomalie)~~ - Fait 2026-04-26 (S114, xhigh) : 3 mesures (cron archive UPDATE pas DELETE / premier commit module veille `ab4091c` 2026-04-13 / format week_label ISO 8601 `YYYY-Www`). Conclusion factuelle : W16 = première édition mathématiquement possible. Pas de bug, pas de DELETE manuel.
- [x] ~~Bloc 1a Golden Standards Phases 1+2 + Phase 3 partielle (1/7 pages)~~ - Fait 2026-04-25 (S113, xhigh) : Phase 1 extraction chrome MCP → golden v1. Phase 2 : 5 anomalies arbitrées par Pascal via wizard HTML → golden v2 + `docs/GOLDEN_STANDARDS.md`. Phase 3 audit Express `/prospection` → 19 findings (3 P0 / 9 P1 / 7 P2). Conflit golden v2 P2-06 résolu (cellPaddingY 10→12, headerHeight 44→48).
