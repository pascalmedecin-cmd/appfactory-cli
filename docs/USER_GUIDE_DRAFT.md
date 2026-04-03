# Guide Utilisateur — FilmPro CRM

**Statut :** En cours de redaction (alimente au fil du developpement)
**Derniere mise a jour :** 2026-04-03

> Ce document est redige au fur et a mesure du developpement. Chaque fonctionnalite implementee ajoute une section ici. La version finale sera integree dans la page `/aide` de l'application.

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

*A documenter lors de l'implementation.*

- Se connecter avec son compte Google
- Deconnexion

---

## 2. Navigation

*A documenter lors de l'implementation.*

- Sidebar : acces rapide aux sections principales
- Raccourcis clavier

---

## 3. Tableau de bord

*A documenter lors de l'implementation.*

---

## 4. Contacts

*A documenter lors de l'implementation.*

### 4.1 Voir la liste des contacts
### 4.2 Creer un contact (saisie rapide)
### 4.3 Voir la fiche d'un contact
### 4.4 Modifier un contact
### 4.5 Archiver un contact
### 4.6 Marquer comme prescripteur

---

## 5. Entreprises

*A documenter lors de l'implementation.*

### 5.1 Voir la liste des entreprises
### 5.2 Creer une entreprise
### 5.3 Voir la fiche d'une entreprise
### 5.4 Modifier une entreprise

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

### 7.6 Enrichir un lead (telephone)
*A venir — integration search.ch*

### 7.7 Sauvegarder une recherche
*A venir*

### 7.8 Alertes automatiques
*A venir*

### 7.9 Selection multiple et actions batch
- Cocher plusieurs leads avec les cases a cocher a gauche
- La barre d'actions apparait : "Interesse" ou "Ecarter" en lot
- "Deselectionner" pour tout annuler

### 7.10 Raccourcis clavier prospection
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

*A documenter lors de l'implementation.*

### 9.1 Gestion des utilisateurs
### 9.2 Inviter un collaborateur

---

## Annexe : Raccourcis clavier

| Raccourci | Action | Ou |
|-----------|--------|----|
| *A completer au fil du dev* | | |
