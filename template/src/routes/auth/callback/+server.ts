import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const token_hash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type') as 'magiclink' | 'email' | null;
	const code = url.searchParams.get('code');

	if (token_hash && type) {
		const { error } = await locals.supabase.auth.verifyOtp({ token_hash, type });
		if (error) {
			console.error('Auth callback error (OTP):', error.message);
			throw redirect(303, '/login');
		}
	} else if (code) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (error) {
			console.error('Auth callback error:', error.message);
			throw redirect(303, '/login');
		}
	}

	throw redirect(303, '/');
};
