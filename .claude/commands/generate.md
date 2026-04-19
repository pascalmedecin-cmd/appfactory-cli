# Skill Generate : project.yaml vers scaffold SvelteKit

Tu es un Product Engineer qui genere un projet SvelteKit complet a partir d'un `project.yaml` valide.

## Prerequis

- Un `project.yaml` doit exister (genere par `/cadrage` ou ecrit manuellement)
- Le template AppFactory doit etre disponible dans `template/`

## Deroulement

### Phase 1 : Validation du project.yaml

1. Lis le `project.yaml` fourni (par defaut dans le repertoire courant, sinon demande le chemin)
2. Verifie les champs obligatoires : `app.name`, `app.slug`, `app.description`, `branding.primary`
3. Si des champs manquent, demande-les a l'operateur
4. Affiche un resume : nom, slug, nombre d'entites, nombre de pages, modules actifs

### Phase 2 : Scaffold

1. Demande le chemin de sortie (ex: `../clients/mon-app`)
2. Lance le scaffold : `npx tsx scripts/scaffold.ts <project.yaml> <output-dir>`
3. Verifie que la sortie est OK (pas d'erreur)

### Phase 3 : Personnalisation post-scaffold

Le scaffold copie le template generique. Selon le project.yaml, adapte :

#### Si le projet a des `entities` definies
- Genere les schemas Zod dans `src/lib/schemas.ts` pour chaque entite (champs, types, requis)
- Genere les FIELDS arrays pour les formulaires
- Adapte les routes existantes ou cree de nouvelles routes pour les entites qui n'existent pas dans le template

#### Si le projet a un `pipeline` different
- Les etapes de pipeline sont deja lues depuis config.ts, pas de modification necessaire

#### Si le projet n'a PAS de prospection
- Supprime `src/routes/(app)/prospection/` et `src/routes/api/prospection/`
- Supprime les composants `src/lib/components/prospection/`
- Retire l'entree de navigation correspondante du project.yaml

#### Si le projet n'a PAS de signaux
- Supprime `src/routes/(app)/signaux/`
- Retire l'entree de navigation

#### Si le projet n'a PAS de pipeline
- Supprime `src/routes/(app)/pipeline/`
- Retire l'entree de navigation

#### Page Aide
- Regenere le contenu de `src/routes/(app)/aide/+page.svelte` en fonction des pages et fonctionnalites reelles du projet

### Phase 4 : Verification

1. Lance `npx svelte-check` dans le dossier de sortie pour verifier le typage
2. Lance `npx vitest run` pour les tests unitaires
3. Affiche un rapport : fichiers generes, pages disponibles, modules actifs
4. **Genere les previews post-scaffold** dans `_previews/generate/` (rapport des fichiers generes, pages, modules)
5. Propose : "Le projet est pret. Prochaine etape : `/deploy` pour mettre en preview Vercel"

## Regles

- Ne jamais modifier le template source (template/) : toujours travailler sur la copie
- Le project.yaml du client est la source de verite absolue
- Si un module (prospection, signaux, pipeline) n'est pas dans le YAML, le supprimer proprement
- Toujours verifier que le projet compile avant de declarer termine
- Les schemas Zod doivent correspondre exactement aux entites du YAML
- Chaque page CRUD suit le pattern : DataTable + SlideOut + ModalForm (copier les patterns existants)
