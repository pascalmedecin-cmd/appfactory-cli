# Refonte page Signaux V4 — Spec (S189, 2026-05-13)

Pascal a demandé une revue UX/UI premium de `/signaux`. Objectif explicite :
« identifier d'un seul coup d'œil les opportunités, actionner en peu de clics ».

## Décisions actées (validées Pascal)

- Q1 : retirer **toute** temporalité du scoring (Pascal : « inutile »).
- Q2 : panneau « Pertinence » sticky → **drawer overlay droit** déclenché par un bouton toolbar.
- Q3 : retirer le tab **« Tous »**, défaut = **« Nouveau »** (inbox métier).
- Q4 : « cacher hors-scope » fonctionnait (faux positif Pascal). Garder + rendre visible via compteur dynamique.
- Q5 : pousser les accents couleur sur (a) ScorePill saturée + (b) bandeau top card par dominante + (c) tab actif underline 3px.

## Critères d'acceptation binaires (smoke prod après deploy)

À dérouler sur <https://filmpro-crm.vercel.app/signaux> en navigation incognito (purge localStorage `signaux.*`).

| # | Critère | Attendu |
|---|---------|---------|
| C1 | Tab par défaut au load | « Nouveau » sélectionné, **pas « Tous »** (qui n'existe plus dans la barre). |
| C2 | Onglet « Tous » | **Absent** de la barre d'onglets. |
| C3 | Score d'un signal SIMAP `Vitrages` (S188 top tri) | Score **7** (Cœur vitrage +5 + SIMAP +2). Plus de critère `Recente < 30j` dans `notes_libres`. Anciennement 9 (avec +2 récence). |
| C4 | Score d'un signal Zefix `creation_entreprise` <30j | **0** (anciennement 2). Plus aucun critère `Recente` ne s'affiche jamais. |
| C5 | Sidebar « Pertinence » droite | **Absente** (layout 100 % largeur cards). |
| C6 | Toolbar | Affiche bouton **« Mots-clés »** avec icône `tune` + badge count (ex : `30`). |
| C7 | Clic bouton « Mots-clés » | Drawer overlay glisse depuis la droite (440 px) avec backdrop semi-opaque 40 %. Échap ou clic backdrop ferme. |
| C8 | Drawer header | Titre `Mots-clés de pertinence` + sous-titre dynamique selon `canEdit` (admin) ou (read-only). |
| C9 | Toggle « Cacher les hors-scope » | Affiche `(N masqués)` quand N>0 en couleur warning, ou `(0)` grisé + case désactivée si N=0. |
| C10 | Cards signaux | Bandeau 3 px coloré en haut, varie selon catégorie dominante mots-clés (vert Cœur / bleu Bonus / rouge Éviter / transparent neutre). |
| C11 | ScorePill | Fond saturé gradient (chaud rouge / tiède ambre / froid bleu / non-qualifié gris), texte blanc, tabular-nums. Lisibilité instantanée dans la grille. |
| C12 | Tab actif | Underline **3 px** primary (contre 2 px avant). Cohérence sur les 5 pages workspace CRM (Signaux / Contacts / Entreprises / Pipeline / Reporting). |

## Hors-scope (no-debt rule)

- Pas d'éditeur de poids par mot-clé (toujours `+5 / +2 / -3` figé).
- Pas de migration BDD (`signaux_mots_cles` inchangé).
- Pas de filter mots-clés multi-select dans la toolbar (reste un drawer de gestion).
- Pas de search côté serveur (toujours client après load).
- Pas de revue mobile (planifiée Bloc 2 audit transverse `< 1024 px`).
- Pas de retrait de la décote temporelle dans `calculerBonusVeille` (signaux Veille → leads prospection, concept distinct, scope distinct). À trancher Pascal si dérangeant.

## Action post-deploy obligatoire

`node scripts/rescore_signaux_v2.mjs --apply` côté machine Pascal pour rejouer le scoring V4 (sans temporalité, maxPoints 10) sur les ~131 signaux actifs `nouveau` / `en_analyse` en BDD. Sans cette action, l'UI affichera les anciens scores (incluant `Recente +2/+1`) jusqu'au prochain add/remove keyword (qui re-trigger `rescoreActiveSignaux`).
