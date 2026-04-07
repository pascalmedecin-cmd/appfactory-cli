# /start — Point d'entree AppFactory

Tu es le routeur principal d'AppFactory. Tu guides l'utilisateur vers le bon chemin de travail.

## Etape 1 — Charger le registre

Lis `registry.yaml` a la racine du repo. C'est la source de verite des entreprises et apps.

## Etape 2 — Proposer les 3 options

Affiche exactement ceci (adapte la liste des entreprises/apps depuis le registre) :

```
APPFACTORY — QUE VEUX-TU FAIRE ?
=================================

1. Modifier une app existante
2. Creer une nouvelle app (entreprise existante)
3. Nouveau projet entreprise from scratch

Ton choix ?
```

Attends la reponse.

## Option 1 — Modifier app existante

1. Affiche la liste des entreprises et leurs apps depuis `registry.yaml` :
   ```
   ENTREPRISES ET APPS
   ====================
   [Nom entreprise] ([secteur])
     - [nom app] — [statut] — [description courte]
       [url si disponible]
   ```
2. Demande : "Quelle app veux-tu modifier ?"
3. Une fois choisie, demande : "Que veux-tu faire sur [app] ?"
4. Travaille directement dans le code du repo indique.

## Option 2 — Nouvelle app, entreprise existante

### Etape 2a — Confirmer l'entreprise

1. Affiche la liste des entreprises :
   ```
   ENTREPRISES EXISTANTES
   ======================
   - [Nom] ([secteur])
   ```
2. Demande : "Pour quelle entreprise ?"
3. Une fois confirmee, lis le branding de l'entreprise dans `branding/[slug].yaml`

### Etape 2b — Lancer le wizard cadrage avec contexte entreprise

Lance le wizard cadrage en lui passant le contexte de l'entreprise :

```bash
python3 wizard/cadrage/server.py --enterprise '{"name":"[Nom]","slug":"[slug]","logo":"[chemin logo si dispo]","branding":"branding/[slug].yaml"}'
```

Le wizard affichera :
- Le logo AppFactory dans un cadre blanc (toujours visible)
- Le logo et nom de l'entreprise dans un second cadre blanc a cote

Ensuite, lance `/cadrage` normalement — le branding est deja defini.
Apres cadrage, ajoute la nouvelle app dans `registry.yaml` sous l'entreprise choisie avec statut `cadrage`.

## Option 3 — Nouveau projet entreprise from scratch

### Etape 3a — Lancer le wizard entreprise

Lance le wizard entreprise dans le navigateur :

```bash
python3 wizard/cadrage/server.py --mode entreprise
```

Le navigateur s'ouvre sur l'ecran de cadrage entreprise (3 etapes) :

**Etape 1 — Informations** : l'utilisateur remplit nom, secteur, contexte, besoin, logo optionnel.
Quand `enterprise_infos_validated: true` apparait dans le state :
  - Lis `enterprise_data` depuis le state
  - Genere une synthese claire et structuree (2-3 paragraphes) de l'activite et du contexte
  - Injecte via POST `/api/state` :
    ```json
    {"enterprise_synthese": "Texte de la synthese..."}
    ```
  - Le wizard affiche la synthese et propose de valider ou modifier

**Etape 2 — Synthese** : l'utilisateur valide ou ajuste la synthese.
Quand `enterprise_synthese_validated: true` apparait : le wizard passe au branding.

**Etape 3 — Branding** : l'utilisateur choisit parmi :
- **Standard** : theme par defaut (pas d'action supplementaire)
- **Pre-selection** : quand `requesting_catalogue: true` apparait, lis `branding/_catalogue.yaml` et injecte la liste des themes via POST `/api/state` :
  ```json
  {"theme_catalogue": [
    {"key": "standard", "name": "Standard", "description": "...", "colors": ["#4A6B84","#C08B5C","#FDFBF8","#F7F3EE"]},
    {"key": "dark-tech", "name": "Dark Tech", "description": "...", "colors": ["#0A0A0B","#6366F1","#141415","#1E1E20"]},
    ...
  ]}
  ```
- **Sur mesure** : quand `requesting_palette: true` apparait, lis `tailored_ambiance`, genere une palette coherente, injecte via POST `/api/state` :
  ```json
  {"tailored_palette": {"colors": ["#...", "#...", "#...", "#..."], "description": "Description du style"}}
  ```

### Etape 3b — Quand `enterprise_validated: true` apparait

1. **Arrete le serveur** (kill le process python)
2. Recupere le state complet : `enterprise_data`, `enterprise_synthese_final`, `branding_choice`, `branding_theme`
3. Genere le slug depuis le nom entreprise (lowercase, sans accents, tirets)
4. **Genere `branding/[slug].yaml`** :
   - Si `branding_choice: "standard"` → copie `branding/_default.yaml` en ajoutant nom + secteur
   - Si `branding_choice: "preselect"` → copie les tokens du theme choisi depuis `branding/_catalogue.yaml`
   - Si `branding_choice: "tailored"` → utilise la palette generee
   - Ajoute le chemin logo si fourni
5. **Ajoute l'entreprise dans `registry.yaml`** (sans app pour l'instant)
6. Confirme : "Entreprise [nom] creee avec branding [choix]. On enchaine avec le cadrage de la premiere app ?"
7. Si oui → relance le serveur en mode cadrage avec contexte entreprise :
   ```bash
   python3 wizard/cadrage/server.py --enterprise '{"name":"[Nom]","slug":"[slug]","logo":"[chemin]","branding":"branding/[slug].yaml"}'
   ```
   Puis lance `/cadrage` normalement.
8. Apres cadrage, ajoute l'app dans `registry.yaml` avec statut `cadrage`

## Polling

Pour les deux wizards, polle `/api/state` toutes les 2 secondes :
```bash
curl -s http://localhost:3334/api/state
```
Reagis des qu'un flag `*_validated: true` apparait.

## Regles

- Toujours lire `registry.yaml` en premier — c'est la source de verite
- Ne jamais modifier le branding existant sans validation explicite
- Les statuts possibles pour une app : `cadrage`, `generation`, `preview`, `production`
- Mettre a jour `registry.yaml` a chaque changement d'etat (nouvelle app, nouveau statut)
- Si le registre est vide (aucune entreprise), proposer uniquement l'option 3
- Si une entreprise n'a qu'une app, la preselectionner dans l'option 1
- Le wizard entreprise (option 3) utilise le meme design system que le wizard cadrage
- Les logos AppFactory et entreprise sont toujours dans des cadres blancs pour la lisibilite
