# Plan de livraison et bascule - Portail FilmPro (chantier 1)

Ce chantier n'est pas une feature user "rampable" classique : c'est une reorganisation + un renommage + une **bascule d'adresse**. Le risque a maitriser n'est pas un rollout progressif mais la **continuite d'acces** des 3 fondateurs lors du changement d'URL.

## Faut-il un feature flag ?

**Non pour la reorg/renommage** (changement global cohérent, pas de variante a A/B tester). Le pattern flag existant (JWT custom claims Supabase, ADR-005 CRM) reste disponible si on voulait masquer la card Devis par user, mais ce n'est pas necessaire (la card "Bientot disponible" est volontairement visible par tous).

**Oui, implicitement, pour la home comme point d'entree** : si un souci surgit, le rollback se fait par `vercel rollback` (retour au commit ou `/` = dashboard CRM), pas par un flag runtime.

## Etapes de bascule (supervisees)

| # | Etape | Action | Critere de passage | Reversible |
|---|---|---|---|---|
| 0 | Preview | Deploiement preview branch (reorg + home + renommage) | Build vert + smoke 7 pages CRM + home OK | oui (jeter la branche) |
| 1 | Prod (alias actuel) | Promotion prod sur `filmpro-crm.vercel.app` | Tests verts, 0 regression, smoke fondateur | oui (`vercel rollback`) |
| 2 | Nouvel alias | Ajouter `filmpro.vercel.app` au projet Vercel | Le nouvel alias sert l'app (200) | oui (retirer alias) |
| 3 | Redirection | Rediriger `filmpro-crm.vercel.app` -> `filmpro.vercel.app` | Ancienne adresse renvoie vers la nouvelle | oui (retirer redirect) |
| 4 | Communication | Envoyer le nouveau lien aux 3 fondateurs | Confirmation d'acces des 3 | n/a |
| 5 | Cleanup (differe) | Retrait eventuel ancien alias | APRES confirmation des 3, jamais avant | n/a |

## Kill switch / rollback (< 60s vise)

- **Rollback applicatif** : `vercel rollback <deployment>` vers le commit baseline (avant reorg).
- **TRAP CONNU (watch list CRM)** : apres `vercel rollback`, l'alias prod se VERROUILLE - les `git push` suivants buildent mais ne promeuvent pas automatiquement. Toujours verifier avec `vercel inspect filmpro-crm.vercel.app` (et `filmpro.vercel.app`) que l'alias pointe sur le bon deploiement apres tout rollback.
- **Rollback URL** : retirer le nouvel alias / la redirection si la bascule pose probleme ; l'ancienne adresse reste fonctionnelle tant qu'on n'a pas fait l'etape 5.

## Garde-fous

- La bascule URL (etapes 2-5) est **toujours supervisee par Pascal**, jamais en autonomie (impact acces utilisateurs reels - premortem M1).
- Aucune suppression d'alias avant confirmation explicite que les 3 fondateurs accedent a la nouvelle adresse.
- Domaine perso / DNS = hors-scope (cible = alias Vercel `filmpro.vercel.app`).
