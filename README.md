# AppFactory CLI

Workflow CLI premium pour generer des applications metier de qualite production depuis le terminal.

## Stack

- **Pilotage** : Claude Code + skills specialises (cadrage, generate, deploy)
- **Frontend** : SvelteKit + Tailwind CSS
- **Backend** : Supabase (PostgreSQL, Auth, API, Storage)
- **Hebergement** : Vercel (deploy auto, previews, domaines custom)
- **Design** : Figma Pro + plugin bidirectionnel (tokens exportables)
- **Tests** : Vitest + Playwright

## Structure

```
skills/          Skills Claude Code (cadrage, generate, deploy)
template/        Template SvelteKit reutilisable
previews/        Templates HTML pour previsualisation client
scripts/         Scripts utilitaires (extraction tokens, etc.)
```

## Workflow

1. **Cadrage** — Dialogue naturel, pages HTML de validation
2. **Design Figma** — Maquettes generees, client commente
3. **Extraction tokens** — Figma -> tailwind.config
4. **Generation** — Scaffold SvelteKit depuis specs + tokens
5. **Preview** — URL Vercel, tests automatises, client teste
6. **Production** — Domaine personnalise, base propre

## Liens

- AppFactory v1 (archive) : [appfactory](https://github.com/pascalmedecin-cmd/appfactory)
- Document strategique : `WORKFLOW_CLI_PREMIUM_2026.pdf`
