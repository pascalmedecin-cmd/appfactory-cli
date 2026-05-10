import { fail } from '@sveltejs/kit';
import { randomUUID } from 'crypto';

// Audit 360 H-14 : aligne le shape `fail()` Supabase sur ActionFailure
// (`{success:false, error}`). Le frontend SvelteKit consomme déjà
// `result.data.error` via `applyAction`, donc ajouter `success:false` ne
// régresse aucun consumer ; il documente le contract pour les form actions.
export function dbFail(error: { message: string } | null) {
	if (!error) return null;
	console.error('Supabase error:', error.message);
	return fail(400, { success: false as const, error: "Erreur lors de l'operation" });
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
