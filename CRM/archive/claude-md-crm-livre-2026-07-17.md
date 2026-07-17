# Archive « Livré cette session » CRM - archivé le 2026-07-17

Entrées sorties du CLAUDE.md à la clôture du 2026-07-17 (condensation POIDS). Détail intégral dans les mémoires pointées.

## 2026-07-16

- **e2e validation externe (fondateur → public → étiquettes ignore retirer → appliquer) + fix UUID seed RFC-4122** - 2026-07-16 (ultracode). `31ff965` : spec Playwright vert depuis état propre (reset→mint→test). Cause racine fermée = UUID du seed en version 0 rejetés par Zod v4 (404/400 sur routes id-validées) → v4 valides + fixtures `marque-leak` alignées. Vitest 2817 verts, marque-leak intégration 15/15. Ferme la dette `8b90f6d`. → [[feedback_seed_uuid_rfc4122_zod_strict]] + [[project_validation_externe_campagne_2026-07-02]].
- **Retours macro Pascal : robustesse import + logo LED + bouton import + Campagnes pleine largeur (PROD)** - 2026-07-16. 8 retours livrés (`a987f6d` smoke vert) dont 12 bugs robustesse import. Vitest 2817. → [[project_atelier_209_run3_import_liste_2026-07-16]].
- **Run 3 : QA visuelle import + e2e + resize colonnes (PROD)** - 2026-07-16. 7 défauts micro corrigés, `c106a67` smoke vert. → [[project_atelier_209_run3_import_liste_2026-07-16]].

## Chantier Cohérence UI - bandeau de page (détail par increment)

Consolidé en une entrée au CLAUDE.md le 2026-07-17. Détail complet : `docs/COHERENCE-UI-BANDEAU.md`.

- **Increment 1 (Entreprises)** - 2026-07-16 (ultracode). Composant `PageBand.svelte` + source unique `isBandeauActive` (ferme le piège double/zéro-titre, revue bug-hunter) ; OFF = zéro régression prouvée (avant/après vraie vue), Vitest 2824, svelte-check 0/0. Décisions : desc 1 ligne, pastille partout. → [[feedback_gouvernance_benchmark_layout_lisibilite]].
- **Increment 2 (Contacts/Pipeline/Signaux/Campagnes)** - 2026-07-17 (ultracode). 4 pages liste calquées sur Entreprises ; `BANDEAU_ROUTES` étendu → Header gate son titre par la MÊME source unique. OFF = rendu actuel strict (branche `{:else}` identique, FAB préservé). QA : svelte-check 0/0, Vitest 2824, build OK, revue adversariale 5 dims 0 finding, avant/après vraie vue. `5e0eea3` déployé prod.
- **Increment 3 (Reporting/Aide/Dashboard/Prospection)** - 2026-07-17 (ultracode). 4 pages à en-tête bespoke alignées sur le bandeau standard (décision Pascal « uniformité ») : Reporting (hero→PageBand), Aide (`.aide-head` titre-niveau → « Aide » statique, niveau dans les onglets), Prospection (bandeau en tête du `100dvh`, `shrink-0`, layout préservé), Dashboard (bandeau au-dessus du greeting ; hiérarchie OK en vue premium). Revue adversariale 5 dims : 1 low subjectif (stacking Dashboard, non bloquant). `b4fe644` déployé prod.
- **Veille (10e page) + convention kicker 12px** - 2026-07-17 (ultracode). Veille : masthead magazine remplacé par le bandeau standard, peau magazine conservée ; nouveau prop `PageBand flush` (gouttière 0, Veille porte déjà `px-10`) additif, desktop+mobile. `e60f1b6`. Convention kicker/sur-titre de section = 12px (`d51fd31`, live) sur `pband__eyebrow` + `mag-kicker` + label `SourceSelector` (badges exclus). Les 10 pages ont désormais le bandeau (flag OFF).
