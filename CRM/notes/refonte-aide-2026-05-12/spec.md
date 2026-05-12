# Spec — Refonte page Aide CRM (tâche #4, livraison client)

Date : 2026-05-12 · Effort : xhigh · Session dédiée supervisée
Remplace `src/routes/(app)/aide/+page.svelte` (1443 lignes, hors charte, getElementById, recherche bidon).
Findings délégués résorbés par cette refonte : H-28 (/aide hors charte), M-29 (getElementById /aide).

## Objectif (1 phrase)

`/aide` devient le support d'onboarding de l'outil : riche, pédagogique, visuellement attrayant, conforme GOLDEN_STANDARD v9, sur 3 niveaux (Prise en main / Fonctions détaillées / Doc technique).

## Arbitrages tranchés avec Pascal (2026-05-12)

- Layout : 3 onglets conservés + layout docs (TOC gauche sticky / contenu / « sur cette page » droite, replié en mobile).
- Recherche : full-text client sur contenu structuré.
- Contenu : data-driven (`aide-content.ts`, blocs typés) — pas de HTML monolithe.
- Visuel : diagrammes/illustrations SVG sur-mesure (tokens golden). **PAS de captures d'écran réelles en V1** → mini-mockups SVG si besoin d'illustrer un écran.
- Runbook ops inclus dans le niveau 3.
- HORS SCOPE V1 (tâches suivantes, flaggées) : tour guidé interactif (tooltips séquentiels), bouton « ? » contextuel sur les 9 pages, push première-connexion vers /aide.

## Contenu

### Niveau 1 — Prise en main (cœur onboarding)
- Parcours « 5 minutes » narratif illustré : se connecter → les 6 écrans → 1ʳᵉ action.
- Checklist de démarrage interactive : 6-8 étapes cochables, barre de progression persistée (localStorage), chaque étape = lien profond vers l'écran.
- Carte mentale SVG des écrans.
- Callouts designés (astuce / attention / le saviez-vous).

### Niveau 2 — Fonctions détaillées (9 fiches écran)
Dashboard · Contacts · Entreprises · Pipeline · Prospection · Signaux · Reporting · Coûts API · Aide.
Chaque fiche : à quoi ça sert · actions clés pas-à-pas · pièges · lien profond vers l'écran.
Diagrammes de flux SVG : cycle de vie opportunité (pipeline), déroulé veille hebdo, scoring prospection.

### Niveau 3 — Doc technique + runbook
Archi (SVG) · stack · BDD/RLS · auth OTP · APIs externes (Zefix/search.ch/fal.ai) · crons (5) · déploiement Vercel · sécurité (CSP/headers/rate limit/RLS assumée).
Runbook ops : reset password Supabase · migration prod · regen types · lancer la veille manuellement.

## Architecture technique
- `src/lib/aide/content.ts` : arbre typé `{ level → sections[] → blocks[] }`, blocs : `paragraph | list | steps(checklist) | table | callout | code | diagram | link`.
- `src/lib/aide/search.ts` : index + recherche full-text (pure, testable).
- Composants de rendu : `AideBlock.svelte` (dispatch sur type), `AideDiagram.svelte` (SVG inline), `AideChecklist.svelte` (état localStorage).
- `src/routes/(app)/aide/+page.svelte` : orchestrateur — `Tabs` (primitive a11y existante), TOC sticky, contenu, « sur cette page » via IntersectionObserver. Ancres `id` propres, zéro `getElementById`.
- Deep-link : `?tab=X&section=Y` géré proprement (replaceState, noScroll).

## Critères d'acceptation (binaires)
1. `npm run build` OK ; `svelte-check` : 0 nouvelle erreur (baseline 0 err / 35 warn maintenue).
2. `vitest` : tests verts ; nouveaux tests sur `content.ts` (intégrité de l'arbre : ids uniques, liens internes valides, pas de section orpheline du TOC) + `search.ts` (matching, casse, accents) + `AideChecklist` logique (toggle, persistance).
3. Zéro `getElementById` dans `/aide` (grep). Tablist ARIA correct (primitive `Tabs` : `role=tablist/tab/tabpanel`, clavier ↔, `aria-selected`).
4. Conformité GOLDEN_STANDARD v9 : échelle 8px (pas de spacing/font off-grid), tokens couleur (`text-*`/`bg-*`/`border-*`, pas de hex en dur), pas de bordure pointillée (`noDashedLines`), primitives réutilisées. Auto-revue contre GOLDEN_STANDARD.md.
5. Les 3 niveaux peuplés : niveau 1 (parcours + checklist + carte mentale + ≥3 callouts), niveau 2 (9 fiches + ≥3 diagrammes de flux), niveau 3 (8 sections techniques + runbook 4 procédures).
6. Recherche full-text fonctionnelle (trouve un terme présent dans le corps d'une section, pas seulement le titre).
7. Mobile : pas d'overflow horizontal sur 375px ; TOC/« sur cette page » repliés ; onglets utilisables.
8. Audit Opus `code-review:security-auditor` sur les fichiers touchés : 0 C/H/M (page rend du contenu statique data-driven, pas d'input user persisté ; vérifier qu'aucun bloc `code`/`link` ne fait `{@html}` non échappé).
9. Audit Opus `code-review:test-coverage-reviewer` sur les nouveaux helpers : gaps « Important » comblés in-session.
10. Smoke prod après deploy : `https://filmpro-crm.vercel.app/aide` → 303 → /login (route protégée OK).

## Hors-scope nommé (no-debt rule)
- Tour guidé interactif → tâche suivante.
- Bouton « ? » contextuel sur les 9 pages CRM → tâche suivante.
- Push première-connexion → tâche suivante.
- Captures d'écran réelles → V2 éventuelle (mini-mockups SVG en V1).
- Versions i18n / EN → non (app FR mono-tenant).

## Métrique de succès post-livraison
Durée réelle, score binaire, 1 ligne marche/coince → `entries.jsonl` outcome via `deliver.py`.
