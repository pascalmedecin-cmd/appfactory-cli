# Handoff — Reconstruction AppFactory

## Objectif

Démarrer la reconstruction AppFactory : structure projet + git init + .gitignore + documenter blocages connus (Vercel service_role, Figma token).

## Phase

Phase A — initialisation du repo. Pré-setup environnement (venv + Next.js + Supabase CLI prévu en session 1b dédiée).

## Réalisé

- Tâche 1a : `git init -b main`, `.gitignore` strict créé (secrets, Python, Node/Next.js, Supabase, Vercel, logs, OS, IDE, Claude local), commit baseline `31bf342` (4 fichiers : CLAUDE.md, .claude/start-menu.md, notes/handoff.md, .gitignore).
- Tâche 1d : `docs/blockers.md` créé documentant les 2 blocages connus (Vercel `SUPABASE_SERVICE_ROLE_KEY` via CLI avec `printf '%s'`, Figma PAT personnel scope lecture). Commit `4e4837a`.

## Décisions

- `.gitignore` type fullstack couvrant Python + Node + Next.js + Supabase + Vercel + secrets en un seul fichier racine (pas de .gitignore par sous-dossier pour l'instant).
- `docs/blockers.md` comme point unique de référence pour les blocages actifs (plutôt que section dans CLAUDE.md) : laisse CLAUDE.md court, permet d'enrichir chaque blocage avec procédure détaillée.

## Blocages actifs

- Tâche 1c (scan sécurité security-auditor) : bloquée tant que code pépites pre-crash non rapatrié.
- Tâche 1b (setup env) : non bloquée mais reportée en session dédiée (meilleur découpage).

## Credentials

- Aucun credential touché cette session. `SUPABASE_SERVICE_ROLE_KEY` et `FIGMA_API_TOKEN` mentionnés dans `docs/blockers.md` uniquement comme procédure, aucune valeur réelle.

## Subagents

- Aucune invocation subagent cette session (opérations structurelles pures, pas de code applicatif à auditer).

## Garde-fous

- `.gitignore` écrit AVANT le premier `git add` (garde-fou anti-fuite secrets).
- `git status --short` vérifié avant chaque commit.
- `printf '%s'` documenté dans blockers.md (conforme memory `feedback_vercel_env_whitespace`).

## Prochaine action

Session 1b : setup environnement (venv Python + npm/Next.js scaffold + Supabase CLI v2.84.2 link). Session dédiée recommandée, fresh context.

## Contexte à garder

- Repo git initialisé avec 2 commits (`31bf342` baseline, `4e4837a` blockers). Branche `main`. Pas encore de remote configuré.
- `docs/blockers.md` est le point de référence pour tous les blocages opérationnels. À consulter avant chaque première action Vercel ou Figma.
- Tâche 1c (scan sécurité) attend rapatriement pépites pre-crash — dépendance externe, pas planifiable aujourd'hui.
