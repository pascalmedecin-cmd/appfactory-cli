# Handoff - Session 69 : formation-ia uniquement (dette <title> + GitHub→Vercel lié)

## Objectif session

Deux tâches exécutables bouclées sur formation-ia en attendant la deep research marketing de Pascal (bloquante pour l'ingestion parcours).

## Périmètre

- **Scope** : sous-projet `formation-ia/` uniquement (repo `pascalmedecin-cmd/onboarding-ia`)
- **CRM FilmPro (racine AppFactory)** : aucune modif code **de cette session**, juste la MAJ `CLAUDE.md` racine pour décaler les sessions précédentes

### Migration `generate.ts` Opus 4.6 → 4.7 — résolue hors session (commit `499f137`)

Statut : **résolu**. Signalée comme non commitée en fin de session 69, la modif a été produite par une session méta `~/.claude` parallèle (migration API Claude cross-projet pilotée par la règle « dernière version à prix égal »), puis commitée par Pascal le 2026-04-16 18:42 :

```
499f137 chore: migre Opus 4.6 → 4.7 sur cron veille (generate.ts)
```

Contenu final de la migration (Phase 1 + Phase 2 du pipeline `/api/cron/intelligence`) :
- Ligne 23 : `const MODEL = 'claude-opus-4-7'`
- Lignes ~282-283 et ~392-393 : spread cast `...({ thinking: { type: 'adaptive' }, output_config: { effort: 'high' } } as Record<string, unknown>)` dans `callPhase1` et `callPhase2`. Cast via `Record<string, unknown>` car SDK `@anthropic-ai/sdk@0.88` ne type pas encore `output_config`.

Le message de commit signale 3 ERRORs TypeScript préexistantes (`run-generation.ts:61`, `run-generation.ts:92`, `signaux/+page.svelte:161`) indépendantes de la modif.

**Point de vigilance (prochaine session AppFactory)** : observer le 1er run du cron veille hebdo post-migration (coût tokens thinking + latence end-to-end vs baseline 4.6). Adaptive thinking peut consommer plus de tokens output. Si régression budgétaire → envisager passer effort de `high` à `medium`, ou retirer le bloc thinking.

## Livré

### 1. Dette SEO + a11y `<title>` résolue (commit `32c74cd`)

`<svelte:head><title>` ajouté sur les 7 routes formation-ia :
- `/` : `Accueil - Onboarding IA`
- `/login` : `Connexion - Onboarding IA`
- `/admin/allowlist` : `Allowlist - Onboarding IA`
- `/parcours/[slug]` : `{parcours?.nom ?? 'Parcours'} - Onboarding IA`
- `/parcours/[slug]/jour/[n]` : `Jour {n} - Onboarding IA`
- `/parcours/[slug]/jour/[n]/exercice/[m]` : `{exercice?.titre ?? 'Exercice'} - Onboarding IA`
- `/parcours/[slug]/jour/[n]/quiz` : `Quiz jour {n} - Onboarding IA`

Pas de `+error.svelte` dans les routes (route absente). Fallbacks gracieux pour données DB manquantes. Convention tiret court (règle Pascal) + suffixe uniforme.

Tests 21/21 verts, `npm run check` 0 erreur, `npm run build` OK. Deploy prod manuel `dpl_B8g7kuwBu8HUi9hGqLfZvejjsjfF` READY.

### 2. Connexion GitHub→Vercel activée (commit test vide `5bf14ba`)

- Vercel GitHub App permissions étendues au repo `onboarding-ia` côté GitHub Settings (Installations → Vercel → Configure → add repo)
- `vercel git connect https://github.com/pascalmedecin-cmd/onboarding-ia.git` côté CLI → `Connected`
- Test bout-en-bout : commit vide → push → deploy auto `onboarding-7au1agn0h` déclenché en **11s**, Ready en **15s**
- **Résultat** : plus besoin de `npx vercel --prod` manuel pour les prochaines livraisons formation-ia. Chaque push sur `main` déclenche auto le deploy.

### 3. Docs (commits `766533d` formation-ia + `8471402` AppFactory racine)

- `formation-ia/CLAUDE.md` : section « Session courante » réécrite, 2 tâches cochées dans « Prochaine session (S3) », sessions précédentes décalées
- `AppFactory/CLAUDE.md` : sessions précédentes décalées (-3 S2 archivée du header, 67 condensée en prélude -2)

## Tournant de session : quiproquo Vercel multi-projets

Pascal a d'abord connecté le mauvais repo (`pascalmedecin-cmd/appfactory-cli`, le repo CRM parent) au projet Vercel `onboarding-ia` au lieu de `pascalmedecin-cmd/onboarding-ia`. Correction :
1. Disconnect côté Vercel UI
2. Extension Vercel GitHub App perms côté GitHub (`onboarding-ia` ajouté)
3. `vercel git connect` CLI côté Claude Code

**Risque évité** : sans correction, un push ultérieur sur appfactory-cli (CRM) aurait déclenché un deploy erroné sur onboarding-ia (Root Directory `.` → pas de SvelteKit formation-ia à cet endroit).

**Leçon captée** : `memory/feedback_vercel_repo_disambiguation.md` — tout pas-à-pas Vercel multi-projets doit nommer le repo cible en full-path + demander confirmation visuelle avant clic.

## Non fait (toujours bloqué)

- **Ingestion parcours marketing** : en attente deep research markdown de Pascal (Claude chat). Workflow prêt (`docs/INGESTION.md` + `docs/PEDAGOGIE.md`).
- **Audit E2E contenu réel** : bloqué par l'ingestion marketing.
- **Autres parcours thématiques** : même blocage (opération, commercial).
- **Script sync charte-outils** : tâche tracée au niveau `~/.claude/CLAUDE.md` (transversale).

## Tests + build

- Vitest : 21/21 verts (inchangé)
- `npm run check` : 0 erreur, 0 warning
- `npm run build` : OK

## Deploys

- `dpl_B8g7kuwBu8HUi9hGqLfZvejjsjfF` READY — commit `32c74cd` titres svelte:head
- `dpl_7au1agn0h` READY — commit vide `5bf14ba` test deploy auto
- (Deploy auto probable sur commit `766533d` post-fin-session — docs-only, sans impact prod)

## Credentials / env vars (changements session)

Aucun changement.

## Subagents

Aucun subagent invoqué cette session (travail direct sur fichiers + CLI, pas de parallélisation).

## Prochaine action

**En attente côté Pascal** : deep research marketing (markdown Claude chat). Quand elle arrive, lancer l'option `[3] Intégrer un parcours` depuis le menu `/start` Formation IA (workflow Opus 4.6, ~2-3h, validations jour par jour).

## Apprentissages méthodo

- **Vercel CLI `vercel git connect`** : fonctionne si la Vercel GitHub App a accès au repo. Sinon échec silencieux côté API → il faut d'abord étendre les perms côté GitHub Settings.
- **Deploy Vercel Hobby** : 15s de build pour le test commit vide → cold start réduit, pas d'impact user.
- **Commit vide `--allow-empty`** : outil utile pour tester un hook Git sans créer de changement métier.
