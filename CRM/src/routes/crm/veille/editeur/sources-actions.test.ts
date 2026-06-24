import { describe, it, expect, vi, beforeEach } from 'vitest';

// Couverture des actions SOURCES de l'éditeur veille (étape 5b). Mêmes garde-fous
// que le pattern themes/addItem : refus auth (401), validation (400), happy path qui
// appelle le service-role. Le régime n'est PAS saisi : on prouve qu'il est calculé
// (createSource) depuis tier+flags (via le repository réel, non mocké).

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

// Service client mocké : capture la row insérée / le patch d'update, fournit maxRow.
const serviceRef: { current: unknown } = { current: undefined };
vi.mock('$lib/server/supabase', () => ({
	createSupabaseServiceClient: () => serviceRef.current
}));

function makeServiceClient() {
	let inserted: Record<string, unknown> | null = null;
	let updated: Record<string, unknown> | null = null;
	let deletedId: string | null = null;
	const client = {
		from() {
			return {
				// maxRow (sort_order) pour createSource
				select() {
					return {
						order: () => ({
							limit: () => ({ maybeSingle: async () => ({ data: { sort_order: 120 }, error: null }) })
						})
					};
				},
				insert(payload: Record<string, unknown>) {
					inserted = payload;
					return { select: () => ({ single: async () => ({ data: { id: 'new-id', ...payload }, error: null }) }) };
				},
				update(payload: Record<string, unknown>) {
					updated = payload;
					return {
						eq: () => ({ select: () => ({ single: async () => ({ data: { id: 'x', ...payload }, error: null }) }) })
					};
				},
				delete() {
					return { eq: (_k: string, v: string) => { deletedId = v; return Promise.resolve({ error: null }); } };
				}
			};
		}
	};
	return { client, inserted: () => inserted, updated: () => updated, deletedId: () => deletedId };
}

function makeFormData(values: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(values)) fd.set(k, v);
	return fd;
}

async function callAction(
	name: 'createSource' | 'updateSource' | 'toggleSourceActive' | 'deleteSource',
	input: Record<string, string>,
	opts: { user?: { id: string } | null; service?: ReturnType<typeof makeServiceClient> } = {}
) {
	const svc = opts.service ?? makeServiceClient();
	serviceRef.current = svc.client;
	const mod = await import('./+page.server');
	const action = mod.actions[name]!;
	const event = {
		request: { formData: async () => makeFormData(input) } as unknown as Request,
		locals: {
			safeGetSession: async () => ({ user: 'user' in opts ? opts.user : { id: 'u-1' } })
		}
	} as unknown as Parameters<typeof action>[0];
	const result = await action(event);
	return { result, svc };
}

const UUID = '3f29c8a1-7b6e-4d2f-9a1c-2e5b8d4f6a70'; // UUID v4 valide (Zod .uuid())

beforeEach(() => {
	serviceRef.current = undefined;
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('createSource action', () => {
	it('utilisateur non authentifié → 401', async () => {
		const { result } = await callAction('createSource', { url: 'https://x.ch', name: 'X' }, { user: null });
		expect((result as { status?: number }).status).toBe(401);
	});

	it('URL manquante → 400', async () => {
		const { result } = await callAction('createSource', { name: 'X' });
		expect((result as { status?: number }).status).toBe(400);
	});

	it('nom manquant → 400', async () => {
		const { result } = await callAction('createSource', { url: 'https://exemple.ch' });
		expect((result as { status?: number }).status).toBe(400);
	});

	it('happy path T4 : insère hostname normalisé, regime CALCULÉ (trusted), sort_order = max+10', async () => {
		const { result, svc } = await callAction('createSource', {
			url: 'https://www.Exemple.ch/page',
			name: 'Exemple',
			tier: 'T4'
		});
		expect((result as { success?: boolean }).success).toBe(true);
		const row = svc.inserted()!;
		expect(row.hostname).toBe('exemple.ch'); // URL → domaine normalisé
		expect(row.regime).toBe('trusted'); // calculé depuis T4, pas saisi
		expect(row.sort_order).toBe(130); // 120 (max) + 10
	});

	it('happy path T7A (installateur) : regime calculé strict', async () => {
		const { svc } = await callAction('createSource', {
			url: 'https://concurrent.ch',
			name: 'Concurrent',
			tier: 'T7A',
			is_benchmark: 'true'
		});
		expect(svc.inserted()!.regime).toBe('strict');
		expect(svc.inserted()!.is_benchmark).toBe(true);
	});

	it('strict_verbatim force strict même sur T4', async () => {
		const { svc } = await callAction('createSource', {
			url: 'https://x.com',
			name: 'X',
			tier: 'T4',
			strict_verbatim: 'true'
		});
		expect(svc.inserted()!.regime).toBe('strict');
	});
});

describe('updateSource action', () => {
	it('utilisateur non authentifié → 401', async () => {
		const { result } = await callAction('updateSource', { id: UUID, name: 'Y' }, { user: null });
		expect((result as { status?: number }).status).toBe(401);
	});

	it('id non-UUID → 400', async () => {
		const { result } = await callAction('updateSource', { id: 'pas-un-uuid', name: 'Y' });
		expect((result as { status?: number }).status).toBe(400);
	});

	it('patch vide (aucun champ) → 400', async () => {
		const { result } = await callAction('updateSource', { id: UUID });
		expect((result as { status?: number }).status).toBe(400);
	});

	it('happy path : met à jour le nom', async () => {
		const { result, svc } = await callAction('updateSource', { id: UUID, name: 'Nouveau nom' });
		expect((result as { success?: boolean }).success).toBe(true);
		expect(svc.updated()!.name).toBe('Nouveau nom');
	});
});

describe('toggleSourceActive action', () => {
	it('non authentifié → 401', async () => {
		const { result } = await callAction('toggleSourceActive', { id: UUID, active: 'false' }, { user: null });
		expect((result as { status?: number }).status).toBe(401);
	});
	it('met la source en pause (active=false)', async () => {
		const { result, svc } = await callAction('toggleSourceActive', { id: UUID, active: 'false' });
		expect((result as { success?: boolean }).success).toBe(true);
		expect(svc.updated()!.active).toBe(false);
	});
});

describe('deleteSource action', () => {
	it('non authentifié → 401', async () => {
		const { result } = await callAction('deleteSource', { id: UUID }, { user: null });
		expect((result as { status?: number }).status).toBe(401);
	});
	it('id non-UUID → 400', async () => {
		const { result } = await callAction('deleteSource', { id: 'nope' });
		expect((result as { status?: number }).status).toBe(400);
	});
	it('supprime par id', async () => {
		const { result, svc } = await callAction('deleteSource', { id: UUID });
		expect((result as { success?: boolean }).success).toBe(true);
		expect(svc.deletedId()).toBe(UUID);
	});
});
