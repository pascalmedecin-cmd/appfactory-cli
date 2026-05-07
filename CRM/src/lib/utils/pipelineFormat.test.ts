import { describe, it, expect } from 'vitest';
import {
	formatRelancePipeline,
	formatMontantCompact,
	progressByEtape,
	totalsByEtape,
	etapesVisibleForTab,
	pipelineIndicators,
	type OppLite,
} from './pipelineFormat';

const NOW = new Date('2026-05-08T10:00:00');

describe('formatRelancePipeline', () => {
	it('null/undefined/invalid → "À planifier" not overdue', () => {
		expect(formatRelancePipeline(null, NOW)).toEqual({ label: 'À planifier', overdue: false, hasDate: false });
		expect(formatRelancePipeline(undefined, NOW)).toEqual({ label: 'À planifier', overdue: false, hasDate: false });
		expect(formatRelancePipeline('not-a-date', NOW)).toEqual({ label: 'À planifier', overdue: false, hasDate: false });
	});

	it('overdue → "DD mois · J-N"', () => {
		expect(formatRelancePipeline('2026-05-04', NOW)).toEqual({ label: '04 mai · J-4', overdue: true, hasDate: true });
		expect(formatRelancePipeline('2026-05-06', NOW)).toEqual({ label: '06 mai · J-2', overdue: true, hasDate: true });
	});

	it("aujourd'hui → suffixe spécial", () => {
		expect(formatRelancePipeline('2026-05-08', NOW)).toEqual({ label: "08 mai · aujourd'hui", overdue: false, hasDate: true });
	});

	it('futur → "DD mois · J+N"', () => {
		expect(formatRelancePipeline('2026-05-15', NOW)).toEqual({ label: '15 mai · J+7', overdue: false, hasDate: true });
		expect(formatRelancePipeline('2026-06-01', NOW)).toEqual({ label: '01 juin · J+24', overdue: false, hasDate: true });
	});
});

describe('formatMontantCompact', () => {
	it('null / undefined / 0 / négatif → null', () => {
		expect(formatMontantCompact(null)).toBeNull();
		expect(formatMontantCompact(undefined)).toBeNull();
		expect(formatMontantCompact(0)).toBeNull();
		expect(formatMontantCompact(-100)).toBeNull();
	});

	it('< 100k → format groupe milliers (fr-CH apostrophe)', () => {
		expect(formatMontantCompact(28_500)).toBe("28'500 CHF");
		expect(formatMontantCompact(8400)).toBe("8'400 CHF");
		expect(formatMontantCompact(99_999)).toBe("99'999 CHF");
	});

	it('≥ 100k → format compact "X.X k CHF"', () => {
		expect(formatMontantCompact(100_000)).toBe('100 k CHF');
		expect(formatMontantCompact(213_600)).toBe('213.6 k CHF');
		expect(formatMontantCompact(1_500_000)).toBe('1500 k CHF');
	});
});

describe('progressByEtape', () => {
	it('étapes actives : progression croissante', () => {
		expect(progressByEtape('identification')).toBeCloseTo(0.6, 2);
		expect(progressByEtape('qualification')).toBeCloseTo(0.73, 2);
		expect(progressByEtape('proposition')).toBeCloseTo(0.86, 2);
		expect(progressByEtape('negociation')).toBeCloseTo(0.95, 2);
	});

	it('étapes closed → 0', () => {
		expect(progressByEtape('gagne')).toBe(0);
		expect(progressByEtape('perdu')).toBe(0);
	});

	it('étape inconnue → 0', () => {
		expect(progressByEtape('foobar')).toBe(0);
	});
});

describe('totalsByEtape', () => {
	it('agrège count + sum par étape', () => {
		const opps: OppLite[] = [
			{ id: '1', etape_pipeline: 'identification', montant_estime: 1000, date_relance_prevue: null },
			{ id: '2', etape_pipeline: 'identification', montant_estime: 2000, date_relance_prevue: null },
			{ id: '3', etape_pipeline: 'qualification', montant_estime: 5000, date_relance_prevue: null },
			{ id: '4', etape_pipeline: 'qualification', montant_estime: null, date_relance_prevue: null },
		];
		const totals = totalsByEtape(opps);
		expect(totals.identification).toEqual({ count: 2, sum: 3000 });
		expect(totals.qualification).toEqual({ count: 2, sum: 5000 });
	});

	it('etape_pipeline null → fallback identification', () => {
		const opps: OppLite[] = [
			{ id: '1', etape_pipeline: null, montant_estime: 100, date_relance_prevue: null },
		];
		expect(totalsByEtape(opps).identification).toEqual({ count: 1, sum: 100 });
	});
});

describe('etapesVisibleForTab', () => {
	it('en-cours → 4 étapes actives', () => {
		expect(etapesVisibleForTab('en-cours')).toEqual(['identification', 'qualification', 'proposition', 'negociation']);
	});
	it('closed → gagne + perdu', () => {
		expect(etapesVisibleForTab('closed')).toEqual(['gagne', 'perdu']);
	});
	it('toutes → 6 étapes', () => {
		expect(etapesVisibleForTab('toutes')).toEqual(['identification', 'qualification', 'proposition', 'negociation', 'gagne', 'perdu']);
	});
});

describe('pipelineIndicators', () => {
	const opps: OppLite[] = [
		{ id: '1', etape_pipeline: 'identification', montant_estime: 28500, date_relance_prevue: null },
		{ id: '2', etape_pipeline: 'qualification', montant_estime: 12200, date_relance_prevue: '2026-05-06' }, // overdue J-2
		{ id: '3', etape_pipeline: 'proposition', montant_estime: 45000, date_relance_prevue: '2026-05-15' }, // futur
		{ id: '4', etape_pipeline: 'negociation', montant_estime: 32000, date_relance_prevue: '2026-05-04' }, // overdue J-4
		{ id: '5', etape_pipeline: 'gagne', montant_estime: 6200, date_relance_prevue: null, date_cloture_effective: '2026-05-02' }, // mois courant
		{ id: '6', etape_pipeline: 'gagne', montant_estime: 9000, date_relance_prevue: null, date_cloture_effective: '2026-04-15' }, // mois précédent
		{ id: '7', etape_pipeline: 'perdu', montant_estime: 5800, date_relance_prevue: null, date_cloture_effective: '2026-05-03' },
	];

	it('compte uniquement étapes actives pour active + valueActive', () => {
		const r = pipelineIndicators(opps, NOW);
		expect(r.active).toBe(4); // ids 1,2,3,4
		expect(r.valueActive).toBe(28500 + 12200 + 45000 + 32000);
	});

	it('overdue compte uniquement opps actives avec date passée', () => {
		const r = pipelineIndicators(opps, NOW);
		expect(r.overdue).toBe(2); // ids 2,4 — id 5 perdu écarté car non actif
	});

	it('wonThisMonth filtre par mois courant + étape gagne', () => {
		const r = pipelineIndicators(opps, NOW);
		expect(r.wonThisMonthCount).toBe(1); // id 5
		expect(r.wonThisMonthValue).toBe(6200);
	});

	it('liste vide → tous zéros', () => {
		const r = pipelineIndicators([], NOW);
		expect(r).toEqual({ active: 0, valueActive: 0, wonThisMonthCount: 0, wonThisMonthValue: 0, overdue: 0 });
	});
});
