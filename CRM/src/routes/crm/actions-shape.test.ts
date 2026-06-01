import { describe, it, expect, vi } from 'vitest';

/**
 * Audit 360 H-14 : tests de shape pour les 4 form actions cibles, alignées
 * sur `ActionResult<T>` (`{success: true, ...payload}` | `{success: false,
 * error}`). Chaque action est testée 2 fois : cas Zod invalide → fail, cas
 * happy path → success.
 *
 * Cas spéciaux (createExpress dedup match, createExpress ambiguous candidates)
 * sont déjà couverts par `prospection/createExpress.test.ts` ; ce fichier se
 * concentre sur le contract « success: true | success: false ».
 */

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

function makeFormData(values: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(values)) fd.set(k, v);
	return fd;
}

function makeMockSupabase(opts: {
	insertError?: { message: string } | null;
	updateError?: { message: string } | null;
	deleteError?: { message: string } | null;
	candidates?: unknown[];
} = {}) {
	const builder = {
		select() { return builder; },
		ilike() { return builder; },
		eq() { return builder; },
		in() {
			return Promise.resolve({ data: null, error: opts.deleteError ?? null });
		},
		limit() { return Promise.resolve({ data: opts.candidates ?? [], error: null }); },
		insert() { return Promise.resolve({ error: opts.insertError ?? null }); },
		update() {
			return {
				eq() { return Promise.resolve({ error: opts.updateError ?? null }); }
			};
		},
		delete() {
			return {
				in() { return Promise.resolve({ error: opts.deleteError ?? null }); },
				eq() { return Promise.resolve({ error: opts.deleteError ?? null }); }
			};
		}
	};
	return { from() { return builder; } };
}

async function callAction(modulePath: string, actionName: string, supabase: ReturnType<typeof makeMockSupabase>, fields: Record<string, string>) {
	const mod = await import(modulePath);
	const action = mod.actions[actionName];
	const request = { formData: async () => makeFormData(fields) } as unknown as Request;
	return action({ request, locals: { supabase } } as unknown as Parameters<typeof action>[0]);
}

describe('H-14 ActionResult shape : prospection.createExpress', () => {
	it('Zod invalide → success: false + error string', async () => {
		const supabase = makeMockSupabase();
		const result = await callAction('./prospection/+page.server', 'createExpress', supabase, {
			raison_sociale: '', // requis min(1) → fail Zod
			telephone: '',
			nom_contact: '',
			notes: ''
		});
		expect(result).toMatchObject({ data: { success: false } });
		expect(result.data.error).toBeTypeOf('string');
		expect(result.status).toBe(400);
	});

	it('happy path nouveau lead → success: true + id + duplicate=false', async () => {
		const supabase = makeMockSupabase({ candidates: [] });
		const result = await callAction('./prospection/+page.server', 'createExpress', supabase, {
			raison_sociale: 'Vitrerie Nouvelle SA',
			telephone: '',
			nom_contact: '',
			notes: ''
		});
		expect(result).toMatchObject({ success: true, duplicate: false });
		expect(result.id).toBeTypeOf('string');
	});
});

describe('H-14 ActionResult shape : prospection.saveRecherche', () => {
	it('Zod invalide → success: false + error string', async () => {
		const supabase = makeMockSupabase();
		const result = await callAction('./prospection/+page.server', 'saveRecherche', supabase, {
			nom: '' // min(1) → fail
		});
		expect(result).toMatchObject({ data: { success: false } });
		expect(result.data.error).toBeTypeOf('string');
		expect(result.status).toBe(400);
	});

	it('happy path → success: true', async () => {
		const supabase = makeMockSupabase();
		const result = await callAction('./prospection/+page.server', 'saveRecherche', supabase, {
			nom: 'Veille VD chaud',
			alerte_active: 'true',
			frequence_alerte: 'quotidien'
		});
		expect(result).toMatchObject({ success: true });
	});
});

describe('H-14 ActionResult shape : signaux.deleteBatch', () => {
	it('Zod invalide → success: false + error string', async () => {
		const supabase = makeMockSupabase();
		const result = await callAction('./signaux/+page.server', 'deleteBatch', supabase, {
			ids: '' // min(1) → fail
		});
		expect(result).toMatchObject({ data: { success: false } });
		expect(result.data.error).toBeTypeOf('string');
		expect(result.status).toBe(400);
	});

	it('happy path → success: true + deleted', async () => {
		const supabase = makeMockSupabase();
		const result = await callAction('./signaux/+page.server', 'deleteBatch', supabase, {
			ids: '550e8400-e29b-41d4-a716-446655440000,550e8400-e29b-41d4-a716-446655440001'
		});
		expect(result).toMatchObject({ success: true, deleted: 2 });
	});
});

describe('H-14 ActionResult shape : signaux.createOpportunite', () => {
	it('Zod invalide → success: false + error string', async () => {
		const supabase = makeMockSupabase();
		const result = await callAction('./signaux/+page.server', 'createOpportunite', supabase, {
			signal_id: 'not-a-uuid', // requiredUUID → fail
			titre: ''
		});
		expect(result).toMatchObject({ data: { success: false } });
		expect(result.data.error).toBeTypeOf('string');
		expect(result.status).toBe(400);
	});

	it('happy path → success: true + redirectTo /crm/pipeline', async () => {
		const supabase = makeMockSupabase();
		const result = await callAction('./signaux/+page.server', 'createOpportunite', supabase, {
			signal_id: '550e8400-e29b-41d4-a716-446655440000',
			titre: 'Opportunité issue d\'un signal'
		});
		expect(result).toMatchObject({ success: true, redirectTo: '/crm/pipeline' });
	});
});
