import { createSupabaseServerClient } from '$lib/server/supabase';
import { isEmailAllowed, parseEnvList } from '$lib/server/auth';
import { json, redirect, type Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

// Rate limiting in-memory pour les API de prospection
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requetes par minute par IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
	const now = Date.now();
	const entry = rateLimitMap.get(ip);

	if (!entry || now > entry.resetAt) {
		rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
		return true;
	}

	if (entry.count >= RATE_LIMIT_MAX) return false;
	entry.count++;
	return true;
}

// Nettoyage periodique (eviter fuite memoire)
setInterval(() => {
	const now = Date.now();
	for (const [ip, entry] of rateLimitMap) {
		if (now > entry.resetAt) rateLimitMap.delete(ip);
	}
}, 60_000);

export const handle: Handle = async ({ event, resolve }) => {
	// Rate limiting sur /api/prospection/*
	if (event.url.pathname.startsWith('/api/prospection/')) {
		const ip = event.getClientAddress();
		if (!checkRateLimit(ip)) {
			return json(
				{ error: 'Trop de requetes. Reessayez dans une minute.' },
				{ status: 429 }
			);
		}
	}

	event.locals.supabase = createSupabaseServerClient(event.cookies);

	event.locals.safeGetSession = async () => {
		const { data: { session } } = await event.locals.supabase.auth.getSession();
		if (!session) return { session: null, user: null };

		const { data: { user }, error } = await event.locals.supabase.auth.getUser();
		if (error) return { session: null, user: null };

		return { session, user };
	};

	// Proteger toutes les routes sauf /login et /auth
	const { session, user } = await event.locals.safeGetSession();
	// Allowlist explicite — ne jamais utiliser de prefix match sur /auth/*
	const AUTH_EXEMPT_ROUTES = ['/login', '/auth/callback'];
	const isAuthRoute = AUTH_EXEMPT_ROUTES.includes(event.url.pathname);
	const isCronRoute = event.url.pathname.startsWith('/api/cron/');

	if (!session && !isAuthRoute && !isCronRoute) {
		throw redirect(303, '/login');
	}

	// Verifier que l'email est autorise (whitelist domaine/email)
	if (session && !isAuthRoute && !isCronRoute) {
		if (!isEmailAllowed(user?.email ?? undefined, parseEnvList(env.ALLOWED_DOMAINS), parseEnvList(env.ALLOWED_EMAILS))) {
			// Deconnecter l'utilisateur non autorise
			await event.locals.supabase.auth.signOut();
			throw redirect(303, '/login?error=unauthorized');
		}
	}

	// Expiration session 7 jours (cookie cote serveur)
	const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
	if (session && !isAuthRoute && !isCronRoute) {
		const loginAt = event.cookies.get('login_at');
		if (loginAt && Date.now() - Number(loginAt) > SESSION_MAX_AGE_MS) {
			event.cookies.delete('login_at', { path: '/' });
			await event.locals.supabase.auth.signOut();
			throw redirect(303, '/login?error=expired');
		}
	}

	if (session && event.url.pathname === '/login') {
		throw redirect(303, '/');
	}

	const response = await resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});

	// Headers securite
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	response.headers.set(
		'Content-Security-Policy',
		"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'"
	);

	return response;
};
