import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';

// Audit 360 V2c H-17 : couverture tests du callback auth (2 branches verifyOtp + exchangeCodeForSession).

type SupabaseAuthMock = {
	auth: {
		verifyOtp: ReturnType<typeof vi.fn>;
		exchangeCodeForSession: ReturnType<typeof vi.fn>;
	};
};

function makeEvent(
	searchParams: Record<string, string>,
	supabase: SupabaseAuthMock,
	cookieSet = vi.fn()
) {
	const qs = new URLSearchParams(searchParams).toString();
	return {
		url: new URL(`https://filmpro-crm.vercel.app/auth/callback${qs ? `?${qs}` : ''}`),
		locals: { supabase },
		cookies: { set: cookieSet }
	} as unknown as Parameters<typeof GET>[0];
}

async function runGet(event: Parameters<typeof GET>[0]) {
	try {
		await GET(event);
		return { thrown: false as const };
	} catch (e) {
		return { thrown: true as const, redirect: e as { status: number; location: string } };
	}
}

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('auth/callback GET (H-17)', () => {
	it('verifyOtp succeed → redirect 303 vers / + cookie login_at 7 jours', async () => {
		const cookieSet = vi.fn();
		const supabase: SupabaseAuthMock = {
			auth: {
				verifyOtp: vi.fn(async () => ({ error: null })),
				exchangeCodeForSession: vi.fn()
			}
		};
		const r = await runGet(makeEvent({ token_hash: 'abc123', type: 'email' }, supabase, cookieSet));
		expect(r.thrown).toBe(true);
		expect(r.thrown && r.redirect.status).toBe(303);
		expect(r.thrown && r.redirect.location).toBe('/');
		expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc123', type: 'email' });
		expect(cookieSet).toHaveBeenCalledWith(
			'login_at',
			expect.any(String),
			expect.objectContaining({ maxAge: 7 * 24 * 60 * 60, httpOnly: true })
		);
	});

	it('verifyOtp fail → redirect vers /login?error=callback, pas de cookie', async () => {
		const cookieSet = vi.fn();
		const supabase: SupabaseAuthMock = {
			auth: {
				verifyOtp: vi.fn(async () => ({ error: { message: 'invalid otp' } })),
				exchangeCodeForSession: vi.fn()
			}
		};
		const r = await runGet(makeEvent({ token_hash: 'abc', type: 'magiclink' }, supabase, cookieSet));
		expect(r.thrown).toBe(true);
		expect(r.thrown && r.redirect.status).toBe(303);
		expect(r.thrown && r.redirect.location).toContain('/login?error=callback');
		expect(cookieSet).not.toHaveBeenCalled();
	});

	it('exchangeCodeForSession succeed → redirect / + cookie', async () => {
		const cookieSet = vi.fn();
		const supabase: SupabaseAuthMock = {
			auth: {
				verifyOtp: vi.fn(),
				exchangeCodeForSession: vi.fn(async () => ({ error: null }))
			}
		};
		const r = await runGet(makeEvent({ code: 'pkce-code' }, supabase, cookieSet));
		expect(r.thrown && r.redirect.location).toBe('/');
		expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('pkce-code');
		expect(cookieSet).toHaveBeenCalled();
		expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
	});

	it('exchangeCodeForSession fail → redirect /login?error=callback, pas de cookie', async () => {
		const cookieSet = vi.fn();
		const supabase: SupabaseAuthMock = {
			auth: {
				verifyOtp: vi.fn(),
				exchangeCodeForSession: vi.fn(async () => ({ error: { message: 'pkce fail' } }))
			}
		};
		const r = await runGet(makeEvent({ code: 'bad-code' }, supabase, cookieSet));
		expect(r.thrown && r.redirect.location).toContain('/login?error=callback');
		expect(cookieSet).not.toHaveBeenCalled();
	});

	it('aucun token_hash ni code → redirect / sans cookie (no-op)', async () => {
		const cookieSet = vi.fn();
		const supabase: SupabaseAuthMock = {
			auth: { verifyOtp: vi.fn(), exchangeCodeForSession: vi.fn() }
		};
		const r = await runGet(makeEvent({}, supabase, cookieSet));
		expect(r.thrown && r.redirect.location).toBe('/');
		expect(cookieSet).not.toHaveBeenCalled();
		expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
		expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
	});
});
