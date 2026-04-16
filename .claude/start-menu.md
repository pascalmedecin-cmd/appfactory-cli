# Menu — AppFactory

## Actions pré-menu

1. Lire `registry.yaml` à la racine (source de vérité des entreprises et apps).
2. Scanner les CLAUDE.md des sous-projets autonomes pour agréger leurs tâches `## Prochaine session` :
   - `template/` = CRM FilmPro (tâches dans le CLAUDE.md racine de ce projet)
   - `formation-ia/CLAUDE.md` = Formation IA

## Règle d'affichage des tâches (override du comportement standard)

Quand l'utilisateur choisit `[1] Reprendre`, **grouper les tâches par sous-projet** avec un en-tête clair par groupe. Format :

```
TÂCHES EN COURS

  CRM FilmPro
    [1a] ...
    [1b] ...

  Formation IA
    [1c] ...
    [1d] ...
```

Numérotation continue (1a, 1b, 1c...) traversant les groupes pour que l'utilisateur puisse référencer n'importe quelle tâche par son ID unique. Chaque tâche conserve ses tags ([EXÉCUTABLE], [BLOQUÉ], [PRIORITÉ], etc.) et son pointeur vers la spec (`→ voir memory/...`).

Le compteur `[1] Reprendre {N} tâches` dans le menu additionne les tâches des deux sous-projets.

## Options projet

- **[3] Modifier une app** — Travailler sur une app existante
- **[4] Créer une app** — Nouvelle app pour une entreprise existante
- **[5] Nouveau projet entreprise** — From scratch

## Routage

### [3] Modifier une app

Lister entreprises + apps depuis registry.yaml, demander laquelle modifier, puis demander la tâche.
Si une entreprise n'a qu'une app → la présélectionner.

### [4] Créer une app

Lister entreprises, confirmer laquelle, lancer le wizard cadrage avec contexte entreprise (`python3 wizard/cadrage/server.py --enterprise '...'`), puis `/cadrage`.

### [5] Nouveau projet entreprise

Lancer le wizard entreprise (`python3 wizard/cadrage/server.py --mode entreprise`), suivre le flow complet (infos → synthèse → branding → cadrage première app).

Si le registre est vide (aucune entreprise) → proposer uniquement l'option 5.
