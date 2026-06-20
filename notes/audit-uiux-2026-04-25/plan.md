# Audit UX/UI — Plan

**Profondeur** : Express
**Pages** : 1 (`/prospection`)
**Passes** : 1
**Référence** : golden v2 ([snapshot](./golden-snapshot.json))
**Démarré** : 2026-04-25
**Mode** : one-shot subagent (Pascal a autorisé l'auto-lancement)

## Étapes

1. [x] `/prospection` — Passe 1 (structure + composants majeurs vs golden v2) — **complétée 2026-04-25, 19 findings (3 P0 / 9 P1 / 7 P2)**
2. [x] Génération `rapport.md` (synthèse priorisée P0/P1/P2) — **complétée 2026-04-25**

**Étape courante : —**
**Passe courante : 1 (terminée)**
**Dernière passe complétée : 1**

## CHECKPOINT — Audit Express terminé (2026-04-25)

- Étapes cochées : 2/2
- Findings : 19 (3 P0 / 9 P1 / 7 P2)
- Rapport : `rapport.md`
- Conflit golden v2 P2-06 : résolu (cellPaddingY 10 → 12 dans source, snapshot figé)

## Note exécution étape 1

- Audit conduit via chrome MCP + `getComputedStyle` (mesures réelles, pas estimations).
- Screenshot non capturé : `screencapture` macOS bloqué par sandbox (`could not create image from display`). Mesures DOM brutes suffisantes pour Express. Capture manuelle pourra être ajoutée a posteriori.
- Findings retournés inline dans la réponse subagent (règle harness : pas de fichier rapport écrit par subagent). À reporter dans `findings.md` par le main thread.
- Conflit interne détecté dans le golden v2 : `components.table.cellPaddingY: "10px"` vs `spacing.scale = [4,8,12,16,24,32,48]` (cf. P2-06). À arbitrer côté golden avant correction page.

## Cible URL

`https://filmpro-crm.vercel.app/prospection` (prod, Pascal authentifié dans Chrome)

## Scope Express

- Tokens : palette, typo, spacing
- Composants majeurs : button, input, card, table, badge, slide-out
- Sémantique : H1, structure de page
- Spacing interdit : 2/6/10/20px
- Bouton height 40px uniforme
- Material Symbols vs Lucide (signaler les occurrences, pas migrer)

## Hors scope Express

- A11y détaillée (axe-core complet)
- Personas (Passe 3)
- Responsive multi-viewport (déjà couvert par `docs/GOLDEN_STANDARDS_RESPONSIVE.md`)
