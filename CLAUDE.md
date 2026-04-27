# AppFactory : CLAUDE.md

**Statut :** Phase C, Skills et templates HTML + module Veille sectorielle refondu LEAN (S112, prod) + email récap cron veille (gated, actif) + export/import CSV + page /reporting + Golden Standards CRM v3 livré + Phase 4 application `/prospection` en prod (S114) + Migration Material Symbols → Lucide complète (S115) + Cascade golden v3 Bloc 1a Phase 3+4 LIVRÉE INTÉGRALEMENT 6/6 pages CRM (S116-S117, 8 commits push main) + Sweep palette opacités primary + Badge variant info + Select.svelte partagé + golden v4 doc-only (S118, 3 commits + 1 doc) + Alignement `--color-info` ardoise FilmPro + golden v5 (S119, 1 commit) + Intégration Veille→Prospection complète (S120, 1 commit) + Cadrage CRM mobile V1 validé (S121, doc-only) + **CRM mobile V1 Sessions A+B livrées + déblocage build prod 24h cassée + validation chrome MCP prod fraîche 8 fixes (S122, 6 commits)**. Formation IA est un sous-projet autonome dans `formation-ia/`, accessible directement via `cc` option 2.
**Derniere mise a jour :** 2026-04-27 (session S122 CRM xhigh : Sessions A+B livrées + déblocage build prod cassé 24h ininterrompu (commit `426fa4b` fix backtick `prompt.ts:47` introduit par S120). Tous les commits S120 + S121 + S122 maintenant en prod pour la 1ère fois. 8 fixes mobile validés visuellement sur prod fraîche via chrome MCP. 1 finding nouveau : /prospection table 46px débordement interne (col checkbox selectable + paddings). Vitest 365/365, svelte-check 107/37 baseline (-3 erreurs résolues par fix prompt.ts).)
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** Session 122 (CRM, 2026-04-27, `/effort xhigh`). **8 commits push origin/main** : 4d09f29 (audit findings) + 4b45122 (service worker PWA) + 92a6d78 (5 fixes mobile P0+P1+P2) + 0a84b35 (clôture v1 CLAUDE.md) + bd4de80 (priorisation colonnes tables) + 7ca1a3e (clôture v2 CLAUDE.md) + 426fa4b (fix syntax prompt.ts:47) + 76a50b3 (clôture v3 CLAUDE.md). Skip 2ème viewport Pixel 7 412×915 décidé en session (jugé quasi identique iPhone 14 Pro Max ; à reprendre éventuellement Session D si Lighthouse mobile révèle un écart). **Découverte critique** : tous les builds Vercel en ERROR depuis 24h+ (cause root : commit S120 `9df286e` a introduit un backtick non échappé `\`site:.ch\`` dans template literal `SYSTEM_PROMPT` de `prompt.ts`). Ni S120, ni S121, ni S122 n'étaient en prod avant `426fa4b`. Validation chrome MCP post-deploy iPhone 14 Pro Max 430×932 a confirmé en prod : ✅ P0-1 X close `type="button"`+`aria-label="Fermer"`+no submit, ✅ P0-2 kanban /pipeline 0 scroll horizontal (était 1596px), ✅ P1-1 /contacts 3/8 cols visibles mobile (Nom + Entreprise + Statut), ✅ P1-2 /prospection 4/8 cols (checkbox + Température + Raison sociale + Statut), ✅ P1-4 burger exactement 44×44, ✅ P1-5 sidebar `min-h-11 md:min-h-0`, ✅ P2-1 body.overflow=hidden ouvre, restored à close, ✅ P2-2 /entreprises cards grid déjà responsive. ⚠️ Finding nouveau découvert en validation : /prospection 46px débordement interne table (clientW 396 → scrollW 442) - cause col checkbox `selectable=true` 40px + paddings cumulent au-delà des % cols visibles ; à traiter Session C (option : `table-layout: fixed` DataTable ou réduire `w-[20%]` raison_sociale en mobile). 🛡️ **Faille process découverte** : aucun gate CI ne run `npm run build` avant push, donc build cassé 24h invisible — Pascal pensait que ses commits S120+S121 étaient en prod alors qu'aucun n'y était. Considérer ajout `vite build` aux gates pré-push (Session C ou hors session). **Bilan** : Sessions A+B closes + déblocage build + validation prod, Session C `[EXÉCUTABLE]` pour S123 (fix P1-3 chart SVG /reporting + finding nouveau /prospection 46px + sweep magazine /signaux /veille avec données récentes).
**Session -1 :** Session 121 (CRM, 2026-04-27, `/effort xhigh`). 1 commit push main `c396fc8`. Cadrage CRM mobile V1 validé doc-only — `docs/SPECS_CRM_MOBILE.md` + `.html`. 8 décisions structurelles + 4 sessions séquencées A/B/C/D + 14 features hors scope V1.
**Session -2 :** Session 120 (CRM, 2026-04-27, `/effort xhigh`). 1 commit push main `9df286e` + push S119. Intégration Veille→Prospection 7 phases (migration `prospect_lead_signals`, scoring agrégation plafond=4, 3 modules `recompute-score`/`apply-signals`/`link-import-signal`, cron `/api/cron/lead-rescore`, pont Veille étendu RegBL). Vitest 365/365.
**Session -3 :** Session 119 (CRM, 2026-04-26, `/effort low`). 2 commits push main. Bloc 1a Alignement `--color-info` ardoise FilmPro + golden v5.
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

**Prochaine attaque** : Bloc 1 V1 mobile Session C - sweep pages magazine (veille, signaux) + reporting + finding /prospection 46px. Démarrer par fix P1-3 (chart SVG /reporting responsive : viewBox + width:100%) puis fix table /prospection débordement (col checkbox + paddings). Findings : `notes/audit-mobile-v1-session-A/findings.md`.

### 1. CRM mobile V1 — Sessions séquencées C/D [MIXTE • xhigh • cascade 2 sessions restantes]

**Pourquoi** : Sessions A+B livrées S122 (audit findings + service worker PWA + 8 fixes mobile sur 10 findings + déblocage build prod 24h cassée). Sessions C/D enchaînent magazine + reporting + Lighthouse + Playwright mobile. Décisions structurelles verrouillées (8) : pas de bottom nav, modales restent modales, OTP suffit, PWA légère, tables = priorisation colonnes.
**Prérequis** : Sessions A+B `[VALIDÉ]` S122. Session C démarrable. Session D bloquée par C.

- [ ] **[EXÉCUTABLE]** Session C V1 mobile : (a) fix P1-3 `/reporting` chart SVG responsive — option (a) ajouter `viewBox` + `width:100%` (`preserveAspectRatio="xMidYMid meet"` si besoin de garder ratio), option (b) ResizeObserver + recalcul width dynamique. (b) fix nouveau finding /prospection table 46px débordement (clientW 396 → scrollW 442) — cause : col checkbox `selectable=true` 40px + paddings cumulent au-delà des % cols visibles. Option (a) : `table-layout: fixed` au DataTable + ajuster widths pour somme mobile = 100%. Option (b) : réduire `w-[20%]` raison_sociale → `w-[14%] md:w-[20%]` en mobile. (c) Audit reflow vertical hero + grilles `/veille` avec données récentes (1221px de hauteur en S122 sans hero detecté — re-vérifier en édition active). (d) Audit reflow `/signaux` cards/timeline (20546px en S122 — confirmer pas de débordement horizontal, lisibilité typo). (e) Tests Playwright mobile sur 3 pages (étendre suite e2e). Critères : reflow propre, lisibilité typo OK, charts non débordants, 0 régression desktop, 0 scroll horizontal table /prospection. ~1.5h MIXTE. → voir `notes/audit-mobile-v1-session-A/findings.md` + `memory/project_crm_mobile_v1_cadrage.md`

### 2. Faille process build prod — gate `vite build` pré-push [MIXTE • medium • ~30 min]

**Pourquoi** : la session S122 a découvert que tous les builds Vercel étaient en ERROR depuis 24h ininterrompu (cause root commit S120 `9df286e` backtick non échappé). Pascal pensait que ses commits S120+S121 étaient en prod alors qu'aucun n'y était. Aucun gate CI ne tourne `vite build` avant push, donc cassure invisible. Vitest et svelte-check passent localement mais ne rattrapent pas les erreurs esbuild.
**Prérequis** : aucun, exécutable standalone.

- [ ] **[EXÉCUTABLE]** Gate `npm run build` pré-push CRM. **Reco par défaut : option (b) check post-push Vercel deploy status via `gh` ou `vercel inspect` avec notification** (coût zéro local, réactivité ~1min après push, pas de friction). | Pourquoi : option (a) hook pre-push local ajoute 60-90s à chaque push (build complet vite), peu pratique pour itérations rapides ; option (b) catch les erreurs en aval sans bloquer le flux. | Option (a) hook `.git/hooks/pre-push` `cd template && npm run build` reste fallback si Pascal préfère blocage strict. Implémentation option (b) : script qui poll `vercel inspect filmpro-crm.vercel.app` après chaque push et notifie via system message si nouveau deploy passe en `● Error` dans les 3 min. → voir `memory/feedback_vercel_deploy_status_before_audit.md` + `memory/feedback_template_literal_backtick_escape.md`

### 3. Session D V1 mobile (perf + golden mobile) [MIXTE • medium • ~1h]

**Pourquoi** : dernière session du Bloc 1 V1 mobile. Lighthouse mobile sur 8 pages, dashboard reflow grid cartes, extension golden v5 → annexe mobile, update CLAUDE.md V1 livré.
**Prérequis** : Session C livrée (Bloc 1).

- [ ] **[BLOQUÉ - Session C livrée]** Session D V1 mobile : dashboard reflow grid cartes + aide vérif simple, Lighthouse mobile 8 pages comparaison budgets perf (cf SPEC §5), fix P1-6 boutons modale 104×36 → 44 hauteur, [VALIDER HYPOTHÈSE] service worker PWA en prod après 1ère install : reload utilisateur sert bien dernière version (pas de cache stale persistant), validation visuelle Pixel 7 412×915 si Lighthouse mobile révèle un écart vs iPhone 14 Pro Max (skip décidé S122), extension golden v5 → annexe mobile (screenshots 390×844), update CLAUDE.md V1 livré. Critères : tous budgets perf respectés ou justifiés, golden mobile capturé, doc à jour, SW comportement OK. ~1h MIXTE. → voir `memory/project_crm_mobile_v1_cadrage.md` + `notes/audit-mobile-v1-session-A/findings.md`

### 4. Évaluation cron veille 01/05 + validation pipeline Veille→Prospection [SUPERVISÉ • low • ~15 min]

**Pourquoi** : double validation gratuite. (1) La refonte LEAN S112 (commit `83fd7fd`) avec hot-fix bias géo SR n'a jamais été re-testée API. (2) L'intégration Veille→Prospection livrée S120 (commit `9df286e`) sera exercée pour la 1re fois en prod par ce cron : surveiller logs Vercel ligne `[veille→prospection] report 2026-W18 : N signal(s) lié(s), M lead(s) recalculé(s)`. Si OK les deux, on archive S112 + on confirme S120.
**Prérequis** : être ≥ 2026-05-01, email cron reçu sur `pascal@filmpro.ch` ou consultation /veille + accès logs Vercel.

- [ ] **[BLOQUÉ - date ≥ 2026-05-01]** Lire l'édition W18 reçue par email + sur /veille. Critères veille : (1) ≥1 item Suisse romande rangs 1-3, (2) sources crédibles, (3) anti-doublons W16/W17, (4) compliance_tag cohérent, (5) volume 5-10 items. Critères Veille→Prospection (S120) : (a) hook `applySignalsFromReport` dans logs Vercel sans exception, (b) éventuels leads existants matchés voient `score_pertinence` mis à jour. Si 4/5 veille OK + S120 OK → succès double. → voir `memory/project_veille_S112_apprentissages.md` et `memory/project_veille_prospection_integration_s120.md`
- [ ] **[BLOQUÉ - validation Pascal cron 01/05]** Drop stash `stash@{0}` (`git stash drop stash@{0}`) une fois la refonte LEAN considérée stable. Le stash contenait des éléments S110 chantier B déjà intégrés ou écartés.

### 5. Dashboard coûts CRM [BLOQUÉ • high • session dédiée]

- [ ] **[BLOQUÉ - session dashboard dédiée]** Dashboard coûts CRM `/dashboard/couts` : table `cost_audit_runs` + graphique 12 sem + split cron/catégorie + seuils. → voir `memory/project_dashboard_costs_crm.md`

### 6. Figma API [BLOQUÉ • medium • ~1h]

- [ ] **[BLOQUÉ - attente PAT Figma]** Figma API : PAT + plugin MCP figma scope projet

### 7. Harmonisation PDF FilmPro [BLOQUÉ • high • ~2h]

- [ ] **[BLOQUÉ - Tâche archi FilmPro ~/.claude/CLAUDE.md Bloc 6]** Harmoniser production PDF FilmPro : aligner `playbook-pdf` (WeasyPrint) et `filmpro-pdf-lite` (reportlab). Reco option [3] coexistence + combler gaps G1-G3-G5. → voir `memory/project_filmpro_pdf_harmonization.md`

### Livré cette session (5 derniers)

- [x] ~~CRM mobile V1 Sessions A+B + déblocage build prod (Bloc 1)~~ - Fait 2026-04-27 (S122, xhigh) : 6 commits push origin/main + update CLAUDE.md (4d09f29 audit findings + 4b45122 service worker PWA + 92a6d78 5 fixes mobile + bd4de80 priorisation tables + 7ca1a3e clôture v1 + 426fa4b fix syntax prompt.ts:47 backtick déblocage build). **Découverte critique** : tous les builds Vercel en ERROR depuis 24h+ (cause root S120 `9df286e` backtick non échappé `\`site:.ch\`` dans template literal SYSTEM_PROMPT). Ni S120, S121 ni S122 n'étaient en prod avant `426fa4b` push 14:23. Validation chrome MCP iPhone 14 Pro Max post-deploy : ✅ P0-1 + ✅ P0-2 + ✅ P1-1 + ✅ P1-2 + ✅ P1-4 + ✅ P1-5 + ✅ P2-1 + ✅ P2-2 (8 fixes confirmés en prod fraîche). ⚠️ Finding nouveau /prospection 46px débordement table interne (col checkbox `selectable=true` + paddings) à traiter Session C. 🛡️ Faille process : aucun gate CI ne run `npm run build` avant push, build cassé invisible — bloc nouveau "Gate vite build pré-push" ajouté Prochaine session. Vitest 365/365, svelte-check 107/37 nouveau baseline (-3 erreurs résolues par fix prompt.ts). Fondation chrome `+layout.svelte` slide-in mobile validée conforme SPEC §3 (faux finding sidebar 240px corrigé après inspection rect.left=-240 hors viewport). → voir `notes/audit-mobile-v1-session-A/findings.md`
- [x] ~~Cadrage CRM mobile V1 (Bloc 1)~~ - Fait 2026-04-27 (S121, xhigh) : `docs/SPECS_CRM_MOBILE.md` (340 lignes) + `docs/SPECS_CRM_MOBILE.html` (vue lisible navigable, branding FilmPro, sidebar TOC). Principe directeur verrouillé après 3 itérations Pascal : pas d'UX mobile-spécifique, référence Linear/Notion/Stripe. 8 décisions structurelles tranchées + 14 features hors scope V1 + 4 sessions séquencées A/B/C/D ~6h cumulées + budgets perf mobile + tests Playwright iPhone 14 + Pixel 7 + métriques succès S+8. → voir `memory/project_crm_mobile_v1_cadrage.md`
- [x] ~~Bloc cockpit [1a] Intégration Veille→Prospection complète~~ - Fait 2026-04-27 (S120, xhigh) : commit `9df286e` push main. 2 tâches cockpit fusionnées (filtres APIs alignés + score leads piloté veille). 7 phases : fix seuils température cron alertes, migration `prospect_lead_signals` + scoring agrégation (plafond=4) + 3 modules `recompute-score`/`apply-signals`/`link-import-signal` + hook cron veille, cron quotidien `/api/cron/lead-rescore` 5h CET, pont Veille étendu RegBL. Bug latent Zefix `from_item_rank` corrigé. Sécurité : finding High PostgREST `.or()` injection résolu via 2 `.ilike()` + Set dédup. Tests 365/365 (+21), svelte-check 110/37 baseline, 0 High/Critical. Validation prod attendue cron 01/05. → voir `memory/project_veille_prospection_integration_s120.md`
- [x] ~~Bloc 1a Alignement `--color-info` ardoise FilmPro + golden v5~~ - Fait 2026-04-26 (S119, low) : commit `3524392` push main. Décision option (a) tranchée par Pascal : code → golden. 2 substitutions `template/src/app.css:33-34` (`--color-info #2E90FA → #5A7190` + `-light #EFF8FF → #EDF1F5`). Résout `knownDivergences.info-token-ardoise-vs-sky` (golden v4). Golden v5 workspace : décision 8 ajoutée, `knownDivergences: []`, symlink basculé v4 → v5. Vitest 344/344, svelte-check 109/37 baseline.
- [x] ~~Bloc 1c Doc golden v4 (typography.editorial + palette.editorial + knownDivergences)~~ - Fait 2026-04-26 (S118, xhigh) : v4 JSON + .md créés doc-only (pas de modif CSS). 2 sections nouvelles : `paletteEditorial` (primary-dark/light Sidebar/login/hero), `typographyEditorial` (mag-* /veille). Section `knownDivergences` documente conflit info ardoise (#5A7190) vs sky (#2E90FA) → résolu S119. Symlink basculé v3 → v4.
- [x] ~~Bloc 1b Composant Select.svelte partagé~~ - Fait 2026-04-26 (S118, xhigh) : commit `ba2db12`. Composant `template/src/lib/components/Select.svelte` + 4 selects natifs migrés (pipeline x3 entreprise/contact/etape + signaux x1 type_signal). CantonSelect, FormField et filtres signaux conservés (gabarits différents).
