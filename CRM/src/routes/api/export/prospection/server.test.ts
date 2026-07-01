import { describe, it, expect, vi } from 'vitest';
import { GET } from './+server';
import { EXPORT_SCHEMA_VERSION } from '$lib/server/csv-export';

/**
 * Tests du handler `GET /api/export/prospection` (export CSV filtré, miroir du
 * `load` de /crm/prospection). Couvre : sources par onglet, filtres canton/statut,
 * recherche 3 champs + dédup, filtre source incompatible → CSV vide,
 * headers (BOM, content-type, disposition, schema version), erreur Supabase → 500.
 */

type Row = Record<string, unknown>;
type Call = [string, ...unknown[]];

function createMock(rows: Row[], opts: { dbError?: { message: string }; count?: number } = {}) {
	const calls: Call[] = [];
	const builder: Record<string, unknown> = {
		select(...a: unknown[]) { calls.push(['select', ...a]); return builder; },
		in(c: string, v: unknown) { calls.push(['in', c, v]); return builder; },
		eq(c: string, v: unknown) { calls.push(['eq', c, v]); return builder; },
		ilike(c: string, v: unknown) { calls.push(['ilike', c, v]); return builder; },
		order(c: string, o: unknown) { calls.push(['order', c, o]); return builder; },
		limit(n: number) {
			calls.push(['limit', n]);
			return Promise.resolve({ data: opts.dbError ? null : rows, error: opts.dbError ?? null, count: opts.count ?? null });
		},
	};
	return {
		supabase: { from(t: string) { calls.push(['from', t]); return builder; } },
		calls: () => calls,
	};
}

async function callGet(search: string, mock: ReturnType<typeof createMock>, premium = false) {
	return GET({
		locals: {
			supabase: mock.supabase,
			safeGetSession: async () => ({
				session: { user: { id: 'u1' } },
				user: { id: 'u1', app_metadata: premium ? { ff_crm_listes_v2: true } : {} }
			})
		},
		url: new URL('http://localhost/api/export/prospection' + search),
	} as unknown as Parameters<typeof GET>[0]);
}

function hasCall(mock: ReturnType<typeof createMock>, method: string, col?: string): boolean {
	return mock.calls().some((c) => c[0] === method && (col === undefined || c[1] === col));
}

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

describe('GET /api/export/prospection', () => {
	it('onglet Entreprises sans filtre → CSV des sources de l\'onglet + eq statut=vide par défaut', async () => {
		const mock = createMock([
			{ id: '1', raison_sociale: 'Acme Vitrage', source: 'zefix', canton: 'GE', score_pertinence: 7 },
		]);
		const res = await callGet('?tab=entreprises', mock);
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toContain('text/csv');
		expect(res.headers.get('content-disposition')).toContain('attachment');
		expect(res.headers.get('content-disposition')).toContain('prospection');
		expect(res.headers.get('X-Export-Schema-Version')).toBe(String(EXPORT_SCHEMA_VERSION));
		const bytes = new Uint8Array(await res.clone().arrayBuffer());
		expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]); // BOM
		const body = await res.text();
		expect(body).toContain('Raison sociale'); // header
		expect(body).toContain('Acme Vitrage');
		// Sources de l'onglet entreprises (zefix + search_ch + google_places).
		const inSource = mock.calls().find((c) => c[0] === 'in' && c[1] === 'source');
		expect(inSource?.[2]).toEqual(['zefix', 'search_ch', 'google_places']);
		// Lot 2 : pas de filtre statut explicite → file de tri (statut='vide') par défaut.
		const eqStatut = mock.calls().find((c) => c[0] === 'eq' && c[1] === 'statut');
		expect(eqStatut?.[2]).toBe('vide');
		// Tri par défaut date_import (Lot 2 : le tri par score est retiré de l'UI).
		expect(mock.calls().some((c) => c[0] === 'order' && c[1] === 'date_import')).toBe(true);
	});

	it('filtre canton → .in(canton, [...])', async () => {
		const mock = createMock([{ id: '1', raison_sociale: 'X', source: 'zefix' }]);
		await callGet('?tab=entreprises&canton=VD&canton=GE', mock);
		const inCanton = mock.calls().find((c) => c[0] === 'in' && c[1] === 'canton');
		expect(inCanton?.[2]).toEqual(['VD', 'GE']);
	});

	it('filtre statut explicite → .in(statut) ET aucun eq statut implicite', async () => {
		const mock = createMock([{ id: '1', raison_sociale: 'X', source: 'zefix' }]);
		await callGet('?tab=entreprises&statut=ecarte', mock);
		const inStatut = mock.calls().find((c) => c[0] === 'in' && c[1] === 'statut');
		expect(inStatut?.[2]).toEqual(['ecarte']);
		// Un filtre statut explicite prime : pas de eq('statut','vide') implicite.
		expect(hasCall(mock, 'eq', 'statut')).toBe(false);
	});

	it('recherche → 3 .ilike (raison_sociale, localite, canton) + dédup par id', async () => {
		// Les 3 requêtes renvoient la même ligne → après dédup, 1 seule ligne de données.
		const mock = createMock([{ id: 'dup', raison_sociale: 'Acme', source: 'zefix' }]);
		const res = await callGet('?tab=entreprises&q=acme', mock);
		const ilikeFields = mock.calls().filter((c) => c[0] === 'ilike').map((c) => c[1]);
		expect(ilikeFields).toEqual(['raison_sociale', 'localite', 'canton']);
		const body = await res.text();
		const lines = body.replace(/^﻿/, '').trim().split(/\r?\n/);
		expect(lines).toHaveLength(2); // header + 1 ligne dédupée
	});

	it('échappe les wildcards SQL ilike (% _ \\) dans la recherche', async () => {
		const mock = createMock([]);
		await callGet('?tab=entreprises&q=' + encodeURIComponent('a%_\\b'), mock);
		const ilike = mock.calls().find((c) => c[0] === 'ilike');
		expect(ilike?.[2]).toBe('%a\\%\\_\\\\b%');
	});

	it('filtre source incompatible avec l\'onglet → CSV vide (header seul), aucune requête', async () => {
		const mock = createMock([{ id: '1', raison_sociale: 'X' }]);
		// lead_express n'appartient pas à l'onglet entreprises → incompatible.
		const res = await callGet('?tab=entreprises&source=lead_express', mock);
		expect(res.status).toBe(200);
		const body = await res.text();
		const lines = body.replace(/^﻿/, '').trim().split(/\r?\n/);
		expect(lines).toHaveLength(1); // header seulement
		expect(hasCall(mock, 'from')).toBe(false); // court-circuit, pas d'appel DB
	});

	it('erreur Supabase → 500', async () => {
		const mock = createMock([], { dbError: { message: 'connection lost' } });
		await expect(callGet('?tab=entreprises', mock)).rejects.toMatchObject({ status: 500 });
	});

	it('colonne Campagnes présente en premium, absente sinon (Vague 3.2, OFF byte-identique)', async () => {
		const rows = [{ id: '1', raison_sociale: 'Acme', source: 'zefix' }];
		const off = await (await callGet('?tab=entreprises', createMock(rows), false)).text();
		expect(off).not.toContain('Campagnes');
		const on = await (await callGet('?tab=entreprises', createMock(rows), true)).text();
		expect(on).toContain('Campagnes');
	});

	it('total > cap → header de troncature X-Export-Truncated (No silent caps)', async () => {
		// En réel, .limit(5000) renvoie 5000 lignes + count=total ; ici on teste la BRANCHE
		// (count > cap) avec peu de lignes : le header doit signaler la troncature.
		const mock = createMock([{ id: '1', raison_sociale: 'X', source: 'zefix' }], { count: 8200 });
		const res = await callGet('?tab=entreprises', mock);
		expect(res.status).toBe(200);
		expect(res.headers.get('X-Export-Truncated')).toBe('1');
		expect(res.headers.get('X-Export-Total')).toBe('8200');
	});

	it('total <= cap → pas de header de troncature', async () => {
		const mock = createMock([{ id: '1', raison_sociale: 'X', source: 'zefix' }], { count: 42 });
		const res = await callGet('?tab=entreprises', mock);
		expect(res.headers.get('X-Export-Truncated')).toBeNull();
	});
});
