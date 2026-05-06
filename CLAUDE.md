# AppFactory : CLAUDE.md

**Statut :** Phase C, GOLDEN STANDARD v9 LAYERED DS LIVRÉ (S172 2026-05-06) - 2 archétypes sources stricts /prospection (workspace) + /veille (editorial) + tokens/primitives universels. Mockup `/dashboard` validé, spec implémentation figée 28 AC. search.ch 2e source découverte LIVRÉ (S171). Pipeline veille ANTI-HALLUCINATION V2 LIVRÉ (S168). /prospection FIGÉE PAGE MODÈLE GOLDEN V9 (S165). Cron veille externalisée GHA (S167). Audit UX/UI 360 LIVRÉ (S160). V2 mobile terrain CLOS (S127α+S129β+S130γ). Formation IA = sous-projet autonome dans `formation-ia/`, `cc` option 5.
**Derniere mise a jour :** 2026-05-06 (S172 xhigh : Golden v9 layered DS - 5 fichiers split tokens + primitives + 2 archetypes-*.json + mapping.md + visualizer.html, périmètre source strict /prospection + /veille uniquement, /dashboard et autres pages = consommatrices identité propre figée post-refonte ; mockup `/dashboard` HTML autoportant validé Pascal pattern Bento asymétrique « inbox du matin du fondateur » ; spec implémentation 28 critères acceptation figés AVANT impl Svelte session suivante). Aucun commit push (artifacts design system local), session prép pure.
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session courante :** Session 172 (CRM, 2026-05-06, `/effort xhigh`, Golden v9 layered DS + mockup /dashboard validé + spec implémentation 28 AC figée).
**Sessions précédentes (condensé)** - détail S165-S172 : `archive/2026-05-06-sessions.md`. Détail S122-S125 : `archive/2026-04-28-sessions.md`. Détail S78-S79 : `archive/decisions-sessions-78-79.md`. Détail S70-S77 : `archive/decisions-sessions-70-77.md`. Détail S80-S107 : `formation-ia/CLAUDE.md` (sous-projet autonome).


---

## SOUS-PROJETS

L'arborescence d'AppFactory héberge des sous-projets autonomes (chacun a son propre repo Git, sa propre stack, son propre CLAUDE.md). Pascal navigue par thème depuis ce dossier.

| Dossier | Repo Git | Statut | URL prod | CLAUDE.md |
|---------|----------|--------|----------|-----------|
| `template/` (CRM FilmPro) | `pascalmedecin-cmd/appfactory-cli` (=racine actuelle) | Production | <https://filmpro-crm.vercel.app> | (ce fichier) |
| `formation-ia/` | `pascalmedecin-cmd/onboarding-ia` (séparé, ignoré dans `.gitignore`) | S1→S7 livrés (12/12 modules en prod) | <https://onboarding-ia.vercel.app> | `formation-ia/CLAUDE.md` |
| `Consulting/` | (interne au repo `appfactory-cli`, séparation prévue lors du restructure - voir mémoire `project_appfactory_restructure.md`) | Setup S171 2026-05-06 (Phase 1 cadrage à démarrer) | (pas encore d'URL prod, cible Cloudflare Pages) | `Consulting/CLAUDE.md` |

Pour travailler sur un sous-projet : taper `cc` au terminal et choisir `5. Formation IA` ou `4. Consulting`. Claude Code atterrit directement dans le sous-dossier, charge son `CLAUDE.md` propre (plus léger), et les tâches sont scopées. Les tâches du sous-projet sont tracées dans son CLAUDE.md, pas dans celui-ci.

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

**Prochaine attaque** : Bloc #1 - Refonte UI dashboard CRM v9. Implémentation Svelte sur la base du mockup HTML validé S172 (notes/refonte-dashboard-2026-05-06/mockup.html) et de la spec 28 critères acceptation figée (notes/refonte-dashboard-2026-05-06/spec-implementation.md). 6 phases (~3h xhigh) : SectionGreeting + KpisBento + TriageQueue refactor + ActiviteTimeline/RelancesList + AlertesStrip/QuickActions + page.svelte refactor. Audit security-auditor en fin. Vendredi 08/05 06h UTC : cron auto GHA W19 partira avec pipeline anti-hallu V2 + taxonomie DB S169 + strip cite S170 + cross-check durci S170 (audit hallu tâche #2 toujours bloquée jusqu'au run).


<!-- BEGIN CONSOLIDATION (auto-géré par cockpit, ne pas éditer) -->

### Consolidation cockpit (maj 2026-05-06T16:50:06)

**Blocs actionnables** (ordre d'attaque) :

- **Bloc #1** - Refonte UI dashboard CRM (charte v9) (3.0h, confiance Élevé)
  - Objectif : Aligner /dashboard sur charte /prospection (ScorePill, TriageQueue sans fond bleu, ActionButton flat)
  - Ajuster UI page dashboard

<!-- END CONSOLIDATION -->

### 0. Migration AppFactory restructure (CRM descend dans CRM/, Formation IA → Formation/, Wizard → Wizard/) [HIGH • xhigh • 1 session dédiée • 2-4h]

**Pourquoi** : isoler les sous-projets pour éliminer le chargement parent CLAUDE.md cross-projet. Aujourd'hui Consulting (créé S171 dans `AppFactory/Consulting/`) hérite du contenu CRM via Claude Code memory hierarchy. Migration coupe l'héritage parasite et fait d'AppFactory un container minimal (stub `CLAUDE.md`).
**Prérequis** : fenêtre 2-4h calme (hors heures prod CRM) + build CRM vert + build Formation IA vert + WIP fermé + git status clean.

- [ ] **[EXÉCUTABLE]** Migration AppFactory restructure → voir `~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/project_appfactory_restructure.md` (9 étapes ordonnées : tag git pré-migration → wizard → formation-ia → CRM → stub `AppFactory/CLAUDE.md` → menu cc → mémoires Claude → tests build → push). Tag git pré-migration impératif (rollback en 1 commande si Vercel cassé). Ne pas démarrer sans validation explicite Pascal.

### 1. Cascade gabarit /prospection sur 6 pages CRM [MIXTE • xhigh • cascade 3-4 sessions]

**Pourquoi** : /prospection figée page modèle S164+S165. Cascade ordonnée des patterns golden v9 (ARIA tabs distinctifs underline, dense table avec sticky 2 cols + alignement td +4px, ScorePill, ConfirmModal, focus-visible globaux, empty states contextuels, aria-label tr, ImportModal contextuel premium 3 parcours, header condensé avec actions descendues dans tabs-bar, type Column.srLabel pour headers vides) sur les 6 autres pages CRM. Évite la dérive de design system.
**Prérequis** : aucun (page modèle figée).

- [x] **[EXÉCUTABLE]** Cadrage cascade gabarit : audit éclair des 6 pages cibles vs golden v9 (5-10 min/page). Identifier écarts critiques par page (a11y, sémantique, tokens, composants partagés). Proposer ordre d'attaque (priorité usage métier × écart). → voir `notes/audit-uiux-prospection-2026-05-01/verdict.md` § page modèle
- [x] **[BLOQUÉ - cadrage cascade validé]** Cascade page 1 : /dashboard ou /pipeline (selon arbitrage Pascal sur priorité métier). Reco S170 : `/pipeline` priorité drag prospects. → voir `notes/audit-uiux-prospection-2026-05-01/verdict.md`
- [x] **[BLOQUÉ - cascade page 1 livrée]** Cascade pages 2-6 : /contacts, /entreprises, /signaux, /veille + page restante. Audit security-auditor cumulé en fin de cascade.
### 2. Audit zéro hallucination contenu veille W19 [SUPERVISÉ • medium • ~30-45 min]

**Pourquoi** : valider que l'édition générée via GHA (W19 vendredi 08/05 par le cron auto, OU rattrapage manuel via workflow_dispatch) respecte les critères veille standard ET que le LLM n'invente pas de contenu (chiffres, citations, dates, noms d'entreprises). Le pipeline tourne maintenant 5-10 min sans cap durée, plus de surface pour générer du contenu sourcé. Détecter toute hallucination avant utilisation côté CRM.
**Prérequis** : édition W19 publiée en DB (cron auto ou workflow_dispatch). W18 déjà publiée S167 = baseline anti-doublons.

- [x] **[BLOQUÉ - édition W19 publiée en DB cron auto vendredi 08/05]** Audit zéro hallucination contenu veille W19. Pour chaque item du rapport : (1) ouvrir l'URL source réelle, (2) vérifier que le titre/résumé correspond au contenu réel de la page (pas d'invention de chiffres, dates, citations, noms d'entreprises, pas d'extension d'énumération, pas de traduction technique imprécise — règles cross-check durcies S170), (3) vérifier `published_at` LLM vs date réelle (tolérance 30j fenêtre étendue), (4) flagger toute hallucination détectée. Bonus : critères veille standard (≥1 item Suisse romande rangs 1-3, sources crédibles, anti-doublons cross-éditions, compliance_tag cohérent, volume 5-10 items) + hook `applySignalsFromReport` sans exception dans logs GHA. → voir `memory/audit_veille_2026-05-06_W18_post_pipeline_v2.md` (méthodo) + `memory/project_veille_S112_apprentissages.md`
### 3. Suppression handler legacy /api/cron/intelligence [SUPERVISÉ • low • ~15 min]

**Pourquoi** : info accepté audit S167 Bloc #2. Le handler SvelteKit `/api/cron/intelligence` reste vivant après désactivation du cron Vercel (rétrocompat / debug). Surface d'attaque mineure : un attaquant qui leak `CRON_SECRET` peut curl Vercel + timeout 504 (cost burn). À retirer après 2 runs GHA verts en prod (cron auto vendredi 08/05 + rattrapage W18 déjà OK = 1/2).
**Prérequis** : ≥ 2 runs GHA verts en prod (S167 = 1, attendre cron auto vendredi 08/05 = 2).

- [ ] **[BLOQUÉ - cron auto GHA vendredi 08/05 vert]** Supprimer `template/src/routes/api/cron/intelligence/+server.ts` + `template/src/routes/api/intelligence/trigger/+server.ts`. Vérifier qu'aucun appel externe ne dépend (grep cross-ref). Audit security-auditor sur le diff (suppression code = surface d'attaque retirée). → voir `memory/audit_secu_2026-05-04_veille_gha_externalisation.md` § Info #1

### Watch list S171 (post-livraison)

- **[WATCH] Compteur quota search.ch côté DB (post-S171)** (vu 2026-05-06) : search.ch ne fournit pas d'API publique pour lire le compteur quota mensuel (uniquement tableau de bord compte search.ch). Pour visibilité ops « il reste N requêtes ce mois » dans CRM → table `api_quota_log` ou colonne incrémentale `searchch_calls_YYYYMM`. Pas critique tant que Pascal contrôle l'usage, à graver tâche si l'usage atteint 50%+ du quota sur un mois.
- **[WATCH] `prospect_leads.description` consommée par LLM future (audit S171 Info #1)** (vu 2026-05-06) : description = `occupation + categories.join(' / ')` (categories user-influenced via `was=` query search.ch). Aucun pipeline LLM ne consume cette colonne aujourd'hui. Si pipeline future (scoring auto, qualification, génération mail) → appliquer cross-check verbatim pattern S168. → voir `memory/audit_secu_2026-05-06_searchch_endpoint.md`.
- **[WATCH] `entry.sourceUrl` rendu href client (audit S171 Info #2)** (vu 2026-05-06) : la nouvelle colonne `prospect_leads.source_url` peut désormais pointer vers une URL search.ch arbitraire. UI rendant `<a href={sourceUrl}>` doit confirmer filtrage `https?://` côté client (defense in depth Svelte). search.ch retourne uniquement `https://tel.search.ch/...` aujourd'hui, mais aucune garantie contractuelle. Audit visuel rapide LeadSlideOut + DataTable au prochain passage.
- **[WATCH] Race condition `addItem` veille (Low #3 audit S169)** : form action `addItem` sur `/veille/[id]` fait read-modify-write non-atomique sur `intelligence_reports.items` JSONB via service client. Si 2 admins ajoutent simultanément depuis 2 onglets, le second écrase le premier (perte silencieuse, pas exploitable). Mitigation suggérée : optimistic locking via colonne `version` si volume augmente. → voir `memory/audit_secu_2026-05-05_veille_themes_db.md` Low #3.
- **[WATCH] Injection prompt LLM via description thème (Info #1 audit S169)** : la description d'un thème admin est concaténée dans `SYSTEM_PROMPT` via `buildThemesPromptSection`. Validation Zod limite à 500 chars mais aucun escape. Modèle de menace = admin authentifié déjà accès complet au CRM (faible risque). Cross-check verbatim Sonnet S168 protège la sortie LLM. Mitigation suggérée si surface s'élargit : escape `\n` + délimiter `<themes_taxonomy>` XML-like. → voir `memory/audit_secu_2026-05-05_veille_themes_db.md` Info #1.
- **[WATCH] Cron auto GHA vendredi 08/05 06h UTC W19 = premier run autonome avec taxonomie DB** : observer le run, vérifier que `loadThemeBundle` retourne bien `source: 'db'` et 10 thèmes (pas fallback hardcoded). Logs `themes_loaded` dans phase log run-generation. Si fallback déclenche → DB inaccessible (RLS, network) à investiguer.

### Livré cette session (5 derniers)

→ Sessions antérieures : archive/2026-05-04-sessions.md

- [x] ~~S172 - Golden Standard v9 layered DS (2 archétypes sources stricts /prospection + /veille) + mockup /dashboard validé + spec implémentation 28 AC figée~~ - Fait 2026-05-06 (xhigh, ~2h30 cumulé). Aucun commit (artifacts design system + spec, pure session prép). **Golden v9 livré** : 5 fichiers split dans `.claude/goldens/v9-2026-05-06/` (tokens.json palette/typo/spacing/radius/shadow/a11y, primitives.json Button/Modal/ScorePill/ActionButton/DataTable/Tabs/SlideOut/ConfirmModal/ImportModal, archetype-workspace.json source /prospection figée S164+S165, archetype-editorial.json source /veille S132/S168, mapping.md table page→rôle/archétype + cascade order, visualizer.html 74 KB autoportant 9 sections naviguables avec checklist localStorage) + bundle agrégé `.claude/goldens/audit-uiux-golden-v9-2026-05-06.json` pour compat skill audit-uiux + symlink `.claude/audit-uiux-golden-current.json` retag v5→v9. **Modèle layered DS** (pattern Linear/Stripe/Atlassian) : tokens + primitives universels héritages, 2 archétypes sources STRICTS basés sur les 2 pages CRM figées. **Périmètre source strict** corrigé en cours (initialement archetype-dashboard inclus, retiré sur arbitrage Pascal « le golden doit avoir comme base UNIQUEMENT prospection + veille ») : /dashboard et toutes les autres pages = consommatrices, identité propre figée à leur refonte. **Mockup /dashboard refonte v9** : `template/notes/refonte-dashboard-2026-05-06/mockup.html` (47 KB autoportant DM Sans + Lucide SVG inline). 6 sections Bento asymétrique avec identité éditoriale propre « inbox du matin du fondateur » : (1) hero greeting kicker pulsing + h1 « Bonjour Pascal. » + summary 1-ligne contextuelle « 3 leads, 8 marchés, 2 relances. Le reste peut attendre. », (2) KPIs Bento 12-cols 6+3+3 jamais 4-equal-cards (vedette primary-dark ornements + count 76px tabular-nums + CTA, splits trends success/warn), (3) TriageQueue raffinée vedette section-head + radius-3xl + grid 96px col fix alignement Y noms + footer dégradé, (4) duo 60/40 timeline activité + relances cards stack, (5) alertes strip 50/50 border-left coloré + icon tint, (6) quick actions 4 cards primary→white hover. **Premium signals** : spring physics cubic-bezier(0.16,1,0.3,1) partout, stagger 60ms entry, diffusion shadow `0 8px 24px -12px rgba(17,24,39,0.10)`, eyebrow tags pulsing 2.4s, gradient text uniquement sur prénom (subtil), zéro purple/lila/neon, données réelles FilmPro (Glas-Pro-Tect, Vitrerie Lausanne, Marché Champel SIMAP, Helvetia Energy), prefers-reduced-motion respecté. **Spec implémentation figée** TDD agent-driven : `template/notes/refonte-dashboard-2026-05-06/spec-implementation.md` 28 critères acceptation binaires (AC-1 à AC-28) + 6 phases impl (~3h estimé xhigh) + hors-scope explicite + Done explicite + 5 risques anticipés. **3 skills design activés** session : taste-skill (high-agency frontend, anti-slop), soft-skill (high-end agency $150K feel), redesign-skill (refonte respectant stack). Restent symlinkés `~/.claude/skills/` pour session suivante. **Conflits stack notés** (skills présupposent React/Phosphor/Geist, on reste SvelteKit/Lucide/DM Sans) : concepts transférables (Bento 2.0, Double-Bezel, spring physics, diffusion shadows, eyebrow tags), Framer Motion → svelte/transition + svelte/motion. **Watchlist** : (a) symlink `redesign-skill` était déjà actif S163 (taste-skill placé en biblio), (b) la spec implémentation reste à exécuter session suivante 3h xhigh, AC-28 audit security-auditor obligatoire fin de cascade.

- [x] ~~S171 - search.ch comme 2e source découverte tab Entreprise /prospection + parser refit format API réel + clé Vercel resync prod+preview + fix literal source canonique~~ - Fait 2026-05-06 (high, ~2h30 cumulé). 3 commits push origin/main : `a1a6eaf` livraison initiale (helpers + endpoint POST `/api/prospection/searchch` + 64 tests + UI ImportModal 4e source parcours search-first charte v9 + wire `/prospection` tab Entreprise) ; `c27e643` refit format API réel + diagnostic 403/429 séparé ; `d1388d2` fix runtime literal source `'searchch'` → `'search_ch'` aligné sur check constraint DB `prospect_leads_source_check` (migration S40 `20260411_001_sources_regbl_minergie.sql` autorise `IN ('zefix', 'simap', 'sitg', 'search_ch', 'fosc', 'regbl', 'minergie')`, valeur canonique déjà utilisée dans `enrichir-batch/helpers.ts:137`). **Endpoint** : auth gate `safeGetSession` + validation Zod-style stricte (terme métier ≥ 3 chars + denylist 17 mots-vides légaux + canton CH romand requis + ville optionnelle ≤ 60 chars + UUID `from_intelligence` regex strict + `from_term` tronqué 200 chars), appel `tel.search.ch` (`firma=1` + `privat=0` + `maxnum=20` cap dur), `AbortController` timeout 10s, cap `Content-Length`+`xml.length` 2 Mo, parsing Atom XML, dédup intra-source via `tel:id` stable hex 8+ chars (préfixé `id:`) + fallback synthétique `{nom_normalisé}|{npa}` + dédup `dismissed`, scoring + bonus signal Veille, insertion batch avec email/site_web/source_url canoniques + canton officiel search.ch validé regex `^(GE|VD|VS|NE|FR|JU)$`. **Cause racine bug live découvert mid-session** : Pascal a testé live → erreur quota apparente. Diagnostic factuel via curl direct API search.ch → HTTP 403 + Atom errorMessage "API-Key is invalid or blocked". Pas un quota. Clé `.env.local` ET clé Vercel (33j d'âge) étaient une ancienne clé bloquée. Pascal a fourni nouvelle clé fonctionnelle `ce43c12395aef3c4447355889d0c9c9c` validée live HTTP 200 + 20 entries vitrerie/Genève. **Refit parser sur format API réel** : capture live a révélé `tel:id` UID stable 16 chars hex (remplace source_id synthétique fragile), `tel:category` cardinalité N (Vitrerie, Stores, Construction métallique...) meilleur signal secteur que `tel:occupation` rare en firma=1, `tel:extra type="email"` (suffixe `*` refus pub à stripper) + `tel:extra type="website"` (format `"www.x.tld: https://..."` ou domaine seul), `<link rel="alternate" type="text/html">` source_url canonique page firme, `<title type="text">` (attribut sur tag d'ouverture → `extractTag` rendu tolérant `<${tag}(?:\\s[^>]*)?>`), `<tel:canton>` officiel utilisé en priorité validé regex liste blanche. **Test live parser** sur capture API réelle (20 entries vitrerie/Genève) : 20/20 entries extraites avec téléphone E.164 + adresse + NPA + canton + catégories multiples + email (quand dispo) + website canonique + source_url public + source_id stable + secteur détecté via categories. **Update env Vercel** : ancienne clé supprimée + nouvelle clé ajoutée Production via `vercel env add` puis Preview via API REST Vercel directement (CLI plugin claude refusait stdin non-interactif → token `~/Library/Application Support/com.vercel.cli/auth.json` + POST `https://api.vercel.com/v10/projects/{projectId}/env`) + vérification round-trip via `vercel env pull` Production+Preview avec assertion clé exacte. Ancien `.env.local.bak.20260506` supprimé proprement post-validation. Deploy Vercel Production status `Ready` post-push validé. Bloc #2 cockpit `delivered` via `cockpit/bin/deliver.py`. **Diagnostic ops 403 vs 429 séparés** : 403 → 503 client + message dédié « Clé API search.ch invalide ou bloquée », 429 → 429 client + message Quota dédié. Évite confusion config vs quota. **Tests** : vitest **666/666 verts** (+76 vs baseline S168 = 590 : 45 helpers searchch + 19 endpoint server.test). Svelte-check **129/33** = baseline S168 strictement inchangée. Build prod 9.54s OK. **Audits Opus** : 1er pass `code-review:security-auditor` 0 C / 0 H / 1 M (M1 fuite clé API logs) / 3 L → fixes session zéro dette : `sanitizeApiKeyInLogs` regex `/key=[^&\\s'"]+/gi` defense in depth, cap taille 2 Mo Content-Length+xml.length, extractTag simplifié + tolérant attributs, message DB générique côté client + log détaillé serveur, bonus AbortController 10s + clearTimeout finally + différenciation AbortError. Re-audit final **0 C / 0 H / 0 M / 0 L sécu**, 11/11 OWASP applicables verts. 2e pass post-refit (parser format réel + 403/429 séparé) : 0 C / 0 H / 0 M / 0 L confirmés (extractExtra + extractAlternateLink linéaires non ReDoS, cleanWebsite filtre http/https rejette javascript:/data:, cleanEmail validation regex rejette injections, canton whitelist regex zéro injection PostgREST, buildSourceId préfixe id: ne collisionne jamais avec format synthétique). Push autorisé. 2 watch informatifs hors scope sécu : (a) si pipeline LLM future consume `prospect_leads.description` (categories user-influenced via was=) → appliquer cross-check verbatim pattern S168 ; (b) UI rendant `entry.sourceUrl` comme href cliquable → confirmer filtrage `https?://` côté client defense in depth Svelte. Artefact `memory/audit_secu_2026-05-06_searchch_endpoint.md`.
- [x] ~~S170 - Strip cite tags veille + audit zéro hallu W18 + durcissement cross-check + refonte grille header édition~~ - Fait 2026-05-06 (xhigh, ~3h cumulé). 5 commits push origin/main : `41f8c1b` strip cite (helper post-LLM `stripCitationTags` + 2 wrappers FromItem/FromReport, regex linéaire DOTALL boucle idempotence 10 passes, branchement run-generation.ts avant upsert + form action addItem manuel, 24 tests TDD : cite seul/imbriqué/multiligne/attributs variants index|end|data-*|quotes simples-doubles/cas dégénérés null undefined orphelin/casse insensible) ; cleanup DB W18 in-session (3 items × 6 cite stripées via PATCH PostgREST). `6e23b35` UI bouton « Ajouter un item » déplacé dans masthead à droite au-dessus du bloc « Publiée le » (demande Pascal mid-session). `ad21207` refonte grille header édition `/veille/[id]` : container flex `items-end` → `items-start`, regroupe kicker+h1+paragraphe en colonne gauche cohérente max-w-3xl, colonne droite shrink-0 button + date gap-6, date visible aussi mobile (retrait `hidden md:block`). `c51a78d` durcissement cross-check anti-paraphrase imprécise (audit zéro hallu W18 post pipeline V2 a identifié 2 patterns laissés passer comme severity=minor S168 : extension d'énumération item 1 « façades, toitures, sols » → « fenêtres et toitures » ajoute fenêtres + supprime façades+sols ; traduction technique imprécise item 2 « Magnetic fixed-sash stop » → « fixe magnétique sur seuil affleurant ») : 2 nouvelles règles SYSTEM prompt avec exemples W18 explicites + 2 tests régression vitest mockés sur ces patterns (severity=fatal attendu) + patch DB W18 ciblé via PATCH PostgREST (item 1 → verbatim « façades, toitures et sols », item 2 → « butée magnétique pour fenêtres à double vantail »). **Audit zéro hallucination W18 post pipeline V2** : 3 subagents parallèles fetch direct URLs sources Helvetia Energy / Glassonweb Fensterbau / Glassonweb ICCG → 0 hallu grave 3/3 items, 2 imprécisions paraphrase mineures fixées. Pipeline V2 S168 a tenu (cross-check Sonnet bloqué 13 hallu amont sur 4 items rejetés citations PatSnap/emeenergies/wonderglass/energisme inventées). Volume 3/8-10 sous-cible : limite structurelle niche métier acceptée. Artefact `memory/audit_veille_2026-05-06_W18_post_pipeline_v2.md`. **Tests** : vitest 590/590 verts (+26 vs baseline S169 = 564 : 24 strip-citations + 2 cross-check régression). svelte-check 129/33 = baseline S169 strictement inchangée. Build prod 11.68s OK. **Audit Opus security-auditor** sur strip-citations : 0 C/H/M/L, 1 Info accepté no-debt (faux positif théorique `<cite>` HTML légitime, non exploitable scope veille B2B + Svelte auto-escape downstream defense in depth). 11/11 OWASP applicables verts. ReDoS impossible (regex linéaire `[^>]*` borne, `[\s\S]*?` non-greedy ancré, pas alternance imbriquée), boucle 10 passes bornée, smuggling impossible (Svelte échappe), null/undefined narrowed via overloads. Artefact `memory/audit_secu_2026-05-06_strip_citations.md`. **Vendredi 08/05 06h UTC** : cron auto GHA W19 partira avec pipeline V2 S168 + taxonomie DB S169 + strip cite S170 + cross-check durci S170. Garantie zéro hallu structurellement renforcée bout en bout.
- [x] ~~S169 - Module gestion thèmes veille DB + addItem manuel + pipeline LLM dynamique~~ - Fait 2026-05-05 (xhigh, ~3h30). 1 commit push origin/main : `ba1d0d7` (19 fichiers, +1905 / -42). **Bloc #4 spec S168 livré complet en 1 session**. **DB** : migration `20260505_001_veille_themes.sql` (10 thèmes seedés, 5 cœur métier existants + 3 nouveaux `vitrages_haute_performance` / `confort_thermique_tertiaire` / `facades_innovantes` + `ia_outils` + `autre`, RLS public read + service-role writes, trigger updated_at, INSERT ON CONFLICT idempotent). Appliquée prod via SQL Editor Pascal pas-à-pas. **API** : 3 endpoints REST `/api/veille/themes` (GET auth via `safeGetSession`, POST + PATCH service client après check auth, validation Zod stricte slug snake_case + category enum + sort_order int positif + 409 conflict si slug dup). **Page admin** `/veille/themes` (DataTable + ModalForm create/edit + ConfirmModal toggle active, charte v9, 4 form actions create/update/toggleActive/validateSlug, lookup auto next sort_order +10 sur création) + bouton « Gérer les thèmes » depuis `/veille`. Icon `eye_off: EyeOff` ajouté à `icon-map.ts`. **Pipeline LLM** : `theme-loader.ts` charge actifs depuis DB ordonnés sort_order via `loadThemeBundle(client)` avec **fallback hardcoded** `getFallbackBundle()` si DB vide / inaccessible / exception (cron veille hebdo ne doit JAMAIS rater un run pour erreur taxonomie). `prompt.ts` refactor : `SYSTEM_PROMPT` → `SYSTEM_PROMPT_TEMPLATE` avec placeholder `{{themes_section}}` + helper `buildSystemPrompt(themesSection)` + helper `buildReportJsonSchema(allowedSlugs)` qui clone profond via `JSON.parse(JSON.stringify(REPORT_JSON_SCHEMA))` pour injecter enum dynamique sans muter le const exporté (vérifié par test régression cross-call). `schema.ts` : `theme: z.string().min(1).max(64)` au lieu de `ThemeEnum`, `ThemeEnum` reste exporté pour rétrocompat lecture éditions antérieures, type `Theme` aliassé `string`. `generate.ts` : `opts.themes?: ThemeBundle` injecté + appel `buildSystemPrompt(buildThemesPromptSection(themes))` + `buildReportJsonSchema(themes.allowedSlugs)` + **allowlist post-Zod** : si LLM sort un thème inconnu, dégrade en `'autre'` avec log warn (perte info éditoriale > coût rejet item entier). `run-generation.ts` : appelle `loadThemeBundle(deps.supabase)` AVANT `generateIntelligenceReport`, log phase `themes_loaded` (source, count, core, adjacent), puis passe le bundle dans opts. **Ajout manuel items** : form action `addItem` sur `/veille/[id]` (Zod `ManualItemSchema` 11 champs + dropdown thème dynamique chargé via `listActiveThemes` côté load + re-validation serveur `allowedSlugs.has(theme)` + `sanitizeUrl` + `verifyUrl` bloquant 404/paywall/timeout + `isDeniedSource` denylist hostname + `buildDefaultChips(title)` génère 2 chips SIMAP+Zefix VD auto + UPDATE intelligence_reports.items via service client). Modal full UX 11 champs (URL/source/date/titre/résumé/relevance/thème/segment/géo/maturité/actionnabilité). Pas de cross-check verbatim LLM (Pascal valide manuellement, ROI trop faible vs ~30s appel Anthropic). **Tests** : vitest **564/564 verts** (+31 vs baseline S168 = 533 : 15 themes-repository.test.ts + 16 theme-loader.test.ts incluant cas DB error / vide / exception + buildSystemPrompt placeholder + buildReportJsonSchema mutation cross-call). svelte-check 129/33 (vs baseline 128/32 : +1 erreur EyeOff icon-map dette legacy fichier déjà 100+ erreurs identiques + 1 warning state_referenced_locally cosmétique init défaut modal). Build prod 27s OK. **Audit Opus security-auditor** : **0 Critical / 0 High / 0 Medium / 3 Low cosmétiques + 2 Info**, 11/11 OWASP applicables verts, push autorisé. 3 Low non bloquants (race condition addItem read-modify-write non atomique, slug regex `__proto__` non exploitable Set.has, form actions sans Origin check explicite mitigé csrf.checkOrigin SvelteKit + ALLOWED_DOMAINS). 2 Info acceptés (issues Zod brutes API REST cosmétique scope CRM interne, JSON clone profond pattern correct test régression présent). Artefact `memory/audit_secu_2026-05-05_veille_themes_db.md`. **Surprise mid-session** : regen types DB a exposé `prospect_lead_signals` manquante en prod (migration S120 `20260427_001_lead_signals.sql` jamais appliquée 8 jours, cron `lead-rescore` mort silencieux). Rattrapée immédiatement via SQL Editor Pascal pas-à-pas zéro dette. Types régénérés. **Vendredi 08/05 06h UTC** : cron auto GHA W19 utilisera désormais la taxonomie 10 thèmes injectée dynamiquement depuis `veille_themes` (logs `themes_loaded source: 'db'` à observer). **Watchlist** post-livraison 3 entries (race addItem, prompt injection thème admin, 1er run W19 avec taxonomie DB).
- [x] ~~S168 - Pipeline veille anti-hallucination V2 + whitelist 7 tiers + audit W18 + relance live~~ - Fait 2026-05-05 (xhigh, ~7h cumulé). 4 commits push origin/main : `0dba1a8` 6 pièces (sanitize URL `',6` strip + verify bloquant + paywall hard 5 domaines + SSRF guard IPv4/IPv6 privées + cross-check Sonnet 4.6 verbatim chiffres/citations + sur-génération 8-15 candidats + cap PUBLISHED_ITEMS_CAP=10 + concurrency pool 4 + retry 429/529/503 backoff + Zod verdict strict severity required + status=error si cross-check global échoue), `6eeceef` fix Zod executive_summary 1200→2000 chars, `a12c6da` whitelist source-allowlist.ts 7 tiers + denylist hard 12 domaines W18 + 4 patterns blogspot/wordpress/medium @user/substack, `e0e8c28` enrichissement deep research +25 domaines (T1 +CORDIS/ANR/EWFA/IWFA, T7A +13 installateurs CH/FR/IT/BE/LU/EU benchmark, T6 +riouglass, +3 agrégateurs PR denylist openpr/pr.com/img.pr.com). **Test live workflow_dispatch run `25371022067`** : LLM a généré 9 candidats, **13 hallucinations bloquées par cross-check** (citations fabriquées sur emeenergies.ch + wonderglass.fr + energisme.com + chiffres inventés smart glass patsnap.com 25 557 brevets / $4.1B / $300-500/m² / ΔT 78%). 3 items publiés vrais (Helvetia Energy subventions VD 74M CHF / JU 4M CHF SR + Fensterbau Frontale 2026 Innovation Award Remmers Induline I-130 + ICCG 2026 conference coatings). reportId `cfa2fc46-922f-4467-9e92-f82b98add2e9`. **Garantie zéro hallu : tenue**. Volume cible 8-10 : non tenu (3 items) - cause structurelle confirmée niche métier films vitrage, taux rejet pipeline ~75%. **DB cleanup** : W16 + W17 supprimés (Pascal directive « seulement W18 en prod »), W19 ligne error supprimée (W19 sera créée proprement vendredi 08/05 par cron auto). **Variables GitHub** : `VEILLE_WINDOW_DAYS` 30→60. **Tests** : vitest 533/533 verts (+70 vs S167 : 16 url-sanitize + 9 url-verify + 14 cross-check + 11 url-guard + 19 source-allowlist + 1 schema). Svelte-check 128/32 = baseline S167 inchangée. Build prod 11s OK. **Audits Opus** : `code-review:security-auditor` initial 0 C / 0 H / 2 M / 3 L → fixes appliqués session zéro dette → **re-audit final 0 C / 0 H / 0 M / 2 L cosmétiques** hors scope sécu. 11/11 OWASP applicables verts. Artefact `memory/audit_secu_2026-05-05_veille_anti_hallu.md`. **Règle gravée** : `feedback_veille_url_active_obligatoire.md`. Audit W18 : `memory/audit_veille_2026-05-05_W18.md`. Spec : `memory/project_veille_anti_hallucination_pipeline.md`. **Watchlist** : (a) cron auto vendredi 08/05 06h UTC W19 = premier run autonome avec pipeline V2 + whitelist enrichie ; (b) volume éditorial vraisemblablement 3-5 items/sem stable, à valider sur W19+W20 avant trancher option « élargir scope thématique » ou « rester qualité ».
- [x] ~~S167 - Externalisation cron veille FilmPro vers GitHub Actions + rattrapage W18 prod~~ - Fait 2026-05-04 (xhigh, ~5h cumulé). 2 commits push origin/main : `82520cb` Bloc #1 (refactor portable injection de dépendances : `deps.ts` factory `buildVeilleDepsFromEnvObject`, `runWeeklyGeneration(now, deps)` au lieu de `$env/dynamic/private` + `createSupabaseServiceClient` ; `generateIntelligenceReport(input, {anthropicApiKey})` ; `sendRecapEmail(input, EmailRecapConfig)` ; rétrocompat 100% cron Vercel actuel via factory partagée). `4b2a514` Bloc #2 (workflow `.github/workflows/cron-veille.yml` cron `0 6 * * 5` + workflow_dispatch input `week` + concurrency lock `cron-veille` + permissions `contents: read` ; `template/scripts/run-veille.ts` standalone Node exécutable via `npx tsx` avec --week argv pour rattrapage manuel + --help + exit 0/1/2 ; `cli-args.ts` parser pur testable + `weekLabelToDate` ISO pivot dans `week-utils.ts` ; retrait entrée cron `/api/cron/intelligence` de `template/vercel.json`). **Détection critique mid-audit Bloc #2** : repo `pascalmedecin-cmd/appfactory-cli` visibility=PUBLIC (audit Bloc #1 avait accepté no-debt sur hypothèse fausse repo privé) → fix urgent in-session zéro dette : module `sanitize.ts` shared (`sanitizeForLog(msg)` + `sanitizeError(e)` réutilisant les 5 patterns regex de `markError` S166 : sk-ant-_, Bearer _, JWT eyJ_._._, Resend re_*, génériques api_key/token/secret/apikey) + sanitize sur tous les `console.error/warn` du chemin standalone qui atterrissent sur stdout job GHA public (markRunning failed, email-recap unexpected error ×2, apply-signals failure, panic handler ultime). **Setup GitHub** : 4 secrets repo + 3 variables configurés via `gh secret set --body` + `gh variable set` après pull `vercel env pull` + parser robuste param expansion (strip quotes englobantes + `\n` littéral final + CR/LF physique trailing) ; cleanup `.env.production.tmp` après push. 3 erreurs avant succès : (1) gh token sans scope `workflow` → `gh auth refresh -s workflow` (Pascal manuel), (2) PUBLIC_SUPABASE_URL invalide après strip incomplet (regex bash `[[ =~ ]]` foirait silencieusement, switch sur param expansion `${val#\"}` `${val%\"}` `${val%\\n}`), (3) `printf | gh secret set --body -` peut-être altère trailing → switch en `--body "value"` (argv local OK). **Validation E2E live** : workflow_dispatch `25341931985` rattrapage W18 succès en 286.3s (4min 46s, runner ubuntu-latest Node 24 + npm ci + npx tsx) ; phases captées par observability S166 : start → running_marked → previous_loaded (2 éditions, 8 items pour anti-doublons) → generate_start (windowDays=30) → generate_done (success=true, 6 items) → published (reportId `485ea5f7-8729-45c2-9547-15831a081d85`) → applySignalsFromReport 0/0/0 (normal backfill). Email récap envoyé. CRM `/veille` affiche désormais W18 (en plus de W17 du 24 avril). **QA** : vitest 463/463 verts (+31 vs baseline S166 = 432 : 11 deps.test + 8 cli-args + 9 weekLabelToDate round-trip + 14 sanitize × 5 patterns + cumul + wrappers Error/string/null/circular), svelte-check 128 errors / 32 warnings = baseline S166 strictement inchangée, build prod 13.68s OK. **2 audits Opus** : `code-review:security-auditor` Bloc #1 (DI refactor) 0 C/H/M, 1 Low accepté no-debt initialement (panic handler stdout, repo supposé privé), 2 Info ; `code-review:security-auditor` Bloc #2 (GHA workflow + argv) 0 C/H/M, 3 Low (action SHA pinning backlog, cron timing minute=0, dispatch gating single-user) + 3 Info (handler legacy à retirer S168+, email fallback déjà public, doc drift `pnpm tsx`→`npx tsx` fixé en session) ; après détection repo PUBLIC, fix sanitize.ts upgrade le Low #1 → résolu structurellement. 11/11 OWASP applicables verts. Defense in depth injection vérifiée explicitement par tests cli-args (`2026-W18; rm -rf /`, `$(whoami)`, `2026-W18 | cat` tous bloqués). Artefacts `memory/audit_secu_2026-05-04_veille_di_refactor.md` + `memory/audit_secu_2026-05-04_veille_gha_externalisation.md`. **Cron auto vendredi 08/05 06h UTC** : prochain run automatique GHA prendra le relai pour W19 sans action humaine (timeout-minutes: 30, concurrency lock cron-veille, durée illimitée). W19 reste en `status=error` (cleanup S166 post-timeout 504) jusqu'à régénération. Bloc #3 cockpit (endpoint admin rerun-week SvelteKit) **annulé** : redondant avec workflow_dispatch GHA + cap Vercel 300s rendrait l'endpoint inutile. Mémoire pattern : `project_veille_robustness_pattern.md` mis à jour. Index MEMORY.md mis à jour (2 nouveaux artefacts datés).
