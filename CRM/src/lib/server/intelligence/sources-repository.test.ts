import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';
import {
	HostnameSchema,
	normalizeSourceHostname,
	SourceCreateSchema,
	SourceUpdateSchema,
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
	const valid = { hostname: 'exemple.ch', name: 'Exemple', regime: 'trusted' as const };

	it('accepte un input minimal valide et applique les defaults', () => {
		const r = SourceCreateSchema.safeParse(valid);
		expect(r.success).toBe(true);
		if (r.success) {
			expect(r.data.tier).toBe(null);
			expect(r.data.in_denylist).toBe(false);
			expect(r.data.is_benchmark).toBe(false);
			expect(r.data.description).toBe('');
		}
	});

	it('exige hostname, name et regime', () => {
		expect(SourceCreateSchema.safeParse({ name: 'x', regime: 'trusted' }).success).toBe(false);
		expect(SourceCreateSchema.safeParse({ hostname: 'exemple.ch', regime: 'trusted' }).success).toBe(
			false
		);
		expect(SourceCreateSchema.safeParse({ hostname: 'exemple.ch', name: 'x' }).success).toBe(false);
	});

	it('rejette un regime hors enum et un tier hors enum', () => {
		expect(SourceCreateSchema.safeParse({ ...valid, regime: 'banni' }).success).toBe(false);
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
		expect(SourceUpdateSchema.safeParse({ regime: 'strict' }).success).toBe(true);
		expect(SourceUpdateSchema.safeParse({}).success).toBe(false);
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
