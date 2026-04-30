import { fail } from '@sveltejs/kit';
import { randomUUID } from 'crypto';

export function dbFail(error: { message: string } | null) {
	if (!error) return null;
	console.error('Supabase error:', error.message);
	return fail(400, { error: "Erreur lors de l'operation" });
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
