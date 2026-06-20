# Cadrage Phase 1 - Outil « Découpe Films » (chantier 2 portail FilmPro)

**Date** : 2026-06-05 · **Gate 1→2** : franchi (brief Pascal + Q1-Q4 tranchés).
**Source de vérité fonctionnelle** : `FilmPro_Brief_Dev_Optimiseur_Decoupe.md` v2.0 (2026-06-03), fourni par Pascal
(original : iCloud `Téléchargements/`). Ce fichier en est le hand-off intégré au pack.

## 1. Objet

Webapp d'**optimisation de découpe de films** pour FilmPro (traitements de vitrage). L'outil organise la
découpe des films pour **minimiser les chutes**, sur un chantier seul ou plusieurs chantiers consolidés.
**Aucun chiffrage, aucun prix, aucun devis** (le devis est un autre sujet, plus tard).

## 2. Workflow (3 étapes)

1. **Fiche chantier** (légère) : nom + rattachement client léger (champ libre).
2. **Saisie vitres** : L×H, quantité, type de vitrage (descriptif), produit appliqué (réf base produit),
   coche « à découper sur mesure chez le fournisseur » (o/n).
3. **Optimisation** : plan de découpe optimisé, chantier seul ou consolidé.

## 3. Règle structurante (la coche)

- coche = **non** → découpe interne → la vitre **entre dans le nesting**.
- coche = **oui** → sur-mesure fournisseur → **pas de nesting**, ajoutée à la liste de commande.
- **Garde-fou `nestable`** (attribut produit) : un produit non nestable (vernis, e-film/LCD) n'est **jamais**
  nesté, quelle que soit la coche ; s'il est laissé en interne par erreur → **alerte d'incohérence**.

## 4. Base produit (descriptive, pas tarifaire)

réf interne · famille (solaire/sécurité/discrétion) · fabricant · fournisseur · **laize(s)** (1..n) ·
orientation imposée (o/n) · jointage autorisé (o/n) · **nestable** (o/n) · **marge de pose** · **recouvrement de joint**.

## 5. Algorithme

Strip-packing 1D (laize fixe, longueur à minimiser), **heuristique maison** (First-Fit Decreasing + étagères/skyline) -
pas d'optimum mathématique, résultat fiable et **explicable**. Multi-laizes (teste, garde la meilleure),
rotation si orientation libre, pièce trop large → lés jointés (si autorisé) ou signalée non plaçable.
Pseudo-code de référence : brief §6.5.

## 6. Sortie

Par produit : plan de placement (x,y,rotation) · longueur de rouleau · **taux de chute** · pièces « pose en lés ».
Transversal : **liste de commande fournisseur** (sur-mesure + non nestables) · **alertes** (non plaçable, incohérences).

## 7. Décisions de cadrage (Q1-Q4, validées Pascal 2026-06-05)

- **Q1 - Intégration** : ce N'EST PAS un module siloé. Le brief parlait de « module autonome » mais a été
  rédigé par un autre Claude **sans le contexte de ce projet CLI** ; on ne s'y tient pas. Découpe Films est un
  **outil du portail FilmPro** (même app SvelteKit, même base Supabase, **entrée par la card existante**,
  route `/decoupe`). Il pourra s'intégrer au référentiel/CRM **quand utile** ; le rattachement client reste un
  **champ léger optionnel** pour l'instant. → ADR-0001.
- **Q2 - Simplicité** : outil simple, **zéro champ sans utilité**. Les attributs descriptifs additionnels de la
  base produit (microns, finition…) ne sont **pas** ajoutés au MVP ; un champ `notes` libre suffit. Enrichissement
  **au fil de l'eau une fois en prod**, selon besoins réels.
- **Q3 - Consolidation « suggérée »** : critère = chantiers **« non lancés »** uniquement (statut `en_saisie`),
  **sans** fenêtre de temps. (Ajout possible plus tard.)
- **Q4 - Recouvrement de joint (pose en lés)** : champ **porté par le produit**, **valeur par défaut 0**,
  **intégré aux calculs** de découpe (la largeur d'un joint s'ajoute à la matière consommée quand une vitre est
  posée en plusieurs lés). À 0 : partage géométrique pur, pas de chevauchement.
- **Q5 - Sortie PDF** : **export PDF du plan EN SCOPE** (pas seulement l'impression navigateur). Approche
  vectorielle côté client (ADR-0005). Le **template FilmPro est à valider avec Pascal** au moment opportun de
  la séquence de livrables (checkpoint Phase 3, une fois l'écran d'optimisation fonctionnel).

## 8. Hors-scope (no-debt, nommé)

- Aucun prix / chiffrage / devis.
- Pas de lien CRM dur (FK référentiel) au MVP - rattachement client = champ libre, branchable plus tard.
- Pas de persistance du plan de découpe (recalculé à la demande, déterministe) - cf. ADR-0002.
- Pas d'attributs produit au-delà du minimum (Q2).
- Pas de fenêtre de temps pour la consolidation suggérée (Q3).
