# Spécifications : CRM FilmPro mobile (V1)

**Version :** 1.0
**Date :** 2026-04-27
**Statut :** Cadrage validé — implémentation V1 à venir
**Auteur cadrage :** Pascal + Claude (S121)

---

## 1. Vision et principe directeur

**Le CRM FilmPro doit être pleinement utilisable sur mobile depuis le 1er jour de production.**

Cas d'usage cibles (anticipés, FilmPro pas encore lancé) :

- Saisie de contact en mobilité (post-rencontre, post-RDV, post-appel)
- Recherche de prospects en temps mort (train, café, salle d'attente)
- Revue du pipeline avant/après un RDV

**Principe non négociable :** **pas d'UX mobile fondamentalement différente.**

Le mobile n'est pas une app distincte ; c'est l'app actuelle réduite proprement à un viewport étroit. Mêmes patterns, mêmes composants, mêmes parcours utilisateur. La hiérarchie visuelle, la navigation, et les écrans restent reconnaissables.

**Référence mentale :** Linear, Notion, Stripe Dashboard, Vercel Dashboard sur mobile. La sidebar collapse en drawer, le header garde sa place, les modales restent modales, les tables reflowent par priorité de colonnes.

**Ce que la V1 N'EST PAS :**

- Pas de bottom navigation
- Pas de FAB (Floating Action Button)
- Pas de sheets (bottom sheets) à la place des modales
- Pas de drawer hamburger latéral custom (le burger existant suffit)
- Pas d'écrans mobiles dédiés (création contact mobile, etc.)
- Pas de biométrie / WebAuthn
- Pas d'offline queue de création
- Pas de push notifications
- Pas de capture photo / geo / voice-to-text

Ces patterns mobile-natifs pourront entrer en V2+ si la mesure d'usage prouve un besoin réel terrain physique.

---

## 2. Périmètre V1

### 2.1 Pages concernées (toutes)

| Page | Stratégie responsive | Effort |
|---|---|---|
| `/` (dashboard accueil) | Vérification reflow grid + cartes | low |
| `/prospection` | Table → priorisation colonnes + filtres pliables | high |
| `/pipeline` | Table → priorisation colonnes (kanban reste vertical mobile) | high |
| `/contacts` | Table → priorisation colonnes + form création reflow | medium |
| `/entreprises` | Table → priorisation colonnes | medium |
| `/signaux` | Layout magazine → reflow vertical | medium |
| `/veille` | Layout magazine → reflow vertical (déjà partiellement responsive) | low |
| `/reporting` | Charts + tables → reflow vertical | medium |
| `/aide` | Texte + listes → vérification simple | low |

### 2.2 Création contact mobile

**Reformulation explicite :** la création de contact n'est PAS une feature mobile spécifique. C'est le formulaire desktop existant, qui doit fonctionner correctement en viewport mobile :

- Champs full-width sur mobile
- Type de clavier adapté (`type="email"`, `type="tel"`, etc.)
- Pas de débordement horizontal
- Modal full-width mobile (mais reste une modal, pas un sheet)
- Validation et messages d'erreur lisibles

Aucun écran "mobile contact creation" séparé.

### 2.3 Infrastructure mobile

**PWA légère :**

- `manifest.webmanifest` (nom, icônes 192/512, theme color, display=standalone)
- Service worker basique : cache assets statiques (CSS, JS, fonts, logos)
- Pas de cache data, pas d'offline queue, pas de sync différée

**Auth :** aucun changement. L'OTP email existant fonctionne déjà en mobile. Pas de WebAuthn / biométrie en V1 (pattern différent du desktop, hors principe directeur).

**Connectivité supposée :** 4G/5G en Suisse romande. Création contact en ligne uniquement.

---

## 3. État actuel du chrome global

**Vérification S121 (`+layout.svelte`)** : la fondation mobile existe partiellement.

✅ Existant :

- Sidebar avec slide-in mobile via `transform: translateX(-100%)` sous `max-width: 1023px`
- Burger toggle dans le header (`onMenuToggle`)
- Overlay mobile pour fermeture
- Auto-close sidebar sur navigation
- Padding main responsive (`p-4 md:p-6`)

🔧 À auditer/ajuster :

- Largeur sidebar mobile : actuellement `var(--sidebar-width)` (260px), peut être trop large sur iPhone SE (375px)
- Header height + tap targets boutons header
- Comportement scroll body quand drawer ouvert (lock obligatoire pour éviter scroll background)
- Z-index stack (sidebar 50, modales, toasts)

---

## 4. Stratégie responsive par type de composant

### 4.1 Tables (prospection, pipeline, contacts, entreprises, reporting)

**Pattern :** priorisation colonnes par breakpoint.

Pour chaque table, définir 3 niveaux :

- **Desktop (≥ 1024px)** : toutes les colonnes
- **Tablet (768-1023px)** : colonnes secondaires masquées
- **Mobile (< 768px)** : 2-3 colonnes essentielles maximum

**Règle cellule mobile :** le label de la colonne masquée n'apparaît PAS en cellule mobile (pas de transformation card-style, on ne change pas l'UX). La donnée est accessible en cliquant la ligne (fiche détail).

**Exemple priorisation `/contacts` :**

| Colonne | Desktop | Tablet | Mobile |
|---|---|---|---|
| Nom + prénom | ✓ | ✓ | ✓ |
| Entreprise | ✓ | ✓ | ✓ |
| Téléphone | ✓ | ✓ | – |
| Email | ✓ | – | – |
| Tag | ✓ | – | – |
| Dernière interaction | ✓ | – | – |
| Action (...) | ✓ | ✓ | ✓ |

**Détail des priorisations par page :** à définir dans la phase d'implémentation, page par page, avec mesure du contenu réel.

### 4.2 Filtres (prospection, pipeline, signaux, veille)

**Pattern actuel desktop :** filtres latéraux ou top bar avec multiples selects.

**Pattern mobile V1 :** mêmes filtres, layout vertical empilé, pas de bottom sheet. Bouton "Filtres" déclenche un panneau in-page (pas un overlay) ou un `<details>` natif. Choix concret à faire à l'implémentation selon page.

### 4.3 Modales (création/édition partout)

**Pas de transformation en sheet.**

- Modal centrée en desktop → modal full-width mobile (max-w garde-fou retiré sous breakpoint)
- Padding réduit `p-6 md:p-8` → `p-4 md:p-6`
- Boutons d'action : full-width mobile, alignés stack vertical
- Scroll interne du contenu si dépassement viewport

### 4.4 Layouts magazine (veille, signaux)

**Pattern desktop actuel :** grilles éditoriales (hero, colonnes, covers).

**Pattern mobile V1 :** reflow vertical natif. Les grilles Tailwind existantes (`grid grid-cols-3 md:grid-cols-2 sm:grid-cols-1`) prennent en charge le reflow. À auditer cas par cas pour vérifier hauteurs hero, ratios images, spacing entre items, lisibilité typo (typographie editorial peut rester, juste tailles ajustées si lecture difficile mobile).

### 4.5 Charts (reporting, dashboard)

**Pattern :** charts responsives natives (Chart.js / vanilla déjà responsive). Vérifier ratios, tooltips lisibles au tap, pas de débordement horizontal.

---

## 5. Performance budgets mobile

| Métrique | Cible mobile |
|---|---|
| LCP (Largest Contentful Paint) | < 2.5s sur 4G simulée |
| INP (Interaction to Next Paint) | < 200ms |
| CLS (Cumulative Layout Shift) | < 0.1 |
| Bundle JS par route | < 200kb gzipped |
| TTI (Time to Interactive) | < 3.5s sur 4G simulée |

**Outil de mesure :** Lighthouse CI sur viewport iPhone 14 (390×844) + 4G throttling.

**Gate CI :** non bloquante en V1 (audit manuel session par session). Bloquante post-V1 quand l'app sera stable.

---

## 6. Tests

### 6.1 Playwright mobile viewport

Étendre la suite Playwright e2e existante avec 2 viewports :

- iPhone 14 : 390×844, deviceScaleFactor 3, hasTouch true
- Pixel 7 : 412×915, deviceScaleFactor 2.625, hasTouch true

**Tests à ajouter (par viewport) :**

- Login OTP fonctionne mobile (champs + clavier)
- Navigation sidebar : burger ouvre, lien navigue, sidebar se ferme
- Liste prospection : scroll vertical fluide, tap ligne ouvre fiche
- Création contact : modal s'ouvre, champs accessibles, validation OK
- Pas de scroll horizontal sur aucune page

### 6.2 Audit chrome MCP visuel mobile

Pour chaque session de sweep responsive :

- Screenshot avant/après chaque page sous 390×844
- Vérification visuelle hiérarchie + lisibilité + tap targets
- Comparaison avec golden v5 (qui couvre desktop) — pas de divergence majeure mobile

---

## 7. Plan livraison V1 (4 sessions séquencées)

### Session A — Audit responsive existant + infra PWA légère

**Effort estimé :** ~1.5h, MIXTE

- [ ] Audit chrome MCP 8 pages × 2 viewports (iPhone 14 + Pixel 7) : screenshots + findings.md
- [ ] Audit chrome global (sidebar, header, drawer, overlay) : largeur, tap targets, scroll lock
- [ ] Manifest PWA + service worker basique cache assets
- [ ] Test installation PWA (Add to Home Screen) iOS + Android
- [ ] Critères acceptation : findings.md priorisé + PWA installable + 0 régression desktop

### Session B — Sweep pages "denses" (prospection, pipeline, entreprises, contacts)

**Effort estimé :** ~2h, MIXTE

- [ ] Définir matrice priorisation colonnes par page (4 tables)
- [ ] Implémenter masquage colonnes Tailwind (`hidden md:table-cell`, `hidden lg:table-cell`)
- [ ] Vérifier filtres reflow vertical mobile sans casser desktop
- [ ] Vérifier modales création/édition full-width mobile
- [ ] Tests Playwright mobile sur les 4 pages
- [ ] Critères : aucune table avec scroll horizontal, modales lisibles, filtres exploitables

### Session C — Sweep pages "magazine" (veille, signaux) + reporting

**Effort estimé :** ~1.5h, MIXTE

- [ ] Audit reflow vertical hero + grilles veille
- [ ] Audit reflow signaux (cards, timeline)
- [ ] Reporting : charts responsive + tables priorisées
- [ ] Tests Playwright mobile sur 3 pages
- [ ] Critères : reflow propre, lisibilité typo OK, charts non débordants

### Session D — Sweep dashboard + aide + perf gates + golden mobile

**Effort estimé :** ~1h, MIXTE

- [ ] Dashboard : reflow grid cartes
- [ ] Aide : vérification simple
- [ ] Lighthouse mobile sur 8 pages, comparaison budgets
- [ ] Extension golden v5 → annexe mobile (screenshots de référence 390×844)
- [ ] Update CLAUDE.md projet : V1 mobile livré, mesure usage à mettre en place
- [ ] Critères : tous budgets perf respectés (ou justifiés), golden mobile capturé, doc à jour

---

## 8. Hors scope V1 (explicite, à NE PAS dévier)

| Feature | Justification report V2+ |
|---|---|
| Bottom navigation | Pattern UX différent du desktop, contre principe directeur |
| FAB (Floating Action Button) | Idem |
| Bottom sheets en place de modales | Idem |
| Création/édition cards-style mobile | Idem |
| Biométrie / WebAuthn | Pattern différent, OTP suffit V1 |
| Offline queue de création | 4G/5G CH suffisant pour V1, complexité disproportionnée |
| Push notifications signaux/veille | Nice-to-have, dépend mesure usage |
| Photo intégrée création lead | Cas d'usage terrain physique non confirmé V1 |
| Géo-localisation | Idem |
| Voice-to-text notes | Idem |
| Caller ID intégré | Pattern natif, hors PWA léger |
| Édition pipeline mobile (drag étape) | Sync 2 sens, complexité hors V1 |
| Qualification lead mobile (chaud/écarter) | Workflow batch mieux desktop, V2 si besoin |
| Déclenchement import Zefix mobile | Rare en mobilité, garder bureau |

---

## 9. Métriques de succès V1

À mesurer post-déploiement, sur les 3 fondateurs FilmPro :

- **Adoption** : % de sessions hebdo en mobile vs desktop (cible : ≥ 20% S+8)
- **Friction** : nombre de création contacts mobile / nombre desktop (cible : ≥ 30% S+8)
- **Stabilité** : 0 bug mobile bloquant remonté sur les 8 premières semaines
- **Perf** : tous budgets section 5 respectés en prod

Si un seuil n'est pas atteint S+8 → ouvrir cadrage V2 ciblé sur le pain point identifié.

---

## 10. Risques identifiés et mitigations

| Risque | Mitigation |
|---|---|
| Tables prospection/pipeline trop denses, illisibles mobile même priorisées | Audit Session A montre faisabilité ; sinon fallback : fiche détail full-screen sur tap |
| Layout magazine veille s'écroule en vertical (hero hauteur trop grande) | Audit Session A : si > 80vh sur mobile, ratio 16:9 capé |
| Sidebar drawer 260px trop large sur iPhone SE (375px) | Reduire à 240px sous 380px viewport ou full-width drawer |
| PWA iOS Add to Home Screen UX médiocre vs App Store | Accepté V1 ; migration native possible V2 si adoption élevée |
| Régression desktop pendant sweep responsive | Tests Playwright desktop maintenus + audit chrome MCP desktop avant chaque commit |

---

## 11. Décisions structurelles tranchées (référence)

- **Pas d'UX mobile-spécifique.** Le mobile = desktop reflowé. Référence Linear/Notion/Stripe.
- **Burger sidebar existant suffit.** Pas de bottom nav.
- **Modales restent modales.** Pas de sheets.
- **OTP email actuel suffit V1.** Pas de biométrie.
- **Pas d'offline queue V1.** 4G/5G CH suffisant.
- **PWA légère manifest + service worker assets.** Pas de cache data.
- **Tables : priorisation colonnes,** pas transformation cards.
- **V1 = 4 sessions** ~6h cumulées, livraison séquencée.

---

## Annexes

- Branding et golden : `template/src/app.css` + `.claude/goldens/golden-v5.json`
- Layout actuel : `template/src/routes/(app)/+layout.svelte`
- Composants partagés : `template/src/lib/components/`
- Tests Playwright existants : `template/tests/e2e/`
- Specs métier prospection : `docs/SPECS_PROSPECTION.md`
