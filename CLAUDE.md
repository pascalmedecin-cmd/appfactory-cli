# AppFactory : CLAUDE.md

**Statut :** Phase C, Skills et templates HTML + module Veille sectorielle refondu LEAN (S112, prod) + email récap cron veille (gated, actif) + export/import CSV + page /reporting + Golden Standards CRM v3 livré + Phase 4 application `/prospection` en prod (S114) + Migration Material Symbols → Lucide complète (S115) + Cascade golden v3 Bloc 1a Phase 3+4 LIVRÉE INTÉGRALEMENT 6/6 pages CRM (S116-S117, 8 commits push main) + Sweep palette opacités primary + Badge variant info + Select.svelte partagé + golden v4 doc-only (S118, 3 commits + 1 doc) + Alignement `--color-info` ardoise FilmPro + golden v5 (S119, 1 commit) + Intégration Veille→Prospection complète (S120, 1 commit) + Cadrage CRM mobile V1 validé (S121, doc-only) + CRM mobile V1 Sessions A+B livrées + déblocage build prod 24h cassée + validation chrome MCP prod fraîche 8 fixes (S122, 6 commits) + **CRM mobile V1 Session C livrée : fix P1-3 chart SVG /reporting responsive + fix /prospection table 46px débordement résolu + audits /veille /signaux 0 overflow + règle globale tests mobile = DevTools manuel obligatoire (S123, 1 commit)**. Formation IA est un sous-projet autonome dans `formation-ia/`, accessible directement via `cc` option 2.
**Derniere mise a jour :** 2026-04-27 (session S123 CRM xhigh : Session C livrée — fix P1-3 chart SVG `/reporting` (viewBox + width 100% + PAR xMinYMid meet, débordement 528→0 résolu) + fix `/prospection` table débordement 46px (widths mobile 18%/50%/32% somme=100% restauration md:w-[X%]) + audits chrome MCP `/veille` `/signaux` 0 overflow horizontal global confirmé. Règle inscrite dans `~/.claude/rules/methodology.md` § Garde-fous : tests mobile via Chrome DevTools Device Toolbar manuel **obligatoire** (jamais Playwright mobile, jamais MCP comme substitut au DevTools manuel). Vitest 365/365, svelte-check 107/37 baseline inchangé.)
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** Session 123 (CRM, 2026-04-27, `/effort xhigh`). **1 commit push origin/main** : `c46220c` (fix Session C V1 mobile : chart /reporting responsive + table /prospection 46px). Plan en 3 fixes + audits, exécution complète : (1) **P1-3 /reporting** — 2 SVG charts (`pipelineEtape` + `monthlyPipeline`) passés en `viewBox="0 0 {width} 190"` + `width="100%"` + `preserveAspectRatio="xMinYMid meet"`, wrapper `overflow-x-auto` retiré (devenu inutile, `w-full` suffit). Validation prod 430×932 : SVG 356×128 dans parent 356, **0 débordement** (vs 528→172px débordement S122). Pattern identique pour pipelineEtape mais données vides en prod donc affiche "Aucune opportunité enregistrée." (else state). (2) **/prospection table** — DataTable `columns` array + row snippet : widths cols mobile passés à somme=100% via `w-[18%] md:w-[9%]` (Température), `w-[50%] md:w-[20%]` (Raison sociale), `w-[32%] md:w-[13%]` (Statut). Validation prod : wrapperClientW=396, wrapperScrollW=396, **0 débordement** (vs 396 vs 442 S122 → +46px résolus). 4 cols visibles : checkbox(40)+Température(64)+Raison(178)+Statut(114)=396. (3) **Audit /veille** prod : 0 overflow, 2 articles édition magazine 366×498 et 366×437, h1 18px, h2 24px/32px. (4) **Audit /signaux** prod : 0 overflow, scrollH 19268 (cohérent S122 20546), magazine timeline OK. **Tests Playwright mobile retirés sur demande Pascal** (test mobile via chrome dev app, pas Playwright). Conséquence méthodologique majeure : règle inscrite globale dans `~/.claude/rules/methodology.md` § Garde-fous : « Tests mobile via Chrome DevTools Device Toolbar (manuel) — OBLIGATOIRE » (Cmd+Option+I → Cmd+Shift+M → device dropdown). Justification factuelle : MCP `claude-in-chrome` `resize_window(430, 932)` a donné `innerWidth=500` au début de session (la fenêtre desktop a été redimensionnée, pas le viewport émulé), confirmant que MCP n'est PAS un substitut au Device Toolbar manuel. DPR=3, UA mobile, touch émulé, viewport meta-tag → uniquement avec DevTools manuel. MCP reste OK pour mesurer DOM (`clientWidth`/`scrollWidth`/`getBoundingClientRect`) en complément ou sur localhost. **Réserve mineure remontée non bloquante** : header `<th>` "Température" wrappe sur 2 lignes (Tempé / rature) en mobile (`whiteSpace: normal` + `overflow: visible` → wrap propre, pas troncation). Lisible mais esthétique perfectible. Tracé Bloc 1 Session D comme polish optionnel. **Bilan** : Session C [VALIDÉ] entièrement, Bloc 1 Session D débloqué et `[EXÉCUTABLE]` pour S124.
**Session -1 :** Session 122 (CRM, 2026-04-27, `/effort xhigh`). 8 commits push origin/main. Sessions A+B livrées (audit findings + service worker PWA + 8 fixes mobile P0+P1+P2 + priorisation colonnes tables) + déblocage build prod 24h cassé (fix backtick prompt.ts:47 introduit par S120). Validation chrome MCP iPhone 14 Pro Max 8 fixes confirmés. Finding nouveau /prospection 46px débordement table (résolu S123).
**Session -2 :** Session 121 (CRM, 2026-04-27, `/effort xhigh`). 1 commit push main `c396fc8`. Cadrage CRM mobile V1 validé doc-only — `docs/SPECS_CRM_MOBILE.md` + `.html`. 8 décisions structurelles + 4 sessions séquencées A/B/C/D + 14 features hors scope V1.
**Session -3 :** Session 120 (CRM, 2026-04-27, `/effort xhigh`). 1 commit push main `9df286e` + push S119. Intégration Veille→Prospection 7 phases (migration `prospect_lead_signals`, scoring agrégation plafond=4, 3 modules `recompute-score`/`apply-signals`/`link-import-signal`, cron `/api/cron/lead-rescore`, pont Veille étendu RegBL). Vitest 365/365.
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

**Prochaine attaque** : Bloc 1 V1 mobile Session D - dernière session V1 mobile : Lighthouse mobile 8 pages + dashboard reflow grid cartes + fix P1-6 boutons modale 44 + extension golden v5 annexe mobile + clôture V1. Polish optionnel : header `<th>` "Température" wrap 2 lignes mobile.

### 1. CRM mobile V1 — Session D [MIXTE • medium • ~1h]

**Pourquoi** : dernière session V1 mobile après livraison Sessions A+B+C (S122-S123). Lighthouse mobile + dashboard + golden mobile + clôture. Polish optionnel sur header "Température" wrap (esthétique perfectible mais lisible, validé prod S123).
**Prérequis** : Session C `[VALIDÉ]` S123.

- [ ] **[EXÉCUTABLE]** Session D V1 mobile : (a) dashboard reflow grid cartes + aide vérif simple, (b) Lighthouse mobile 8 pages comparaison budgets perf (cf SPEC §5), (c) fix P1-6 boutons modale 104×36 → ≥44 hauteur (Apple HIG), (d) [VALIDER HYPOTHÈSE] service worker PWA en prod après 1ère install : reload utilisateur sert bien dernière version (pas de cache stale persistant), (e) validation visuelle Pixel 7 412×915 si Lighthouse mobile révèle un écart vs iPhone 14 Pro Max (skip décidé S122), (f) extension golden v5 → annexe mobile (screenshots 390×844), (g) update CLAUDE.md : Statut → ajouter « V1 mobile clos », retrait blocs V1 mobile (Sessions A-D) de Prochaine session, archive `notes/audit-mobile-v1-session-A/` (déplacer vers `archive/`). (h) **Polish optionnel** : header `<th>` "Température" wrap 2 lignes en mobile (cell forcée à 64px, texte uppercase tracking-wider, `whiteSpace: normal`, `overflow: visible` → wrap propre, pas troncation). Options : abréger en "Temp." mobile uniquement, ou élargir col Température à 22% mobile (réduit Raison à 46%), ou laisser tel quel. Reco : décision en début de Session D selon ressenti visuel sur device réel. (i) **Re-valider Session C via Chrome DevTools Device Toolbar manuel** sur device cible (iPhone 14 Pro Max + Pixel 7 si Lighthouse révèle écart) avant clôture V1 — règle inscrite S123 : la validation Session C en S123 a été faite via chrome MCP (mesure DOM uniquement), pas via DevTools manuel ; la nouvelle règle exige DevTools manuel pour fidélité visuelle (DPR=3, UA mobile, touch). Critères globaux : tous budgets perf respectés ou justifiés, golden mobile capturé, doc à jour, SW comportement OK, Session C re-validée DevTools manuel. ~1h MIXTE. → voir `memory/project_crm_mobile_v1_cadrage.md` + `notes/audit-mobile-v1-session-A/findings.md`

### 2. Faille process build prod — gate `vite build` pré-push [MIXTE • medium • ~30 min]

**Pourquoi** : la session S122 a découvert que tous les builds Vercel étaient en ERROR depuis 24h ininterrompu (cause root commit S120 `9df286e` backtick non échappé). Pascal pensait que ses commits S120+S121 étaient en prod alors qu'aucun n'y était. Aucun gate CI ne tourne `vite build` avant push, donc cassure invisible. Vitest et svelte-check passent localement mais ne rattrapent pas les erreurs esbuild.
**Prérequis** : aucun, exécutable standalone.

- [ ] **[EXÉCUTABLE]** Gate `npm run build` pré-push CRM. **Reco par défaut : option (b) check post-push Vercel deploy status via `gh` ou `vercel inspect` avec notification** (coût zéro local, réactivité ~1min après push, pas de friction). | Pourquoi : option (a) hook pre-push local ajoute 60-90s à chaque push (build complet vite), peu pratique pour itérations rapides ; option (b) catch les erreurs en aval sans bloquer le flux. | Option (a) hook `.git/hooks/pre-push` `cd template && npm run build` reste fallback si Pascal préfère blocage strict. Implémentation option (b) : script qui poll `vercel inspect filmpro-crm.vercel.app` après chaque push et notifie via system message si nouveau deploy passe en `● Error` dans les 3 min. → voir `memory/feedback_vercel_deploy_status_before_audit.md` + `memory/feedback_template_literal_backtick_escape.md`

### 3. Évaluation cron veille 01/05 + validation pipeline Veille→Prospection [SUPERVISÉ • low • ~15 min]

**Pourquoi** : double validation gratuite. (1) La refonte LEAN S112 (commit `83fd7fd`) avec hot-fix bias géo SR n'a jamais été re-testée API. (2) L'intégration Veille→Prospection livrée S120 (commit `9df286e`) sera exercée pour la 1re fois en prod par ce cron : surveiller logs Vercel ligne `[veille→prospection] report 2026-W18 : N signal(s) lié(s), M lead(s) recalculé(s)`. Si OK les deux, on archive S112 + on confirme S120.
**Prérequis** : être ≥ 2026-05-01, email cron reçu sur `pascal@filmpro.ch` ou consultation /veille + accès logs Vercel.

- [ ] **[BLOQUÉ - date ≥ 2026-05-01]** Lire l'édition W18 reçue par email + sur /veille. Critères veille : (1) ≥1 item Suisse romande rangs 1-3, (2) sources crédibles, (3) anti-doublons W16/W17, (4) compliance_tag cohérent, (5) volume 5-10 items. Critères Veille→Prospection (S120) : (a) hook `applySignalsFromReport` dans logs Vercel sans exception, (b) éventuels leads existants matchés voient `score_pertinence` mis à jour. Si 4/5 veille OK + S120 OK → succès double. → voir `memory/project_veille_S112_apprentissages.md` et `memory/project_veille_prospection_integration_s120.md`
- [ ] **[BLOQUÉ - validation Pascal cron 01/05]** Drop stash `stash@{0}` (`git stash drop stash@{0}`) une fois la refonte LEAN considérée stable. Le stash contenait des éléments S110 chantier B déjà intégrés ou écartés.

### 4. Dashboard coûts CRM [BLOQUÉ • high • session dédiée]

- [ ] **[BLOQUÉ - session dashboard dédiée]** Dashboard coûts CRM `/dashboard/couts` : table `cost_audit_runs` + graphique 12 sem + split cron/catégorie + seuils. → voir `memory/project_dashboard_costs_crm.md`

### 5. Figma API [BLOQUÉ • medium • ~1h]

- [ ] **[BLOQUÉ - attente PAT Figma]** Figma API : PAT + plugin MCP figma scope projet

### 6. Harmonisation PDF FilmPro [BLOQUÉ • high • ~2h]

- [ ] **[BLOQUÉ - Tâche archi FilmPro ~/.claude/CLAUDE.md Bloc 6]** Harmoniser production PDF FilmPro : aligner `playbook-pdf` (WeasyPrint) et `filmpro-pdf-lite` (reportlab). Reco option [3] coexistence + combler gaps G1-G3-G5. → voir `memory/project_filmpro_pdf_harmonization.md`

### Livré cette session (5 derniers)

- [x] ~~CRM mobile V1 Session C livrée + règle globale tests mobile DevTools manuel (Bloc 1)~~ - Fait 2026-04-27 (S123, xhigh) : 1 commit push origin/main `c46220c` (fix Session C V1 mobile). 4 livrables : (1) **fix P1-3 /reporting chart SVG** : 2 SVG (`pipelineEtape` + `monthlyPipeline`) passés en `viewBox="0 0 {width} 190"` + `width="100%"` + `preserveAspectRatio="xMinYMid meet"`, wrapper `overflow-x-auto` retiré. Validation prod 430×932 : SVG 356×128 dans parent 356, **0 débordement** (vs 528→172px débordement S122). (2) **fix /prospection table 46px** : DataTable `columns` array + row snippet, widths cols mobile somme=100% via `w-[18%] md:w-[9%]` (Température), `w-[50%] md:w-[20%]` (Raison), `w-[32%] md:w-[13%]` (Statut). Validation prod : wrapper 396×396 (vs 396 vs 442 S122 → +46px résolus). 4 cols visibles : checkbox(40)+Température(64)+Raison(178)+Statut(114)=396. (3) **audit /veille** : 0 overflow, 2 articles édition magazine 366×498/437, h1 18px, h2 24px/32px. (4) **audit /signaux** : 0 overflow, scrollH 19268. **Règle inscrite globale** : `~/.claude/rules/methodology.md` § Garde-fous : « Tests mobile via Chrome DevTools Device Toolbar (manuel) — OBLIGATOIRE » (Cmd+Option+I → Cmd+Shift+M → device dropdown). Justification factuelle : MCP `claude-in-chrome` `resize_window(430, 932)` a donné `innerWidth=500` au début de session (la fenêtre desktop a été redimensionnée, pas le viewport émulé) → MCP n'est PAS un substitut au Device Toolbar manuel. DPR=3, UA mobile, touch émulé, viewport meta-tag → uniquement avec DevTools manuel. MCP reste OK pour mesurer DOM (`clientWidth`/`scrollWidth`/`getBoundingClientRect`) en complément. Tests Playwright mobile retirés sur demande Pascal. **Réserve mineure** : header `<th>` "Température" wrappe sur 2 lignes mobile (Tempé/rature), lisible mais perfectible — tracé Bloc 1 Session D comme polish optionnel. Vitest 365/365, svelte-check 107/37 baseline, build OK local.
- [x] ~~CRM mobile V1 Sessions A+B + déblocage build prod (Bloc 1)~~ - Fait 2026-04-27 (S122, xhigh) : 6 commits push origin/main + update CLAUDE.md (4d09f29 audit findings + 4b45122 service worker PWA + 92a6d78 5 fixes mobile + bd4de80 priorisation tables + 7ca1a3e clôture v1 + 426fa4b fix syntax prompt.ts:47 backtick déblocage build). **Découverte critique** : tous les builds Vercel en ERROR depuis 24h+ (cause root S120 `9df286e` backtick non échappé `\`site:.ch\`` dans template literal SYSTEM_PROMPT). Ni S120, S121 ni S122 n'étaient en prod avant `426fa4b` push 14:23. Validation chrome MCP iPhone 14 Pro Max post-deploy : ✅ P0-1 + ✅ P0-2 + ✅ P1-1 + ✅ P1-2 + ✅ P1-4 + ✅ P1-5 + ✅ P2-1 + ✅ P2-2 (8 fixes confirmés en prod fraîche). ⚠️ Finding nouveau /prospection 46px débordement table interne (col checkbox `selectable=true` + paddings) à traiter Session C (résolu S123). 🛡️ Faille process : aucun gate CI ne run `npm run build` avant push, build cassé invisible — bloc nouveau "Gate vite build pré-push" ajouté Prochaine session. Vitest 365/365, svelte-check 107/37 nouveau baseline (-3 erreurs résolues par fix prompt.ts). Fondation chrome `+layout.svelte` slide-in mobile validée conforme SPEC §3 (faux finding sidebar 240px corrigé après inspection rect.left=-240 hors viewport). → voir `notes/audit-mobile-v1-session-A/findings.md`
- [x] ~~Cadrage CRM mobile V1 (Bloc 1)~~ - Fait 2026-04-27 (S121, xhigh) : `docs/SPECS_CRM_MOBILE.md` (340 lignes) + `docs/SPECS_CRM_MOBILE.html` (vue lisible navigable, branding FilmPro, sidebar TOC). Principe directeur verrouillé après 3 itérations Pascal : pas d'UX mobile-spécifique, référence Linear/Notion/Stripe. 8 décisions structurelles tranchées + 14 features hors scope V1 + 4 sessions séquencées A/B/C/D ~6h cumulées + budgets perf mobile + tests Playwright iPhone 14 + Pixel 7 + métriques succès S+8. → voir `memory/project_crm_mobile_v1_cadrage.md`
- [x] ~~Bloc cockpit [1a] Intégration Veille→Prospection complète~~ - Fait 2026-04-27 (S120, xhigh) : commit `9df286e` push main. 2 tâches cockpit fusionnées (filtres APIs alignés + score leads piloté veille). 7 phases : fix seuils température cron alertes, migration `prospect_lead_signals` + scoring agrégation (plafond=4) + 3 modules `recompute-score`/`apply-signals`/`link-import-signal` + hook cron veille, cron quotidien `/api/cron/lead-rescore` 5h CET, pont Veille étendu RegBL. Bug latent Zefix `from_item_rank` corrigé. Sécurité : finding High PostgREST `.or()` injection résolu via 2 `.ilike()` + Set dédup. Tests 365/365 (+21), svelte-check 110/37 baseline, 0 High/Critical. Validation prod attendue cron 01/05. → voir `memory/project_veille_prospection_integration_s120.md`
- [x] ~~Bloc 1a Alignement `--color-info` ardoise FilmPro + golden v5~~ - Fait 2026-04-26 (S119, low) : commit `3524392` push main. Décision option (a) tranchée par Pascal : code → golden. 2 substitutions `template/src/app.css:33-34` (`--color-info #2E90FA → #5A7190` + `-light #EFF8FF → #EDF1F5`). Résout `knownDivergences.info-token-ardoise-vs-sky` (golden v4). Golden v5 workspace : décision 8 ajoutée, `knownDivergences: []`, symlink basculé v4 → v5. Vitest 344/344, svelte-check 109/37 baseline.
