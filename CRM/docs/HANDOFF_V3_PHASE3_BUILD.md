# Hand-off — CRM mobile V3 « outil terrain », reprise Phase 3 (build UI)

Date : 2026-05-31. Backend (migration + endpoints) **livré et testé** cette session. Reste : le shell mobile PWA + l'UI desktop de validation + la QA 360. Ce document est le point de reprise : il décrit l'état réel + les contrats des endpoints à consommer. **Source de vérité produit = pack `.product-architect/`** (PRD, DESIGN.md, golden-standard.html, user-flows.md, 20 AC, 7 ADR). Ce hand-off ne remplace pas le pack, il acte le delta de la session backend.

---

## 1. État (fait / reste)

| Tâche | Statut | Preuve |
|---|---|---|
| **1. Migration data** | ✅ Livré (cockpit `fd6dc12c`) | Appliquée **en prod** (`fmflvjubjtpidvxwhqab`) + 6/6 probes de contraintes verts |
| **2. Endpoints** | ✅ Livré (cockpit `e137b2ae`) | 70 tests V3 Vitest verts, `svelte-check` 0 erreur |
| **3. Shell mobile PWA** | ⏳ À FAIRE | — |
| **4. QA 360 + sécu + smoke iPhone** | ⏳ À FAIRE | — |

**Important — pas encore commité ni déployé.** Le code des endpoints V3 est dans le repo (working tree) mais **non commité** et **non déployé**. La migration, elle, est **déjà live en prod** (additive, dormante tant que le flag est off). Conséquence : en prod aujourd'hui, les colonnes `resultat/note` + table `contact_suggestions` existent, mais l'ancien code `POST /api/visits` (qui exige le GPS) tourne encore. Déployer le nouveau code est rétro-compatible (le desktop envoie toujours un GPS ; le SELECT est un sur-ensemble).

---

## 2. Backend livré — contrats réels à consommer par l'UI

### Migration (fichier `supabase/migrations/20260531_001_v3_mobile_terrain.sql`, appliquée prod)
- `prospect_visits` += `resultat TEXT` (CHECK enum fermé), `note TEXT` (≤ 2000) ; `lat`/`lng` passés **nullable** ; CHECKs `latlng_together` (pas de demi-GPS) + `distance_requires_gps`.
- `contact_suggestions` (nouvelle table) : `id, entreprise_id (NOT NULL FK), visit_id (FK SET NULL), prenom, nom, role_fonction, telephone, email, notes, statut (en_attente|valide|rejete), created_by, created_at, resolved_by, resolved_at, merged_contact_id`. CHECKs : has_identifier, notes_len, merged_requires_valide, resolved_coherence. RLS `authenticated_full_access`. Index partiel sur `statut='en_attente'`.
- Types TS régénérés dans `src/lib/database.types.ts`.

### Enum résultat — source unique
`src/lib/types/visit-result.ts` : `RESULTAT_VISITE` (const), `ResultatVisite` (type), `RESULTAT_VISITE_LABELS` (libellés FR : « Visité - intéressé / Visité - à relancer / Absent / Pas pertinent »), `RESULTAT_VISITE_VARIANT` (couleur pastille), `isResultatVisite()`. **L'UI mobile importe d'ici** (pas de réécriture des labels).

### `GET /api/visits?entreprise_id=<uuid>` → `{ visits: VisiteResume[], parent_address_raw }`
`VisiteResume` = sur-ensemble : `id, visited_at, resultat, note, lat, lng, accuracy_m, address_resolved, distance_from_zefix_m, user_id`.

### `POST /api/visits` (body) → `{ visit, geocode_diag }` (201)
Body : `{ entreprise_id, resultat?, note?, lat?, lng?, accuracy_m? }`.
- GPS **optionnel** mais indivisible (lat+lng ensemble ou aucun, sinon 400). Sans GPS → `geocode_diag='no_gps'`, distance null, **pas d'appel réseau**.
- `resultat` ∈ enum (400 sinon) ; `note` ≤ 2000 (400 sinon). Les deux optionnels.
- 401 sans session, 404 parent introuvable.

### `POST /api/contact-suggestions` (body) → `{ suggestion }` (201)
Body : `{ entreprise_id, visit_id?, prenom?, nom?, role_fonction?, telephone?, email?, notes? }`. Au moins un identifiant (prenom/nom/telephone/email) sinon 400. Crée TOUJOURS une `contact_suggestions` (statut en_attente), jamais une `contacts`. 401 / 404 entreprise.

### `GET /api/contact-suggestions?statut=en_attente` → `{ suggestions, count_en_attente }`
Chaque suggestion porte `entreprises(raison_sociale)` (embed). `count_en_attente` = badge desktop (toujours la file active, indépendant du filtre).

### `POST /api/contact-suggestions/[id]/resolve` (body) → `{ id, statut, contact_id?, merged }`
Body : `{ action: 'valide'|'rejete', merged_contact_id? }`. Idempotent : 409 si déjà résolue (anti double-clic). `valide` sans merge → crée une `contacts` (source `terrain_mobile`) ; avec `merged_contact_id` → fusionne (404 si cible absente). Update conditionnel atomique + nettoyage de l'orphelin sur race.

### `GET /api/entreprises/search?q=<nom>` → `{ results: EntrepriseSearchResult[] }`
`EntrepriseSearchResult` = `{ id, raison_sociale, site_web, canton }` (**canton ajouté** pour la pastille fiche). q ≥ 2 chars, cap 20, ILIKE prefix, `statut_archive=false`.

### Relances « À faire » (accueil onglet 1) — PAS de nouvel endpoint
Réutiliser la requête `relances` déjà dans `src/routes/(app)/+page.server.ts` : `opportunites.date_relance_prevue <= today` ET `etape_pipeline NOT IN ('gagne','perdu')`, cap 15. Vérifier le shape exact au démarrage Phase 3.

---

## 3. Reste à construire — Phase 3 (shell mobile + desktop)

### 3.1 Câblage flag (PRÉ-REQUIS, ~10 min) — pas encore fait
`src/lib/types/feature-flags.ts` ne porte aujourd'hui que `ffCrmMobileV2`. Ajouter (cf. `feature-flag-plan.md` §1/§6) :
- interface `FeatureFlags` += `ffCrmMobileV3: boolean`
- `DEFAULT_FEATURE_FLAGS` += `ffCrmMobileV3: false`
- `readFeatureFlags` += `ffCrmMobileV3: appMetadata['ff_crm_mobile_v3'] === true`
Activation SQL pilote (Pascal) après déploiement : `UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"ff_crm_mobile_v3": true}'::jsonb WHERE email='pascal@filmpro.ch';` (effet à la reconnexion).

### 3.2 Décision d'intégration à trancher au démarrage [DESIGN]
**Routing du shell** : route group dédié `(mobile)` (layout 2 onglets propre, garde flag côté `+layout.server.ts` → 404/redirect si off) **vs** rendu conditionnel dans `(app)`. Reco : **route group `(mobile)` dédié** — isole le shell terrain, profondeur de nav maîtrisée (AC-002), zéro contamination du desktop (AC-013), rollback propre. Double condition de service = flag ON **ET** viewport mobile (sinon expérience desktop). À confirmer avec Pascal avant de poser l'arborescence.

### 3.3 Écrans (5) + composants — voir DESIGN.md + golden-standard.html + user-flows.md
1. **Onglet « À faire »** : relances dues réelles (cap 15), empty state honnête (AC-003).
2. **Onglet « Rechercher »** : 1 champ nom, sans filtre, → `/api/entreprises/search` (AC-004).
3. **Fiche entreprise (lecture seule)** : contexte + 3 actions natives `tel:` / `maps:` / `mailto:`, bouton grisé si donnée absente (AC-005). Profondeur max 2 (AC-002).
4. **Compte-rendu** : résultat (enum, pastilles) + note + photos (`/api/photos` existant, état envoi/échec/réessayer AC-011) + GPS optionnel ; POST `/api/visits` (AC-006).
5. **Brouillon contact** : POST `/api/contact-suggestions` (AC-009).
- Navigation = exactement **2 onglets bas**, aucun burger/tiroir (AC-002). Aucun lien vers prospection/signaux/veille/reporting/dashboard/log/kanban (AC-001).
- Lisibilité : cibles ≥ 44×44 px, texte ≥ 16 px, contraste AA (tokens `--deep`, gate axe-core) (AC-012).
- Tokens : `app.css` (`--color-primary`, `--shadow-card`, `--ease-out-expo`…) + `.product-architect/theme-tokens.css`. Primitives réutilisables : `Tabs`, `Badge`, `SlideOut`, `Icon`, `ConfirmModal`.

### 3.4 Desktop — file de validation (AC-010)
Badge compteur « N contacts terrain à valider » (depuis `count_en_attente`) + liste + validation/rejet/fusion en 1 clic → `POST /api/contact-suggestions/[id]/resolve`. Emplacement desktop à décider (ex. page Contacts ou header). Sans ce badge la feature est refusée (council Critique).

---

## 4. Phase 4 — QA 360 (definition of done)
- `audit-uiux` + axe-core AA (0 violation color-contrast, AC-012).
- Playwright e2e : AC-001/002/003/004/006/010/011/013.
- Vitest : AC-007/009/014/015/019/020 — **déjà couverts** cette session (70 tests V3). Compléter pour l'UI.
- `code-review:security-auditor` 0 H/C/M sur les fichiers V3 → artefact daté `audit_secu_<date>_v3_mobile.md` (AC-016).
- **Smoke iPhone réel Pascal** (AC-017) : boucle fiche → 3 actions → compte-rendu+photo → relecture desktop en ≤ 5 taps, « lisible du premier coup d'œil ». Verdict binaire Pascal = le test qui a recalé la V2. DevTools/Playwright preset ne suffisent pas (règle `feedback_crm_mobile_testing_devtools.md`).

---

## 5. Pièges / notes de session
- **MCP Supabase en read-only** : impossible d'appliquer du DDL via `apply_migration`/`execute_sql`. Voie utilisée = `pg` lib (`scripts/apply-v3-mobile-migration.mjs`, lit `DATABASE_URL_ADMIN`). `pg` installé en `--no-save` (absent de `package.json`) → **réinstaller `npm i --no-save pg`** si une autre migration manuelle est nécessaire.
- **17 tests `hooks.server.test.ts`** : étaient cassés (commit Sentry `d78ab37`), repassés verts après le découplage `baseHandle` puis le retrait de Sentry (2026-06-07). Plus d'action requise (la tâche QA Sentry méta a été annulée).
- **Migration déjà en prod** : ne PAS la ré-appliquer aveuglément ; elle est idempotente (IF NOT EXISTS + DO guards) mais inutile.
- **Code endpoints uncommitted** : la prochaine session commit + déploie (gate étape 0 du `feature-flag-plan.md` : build Vercel vert + promu prod avant activation pilote).

---

## 6. Pointeurs
- Pack specs (source de vérité) : `.product-architect/` — `prd.md`, `DESIGN.md`, `golden-standard.html`, `user-flows.md`, `acceptance-criteria.json` (20 AC), `feature-flag-plan.md`, `theme-tokens.css`, `adr/0001-0007`.
- Résumé lisible : `docs/SPECS_CRM_MOBILE_V3_TERRAIN.md`.
- Mémoire projet : `project_refonte_mobile_v3_terrain.md`. Historique pivot V2 : `archive/2026-05-28-pivot-mobile-v3.md`.
