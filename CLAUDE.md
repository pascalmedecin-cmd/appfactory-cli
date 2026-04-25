# AppFactory : CLAUDE.md

**Statut :** Phase C, Skills et templates HTML + module Veille sectorielle refondu LEAN 1-phase Opus 4.7 streaming en production (S112) + email récap cron veille textuel (gated, actif) + export/import CSV + page /reporting. Formation IA est un sous-projet autonome dans `formation-ia/`, accessible directement via `cc` option 2.
**Derniere mise a jour :** 2026-04-25 (session S112 CRM : refonte LEAN veille livrée prod en 13 commits (7 commits S112 + 6 hot-fixes). Run prod manuel exécuté, bug priorité géo SR identifié, hot-fix `user_location` Suisse + `blocked_domains` + prompt durci poussé. Validation finale = email cron du 01/05 lu par Pascal.)
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** Session 112 (CRM, 2026-04-25, `/effort xhigh`). Refonte LEAN veille livrée : 7 commits S112 initiaux (1-phase Opus 4.7, suppression vérifs redondantes, UI cards magazine 3 éditions, alerte sparse < 2 items, cron vendredi 6h UTC, tests sparse) + 6 hot-fixes (badge Non vérifié transverse, Zod limites élargies + `optional().default([])`, max_tokens 16K → 32K + garde stop_reason, bascule `messages.create` → `messages.stream().finalMessage()` car Anthropic refuse non-streaming > 10 min projetés, revert maxDuration 800 build error Vercel cap plan, bias géo SR `user_location:{country:CH,city:Lausanne}` + `blocked_domains` 9 sources bruyantes + prompt « ≥5 web_search SR avant monde »). Run prod manuel `aa2b526a` (W17 retry 6) : HTTP 200 277s, 7 items mais 0 SR → root cause web_search Anthropic sans bias géo (vs Perplexity Sonar tuné par défaut, comparé sur même tâche, retournait 2/8 SR). W17 prod restauré depuis snapshot après chaque run pour ne pas casser /veille. Coût session ~$1.50 (5 runs investigation). Validation finale reportée au cron du 01/05 (gratuit).
**Session -1 :** Session 111 (CRM, 2026-04-25, `/effort xhigh`). Audit 360 veille e2e + spec refonte LEAN validée. Aucun commit code, 100% lecture statique + raisonnement. Spec complète dans `notes/audit-veille-2026-04-25.md`.
**Session -2 :** Session 110 (CRM, 2026-04-24, `/effort xhigh`). Retrait total pipeline images /veille livré prod (commit `dce99be`).
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

**Prochaine attaque** : Bloc 0 - Évaluer email cron veille du 01/05 - validation finale S112. Si qualité OK (≥1 item Suisse romande, sources crédibles, pas de doublons W16/W17) → archiver S112 + drop stash. Si KO → désactiver cron tactiquement et investiguer paramètres web_search ou bascule moteur (Perplexity API ?).

### 0. Évaluation cron veille 01/05 + clôture S112 [SUPERVISÉ • low • ~15 min]

**Pourquoi** : la refonte LEAN est en prod (commit `83fd7fd`) avec hot-fix bias géo SR. Aucun re-test API en S112 (volonté Pascal). Le cron normal du vendredi 01/05 ~08h CEST tournera et produira W18 ; la qualité de cet email = test gratuit du fix géo. Si OK, on archive ; si KO, on creuse autrement.
**Prérequis** : être ≥ 2026-05-01, email cron reçu sur `pascal@filmpro.ch` ou consultation /veille.

- [ ] **[BLOQUÉ - date ≥ 2026-05-01]** Lire l'édition W18 reçue par email + sur /veille. Critères : (1) ≥1 item Suisse romande dans les rangs 1-3, (2) sources crédibles (pas de blog SEO bas de gamme), (3) anti-doublons W16/W17 respecté, (4) compliance_tag cohérent avec contenu, (5) volume 5-10 items. Si 4/5 critères OK → succès, archiver S112. Si < 3/5 → échec, désactiver cron + ouvrir session investigation. → voir `memory/project_veille_S112_apprentissages.md`
- [ ] **[BLOQUÉ - validation Pascal cron 01/05]** Drop stash `stash@{0}` (`git stash drop stash@{0}`) une fois la refonte LEAN considérée stable. Le stash contenait des éléments S110 chantier B déjà intégrés ou écartés.

### 1. Golden standards UX/UI complets CRM [SUPERVISÉ • xhigh • ~10h, 3-4 sessions]

**Pourquoi** : chantier structurant. Gabarit exclusif `/prospection`, wizards hors périmètre. Ingère palettes /prospection + /veille refondue (livrée S112).

- [ ] **[EXÉCUTABLE]** Phase 1 extraction → Phase 2 rédaction `docs/GOLDEN_STANDARDS.md` → Phase 3 audit delta → Phase 4 application (1 commit/page). Règle table-fixed (S48). /veille refondue S112 livrée, palettes intégrables.

### 2. Premier run e2e /golden-standard + /audit-uiux [EXÉCUTABLE • medium • session test]

**Pourquoi** : test système sur 1 page CRM avant usage étendu. Indépendant Bloc 1.

- [ ] **[EXÉCUTABLE]** Premier run e2e `/golden-standard` + `/audit-uiux` Express sur 1 page CRM. → voir `~/.claude/projects/-Users-pascal--claude/memory/project_audit_uiux_first_e2e_test.md`

### 3. Investiguer éditions veille manquantes (préexistant) [EXÉCUTABLE • low • ~30 min]

**Pourquoi** : la BDD `intelligence_reports` ne contient que W16 + W17 (vérifié S110), aucune édition antérieure. Cause préexistante (pas régression S110). À investiguer pour comprendre si DELETE manuel ancien, projet récent, ou bug archivage.

- [ ] **[EXÉCUTABLE]** Vérifier git log + Supabase audit log + cron `intelligence-archive` (n'archive qu'au-delà de 365 jours, soft via `archived_at`, pas DELETE). Tracer disparitions W1-W15.

### 4. Dashboard coûts CRM [BLOQUÉ • high • session dédiée]

- [ ] **[BLOQUÉ - session dashboard dédiée]** Dashboard coûts CRM `/dashboard/couts` : table `cost_audit_runs` + graphique 12 sem + split cron/catégorie + seuils. → voir `memory/project_dashboard_costs_crm.md`

### 5. Figma API [BLOQUÉ • medium • ~1h]

- [ ] **[BLOQUÉ - attente PAT Figma]** Figma API : PAT + plugin MCP figma scope projet

### 6. Harmonisation PDF FilmPro [BLOQUÉ • high • ~2h]

- [ ] **[BLOQUÉ - Tâche archi FilmPro ~/.claude/CLAUDE.md Bloc 6]** Harmoniser production PDF FilmPro : aligner `playbook-pdf` (WeasyPrint) et `filmpro-pdf-lite` (reportlab). Reco option [3] coexistence + combler gaps G1-G3-G5. → voir `memory/project_filmpro_pdf_harmonization.md`

### Livré cette session (5 derniers)

- [x] ~~Refonte LEAN veille livrée prod (S112) + hot-fix bias géo SR~~ - Fait 2026-04-25 (S112, xhigh) : 13 commits poussés (7 commits S112 initiaux + 6 hot-fixes). Refonte 1-phase Opus 4.7 streaming + UI cards magazine 3 éditions + cron vendredi 6h UTC + alerte sparse < 2 items + bias géo SR (`user_location:CH/Lausanne` + `blocked_domains` 9 sources + prompt « ≥5 web_search SR avant monde »). Run prod manuel `aa2b526a` (W17 retry 6) HTTP 200 277s. Bug priorité géo SR identifié (0/7 SR vs Perplexity Sonar 2/8 SR), fix poussé sans re-test API. Validation finale = email cron 01/05. Coût session ~$1.50 (5 runs investigation).
- [x] ~~Audit 360 veille e2e + spec refonte LEAN validée~~ - Fait 2026-04-25 (S111, xhigh) : Phase 1 cartographie (9 étages), Phase 2 inventaire bugs (5 fonctionnels + 5 UX + 5 archi), Phase 3 benchmark 3 options + reco Option [A] 1-phase Opus 4.7. Décisions Pascal : géo élargi avec priorités, fenêtre 30j, cron vendredi 6h UTC, suppression badge « Non vérifié »/`is_hot`/recurrence/filtres, UX magazine 3 cards. Spec complète dans `notes/audit-veille-2026-04-25.md` (8 sections). Aucun appel API Anthropic veille consommé (audit 100% lecture statique). Pas de commit code.
- [x] ~~Retrait total pipeline images /veille~~ - Fait 2026-04-24 (S110) : 8 phases. Migration SQL `20260424_001_remove_media_library.sql` (DROP TABLE + strip JSONB). 13 fichiers DELETE + 9 modifiés. Bucket Storage purgé (45 objets). FAL_KEY retirée Vercel CRM prod. Tests 358/358 verts. Commit `d1a86b7` + merge `dce99be` + push main. Vercel deploy `filmpro-nckwob97j` (32s).
- [x] ~~Investigation W17 0 items + cadrage élargi B (stashé)~~ - Fait 2026-04-24 (S110) : diagnostic complet (Phase 1 retournait 0 candidats avec ancien prompt strict, jusqu'à 12 candidats avec cadrage B). Code chantier B STASHÉ : `git stash list` → `stash@{0}: WIP S110 chantier B`. Coût debug ≈ $8.
- [x] ~~Email récap veille prod activé + doc cadrage/deploy + smoke test CSV + PDF point d'étape CRM~~ - Fait 2026-04-23 (S109) : env vars `EMAIL_RECAP_ENABLED=true` + `RESEND_API_KEY` poussées prod + redeploy `filmpro-fxkoptuk2`. Tests csv-export + csv-import 36/36 verts.
