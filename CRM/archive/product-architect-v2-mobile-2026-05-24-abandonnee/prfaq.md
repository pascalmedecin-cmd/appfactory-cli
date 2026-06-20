# PR/FAQ - Refonte mobile CRM FilmPro

## Press release (interne, daté futur)

**Date** : 2026-05-31

**Titre** : Le CRM FilmPro devient une vraie app terrain sur iPhone.

À partir d'aujourd'hui, les 3 fondateurs FilmPro peuvent ouvrir le CRM depuis leur iPhone en mobilité et accéder aux fonctions clés sans frustration : zéro tableau qui scroll horizontalement, zéro liste à 12 colonnes illisible. La nouvelle interface mobile présente chaque entité (prospect, contact, entreprise, opportunité, signal) sous forme de carte tappable, avec les 2-3 actions les plus utiles directement accessibles (appeler, ajouter une visite, faire avancer dans le pipeline).

5 pages CRM ont été refondues mobile-first : Prospection, Contacts, Entreprises, Pipeline et Reporting. 4 pages étaient déjà mobile-OK (Dashboard, Signaux, Veille, Aide) et ont reçu un polish (suppression des éléments inutiles en mobilité). 1 page reste desktop-only volontairement (Log, déjà acté S185).

Le résultat : sur le terrain, en RDV chez un architecte ou sur un chantier, on consulte et on agit sans avoir à sortir l'ordinateur portable.

## FAQ

**Pourquoi maintenant ?** Le CRM était optimisé desktop. En usage réel, Pascal et Antoine ouvrent le CRM sur iPhone plusieurs fois par jour. La friction (scroll H, tableaux illisibles, kanban impossible) freinait l'usage mobile.

**Qu'est-ce qui change visuellement ?** Sur les 5 pages refondues, les tableaux deviennent des grilles de cartes (1 colonne sur iPhone, 2 sur tablette). Le kanban Pipeline devient un accordéon par étape. Le reporting ne montre que les KPI et les charts, plus les tableaux croisés.

**Qu'est-ce qui ne change PAS ?** Le desktop reste strictement identique (>= 1024px). Aucune fonction n'est supprimée, certaines sont simplement masquées en mobilité (batch actions, exports CSV, kanban drag-drop, drawer keywords expert).

**Qu'est-ce qui n'est PAS dans cette livraison ?** Pas de PWA (l'app reste un site web). Pas de notifications push. Pas de mode offline. Pas de gestures swipe avancés. Pas de nouvelle fonctionnalité métier.

**Quel est le risque ?** Régression desktop si une media query mal placée affecte >= 1024px. Mitigation : snapshots Playwright desktop verrouillés en Phase 4, et tous les comportements mobile sont guards `@media (max-width: 1023.98px)` strict.

**Comment on vérifie que c'est bien livré ?** 3 critères binaires : 0 scroll H sur viewport iPhone 14 Pro Max, 0 tableau HTML en mobile sur les 5 pages refondues, Lighthouse mobile >= 90 sur les 4 axes.

**Et si une page mobile rate son design ?** Phase 4 inclut un audit-uiux Mode A à 5 agents parallèles (composants, typo, interactions, responsive, accessibilité) avec correction in-session des findings High/Critical (no-debt rule).

**Combien de temps pour livrer ?** Spec et acceptance criteria écrits cette session (Phases 1+2). Coding + QA + Livraison sur 2-3 sessions suivantes. Date cible : 2026-05-31.
