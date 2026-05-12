/**
 * Logique pure de la checklist de démarrage (niveau 1 de l'aide).
 *
 * Le composant `AideChecklist.svelte` ne fait que brancher cette logique sur `localStorage`
 * et le rendu. Tout ce qui est testable (sérialisation, bascule, calcul de progression,
 * filtrage des clés obsolètes) vit ici - le repo n'a pas de jsdom configuré, donc les `.svelte`
 * ne sont pas couverts par Vitest.
 */

/** Clé localStorage. Versionnée : si le format change, on incrémente et on repart propre. */
export const CHECKLIST_STORAGE_KEY = 'crm.aide.checklist.v1';

/** État = ensemble des identifiants d'étapes cochées. */
export type ChecklistState = Set<string>;

/** Désérialise l'état depuis une chaîne JSON (tolérant : entrée invalide → ensemble vide). */
export function parseChecklistState(raw: string | null | undefined): ChecklistState {
	if (!raw) return new Set();
	try {
		const parsed: unknown = JSON.parse(raw);
		if (Array.isArray(parsed)) {
			return new Set(parsed.filter((x): x is string => typeof x === 'string'));
		}
	} catch {
		// JSON corrompu - on repart d'un état vide plutôt que de planter.
	}
	return new Set();
}

/** Sérialise l'état en JSON (tableau trié pour un stockage stable et diffable). */
export function serializeChecklistState(state: ChecklistState): string {
	return JSON.stringify([...state].sort());
}

/** Renvoie un nouvel état avec l'étape cochée ou décochée (immuable). */
export function toggleStep(state: ChecklistState, stepId: string): ChecklistState {
	const next = new Set(state);
	if (next.has(stepId)) next.delete(stepId);
	else next.add(stepId);
	return next;
}

/** Conserve uniquement les clés encore présentes dans `validIds` (nettoyage des étapes supprimées). */
export function pruneChecklistState(state: ChecklistState, validIds: readonly string[]): ChecklistState {
	const valid = new Set(validIds);
	return new Set([...state].filter((id) => valid.has(id)));
}

/** Progression : nombre d'étapes cochées sur le total, et pourcentage entier (0 si total = 0). */
export function checklistProgress(state: ChecklistState, total: number): { done: number; total: number; percent: number } {
	// `done` est borné par `total` : une clé obsolète encore présente ne doit pas gonfler le
	// compteur (on suppose `state` déjà nettoyé via `pruneChecklistState`, mais on protège quand même).
	const done = Math.min(state.size, Math.max(total, 0));
	return { done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
}
