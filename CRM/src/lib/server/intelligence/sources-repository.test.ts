import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';
import {
	HostnameSchema,
	normalizeSourceHostname,
	SourceCreateSchema,
	SourceUpdateSchema,
	createSource,
	updateSource,
	deleteSource
} from './sources-repository';

describe('normalizeSourceHostname', () => {
	it("extrait le domaine d'une URL complète, strippe www. et le path", () => {
		expect(normalizeSourceHostname('https://www.Exemple.ch/page?x=1')).toBe('exemple.ch');
		expect(normalizeSourceHostname('http://rts.ch')).toBe('rts.ch');
		expect(normalizeSourceHostname('https://madico.com/architectural/')).toBe('madico.com');
	});
	it('accepte un domaine nu (avec ou sans www., casse)', () => {
		expect(normalizeSourceHostname('lenouvelliste.ch')).toBe('lenouvelliste.ch');
		expect(normalizeSourceHostname('WWW.NZZ.CH')).toBe('nzz.ch');
	});
	it('lève sur saisie vide', () => {
		expect(() => normalizeSourceHostname('   ')).toThrow();
	});
});

describe('HostnameSchema', () => {
	it('accepte des domaines valides', () => {
		expect(HostnameSchema.safeParse('rts.ch').success).toBe(true);
		expect(HostnameSchema.safeParse('saint-gobain-glass.com').success).toBe(true);
		expect(HostnameSchema.safeParse('patents.google.com').success).toBe(true);
	});
	it('rejette une URL complète, des espaces, un mot sans point', () => {
		expect(HostnameSchema.safeParse('https://rts.ch').success).toBe(false);
		expect(HostnameSchema.safeParse('rts ch').success).toBe(false);
		expect(HostnameSchema.safeParse('rts').success).toBe(false);
	});
});

describe('SourceCreateSchema', () => {
	// `regime` n'est plus un champ saisi (décision étape 5 : calculé depuis tier+flags).
	const valid = { hostname: 'exemple.ch', name: 'Exemple' };

	it('accepte un input minimal valide (hostname + name) et applique les defaults', () => {
		const r = SourceCreateSchema.safeParse(valid);
		expect(r.success).toBe(true);
		if (r.success) {
			expect(r.data.tier).toBe(null);
			expect(r.data.in_denylist).toBe(false);
			expect(r.data.is_benchmark).toBe(false);
			expect(r.data.description).toBe('');
		}
	});

	it('exige hostname et name (regime PAS requis)', () => {
		expect(SourceCreateSchema.safeParse({ name: 'x' }).success).toBe(false);
		expect(SourceCreateSchema.safeParse({ hostname: 'exemple.ch' }).success).toBe(false);
		expect(SourceCreateSchema.safeParse(valid).success).toBe(true);
	});

	it('ignore un `regime` fourni (champ calculé, non saisi) et rejette un tier hors enum', () => {
		const r = SourceCreateSchema.safeParse({ ...valid, regime: 'banni' });
		// regime n'est pas dans le schéma → strip (Zod), parse OK, et absent du résultat.
		expect(r.success).toBe(true);
		if (r.success) expect('regime' in r.data).toBe(false);
		expect(SourceCreateSchema.safeParse({ ...valid, tier: 'T9' }).success).toBe(false);
	});

	it('accepte tier null explicite et tier T-valide', () => {
		expect(SourceCreateSchema.safeParse({ ...valid, tier: null }).success).toBe(true);
		expect(SourceCreateSchema.safeParse({ ...valid, tier: 'T4' }).success).toBe(true);
	});
});

describe('SourceUpdateSchema', () => {
	it('accepte un patch partiel, rejette un objet vide', () => {
		expect(SourceUpdateSchema.safeParse({ active: false }).success).toBe(true);
		expect(SourceUpdateSchema.safeParse({ tier: 'T4' }).success).toBe(true);
		expect(SourceUpdateSchema.safeParse({}).success).toBe(false);
	});

	it('un patch contenant SEULEMENT `regime` est vide après strip → rejeté (regime non saisi)', () => {
		// regime stripped → {} → refine(len>0) échoue. On n'édite jamais regime directement.
		expect(SourceUpdateSchema.safeParse({ regime: 'strict' }).success).toBe(false);
	});
});

// Mock client pour createSource : capture la row insérée, renvoie une row complète.
function mockInsertClient() {
	let inserted: Record<string, unknown> | null = null;
	const single = vi.fn(async () => ({ data: { id: 'new-id', ...inserted }, error: null }));
	const select = vi.fn(() => ({ single }));
	const insert = vi.fn((payload: Record<string, unknown>) => {
		inserted = payload;
		return { select };
	});
	const from = vi.fn(() => ({ insert }));
	return {
		client: { from } as unknown as SupabaseClient<Database>,
		insertedRow: () => inserted
	};
}

describe('createSource : régime CALCULÉ depuis tier+flags (jamais saisi)', () => {
	it('tier T4 sans flag → trusted', async () => {
		const m = mockInsertClient();
		await createSource(m.client, SourceCreateSchema.parse({ hostname: 'rts.ch', name: 'RTS', tier: 'T4' }));
		expect(m.insertedRow()?.regime).toBe('trusted');
	});
	it('tier T3 (cabinet) → strict', async () => {
		const m = mockInsertClient();
		await createSource(m.client, SourceCreateSchema.parse({ hostname: 'mckinsey.com', name: 'McKinsey', tier: 'T3' }));
		expect(m.insertedRow()?.regime).toBe('strict');
	});
	it('strict_verbatim force strict même sur un tier fiable', async () => {
		const m = mockInsertClient();
		await createSource(
			m.client,
			SourceCreateSchema.parse({ hostname: 'x.com', name: 'X', tier: 'T4', strict_verbatim: true })
		);
		expect(m.insertedRow()?.regime).toBe('strict');
	});
	it('advocacy sur tier fiable → trusted_advocacy', async () => {
		const m = mockInsertClient();
		await createSource(
			m.client,
			SourceCreateSchema.parse({ hostname: 'iwfa.com', name: 'IWFA', tier: 'T1', is_advocacy: true })
		);
		expect(m.insertedRow()?.regime).toBe('trusted_advocacy');
	});
	it('tier null (inconnu) → strict', async () => {
		const m = mockInsertClient();
		await createSource(m.client, SourceCreateSchema.parse({ hostname: 'inconnu.xyz', name: 'Inconnu' }));
		expect(m.insertedRow()?.regime).toBe('strict');
	});
});

// Mock client pour updateSource : 1re lecture (row courante), puis update (capture patch).
function mockUpdateClient(current: Record<string, unknown>) {
	let patched: Record<string, unknown> | null = null;
	const readSingle = vi.fn(async () => ({ data: current, error: null }));
	const readEq = vi.fn(() => ({ single: readSingle }));
	const writeSingle = vi.fn(async () => ({ data: { ...current, ...patched }, error: null }));
	const writeSelect = vi.fn(() => ({ single: writeSingle }));
	const writeEq = vi.fn(() => ({ select: writeSelect }));
	const select = vi.fn(() => ({ eq: readEq })); // read path
	const update = vi.fn((p: Record<string, unknown>) => {
		patched = p;
		return { eq: writeEq };
	});
	const from = vi.fn(() => ({ select, update }));
	return {
		client: { from } as unknown as SupabaseClient<Database>,
		patch: () => patched,
		readCalls: () => readSingle.mock.calls.length
	};
}

describe('updateSource : régime RECALCULÉ depuis l état résultant (row + patch)', () => {
	it('changer le tier T4→T3 recalcule regime trusted→strict', async () => {
		const m = mockUpdateClient({
			tier: 'T4',
			in_denylist: false,
			strict_verbatim: false,
			is_advocacy: false,
			is_preprint: false
		});
		await updateSource(m.client, 'id-1', { tier: 'T3' });
		expect(m.patch()?.regime).toBe('strict');
		expect(m.readCalls()).toBe(1); // une lecture pour l'état courant
	});

	it('activer strict_verbatim sur une source T4 fiable → regime strict', async () => {
		const m = mockUpdateClient({
			tier: 'T4',
			in_denylist: false,
			strict_verbatim: false,
			is_advocacy: false,
			is_preprint: false
		});
		await updateSource(m.client, 'id-2', { strict_verbatim: true });
		expect(m.patch()?.regime).toBe('strict');
	});

	it('un update qui NE touche PAS tier/flags (ex. active) ne lit pas et ne recalcule pas regime', async () => {
		const m = mockUpdateClient({ tier: 'T4', in_denylist: false, strict_verbatim: false, is_advocacy: false, is_preprint: false });
		await updateSource(m.client, 'id-3', { active: false });
		expect(m.readCalls()).toBe(0); // pas de lecture inutile
		expect(m.patch() && 'regime' in m.patch()!).toBe(false); // regime non touché
	});

	it('tier courant invalide en base (ex. T9) → fail-safe strict au recalcul', async () => {
		const m = mockUpdateClient({
			tier: 'T9',
			in_denylist: false,
			strict_verbatim: false,
			is_advocacy: false,
			is_preprint: false
		});
		await updateSource(m.client, 'id-4', { is_advocacy: true });
		// tier courant illisible → traité comme null → strict (jamais une montée en confiance).
		expect(m.patch()?.regime).toBe('strict');
	});
});

function mockDeleteClient(result: { error: { message: string } | null }) {
	const eq = vi.fn().mockResolvedValue(result);
	const del = vi.fn().mockReturnValue({ eq });
	const from = vi.fn().mockReturnValue({ delete: del });
	return { client: { from } as unknown as SupabaseClient<Database>, from, del, eq };
}

describe('deleteSource', () => {
	it('supprime par id exact sur veille_sources et résout', async () => {
		const { client, from, del, eq } = mockDeleteClient({ error: null });
		await expect(deleteSource(client, 'uuid-cible')).resolves.toBeUndefined();
		expect(from).toHaveBeenCalledWith('veille_sources');
		expect(del).toHaveBeenCalledTimes(1);
		expect(eq).toHaveBeenCalledWith('id', 'uuid-cible');
	});
	it('propage une erreur DB en exception préfixée', async () => {
		const { client } = mockDeleteClient({ error: { message: 'permission denied' } });
		await expect(deleteSource(client, 'uuid-x')).rejects.toThrow('deleteSource: permission denied');
	});
});
