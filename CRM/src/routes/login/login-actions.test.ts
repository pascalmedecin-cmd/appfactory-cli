import { describe, it, expect, vi, beforeEach } from 'vitest';

// Audit 360 V2c H-16 : couverture tests des form actions login (sendcode / verifycode).
// Pattern S99 risk : ces actions portent l'auth OTP + whitelist domaine + cookie 7j.

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

const mockEnv: Record<string, string | undefined> = {};
vi.mock('$env/dynamic/private', () => ({ env: mockEnv }));
vi.mock('$env/dynamic/public', () => ({
	env: { PUBLIC_SUPABASE_URL: 'https://test.supabase.co', PUBLIC_SUPABASE_ANON_KEY: 'anon-key' }
}));

let mockSignInImpl: (args: { email: string }) => Promise<{ error: unknown }>;
let mockVerifyOtpImpl: (args: {
	email: string;
	token: string;
	type: string;
}) => Promise<{ error: unknown }>;
vi.mock('$lib/server/supabase', () => ({
	createSupabaseServerClient: () => ({
		auth: {
			signInWithOtp: (a: { email: string }) => mockSignInImpl(a),
			verifyOtp: (a: { email: string; token: string; type: string }) => mockVerifyOtpImpl(a)
		}
	})
}));

function makeFormData(values: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(values)) fd.set(k, v);
	return fd;
}

function makeCookies() {
	const store: Record<string, string> = {};
	return {
		set: vi.fn((name: string, value: string) => {
			store[name] = value;
		}),
		get: (name: string) => store[name],
		delete: vi.fn()
	};
}

async function callAction(
	name: 'sendcode' | 'verifycode',
	fd: FormData,
	cookies: ReturnType<typeof makeCookies>
): Promise<unknown> {
	const mod = await import('./+page.server');
	const action = mod.actions[name]!;
	const event = {
		request: { formData: async () => fd } as unknown as Request,
		cookies,
		url: new URL('https://filmpro-crm.vercel.app/login')
	} as unknown as Parameters<typeof action>[0];
	return action(event);
}

beforeEach(() => {
	for (const k of Object.keys(mockEnv)) delete mockEnv[k];
	mockEnv.ALLOWED_DOMAINS = 'filmpro.ch';
	mockEnv.ALLOWED_EMAILS = '';
	mockSignInImpl = async () => ({ error: null });
	mockVerifyOtpImpl = async () => ({ error: null });
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('login sendcode (H-16)', () => {
	it('envoie le code pour une adresse @filmpro.ch (happy path)', async () => {
		const cookies = makeCookies();
		const seen: string[] = [];
		mockSignInImpl = async ({ email }) => {
			seen.push(email);
			return { error: null };
		};
		const r = await callAction('sendcode', makeFormData({ email: 'Pascal@FilmPro.ch' }), cookies);
		expect(r).toEqual({ codeSent: true, email: 'pascal@filmpro.ch' });
		expect(seen).toEqual(['pascal@filmpro.ch']);
	});

	// Atelier 209 : coexistence par 4 ADRESSES NOMMÉES, aucun domaine ouvert (décision Pascal 15/07).
	const ATELIER_ALLOWED_EMAILS =
		'pascal@filmpro.ch,antoine@filmpro.ch,pascal@lamaisoncreativedirection.ch,antoine@lamaisoncreativedirection.ch';

	it('accepte une adresse lamaisoncreativedirection.ch nommée (coexistence, sans domaine ouvert)', async () => {
		mockEnv.ALLOWED_DOMAINS = '';
		mockEnv.ALLOWED_EMAILS = ATELIER_ALLOWED_EMAILS;
		const cookies = makeCookies();
		const seen: string[] = [];
		mockSignInImpl = async ({ email }) => {
			seen.push(email);
			return { error: null };
		};
		const r = await callAction(
			'sendcode',
			makeFormData({ email: 'pascal@lamaisoncreativedirection.ch' }),
			cookies
		);
		expect(r).toEqual({ codeSent: true, email: 'pascal@lamaisoncreativedirection.ch' });
		expect(seen).toEqual(['pascal@lamaisoncreativedirection.ch']);
	});

	it('refuse une adresse NON listée au même domaine (403) - aucun domaine ouvert', async () => {
		mockEnv.ALLOWED_DOMAINS = '';
		mockEnv.ALLOWED_EMAILS = ATELIER_ALLOWED_EMAILS;
		const cookies = makeCookies();
		const r = (await callAction(
			'sendcode',
			makeFormData({ email: 'stagiaire@lamaisoncreativedirection.ch' }),
			cookies
		)) as { status: number; data: { error: string } };
		expect(r.status).toBe(403);
	});

	it('refuse une adresse hors domaine (403)', async () => {
		const cookies = makeCookies();
		const r = (await callAction(
			'sendcode',
			makeFormData({ email: 'hacker@gmail.com' }),
			cookies
		)) as { status: number; data: { error: string } };
		expect(r.status).toBe(403);
		// Copy neutralisee (Atelier 209) : plus de domaine code en dur dans le message.
		expect(r.data.error).toMatch(/autoris/i);
	});

	it('refuse une adresse vide (400)', async () => {
		const cookies = makeCookies();
		const r = (await callAction('sendcode', makeFormData({}), cookies)) as { status: number };
		expect(r.status).toBe(400);
	});

	it('remonte une erreur 429 du provider OTP', async () => {
		const cookies = makeCookies();
		mockSignInImpl = async () => ({ error: { status: 429, message: 'rate limited' } });
		const r = (await callAction(
			'sendcode',
			makeFormData({ email: 'pascal@filmpro.ch' }),
			cookies
		)) as { status: number };
		expect(r.status).toBe(429);
	});

	it('remonte une erreur 500 générique sur échec provider', async () => {
		const cookies = makeCookies();
		mockSignInImpl = async () => ({ error: { status: 500, message: 'boom' } });
		const r = (await callAction(
			'sendcode',
			makeFormData({ email: 'pascal@filmpro.ch' }),
			cookies
		)) as { status: number };
		expect(r.status).toBe(500);
	});
});

describe('login verifycode (H-16)', () => {
	it('vérifie un bon code et pose le cookie login_at 7 jours httpOnly', async () => {
		const cookies = makeCookies();
		const r = await callAction(
			'verifycode',
			makeFormData({ email: 'pascal@filmpro.ch', code: '123456' }),
			cookies
		);
		expect(r).toEqual({ verified: true });
		expect(cookies.set).toHaveBeenCalledWith(
			'login_at',
			expect.any(String),
			expect.objectContaining({ path: '/', httpOnly: true, maxAge: 7 * 24 * 60 * 60 })
		);
	});

	it('refuse un code mal formé sans toucher au cookie (400)', async () => {
		const cookies = makeCookies();
		const r = (await callAction(
			'verifycode',
			makeFormData({ email: 'pascal@filmpro.ch', code: 'abc' }),
			cookies
		)) as { status: number };
		expect(r.status).toBe(400);
		expect(cookies.set).not.toHaveBeenCalled();
	});

	it('refuse email ou code manquant (400)', async () => {
		const cookies = makeCookies();
		const r = (await callAction(
			'verifycode',
			makeFormData({ email: 'pascal@filmpro.ch' }),
			cookies
		)) as { status: number };
		expect(r.status).toBe(400);
	});

	it('signale un code incorrect (400)', async () => {
		const cookies = makeCookies();
		mockVerifyOtpImpl = async () => ({ error: { message: 'Invalid token' } });
		const r = (await callAction(
			'verifycode',
			makeFormData({ email: 'pascal@filmpro.ch', code: '000000' }),
			cookies
		)) as { status: number; data: { error: string } };
		expect(r.status).toBe(400);
		expect(r.data.error).toMatch(/incorrect/i);
		expect(cookies.set).not.toHaveBeenCalled();
	});

	it('signale un code expiré (400)', async () => {
		const cookies = makeCookies();
		mockVerifyOtpImpl = async () => ({ error: { message: 'Token has expired' } });
		const r = (await callAction(
			'verifycode',
			makeFormData({ email: 'pascal@filmpro.ch', code: '654321' }),
			cookies
		)) as { status: number; data: { error: string } };
		expect(r.status).toBe(400);
		expect(r.data.error).toMatch(/expir/i);
	});
});
