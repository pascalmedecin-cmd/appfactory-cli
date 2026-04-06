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

1. Affiche la liste des entreprises :
   ```
   ENTREPRISES EXISTANTES
   ======================
   - [Nom] ([secteur])
   ```
2. Demande : "Pour quelle entreprise ?"
3. Une fois choisie, lance `/cadrage` — le branding est deja defini dans `branding/[slug].yaml`, le skill cadrage peut sauter la question branding (Phase 4 question 4) et utiliser directement les tokens existants.
4. Apres cadrage, ajoute la nouvelle app dans `registry.yaml` sous l'entreprise choisie avec statut `cadrage`.

## Option 3 — Nouveau projet entreprise from scratch

### Etape 3a — Definition entreprise

Pose ces questions une par une :
1. "Nom de l'entreprise ?"
2. "Secteur d'activite ?"
3. "Contexte en 1-2 phrases ? (ce que fait l'entreprise)"

### Etape 3b — Cadrage branding

1. Lis `branding/_default.yaml` — c'est le theme de base AppFactory (warm-neutral, Inter, palette pro).
2. Presente le theme par defaut a l'utilisateur :
   ```
   BRANDING PAR DEFAUT
   ====================
   Couleurs : bleu-gris (#4A6B84) + accent bronze (#C08B5C) sur fond creme
   Typo : Inter (body) + Fira Code (mono)
   Logo : a definir
   Page login : a definir

   Tu veux :
   a) Garder tel quel
   b) Voir les autres themes (page visuelle dans le navigateur)
   c) Decrire l'ambiance souhaitee et je propose une palette
   d) Modifier les couleurs / typo manuellement
   ```
3. Selon la reponse :
   - **a)** → copie `_default.yaml` vers `branding/[slug].yaml`
   - **b)** → execute `npx tsx scripts/generate-branding-preview.ts` puis ouvre `previews/branding.html` dans le navigateur. L'utilisateur voit les 5 themes avec couleurs, typo, et mini-mockup. Demande : "Quel theme te plait ?" puis copie les tokens du theme choisi depuis `branding/_catalogue.yaml`
   - **c)** → genere une palette coherente avec la description, demande validation
   - **d)** → pose les questions de personnalisation une par une (couleurs, typo)
4. Quel que soit le choix (a/b/c/d), poser ensuite :
   - "Logo disponible ? (chemin fichier SVG/PNG, ou on le fera plus tard)"
   - "Image de fond pour la page de login ? (photo, pattern, ou couleur unie)"
5. Genere `branding/[slug].yaml` au meme format que les fichiers existants dans `branding/`

### Etape 3c — Enregistrement

1. Ajoute l'entreprise dans `registry.yaml` (sans app pour l'instant)
2. Confirme : "Entreprise [nom] creee. On enchaine avec le cadrage de la premiere app ?"
3. Si oui → lance `/cadrage` (le branding vient d'etre defini, meme logique que option 2)
4. Apres cadrage, ajoute l'app dans `registry.yaml` avec statut `cadrage`

## Regles

- Toujours lire `registry.yaml` en premier — c'est la source de verite
- Ne jamais modifier le branding existant sans validation explicite
- Les statuts possibles pour une app : `cadrage`, `generation`, `preview`, `production`
- Mettre a jour `registry.yaml` a chaque changement d'etat (nouvelle app, nouveau statut)
- Si le registre est vide (aucune entreprise), proposer uniquement l'option 3
- Si une entreprise n'a qu'une app, la preselectionner dans l'option 1
