# PRD — CRM FilmPro mobile V3 « outil terrain »

**Date** : 2026-05-31
**Auteur** : Pascal (cadré avec product-architect)
**Statut** : Spec validée Phase 2 (en attente OK Pascal pour gate 2→3)
**Repo** : `~/Claude/Projets/AppFactory/CRM/`
**Stack** : SvelteKit + Supabase + Tailwind v4 + Lucide + Vitest/Playwright + Vercel (stack réelle projet, **pas** le template Next.js)

---

## 1. Vision

Donner au commercial FilmPro, sur son iPhone en visite/déplacement, un outil terrain **minimum** qui suit une boucle unique - **j'arrive → je sais qui c'est → je laisse une trace exploitable** - extrêmement lisible, en 2 onglets sans menu. Le mobile **lit** le référentiel et **écrit uniquement** la trace terrain (visite + photo + contact en brouillon). Tout le travail de bureau (prospection, scoring, veille, reporting, pipeline) reste sur le desktop, assumé.

## 2. Objectifs mesurables

| KPI | Baseline | Cible | Horizon | Comment mesurer |
|---|---|---|---|---|
| Verdict lisibilité smoke iPhone Pascal | V2 = « peu lisible » (recalé) | « lisible du premier coup d'œil » = oui | Day 1 livraison | Test manuel Pascal (AC-017) |
| Taps pour logger une visite complète (fiche → CR + photo) | n/a | ≤ 5 taps | Day 1 | Comptage manuel parcours |
| Écrans atteignables hors périmètre terrain | V2 = 8 pages | 0 | Day 1 | Audit nav (AC-001) |
| Photos terrain perdues sur échec réseau | risque V2 | 0 (note conservée, retry) | Day 1 | E2E réseau dégradé (AC-011) |
| Contacts terrain écrits direct dans `contacts` | risque doublons | 0 (100 % via file de validation) | Day 1 | AC-009/AC-010 |

## 3. User stories (Given/When/Then)

```gherkin
Feature: Outil terrain mobile FilmPro

Scenario: Consulter une fiche avant d'entrer chez un client (visite non agendée)
  Given je suis connecté sur le shell mobile (ff_crm_mobile_v3 actif)
  When je tape l'onglet "Rechercher" et saisis le nom de l'entreprise
  Then la fiche s'ouvre en lecture seule (qui, adresse, opportunité en cours)
  And je peux taper "Appeler", "Itinéraire" ou "Email" qui ouvrent l'action native iOS

Scenario: Logger un compte-rendu de visite avec photo
  Given je suis sur la fiche d'une entreprise
  When je tape "Compte-rendu de visite"
  And je choisis un résultat dans la liste fermée, saisis une note courte, prends 1 photo
  And je tape "Enregistrer"
  Then la visite + la note + la photo sont enregistrées (check-in GPS si autorisé)
  And elles sont relisibles au desktop sur la même entreprise

Scenario: Réseau faible pendant l'envoi d'une photo
  Given j'ai saisi un compte-rendu et une photo
  When l'upload de la photo échoue (réseau)
  Then l'état affiche "échec → réessayer" et ma note saisie n'est pas perdue
  And je peux réessayer l'envoi sans tout re-saisir

Scenario: Capturer un contact croisé sur place (brouillon)
  Given je suis sur la fiche d'une entreprise et je rencontre un nouveau décideur
  When je tape "+ Contact rencontré" et saisis au moins un identifiant
  Then une suggestion "en_attente" est créée (jamais une ligne contacts)
  And le desktop affiche "N contacts terrain à valider"

Scenario: Valider un brouillon au desktop
  Given il existe des contact_suggestions en_attente
  When j'ouvre le desktop et clique "valider" sur une suggestion
  Then une ligne contacts est créée (ou fusionnée) et le badge décrémente

Scenario: Gate auth
  Given je ne suis pas authentifié
  When un endpoint d'écriture V3 est appelé (POST /api/visits, /api/contact-suggestions)
  Then la réponse est 401
```

## 4. Acceptance criteria

Voir `acceptance-criteria.json` (20 critères, AC-001 → AC-020, format parseable). 18 bloquants, 2 advisory. Critères bloquants = gate Phase 4 rouge si non vert.

## 5. Architecture data

Voir `data-model.sql` + `rls-policies.sql`. Résumé :

- **Réutilisé tel quel** : `prospect_photos` (photos, max 10/owner, URLs signées 1h), policy RLS inchangée.
- **Étendu (add-column-only)** : `prospect_visits` += `resultat TEXT` (CHECK enum fermé) + `note TEXT` (≤ 2000) ; `lat`/`lng` rendus nullable (GPS optionnel). ADR-0002.
- **Nouveau** : `contact_suggestions` (file de validation brouillon, statut en_attente/valide/rejete, ≥ 1 identifiant requis). ADR-0003.
- **Lu seulement** : `entreprises`, `contacts`, `opportunites`, `activites` (aucune écriture mobile).

ERD : voir bloc mermaid en pied de `data-model.sql`.

RLS : mono-tenant plat conservé (ADR-0007), pas de per-user. Protection réelle = gate auth + Zod + vérif parent.

## 6. Contrats API

Voir `api-contracts.ts`. Endpoints :
- `[ÉTENDU]` `GET/POST /api/visits` (+ resultat, note ; lat/lng optionnels).
- `[EXISTANT]` `GET/POST /api/photos` (réutilisé).
- `[NOUVEAU]` `GET /api/entreprises/search?q=` (recherche 1 champ, cap 20).
- `[NOUVEAU]` `POST /api/contact-suggestions`, `GET /api/contact-suggestions?statut=en_attente`, `POST /api/contact-suggestions/[id]/resolve`.
- `[EXISTANT data]` accueil « À faire » = `load` réutilisant la requête relances de `(app)/+page.server.ts`.

Erreurs : `{ error }` (convention projet), codes 401/400/404/409/413/500.

## 7. Design system

Voir `DESIGN.md` (sémantique mobile terrain) + `theme-tokens.css` (pointeur vers les tokens Tailwind v4 existants du projet, **aucun thème inventé** — divergence interdite). Cibles ≥ 44 px, texte ≥ 16 px, contraste AA via tokens `--deep`. Golden visuel : `golden-standard.html` (à valider visuellement par Pascal).

## 8. Architecture Decision Records

| ADR | Décision |
|---|---|
| 0001 | Livraison PWA sur SvelteKit existant (pas d'app native) |
| 0002 | Compte-rendu = extension `prospect_visits` (pas `activites`, pas nouvelle table) |
| 0003 | Contact terrain = table `contact_suggestions` (file validation), pas d'écriture directe `contacts` |
| 0004 | Flag neuf `ff_crm_mobile_v3` + rollback `ff_crm_mobile_v2` |
| 0005 | Accueil = relances dues (pas d'agenda planifié) |
| 0006 | Pas d'offline V3 (état d'envoi visible) |
| 0007 | RLS mono-tenant plat conservé (pas de per-user), tests adaptés |

## 9. Hors-scope nommé (no-debt)

- Prospection, signaux, scoring, veille, reporting, dashboard coûts, log, kanban pipeline (restent desktop).
- Édition de champs structurants depuis mobile (statut pipeline, score, qualification, raison sociale).
- Création/édition directe d'entreprises ou de contacts (seul le brouillon `contact_suggestions` est permis).
- Mode offline / file de synchro photos (ADR-0006).
- Transcription vocale custom (la dictée iOS native suffit pour la note).
- Édition a posteriori d'une visite depuis le mobile (édition au desktop).
- Planification de RDV / agenda calendaire (Option B écartée, ADR-0005).
- Notifications push.
- Multi-utilisateur différencié / RLS per-user (mono-tenant plat conservé, ADR-0007).

## 10. Plan de test

| Niveau | Outil | Coverage cible | Owner Phase |
|---|---|---|---|
| Unit (helpers, Zod, enum résultat, gate auth) | Vitest | > 80 % branches métier V3 | 3 |
| Intégration API routes | Vitest (endpoints) | 100 % routes V3 | 3 |
| RLS / auth | Vitest « 401 sans session » + vérif manuelle prod multi-fondateur | gate auth + doc audit secu | 3 / 4 |
| E2E workflows critiques | Playwright | 100 % user stories § 3 | 4 |
| Visual regression | Playwright snapshots | écrans mobile baseline | 4 |
| A11y | axe-core (`@axe-core/playwright`) | 0 violation sérieuse/critique (dont color-contrast) | 4 |
| Perf | Lighthouse CI mobile | LCP < 2.5s, INP < 200ms, CLS < 0.1 | 4 |
| Sécu | `code-review:security-auditor` | 0 H/C/M + artifact daté | 4 |
| Smoke réel | iPhone Pascal | boucle ≤ 5 taps, « lisible » oui | 4 |

Rappel mobile : tests responsive = Chrome DevTools Device Toolbar manuel + iPhone réel obligatoires ; Playwright `viewport` seul interdit comme substitut (preset `devices['iPhone 14 Pro Max']` OK pour findings objectifs). Réf `feedback_crm_mobile_testing_devtools`.

## 11. Plan de livraison

Voir `feature-flag-plan.md`. Résumé (≤ 10 users → rollout simplifié) :

| Étape | Cible | Durée | Critère passage |
|---|---|---|---|
| Pilote | `pascal@filmpro.ch` (flag ON) | smoke iPhone | AC-017 oui + 0 erreur (logs Vercel + smoke) |
| GA | tous les fondateurs (flag ON) | permanent | smoke OK + 0 régression desktop (AC-013) |

Flag : `ff_crm_mobile_v3` (JWT claims). Kill switch < 60 s (retrait du claim). Rollback : commit baseline + revert flag ; les migrations sont additives (pas de rollback DB destructif requis).

## 12. SLO/SLI

Voir `slo-sli.md`. Résumé :

| Feature | SLI | SLO cible | Instrument |
|---|---|---|---|
| Enregistrement compte-rendu | success rate POST /api/visits | > 99 % rolling 7j | Logs Vercel + smoke |
| Upload photo | p95 latency POST /api/photos | < 4 s (photo ≤ 5 Mo, 4G) | Smoke manuel 4G |
| Recherche entreprise | p95 latency GET search | < 600 ms | Logs Vercel + smoke |
| Gate auth | 401 sur appel non authentifié | 100 % | test + logs |

> Note : Sentry a été retiré du CRM le 2026-06-07 (décision « pas nécessaire »). L'observabilité des SLI repose de façon permanente sur les logs serveur Vercel + le smoke manuel (voir `slo-sli.md` § 3 et méta `project_sentry_removal_2026-06-07.md`).

---

## Annexe — Réutilisation du code V2 (audit fichier par fichier en Phase 3)

| Élément V2 | Décision V3 |
|---|---|
| `prospect_photos` + `prospect_visits` + `/api/photos` + `/api/visits` | **GARDER** (backend terrain réutilisé) |
| `MobileEntityCard.svelte` | **Candidat repurpose** pour la fiche (à auditer) |
| `PipelineMobileAccordion`, drawer Signaux masqué, Tabs scroll-snap, bandeaux desktop-only | **ROLLBACK** (hors périmètre V3) |
| Flag `ff_crm_mobile_v2` + champ `ffCrmMobileV2` | **RETIRER** (remplacé par `ff_crm_mobile_v3`, ADR-0004) |
| Helpers `clampDisplayScore`, `scorePillIcon` | **ROLLBACK** (scoring hors-scope mobile) |

Le détail garder/rollback/repurpose par fichier est tranché en début de Phase 3 (pas de réutilisation V2 par défaut — `feedback_mobile_overscope_anti_pattern`).
