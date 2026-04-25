import { describe, it, expect } from 'vitest';
import { buildRecapPayload, type SendRecapInput } from './email-recap';
import type { CostSummary } from './cost-tracker';
import type { IntelligenceReport } from './schema';

function mockCosts(totalEur = 0.45): CostSummary {
	return {
		breakdown: [
			{
				kind: 'claude',
				label: 'Claude Phase 1 (candidats)',
				model: 'claude-opus-4-7',
				input_tokens: 12_000,
				output_tokens: 3_000,
				cache_read_tokens: 0,
				cache_creation_tokens: 5_000,
				usd: 0.3,
				eur: 0.3 * 0.92
			},
			{
				kind: 'claude',
				label: 'Claude Phase 2 (rapport)',
				model: 'claude-opus-4-7',
				input_tokens: 5_000,
				output_tokens: 8_000,
				cache_read_tokens: 0,
				cache_creation_tokens: 0,
				usd: 0.15,
				eur: 0.15 * 0.92
			}
		],
		total_usd: totalEur / 0.92,
		total_eur: totalEur
	};
}

function mockReport(): IntelligenceReport {
	return {
		meta: {
			week_label: '16-2026',
			generated_at: '2026-04-17T06:00:00Z',
			compliance_tag: 'Non-exhaustif',
			executive_summary: 'Test summary sur 3 sujets clés.'
		},
		items: [
			{ rank: 1, title: 'Premier item' },
			{ rank: 2, title: 'Deuxième item' },
			{ rank: 3, title: 'Troisième item' }
		],
		impacts_filmpro: [],
		search_terms: []
	} as unknown as IntelligenceReport;
}

describe('buildRecapPayload - mode success', () => {
	const input: SendRecapInput = {
		mode: 'success',
		data: { weekLabel: '16-2026', report: mockReport(), costs: mockCosts(0.45) }
	};

	it('subject contient weekLabel + nb items + total EUR', () => {
		const p = buildRecapPayload(input);
		expect(p.subject).toContain('W16-2026');
		expect(p.subject).toContain('3 items');
		expect(p.subject).toContain('0.45 EUR');
	});

	it('html contient lien CRM /veille', () => {
		const p = buildRecapPayload(input);
		expect(p.html).toContain('https://filmpro-crm.vercel.app/veille');
	});

	it('html contient le résumé exécutif', () => {
		const p = buildRecapPayload(input);
		expect(p.html).toContain('Test summary sur 3 sujets clés.');
	});

	it('html liste chaque entrée de coût', () => {
		const p = buildRecapPayload(input);
		expect(p.html).toContain('Claude Phase 1 (candidats)');
		expect(p.html).toContain('Claude Phase 2 (rapport)');
	});

	it('compte items générés (3)', () => {
		const p = buildRecapPayload(input);
		expect(p.text).toContain('Items générés : 3');
	});

	it('text fallback présent et non vide', () => {
		const p = buildRecapPayload(input);
		expect(p.text).toBeTruthy();
		expect(p.text).toContain('FilmPro Veille');
	});

	it('escape HTML sur valeurs injectées', () => {
		const xssReport = mockReport();
		xssReport.meta!.executive_summary = '<script>alert("xss")</script>';
		const p = buildRecapPayload({
			mode: 'success',
			data: { weekLabel: '16-2026', report: xssReport, costs: mockCosts(0.45) }
		});
		expect(p.html).not.toContain('<script>alert');
		expect(p.html).toContain('&lt;script&gt;');
	});
});

describe('buildRecapPayload - mode sparse', () => {
	function sparseReport(itemsCount: number): IntelligenceReport {
		const items = Array.from({ length: itemsCount }, (_, i) => ({
			rank: i + 1,
			title: `Item ${i + 1}`
		}));
		return {
			meta: {
				week_label: '18-2026',
				generated_at: '2026-04-30T06:00:00Z',
				compliance_tag: 'À surveiller',
				executive_summary: 'Semaine très calme côté actualité sectorielle.'
			},
			items,
			impacts_filmpro: []
		} as unknown as IntelligenceReport;
	}

	it('subject préfixé [ALERTE] et compte les items', () => {
		const p = buildRecapPayload({
			mode: 'sparse',
			data: { weekLabel: '18-2026', report: sparseReport(1), costs: mockCosts(0.32) }
		});
		expect(p.subject.startsWith('[ALERTE]')).toBe(true);
		expect(p.subject).toContain('W18-2026');
		expect(p.subject).toContain('semaine creuse');
		expect(p.subject).toContain('(1 item)');
	});

	it('subject pluralise "items" si 0', () => {
		const p = buildRecapPayload({
			mode: 'sparse',
			data: { weekLabel: '18-2026', report: sparseReport(0), costs: mockCosts(0.32) }
		});
		expect(p.subject).toContain('(0 items)');
	});

	it('html contient le contexte d\'investigation', () => {
		const p = buildRecapPayload({
			mode: 'sparse',
			data: { weekLabel: '18-2026', report: sparseReport(1), costs: mockCosts(0.32) }
		});
		expect(p.html).toContain('investiguer');
		expect(p.html).toContain('Volume anormalement bas');
	});

	it('html inclut le résumé exécutif', () => {
		const p = buildRecapPayload({
			mode: 'sparse',
			data: { weekLabel: '18-2026', report: sparseReport(1), costs: mockCosts(0.32) }
		});
		expect(p.html).toContain('Semaine très calme');
	});

	it('text fallback présent', () => {
		const p = buildRecapPayload({
			mode: 'sparse',
			data: { weekLabel: '18-2026', report: sparseReport(1), costs: mockCosts(0.32) }
		});
		expect(p.text).toContain('semaine creuse');
		expect(p.text).toContain('investiguer');
	});
});

describe('buildRecapPayload - mode failure', () => {
	it('subject préfixé [ALERTE]', () => {
		const p = buildRecapPayload({
			mode: 'failure',
			data: {
				weekLabel: '16-2026',
				errorMessage: 'Phase 1 timeout après 300s',
				costs: mockCosts(0.12)
			}
		});
		expect(p.subject.startsWith('[ALERTE]')).toBe(true);
		expect(p.subject).toContain('W16-2026');
	});

	it('html contient le message d\'erreur (tronqué si > 500)', () => {
		const longError = 'E'.repeat(800);
		const p = buildRecapPayload({
			mode: 'failure',
			data: { weekLabel: '16-2026', errorMessage: longError, costs: mockCosts(0) }
		});
		// Tronqué avec ellipsis
		expect(p.html).toContain('…');
		// Ne doit pas contenir les 800 E complets
		expect(p.html).not.toContain('E'.repeat(600));
	});

	it('html gère costs.breakdown vide (message explicite)', () => {
		const p = buildRecapPayload({
			mode: 'failure',
			data: {
				weekLabel: '16-2026',
				errorMessage: 'Clé ANTHROPIC manquante',
				costs: { breakdown: [], total_usd: 0, total_eur: 0 }
			}
		});
		expect(p.html).toContain('Aucun coût mesuré avant l');
	});

	it('html contient lien Vercel logs', () => {
		const p = buildRecapPayload({
			mode: 'failure',
			data: { weekLabel: '16-2026', errorMessage: 'test', costs: mockCosts(0) }
		});
		expect(p.html).toContain('vercel.com');
		expect(p.html).toContain('logs');
	});

	it('escape XSS dans errorMessage', () => {
		const p = buildRecapPayload({
			mode: 'failure',
			data: {
				weekLabel: '16-2026',
				errorMessage: '<img src=x onerror=alert(1)>',
				costs: mockCosts(0)
			}
		});
		expect(p.html).not.toMatch(/<img[^>]*onerror/);
		expect(p.html).toContain('&lt;img');
	});
});
