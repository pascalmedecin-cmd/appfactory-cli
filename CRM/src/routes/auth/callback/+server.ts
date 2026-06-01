import { redirect } from '@sveltejs/kit';
import { sanitizeForLog } from '$lib/server/intelligence/sanitize';
import { SESSION_MAX_AGE_S } from '$lib/utils/time-constants';
import { CRM_BASE } from '$lib/config';
import type { RequestHandler } from './$types';

// Audit 360 M-03 : le message d'erreur Supabase est repris dans l'URL `?detail=...`
// (visible historique navigateur + logs referrer Vercel) et console.error. On le
// sanitize (patterns secrets) + tronque court avant exposition.
function safeDetail(message: string): string {
	return sanitizeForLog(message, 200);
}

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	const token_hash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type') as 'magiclink' | 'email' | null;
	const code = url.searchParams.get('code');

	let authenticated = false;

	if (token_hash && type) {
		const { error } = await locals.supabase.auth.verifyOtp({ token_hash, type });
		if (error) {
			const detail = safeDetail(error.message);
			console.error('Auth callback error (OTP):', detail);
			throw redirect(303, `/login?error=callback&detail=${encodeURIComponent(detail)}`);
		}
		authenticated = true;
	} else if (code) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (error) {
			const detail = safeDetail(error.message);
			console.error('Auth callback error:', detail);
			throw redirect(303, `/login?error=callback&detail=${encodeURIComponent(detail)}`);
		}
		authenticated = true;
	}

	if (authenticated) {
		cookies.set('login_at', String(Date.now()), {
			path: '/',
			httpOnly: true,
			secure: url.protocol === 'https:',
			sameSite: 'lax',
			maxAge: SESSION_MAX_AGE_S
		});
	}

	// Post-login : entree dans le CRM (pas la home portail). AC-015.
	throw redirect(303, CRM_BASE);
};
