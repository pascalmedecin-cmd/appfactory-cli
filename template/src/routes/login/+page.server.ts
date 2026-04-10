import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { isEmailAllowed, parseEnvList } from '$lib/server/auth';
import { createSupabaseServerClient } from '$lib/server/supabase';
import type { Actions } from './$types';

export const actions: Actions = {
	sendcode: async ({ request, cookies }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim().toLowerCase();

		if (!email) {
			return fail(400, { error: 'Adresse email requise.' });
		}

		if (!isEmailAllowed(email, parseEnvList(env.ALLOWED_DOMAINS), parseEnvList(env.ALLOWED_EMAILS))) {
			return fail(403, { error: 'Seules les adresses @filmpro.ch sont acceptées.' });
		}

		const supabase = createSupabaseServerClient(cookies);
		const { error } = await supabase.auth.signInWithOtp({ email });

		if (error) {
			if (error.status === 429) {
				return fail(429, { error: 'Trop de tentatives. Réessayez plus tard.' });
			}
			console.error('Erreur envoi code OTP:', error.message);
			return fail(500, { error: 'Erreur lors de l\'envoi du code. Réessayez.' });
		}

		return { codeSent: true, email };
	},

	verifycode: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim().toLowerCase();
		const code = formData.get('code')?.toString().trim();

		if (!email || !code) {
			return fail(400, { error: 'Email et code requis.', codeSent: true, email: email ?? '' });
		}

		if (!/^\d{6}$/.test(code)) {
			return fail(400, { error: 'Le code doit contenir 6 chiffres.', codeSent: true, email });
		}

		const supabase = createSupabaseServerClient(cookies);
		const { error } = await supabase.auth.verifyOtp({
			email,
			token: code,
			type: 'email'
		});

		if (error) {
			console.error('Erreur vérification OTP:', error.message);
			const msg = error.message.includes('expired')
				? 'Code expiré. Demandez un nouveau code.'
				: 'Code incorrect. Vérifiez et réessayez.';
			return fail(400, { error: msg, codeSent: true, email });
		}

		// Cookie de date de connexion (expiration session 7 jours dans hooks.server.ts)
		cookies.set('login_at', String(Date.now()), {
			path: '/',
			httpOnly: true,
			secure: url.protocol === 'https:',
			sameSite: 'lax',
			maxAge: 7 * 24 * 60 * 60
		});

		return { verified: true };
	}
};
