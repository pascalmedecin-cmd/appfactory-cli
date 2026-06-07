import { fail } from '@sveltejs/kit';
import { randomUUID } from 'crypto';

// Audit 360 H-14 : aligne le shape `fail()` Supabase sur ActionFailure
// (`{success:false, error}`). Le frontend SvelteKit consomme déjà
// `result.data.error` via `applyAction`, donc ajouter `success:false` ne
// régresse aucun consumer ; il documente le contract pour les form actions.
export function dbFail(error: { message: string; code?: string } | null) {
	if (!error) return null;
	console.error('Supabase error:', error.message);
	// REG-01 cause 2 : 23503 = foreign_key_violation. Message explicite plutôt
	// que le générique (l'utilisateur comprend que la donnée est encore liée).
	const message =
		error.code === '23503'
			? "Action impossible : cet élément est encore référencé par d'autres données."
			: "Erreur lors de l'operation";
	return fail(400, { success: false as const, error: message });
}

export function newId() {
	return randomUUID();
}

export function now() {
	return new Date().toISOString();
}

// PostgREST .ilike()/.like() interprète % et _ comme wildcards SQL. Sans échappement,
// une saisie utilisateur contenant ces caractères provoque des faux positifs (ex: dedup
// qui retourne un mauvais lead). Cf mémoire feedback_postgrest_or_filter_injection.md.
export function escapeIlike(s: string): string {
	return s.replace(/[\\%_]/g, c => '\\' + c);
}
