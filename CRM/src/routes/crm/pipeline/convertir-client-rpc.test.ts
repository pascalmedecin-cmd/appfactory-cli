import { describe, it, expect } from 'vitest';

/**
 * Tests de la form action `/pipeline?/convertToClient` (Lot 2).
 *
 * « Convertir en client » a quitté la prospection au Lot 2 : le SEUL chemin
 * prospect -> entreprise part désormais du pipeline, sur une opportunité issue d'un
 * prospect (`opportunites.prospect_lead_id`). L'action lit l'opportunité, appelle la RPC
 * atomique `transfer_lead_to_crm(p_lead_id)` (crée entreprise + contact), puis lie
 * l'opportunité à l'entreprise créée.
 *
 * Cible : mapping des erreurs RPC (P0002 -> 400, P0001 -> 409, autre -> 500) et
 * paramètre `p_lead_id` = `prospect_lead_id` de l'opportunité. Anciennement couvert par
 * `prospection/transferer-rpc.test.ts` (action `transferer` supprimée au Lot 2).
 *
 * Limite assumée : ne valide pas la RLS (runtime Postgres uniquement).
 */

// UUID v4 stricts (Zod uuid()).
const OPP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const LEAD_ID = '11111111-1111-4111-8111-111111111111';

type OppRow = { id: string; entreprise_id: string | null; prospect_lead_id: string | null };

function makeFormData(values: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(values)) fd.set(k, v);
	return fd;
}

/**
 * Mock Supabase chainable (offline) : sépare le SELECT de l'opportunité (via .maybeSingle())
 * de l'UPDATE de liaison (awaitable). Chaque .from() instancie un builder au mode propre.
 */
function createMockSupabase(opts: {
	opp?: OppRow | null; // opportunité lue (défaut : issue d'un prospect, non convertie)
	updateError?: boolean; // le lien opp<->entreprise échoue (non bloquant côté prod)
	rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
}) {
	const DEFAULT_OPP: OppRow = { id: OPP_ID, entreprise_id: null, prospect_lead_id: LEAD_ID };
	return {
		rpc: opts.rpc,
		from(_table: string) {
			const state: { mode: 'select' | 'update' | null } = { mode: null };
			const builder = {
				select() { state.mode = 'select'; return builder; },
				update() { state.mode = 'update'; return builder; },
				eq() { return builder; },
				async maybeSingle() {
					return { data: opts.opp === undefined ? DEFAULT_OPP : opts.opp, error: null };
				},
				// Thenable : fin de la chaîne UPDATE (awaited par convertToClient).
				then(resolve: (v: { data: unknown; error: unknown }) => void) {
					resolve({ data: null, error: opts.updateError ? { message: 'link fail' } : null });
				},
			};
			return builder;
		},
	};
}

async function callConvert(supabase: ReturnType<typeof createMockSupabase>, oppId = OPP_ID): Promise<unknown> {
	const mod = await import('./+page.server');
	const action = mod.actions.convertToClient;
	const event = {
		request: { formData: async () => makeFormData({ id: oppId }) } as unknown as Request,
		locals: { supabase },
	} as unknown as Parameters<typeof action>[0];
	return action(event);
}

describe('pipeline convertToClient (transfert RPC atomique - Lot 2)', () => {
	it('appelle rpc("transfer_lead_to_crm", {p_lead_id}) et retourne entrepriseId au succès', async () => {
		const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
		const supabase = createMockSupabase({
			rpc: async (name, args) => {
				calls.push({ name, args });
				return { data: { entreprise_id: 'ent-new-1', contact_id: 'ct-new-1' }, error: null };
			},
		});
		const r = await callConvert(supabase);
		expect(calls).toHaveLength(1);
		expect(calls[0].name).toBe('transfer_lead_to_crm');
		// p_lead_id = prospect_lead_id de l'opportunité (résolu serveur, jamais le payload client).
		expect(calls[0].args).toEqual({ p_lead_id: LEAD_ID });
		expect(r).toEqual({ success: true, entrepriseId: 'ent-new-1' });
	});

	it('retourne fail(400) si prospect introuvable (P0002)', async () => {
		const supabase = createMockSupabase({
			rpc: async () => ({ data: null, error: { code: 'P0002', message: 'Lead introuvable: ...' } }),
		});
		const r = await callConvert(supabase);
		expect((r as { status?: number }).status).toBe(400);
		expect((r as { data: { error: string } }).data.error).toContain('Prospect introuvable');
	});

	it('retourne fail(500) si la transaction est rollback côté DB (erreur non mappée)', async () => {
		const supabase = createMockSupabase({
			rpc: async () => ({ data: null, error: { code: '23505', message: 'unique_violation' } }),
		});
		const r = await callConvert(supabase);
		expect((r as { status?: number }).status).toBe(500);
	});

	it('retourne fail(409) si prospect déjà converti (P0001, concurrence)', async () => {
		const supabase = createMockSupabase({
			rpc: async () => ({ data: null, error: { code: 'P0001', message: 'lead_already_transferred: ...' } }),
		});
		const r = await callConvert(supabase);
		expect((r as { status?: number }).status).toBe(409);
		expect((r as { data: { error: string } }).data.error).toMatch(/déjà converti/i);
	});
});
