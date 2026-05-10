import { describe, it, expect, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

function makeFormData(values: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(values)) fd.set(k, v);
	return fd;
}

function createMockSupabase(rpcImpl: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>) {
	return {
		from() {
			throw new Error('transferer V2b should not call .from() — must use rpc()');
		},
		rpc: rpcImpl,
	};
}

async function callTransferer(
	supabase: ReturnType<typeof createMockSupabase>,
	leadId: string
): Promise<unknown> {
	const mod = await import('./+page.server');
	const action = mod.actions.transferer;
	const event = {
		request: { formData: async () => makeFormData({ id: leadId }) } as unknown as Request,
		locals: { supabase },
	} as unknown as Parameters<typeof action>[0];
	return action(event);
}

describe('transferer RPC atomique (V2b H-10)', () => {
	it('appelle rpc("transfer_lead_to_crm") et retourne entrepriseId au succès', async () => {
		const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
		const supabase = createMockSupabase(async (name, args) => {
			calls.push({ name, args });
			return {
				data: { entreprise_id: 'ent-new-1', contact_id: 'ct-new-1' },
				error: null,
			};
		});
		const r = await callTransferer(
			supabase,
			'11111111-1111-4111-8111-111111111111'
		);
		expect(calls).toHaveLength(1);
		expect(calls[0].name).toBe('transfer_lead_to_crm');
		expect(calls[0].args).toEqual({ p_lead_id: '11111111-1111-4111-8111-111111111111' });
		expect(r).toEqual({ success: true, entrepriseId: 'ent-new-1' });
	});

	it('retourne fail(400) si lead introuvable (P0002)', async () => {
		const supabase = createMockSupabase(async () => ({
			data: null,
			error: { code: 'P0002', message: 'Lead introuvable: ...' },
		}));
		const r = await callTransferer(supabase, '22222222-2222-4222-8222-222222222222');
		expect((r as { status?: number }).status).toBe(400);
		expect((r as { data: { error: string } }).data.error).toContain('Lead introuvable');
	});

	it('retourne fail(500) si la transaction est rollback côté DB', async () => {
		const supabase = createMockSupabase(async () => ({
			data: null,
			error: { code: '23505', message: 'unique_violation' },
		}));
		const r = await callTransferer(supabase, '33333333-3333-4333-8333-333333333333');
		expect((r as { status?: number }).status).toBe(500);
	});
});
