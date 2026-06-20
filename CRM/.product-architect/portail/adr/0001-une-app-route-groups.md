# ADR-0001 - Une seule app SvelteKit (outils = route groups), base de donnees unique

## Status
Accepted (2026-06-01)

## Context
FilmPro veut un portail multi-outils (CRM, Devis, plus tard Terrain) ou les outils "se parlent" (referentiel partage, actions croisees). Trois architectures possibles : (a) une app unique avec route groups et une DB ; (b) apps separees partageant une DB ; (c) apps separees avec DBs distinctes synchronisees. Cible : 3 fondateurs symetriques, mono-tenant, stack existante SvelteKit + Supabase + Vercel deja en production pour le CRM.

## Decision
Une seule app SvelteKit. Chaque outil est un **route group** SvelteKit (parentheses, invisible dans l'URL) : `(portail)`, `(crm)`, plus tard `(devis)`, `(mobile)`. Une seule base Supabase, une seule auth OTP, un seul deploiement Vercel. Les outils communiquent en lisant/ecrivant les memes tables via des couches de service partagees.

## Consequences
- (+) "Les outils se parlent" est natif : memes tables, memes services, zero synchronisation.
- (+) Une seule auth, un seul deploiement, un seul pipeline de tests. Cout operationnel minimal pour 3 fondateurs.
- (+) Reutilisation directe du design system et de l'infra CRM existants.
- (+) Reorganisation a faible risque : deplacer les pages CRM sous `(crm)` + ajouter `(portail)`, pas de refonte infra.
- (-) Couplage de deploiement : un bug dans un outil peut affecter le build global (mitige par tests + le fait que les outils partagent deja le meme runtime aujourd'hui).
- (-) Necessite une discipline d'isolation par outil (tables metier scopees, pas d'ecriture cross-outil sauvage) - traitee en ADR-0003.

## Alternatives rejetees
- Apps separees / monorepo multi-app : surdimensionne pour 3 fondateurs, double auth, synchronisation du referentiel a construire. Rejete (cout/benefice defavorable).
- Micro-frontends : complexite injustifiee a cette echelle.

## References
- Cadrage Q1 (cadrage-questions.md), cadrage-decisions.md section A
- Stack existante : CRM/package.json (SvelteKit 2, adapter-vercel)
