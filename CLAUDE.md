# AppFactory : CLAUDE.md

**Statut :** Phase C, Skills et templates HTML + module Veille sectorielle refondu LEAN (S112, prod) + email récap cron veille (gated, actif) + export/import CSV + page /reporting + Golden Standards CRM v3 livré + Phase 4 application `/prospection` en prod (S114) + Migration Material Symbols → Lucide complète (S115) + **Cascade golden v3 Bloc 1a Phase 3+4 LIVRÉE INTÉGRALEMENT 6/6 pages CRM (S116-S117, 8 commits push main)**. Formation IA est un sous-projet autonome dans `formation-ia/`, accessible directement via `cc` option 2.
**Derniere mise a jour :** 2026-04-26 (session S117 CRM xhigh : cascade Bloc 1a 4 pages restantes + sweeps cross-app inputs h-[34px] + ghost destructive/annuler + cleanup tokens accent + header 48px golden v3. 6 commits push main. Vitest 344/344, svelte-check 0 régression.)
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** Session 117 (CRM, 2026-04-26, `/effort xhigh`, post-crash CLI précédent). 6 commits majeurs. **Diagnostic post-crash** : 3 vite orphelins tués + working tree analysé (commit `eddb04b` P2-02 alerte signaux dashboard livré pré-crash, modifs working-tree caractérisées). **Cleanup** commit `7671a52` : tokens --color-accent* orphelins supprimés (0 usage restant) + sweep `space-y-5 → space-y-6` SlideOuts (8 occurrences/6 fichiers). **Header golden v3** commit `3b8a735` : `--header-height: 56 → 48px`. **Page 3/6 `/entreprises`** commit `1f56416` : audit ui-auditor (3 P1 + 4 P2 + 4 STRUCTURELS dont H1 résolu cross-app via Header.svelte) + sweep cross-app ghost destructive (3 fichiers) + ghost Annuler modal (5 fichiers) + fixes locaux F2-01 space-y-2 + F2-03 EmptyState. **Page 4/6 `/pipeline`** commit `03f8815` : audit (3 P1 + 1 P2 + 1 STRUCTUREL) + sweep cross-app inputs h-[34px] golden (FormField + CantonSelect + 4 selects natifs) + fixes locaux header colonne kanban. Décision composant Select reportée backlog. **Page 5/6 `/signaux`** commit `ae8ae78` : audit (5 P1 CTA + 6 P2) + 5 CTA alignés h-10 box-border font-semibold + 2 ghost annuler oubliés du sweep précédent + 5 fixes paddings/badges/empty + bug mx-auto Lucide → inline-block (corrigé sur entreprises aussi). F5-10 variant 'info' reporté car Badge.svelte n'expose pas. **Page 6/6 `/veille`** commit `8447c05` : audit (5 P1 + 4 P2 + 2 STRUCTURELS + 6 Bloc 2 candidates) + 3 H1→H2 sémantique + ~30 mappings tokens (slate/emerald/sky/amber → text-text-muted/border-border/bg-success-light/bg-warning-light) + COMPLIANCE_STYLES + MATURITY_STYLES vers tokens + 2 CTA fonctionnels h-10 + sweep paddings/radius. Callout amber « Pour FilmPro » L183-184 préservé éditorial. Tokens primary-dark/light conservés (Sidebar/login/hero), classes mag-* éditoriales intactes. **Bilan** : ~25 candidates Bloc 2 (opacités custom primary) reportées, F5-10 (Badge variant 'info') + Composant Select partagé + Doc golden v4 (tokens éditoriaux + classes mag-*) ouverts. Vitest 344/344, svelte-check 109/37 baseline maintenue (0 régression).
**Session -1 :** Session 116 (CRM, 2026-04-26, `/effort xhigh`). 2 commits majeurs. Bloc 1a Phase 3+4 cascade pages 1-2 (`/dashboard` + `/contacts`) + sweep structurel cross-app `bg-accent → bg-primary` 158 substitutions / 24 fichiers + SlideOut 560 + token --color-primary-hover. Apprentissage clé : audit Express 1 page peut masquer écarts structurels cross-app (cf. mémoire `feedback_audit_uiux_cross_app_revelation`).
**Session -2 :** Session 115 (CRM, 2026-04-26, `/effort xhigh` AUTONOME). Bloc 1b Migration Material Symbols → Lucide : 207 occurrences éliminées commit atomique `f1a54c5`, wrapper `<Icon name="...">` + `icon-map.ts` (92 mappings).
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

**Prochaine attaque** : Bloc 1 - décision token unifié opacités custom primary (~25 candidates listées post-cascade S117). Court ~30 min, débloque cohérence palette + permet Bloc 2 Badge variant 'info'. Alternative session courte si date ≥ 2026-05-01 : Bloc 5 validation cron veille W18.

### 1. Décision token unifié opacités custom primary [SUPERVISÉ • low • ~30 min]

**Pourquoi** : 25+ candidates `bg-primary/{5,8,10,15,20}` + `border-primary/{12,15,20,30}` reportées par cascade Bloc 1a S116-S117. Hors palette golden v3, sémantique floue. Décision (a) nouveaux tokens `--color-primary-pale/-soft` vs (b) bascule case-by-case vers tokens existants (bg-info-light, bg-surface-alt). Reco (b) : zéro nouveau token, cohérent avec décision P2-02 alerte signaux S117 (commit `eddb04b` option b). Focus rings et hovers transients exclus du sweep (acceptable opacité numérique, pattern UA standard).
**Prérequis** : aucun.

- [ ] **[EXÉCUTABLE]** Trancher (a) ou (b) puis sweep cross-app sur ~15-20 occurrences `bg-*` et `border-*` filtrées. Liste exhaustive + mapping sémantique disponibles. → voir `memory/project_decision_opacites_primary_custom.md`

### 2. Badge variant 'info' [SUPERVISÉ • low • ~15 min]

**Pourquoi** : F5-10 audit /signaux S117 reporté. Badge.svelte n'expose pas variant 'info' (type accepte uniquement default | accent | success | warning | danger | muted). Tentative bascule statut « En analyse » de 'accent' (legacy alias) vers 'info' (sémantique correcte) a généré 2 erreurs svelte-check. Chantier composant + sweep usages.
**Prérequis** : Bloc 1 décision palette tranchée (cohérence sémantique).

- [ ] **[BLOQUÉ - Bloc 1 livré]** Ajouter variant 'info' à Badge.svelte (type + classes `bg-info-light text-info border-info/15` + dot `bg-info`). Sweep cross-app : variant 'accent' → 'info' sur statuts en cours d'analyse. Vérification chrome MCP /signaux. → voir `memory/project_badge_variant_info.md`

### 3. Composant Select.svelte partagé [SUPERVISÉ • medium • ~1h30]

**Pourquoi** : F4-S1 audit /pipeline S117. 4 selects natifs (pipeline x3 + signaux x1) + CantonSelect dupliquent inline classes. Sweep S117 a aligné inline sur golden (h-[34px] px-3 py-1.5) mais ne refactore pas. Création composant centralisé pour future maintenabilité.
**Prérequis** : aucun.

- [ ] **[EXÉCUTABLE]** Créer `template/src/lib/components/Select.svelte` (props options array, value, label, required, id, name). Migrer 4 selects natifs vers composant. CantonSelect conservé (logique métier optgroup). FormField non touché (séparation primitive). Vérification chrome MCP /pipeline + /signaux. → voir `memory/project_select_component_partage.md`

### 4. Doc golden v4 : tokens éditoriaux + classes mag-* [SUPERVISÉ • low • ~30 min]

**Pourquoi** : S-01 et S-02 audit /veille S117. Tokens `--color-primary-dark`, `--color-primary-light` coexistent avec `--color-primary-hover` (utilisés Sidebar bg, login bg, hero éditorial /veille). Classes `mag-display`, `mag-display-3`, `mag-kicker`, `mag-body` utilisées exclusivement /veille. Décision implicite S116 : conservés (design éditorial). Régularisation doc dans golden v4 sans modif fonctionnelle.
**Prérequis** : aucun.

- [ ] **[EXÉCUTABLE]** Créer snapshot golden v4 avec 2 sections supplémentaires : (a) `typography.editorial` (mag-* documentées avec scope /veille), (b) `palette.editorial` (primary-dark, primary-light avec scope Sidebar/login/hero éditorial). Pas de modif CSS. → voir skill `golden-standard`.

### 5. Évaluation cron veille 01/05 + clôture S112 [SUPERVISÉ • low • ~15 min]

**Pourquoi** : la refonte LEAN est en prod (commit `83fd7fd`) avec hot-fix bias géo SR. Aucun re-test API en S112 (volonté Pascal). Le cron normal du vendredi 01/05 ~08h CEST tournera et produira W18 ; la qualité de cet email = test gratuit du fix géo. Si OK, on archive ; si KO, on creuse autrement.
**Prérequis** : être ≥ 2026-05-01, email cron reçu sur `pascal@filmpro.ch` ou consultation /veille.

- [ ] **[BLOQUÉ - date ≥ 2026-05-01]** Lire l'édition W18 reçue par email + sur /veille. Critères : (1) ≥1 item Suisse romande dans les rangs 1-3, (2) sources crédibles (pas de blog SEO bas de gamme), (3) anti-doublons W16/W17 respecté, (4) compliance_tag cohérent avec contenu, (5) volume 5-10 items. Si 4/5 critères OK → succès, archiver S112. Si < 3/5 → échec, désactiver cron + ouvrir session investigation. → voir `memory/project_veille_S112_apprentissages.md`
- [ ] **[BLOQUÉ - validation Pascal cron 01/05]** Drop stash `stash@{0}` (`git stash drop stash@{0}`) une fois la refonte LEAN considérée stable. Le stash contenait des éléments S110 chantier B déjà intégrés ou écartés.

### 6. Dashboard coûts CRM [BLOQUÉ • high • session dédiée]

- [ ] **[BLOQUÉ - session dashboard dédiée]** Dashboard coûts CRM `/dashboard/couts` : table `cost_audit_runs` + graphique 12 sem + split cron/catégorie + seuils. → voir `memory/project_dashboard_costs_crm.md`

### 7. Figma API [BLOQUÉ • medium • ~1h]

- [ ] **[BLOQUÉ - attente PAT Figma]** Figma API : PAT + plugin MCP figma scope projet

### 8. Harmonisation PDF FilmPro [BLOQUÉ • high • ~2h]

- [ ] **[BLOQUÉ - Tâche archi FilmPro ~/.claude/CLAUDE.md Bloc 6]** Harmoniser production PDF FilmPro : aligner `playbook-pdf` (WeasyPrint) et `filmpro-pdf-lite` (reportlab). Reco option [3] coexistence + combler gaps G1-G3-G5. → voir `memory/project_filmpro_pdf_harmonization.md`

### Livré cette session (5 derniers)

- [x] ~~Cascade Bloc 1a Phase 3+4 LIVRÉE INTÉGRALEMENT 6/6 pages CRM~~ - Fait 2026-04-26 (S117, xhigh) : 6 commits push main (`7671a52` cleanup tokens accent + sweep space-y-6, `3b8a735` --header-height 48px, `1f56416` /entreprises + sweeps ghost, `03f8815` /pipeline + sweep inputs h-[34px], `ae8ae78` /signaux 5 CTA + paddings, `8447c05` /veille mappings tokens + 2 CTA). 4 pages auditées (/entreprises, /pipeline, /signaux, /veille) en méthodo subagent ui-auditor + STOP-cascade règle S116 appliquée 2 fois (sweeps cross-app inputs + ghost). Vitest 344/344, svelte-check 109/37 baseline maintenue (0 régression).
- [x] ~~P2-02 alerte signaux dashboard option (b) bg-info-light~~ - Fait 2026-04-26 (S117 pré-crash, xhigh) : commit `eddb04b` aligne alerte signaux dashboard sur pattern alerte prospection (warning-light → info-light), retire opacités custom bg-primary/5+/8+/10. Pattern future-proof pour décision token unifiée Bloc 1.
- [x] ~~Bloc 1a cascade page 2/6 `/contacts` + sweep structurel cross-app~~ - Fait 2026-04-26 (S116, xhigh) : audit révèle 3 findings structurels (token --color-accent, SlideOut 480, focus accent). STOP cascade pour décision Pascal validée. Sweep `bg-accent → bg-primary` 158 substitutions / 24 fichiers. CTA + cellules + SlideOut + token primary-hover ajouté. Commit `fc0bd6c` push main 29 fichiers.
- [x] ~~Bloc 1a cascade page 1/6 `/dashboard`~~ - Fait 2026-04-26 (S116, xhigh) : 9 findings P1+P2 corrigés. P2-02 reporté Bloc 2. Commit `7f2dac3` push main.
- [x] ~~Bloc 1b Migration Material Symbols → Lucide (autonome)~~ - Fait 2026-04-26 (S115, xhigh AUTONOME) : 207 occurrences éliminées commit atomique `f1a54c5`. Wrapper Icon + icon-map.ts 92 mappings. Validation chrome MCP 8 pages.
