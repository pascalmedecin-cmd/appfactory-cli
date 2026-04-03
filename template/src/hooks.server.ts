import { createSupabaseServerClient } from '$lib/server/supabase';
import { json, redirect, type Handle } from '@sveltejs/kit';

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
	const { session } = await event.locals.safeGetSession();
	const isAuthRoute = event.url.pathname === '/login' || event.url.pathname.startsWith('/auth');
	const isCronRoute = event.url.pathname.startsWith('/api/cron/');

	if (!session && !isAuthRoute && !isCronRoute) {
		throw redirect(303, '/login');
	}

	if (session && event.url.pathname === '/login') {
		throw redirect(303, '/');
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
