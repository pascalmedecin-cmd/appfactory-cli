import { describe, it, expect, vi } from 'vitest';
import { readReportItems, rowToIntelligenceReport } from './report-items';

const validItem = {
	rank: 1,
	title: 'Appel d offres école Vaud - vitrage sécurité',
	summary:
		'La commune de Lausanne publie un AO pour la rénovation de vitrages sur trois bâtiments scolaires.',
	filmpro_relevance: 'Cible ERP directe, zone prioritaire VD, segment école.',
	maturity: 'etabli' as const,
	theme: 'films_securite' as const,
	geo_scope: 'suisse_romande' as const,
	source: {
		name: 'SIMAP',
		url: 'https://www.simap.ch/example-123',
		published_at: '2026-04-10T08:00:00Z'
	},
	deep_dive: null,
	segment: 'erp' as const,
	actionability: 'action_directe' as const,
	search_terms: [
		{ kind: 'simap' as const, canton: 'VD' as const, query: 'école rénovation vitrage', label: 'SIMAP VD · école rénovation vitrage' },
		{ kind: 'zefix' as const, canton: 'VD' as const, query: 'Losinger Marazzi', label: 'Zefix VD · Losinger Marazzi' }
	]
};

describe('readReportItems (M-19)', () => {
	it('items conformes → renvoyés (parsés)', () => {
		const out = readReportItems([validItem], 'rep-1');
		expect(out).toHaveLength(1);
		expect(out[0].rank).toBe(1);
		expect(out[0].title).toBe(validItem.title);
	});

	it('null / undefined → tableau vide', () => {
		expect(readReportItems(null, 'rep-x')).toEqual([]);
		expect(readReportItems(undefined, 'rep-x')).toEqual([]);
		expect(readReportItems([], 'rep-x')).toEqual([]);
	});

	it('items legacy non conformes → fallback brut + console.warn', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const legacy = [{ rank: 1, title: 'court' /* < 10 chars, manque plein de champs */ }];
		const out = readReportItems(legacy, 'rep-legacy');
		expect(out).toHaveLength(1);
		expect((out[0] as { title: string }).title).toBe('court');
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});

	it('mélange valide + invalide → fallback brut sur tout le tableau (all-or-nothing)', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const out = readReportItems([validItem, { rank: 2 }], 'rep-mix');
		expect(out).toHaveLength(2);
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});
});

describe('rowToIntelligenceReport (adaptateur DB plate -> forme rendu)', () => {
	it('mappe une ligne DB vers meta nichée + items validés + impacts', () => {
		const row = {
			week_label: '2026-W26',
			generated_at: '2026-06-26T06:00:00Z',
			compliance_tag: 'OK FilmPro',
			executive_summary: 'x'.repeat(90),
			items: [validItem],
			impacts_filmpro: [{ axis: 'reglementation', note: 'note impact suffisamment longue' }],
			id: 'r1'
		};
		const r = rowToIntelligenceReport(row);
		expect(r.meta.week_label).toBe('2026-W26');
		expect(r.meta.executive_summary.length).toBe(90);
		expect(r.items).toHaveLength(1);
		expect(r.items[0].title).toBe(validItem.title);
		expect(r.impacts_filmpro).toHaveLength(1);
	});

	it('repli gracieux (pas de throw) si meta legacy non conforme', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const row = { week_label: 'bad', generated_at: 'nope', compliance_tag: 'X', executive_summary: '', items: null };
		expect(() => rowToIntelligenceReport(row as never)).not.toThrow();
		warn.mockRestore();
	});
});
