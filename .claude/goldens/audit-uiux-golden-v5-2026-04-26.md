# Golden Standard CRM FilmPro — v5 (résolution divergence info ardoise S119)

**Créé** : 2026-04-26
**Source** : v4 (2026-04-26) + livraison S119 alignement `--color-info` ardoise FilmPro
**Supersède** : v4 (résolution divergence connue `info-token-ardoise-vs-sky`)
**Symlink courant** : `.claude/audit-uiux-golden-current.json` → v5
**Changelog v5** : 2 substitutions `template/src/app.css` : `--color-info #2E90FA → #5A7190` + `--color-info-light #EFF8FF → #EDF1F5`. Décision 8 ajoutée. Section `knownDivergences` vidée. Badge variant `info` (S118) rend désormais en ardoise FilmPro.

## Décisions tranchées (8 / 8)

| # | Décision | Choix | Statut |
|---|---|---|---|
| 1 | Hiérarchie couleur | **Primary bleu `#2F5A9E`** (statu quo) — accent ambre réservé aux signaux | Statu quo |
| 2 | Échelle spacing | **Tailwind canonique `4 / 8 / 12 / 16 / 24 / 32 / 48`** (retrait 2/6/10/20) | Statu quo |
| 3 | Hauteur boutons | **40px uniforme** (`h-10` Tailwind, box-sizing border-box) | Statu quo |
| 4 | Sémantique titre | **H1 obligatoire** en haut de chaque page | Statu quo |
| 5 | Bibliothèque icônes | **Migration vers Lucide** | LIVRÉ S115 (commit `f1a54c5`) |
| 6 | Opacités primary custom | **Sweep `bg-primary/X` → `bg-primary-light` + `border-primary/X` → `border-primary`**. Hover/focus/ring transients conservés. | LIVRÉ S118 (commit `e9eaf4d`, 31 substitutions / 10 fichiers) |
| 7 | Variant Badge `accent` legacy | **`'accent'` → `'info'`** pour statuts en cours. Variant `'accent'` retiré du type Badge. | LIVRÉ S118 (commit `5844633`, 5 helpers TS basculés) |
| 8 | Token `--color-info` divergence | **Code aligné sur golden** (option (a)) : `--color-info #2E90FA → #5A7190` ardoise + `--color-info-light #EFF8FF → #EDF1F5` | LIVRÉ S119 (this commit, 2 substitutions app.css) |

## Palette sémantique (16 tokens)

Inchangée vs v4 sauf `info` désormais cohérent ardoise FilmPro. Voir JSON `palette` + `paletteExtras` pour détail. Ajout du champ `infoBg: #EDF1F5` (cohérent avec `paletteExtras.veillePale`).

## Palette éditoriale

Inchangée vs v4. Scope exclusif : Sidebar (fond), page login (fond), hero éditorial /veille.

| Token | Hex | Usage |
|---|---|---|
| `primary-light` | `#F0F4F8` | Background sidebar, hero éditorial /veille, badges/pills brand soft |
| `primary-dark` | `#0A1628` | Background page login (contraste fort, ambiance premium) |

## Typographie éditoriale

Inchangée vs v4. Scope exclusif : module /veille (liste, [id], item/[slug]).

## Composants

Inchangés vs v4 sauf :
- **badge.variants.info** : `bg #EDF1F5` + `color #5A7190` + `border rgba(90, 113, 144, 0.15)` (était sky `#EFF8FF` / `#2E90FA`).

## Règles

Inchangées vs v4.

## Divergences connues

`knownDivergences: []` — résolu en S119 (décision 8).

## Notes méthodologiques

- v5 = résolution divergence v4 (option (a) recommandée par payload `memory/project_info_token_ardoise_vs_sky.md`).
- 2 substitutions `template/src/app.css` (L33-34). Baseline gates verts (svelte-check 109/37, vitest 344/344) confirmée post-modif.
- Vérification visuelle chrome MCP skippée (substitution hexa triviale, dev server non démarré, baseline OK).
- Impact UI : Badge variant `info` (statuts « En analyse » signaux/contacts/pipeline/entreprises/prospection) + alerte signaux dashboard `/` (commit `eddb04b` S117) rendent désormais en ardoise FilmPro.
