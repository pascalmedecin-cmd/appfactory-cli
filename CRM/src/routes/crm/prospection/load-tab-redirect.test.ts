import { describe, it, expect, vi } from 'vitest';

/**
 * Mini-projet Prospection P1 (2026-06-18) - garde de route au niveau du load serveur.
 *
 * Un ?tab= explicite vers un onglet masqué (simap/regbl, sources coupées en V5) ou inconnu
 * doit rediriger (303) vers l'URL canonique du premier onglet visible (entreprises), sans
 * écran fantôme et sans boucle (la cible est toujours un onglet visible). Les onglets visibles
 * sont servis tels quels. Le redirect est levé AVANT tout accès Supabase.
 */

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

function createSpyingSupabase() {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function makeBuilder(): any {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const b: any = {};
		b.select = () => b;
		b.in = () => b;
		b.eq = () => b;
		b.neq = () => b;
		b.gte = () => b;
		b.order = () => b;
		b.limit = () => b;
		b.range = () => b;
		b.ilike = () => b;
		b.or = () => b;
		b.insert = () => Promise.resolve({ error: null });
		b.update = () => b;
		b.delete = () => b;
		b.maybeSingle = () => Promise.resolve({ data: null, error: null });
		b.single = () => Promise.resolve({ data: null, error: null });
		b.then = (resolve: (v: unknown) => void) => resolve({ data: [], count: 0, error: null });
		return b;
	}
	return { from: () => makeBuilder() };
}

async function runLoad(searchSuffix: string) {
	const sb = createSpyingSupabase();
	const mod = await import('./+page.server');
	const url = new URL(`http://localhost/crm/prospection${searchSuffix}`);
	return mod.load({ locals: { supabase: sb }, url, parent: async () => ({}) } as unknown as Parameters<typeof mod.load>[0]);
}

describe('P1 - garde de route onglet Prospection (load)', () => {
	it('?tab=simap (onglet masqué) redirige 303 vers ?tab=entreprises', async () => {
		await expect(runLoad('?tab=simap')).rejects.toMatchObject({
			status: 303,
			location: '/crm/prospection?tab=entreprises',
		});
	});

	it('?tab=regbl (onglet masqué) redirige 303 vers ?tab=entreprises', async () => {
		await expect(runLoad('?tab=regbl')).rejects.toMatchObject({
			status: 303,
			location: '/crm/prospection?tab=entreprises',
		});
	});

	it('?tab=inconnu redirige 303 vers ?tab=entreprises (pas d\'écran fantôme)', async () => {
		await expect(runLoad('?tab=zzz')).rejects.toMatchObject({
			status: 303,
			location: '/crm/prospection?tab=entreprises',
		});
	});

	it('sans ?tab : sert l\'onglet par défaut (entreprises), sans redirection', async () => {
		const data = await runLoad('');
		expect((data as { tab: string }).tab).toBe('entreprises');
	});

	it('?tab=entreprises : onglet visible servi tel quel, sans redirection', async () => {
		const data = await runLoad('?tab=entreprises');
		expect((data as { tab: string }).tab).toBe('entreprises');
	});

	it('?tab=terrain : onglet visible servi tel quel, sans redirection', async () => {
		const data = await runLoad('?tab=terrain');
		expect((data as { tab: string }).tab).toBe('terrain');
	});
});
