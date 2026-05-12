import { createSupabaseServerClient } from '$lib/server/supabase';
import { isEmailAllowed, parseEnvList } from '$lib/server/auth';
import { createRateLimiter } from '$lib/server/rate-limiter';
import { json, redirect, type Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { RATE_LIMIT_WINDOW_MS, SESSION_MAX_AGE_MS } from '$lib/utils/time-constants';

// Rate limiting in-memory : 10 req/min/IP, éviction LRU à 10 000 entrées
// (audit 360 M-14). Le timer de nettoyage est arrêté en HMR dev (audit 360 M-11).
const rateLimiter = createRateLimiter({ windowMs: RATE_LIMIT_WINDOW_MS, max: 10, mapCap: 10_000 });

if (import.meta.hot) {
	import.meta.hot.dispose(() => rateLimiter.dispose());
}

export const handle: Handle = async ({ event, resolve }) => {
	// Rate limiting sur /api/prospection/*, /api/photos*, /api/visits*
	// et POST /login (audit 360 M-04 : anti cost-burn SMTP via `?/sendcode` bombing).
	const isRateLimitedPath =
		event.url.pathname.startsWith('/api/prospection/') ||
		event.url.pathname.startsWith('/api/photos') ||
		event.url.pathname.startsWith('/api/visits') ||
		(event.url.pathname === '/login' && event.request.method === 'POST');
	if (isRateLimitedPath) {
		const ip = event.getClientAddress();
		if (!rateLimiter.check(ip)) {
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
	// Allowlist explicite : ne jamais utiliser de prefix match sur /auth/*
	const AUTH_EXEMPT_ROUTES = ['/login', '/auth/callback'];
	const isAuthRoute = AUTH_EXEMPT_ROUTES.includes(event.url.pathname);
	const isCronRoute =
		event.url.pathname.startsWith('/api/cron/') ||
		event.url.pathname === '/api/intelligence/recheck-historical';

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

	// Expiration session 7 jours (cookie cote serveur) — voir SESSION_MAX_AGE_MS (time-constants).
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

	// Forcer charset=utf-8 sur les reponses JSON (accents FR)
	const contentType = response.headers.get('content-type');
	if (contentType && contentType.startsWith('application/json') && !contentType.includes('charset')) {
		response.headers.set('content-type', 'application/json; charset=utf-8');
	}

	// Headers securite
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
	response.headers.set(
		'Content-Security-Policy',
		// 'unsafe-inline' sur script-src/style-src : requis par l'hydratation SvelteKit
		// (inline <script> + styles scoped). Non fixable sans nonce/hash dynamique (refactor
		// majeur du framework). Documenté audit 360 V3b L-02 : risque résiduel XSS limité
		// (mono-tenant ≤ 10 admins @filmpro.ch, pas d'UGC rendu en HTML brut).
		"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'"
	);
	// HSTS (audit 360 V3b L-01) : 2 ans, sous-domaines inclus, éligible preload list.
	// Vercel sert exclusivement en HTTPS, donc aucun risque de lock-out HTTP.
	response.headers.set(
		'Strict-Transport-Security',
		'max-age=63072000; includeSubDomains; preload'
	);

	return response;
};
