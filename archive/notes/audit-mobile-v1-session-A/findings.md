# Findings — Audit responsive mobile V1 Session A

**Date** : 2026-04-27
**Session** : S122
**Cadrage source** : `docs/SPECS_CRM_MOBILE.md`
**Méthode** : audit chrome MCP (extension Claude in Chrome) via injection JS sur prod `https://filmpro-crm.vercel.app`. Mesures factuelles : `getBoundingClientRect`, `getComputedStyle`, intersection viewport, `scrollWidth/clientWidth`, comptage tap targets < 44×44 (Apple HIG).
**Viewport audité** : iPhone 14 Pro Max — 430×932, dpr 3, UA iPhone, touch émulé. (Pixel 7 412×915 non audité, jugé quasi identique au 14 Pro Max — décision Pascal en cours de session.)
**État authentification** : loggué.
**Pages auditées (9)** : `/`, `/prospection`, `/pipeline`, `/contacts`, `/entreprises`, `/signaux`, `/veille`, `/reporting`, `/aide` + 1 modale "Nouveau contact" sur `/contacts`.

---

## Findings P0 — bloquants

### P0-1 — Bouton X close de modale soumet le formulaire au lieu de fermer

**Fichier** : `template/src/lib/components/ModalForm.svelte:70`
**Constat factuel** : le bouton X dans le header de la modale est déclaré `<button onclick={() => open = false} ...>` sans `type="button"`. HTML default = `type="submit"`. Reproduit en cliquant le X dans la modale "Nouveau contact" sur `/contacts` mobile : clic X = submit du formulaire, pas fermeture.
**Impact** : tout formulaire d'édition/création utilisant ModalForm a ce bug (création contact, prospection enrich, alertes, imports, etc.). Soumission accidentelle, validation erronée affichée à l'écran, UX cassée.
**A11y** : pas d'`aria-label="Fermer"` sur le bouton.
**Fix** :
```svelte
<button type="button" aria-label="Fermer" onclick={() => open = false} ...>
  <Icon name="close" />
</button>
```
**Sévérité** : P0 — bug fonctionnel desktop ET mobile (pas spécifique mobile, mais découvert pendant l'audit mobile).

### P0-2 — Kanban /pipeline scroll horizontal massif (4× viewport)

**Fichier** : composant kanban `/pipeline` (à identifier en Session B)
**Constat factuel** : container `flex gap-3 overflow-x-auto pb-4` mesuré clientWidth=398, scrollWidth=**1596** sur viewport 430. L'utilisateur doit scroller horizontalement à travers ~4 vues écran pour voir toutes les étapes.
**Contradiction SPEC** : `docs/SPECS_CRM_MOBILE.md` §2.1 (table périmètre) dit explicitement « Pipeline : Table → priorisation colonnes (kanban reste vertical mobile) ».
**Impact** : pipeline inutilisable mobile.
**Fix** : container kanban passer en `flex flex-col md:flex-row` mobile, ou empiler les colonnes verticalement avec titres sticky.
**Sévérité** : P0 — promesse SPEC non tenue, pipeline est un cas d'usage central.

---

## Findings P1 — tables et charts non responsive

### P1-1 — Table /prospection scroll horizontal interne (21px débordement)

**Constat factuel** : container `overflow-x-auto flex-1 min-h-0 overflow-y-auto`, clientWidth=396, scrollWidth=417. Table 8 colonnes.
**Contradiction SPEC** : §4.1 Tables — pattern attendu = priorisation colonnes via `hidden md:table-cell` / `hidden lg:table-cell`, pas scroll horizontal.
**Fix** : Session B — matrice priorisation colonnes pour /prospection (cf. SPEC §4.1).

### P1-2 — Table /contacts scroll horizontal interne (47px débordement)

**Constat factuel** : container `overflow-x-auto`, clientWidth=396, scrollWidth=443. Table 8 colonnes.
**Contradiction SPEC** : §4.1 Tables.
**Fix** : Session B — matrice priorisation colonnes pour /contacts. Exemple suggéré dans SPEC §4.1 (Mobile : Nom + Entreprise + Action ...).

### P1-3 — Chart SVG /reporting déborde container

**Constat factuel** : un SVG mesuré 528px dans container `overflow-x-auto` 356px (débordement 172px = ~33% de scroll latéral interne).
**Contradiction SPEC** : §4.5 Charts — « charts responsives natives, pas de débordement horizontal ».
**Fix** : Session C — option (a) configurer le chart avec `viewBox` SVG + `width:100%`, option (b) recalculer width au resize via observer.

---

## Findings P1 — tap targets sous Apple HIG 44×44

### P1-4 — Burger Menu header 32×32

**Fichier** : `template/src/lib/components/Header.svelte` (bouton `aria-label="Menu"`)
**Constat factuel** : taille mesurée 32×32, doit être 44×44 minimum (Apple HIG, WCAG AAA 2.5.5 target size).
**Fix** : padding ou min-w/min-h sur le bouton burger.

### P1-5 — Liens sidebar 216×40 (manque 4px hauteur)

**Fichier** : `template/src/lib/components/Sidebar.svelte`
**Constat factuel** : tous les liens sidebar (`Dashboard`, `Contacts`, `Entreprises`, `Pipeline`, `Prospection`, `Signaux`, `Veille`, `Aide`) mesurés 216×40 sur viewport 430. Manque 4px de hauteur pour atteindre 44.
**Fix** : passer `py-2` en `py-3` ou augmenter min-h-[44px] sur les `<a>` sidebar.

### P1-6 — Boutons footer modale 104×36

**Fichier** : `template/src/lib/components/ModalForm.svelte` (boutons "Annuler" / "Enregistrer")
**Constat factuel** : submit btn mesuré 104×36, manque 8px hauteur pour 44.
**Fix** : augmenter padding vertical des boutons modale.

---

## Findings P2 — polish

### P2-1 — Modal n'applique pas de scroll lock body

**Fichier** : `template/src/lib/components/ModalForm.svelte`
**Constat factuel** : quand modale "Nouveau contact" ouverte, `document.body.style.overflow = visible` (pas de lock). L'utilisateur peut scroller la page derrière la modale (background scroll bug, courant en mobile).
**Fix** : ajouter `use:` directive Svelte qui set `body.style.overflow = 'hidden'` au mount + restore au unmount, ou wrapping component existant si déjà disponible.
**Sévérité** : P2 — pas bloquant fonctionnellement, mais UX dégradée (perd le contexte de scroll).

### P2-2 — /entreprises peu de données visibles au moment du test

**Constat factuel** : 0 table rendue, page courte (height 932). Probablement vide au moment de l'audit (pas de données ou loader pas terminé).
**Fix** : revérifier en Session B avec données réelles ou état chargé. Le pattern table est probablement le même que /contacts /prospection donc même finding P1-1/P1-2 attendu.

---

## Validés OK (référence)

- ✅ **Fondation chrome `+layout.svelte`** — slide-in mobile fonctionnel (vérifié code + DOM) : sidebar `transform: translateX(-100%)` par défaut sous `max-width: 1023px`, click burger → `transform: translateX(0)`. Wrapper élégant `display: contents` desktop / `display: block + fixed` mobile. Mobile overlay avec `aria-label="Fermer le menu"`. Auto-close sur navigation (150ms). Conforme SPEC §3.
- ✅ **0 overflow horizontal global** sur 9/9 pages (`scrollWidth === clientWidth === 430` partout).
- ✅ **Modale full-width mobile** : 430×758, leftMargin=0, rightMargin=0. Coins arrondis haut seulement mobile (`rounded-t-2xl md:rounded-2xl`) → apparence "sheet visuel" structurellement modale, cohérent SPEC §4.3 « modales restent modales ».
- ✅ **Modale scroll interne** : div body modal a `overflow-y-auto` (ModalForm.svelte:75). Pas de problème de débordement vertical sur viewport SE 667 attendu (à confirmer Session B).
- ✅ **Inputs modale full-width** : 21 inputs mesurés 380px sur viewport 430 (98 % de la largeur dispo après padding).
- ✅ **Focus trap modale** : `use:trapFocus` ligne 60 ModalForm.svelte.
- ✅ **Reflow vertical magazine** /signaux (20 546px de hauteur) /veille (1 221px) /aide (3 464px) sans overflow horizontal.
- ✅ **Header fixed 56px** — hauteur correcte mobile (header.classes : `fixed top-0 right-0 h-(--header-height) bg-white/80 backdrop-blur-sm border-b`).
- ✅ **Manifest PWA déjà câblé** : `<link rel="manifest" href="/manifest.webmanifest">` + `<meta name="theme-color" content="#00003B">` + `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` dans `template/src/app.html` (lignes 6, 10, 11). Manifest contient nom, short_name, icônes 192/512, theme color FilmPro.

---

## Récap chiffré

| Page | Overflow global | Scroll horiz interne | Tap targets < 44 | Status |
|---|---|---|---|---|
| `/` | 0 | 0 | 11 | ✅ |
| `/prospection` | 0 | 1 (table 8 cols, +21px) | 23 | 🔴 P1 |
| `/pipeline` | 0 | 1 (kanban, +1198px) | 16 | 🔴 P0 |
| `/contacts` | 0 | 1 (table 8 cols, +47px) | 18 | 🔴 P1 |
| `/entreprises` | 0 | 0 | 12 | ⚠️ peu testé |
| `/signaux` | 0 | 0 | 14 | ✅ |
| `/veille` | 0 | 0 | 17 | ✅ |
| `/reporting` | 0 | 1 (chart SVG, +172px) | 14 | 🔴 P1 |
| `/aide` | 0 | 0 | 11 | ✅ |
| modale "Nouveau contact" | — | — | submit 104×36 | 🔴 P0 (X bouton submit) |

---

## Plan d'attaque suggéré pour Sessions B/C

**Session B (4 pages denses)** :
- Fix P0-1 (ModalForm.svelte:70 type="button" + aria-label) — 5 min
- Fix P0-2 (kanban /pipeline vertical mobile) — ~30 min
- Fix P1-1/P1-2 (priorisation colonnes /prospection /contacts) — ~45 min
- Fix P1-5 (sidebar links min-h 44) — 5 min
- Fix P1-4 (burger 44×44) — 5 min
- Fix P2-1 (scroll lock body modale) — 10 min
- Re-vérifier /entreprises avec données — 10 min

**Session C (3 pages magazine + reporting)** :
- Fix P1-3 (chart SVG responsive /reporting) — ~30 min
- Re-vérifier /signaux /veille avec données récentes — 15 min

**Session D (perf + golden mobile)** :
- Lighthouse mobile sur 8 pages (budgets SPEC §5)
- Fix P1-6 (boutons modale 44×44) si nécessaire post-fix Session B
- Annexe mobile golden v5
