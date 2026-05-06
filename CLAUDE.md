# AppFactory : container méta

**Statut :** Container monorepo qui héberge 4 sous-projets autonomes. Le contenu CRM FilmPro (statut, infra, tâches, watch list, livré) a été déplacé dans `template/CLAUDE.md` lors de la migration restructure du 2026-05-06 (Voie A). Ce fichier est désormais un stub minimal.

**Repo Git :** `pascalmedecin-cmd/appfactory-cli` (=racine actuelle).

---

## SOUS-PROJETS

| Dossier | Rôle | Repo Git | URL prod | CLAUDE.md propre |
|---------|------|----------|----------|------------------|
| `template/` | CRM FilmPro (app principale) | `pascalmedecin-cmd/appfactory-cli` (ce repo) | <https://filmpro-crm.vercel.app> | `template/CLAUDE.md` |
| `Consulting/` | Outil structuration opérationnelle PME (Phase 1 cadrage) | (interne ce repo) | (pas encore) | `Consulting/CLAUDE.md` |
| `Formation/` | Onboarding IA marketing (12 modules prod) | `pascalmedecin-cmd/onboarding-ia` (séparé, ignoré dans `.gitignore`) | <https://onboarding-ia.vercel.app> | `Formation/CLAUDE.md` |
| `Wizard/` | Workflow CLI cadrage/generate/deploy (méta AppFactory) | (interne ce repo) | (n/a, CLI local) | (interne, voir commandes) |

**Pour travailler sur un sous-projet** : taper `cc` au terminal et choisir l'option correspondante (3=CRM FilmPro → `template/`, 4=Consulting, 5=Formation IA). Claude Code atterrit directement dans le sous-dossier, charge le `CLAUDE.md` propre du sous-projet (et ce stub AppFactory en parent).

**Rappel scope cockpit** : slug `appfactory`, subprojects `crm` / `consulting` / `formation` / `appwizard`. Slug historique cockpit `appfactory-formation-ia` conservé pour stabilité storage (pointe vers `Formation/` côté filesystem).

---

## ROLE workflow CLI

Workflow CLI premium AppFactory v2 pour générer des apps métier de qualité production. Pilotage via Claude Code skills depuis le terminal.

---

## STACK (générique sous-projets)

| Couche | Outil | Rôle |
|--------|-------|------|
| Frontend | SvelteKit + Tailwind | Apps web performantes |
| Backend | Supabase (PostgreSQL) | BDD, auth, API, stockage |
| Hébergement | Vercel | Deploy auto, previews, domaines, CDN |
| Tests | Vitest + Playwright | Unit + e2e |
| Pilotage | Claude Code + skills `cadrage` / `generate` / `deploy` | Cycle complet CLI |
| Code | GitHub | 1 repo par app, versionné |

---

## WORKFLOW APPFACTORY CLI

```
/start (terminal) : menu standard + options projet
  ├─ [3] Modifier app existante → travail direct dans le code
  ├─ [4] Nouvelle app (entreprise existante) → /cadrage wizard HTML
  └─ [5] Nouvelle entreprise → wizard entreprise (navigateur) → /cadrage wizard HTML

/cadrage (wizard HTML navigateur, port 3334)
  Pitch → Entites → Pages → Regles → Recap → Valider
  → project.yaml généré + previews dans _previews/cadrage/

/generate → scaffold SvelteKit depuis project.yaml
/deploy preview → URL Vercel preview
/deploy prod → production + suppression _previews/
```

Fichiers clés (workflow méta) :
- `registry.yaml` : registre entreprises/apps (source de vérité)
- `branding/_catalogue.yaml` : 5 thèmes avec tokens complets
- `branding/_default.yaml` : thème par défaut
- `branding/[slug].yaml` : branding par entreprise
- `Wizard/cadrage/` : 5 pages HTML + server.py + shared.css/js + logo
- `Wizard/entreprise/` : wizard pré-cadrage entreprise (option 3), symlinks vers cadrage/shared.*
- `scripts/generate-branding-preview.ts` : génère previews/branding.html

---

## COUTS (ordres de grandeur, opérateur)

- Claude Code Max : 100-200 EUR/mois
- Vercel Pro : 20 EUR/mois
- GitHub : 0 EUR
- Supabase Free (dev/staging) : 0 EUR
- **Total fixe : 120-220 EUR/mois**
- Par app client : 0-26 EUR/mois (Supabase Free→Pro 25 EUR si dépassement, domaine ~1 EUR/mois)

---

## NE PAS FAIRE (workflow méta)

- Générer du code sans specs validées (`project.yaml`)
- Construire de l'outillage sans projet réel pour le valider
- Utiliser l'ancien workflow AppFactory v1 (Apps Script, archivé)
- Déployer sans tests (Vitest + Playwright minimum)
- Hardcoder des valeurs spécifiques client dans le template

## TOUJOURS FAIRE (workflow méta)

- Chaque étape produit un livrable concret et mesurable
- Review humaine visible dans le terminal avant tout deploy
- Tests automatisés avant mise en preview
- `project.yaml` comme source de vérité des specs
- Extraire le générique (template) du spécifique (app client) en continu

---

## DOCUMENTATION (cross-projets)

- `template/docs/SPECS_PROSPECTION.md` : specs complètes module prospection CRM
- `template/docs/SPECS_CRM_MOBILE*.md` : specs CRM mobile V1 + V2
- `template/docs/GOLDEN_STANDARDS*.md` : standards visuels CRM
- `archive/` : journaux décisions historiques cross-sessions

---

**Pour le contexte CRM FilmPro complet** (statut sessions, infra, tâches actives, watch list, livré) : voir `template/CLAUDE.md`.

**Pour les autres sous-projets** : voir leur CLAUDE.md propre (Consulting/, Formation/).

**Pour la méthodo globale Pascal et les règles cross-projets** : voir `~/.claude/CLAUDE.md` (rules/ + commands/).
