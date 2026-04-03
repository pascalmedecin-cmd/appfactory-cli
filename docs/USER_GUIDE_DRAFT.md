# Guide Utilisateur — FilmPro CRM

**Statut :** En cours de redaction (alimente au fil du developpement)
**Derniere mise a jour :** 2026-04-03

> Ce document est la source de verite. Son contenu est integre dans la page `/aide` de l'application (sommaire cliquable + recherche).

---

## Sommaire

1. [Connexion](#1-connexion)
2. [Navigation](#2-navigation)
3. [Tableau de bord](#3-tableau-de-bord)
4. [Contacts](#4-contacts)
5. [Entreprises](#5-entreprises)
6. [Pipeline commercial](#6-pipeline-commercial)
7. [Prospection](#7-prospection)
8. [Signaux d'affaires](#8-signaux-daffaires)
9. [Parametres](#9-parametres)

---

## 1. Connexion

### Se connecter
FilmPro utilise la connexion Google. Sur la page de login, cliquez **Se connecter avec Google** et selectionnez votre compte professionnel. Seuls les comptes autorises par l'administrateur peuvent acceder a l'application.

### Se deconnecter
Cliquez le bouton **Deconnexion** en bas de la sidebar (icone logout). Sur mobile, ouvrez d'abord le menu hamburger.

---

## 2. Navigation

- **Sidebar gauche** : acces rapide aux 6 sections (Dashboard, Contacts, Entreprises, Pipeline, Prospection, Signaux) + Aide
- **Reduire la sidebar** : cliquer la fleche en bas de la sidebar pour la reduire (icones seules)
- **Sur mobile** : la sidebar est masquee par defaut. Cliquer l'icone menu (hamburger) en haut a gauche pour l'ouvrir en overlay. Elle se ferme automatiquement apres navigation
- **Deconnexion** : bouton en bas de la sidebar (icone logout)

---

## 3. Tableau de bord

### 3.1 Indicateurs
4 cartes en haut de page affichent les compteurs en temps reel :
- Nombre de contacts
- Nombre d'entreprises
- Opportunites en cours (hors Gagne/Perdu)
- Signaux neufs a traiter

### 3.2 Relances du jour
Les opportunites dont la date de relance est aujourd'hui ou depassee apparaissent dans un bandeau dedie. Cliquer sur une relance pour ouvrir le pipeline.

### 3.3 Alertes prospection
Si des recherches sauvegardees ont detecte de nouveaux leads, un bandeau orange s'affiche avec le nombre de leads. Cliquer pour acceder a la prospection.

### 3.4 Activite recente
Les dernieres actions (creation, modification, transfert) sont listees avec leur date.

---

## 4. Contacts

### 4.1 Voir la liste des contacts
La page affiche tous les contacts dans un tableau triable. Utiliser la barre de recherche pour filtrer par nom, entreprise, email ou telephone.

### 4.2 Creer un contact (saisie rapide)
Cliquer **Nouveau contact**. Les 6 champs principaux apparaissent : nom, prenom, entreprise, email, telephone, fonction. Valider avec **Enregistrer**.

### 4.3 Voir la fiche d'un contact
Cliquer sur un contact dans la liste. Le panneau lateral s'ouvre avec toutes les informations : coordonnees, entreprise rattachee, historique.

### 4.4 Modifier un contact
Dans le panneau lateral, cliquer **Modifier**. Le formulaire d'edition apparait avec tous les champs.

### 4.5 Archiver un contact
Dans le panneau lateral, cliquer **Archiver**. Le contact passe en statut archive et n'apparait plus dans la liste par defaut.

### 4.6 Marquer comme prescripteur
Un prescripteur est un contact qui recommande vos services. Activer le badge prescripteur depuis la fiche du contact. Les prescripteurs sont identifies par un badge violet dans la liste.

---

## 5. Entreprises

### 5.1 Voir la liste des entreprises
Toutes les entreprises dans un tableau triable avec recherche. Les colonnes affichent : raison sociale, secteur, canton, taille estimee, statut.

### 5.2 Creer une entreprise
Cliquer **Nouvelle entreprise**. Remplir : raison sociale (obligatoire), secteur d'activite, canton, adresse, site web, notes.

### 5.3 Voir la fiche d'une entreprise
Cliquer sur une entreprise pour ouvrir le panneau lateral. Vous y trouverez les details de l'entreprise et la liste des contacts rattaches.

### 5.4 Modifier / Supprimer
Depuis le panneau lateral : **Modifier** pour editer, **Supprimer** pour retirer definitivement (attention, action irreversible).

---

## 6. Pipeline commercial

Le pipeline affiche vos opportunites commerciales sous forme de colonnes kanban.

### 6.1 Vue kanban des opportunites
- 6 colonnes : Identification, Qualification, Proposition, Negociation, Gagne, Perdu
- Chaque carte affiche : titre, entreprise, montant estime, date de relance, contact
- Le total des montants est affiche en haut de chaque colonne
- Les dates de relance depassees apparaissent en rouge

### 6.2 Creer une opportunite
- Cliquer "Nouvelle opportunite" en haut a droite, ou le "+" dans une colonne
- Remplir : titre (obligatoire), entreprise, contact, montant, etape, date relance, responsable, notes
- Valider avec "Enregistrer"

### 6.3 Deplacer une opportunite (changer d'etape)
- Glisser-deposer une carte d'une colonne a l'autre (drag & drop)
- L'etape est mise a jour automatiquement

### 6.4 Marquer comme perdue
- Ouvrir la fiche (clic sur la carte) puis cliquer "Marquer perdu"

### 6.5 Modifier une opportunite
- Ouvrir la fiche (clic sur la carte) puis cliquer "Modifier"

---

## 7. Prospection

La page Prospection centralise les leads B2B issus de sources publiques suisses (registre du commerce, marches publics, permis de construire).

### 7.1 Comprendre la page prospection
- Chaque lead a un **score de pertinence** (0-13 points) calcule automatiquement
- Les badges de couleur indiquent la qualite : rouge (chaud, 8+), orange (tiede, 5-7), gris (froid, 2-4)
- Le scoring prend en compte : canton (GE/VD/VS = +3), secteur (construction, archi... = +3), signal chaud (SIMAP/SITG = +2), recence (< 30j = +2), telephone disponible (+1), montant > 100k (+1)

### 7.2 Ajouter un lead manuellement
- Cliquer "Ajouter un lead" en haut a droite
- Remplir : raison sociale (obligatoire), source, canton, contact, telephone, adresse, email, secteur, description, montant
- Le score est calcule automatiquement a la creation

### 7.3 Filtrer et trier les leads
- 4 filtres disponibles en haut de la liste : source, canton, statut, score minimum
- Par defaut : affiche les leads "nouveau" et "interesse"
- La barre de recherche filtre par texte dans toutes les colonnes
- Cliquer sur un en-tete de colonne pour trier (score, raison sociale, canton, etc.)

### 7.4 Qualifier un lead (interesse / ecarte)
- Ouvrir le detail (clic sur le lead), puis cliquer "Interesse" ou "Ecarter"
- Un lead ecarte ne sera jamais reimporte depuis la meme source

### 7.5 Transferer un lead vers le CRM
- Ouvrir le detail, cliquer "Transferer vers CRM"
- Cela cree automatiquement une fiche entreprise (et un contact si le nom est renseigne)
- Le lead passe en statut "transfere"

### 7.6 Importer des leads depuis des sources publiques
- Cliquer le bouton "Importer" en haut a droite de la page Prospection
- Choisir une source dans la modal :
  - **LINDAS** (registre du commerce) : selectionner un canton et des mots-cles (ex: "construction, architecte"). Les entreprises correspondantes sont importees avec scoring automatique
  - **Zefix REST** (registre complet) : meme principe, donnees plus riches (capital, FOSC). Necessite credentials (en cours de configuration)
  - **SIMAP** (marches publics) : selectionner un canton et une periode. Les appels d'offres construction sont importes comme leads chauds
- Les doublons sont detectes automatiquement (meme source + meme ID)
- Les leads precedemment ecartes ou transferes ne sont jamais reimportes

### 7.7 Enrichir un lead (telephone)
- Ouvrir le detail d'un lead qui n'a pas de telephone
- Cliquer "Enrichir telephone" (bouton jaune)
- Le systeme cherche dans l'annuaire suisse (search.ch) et met a jour la fiche si un numero est trouve
- Le score est recalcule automatiquement (+1 point si telephone trouve)

### 7.8 Sauvegarder une recherche
- Configurer les filtres souhaites (source, canton, statut, score minimum)
- Cliquer "Sauvegarder" a droite de la barre de filtres
- Donner un nom a la recherche (ex: "Construction GE score 5+")
- Choisir la frequence d'alerte : quotidienne ou hebdomadaire
- Cocher "Alerte active" pour recevoir les notifications
- Cliquer "Enregistrer"

### 7.9 Charger une recherche sauvegardee
- Cliquer "Recherches (N)" a droite de la barre de filtres
- La liste des recherches sauvegardees apparait avec leurs criteres
- Cliquer sur le nom d'une recherche pour charger ses filtres
- Un badge orange indique le nombre de nouveaux leads depuis le dernier check
- Supprimer une recherche avec l'icone poubelle

### 7.10 Alertes automatiques
- Les recherches sauvegardees avec "alerte active" sont executees automatiquement (quotidien a 7h ou hebdomadaire)
- Si de nouveaux leads correspondent aux criteres, un bandeau apparait sur le tableau de bord
- Cliquer le bandeau pour acceder directement a la page prospection
- Le compteur de nouveaux leads est visible dans la liste des recherches sauvegardees

### 7.11 Selection multiple et actions batch
- Cocher plusieurs leads avec les cases a cocher a gauche
- La barre d'actions apparait : "Interesse" ou "Ecarter" en lot
- "Deselectionner" pour tout annuler

### 7.12 Raccourcis clavier prospection
*A venir*

---

## 8. Signaux d'affaires

Les signaux d'affaires sont des informations detectees depuis des sources publiques (appels d'offres, permis de construire, creations d'entreprise, etc.).

### 8.1 Consulter les signaux
- La liste affiche : type, description, maitre d'ouvrage, canton, date detection, statut
- Filtrer par type de signal, canton, ou statut via les menus deroulants
- Rechercher par mot-cle dans la barre de recherche
- Cliquer sur un signal pour voir le detail complet dans le panneau lateral

### 8.2 Ajouter un signal manuellement
- Cliquer "Ajouter" en haut a droite
- Remplir : type, description projet, maitre d'ouvrage, architecte/bureau, canton, commune, source, date publication, notes

### 8.3 Convertir un signal en opportunite
- Ouvrir le detail d'un signal, cliquer "Creer opportunite"
- Donner un titre a l'opportunite, valider
- Le signal passe en statut "converti" et l'opportunite apparait dans le pipeline (etape Identification)

### 8.4 Ecarter un signal
- Ouvrir le detail, cliquer "Ecarter"
- Le signal passe en statut "ecarte" et ne sera plus propose

---

## 9. Parametres

La page Parametres n'est pas encore implementee. A terme, elle permettra :

### 9.1 Gestion des utilisateurs
- Voir la liste des utilisateurs autorises a acceder a l'application
- Modifier les roles (administrateur, utilisateur standard)

### 9.2 Inviter un collaborateur
- Ajouter une adresse email Google autorisee
- L'utilisateur invite pourra se connecter via Google OAuth

### 9.3 Configuration du scoring
- Ajuster les poids du scoring de prospection (cantons prioritaires, seuils, sources chaudes)
- Modifier les mots-cles secteur cibles

> Ces fonctionnalites seront ajoutees dans une prochaine phase de developpement.

---

## Annexe : Raccourcis clavier

| Raccourci | Action | Ou |
|-----------|--------|----|
| *A completer au fil du dev* | | |
