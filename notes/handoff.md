# Handoff — Reconnexion cloud AppFactory

## Objectif

Aligner le local sur les sources de vérité cloud (GitHub, Vercel, Supabase) après le crash du 2026-04-12, pour que toute session future parte de la réalité cloud et pas d'une reconstitution locale à l'aveugle.

## Phase

Post-crash — reconnexion (pas reconstruction applicative). Préalable à toute reprise des 5 tâches pré-crash session 47 (scoring leads, golden standards UX, verif responsive prod, CSV import/export, dashboard/reporting).

## Réalisé

- Forensic sur JSONL pré-crash : stack confirmée SvelteKit v2 (pas Next.js), scaffold unique `template/` (pas 1 par app), dernier push GitHub `appfactory-cli` 2026-04-12T11:09Z intact.
- Backup défensif : `~/Desktop/Claude_Archive/AppFactory_pre_reconnect_20260413_2130` + `~/Claude/Projets/AppFactory.OLD` (à purger après validation définitive).
- Clone repo `pascalmedecin-cmd/appfactory-cli` vers `~/Claude/Projets/AppFactory/` (remplace le local orphelin).
- Réinjection post-crash : `requirements.txt`, `venv/`, `notes/`, `docs/blockers.md`, `.claude/settings.local.json`.
- Merge `.gitignore` : repo (SvelteKit + Supabase) ∪ local (secrets + Python + IDE).
- `supabase link --project-ref fmflvjubjtpidvxwhqab` OK.
- `vercel link --project=filmpro-crm` + `vercel env pull .env.local --environment=production` → 9 secrets prod (ALLOWED_DOMAINS, ALLOWED_EMAILS, CRON_SECRET, PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SEARCH_CH_API_KEY, ZEFIX_USERNAME, ZEFIX_PASSWORD).
- `npm install && npm run build` dans `template/` : `✓ built in 2.91s` (@sveltejs/adapter-vercel).
- Commit `92b652a` (reconnexion) + `57ecc2d` (clôture session), push origin main, auto-deploy Vercel déclenché.
- Mémoire créée : `project_cloud_sources_of_truth.md` (coordonnées exactes + procédure de re-reconnexion si re-crash).
- MEMORY.md + reference_supabase_cli.md : bump version CLI 2.84.2 → 2.90.0.

## Décisions

- **Option A retenue** (clone frais + réinjection) vs option B (merge `--allow-unrelated-histories`) vs option C (rebase des 5 commits locaux). Arbitrage sourcé (`/dig`) : git-scm doc officielle, Atlassian, trunkbaseddevelopment. Justification : les 5 commits locaux orphelins (baseline + setup venv + blockers + clôture + session 2026-04-13 soir) n'avaient pas de valeur narrative git, leur contenu se réduit bien en 1 commit atomique. Simplicité > préservation historique.
- 5 commits locaux orphelins abandonnés comme commits, contenu refondu dans `92b652a`. Backup physique + `.OLD` couvrent la réversibilité.
- Décision pré-crash Vercel Hobby → Pro (pour timeouts cron Claude) non réactivée : non bloquante pour les 5 tâches pré-crash reprises.

## Blocages actifs

- Aucun blocage technique résiduel. Les 5 tâches pré-crash session 47 listées dans `CLAUDE.md ## Prochaine session` sont prêtes à être reprises.
- Tâches globales (CLAUDE.md `~/.claude/`) restent BLOQUÉES sur « 3 projets reconstruits » : AppFactory reconnecté (1/3), Marketing et Enseignement à traiter.

## Credentials

- 9 secrets prod pullés dans `.env.local` (gitignored, vérifié). Aucun secret commité.
- `SUPABASE_SERVICE_ROLE_KEY` présent dans `.env.local` — à ne jamais commiter. Rotation immédiate si leak.

## Subagents

- `Explore` ×2 (forensic sessions pré-crash) — modèle sonnet, trouvés : repo GitHub + stack SvelteKit + scaffold unique.
- `session-auditor` — 1 verdict FIX_REQUIRED (MEMORY.md déjà à jour après re-vérif = faux positif de timing ; handoff.md obsolète = corrigé par ce fichier).

## Garde-fous appliqués

- Backup défensif AVANT move du local (double filet avec `.OLD`).
- `.gitignore` fusionné vérifié AVANT `vercel env pull` (couvre `.env*.local`).
- `git diff --cached | grep -iE "(password|secret|token|key)"` exécuté avant commit → 0 match.
- Build template exécuté avant push pour valider la reconnexion fonctionnelle.

## Prochaine action

Reprendre les 5 tâches pré-crash session 47 listées dans `CLAUDE.md ## Prochaine session` (scoring leads, golden standards UX, verif responsive prod, CSV import/export, dashboard/reporting, Figma API). Priorité à trancher par Pascal en début de prochaine session via `/start`.

## Contexte à garder

- **Sources de vérité cloud documentées** : `project_cloud_sources_of_truth.md` (coordonnées GitHub/Vercel/Supabase + procédure reconnexion).
- **Backup local** à purger après 1-2 sessions si tout va bien : `~/Desktop/Claude_Archive/AppFactory_pre_reconnect_20260413_2130` et `~/Claude/Projets/AppFactory.OLD`.
- **Auto-deploy Vercel actif** : tout push sur `main` déploie en prod (filmpro-crm.vercel.app). Pas de PR flow pour l'instant.
- **Stack confirmée** : SvelteKit v2 + Tailwind v4 + Supabase + Vercel Node 24.x. Toute mention de Next.js dans d'anciennes discussions = obsolète.
