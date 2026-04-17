# AppFactory - Décisions sessions 70-75

Archive condensée du CLAUDE.md (sessions 70-75 inclusives). Pour les sessions plus anciennes voir `decisions-sessions-1-8.md` et `decisions-sessions-9-16.md`. Pour les sessions plus récentes voir directement le CLAUDE.md à la racine.

---

## Session 75 - Hygiène avant S4 (formation-ia, 2026-04-17)

Scope formation-ia uniquement, docs-only côté CRM.

1. **Fix markdown brut dans `exercices.consigne`** : commit formation-ia `8790751` + deploy auto Ready. Option C retenue (mini-parser maison) — helper `src/lib/formatting/consigne.ts` + 7 tests Vitest + câblage `{@html consigne_html}` + styles scoped p/ul/li/strong. Audit local + prod : 4 `<li>`, 2 `<strong>`, zéro astérisque brut.
2. **Rotation `SUPABASE_SERVICE_ROLE_KEY`** : nouvelle clé format `sb_secret_*`, MAJ `.env` local via `open -e` TextEdit + MAJ Vercel prod via `vercel env rm/add` (valeur piped depuis `.env`, jamais affichée en clair), redeploy `af05658` Ready 14s. Ancienne clé supprimée. Zéro impact CRM FilmPro (projet Supabase séparé).

Leçon : Pascal préfère GUI simple (TextEdit) aux éditeurs terminal/scripts pour actions manuelles → `memory/feedback_prefer_gui_over_scripts.md`.

---

## Session 74 - S3 ingestion fondations (formation-ia, 2026-04-17)

Scope formation-ia uniquement, session autonome `/effort xhigh`. Commit formation-ia `b85010c`, push + deploy auto Vercel Ready (4 files +245/-9).

- 3 modules famille `fondations` seedés en prod Supabase (J1 `comment-ca-marche`, J2 `assistants-panorama`, J3 `prompt-5-blocs`) : 9 exercices + 12 questions quiz + 21 liens outils, 4 outils (Claude, ChatGPT, Gemini, Mistral Le Chat) avec plan_gratuit_note.
- Câblage `ressources` + `check_questions` dans page exercice (dette S1 résorbée) + fix SSR `MiniCheck.svelte` (init directe vs `$effect`).
- Script `scripts/seed-parcours.mjs` idempotent ESM pur.
- Pivot transparent zéro vidéo embed : gate YouTube géo CH bloque WebFetch, ressources = 100% liens documentaires officiels (7 URLs VÉRIFIÉES : Anthropic platform docs, Google AI prompting, Anthropic news, Mistral news, BDM, CNIL, HubSpot 2026).

Gates : check 0/0, Vitest 46/46, build OK, audit Chrome MCP local + prod, console clean. 2 dettes flaggées AVANT S4 (résolues session 75) : markdown brut dans consignes + rotation `SUPABASE_SERVICE_ROLE_KEY`.

---

## Session 73 - S2 matière pédago (formation-ia, 2026-04-17)

Scope formation-ia uniquement, docs-only côté CRM, autonome `/effort high`. Commit formation-ia `b7aa108`, push OK, deploy auto Vercel Ready. Temps 1h20.

1. **`docs/SOURCES_MARKETING.md`** (207 lignes, committé) : 111 entrées consolidées (12 VÉRIFIÉ + 71 TOLÉRÉ AVEC DISCLAIMER + 28 CHAÎNES CANDIDATES). 6 sources VÉRIFIÉ via WebFetch direct : AI Act Art. 50 (2 août 2026), CNIL + PANAME (26 fév 2026), Anthropic news (Opus 4.7 + Sonnet 4.6 + Skills), Mistral news (Voxtral TTS 23 mars 2026), HubSpot State of Marketing 2026, BDM comparatif IA (20 nov 2025).
2. **`content/research-synthesis-marketing.md`** (476 lignes, gitignoré) : 12 fiches modules exhaustives (cas ≥ 2, stats ≥ 1, vidéos candidates, angles pédago 2-3/module).

Pivot méthodologique : vérification HEAD 200 des vidéos spécifiques reportée à S3-S7 au moment de l'embed.

---

## Session 72 - S1 infra technique (formation-ia, 2026-04-17)

Scope formation-ia uniquement, docs-only côté CRM, autonome `/effort xhigh`. Commit formation-ia `9966112`, 11 fichiers, +874 / -68.

1. Migration SQL additive `20260417000001_catalog_refactor.sql` appliquée en prod Supabase : 4 colonnes NULLables (`jours.duree_estimee`, `jours.famille`, `exercices.ressources` jsonb, `exercices.check_questions` jsonb) + contraintes CHECK + index `jours_famille_idx`.
2. Helpers purs `src/lib/catalog.ts` + tests.
3. Schémas Zod `src/lib/schemas/content.ts`.
4. Composants `RessourceVideo.svelte` et `MiniCheck.svelte`.
5. Refonte UI `/parcours/[slug]` : grille catalogue groupée par famille.

Gates : 46/46 Vitest, check 0/0, build OK. Deploy auto Ready.

---

## Session 71 - Cadrage parcours marketing (formation-ia, 2026-04-17)

Scope formation-ia uniquement, docs-only côté CRM. Pivot paradigme acté : le parcours marketing devient une **bibliothèque de 12 modules indépendants** (pas un parcours linéaire 5 jours).

Livrables (commit formation-ia `65c40d5` docs-only) : `docs/PEDAGOGIE.md` mis à jour + `docs/PLAN_PARCOURS_MARKETING.md` créé (payload exhaustif 7 sessions autonomes S1-S7) + `docs/SOURCES_MARKETING.md` créé (squelette) + `formation-ia/CLAUDE.md` réécrit. Garde-fous actés : zéro régression + zéro hallucination nuancée. Payload : `memory/project_formation_ia_plan_parcours_marketing.md`.

---

## Session 70 - Batch CRM autonome (CRM FilmPro + méta, 2026-04-17)

Scope CRM FilmPro + méta, batch autonome validé par Pascal en Opus 4.7 xhigh + `--dangerously-skip-permissions`. 4 commits CRM pushés (`1c15e4a..12d8bc5`), 411/411 tests verts (77 nouveaux), zéro régression typecheck.

1. **Fix latent cron veille post-migration Opus 4.7** - commit `e1353ba` : retire `temperature: TEMP_PHASE{1,2}` rejeté 400 sur 4.7 + bump `effort: 'high'` → `'xhigh'`.
2. **Email récap veille post-cron** - commit `e0f0b32` : modules `cost-tracker.ts` + `email-recap.ts` + hook `run-generation.ts`.
3. **Export CSV + Import CLI + Reporting** - commit `12d8bc5` : 3 endpoints GET `/api/export/[entity]` + script `scripts/import-csv.ts` CLI + page `/reporting`.
4. **Audit 1j (rapport seul, pas de commit)** : `.claude/commands/cadrage.md` + `deploy.md` à actualiser - tracé en tâche `[EXÉCUTABLE - ~30 min]`.
