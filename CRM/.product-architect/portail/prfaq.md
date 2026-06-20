# PR/FAQ - Portail FilmPro multi-outils

Format Working Backwards (Amazon). Redige AVANT tout code pour forcer l'articulation du benefice avant la mecanique.

---

## PRESS RELEASE (fictive, datee de la livraison cible)

**FilmPro devient un portail unique qui reunit tous les outils metier des fondateurs.**

*Suisse romande, ~2026-06-05* - FilmPro, specialiste des traitements pour vitrage (films et vernis), regroupe desormais ses outils internes derriere une porte d'entree unique : l'application **FilmPro**. La ou les fondateurs ouvraient jusqu'ici un "CRM", ils arrivent maintenant sur une page d'accueil claire presentant des cartes premium, une par outil.

Le premier outil, le **CRM** (prospection, pipeline, signaux, veille), reste exactement le meme : aucune fonction perdue, juste mieux rangee derriere sa propre carte. Une deuxieme carte annonce l'outil a venir, le **generateur de devis**, qui permettra de chiffrer un traitement de vitrage (surface, type de film ou vernis, prix au m2) en quelques clics.

L'enjeu invisible mais decisif : les outils **partagent les memes entreprises et les memes contacts**. Un client saisi une fois dans le CRM sera immediatement disponible dans le devis. Et les outils se parlent : depuis la fiche d'une entreprise, un fondateur pourra lancer un devis ; un devis accepte fera automatiquement avancer l'affaire dans le pipeline commercial. Plus de double saisie, plus de donnees qui divergent d'un outil a l'autre.

"On ne voulait pas dix petits logiciels deconnectes. On voulait un seul endroit, ou chaque outil connait deja nos clients et travaille avec les autres", resume l'equipe FilmPro.

---

## FAQ

### Pour les fondateurs (utilisateurs)

**Q : Qu'est-ce qui change pour moi au quotidien ?**
A : Quand vous ouvrez l'app, vous arrivez sur une page d'accueil avec des cartes : "CRM" et "Devis (bientot)". Vous cliquez sur CRM et vous retrouvez tout votre CRM actuel, identique. Rien n'est perdu, tout est juste mieux organise.

**Q : Je vais devoir reapprendre le CRM ?**
A : Non. Les pages du CRM (dashboard, pipeline, prospection, signaux, veille) ne changent pas. Seule l'enveloppe change : un nom (FilmPro au lieu de "CRM FilmPro") et une page d'accueil qui chapeaute le tout.

**Q : Mes favoris / liens vont casser ?**
A : L'adresse web va evoluer vers `filmpro.vercel.app` (decision validee). On vous fournira le nouveau lien et, si possible, une redirection depuis l'ancienne adresse pour la transition. C'est l'unique point d'attention de ce chantier.

**Q : Quand le devis sera-t-il pret ?**
A : C'est le chantier suivant. Ce chantier-ci pose les fondations pour que le devis arrive vite et qu'il connaisse deja vos clients des le premier jour.

**Q : Concretement, "les outils se parlent", ca veut dire quoi ?**
A : Un client saisi dans le CRM est automatiquement disponible dans le devis (et inversement). Plus tard : creer un devis directement depuis une fiche entreprise, et voir une affaire avancer dans le pipeline quand le devis est accepte.

### Pour la conception (interne)

**Q : Pourquoi une seule app et pas plusieurs ?**
A : Pour 3 fondateurs, un codebase unique avec une base de donnees unique est le moyen le plus simple et le plus sur de faire "parler" les outils : ils lisent et ecrivent dans les memes tables. Des apps separees imposeraient une synchronisation manuelle, une double auth, un double deploiement. (Decision Q1 + ADR a rediger Phase 2.)

**Q : Le CRM existant est-il a risque pendant la refonte ?**
A : Le chantier est surtout une **reorganisation** (deplacer les pages CRM sous un groupe de routes dedie + ajouter une home) et un **renommage**. Aucune table metier n'est detruite. Les fonctions CRM sont preservees a l'identique (critere d'acceptation : zero regression).

**Q : Comment les fondations "anticipent" le devis sans le construire ?**
A : Les tables `entreprises` et `contacts` deviennent explicitement le **referentiel partage** du portail (deja le cas techniquement). On documente ce contrat de partage et la regle d'isolation par outil (chaque outil a ses propres tables metier, mais tous pointent vers le meme referentiel). Le devis n'a plus qu'a brancher ses tables dessus au chantier 2.

**Q : Et le multi-tenant / la securite ?**
A : Modele inchange pour ce chantier (mono-tenant plat, 3 fondateurs symetriques, RLS `USING (true)`). Le durcissement RLS reste conditionne a l'arrivee d'un 4e utilisateur non-fondateur (risque ouvert documente, hors scope ici).

---

## Benefice client en une phrase

Un seul endroit pour tous les outils FilmPro, ou chaque outil connait deja vos clients et collabore avec les autres - sans double saisie ni donnees divergentes.

---

## Metrique de succes observable (chantier 1)

1. **Zero regression CRM** : 100 % des pages et fonctions CRM accessibles et fonctionnelles apres la reorg (verifie par la suite Playwright existante + smoke).
2. **Portail operationnel** : page d'accueil avec 2 cards (CRM actif, Devis a venir), accessible en 1 clic depuis n'importe ou dans l'app.
3. **Renommage complet** : zero occurrence de "CRM" comme *nom de l'application* dans l'UI (titres, navbar, meta) ; "CRM" ne subsiste que comme *nom d'un outil*. Description metier corrigee (vitrage, pas video).
4. **Fondation partagee documentee** : contrat de referentiel partage (entreprises/contacts) ecrit et valide, pret a accueillir le devis.
