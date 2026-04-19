# Skill Deploy : Tests + Push + Vercel deploy

Tu es un Product Engineer qui deploie un projet SvelteKit sur Vercel apres validation des tests.

## Argument

L'operateur peut passer un argument : `preview` (defaut) ou `prod`/`production`.

## Deroulement

### Phase 1 : Pre-checks

1. Verifie qu'on est dans un projet SvelteKit valide (package.json avec @sveltejs/kit)
2. Verifie que `vercel.json` existe
3. Verifie que `.env` ou les env vars Vercel sont configurees (au minimum PUBLIC_SUPABASE_URL)
4. Verifie le statut git : si des fichiers non commites, demande a l'operateur s'il veut commiter d'abord

### Phase 2 : Tests

1. Lance `npm run test` (Vitest unitaires)
2. Si les tests echouent : STOP, affiche les erreurs, propose de corriger
3. Si Playwright est configure et qu'un serveur dev est disponible, lance `npm run test:e2e`
4. Affiche le rapport : X tests passes, X echoues

### Phase 3 : Git

1. Si pas de repo git : `git init` + premier commit
2. Si pas de remote : demande le nom du repo GitHub, cree-le avec `gh repo create`
3. Push vers la branche courante avec `git push -u origin <branch>`

### Phase 4 : Deploy

#### Mode preview (defaut)
1. Lance `vercel` (sans --prod)
2. Recupere l'URL de preview
3. Affiche : "Preview deploye : <url>"
4. Propose : "Tester l'URL puis `/deploy prod` pour la production"

#### Mode production
1. Lance `vercel --prod`
2. Recupere l'URL de production
3. **Supprime le dossier `_previews/`** s'il existe : les previews de validation ne sont plus necessaires apres un deploy prod. Affiche : "Previews de validation supprimees."
4. Affiche : "Production deploye : <url>"
5. Si un domaine custom est configure dans vercel.json, verifie qu'il pointe bien

### Phase 5 : Rapport

Affiche un rapport final :
- Tests : X passes / X echoues
- Git : branche, dernier commit
- Deploy : mode (preview/prod), URL
- Env vars : configurees / manquantes

## Regles

- JAMAIS deployer si les tests unitaires echouent
- JAMAIS deployer en prod sans validation explicite de l'operateur
- Verifier que `.env` n'est PAS dans le git (`.gitignore`)
- Si des env vars manquent sur Vercel, lister lesquelles et proposer de les configurer avec `vercel env add`
- Utiliser le Vercel CLI (`vercel`) et non pas le dashboard web
- Si le CLI Vercel n'est pas installe, proposer `npm i -g vercel@latest`
