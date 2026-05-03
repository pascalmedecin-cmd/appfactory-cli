# AppFactory : CLAUDE.md

**Statut :** Phase C, audit UX/UI 360 /prospection LIVRÉ (S160) + 3 vagues batch fixes LIVRÉES (S162) + 4 fixes V4 LIVRÉS (S163 2026-05-03 high : F-V4-01..04 CTA + empty state contextuels par scope d'onglet + aria-label tr descriptif ; commit `612b1ac` ; vitest 414/414, build prod 11.66s, audit sécu 0 C/H/M/L ; validation prod Chrome MCP autonome OK ; PRÊT promotion gabarit + cascade 6 pages CRM). Dette dedup `createExpress` multi-sites FERMÉE (S159). E2E Phase 2 prospection FERMÉE (S158). Phase 2 LIVRÉE (S157). V2 mobile terrain CLOS (S127 α + S129 β + S130 γ). V1 MOBILE CLOS (S125). Formation IA = sous-projet autonome dans `formation-ia/`, `cc` option 2.
**Derniere mise a jour :** 2026-05-03 (S163 CRM high : 4 fixes V4 audit /prospection livrés + validation prod autonome via Chrome MCP. Commit `612b1ac` push origin/main : F-V4-01 CTA header dynamique par scope (SIMAP/RegBL→Importer prospects, Entreprises→Importer entreprises, Terrain→Créer fiche), F-V4-02 empty state Terrain dédié saisie pas import, F-V4-03 empty state contextuel par scope (4 variantes), F-V4-04 aria-label tr descriptif (DataTable nouvelle prop optionnelle rowAriaLabel). Validation prod autonome via Chrome MCP : ARIA tabs ArrowLeft/Right/Home/End OK, ConfirmModal Écarter ≥10 OK, ScorePill contraste 4.96:1 OK, TriageQueue sobre OK, dl/dt/dd OK, fieldset+legend OK, th[scope=col] 8/8 OK. Tooltip Escape implémenté code S160 V2.8 (validation programmatique impossible via JS dispatchEvent CSS:hover). Audit sécu 0 C/H/M/L. vitest 414/414. svelte-check 128 = baseline S162 inchangée. /prospection PRÊT promotion gabarit. Reste backlog Vague 4 : H-19 sticky multi-col + 11 H bench externe + sweep M-04..M-28 résiduels.).
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** Session 163 (CRM, 2026-05-03, `/effort high`, validation prod autonome /prospection + 4 fixes V4 chaînés no-debt).
**Sessions précédentes (condensé)** - détail S122-S125 : `archive/2026-04-28-sessions.md`. Détail S78-S79 : `archive/decisions-sessions-78-79.md`. Détail S70-S77 : `archive/decisions-sessions-70-77.md`. Détail S80-S107 : `formation-ia/CLAUDE.md` (sous-projet autonome).

- **S163** (CRM, 2026-05-03) : Validation prod autonome /prospection via Chrome MCP + 4 fixes V4 chaînés no-debt. 1 commit `612b1ac` push origin/main. **Méthode** : Pascal a refusé le dialogue pas-à-pas DevTools manuel ("trop tech"), j'ai pris le relai en autonomie via Chrome MCP (tabs_context, javascript_tool, browser_batch). 4 parcours testés : P1 onglets+Importer+empty states (4 onglets x 2 états), P2 a11y clavier (ARIA tabs nav + tr role=button + col-resizer + toast region + search + focus-visible globaux), P3 ConfirmModal Écarter ≥10 + toolbar batch + alertdialog aria-modal, P4 direction artistique (ScorePill 4.96:1, tabs désaturées 1 actif coloré, TriageQueue sobre /, dl/dt/dd, fieldset+legend, th[scope=col] 8/8). **4 nouveaux findings UX détectés en prod** (F-V4-01..04) traités en chaîne dans la même session : F-V4-01 (High) CTA header générique inadapté par scope d'onglet → helpers Svelte 5 `headerCTA = $derived.by()` typé sur ProspectionTabKey ('terrain'→'Créer une fiche terrain'+bolt+leadExpressOpen, 'entreprises'→'Importer des entreprises'+cloud_download+importModalOpen, default→'Importer des prospects'). F-V4-02 (High) empty state Terrain disait "Lancez un import" alors que Terrain = saisie sur place (RDV chantier, repérage de site) → empty state body "Créez votre première fiche depuis le terrain en quelques secondes via le lead express", CTA "Créer une fiche" ouvre LeadExpress (pas ImportModal). F-V4-03 (Medium) empty state contextuel par scope (`emptyStateCopy = $derived.by()` 4 variantes simap/regbl/entreprises/terrain avec icon+title+body+CTA dédiés). F-V4-04 (Low) aria-label tr descriptif → DataTable nouvelle prop optionnelle `rowAriaLabel?: ((row: T) => string) | null` injectée sur tr role=button, /prospection passe `(lead) => 'Lead {raison_sociale}, canton {X}, score {n}/12, statut {Y}'`. Confirmé en prod : "Lead Services Industriels de Terre Sainte et Environs SITSE, canton VD, score 9 sur 12, statut ecarte". Rétrocompat : prop optionnelle, /contacts inchangé. **QA** : vitest 414/414 verts (zéro régression), build prod 11.66s OK, svelte-check 128 erreurs = baseline S162 inchangée (zéro nouvelle erreur). Audit `code-review:security-auditor` Opus : **0 Critical / 0 High / 0 Medium / 0 Low**, 3 Info acceptés (Svelte 5 échappe aria-label par défaut, switch typé exhaustif, guard rowAriaLabel correct). Artefact daté `memory/audit_secu_2026-05-03_v4_audit_prospection.md`. **Tooltip Escape** : implémenté côté code S160 V2.8 (`Tooltip.svelte:21` + `svelte:window onkeydown` + check `:hover/:focus-within`), validation programmatique impossible (CSS :hover non déclenchable via JS dispatchEvent), code source non touché par V4 = pas de régression. Validation visuelle Pascal optionnelle. **ScorePill froid** (#3F4D5F V2.6) non vérifiable in-vivo (tous leads prod actuels "Prioritaire", aucun lead froid visible). Validation différée au 1er lead bas score. **Reste backlog Vague 4** : H-19 sticky 1ère colonne raison sociale (refactor sticky multi-cellules incompatible resizable - cadrage dédié), H-21 raccourcis clavier global Cmd+K + J/K + ?, sweep M-04..M-28 résiduels sur ~12 fichiers (LeadSlideOut, BatchActionsBar, EnrichBatchModal, ImportModal, AlerteModal, RecherchesPanel), sémantique M-32..M-37 résiduelle. **/prospection PRÊT pour promotion gabarit** + cascade sur 6 pages CRM (/dashboard, /contacts, /entreprises, /pipeline, /signaux, /veille).
- **S162** (CRM, 2026-05-02) : 3 vagues batch fixes /prospection livrées post-audit S160. Commits `f5be833` Vague 1 (4 Critical + 2 High bloquants prod, 4h) + `59bc636` Vague 2 (11 High a11y baseline WCAG AA, 1.8h) + `4af587c` Vague 3 (3 High cohérence golden + 5 Mediums sweeps, 1.5h). Méthode batch fixes ordonnée : 6 sub-tâches par vague + audit security-auditor Opus après V1 (0 Critical/High/Medium, 1 Low cosmétique fixé) + QA fixée (vitest 414/414, build prod 10.67-12.20s OK, svelte-check 128 vs baseline 148 = régression nette -20). Reco H-19 pinned multi-col reportée Vague 4 (refactor sticky multi-cellules incompatible avec resizable colonnes livré S157 sans casser persistance localStorage). Reste backlog Vague 4 : H-19 sticky + 11 H bench externe résiduels (H-21 raccourcis Cmd+K) + sweep M-04..M-28 résiduels sur ~12 fichiers + sémantique M-32..M-37. Validation visuelle prod Pascal requise (DevTools manuel parcours P1-P4 catalogue findings) avant promotion gabarit + cascade 6 autres pages CRM (/dashboard, /contacts, /entreprises, /pipeline, /signaux, /veille).
- **S160** (CRM, 2026-05-01) : Audit UX/UI 360 /prospection - catalogue exhaustif livré + capitalisation méthode dans skill audit-uiux. Méthode 5 angles orthogonaux validée (S1 code-reviewer + S2 bug-hunter + S3 ui-auditor chrome MCP + S4 taste-bench Linear/Stripe/Notion/Attio + S5 Nielsen+WCAG 2.2 AA). 5 agents subagents opus parallèles background. 91 findings dédupliqués cross-source : 4 Critical (C-01 bouton Importer disparaît tabs vides + C-02 injection PostgREST search + C-03 `<tr>` non-clavier + C-04 H1 sémantique policy) + 27 High (a11y + cohérence golden + bench externe) + 38 Medium + 17 Low + 5 Info. Verdict /prospection N'EST PAS page modèle, ~16h batch fixes 3 vagues à valider Pascal + 3 décisions de policy. **Erreur de méthode reconnue** : début session j'ai dérivé en fix-au-fil (4 commits mid-session avant que Pascal me stoppe). Cause racine scroll vertical tabs `overflow:auto`+`height:60px` figé sur `.tabs-bar` ProspectionTabs.svelte - mon fix `2f7fa76` cascade flex-1 ne ciblait PAS la cause racine. Vrai fix dans Vague 1 batch fixes. **Capitalisation skill audit-uiux** : SKILL.md réécrit 2 modes (A 360 batch nouveau / B legacy multi-passes), 4 templates paramétrables, 5 prompts agents, agents/README.md, 7 garde-fous dont "zéro fix pendant l'audit". 4 livrables structurés dans `notes/audit-uiux-prospection-2026-05-01/`.
- **S159** (CRM, 2026-05-01) : Dette dedup `createExpress` multi-sites FERMÉE - risque ouvert préexistant S130 confirmé H4 par bug-hunter S157. 1 commit `96575ec` push origin/main. Server `template/src/routes/(app)/prospection/+page.server.ts:466-488` : SELECT enrichi `id,raison_sociale,localite,telephone` ; logique 3 cas : (a) `telNorm.length>=6` + match tel = silent redirect (signal fort, statu quo), (b) sinon `candidates.length===1` = silent redirect (ambiguïté nulle), (c) sinon multi-candidats sans tel discriminant = `fail(409, ambiguous: true, candidates: [{id, raison_sociale, localite}])`. Flag `force_create=1` extrait de `form.get('force_create')` bypasse la dedup pour création explicite (chaîne, multi-sites volontaires). UI `LeadExpress.svelte` : step désambiguation conditionnel sur `ambiguousCandidates.length > 0`, liste candidats avec raison sociale + localité (fallback "Localité non renseignée" italique), bouton par candidat → `handleResolve(id)` redirect/toast prospect existant, bouton "Créer un nouveau lead" → `submitForm(true)` avec force_create=1, bouton "Retour" remet `ambiguousCandidates = []` sans perte saisie. Détection côté client via `result.type === 'failure'` + `payload.ambiguous === true`. 4 tests vitest `template/src/routes/(app)/prospection/createExpress.test.ts` mock Supabase chainable thenable offline (zéro réseau) : tel long + match unique = silent OK, tel court + 1 candidate = silent OK, tel court + 2+ candidates = fail(409) ambiguous, force_create=1 bypasse. **QA** : vitest 410/410 verts (+4 nouveaux), build prod 17s OK, svelte-check 0 nouvelle erreur sur fichiers touchés. Vercel deploy auto sur push.
- **S158** (CRM, 2026-05-01) : Tests E2E Phase 2 prospection - dette honnête S157 fermée. 1 commit `7b859a9` push origin/main. `template/tests/prospection-phase2.spec.ts` (3 tests Playwright contre prod : sélecteur perPage URL + reflet + persiste reload, colonnes resizables drag handle + localStorage + restauration, switch onglet Terrain potentiellement vide + retour SIMAP). Preset complet desktop 1440x900 + iPhone 14 Pro Max (`...devices['iPhone 14 Pro Max']` spread = userAgent Safari iOS + viewport 430×932 + DPR 3 + isMobile + hasTouch). Régressions Pascal couvertes : (a) `<select value={pageSize}>` + `<option value={opt}>` Svelte 5 cassait reflet, fix `selected={opt === pageSize}` (a48a9c1), (b) tabs disparaissaient quand 4 tabCounts à 0 (7fa7829). Mobile : skip drag (`.col-resizer` hover-only), tabs deviennent `<select>#tabs-mobile-select` <768px. QA 6/6 verts contre prod, vitest 406/406 inchangé. Migration règles tests mobile DevTools du global méta vers projet AppFactory (section "REGLES TECHNIQUES PROJET" CLAUDE.md, scope projet-only hors méta/Marketing/Enseignement). **Session CLI freeze** : Bloc #4 dedup createExpress démarré 15:57 puis bug harness (event loop figé, S+ sleeping, 0 connexion TCP, FD KQUEUE bloqué sur task in_progress). Pascal a `kill -9` PID 80932. Clôture rétroactive complète depuis transcript JSONL + git log (zéro perte de livrable, Bloc #4 jamais entamé côté code donc rien à reprendre).
- **S157** (CRM, 2026-05-01) : Refonte /prospection phase 2 - 4 onglets par nature de signal + tableau dense + tooltip header + colonnes resizables + tri stack bidirectionnel + sélecteur entrées par page + fix typo "Importer des prospects". 3 commits push origin/main. Nouveaux composants : Tooltip.svelte (réutilisable, fond blanc subtil + ombre douce + 2 variantes anchor), ProspectionTabs.svelte (4 onglets sticky/dropdown avec icônes pastel premium, tooltips pédagogiques par onglet, a11y role tablist/tab). DataTable étendu opt-in rétrocompat /contacts : `dense`, `resizable`+`storageKey`, `pageSizeOptions`+`onPageSizeChange`, `Column.infoTooltip`. 4 nouveaux tokens onglets (--color-tab-{simap,regbl,entreprises,terrain}). Source unique dans prospection-utils.ts (PROSPECTION_TABS, TAB_SOURCE_MAP, SORT_FIELDS dérivé) pour éviter drift server/client. project.yaml aligné avec lead_express + veille. Protection filtre incompatible (short-circuit Promise + bandeau warning UI). Fix typo NBSP. 4 audits subagents (security 0 finding, bug-hunter 0 Critical/4 High tous fixés en session, code-reviewer 0 BLOCKER, contracts 0 BLOCKER avec MISALIGNMENT 1+2+3 fixés). Charte v8 : 3 nouvelles sections GOLDEN_STANDARDS.md (3.7f Onglets, 3.7g Tooltip, 3.7h Tableau dense). vitest 406/406, build prod 11s. **Reconnaissance honnête en fin de session** : QA pas à 100%, aucun test E2E Playwright ajouté pour les nouveaux livrables (drag colonnes, sélecteur entrées/page, switch onglet vide). Smoke test prod = curl HTTP 303 only, pas de validation comportement réel. Tests E2E reportés en dette (cf. Prochaine session).
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

## REGLES TECHNIQUES PROJET

### Tests mobile via Chrome DevTools Device Toolbar (manuel) - OBLIGATOIRE

Tout test responsive / mobile / viewport (iPhone SE, iPhone 14 Pro Max, Pixel 7, etc.) se fait dans Chrome via **DevTools Device Toolbar** ouvert manuellement par Pascal (Cmd+Option+I → Cmd+Shift+M → sélectionner device dans le dropdown ou saisir width × height en mode "Responsive"). Claude guide la validation pas-à-pas (URL à charger, élément à inspecter, valeur attendue) ; Pascal exécute dans son DevTools et rapporte ce qu'il voit.

**Interdit** :
1. Tests Playwright avec `viewport: { width, height }` SEUL (sans `deviceScaleFactor`/`isMobile`/`hasTouch`/`userAgent`).
2. MCP `claude-in-chrome` `resize_window` + `javascript_tool` comme **substitut** à DevTools Device Toolbar (le MCP redimensionne la fenêtre Chrome desktop, pas le viewport émulé : pas de DPR mobile, pas d'UA mobile, pas de touch émulé, pas de viewport meta respecté → rendu non fidèle, écart constaté Session C 2026-04-27 : `resize_window(430, 932)` donne `innerWidth = 500`).

**Autorisé pour findings OBJECTIFS uniquement** (S125 dérogation /dig [B]) : Playwright avec `devices['iPhone 14 Pro Max']` preset complet (spread `...devices[...]` qui apporte userAgent Safari iOS + viewport 430×932 + deviceScaleFactor 3 + isMobile + hasTouch). Périmètre couvert : overflow horizontal, dimensions `getBoundingClientRect`, présence DOM, requêtes réseau (font self-host, etc.), boutons ≥ 44px, structure DOM, screenshots de référence.

**Reste obligatoire DevTools manuel pour findings QUALITATIFS** : rendu de police, perception visuelle, animations, scroll inertiel, jugement design, validation visuelle de screenshots golden. Référence d'implémentation : `template/tests/mobile.spec.ts` + `template/playwright.mobile.config.ts` (S125, 17/17 audits objectifs verts).

**Pourquoi DevTools manuel** : seule l'émulation Device Toolbar applique DPR (3 pour iPhone 14 Pro Max), UA mobile, touch émulé, viewport meta-tag, scrollbar overlay mobile → rendu fidèle au rendu réel sur device. Les media queries CSS Tailwind (`md:`, `lg:`) sont déclenchées par le viewport émulé, pas par la taille de fenêtre desktop.

**Quand le MCP reste OK** : pour mesurer `clientWidth`/`scrollWidth`/`getBoundingClientRect`/textContent en complément d'une session DevTools manuelle déjà ouverte, ou pour des audits de structure DOM non liés à la fidélité visuelle mobile.

**Comment appliquer** : si une tâche demande "tester mobile X" → demander à Pascal d'ouvrir DevTools Device Toolbar sur le viewport cible, lui donner l'URL à charger et la liste des points à vérifier (élément X visible ? overflow horizontal ? bouton Y ≥ 44px ?). Tests Playwright restent légitimes pour navigation desktop, redirects, formulaires, login (pas mobile).

Origine : Session C CRM mobile V1 2026-04-27, Pascal a explicitement refusé Playwright mobile **et** ensuite explicitement refusé MCP comme substitut à DevTools Device Toolbar manuel. Migrée du global méta vers projet AppFactory le 2026-05-01 (scope projet-only, hors-périmètre méta/Marketing/Enseignement).

## Prochaine session

**Prochaine attaque** : Bloc #1 - Validation visuelle prod /prospection après deploy Vercel (DevTools manuel Pascal : 4 onglets × 2 états + parcours P1-P4 catalogue findings). 3 vagues batch fixes audit S160 LIVRÉES cette session (commits `f5be833` Vague 1 bloquants + `59bc636` Vague 2 a11y WCAG AA + `4af587c` Vague 3 cohérence golden) : 4 Critical + 16 High + 5 Medium fixés sur 91 findings catalogue. Si validation prod OK → promotion /prospection page modèle + cascade gabarit sur les 6 autres pages CRM. Si écarts → Bloc #2 Vague 4 résiduelle (H-19 sticky multi-col + 11 H bench externe + sweep Mediums M-04..M-28 résiduels). Bloc B2 Phase 3 généalogie reste BLOQUÉ jusqu'à validation visuelle prod Phase 2.


<!-- BEGIN CONSOLIDATION (auto-géré par cockpit, ne pas éditer) -->

### Consolidation cockpit (maj 2026-05-03T20:19:28)

**Blocs actionnables** (ordre d'attaque) :

- **Bloc #1** - Validation visuelle prod /prospection post 3 vagues (1.0h, confiance Élevé)
  - Objectif : Tester DevTools desktop+mobile les 4 onglets, ARIA tabs, ConfirmModal, parcours P1-P4
  - Validation visuelle prod : ouvrir https://filmpro-crm.vercel.app/prospection en DevTools Device Toolbar (desktop 1440 + mobile iPhone 14 Pro Max). Tester les 4 onglets × 2 états (peuplé/vide), bouton

**Blocs bloqués** :

- **Bloc B1** [BLOQUÉ] - Validation cron veille W18 + cleanup stash (0.5h)
  - Objectif : Valider édition veille W18 + pipeline Veille→Prospection puis drop stash devenu obsolète
  - Blocage : Date ultérieure fixée ≥ 2026-05-01 (envoi cron veille programmé)
  - Débloque si : Réception email cron W18 le 2026-05-01 + validation pipeline
  - Lire l'édition W18 reçue par email + sur /veille. Critères veille : (1) ≥1 item Suisse romande rangs 1-3, (2) sources crédibles, (3) anti-doublons W16/W17, (4) compliance_tag cohérent, (5) volume 5-10
  - Drop stash stash@{0} (git stash drop stash@{0}) une fois la refonte LEAN considérée stable. Le stash contenait des éléments S110 chantier B déjà intégrés ou écartés.

- **Bloc B2** [BLOQUÉ] - Phase 3 prospection - généalogie cross-pages (5h)
  - Objectif : Encart Origine + breadcrumb Veille→Lead→Entreprise→Opportunité + 3 KPIs reporting
  - Blocage : Validation visuelle Pascal Phase 2 prod 1-2 jours avant lancement Phase 3
  - Débloque si : Validation visuelle Phase 2 prod par Pascal (1-2 jours après livraison S157)
  - Phase 3 généalogie : encart "Origine : lead X importé le DD/MM par Pascal, source Zefix CHE-xxx" sur fiche entreprise + opportunité. Breadcrumb "Veille édition W18 → Lead → Entreprise → Opportunité" s

- **Bloc B3** [BLOQUÉ] - Suite conditionnelle validation prod /prospection (2.0h)
  - Objectif : Selon verdict validation prod : promotion gabarit cascade 6 pages OU Vague 4 résiduelle
  - Blocage : Branches mutuellement exclusives conditionnées par verdict validation visuelle prod (b7e038ee478a)
  - Débloque si : Verdict validation visuelle Pascal sur /prospection prod (OK ou écarts)
  - Si verdict OK → promotion /prospection page modèle + cadrage cascade gabarit sur 6 pages CRM (/dashboard, /contacts, /entreprises, /pipeline, /signaux, /veille). Sinon → Bloc #2 Vague 4 résiduelle.
  - Vague 4 résiduelle : H-19 sticky 1ère colonne raison sociale (refactor multi-col incompatible resizable actuel - cadrage dédié), H-21 raccourcis clavier global Cmd+K + J/K + ?, M-04..M-11 spacing rési

<!-- END CONSOLIDATION -->

### 1. Validation visuelle prod /prospection post 3 vagues batch fixes [SUPERVISÉ • low • ~30 min]

**Pourquoi** : 3 vagues batch fixes audit S160 livrées cette session (4 C + 16 H + 5 M fixés sur 91 findings catalogue). Validation visuelle DevTools manuel Pascal sur prod requise avant promotion gabarit + cascade sur 6 autres pages CRM. Catalogue verdict avant Vague 1 = "N'EST PAS page modèle" ; verdict cible post-Vague 3 = "page modèle si 0 Critical + 0 High a11y + ≤ 5 High direction artistique au re-audit".
**Prérequis** : deploy Vercel auto OK (commits `f5be833` + `59bc636` + `4af587c` sur main). → voir `notes/audit-uiux-prospection-2026-05-01/{findings,actionplan,verdict}.md`

- [x] **[EXÉCUTABLE]** Validation visuelle prod : ouvrir https://filmpro-crm.vercel.app/prospection en DevTools Device Toolbar (desktop 1440 + mobile iPhone 14 Pro Max). Tester les 4 onglets × 2 états (peuplé/vide), bouton Importer toujours visible y compris onglet vide, ARIA tabs nav clavier ArrowLeft/Right + Home/End, `<tr>` Tab+Enter ouvre slideOut, ConfirmModal apparaît à Écarter ≥10 prospects + toast undo 5s, focus-visible apparent partout, ScorePill froid contraste lisible, TriageQueue dashboard désormais sobre (fond surface-alt, count 44px, plus d'ornements). Vérifier parcours P1-P4 catalogue findings. → voir `notes/audit-uiux-prospection-2026-05-01/findings.md`
- [ ] **[BLOQUÉ - validation prod OK]** Si verdict OK → promotion /prospection page modèle + cadrage cascade gabarit sur 6 pages CRM (/dashboard, /contacts, /entreprises, /pipeline, /signaux, /veille). Sinon → Bloc #2 Vague 4 résiduelle.

### 2. Vague 4 résiduelle /prospection [BLOQUÉ • xhigh • ~5h]

**Pourquoi** : 11 H + ~30 M tracés en backlog en fin Vague 3 (commit `4af587c` message). Cadrage dédié si validation prod fait remonter écarts ou si Pascal veut fermer 100 % du catalogue avant promotion gabarit.

- [ ] **[BLOQUÉ - validation prod OK ou écarts détectés]** Vague 4 résiduelle : H-19 sticky 1ère colonne raison sociale (refactor multi-col incompatible resizable actuel - cadrage dédié), H-21 raccourcis clavier global Cmd+K + J/K + ?, M-04..M-11 spacing résiduel (LeadSlideOut, BatchActionsBar, EnrichBatchModal, ImportModal, AlerteModal, RecherchesPanel), M-13..M-18 hauteurs boutons (h-10 unifié hors mobile), M-20..M-22 typo hors échelle (TriageQueue, count tabs), M-23..M-28 opacités custom statiques (LeadSlideOut, BatchActionsBar, EnrichBatchModal, AlerteModal, RecherchesPanel), M-32..M-37 sémantique résiduelle (EnrichBatchModal aria-labelledby, RecherchesPanel boutons icônes aria-label, items répétés `<ul>/<li>`, `<a target=_blank>` rel=noreferrer LeadSlideOut). → voir `notes/audit-uiux-prospection-2026-05-01/{findings,actionplan}.md` § Vague 4 backlog

### 3. Validation cron veille W18 + cleanup stash [SUPERVISÉ • low • ~15 min]

**Pourquoi** : double validation gratuite. (1) La refonte LEAN S112 (commit `83fd7fd`) avec hot-fix bias géo SR n'a jamais été re-testée API. (2) L'intégration Veille→Prospection livrée S120 (commit `9df286e`) sera exercée pour la 1re fois en prod par ce cron : surveiller logs Vercel ligne `[veille→prospection] report 2026-W18 : N signal(s) lié(s), M lead(s) recalculé(s)`.
**Prérequis** : email cron W18 reçu sur `pascal@filmpro.ch` ou consultation /veille + accès logs Vercel. Date 2026-05-01 atteinte.

- [ ] **[EXÉCUTABLE]** Lire l'édition W18 reçue par email + sur /veille. Critères veille : (1) ≥1 item Suisse romande rangs 1-3, (2) sources crédibles, (3) anti-doublons W16/W17, (4) compliance_tag cohérent, (5) volume 5-10 items. Critères Veille→Prospection (S120) : (a) hook `applySignalsFromReport` dans logs Vercel sans exception, (b) éventuels leads existants matchés voient `score_pertinence` mis à jour. → voir `memory/project_veille_S112_apprentissages.md` et `memory/project_veille_prospection_integration_s120.md`
- [ ] **[BLOQUÉ - validation Pascal cron 01/05]** Drop stash `stash@{0}` (`git stash drop stash@{0}`) une fois la refonte LEAN considérée stable. Le stash contenait des éléments S110 chantier B déjà intégrés ou écartés.

### 4. Phase 3 prospection - généalogie cross-pages [MIXTE • xhigh • 4-5h]

**Pourquoi** : pain 3 « fil perdu après transfert ». Restaurer le lien Veille → Lead → Entreprise → Opportunité via breadcrumb + encart « Origine ». Reporting 3 KPIs distincts au lieu d'un KPI flou.
**Prérequis** : Phase 2 livrée ✓ (S157 commits `8ea58e2`+`7fa7829`+`a48a9c1`), tests E2E Phase 2 idéalement livrés (Bloc #1) avant pour éviter régression silencieuse pendant Phase 3.

- [ ] **[BLOQUÉ - validation visuelle Pascal Phase 2 prod 1-2 jours]** Phase 3 généalogie : encart "Origine : lead X importé le DD/MM par Pascal, source Zefix CHE-xxx" sur fiche entreprise + opportunité. Breadcrumb "Veille édition W18 → Lead → Entreprise → Opportunité" sur fiche opportunité (facultatif). Reporting 3 KPIs : (a) leads transférés ce mois, (b) opportunités gagnées issues de leads, (c) valeur moyenne opportunité par source initiale. → voir `memory/project_refonte_prospection_phase_0_1.md` § Phase 3

### 5. Dashboard coûts CRM [BLOQUÉ • high • session dédiée]

- [ ] **[BLOQUÉ - session dashboard dédiée]** Dashboard coûts CRM `/dashboard/couts` : table `cost_audit_runs` + graphique 12 sem + split cron/catégorie + seuils. → voir `memory/project_dashboard_costs_crm.md`

### Livré cette session (5 derniers)

- [x] ~~Batch fixes /prospection - 3 vagues post-audit S160 (4 C + 16 H + 5 M fixés)~~ - Fait 2026-05-02 (S162, SUPERVISÉ xhigh, ~5h cumulé). 3 commits push origin/main : `f5be833` Vague 1 bloquants prod (4h, 4 C + 2 H), `59bc636` Vague 2 a11y baseline WCAG AA (1.8h, 11 H), `4af587c` Vague 3 cohérence golden + sweeps Mediums (1.5h, 3 H + 5 M). 3 livraisons cockpit (`35f0ebc5`, `98294b6c`, `2c118d3e`). **Vague 1** : C-01 bouton Importer démasqué + empty state intermédiaire actionnable distinguant "filtres trop stricts" (CTA reset + Importer) de "onglet jamais peuplé" (CTA Importer ciblé). C-02 injection PostgREST search escapée (pattern S120 propagé sur main + tabCount via `runMainQuery()` et `runTabCount()`, 3 .ilike() en parallèle + Set dédup, escape `[%_\\]`). 4 tests vitest dédiés `load-search-injection.test.ts`. C-03 `<tr>` clavier (tabindex=0 + role=button + onkeydown Enter/Space). H-01 cause racine scroll vertical tabs : `overflow-x:auto;overflow-y:visible` + `min-height:60px` sur `.tabs-bar` ProspectionTabs.svelte. H-03 reset selectedIds switch onglet/filtres/reset. H-07 dedup createExpress reco (b) match strict documenté (logique S159 conservée + commentaire JSDoc enrichi). C-04 retiré du backlog (Header global porte le `<h1>` sémantique). Audit security-auditor Opus : 0 Critical/High/Medium, 1 Low cosmétique (commentaire) + 1 Info documenté. **Vague 2** : V2.1 ARIA tabs pattern complet (id="tab-{key}" + aria-controls + roving tabindex + handler ArrowLeft/Right/Home/End + tabpanel wrapper côté +page.svelte) + select mobile aria-label. V2.2 col-resizer keyboard (tabindex=0 + aria-orientation/valuenow/min/max + onkeydown ArrowLeft/Right ±10/Shift±50/Home/End). V2.3 Toast wrapper region+aria-live=polite + items role=alert(error)/role=status(autres) + LeadExpress errorMsg role=alert + selectAllNotice role=status. V2.4 search input type=search + aria-label + MultiSelectDropdown trigger aria-haspopup=listbox + aria-expanded + focus-visible:outline. V2.5 focus-visible globaux app.css étendu input/select/textarea + role=tab/menuitem/separator/option + [tabindex]. V2.6 ScorePill froid #475669→#3F4D5F (4.43→4.92:1 WCAG AA). V2.7 token --color-border-input #ADB5BD (3:1) sur LeadExpress 4 inputs + DataTable search + select pageSize. V2.8 Tooltip dismissible Escape via svelte:window onkeydown + state dismissed. V2.9 ConfirmModal pre-submit Écarter ≥10 prospects + Toast store étendu helper `withAction(msg, action)` + pattern Gmail "Annuler" 5s qui POST batchStatut statut=nouveau + invalidateAll. BatchActionsBar role=toolbar + aria-label. V2.10 errorMsg branche désambiguation. V2.11 LeadExpress step désambiguation role=status + aria-live + action focusOnMount. **Vague 3** : V3.2 ProspectionTabs désaturer (tab-icon-wrap repos neutre bg-surface-alt + couleur sémantique uniquement sur tab--active) + retrait transform scale + retrait count bg primary-light active. V3.3 TriageQueue calmer (background surface-alt vs primary-dark + count 44px vs 88px + ornements ::before/::after retirés + border-right au lieu de full bg dark). V3.4 bouton "Sauvegarder cette recherche" + panneau inline + fetch ?/saveRecherche. V3.5 sweeps M-01 (px-1.5→px-2 5 occurrences), M-02 (gap 10→12), M-03 (padding 22→24), M-05 (Tooltip top 10→12 + padding 10/14→12/16), M-12 (checkbox h-3.5→h-4), M-19 (font-size tab 15→14). V3.6 sweeps sémantiques scope=col tous `<th>` (M-36) + indicateurs flat `<dl><dt><dd>` (M-29) + filtres MultiSelect dans `<fieldset><legend class="sr-only">` (M-30 mobile + desktop). **H-19 pinned multi-col reporté Vague 4** (refactor sticky multi-cellules incompatible avec resizable colonnes livré S157, cadrage dédié requis). **QA** : vitest 414/414 verts (+4 nouveaux V1.2), build prod 10.67-12.20s OK, svelte-check 128 erreurs vs baseline 148 (régression nette : -20). **Reste backlog Vague 4** : H-19 sticky + 11 H bench externe résiduels (H-21 raccourcis clavier global Cmd+K) + sweep M-04..M-28 résiduels sur ~12 fichiers (LeadSlideOut, EnrichBatchModal, ImportModal, AlerteModal, RecherchesPanel) + sémantique M-32..M-37. Validation visuelle prod Pascal requise (DevTools manuel parcours P1-P4 catalogue findings) avant promotion gabarit + cascade 6 autres pages CRM.
- [x] ~~Audit UX/UI 360 /prospection - catalogue exhaustif + capitalisation skill (S160)~~ - Fait 2026-05-01 (SUPERVISÉ xhigh, ~3h30). Méthode 5 angles orthogonaux validée et inscrite dans skill réutilisable. **Méthode** : 5 agents subagents opus parallèles background : S1 code-review:code-reviewer (statique vs golden v7) + S2 code-review:bug-hunter (logique + edge cases) + S3 ui-auditor (chrome MCP + axe-core inline car CSP filmpro-crm bloque CDN) + S4 general-purpose+taste-skill (bench externe Linear/Stripe/Notion/Attio) + S5 general-purpose (Nielsen 10 heuristiques + WCAG 2.2 AA non-axe-core). ~190 findings bruts → **91 dédupliqués cross-source** (sévérité agrégée : 4 C / 27 H / 38 M / 17 L / 5 I). **4 Critical** : C-01 bouton Importer disparaît tabs vides Entreprises+Terrain (cause `{#if data.totalLeads > 0}` ligne 328 +page.svelte) + C-02 injection PostgREST `.or()` dans search non-escapée +page.server.ts:78+113 (pattern S120 jamais propagé hors all-ids) + C-03 `<tr onclick>` non opérable au clavier WCAG 2.1.1 niveau A + C-04 H1 sémantique manquant template (Header global porte un `<h1>` à confirmer si suffit). **Workflow critique cassé** : Lead express invisible sur desktop /prospection (`md:hidden` ligne 357). **Verdict** : /prospection N'EST PAS page modèle, ~16h batch fixes requis (3 vagues : 4h bloquants + 6h a11y + 6h cohérence). **Erreur de méthode reconnue + corrigée mid-session** : début de session j'ai dérivé en fix-au-fil (commits `45c83be` espace bouton + `c1c2502` NBSP + `2f7fa76` cascade flex-1 pour scroll vertical tabs + `0f19a84` double cadre DataTable embedded + sweeps statiques golden). Pascal m'a stoppé : « ta méthode d'audit doit être hyper structurée, rien ne passe à travers ta raquette ». Refonte méthode "5 angles + cross-check ≥ 2 sources + zéro fix pendant audit + validation catalogue avant batch fixes". **Cause racine scroll vertical tabs identifiée par S3 ui-auditor live** (mesure machine : scrollHeight 158 vs clientHeight 59 = 99px scrollable Y) : `overflow: auto` (X **ET** Y) + `height: 60px` figé sur `.tabs-bar` dans `ProspectionTabs.svelte:71`. **Mon fix flex-1 cascade `2f7fa76` n'a PAS résolu le bug** (cause différente). Vrai fix dans Vague 1 : `overflow-x: auto; overflow-y: visible` + `min-height: 60px`. **Bouton Importer bug aussi élargi** : confirmé par S3 sur tab Entreprises ET Terrain (2 tabs vides), pas juste 1. **4 livrables structurés** dans `notes/audit-uiux-prospection-2026-05-01/` : coverage.md (matrice figée Phase 0), findings.md (catalogue dédupliqué cross-check), actionplan.md (3 vagues séquentielles), verdict.md (synthèse exec score 5.8/10). **Capitalisation skill audit-uiux** (~30 min dernière demi-heure session) : SKILL.md réécrit `~/.claude/skills-library/audit-uiux/` avec 2 modes (A 360 batch nouveau validé S160 / B legacy multi-passes conservé) + 4 templates paramétrables (coverage/findings/actionplan/verdict avec placeholders {PROJET}/{PAGE}/{GOLDEN_VERSION}) + 5 prompts agents pré-rédigés (S1-S5) + agents/README.md workflow + 7 garde-fous gravés dont règle critique "zéro fix pendant l'audit" + leçon "fix flex-1 ne ciblait PAS la cause racine identifiée par audit machine". Cross-projet déjà actif via symlink `~/.claude/skills/audit-uiux/`. **QA mid-session** : vitest 410/410 verts, build prod OK, svelte-check 0 nouvelle erreur sur fichiers touchés. **Patterns best-in-class à pérenniser golden v+1** (5 Info) : ScorePill direction artistique #C0391A, anim spring `cubic-bezier(0.16, 1, 0.3, 1)` btn-action Notion-grade, tabular-nums counts, localStorage widths colonnes avec bornes garde-fou, concurrency guards 409 queue partagée. **Limitations harness signalées** : chrome MCP `resizeTo` silent reject → viewports 1920/1440/1024/430/932 non testés objectifs (validation manuelle Pascal DevTools requise pour batch fixes responsive) + CSP filmpro-crm bloque axe-core CDN → S3 fallback heuristique inline ~12 règles vs ~30 axe-core complet + LCP/CLS PerformanceObserver inactif rétroactif. **3 décisions de policy** à trancher avec Pascal avant Vague 1 : D1 échelle spacing étendre à 28 ou aligner indicateurs flat à 32 ?, D2 h-11 mobile exception HIG documentée golden v8 ?, D3 H1 sémantique Header global suffit (oui d'après Header.svelte:33) ?
- [x] ~~Dette dedup `createExpress` multi-sites fermée - risque préexistant S130/H4 S157~~ - Fait 2026-05-01 (S159, high, ~0.5h) : 1 commit `96575ec` push origin/main + entry cockpit `e4c4003c5ee6` delivered. Server `template/src/routes/(app)/prospection/+page.server.ts:466-488` : SELECT enrichi `id,raison_sociale,localite,telephone` ; logique 3 cas désambiguïsée : (a) `telNorm>=6` + match tel = silent redirect (signal fort, statu quo), (b) sinon 1 seul candidat = silent redirect, (c) sinon 2+ candidats sans tel discriminant = `fail(409, ambiguous: true, candidates: [{id, raison_sociale, localite}])`. Flag `force_create=1` (extrait de form.get) bypasse la dedup pour création explicite (chaîne, multi-sites volontaires). UI `template/src/lib/components/prospection/LeadExpress.svelte` : step désambiguation conditionnel sur `ambiguousCandidates.length > 0`, liste candidats raison + localité (fallback "Localité non renseignée" italique), bouton par candidat → `handleResolve(id)` redirect/toast prospect existant, bouton "Créer un nouveau lead" → `submitForm(true)` force_create=1, bouton "Retour" remet `ambiguousCandidates = []` sans perte saisie. Détection client via `result.type === 'failure'` + `payload.ambiguous === true`. 4 tests vitest `template/src/routes/(app)/prospection/createExpress.test.ts` mock Supabase chainable thenable offline (zéro réseau) : tel long + match unique = silent OK, tel court + 1 candidate = silent OK, tel court + 2+ candidates = fail(409) ambiguous, force_create=1 bypasse dedup. **QA** : vitest 410/410 verts (+4 nouveaux), build prod 17s OK, svelte-check 0 nouvelle erreur sur fichiers touchés. Stratégie désambiguation tranchée en début de session (modale options vs flag duplicate weak) : modale options retenue car zéro corruption métier + UX explicite. Pas d'audit subagent (périmètre ciblé sur dedup logique connue, zéro touche auth/sécu/data model).
- [x] ~~Tests E2E Phase 2 prospection - dette honnête S157 fermée~~ - Fait 2026-05-01 (S158, high, ~30 min) : 1 commit `7b859a9` push origin/main. `template/tests/prospection-phase2.spec.ts` ajouté avec 3 tests Playwright contre prod (preset desktop 1440x900 + iPhone 14 Pro Max spread `...devices['iPhone 14 Pro Max']` apportant userAgent Safari iOS + viewport 430×932 + DPR 3 + isMobile + hasTouch). Périmètre : (a) sélecteur entrées/page (URL `?perPage=50` + select reflète + persiste reload), (b) colonnes resizables (drag handle + localStorage `datatable.col-widths.prospection-simap` + restauration reload, skip drag mobile car `.col-resizer` hover-only - check structurel uniquement), (c) switch onglet Terrain potentiellement vide + retour SIMAP (régression 7fa7829 : tabs disparaissaient quand 4 tabCounts à 0). Mobile : tabs deviennent `<select>#tabs-mobile-select` <768px. **Régressions Pascal couvertes** : (a) `<select value={pageSize}>` + `<option value={opt}>` Svelte 5 cassait reflet, fix `selected={opt === pageSize}` (a48a9c1), (b) tabs disparaissaient quand totalLeads=0 (7fa7829). **QA** : 6/6 verts contre prod (`npm run test:prospection-phase2`), vitest 406/406 inchangé. **Migration règles tests mobile** du global méta `~/.claude/rules/methodology.md` vers projet AppFactory CLAUDE.md (section "REGLES TECHNIQUES PROJET") avec scope projet-only hors méta/Marketing/Enseignement. **Session CLI freeze** : Bloc #4 dedup createExpress démarré 15:57, freeze juste après (bug harness, état S+ sleeping, 0 connexion TCP, FD KQUEUE bloqué sur task in_progress, dernière écriture transcript 16:00). Pascal a `kill -9` PID 80932. **Clôture rétroactive complète** depuis transcript JSONL + git log dans session courante (16:20). Zéro perte de livrable - Bloc #4 jamais entamé côté code (template/ propre au moment du freeze). Dette CLI à signaler à Anthropic si récidive.
- [x] ~~S157 + S135 + S134 (détails archivés)~~ - Refonte /prospection phase 2 (S157), verdict taste-skill (S135), refonte /prospection phases 0+1 + scoring fix bimodalité + charte v7 (S134). → voir `archive/2026-05-01-sessions-s134-s157.md`
