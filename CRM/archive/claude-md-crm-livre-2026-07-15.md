# CRM FilmPro — Livré archivé (condensé du CLAUDE.md le 2026-07-15)

Items « Livré cette session » sortis du CLAUDE.md courant lors de la condensation du 2026-07-15
(chantier Atelier 209). Détail complet par entry : mémoires pointées + `entries.jsonl` cockpit.

- **Atelier 209 - Run 2 : gate design + fondation cloisonnement** - 2026-07-15 (superseded par le câblage). Migration `marque` 12 tables + FK cohérence + RPC + seed, 9/9 tests. → [[project_atelier_209_run2_fondation_2026-07-15]].
- **Atelier 209 - Run 1 DÉPLOYÉ EN PROD** - 2026-07-15. Identité « Atelier 209 » + **rôles 3 niveaux + RLS** (admin Pascal ×2, superuser Antoine ×2) + connexion 4 adresses nommées. Migration RLS prod via `pg`, code déployé `a564d64`. Anti-verrouillage prouvé. URL `atelier209.vercel.app` différée (SSO Vercel). → [[project_atelier_209_run1_deploiement_2026-07-15]] + [[audit_secu_2026-07-15_atelier209_run1_roles_rls]].
