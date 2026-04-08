import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Actions } from './$types';

function isAllowedDomain(email: string): boolean {
	const allowedDomains = env.ALLOWED_DOMAINS?.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean) ?? [];
	const allowedEmails = env.ALLOWED_EMAILS?.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean) ?? [];

	const emailLower = email.toLowerCase();
	if (allowedEmails.includes(emailLower)) return true;

	const domain = emailLower.split('@')[1];
	if (domain && allowedDomains.includes(domain)) return true;

	return false;
}

export const actions: Actions = {
	magiclink: async ({ request }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim().toLowerCase();

		if (!email) {
			return fail(400, { error: 'Adresse email requise.' });
		}

		if (!isAllowedDomain(email)) {
			return fail(403, { error: 'Seules les adresses @filmpro.ch sont acceptées.' });
		}

		// Validation OK — le client envoie le magic link via Supabase browser client
		// pour que le flux PKCE fonctionne (code verifier stocke cote navigateur)
		return { validated: true, email };
	}
};
