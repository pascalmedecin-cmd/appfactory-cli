import { createSupabaseServerClient } from '$lib/server/supabase';
import { isEmailAllowed, parseEnvList } from '$lib/server/auth';
import { createRateLimiter } from '$lib/server/rate-limiter';
import { isRateLimitedPath, isValidationPublicRoute } from '$lib/server/rate-limit-paths';
import { legacyHostRedirect } from '$lib/server/legacy-redirects';
import { CRM_BASE } from '$lib/config';
import { json, redirect, type Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { RATE_LIMIT_WINDOW_MS, SESSION_MAX_AGE_MS } from '$lib/utils/time-constants';

// Rate limiting in-memory : 10 req/min/IP, éviction LRU à 10 000 entrées
// (audit 360 M-14). Le timer de nettoyage est arrêté en HMR dev (audit 360 M-11).
const rateLimiter = createRateLimiter({ windowMs: RATE_LIMIT_WINDOW_MS, max: 10, mapCap: 10_000 });

// Limiteur DÉDIÉ aux routes publiques de validation externe (60 req/min/IP) : la personne
// externe enchaîne les décisions bien plus vite que 10/min ; un scan de tokens reste borné.
const validationRateLimiter = createRateLimiter({ windowMs: RATE_LIMIT_WINDOW_MS, max: 60, mapCap: 10_000 });

if (import.meta.hot) {
	import.meta.hot.dispose(() => {
		rateLimiter.dispose();
		validationRateLimiter.dispose();
	});
}

// Anciennes URLs internes du CRM (favoris des fondateurs) avant la reorg portail
// (2026-06-01) : le CRM est passe sous /crm. Redirects 308 (preservent la methode)
// vers /crm/* pour ne pas casser les favoris. `/login`, `/auth/*`, `/api/*` et `/`
// (= home portail) ne sont volontairement PAS dans la liste.
const CRM_LEGACY_PREFIXES = [
	'/contacts',
	'/entreprises',
	'/pipeline',
	'/prospection',
	'/signaux',
	'/veille',
	'/reporting',
	'/aide',
	'/log',
	// Seul /dashboard/couts existait sous l'ancien group (le tableau de bord etait a `/`,
	// pas `/dashboard`). On ne capture donc pas le bare `/dashboard` (jamais une page).
	'/dashboard/couts'
];

// Toute la logique du gate (auth, rate-limit, headers) vit dans baseHandle, exporte pour
// etre teste en isolation (hooks.server.test.ts). `handle` ci-dessous est l'export consomme
// par SvelteKit en prod.
export const baseHandle: Handle = async ({ event, resolve }) => {
	// Bascule d'adresse portail : ancien host -> nouveau host (avant tout le reste).
	// Decision extraite en helper pur testable (audit sécu 2026-06-04 F-1).
	const hostRedirect = legacyHostRedirect(event.url.host, event.url.pathname, event.url.search);
	if (hostRedirect) {
		throw redirect(308, hostRedirect);
	}

	// Redirects 308 des anciennes URLs internes -> /crm/* (reorg portail 2026-06-01).
	// Match exact OU prefixe suivi de '/' (evite que '/login' matche '/log').
	const path = event.url.pathname;
	const legacy = CRM_LEGACY_PREFIXES.find((pre) => path === pre || path.startsWith(pre + '/'));
	if (legacy) {
		throw redirect(308, `${CRM_BASE}${path}${event.url.search}`);
	}

	// Rate limiting (10 req/min/IP) — liste des chemins extraite dans un helper pur testable.
	if (isRateLimitedPath(event.url.pathname, event.request.method)) {
		const ip = event.getClientAddress();
		if (!rateLimiter.check(ip)) {
			return json(
				{ error: 'Trop de requetes. Reessayez dans une minute.' },
				{ status: 429 }
			);
		}
	}

	// Routes publiques de validation externe : limiteur dédié 60 req/min/IP (la personne
	// externe enchaîne les décisions ; un scan de tokens reste borné).
	const isValidationRoute = isValidationPublicRoute(event.url.pathname);
	if (isValidationRoute) {
		const ip = event.getClientAddress();
		if (!validationRateLimiter.check(ip)) {
			// Ce 429 court-circuite le bloc de headers final : on pose no-store + noindex ici pour
			// que MÊME la réponse de rate-limit d'une route publique reste non indexée / non cachée.
			return json(
				{ error: 'Trop de requetes. Reessayez dans une minute.' },
				{ status: 429, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } }
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

	// Les routes publiques de validation externe (page + API) sont exemptées du gate auth :
	// l'AUTORISATION est le token secret (résolu à chaque requête côté route, service role
	// après résolution). Une session CRM présente n'y change rien - et une session expirée
	// ne doit surtout pas rediriger la personne externe vers /login.
	if (!session && !isAuthRoute && !isCronRoute && !isValidationRoute) {
		throw redirect(303, '/login');
	}

	// Verifier que l'email est autorise (whitelist domaine/email)
	if (session && !isAuthRoute && !isCronRoute && !isValidationRoute) {
		if (!isEmailAllowed(user?.email ?? undefined, parseEnvList(env.ALLOWED_DOMAINS), parseEnvList(env.ALLOWED_EMAILS))) {
			// Deconnecter l'utilisateur non autorise
			await event.locals.supabase.auth.signOut();
			throw redirect(303, '/login?error=unauthorized');
		}
	}

	// Expiration session 7 jours (cookie cote serveur) — voir SESSION_MAX_AGE_MS (time-constants).
	if (session && !isAuthRoute && !isCronRoute && !isValidationRoute) {
		// Le cookie `login_at` a un maxAge de 7j : le navigateur le supprime EXACTEMENT quand il
		// deviendrait expire. Tester `loginAt && age > 7j` est une course perdue (le cookie a
		// disparu a l'instant ou la condition serait vraie) : le plafond ne tombait jamais et la
		// session Supabase (cookies sb-*, maxAge 400j par defaut) survivait indefiniment. On
		// traite donc l'ABSENCE (cookie 7j expire) ET une valeur non numerique (tampering) comme
		// une expiration. Une session < 7j garde son cookie `login_at` valide, donc aucun impact.
		const loginAt = event.cookies.get('login_at');
		const stamp = Number(loginAt);
		const sessionExpired =
			!loginAt || !Number.isFinite(stamp) || Date.now() - stamp > SESSION_MAX_AGE_MS;
		if (sessionExpired) {
			event.cookies.delete('login_at', { path: '/' });
			await event.locals.supabase.auth.signOut();
			throw redirect(303, '/login?error=expired');
		}
	}

	if (session && event.url.pathname === '/login') {
		// Deja connecte sur /login : renvoi vers la home portail. Decision Pascal 2026-06-01 (AC-015 revisee).
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
		// frame-src 'self' blob: (2026-07-03) : aperçu PDF étiquettes = blob créé par NOTRE JS
		// (URL.createObjectURL) rendu en <iframe> (lecteur PDF natif). Sans frame-src, le repli
		// default-src 'self' refuse blob:. Aucune origine distante ajoutée.
		"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src 'self' blob:; frame-ancestors 'none'"
	);
	// HSTS (audit 360 V3b L-01) : 2 ans, sous-domaines inclus, éligible preload list.
	// Vercel sert exclusivement en HTTPS, donc aucun risque de lock-out HTTP.
	response.headers.set(
		'Strict-Transport-Security',
		'max-age=63072000; includeSubDomains; preload'
	);

	// Porte publique de validation externe : jamais indexée, jamais mise en cache (secret dans
	// l'URL). Posé ICI, dans le hook, pour couvrir TOUTES les réponses de ces routes - succès,
	// `throw error` (404/500), 410 expiré, POST decision - alors qu'un `setHeaders` dans le seul
	// `load` ratait les chemins d'erreur (spec §4). `isValidationRoute` = motifs exacts.
	if (isValidationRoute) {
		response.headers.set('Cache-Control', 'no-store');
		response.headers.set('X-Robots-Tag', 'noindex, nofollow');
	}

	return response;
};

export const handle: Handle = baseHandle;
