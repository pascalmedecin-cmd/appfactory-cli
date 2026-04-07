# Menu — AppFactory CLI

## Actions pre-menu

Lire `registry.yaml` a la racine (source de verite des entreprises et apps).

## Menu

```
APPFACTORY — QUE VEUX-TU FAIRE ?
=================================

  [1] Modifier une app existante
  [2] Creer une nouvelle app (entreprise existante)
  [3] Nouveau projet entreprise from scratch

Ton choix ?
```

Si le registre est vide (aucune entreprise) → proposer uniquement l'option 3.
Si une entreprise n'a qu'une app → la preselectionner dans l'option 1.

## Routage

- **Option 1** : lister entreprises + apps depuis registry.yaml, demander laquelle modifier, puis demander la tache
- **Option 2** : lister entreprises, confirmer laquelle, lancer le wizard cadrage avec contexte entreprise (`python3 wizard/cadrage/server.py --enterprise '...'`), puis `/cadrage`
- **Option 3** : lancer le wizard entreprise (`python3 wizard/cadrage/server.py --mode entreprise`), suivre le flow complet (infos → synthese → branding → cadrage premiere app)

Details complets du routage dans `/start` (commande projet) et CLAUDE.md.
