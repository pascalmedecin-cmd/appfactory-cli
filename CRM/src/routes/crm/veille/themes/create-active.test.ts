import { describe, it, expect, vi, beforeEach } from 'vitest';

// Fix contrat UI↔serveur (étape 5b) : l'UI de CRÉATION de thème n'émet pas de champ
// `active`. L'action `create` ne doit donc PAS forcer active:false (ce qui ferait
// naître le thème inactif) : sans champ, on laisse le DEFAULT true de la table.
// Ces tests verrouillent ce comportement (invisible aux autres tests).

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

const serviceRef: { current: unknown } = { current: undefined };
vi.mock('$lib/server/supabase', () => ({ createSupabaseServiceClient: () => serviceRef.current }));

function makeServiceClient() {
	let inserted: Record<string, unknown> | null = null;
	const client = {
		from() {
			return {
				insert(payload: Record<string, unknown>) {
					inserted = payload;
					return { select: () => ({ single: async () => ({ data: { id: 'new', ...payload }, error: null }) }) };
				}
			};
		}
	};
	return { client, inserted: () => inserted };
}

function makeFormData(values: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(values)) fd.set(k, v);
	return fd;
}

async function callCreate(input: Record<string, string>) {
	const svc = makeServiceClient();
	serviceRef.current = svc.client;
	const mod = await import('./+page.server');
	const action = mod.actions.create!;
	const event = {
		request: { formData: async () => makeFormData(input) } as unknown as Request,
		locals: { safeGetSession: async () => ({ user: { id: 'u-1' } }) }
	} as unknown as Parameters<typeof action>[0];
	const result = await action(event);
	return { result, svc };
}

const BASE = {
	slug: 'vitrages_haute_performance',
	label: 'Vitrages haute performance',
	description: 'Low-E, triple vitrage',
	category: 'core',
	sort_order: '10'
};

beforeEach(() => {
	serviceRef.current = undefined;
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('themes create action : champ `active`', () => {
	it("sans champ `active` → n'insère PAS active (DEFAULT true de la table s'applique)", async () => {
		const { result, svc } = await callCreate(BASE);
		expect((result as { success?: boolean }).success).toBe(true);
		expect('active' in svc.inserted()!).toBe(false);
	});

	it("active='true' fourni → insère active:true", async () => {
		const { svc } = await callCreate({ ...BASE, active: 'true' });
		expect(svc.inserted()!.active).toBe(true);
	});

	it("active='false' fourni explicitement → insère active:false", async () => {
		const { svc } = await callCreate({ ...BASE, active: 'false' });
		expect(svc.inserted()!.active).toBe(false);
	});
});
