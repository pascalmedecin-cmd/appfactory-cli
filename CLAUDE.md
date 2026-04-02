# AppFactory - CLI — CLAUDE.md

**Statut :** Phase A — Jour 1 termine, Jour 2 a venir
**Derniere mise a jour :** 2026-04-02
**Prochain bug :** #001
**Session precedente :** G34 — Phase A Jour 1 complete (SvelteKit + Tailwind + Supabase Auth + Vercel deploy)

---

## QUICK START

```bash
# Ce repo contient le workflow CLI premium AppFactory v2
# Stack : SvelteKit + Supabase + Vercel + Figma + Claude Code skills

# Structure
# skills/          — Skills Claude Code (cadrage, generate, deploy)
# template/        — Template SvelteKit reutilisable (scaffold pour chaque app)
# previews/        — Templates HTML Tailwind pour previsualisation client
# scripts/         — Scripts utilitaires (extraction tokens Figma, etc.)
```

---

## ROLE

Product Engineer. Workflow CLI premium pour generer des apps metier de qualite production.
Pilotage depuis le terminal via Claude Code skills.

---

## STACK

| Couche | Outil | Role |
|--------|-------|------|
| Design | Figma Pro + Plugin custom | Maquettes uniques par client, tokens exportables |
| Tokens | Tokens Studio + script | Design Figma -> config Tailwind auto |
| Pilotage | Claude Code + 3 skills | Cadrage, generation, deploiement |
| Frontend | SvelteKit + Tailwind | Apps web performantes, composants testables |
| Backend | Supabase (PostgreSQL) | BDD, auth, API, stockage |
| Hebergement | Vercel | Deploy auto, previews, domaines custom, CDN |
| Tests | Vitest + Playwright | Tests unitaires + navigation complete |
| Cadrage visuel | Templates HTML Tailwind | Pages de presentation pour validation client |
| Code | GitHub | 1 repo par app, versionne |

---

## WORKFLOW 6 ETAPES

1. **Cadrage** — Dialogue naturel terminal, pages HTML de validation client
2. **Design Figma** — Maquettes generees depuis specs, client commente
3. **Extraction tokens** — Figma -> tailwind.config automatique
4. **Generation** — Scaffold SvelteKit complet depuis specs + tokens
5. **Preview et tests** — URL Vercel preview, tests automatises, client teste
6. **Mise en production** — Domaine personnalise, base propre, acces client

---

## COUTS

### Fixes mensuels (operateur)
- Claude Code Max : 100-200 EUR/mois (deja en place)
- Vercel Pro : 20 EUR/mois
- Figma Pro : 15 EUR/mois
- GitHub : 0 EUR
- Supabase Free : 0 EUR (dev/staging)
- **Total : 135-235 EUR/mois**

### Par app client
- Supabase Free : 0 EUR (jusqu'a 500 Mo)
- Supabase Pro : 25 EUR/mois (si depassement)
- Vercel : inclus dans Pro
- Domaine : ~1 EUR/mois (~12 EUR/an)
- **Total : 0-26 EUR/app/mois**

---

## PLANNING INITIAL

### Phase A — Migration CRM FilmPro (jours 1-7)
- Jour 1 : Init SvelteKit + Supabase + Tailwind + Auth Google OAuth + deploy Vercel
- Jour 2 : Schema BDD — migration tables Sheets -> PostgreSQL + RLS
- Jour 3-4 : Pages CRUD — composants liste, detail, formulaire, sidebar, navigation
- Jour 5 : Dashboard + logique metier — stats, graphiques, relances, regles
- Jour 6 : Design system Figma + responsive + tests Playwright
- Jour 7 : Extraction template reutilisable vs code specifique CRM

### Phase B — Plugin Figma + Outillage (jours 1-5, parallele)
- Jour 1-2 : Design system Figma (composants de base, tokens)
- Jour 3-4 : Plugin Figma bidirectionnel (specs -> frames, export tokens)
- Jour 5 : Script extraction tokens (JSON -> tailwind.config.js)

### Phase C — Skills et templates HTML (jours 8-12)
- Jour 8-9 : Skill cadrage (dialogue -> project.yaml -> 4 pages HTML)
- Jour 10-11 : Skill generate (project.yaml + tokens -> SvelteKit scaffold)
- Jour 12 : Skill deploy (push -> Vercel preview/prod, test end-to-end)

---

## DECISIONS STRUCTURELLES

- Repo separe `appfactory-cli` (ancien `appfactory` reste consultable)
- Workflow prioritaire : construire le cycle core avant d'attaquer FilmPro
- FilmPro = premier projet reel du nouveau workflow (dogfooding)
- Figma = moyen/long terme, plugin custom 3-5 jours dev
- Commencer sans plugin Figma (tokens manuels), le plugin est un accelerateur
- HTML temporaires pour previsualisations client a chaque etape cle
- Ancien projet AppFactory v1 (Apps Script) = archive consultable, pas de migration

---

## INFRA EN PLACE

- **Vercel** : https://template-rho-three.vercel.app (prod)
- **Supabase** : projet `appfactory` (fmflvjubjtpidvxwhqab), region EU
- **Google OAuth** : projet `appfactory-492107`, client ID `705315536802-...`
- **Auth** : Google OAuth via Supabase, redirect callback configure
- **Runtime** : Node.js 22.x sur Vercel

## OBJECTIF PROCHAINE SESSION

Phase A Jour 2 : Schema BDD — migration tables Sheets -> PostgreSQL + RLS.
- Definir le schema FilmPro (tables, relations, types)
- Creer les tables dans Supabase (migrations SQL)
- Configurer RLS (Row Level Security) pour chaque table
- Objectif mesurable : tables creees avec RLS, accessibles via l'API Supabase

---

## NE PAS FAIRE

- Generer du code sans specs validees (project.yaml)
- Construire de l'outillage sans projet reel pour le valider
- Utiliser l'ancien workflow AppFactory v1 pour generer du code
- Deployer sans tests (Vitest + Playwright minimum)
- Hardcoder des valeurs specifiques client dans le template

## TOUJOURS FAIRE

- Chaque etape produit un livrable concret et mesurable
- Review humaine visible dans le terminal avant tout deploy
- Tests automatises avant mise en preview
- project.yaml comme source de verite des specs
- Extraire le generique (template) du specifique (app client) en continu
