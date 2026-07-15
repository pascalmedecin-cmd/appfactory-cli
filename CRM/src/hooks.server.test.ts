import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// Audit 360 V2c H-18 : couverture tests du gate global hooks.server.ts.
// Pattern S99 risk : rate limiting, expiration 7j, whitelist email, AUTH_EXEMPT_ROUTES strict.

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

const mockEnv: Record<string, string | undefined> = {};
vi.mock('$env/dynamic/private', () => ({ env: mockEnv }));
vi.mock('$env/dynamic/public', () => ({
	env: { PUBLIC_SUPABASE_URL: 'https://test.supabase.co', PUBLIC_SUPABASE_ANON_KEY: 'anon-key' }
}));

type SessionState = { session: unknown; user: { email?: string } | null };
let mockSessionState: SessionState;
// Audit 360 V3b I-06 : simule l'échec de auth.getUser() même quand getSession() renvoie
// un token (token révoqué / réseau). safeGetSession doit alors fail-closed.
let mockGetUserFails = false;
const mockSignOut = vi.fn(async () => ({ error: null }));
vi.mock('$lib/server/supabase', () => ({
	createSupabaseServerClient: () => ({
		auth: {
			getSession: async () => ({ data: { session: mockSessionState.session } }),
			getUser: async () =>
				mockSessionState.session && !mockGetUserFails
					? { data: { user: mockSessionState.user }, error: null }
					: { data: { user: null }, error: { message: 'no user' } },
			signOut: mockSignOut
		}
	})
}));

// On teste baseHandle (la vraie logique du gate) en isolation. baseHandle porte tout le
// comportement teste ici (auth, rate-limit, expiration, headers). Voir hooks.server.ts.
type HandleFn = typeof import('./hooks.server').baseHandle;
let handle: HandleFn;

beforeAll(async () => {
	// setInterval de nettoyage est créé à l'import du module : on le neutralise
	// via fake timers pour ne pas garder le process en vie après les tests.
	vi.useFakeTimers();
	handle = (await import('./hooks.server')).baseHandle;
	vi.useRealTimers();
});

function makeCookies(initial: Record<string, string> = {}) {
	const store: Record<string, string> = { ...initial };
	return {
		get: (n: string) => store[n],
		set: vi.fn((n: string, v: string) => {
			store[n] = v;
		}),
		delete: vi.fn((n: string) => {
			delete store[n];
		}),
		getAll: () => Object.entries(store).map(([name, value]) => ({ name, value }))
	};
}

function makeEvent(
	pathname: string,
	opts: { ip?: string; cookies?: ReturnType<typeof makeCookies>; method?: string } = {}
) {
	return {
		// Host courant (Atelier 209). NE PAS utiliser un ancien host (filmpro-crm /
		// template-rho-three / filmpro-portail) : ce sont des legacy hosts 308-rediriges par
		// baseHandle (legacy-redirects.ts), ce qui court-circuiterait la logique auth/rate-limit
		// /headers exercee ici.
		url: new URL(`https://atelier209.vercel.app${pathname}`),
		request: { method: opts.method ?? 'GET' },
		getClientAddress: () => opts.ip ?? '10.0.0.1',
		cookies: opts.cookies ?? makeCookies(),
		locals: {} as Record<string, unknown>
	};
}

function makeResolve(contentType = 'text/html') {
	return vi.fn(async () => new Response('ok', { headers: { 'content-type': contentType } }));
}

async function runHandle(event: ReturnType<typeof makeEvent>, resolve = makeResolve()) {
	try {
		const res = await handle({
			event: event as unknown as Parameters<HandleFn>[0]['event'],
			resolve: resolve as unknown as Parameters<HandleFn>[0]['resolve']
		});
		return { thrown: false as const, response: res, resolve };
	} catch (e) {
		return { thrown: true as const, redirect: e as { status: number; location: string }, resolve };
	}
}

beforeEach(() => {
	for (const k of Object.keys(mockEnv)) delete mockEnv[k];
	mockEnv.ALLOWED_DOMAINS = 'filmpro.ch';
	mockEnv.ALLOWED_EMAILS = '';
	mockSessionState = { session: null, user: null };
	mockGetUserFails = false;
	mockSignOut.mockClear();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('hooks.server handle (H-18)', () => {
	it('route protégée sans session → redirect 303 /login', async () => {
		const r = await runHandle(makeEvent('/dashboard'));
		expect(r.thrown).toBe(true);
		expect(r.thrown && r.redirect.status).toBe(303);
		expect(r.thrown && r.redirect.location).toBe('/login');
	});

	it('route exempt /login sans session → pas de redirect, resolve appelé', async () => {
		const r = await runHandle(makeEvent('/login'));
		expect(r.thrown).toBe(false);
		expect(r.resolve).toHaveBeenCalled();
	});

	it('route /api/cron/* sans session → bypass auth (pas de redirect)', async () => {
		const r = await runHandle(makeEvent('/api/cron/signaux'));
		expect(r.thrown).toBe(false);
	});

	it('route /api/intelligence/recheck-historical sans session → bypass auth', async () => {
		const r = await runHandle(makeEvent('/api/intelligence/recheck-historical'));
		expect(r.thrown).toBe(false);
	});

	it('session avec email hors whitelist → signOut + redirect /login?error=unauthorized', async () => {
		mockSessionState = { session: { access_token: 'x' }, user: { email: 'hacker@gmail.com' } };
		const cookies = makeCookies({ login_at: String(Date.now()) });
		const r = await runHandle(makeEvent('/dashboard', { cookies }));
		expect(r.thrown).toBe(true);
		expect(r.thrown && r.redirect.location).toBe('/login?error=unauthorized');
		expect(mockSignOut).toHaveBeenCalled();
	});

	it('session sans email (user.email undefined) → signOut + redirect /login?error=unauthorized (défaut fail-closed)', async () => {
		mockSessionState = { session: { access_token: 'x' }, user: {} };
		const cookies = makeCookies({ login_at: String(Date.now()) });
		const r = await runHandle(makeEvent('/dashboard', { cookies }));
		expect(r.thrown).toBe(true);
		expect(r.thrown && r.redirect.location).toBe('/login?error=unauthorized');
		expect(mockSignOut).toHaveBeenCalled();
	});

	it('session expirée (login_at > 7 jours) → delete cookie + signOut + redirect /login?error=expired', async () => {
		mockSessionState = { session: { access_token: 'x' }, user: { email: 'pascal@filmpro.ch' } };
		const cookies = makeCookies({ login_at: String(Date.now() - 8 * 24 * 60 * 60 * 1000) });
		const r = await runHandle(makeEvent('/dashboard', { cookies }));
		expect(r.thrown).toBe(true);
		expect(r.thrown && r.redirect.location).toBe('/login?error=expired');
		expect(mockSignOut).toHaveBeenCalled();
		expect(cookies.delete).toHaveBeenCalledWith('login_at', { path: '/' });
	});

	// Cas REEL en production : a 7 jours, le navigateur a deja supprime le cookie `login_at`
	// (maxAge 7j) → la session Supabase (cookies sb-*, maxAge 400j) survivrait sans ce garde.
	// L'ancien test ci-dessus forge un login_at de 8j AVEC cookie present : etat impossible
	// dans un vrai navigateur (fausse confiance). Ce test couvre l'absence = expiration.
	it('session présente mais cookie login_at ABSENT → signOut + redirect /login?error=expired (plafond 7j réel)', async () => {
		mockSessionState = { session: { access_token: 'x' }, user: { email: 'pascal@filmpro.ch' } };
		const cookies = makeCookies(); // aucun login_at : etat d'une session > 7 jours
		const r = await runHandle(makeEvent('/dashboard', { cookies }));
		expect(r.thrown).toBe(true);
		expect(r.thrown && r.redirect.location).toBe('/login?error=expired');
		expect(mockSignOut).toHaveBeenCalled();
	});

	it('session présente mais login_at non numérique (tampering) → signOut + redirect /login?error=expired', async () => {
		mockSessionState = { session: { access_token: 'x' }, user: { email: 'pascal@filmpro.ch' } };
		const cookies = makeCookies({ login_at: 'not-a-number' });
		const r = await runHandle(makeEvent('/dashboard', { cookies }));
		expect(r.thrown).toBe(true);
		expect(r.thrown && r.redirect.location).toBe('/login?error=expired');
		expect(mockSignOut).toHaveBeenCalled();
	});

	it('session valide sur /login → redirect /', async () => {
		mockSessionState = { session: { access_token: 'x' }, user: { email: 'pascal@filmpro.ch' } };
		const cookies = makeCookies({ login_at: String(Date.now()) });
		const r = await runHandle(makeEvent('/login', { cookies }));
		expect(r.thrown).toBe(true);
		expect(r.thrown && r.redirect.location).toBe('/');
	});

	it('session valide sur route protégée → résout + pose les headers de sécurité', async () => {
		mockSessionState = { session: { access_token: 'x' }, user: { email: 'pascal@filmpro.ch' } };
		const cookies = makeCookies({ login_at: String(Date.now()) });
		const r = await runHandle(makeEvent('/dashboard', { cookies }));
		expect(r.thrown).toBe(false);
		const h = r.thrown ? undefined : r.response.headers;
		expect(h?.get('Content-Security-Policy')).toContain("default-src 'self'");
		expect(h?.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
		expect(h?.get('X-Frame-Options')).toBe('DENY');
		expect(h?.get('X-Content-Type-Options')).toBe('nosniff');
		expect(h?.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
		expect(h?.get('Permissions-Policy')).toContain('camera=()');
		// Audit 360 V3b L-01 : HSTS 2 ans, sous-domaines, preload.
		expect(h?.get('Strict-Transport-Security')).toBe('max-age=63072000; includeSubDomains; preload');
	});

	it('safeGetSession fail-closed (I-06) : session présente mais getUser échoue → non authentifié → redirect /login', async () => {
		mockSessionState = { session: { access_token: 'x' }, user: { email: 'pascal@filmpro.ch' } };
		mockGetUserFails = true;
		const cookies = makeCookies({ login_at: String(Date.now()) });
		const r = await runHandle(makeEvent('/dashboard', { cookies }));
		expect(r.thrown).toBe(true);
		expect(r.thrown ? r.redirect.status : 0).toBe(303);
		expect(r.thrown ? r.redirect.location : '').toBe('/login');
	});

	it('safeGetSession fail-closed (I-06) : locals.safeGetSession() renvoie {session:null,user:null} si getUser échoue', async () => {
		mockSessionState = { session: { access_token: 'x' }, user: { email: 'pascal@filmpro.ch' } };
		mockGetUserFails = true;
		const event = makeEvent('/login'); // route exempt → pas de redirect, on peut inspecter locals
		await runHandle(event);
		const safeGetSession = event.locals.safeGetSession as () => Promise<{ session: unknown; user: unknown }>;
		await expect(safeGetSession()).resolves.toEqual({ session: null, user: null });
	});

	it('force charset=utf-8 sur les réponses application/json', async () => {
		mockSessionState = { session: { access_token: 'x' }, user: { email: 'pascal@filmpro.ch' } };
		const cookies = makeCookies({ login_at: String(Date.now()) });
		const r = await runHandle(makeEvent('/api/foo', { cookies }), makeResolve('application/json'));
		expect(r.thrown).toBe(false);
		const ct = r.thrown ? '' : r.response.headers.get('content-type');
		expect(ct).toBe('application/json; charset=utf-8');
	});

	it('rate limit : /api/photos → 429 après 10 requêtes/minute depuis la même IP', async () => {
		const ip = '203.0.113.42';
		// 10 premières : rate limit OK ; comme /api/photos exige une session absente → redirect /login (jeté).
		for (let i = 0; i < 10; i++) {
			await runHandle(makeEvent('/api/photos', { ip }));
		}
		const r11 = await runHandle(makeEvent('/api/photos', { ip }));
		expect(r11.thrown).toBe(false);
		expect(r11.thrown ? 0 : r11.response.status).toBe(429);
	});

	it('rate limit : /api/prospection/* est couvert (429 après 10 req/min)', async () => {
		const ip = '203.0.113.51';
		for (let i = 0; i < 10; i++) await runHandle(makeEvent('/api/prospection/search-ch', { ip }));
		const r11 = await runHandle(makeEvent('/api/prospection/search-ch', { ip }));
		expect(r11.thrown).toBe(false);
		expect(r11.thrown ? 0 : r11.response.status).toBe(429);
	});

	it('rate limit : /api/visits* est couvert (429 après 10 req/min)', async () => {
		const ip = '203.0.113.52';
		for (let i = 0; i < 10; i++) await runHandle(makeEvent('/api/visits', { ip }));
		const r11 = await runHandle(makeEvent('/api/visits', { ip }));
		expect(r11.thrown).toBe(false);
		expect(r11.thrown ? 0 : r11.response.status).toBe(429);
	});

	it('rate limit M-04 : POST /login est couvert (429 après 10 req/min, anti cost-burn SMTP)', async () => {
		const ip = '203.0.113.60';
		for (let i = 0; i < 10; i++) await runHandle(makeEvent('/login', { ip, method: 'POST' }));
		const r11 = await runHandle(makeEvent('/login', { ip, method: 'POST' }));
		expect(r11.thrown).toBe(false);
		expect(r11.thrown ? 0 : r11.response.status).toBe(429);
	});

	it('rate limit M-04 : GET /login n’est PAS rate-limité (navigation libre)', async () => {
		const ip = '203.0.113.61';
		for (let i = 0; i < 25; i++) await runHandle(makeEvent('/login', { ip, method: 'GET' }));
		const r = await runHandle(makeEvent('/login', { ip, method: 'GET' }));
		// Pas de 429 : GET /login reste accessible (sans session → resolve appelé).
		expect(r.thrown).toBe(false);
		expect(r.thrown ? 0 : r.response.status).not.toBe(429);
	});
});

describe('hooks.server : porte publique de validation externe', () => {
	const TOKEN = 'Kx3abcdefghijklmnopqrstuvwxyz0123456789ABCD'; // 43 chars (forme réelle)

	it('page /validation/<token> SANS session → PAS de redirect (exemption d’auth par le token)', async () => {
		const r = await runHandle(makeEvent(`/validation/${TOKEN}`));
		expect(r.thrown).toBe(false);
		expect(r.resolve).toHaveBeenCalled();
	});

	it('API /api/validation/<token>/decision SANS session → PAS de redirect', async () => {
		const r = await runHandle(makeEvent(`/api/validation/${TOKEN}/decision`, { method: 'POST' }));
		expect(r.thrown).toBe(false);
	});

	it('les réponses publiques portent no-store + X-Robots-Tag (couvre succès/erreur/POST via le hook)', async () => {
		const r = await runHandle(makeEvent(`/validation/${TOKEN}`));
		expect(r.thrown).toBe(false);
		const h = r.thrown ? undefined : r.response.headers;
		expect(h?.get('Cache-Control')).toBe('no-store');
		expect(h?.get('X-Robots-Tag')).toBe('noindex, nofollow');
	});

	it('sous-route inventée /api/validation/<token>/admin → PAS exemptée → redirect /login', async () => {
		const r = await runHandle(makeEvent(`/api/validation/${TOKEN}/admin`));
		expect(r.thrown).toBe(true);
		expect(r.thrown && r.redirect.location).toBe('/login');
	});

	it('une route protégée ordinaire NE reçoit PAS les headers publics', async () => {
		mockSessionState = { session: { access_token: 'x' }, user: { email: 'pascal@filmpro.ch' } };
		const cookies = makeCookies({ login_at: String(Date.now()) });
		const r = await runHandle(makeEvent('/dashboard', { cookies }));
		expect(r.thrown).toBe(false);
		const h = r.thrown ? undefined : r.response.headers;
		expect(h?.get('Cache-Control')).toBe(null);
		expect(h?.get('X-Robots-Tag')).toBe(null);
	});
});
