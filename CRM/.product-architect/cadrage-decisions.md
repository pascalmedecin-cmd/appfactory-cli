# CRM FilmPro mobile V3 - Cadrage décisions

Artefact de sortie du brainstorm de cadrage : council 4 voix + pre-mortem + angles morts.

**Périmètre.** CRM FilmPro mobile V3 « outil terrain » (SvelteKit + Supabase). La V2 a été abandonnée après smoke iPhone : trop de fonctions portées, lisibilité insuffisante. La V3 se recentre sur le terrain only : lecture du référentiel + capture d'une trace terrain (visite + photo + contact brouillon).

**Décisions verrouillées (entrée du cadrage, non rediscutées ici).**

- PWA (pas d'app native, le webapp responsive existant suffit comme contenant).
- Accueil = liste des relances dues (pas d'agenda, pas de calendrier).
- Compte-rendu = extension de la table existante `prospect_visits` (pas de nouveau modèle de vérité).
- Contact neuf = écriture dans une table `contact_suggestions` à valider au desktop (jamais inséré directement dans le référentiel).
- Pas d'offline (couverture mobile CH jugée suffisante).
- RLS mono-tenant plat (3 fondateurs FilmPro symétriques, décision design assumée).

---

## 1. Council (4 voix)

### Voix ARCHITECTE

**Position.** Le mobile est un client de capture, pas un deuxième siège de vérité. Il lit le contexte et écrit des faits terrain (visite + photo) en mode append-only ; il ne re-qualifie jamais le pipeline.

**Raisonnement.** La frontière structurante est simple : aucun champ structurant (statut prospect, score, étape de pipeline, qualification) n'est mutable depuis le mobile. Le terrain ajoute des faits datés, il ne réécrit pas l'état du système. Cela protège l'intégrité du référentiel quel que soit le contexte de saisie (réseau dégradé, geste rapide, erreur de manipulation).

**Contre-argument (porté par la voix elle-même).** Une frontière lecture seule trop rigide peut forcer le retour au papier : le commercial croise un contact neuf sur le terrain, ne peut rien en faire dans l'app, le note sur un carnet, et la donnée n'est jamais saisie. Résultat : dette de données jamais captées, exactement le problème que l'outil terrain devait résoudre.

### Voix SCEPTIQUE

**Position.** Avant de construire, challenger la prémisse : le commercial saisit-il vraiment sur le terrain, ou consulte-t-il avant la visite et saisit-il après ? Et faut-il vraiment une « app », alors qu'un webapp responsive existe déjà (une PWA suffit) ?

**Raisonnement.** L'échec de la V2 venait du contenu porté (trop de fonctions desktop transplantées), pas du contenant. Donc inutile de réinvestir dans un nouveau contenant lourd. Sur l'offline : c'est probablement un faux besoin, la couverture mobile en Suisse romande est bonne ; coder une couche de synchronisation offline ajouterait un mode d'échec coûteux pour un gain marginal.

**Contre-argument (porté par la voix elle-même).** La photo et la note post-visite sont périssables : prises sur le moment, sinon perdues. Sans capture immédiate en un seul geste (1 tap), elles se volatilisent dans le trajet entre le terrain et le bureau. Cela justifie quand même une capture mobile minimale, même si l'essentiel de la consultation se fait avant.

### Voix PRAGMATIQUE

**Position.** Le MVP tient en une boucle : une liste consultable -> une fiche (appeler / itinéraire) -> un compte-rendu (note + photo). Trois écrans, un seul onglet réel, en drill-down avec bouton retour.

**Raisonnement.** Les API de visites et de photos sont déjà en place. En s'appuyant dessus, le livrable sort vite, sans rouvrir le backend. La simplicité du parcours (descendre dans la fiche, laisser une trace, remonter) est aussi ce qui le rend lisible sur le terrain.

**Contre-argument (porté par la voix elle-même).** Si les visites ne sont pas planifiées en amont, la liste « du jour » est vide et l'app paraît inutile à l'ouverture. Il faut donc une recherche client comme deuxième porte d'entrée, sinon le commercial qui improvise une visite tombe sur un écran mort.

### Voix CRITIQUE

**Position.** Une seule boucle doit guider tout le design : j'arrive -> je sais qui c'est -> je laisse une trace. Tout ce qui n'est pas dans cette boucle est hors périmètre.

**Raisonnement.** Le pire échec est le retour au carnet papier, et il se déclenche dès que la boucle dépasse 20 secondes ou 3 taps. Le mode d'échec le plus grave et le plus silencieux est la photo non synchronisée : le commercial croit avoir capturé, l'app a perdu la donnée, personne ne le sait. Donc lecture seule sur le référentiel, écriture uniquement sur la trace terrain, et une garantie visible que la trace est bien partie.

**Contre-argument (porté par la voix elle-même).** La lecture seule stricte casse la capture d'un contact neuf. Proposer un mode « à valider » (suggestion) résout le cas, mais attention au mode d'échec inverse : une file de validations jamais traitée au desktop = données mortes en file d'attente, invisibles tant que personne n'ouvre la file.

### Verdict du Council

**Premise check.** La prémisse de l'outil terrain tient, mais à condition de couper drastiquement le contenu (l'échec V2 = contenu, pas contenant). L'offline est écarté comme faux besoin (couverture CH bonne) ; l'effort va sur la fiabilité de la capture, pas sur la synchronisation hors ligne.

**Consensus fort.** Les 4 voix convergent sur : consultation en lecture seule du référentiel + capture d'une trace terrain. Sont exclus du périmètre V3 : prospection, signaux, scoring, veille, reporting, dashboard, log, kanban. Navigation à profondeur 1, 2 onglets maximum, boucle terrain sous 20 secondes / 3 taps.

**Dissent.** Lecture seule stricte (Architecte, Critique sur le référentiel) contre création légère sur le terrain (besoin du contact neuf). Les deux contre-arguments se répondent : interdire la création = dette de données non captées ; autoriser la création directe = pollution du référentiel.

**Tranché par Pascal.** Contact neuf capturé en brouillon « à valider » dans `contact_suggestions`, jamais inséré directement dans le référentiel. Validation au desktop obligatoire, avec un badge desktop signalant la file en attente, sinon la file devient morte (mode d'échec porté par la voix Critique).

**Recommandation.** Construire la boucle unique (liste relances dues -> fiche lecture seule -> trace terrain visite + photo + contact brouillon), avec recherche client comme deuxième porte d'entrée, une garantie visible de synchronisation de la photo, et un badge desktop pour la file de brouillons. Aucun champ structurant mutable depuis le mobile.

---

## 2. Pre-mortem - « La V3 a échoué, pourquoi ? »

Exercice projeté : on est dans le futur, la V3 a échoué. Six causes plausibles, une mitigation concrète chacune, reliée aux décisions verrouillées et aux critères d'acceptation (AC-001 à AC-018).

### Mode d'échec 1 - Le périmètre a regonflé

On a rajouté « juste » le scoring, puis un mini-pipeline, puis la veille. La V3 est redevenue la V2 : illisible sur le terrain, et l'échec V2 s'est rejoué à l'identique.

- **Mitigation.** Liste d'exclusion gelée et opposable (prospection, signaux, scoring, veille, reporting, dashboard, log, kanban hors périmètre). Toute demande d'ajout passe par un arbitrage explicite contre la boucle unique, jamais par défaut. **AC-001, AC-002** (périmètre = 2 onglets, profondeur 1 ; rien hors boucle terrain).

### Mode d'échec 2 - Les photos se sont perdues silencieusement

Le commercial a pris des photos en visite, l'upload a échoué sans qu'il le voie (réseau faible, app fermée), et personne ne s'en est aperçu avant qu'une preuve manque. Mode d'échec le plus grave car silencieux.

- **Mitigation.** Statut de synchronisation visible par photo (en cours / envoyée / échec à renvoyer), pas de faux « OK » optimiste : la trace n'est confirmée que sur accusé serveur. Réessai explicite proposé. **AC-007, AC-008** (capture photo + confirmation de synchro visible et non optimiste).

### Mode d'échec 3 - La file de brouillons de contacts est morte

Les contacts neufs ont été capturés en brouillon « à valider », mais personne n'a jamais ouvert la file au desktop. Trois mois plus tard, la file contient 80 contacts jamais intégrés au référentiel : la donnée a été saisie mais reste inutile.

- **Mitigation.** Badge desktop obligatoire affichant le compte de brouillons en attente, visible dès l'accueil desktop (décision verrouillée). La file n'est jamais silencieuse. **AC-013, AC-014** (écriture en `contact_suggestions` + badge desktop avec compteur visible).

### Mode d'échec 4 - Le commercial est retombé au papier

La boucle terrain a dépassé 20 secondes ou 3 taps (chargement lent, trop de champs, navigation à plusieurs niveaux). Le commercial a jugé le carnet plus rapide et l'app n'a jamais pris.

- **Mitigation.** Budget d'interaction dur : laisser une trace en 3 taps maximum depuis la fiche, formulaire de compte-rendu minimal (note libre + résultat + photo), pas de champs obligatoires superflus. Test terrain chronométré avant livraison. **AC-005, AC-006** (boucle terrain <= 3 taps / 20 s ; compte-rendu minimal).

### Mode d'échec 5 - Les données ont été dégradées

Un champ structurant (statut, score, étape) a fini par être mutable depuis le mobile, et une manipulation rapide sur le terrain a corrompu l'état du pipeline géré au desktop.

- **Mitigation.** Mobile en écriture append-only sur la trace terrain (`prospect_visits` en extension), zéro champ structurant mutable. Le compte-rendu ajoute un fait daté, il ne réécrit jamais l'état. **AC-009, AC-010** (append-only sur `prospect_visits` ; aucun champ structurant éditable côté mobile).

### Mode d'échec 6 - La navigation s'est complexifiée

Un onglet de plus ici, un sous-menu là : la profondeur a dépassé 1, le commercial s'est perdu, la lisibilité a chuté. Le contenant a recommencé à porter du desktop.

- **Mitigation.** Navigation plafonnée : 2 onglets maximum, profondeur 1 (drill-down + bouton retour, pas d'arborescence). Toute vue supplémentaire est un drill-down d'une fiche, jamais un nouvel onglet. **AC-003, AC-004** (2 onglets max, profondeur 1, retour systématique).

---

## 3. Angles morts (blindspot)

Ce qui est absent de la réflexion initiale et mérite vigilance avant les specs. Chaque item : une ligne + l'action.

- **Valeurs exactes de l'enum « résultat » de visite.** Non définies métier. Action : faire valider la liste fermée des résultats par Pascal/FilmPro avant code (pas d'option « Autre », règle UX projet).
- **Permission géolocalisation iOS.** Le bouton « itinéraire » et toute pré-sélection « du jour » géo-dépendante peuvent échouer si iOS refuse la permission. Action : tester le refus de géoloc et prévoir un fallback (recherche client manuelle) ; ne jamais bloquer la boucle sur la géoloc.
- **Casse mixte des données existantes.** Les noms d'entreprises/contacts du référentiel ont une casse hétérogène (déjà constaté côté entreprises). Action : recherche client insensible à la casse et aux accents, sinon le commercial ne retrouve pas son client.
- **Pas de monitoring d'erreurs runtime.** Sentry a été retiré du CRM le 2026-06-07 (décision « pas nécessaire ») : aucun SLI n'est instrumenté en continu, un échec de synchro photo ne remonterait dans aucun monitoring automatique. Action : la garantie de synchro visible (AC-008) doit être autonome côté UI ; la détection des pertes de trace passe par les logs Vercel (réactif) + le smoke manuel.
- **Accessibilité contraste terrain.** Usage en plein soleil, écran peu lisible. Action : viser les contrastes AA renforcés (variante `--deep` des tokens), passer axe-core avant livraison.
- **Déconnexion de session sur le terrain.** Session OTP 7 jours qui expire en pleine visite = perte de la trace en cours. Action : détecter l'expiration de session, préserver la saisie locale en cours, proposer une reconnexion sans perte avant tout envoi.
