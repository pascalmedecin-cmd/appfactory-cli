# AppFactory : CLAUDE.md

**Statut :** Phase C, V2 mobile terrain Session α LIVRÉE (S127) - F1 photos chantier sur leads + entreprises en prod. V1 MOBILE CLOS (S125), refonte densité /prospection (S126), skill `filmpro-pdf` (S126). Formation IA = sous-projet autonome dans `formation-ia/`, `cc` option 2.
**Derniere mise a jour :** 2026-04-30 (S127 CRM xhigh : V2 mobile Session α livrée - F1 photo bâtiment intégrée à un lead/entreprise. Migration prod 2 tables + bucket Storage Private + composant PhotoGallery (capture + compression + galerie + lightbox) + intégrations LeadSlideOut/EntrepriseSlideOut. 3 commits `e3e2022` + `c5614c0` + `b02d108`. security-auditor 0 H/C. Vitest 365/365, Playwright mobile 23/23. QA terrain iPhone Pascal validée).
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** Session 127 (CRM, 2026-04-30, `/effort xhigh`).
**Sessions précédentes (condensé)** - détail S122-S125 : `archive/2026-04-28-sessions.md`. Détail S78-S79 : `archive/decisions-sessions-78-79.md`. Détail S70-S77 : `archive/decisions-sessions-70-77.md`. Détail S80-S107 : `formation-ia/CLAUDE.md` (sous-projet autonome).

- **S125** (CRM, 2026-04-28) : V1 MOBILE CLOS. 3 commits `d2fa0fb` + `eee53f7` + `71f7378`. Font DM Sans self-hosted, infra Playwright mobile contre prod (17/17 verts), fix overlap badge /prospection.
- **S124** (CRM, 2026-04-28) : Lighthouse mobile prod 9 pages + items code Session D. 2 commits `82a083a` + `587a658`.
- **S123** (CRM, 2026-04-27) : Session C V1 mobile - fix P1-3 chart SVG /reporting + fix /prospection table 46px. Commit `c46220c`.
- **S122** (CRM, 2026-04-27) : Sessions A+B + déblocage build prod 24h. 8 commits.
- **S105** (formation-ia, 2026-04-20) : refonte roadmap V2 + Bloc 0 Pipeline images Phase 1-4 livré. 7 commits.
- **S104** (formation-ia, 2026-04-19) : refonte T9 multi-select libre + modal conflit retrait.
- **S103** (formation-ia, 2026-04-19) : T5 ThemeCardPlaceholder + T9 initial.
- **S102** (formation-ia, 2026-04-18) : T8 `[VALIDÉ]` règle « Livrable fermé » + page emplacements.
- **S101** (formation-ia, 2026-04-18) : T8 Cockpit vidéos v1+v2 livré prod.
- **S100** (formation-ia, 2026-04-18) : groupe dette 1D (a11y 9→0 axe-core).
- **S99** (formation-ia, 2026-04-18) : T7 Pack 2 V2.
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
- Sessions 122-125 (CRM, V1 mobile) : Lighthouse + Playwright mobile + V1 MOBILE CLOS → `archive/2026-04-28-sessions.md`
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

**Prochaine attaque** : Bloc 3 V2 mobile Session β - F2 géoloc visite RDV (~1.5h, EXÉCUTABLE, momentum F1 fort). Reprend cadrage S127 verrouillé (Option A PWA poussée, principe Linear V1 préservé). Bloc 2 fix bandeau navy WeasyPrint reste EXÉCUTABLE 30 min mais hors momentum V2. Bloc 1 cron veille BLOQUÉ ≥01/05. V2 Session α F1 photos livrée S127 (3 commits, prod live, QA terrain validée).


<!-- BEGIN CONSOLIDATION (auto-géré par cockpit, ne pas éditer) -->

### Consolidation cockpit (maj 2026-04-30T06:40:42)

**Blocs actionnables** (ordre d'attaque) :

- **Bloc #2** - CRM mobile terrain (refonte structurelle) (6h, confiance Faible)
  - Objectif : Concevoir et implémenter CRM mobile comme outil terrain, au-delà du responsive
  - CRM mobile : vraie version terrain

- **Bloc #3** - Fix bandeau navy WeasyPrint dernière page (0.5h, confiance Élevé)
  - Objectif : Bandeau navy visible sur 100% des pages content, y compris dernière page courte
  - Investiguer 2 pistes : (a) forcer min-height: 100vh sur .doc-page pour garantir que la page atteint la zone bottom, (b) utiliser position: running(name) + @bottom-center { content: element(name) } pou

- **Bloc #4** - Quick wins UX /prospection + /aide (2h, confiance Élevé)
  - Objectif : 3 fixes UX rapides : retirer ? cassés, sélection globale, ouvrir aide nouvel onglet
  - Ouvrir la page aide dans un nouvel onglet
  - Retirer les "?" dans l'en-tête du tableau /prospection
  - Sélection globale prospection

- **Bloc #5** - Refonte aide + layout Veille (contenu + UI) (5h, confiance Moyen)
  - Objectif : Audit 360 + refonte rubrique aide CRM et refonte layout page Veille sectorielle
  - Mise à jour rubrique aide CRM FilmPro
  - Refonte layout page Veille sectorielle CRM FilmPro

**Blocs bloqués** :

- **Bloc B1** [BLOQUÉ] - Validation cron veille W18 + cleanup stash (0.5h)
  - Objectif : Valider édition veille W18 + pipeline Veille→Prospection puis drop stash devenu obsolète
  - Blocage : Dépend de l'envoi du cron veille programmé ≥ 2026-05-01 (date ultérieure fixée)
  - Débloque si : Réception email cron W18 le 2026-05-01 + validation pipeline OK
  - Lire l'édition W18 reçue par email + sur /veille. Critères veille : (1) ≥1 item Suisse romande rangs 1-3, (2) sources crédibles, (3) anti-doublons W16/W17, (4) compliance_tag cohérent, (5) volume 5-10
  - Drop stash stash@{0} (git stash drop stash@{0}) une fois la refonte LEAN considérée stable. Le stash contenait des éléments S110 chantier B déjà intégrés ou écartés.

<!-- END CONSOLIDATION -->

### 1. Évaluation cron veille 01/05 + validation pipeline Veille→Prospection [SUPERVISÉ • low • ~15 min]

**Pourquoi** : double validation gratuite. (1) La refonte LEAN S112 (commit `83fd7fd`) avec hot-fix bias géo SR n'a jamais été re-testée API. (2) L'intégration Veille→Prospection livrée S120 (commit `9df286e`) sera exercée pour la 1re fois en prod par ce cron : surveiller logs Vercel ligne `[veille→prospection] report 2026-W18 : N signal(s) lié(s), M lead(s) recalculé(s)`.
**Prérequis** : être ≥ 2026-05-01, email cron reçu sur `pascal@filmpro.ch` ou consultation /veille + accès logs Vercel.

- [ ] **[BLOQUÉ - date ≥ 2026-05-01]** Lire l'édition W18 reçue par email + sur /veille. Critères veille : (1) ≥1 item Suisse romande rangs 1-3, (2) sources crédibles, (3) anti-doublons W16/W17, (4) compliance_tag cohérent, (5) volume 5-10 items. Critères Veille→Prospection (S120) : (a) hook `applySignalsFromReport` dans logs Vercel sans exception, (b) éventuels leads existants matchés voient `score_pertinence` mis à jour. → voir `memory/project_veille_S112_apprentissages.md` et `memory/project_veille_prospection_integration_s120.md`
- [ ] **[BLOQUÉ - validation Pascal cron 01/05]** Drop stash `stash@{0}` (`git stash drop stash@{0}`) une fois la refonte LEAN considérée stable. Le stash contenait des éléments S110 chantier B déjà intégrés ou écartés.

### 2. Fix bandeau navy WeasyPrint dernière page courte [EXÉCUTABLE • medium • ~30 min]

**Pourquoi** : bug détecté S126 lors validation du nouveau skill `filmpro-pdf` sur la fixture `crm-point-etape-2026-04-23.json` : le bandeau navy bas (`@bottom-left` + `@bottom-right` 50%/50%) ne s'affiche pas sur la dernière page si elle a peu de contenu. Cause : WeasyPrint ne rend pas les `@bottom-*` margin-boxes quand le contenu n'atteint pas la zone bottom de la page. Reporté post-V1 du chantier B (Harmonisation PDF FilmPro).
**Prérequis** : aucun.

- [ ] **[EXÉCUTABLE]** Investiguer 2 pistes : (a) forcer `min-height: 100vh` sur `.doc-page` pour garantir que la page atteint la zone bottom, (b) utiliser `position: running(name)` + `@bottom-center { content: element(name) }` pour un bandeau natif WeasyPrint indépendant du contenu. Tester sur la fixture `~/.claude/skills-library/filmpro-pdf/fixtures/crm-point-etape-2026-04-23.json` avec dernière page courte. Validation : bandeau navy visible sur 100% des pages content. Re-générer baseline `fixtures/baseline/`. → voir `memory/project_filmpro_pdf_harmonization.md` § « Bug post-V1 connu ».

### 3. V2 mobile terrain Session β - F2 géoloc visite RDV [EXÉCUTABLE • xhigh • ~1.5h]

**Pourquoi** : suite Session α F1 livrée S127 (photos chantier). F2 géoloc visite = capture GPS au check-in RDV avec écart vs adresse Zefix (info, pas blocage). Cadrage figé dans `docs/SPECS_CRM_MOBILE_V2.md` (verrouillé S127 Option A PWA poussée, principe Linear V1 préservé). Migration DB déjà appliquée prod (table `prospect_visits` créée S127 même migration que `prospect_photos`).
**Prérequis** : aucun (DB et bucket Storage déjà en place depuis Session α).

- [ ] **[EXÉCUTABLE]** Composant `CheckInButton.svelte` avec permission `navigator.geolocation` + insertion `prospect_visits` (lat/lng/visited_at/user_id) + calcul distance Haversine vs adresse Zefix entreprise (flag info si écart > 100m, pas blocage workflow) + affichage historique visites dans la fiche (LeadSlideOut + EntrepriseSlideOut). Fallback adresse manuelle si user refuse permission. Tests Playwright mobile (mock `navigator.geolocation`). RISQUE OUVERT à propager : RLS GPS visites permissive identique F1. → voir `docs/SPECS_CRM_MOBILE_V2.md` § F2 + `memory/project_v2_mobile_terrain_session_alpha.md` § Décisions design.

### 4. V2 mobile terrain Session γ - F3 lead express + F4 pipeline rapide + tests + golden v7 [EXÉCUTABLE • xhigh • ~2h]

**Pourquoi** : derniers 2 features V2 mobile terrain. F3 = modale 4 champs <30 sec post-RDV. F4 = bouton « étape suivante » sur fiche entreprise/lead (2 taps max). Clôture V2.
**Prérequis** : Session β F2 livrée (mêmes intégrations LeadSlideOut/EntrepriseSlideOut).

- [ ] **[BLOQUÉ - Session β F2 livrée]** Modale `LeadExpress.svelte` (nom + tel + entreprise + note) + bouton sticky dashboard et /prospection mobile. Composant `PipelineQuickAdvance.svelte` (étape suivante + mini-modale next action, optimistic UI avec rollback Supabase). Tests Playwright mobile pour F3+F4. Golden v7 mobile screenshots (430×932 iPhone 14 Pro Max). → voir `docs/SPECS_CRM_MOBILE_V2.md` § F3 + F4.

### 5. Dashboard coûts CRM [BLOQUÉ • high • session dédiée]

- [ ] **[BLOQUÉ - session dashboard dédiée]** Dashboard coûts CRM `/dashboard/couts` : table `cost_audit_runs` + graphique 12 sem + split cron/catégorie + seuils. → voir `memory/project_dashboard_costs_crm.md`

### Livré cette session (5 derniers)

- [x] ~~V2 mobile terrain Session α - F1 photos chantier sur leads + entreprises~~ - Fait 2026-04-30 (S127, xhigh) : 3 commits push origin/main `e3e2022` + `c5614c0` + `b02d108`. **Migration prod** (psql via libpq, password DB Pascal one-shot) : 2 tables `prospect_photos` + `prospect_visits` (FK XOR lead/entreprise, types ajustés `entreprise_id TEXT` car schéma legacy) + 4 storage policies bucket Private `prospect_photos` (créé par Pascal UI Dashboard). **API REST** : `GET /api/photos?lead_id|entreprise_id=X` (liste + signed URLs 1h), `POST` (multipart, magic bytes anti MIME spoofing JPEG/PNG/WebP/HEIC, validation existence parent, whitelist ext stricte basée magic bytes, rate limit 10/min via hooks.server.ts), `DELETE /api/photos/[id]` (RISQUE OUVERT documenté : tout fondateur peut supprimer, validé Pascal Q2 « tous voient tout »). **Composant** `PhotoGallery.svelte` réutilisable : capture iOS native (sans `capture` attribute pour proposer galerie + appareil photo), compression canvas si > 2 Mo (max 1920px), galerie 3 cols + lightbox + ConfirmModal suppression, corbeille toujours visible (pas hover-only). **Intégrations** : LeadSlideOut (/prospection) + entreprises +page.svelte. **Icônes Lucide** ajoutées (camera, image, image_plus, images). **6 tests Playwright mobile** (PhotoGallery présence dans 2 SlideOuts + 4 tests API endpoints). **Sécurité** : security-auditor 0 High/Critical après fixes (4 High résolus + 5 Medium + 3 Low corrigés ; 2 RISQUE OUVERT documentés pour 3 fondateurs symétriques). **Specs** : `docs/SPECS_CRM_MOBILE_V2.md` + `.html` + `_MOCKUPS.html` (4 features F1-F4 maquettées). **Cadrage S127** : Option A retenue (PWA poussée principe Linear V1 préservé), note vocale + offline queue retirées définitivement (pas même V3+). Vitest 365/365, Playwright mobile 23/23 (1 skip = pas d'entreprise prod), build OK. QA terrain Pascal validée iPhone réel (capture + galerie + lightbox + suppression). Mémoire `project_v2_mobile_terrain_session_alpha.md` créée.
- [x] ~~Harmonisation PDF FilmPro - migration WeasyPrint + consolidation pdf-shared (Bloc 1 ex)~~ - Fait 2026-04-28 (S126, xhigh) : nouvelle lib `~/.claude/skills-library/pdf-shared/` (i18n FR + engine WeasyPrint partagés), nouveau skill `~/.claude/skills-library/filmpro-pdf/` (FilmProDoc API : cover, section avec icône Lucide, kpi_grid, bullets, callout, quote barre accent, table), nouvelle charte autonome `~/.claude/design-system/charte-pdf-filmpro/` (tokens.css palette + components.css), `playbook-pdf` migré sur pdf_shared (régression 0 : example commandes_customs identique). `filmpro-pdf-lite` (reportlab) déprécié avec `disable-model-invocation: true` + header DEPRECATED 2026-04-28, conservé pour rollback. Fixture `crm-point-etape-2026-04-23.json` reproduit le PDF de référence (`/Users/pascal/Desktop/CRM_FilmPro_Point_etape_2026-04-23.pdf`) avec rendu pixel-proche. Tests pytest 5/5 verts. Baseline PDF générée. Bug post-V1 connu : bandeau navy absent sur dernière page courte, reporté. Mémoire `project_filmpro_pdf_harmonization.md` passée en LIVRÉ.
- [x] ~~Refonte densité /prospection mobile (post-V1) - 4 questions cadrage tranchées + implémentation~~ - Fait 2026-04-28 (S126, high) commit `958f58c` : Q1 compteurs inline mobile + cartes desktop, Q2 filtres collapsibles drawer + badge compteur mobile / grid permanent desktop, Q3 kebab menu mobile / boutons standalone desktop, Q4 sticky search DataTable garde-fou. Test:mobile étendu. Golden v6 mobile généré (8 routes). 18/18 verts Playwright iPhone 14 Pro Max contre prod. Vitest 365/365.
- [x] ~~V1 MOBILE CLOS — quick wins perf + infra Playwright mobile + fix overlap badge + golden v5 mobile (Bloc 1)~~ - Fait 2026-04-28 (S125, xhigh) : 3 commits `d2fa0fb` + `eee53f7` + `71f7378`. Font DM Sans self-hosted (élimine render-blocking Google Fonts), infra Playwright mobile contre prod (17/17 verts), fix overlap badge /prospection. Décision /dig [B] hybride pragmatique : Playwright `devices` preset autorisé pour findings OBJECTIFS, DevTools manuel pour QUALITATIFS.
- [x] ~~Lighthouse mobile prod 9 pages + items code Session D + Bloc 1b watcher~~ - Fait 2026-04-28 (S124, xhigh) : 2 commits `82a083a` + `587a658`. Lighthouse via Chrome DevTools manuel Pascal. 3 findings systémiques : render-blocking Google Fonts -600/-1250ms LCP 8 pages, unused JS `vkJhLX8M.js` 211KiB 76% non exécuté.
