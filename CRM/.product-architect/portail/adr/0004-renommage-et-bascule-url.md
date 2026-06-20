# ADR-0004 - Renommage CRM -> FilmPro (interface + bascule d'adresse)

## Status
Accepted (2026-06-01)

## Context
Decision Q6 : l'application ne s'appelle plus "CRM FilmPro" mais "FilmPro" (le CRM devient un outil dedans), et l'adresse web cible passe de `filmpro-crm.vercel.app` a `filmpro.vercel.app`. Le repo Git garde son nom (`appfactory-cli`) et le slug cockpit reste `filmpro`/`crm`. Risque principal : les 3 fondateurs ont l'ancienne adresse en favori ; une bascule brutale casse leur acces.

## Decision
1. **Renommage UI complet** : `config.app.name` -> "FilmPro" ; titres d'onglet `<title>` ; navbar/header ; metadonnees ; alt du logo. Correction au passage de la description metier erronee ("production audiovisuelle" -> "traitements pour vitrage", cf. memoire metier).
2. **Bascule d'adresse non destructive** : ajouter l'alias `filmpro.vercel.app` au projet Vercel ; configurer une **redirection** de l'ancien `filmpro-crm.vercel.app` vers le nouveau ; NE PAS supprimer l'ancien alias avant confirmation que les 3 fondateurs ont migre.
3. **Action de deploiement supervisee** : la bascule URL n'est jamais faite en autonomie (impact acces utilisateurs reels).

## Consequences
- (+) Identite coherente (FilmPro = portail, CRM = outil).
- (+) Zero coupure d'acces : les deux adresses fonctionnent pendant la transition.
- (-) Etape de deploiement manuelle/supervisee cote Vercel (alias + redirection).
- (-) Trap connu : apres un `vercel rollback`, l'alias prod se verrouille (les push suivants ne promeuvent pas). Verifier `vercel inspect` apres tout rollback (cf. watch list CRM).
- (Note) Domaine perso / DNS custom = hors-scope ce chantier (cible = alias Vercel).

## References
- Cadrage Q6, prfaq.md (FAQ "mes favoris vont casser"), feature-flag-plan.md
- Watch list CRM : trap vercel rollback -> alias prod verrouille
- Memoire project_filmpro_metier (vitrage, pas video)
