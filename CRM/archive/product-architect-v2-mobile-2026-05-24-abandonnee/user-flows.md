# User flows critiques mobile

## F1 - Signal -> conversion prospect -> relance datée

Contexte : Pascal ouvre l'app en pause déjeuner ou entre deux RDV.

```
Pascal ouvre app -> sidebar burger -> tap "Signaux"
                                          |
                                          v
Page Signaux mobile : liste cards 1 col triées Pertinence
                                          |
                                          v
Tap card "YPERIA OIKEN Vitrages" -> SlideOut full-width
                                          |
                                          v
Lecture détail signal (Cœur, score 9, montant, contact MO)
                                          |
                                          v
Tap CTA "Convertir en prospect" -> modal bottom sheet
                                          |
                                          v
Tap "Créer" -> redirect Prospection mobile, fiche créée
                                          |
                                          v
Tap card prospect -> SlideOut -> CTA "Ajouter relance"
                                          |
                                          v
Modal bottom sheet : date input native iOS + notes -> Enregistrer
```

Critère succès : 4 taps max sur le chemin critique, aucun scroll H, aucun élément < 44x44 px.

## F2 - Création fiche terrain + photo + appel

Contexte : Pascal est sur un chantier, identifie un prospect inconnu visuellement.

```
Pascal ouvre app -> tap FAB "Lead express" (mobile only, dashboard)
                                          |
                                          v
Modal bottom sheet : 4 champs (raison sociale, contact, tél, source)
                                          |
                                          v
Tap "Créer" -> redirect Prospection mobile, card fraîche en haut
                                          |
                                          v
Tap card -> SlideOut full-width -> tap onglet "Photos"
                                          |
                                          v
Tap "Ajouter photo" -> sélecteur natif iOS (caméra ou galerie)
                                          |
                                          v
Photo uploadée, thumbnail visible -> retour onglet "Identité"
                                          |
                                          v
Tap numéro tél (lien tel: natif) -> iOS lance l'appel
```

Critère succès : création + photo + appel en moins de 60 secondes total.

## F3 - Consultation pipeline -> faire avancer une opp

Contexte : Pascal est dans le tram, veut voir où en est le pipeline.

```
Pascal ouvre app -> sidebar burger -> tap "Pipeline"
                                          |
                                          v
Page Pipeline mobile : accordéon 6 étapes fermées
                                          |
                                          v
Header chaque étape : "Négociation - 3 opps - 145 000 CHF"
                                          |
                                          v
Tap "Négociation" -> expand, 3 cards opp visibles
                                          |
                                          v
Tap card opp "Refonte vitrage Office du tourisme" -> SlideOut
                                          |
                                          v
SlideOut : titre, montant éditable, date relance éditable
                                          |
                                          v
Bouton primary "Faire avancer" (dropdown 5 étapes)
                                          |
                                          v
Tap "Gagné" -> confirmation modal -> opp déplacée
```

Critère succès : 3 taps max pour expand + ouvrir une opp. Drag-drop tactile NON exigé (alternative bouton).
