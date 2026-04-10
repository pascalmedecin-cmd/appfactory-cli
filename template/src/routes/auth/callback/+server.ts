import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	const token_hash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type') as 'magiclink' | 'email' | null;
	const code = url.searchParams.get('code');

	let authenticated = false;

	if (token_hash && type) {
		const { error } = await locals.supabase.auth.verifyOtp({ token_hash, type });
		if (error) {
			console.error('Auth callback error (OTP):', error.message);
			throw redirect(303, `/login?error=callback&detail=${encodeURIComponent(error.message)}`);
		}
		authenticated = true;
	} else if (code) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (error) {
			console.error('Auth callback error:', error.message);
			throw redirect(303, `/login?error=callback&detail=${encodeURIComponent(error.message)}`);
		}
		authenticated = true;
	}

	if (authenticated) {
		cookies.set('login_at', String(Date.now()), {
			path: '/',
			httpOnly: true,
			secure: url.protocol === 'https:',
			sameSite: 'lax',
			maxAge: 7 * 24 * 60 * 60
		});
	}

	throw redirect(303, '/');
};
