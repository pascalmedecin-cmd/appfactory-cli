# Plan feature flag : CRM FilmPro mobile V3 « outil terrain »

Rollout, kill switch et rollback du livrable mobile V3. Document opérationnel : tout SQL ci-dessous est exécutable tel quel (remplacer `<email>` par l'adresse cible).

Contexte : mono-tenant, au plus 10 utilisateurs fondateurs `@filmpro.ch`. Volume trop faible pour un outil de rollout fin par cohorte (GrowthBook écarté, voir `adr/0005-feature-flag-supabase-jwt-vs-growthbook.md`). Le pilotage se fait directement sur les comptes utilisateurs, un par un.

Baseline code avant V3 : commit `9339300` (prod live `https://filmpro-crm.vercel.app`). Toute opération de rollback revient à ce commit ou à un commit plus récent ne contenant pas le code V3.

---

## 1. Le flag

| Élément | Valeur |
|---|---|
| Nom du flag (claim JWT) | `ff_crm_mobile_v3` |
| Champ TypeScript (`feature-flags.ts`) | `ffCrmMobileV3` |
| Stockage | `auth.users.raw_app_meta_data` (Supabase) |
| Lecture | `src/lib/types/feature-flags.ts` via `readFeatureFlags(user.app_metadata)` |
| Défaut | `false` (le flag absent vaut désactivé) |

**Mécanisme JWT custom claims.** La valeur du flag est inscrite dans `raw_app_meta_data` de l'utilisateur côté Supabase. Ce champ est embarqué dans le JWT signé à l'émission de la session. Le client ne peut pas le falsifier : le claim est signé serveur, et `readFeatureFlags` n'accepte une valeur que si elle est strictement `=== true`. Toute autre valeur (absente, `false`, `"true"` en chaîne, `1`) reste `false`.

**Comment le flag gate le shell mobile.** Le rendu V3 est servi sous une double condition (ET logique) :

1. **Flag** : `readFeatureFlags(user.app_metadata).ffCrmMobileV3 === true`.
2. **Viewport** : appareil en largeur mobile (le shell terrain n'est servi que sur petit écran).

Si l'une des deux conditions est fausse, l'utilisateur reçoit l'expérience desktop standard inchangée. Conséquence directe : un fondateur sans le flag, ou un fondateur avec le flag mais sur desktop, ne voit jamais le code V3. C'est ce qui rend le rollback sûr (voir section 5).

**Action de code requise avant le pilote (voir aussi section 6).** Ajouter le champ `ff_crm_mobile_v3` / `ffCrmMobileV3` dans `feature-flags.ts` (aujourd'hui le fichier ne porte que `ff_crm_mobile_v2`). Le champ V3 doit exister et être lu avant la première activation, sinon le flag posé en base reste inerte.

---

## 2. Activation (SQL exact)

Activer le flag pour un utilisateur donné :

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"ff_crm_mobile_v3": true}'::jsonb
WHERE email = '<email>@filmpro.ch';
```

L'opérateur `||` fusionne sans écraser les autres clés de `raw_app_meta_data`. Idempotent : ré-exécuter ne casse rien.

**Prise d'effet.** Le claim n'entre dans le JWT qu'à la prochaine émission de session. L'utilisateur doit donc se reconnecter (ou rafraîchir son token) pour que le flag devienne actif côté navigateur. Tant que l'ancienne session vit, l'ancien comportement persiste.

Vérification après activation :

```sql
SELECT email, raw_app_meta_data->'ff_crm_mobile_v3' AS v3
FROM auth.users
WHERE email LIKE '%@filmpro.ch';
```

---

## 3. Kill switch (moins de 60 secondes)

Désactiver le flag pour un utilisateur :

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data - 'ff_crm_mobile_v3'
WHERE email = '<email>@filmpro.ch';
```

Désactiver pour TOUS les fondateurs d'un coup (panique générale) :

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data - 'ff_crm_mobile_v3'
WHERE email LIKE '%@filmpro.ch';
```

L'opérateur `-` retire la clé. Sans clé, `readFeatureFlags` retourne le défaut `false`, donc le shell mobile V3 n'est plus servi.

**Point de vigilance JWT (à dire à l'utilisateur).** Retirer la clé en base ne casse PAS instantanément la session déjà ouverte : le claim reste dans le JWT signé tant que ce token vit. Pour que la désactivation soit effective côté navigateur, l'utilisateur doit **se reconnecter (ou rafraîchir son JWT)**. En pratique : exécuter le SQL, puis demander aux utilisateurs concernés de se déconnecter / reconnecter. Pour forcer la coupure immédiate sans attendre, invalider la session côté Supabase (déconnexion forcée du ou des comptes).

Le « moins de 60 secondes » vise l'exécution du SQL et la coupure côté serveur ; la disparition côté client suit le rafraîchissement du token.

---

## 4. Plan de rollout (au plus 10 users, simplifié 2 étapes)

Rollout direct, pas de pourcentage ni de cohorte : on passe d'un compte pilote à l'ensemble des fondateurs.

| Étape | Périmètre | Critères de passage (TOUS verts pour avancer) | Action si rouge |
|---|---|---|---|
| **0 - Pré-vol** | Aucun user | Code V3 mergé, `ffCrmMobileV3` présent dans `feature-flags.ts`, build Vercel vert, déploiement promu sur l'alias prod | Bloquer, ne pas activer |
| **1 - Pilote** | `pascal@filmpro.ch` uniquement | AC-017 smoke iPhone OK (parcours terrain réel sur vrai appareil) + AC-013 zéro régression desktop + zéro erreur console sur le compte pilote | Kill switch sur le pilote (section 3), corriger, re-tester |
| **2 - GA** | Tous les fondateurs `@filmpro.ch` | Étape 1 stable au moins une journée d'usage réel + AC-013 toujours vert + aucune remontée d'erreur | Kill switch global (section 3), retour étape 1 |

Activation GA (étape 2) en une commande :

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"ff_crm_mobile_v3": true}'::jsonb
WHERE email LIKE '%@filmpro.ch';
```

Rappel : chaque utilisateur activé doit se reconnecter pour charger le claim (section 2).

Critères référencés (voir `acceptance-criteria.json`) :
- **AC-017** : smoke iPhone sur appareil réel (DevTools / Playwright preset ne suffisent pas comme preuve terrain, voir règle projet `feedback_crm_mobile_testing_devtools.md`).
- **AC-013** : zéro régression sur l'expérience desktop existante.

---

## 5. Rollback

Le rollback se fait par retrait du flag, sans intervention destructive sur la base.

**Niveau 1 - rollback fonctionnel (instantané, sans déploiement).** Kill switch du flag (section 3, global). Comme les routes/shell mobile V3 ne sont servis QUE sous le flag, leur retrait rend l'expérience desktop intacte pour tout le monde. C'est le premier réflexe en cas d'incident : pas besoin de toucher au code ni de redéployer.

**Niveau 2 - rollback de code (si le code V3 lui-même pose problème).** Revenir au commit baseline `9339300` (ou tout commit ultérieur sans le code V3), redéployer, vérifier la promotion sur l'alias prod. À noter : tant que personne n'a le flag actif, le code V3 présent en prod est dormant ; le niveau 2 n'est nécessaire que si le code V3 cause un problème même flag éteint (cas rare, ex. import partagé cassé).

**Migrations DB : aucun revert requis.** Les migrations V3 sont **additives** :
- `ALTER TABLE prospect_visits ADD COLUMN resultat ...` (additif)
- `ALTER TABLE prospect_visits ADD COLUMN note ...` (additif)
- `prospect_visits.lat` / `lng` passés **nullable** (assouplissement de contrainte, n'invalide aucune donnée existante)
- `CREATE TABLE contact_suggestions ...` (nouvelle table)

Ces objets restent inertes quand le flag est éteint : les colonnes ajoutées ne sont écrites que par le code V3, la table `contact_suggestions` n'est lue/écrite que par le code V3. Donc **aucun rollback DB destructif** (`DROP COLUMN`, `DROP TABLE`) n'est nécessaire pour annuler V3. Laisser les objets en place est sans risque et évite une opération destructive inutile.

**Piège Vercel rollback -> alias prod (à vérifier systématiquement).** Après un `vercel rollback`, les `git push` suivants buildent mais ne promeuvent PAS automatiquement le nouveau déploiement sur l'alias de production. Toujours confirmer la cible de l'alias avec :

```bash
vercel inspect filmpro-crm.vercel.app
```

et s'assurer que l'alias pointe bien sur le déploiement attendu (réf. watch list CRM « Trap Vercel rollback -> alias prod verrouillé »).

---

## 6. Retrait de la V2

La V2 mobile est **abandonnée**. Son flag et son code doivent être retirés pour ne pas laisser deux chemins morts.

**Ordre des opérations (important).** Retirer le flag en base AVANT de supprimer le champ du code éviterait un claim orphelin, mais l'inverse est tout aussi sûr ici puisque V2 est déjà désactivée partout. Recommandé : (a) couper le flag sur tous les users, (b) rollback du code V2, (c) supprimer le champ.

**a. Kill switch `ff_crm_mobile_v2` sur tous les utilisateurs :**

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data - 'ff_crm_mobile_v2'
WHERE email LIKE '%@filmpro.ch';
```

Vérification (doit retourner 0 ligne avec une valeur non nulle) :

```sql
SELECT email, raw_app_meta_data->'ff_crm_mobile_v2' AS v2
FROM auth.users
WHERE raw_app_meta_data ? 'ff_crm_mobile_v2';
```

**b. Rollback du code V2** (les routes/composants mobile V2 retirés du repo).

**c. Suppression du champ dans `feature-flags.ts`.** Une fois le code V2 retiré, supprimer le champ `ffCrmMobileV2` de l'interface `FeatureFlags`, de `DEFAULT_FEATURE_FLAGS`, et la ligne de lecture `ff_crm_mobile_v2` dans `readFeatureFlags`. Mettre à jour le bloc de commentaire en tête de fichier (exemples d'activation/kill switch) pour qu'il référence `ff_crm_mobile_v3` et non plus `ff_crm_mobile_v2`.

But : ne laisser qu'un seul flag mobile vivant (`ff_crm_mobile_v3`), zéro chemin de code mort, zéro claim orphelin en base.
