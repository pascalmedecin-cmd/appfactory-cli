# Phase 1 - Cadrage : 8 questions structurantes

Date : 2026-05-24
Scope : Refonte mobile CRM FilmPro
Validé par Pascal : 2026-05-24 (« ok validé »)

## Q1 - Utilisateur cible

3 utilisateurs admins terrain (Pascal + Antoine + 3ᵉ fondateur FilmPro). Profil commercial, contexte mobilité (chantier, RDV, déplacement). Pas de prospect ni client final dans la cible.

Conséquence directe : RLS « mono-tenant 3 fondateurs symétriques » reste assumée (S127). Aucune refonte data model.

## Q2 - Problème résolu

« Pouvoir consulter et agir sur le CRM depuis un iPhone en mobilité sans subir de scroll horizontal ni de tableau illisible. »

## Q3 - Critère de succès observable

3 critères binaires cumulatifs :
- a. 0 scroll horizontal détecté sur n'importe quelle page CRM en viewport iPhone 14 Pro Max (430x932) vérifié manuellement Chrome DevTools.
- b. 0 tableau HTML rendu en mobile sur les 5 pages MOBILE-ESSENTIEL (Prospection, Contacts, Entreprises, Pipeline, Reporting).
- c. Lighthouse mobile >= 90 sur 4 axes (Perf, A11y, Best Practices, SEO) sur les 5 pages refondues.

## Q4 - User flows critiques

3 flows nominaux : voir `user-flows.md`.
- F1 : Signal -> conversion prospect -> relance datée.
- F2 : Création fiche terrain + photo + appel.
- F3 : Consultation pipeline -> faire avancer une opp.

## Q5 - Contraintes non négociables

- A11y AA (axe-core 0 sérieux/critique, contrastes >= 4.5:1, tap targets >= 44x44 CSS px).
- 0 régression desktop (>= 1024px, snapshots Playwright existants verts).
- 0 régression RLS (refonte UI pure, aucune policy modifiée).
- Stack figée : SvelteKit 5 + Tailwind v4 + Lucide Svelte + Supabase + Vercel.

## Q6 - Stack confirmée

SvelteKit 5 + Tailwind v4 + Lucide Svelte. CSS scoped pour layout structurel, utilities Tailwind pour détail. Composants existants réutilisés : `Card`, `Tabs`, `SlideOut`, `ModalForm`, `DataTable`, `FAB`. Pas de nouvelle dépendance.

Source : doctrine styling actée audit 360 V3b S180 (`memory/feedback_crm_styling_doctrine.md`).

## Q7 - Hors-scope nommé (no-debt rule)

- Pas de PWA / installable iOS (V2 si besoin émerge).
- Pas de notifications push.
- Pas de mode offline.
- Pas de refonte data model / RLS.
- Pas de nouvelle fonctionnalité métier (juste rendre l'existant utilisable en mobilité).
- Pas de gestures swipe avancés (swipe-to-archive style Apple Mail).
- Pas de bottom navigation bar (sidebar burger conservée).
- Pas de refonte page Log (déjà desktop-only S185).
- Pas de refonte cockpit (méta-projet hors CRM).

## Q8 - Date cible

2026-05-31 (1 semaine, ~6-8h cumulées sur 2-3 sessions Phases 3+4+5).

## Ajustements complémentaires (validés)

- Breakpoint mobile : `< 1024px` (cohérent page Log + sidebar burger).
- Composant générique `<MobileEntityCard>` (titre, sous-titre, badges, 1-2 actions) extrait et réutilisé Prospection / Contacts / Entreprises / Signaux.
- Pipeline mobile : accordéon 6 étapes (header = nom étape + count + somme CHF, tap -> liste opps, tap opp -> slide-out + bouton « Faire avancer »). Pas de drag-drop tactile.
