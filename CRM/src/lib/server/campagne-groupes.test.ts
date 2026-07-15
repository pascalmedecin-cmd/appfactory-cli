import { describe, it, expect } from 'vitest';
import {
	listGroupes,
	createGroupe,
	renameGroupe,
	deleteGroupe,
	assignGroupeToLeads,
	GROUPE_NOM_MAX,
	MAX_GROUPE_LEAD_IDS
} from './campagne-groupes';

/**
 * Repo serveur des groupes de campagne. Même doctrine que campagnes.test.ts : mock Supabase
 * chainable thenable (Proxy) - on teste la LOGIQUE (validation, scoping par campagne,
 * traduction d'erreurs Postgres, bornage/chunking), jamais supabase-js. La sémantique SQL
 * réelle (FK composite cross-campagne, SET NULL, CHECK 24) est prouvée sur postgres local
 * (migration 20260702000001, testée le 2026-07-02).
 */
type SbResult = { data?: unknown; error?: unknown };
function createSupabaseMock(result: SbResult = {}) {
	const calls: Array<[string, ...unknown[]]> = [];
	const res = { data: result.data ?? null, error: result.error ?? null };
	const chain: unknown = new Proxy(
		{},
		{
			get(_t, prop: string) {
				if (prop === 'then') {
					return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
						Promise.resolve(res).then(resolve, reject);
				}
				return (...args: unknown[]) => {
					calls.push([prop, ...args]);
					return chain;
				};
			}
		}
	);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const supabase: any = {
		from(t: string) {
			calls.push(['from', t]);
			return chain;
		}
	};
	return { supabase, calls };
}

function callsOf(calls: Array<[string, ...unknown[]]>, method: string): unknown[][] {
	return calls.filter((c) => c[0] === method).map((c) => c.slice(1));
}

const G = { id: 'g-1', campagne_id: 'cmp-1', nom: 'Régies', date_creation: '2026-07-02T00:00:00Z', created_by: null };

describe('createGroupe', () => {
	it('rejette nom vide / trop long / caractère de contrôle sans requête', async () => {
		// Le C0 au milieu passerait trim()+longueur mais casserait le XML des PDF en aval
		// (audit sécu 2026-07-02, Low) : rejeté à la source.
		for (const nom of ['   ', 'x'.repeat(GROUPE_NOM_MAX + 1), 'AB\u0001CD', 'AB\u009FCD']) {
			const m = createSupabaseMock();
			const { error } = await createGroupe(m.supabase, 'filmpro', { campagneId: 'cmp-1', nom, userId: null });
			expect(error?.code).toBe('invalid');
			expect(m.calls.length).toBe(0);
		}
	});

	it('trim + insert scopé campagne', async () => {
		const m = createSupabaseMock({ data: { ...G } });
		const { data, error } = await createGroupe(m.supabase, 'filmpro', { campagneId: 'cmp-1', nom: '  Régies  ', userId: 'u1' });
		expect(error).toBe(null);
		expect(data?.nom).toBe('Régies');
		expect(callsOf(m.calls, 'insert')[0]?.[0]).toEqual({ campagne_id: 'cmp-1', nom: 'Régies', created_by: 'u1', marque: 'filmpro' });
	});

	it('traduit 23505 -> duplicate, 23514 -> invalid, 23503 -> invalid (campagne)', async () => {
		for (const [code, expected] of [
			['23505', 'duplicate'],
			['23514', 'invalid'],
			['23503', 'invalid']
		] as const) {
			const m = createSupabaseMock({ error: { code, message: 'x' } });
			const { error } = await createGroupe(m.supabase, 'filmpro', { campagneId: 'cmp-1', nom: 'Régies', userId: null });
			expect(error?.code).toBe(expected);
		}
	});
});

describe('renameGroupe / deleteGroupe - scoping campagne', () => {
	it('rename : update scopé (id ET campagne_id), introuvable -> invalid', async () => {
		const m = createSupabaseMock({ data: null });
		const { error } = await renameGroupe(m.supabase, 'cmp-1', 'g-1', 'Nouveau');
		expect(error?.code).toBe('invalid');
		expect(callsOf(m.calls, 'eq')).toEqual([
			['id', 'g-1'],
			['campagne_id', 'cmp-1']
		]);
	});

	it('rename : conflit 23505 -> duplicate ; succès -> groupe renvoyé', async () => {
		const dup = createSupabaseMock({ error: { code: '23505', message: 'x' } });
		expect((await renameGroupe(dup.supabase, 'cmp-1', 'g-1', 'Régies')).error?.code).toBe('duplicate');
		const ok = createSupabaseMock({ data: { ...G, nom: 'Nouveau' } });
		expect((await renameGroupe(ok.supabase, 'cmp-1', 'g-1', 'Nouveau')).data?.nom).toBe('Nouveau');
	});

	it('delete : scopé (id ET campagne_id), introuvable -> invalid', async () => {
		const m = createSupabaseMock({ data: null });
		const { error } = await deleteGroupe(m.supabase, 'cmp-1', 'g-x');
		expect(error?.code).toBe('invalid');
		expect(callsOf(m.calls, 'eq')).toEqual([
			['id', 'g-x'],
			['campagne_id', 'cmp-1']
		]);
	});
});

describe('assignGroupeToLeads', () => {
	it('lot vide -> 0 update, aucune requête', async () => {
		const m = createSupabaseMock();
		const { updated, error } = await assignGroupeToLeads(m.supabase, 'cmp-1', 'g-1', []);
		expect(updated).toBe(0);
		expect(error).toBe(null);
		expect(m.calls.length).toBe(0);
	});

	it('vérifie l’appartenance du groupe à LA campagne avant l’update', async () => {
		// data:null -> le SELECT du groupe ne trouve rien -> invalid, PAS d'update.
		const m = createSupabaseMock({ data: null });
		const { error } = await assignGroupeToLeads(m.supabase, 'cmp-1', 'g-autre', ['l1']);
		expect(error?.code).toBe('invalid');
		expect(callsOf(m.calls, 'update').length).toBe(0);
	});

	it('groupeId null (retirer du groupe) : aucun check groupe, update {groupe_id: null} scopé campagne', async () => {
		const m = createSupabaseMock({ data: [{ lead_id: 'l1' }] });
		const { updated, error } = await assignGroupeToLeads(m.supabase, 'cmp-1', null, ['l1', 'l1']);
		expect(error).toBe(null);
		expect(updated).toBe(1);
		expect(callsOf(m.calls, 'select').length).toBe(1); // uniquement le .select('lead_id') de l'update
		expect(callsOf(m.calls, 'update')[0]?.[0]).toEqual({ groupe_id: null });
		expect(callsOf(m.calls, 'eq')[0]).toEqual(['campagne_id', 'cmp-1']);
		expect(callsOf(m.calls, 'in')[0]).toEqual(['lead_id', ['l1']]); // dédup
	});

	it('chunke les gros lots (500 par .in) et borne à MAX_GROUPE_LEAD_IDS', async () => {
		const m = createSupabaseMock({ data: [] });
		const ids = Array.from({ length: MAX_GROUPE_LEAD_IDS + 200 }, (_, i) => `l${i}`);
		const { error } = await assignGroupeToLeads(m.supabase, 'cmp-1', null, ids);
		expect(error).toBe(null);
		const inCalls = callsOf(m.calls, 'in');
		expect(inCalls.length).toBe(2); // 1000 bornés -> 500 + 500
		expect((inCalls[0]?.[1] as string[]).length).toBe(500);
		expect((inCalls[1]?.[1] as string[]).length).toBe(500);
	});

	it('FK 23503 pendant l’update (groupe supprimé en course) -> invalid, jamais une 500 opaque', async () => {
		const m = createSupabaseMock({ error: { code: '23503', message: 'fk' } });
		const { error } = await assignGroupeToLeads(m.supabase, 'cmp-1', null, ['l1']);
		expect(error?.code).toBe('invalid');
	});
});

describe('listGroupes', () => {
	it('propage l’erreur DB (jamais « pas de groupes » menteur)', async () => {
		const m = createSupabaseMock({ error: { message: 'boom' } });
		const { data, error } = await listGroupes(m.supabase, 'filmpro', 'cmp-1');
		expect(data).toEqual([]);
		expect(error?.message).toBe('boom');
	});
});
