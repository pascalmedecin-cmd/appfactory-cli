import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { isEmailAllowed, parseEnvList } from '$lib/server/auth';
import type { Actions } from './$types';

export const actions: Actions = {
	magiclink: async ({ request }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim().toLowerCase();

		if (!email) {
			return fail(400, { error: 'Adresse email requise.' });
		}

		if (!isEmailAllowed(email, parseEnvList(env.ALLOWED_DOMAINS), parseEnvList(env.ALLOWED_EMAILS))) {
			return fail(403, { error: 'Seules les adresses @filmpro.ch sont acceptées.' });
		}

		// Validation OK — le client envoie le magic link via Supabase browser client
		// pour que le flux PKCE fonctionne (code verifier stocke cote navigateur)
		return { validated: true, email };
	}
};
