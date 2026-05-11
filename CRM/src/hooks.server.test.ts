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
const mockSignOut = vi.fn(async () => ({ error: null }));
vi.mock('$lib/server/supabase', () => ({
	createSupabaseServerClient: () => ({
		auth: {
			getSession: async () => ({ data: { session: mockSessionState.session } }),
			getUser: async () =>
				mockSessionState.session
					? { data: { user: mockSessionState.user }, error: null }
					: { data: { user: null }, error: { message: 'no user' } },
			signOut: mockSignOut
		}
	})
}));

type HandleFn = typeof import('./hooks.server').handle;
let handle: HandleFn;

beforeAll(async () => {
	// setInterval de nettoyage est créé à l'import du module : on le neutralise
	// via fake timers pour ne pas garder le process en vie après les tests.
	vi.useFakeTimers();
	handle = (await import('./hooks.server')).handle;
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
		url: new URL(`https://filmpro-crm.vercel.app${pathname}`),
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
