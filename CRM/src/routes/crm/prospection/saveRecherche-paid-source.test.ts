import { describe, it, expect, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

/**
 * Spec google-places-2026-05-12 A5 : la source payante `google_places` est interdite dans
 * une recherche sauvegardée / alerte automatique (garde-fou budget). Import manuel uniquement.
 */

function makeFormData(values: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(values)) fd.set(k, v);
	return fd;
}

function mockSupabaseInsertOk() {
	const b = { insert: () => Promise.resolve({ error: null }) };
	return { from: () => b } as never;
}

async function callSaveRecherche(fields: Record<string, string>, supabase: ReturnType<typeof mockSupabaseInsertOk>) {
	const mod = await import('./+page.server');
	const action = mod.actions.saveRecherche;
	return action({ request: { formData: async () => makeFormData(fields) }, locals: { supabase } } as never);
}

describe('saveRecherche : refus de la source payante google_places', () => {
	it('rejette une recherche contenant google_places (400, message « import manuel »)', async () => {
		const res = (await callSaveRecherche(
			{ nom: 'BTP Genève', sources: JSON.stringify(['zefix', 'google_places']) },
			mockSupabaseInsertOk(),
		)) as { status?: number; data?: { success?: boolean; error?: string } };
		expect(res.status).toBe(400);
		expect(res.data?.success).toBe(false);
		expect(res.data?.error).toMatch(/manuel/i);
	});

	it('accepte une recherche sans google_places', async () => {
		const res = (await callSaveRecherche(
			{ nom: 'BTP Genève', sources: JSON.stringify(['zefix', 'search_ch']) },
			mockSupabaseInsertOk(),
		)) as { success?: boolean };
		expect(res.success).toBe(true);
	});
});
