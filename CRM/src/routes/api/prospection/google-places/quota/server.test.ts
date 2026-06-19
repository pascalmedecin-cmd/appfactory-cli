import { describe, it, expect } from 'vitest';
import { GET } from './+server';

/**
 * Mini-projet Prospection P2 (2026-06-18) - endpoint GET du quota Google Places.
 *
 * Comble la lacune de couverture : cet endpoint alimente le compteur « X/900 restantes ce mois »
 * (page + modale d'import). On vérifie l'auth (401), l'exposition complète used/cap/remaining/
 * exhausted/warning, et les seuils 80 % / 95 % / 100 %. `getMonthlyUsage` lit la vraie table
 * `api_quota_log` → on mocke le client Supabase (maybeSingle renvoie { calls: used }).
 */
function makeEvent(used: number | null, opts: { session?: boolean } = {}) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const builder: any = {};
	builder.select = () => builder;
	builder.eq = () => builder;
	builder.maybeSingle = () => Promise.resolve({ data: used === null ? null : { calls: used }, error: null });
	const supabase = { from: () => builder };
	return {
		locals: {
			supabase,
			safeGetSession: async () => ({ session: opts.session === false ? null : { user: { email: 'a@filmpro.ch' } } }),
		},
	} as never;
}

describe('GET /api/prospection/google-places/quota', () => {
	it('401 si pas de session', async () => {
		const res = await GET(makeEvent(0, { session: false }));
		expect(res.status).toBe(401);
	});

	it('expose used/cap/remaining/exhausted/warning (usage 0)', async () => {
		const res = await GET(makeEvent(0));
		const body = await res.json();
		expect(body).toMatchObject({ used: 0, cap: 900, remaining: 900, exhausted: false, warning: null });
	});

	it('pas de ligne quota (null) → usage 0, gratuit', async () => {
		const res = await GET(makeEvent(null));
		const body = await res.json();
		expect(body).toMatchObject({ used: 0, remaining: 900, exhausted: false });
	});

	it('seuil 80 % (used=720) → bandeau d\'avertissement « élevé »', async () => {
		const res = await GET(makeEvent(720));
		const body = await res.json();
		expect(body.exhausted).toBe(false);
		expect(body.remaining).toBe(180);
		expect(body.warning).toMatch(/élevé/i);
	});

	it('seuil 95 % (used=855) → avertissement critique « presque épuisé »', async () => {
		const res = await GET(makeEvent(855));
		const body = await res.json();
		expect(body.warning).toMatch(/presque épuisé/i);
	});

	it('cap atteint 100 % (used=900) → exhausted, remaining 0', async () => {
		const res = await GET(makeEvent(900));
		const body = await res.json();
		expect(body).toMatchObject({ remaining: 0, exhausted: true });
	});
});
