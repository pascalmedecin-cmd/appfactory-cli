# Idées

<!-- Format : - Sujet — contexte (YYYY-MM-DD) -->
<!-- Jamais de sujet bloquant/critique ici — ceux-ci vont dans CLAUDE.md → Prochaine session -->

- Export SQL périodique — cron pg_dump vers stockage externe (Vercel Blob ou local), filet de sécurité indépendant de Supabase (2026-04-11)
- Soft delete — colonne archived_at au lieu de DELETE sur les tables principales, récupération sans backup (2026-04-11)
- Supabase Pro — à envisager quand volume justifie 25$/mois (PITR + backup 30j) (2026-04-11)
- Incident Sonnet tool use — emit_report wrap instable ({parameter:{...}} ou {edition:{full_report}}), dépassement systématique max strings (filmpro_relevance 600, deep_dive 400), published_at date seule, hallucination enum axis ('reglementation' hors liste). Unwrap défensif et bumps appliqués mais modèle continue à dépasser. À documenter via skill claude-api + doc Anthropic tool use strict mode (2026-04-14)
