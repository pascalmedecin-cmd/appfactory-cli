# ADR-002 - Composant générique MobileEntityCard

## Status

Accepted (2026-05-24)

## Context

4 pages CRM (Prospection, Contacts, Entreprises, Signaux) doivent afficher des grilles de cartes en mobile représentant des entités différentes : prospect, contact, entreprise, signal d'affaire.

Sans composant générique, chaque page écrirait sa propre carte mobile -> divergence visuelle inéluctable + duplication code.

Options envisagées :

- Cards ad hoc par page (4 composants distincts) : duplication, divergence garantie.
- Composant générique `<MobileEntityCard>` avec props (titre, sousTitre, badges, scorePill, actions) : DRY, cohérent.
- Composant générique trop générique style « universal card » avec slots illimités : trop flexible, perd l'opinion design.

## Decision

Créer `src/lib/components/mobile/MobileEntityCard.svelte` avec interface stricte (props nommés, pas de slot anarchique).

Interface (voir `DESIGN.md` § Composants pour détail) :

```typescript
interface MobileEntityCardProps {
  title: string;
  subtitle?: string;
  badges?: Array<{ label: string; variant: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' }>;
  scorePill?: { score: number; label: 'chaud' | 'tiède' | 'froid' | 'unscored' };
  actions?: Array<{ icon: string; label: string; href?: string; onClick?: () => void }>;
  onTap: () => void;
}
```

## Consequences

- (+) Cohérence visuelle cross-page garantie.
- (+) Évolution centralisée (un changement spacing/typo propagé partout).
- (+) Tests Playwright peuvent cibler `[data-testid="mobile-entity-card"]` partout.
- (+) ScorePill réutilise les classes globales `.signal-score-pill--*` déjà introduites V4 Signaux.
- (-) Risque sur-engineering si un cas particulier émerge (ex: une page veut un layout interne différent).
- (-) Mitigation : itération en Phase 3 commencer par 1 page (Contacts), valider, propager.

## References

- Cadrage Phase 1 ajustement complémentaire D-02.
- Audit factuel cette session : Composants transverses (DataTable utilisé sur 5 pages, pattern à reproduire en mobile).
