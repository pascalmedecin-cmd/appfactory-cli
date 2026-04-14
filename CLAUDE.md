# AppFactory — CLAUDE.md

**Statut :** Phase C — Skills et templates HTML + module Veille sectorielle en production
**Derniere mise a jour :** 2026-04-14 (session 56 : Sprint 2 P1 anti-hallucination livré + fix robustesse images + cadrage refonte /veille validé pour sessions 57-58)
**Derniere revue /optimize :** 2026-04-05
**Prochain bug :** #001
**Session precedente -2 :** Sprint 1 P0 livré (`ba07149`) : strict tool use Sonnet 4.6 sur emit_report, doc Anthropic vérifiée avant code.
**Session precedente -1 :** Test empirique Sprint 1 P0 validé. Édition W16 hallucinée (cas Plattix) supprimée en DB, regen via `GET /api/cron/intelligence` en 158s. Mode opératoire handoff corrigé : le bon endpoint est `GET /api/cron/intelligence` (pas `POST /api/intelligence/trigger` bloqué par /login).
**Session precedente :** (1) Sprint 2 P1 livré (`ef8c6bf`) : bloc `<company_context purpose=relevance_filter_only>` dans system prompt, module `url-verify.ts` (HEAD check, rejette paths triviaux et 4xx), module `entity-verify.ts` (Zefix lookup entités suisses), schéma Zod champ `verification` optionnel, items en échec flag `maturity=speculatif`, UI badge rouge "Non vérifié" sur /veille/[id]. 14 nouveaux tests, 218/218 verts. (2) Fix robustesse images (`fe06883`) : `aspect-[1200/630]` remplace `h-[280px]` fixe, onerror fallback gradient, onload seuil upscale 0.8. Audit navigateur W16 post-fix : 3 images correctement basculées en gradient (2× logos VD upscalés + 1 autre), 1 bug résiduel keyzia (naturalW=0 sans onerror) sera résolu par retrait rétroactif. (3) Cadrage complet refonte /veille validé par Pascal : fil chronologique unique, 2 dates, 4 badges primaires + 2 conditionnels (Option C), sticky bar filtres avec counts, search_terms par item, retrait rétroactif one-shot, archivage 1 an. Découpé en 2 sessions (57 prep + 58 UI). Plan détaillé → `memory/project_refonte_veille_plan.md`.

---

## QUICK START

```bash
# Ce repo contient le workflow CLI premium AppFactory v2
# Stack : SvelteKit + Supabase + Vercel + Claude Code skills

# Structure
# skills/          — Skills Claude Code (cadrage, generate, deploy)
# template/        — Template SvelteKit reutilisable (scaffold pour chaque app)
# previews/        — Templates HTML Tailwind pour previsualisation client
# scripts/         — Scripts utilitaires (yaml-to-config, etc.)
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

1. **Cadrage** — Dialogue naturel terminal, pages HTML de validation client
2. **Generation** — Scaffold SvelteKit complet depuis specs (project.yaml) + design system code-first
3. **Preview et tests** — URL Vercel preview, tests automatises, client teste et donne feedback
4. **Iteration** — Feedback client → modifications code → redeploy (minutes)
5. **Mise en production** — Domaine personnalise, base propre, acces client

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

## PLANNING INITIAL

→ Planning Phase A (jours 1-9, tous ✓) archive dans archive/planning-phase-a.md — consulter si besoin de comprendre l'ordre de construction du CRM
→ Phase B ANNULEE (decision 2026-04-04 : pas de Figma Pro)

### Phase C — Skills et templates HTML (jours 8-12)
- Jour 8-9 : Skill cadrage (dialogue -> project.yaml -> 4 pages HTML)
- Jour 10-11 : Skill generate (project.yaml + tokens -> SvelteKit scaffold)
- Jour 12 : Skill deploy (push -> Vercel preview/prod, test end-to-end)

---

## DECISIONS STRUCTURELLES

- Repo separe `appfactory-cli` (ancien `appfactory` reste consultable)
- Workflow prioritaire : construire le cycle core avant d'attaquer FilmPro
- FilmPro = premier projet reel du nouveau workflow (dogfooding)
- Figma Pro abandonne (deep research 2026-04-04 : ratio cout/benefice defavorable pour solopreneur code-first)
- Design = approche code-first : composants custom + kits Figma Community gratuits comme inspiration
- Validation client = prototypes Vercel preview (pas de maquettes Figma)
- CSS scoped obligatoire pour le layout structurel (sidebar, header, nav) — Tailwind responsive (md:hidden, md:block) ne fonctionne pas avec Tailwind v4 pour ce cas
- HTML temporaires pour previsualisations client a chaque etape cle
- Ancien projet AppFactory v1 (Apps Script) = archive consultable, pas de migration

### Decisions UX (G36)

- **6 ecrans principaux** au lieu de 15 : Dashboard, Contacts, Entreprises, Pipeline, Prospection, Signaux + Parametres en menu secondaire
- **Slide-out panels** au lieu de pages detail separees (liste reste visible)
- **Saisie rapide** (6 champs) + accordeon "Plus de details" pour les formulaires
- **Pas de page Prescripteurs** : filtre + badge dans Contacts
- **Pas de page Journal equipe** : section dashboard + timeline sur les fiches
- **Relances du jour** : bandeau dashboard + badges pipeline (pas une page separee)
- **Prospection = page a part entiere** avec multi-sources, scoring, alertes, dedup, actions batch
- **Page Aide** : documentation utilisateur integree (8 sections, sommaire, recherche)
- **Documentation** : integree dans la page /aide interactive

### Decisions Prospection (G36)

- **100% sources gratuites** : Zefix REST + LINDAS SPARQL + SIMAP + SITG (GE) + search.ch + FOSC
- **Pas de Google Places** ni source payante
- **Modele unifie `prospect_leads`** : toutes les sources alimentent une table unique
- **Scoring automatique** (0-13 points) : canton, secteur, signal chaud, recence, enrichissement
- **Dedup a l'import** sur source+source_id, leads ecartes/transferes jamais reimportes
- **Selection multiple + actions batch** : interesse / ecarter / transferer vers CRM
- **Raccourcis clavier** pour traitement rapide en volume
- **Recherches sauvegardees + alertes** (cron quotidien/hebdomadaire)
- **Specs completes** : voir `docs/SPECS_PROSPECTION.md`

---

## INFRA EN PLACE

- **Vercel** : https://filmpro-crm.vercel.app (prod), GitHub lie (repo appfactory-cli, deploys auto), env vars configurees prod+preview (9 variables)
- **Supabase** : projet `appfactory` (fmflvjubjtpidvxwhqab), region EU
- **Auth** : OTP code email 6 chiffres via Supabase (signInWithOtp sans emailRedirectTo), domaine @filmpro.ch valide cote serveur (form action), login 2 ecrans (email → code), session max 7 jours via cookie httpOnly login_at (hooks.server.ts), callback /auth/callback conserve pour compatibilite
- **SMTP** : Resend (free plan permanent, 3000 emails/mois), domaine filmpro.ch verifie, sender noreply@filmpro.ch, DNS Infomaniak (DKIM + MX + SPF sur sous-domaine send)
- **Runtime** : Node.js 22.x sur Vercel
- **Supabase CLI** : v2.90.0, projet linke (fmflvjubjtpidvxwhqab)
- **BDD** : 10 tables PostgreSQL (+ prospect_leads, recherches_sauvegardees), FK, index, RLS (authenticated full access), types TS generes
- **Zefix REST** : credentials configures (local .env + Vercel prod/preview), compte actif depuis 2026-04-08
- **search.ch** : cle API configuree en local (.env) + Vercel prod+preview
- **Securite** : OTP code email @filmpro.ch (validation domaine serveur, Google OAuth desactive, email provider active), ALLOWED_DOMAINS + ALLOWED_EMAILS env vars, session 7 jours max (cookie login_at), validation Zod sur toutes les form actions (19 actions, 4+1 pages), dep Zod v4, rate limiting 10 req/min/IP sur /api/prospection/*, sanitisation SPARQL (lindas), protection JSON.parse (saveRecherche), scoring dates invalides/futures ignore, headers securite (CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy), timing-safe CRON_SECRET (crypto.timingSafeEqual), erreurs Supabase generiques cote client (console.error serveur), verification dependances avant delete entreprise, disabled sur boutons destructifs (anti double soumission)
- **Tests** : Vitest (164 tests : scoring + 19/19 schemas + validation + extractForm + API sparql/helpers + 16 auth email + prospection-utils) + Playwright (5 tests e2e : navigation + auth redirect)
- **Accessibilité** : focus trap clavier (trapFocus action) sur toutes les modales et slide-outs, role="dialog" aria-modal="true", confirmations destructives via ConfirmModal (plus de window.confirm)
- **Pagination serveur** : page prospection paginée côté serveur (URL params page/sort/dir/source/canton/statut/temp/q, Supabase count+range, 25/page)
- **Cron** : `/api/cron/signaux` quotidien 6h (veille Zefix+SIMAP) + `/api/cron/alertes` quotidien 7h + `/api/cron/nettoyage-crm` mensuel 3h le 1er (archive entreprises radiees Zefix, batch 200 FIFO), securises par CRON_SECRET (configure Vercel prod), service role client (bypass RLS)
- **SUPABASE_SERVICE_ROLE_KEY** : configuree local .env + Vercel prod (preview non configure — projet sans repo Git lie)

## WORKFLOW APPFACTORY

```
/start (terminal) — menu standard + options projet
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
- `registry.yaml` — registre entreprises/apps (source de verite)
- `branding/_catalogue.yaml` — 5 themes avec tokens complets
- `branding/_default.yaml` — theme par defaut (standard)
- `branding/[slug].yaml` — branding par entreprise
- `wizard/cadrage/` — 5 pages HTML + server.py + shared.css/js + logo
- `wizard/entreprise/` — wizard pre-cadrage entreprise (option 3), symlinks vers cadrage/shared.*
- `scripts/generate-branding-preview.ts` — genere previews/branding.html

## DOCUMENTATION

- `docs/SPECS_PROSPECTION.md` — Specs completes module prospection (sources, modele, scoring, UI, dedup)

→ Inventaire composants EN PLACE (11 composants, 6 pages, 4 API, scripts) archive dans archive/inventaire-composants.md — consulter si besoin de lister les composants existants avant d'en creer de nouveaux

### Condensé thématique (sessions 9-16)

→ Détail chronologique : `archive/decisions-sessions-9-16.md`

**Auth / Sécurité :**
- Migration Google OAuth → magic link Supabase (email OTP + PKCE), validation domaine @filmpro.ch serveur
- MFA TOTP ajouté (Google Authenticator), obligatoire pour tous, allowlist routes auth (defense in depth)
- Magic link Safari mobile OK (rate limit était la seule cause d'échec, pas PKCE)
- 16 tests auth dont 7 refus, session permanente (CRM privé 2 utilisateurs)
- Audit sécurité : 1 HIGH + 1 MEDIUM corrigés

**Infra / Deploy :**
- Vercel Root Directory → `template`, skip deployments hors template/
- Projet renommé filmpro-crm (pas de domaine custom, URL Vercel suffit)
- Node.js 22.x → 24.x (auto Vercel)

**PWA :**
- Manifest + icônes Logo FP (192/512/apple-touch), plein écran, theme-color, validé iPhone

**UX / Design :**
- Design premium Untitled UI + SnowUI + CRM Kit : tokens ombres multi-niveaux, radius 8-12px, badges dot+border
- 13 grilles responsives, colonnes Contacts redistribuées
- CSS scoped pour layout structurel (cf. DECISIONS STRUCTURELLES)

**Prospection :**
- 60 signaux corrompus nettoyés, 58 réimportés propres, scoring différencié par canton
- Enrichissement Zefix validé, 6 bugs corrigés (typo, canton, autocomplete, pluriels)

### Condensé thématique (sessions 1-8)

→ Détail chronologique : `archive/decisions-sessions-1-8.md`

**UX / Design :**
- 6 ecrans principaux (Dashboard, Contacts, Entreprises, Pipeline, Prospection, Signaux) + Parametres secondaire
- Slide-out panels (liste reste visible), saisie rapide 6 champs + accordeon details
- Design premium Untitled UI + SnowUI : ombres multi-niveaux, radius 8-12px, sidebar 240px, badges dot+border
- Score Refactoring UI : 6 → ~8/10 (CRM) et 6.5 → ~8/10 (wizards) apres 2 audits dual
- Empty states avec CTA, dashboard onboarding 3 etapes, confirmations destructives, pagination Material
- CantonSelect reutilisable (26 cantons, romands en premier)

**Signaux / Prospection :**
- Vue cards visuelles (icone type, badge statut, date relative), compteurs cliquables
- Modal creation allegee 4 champs, edition complete en slide-out
- Crons quotidiens : `/api/cron/signaux` (6h, Zefix+SIMAP) + `/api/cron/alertes` (7h)
- Dedup source_officielle+source_id (unique index partiel), scoring 0-13 auto
- Filtrage SIMAP sur 19 mots-cles secteursCibles, suppression batch Zod
- Autocomplete entreprise fuzzy (strip SA/Sarl/GmbH), logo Clearbit, enrichissement Zefix `/enrichir`

**Wizards :**
- Wizard cadrage : 5 etapes HTML (pitch, entites, pages, regles, recap), serveur Python port 3334
- Wizard entreprise : 3 etapes (infos → synthese IA → branding), serveur unifie --mode entreprise
- Architecture : polling /api/state, injection Claude via curl, auto-navigation
- 37 corrections WCAG appliquees (contraste, required, stepper cliquable, responsive)

**Infra / Skills :**
- registry.yaml registre central, catalogue branding 5 themes, preview HTML generee
- Branding : aucun skill ne prescrit font/couleur — branding/*.yaml est l'arbitre unique
- 4 skills design coherents (refactoring-ui, ux-guide, frontend-design, theme-factory) : 0 conflit

**Prerequis :**
- Aucun bloquant technique

→ Audit CRM FilmPro 2026-04-04 (4 sprints, tous corriges) archive dans archive/audit-crm-2026-04-04.md — consulter si regression securite/qualite/tests OU comme reference methodologique pour le prochain audit (5 agents, scoring par axe, sprints par severite)

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

- [x] ~~Sprint 2 P1 anti-hallucination + URLs fonctionnelles~~ — Fait 2026-04-14 session 56 (commit `ef8c6bf`) : (a) bloc `<company_context purpose=relevance_filter_only>` + règle anti-hallucination dans system prompt, (b) `url-verify.ts` HEAD check (rejette paths triviaux + 4xx/5xx), (c) `entity-verify.ts` Zefix lookup entités suisses (défensif null si API down), (d) schéma Zod champ `verification` optionnel + maturity bascule `speculatif`, (e) UI badge rouge "Non vérifié" avec tooltip raison. 14 nouveaux tests, 218/218 verts. Cas Plattix bloqué (HEAD 404 → url_ok=false, Zefix 0 match → entity_ok=false).
- [x] ~~Fix robustesse rendu images /veille~~ — Fait 2026-04-14 session 56 (commit `fe06883`) : `aspect-[1200/630]` remplace `h-[280px]` fixe (ratio og:image standard), onerror fallback gradient, onload bascule gradient si naturalWidth < clientWidth*0.8, loading="lazy" + decoding="async". Audit navigateur W16 post-fix : 3 images correctement basculées en gradient. Bug résiduel keyzia (naturalW=0 sans onerror trigger) sera résolu via retrait rétroactif du plan refonte (item morte retiré avant affichage).
- [ ] **[EXÉCUTABLE — priorité haute, session 57 prep]** Refonte /veille — Phase 1 prep (plan détaillé → `memory/project_refonte_veille_plan.md`) : (1) modif prompt LLM pour attribution par item de `segment`, `actionability`, `search_terms` (2-4 termes au lieu de 8-15 globaux), (2) modif schéma Zod + JSON schema Anthropic, (3) migration DB colonnes `items_hidden` (JSONB) + `archived_at` (timestamp) sur `intelligence_reports`, (4) tests unitaires schéma, (5) régénération empirique W17/W18 via `GET /api/cron/intelligence` pour valider prompt corrigé. Durée ~3h. Ne pas casser : bloc `company_context` Sprint 2, champ `verification` Zod, pas de remise de l'unwrap défensif retiré au Sprint 1.
- [ ] **[BLOQUÉ — attente session 57 livrée]** Refonte /veille — Phase 2 UI (plan détaillé → `memory/project_refonte_veille_plan.md`) : (6) extraction palette /prospection par grep préalable, (7) fil chronologique `/veille` avec cards + 4 badges primaires (Pertinence FilmPro, Segment, Canton, Thème) + 2 conditionnels (Signal chaud 🔥, Récurrent ×N) + chips search_terms cliquables + 2 dates (generated_at grande + source.published_at badge cliquable), (8) sticky bar horizontale 1 ligne avec counts par badge + URL state + toggle filtres combinables, (9) détail `/veille/item/[report_id]-[rank]` + wiring boutons Prospecter (réutilise traçabilité session 52), (10) retrait rétroactif one-shot endpoint `POST /api/intelligence/recheck-historical` + exécution manuelle W15+W16+W17, (11) archivage 1 an cron quotidien + toggle UI `[Afficher les archives]`, (12) tests empiriques navigateur + déploiement. Durée ~4h.
- [ ] **[BLOQUÉ — attente Phase 2 livrée]** Sprint 3 P1 fraîcheur déterministe (cadrage session 53) : parser dates post-hoc + `og:published_time` AVANT appel LLM, rejeter items hors fenêtre temporelle de l'édition.
- [ ] **[BLOQUÉ — attente Sprint 3]** Sprint 4 P2 prompt caching 90% + pipeline 2 phases température (cadrage session 53).
- [ ] **[BLOQUÉ — attente Phase 2 livrée]** Auto-exécution prospection depuis term Veille (V2 refonte /veille) : clic sur chip search_term → exécution serveur Zefix/SIMAP/REGBL directe, retour `/prospection` avec items déjà importés. Design UX préalable. Durée 1-2j.
- [ ] **[BLOQUÉ — attente livraison page Veille enrichie Phase 2]** Scoring v2 : intégrer les signaux marché de la Veille dans la température. Actuellement la température est statique (canton/secteur/récence/source/tél/montant/entreprise identifiée). À faire : quand un lead est créé avec `source_intelligence_id` non nul, bonus température proportionnel au `filmpro_relevance` ou `maturity` de l'item Veille source. Exemple : item "etabli" + compliance_tag "OK FilmPro" → +2, "emergent" → +1, "speculatif" → 0. Également : décroissance temporelle (lead issu d'une édition de plus de 4 semaines perd le bonus). Fichiers à prévoir : scoring.ts (ajouter paramètre `intelligenceSignal?: { maturity, complianceTag, weeksSince }`), config.ts (nouveau critère), tests, propagation dans les 3 endpoints import (joindre item intelligence_items via source_intelligence_id + source_intelligence_term avant de scorer)
- [ ] **[EXÉCUTABLE]** Définir les golden standards UX/UI complets du CRM et les propager aux 5 autres pages
  - **Gabarit de référence exclusif :** page `/prospection` du CRM FilmPro (wizards AppFactory hors périmètre)
  - **Périmètre complet (pas que responsive) :** charte graphique (couleurs palette workflow premium ardoise/violet/ambre/sauge, typo Inter, tokens CSS, radius, shadows, accents FR obligatoires), layout et responsive, composants (boutons, cards workflow, modales, slide-outs, stepper, badges, tables, filtres multi-select, pagination serveur, batch actions bar), états (hover, focus, disabled, loading, empty, error, success), feedback (toasts, ConfirmModal destructives, messages scoped par contexte), micro-interactions et animations, accessibilité (focus trap, touch targets 44px, aria, contraste), ton et copie (labels explicites, pas d'« Autre », accents FR)
  - **Phase 1 - Extraction :** scanner tous les fichiers touchant `/prospection` et ses composants pour extraire les règles UX/UI réellement appliquées (src/routes/prospection/, src/lib/components/prospection/*, composants partagés invoqués, tokens CSS utilisés)
  - **Phase 2 - Rédaction :** produire `docs/GOLDEN_STANDARDS.md` (document unique et complet) qui absorbe et remplace `docs/GOLDEN_STANDARDS_RESPONSIVE.md` (à supprimer après fusion). Sections : charte graphique, layout/responsive, composants, états, feedback, micro-interactions, accessibilité, ton/copie, checklist de propagation par page, méthodologie d'audit réutilisable
  - **Phase 3 - Audit delta :** tableau écarts vs standards par page (contacts, entreprises, pipeline, signaux, dashboard) avec sévérité + effort
  - **Phase 4 - Application :** corrections page par page, 1 commit atomique par page, tests Vitest + Playwright après chaque
  - **Durée estimée :** 3-4 sessions (Phase 1+2 = 1 session, Phase 3 = 0.5, Phase 4 = 1 par 2 pages)
  - **Contexte historique :** la session 45 a livré un doc scopé « responsive uniquement » (9 findings layout/overflow sur 3 viewports), nom du fichier et formulation de la tâche ont verrouillé ce périmètre réduit sans signaler. Cette tâche rétablit le périmètre complet demandé à l'origine.
  - **Ajout session 48 :** intégrer la règle « tables HTML : `table-fixed` obligatoire dès que des contraintes de largeur sont posées sur `<td>/<th>` (sinon `table-layout:auto` ignore les `max-w`) ; préférer les pourcentages `w-[X%]` aux pixels pour scale auto » — bug rencontré 2026-04-13 sur DataTable
- [ ] **[EXÉCUTABLE]** Import/export CSV : export bouton sur Contacts, Entreprises, Leads (form action SELECT -> CSV) + import avec validation Zod ligne par ligne et preview erreurs
- [ ] **[EXÉCUTABLE]** Dashboard/reporting : requetes SQL agregees (pipeline par mois, taux conversion par source, activite 30/90j) + graphiques legers
- [ ] **[BLOQUÉ ← attente PAT Figma]** Figma API a configurer : Personal Access Token + plugin MCP figma scope projet

### Séquence

1. **Refonte /veille Phase 1 prep** (session 57) - priorité haute, EXÉCUTABLE
2. **Refonte /veille Phase 2 UI** (session 58) - après Phase 1
3. **Sprint 3 fraîcheur déterministe** - après Phase 2
4. **Sprint 4 prompt caching + 2 phases température** - après Sprint 3
5. **Golden standards UX** - gros chantier 3-4 sessions, doit ingérer la palette /prospection extraite lors de Phase 2
6. **Import/export CSV** - indépendant
7. **Dashboard/reporting** - indépendant
- Hors séquence (BLOQUÉS) : Auto-exécution prospection V2 et Scoring v2 signaux Veille (attente Phase 2), Figma (attente PAT)
