# Atelier 209 - Run 2 : spec technique (cloisonnement bi-marque)

> Feuille de route de la **session de code** du Run 2. Produite par cartographie read-only
> (workflow 5 agents, claims vérifiés file:line). **Aucun code écrit** : la partie visuelle
> (chrome teinté + golden) reste gatée par la validation des maquettes en Chrome par Pascal.
> Défaut `marque = 'filmpro'` partout = non-régression garantie.
>
> Maquettes du gate : `.atelier-209/run2-maquettes/atelier209-run2.html`. Suivi : `docs/ATELIER-209-SUIVI.md`.

## Décision d'architecture transverse (tranchée, non-Pascal)

`marque` est un **filtre de vue**, pas une frontière de sécurité. La RLS est « mono-tenant plate »
(`USING (true)` partout) et tous les comptes sont des fondateurs qui travaillent sur les 2 marques.
Donc : **cloisonnement au niveau applicatif** (centralisé dans les hubs de requête) + **contraintes
de cohérence en base** (FK composites) comme defense-in-depth contre la corruption cross-marque.
Le GUC+RLS « infalsifiable » (`set_config('app.marque')` + policies) est **reporté et couplé au
durcissement RLS déjà tracé « avant un 4e user »** (même run futur). Raison : marque est un contexte
mutable (toggle 1 clic), pas une identité JWT ; injecter un GUC par requête via supabase-js/PostgREST
demande une infra (pre-request hook) disproportionnée pour un filtre de vue entre comptes de confiance.

---

## A. Modèle de données `marque`

### A1. Tables portant la colonne (DIRECT) vs héritage

Colonne DIRECTE `marque text NOT NULL DEFAULT 'filmpro' CHECK (marque IN ('filmpro','led'))` :

| Rang | Tables | Raison |
|---|---|---|
| Ancres (7) | `prospect_leads`, `entreprises`, `contacts`, `opportunites`, `signaux_affaires`, `campagnes`, `recherches_sauvegardees` | Racines OU FK parent nullable (`contacts.entreprise_id`, les 4 FK de `opportunites` = SET NULL) : héritage non fiable |
| Dénormalisées, interrogées seules (3) | `prospect_lead_campagnes`, `campagne_groupes`, `campagne_validation_liens` | FK parent NOT NULL mais 11/5/6 call-sites en standalone ; + cohérence FK composite |
| Terrain XOR, dénormalisées (2) | `prospect_photos`, `prospect_visits` | XOR `lead_id`/`entreprise_id` : un filtre par jointure ne couvrirait qu'une branche (fuite). Copier `marque` à l'insert supprime le piège |

Héritage par jointure (PAS de colonne), toujours via un parent NOT NULL : `prospect_lead_signals`
(via `lead_id`), `contact_suggestions` (via `entreprise_id`), `prescripteurs` (via `contact_id`).

Hors marque (aucune colonne, config/ops partagée) : `intelligence_reports`, `intelligence_reads`,
`veille_sources`, `veille_themes`, `signaux_mots_cles`, `feedback_entries`, `utilisateurs`,
`cost_audit_runs`, `api_quota_log`, `activites` (journal global), `imports_zefix`, `decoupe_*`.
(Veille = sous réserve Q2.)

### A2. Migration idempotente (1 fichier, 14 chiffres `YYYYMMDDHHMMSS_marque_cloisonnement.sql`)

Patron par table :
```sql
ALTER TABLE <t> ADD COLUMN IF NOT EXISTS marque text NOT NULL DEFAULT 'filmpro';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='<t>_marque_chk') THEN
    ALTER TABLE <t> ADD CONSTRAINT <t>_marque_chk CHECK (marque IN ('filmpro','led'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_<t>_marque ON <t> (marque);
```
Le `DEFAULT` backfille tout le legacy en `'filmpro'` (non-régression). Appliquer via lib `pg` en prod
(MCP Supabase read-only), comme les migrations rôles/campagnes précédentes.

Index composites utiles : `entreprises`/`contacts` → `(marque, statut_archive)` ; `prospect_leads`
→ `(marque, statut)` et `(marque, date_import)`.

Révision des UNIQUE (drop+recreate idempotent) :
- `entreprises` : unique partiel `lower(unaccent(raison_sociale)) WHERE statut_archive=false` → préfixer `marque` (sous réserve Q1).
- `prospect_leads:45` `UNIQUE(source, source_id)` → `UNIQUE(marque, source, source_id)` (sous réserve Q1).
- `campagnes` : `idx_campagnes_nom_lower ON (lower(nom))` (campagnes_module.sql:21) → `(marque, lower(nom))`.
- `campagne_groupes` : `UNIQUE(campagne_id, lower(nom))` reste OK ; `UNIQUE(id, campagne_id)` → `(id, campagne_id, marque)` si FK composite ajoutée.

FK composites de cohérence (empêchent en base un lead LED collé à une campagne FilmPro) :
- Ajouter `UNIQUE(id, marque)` sur `prospect_leads` et `campagnes` (gratuit, `id` déjà PK).
- Sur `prospect_lead_campagnes` : FK `(lead_id, marque)→prospect_leads(id, marque)` + `(campagne_id, marque)→campagnes(id, marque)`. La cohérence groupe passe déjà par la FK composite existante `(groupe_id, campagne_id)→campagne_groupes(id, campagne_id)`.

### A3. RPC à réécrire DANS la même migration (sinon fuite silencieuse)

- **`transfer_lead_to_crm(uuid)`** (`20260701000002_lot2_prospects_pipeline.sql:114`) : copier `v_lead.marque` dans l'INSERT `entreprises` (:155-160) **et** l'INSERT `contacts`. **Fuite prioritaire** : le fallback `unique_violation` (:165-169) récupère l'entreprise par `lower(immutable_unaccent(raison_sociale))` **sans filtre marque** → ajouter `AND marque = v_lead.marque` (sinon une « Foncia » LED fusionne dans la fiche FilmPro).
- **`mark_lead_for_contact(uuid)`** (:45) : copier `v_lead.marque` dans l'INSERT `opportunites` (:73-76).
- **`entreprises_lookup_by_name`** (migration `20260510000010`, appelée `src/lib/server/referentiel/entreprises.ts:57`) : ajouter un paramètre marque et scoper le lookup.

---

## B. Threading du contexte marque

Mécanisme retenu (reco unique) : **cookie httpOnly `marque`, calqué sur `login_at`** - le seul candidat
qui persiste, bascule en 1 clic, est lisible côté serveur avant les requêtes DB, SSR-safe, sans
round-trip DB. (localStorage éliminé : invisible serveur. `app_metadata`/JWT éliminé : write
service-role + refresh = pas « 1 clic ». Préférence DB cross-appareil = 1 ligne plus tard si Q3 le veut.)

Chemin d'exposition (fichiers) :
1. `src/hooks.server.ts` - après le gate auth (~:145, après le bloc `login_at`) : `const m = event.cookies.get('marque'); event.locals.marque = (m === 'led' || m === 'filmpro') ? m : 'filmpro';`.
2. `src/app.d.ts` - ajouter `marque: 'filmpro' | 'led'` à `Locals` (après :9) et `marqueActive: 'filmpro' | 'led'` à `PageData`.
3. `src/routes/+layout.server.ts:8` - retourner `marqueActive: locals.marque`. `crm/+layout.server.ts` en hérite via `parent()`.
4. `src/routes/crm/+layout.svelte:56,59` - passer `marque={data.marqueActive}` à `<Sidebar>`/`<Header>` + `data-marque` sur le wrapper et `<main>`.
5. `Sidebar.svelte` / `Header.svelte` - accepter la prop `marque`, l'appliquer sur `.sidebar-root`.
6. **Teinte (theme-factory)** : surcharger les CSS vars sous `[data-marque="led"] { --color-primary: …; --color-primary-dark: … }` - valeurs FilmPro par défaut intactes (`src/app.css` @theme :9-114) = non-régression stricte.
7. **Toggle** : form action `?/setMarque` sur `crm/+layout.server.ts`, valide `∈ {'filmpro','led'}` puis `cookies.set` (copie conforme de `login/+page.server.ts:64-70`). Sélecteur dans la Sidebar (en-tête) / Header, `use:enhance` + `invalidateAll()` : tous les `load` re-tournent, chrome re-teinté, pas de reload dur.

Filtrage applicatif - hubs (un seul point de patch) :
- `src/lib/server/prospection-query.ts:115` `applyProspectionScopeFilters` : `.eq('marque', marque)` (couvre page + export CSV + all-ids).
- `src/lib/server/campagnes.ts` : `listCampagnes:65`, `getCampagne:96`, `leadIdsForCampagnes:319`, `fetchProspectsForCampagne:390`.
- `src/lib/server/validation-campagne.ts`, `src/lib/server/campagne-groupes.ts` : hubs dédiés.
- `src/lib/server/daily-email/query.ts:59,70` (opportunites), `src/lib/server/prospection/candidate.ts`.

Inserts à injecter `marque` (le DEFAULT ne suffit PAS - payloads en dur) : 6 endpoints d'import
`src/routes/api/prospection/{zefix:203,simap:204,regbl:219,searchch:206,google-places:263,import-selected:119}/+server.ts` ;
helpers `buildEntrepriseInsert` (`referentiel/entreprises.ts:111`) + `buildContactInsert` (`referentiel/contacts.ts:25`) ;
saisie manuelle `crm/prospection/+page.server.ts:306,531` ; `recherches_sauvegardees` (:442) ;
`pipeline/+page.server.ts:69` ; `campagnes.ts:127,234,261` ; `campagne-groupes.ts:68` ;
`validation-campagne.ts:125` ; `visits/+server.ts:161` ; `photos/+server.ts:146`.

Crons (pas de session) : `api/cron/signaux:233,344` insère `signaux_affaires` avec `marque='filmpro'`
**fixe** (sources SIMAP/RegBL = métier vitrage). `nettoyage-crm`, `alertes`, `lead-rescore`,
`daily-email` : rester globaux. Sous réserve Q2.

Agrégats à NE PAS oublier (régression visible immédiate) : dashboard `crm/+page.server.ts:29-83` et
reporting `crm/reporting/+page.server.ts:22-26` comptent en global → filtrer par `locals.marque`.
**Exception** : le compteur veille `crm/+layout.server.ts:13-28` reste global.

Pièges SSR/Svelte 5 : jamais de store singleton module-level pour la marque (fuit entre requêtes en
SSR) ; `cookies.set` uniquement côté serveur ; pas de `document.cookie` client ; `onDestroy` s'exécute
en SSR → cleanup via `$effect(() => {…; return () => …})`.

---

## C. Périmètre golden revu (Inter partout + couleurs minimes) - PAS de refonte

### C1. « Inter partout »

Aucun `body{font-family}` : le token `--font-sans` pilote toute l'app via Tailwind v4 preflight. Le
portail/login sont déjà en Inter (`AtelierShell.svelte:61`) ; « Inter partout » = aligner le CRM dense dessus.

1. `src/app.css:117` - `--font-sans: 'DM Sans', …` → `'Inter Variable', 'Inter', system-ui, -apple-system, sans-serif` (verbatim d'AtelierShell). **Seul changement fonctionnel** ; les ~40 `font-family:inherit` et `var(--font-sans)` suivent.
2. `src/app.css:2` - supprimer `@import '@fontsource-variable/dm-sans';`.
3. `src/app.css:3` - supprimer l'import italic dm-sans **et ajouter** `@import '@fontsource-variable/inter/wght-italic.css';` (le paquet inter n'a que l'axe roman ; sinon les ~7 italiques deviennent des faux-obliques).
4. `src/lib/config.ts:27` - `branding.font: 'Inter'` (cosmétique).
5. `GOLDEN_STANDARD.md` - réécrire §3 (DM Sans → Inter) + anti-pattern ; noter §13 auth périmé + URL `filmpro-crm.vercel.app` périmées.

Conservé : DM Mono (`app.css:118`). Hygiène optionnelle : `SourceSelector.svelte:157,211` hardcodent `'DM Mono'` → `var(--font-mono)`.
Ne pas toucher (faux positifs) : `DataTable.svelte:608` serif italic décoratif, `login/+page.svelte:260` OTP mono système, PDF (Outfit), emails.

### C2. Ajustements couleurs (minimes, sourcés)

Réchauffer les surfaces = refonte, hors scope. Un seul candidat, à valider en Chrome :
- `--color-primary-dark #0A1628` (`app.css:14`, hero `/veille` + carte KPI vedette) → `#152A45`
  (token `surface-dark` existant) ou `#2a3a52` (`blue-hour` d'AtelierShell). Texte blanc reste AAA.
- FIGÉ : `--color-primary #2F5A9E` (la nuance de marque passe par le chrome teinté §B) ; toutes les
  variantes `-deep` (a11y verrouillée) ; surfaces/neutres.

Correction factuelle : il n'existe **pas** de `--color-accent` dans `@theme` ; `config.branding.accent
#3B6CB7` n'est consommé nulle part.

---

## D. Seed D5 (`supabase/seed.sql`)

Fichier absent (confirmé). `config.toml:60-65` `[db.seed] enabled=true sql_paths=["./seed.sql"]`.
Prérequis dur : migration §A appliquée d'abord. 100% factice, jamais de dump prod.

Ordre FK (insert) : `entreprises → contacts → signaux_affaires → prospect_leads → opportunites →
campagnes → campagne_groupes → prospect_lead_campagnes → veille_sources` (sans marque). Cleanup en ordre inverse.

Contenu (8 entreprises/marque) : filmpro = vitrage/bâtiment romand (régies, architectes, cliniques,
facility) ; led = événementiel/enseignes/stands (agences, fabricants d'enseignes, salons, boutiques).

Enums stricts : `prospect_leads.source` ∈ 9 valeurs (jamais `manuel`) ; `statut` ∈
{vide,a_contacter,ecarte,transfere} ; `canton` ∈ {GE,VD,VS,NE,FR,JU} ; `opportunites.etape_pipeline`
∈ {identification…perdu} ; `campagnes.couleur` ∈ {c1..c8} ; `campagne_groupes.nom` ≤ 24 char.
Invariants : un lead `a_contacter` a UNE `opportunites` en `identification` ;
`prospect_lead_campagnes.groupe_id` = même campagne que le lien. `signaux_affaires.opportunite_associee_id`
laissé NULL (FK circulaire). Accents FR corrects, apostrophe droite doublée en SQL, zéro emoji/tiret long.

---

## E. Ordre d'implémentation, non-régression, critères d'acceptation

### E1. Ordre (après gate maquettes), 2 lots séparément committables

Lot cloisonnement (marque) :
1. Migration §A (schéma + RPC + UNIQUE + FK composites) → `supabase db reset` sur base jetable Colima, puis prod via lib `pg`.
2. `supabase gen types` local → diff le fichier généré avant d'accepter.
3. Threading §B : hook `locals.marque` + `app.d.ts` + `+layout.server.ts` + action `setMarque`.
4. Filtrage des hubs + injection `marque` aux inserts + crons `filmpro` fixe.
5. Call-sites de page non centralisés + agrégats dashboard/reporting.
6. Chrome teinté (theme-factory `[data-marque]`, Sidebar/Header) + sélecteur - **partie visuelle gatée maquette**.

Lot golden (séparé) :
7. Inter §C1 (1 ligne token + imports) + nudge `primary-dark` §C2 - commit distinct, gate Chrome propre.

Puis : seed D5 §D, tests de fuite, Vitest, Playwright, `code-review:security-auditor`, vérif Chrome manuelle.

### E2. Points chauds de non-régression

1. RPC `transfer_lead_to_crm` fusion cross-marque par raison sociale (:169) - fuite silencieuse prioritaire.
2. Dédup `entreprises_lookup_by_name` non scopée marque.
3. `prospect_leads UNIQUE(source, source_id)` - sans marque : blocage import 2e marque OU ligne partagée (fuite). Dépend de Q1.
4. N-N `prospect_lead_campagnes` - cohérence portée par FK composite.
5. Agrégats dashboard/reporting globaux - régression visible si non filtrés.
6. 6 endpoints d'import en dur - chacun doit ajouter `marque` explicitement.
7. Terrain XOR photos/visits - dénormalisation supprime le piège du filtre mono-branche.
8. **Métrique police Inter vs DM Sans** (chasses/x-height plus larges) : DataTable `table-fixed` + colonnes sticky + ellipsis ; centrage vertical ScorePill/Badge/boutons/Tabs/Input ; échelle éditoriale dashboard ; `mag-*` letter-spacing calibré DM Sans. **Chrome DevTools manuel Pascal obligatoire ; Playwright viewport interdit comme substitut visuel.**

### E3. Critères d'acceptation (binaires)

- Migration : `supabase db reset` from-scratch vert ; lignes legacy `marque='filmpro'` ; CHECK rejette hors `{filmpro,led}`.
- **Fuite (DoD, DB réelle - pas mocks)** : seed 2 marques → session `marque=filmpro` voit **0 ligne LED** sur prospection/entreprises/contacts/pipeline/campagnes **et** compteurs dashboard/reporting ; symétrique pour `led`.
- Cohérence base : attacher un lead LED à une campagne FilmPro → **rejet FK composite**.
- RPC : `transfer_lead_to_crm` sur lead LED crée entreprise+contact `marque='led'`, ne fusionne jamais dans un homonyme FilmPro.
- Toggle : POST `setMarque` → cookie httpOnly, `invalidateAll` re-filtre + re-teinte ; cookie absent → `filmpro`.
- Import : chacun des 6 endpoints insère la marque active.
- Golden : Vitest vert + build vert ; Chrome manuel sur 6 surfaces chaudes sans overflow/clipping.
- Sécurité : `code-review:security-auditor` = 0 High/Critical ; artefact `audit_secu_<date>_atelier209_run2_marque.md`.

---

## F. Questions nécessitant un arbitrage de Pascal (pour la session de code, pas le gate design)

**Q1 - Un même tiers (entreprise/lead) peut-il exister dans les DEUX marques ?**
Reco : **OUI, indépendamment** → `UNIQUE(marque, source, source_id)` sur `prospect_leads` +
`(marque, lower(unaccent(raison_sociale)))` sur `entreprises`. Une régie « Foncia » peut être
prospectée par FilmPro (vitrage) ET LED (enseigne) sans se marcher dessus ; l'inverse bloque le 2e
import ou partage la ligne (fuite). Décision quasi-irréversible une fois des données créées.

**Q2 - La veille et les signaux restent-ils FilmPro-only pour le Run 2 ?**
Reco : **OUI** → pas de colonne `marque` sur `veille_sources`/`intelligence_reports`/`veille_themes`/
`signaux_mots_cles` ; le cron signaux insère `marque='filmpro'` fixe. Réversible : une veille LED
propre = un run ultérieur.

**Q3 - Le sélecteur de marque : par-appareil ou suit Pascal partout ?**
Reco : **par-appareil (cookie)** pour le Run 2 - le plus simple, réutilise le pattern `login_at`. Conséquence :
basculer sur LED au bureau laisse le téléphone sur FilmPro. Ajout d'une préférence en base = 1 ligne plus tard.
