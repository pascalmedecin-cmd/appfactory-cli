# Menu : AppFactory (dispatcher racine)

AppFactory héberge 3 sous-projets autonomes. `/start` ici est un **dispatcher** qui demande d'abord quel sous-projet, puis bascule vers son `/start` complet (tâches, idées, options projet, nouveau).

Chaque sous-projet a son propre `CLAUDE.md` et (s'il l'a) son propre `.claude/start-menu.md` : source de vérité pour ses tâches et options.

## Sous-projets

| Branche | Dossier | CLAUDE.md | Menu complet |
|---|---|---|---|
| CRM FilmPro | `CRM/` (CLAUDE.md vit dans `CRM/`) | `/Users/pascal/Claude/Projets/AppFactory/CRM/CLAUDE.md` | (CRM/.claude/start-menu.md si existe, sinon ci-dessous) |
| Consulting | `Consulting/` | `/Users/pascal/Claude/Projets/AppFactory/Consulting/CLAUDE.md` | `Consulting/.claude/start-menu.md` (si existe) |
| Formation IA | `Formation/` | `/Users/pascal/Claude/Projets/AppFactory/Formation/CLAUDE.md` | `Formation/.claude/start-menu.md` |

## Actions pré-menu

1. Scanner les `CLAUDE.md` des sous-projets pour compter leurs tâches `## Prochaine session` respectives.

## Menu racine (affichage)

Format exact :

```
APPFACTORY

  [1] CRM FilmPro        {N1} tâches ({M1} bloquées)
  [2] Consulting         {N2} tâches ({M2} bloquées)
  [3] Formation IA       {N3} tâches ({M3} bloquées)

Ton choix ?
```

Règles :
- `N1` = nombre de `- [ ]` dans la section `## Prochaine session` de `CRM/CLAUDE.md`.
- `N2` = nombre de `- [ ]` dans la section `## Prochaine session` de `Consulting/CLAUDE.md`.
- `N3` = nombre de `- [ ]` dans la section `## Prochaine session` de `Formation/CLAUDE.md`.
- `M` = sous-ensemble avec tag `[BLOQUÉ]` ou `[BLOQUANT]`.
- Pas de séparateur `───` au niveau racine.
- `[+] Nouveau : objectif libre` **n'apparaît PAS au niveau racine** : l'utilisateur doit d'abord choisir un sous-projet pour un objectif libre scopé.

## Routage

### [1] CRM FilmPro

Basculer vers le `/start` standard scopé au CRM FilmPro :
- Source tâches : `CRM/CLAUDE.md` section `## Prochaine session`
- Source idées : `CRM/.claude/parked.md` (si existe, sinon `.claude/parked.md` racine en fallback)
- `[+] Nouveau` : objectif libre scopé CRM FilmPro

Affichage des tâches (`[1] Reprendre`) : **linéaire** (plus de groupement, puisque scopé à un seul sous-projet). Chaque tâche conserve ses tags et son pointeur vers la spec.

### [2] Consulting

Basculer vers le `/start` standard scopé à Consulting :
- Source tâches : `Consulting/CLAUDE.md` section `## Prochaine session`
- Source idées : `Consulting/.claude/parked.md` (si existe)

### [3] Formation IA

Basculer vers le `/start` standard scopé à Formation IA : routage défini dans `Formation/.claude/start-menu.md`.

Source tâches : `Formation/CLAUDE.md` section `## Prochaine session`.
Source idées : `Formation/.claude/parked.md`.

Options projet Formation IA :
- `[3] Intégrer un parcours` : workflow conversationnel Claude Code CLI (Opus 4.6) détaillé dans `Formation/docs/INGESTION.md`
- `[4] Éditer un parcours existant` : re-ingestion ciblée

Règles pédagogiques contraignantes : `Formation/docs/PEDAGOGIE.md` (injecté comme system prompt Opus à chaque ingestion).

## Raccourcis

- Pour entrer directement dans un sous-projet sans passer par le dispatcher : `cd CRM/ && /start` (CRM), `cd Consulting/ && /start`, `cd Formation/ && /start`.
- Si un sous-projet a 0 tâche et 0 idée → l'afficher quand même dans le dispatcher (ne pas masquer), indiquer `–` en compteur.
