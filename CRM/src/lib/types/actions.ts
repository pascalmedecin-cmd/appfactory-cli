/**
 * Audit 360 H-14 : type discriminated union pour homogénéiser les `return`
 * des form actions SvelteKit côté `+page.server.ts`. Avant cette unification,
 * 4 actions (prospection.createExpress, prospection.createRecherche,
 * signaux.deleteBatch, signaux.createOpportunite) renvoyaient des shapes
 * disparates (`{success}`, `{success, id, duplicate}`, `{success, deleted}`,
 * `{success, redirectTo}`, `fail(...)` avec `{error}`/`{ambiguous, candidates}`)
 * → le frontend devait deviner ce qui revient.
 *
 * ActionResult<T> trace explicitement le contrat « succès + payload optionnel »
 * vs « échec + message clair ». Les form actions le retournent (ou un
 * `fail(N, ActionFailure)` SvelteKit pour les statuts HTTP non-200).
 *
 * `ActionSuccess<T>` est une intersection : success=true + T (payload). Les
 * actions sans payload utilisent `ActionResult` (T = Record<string, never>).
 *
 * Cas spéciaux (ex : createExpress qui distingue silent-redirect vs ambiguous-
 * candidates vs fail) restent exprimés via `ActionResult<{...}> | { ambiguous;
 * candidates }` quand un troisième shape est documenté côté frontend.
 */

export type ActionSuccess<T = Record<string, never>> = { success: true } & T;

export interface ActionFailure {
	success: false;
	error: string;
	field?: string;
}

export type ActionResult<T = Record<string, never>> = ActionSuccess<T> | ActionFailure;
