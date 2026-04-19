# Menu : AppFactory (dispatcher racine)

AppFactory héberge plusieurs sous-projets autonomes. `/start` ici est un **dispatcher à 2 branches** qui demande d'abord quel sous-projet, puis bascule vers son `/start` complet (tâches, idées, options projet, nouveau).

Chaque sous-projet a son propre `CLAUDE.md` et son propre `.claude/start-menu.md` : source de vérité pour ses tâches et options.

## Sous-projets

| Branche | Dossier | CLAUDE.md | Menu complet |
|---|---|---|---|
| CRM FilmPro | `template/` (et racine actuelle pour les tâches tracées) | `/Users/pascal/Claude/Projets/AppFactory/CLAUDE.md` | (ci-dessous) |
| Formation IA | `formation-ia/` | `/Users/pascal/Claude/Projets/AppFactory/formation-ia/CLAUDE.md` | `formation-ia/.claude/start-menu.md` |

## Actions pré-menu

1. Lire `registry.yaml` à la racine (source de vérité des entreprises et apps FilmPro).
2. Scanner les `CLAUDE.md` des deux sous-projets pour compter leurs tâches `## Prochaine session` respectives.

## Menu racine (affichage)

Format exact :

```
APPFACTORY

  [1] CRM FilmPro        {N1} tâches ({M1} bloquées)
  [2] Formation IA       {N2} tâches ({M2} bloquées)

Ton choix ?
```

Règles :
- `N1` = nombre de `- [ ]` dans la section `## Prochaine session` de `/Users/pascal/Claude/Projets/AppFactory/CLAUDE.md` (CRM FilmPro).
- `N2` = nombre de `- [ ]` dans la section `## Prochaine session` de `/Users/pascal/Claude/Projets/AppFactory/formation-ia/CLAUDE.md`.
- `M` = sous-ensemble avec tag `[BLOQUÉ]` ou `[BLOQUANT]`.
- Pas de séparateur `───` au niveau racine.
- `[+] Nouveau : objectif libre` **n'apparaît PAS au niveau racine** : l'utilisateur doit d'abord choisir un sous-projet pour un objectif libre scopé.

## Routage

### [1] CRM FilmPro

Basculer vers le `/start` standard scopé au CRM FilmPro :
- Source tâches : `/Users/pascal/Claude/Projets/AppFactory/CLAUDE.md` section `## Prochaine session`
- Source idées : `/Users/pascal/Claude/Projets/AppFactory/.claude/parked.md`
- Options projet :
  - `[3] Modifier une app` : lister entreprises + apps depuis `registry.yaml`, demander laquelle modifier
  - `[4] Créer une app` : lister entreprises, lancer `python3 wizard/cadrage/server.py --enterprise '...'`, puis `/cadrage`
  - `[5] Nouveau projet entreprise` : lancer `python3 wizard/cadrage/server.py --mode entreprise` (flow infos → synthèse → branding → cadrage première app)
- `[+] Nouveau` : objectif libre scopé CRM FilmPro

Affichage des tâches (`[1] Reprendre`) : **linéaire** (plus de groupement, puisque scopé à un seul sous-projet). Chaque tâche conserve ses tags et son pointeur vers la spec.

### [2] Formation IA

Basculer vers le `/start` standard scopé à Formation IA : routage défini dans `formation-ia/.claude/start-menu.md`.

Source tâches : `/Users/pascal/Claude/Projets/AppFactory/formation-ia/CLAUDE.md` section `## Prochaine session`.
Source idées : `/Users/pascal/Claude/Projets/AppFactory/formation-ia/.claude/parked.md`.

Options projet Formation IA :
- `[3] Intégrer un parcours` : workflow conversationnel Claude Code CLI (Opus 4.6) détaillé dans `formation-ia/docs/INGESTION.md`
- `[4] Éditer un parcours existant` : re-ingestion ciblée

Règles pédagogiques contraignantes : `formation-ia/docs/PEDAGOGIE.md` (injecté comme system prompt Opus à chaque ingestion).

## Raccourcis

- Pour entrer directement dans un sous-projet sans passer par le dispatcher : `cd formation-ia/ && /start` (ou rester à la racine AppFactory pour le dispatcher complet).
- Si un sous-projet a 0 tâche et 0 idée → l'afficher quand même dans le dispatcher (ne pas masquer), indiquer `–` en compteur.
