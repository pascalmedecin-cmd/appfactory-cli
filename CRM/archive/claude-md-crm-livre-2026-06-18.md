# Archive « Livré » CRM/CLAUDE.md - condensé le 2026-06-18

Items « Livré cette session » au-delà des 5 derniers, retirés du CLAUDE.md pour rester sous le seuil de poids. Détail technique de chacun déjà persisté dans les pointeurs cités (QA_FINDINGS, mémoires, commits git).

- **Bloc 1 - Re-audit live seedé + bug prod HIGH pipeline** - Livré 2026-06-07 (xhigh, `8c74885`, DÉPLOYÉ PROD `fb84ecd`). Bug prod HIGH (invisible car pipeline prod vide) : 2 FK `opportunites↔signaux_affaires` → embed nu PGRST201 → Pipeline vide. Fix embed FK nommée + remontée d'erreur + test régression. → `scripts/_audit_seed.mjs` + [[feedback_postgrest_embed_ambigu_2fk]].
- **Vague 4d (mojibake) - cause racine encodage Zefix** - Livré 2026-06-07 (xhigh, EN PROD `fb84ecd`). mojibake = ingestion Zefix (UTF-8 forcé sur SOGC Latin-1, lossy irréversible, 1227 archivées). Fix cause racine `lib/server/decode-response.ts` (fallback Windows-1252) + test. → `docs/QA_FINDINGS_CRM_2026-06-07.md` §E.
- **Vague 4c - a11y structurels** - Livré 2026-06-07 (xhigh, EN PROD `fb84ecd`). 6 findings a11y (th logo, Log h1+tr focusable, Veille article/time, combobox Contacts, empty Entreprises, Kanban role=list conditionnel). → `docs/QA_FINDINGS_CRM_2026-06-07.md` §E/E.2.
