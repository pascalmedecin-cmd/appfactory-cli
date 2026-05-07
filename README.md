# AppFactory

Container monorepo qui héberge 3 sous-projets autonomes du workflow Pascal.

## Sous-projets

- **CRM/** : CRM FilmPro (production, <https://filmpro-crm.vercel.app>)
- **Consulting/** : outil structuration opérationnelle PME (Phase 1 cadrage)
- **Formation/** : Onboarding IA marketing 12 modules (production, sous-repo `pascalmedecin-cmd/onboarding-ia`, <https://onboarding-ia.vercel.app>)

Chaque sous-projet est autonome (sa stack, son CLAUDE.md, sa doc).

## Stack (générique sous-projets)

- **Frontend** : SvelteKit + Tailwind CSS
- **Backend** : Supabase (PostgreSQL, Auth, API, Storage)
- **Hébergement** : Vercel (deploy auto, previews, domaines)
- **Tests** : Vitest + Playwright

## Pour travailler sur un sous-projet

Taper `cc` au terminal et choisir l'option (CRM FilmPro, Consulting, Formation IA).

## Liens

- Repo Git : `pascalmedecin-cmd/appfactory-cli`
- Méthodo Pascal et règles cross-projets : `~/.claude/CLAUDE.md`
