# Cadrage Phase 1 — Questions structurantes + réponses Pascal

**Date** : 2026-05-31. Livrable : CRM FilmPro mobile V3 « outil terrain ».

Les 8 questions structurantes product-architect, répondues avec Pascal en session (réponses verrouillées, pas d'ambiguïté résiduelle).

| # | Question | Réponse Pascal |
|---|---|---|
| 1 | **Qui est l'utilisateur cible ?** | Le commercial FilmPro (fondateur) en situation terrain : visite client, chantier, déplacement entre 2 RDV. Niveau technique : non-ingénieur, usage debout/en mouvement, iPhone. |
| 2 | **Quel problème résout ce livrable ?** | Avoir sur l'iPhone une synthèse actionnable du CRM pour le terrain, sans la complexité du desktop. Le mobile n'est PAS un outil de prospection/découverte/recherche. |
| 3 | **Critère de succès observable ?** | Smoke iPhone réel : la boucle (fiche → action native → compte-rendu + photo → relecture desktop) tient en ≤ 5 taps et est jugée « lisible du premier coup d'œil » (le test qui a recalé la V2). |
| 4 | **2-3 user flows critiques ?** | (a) Consulter une fiche avant/pendant une visite + actions natives ; (b) logger un compte-rendu (résultat + note + photo) ; (c) capturer un contact croisé en brouillon. Voir `user-flows.md`. |
| 5 | **Contraintes non négociables ?** | Extrême lisibilité, navigation très simple (2 onglets, pas de menu complexe), strict minimum. Frontière dure : mobile lit le référentiel, écrit seulement la trace terrain. Pas de prospection/scoring/veille/reporting mobile. |
| 6 | **Stack confirmée ou à arbitrer ?** | Stack réelle projet : **SvelteKit + Supabase + Tailwind v4 + Lucide + Vercel** (PAS le template Next.js par défaut). Livraison PWA, pas d'app native (ADR-0001). |
| 7 | **Périmètre exclu (hors-scope) ?** | Prospection, signaux, scoring, veille, reporting, dashboard coûts, log, kanban, édition de champs structurants, création directe entreprises/contacts, offline, push, agenda calendaire. Voir PRD § 9. |
| 8 | **Date cible livraison ?** | Pas de date fixée cette session (cadrage + specs seulement, pas de code). À fixer au lancement de la Phase 3. Estimation : 2-3 sessions de build supervisées. |

## Réponses cadrage spécifiques (3 décisions terrain, AskUserQuestion 2026-05-31)

| Décision | Réponse | Trace |
|---|---|---|
| Usage terrain réel | Consulter + capture brute (1 photo + note sur place, détail au bureau) | PRD § 1 |
| Visites planifiées dans le CRM ? | Parfois → accueil « À faire » (relances) + recherche par nom | ADR-0005 |
| Contact croisé sur place | Oui, en mode brouillon (suggestion à valider au desktop) | ADR-0003 |
| Écran d'accueil (mockup A vs B) | Option A : relances dues (pas d'agenda calendaire) | ADR-0005 |

## Spécificités webapp Pascal vérifiées (Phase 1)

- **Touche auth/RLS** : oui (nouveaux endpoints d'écriture + table). Scope users autorisés = ≤ 10 admins @filmpro.ch, mono-tenant plat conservé (ADR-0007).
- **Touche FilmPro** : oui. Métier vérifié dans `memory/project_filmpro_metier.md` (traitements vitrage, pas vidéo). Le wording terrain reste neutre, posture conseil.
- **Volet pédagogique** : non applicable (CRM, pas Formation/Enseignement).
