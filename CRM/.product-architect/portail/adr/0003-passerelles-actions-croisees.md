# ADR-0003 - Passerelles inter-outils via services traces (jamais UPDATE cross-outil direct)

## Status
Accepted (2026-06-01) pour le **principe** (action croisee via service trace, jamais d'UPDATE cross-outil direct) = toujours valable.
⚠️ PIVOT 2026-06-05 : le chantier 2 est devenu « Decoupe Films » (optimiseur de decoupes), pas un outil de devis. Les **passerelles concretes A/B decrites ici sont devis-specifiques -> caduques**. Les passerelles eventuelles de Decoupe Films (ex. lien plan de coupe <-> CRM) seront definies a son cadrage `/product` et feront l'objet d'un nouvel ADR. Le principe ci-dessous, lui, s'applique a toute future passerelle.

## Context
Decision Q3 : les outils ne se contentent pas de partager le referentiel, ils declenchent des actions l'un chez l'autre. Deux passerelles concretes prevues :
- A : "Creer un devis depuis une fiche entreprise" (CRM -> Devis).
- B : "Devis accepte -> avance l'opportunite du pipeline" (Devis -> CRM).
Risque : qu'un outil ecrive directement dans les tables metier d'un autre (ex : l'outil Devis fait un UPDATE sauvage sur `opportunites`), ce qui couple les outils de facon fragile et non auditable.

## Decision
Toute action croisee passe par une **fonction de service nommee et tracee**, jamais par un acces direct a la table d'un autre outil. Concretement :
- Passerelle A : navigation via convention d'URL `/devis/nouveau?entreprise_id=...` (lecture du referentiel partage, pas d'ecriture cross-outil).
- Passerelle B : un service `crm/opportunites.avancerDepuisDevis(devisId)` expose par l'outil CRM, appele par l'outil Devis. L'ecriture sur `opportunites` reste la propriete du CRM. Trace : `auteur_id` + timestamp + origine.
- Fondation a ne pas fermer maintenant : prevoir la possibilite d'un lien `opportunite_id` (nullable) sur la future table `devis` (decision finale chantier 2).

Anti-pattern explicitement banni : `UPDATE` direct d'une table possedee par un autre outil.

## Consequences
- (+) Couplage explicite, nomme, testable, traçable - pas de dependance cachee.
- (+) Chaque outil garde la propriete de ses tables metier (regle d'isolation ADR-0001/0002).
- (+) Evolutif : ajouter une passerelle = ajouter un service, pas trifouiller le schema d'un autre.
- (-) Un peu plus de code qu'un UPDATE direct, mais le surcout est le prix de l'auditabilite.

## References
- data-model-fondations.md section 4, user-flows.md (actions croisees)
- Methodologie : "jamais de patch/workaround, resoudre la cause racine"
