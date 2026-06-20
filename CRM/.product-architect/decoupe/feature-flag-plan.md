# Feature flag & livraison - Découpe Films

**Contexte** : outil interne, ≤ 3 fondateurs @filmpro.ch. Le rollout progressif % (GrowthBook canary
10→50→100) ne s'applique PAS (pattern écarté par non-invention : outil interne privé). On reprend le pattern
projet déjà utilisé pour le mobile V3 (`ffCrmMobileV3`).

## Flag

- **Nom** : `ffDecoupe` (même mécanisme que `ffCrmMobileV3`).
- **OFF (défaut)** : la card portail « Découpe Films » reste `state="soon"` (non navigable) ; la route
  `/decoupe/*` renvoie vers la home (ou 404 doux). Le code peut être mergé sans exposer l'outil.
- **ON** : la card devient `state="active"` (href `/decoupe`) et les routes sont servies.

## Bascule

1. Phase 3-4 développées avec le flag OFF en prod (merges sûrs, zéro exposition).
2. QA 360 verte (tous AC bloquants) → flag ON pour les 3 fondateurs.
3. **Kill switch** : repasser `ffDecoupe` OFF (< 1 min) masque l'outil sans redeploy de code.
4. **Rollback** : revert du commit de livraison ; les tables `decoupe_*` restent (add-only, inertes si flag OFF).

## Définition de « livré »

Card active, workflow 3 étapes fonctionnel, optimisation correcte sur jeu d'essai réel (Pascal),
tous les AC bloquants verts, audit sécu 0 H/C/M, baseline figée.
