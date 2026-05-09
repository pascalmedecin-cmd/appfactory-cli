import { describe, it, expect } from 'vitest';
import {
	formatEur,
	formatUsd,
	formatTokens,
	formatDuration,
	formatDateTime,
	formatPercent,
	featureLabel,
	statusLabel,
	weekKey,
	aggregateByWeek,
	computeKpis,
	filterRunsByFeature,
	type CostRun
} from './coutsFormat';

function fixture(overrides: Partial<CostRun> = {}): CostRun {
	return {
		id: 'r1',
		run_id: 'veille-2026-W19-test',
		feature: 'veille',
		model: 'claude-opus-4-7',
		status: 'success',
		started_at: '2026-05-09T08:00:00.000Z',
		finished_at: '2026-05-09T08:08:30.000Z',
		duration_seconds: 510,
		total_input_tokens: 100_000,
		total_output_tokens: 10_000,
		total_cache_read_tokens: 0,
		total_cache_creation_tokens: 0,
		total_usd: 0.75,
		total_eur: 0.69,
		breakdown: [],
		error_message: null,
		created_at: '2026-05-09T08:08:30.000Z',
		...overrides
	};
}

describe('coutsFormat - format helpers', () => {
	it('formatEur affiche montant + symbole €', () => {
		const out = formatEur(1.234);
		expect(out).toContain('€');
		expect(out).toMatch(/1[,.]23/);
	});

	it('formatEur sur NaN/Infinity retourne placeholder', () => {
		expect(formatEur(NaN)).toBe('—');
		expect(formatEur(Infinity)).toBe('—');
	});

	it('formatUsd inclut le symbole $', () => {
		expect(formatUsd(1.5)).toContain('$');
	});

	it('formatTokens : seuils k/M', () => {
		expect(formatTokens(500)).toBe('500');
		expect(formatTokens(1500)).toMatch(/1,5\s*k/);
		expect(formatTokens(1_500_000)).toMatch(/1,5\s*M/);
	});

	it('formatTokens sur valeurs négatives ou NaN → 0', () => {
		expect(formatTokens(-10)).toBe('0');
		expect(formatTokens(NaN)).toBe('0');
	});

	it('formatDuration : secondes / minutes / mixte', () => {
		expect(formatDuration(45)).toBe('45 s');
		expect(formatDuration(120)).toBe('2 min');
		expect(formatDuration(510)).toBe('8 min 30 s');
		expect(formatDuration(null)).toBe('—');
	});

	it('formatDateTime fournit jour+mois+heure', () => {
		const out = formatDateTime('2026-05-09T14:32:00.000Z');
		expect(out).not.toBe('—');
		expect(out.length).toBeGreaterThan(8);
	});

	it('formatDateTime sur ISO invalide → placeholder', () => {
		expect(formatDateTime('not-a-date')).toBe('—');
	});

	it('formatPercent ajoute signe explicite et %', () => {
		expect(formatPercent(0.124)).toMatch(/\+12,4\s*%/);
		expect(formatPercent(-0.05)).toMatch(/[−-]5,0\s*%/);
		expect(formatPercent(NaN)).toBe('—');
	});

	it('featureLabel retourne label humain', () => {
		expect(featureLabel('veille')).toBe('Veille hebdo');
		expect(featureLabel('signaux')).toBe('Signaux');
		expect(featureLabel('autre')).toBe('Autre');
	});

	it('statusLabel retourne label + variant', () => {
		expect(statusLabel('success')).toEqual({ label: 'Succès', variant: 'success' });
		expect(statusLabel('partial')).toEqual({ label: 'Partiel', variant: 'warning' });
		expect(statusLabel('error')).toEqual({ label: 'Erreur', variant: 'danger' });
	});
});

describe('coutsFormat - weekKey ISO', () => {
	it('vendredi 8 mai 2026 → 2026-W19', () => {
		expect(weekKey(new Date('2026-05-08T12:00:00Z'))).toBe('2026-W19');
	});

	it('dimanche 4 janvier 2026 → 2026-W01 (semaine ISO 1)', () => {
		expect(weekKey(new Date('2026-01-04T12:00:00Z'))).toBe('2026-W01');
	});

	it('1er janvier 2026 (jeudi) → 2026-W01', () => {
		expect(weekKey(new Date('2026-01-01T12:00:00Z'))).toBe('2026-W01');
	});
});

describe('coutsFormat - aggregateByWeek', () => {
	const now = new Date('2026-05-09T12:00:00Z');

	it('retourne 12 buckets en ordre chronologique croissant', () => {
		const buckets = aggregateByWeek([], 12, now);
		expect(buckets).toHaveLength(12);
		// Ordre croissant
		for (let i = 1; i < buckets.length; i++) {
			expect(buckets[i].weekKey >= buckets[i - 1].weekKey).toBe(true);
		}
	});

	it('inclut semaines sans run avec totalEur=0', () => {
		const buckets = aggregateByWeek([], 4, now);
		for (const b of buckets) {
			expect(b.totalEur).toBe(0);
			expect(b.runsCount).toBe(0);
		}
	});

	it('agrège plusieurs runs dans la même semaine', () => {
		const runs = [
			fixture({ started_at: '2026-05-08T08:00:00Z', total_eur: 0.5, feature: 'veille' }),
			fixture({ started_at: '2026-05-09T10:00:00Z', total_eur: 0.3, feature: 'veille' })
		];
		const buckets = aggregateByWeek(runs, 4, now);
		const w19 = buckets.find((b) => b.weekKey === '2026-W19');
		expect(w19?.totalEur).toBeCloseTo(0.8, 4);
		expect(w19?.runsCount).toBe(2);
		expect(w19?.byFeature.veille).toBeCloseTo(0.8, 4);
	});

	it('runs hors fenêtre 12 sem ignorés', () => {
		const runs = [fixture({ started_at: '2025-01-01T00:00:00Z', total_eur: 99 })];
		const buckets = aggregateByWeek(runs, 12, now);
		const total = buckets.reduce((s, b) => s + b.totalEur, 0);
		expect(total).toBe(0);
	});

	it('byFeature ventile correctement par feature', () => {
		const runs = [
			fixture({ started_at: '2026-05-09T08:00:00Z', total_eur: 0.5, feature: 'veille' }),
			fixture({ started_at: '2026-05-09T10:00:00Z', total_eur: 0.2, feature: 'signaux' })
		];
		const buckets = aggregateByWeek(runs, 4, now);
		const w19 = buckets.find((b) => b.weekKey === '2026-W19');
		expect(w19?.byFeature.veille).toBeCloseTo(0.5, 4);
		expect(w19?.byFeature.signaux).toBeCloseTo(0.2, 4);
		expect(w19?.byFeature.autre).toBe(0);
	});
});

describe('coutsFormat - computeKpis', () => {
	const now = new Date('2026-05-09T12:00:00Z');

	it('runs vide → tous les KPIs à 0 ou NaN trend', () => {
		const k = computeKpis([], now);
		expect(k.total30dEur).toBe(0);
		expect(k.total12wEur).toBe(0);
		expect(k.avgRunEur).toBe(0);
		expect(k.runs30d).toBe(0);
		expect(Number.isNaN(k.trend7dRatio)).toBe(true);
	});

	it('total 30 jours inclut runs jusqu\'à 30 jours en arrière', () => {
		const runs = [
			fixture({ started_at: '2026-05-09T00:00:00Z', total_eur: 1 }),
			fixture({ started_at: '2026-04-12T00:00:00Z', total_eur: 2 }), // ~28j
			fixture({ started_at: '2026-04-01T00:00:00Z', total_eur: 5 }) // ~38j hors fenêtre 30j
		];
		const k = computeKpis(runs, now);
		expect(k.total30dEur).toBeCloseTo(3, 4);
		expect(k.runs30d).toBe(2);
	});

	it('coût moyen par run 30j = total / count', () => {
		const runs = [
			fixture({ started_at: '2026-05-09T00:00:00Z', total_eur: 0.6 }),
			fixture({ started_at: '2026-05-08T00:00:00Z', total_eur: 0.4 })
		];
		const k = computeKpis(runs, now);
		expect(k.avgRunEur).toBeCloseTo(0.5, 4);
	});

	it('trend 7j calcule (current - previous) / previous', () => {
		const runs = [
			// Semaine en cours (3 derniers jours)
			fixture({ started_at: '2026-05-08T00:00:00Z', total_eur: 1.0 }),
			fixture({ started_at: '2026-05-09T00:00:00Z', total_eur: 1.0 }),
			// Semaine précédente (8-13 jours)
			fixture({ started_at: '2026-05-01T00:00:00Z', total_eur: 1.0 })
		];
		const k = computeKpis(runs, now);
		// current=2, previous=1 → trend=+100%
		expect(k.trend7dRatio).toBeCloseTo(1.0, 4);
	});

	it('trend 7j = NaN si aucun run sur la période précédente', () => {
		const runs = [fixture({ started_at: '2026-05-09T00:00:00Z', total_eur: 1.0 })];
		const k = computeKpis(runs, now);
		expect(Number.isNaN(k.trend7dRatio)).toBe(true);
	});
});

describe('coutsFormat - filterRunsByFeature', () => {
	const runs = [
		fixture({ feature: 'veille', total_eur: 1 }),
		fixture({ feature: 'signaux', total_eur: 2 }),
		fixture({ feature: 'autre', total_eur: 3 })
	];

	it('filter "all" retourne tous les runs', () => {
		expect(filterRunsByFeature(runs, 'all')).toHaveLength(3);
	});

	it('filter "veille" garde uniquement veille', () => {
		const out = filterRunsByFeature(runs, 'veille');
		expect(out).toHaveLength(1);
		expect(out[0].feature).toBe('veille');
	});

	it('filter "signaux" sur runs sans signaux → []', () => {
		const subset = [fixture({ feature: 'veille' })];
		expect(filterRunsByFeature(subset, 'signaux')).toHaveLength(0);
	});
});
