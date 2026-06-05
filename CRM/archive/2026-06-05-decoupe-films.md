# Archive - Chantier 2 Découpe Films (livré en prod 2026-06-05)

Détail des jalons intermédiaires du chantier « Découpe Films » (optimiseur de découpes de
film, 2e outil du portail FilmPro). Chantier **livré en production** le 2026-06-05 sur
`filmpro-portail.vercel.app` (route `/decoupe`, flag `ff_decoupe` ON pour les 2 fondateurs).
Détail synthétique conservé dans `CLAUDE.md` (entrée Phase 5) ; ci-dessous le détail complet
des étapes 3bis → Phase 4, archivé pour alléger le CLAUDE.md.

Pointeurs payload : `memory/project_portail_filmpro_multi_outils.md`,
`memory/feedback_decoupe_tolerance_zero_qa.md`, `memory/feedback_decoupe_ui_premium_moderne_riche.md`,
audits `memory/audit_secu_2026-06-05_decoupe_*.md`, pack specs `.product-architect/decoupe/`.

---

## Phase 4 QA 360 résiduel : RLS réelle (Postgres) + perf authentifiée - Livré 2026-06-05 (xhigh)

**RLS** (`scripts/_decoupe_rls_check.mjs`, contre la VRAIE base, pas les mocks Vitest) : RLS activée sur les 3 tables `decoupe_*` ; policies `FOR ALL TO authenticated USING (auth.uid() IS NOT NULL)` (design plat mono-tenant assumé) ; **anon bloqué en lecture ET écriture** (SELECT masqué + INSERT refusé), authentifié autorisé. **Perf** (`scripts/_decoupe_perf_check.mjs`, écran résultat authentifié) : **LCP 932 ms** (cap 2500, en dev → prod plus rapide), **CLS 0**, a11y 100 (axe). Phase 4 QA 360 complète. → `feedback_decoupe_tolerance_zero_qa.md`.

## Étape 4 export PDF : clôture (bouton câblé + 29 tests moteur de flux + donut validé svg2pdf + QA tolérance zéro 9/9) - Livré 2026-06-05 (xhigh, no-debt)

**Bouton** « Exporter en PDF » sur `optimisation/+page.svelte` (dynamic import → code-split prouvé : moteur 19,8 Ko + jspdf/svg2pdf/polices 386 Ko chargés **uniquement au clic**, 0 ajout chemin critique). **Tests moteur de flux** `src/lib/decoupe/pdf-export.test.ts` (29 : garde 0 débordement multi-fixtures, pas de chevauchement, pagination, split film, anti-veuve ≥3 + conservation lignes, section non orpheline, `gauge` donut, `stripLayout` couvre l'étendue réelle des pièces, `tint`/`ellipsize`/`wrapText`, 1 SVG/page + en-tête/pied + troncature titre + échappement anti-XSS). Testabilité : `gauge` exporté + `rows` ajouté à `Placed` (additif, SVG rendu inchangé → audit visuel préservé). **Donut sur vrai PDF** `tests/decoupe-pdf.test.ts` (svg2pdf : `<circle>` puis arc `M…L…` émettent du contenu vectoriel - deltas de taille décisifs ; page réelle convertie en PDF valide avec vraies polices) + **e2e** `tests/decoupe.test.ts` (bouton → téléchargement d'un vrai PDF `%PDF`/>20 Ko, pipeline jsPDF+svg2pdf+polices+donut complet). **QA tolérance zéro 9/9** : 1619 tests, svelte-check 0 erreur (28 warnings pré-existants, aucun Découpe), build vert, e2e 12/12 (serveur préchauffé → déterministe ; flake compile-à-froid `networkidle` corrigé dans `_decoupe_qa.sh`), axe 0/4 écrans, sécu Opus 0 H/C/M (`audit_secu_2026-06-05_decoupe_pdf_export.md`), fidélité golden OK (screenshot écran réel). → `audit_secu_2026-06-05_decoupe_pdf_export.md` + `feedback_decoupe_tolerance_zero_qa.md`.

## Étape 4 : audit visuel approfondi du PDF (backbone déterministe + 7 agents Opus + adversarial) - Livré 2026-06-05 (xhigh)

10 fixtures obligatoires → métriques déterministes (bornes, marges, grille `x`, rythme, **contraste WCAG réel**, troncatures) + PNG ≈240 dpi → panel 7 axes Opus + vérif adversariale (anti-hallucination §8). **11 défauts corrigés in-session** : donut KPI restauré (fidélité maquette), « À découper » espacé, titre long sans chevauchement pastille, section orpheline (keepNext réel), cadratin « — »→« · » + normalisation `esc()`, contraste faint 2,54→4,63:1, labels strip deep + plancher lisibilité, ellipsis sans parenthèse ouverte, anti-veuve split ≥3 lignes, pastille chute source unique, strip `stripLayout` couvre l'étendue réelle des pièces (gate rouleau-long). Vérif : 0 débordement, 0 issue contraste, svelte-check 0, presenter 30/30. Écartés tracés (tag pivotée = faux positif algo, insécables FR non-visuels). Gate Pascal OK. → `.product-architect/decoupe/pdf-audit-report-2026-06-05.md` + `feedback_decoupe_tolerance_zero_qa.md`.

## Étape 3bis-b : portage Svelte du golden v4 (4 écrans) sous QA tolérance zéro 9/9 - Livré 2026-06-05 (xhigh)

4 écrans `/decoupe` au langage premium ; helpers calcul UI en `src/lib/decoupe/presenter.ts` PUR (+29 tests, doctrine `.svelte`=e2e) ; `ChuteGauge`/`PlanDecoupeSvg` retirés. QA tolérance zéro 9/9 (Vitest 1589, svelte-check 0, build, e2e+axe 0 violation, sécu Opus 0 H/C/M 1 Low fixé, LCP 404ms, fidélité golden) ; migration prod appliquée (3 tables `decoupe_*` + RLS + bornes, flag `ffDecoupe` OFF) ; fixes globaux app.html zoom + e2e self-contained. → `memory/audit_secu_2026-06-05_decoupe_films.md` + `feedback_decoupe_ui_premium_moderne_riche.md` (RÉSOLU) + `feedback_decoupe_tolerance_zero_qa.md`.

## Étape 3bis-a : golden UI premium VALIDÉ (benchmark métier, golden v4 4/4) + dispositif QA tolérance zéro - Livré 2026-06-05 (commit `2e6ef68`)

→ `feedback_decoupe_ui_premium_moderne_riche.md`.

## Livré antérieur (Phase 3 étapes 1-3 + amont)

Découpe Phase 3 étapes 1-3 : cœur algo `e15b678` + data layer `bab1c38` + 4 écrans `ac77969`/`142dbb9` ; Cadrage Phase 1 + specs Phase 2 pack `.product-architect/decoupe/` 5 ADR/25 AC ; Pivot « Devis »→« Découpe Films » `6b41f80` ; Dette référentiel Session 1 `e5a6cd4` ; bascule adresse portail `filmpro-portail.vercel.app` 2026-06-04 ; QA 360 portail + shell mobile V3 2026-06-01 ; V3 backend + specs 2026-05-31, S171→S192bis. → `memory/project_portail_filmpro_multi_outils.md` + `archive/2026-06-01-sessions.md` + audits `audit_secu_2026-06-0{1,4,5}_*.md`.
