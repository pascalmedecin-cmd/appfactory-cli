# User flows critiques - Portail FilmPro (chantier 1)

3 flux nominaux. Format ASCII. Les flux "actions croisees" complets (devis) relevent du chantier 2 ; ici on cadre ce que le portail doit rendre possible.

---

## Flux 1 : Arrivee sur le portail et entree dans le CRM (nominal, chantier 1)

```
Fondateur                  App FilmPro
   |                           |
   |  ouvre filmpro.vercel.app |
   |-------------------------->|
   |                           |  auth OTP deja en session ?
   |                           |--- non --> /login (OTP @filmpro.ch) --> retour
   |                           |--- oui -->
   |                           |
   |     <-- HOME PORTAIL ------|  2 cards premium :
   |                           |   [ CRM ]  (active)
   |                           |   [ Devis - Bientot ] (grisee, non cliquable)
   |                           |
   |  clic card CRM            |
   |-------------------------->|
   |     <-- Dashboard CRM -----|  layout CRM (sidebar 7 entrees), identique a aujourd'hui
   |                           |
   |  (travaille normalement)  |
   |  clic logo FilmPro        |
   |-------------------------->|
   |     <-- retour HOME -------|  porte d'entree toujours accessible
```

**Critere** : 1 clic depuis n'importe quelle page CRM pour revenir au portail (via logo/lien dedie). Zero fonction CRM perdue.

---

## Flux 2 : Decouverte de l'outil a venir (Devis bientot)

```
Fondateur                  HOME PORTAIL
   |                           |
   |  survole card "Devis"     |
   |-------------------------->|
   |     <-- etat "Bientot" ----|  card grisee, badge "Bientot disponible",
   |                           |  1 phrase : "Chiffrez un traitement de vitrage en quelques clics"
   |  clic (tentative)         |
   |-------------------------->|
   |     <-- non navigant ------|  pas de page morte / 404 ; la card communique la vision sans casser
```

**Critere** : la card Devis informe et donne envie, sans creer de lien mort ni de page vide.

---

## Flux 3 : Continuite du referentiel partage (fondation, verifiable des chantier 1)

```
Fondateur          CRM (outil 1)            REFERENTIEL PARTAGE         DEVIS (outil 2, futur)
   |                   |                          |                          |
   |  cree entreprise  |                          |                          |
   |  "Regie X" + contact                         |                          |
   |------------------>|  ecrit via service ----->| entreprises / contacts   |
   |                   |                          |  (1 seule ligne)         |
   |                   |                          |                          |
   |  (chantier 2)     |                          |                          |
   |  ouvre Devis      |                          |   lecture partagee ----->| "Regie X" deja la,
   |                   |                          |                          |  zero re-saisie
```

**Critere fondation (chantier 1)** : le contrat de referentiel partage est ecrit et la couche de service `referentiel/` identifiee, de sorte que le Devis (chantier 2) lit les memes entreprises/contacts sans duplication. C'est la preuve, des ce chantier, que les outils pourront "se parler".

---

## Actions croisees (chantier 2, cadrees ici pour ne pas fermer la porte)

- **CRM -> Devis** : bouton "Creer un devis" sur fiche entreprise -> `/devis/nouveau?entreprise_id=...`.
- **Devis -> CRM** : devis `accepte` -> avance l'`opportunite` du pipeline (via service trace, jamais UPDATE direct cross-outil).

Voir `data-model-fondations.md` section 4.
