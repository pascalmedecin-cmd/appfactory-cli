# AppFactory : container méta

**Statut :** Container monorepo qui héberge 2 sous-projets autonomes (CRM FilmPro, Formation IA). Chaque sous-projet a son propre `CLAUDE.md` et sa propre stack. Ce fichier est un stub minimal qui pointe vers les sous-projets. Consulting est sibling autonome (`~/Claude/Projets/Consulting/`, repo Git séparé) depuis 2026-05-07 (S175 Bloc 0 PLAN_ATTAQUE).

**Repo Git :** `pascalmedecin-cmd/appfactory-cli` (=racine actuelle).

---

## SOUS-PROJETS

| Dossier | Rôle | Repo Git | URL prod | CLAUDE.md propre |
|---------|------|----------|----------|------------------|
| `CRM/` | CRM FilmPro (app principale) | `pascalmedecin-cmd/appfactory-cli` (ce repo) | <https://filmpro-crm.vercel.app> | `CRM/CLAUDE.md` |
| `Formation/` | Onboarding IA marketing (12 modules prod) | `pascalmedecin-cmd/onboarding-ia` (séparé, ignoré dans `.gitignore`) | <https://onboarding-ia.vercel.app> | `Formation/CLAUDE.md` |

**Pour travailler sur un sous-projet** : taper `cc` au terminal et choisir l'option correspondante (3=CRM FilmPro → `CRM/`, 5=Formation IA). Claude Code atterrit directement dans le sous-dossier, charge le `CLAUDE.md` propre du sous-projet (et ce stub AppFactory en parent). Pour Consulting (`cc 4`), Claude Code atterrit dans `~/Claude/Projets/Consulting/` (sibling autonome, repo Git propre).

**Rappel scope cockpit** : slug `appfactory`, subprojects `crm` / `consulting` / `formation`. Le subproject `consulting` reste rattaché au slug `appfactory` côté cockpit (entries historiques, slug stable) malgré l'extraction filesystem. Slug historique cockpit `appfactory-formation-ia` conservé pour stabilité storage (pointe vers `Formation/` côté filesystem). Le subproject `appwizard` reste référencé pour les entries cockpit historiques (workflow méta retiré du repo 2026-05-07, voir mémoire `project_appfactory_restructure.md`).

---

## STACK (générique sous-projets)

| Couche | Outil | Rôle |
|--------|-------|------|
| Frontend | SvelteKit + Tailwind | Apps web performantes |
| Backend | Supabase (PostgreSQL) | BDD, auth, API, stockage |
| Hébergement | Vercel | Deploy auto, previews, domaines, CDN |
| Tests | Vitest + Playwright | Unit + e2e |
| Code | GitHub | 1 repo par app, versionné |

---

## COUTS (ordres de grandeur, opérateur)

- Claude Code Max : 100-200 EUR/mois
- Vercel Pro : 20 EUR/mois
- GitHub : 0 EUR
- Supabase Free (dev/staging) : 0 EUR
- **Total fixe : 120-220 EUR/mois**
- Par app client : 0-26 EUR/mois (Supabase Free→Pro 25 EUR si dépassement, domaine ~1 EUR/mois)

---

## NE PAS FAIRE

- Déployer sans tests (Vitest + Playwright minimum)
- Hardcoder des valeurs cross-sous-projets dans un sous-projet (chaque sous-projet doit rester autonome)

## TOUJOURS FAIRE

- Chaque étape produit un livrable concret et mesurable
- Review humaine visible dans le terminal avant tout deploy
- Tests automatisés avant mise en preview

---

## DOCUMENTATION (cross-projets)

- `CRM/docs/SPECS_PROSPECTION.md` : specs complètes module prospection CRM
- `CRM/docs/SPECS_CRM_MOBILE*.md` : specs CRM mobile V1 + V2
- `CRM/docs/GOLDEN_STANDARDS*.md` : standards visuels CRM
- `archive/` : journaux décisions historiques cross-sessions

---

**Pour le contexte CRM FilmPro complet** (statut sessions, infra, tâches actives, watch list, livré) : voir `CRM/CLAUDE.md`.

**Pour les autres sous-projets** : voir leur CLAUDE.md propre (`Formation/`, ou `~/Claude/Projets/Consulting/` sibling autonome).

**Pour la méthodo globale Pascal et les règles cross-projets** : voir `~/.claude/CLAUDE.md` (rules/ + commands/).
