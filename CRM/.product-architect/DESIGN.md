# DESIGN.md - CRM FilmPro mobile V3 « outil terrain »

**Date** : 2026-05-31
**Phase** : 1 product-architect (design system sémantique)
**Stack** : SvelteKit + Tailwind v4 (utilities) + CSS scoped Svelte (layout structurel) + Lucide
**Statut** : artefact de référence design. À valider visuellement via `golden-standard.html` + smoke iPhone Pascal (AC-017).

> Document sémantique anti-generic UI : il décrit le **rôle** de chaque composant et de chaque token, pas une recette CSS générique. Le DESIGN.md prime sur l'intuition : si une décision visuelle n'est pas justifiable par un principe ci-dessous, elle est rejetée.

---

## 0. Source de vérité et doctrine

**La V3 ne crée AUCUN nouveau thème.** Elle réutilise les tokens existants de `src/app.css` (`@theme`). Source unique. `theme-tokens.css` (ce dossier) n'est qu'un pointeur + extrait : on lit toujours `app.css`.

Doctrine de mise en œuvre (gravée projet, `feedback_crm_styling_doctrine`) :

1. **Tailwind utilities** pour le détail réutilisable via tokens : spacing, couleurs, typo, états, responsive trivial côté contenu. Jamais d'off-grid (`p-[13px]` interdit).
2. **`<style>` scoped Svelte** pour le layout structurel : `MobileShell`, `MobileTabBar`, en-têtes sticky, grille de cartes, `NativeActionBar`. Plus keyframes/transitions (token `--ease-out-expo`), pseudo-éléments, `:global()` ciblés.
3. **Primitives = source unique** (`Button` / `Input` / `Card` / `Modal`). On compose, on ne re-style pas. Un `MobileTabBar` n'invente pas son bouton : il compose.
4. **Interdits durs** : pas de CSS global ad hoc hors `app.css`, jamais `!important`, jamais une classe qui duplique un token (`.text-gris-clair { color:#6B7280 }` au lieu de `text-[var(--color-text-muted)]` est un bug).

Le mobile **lit** le référentiel (entreprises, contacts, opportunités, activités) et **écrit uniquement** la trace terrain (visite + photo + contact en brouillon). Toute UI qui suggère une écriture hors de ce périmètre est un anti-pattern (cf. § 6).

---

## 1. Principes de direction

Le contexte d'usage gouverne tout : **debout, une main, en mouvement, plein soleil, réseau incertain, 30 s à 2 min entre deux portes**. Ce n'est pas un CRM de bureau réduit, c'est un instrument de terrain. La V2 a échoué parce qu'elle a porté la densité du desktop. La V3 inverse la logique.

**P1 - Lisibilité terrain avant tout.** Texte ≥ 16 px partout (jamais de méta à 12 px). Contraste réel AA (≥ 4.5:1) sur chaque couple texte/fond, vérifié, pas supposé. Aucun gris pâle décoratif. En plein soleil, un texte gris clair sur fond blanc disparaît : on n'en met pas.

**P2 - Une intention par écran.** Chaque écran répond à une seule question et propose une seule action dominante. « À faire » = qui je vois aujourd'hui. « Fiche » = qui c'est + une action terrain. « Compte-rendu » = je laisse une trace. Pas de second CTA qui rivalise avec le premier.

**P3 - Densité minimale assumée.** On montre le strict nécessaire à la décision terrain. Un `AFaireRow` = un titre (entreprise) + une seule ligne de contexte. Pas de badges multiples, pas de score, pas de tags. Ce qui n'aide pas à décider sur place est retiré, pas réduit.

**P4 - Le pouce est la souris.** Toute cible interactive ≥ 44 px (`--mobile-touch-min`, AC-012). Actions dominantes en bas de l'écran (zone du pouce), navigation en `MobileTabBar` bas. Rien d'important dans le coin supérieur, hors d'atteinte d'une main.

**P5 - Hiérarchie par la taille et le poids, pas par la couleur.** Le titre est gros et fort ; le contexte est plus petit et muted ; l'action est un bloc plein coloré. La couleur sert les états (envoi photo, résultat), jamais à hiérarchiser le texte courant.

**P6 - Honnêteté des états.** Pas d'offline V3 (ADR-0006) : l'état d'envoi est toujours visible et vrai. Une photo en échec dit « échec, réessayer », jamais un faux succès. La note saisie n'est jamais perdue (AC-011).

**P7 - Composer, pas réinventer.** Chaque composant V3 nommé ci-dessous compose les primitives existantes. Le naming est sémantique (`CompteRenduCTA`, pas `BigBlueButton`) pour que l'intention survive au refactor.

---

## 2. Hiérarchie typographique sémantique

Police unique de texte : **DM Sans** (`--font-sans`). **DM Mono** (`--font-mono`) réservée aux valeurs techniques rares (heure de check-in, identifiant). Plancher absolu : **16 px** (`--mobile-text-min`) - aussi pour éviter le zoom auto iOS sur les champs.

| Rôle sémantique | Usage | Taille | Poids | Couleur token | Tailwind |
|---|---|---|---|---|---|
| `titre-ecran` | Titre d'écran (en-tête sticky : « À faire », raison sociale fiche) | 22 px / 28 lh | 700 | `--color-text` | `text-[22px] leading-7 font-bold` |
| `titre-entite` | Nom d'entreprise dans une ligne de liste (`AFaireRow`, `EntrepriseResultRow`) | 18 px / 24 lh | 600 | `--color-text` | `text-[18px] leading-6 font-semibold` |
| `corps` | Note, libellé d'option, contenu lisible | 16 px / 24 lh | 400 | `--color-text-body` | `text-base leading-6` |
| `contexte` | Ligne secondaire d'une ligne de liste (titre opportunité + date relance) | 16 px / 22 lh | 400 | `--color-text-muted` | `text-base text-[var(--color-text-muted)]` |
| `label-action` | Texte d'un bouton plein (CTA, action native) | 17 px | 600 | selon fond (voir § 3) | `text-[17px] font-semibold` |
| `meta-technique` | Heure check-in, identifiant brut | 15 px | 500 | `--color-text-muted` | `font-mono text-[15px]` |

Règles dures :

- **Le `contexte` muted reste ≥ 16 px.** Le muted en V3 = ton plus bas en hiérarchie, pas plus petit que le plancher. `--color-text-muted` (#6B7280) sur `--color-surface` (#FFFFFF) = 4.83:1 (AA OK). Sur `--color-surface-alt` (#F9FAFB) le ratio reste ≥ 4.5:1, vérifié au gate axe-core.
- **Un seul `titre-ecran` par écran.** Toujours dans l'en-tête sticky.
- **Pas de texte tout-en-capitales** sauf micro-label de section (≤ 2 mots), letter-spacing léger, taille ≥ 13 px et couleur `--color-text` (jamais muted en capitales : illisible terrain).
- **Troncature** : `titre-entite` peut tronquer en une ligne (`truncate`) ; `contexte` tronque en une ligne aussi. Jamais de retour à la ligne qui repousse les actions sous le pli.

---

## 3. Système de couleurs sémantique

La palette V3 est volontairement **sobre et fonctionnelle**. Le bleu FilmPro porte l'action ; les couleurs d'état (vert/orange/rouge) portent **uniquement** le cycle d'envoi photo et le retour d'enregistrement. Aucune couleur décorative.

### 3.1 Rôles

| Token | Hex | Rôle sémantique V3 | Texte posé dessus |
|---|---|---|---|
| `--color-primary` | #2F5A9E | Action dominante : `CompteRenduCTA`, `EnregistrerVisite`, onglet actif, lien d'action | `--color-text-inverse` (#FFF) : ratio 5.9:1 AA OK |
| `--color-primary-hover` | #264C85 | État pressed des CTA (active sur mobile = pressed) | blanc, ratio > 7:1 |
| `--color-surface` | #FFFFFF | Fond des cartes, fiche, formulaires | `--color-text` 16.1:1 |
| `--color-surface-alt` | #F9FAFB | Fond d'écran liste, fond derrière les cartes | `--color-text` ~15.4:1 |
| `--color-border` | #E5E7EB | Séparateurs, contour de carte, hairline | n/a (non textuel) |
| `--color-text` | #111827 | Titres (`titre-ecran`, `titre-entite`) | - |
| `--color-text-body` | #374151 | Corps, notes | - |
| `--color-text-muted` | #6B7280 | Contexte, méta - **jamais sous 16 px** | - |
| `--color-success` | #12B76A | État photo « envoyé » + confirmation enregistrement | usage **icône + pastille**, pas texte fin |
| `--color-warning` | #F79009 | État photo « envoi… » | usage icône/pastille, pas texte fin sur blanc |
| `--color-danger` | #F04438 | État photo « échec → réessayer » | texte autorisé : #F04438 sur blanc = 4.51:1 (AA limite, OK) |

### 3.2 États d'envoi photo (`PhotoUploadState`) - contrat couleur

Trois états mutuellement exclusifs, chacun = **icône Lucide + couleur + libellé court**. La couleur ne porte jamais seule l'information (P5, redondance icône+texte pour AA + daltonisme).

| État | Couleur | Icône Lucide | Libellé | Fond pastille |
|---|---|---|---|---|
| `envoi` | `--color-warning` | `loader` (spin) | « Envoi… » | `--color-warning-light` (#FFFAEB) |
| `envoye` | `--color-success` | `check` | « Envoyé » | `--color-success-light` (#ECFDF3) |
| `echec` | `--color-danger` | `rotate-cw` | « Réessayer » | `--color-danger-light` (#FEF3F2) |

Contrainte AA sur les pastilles : le libellé de pastille s'écrit en **variante texte foncée** sur le fond pastel clair, jamais l'accent vif (#F79009) en texte fin sur blanc (échoue 4.5:1). Pour « Envoi… » sur `--color-warning-light`, le libellé utilise `--color-text-body`. Règle générale : **accent vif réservé à l'icône et au bord ; texte = ton foncé sur pastel** (`feedback_a11y_deep_tokens_with_axe_gate`).

### 3.3 Garde-fous contraste (gate axe-core, AC-012)

- Tout couple texte/fond passe **≥ 4.5:1** (texte normal) ou **≥ 3:1** (texte ≥ 24 px bold / éléments UI).
- Aucun accent vif (`success`/`warning`) en **texte** sur fond clair sans variante foncée vérifiée.
- Les bords de champ utilisent `--color-border-input` (#ADB5BD, ~3:1) - conforme WCAG 2.2 AA 1.4.11 composants UI.
- Zéro couple inventé : si un nouveau couple apparaît, il est ajouté ici avec son ratio mesuré avant d'être codé.

---

## 4. Spécification des composants

Convention : chaque composant liste **rôle**, **anatomie**, **états**, **dimensions**. Cibles tactiles ≥ 44 px (`--mobile-touch-min`). Le layout structurel (shell, tabbar, en-têtes, grilles, action bar) = `<style>` scoped Svelte ; le détail = Tailwind utilities via tokens.

### 4.1 `MobileShell`

- **Rôle** : conteneur racine de l'expérience mobile. Pose la zone de contenu scrollable, l'en-tête sticky de l'écran courant, et réserve l'espace bas pour `MobileTabBar` + encoche iPhone.
- **Anatomie** :
  - `header` sticky haut (hauteur libre, contient le `titre-ecran` + éventuel bouton retour `chevron-left` à gauche en mode drill-down).
  - `main` scrollable vertical (gutter latéral = `--mobile-gutter` 16 px).
  - réserve basse = `--mobile-tabbar-h` (56) + `--mobile-safe-bottom` (encoche).
- **États** : `racine` (tabbar visible) / `drill-down` (bouton retour visible, tabbar conservée). Pas d'état plein écran modal hors `Modal` primitive.
- **Dimensions** : largeur 100 %, max ergonomique mono-colonne. En-tête sticky garde une hairline `--color-border` en bas au scroll (`box-shadow: var(--shadow-sm)` apparaissant après défilement).
- **Mise en œuvre** : `<style>` scoped (sticky, safe-area, padding-bottom). Layout structurel = jamais Tailwind responsive seul (doctrine : `md:hidden` ne suffit pas pour le structurel en Tailwind v4).

### 4.2 `MobileTabBar`

- **Rôle** : navigation racine, **exactement 2 onglets**. C'est la seule navigation primaire. Aucun menu burger (anti-pattern § 6).
- **Anatomie** : barre fixe bas, 2 cellules égales. Chaque cellule = icône Lucide (24 px) au-dessus d'un libellé (13 px). Onglets :
  1. **À faire** - icône `list-checks`.
  2. **Rechercher** - icône `search`.
- **États par onglet** : `actif` (icône + libellé `--color-primary`, indicateur supérieur 2 px `--color-primary`) / `inactif` (`--color-text-muted`) / `pressed` (fond `--color-surface-alt` bref). Pas d'état badge sur la tabbar mobile (le compteur de suggestions vit côté desktop, § 4.10).
- **Dimensions** : hauteur `--mobile-tabbar-h` (56) + padding bas `--mobile-safe-bottom`. Cible tactile par cellule ≥ 44 px (toute la cellule est cliquable).
- **Mise en œuvre** : `<style>` scoped (position fixed bas, safe-area, grille 2 colonnes). Bouton = primitive `Button` variant ghost, composée.

### 4.3 `AFaireList`

- **Rôle** : écran d'accueil. Liste des entreprises à voir aujourd'hui = **relances dues** (ADR-0005, pas d'agenda planifié). Données : `load` réutilisant la requête relances du desktop.
- **Anatomie** : `titre-ecran` « À faire » + compteur discret (« 4 relances »), puis liste verticale de `AFaireRow` séparés par hairline `--color-border`, gap vertical `--mobile-row-gap` (12).
- **États** :
  - `loading` : 3-4 squelettes de ligne (blocs `--color-surface-alt` animés, pas de spinner plein écran).
  - `empty` : illustration minimale + message « Rien à relancer aujourd'hui » en `corps` + ligne `contexte` « Cherche une entreprise via l'onglet Rechercher ». Jamais un écran vide nu.
  - `error` : bandeau sobre « Impossible de charger. Réessayer » + bouton réessayer (primitive `Button` secondaire).
- **Dimensions** : pleine largeur, gutter `--mobile-gutter`.

### 4.4 `AFaireRow`

- **Rôle** : une entrée actionnable de la liste « À faire ». Drill-down vers `EntrepriseFiche`.
- **Anatomie** (une seule colonne d'info, un seul affordance) :
  - ligne 1 : `titre-entite` = raison sociale (truncate 1 ligne).
  - ligne 2 : `contexte` muted = `titre opportunité · relance le {date relative}` (truncate 1 ligne).
  - chevron `chevron-right` muted à droite (affordance drill-down), non interactif seul (toute la ligne tape).
- **États** : `default` / `pressed` (fond `--color-surface-alt`) / `disabled` (rare : ligne en cours de retrait, opacité réduite, non tapable).
- **Dimensions** : hauteur min ≥ 64 px (confort terrain > 44 px mini), zone tap = ligne entière. Padding vertical 12, horizontal `--mobile-gutter`.
- **Interdit** : pas de second bouton dans la ligne, pas de badge score, pas de menu kebab. Une ligne = une cible.

### 4.5 `EntrepriseSearchField`

- **Rôle** : champ unique de recherche entreprise (onglet Rechercher). Un seul champ, debounce.
- **Anatomie** : primitive `Input` composée, icône `search` à gauche, bouton `x` (effacer) à droite quand non vide. Placeholder « Nom d'entreprise ». Autofocus à l'ouverture de l'onglet.
- **États** : `vide` (placeholder, pas de résultats) / `saisie` (debounce ~300 ms avant requête `GET /api/entreprises/search?q=`, cap 20) / `chargement` (spinner inline discret dans le champ, droite) / `aucun résultat` (« Aucune entreprise pour "{q}" » + lien `ContactBrouillonForm` si pertinent).
- **Dimensions** : hauteur ≥ 48 px, texte saisi ≥ 16 px (`--mobile-text-min`, anti-zoom iOS). Pleine largeur moins gutter.
- **Mise en œuvre** : Tailwind utilities sur la primitive `Input` ; aucun re-style du champ de base.

### 4.6 `EntrepriseResultRow`

- **Rôle** : un résultat de recherche. Drill-down vers `EntrepriseFiche`.
- **Anatomie** : `titre-entite` = raison sociale + `contexte` muted = `canton · localité` (truncate). Chevron `chevron-right`. Même grammaire visuelle que `AFaireRow` (cohérence : une ligne = une entité = un tap).
- **États** : `default` / `pressed`. Pas de loading par ligne (le loading vit dans le champ).
- **Dimensions** : identiques à `AFaireRow` (hauteur min 64 px, tap pleine ligne).

### 4.7 `EntrepriseFiche`

- **Rôle** : fiche en **lecture seule** d'une entreprise (qui c'est, où, opportunité en cours, historique terrain) + point de départ du compte-rendu. Aucune édition de champ structurant (hors-scope, ADR/PRD § 9).
- **Anatomie (de haut en bas)** :
  1. **En-tête** : `titre-ecran` raison sociale + ligne `contexte` `canton · adresse` (tapable → ouvre `NativeActionBar` Itinéraire). Bouton retour `chevron-left` dans le header sticky.
  2. `NativeActionBar` (§ 4.8) : 3 actions natives, juste sous l'en-tête (zone haute mais actions rapides one-tap).
  3. `OpportunitesEnCours` : liste compacte des opportunités ouvertes (titre + étape, lecture seule). Vide → bloc retiré (pas de « aucune opportunité » bavard ; on n'affiche pas une section vide).
  4. `HistoriqueTerrain` : timeline fusionnée visites + activités, antéchronologique. Chaque entrée = `corps` (résultat/type) + `meta-technique` (date, auteur). Charge paresseuse / repliable si > 5 entrées.
  5. **CTA dominant bas** : `CompteRenduCTA` (§ 4.9), sticky en bas au-dessus de la tabbar.
- **États** : `loading` (squelette en-tête + barre d'actions grisée) / `chargé` / `error` (bandeau réessayer).
- **Dimensions** : contenu scrollable, `CompteRenduCTA` sticky bas (n'est jamais poussé sous le pli).

### 4.8 `NativeActionBar`

- **Rôle** : 3 actions natives iOS one-tap : **Appeler**, **Itinéraire**, **Email**. Déclenchent les schemes natifs (`tel:`, plan/maps, `mailto:`).
- **Anatomie** : rangée de 3 boutons pleins égaux. Chaque bouton = icône Lucide (`phone` / `navigation` / `mail`) + `label-action`. Primitive `Button` variant solid, composée.
- **États** :
  - `default` (donnée présente) : fond `--color-primary`, texte blanc, tapable.
  - `disabled` (donnée absente : pas de téléphone / pas d'adresse / pas d'email) : **grisé** (fond `--color-surface-alt`, texte `--color-text-muted`, non tapable, `aria-disabled`). On ne masque pas le bouton (la place reste stable) ; on le grise. C'est honnête : « pas de numéro » se voit.
  - `pressed` : `--color-primary-hover`.
- **Dimensions** : hauteur ≥ 48 px, 3 colonnes égales avec gap 8, cible ≥ 44 px par bouton.
- **Mise en œuvre** : layout 3 colonnes = `<style>` scoped (grille structurelle) ; boutons = primitive composée.

### 4.9 `CompteRenduCTA`

- **Rôle** : action dominante de la fiche. Ouvre `CompteRenduForm`. Un seul CTA, sans rival (P2).
- **Anatomie** : bouton pleine largeur, icône `clipboard-pen` + libellé « Compte-rendu de visite ». Fond `--color-primary`, texte blanc, `label-action`.
- **États** : `default` / `pressed` (`--color-primary-hover`) / `disabled` (jamais en pratique : toujours possible de loguer une visite depuis une fiche).
- **Dimensions** : hauteur `--mobile-cta-h` (52), sticky bas, gutter latéral, marge `--mobile-safe-bottom` quand au-dessus de la tabbar absente (fiche = drill-down, tabbar conservée → CTA s'empile au-dessus).

### 4.10 `CompteRenduForm`

- **Rôle** : saisie d'une visite terrain en ≤ 2 min. Écrit dans `prospect_visits` (resultat + note + lat/lng optionnels) + photos via `prospect_photos`. Objectif global : visite complète ≤ 5 taps depuis la fiche (PRD § 2).
- **Anatomie (ordre de saisie)** :
  1. `ResultatRadio` (§ 4.10.1) - obligatoire.
  2. `NoteField` (§ 4.10.2) - optionnel.
  3. `PhotoCapture` (§ 4.10.3) - optionnel.
  4. `EnregistrerVisite` (§ 4.10.4) - CTA bas dominant.
- **États** : `vierge` / `valide` (résultat choisi → `EnregistrerVisite` actif) / `enregistrement` (CTA en loading) / `erreur` (bandeau, note + photo conservées, AC-011).
- **Dimensions** : formulaire mono-colonne, gutter `--mobile-gutter`, `EnregistrerVisite` sticky bas.

#### 4.10.1 `ResultatRadio`

- **Rôle** : choix **fermé** du résultat de visite (4 options, enum CHECK BDD). Pas de champ libre, pas d'option « Autre » (interdit, `feedback_no_autre_in_lists`).
- **Anatomie** : 4 gros boutons tap empilés (ou grille 2x2), chacun = libellé `corps`/`label-action` + icône d'état au choix. Un seul sélectionnable.
- **États** : `non sélectionné` (bord `--color-border`, fond `--color-surface`) / `sélectionné` (bord + fond `--color-primary-light`, texte `--color-text`, icône `check` `--color-primary`) / `pressed`.
- **Dimensions** : chaque bouton hauteur ≥ 52 px (gros tap terrain), texte ≥ 16 px.

#### 4.10.2 `NoteField`

- **Rôle** : note courte de visite, compatible **dictée iOS native** (pas de transcription custom, hors-scope). Écrit `note TEXT` (≤ 2000).
- **Anatomie** : primitive `Input` en mode `textarea`, label `corps` « Note (optionnel) », hint discret « micro iOS dispo via clavier ». Compteur de caractères discret si > 1800.
- **États** : `vide` / `saisie` / `max atteint` (compteur `--color-danger`, blocage doux à 2000). Texte ≥ 16 px (anti-zoom).
- **Dimensions** : hauteur min ~3 lignes, auto-grow raisonnable.

#### 4.10.3 `PhotoCapture`

- **Rôle** : capture via **appareil photo natif** + grille de vignettes avec état d'envoi par photo. Réutilise `prospect_photos` (max 10/owner, URLs signées). Pas de file de synchro offline (ADR-0006) : état visible, retry par photo.
- **Anatomie** :
  - bouton « Prendre une photo » (icône `camera`, primitive `Button` secondaire) qui ouvre la capture native iOS.
  - grille de vignettes (carrés, gap 8) ; chaque vignette porte un `PhotoUploadState` (§ 3.2) en surimpression bas.
- **États (grille)** : `vide` (juste le bouton capture) / `1..10 vignettes` / `plein` (bouton capture grisé à 10, libellé « 10 max »).
- **États (par vignette = `PhotoUploadState`)** : `envoi` (overlay `loader` + voile) / `envoye` (badge `check` vert coin) / `echec` (badge `rotate-cw` rouge + tap vignette = réessayer l'upload). La photo en échec **reste affichée** ; la note n'est jamais perdue (AC-011).
- **Dimensions** : vignettes ≥ 72 px de côté, badge d'état ≥ 24 px (lisible), zone tap retry = vignette entière (≥ 44 px).

#### 4.10.4 `EnregistrerVisite`

- **Rôle** : valide et écrit la visite. CTA dominant bas.
- **Anatomie** : bouton pleine largeur, libellé « Enregistrer la visite », fond `--color-primary`. Capture GPS (lat/lng) en arrière-plan si autorisé (optionnel, jamais bloquant).
- **États** : `disabled` (aucun résultat choisi : `--color-surface-alt` / texte muted) / `default` (résultat choisi) / `loading` (spinner inline + libellé « Enregistrement… », non re-tapable) / `pressed`.
- **Dimensions** : hauteur `--mobile-cta-h` (52), sticky bas, safe-area.

### 4.11 `ContactBrouillonForm`

- **Rôle** : capturer un décideur croisé sur place **en brouillon**. Crée une `contact_suggestions` statut `en_attente` (ADR-0003). **Jamais** une ligne `contacts` directe (anti-doublon, PRD § 2).
- **Anatomie** : champs **minimaux** (nom, fonction, téléphone, email) ; **au moins un identifiant requis** (nom OU téléphone OU email). Bouton « Enregistrer le contact » → file de validation.
- **États** : `vide` / `invalide` (aucun identifiant : CTA disabled + hint « Renseigne au moins un nom, un téléphone ou un email ») / `valide` / `enregistrement` / `succès` (toast sobre « Contact à valider au bureau »).
- **Dimensions** : mono-colonne, champs ≥ 48 px, texte ≥ 16 px.
- **Interdit** : pas de champ « Autre », pas d'édition d'entité existante via ce form.

### 4.12 `ContactSuggestionsBadge` (desktop)

- **Rôle** : compteur des `contact_suggestions` `en_attente`, affiché **côté desktop** (pas sur la tabbar mobile). Signale « N contacts terrain à valider ».
- **Anatomie** : pastille compteur sur l'entrée de navigation desktop concernée. `--color-primary` (ou `--color-danger` si on veut l'urgence ; défaut `--color-primary` sobre). Texte blanc, ≥ 13 px.
- **États** : `0` (badge masqué) / `1..n` (compteur visible) / `99+` (cap d'affichage).
- **Dimensions** : pastille ronde ≥ 20 px.

### 4.13 `ContactSuggestionQueue` (desktop)

- **Rôle** : file de validation desktop. Pour chaque suggestion : **valider / rejeter / fusionner en 1 clic** (`POST /api/contact-suggestions/[id]/resolve`).
- **Anatomie** : liste de cartes suggestion. Chaque carte = identité brouillon (nom/fonction/contacts) + entreprise rattachée + 3 actions : `Valider` (crée la ligne `contacts`), `Rejeter`, `Fusionner` (rapproche d'un contact existant). Décrémente `ContactSuggestionsBadge` à la résolution.
- **États** : `en_attente` (actionnable) / `résolution en cours` (actions grisées, spinner) / `résolu` (carte retirée de la file) / `file vide` (« Aucun contact terrain à valider »).
- **Dimensions** : composant desktop (hors contrainte 44 px mobile, mais cibles cliquables confortables).
- **Note** : ce composant et `ContactSuggestionsBadge` sont la **contrepartie desktop** du flux terrain. Ils ferment la boucle « j'écris un brouillon mobile → je le valide proprement au bureau » et garantissent le 0 doublon (PRD § 2).

---

## 5. Patterns d'interaction

**Navigation = drill-down strict + retour explicite.** Profondeur max 2 : liste (À faire / Rechercher) → fiche → form (compte-rendu / brouillon). Retour = bouton `chevron-left` dans l'en-tête sticky + swipe-back iOS natif (jamais désactivé). La tabbar reste visible en drill-down (on peut toujours rebasculer d'onglet).

**Tap, et rien d'autre.** Une seule cible par ligne (la ligne entière). **Aucun geste complexe** : pas de swipe-to-action, pas de long-press, pas de pincement, pas de drag-and-drop (le kanban reste desktop). Le terrain, une main, ne maîtrise pas les gestes fins.

**Action dominante en bas.** Les CTA (`CompteRenduCTA`, `EnregistrerVisite`) sont sticky bas, dans la zone du pouce. La navigation primaire (`MobileTabBar`) aussi.

**Feedback immédiat et honnête.** Tout tap a un état `pressed`. Tout envoi a un état visible (P6). Toast de confirmation sobre après écriture (visite enregistrée, contact à valider). Jamais de faux succès.

**Pull-to-refresh : optionnel.** Sur `AFaireList` uniquement (rafraîchir les relances dues). Implémentation native iOS si triviale ; sinon bouton « Actualiser » discret. Pas un prérequis de livraison.

**Saisie au plancher 16 px.** Tout champ texte est ≥ 16 px pour empêcher le zoom auto iOS qui casse le layout terrain.

**Dictée plutôt que frappe.** `NoteField` invite explicitement à la dictée iOS native : taper au clavier debout en visite est pénible, la voix est le mode attendu.

---

## 6. Anti-patterns interdits

Ces interdits sont **durs** : un livrable qui en contient un est recalé, même si « ça marche ».

1. **La densité V2.** Pas de page qui empile badges, score, tags, métadonnées multiples sur une ligne. Une `AFaireRow` = titre + une ligne de contexte. Tout ajout doit prouver qu'il aide à décider sur le terrain.
2. **Le menu burger.** Aucun menu hamburger, aucun tiroir latéral de navigation. La navigation = 2 onglets, point.
3. **Plus de 2 onglets.** `MobileTabBar` est figée à 2 cellules (À faire / Rechercher). Un 3e onglet = signe qu'on re-porte du desktop.
4. **Accent vif sur fond clair sans vérif ratio.** Jamais `--color-warning` (#F79009) ou `--color-success` (#12B76A) en **texte** sur blanc/clair sans variante foncée mesurée. L'accent vif est réservé aux icônes/bords/pastilles. Tout nouveau couple passe le gate axe-core (§ 3.3) avant d'être codé.
5. **L'option « Autre ».** Interdite dans `ResultatRadio` et tout select/dropdown (pollue les données, casse filtres et scoring desktop). Enum fermé uniquement.
6. **Texte sous 16 px.** Aucune méta, aucun libellé courant sous le plancher `--mobile-text-min`. Le muted descend en hiérarchie par la couleur, pas par la taille.
7. **Cible tactile sous 44 px.** Aucun bouton, lien ou ligne tapable sous `--mobile-touch-min`.
8. **Écriture hors périmètre terrain.** Aucune UI mobile qui édite un champ structurant (statut pipeline, score, qualification, raison sociale) ni ne crée/édite directement une entreprise ou un contact. Le mobile lit le référentiel et écrit la trace terrain (visite + photo + brouillon), rien d'autre (PRD § 9).
9. **Geste complexe.** Pas de swipe-to-action, long-press, drag-and-drop sur mobile.
10. **CSS hors doctrine.** Pas de CSS global ad hoc hors `app.css`, jamais `!important`, jamais une classe qui duplique un token, jamais un nouveau thème (divergence interdite, on lit `app.css`).
11. **Faux état d'envoi.** Pas de « succès » optimiste sur une photo non confirmée. L'état reflète la réalité réseau (P6, ADR-0006).
12. **Second CTA rival.** Un écran = une action dominante. Pas deux CTA pleins de même poids qui se disputent l'attention.

---

## Annexe - Inventaire Lucide utilisé

`list-checks`, `search`, `chevron-right`, `chevron-left`, `phone`, `navigation`, `mail`, `clipboard-pen`, `camera`, `loader`, `check`, `rotate-cw`, `x`. Stroke par défaut Lucide ; taille 24 px (nav/actions), 20-24 px (états), conformément à la sémantique d'icône du projet (icône = marqueur ou action, jamais redondance pure avec la couleur seule, `feedback_lucide_check_semantics`).
