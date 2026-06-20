# CRM FilmPro - Mapping Pages → Rôle + Archétype (Golden v9)

**Version :** v9 (2026-05-06)
**Méthode :** layered design system + 2 archétypes sources stricts
**Référence pattern :** Linear, Stripe, Atlassian Design System (page templates / archetypes)

## Périmètre source strict

Le golden v9 a comme **seules sources** les 2 pages CRM figées comme référence :
- `/prospection` → archétype **workspace** (S164+S165)
- `/veille` → archétype **editorial** (S132/S168)

**Toutes les autres pages** sont **consommatrices** : elles héritent des tokens + primitives universels et des patterns de l'archétype consommé, et apportent leur identité propre figée lors de leur refonte. **Aucune page consommatrice ne définit le golden.**

## Modèle en couches

```
┌────────────────────────────────────────────────────┐
│ tokens.json     (couleurs, typo, spacing, radius)  │ ← UNIVERSEL
│ primitives.json (Button, Modal, ScorePill, …)      │ ← UNIVERSEL
└────────────────────────────────────────────────────┘
              ↑ source figée            ↑ source figée
              │                         │
┌─────────────┴────┐             ┌──────┴──────────────┐
│ workspace        │             │ editorial           │
│ /prospection     │             │ /veille             │
└──────────────────┘             └─────────────────────┘
              ↓ cascade                  ↓ cascade
┌─────────────────────────────────────────────────────┐
│ Pages consommatrices                                │
│ /dashboard · /pipeline · /contacts · /entreprises   │
│ /signaux · /veille/themes · /veille/[id] · /login   │
│                                                     │
│ Héritent tokens + primitives + patterns archétype.  │
│ Identité propre figée à leur refonte.               │
└─────────────────────────────────────────────────────┘
```

**Règle d'or :** une page consommatrice peut emprunter des patterns à l'archétype mappé, mais elle peut aussi développer une identité propre cohérente avec les tokens et primitives. Si cette identité émerge en page modèle figée, elle deviendra source d'un éventuel nouvel archétype dans une version golden ultérieure (v10+).

---

## Mapping pages CRM

### Pages SOURCES (figées)

| Page | Archétype | Statut |
|---|---|---|
| `/prospection` | **workspace** | Page modèle figée S164+S165 |
| `/veille` | **editorial** | Gabarit magazine S132/S168 |

### Pages CONSOMMATRICES (héritent + identité propre)

| Page | Archétype consommé | Statut | Identité propre |
|---|---|---|---|
| `/dashboard` | — (mix workspace utiles + spécifique) | **À refondre Bloc #1 cockpit actif** | Layout synthèse 60s + widget(s) spécifiques (TriageQueue, KPIs, alertes signaux). Figée à la livraison de la refonte. |
| `/pipeline` | workspace | À refondre (priorité métier S170) | drag prospects spécifique |
| `/contacts` | workspace | À refondre | — |
| `/entreprises` | workspace | À refondre | — |
| `/signaux` | workspace | À refondre | — |
| `/veille/themes` | workspace | Aligné S169, audit éclair | admin taxonomie |
| `/veille/[id]`, `/veille/item/[slug]` | editorial | Conformes S132/S168 | corps long-form |
| `/login` | spécial (palette éditoriale primary-dark) | Validé | page hors flux app, ambiance premium |

---

## Cascade : ordre d'attaque recommandé

1. **`/dashboard`** — Bloc #1 cockpit actif. Refonte avec patterns golden v9 + identité propre figée à la livraison.
2. **`/pipeline`** (cascade workspace) — priorité métier drag prospects (S170 reco)
3. **`/contacts`**, **`/entreprises`**, **`/signaux`** (cascade workspace)
4. **`/veille/themes`** (cascade workspace) — déjà aligné S169, audit éclair
5. **`/veille/[id]`** + **`/veille/item/[slug]`** (cascade editorial) — audit éclair, conforme S132/S168
6. **`/login`** (spécial) — audit séparé, palette éditoriale validée

---

## Règles cascade

1. **Toujours partir de tokens.json + primitives.json + l'archétype mappé.** Aucune autre source.
2. **Une page consommatrice peut emprunter PARTIELLEMENT à l'archétype consommé** ET développer son identité propre. Pas de copie aveugle qui dénature la nature du contenu.
3. **Si une page a besoin d'un comportement non couvert** :
   - 90% des cas = étendre la primitive (édition primitives.json + tests régression).
   - 10% des cas = pattern composite spécifique à la page (documenté dans son code, pas dans le golden).
4. **Pas de divergence locale silencieuse.** Toute divergence documentée dans le code de la page.
5. **Audit éclair par page avant cascade** : 5-10 min, identifier écarts critiques (a11y, sémantique, tokens, composants partagés).

---

## Workflow ajout pattern au golden

Si un nouveau pattern UI émerge sur une page consommatrice et mérite d'entrer dans le golden :

1. **La page doit être figée** (validée Pascal, stable, pas en cours de refonte).
2. **Choisir la couche** : universel (primitives) si réutilisable cross-archétypes, ou nouvel archétype si layout fondamentalement différent.
3. **Créer une nouvelle version golden** (v10) — jamais d'écrasement v9.
4. **Le nouvel archétype/primitive cite la page source figée** comme référence.

---

## Garde-fou

**Toute refonte page CRM SANS référence à ce mapping = bug de méthode.** Le golden v9 est consultable :
- Source de vérité split : `.claude/goldens/v9-2026-05-06/` (4 JSON + ce mapping + visualizer.html)
- Bundle agrégé : `.claude/goldens/audit-uiux-golden-v9-2026-05-06.json`
- Symlink `.claude/audit-uiux-golden-current.json` → bundle v9
- Visualizer interactif : ouvrir `.claude/goldens/v9-2026-05-06/visualizer.html`
