# Golden Standard CRM FilmPro — v4 (régularisation post-cascade S116-S118)

**Créé** : 2026-04-26
**Source** : v3 (2026-04-26) + livraisons S116-S117 cascade Bloc 1a + sweep S118 Blocs 1a + 1e
**Supersède** : v3 (régularisation tokens éditoriaux + sweep palette + documentation divergences connues)
**Symlink courant** : `.claude/audit-uiux-golden-current.json` → v4
**Changelog v4** : doc-only (pas de modif CSS). Ajout sections `typographyEditorial`, `paletteEditorial`, `knownDivergences`. Décisions 6 + 7 ajoutées (sweep S118).

## Décisions tranchées (7 / 7)

| # | Décision | Choix | Statut |
|---|---|---|---|
| 1 | Hiérarchie couleur | **Primary bleu `#2F5A9E`** (statu quo) — accent ambre réservé aux signaux | Statu quo |
| 2 | Échelle spacing | **Tailwind canonique `4 / 8 / 12 / 16 / 24 / 32 / 48`** (retrait 2/6/10/20) | Statu quo |
| 3 | Hauteur boutons | **40px uniforme** (`h-10` Tailwind, box-sizing border-box) | Statu quo |
| 4 | Sémantique titre | **H1 obligatoire** en haut de chaque page | Statu quo |
| 5 | Bibliothèque icônes | **Migration vers Lucide** | LIVRÉ S115 (commit `f1a54c5`) |
| 6 | Opacités primary custom | **Sweep `bg-primary/X` → `bg-primary-light` + `border-primary/X` → `border-primary`** (option (b) bascule sémantique). Hover/focus/ring transients conservés. | LIVRÉ S118 (commit `e9eaf4d`, 31 substitutions / 10 fichiers) |
| 7 | Variant Badge `accent` legacy | **`'accent'` → `'info'`** pour statuts en cours. Variant `'accent'` retiré du type Badge. | LIVRÉ S118 (commit `5844633`, 5 helpers TS basculés) |

## Palette sémantique (15 tokens)

Inchangée vs v3. Voir JSON `palette` + `paletteExtras` pour détail.

## Palette éditoriale (NOUVEAU v4)

Scope exclusif : Sidebar (fond), page login (fond), hero éditorial /veille. Régularisation S116-S117 — coexistent avec palette CRM standard sans conflit.

| Token | Hex | Usage |
|---|---|---|
| `primary-light` | `#F0F4F8` | Background sidebar, hero éditorial /veille, badges/pills brand soft (post-sweep S118) |
| `primary-dark` | `#0A1628` | Background page login (contraste fort, ambiance premium) |

`--color-primary-hover` (`#264C85`) reste réservé aux interactions hover (pas un token éditorial).

## Typographie éditoriale (NOUVEAU v4)

Scope exclusif : module /veille (liste, [id], item/[slug]). Design éditorial magazine intentionnel — ne pas substituer par typo CRM standard.

| Classe | Propriétés | Usage |
|---|---|---|
| `mag-kicker` | `letter-spacing: 0.14em`, `uppercase`, `11px / 700` | Kicker éditorial (catégorie, segment) |
| `mag-display` | `800` weight, `letter-spacing: -0.03em`, `line-height: 1.02` | Display principal (hero veille) |
| `mag-display-2` | `800` weight, `-0.025em`, `1.05` | Display secondaire |
| `mag-display-3` | `700` weight, `-0.02em`, `1.1` | Display tertiaire (titres articles) |
| `mag-body` | `17px / 400 / 1.7` | Corps éditorial enrichi (pertinence, deep-dive) |
| `mag-archive-card` | hover → `color: var(--color-primary)` | Cards archive éditoriale |

## Composants

Inchangés vs v3 sauf :
- **modal.headerVariants** : documenté `default` (neutre) vs `accent` (bg-primary text-white) — pattern indépendant du Badge variant `accent` retiré S118.
- **badge.variants** : `default` mis à jour (sweep S118 : `bg-primary-light` + `border-primary`), `info` ajouté (statut en cours), `accent` retiré.
- **navigation.header.height** : 48px (golden v3 S117 commit `3b8a735`).
- **navigation.sidebar.background** : `#F0F4F8` (palette.editorial).

## Règles (NOUVEAU v4)

| Règle | Détail |
|---|---|
| `primaryOpacities` | Opacités custom statiques (bg-primary/X, border-primary/X) interdites. Utiliser tokens sémantiques. Hover/focus/ring transients tolérés (UA standard). Décision S118. |
| `editorialScope` | Classes `mag-*` et `palette.editorial` réservés à /veille + Sidebar + login. Pas dans flux CRM standard. |

## Divergences connues (NOUVEAU v4)

### `info-token-ardoise-vs-sky`

| Aspect | Détail |
|---|---|
| **Topic** | Token `--color-info` diverge entre golden et code |
| **Golden v3/v4** | `info: #5A7190` (ardoise FilmPro) |
| **Code app.css** | `--color-info: #2E90FA` (sky blue), `--color-info-light: #EFF8FF` |
| **Conséquence** | Badge variant `info` (S118) rend en sky blue, pas en ardoise FilmPro |
| **Origine** | S118 Bloc 1e commit `5844633` |
| **Décision pending** | Réaligner code → golden, OU golden → code, OU dual-track. Session Bloc 2 palette dédiée. |
| **Impact** | Visuel uniquement, contrastes WCAG AA OK pour les deux. |

## Notes méthodologiques

- v4 = **doc-only** : aucune modification CSS, app.css, ou composant. Régularisation pure.
- Cascade Bloc 1a Phase 3+4 (S116-S117) : 6/6 pages CRM auditées + sweeps cross-app (inputs h-[34px], ghost annuler/destructive, tokens accent → primary, header 48px).
- Sweep S118 (Blocs 1a + 1e) : 31 substitutions opacités + 5 helpers TS variant.
- Prochain palier : Bloc 2 (refonte palette CRM 360, trancher divergence info ardoise/sky), Bloc 1b (composant Select.svelte partagé).
