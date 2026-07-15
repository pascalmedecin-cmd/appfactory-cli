import { describe, it, expect, vi } from 'vitest';
import { GET } from './+server';
import { EXPORT_SCHEMA_VERSION } from '$lib/server/csv-export';

/**
 * Tests du handler `GET /api/export/[entity]` (audit 360 M-54 — handler export CSV 0 test).
 * Couvre : entité inconnue → 404 ; 3 entités valides (contacts / entreprises / leads) →
 * réponse CSV (BOM, content-type, X-Export-Schema-Version, contenu) ; erreur Supabase → 500 ;
 * filtre `statut_archive=false` appliqué pour contacts/entreprises, pas pour leads.
 */

type Row = Record<string, unknown>;

function createMockSupabase(rows: Row[], opts: { dbError?: { message: string } } = {}) {
	const appliedFilters: { column: string; value: unknown }[] = [];
	let selectedTable = '';
	const builder: Record<string, unknown> = {
		eq(column: string, value: unknown) {
			appliedFilters.push({ column, value });
			return builder;
		},
		order() {
			return Promise.resolve({ data: opts.dbError ? null : rows, error: opts.dbError ?? null });
		},
		// Vague 3.2 : utilisé par fetchCampagnesByLead (jonction) en export leads premium.
		in() {
			return Promise.resolve({ data: [], error: null });
		},
	};
	return {
		from(table: string) {
			selectedTable = table;
			return { select: () => builder };
		},
		_filters: () => appliedFilters,
		_table: () => selectedTable,
	};
}

async function callGet(entity: string, supabase: ReturnType<typeof createMockSupabase>, premium = false) {
	return GET({
		params: { entity },
		locals: {
			supabase,
			marque: 'filmpro',
			safeGetSession: async () => ({
				session: { user: { id: 'u1' } },
				user: { id: 'u1', app_metadata: premium ? { ff_crm_listes_v2: true } : {} }
			})
		},
	} as unknown as Parameters<typeof GET>[0]);
}

vi.mock('$app/environment', () => ({ browser: false, dev: true, building: false }));

describe('GET /api/export/[entity]', () => {
	it('entité inconnue → 404', async () => {
		const supabase = createMockSupabase([]);
		await expect(callGet('pinguins', supabase)).rejects.toMatchObject({ status: 404 });
	});

	it('contacts → CSV téléchargeable, BOM + headers + filtre archive', async () => {
		const supabase = createMockSupabase([
			{ nom: 'Dupont', prenom: 'Marie', email_professionnel: 'm@x.ch', entreprises: { raison_sociale: 'Acme SA' }, date_ajout: '2026-01-02T10:00:00Z' },
		]);
		const res = await callGet('contacts', supabase);
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toContain('text/csv');
		expect(res.headers.get('content-disposition')).toContain('attachment');
		expect(res.headers.get('content-disposition')).toContain('contacts');
		expect(res.headers.get('X-Export-Schema-Version')).toBe(String(EXPORT_SCHEMA_VERSION));
		// BOM UTF-8 (EF BB BF) en tête des octets (TextDecoder le retire à la lecture, on lit donc les bytes bruts).
		const bytes = new Uint8Array(await res.clone().arrayBuffer());
		expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);
		const body = await res.text();
		expect(body).toContain('Nom');
		expect(body).toContain('Dupont');
		expect(body).toContain('Acme SA'); // relation jointe formatée
		expect(body).toContain('2026-01-02'); // date raccourcie
		// contacts : exclut les archivés
		expect(supabase._table()).toBe('contacts');
		// Atelier 209 Run 2 : le filtre marque est ajouté EN PREMIER, avant statut_archive.
		expect(supabase._filters()).toEqual([
			{ column: 'marque', value: 'filmpro' },
			{ column: 'statut_archive', value: false },
		]);
	});

	it('entreprises → CSV + filtre archive', async () => {
		const supabase = createMockSupabase([{ raison_sociale: 'Bâtir SA', canton: 'VD' }]);
		const res = await callGet('entreprises', supabase);
		expect(res.status).toBe(200);
		const body = await res.text();
		expect(body).toContain('Raison sociale');
		expect(body).toContain('Bâtir SA');
		expect(supabase._table()).toBe('entreprises');
		expect(supabase._filters()).toEqual([
			{ column: 'marque', value: 'filmpro' },
			{ column: 'statut_archive', value: false },
		]);
	});

	it('leads → CSV, table prospect_leads, AUCUN filtre archive', async () => {
		const supabase = createMockSupabase([{ raison_sociale: 'Lead X', source: 'simap', score_pertinence: 7 }]);
		const res = await callGet('leads', supabase);
		expect(res.status).toBe(200);
		const body = await res.text();
		expect(body).toContain('Raison sociale');
		expect(body).toContain('Lead X');
		expect(supabase._table()).toBe('prospect_leads');
		// Leads : pas de filtre statut_archive, mais le cloisonnement marque s'applique quand même.
		expect(supabase._filters()).toEqual([{ column: 'marque', value: 'filmpro' }]);
	});

	it('leads : colonne Campagnes présente en premium, absente sinon (Vague 3.2, OFF byte-identique)', async () => {
		const rows = [{ id: 'l1', raison_sociale: 'Lead X', source: 'simap' }];
		const off = await (await callGet('leads', createMockSupabase(rows), false)).text();
		expect(off).not.toContain('Campagnes');
		const on = await (await callGet('leads', createMockSupabase(rows), true)).text();
		expect(on).toContain('Campagnes');
	});

	it('erreur Supabase → 500', async () => {
		const supabase = createMockSupabase([], { dbError: { message: 'connection lost' } });
		await expect(callGet('contacts', supabase)).rejects.toMatchObject({ status: 500 });
	});

	it('table vide → CSV avec ligne d’en-tête seule', async () => {
		const supabase = createMockSupabase([]);
		const res = await callGet('entreprises', supabase);
		const body = await res.text();
		expect(body).toContain('Raison sociale'); // header présent
		// pas de ligne de données
		const lines = body.replace(/^﻿/, '').trim().split(/\r?\n/);
		expect(lines).toHaveLength(1);
	});
});
