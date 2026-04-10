import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { isEmailAllowed, parseEnvList } from '$lib/server/auth';
import { createSupabaseOtpClient } from '$lib/server/supabase';
import type { Actions } from './$types';

export const actions: Actions = {
	magiclink: async ({ request, url }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim().toLowerCase();

		if (!email) {
			return fail(400, { error: 'Adresse email requise.' });
		}

		if (!isEmailAllowed(email, parseEnvList(env.ALLOWED_DOMAINS), parseEnvList(env.ALLOWED_EMAILS))) {
			return fail(403, { error: 'Seules les adresses @filmpro.ch sont acceptées.' });
		}

		// Client avec flowType:'implicit' → Supabase génère un lien ?token_hash=
		// (pas ?code= PKCE qui échoue sur mobile Safari)
		const supabase = createSupabaseOtpClient();
		const { error } = await supabase.auth.signInWithOtp({
			email,
			options: {
				emailRedirectTo: `${url.origin}/auth/callback`
			}
		});

		if (error) {
			if (error.status === 429) {
				return fail(429, { error: 'Trop de tentatives. Réessayez plus tard.' });
			}
			console.error('Erreur magic link:', error.message);
			return fail(500, { error: 'Erreur lors de l\'envoi du lien. Réessayez.' });
		}

		return { sent: true, email };
	}
};
