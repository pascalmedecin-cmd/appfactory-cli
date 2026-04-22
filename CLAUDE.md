# AppFactory : CLAUDE.md

**Statut :** Phase C, Skills et templates HTML + module Veille sectorielle en production + pipeline images 4 niveaux (Flux 1.1 Pro Ultra + audits Vision) + email récap cron veille (gated) + export/import CSV + page /reporting. Formation IA est un sous-projet autonome dans `formation-ia/`, accessible directement via `cc` option 2 (pas de dispatcher intermédiaire).
**Derniere mise a jour :** 2026-04-22 (session S108 CRM : Pack P1 QA pipeline images /veille livré bout en bout. 3 leviers A+B+C intégrés dans `og-image-quality.ts` + `og-image-vision.ts` (nouveau) + `image-fallback-generator.ts` + `generate.ts`. Gates 422/422 tests Vitest, script test isolé 2/2 rejets W16 validés. Commit `a8a031f` + push main. Validation prod pending W17 jeudi 2026-04-23 via cron naturel.)
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** Session 108 (CRM /veille, 2026-04-22, `/effort xhigh`). **Pack P1 QA pipeline images /veille** livré bout en bout après rejet Pascal S67 sur 2 images W16 (Springer schéma + fal.ai générique). Diagnostic 3 mécanismes défaillants (Niveau 1 sans audit contenu, Niveau 2 seuil 6/10 trop bas, brief segment-based générique). Implémentation : A. blacklist 18 hosts scientifiques + 6 patterns chemins (`Fig\d+_HTML`, `art%3A10.`, `MediaObjects/`...) ; B. passe Vision Sonnet Niveau 1 avec 5 critères (`is_photograph`, `is_editorial`, `no_diagram_or_infographic`, `no_screenshot_or_ui`, `contextual_score ≥7/10`), intégrée en Bloc 6quater après `checkOgImageQuality` et avant `generateFallbacksForItems` pour ne pas auto-rejeter les images fal.ai ; C. seuil Niveau 2 durci 6→7. Gates : 422/422 Vitest, svelte-check 3 erreurs pré-existantes hors scope, script `scripts/test-og-image-vision.ts` 2/2 rejets W16 confirmés. Commit `a8a031f` + push main. Pack P2 (D retry + E Opus Vision) en réserve si régression prod W17.
**Session -1 :** Session 107 (formation-ia, 2026-04-20). Bloc 0 Phases 5+6 livrées bout en bout. Page cockpit `/admin/parcours/[slug]/images` + upload/replace/delete + admin guard. Commit `f253460`. Gates 584/0/0, vitest 225/225. Bloc 1 UI refonte 12 modules débloqué.
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

**Prochaine attaque** : Bloc 0 - Validation prod W17 pipeline images - cron naturel jeudi 2026-04-23 23h, inspecte vendredi matin + clôture ou mobilise Pack P2.

### 0. Validation prod W17 pipeline images [SUPERVISÉ • low • ~15 min]

**Pourquoi** : Pack P1 QA pipeline images livré S108 (commit `a8a031f` push main). Validation prod pending via cron naturel W17 jeudi 2026-04-23 23h UTC+2. Inspecte vendredi matin : images conformes → clôture ; régression → Pack P2 (D retry prompt affiné + E Opus Vision) mobilisable.
**Prérequis** : date ≥ 2026-04-24 (matin post-cron W17).

- [ ] **[BLOQUÉ - date ≥ 2026-04-24 matin]** Inspecter https://filmpro-crm.vercel.app/veille W17. Valider visuellement chaque image vs titre/sujet. Si OK → clôturer tâche QA images (update `memory/project_qa_images_veille.md` en « livré S108+validé S109 »). Si KO → mobiliser Pack P2 : option D retry 1× fal.ai avec prompt affiné incluant sémantique article, option E bascule Vision Niveau 2 Opus (attention 300s Hobby). → voir `memory/project_qa_images_veille.md`

### 1. Activation email récap veille prod [EXÉCUTABLE • low • ~10 min]

**Pourquoi** : spec commit `e0f0b32` en attente d'activation. Premier test possible = cron jeudi 2026-04-23 (même cron que validation W17, pertinence combinée).

- [ ] **[EXÉCUTABLE]** Env Vercel prod : `EMAIL_RECAP_ENABLED=true` + `RESEND_API_KEY` (clé Supabase SMTP existante). Vérifier arrivée mail post-cron jeudi. → voir `memory/project_email_veille_recap.md`

### 2. Hygiène doc CRM [EXÉCUTABLE • low • ~20 min]

**Pourquoi** : 2 commandes obsolètes + smoke test livrables batch 1g. Thème commun « petites validations / nettoyage » enchaînables sans bascule contextuelle.

- [ ] **[EXÉCUTABLE]** Smoke test livrables batch 1g : page `/reporting` + export CSV BOM UTF-8 + import CSV CLI `--dry-run`. Ref commit `12d8bc5`
- [ ] **[EXÉCUTABLE]** Actualiser commandes obsolètes `.claude/commands/cadrage.md` (dispatcher → menu CRM) + `deploy.md` (flow GitHub→Vercel auto par défaut). Keep `generate.md` tel quel

### 3. Golden standards UX/UI complets CRM [SUPERVISÉ • xhigh • ~10h, 3-4 sessions]

**Pourquoi** : chantier structurant. Gabarit exclusif `/prospection`, wizards hors périmètre. Ingère palettes /prospection + /veille refondue.
**Prérequis** : décision démarrer explicitement (gros chantier, nécessite sessions dédiées).

- [ ] **[EXÉCUTABLE]** Phase 1 extraction → Phase 2 rédaction `docs/GOLDEN_STANDARDS.md` → Phase 3 audit delta → Phase 4 application (1 commit/page). Règle table-fixed (S48)

### 4. Premier run e2e /golden-standard + /audit-uiux [EXÉCUTABLE • medium • session test]

**Pourquoi** : test système sur 1 page CRM avant usage étendu. Indépendant Bloc 3.

- [ ] **[EXÉCUTABLE]** Premier run e2e `/golden-standard` + `/audit-uiux` Express sur 1 page CRM. → voir `~/.claude/projects/-Users-pascal--claude/memory/project_audit_uiux_first_e2e_test.md`

### 5. Audit Vision cadrage Niveau 3 [BLOQUÉ • medium • option]

- [ ] **[BLOQUÉ - après validation W17 + 3-4 régens conclusives sur Pack P1]** Audit Vision cadrage niveau 3 fallback media_library : top-N crop OK pour og:image 16:9. ~$0.09/sem

### 6. Décision retrait url_mutated [BLOQUÉ • low • ~15 min]

- [ ] **[BLOQUÉ - 3 régens W17/W18/W19 avec 0 occurrence]** Retirer code défensif `generate.ts` si 0 occurrence `[URL_MUTATED]` sur 3 semaines. Ref commit `921e71a`

### 7. Dashboard coûts CRM [BLOQUÉ • high • session dédiée]

- [ ] **[BLOQUÉ - session dashboard dédiée]** Dashboard coûts CRM `/dashboard/couts` : table `cost_audit_runs` + graphique 12 sem + split cron/catégorie + seuils. → voir `memory/project_dashboard_costs_crm.md`

### 8. Figma API [BLOQUÉ • medium • ~1h]

- [ ] **[BLOQUÉ - attente PAT Figma]** Figma API : PAT + plugin MCP figma scope projet

### 9. Harmonisation PDF FilmPro [BLOQUÉ • high • ~2h]

- [ ] **[BLOQUÉ - Tâche archi FilmPro ~/.claude/CLAUDE.md Bloc 6]** Harmoniser production PDF FilmPro : aligner `playbook-pdf` (WeasyPrint) et `filmpro-pdf-lite` (reportlab). Reco option [3] coexistence + combler gaps G1-G3-G5. → voir `memory/project_filmpro_pdf_harmonization.md`

### Livré cette session (5 derniers)

- [x] ~~QA cadrage images /veille W16 Pack P1 (A+B+C)~~ - Fait 2026-04-22 (S108) : 3 leviers + Vision Niveau 1 + seuil 6→7. Commit `a8a031f` push main. Validation prod pending W17.
