# Spec - Validation externe des prospects d'une campagne + page campagne dédiée

**Statut :** cadrée 2026-07-02, mockup UI validé par Pascal (v3 golden), **spec durcie par critique adversariale** (3 lentilles sécurité/complétude/cohérence). Code local écrit, **non commité, non déployé**. Build + QA + tests + audit sécu + déploiement = **prochaine session** (run autonome).
**Mockup de référence (validé) :** `docs/mockups/mockup-campagne-validation-2026-07-02.html`
**Flag UI :** `ffCrmListesV2` (premium, ON fondateurs) - gate des surfaces **fondateur** (page campagne, endpoints d'admin du lien), re-vérifié serveur.
**Kill-switch porte publique :** `VALIDATION_EXTERNE_ENABLED` (env, défaut ON) - voir §5.0. Le flag `ffCrmListesV2` ne protège PAS les routes publiques (elles sont exemptées du gate auth, sans user donc sans flag JWT).

---

## 1. Objectif (le besoin de Pascal)

Avant l'impression d'étiquettes ou l'envoi d'un mailing, une **personne de l'équipe sans compte CRM** (et à qui Pascal ne veut pas donner d'accès) doit pouvoir vérifier les prospects d'une campagne un par un (fiche Google Maps à l'appui) et dire lesquels **garder** ou **retirer**. Aujourd'hui le PDF est un cul-de-sac : son retour ne remonte pas dans le CRM.

En parallèle, rendre le **processus campagne fluide de bout en bout** (Constituer -> Organiser -> Valider -> Diffuser) sur une **page campagne dédiée** qui remplace le panneau latéral, avec toutes les sorties regroupées (étiquettes, PDF liste, envoi pipeline, futur mailing).

## 2. Décisions produit validées

- **Lien de validation secret**, sans compte : le fondateur génère un lien, l'envoie (email/WhatsApp), la personne marque garder/retirer, ses décisions remontent dans la page campagne.
- **Retrait = geste fondateur** : la personne externe *marque*, seul un fondateur *applique* (bouton « Appliquer les retraits » + confirmation). Droit de regard préservé.
- **Validité du lien : 2 jours** (décision Pascal), révocable, régénérable (un nouveau lien coupe l'ancien).
- **Invariant « au plus un lien actif par campagne »** : porté par `createValidationLien` (révoque puis insère). Comme la séquence n'est pas atomique, soit on l'assume (mono-tenant ≤ 10 fondateurs, chaque token reste scopé à sa campagne -> zéro impact confidentialité), soit on ajoute un index unique partiel `WHERE revoked_at IS NULL`. **À trancher au build** (reco : index partiel, coût nul, invariant garanti en base).
- **Page campagne dédiée** (remplace le panneau `CampagneProspectsPanel`) : un seul chemin.
- **Sorties « Diffuser »** : étiquettes (avec option « validés seulement »), liste PDF, envoi des validés au pipeline. Le mailing rejoindra cette zone quand le module existera (pas d'UI morte d'ici là).

## 3. UI validée (mockup v3, à respecter au build)

Direction retenue : **un seul accent bleu FilmPro, palette sourde, zéro couleur criarde**, 100 % golden v9. Points durs :

- **Segment de statut « En cours / Active »** : 2 moitiés strictement égales (50/50, `grid 1fr 1fr` largeur fixe 176px), radius `md`, un seul remplissage bleu (plus de vert « Active »). Composant partagé liste + en-tête page campagne.
- **Bloc « Validation externe »** (page campagne) : un seul bleu pour « Partager le lien » ; **barre de progression bleue unie** (plus de bicolore vert+rouge) ; « Appliquer les retraits » et « Révoquer » en boutons **tertiaires** (rouge uniquement dans la ConfirmModal) ; compteur + barre **nus** sur la carte ; libellés courts mais explicites.
- **Chips de décision par ligne** : « Garde » = sauge sourd (`success #538B6B` / `successBg`), « Retire » = ardoise sourd (`info #5A7190` / `infoBg`). **Jamais de rouge en aplat.**
- **Page publique (`/validation/<token>`)** : **colonne centrée claire** (max-width 640, marges layout ; **plus de cadre téléphone ni de bandeau sombre**), logo FilmPro standard en tête, kicker + titre 22px ; **lignes séparées par un filet** (pas de carte par ligne, pas de liseré coloré, pas de fond teinté) ; boutons Garder/Retirer 44px sourds (sauge / ardoise) ; compteur collant ; **barre de progression MONO bleue** (fill unique, jamais bicolore, identique à la page campagne) ; lien Maps en pill `surfaceAlt` + texte primary.
- **Marges** : page campagne bornée à 1160px centré + gouttière layout (identique liste + étiquettes ; vérifié + aligné 2026-07-02).
- **Garde-fous golden (jury)** : barème de police 10/12/14/15/16/18/22, espacement 4/8/12/16/24/32/48, bordures 1px, `primaryDark`/`primaryLight` non utilisés sur la page publique, `mag-*` réservé à /veille, aucune variante de bouton inventée.

> **Important build** : les 2 pages Svelte déjà écrites l'ont été **avant** ce raffinement. À **réaligner sur le mockup v3** (segment 50/50, palette sourde, page publique claire aérée, **barre publique mono-bleue** - le code public a encore `val-bar-garder`/`val-bar-retirer` à supprimer). Le mockup est la source de vérité visuelle.

## 4. Ce qui est DÉJÀ codé (local, non commité)

**Données**
- `supabase/migrations/20260702120000_validation_externe_campagne.sql` : table `campagne_validation_liens` (token_hash SHA-256, expires_at, revoked_at, RLS authenticated) + colonnes `validation_statut` / `validation_at` sur `prospect_lead_campagnes` (CHECK garder/retirer).
- `src/lib/database.types.ts` : types régénérés.

**Logique serveur**
- `src/lib/server/validation-campagne.ts` : génération/révocation/résolution de token (SHA-256, jamais de token en clair), décisions, application des retraits, lien actif. TTL 2 jours.
- `src/lib/maps-url.ts` : lien Google Maps sûr (allowlist d'hôtes), **source unique** partagée PDF + page publique.
- `src/lib/campagnes-pdf/pdf-liste-prospects.ts` : **modifié** - bascule vers `$lib/maps-url` (retrait de la logique d'allowlist dupliquée, désormais source unique).
- `src/lib/campagnes.ts` : `ValidationDecision`, `validationProgress()`, champ `validation_statut` sur `ProspectCampagne`.
- `src/lib/server/campagnes.ts` : `fetchProspectsForCampagne` lit `validation_statut` (même passe paginée).

**Endpoints**
- `POST/DELETE /api/campagnes/[id]/validation`, `POST /api/campagnes/[id]/validation/appliquer`, `POST /api/campagnes/[id]/pipeline`, `POST /api/validation/[token]/decision` (route publique).

**Pages** : `validation/[token]/` (publique) + `crm/campagnes/[id]/` (page campagne). **UI à réaligner mockup v3.**

**Plomberie**
- `src/hooks.server.ts` : exemption du gate auth pour les routes publiques + rate limiter dédié 60/min. **À compléter au build** : poser `Cache-Control: no-store` + `X-Robots-Tag: noindex, nofollow` de façon **centralisée dans `baseHandle`** sur `isValidationPublicRoute` (le hook s'exécute sur CHAQUE réponse : succès, expiré, 404, 500, POST) plutôt que dans le seul `load` (qui rate les `throw error`).
- `src/lib/server/rate-limit-paths.ts` : `isValidationPublicRoute`. **À durcir au build** : matcher les motifs EXACTS (`^/validation/[^/]+$` et `^/api/validation/[^/]+/decision$`) au lieu de `startsWith`, sinon une future sous-route `/api/validation/.../admin` hériterait automatiquement de l'exemption d'auth.

## 5. Reste à faire (prochaine session)

**5.0 - Kill-switch porte publique (BLOQUANT, à coder en premier).** Variable d'env `VALIDATION_EXTERNE_ENABLED` (défaut ON), vérifiée **en tête** du `load` public ET de l'API `decision`, **avant toute lecture DB** : si OFF -> page « lien désactivé » / API 410, zéro requête DB. C'est le SEUL moyen de fermer instantanément toutes les portes publiques sans migration ni révocation individuelle (le flag `ffCrmListesV2` ne s'applique pas à ces routes). La révocation/expiration 2 j reste le kill **par campagne**.

1. **Réaligner l'UI** des 2 pages sur le mockup v3 (§3), barre publique mono-bleue incluse.
2. **Option « validés seulement »** (page Étiquettes, mockup vue 5) - **non codée** :
   - visible **seulement si ≥ 1 prospect de la campagne a `validation_statut` non-null** (sinon l'option n'apparaît pas) ;
   - active -> exclure `retirer` **ET** non-vérifiés (null), **et sauter tout groupe devenu vide** après filtrage (aucun intercalaire orphelin) ;
   - filtre appliqué **AVANT** la construction du flux d'intercalaires (`pdf-etiquettes`) ; s'applique à la **planche d'étiquettes ET au PDF liste sectionné** ;
   - cochée par défaut quand elle apparaît.
3. **Minimisation publique** : extraire une fonction pure `toPublicProspect(row)` qui ne retourne QUE `{id, nom, adresse, mapsUrl, decision}` (id exposé car requis par l'API decision, ne porte aucune info). Aujourd'hui la non-fuite tient à un `.map()` manuel non testé.
4. **Cap de volume** de la lecture publique : borner à 1000 prospects (aligné cas étiquettes) via un paramètre `maxRows` sur la lecture, OU paginer la page publique. Aujourd'hui `fetchProspectsForCampagne` pagine sans borne pour un client anonyme.
5. **Tests** (§7).
6. **Audit sécu** (§7) - bloquant.
7. **Migration prod** via lib `pg` (14 chiffres, additive). Trancher l'index unique partiel du lien actif (§2).
8. **Build vert** (`svelte-check` + `vite build`) + commit ciblé + push `main` (auto-déploie).

## 6. Critères d'acceptation (binaires - tous verts avant « livré »)

**Fonctionnels**
- [ ] Génération du lien -> modale avec message prêt à copier (sans nom, sobre) + expiration.
- [ ] Le lien ouvre la page publique **sans login** ; liste prospects (nom, adresse, lien Maps) + Garder/Retirer + compteur.
- [ ] Décision publique enregistrée (garder/retirer, re-clic = annule) et **remontée** dans la page campagne (chip + progression).
- [ ] « Appliquer les retraits » retire **exactement** les prospects marqués `retirer` (restent en Prospection), après confirmation.
- [ ] Le libellé de confirmation « Appliquer les retraits (N) » traite N comme **indicatif** (état au chargement) ; le toast affiche le `removed` réel - le wording ne promet pas un nombre exact.
- [ ] Lien **expiré (> 2 j) ou révoqué** -> page « lien expiré », API 410 ; décisions déjà prises conservées.
- [ ] Générer un nouveau lien **révoque** le précédent.
- [ ] Campagne **vide** -> « Partager » désactivé ; campagne **archivée** -> génération désactivée ; prospect **sans fiche Google** -> pas de lien Maps, message « vérifiez l'adresse ».
- [ ] « Envoyer au pipeline » (sélection OU validés) passe en `a_contacter` + crée l'opportunité (idempotent ; écartés/convertis ignorés ; bilan honnête).
- [ ] Étiquettes : option « validés seulement » exclut `retirer` **et** non-vérifiés ; **un groupe entièrement exclu ne produit aucun intercalaire** ; impossible d'imprimer un `retirer`.

**Sécurité (porte publique - definition of done)**
- [ ] **Minimisation prouvée** : le load public retourne des prospects dont les clés sont **exactement** `{id, nom, adresse, mapsUrl, decision}` (test de forme - échoue si `score`/`statut`/`source`/`description`/`google_types` apparaît).
- [ ] **Kill-switch** : `VALIDATION_EXTERNE_ENABLED=0` ferme instantanément page + API (sans migration ni révocation), zéro requête DB.
- [ ] **Headers** : toute réponse des routes publiques porte `Cache-Control: no-store` ET `X-Robots-Tag: noindex, nofollow` (succès, expiré, 404, 500, POST).
- [ ] **Refus d'écriture** après révocation OU expiration : POST decision -> 410, ligne `prospect_lead_campagnes` **inchangée**.
- [ ] **Isolation cross-campagne** : token de la campagne A + leadId hors de A -> 409, **0 ligne modifiée**.
- [ ] **Cap de volume** : la page publique borne à N prospects ; au-delà -> pagination ou message (pas de sérialisation illimitée vers un anonyme).
- [ ] Token jamais en clair (SHA-256), non devinable (32 octets), résolu à chaque requête ; 404 uniforme (anti-énumération).
- [ ] Liens Maps de la page publique : `rel="noopener noreferrer"` + `target="_blank"`.
- [ ] Gate `ffCrmListesV2` re-vérifié serveur sur chaque endpoint **fondateur**.
- [ ] **`security-auditor` = 0 High/Critical** + `bug-hunter` 0 High non résolu (artefact daté).

**Qualité**
- [ ] UI conforme mockup v3 ; grep `val-bar-garder|val-bar-retirer|vbar-garder|vbar-retirer` = 0 (barre publique mono-bleue) ; 0 cadratin / emoji dans les fichiers.
- [ ] `svelte-check` 0 erreur ; `vite build` vert ; Vitest vert (baseline 2468 + nouveaux tests).
- [ ] Migration rejouable (`supabase db reset` OK en local Colima).

## 7. Plan de tests

**Vitest unit** (logique pure + endpoints, mocks Supabase)
- `validation-campagne` : hash déterministe, forme du token, TTL/expiration, résolution ok/introuvable/expiré, application des retraits (compte), révocation.
- `toPublicProspect` : **clés exactement** `['adresse','decision','id','mapsUrl','nom']` (tri) -> échec si une clé sensible fuit.
- `validationProgress()` : comptes garder/retirer/vérifiés/total.
- `maps-url` : allowlist (hôte Google OK, hôte arbitraire rejeté, source non-Google -> null).
- Endpoints fondateur : 401 sans session, 403 flag off, 400 id/body invalide, 404 campagne absente.
- API decision (public) : 400 body invalide, 404 token inconnu, **410 lien expiré/révoqué avec 0 écriture** (2 tests : révoqué / expiré), **409 cross-campagne avec 0 écriture**, 409 prospect retiré entre-temps.
- **Kill-switch** : `VALIDATION_EXTERNE_ENABLED=0` -> GET page = état désactivé + POST decision = 410, **0 requête DB** (mock non appelé).
- **Non-exemption** : route hypothétique `/api/validation/xyz/admin` **n'est pas** exemptée (retombe sous le gate auth).

**Vitest - hooks / headers**
- Réponses des routes publiques (GET valide, GET expiré, GET token inconnu 404, POST decision) portent `Cache-Control: no-store` + `X-Robots-Tag`.
- `fetchProspectsForCampagne` remonte bien `validation_statut` (anti-régression).

**e2e Playwright** (base jetable Colima, `supabase db reset` avant)
- Parcours fondateur : générer -> copier -> (décisions) -> progression -> appliquer retraits -> prospects retirés.
- Parcours public : ouvrir sans session -> garder/retirer -> re-clic annule -> lien révoqué -> état expiré. Assert `rel="noopener noreferrer"` sur les ancres Maps.
- Étiquettes : « validés seulement » exclut `retirer` + non-vérifiés ET **ne produit aucun intercalaire pour un groupe entièrement exclu**.
- Volume : campagne seedée > cap -> réponse publique bornée.

> Rappel local : `supabase db reset` **avant** `supabase test db` ; `CRON_SECRET` à l'env des e2e cron ; RLS non prouvée par mocks (porte publique = service role après résolution token, vérifier le périmètre par test d'intégration).

## 8. Hors-scope + risques acceptés (nommés)

**Hors-scope**
- Envoi email/mailing automatisé (chantier séparé).
- Notification au fondateur quand la validation est terminée (surveillance manuelle).
- Compte/identité pour la personne externe (volontairement sans compte).
- Historisation fine des décisions (au-delà de `validation_at`).
- **Campagnes > 500 validés en un envoi pipeline** : le Zod `max(500)` rejette le lot ; reco = batching client par 500, sinon documenté comme non supporté.

**Risques acceptés (à graver, ne pas laisser implicite)**
- **Token dans le path** : présent dans les logs d'accès Vercel (accès restreint) et l'historique navigateur. Alternative (hash/POST) écartée pour préserver l'UX « lien partageable ». Mitigé par expiration 2 j + révocation + `Referrer-Policy` global.
- **Rate-limit 60/min/IP in-memory PAR INSTANCE serverless** (non global sur Vercel) : c'est un throttle, pas un anti-brute-force - le token 256 bits rend le brute-force sans objet.
- **Oracle d'appartenance 200/409** sur l'API decision : borné par l'imprévisibilité des UUID et la connaissance déjà légitime de la liste par le détenteur du lien.
- **Race « lien unique »** si non résolue par index partiel (§2) : acceptée en mono-tenant, chaque token restant scopé à sa campagne.

## 9. Séquence de build recommandée (run autonome)

1. Kill-switch `VALIDATION_EXTERNE_ENABLED` (5.0) + durcir le helper d'exemption + headers centralisés dans le hook.
2. Migration prod (pg) + index partiel lien actif + `db reset` local -> vérifier types.
3. `toPublicProspect` + cap de volume public.
4. Réaligner UI page campagne (mockup v3) puis page publique (mockup v3, barre mono-bleue).
5. Option étiquettes « validés seulement » (filtre avant flux intercalaires).
6. Tests unit + e2e -> vert.
7. `security-auditor` + `bug-hunter` ciblés -> 0 H/C dans la session (artefact daté).
8. `svelte-check` + build + commit ciblé + push `main` -> vérifier déploiement (`vercel ls`).
9. Carte de fin de chantier + smoke prod noté pour Pascal (générer un lien réel, l'ouvrir hors session, marquer, appliquer).
