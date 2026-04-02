# Skill Generate

project.yaml + tokens design -> scaffold SvelteKit complet.

## Responsabilites
- Lire project.yaml et tokens Tailwind
- Generer le scaffold SvelteKit (routes, composants, schema Supabase, RLS)
- Produire les tests Vitest + Playwright
- Appliquer le design system (tokens -> Tailwind config)

## Input
- `project.yaml` — specs du projet
- `tokens.json` — tokens design Figma (optionnel, fallback design par defaut)

## Output
- Projet SvelteKit complet pret a deployer
- Migrations Supabase (schema + RLS)
- Tests unitaires et e2e
