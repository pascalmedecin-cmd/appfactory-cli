# Menu — AppFactory

## Actions pré-menu

Lire `registry.yaml` à la racine (source de vérité des entreprises et apps).

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
