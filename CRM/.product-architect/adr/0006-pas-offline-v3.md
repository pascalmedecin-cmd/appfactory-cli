# ADR-0006 — Pas de mode offline en V3 (état d'envoi visible, pas de file offline)

## Status
Accepted (2026-05-31)

## Context
Le terrain implique parfois un réseau faible (sous-sol, chantier). Le Critique du council a flaggé les photos non synchronisées comme le mode d'échec silencieux le plus grave. Le Sceptique a contre-argumenté : la couverture 4G/5G en Suisse romande est quasi totale, et une vraie synchro offline (file d'attente, résolution de conflits) = la complexité qui retue le projet (cf. V2).

## Decision
**Pas de mode offline** en V3. À la place : état d'envoi explicite par action (« envoi… / envoyé / échec → réessayer ») et **conservation de la note saisie en cas d'échec réseau** (rejouable sans re-saisie, AC-011). La photo échouée reste rattrapable manuellement. Offline réévalué **seulement** sur cas de zone blanche récurrente documenté par Pascal.

## Consequences
- (+) Évite la complexité (service worker sync, IndexedDB queue, conflict resolution) qui a alourdi la V2.
- (+) L'utilisateur n'est jamais dans le faux confort « je crois que c'est envoyé » : l'état est explicite.
- (-) Sur réseau vraiment coupé, l'envoi échoue et l'utilisateur doit réessayer (la note n'est pas perdue, la photo doit être reprise depuis la pellicule).
- (-) Décision à rouvrir si un cas terrain de zone blanche est documenté (trigger explicite, pas par défaut).

## References
- Council (dissent Critique vs Sceptique sur l'offline), session 2026-05-31.
- `memory/feedback_mobile_overscope_anti_pattern.md` (V2 trop complexe).
