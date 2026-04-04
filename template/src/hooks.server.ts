import { createSupabaseServerClient } from '$lib/server/supabase';
import { json, redirect, type Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

// Domaines email autorises (comma-separated env var, ex: "filmpro.ch,example.com")
// Si vide ou non defini, seuls les emails listes dans ALLOWED_EMAILS sont autorises
function isEmailAllowed(email: string | undefined): boolean {
	if (!email) return false;

	// Emails individuels autorises (env var comma-separated)
	const allowedEmails = env.ALLOWED_EMAILS?.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean) ?? [];
	if (allowedEmails.length > 0 && allowedEmails.includes(email.toLowerCase())) return true;

	// Domaines autorises (env var comma-separated)
	const allowedDomains = env.ALLOWED_DOMAINS?.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean) ?? [];
	if (allowedDomains.length > 0) {
		const domain = email.toLowerCase().split('@')[1];
		if (domain && allowedDomains.includes(domain)) return true;
	}

	// Si aucune restriction configuree, bloquer par defaut (securite)
	if (allowedEmails.length === 0 && allowedDomains.length === 0) {
		console.warn('SECURITE: Aucun ALLOWED_EMAILS ni ALLOWED_DOMAINS configure. Acces refuse par defaut.');
		return false;
	}

	return false;
}

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

	// Verifier que l'email est autorise (whitelist domaine/email)
	if (session && !isAuthRoute && !isCronRoute) {
		const { user } = await event.locals.safeGetSession();
		if (!isEmailAllowed(user?.email ?? undefined)) {
			// Deconnecter l'utilisateur non autorise
			await event.locals.supabase.auth.signOut();
			throw redirect(303, '/login?error=unauthorized');
		}
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
