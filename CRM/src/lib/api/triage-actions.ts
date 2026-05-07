/**
 * Source unique partagée client+server pour les actions du widget triage matin.
 * Cohérence stricte entre l'endpoint POST /api/prospection/triage/[action]/+server.ts
 * et le composant TriageQueue.svelte (sinon une 4e action ajoutée d'un seul côté
 * compile sans broncher).
 */
export const TRIAGE_ACTIONS = ['oui', 'non', 'plus-tard'] as const;
export type TriageAction = (typeof TRIAGE_ACTIONS)[number];
