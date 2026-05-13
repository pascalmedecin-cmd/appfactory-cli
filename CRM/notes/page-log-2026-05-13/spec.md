# Spec - Page Log (feedback bugs + améliorations)

**Statut** : à valider par Pascal avant code.
**Session cible** : S185, exec autonome.
**Effort** : xhigh | Score 4/4 (structurelle, multi-étapes, itération coûteuse car livraison client le jour même, UX/polish non-mesurable).
**Estimé** : 3 à 4 h (0,5 spec + 2,5 code + 1 QA).
**Origine** : livraison client `antoine@filmpro.ch` aujourd'hui ; besoin de capter erreurs et suggestions en cours d'usage, exportable en JSON pour action dans Claude Code CLI.

---

## 1. Objectif

Permettre à n'importe quel utilisateur authentifié du CRM (3 fondateurs FilmPro + invités futurs) de signaler en 10 secondes un bug ou une suggestion d'amélioration, depuis n'importe quelle page, sans casser son flux. Permettre à l'admin (`pascal@filmpro.ch`) de trier ces retours, changer leur statut, et exporter le backlog actionnable en JSON pour le traiter dans Claude Code.

**Métrique de succès post-livraison** : ≥ 5 retours saisis par Antoine dans les 48 h après livraison ; ≥ 80 % avec contexte technique auto-rempli (page, user-agent, viewport) ; export JSON ré-importable dans Claude Code sans transformation manuelle.

---

## 2. Critères d'acceptation (binaires, testables)

1. **Sidebar** : entrée « Log » présente dans `config.navigation.secondary`, juste avant « Aide », icône Lucide `bug_report`, `external: true` → s'ouvre dans un nouvel onglet (`target="_blank" rel="noopener noreferrer"`). **Flag `desktopOnly: true`** sur l'entrée → masquée par CSS sur viewports < 1024px (alignée au breakpoint mobile existant).
2. **Page /log** : route SvelteKit `src/routes/(app)/log/+page.svelte` + `+page.server.ts` chargés sans erreur ; en-tête identique au pattern Aide (kicker / titre / tagline) ; respect GOLDEN v9 (zéro `getElementById`, zéro `{@html}`, tokens CSS, pas de gradient, pas de dashed).
3. **Bouton flottant** : composant `FeedbackButton.svelte` ajouté dans `(app)/+layout.svelte` après `<Toast />`, visible sur toutes les pages sauf `/log` et `/login`, **caché sur viewports < 1024px (mobile)** via media query alignée sur le breakpoint sidebar existant ; position `fixed bottom-4 right-4 z-[90]` (sous Toast `z-[100]`) ; aria-label `Signaler un bug ou une suggestion` ; ouvre une modal accessible (`trapFocus`, `aria-modal="true"`).
4. **Formulaire de saisie (modal et page /log)** : 3 dropdowns + 1 textarea, mêmes champs partout :
   - Type (Bug / Suggestion / Question) - requis, défaut Bug.
   - Sévérité (Bloquant / Gênant / Mineur) - requis si Bug, masqué sinon.
   - Page concernée (dropdown peuplé depuis `config.navigation.primary` + `secondary` + « Autre / hors CRM ») - requis, pré-rempli depuis l'URL active.
   - Description (textarea, 10-1000 caractères, requis).
5. **Capture contexte auto** : champ `context jsonb` rempli en silence avec `{ url, viewport: {w,h}, userAgent, recentErrors: [] }` ; `recentErrors` = max 3 dernières erreurs JS captées via `window.addEventListener('error')` dans la dernière session (max 60 s avant submit).
6. **Migration SQL** : `supabase/migrations/20260513_001_feedback_entries.sql` crée la table avec colonnes exactes du § 4 ; RLS « tous voient tout » sur SELECT ; INSERT ouvert à tout authentifié ; UPDATE statut + admin_notes réservé à pascal@filmpro.ch via WHERE auth.jwt() ; DELETE bloqué (admin uniquement, via service role).
7. **Page admin (vu par pascal@filmpro.ch)** : tableau triable par date desc ; pour chaque ligne, 3 boutons de statut (À actionner / Traité / Loggé) ; textarea note interne (`admin_notes`, lecture seule pour non-admin) ; bouton « Exporter en JSON » télécharge `feedback-YYYY-MM-DD.json` (toutes entrées par défaut, filtre « non traités » disponible).
8. **Page user (vu par non-admin)** : même tableau lecture seule ; chaque ligne affiche le statut courant via badge couleur ; user voit toutes les entrées (cohérent doctrine mono-tenant) ; user ne peut PAS éditer ni supprimer.
9. **Lecture seule post-envoi** : aucune action UI ne permet à un user (admin ou non) de modifier la `description` ou les champs d'une entrée existante ; seul `status` + `admin_notes` mutables par admin (Q3 figée).
10. **Bouton « + nouveau » sur /log** : visible pour tous, ouvre la même modale que le bouton flottant ; pas d'autre point d'entrée de saisie.
11. **Toast succès** : après submit OK, toast vert « Retour envoyé, merci » via le store `toasts` existant ; modal se ferme ; pas de redirect.
12. **Export JSON** : tableau d'objets (1 entrée = 1 objet), champs : `id, created_at, created_by_email, type, severity, page, description, context, status, admin_notes` ; tri date desc ; encoding UTF-8 ; filename `feedback-YYYY-MM-DD.json`.
13. **Tests** : Vitest +20 minimum (schema, helpers admin, format export, statuts) ; svelte-check 0 erreur ; 1192 + nouveaux Vitest verts ; build OK.
14. **Audits Opus** : security-auditor 0 C/H/M ; test-coverage-reviewer coverage > 80 % sur logique métier nouvelle (schemas, export, helpers admin) ; artifact daté dans `~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/audit_secu_2026-05-13_page_log.md`.
15. **Page /log sur mobile (< 1024px)** : la route reste accessible (defense in depth si URL tapée à la main) mais le `+page.svelte` affiche un encart unique « Disponible uniquement depuis ordinateur. La version mobile du CRM sera revue dans un audit dédié. » avec icône Lucide `desktop_windows` ; toolbar, tableau, bouton « + nouveau retour » et bouton export tous masqués. Aucun call DB déclenché côté client si viewport mobile (le `load` server peut tourner, c'est inerte).

---

## 3. Hors-scope nommé (refusé explicitement, à graver dans CLAUDE.md si demandé plus tard)

- Captures d'écran (html2canvas + Supabase Storage) : reportable hors MVP, ré-évaluable à 50 entrées.
- Notifications email à Pascal sur nouvelle entrée : ouverture explicite via SMTP Resend non câblée.
- Notifications temps réel Supabase realtime : overkill à 1 client interne.
- Voting / commentaires / threading sur une entrée : interdit (anti usine à gaz).
- Édition d'une entrée après envoi : Q3 figée à « non, lecture seule ».
- Suppression côté user ou admin via UI : interdit ; seul `status=loggé` ferme une entrée.
- Workflow plus riche que 4 statuts (Nouveau / À actionner / Traité / Loggé) : refusé.
- Raccourci clavier Cmd+Shift+B : retiré explicitement (Pascal Q1).
- Tableau filtrable / triable avancé (multi-colonnes, recherche full-text) : MVP = tri date desc + filtre statut, c'est tout.
- Pagination serveur : seuil de mise en place = 200 entrées (compte le matin par l'admin) ; en attendant, tout charger.
- Distinction RLS user voit que ses entrées : Q3 figée à « tous voient tout » (cohérent doctrine mono-tenant).
- **Bouton flottant et accès /log sur mobile (< 1024px) : refusés jusqu'à audit mobile CRM ultérieur.** Décision Pascal 2026-05-13 : le mobile CRM sera revu en chantier dédié (objectif réduire à l'essentiel, aligner aussi cockpit). Entry cockpit créée pour traçage (idée AppFactory/CRM, à transmettre quand le chantier démarre). En attendant : lien sidebar Log caché CSS sur mobile, bouton flottant caché CSS sur mobile, page /log affiche un message d'indisponibilité si visitée depuis mobile.

---

## 4. Modèle de données (table Supabase exacte)

```sql
-- supabase/migrations/20260513_001_feedback_entries.sql
-- Spec : notes/page-log-2026-05-13/spec.md
-- Module : page /log + bouton flottant global, livraison client antoine@filmpro.ch.

CREATE TABLE IF NOT EXISTS public.feedback_entries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email text NOT NULL,
  type             text NOT NULL CHECK (type IN ('bug', 'suggestion', 'question')),
  severity         text CHECK (severity IN ('bloquant', 'genant', 'mineur')),
  page             text NOT NULL CHECK (char_length(page) BETWEEN 1 AND 100),
  description      text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 1000),
  context          jsonb NOT NULL DEFAULT '{}'::jsonb,
  status           text NOT NULL DEFAULT 'nouveau'
                     CHECK (status IN ('nouveau', 'a_actionner', 'traite', 'logge')),
  admin_notes      text CHECK (admin_notes IS NULL OR char_length(admin_notes) <= 2000),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  -- Sévérité obligatoire ssi type=bug.
  CONSTRAINT feedback_severity_iff_bug CHECK (
    (type = 'bug' AND severity IS NOT NULL)
    OR (type IN ('suggestion', 'question') AND severity IS NULL)
  )
);

CREATE INDEX idx_feedback_created_at_desc ON public.feedback_entries (created_at DESC);
CREATE INDEX idx_feedback_status ON public.feedback_entries (status);
CREATE INDEX idx_feedback_type ON public.feedback_entries (type);

ALTER TABLE public.feedback_entries ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les authentifiés voient tout (cohérent doctrine mono-tenant).
CREATE POLICY "feedback_entries_read" ON public.feedback_entries
  FOR SELECT TO authenticated USING (true);

-- Insert : tout authentifié peut créer une entrée (created_by_email forcé côté serveur).
CREATE POLICY "feedback_entries_insert" ON public.feedback_entries
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Update : réservé admin (changement statut + admin_notes uniquement).
-- L'admin est identifié par email JWT, compare en `lower()` pour aligner sur
-- `isAdminEmail` côté serveur (toLowerCase). Audit secu LOW-1 résolu in-session.
CREATE POLICY "feedback_entries_update_admin" ON public.feedback_entries
  FOR UPDATE TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'pascal@filmpro.ch')
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'pascal@filmpro.ch');

-- Delete : interdit côté client (service role uniquement).
-- Pas de policy DELETE = refus par défaut.

COMMENT ON TABLE public.feedback_entries IS
'Spec page-log-2026-05-13/spec.md : retours utilisateurs (bugs + suggestions + questions) saisis depuis le bouton flottant ou la page /log. RLS : lecture publique authentifié, insert authentifié, update admin uniquement (pascal@filmpro.ch).';
```

Trigger `updated_at` automatique (pattern existant `set_updated_at`) si présent dans le repo ; sinon mise à jour explicite côté form action.

---

## 5. Architecture des fichiers (créations + modifications)

### Créations

| Fichier | Rôle |
|--------|------|
| `supabase/migrations/20260513_001_feedback_entries.sql` | Table + RLS |
| `src/lib/feedback/types.ts` | Types TS partagés (FeedbackType, Severity, Status, FeedbackEntry, FeedbackContext) |
| `src/lib/feedback/options.ts` | Listes statiques (TYPES, SEVERITIES, STATUSES + labels FR + couleurs badge) |
| `src/lib/feedback/admin.ts` | Helper `isAdminEmail(email)` (constante `ADMIN_EMAIL = 'pascal@filmpro.ch'`) |
| `src/lib/feedback/pages.ts` | Liste des pages CRM (dérivée de `config.navigation` + « Autre / hors CRM ») |
| `src/lib/feedback/export.ts` | Helper `toExportJson(entries)` retourne `Blob` JSON |
| `src/lib/feedback/error-capture.ts` | Singleton `recentErrors` (window.addEventListener('error'), max 3, max 60 s) |
| `src/lib/components/FeedbackButton.svelte` | Bouton flottant + modal de saisie |
| `src/lib/components/FeedbackForm.svelte` | Form réutilisable (modal + page /log /nouveau si ajouté plus tard) |
| `src/lib/components/FeedbackTable.svelte` | Tableau (admin + user view, mode dérivé d'une prop) |
| `src/routes/(app)/log/+page.svelte` | Page Log (en-tête + tableau + bouton + nouveau) |
| `src/routes/(app)/log/+page.server.ts` | `load` (read entries) + actions `create`, `updateStatus`, `updateAdminNotes`, `exportJson` |
| `src/lib/feedback.test.ts` | Tests Vitest (schemas, helpers, export, admin) |
| `notes/page-log-2026-05-13/spec.md` | Ce fichier |

### Modifications

| Fichier | Modification |
|--------|------------|
| `src/lib/config.ts` | Ajouter entrée `{ href: '/log', label: 'Log', icon: 'bug_report', external: true, desktopOnly: true }` en première position de `navigation.secondary` (avant Aide). |
| `src/lib/components/Sidebar.svelte` | Lire `desktopOnly` sur l'item, appliquer class `desktop-only-nav` ; CSS scoped `@media (max-width: 1023px) { .desktop-only-nav { display: none; } }`. |
| `src/lib/schemas.ts` | Ajouter `FeedbackCreateSchema`, `FeedbackUpdateStatusSchema`, `FeedbackUpdateNotesSchema`, `FEEDBACK_FIELDS`. |
| `src/routes/(app)/+layout.svelte` | Importer + monter `<FeedbackButton />` après `<Toast />`. Hide si `page.url.pathname === '/log'` ou path commence par `/login`. |
| `src/routes/(app)/+layout.server.ts` | (déjà charge `user`) — pas de modif requise. Si besoin de pré-charger isAdmin pour le bouton, ajouter `isAdmin: isAdminEmail(user?.email)` au retour. |

---

## 6. UI/UX détaillée

### 6.1 Bouton flottant

- **Position** : `fixed bottom-4 right-4 z-[90]` (sous Toast `z-[100]` pour ne pas masquer un toast actif).
- **Taille** : 48 × 48 px, rond (`rounded-full`), ombre `shadow-lg`, fond `bg-primary-dark hover:bg-primary text-white`.
- **Icône** : Lucide `bug_report` ou `message_circle` (à trancher visuellement en code review).
- **Affichage** : caché si `/log` ou `/login*` (via `$derived(page.url.pathname)`) ; **caché sur viewports < 1024px** via media query `@media (max-width: 1023px) { .feedback-fab { display: none; } }` (alignée breakpoint sidebar mobile existant).
- **Clic** : ouvre la modale `FeedbackForm` avec `mode="modal"`.
- **Accessibilité** : `aria-label="Signaler un bug ou une suggestion"`, focusable au clavier, `Esc` ferme la modale.

### 6.2 Modale de saisie

- Réutilise le pattern `ConfirmModal.svelte` (backdrop `z-[60]`, `aria-modal="true"`, `use:trapFocus`, transition `scale`).
- Largeur max `max-w-md` (~448 px).
- Titre : « Signaler un bug ou une suggestion ».
- Champs (verticaux, espacement `gap-4`) :
  1. **Type** (radio group horizontal stylé, 3 cards Bug / Suggestion / Question, icône + label).
  2. **Sévérité** (radio group horizontal, 3 cards, visible ssi type=Bug, avec transition fade).
  3. **Page concernée** (`<select>` natif stylé, pré-rempli depuis URL via mapping `pages.ts`).
  4. **Description** (`<textarea>` 4 lignes, placeholder « Décris en 1-3 phrases ce qui s'est passé ou ce qui manque », compteur 0/1000 sous le champ).
- Boutons en bas : `Annuler` (secondaire) + `Envoyer` (primaire, disabled si form invalide).
- Submit : POST vers `?/create` action SvelteKit ; sur succès, fermer modale + toast vert.

### 6.3 Page /log

- **Sur mobile (< 1024px)** : l'unique contenu rendu est un encart centré « Disponible uniquement depuis ordinateur. La version mobile du CRM sera revue dans un audit dédié. » + icône `desktop_windows`. Pas de toolbar, pas de tableau, pas de modale, pas de bouton. Le `load` server peut s'exécuter, son résultat n'est simplement pas affiché.
- **Sur desktop (≥ 1024px)** : suite ci-dessous.
- En-tête comme Aide : kicker `RETOURS` + titre `Log des retours et améliorations` + tagline (« Tout ce qui est signalé pendant l'usage du CRM. Triable, exportable. »).
- Toolbar : bouton primaire `+ Nouveau retour` (ouvre la même modale) + filtre statut (dropdown 5 options : Tous / Nouveau / À actionner / Traité / Loggé) + (admin uniquement) bouton secondaire `Exporter en JSON`.
- Compteurs (admin uniquement) : badges sous la toolbar « N nouveaux, M à actionner, K traités, L loggés ».
- Tableau (composant `FeedbackTable`) : 7 colonnes desktop, 3 colonnes mobile (Type, Description tronquée, Statut + date) :
  - Date (relative type « il y a 2 h », tooltip date complète)
  - Type (badge couleur : Bug rouge clair, Suggestion bleu clair, Question gris clair)
  - Sévérité (badge couleur si Bug)
  - Page (texte court)
  - Auteur (email tronqué `antoine@…`)
  - Description (1 ligne tronquée + tooltip / expand)
  - Statut + actions (badge + 3 boutons admin si admin, sinon badge seul)
- Click sur une ligne : expand inline (pas de modale), affiche description complète + `context` formaté + (admin) textarea `admin_notes` + boutons statut.

### 6.4 Statuts (mapping)

| Clé DB | Label FR | Couleur badge | Sémantique |
|--------|----------|---------------|------------|
| `nouveau` | Nouveau | gris (`bg-surface-secondary text-text`) | Pas encore vu par l'admin |
| `a_actionner` | À actionner | warning (`bg-warning-light text-warning`) | Va être traité dans Claude Code |
| `traite` | Traité | success (`bg-success-light text-success`) | Fix livré / suggestion implémentée |
| `logge` | Loggé | info (`bg-info-light text-info`) | Vu, classé sans suite (ex: doublon, hors-scope) |

### 6.5 Format export JSON

Filename : `feedback-YYYY-MM-DD.json` (date du jour, format ISO court).

Format :

```json
[
  {
    "id": "uuid",
    "created_at": "2026-05-13T10:23:45.000Z",
    "created_by_email": "antoine@filmpro.ch",
    "type": "bug",
    "severity": "genant",
    "page": "/pipeline",
    "description": "Quand je glisse une carte de Qualification à Proposition, elle revient à sa place après 1 seconde.",
    "context": {
      "url": "https://filmpro-crm.vercel.app/pipeline?view=mois",
      "viewport": { "w": 1920, "h": 1080 },
      "userAgent": "Mozilla/5.0 (Macintosh; ...) Safari/...",
      "recentErrors": [
        { "message": "TypeError: ...", "stack": "...", "at": "2026-05-13T10:23:42.000Z" }
      ]
    },
    "status": "nouveau",
    "admin_notes": null
  }
]
```

Tri : `created_at DESC`. Encoding : UTF-8 sans BOM. Filtre admin : tous par défaut, option `?status=a_actionner` au moment de l'export.

---

## 7. Flux exact

### 7.1 Antoine signale un bug depuis /contacts

1. Antoine est sur `/contacts`. Il clique le bouton flottant en bas droite.
2. La modale s'ouvre. Le dropdown « Page » est pré-rempli à `/contacts` (label « Contacts »).
3. Antoine sélectionne `Type=Bug`, le sous-dropdown `Sévérité` apparaît, il choisit `Gênant`.
4. Il tape la description (50 caractères).
5. Il clique `Envoyer`. POST `/log?/create` avec les champs + `context` JSON construit côté client.
6. Le serveur valide via Zod, INSERT dans `feedback_entries` avec `created_by=user.id` et `created_by_email=user.email`.
7. Réponse OK → modale se ferme, toast vert « Retour envoyé, merci ».

### 7.2 Pascal traite le backlog

1. Pascal ouvre `/log` (ouverture nouvel onglet depuis sidebar).
2. Il voit le tableau avec compteurs « 3 nouveaux ».
3. Il clique sur une ligne `nouveau` → expand inline avec context complet.
4. Il clique `À actionner` → POST `/log?/updateStatus` avec id + status=`a_actionner`.
5. Il tape une note interne (`Lié à H-21 audit V2b`) dans le textarea → POST `/log?/updateAdminNotes` après blur.
6. Il filtre `À actionner` (3 entrées) → clic `Exporter en JSON` → téléchargement.
7. Il glisse le JSON dans Claude Code, demande « action ces 3 retours ».

### 7.3 Antoine vérifie sa boucle de feedback

1. Antoine revient sur `/log`.
2. Il voit son bug en statut `Traité` (vert).
3. Il sait que c'est pris en compte. Pas de doute, pas de re-relance.

---

## 8. Tests (Vitest)

Fichier `src/lib/feedback.test.ts` :

1. `FeedbackCreateSchema` rejette description < 10 chars, > 1000 chars, type inconnu, severity sans bug, bug sans severity.
2. `FeedbackUpdateStatusSchema` accepte les 4 statuts, rejette autre.
3. `isAdminEmail('pascal@filmpro.ch')` → true ; case insensitive ; emails autres → false ; undefined → false.
4. `toExportJson(entries)` retourne un `Blob` `application/json`, contient un tableau, ordre conservé, encoding UTF-8 testé via blob.text().
5. `pagesForUrl('/contacts/foo/bar')` → matche `/contacts` (prefix), retourne label « Contacts » ; URL inconnue → « Autre / hors CRM ».
6. `errorCapture.add(err)` cap à 3 ; max 60 s ; vieux events purgés.
7. Helper de mapping status → couleur badge.
8. Helper de mapping type → couleur badge.

Smoke server-side (si possible sans intégration Supabase) : validation actions `create` / `updateStatus` / `updateAdminNotes` rejette si user non admin pour updateStatus.

---

## 9. Gates QA / Definition of Done

- [ ] svelte-check 0 erreur.
- [ ] Vitest tous verts (1192 baseline + nouveaux).
- [ ] `pnpm build` OK.
- [ ] Audit `code-review:security-auditor` ciblé sur les nouveaux fichiers : 0 C/H/M ; artifact daté `audit_secu_2026-05-13_page_log.md` créé.
- [ ] Audit `code-review:test-coverage-reviewer` ciblé : coverage > 80 % sur `lib/feedback/*` + `routes/(app)/log/+page.server.ts`.
- [ ] Audit `code-review:contracts-reviewer` ciblé : table + types + RLS cohérents.
- [ ] Smoke prod : login antoine@filmpro.ch (compte de test ou via Pascal), bouton flottant visible, modal s'ouvre, submit OK, toast s'affiche, entrée visible dans /log.
- [ ] Smoke admin : login pascal@filmpro.ch, voit boutons statut + export, click `À actionner`, export JSON, fichier ouvert dans Claude Code parse OK.
- [ ] Mobile (iPhone DevTools manuel) : bouton flottant visible mais pas au-dessus du menu burger ; modal scrollable.
- [ ] Commit avec message clair, push, vérifier déploiement Vercel preview puis prod.
- [ ] CLAUDE.md : entrée dans `Livré cette session`, mise à jour `Prochain bug:`, watch list si dette résiduelle.

---

## 10. Sources et vérifications

- Pattern sidebar `config.navigation.secondary` + `external: true` : `src/lib/components/Sidebar.svelte:70-90`, vérifié in-session.
- Pattern auth + `safeGetSession` : `src/hooks.server.ts:36-46`, vérifié.
- Pattern form action SvelteKit + Zod + `extractForm` + `validate` : `src/routes/(app)/signaux/+page.server.ts:20-43` + `src/lib/schemas.ts:36-310`, vérifié.
- Pattern RLS `FOR ALL TO authenticated USING (true)` : `supabase/migrations/20260427_001_lead_signals.sql:36-37`, vérifié.
- Pattern modale accessible + `trapFocus` + `aria-modal` : `src/lib/components/ConfirmModal.svelte:1-89`, vérifié.
- Pattern Toast `z-[100]` + store `toasts` : `src/lib/components/Toast.svelte:23`, vérifié.
- Pattern data-driven page Aide : `src/lib/aide/content.ts:1-100` + `src/routes/(app)/aide/+page.svelte:1-553`, vérifié.
- RLS « update par email JWT » (`auth.jwt() ->> 'email'`) : pattern Supabase docs <https://supabase.com/docs/guides/database/postgres/row-level-security#policies-with-claims>, vérifié : non testé en session, à confirmer par smoke prod (sinon fallback : check côté serveur dans form action + RLS service role).

---

## 11. Risques et angles morts (résiduels post-cadrage)

- **Risque RLS update via `auth.jwt() ->> 'email'`** : si Supabase ne propage pas `email` dans le JWT par défaut, l'UPDATE échouera silencieusement. Mitigation : ajouter un check `isAdminEmail(user.email)` côté form action en plus de la RLS (defense in depth) ; si JWT n'a pas l'email, retomber sur check serveur uniquement et marquer la RLS en TODO. À vérifier dans la 1re session de code par un test live.
- **Bouton flottant masqué par modales existantes** : si une modale `ConfirmModal` (z-60) ou un slide-out panel s'ouvre, le bouton flottant z-90 reste visible mais n'est pas cliquable depuis l'intérieur de la modale (backdrop le couvre). Comportement acceptable.
- **Toast vs Bouton flottant superposition visuelle** : toast en bas-droite z-100 peut chevaucher le bouton z-90. Mitigation : ajouter `bottom-20` au toast quand le bouton est visible, ou positionner le bouton `bottom-20` pour laisser place au toast standard. Choix à trancher en code (reco : bouton à `bottom-6 right-6`, toast reste à `bottom-4 right-4`, ils se côtoient sans masquage critique).
- **Capture erreurs JS via `window.onerror`** : peut polluer les erreurs Sentry futures. Mitigation : ne pas `preventDefault()` dans le listener (laisser propager).
- **`created_by_email` redondant avec `created_by` + jointure auth.users** : volontairement dénormalisé pour simplifier l'export JSON (pas de jointure côté client) et survivre au cas où un user est supprimé (`ON DELETE SET NULL`).

---

## 12. Cadrage validation Pascal

Pascal valide ce document en 5 minutes en cochant :

- [ ] Critères § 2 OK (12 critères binaires).
- [ ] Hors-scope § 3 OK (1 demande hors-scope future = ouvre tâche transmise).
- [ ] Schéma DB § 4 OK (RLS, contraintes, index).
- [ ] UI/UX § 6 OK (mockup mental clair).
- [ ] Format export § 6.5 OK (champs JSON + ordre).
- [ ] Tests § 8 OK.

Si modification demandée → graver ici, re-valider, attaquer.

Si tout OK → passer à l'étape 3 (code), commit par lots logiques :

1. Migration SQL + types + schemas + helpers (DB + lib pure, testable).
2. Composants (`FeedbackForm`, `FeedbackTable`, `FeedbackButton`) + intégration layout.
3. Page `/log` + form actions + export JSON.
4. Tests Vitest.
5. Audits Opus + smoke + commit final + push + déploiement.

---

**Fin de la spec. Pas d'ambiguïté restante. Tout est factuel ou explicitement marqué « à confirmer ».**
