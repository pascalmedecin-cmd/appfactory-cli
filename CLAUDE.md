# AppFactory : CLAUDE.md

**Statut :** Phase C, Skills et templates HTML + module Veille sectorielle refondu LEAN (S112, prod) + email récap cron veille (gated, actif) + export/import CSV + page /reporting + Golden Standards CRM v3 livré + Phase 4 application `/prospection` en prod (S114) + Migration Material Symbols → Lucide complète (S115) + Cascade golden v3 Bloc 1a Phase 3+4 LIVRÉE INTÉGRALEMENT 6/6 pages CRM (S116-S117) + Sweep palette opacités primary + Badge variant info + Select.svelte partagé + golden v4 doc-only (S118) + Alignement `--color-info` ardoise FilmPro + golden v5 (S119) + Intégration Veille→Prospection complète (S120) + Cadrage CRM mobile V1 validé (S121, doc-only) + CRM mobile V1 Sessions A+B livrées + déblocage build prod 24h cassée + validation chrome MCP prod fraîche 8 fixes (S122) + CRM mobile V1 Session C livrée : fix P1-3 chart SVG /reporting responsive + fix /prospection table 46px + audits /veille /signaux 0 overflow + règle globale tests mobile DevTools manuel (S123) + Lighthouse mobile prod 9 pages + items code Session D livrés (S124, 2 commits 82a083a + 587a658) + **V1 MOBILE CLOS (S125) : font DM Sans self-hosted + lien sidebar /reporting + infra Playwright mobile iPhone 14 Pro Max contre prod (17/17 verts) + fix overlap badge Chaud/Raison sociale /prospection + 8 screenshots golden v5 mobile + SW cache strategy validée + 0 requête fonts.googleapis.com (S125, 3 commits d2fa0fb + eee53f7 + 71f7378)**. Formation IA est un sous-projet autonome dans `formation-ia/`, accessible directement via `cc` option 2.
**Derniere mise a jour :** 2026-04-28 (session S125 CRM xhigh : V1 MOBILE CLOS. 3 commits push origin/main + 1 mémoire créée + 8 screenshots golden v5 mobile générés. **Commit `d2fa0fb`** : quick wins perf Lighthouse — font DM Sans en `@fontsource-variable/dm-sans` self-hosted (suppression Google Fonts CSS render-blocking, gain estimé -600 à -1250ms LCP sur 8 pages auth) + CSP nettoyée (retrait `fonts.googleapis.com`/`fonts.gstatic.com`) + lien sidebar `/reporting` ajouté dans `navigation.secondary` (page existait déjà, manquait juste l'entrée nav). **Commit `eee53f7`** : infra tests mobile Playwright `devices['iPhone 14 Pro Max']` engine Chromium (DPR 3, UA Safari iOS, isMobile, hasTouch) contre prod — `playwright.mobile.config.ts` config séparée + `tests/auth-setup.ts` script Node pour générer `.auth.json` (login OTP manuel une fois, session 7j) + `tests/mobile.spec.ts` 17 audits objectifs (8 pages × 0 overflow, sidebar Reporting, /reporting SVG widths ≤ parent, /prospection table + Temp. abrégé, 5 routes boutons modale d'action ≥ 44px HIG, Dashboard 4 raccourcis ≥ 44px, screenshots full-page golden v5 mobile, Dashboard reflow grid, SW cache strategy, 0 requête fonts.googleapis) + `npm run test:mobile` script. **Décision /dig validée [B] hybride pragmatique** : Playwright `devices` preset autorisé pour findings OBJECTIFS (overflow, dimensions, DOM, réseau) ; DevTools manuel reste obligatoire pour findings QUALITATIFS (rendu visuel, perception, screenshots golden). **Commit `71f7378`** : fix overlap badge Chaud/Raison sociale /prospection — finding détecté via screenshot golden v5 mobile (cause : cellule TEMP w-[18%]=70px - 32px padding = 38px utile pour badge ~60px, débordement intrinsèque). Rebalance widths mobile : TEMP 18→28%, RAISON SOCIALE 50→42%, STATUT 32→30% + `overflow-hidden` garde-fou. Re-screenshot prod confirmé clean. **17/17 audits Playwright verts post-fix**. **Test PWA stale-cache** : validé objectivement par lecture du SW (cache-first sur assets versionnés, network sur HTML) + test runtime (HTML pas servi par SW) → 0 risque stale-cache HTML par design, install PWA manuel non nécessaire. **Mémoire créée** : `project_prospection_mobile_density_redesign.md` (chantier post-V1, ~3h MIXTE, 4 questions cadrage à trancher). Vitest 365/365, build OK.)
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** Session 126 (CRM + meta `~/.claude`, 2026-04-28, `/effort xhigh`). **2 chantiers livrés successivement** : (A) Refonte densité /prospection mobile (commit `958f58c` push origin/main + golden v6 mobile + 18/18 Playwright verts) puis (B) Harmonisation PDF FilmPro (création `pdf-shared` lib partagée i18n+engine, skill `filmpro-pdf` WeasyPrint + charte `charte-pdf-filmpro`, dépréciation `filmpro-pdf-lite`, migration `playbook-pdf` vers shared sans régression). Détail chantier (A) suit ; chantier (B) en « Livré cette session » §1. **Refonte densité /prospection mobile (Bloc 1 post-V1) livrée**, 1 commit `958f58c` push origin/main + mémoire mise à jour LIVRÉ + golden v6 mobile généré 8 routes. **Cadrage validé Pascal en bloc** : Q1 cartes raccourcis → compteurs inline mobile (`66 prospects · 66 enrichis · 0 qualifiés · 0 convertis`) + cartes desktop conservées via `md:hidden`/`hidden md:grid`. Q2 filtres → bouton « Filtres » mobile avec badge `activeFilterCount` + drawer collapsible (`aria-expanded` + `aria-controls`) / grid permanent desktop. Q3 « Créer une alerte » → kebab menu mobile (consolidé avec « Mes recherches » et « Enrichir cette page »), bouton standalone desktop. Q4 recherche → `sticky top-0 z-20 bg-white rounded-t-xl` ajouté à DataTable comme garde-fou (search déjà visible par design hors overflow scroll, sticky blinde le comportement futur). **Pattern consolidé** : kebab menu avec `bind:this={mobileMenuRef}` + `$effect` outside-click handler + `role="menuitem"` sur items. **Tests** : Vitest 365/365 ✓, Playwright mobile prod iPhone 14 Pro Max **18/18 verts** dont nouveau test #11 « Prospection densité mobile : 1re ligne table à moins de 400px du top » (mesure `firstRow.getBoundingClientRect().top + window.scrollY < 400`). **icon-map** : ajout `more_vert: MoreVertical` + `expand_less: ChevronUp`. **Golden** : v5 mobile restauré depuis commit `95eed00` (pré-refonte), v6 mobile généré post-refonte (8 routes, prospection.png 264K). **Build SvelteKit OK**. Cible <400px atteinte (était ~600px). Mémoire mise à jour `project_prospection_mobile_density_redesign.md` (LIVRÉ). MEMORY.md index mis à jour.
**Session -1 :** Session 125 (CRM, 2026-04-28, `/effort xhigh`). **3 commits push origin/main + 1 mémoire créée + 8 screenshots golden v5 mobile + V1 mobile officiellement clos**. **Phase 1 — Quick wins Lighthouse** (commit `d2fa0fb`) : font DM Sans self-hosted via `@fontsource-variable/dm-sans` (élimine render-blocking Google Fonts CSS, suppression `<link>` `fonts.googleapis.com` + CSP nettoyée) + lien `/reporting` ajouté dans `navigation.secondary` (page existait déjà Lighthouse 0.97 S124, manquait l'entrée nav). **Phase 2 — Décision /dig [B] hybride pragmatique** : règle S123 (DevTools manuel obligatoire) précisée — Playwright `devices['iPhone 14 Pro Max']` engine Chromium (DPR 3, UA Safari iOS, isMobile, hasTouch) AUTORISÉ pour findings OBJECTIFS (overflow, dimensions, DOM, réseau) ; DevTools manuel reste obligatoire pour findings QUALITATIFS (rendu visuel, perception, screenshots golden, reflow). **Phase 3 — Infra Playwright mobile contre prod** (commit `eee53f7`) : `playwright.mobile.config.ts` + `tests/auth-setup.ts` (login OTP manuel 1 fois → cookies session 7j dans `tests/.auth.json` gitignored) + `tests/mobile.spec.ts` (17 audits objectifs) + `npm run test:mobile`. Découverte de WebKit binaire requis pour codegen ; bug syntaxe coller-coller `--device=` espace mangé. Auth-setup.ts script alternatif plus fiable que codegen. **Phase 4 — Audits objectifs validés en prod** (17/17) : 8 pages 0 overflow horizontal × `/reporting` SVG widths ≤ parent (re-validation Session C P1-3) × `/prospection` table ≤ wrapper + Temp. abrégé md (re-validation Session C) × Sidebar Reporting visible × Boutons modale d'action ≥ 44px sur 5 routes × Dashboard 4 raccourcis ≥ 44px × Dashboard reflow grid cartes (≤ viewport + 0 overlap vertical) × SW enregistré + cache versionné `filmpro-crm-cache-{version}` + HTML PAS servi par SW × 0 requête `fonts.googleapis.com` (font self-host validé runtime). **Phase 5 — Bug overlap badge** (commit `71f7378`) : finding détecté via screenshot golden v5 mobile `/prospection` — badge "Chaud" débordait cellule TEMP (w-[18%] = 70px - 32px padding = 38px utile, badge ~60px). Rebalance widths mobile : TEMP 18→28%, RAISON SOCIALE 50→42%, STATUT 32→30% + `overflow-hidden` cellules TEMP/STATUT en garde-fou. Re-test post-Vercel `Ready` : 17/17 verts confirmés. **Test SW PWA stale-cache** : validé objectivement par lecture code SW (cache-first assets versionnés, network HTML) + test runtime (HTML jamais servi par SW) → 0 risque stale-cache HTML par design, install PWA manuel inutile. **Phase 6 — Refonte densité /prospection** identifiée par Pascal sur screenshot golden v5 mobile (~600px scroll avant 1re ligne table, 4 cartes raccourcis + 4 filtres + bouton alerte + recherche redondants). Reco : bloc post-V1 dédié, pas patch en clôture V1. Mémoire créée : `project_prospection_mobile_density_redesign.md` (4 questions cadrage, ~3h MIXTE). Notes archivées vers `archive/notes/audit-mobile-v1-session-A/` et `audit-mobile-v1-session-D/`. Vitest 365/365, build OK. Bundle splitting `vkJhLX8M.js` 211KiB 76% inutilisé reste différé post-V1.
**Session -2 :** Session 124 (CRM, 2026-04-28, `/effort xhigh`). 2 commits push `82a083a` + `587a658`. Lighthouse mobile prod 9 pages via Chrome DevTools Lighthouse 13 manuel Pascal — `archive/notes/audit-mobile-v1-session-D/lighthouse/summary.tsv` canonique. 3 findings systémiques : render-blocking Google Fonts CSS -600/-1250ms LCP 8 pages, unused JS `vkJhLX8M.js` 211KiB 76% non exécuté, TBT/CLS=0 partout. Items code Session D livrés : ModalForm min-h-11 + DataTable shortLabel + /prospection "Temp." abrégé md + Dashboard 4 raccourcis h-11 + sweep boutons modale custom 4 routes + Sidebar logout/réduire + watcher Vercel post-push (Bloc 1b livré) + helper Lighthouse. Synthèse `memory/project_lighthouse_mobile_synthesis_s124.md`.
**Session -3 :** Session 123 (CRM, 2026-04-27, `/effort xhigh`). 1 commit push `c46220c`. Session C V1 mobile : fix P1-3 chart SVG /reporting + fix /prospection table 46px + audits /veille /signaux 0 overflow. Règle inscrite globale tests mobile DevTools manuel obligatoire.
**Session -4 :** Session 122 (CRM, 2026-04-27, `/effort xhigh`). 8 commits push. Sessions A+B livrées + déblocage build prod 24h cassé (fix backtick prompt.ts:47).
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

**`/start` à la racine AppFactory = scope CRM FilmPro** (slug=appfactory, subproject=crm). Affiche les tâches `transmitted` du sous-projet CRM uniquement. Formation IA a sa propre entrée au menu terminal `cc` (cd formation-ia/ → /start scope Formation IA). Source : `~/.claude/cockpit/projets/appfactory/entries.jsonl` filtré par subproject.

**Extensibilité pédago** (Formation IA) : l'ingestion d'une deep research markdown (marketing aujourd'hui, opération/commercial/autres demain) suit un workflow conversationnel Claude Code CLI piloté par **Opus 4.6**. Règles pédago dans `formation-ia/docs/PEDAGOGIE.md`, protocole d'ingestion dans `formation-ia/docs/INGESTION.md`.

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

**Prochaine attaque** : Bloc 2 Fix bandeau navy WeasyPrint dernière page courte (~30 min, EXÉCUTABLE). Bug post-V1 isolable identifié S126 lors livraison skill `filmpro-pdf`. Bloc 1 cron veille BLOQUÉ ≥01/05, Bloc 3 dashboard coûts BLOQUÉ session dédiée. Refonte densité /prospection mobile livrée S126 commit `958f58c`. Harmonisation PDF FilmPro livrée S126 (skill `filmpro-pdf` créé, `pdf-shared` lib, `filmpro-pdf-lite` déprécié).

### 1. Évaluation cron veille 01/05 + validation pipeline Veille→Prospection [SUPERVISÉ • low • ~15 min]

**Pourquoi** : double validation gratuite. (1) La refonte LEAN S112 (commit `83fd7fd`) avec hot-fix bias géo SR n'a jamais été re-testée API. (2) L'intégration Veille→Prospection livrée S120 (commit `9df286e`) sera exercée pour la 1re fois en prod par ce cron : surveiller logs Vercel ligne `[veille→prospection] report 2026-W18 : N signal(s) lié(s), M lead(s) recalculé(s)`.
**Prérequis** : être ≥ 2026-05-01, email cron reçu sur `pascal@filmpro.ch` ou consultation /veille + accès logs Vercel.

- [ ] **[BLOQUÉ - date ≥ 2026-05-01]** Lire l'édition W18 reçue par email + sur /veille. Critères veille : (1) ≥1 item Suisse romande rangs 1-3, (2) sources crédibles, (3) anti-doublons W16/W17, (4) compliance_tag cohérent, (5) volume 5-10 items. Critères Veille→Prospection (S120) : (a) hook `applySignalsFromReport` dans logs Vercel sans exception, (b) éventuels leads existants matchés voient `score_pertinence` mis à jour. → voir `memory/project_veille_S112_apprentissages.md` et `memory/project_veille_prospection_integration_s120.md`
- [ ] **[BLOQUÉ - validation Pascal cron 01/05]** Drop stash `stash@{0}` (`git stash drop stash@{0}`) une fois la refonte LEAN considérée stable. Le stash contenait des éléments S110 chantier B déjà intégrés ou écartés.

### 2. Fix bandeau navy WeasyPrint dernière page courte [EXÉCUTABLE • medium • ~30 min]

**Pourquoi** : bug détecté S126 lors validation du nouveau skill `filmpro-pdf` sur la fixture `crm-point-etape-2026-04-23.json` : le bandeau navy bas (`@bottom-left` + `@bottom-right` 50%/50%) ne s'affiche pas sur la dernière page si elle a peu de contenu. Cause : WeasyPrint ne rend pas les `@bottom-*` margin-boxes quand le contenu n'atteint pas la zone bottom de la page. Reporté post-V1 du chantier B (Harmonisation PDF FilmPro).
**Prérequis** : aucun.

- [ ] **[EXÉCUTABLE]** Investiguer 2 pistes : (a) forcer `min-height: 100vh` sur `.doc-page` pour garantir que la page atteint la zone bottom, (b) utiliser `position: running(name)` + `@bottom-center { content: element(name) }` pour un bandeau natif WeasyPrint indépendant du contenu. Tester sur la fixture `~/.claude/skills-library/filmpro-pdf/fixtures/crm-point-etape-2026-04-23.json` avec dernière page courte. Validation : bandeau navy visible sur 100% des pages content. Re-générer baseline `fixtures/baseline/`. → voir `memory/project_filmpro_pdf_harmonization.md` § « Bug post-V1 connu ».

### 3. Dashboard coûts CRM [BLOQUÉ • high • session dédiée]

- [ ] **[BLOQUÉ - session dashboard dédiée]** Dashboard coûts CRM `/dashboard/couts` : table `cost_audit_runs` + graphique 12 sem + split cron/catégorie + seuils. → voir `memory/project_dashboard_costs_crm.md`

### Livré cette session (5 derniers)

- [x] ~~Harmonisation PDF FilmPro - migration WeasyPrint + consolidation pdf-shared (Bloc 1 ex)~~ - Fait 2026-04-28 (S126, xhigh) : nouvelle lib `~/.claude/skills-library/pdf-shared/` (i18n FR + engine WeasyPrint partagés), nouveau skill `~/.claude/skills-library/filmpro-pdf/` (FilmProDoc API : cover, section avec icône Lucide, kpi_grid, bullets, callout, quote barre accent, table), nouvelle charte autonome `~/.claude/design-system/charte-pdf-filmpro/` (tokens.css palette + components.css), `playbook-pdf` migré sur pdf_shared (régression 0 : example commandes_customs identique). `filmpro-pdf-lite` (reportlab) déprécié avec `disable-model-invocation: true` + header DEPRECATED 2026-04-28, conservé pour rollback. Fixture `crm-point-etape-2026-04-23.json` reproduit le PDF de référence (`/Users/pascal/Desktop/CRM_FilmPro_Point_etape_2026-04-23.pdf`) avec rendu pixel-proche : cover identique (logo blanc + titre Geologica + sous-titre + date sur fond `#152A45`), pages content avec sections H1 CAPS + icônes bleues, KPI grid 4 cartes, callout, quote barre accent, table 3 col. Bandeau bas navy full-width via @page margin-boxes 50%/50% + numéro page. Tests pytest `tests/test_smoke.py` 5/5 verts (import shared, normalize_fr typo, FilmProDoc import, build minimal, fixture complète). Baseline PDF générée dans `fixtures/baseline/`. Routing & CHARTES.md mis à jour. Bug post-V1 connu : bandeau navy absent sur dernière page courte (limite WeasyPrint sur @bottom-* sans contenu suffisant), reporté. Mémoire `project_filmpro_pdf_harmonization.md` passée en LIVRÉ.
- [x] ~~Refonte densité /prospection mobile (post-V1) - 4 questions cadrage tranchées + implémentation~~ - Fait 2026-04-28 (S126, high) commit `958f58c` : Q1 compteurs inline mobile + cartes desktop, Q2 filtres collapsibles drawer + badge compteur mobile / grid permanent desktop, Q3 kebab menu mobile (Mes recherches + Enrichir + Créer alerte) / boutons standalone desktop, Q4 sticky search DataTable garde-fou. Test:mobile étendu (test #11 « 1re ligne table <400px »). Golden v6 mobile généré (8 routes). 18/18 verts Playwright iPhone 14 Pro Max contre prod. icon-map : ajout `more_vert` (MoreVertical) + `expand_less` (ChevronUp). Vitest 365/365. Mémoire mise à jour `project_prospection_mobile_density_redesign.md` (LIVRÉ).
- [x] ~~V1 MOBILE CLOS — quick wins perf + infra Playwright mobile + fix overlap badge + golden v5 mobile (Bloc 1)~~ - Fait 2026-04-28 (S125, xhigh) : 3 commits push origin/main + 1 mémoire créée + 8 screenshots golden v5 mobile. **Commit `d2fa0fb`** : font DM Sans `@fontsource-variable/dm-sans` self-hosted (élimine render-blocking Google Fonts, gain estimé -600 à -1250ms LCP) + CSP nettoyée + lien `/reporting` dans `navigation.secondary` (page existait déjà mais manquait dans config nav). **Commit `eee53f7`** : infra Playwright mobile contre prod — `playwright.mobile.config.ts` + `tests/auth-setup.ts` (login OTP 1 fois → cookies session 7j dans `.auth.json` gitignored) + `tests/mobile.spec.ts` (17 audits objectifs : 8 pages × 0 overflow, sidebar Reporting, /reporting SVG, /prospection table+Temp., 5 routes boutons modale ≥44px, Dashboard 4 raccourcis ≥44px, screenshots full-page golden v5 mobile, Dashboard reflow, SW cache, 0 fonts.googleapis) + `npm run test:mobile`. **Décision /dig [B] hybride pragmatique** : Playwright `devices` preset autorisé pour findings OBJECTIFS, DevTools manuel reste obligatoire pour QUALITATIFS. **Commit `71f7378`** : fix overlap badge Chaud /prospection détecté via screenshot golden v5 mobile (cellule TEMP w-[18%] = 70px - 32px padding = 38px utile, badge ~60px → débordement). Rebalance widths mobile : TEMP 18→28%, RAISON SOCIALE 50→42%, STATUT 32→30% + `overflow-hidden` garde-fou. 17/17 verts post-fix. **Test SW PWA stale-cache** : validé objectivement (cache-first assets versionnés + network HTML → 0 risque par design). **Refonte densité /prospection** identifiée par Pascal (~600px scroll mobile redondant) → bloc post-V1 dédié, mémoire `project_prospection_mobile_density_redesign.md` créée. Notes `audit-mobile-v1-session-A/` et `audit-mobile-v1-session-D/` archivées vers `archive/notes/`. Vitest 365/365, build OK.
- [x] ~~Lighthouse mobile prod 9 pages + items code Session D + Bloc 1b watcher~~ - Fait 2026-04-28 (S124, xhigh) : 2 commits push `82a083a` + `587a658`. Lighthouse via Chrome DevTools manuel Pascal, summary.tsv canonique. 3 findings systémiques : render-blocking Google Fonts -600/-1250ms LCP 8 pages, unused JS `vkJhLX8M.js` 211KiB 76% non exécuté, TBT/CLS=0. Items code livrés : ModalForm min-h-11 + DataTable shortLabel + /prospection "Temp." abrégé md + Dashboard 4 raccourcis h-11 + sweep boutons modale 4 routes + Sidebar + watcher Vercel post-push (Bloc 1b livré) + helper Lighthouse.
- [x] ~~Bloc 6 Harmonisation PDF FilmPro débloqué (G4 méta)~~ - Fait 2026-04-27 (xhigh) : retrait du prérequis archi FilmPro. Justification : décision FilmPro shared-assets ne touche que les assets, pas la stack PDF.
- [x] ~~CRM mobile V1 Session C livrée + règle globale tests mobile DevTools manuel~~ - Fait 2026-04-27 (S123, xhigh) : 1 commit `c46220c`. Fix P1-3 /reporting chart SVG (viewBox + width 100% + PAR xMinYMid meet) + fix /prospection table 46px (widths somme=100%) + audits /veille /signaux 0 overflow. Règle inscrite globale tests mobile DevTools manuel obligatoire.
- [x] ~~CRM mobile V1 Sessions A+B + déblocage build prod~~ - Fait 2026-04-27 (S122, xhigh) : 6 commits. Découverte critique : builds Vercel ERROR 24h+ (root cause backtick non échappé prompt.ts:47 S120). 8 fixes mobile P0+P1+P2 confirmés post-deploy.
