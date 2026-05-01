# AppFactory : CLAUDE.md

**Statut :** Phase C, refonte /prospection phases 0+1 LIVRÉE (S134 2026-05-01 xhigh autonome) avec scoring fix bimodalité préalable + charte v7 propagée. V2 mobile terrain CLOS (S127 α + S129 β + S130 γ). V1 MOBILE CLOS (S125). Formation IA = sous-projet autonome dans `formation-ia/`, `cc` option 2.
**Derniere mise a jour :** 2026-05-01 (S134 CRM xhigh autonome : refonte /prospection phases 0+1 + scoring fix bimodalité + charte v7. 4 commits `f195b95` + `bb7fdf4` + `ecf9907` + `e71d56b`. Composants nouveaux ScorePill / TriageQueue / ActionButton / Indicateurs flat. Migration `triage_snoozed_until` appliquée prod par Pascal. 5 audits subagents tous traités no-debt. vitest 406/406, build prod 11s, Vercel deploy READY 38s, smoke test prod HTTP 200).
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** Session 134 (CRM, 2026-05-01, `/effort xhigh`).
**Sessions précédentes (condensé)** - détail S122-S125 : `archive/2026-04-28-sessions.md`. Détail S78-S79 : `archive/decisions-sessions-78-79.md`. Détail S70-S77 : `archive/decisions-sessions-70-77.md`. Détail S80-S107 : `formation-ia/CLAUDE.md` (sous-projet autonome).

- **S134** (CRM, 2026-05-01) : Refonte /prospection phases 0+1 + scoring fix bimodalité + charte v7. 4 commits push origin/main. Composants nouveaux : ScorePill (pill sémantique Linear Priority + glyphe Lucide flame/target/eye, tags "Prioritaire / À qualifier / Faible signal"), TriageQueue (widget dashboard inbox du matin, bandeau primary-dark + ornements cercles cohérent /veille S132), ActionButton (Notion-style icône colorée discrète au repos, hover spring physics), Indicateurs flat (3 cartes header avec icône Lucide pastille radiale). Migration SQL `triage_snoozed_until` + endpoint POST /api/prospection/triage/[action] avec concurrency guards 409 (queue partagée 3 fondateurs). Scoring : 3 bugs structurels fix (NFD strip accents + sourcesIntervention regbl + secteur_detecte propagation 6 sites), distribution prod 50(3-4)/16(9-10) → 50(6)/2(7)/12(8)/2(9). 5 audits subagents tous traités no-debt. vitest 406/406, build prod 11s. Mockup HTML autoportant validé Pascal après 8 itérations.
- **S130** (CRM, 2026-04-30) : V2 mobile Session γ - F3 LeadExpress + F4 PipelineQuickAdvance livrés. V2 MOBILE CLOS (4/4 features). 2 commits `17baabc` + `90c8878`. Modale 4 champs source 'lead_express' + dedup multi-passes + score=null + escapeIlike helper + composant pipeline stepper a11y + optimistic UI rollback. QA 360 multi-agents. 0 H/C.
- **S129** (CRM, 2026-04-30) : V2 mobile Session β F2 géoloc visite RDV livrée + extensions UX. 6 commits `680c94a` + `7362c5e` + `efac782` + `1624713` + `898ff87` + `38026af`. VisitsPanel + API /api/visits + géocodeur swisstopo + lien Google Maps + surface adresse parent + audit modaux/sidebars CRM (4 composants fixés clic extérieur). 0 H/C.
- **S128** (CRM, 2026-04-30) : Bloc 4 quick wins UX livré. 2 commits `49345c4` + `4671e35`. /aide nouvel onglet, fix racine "?" header tableaux (3 mappings icon-map manquants), sélection globale /prospection pattern Gmail/Notion + endpoint all-ids.
- **S127** (CRM, 2026-04-30) : V2 mobile Session α F1 photos chantier livrée. 3 commits `e3e2022` + `c5614c0` + `b02d108`. Migration 2 tables + bucket Private + PhotoGallery + intégrations 2 SlideOuts. 0 H/C.
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

**Prochaine attaque** : Bloc B1 - Validation cron veille W18 + cleanup stash (15 min, EXÉCUTABLE aujourd'hui car date 2026-05-01 atteinte). Court start qui ferme la dette LEAN S112 + valide la 1re run prod du pipeline Veille→Prospection (S120). Ensuite Phase 2 prospection (4-5h, MIXTE xhigh) : onglets par nature de signal pour traiter le pain "marchés publics noyés" (cf. plan post-Phase 0+1 livrée S134 2026-05-01).


<!-- BEGIN CONSOLIDATION (auto-géré par cockpit, ne pas éditer) -->

### Consolidation cockpit (maj 2026-04-30T18:39:56)

**Blocs bloqués** :

- **Bloc B1** [BLOQUÉ] - Validation cron veille W18 + cleanup stash (0.5h)
  - Objectif : Valider édition veille W18 + pipeline Veille→Prospection puis drop stash devenu obsolète
  - Blocage : Date ultérieure fixée ≥ 2026-05-01 (envoi cron veille programmé)
  - Débloque si : Réception email cron W18 le 2026-05-01 + validation pipeline
  - Lire l'édition W18 reçue par email + sur /veille. Critères veille : (1) ≥1 item Suisse romande rangs 1-3, (2) sources crédibles, (3) anti-doublons W16/W17, (4) compliance_tag cohérent, (5) volume 5-10
  - Drop stash stash@{0} (git stash drop stash@{0}) une fois la refonte LEAN considérée stable. Le stash contenait des éléments S110 chantier B déjà intégrés ou écartés.

<!-- END CONSOLIDATION -->

### 1. Validation cron veille W18 + cleanup stash [SUPERVISÉ • low • ~15 min]

**Pourquoi** : double validation gratuite. (1) La refonte LEAN S112 (commit `83fd7fd`) avec hot-fix bias géo SR n'a jamais été re-testée API. (2) L'intégration Veille→Prospection livrée S120 (commit `9df286e`) sera exercée pour la 1re fois en prod par ce cron : surveiller logs Vercel ligne `[veille→prospection] report 2026-W18 : N signal(s) lié(s), M lead(s) recalculé(s)`.
**Prérequis** : email cron W18 reçu sur `pascal@filmpro.ch` ou consultation /veille + accès logs Vercel. Date 2026-05-01 atteinte.

- [ ] **[EXÉCUTABLE]** Lire l'édition W18 reçue par email + sur /veille. Critères veille : (1) ≥1 item Suisse romande rangs 1-3, (2) sources crédibles, (3) anti-doublons W16/W17, (4) compliance_tag cohérent, (5) volume 5-10 items. Critères Veille→Prospection (S120) : (a) hook `applySignalsFromReport` dans logs Vercel sans exception, (b) éventuels leads existants matchés voient `score_pertinence` mis à jour. → voir `memory/project_veille_S112_apprentissages.md` et `memory/project_veille_prospection_integration_s120.md`
- [ ] **[BLOQUÉ - validation Pascal cron 01/05]** Drop stash `stash@{0}` (`git stash drop stash@{0}`) une fois la refonte LEAN considérée stable. Le stash contenait des éléments S110 chantier B déjà intégrés ou écartés.

### 2. Phase 2 prospection - onglets par nature de signal [MIXTE • xhigh • 4-5h]

**Pourquoi** : Phase 0+1 livrée S134 2026-05-01 a traité les pains 1 (inbox du matin) et 4 (trop de bruit). Phase 2 traite le pain 2 « marchés publics noyés » : 4 onglets distincts par nature de signal (Marchés publics SIMAP / Chantiers RegBL / Entreprises Zefix+search.ch / Terrain lead_express+veille). Chaque onglet a sa colonne signature (montant SIMAP, type travaux RegBL, date inscription Zefix, photos+visites Terrain).
**Prérequis** : Phase 0+1 livrée ✓ (commit `ecf9907` + `bb7fdf4` + `f195b95` + `e71d56b`). Mesure prod : 50 RegBL + 16 SIMAP, sources lead_express/zefix/search_ch/veille à 0 aujourd'hui mais alimentées par crons / saisie terrain à venir. Test taste-skill validé pour les nouveaux composants (cf. session S134).

- [ ] **[EXÉCUTABLE]** Cadrage Phase 2 onglets par nature : (1) trancher granularité (4 vs 3 onglets si volumes maigres - regrouper Entreprises+Terrain ?). (2) Définir onglets sticky vs dropdown selon viewport. (3) Colonne signature par onglet (montant SIMAP / type travaux RegBL / inscription Zefix / photos+visites Terrain). (4) Filtres internes par onglet (canton + statut + score restent globaux). (5) Onglet par défaut = SIMAP (signal le plus actionnable). (6) URL state via ?tab=simap pour partage. Implémentation MIXTE : démarrage cadrage SUPERVISÉ avec mockup HTML → bascule AUTO post-validation. → voir `memory/project_refonte_prospection_phase_0_1.md` § Phase 2 (à enrichir post-cadrage)

### 3. Phase 3 prospection - généalogie cross-pages [MIXTE • xhigh • 4-5h]

**Pourquoi** : pain 3 « fil perdu après transfert ». Restaurer le lien Veille → Lead → Entreprise → Opportunité via breadcrumb + encart « Origine ». Reporting 3 KPIs distincts au lieu d'un KPI flou.
**Prérequis** : Phase 2 livrée (sinon onglets pourraient changer la nav).

- [ ] **[BLOQUÉ - Phase 2 livrée]** Phase 3 généalogie : encart "Origine : lead X importé le DD/MM par Pascal, source Zefix CHE-xxx" sur fiche entreprise + opportunité. Breadcrumb "Veille édition W18 → Lead → Entreprise → Opportunité" sur fiche opportunité (facultatif). Reporting 3 KPIs : (a) leads transférés ce mois, (b) opportunités gagnées issues de leads, (c) valeur moyenne opportunité par source initiale. → voir `memory/project_refonte_prospection_phase_0_1.md` § Phase 3

### 4. Reconciliation yaml ↔ config CRM [AUTO • medium • ~45 min]

**Pourquoi** : dette pré-existante détectée par contracts-reviewer S134 2026-05-01. Le `yaml-to-config.ts` régénère config.ts depuis project.yaml mais les versions divergent : yaml a `LINDAS legacy` (jamais utilisé code), labels pipeline+signaux sans accents (`Negociation`/`Gagne`/`Demenagement`), navigation /aide sans `external: true`, /pipeline icon `filter_list` au lieu de `conversion_path`. Aujourd'hui config.ts = vérité Pascal-validée mais le prochain run script l'écrasera.
**Prérequis** : aucun. Décision tranchée : aligner yaml sur config.ts (préserver les améliorations validées).

- [ ] **[EXÉCUTABLE]** Aligner `template/project.yaml` sur `template/src/lib/config.ts` (vérité Pascal-validée) : (1) retirer `lindas` + activer `zefix` + ajouter `regbl` dans prospection.sources, (2) restaurer accents fr labels pipeline+signaux+source, (3) ajouter `external: true` sur navigation /aide, (4) `/pipeline` icon `conversion_path`. Lancer `npx tsx scripts/yaml-to-config.ts` après et diff = 0 ligne. Garde-fou : faire 1 commit chirurgical dédié pour pouvoir rollback simple si régression silencieuse en runtime.

### 5. Dashboard coûts CRM [BLOQUÉ • high • session dédiée]

- [ ] **[BLOQUÉ - session dashboard dédiée]** Dashboard coûts CRM `/dashboard/couts` : table `cost_audit_runs` + graphique 12 sem + split cron/catégorie + seuils. → voir `memory/project_dashboard_costs_crm.md`

### Livré cette session (5 derniers)

- [x] ~~Refonte /prospection phases 0+1 + scoring fix bimodalité + charte v7~~ - Fait 2026-05-01 (S134, xhigh) 4 commits push origin/main : `f195b95` (scoring fix) + `bb7fdf4` (phase 0) + `ecf9907` (phase 1) + `e71d56b` (charte v7). **Scoring (préalable bloquant)** : 3 bugs cumulés dans `calculerScore` causaient une bimodalité 50 leads à 3-4 / 16 à 9-10. Fixes structurels : (1) NFD strip via `normalize()` (matching keywords accents), (2) catégorie `sourcesIntervention: { points: 1, values: ['regbl'] }` distincte de `sourcesChaudes`, (3) lecture `secteur_detecte` en priorité avec fallback description, propagé dans 6 call sites. Distribution prod après ré-scoring : 50 (6) + 2 (7) + 12 (8) + 2 (9), continu. Queue triage `score>=5 AND statut=nouveau` : 0 → 23 leads. **Phase 0** : toggle "Afficher les transférés" off par défaut + URL persistant. Compteur "Enrichi" trompeur retiré + 4 cartes funnel décoratives → 3 indicateurs honnêtes (Leads actifs / Marchés publics ouverts / Transférés ce mois) avec icône Lucide pastille radiale + valeur 36px tabular-nums + micro-trend. Header colonne "Température" → "Priorité", header raison_sociale supprimé (pattern Linear). Composant `ScorePill.svelte` (pill sémantique avec glyphe Lucide flame/target/eye, tags "Prioritaire / À qualifier / Faible signal" remplacent "Chaud/Tiède/Froid", couleurs calibrées modernes #C0391A vs danger #D92D20 criard, variante --compact pour table dense, variante "Non scoré" pour leads non enrichis). Helper `formatLeadContext` 5 sources avec robustesse (montant=0 → n/d, description multi-line squashée + ellipsis, ages 0-90j). **Phase 1** : Migration SQL `triage_snoozed_until TIMESTAMPTZ` + index partiel + COMMENT. Endpoint `POST /api/prospection/triage/[action]` avec whitelist `TRIAGE_ACTIONS` exporté depuis `$lib/api/triage-actions.ts` (source unique partagée client+server), validation Zod UUID, concurrency guards 409 (queue partagée 3 fondateurs : SELECT statut + UPDATE atomique conditionnel `.eq('statut','nouveau')` + check count), anti-cumul snooze (rejette si déjà snoozé futur). Composant `TriageQueue.svelte` (grid 12 cols 280px aside primary-dark | 1fr corps, 2 ornements cercles, count tabular-nums 88px desktop, CTA "Voir N autres" subtil avec underline 1px, `<button>` natif a11y, animation cascade fadeUp 50ms). Boutons Notion-style 4 actions inline (icône colorée saturation 40% au repos, hover bg tinté + saturation max + translateY(-1px) + tinted shadow + spring physics, mobile full-width 44px HIG iOS + label visible via ::after). Loader dashboard avec dégradation gracieuse + log côté serveur si triageRes.error. **QA** : vitest 406/406 verts (33 nouveaux : 6 scoring fixes + 16 prospection-utils + 11 endpoint triage incl. concurrency 409 + cumul snooze). svelte-check 0 erreur sur fichiers modifiés. build prod 11s OK. Mock Supabase chainable thenable offline (zéro réseau, zéro quota Anthropic/Zefix/SIMAP/etc). **5 audits subagents tous traités no-debt** : security GO 0 H/C (3 Low fixés dont encodeURIComponent x2), bug-hunter 4 High → tous fixés (secteur_detecte propagé 4 sites manquants, concurrency 409, ScorePill nullable, log error dashboard) + M1 montant=0/M2 description squash/M3 cumul snooze, code-reviewer 2 BLOCKER → tous fixés (URL CTA cohérente sans `temp=chaud`, SNOOZE_DAYS centralisé via `config.scoring.triage`) + 8 IMPROVEMENT (helper setPending, regex \u escape, 4 tests fallback formatLeadContext, doc rescore script, button vs aside role=button), contracts 2 BLOCKER → tous fixés (yaml resync sources_intervention + triage, database.types.ts triage_snoozed_until ajouté Row/Insert/Update) + 6 MISALIGNMENT (TriageAction exporté), test-coverage GO conditionnel (RLS = faux positif modèle 3-fondateurs whitelistés, 4 tests concurrency ajoutés). **Charte v7** : 3 fichiers vérité documentés. `docs/GOLDEN_STANDARDS.md` 4 nouvelles sections composants (3.7b ScorePill / 3.7c ActionButton / 3.7d Indicateurs flat / 3.7e TriageQueue). `docs/GOLDEN_STANDARDS_RESPONSIVE.md` règles mobile spécifiques. `.claude/goldens/audit-uiux-golden-v7-2026-05-01.json` machine-readable avec décisions 9-12 + section componentsPhase01 tokens exacts. **Mockup proof-of-design** : `notes/refonte-prospection-2026-05-01/mockup-prospection-phase01.html` autoportant validé Pascal après 8 itérations (compteurs, badges niveaux, boutons, légende, header colonne, score sémantique, couleur CTA, pattern boutons). **Test taste-skill** : VALIDÉ comme cas pilote anti-slop. Décision : ADOPTER les patterns produits (ScorePill, ActionButton, indicateurs flat, TriageQueue) en charte v7 sans installer le skill comme automation. Pascal valide visuellement chaque pattern critique = 8 itérations vs cible 1-2 (skill seul génère trop d'itérations). Migration prod `triage_snoozed_until` appliquée par Pascal en clôture (1 SQL Editor copy-paste). Vercel deploy READY 38s. Smoke test prod HTTP 200 dashboard + prospection. Live <https://filmpro-crm.vercel.app/>.
- [x] ~~Refonte best-in-class /veille phase 1+2 - magazine éditorial premium~~ - Fait 2026-04-30 (S132, xhigh) 6 commits push origin/main : `25e539d` (phase 1 hero featured) + `9025bb9` (tests Playwright + screenshots) + `944c3c7` (phase 2 archives mini-cover navy + détail [id]) + `17a2b52` (screens phase 2) + `2ead8d5` (fix HIGH agrégation chips items + fix MEDIUM rounded-r-xl) + `10b00bb` (re-screens). **Phase 1** (page liste /veille) : masthead éditorial kicker + h1 mag-display 6xl + sous-titre 17px + divider primary-dark 2px ; édition à la une avec aside primary-dark "couverture" numéro tabular-nums 120px + ornements cercles white/[0.04] + corps synthèse mag-body line-clamp-5 + ol "À retenir" rangs 01/02/03 mag-display primary-dark/20 + badges segment/actionability + CTA primary "Lire l'édition complète". **Phase 2 archives** : pattern mini-cover navy horizontal grid `[112-128px] 1fr` (bandeau primary-dark gauche numéro tabular-nums 44-52px + ornement cercle + badges Nouveau/signaux ; corps blanc droit week + summary + 3 puces + CTA). **Phase 2 détail /veille/[id]** : masthead aligné /veille + hero couverture (aside numéro 120px tabular-nums + stats Signaux/Impacts/Termes en dl + badge compliance) + signaux 12 cols rang 01-N mag-display 64px primary-dark/15 col-span-1 + impacts grid 2 cols cards border-l-4 primary + termes grid 2 cols cards chips (badge KIND/CANTON + "depuis signal #N" + query font-semibold + bouton auto-exec runChipSearch via /api/prospection/from-intelligence cohérent avec /veille/item/[slug]). **Fix HIGH bug-hunter** : agrégation côté loader [id]/+page.server.ts de items[].search_terms (chips structurés SearchChip) en aggregatedChips Array<{chip, item_rank}> dédupliqué kind|canton|query.toLowerCase. Section "Termes / À lancer dans Prospection" redevient visible (était masquée silencieusement depuis refonte LEAN S111 car data.report.search_terms top-level toujours [], sublimé par le compteur hero phase 2). **Fix MEDIUM** : rounded-r-xl rounded-lg redondant nettoyé. **QA 360 multi-runs** : vitest 365/365 verts (3x), svelte-check 0 erreur sur veille/, build prod OK 10s, Playwright 7/7 verts contre prod (desktop 1280/1440 + iPhone 14 Pro Max preset complet, navigation, CTA a11y, overflow horizontal mobile liste + détail). **Audit bug-hunter** : 1 HIGH + 1 MEDIUM identifiés et fixés en session (no-debt rule). **Skills consultés** : frontend-design (direction éditoriale BOLD), refactoring-ui (7 principes + grayscale-first + scale 4/8/12/16/24/32/48), ux-guide (CRAP + task-first <3s primary CTA), golden-standard v2 CRM FilmPro. **Validation Pascal** : visuelle desktop "top j'aime bcp" puis détail "validé". **Screenshots** : `notes/refonte-veille-2026-04-30/{after-desktop,after-mobile,after-detail-desktop,after-detail-mobile}.png`. Live <https://filmpro-crm.vercel.app/veille>.
- [x] ~~Fix bandeau navy WeasyPrint dernière page courte~~ - Fait 2026-04-30 (S131, high) : 1 edit `~/.claude/skills-library/filmpro-pdf/build.py` `_CONTENT_PAGE_CSS`. **Bug** : sur dernière page courte (peu de contenu), bandeau navy bas absent côté gauche. **Cause racine** : 2 margin-boxes `@bottom-left` (vide, `content: " "`) + `@bottom-right` 50%/50%. WeasyPrint considère `@bottom-left` empty (whitespace collapse) et drop la box → background invisible. Tentatives infructueuses : `\00A0` escape (mal parsé), NBSP littéral, `content: "."` + `color: transparent` (WeasyPrint optimise transparent), `color: #152A45` matching bg (idem), `@bottom-right width: 100%` (clamped à droite par spec). **Fix retenu** : `@bottom-center` unique avec `content: counter(page)` + `width: 100%` + `padding-right: 18mm` + `text-align: right`. Une seule box, toujours non-vide (counter dynamique), pas de clamp positionnel. Validé sur fixture officielle (4 pages physiques, bandeau pleine largeur sur toutes y compris la 4e courte). pytest 5/5 verts. Baseline PDF regénérée `fixtures/baseline/crm-point-etape-2026-04-23.pdf` (57 KB). Mémoire `project_filmpro_pdf_harmonization.md` § « Bug post-V1 connu » à clore.
- [x] ~~V2 mobile terrain Session γ - F3 LeadExpress + F4 PipelineQuickAdvance + QA 360~~ - Fait 2026-04-30 (S130, xhigh) 2 commits push origin/main : `17baabc` (F3) + `90c8878` (F4). **F3 LeadExpress** : modale 4 champs (entreprise + contact + tél + note) sticky bouton card primary mobile/tablette dashboard + bouton inline mobile prospection. Action `/prospection?/createExpress` zod LeadExpressCreateSchema, source `lead_express` ajoutée à SOURCES_LEAD enum (cascadé `sourceLabel` "Saisie terrain"), `score_pertinence: null` (pas 0, évite filtre "froid"), canton null pour zéro friction terrain. Dedup multi-passes : helper `escapeIlike` factorisé dans `db-helpers.ts` (généralisable au repo) + comparaison telephone normalisée `[^\d]/g` matching `+41 79`/`0041 79`/`079`. Effect URL `?slideOut=<id>` auto-clear pour éviter ré-ouverture post-fermeture rapide ou reload. **F4 PipelineQuickAdvance** : composant intégré SlideOut entreprise avec stepper visuel 5 étapes (aria-valuetext + aria-hidden a11y WAI-ARIA), bouton "Étape suivante" optimistic UI (clear piloté par `$effect` quand prop rattrape, transition atomique pas de flash), guard `isUnknownStage` (panneau warning si etape DB hors enum, pas de masquage silencieux), mini-modale prochaine action (date YYYY-MM-DD regex stricte). Action `/pipeline?/updateNextAction` zod `OpportuniteNextActionSchema`. Action `move` existante réutilisée. Resync inputs transition fermée→ouverte uniquement (évite écrasement saisie utilisateur invalidateAll concurrent). Load entreprises filtré non-terminales `.not('etape_pipeline', 'in', '(gagne,perdu)')` + limit 500 (borne payload F4). **QA 360 multi-agents** : security-auditor 0 H/C, bug-hunter 1 Critical + 5 High **TOUS fixés** (race optimistic UI, Math.max(0,-1) silent corruption, SQL wildcards ilike data leak, dedup skip tel court, effect URL boucle, resync écrase saisie), code-reviewer 0 BLOCKER 11 IMPROVEMENT, contracts-reviewer 3 BLOCKER 2 fixés (entreprises scaling + date regex). **9 tests Playwright mobile** F3+F4 ajoutés. **vitest 365/365** verts, **build prod** OK. V2 MOBILE TERRAIN CLOS (4/4 features prod). Mémoire `project_v2_mobile_terrain_session_alpha.md` mise à jour avec Session γ LIVRÉ.
- [x] ~~V2 mobile terrain Session β - F2 géoloc visite RDV + extensions UX + audit modaux~~ - Fait 2026-04-30 (S129, xhigh) 6 commits push origin/main : `680c94a` (F2 base) + `7362c5e` (cascade géocodage + lien Google Maps) + `efac782` (toast diag visible) + `1624713` (migration Nominatim → swisstopo CH cadastre) + `898ff87` (surface adresse parent dans VisitsPanel) + `38026af` (audit modaux/sidebars : ConfirmModal, ModalForm, SlideOut, EnrichBatchModal ne ferment plus au clic extérieur). (1) **Composant VisitsPanel** monolithique (check-in + historique + ConfirmModal suppression). Intégré LeadSlideOut + entreprises page. (2) **API REST** GET (retourne aussi parent_address_raw) / POST (cascade swisstopo 3 tentatives, distance Haversine, flag >100m sans blocage) / DELETE (RISQUE OUVERT propagé F1). (3) **Fix critique** : Permissions-Policy `geolocation=()` bloquait complètement navigator.geolocation, passé à `geolocation=(self)`. (4) **Migration géocodeur** : Nominatim retournait NPA faux sur Carouge GE → bascule swisstopo (cadastre fédéral CH, gratuit, sans clé). Décision /dig verrou best-in-class long terme. (5) **UX** : commentaire « Géocodage adresses suisses uniquement », warning conditionnel adresse parent absente, lien Google Maps cliquable sur coords GPS. (6) **Audit modaux/sidebars CRM** sur demande Pascal : 4 composants passent button onclick → div neutre. PhotoGallery lightbox volontairement non touché (pattern viewer). AlerteModal/ImportModal héritent via wrap ModalForm. (7) Tests Playwright F2 (6 nouveaux). (8) Sécurité : security-auditor 0 H/C confirmé. (9) QA : vitest 365/365 vert sur tous les commits, build prod OK. Mémoire `project_v2_mobile_terrain_session_alpha.md` mise à jour avec Session β LIVRÉ.
- [x] ~~Bloc 4 quick wins UX prospection + aide~~ - Fait 2026-04-30 (S128, high) commit `49345c4` push origin/main : (1) `/aide` ouvre dans un nouvel onglet (flag `external: true` sur item nav `config.ts`, support `target="_blank" rel="noopener noreferrer"` + icône externe dans `Sidebar.svelte`). (2) **Fix racine "?" en-tête tableaux** : les noms d'icônes `arrow_upward` / `arrow_downward` (indicateur de tri `DataTable.svelte`) et `chevron_left` (bouton "Réduire" `Sidebar.svelte`) étaient absents de `ICON_MAP` → fallback `CircleHelp` se déclenchait → "?" visible. Ajout des 3 mappings dans `icon-map.ts`. (3) **Sélection globale /prospection pattern Gmail/Notion** : bannière "Les N prospects de cette page sont sélectionnés. Sélectionner les Y prospects qui correspondent aux filtres" + endpoint `/api/prospection/all-ids` (cap MAX_IDS=5000, cap MAX_FILTER_VALUES=50, dual ilike + dédup Set pattern S120, rate limit 10/min via hooks.server.ts). QA : vitest 365/365, build OK, security-auditor 0 H/C (3 Low corrigés en place : cap cardinalité filtres, logging Postgres, recalcul `capped` post-dedup). Diff 5 fichiers / +153 −4.
- [x] ~~V2 mobile terrain Session α - F1 photos chantier sur leads + entreprises~~ - Fait 2026-04-30 (S127, xhigh) : 3 commits push origin/main `e3e2022` + `c5614c0` + `b02d108`. **Migration prod** (psql via libpq, password DB Pascal one-shot) : 2 tables `prospect_photos` + `prospect_visits` (FK XOR lead/entreprise, types ajustés `entreprise_id TEXT` car schéma legacy) + 4 storage policies bucket Private `prospect_photos` (créé par Pascal UI Dashboard). **API REST** : `GET /api/photos?lead_id|entreprise_id=X` (liste + signed URLs 1h), `POST` (multipart, magic bytes anti MIME spoofing JPEG/PNG/WebP/HEIC, validation existence parent, whitelist ext stricte basée magic bytes, rate limit 10/min via hooks.server.ts), `DELETE /api/photos/[id]` (RISQUE OUVERT documenté : tout fondateur peut supprimer, validé Pascal Q2 « tous voient tout »). **Composant** `PhotoGallery.svelte` réutilisable : capture iOS native (sans `capture` attribute pour proposer galerie + appareil photo), compression canvas si > 2 Mo (max 1920px), galerie 3 cols + lightbox + ConfirmModal suppression, corbeille toujours visible (pas hover-only). **Intégrations** : LeadSlideOut (/prospection) + entreprises +page.svelte. **Icônes Lucide** ajoutées (camera, image, image_plus, images). **6 tests Playwright mobile** (PhotoGallery présence dans 2 SlideOuts + 4 tests API endpoints). **Sécurité** : security-auditor 0 High/Critical après fixes (4 High résolus + 5 Medium + 3 Low corrigés ; 2 RISQUE OUVERT documentés pour 3 fondateurs symétriques). **Specs** : `docs/SPECS_CRM_MOBILE_V2.md` + `.html` + `_MOCKUPS.html` (4 features F1-F4 maquettées). **Cadrage S127** : Option A retenue (PWA poussée principe Linear V1 préservé), note vocale + offline queue retirées définitivement (pas même V3+). Vitest 365/365, Playwright mobile 23/23 (1 skip = pas d'entreprise prod), build OK. QA terrain Pascal validée iPhone réel (capture + galerie + lightbox + suppression). Mémoire `project_v2_mobile_terrain_session_alpha.md` créée.
