# Skill Deploy : Tests + Push GitHub + Vercel auto-deploy

Tu es un Product Engineer qui deploie un projet SvelteKit apres validation des tests.

Par defaut, le deploiement est **automatique via l'integration GitHub <-> Vercel** : tout push sur `main` declenche un deploy production, toute branche PR genere un deploy preview. Le CLI `vercel` n'est utilise qu'en fallback (nouveau projet non-lie, deploy hors-Git).

## Argument

L'operateur peut passer un argument : `preview` (defaut) ou `prod`/`production`.

- `preview` : push sur une branche autre que `main` (Vercel genere un preview auto)
- `prod` : push sur `main` (Vercel deploie en production auto)

## Deroulement

### Phase 1 : Pre-checks

1. Verifie qu'on est dans un projet SvelteKit valide (package.json avec @sveltejs/kit)
2. Verifie que `vercel.json` existe
3. Verifie que les env vars Vercel prod/preview sont configurees : `vercel env ls production` et `vercel env ls preview`
4. Verifie le statut git : si des fichiers non commites, demande a l'operateur s'il veut commiter d'abord (jamais `git add .`, toujours `git add` explicite sur les fichiers prevus)
5. Verifie que la branche courante est coherente avec le mode :
   - Mode `prod` -> branche `main` obligatoire
   - Mode `preview` -> toute branche autre que `main`

### Phase 2 : Tests

1. Lance `npm run test` (Vitest unitaires)
2. Si les tests echouent : STOP, affiche les erreurs, propose de corriger
3. Si Playwright est configure, lance `npm run test:e2e`
4. Lance `npm run check` (svelte-check) et signale les erreurs (n'arrete pas sauf regression introduite par cette session)
5. Affiche le rapport : X tests passes, X echoues, X warnings svelte-check

### Phase 3 : Git

1. Si pas de repo git : `git init` + premier commit + `gh repo create` + `vercel link`
2. Si pas de remote : demande le nom du repo GitHub, cree-le avec `gh repo create`
3. Commit si necessaire (message descriptif, co-author Claude, jamais `--no-verify`)
4. Push vers la branche courante : `git push` (ou `git push -u origin <branch>` si premier push)

### Phase 4 : Deploy

#### Mode preview (flow auto, defaut)

1. Le push GitHub declenche automatiquement un deploy preview Vercel
2. Recupere l'URL de preview via `vercel inspect` ou `gh pr view` (si PR ouverte) ou `vercel ls | head -5`
3. Affiche : "Preview deploye : <url>"
4. Propose : "Tester l'URL puis merge sur `main` + `/deploy prod` pour la production"

#### Mode production (flow auto)

1. Le push sur `main` declenche automatiquement un deploy production Vercel
2. Attend la fin du build (`vercel inspect <deployment> --wait` si URL connue, sinon polling `vercel ls --prod | head -1` jusqu'a statut `Ready`)
3. **Supprime le dossier `_previews/`** s'il existe localement : les previews de validation ne sont plus necessaires apres un deploy prod. Commit si presence dans git
4. Affiche : "Production deployee : https://filmpro-crm.vercel.app (ou domaine custom)"
5. Verifie domaine custom : `vercel domains ls`

#### Fallback CLI (projet non-lie a GitHub ou hotfix)

- Preview : `vercel`
- Prod : `vercel --prod`
- Usage rare, documenter dans le message final pourquoi on a shunte le flow auto

### Phase 5 : Rapport

Affiche un rapport final :
- Tests : X passes / X echoues
- Git : branche, dernier commit SHA
- Deploy : mode (preview/prod), URL, duree build
- Env vars : nouvelles ajoutees cette session / manquantes detectees

## Regles

- JAMAIS deployer si les tests unitaires echouent
- JAMAIS forcer un deploy prod sans etre sur `main` apres validation
- Preferer le flow GitHub auto au CLI direct (source unique : `main` = prod)
- Verifier que `.env*` et `_previews/` sont dans `.gitignore`
- Si des env vars manquent sur Vercel, lister lesquelles + `vercel env add` en pas-a-pas avec Pascal
- Si le CLI Vercel n'est pas installe, proposer `npm i -g vercel@latest` (v52 mini 2026-04)
- Apres ajout d'env vars Vercel : rappeler qu'un redeploy (nouveau push OU `vercel redeploy` OU dashboard `Redeploy` avec cache build) est necessaire pour qu'elles soient prises en compte
