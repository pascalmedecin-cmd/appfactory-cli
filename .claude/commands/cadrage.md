# Skill Cadrage : Wizard HTML interactif vers project.yaml

Tu es un Product Engineer qui cadre un nouveau projet d'application metier.
Le cadrage se fait via un wizard HTML dans le navigateur (pas d'allers-retours terminal).

## Prerequis

- Appele depuis `/start` (option 2 ou 3) : le branding est deja defini
- Le branding de l'entreprise est dans `branding/[slug].yaml`

## Deroulement

### Phase 1 : Lancer le wizard

1. Si le serveur n'est pas deja lance par `/start`, lance-le :
   - Option 2 (entreprise existante) : `python3 wizard/cadrage/server.py --enterprise '{"name":"...","slug":"...","logo":"...","branding":"..."}'`
   - Sinon : `python3 wizard/cadrage/server.py`
2. Le navigateur s'ouvre sur `http://localhost:3334/` (page Pitch)
3. Informe l'operateur : "Le wizard de cadrage est ouvert dans le navigateur. Remplis les etapes, je t'attends."

### Phase 2 : Injection intelligente (pendant que l'utilisateur remplit)

A chaque etape validee par l'utilisateur, tu recois les donnees via `/api/state`. Tu proposes du contenu pour l'etape suivante :

#### Apres Pitch valide (`pitch_validated: true`)
- Lis `pitch_data` depuis le state
- Genere un schema d'entites intelligent base sur le secteur et le probleme decrit
- Injecte via POST `/api/state` :
  ```json
  {"entities_data": [...], "step": "entities"}
  ```
  Le wizard navigue automatiquement et affiche les entites pre-remplies.

#### Apres Entites validees (`entities_validated: true`)
- Lis `entities_data` depuis le state
- Genere les pages logiques (Dashboard + 1 page par entite principale) et les modules pertinents
- Injecte via POST `/api/state` :
  ```json
  {"pages_data": {"pages": [...], "metrics": [...], "modules": {...}}, "step": "pages"}
  ```

#### Apres Pages validees (`pages_validated: true`)
- Lis `pages_data` et propose des regles metier coherentes (auth, cron si modules actifs)
- Injecte via POST `/api/state` :
  ```json
  {"rules_data": {...}, "step": "rules"}
  ```

#### Apres Regles validees (`rules_validated: true`)
- Le wizard passe au recap automatiquement (step: recap)
- Pas d'injection : l'utilisateur relit tout

### Phase 3 : Validation finale et generation

Quand `cadrage_validated: true` apparait dans le state :

1. **Arrete le serveur** (kill le process python)
2. **Recupere le state complet** (toutes les donnees des 4 etapes)
3. **Genere `project.yaml`** dans le repertoire du projet client, en fusionnant :
   - `pitch_data` → `app:` + description
   - Branding depuis `branding/[slug].yaml` → `branding:`
   - `entities_data` → `entities:`
   - `pages_data` → `pages:` + modules optionnels
   - `rules_data` → `auth:`, `scoring:`, `cron:`
4. **Execute `npx tsx scripts/generate-previews.ts --output _previews/cadrage`** pour les pages de presentation
5. **Verifie que `_previews/` est dans le `.gitignore`** du projet : l'ajouter si absent
6. **Met a jour `registry.yaml`** : ajoute l'app avec statut `cadrage`
7. **Affiche dans le terminal** : recapitulatif + chemin project.yaml + proposition `/generate`

## Format project.yaml de reference

```yaml
app:
  name: [Nom App]
  slug: [nom-app]
  description: [Description 1-2 phrases]
  locale: [fr-CH]

branding:
  primary: "#XXXXXX"
  primary_light: "#XXXXXX"
  primary_dark: "#XXXXXX"
  accent: "#XXXXXX"
  logo: [logo.svg]
  logo_white: [logo_white.svg]
  font: [DM Sans]

auth:
  provider: google
  allowed_domains: []

entities:
  - name: [nom_table]
    label: [Label affiche]
    icon: [material_symbol]
    fields:
      - key: [nom_champ]
        label: [Label]
        type: [text|email|tel|number|date|select|textarea|boolean]
        required: [true|false]
        options: [liste si select]
    relations:
      - target: [autre_entite]
        type: [many-to-one|one-to-many|many-to-many]
        label: [Label relation]

navigation:
  primary:
    - href: /
      label: Dashboard
      icon: dashboard
      metrics: [liste metriques]
    - href: /[entite]
      label: [Label]
      icon: [icon]
      features: [crud|kanban|search|filters|batch]
  secondary:
    - href: /aide
      label: Aide
      icon: help_outline

pipeline:  # Si applicable
  etapes:
    - key: [etape]
      label: [Label]
      icon: [icon]
      color: [text-color]

scoring:  # Si applicable
  max_points: [N]
  rules:
    - name: [nom_regle]
      points: [N]
      condition: [description]
  labels:
    chaud: [seuil]
    tiede: [seuil]
    froid: [seuil]

prospection:  # Si applicable
  sources: {}

signaux:  # Si applicable
  types: []

cron:  # Si applicable
  jobs: []
```

## Polling du state

Pour detecter les validations de l'utilisateur, polle `/api/state` toutes les 2 secondes :
```bash
curl -s http://localhost:3334/api/state
```
Reagis des qu'un flag `*_validated: true` apparait.

## Regles

- Le wizard HTML gere l'UX : Claude gere l'intelligence (propositions, generation)
- Ne jamais poser de questions dans le terminal pendant que le wizard est ouvert
- Si l'operateur dit "comme FilmPro" ou "similaire a [projet existant]", lis le project.yaml de reference dans template/project.yaml pour s'en inspirer
- Le project.yaml doit etre COMPLET et autosuffisant : c'est la source de verite pour `/generate`
- Les previews HTML sont generes par le script, pas a la main
- Le branding n'est PAS demande dans le wizard : il est deja defini avant le cadrage
