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
