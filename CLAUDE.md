# FilmPro : container méta (apps métier FilmPro)

**Statut :** Container (porte d'entrée) qui héberge les apps métier de FilmPro. Ce fichier est un stub minimal qui pointe vers les apps. Chaque app a son propre `CLAUDE.md` et sa propre stack. Renommé depuis `AppFactory` lors de la restructuration `~/Claude` du 2026-06-01 (Formation sortie au niveau 1 ; Consulting déplacé sous LED Studio).

**Repo Git :** `pascalmedecin-cmd/appfactory-cli` (=racine actuelle, nom de repo conservé).

---

## APPS

| Dossier | Rôle | Repo Git | URL prod | CLAUDE.md propre |
|---------|------|----------|----------|------------------|
| `CRM/` | CRM FilmPro (app principale) | `pascalmedecin-cmd/appfactory-cli` (ce repo) | <https://filmpro-crm.vercel.app> | `CRM/CLAUDE.md` |

Container prêt à accueillir d'autres apps métier FilmPro (le repo embarque déjà `branding/`, `supabase/`, `scripts/` partagés).

**Pour travailler** : taper `cc` au terminal, option `FilmPro`. Claude Code atterrit dans ce container (`~/Claude/Projets/FilmPro/`), charge ce stub ; descendre dans `CRM/` pour l'app (charge `CRM/CLAUDE.md`).

**Rappel scope cockpit** : slug `filmpro`, subproject `crm`. Depuis la restructuration 2026-06-01 : `formation` est un projet plat séparé (`~/Claude/Projets/Formation`, slug cockpit `formation`), `consulting` est sous LED Studio (slug `ledstudio`). Le slug cockpit `appwizard` a été retiré (workflow méta mort).

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

**Pour les autres projets** (désormais séparés) : `~/Claude/Projets/Formation/` (ex sous-projet, promu top-level), `~/Claude/Projets/LED_Studio/Consulting/` (déplacé sous LED Studio).

**Pour la méthodo globale Pascal et les règles cross-projets** : voir `~/.claude/CLAUDE.md` (rules/ + commands/).
