# Consulting : CLAUDE.md

**Statut :** Setup initial 2026-05-06 (S172). Phase 1 cadrage à démarrer (bloquée jusqu'à fin migration AppFactory restructure).
**Path :** `~/Claude/Projets/AppFactory/Consulting/` (sous-projet AppFactory aux côtés de CRM FilmPro, Formation IA, Wizard).
**Premier client pilote :** LED Studio (PME suisse 2-3 personnes, B2B solutions LED, scale-up).

## Mission

Outil de support pour la structuration opérationnelle et l'efficacité IA des PME.
Livrable par client = mini-site HTML statique premium présentant : diagnostic, plan d'action, chantiers, livrables, suivi.
Édité par Pascal (consultant), consulté par le client (lecture seule).

## Cible et hors-scope

**Cible :** PME 2 à 10 personnes en mission de structuration opérationnelle ou de scale-up. Premier client : LED Studio.

**Hors-scope (cette session et durablement) :**
- Pas d'application interactive (zéro form, login, back-end utilisateur).
- Pas de SaaS multi-tenant ni d'auth client.
- Pas de DB, pas d'API runtime côté client.
- Pas d'utilisation de clé API Anthropic. Tout passe par l'abo Claude Max de Pascal côté édition.

## Architecture cible

- **Rendu :** HTML/CSS/JS statique pur. Aucun JS server-side au runtime client.
- **Build :** côté Pascal, Python lit les données structurées (`data/`) et un template, génère le HTML dans `site/`.
- **Hébergement :** Cloudflare Pages (gratuit, lien partageable, pas de Mac à laisser allumé). Décision finale Phase 2.
- **Édition :** Pascal modifie les données sources puis re-génère le site.

## Roadmap (4 phases)

### Phase 1 — Cadrage produit
**Livrable :** `SPEC.md` (1 page) avec : mode de génération tranché, sections du mini-site listées, périmètre fonctionnel figé, critères d'acceptation Phase 3.
**Décisions à trancher cette phase :**
- Q2 — Mode de génération : HTML manuel premium vs build depuis JSON. Reco par défaut : **JSON**, séparation contenu/forme, duplication client #2 facile.
- Q3 — Sections du mini-site : accueil exec, diagnostic, plan d'action, chantiers, suivi. À valider et compléter.
- Q4 — Branding LED Studio : reporté Phase 4 quand le squelette tourne. Charte premium neutre par défaut au démarrage.

### Phase 2 — Architecture technique
**Livrable :** arbo finalisée (`templates/`, `bin/`, `clients/`, `design-system/`) plus script de build minimal qui produit un `site/` valide à partir d'un `data/` témoin.
**Décisions à trancher :**
- Hébergement final (Cloudflare Pages reco vs Netlify vs GitHub Pages).
- Format des données sources (JSON vs YAML vs Markdown front-matter).
- Stack template (Jinja2 vs templates HTML manuels).

### Phase 3 — MVP fonctionnel
**Livrable :** mini-site LED Studio rempli avec les vraies données (matrice friction, top 10, plan d'action) plus URL en ligne consultable.
**Critères d'acceptation :**
- Toutes les sections définies en Phase 1 sont rendues.
- Le site se génère par une commande unique (par exemple `python bin/build.py led-studio`).
- La donnée vit dans `clients/led-studio/data/`, jamais codée en dur dans le HTML.
- Aucune référence inventée. Les données viennent des matrices fournies par Pascal en début de Phase 3.

### Phase 4 — Templates premium et sections complètes
**Livrable :** identité visuelle LED Studio appliquée (logo, palette, typo) plus raffinement UI/UX via skills `frontend-design`, `taste-skill`, `soft-skill`, `brandkit`.
**Critères d'acceptation :**
- Niveau visuel comparable à un site agence haut de gamme (référentiel : golden standard à définir Phase 4 via `golden-standard`).
- Aucun pattern AI-générique.
- Test tiers : un lecteur sans contexte qualifie le rendu de pro et sérieux.

## Décisions tranchées Session 1 (2026-05-06)

- **Public :** Pascal (édition) et client (lecture). Pas d'interaction client.
- **Hébergement :** HTML statique sur service tiers gratuit. L'abo Claude Max ne sert pas d'hébergement. Cible Cloudflare Pages.
- **Path :** `~/Claude/Projets/AppFactory/Consulting/`. Sous-projet AppFactory (container) aux côtés de CRM FilmPro, Formation IA, Wizard.
- **Entrée menu cc :** option 4. Ordre menu réorganisé (1 Cockpit, 2 Global, 3 CRM FilmPro, 4 Consulting, 5 Formation IA, 6 Enseignement, 7 Marketing).
- **Pilote :** construire à 100 % pour LED Studio. Aucun framework abstrait.
- **Modèle :** opus (cohérent avec les 4 autres projets).

## Données de départ (à fournir Phase 3)

Pascal détient une analyse de la matrice friction LED Studio :
- Top 10 frictions opérationnelles.
- Patterns récurrents.
- Modèles à dupliquer.

**À ne pas inventer.** Pascal les transmettra explicitement quand Phase 3 démarrera.

## Stack provisoire (à confirmer Phase 2)

| Couche | Choix par défaut | Alternative |
|---|---|---|
| Données sources | JSON | YAML, Markdown front-matter |
| Build | Python 3 plus Jinja2 | Python pur, 11ty, Astro statique |
| CSS | Tailwind via CDN ou tokens custom CSS | CSS vanilla |
| Hébergement | Cloudflare Pages | Netlify, GitHub Pages |
| Versioning | Git local (pas de remote pour l'instant) | Privé GitHub si besoin de partage |

## Skills à activer (Phase 3-4)

À activer via `python3 ~/.claude/cockpit/bin/skills_sync.py --apply` une fois Phase 3 démarrée :
- `frontend-design` (composants premium)
- `taste-skill` (anti-slop, distinctif)
- `soft-skill` (haut de gamme)
- `redesign-skill` (upgrade vers premium)
- `brandkit` (identité visuelle)
- `golden-standard` (référentiel qualité)

Globaux déjà actifs : `ask-questions-if-underspecified`, `doc-coauthoring`, `claude-md-improver`.

## Notes architecture parent

`AppFactory/` est aujourd'hui le dossier racine du projet CRM FilmPro (config Vercel, src CRM, package.json à sa racine). Une migration future déplacera CRM dans `AppFactory/CRM/` et fera de `AppFactory/CLAUDE.md` un stub container minimal. Tant que cette migration n'a pas eu lieu, Consulting hérite par chargement parent Claude Code du `AppFactory/CLAUDE.md` actuel (contenu CRM dense). Nuisance temporaire assumée pour rester en zéro régression sur la prod CRM.

Plan de migration tracé en mémoire AppFactory : `~/.claude/projects/-Users-pascal-Claude-Projets-AppFactory/memory/project_appfactory_restructure.md`. Session dédiée future, pré-requis et étapes ordonnées documentés.

## Prochaine session

**Prochaine attaque** : Bloc 1 - Phase 1 cadrage produit. Bloqué jusqu'à fin migration AppFactory restructure (Pascal a tranché migration first S172).

### 1. Phase 1 - Cadrage produit Consulting [SUPERVISÉ • medium • ~30min]

**Pourquoi** : trancher 2 questions clés (mode génération + sections du mini-site) et produire `SPEC.md` avant tout scaffolding technique. Le mini-site sera un livrable client (édité par Pascal, lecture seule client), donc spec figée AVANT première ligne de code.

**Prérequis** : migration AppFactory restructure terminée. Tant que la migration n'a pas eu lieu, Consulting hérite du parent `AppFactory/CLAUDE.md` (contenu CRM dense), nuisance temporaire qui ne bloque pas la Phase 1 mais rend la session bruitée.

- [ ] **[BLOQUÉ - migration AppFactory restructure terminée]** Phase 1 cadrage Consulting : trancher Q2 (mode génération JSON+template vs HTML manuel premium, reco par défaut JSON pour séparation contenu/forme + duplication client) + Q3 (sections du mini-site : accueil exec / diagnostic / plan d'action / chantiers / suivi à valider et compléter), produire `SPEC.md` à la racine du projet. Q4 branding reporté Phase 4. Pas de code cette phase.

## Prérequis

- Lire ce CLAUDE.md au démarrage de session.
- Pascal fournira les données LED Studio (matrice friction) en Phase 3.
