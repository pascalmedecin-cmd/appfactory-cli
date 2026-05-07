import { describe, it, expect, vi } from 'vitest';
import { linkImportSignals } from './link-import-signal';

// Mock Supabase minimal : capture les arguments d'upsert pour vérification.
function createMockSupabase(upsertResult: { error: { message: string } | null; count: number | null }) {
	const upsertSpy = vi.fn().mockResolvedValue(upsertResult);
	const fromSpy = vi.fn().mockReturnValue({ upsert: upsertSpy });
	return {
		client: { from: fromSpy } as unknown as Parameters<typeof linkImportSignals>[0],
		fromSpy,
		upsertSpy
	};
}

describe('linkImportSignals', () => {
	it('retourne 0 sans appel DB si leadIds vide', async () => {
		const { client, fromSpy } = createMockSupabase({ error: null, count: 0 });
		const r = await linkImportSignals(client, {
			leadIds: [],
			reportId: '00000000-0000-0000-0000-000000000001',
			itemRank: 1,
			fromTerm: null,
			maturity: 'etabli',
			complianceTag: 'OK FilmPro',
			signalGeneratedAt: '2026-04-25T10:00:00Z'
		});
		expect(r).toBe(0);
		expect(fromSpy).not.toHaveBeenCalled();
	});

	it("construit une ligne par leadId avec les bonnes valeurs", async () => {
		const { client, upsertSpy } = createMockSupabase({ error: null, count: 2 });
		const r = await linkImportSignals(client, {
			leadIds: ['lead-1', 'lead-2'],
			reportId: 'report-x',
			itemRank: 3,
			fromTerm: 'films solaires',
			maturity: 'emergent',
			complianceTag: 'Adjacent pertinent',
			signalGeneratedAt: '2026-04-25T10:00:00Z'
		});
		expect(r).toBe(2);
		expect(upsertSpy).toHaveBeenCalledTimes(1);
		const [rows, options] = upsertSpy.mock.calls[0];
		expect(rows).toEqual([
			{
				lead_id: 'lead-1',
				report_id: 'report-x',
				item_rank: 3,
				maturity: 'emergent',
				compliance_tag: 'Adjacent pertinent',
				signal_generated_at: '2026-04-25T10:00:00Z',
				match_kind: 'import',
				match_term: 'films solaires'
			},
			{
				lead_id: 'lead-2',
				report_id: 'report-x',
				item_rank: 3,
				maturity: 'emergent',
				compliance_tag: 'Adjacent pertinent',
				signal_generated_at: '2026-04-25T10:00:00Z',
				match_kind: 'import',
				match_term: 'films solaires'
			}
		]);
		// Idempotence via PK conflict ignored.
		expect(options).toEqual({
			onConflict: 'lead_id,report_id,item_rank',
			ignoreDuplicates: true,
			count: 'exact'
		});
	});

	it('tronque match_term à 200 chars', async () => {
		const { client, upsertSpy } = createMockSupabase({ error: null, count: 1 });
		const longTerm = 'a'.repeat(500);
		await linkImportSignals(client, {
			leadIds: ['lead-1'],
			reportId: 'r',
			itemRank: 1,
			fromTerm: longTerm,
			maturity: 'etabli',
			complianceTag: 'OK FilmPro',
			signalGeneratedAt: '2026-04-25T10:00:00Z'
		});
		const [rows] = upsertSpy.mock.calls[0];
		expect(rows[0].match_term).toHaveLength(200);
	});

	it("propage match_term=null si fromTerm est null", async () => {
		const { client, upsertSpy } = createMockSupabase({ error: null, count: 1 });
		await linkImportSignals(client, {
			leadIds: ['lead-1'],
			reportId: 'r',
			itemRank: 1,
			fromTerm: null,
			maturity: 'etabli',
			complianceTag: 'OK FilmPro',
			signalGeneratedAt: '2026-04-25T10:00:00Z'
		});
		const [rows] = upsertSpy.mock.calls[0];
		expect(rows[0].match_term).toBeNull();
	});

	it("retourne 0 et log si l'upsert échoue (best-effort, ne throw pas)", async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const { client } = createMockSupabase({
			error: { message: 'simulated db error' },
			count: null
		});
		const r = await linkImportSignals(client, {
			leadIds: ['lead-1'],
			reportId: 'r',
			itemRank: 1,
			fromTerm: null,
			maturity: 'etabli',
			complianceTag: 'OK FilmPro',
			signalGeneratedAt: '2026-04-25T10:00:00Z'
		});
		expect(r).toBe(0);
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});
});
