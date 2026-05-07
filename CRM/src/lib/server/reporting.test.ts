import { describe, it, expect } from 'vitest';
import {
	aggregatePipelineByEtape,
	aggregateActivity,
	aggregateMonthlyPipeline,
	computeConversionRate,
	type PipelineRow,
	type CountByDateRow
} from './reporting';

describe('aggregatePipelineByEtape', () => {
	it('compte et somme par étape', () => {
		const rows: PipelineRow[] = [
			{ etape_pipeline: 'qualification', montant_estime: 10000, date_creation: '2026-01-01' },
			{ etape_pipeline: 'qualification', montant_estime: 5000, date_creation: '2026-02-01' },
			{ etape_pipeline: 'gagne', montant_estime: 20000, date_creation: '2026-03-01' }
		];
		const stats = aggregatePipelineByEtape(rows);
		expect(stats).toHaveLength(2);
		const qual = stats.find((s) => s.etape === 'qualification')!;
		expect(qual.count).toBe(2);
		expect(qual.montant_total).toBe(15000);
		const gagne = stats.find((s) => s.etape === 'gagne')!;
		expect(gagne.count).toBe(1);
		expect(gagne.montant_total).toBe(20000);
	});

	it('étape null → bucket "inconnu"', () => {
		const rows: PipelineRow[] = [
			{ etape_pipeline: null, montant_estime: 100, date_creation: '2026-01-01' }
		];
		const stats = aggregatePipelineByEtape(rows);
		expect(stats[0].etape).toBe('inconnu');
	});

	it('montant string parseable', () => {
		const rows: PipelineRow[] = [
			{ etape_pipeline: 'qualif', montant_estime: '1500.50', date_creation: null }
		];
		const stats = aggregatePipelineByEtape(rows);
		expect(stats[0].montant_total).toBeCloseTo(1500.5);
	});

	it('montant null → 0', () => {
		const rows: PipelineRow[] = [
			{ etape_pipeline: 'qualif', montant_estime: null, date_creation: null }
		];
		const stats = aggregatePipelineByEtape(rows);
		expect(stats[0].montant_total).toBe(0);
	});

	it('tri par count décroissant', () => {
		const rows: PipelineRow[] = [
			{ etape_pipeline: 'a', montant_estime: 0, date_creation: null },
			{ etape_pipeline: 'b', montant_estime: 0, date_creation: null },
			{ etape_pipeline: 'b', montant_estime: 0, date_creation: null },
			{ etape_pipeline: 'b', montant_estime: 0, date_creation: null }
		];
		const stats = aggregatePipelineByEtape(rows);
		expect(stats[0].etape).toBe('b');
		expect(stats[1].etape).toBe('a');
	});
});

describe('aggregateActivity', () => {
	const now = new Date('2026-04-17T12:00:00Z');

	it('compte 30j et 90j correctement', () => {
		const rows: CountByDateRow[] = [
			{ created_at: '2026-04-10T00:00:00Z' }, // 7j avant
			{ created_at: '2026-03-20T00:00:00Z' }, // 28j avant
			{ created_at: '2026-02-01T00:00:00Z' }, // 75j avant
			{ created_at: '2025-10-01T00:00:00Z' } // > 90j
		];
		const stats = aggregateActivity(rows, now);
		expect(stats.last_30_days).toBe(2);
		expect(stats.last_90_days).toBe(3);
		expect(stats.total).toBe(4);
	});

	it('utilise date_creation si created_at absent', () => {
		const rows: CountByDateRow[] = [{ date_creation: '2026-04-15T00:00:00Z' }];
		const stats = aggregateActivity(rows, now);
		expect(stats.last_30_days).toBe(1);
	});

	it('ignore dates invalides', () => {
		const rows: CountByDateRow[] = [
			{ created_at: 'not-a-date' },
			{ created_at: null }
		];
		const stats = aggregateActivity(rows, now);
		expect(stats.last_30_days).toBe(0);
		expect(stats.total).toBe(2);
	});
});

describe('aggregateMonthlyPipeline', () => {
	const now = new Date('2026-04-15T12:00:00Z');

	it('génère exactement N buckets ordonnés chrono', () => {
		const stats = aggregateMonthlyPipeline([], 6, now);
		expect(stats).toHaveLength(6);
		expect(stats[5].month).toBe('2026-04');
		expect(stats[0].month).toBe('2025-11');
	});

	it('compte les rows par mois', () => {
		const rows: PipelineRow[] = [
			{ etape_pipeline: 'a', montant_estime: 0, date_creation: '2026-04-05T00:00:00Z' },
			{ etape_pipeline: 'a', montant_estime: 0, date_creation: '2026-04-14T00:00:00Z' },
			{ etape_pipeline: 'a', montant_estime: 0, date_creation: '2026-03-20T00:00:00Z' }
		];
		const stats = aggregateMonthlyPipeline(rows, 3, now);
		expect(stats.find((s) => s.month === '2026-04')?.count).toBe(2);
		expect(stats.find((s) => s.month === '2026-03')?.count).toBe(1);
		expect(stats.find((s) => s.month === '2026-02')?.count).toBe(0);
	});

	it('ignore dates hors fenêtre et invalides', () => {
		const rows: PipelineRow[] = [
			{ etape_pipeline: 'a', montant_estime: 0, date_creation: '2025-01-01T00:00:00Z' },
			{ etape_pipeline: 'a', montant_estime: 0, date_creation: null }
		];
		const stats = aggregateMonthlyPipeline(rows, 3, now);
		expect(stats.every((s) => s.count === 0)).toBe(true);
	});
});

describe('computeConversionRate', () => {
	it('0 leads → taux 0 (pas de div/0)', () => {
		expect(computeConversionRate(0, 0).taux_pct).toBe(0);
	});

	it('calcul basique arrondi 1 décimale', () => {
		expect(computeConversionRate(100, 25).taux_pct).toBe(25);
		expect(computeConversionRate(7, 2).taux_pct).toBe(28.6);
	});

	it('taux > 100% si plus d\'opp que leads (edge case)', () => {
		expect(computeConversionRate(10, 15).taux_pct).toBe(150);
	});
});
