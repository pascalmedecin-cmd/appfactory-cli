import { describe, it, expect, vi } from 'vitest';
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

	it('formatTokens sur NaN/Infinity → 0', () => {
		expect(formatTokens(NaN)).toBe('0');
		expect(formatTokens(Infinity)).toBe('0');
		expect(formatTokens(-Infinity)).toBe('0');
	});

	it('formatTokens sur valeur négative (audit 360 V3b L-09) → warn + valeur absolue', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(formatTokens(-10)).toBe('10');
		expect(formatTokens(-1500)).toMatch(/1,5\s*k/);
		expect(formatTokens(-2_000_000)).toMatch(/2,0\s*M/);
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
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

	// Audit 360 V3b L-08 : frontière fin/début d'année (2026 commence un jeudi → 53 semaines ISO).
	it('31 décembre 2026 (jeudi) → 2026-W53', () => {
		expect(weekKey(new Date('2026-12-31T12:00:00Z'))).toBe('2026-W53');
	});

	it('1er janvier 2027 (vendredi) → encore 2026-W53 (semaine à cheval)', () => {
		expect(weekKey(new Date('2027-01-01T12:00:00Z'))).toBe('2026-W53');
	});

	it('4 janvier 2027 (lundi) → 2027-W01', () => {
		expect(weekKey(new Date('2027-01-04T12:00:00Z'))).toBe('2027-W01');
	});

	it('1er janvier 2025 (mercredi) → 2025-W01 (le 4 janvier tombe la même semaine)', () => {
		expect(weekKey(new Date('2025-01-01T12:00:00Z'))).toBe('2025-W01');
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

// Audit 360 H-12 : validation Zod CostRunRowSchema (load `+page.server.ts` SELECT
// 6 colonnes alignées migration `20260509_001_cost_audit_runs.sql`).

import { CostRunRowSchema } from './coutsFormat';

describe('coutsFormat - CostRunRowSchema (audit 360 H-12)', () => {
	const validRow = {
		id: '550e8400-e29b-41d4-a716-446655440000',
		started_at: '2026-05-09T08:00:00.000Z',
		feature: 'veille' as const,
		status: 'success' as const,
		total_eur: 0.69,
		total_usd: 0.75
	};

	it('accepte une ligne valide (6 colonnes alignées migration)', () => {
		const r = CostRunRowSchema.safeParse(validRow);
		expect(r.success).toBe(true);
	});

	it('coerce total_eur en number depuis string (Postgres numeric via supabase-js)', () => {
		const r = CostRunRowSchema.safeParse({ ...validRow, total_eur: '0.69', total_usd: '0.75' });
		expect(r.success).toBe(true);
		if (r.success) {
			expect(r.data.total_eur).toBe(0.69);
			expect(r.data.total_usd).toBe(0.75);
		}
	});

	it('rejette une feature hors enum migration (CHECK contrainte)', () => {
		const r = CostRunRowSchema.safeParse({ ...validRow, feature: 'unknown' });
		expect(r.success).toBe(false);
	});

	it('rejette un status hors enum migration', () => {
		const r = CostRunRowSchema.safeParse({ ...validRow, status: 'pending' });
		expect(r.success).toBe(false);
	});

	it('rejette une ligne sans id UUID (corruption DB)', () => {
		const r = CostRunRowSchema.safeParse({ ...validRow, id: 'not-a-uuid' });
		expect(r.success).toBe(false);
	});

	it('rejette une ligne sans started_at', () => {
		const { started_at: _ignored, ...withoutStartedAt } = validRow;
		const r = CostRunRowSchema.safeParse(withoutStartedAt);
		expect(r.success).toBe(false);
	});
});
