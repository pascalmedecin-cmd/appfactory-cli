import { describe, it, expect } from 'vitest';
import { GET } from './+server';

const RPT = '11111111-2222-3333-4444-555555555555';

// Chaîne supabase minimale : .from().select().eq().maybeSingle() -> résultat injecté.
function supabaseReturning(result: { data: unknown; error: unknown }) {
	return {
		from: () => ({
			select: () => ({
				eq: () => ({
					maybeSingle: async () => result
				})
			})
		})
	};
}

function event(locals: unknown) {
	return { params: { id: RPT }, locals } as never;
}

describe('GET /crm/veille/[id]/brief - gardes (PDF de marque)', () => {
	it('401 si pas de session (refus, security DoD)', async () => {
		const locals = {
			safeGetSession: async () => ({ session: null, user: null }),
			supabase: supabaseReturning({ data: null, error: null })
		};
		await expect(GET(event(locals))).rejects.toMatchObject({ status: 401 });
	});

	it('404 si édition introuvable (session valide, row null)', async () => {
		const locals = {
			safeGetSession: async () => ({ session: { user: { id: 'u1' } }, user: { id: 'u1' } }),
			supabase: supabaseReturning({ data: null, error: null })
		};
		await expect(GET(event(locals))).rejects.toMatchObject({ status: 404 });
	});

	it('200 text/html brandé si édition trouvée (session valide)', async () => {
		const row = {
			id: RPT,
			week_label: '2026-W26',
			generated_at: '2026-06-26T06:00:00Z',
			compliance_tag: 'OK FilmPro',
			executive_summary: 'Synthèse de la semaine, suffisamment longue pour passer la validation Zod.',
			items: [],
			impacts_filmpro: []
		};
		const locals = {
			safeGetSession: async () => ({ session: { user: { id: 'u1' } }, user: { id: 'u1' } }),
			supabase: supabaseReturning({ data: row, error: null })
		};
		const res = await GET(event(locals));
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toContain('text/html');
		expect(res.headers.get('cache-control')).toContain('no-store');
		const body = await res.text();
		expect(body).toContain('<!DOCTYPE html>');
		expect(body).toContain('window.print()'); // enrichissement impression
	});
});
