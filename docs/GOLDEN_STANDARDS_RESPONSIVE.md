# Golden Standards Responsive - Page Prospection

**Date audit :** 2026-04-12 (session 45)
**Perimetre :** `/prospection` prod (filmpro-crm.vercel.app)
**Viewports testes :** 1440x900 (desktop), 768x1024 (tablette), 375x812 (mobile)
**Seed data :** 25 leads `[AUDIT]` (3 sources, 4 statuts, 3 temperatures)

Ce document etablit les regles a propager sur les 5 autres pages
(contacts, entreprises, pipeline, signaux, dashboard).

---

## Findings par severite

### P0 - Bloquants livraison client

**F1. BatchActionsBar deborde horizontalement en mobile**
- Fichier : `src/lib/components/prospection/BatchActionsBar.svelte`
- Symptome : `scrollWidth 587px` sur viewport 500px quand barre active. Bouton "Deselectionner" cause overflow.
- Cause : `flex items-center gap-3` sans `flex-wrap`, 4 enfants + gap = > 500px.
- Fix : `flex flex-wrap gap-2` + regrouper les 3 actions primaires, sortir "Deselectionner" en `w-full md:ml-auto md:w-auto`.
- Golden rule : **toute barre d'actions doit `flex-wrap` sous 640px** et jamais depasser 100vw.

**F2. Slide-out : titre sticky sans fond opaque**
- Fichier : `src/lib/components/prospection/LeadSlideOut.svelte` (header du dialog)
- Symptome : au scroll, le titre long chevauche visuellement le contenu en dessous (sections "Scoring" visible derriere le titre sticky). Desktop ET mobile.
- Cause : header sticky/fixed sans `bg-white` ni border-bottom ni shadow pour masquer le contenu scroll.
- Fix : header sticky avec `bg-white border-b border-border` (et optionnel `shadow-sm` a partir du 1er scroll).
- Golden rule : **tout element sticky/fixed doit avoir fond opaque + separateur visuel.**

### P1 - Degradation UX client-ready

**F3. Accents manquants dans les messages d'API**
- Fichiers : `src/routes/api/prospection/{zefix,simap,regbl}/+server.ts` lignes ~181-207
- Observation prod : messages affiches "importe" / "ignores" (sans accent)
- Investigation : le code source **a bien** les accents ("importe", "ignore" avec diacritiques). Bug : deploiement Vercel sert probablement une ancienne version ou encoding HTTP incorrect.
- A verifier : forcer nouveau deploy + controler headers `Content-Type: application/json; charset=utf-8`.

**F4. Erreur Zefix 400 sans filtre nom**
- Symptome : canton GE, "50 resultats", pas de filtre nom -> "Erreur API Zefix (400)"
- Attendu : l'UI suggere que le filtre est optionnel, or l'API le requiert de facto.
- Fix : soit rendre le champ obligatoire cote UI (required + message), soit passer une requete par defaut cote serveur (ex: `q=*`).

**F5. SIMAP dedup 20/20 alors que base vide**
- Symptome : table `prospect_leads` vide, pourtant tous les imports SIMAP sont "ignores" (skipped).
- Cause probable : `cantonToLead(addr?.cantonId)` retourne null pour tous, ou un autre check pre-insert echoue.
- Fix : logger les raisons de skip cote serveur (4 branches : pas d'id, existant, dismissed, canton inconnu) et remonter un comptage par cause dans la reponse.

**F6. Message d'erreur persistant entre onglets modal**
- Fichier : `src/lib/components/prospection/ImportModal.svelte`
- Symptome : erreur Zefix affichee reste visible apres switch vers onglet SIMAP (meme zone de message partagee).
- Fix : reset message au change d'onglet (scope par tab).

**F7. Sidebar visible sur tablette (768px) -> contenu compresse a 528px**
- Fichier : layout principal (sidebar + content)
- Symptome : sidebar 240px toujours visible en viewport 768, laisse ~528px pour le contenu : table scrolle horizontalement de facon non-intentionnelle, cards et filtres OK car 2col.
- Fix : passer sidebar en burger collapsible < 1024px (pattern mobile deja en place, juste abaisser le breakpoint).
- Golden rule : **sidebar permanente >= 1024px, burger < 1024px**.

### P2 - Polish

**F8. Bouton "Enrichir cette page (23)" tronque en mobile**
- Reduit a icone + badge mais le compteur n'est plus lisible.
- Fix : afficher `(23)` inline apres icone ou en badge overlay, ne jamais cacher le compteur.

**F9. Touch targets 44px**
- Verifier les checkbox table (actuellement ~20px) -> augmenter hit-area a 44px via `before:absolute before:inset-[-12px]`.
- Filtres dropdowns : ~40px hauteur, juste sous la norme. Passer a `py-2.5` min.

---

## Golden Standards (a propager)

Regles issues de l'audit, applicables aux 5 autres pages :

### 1. Layout structurel

- **Sidebar** : permanente >= 1024px, burger < 1024px (breakpoint unique)
- **Container page** : `h-[calc(100dvh-var(--header-height)-3rem)]` + flex-col pour pages dataview
- **Gutter horizontal** : `px-4 md:px-6 lg:px-8`
- **CSS scoped obligatoire** pour le layout structurel (cf. decision 2026-03-xx, Tailwind v4 ne resout pas md:hidden sur sidebar)

### 2. Grilles responsives

- Cards workflow / stats : `grid-cols-2 lg:grid-cols-4 gap-3`
- Filtres multi-select : `grid-cols-2 lg:grid-cols-4 gap-3`
- Formulaires 2-columns : `grid-cols-1 md:grid-cols-2 gap-4`

### 3. Barres d'actions

- Toujours `flex flex-wrap gap-2 md:gap-3`
- Action "annuler/reset/deselectionner" : `w-full order-last md:w-auto md:ml-auto md:order-none`
- Actions primaires groupees a gauche, destructives a droite (desktop uniquement)

### 4. Sticky / fixed elements

- **Obligatoire** : fond opaque (`bg-white` ou surface), `border-b border-border`, optionnellement `shadow-sm` au scroll
- Zone sticky jamais au-dessus de 56px de hauteur sur mobile (sinon perte de contenu)

### 5. Slide-outs / modales

- Largeur : `w-full sm:max-w-md md:max-w-lg lg:max-w-xl` (adapte au contenu)
- Header sticky avec titre + bouton close, fond opaque, shadow au scroll
- Footer actions sticky bas si > 3 actions, sinon inline en fin de contenu
- Touch target bouton close : 44x44px min (zone cliquable, pas juste l'icone)

### 6. Tables

- Scroll horizontal interne (container overflow-x-auto) JAMAIS au niveau page
- Premiere colonne sticky si > 4 colonnes (`sticky left-0 bg-white`)
- Scrollbar visible par defaut (pas `scrollbar-hide`)
- Pagination footer sticky

### 7. Touch targets

- Minimum 44x44px sur tous les controles (WCAG 2.5.5 AAA)
- Checkboxes table : ajouter zone elargie via `::before` absolu
- Dropdowns/selects : `py-2.5` minimum = 40px + padding visuel

### 8. Messages / feedback

- Reset au changement de contexte (tab, panel, filtre)
- Accents francais obligatoires (`é è ê à ù ç ...`)
- Toast centre bas sur mobile, haut-droit sur desktop (pattern existant `toasts` store)

---

## Checklist de propagation par page

Pour chaque page (contacts, entreprises, pipeline, signaux, dashboard) :

- [ ] Verifier sidebar burger < 1024px
- [ ] Verifier absence d'overflow horizontal page-level (`document.documentElement.scrollWidth <= innerWidth`)
- [ ] Toute barre d'actions : `flex-wrap` + bouton "reset" en fin de liste avec pattern responsive
- [ ] Tous les sticky/fixed : fond opaque + border
- [ ] Slide-outs : header opaque, close 44px, footer actions adaptatif
- [ ] Tables : scroll interne, pas de debordement page
- [ ] Touch targets 44px audites
- [ ] Screenshots 3 viewports archives

---

## Methodologie reutilisable

Pour auditer une page :

```js
// 1. Detect overflow page-level
[window.innerWidth, document.documentElement.scrollWidth]
// scrollWidth doit etre <= innerWidth + 1

// 2. Detect elements qui debordent
const all = document.querySelectorAll('*');
const off = [];
for (const el of all) {
  const r = el.getBoundingClientRect();
  if (r.right > window.innerWidth + 2 && r.width < 1000) {
    off.push({tag: el.tagName, cls: el.className.slice(0,80), right: Math.round(r.right)});
  }
}
off.slice(0,10)
```

Viewports de reference : 1440, 768, 375 (desktop / tablette / mobile).
Chrome DevTools device emulation ignore min-width CSS du navigateur : tester egalement en vrai mobile safari/chrome si possible.
