import { describe, it, expect } from 'vitest';
import {
	createCollapsedState,
	toggleStageExpansion,
	isStageExpanded,
	expandAllStages,
	buildAccordionStages,
	formatStageCount,
	formatStageMontantTotal,
	type AccordionStageConfig,
	type AccordionOpp
} from './pipeline-mobile-accordion.helpers';

const CONFIGS: ReadonlyArray<AccordionStageConfig> = [
	{ key: 'identification', label: 'Identification', icon: 'search' },
	{ key: 'qualification', label: 'Qualification', icon: 'fact_check' },
	{ key: 'proposition', label: 'Proposition', icon: 'description' },
	{ key: 'negociation', label: 'Négociation', icon: 'handshake' },
	{ key: 'gagne', label: 'Gagné', icon: 'emoji_events' },
	{ key: 'perdu', label: 'Perdu', icon: 'block' }
];

const OPPS: ReadonlyArray<AccordionOpp> = [
	{ id: '1', etape_pipeline: 'identification', montant_estime: 10_000, date_relance_prevue: null },
	{ id: '2', etape_pipeline: 'qualification', montant_estime: 28_500, date_relance_prevue: null },
	{ id: '3', etape_pipeline: 'qualification', montant_estime: 50_000, date_relance_prevue: null },
	{ id: '4', etape_pipeline: 'proposition', montant_estime: null, date_relance_prevue: null },
	{ id: '5', etape_pipeline: 'gagne', montant_estime: 250_000, date_relance_prevue: null },
	{ id: '6', etape_pipeline: null, montant_estime: 5_000, date_relance_prevue: null }
];

describe('createCollapsedState', () => {
	it('retourne un Set vide', () => {
		const s = createCollapsedState();
		expect(s).toBeInstanceOf(Set);
		expect(s.size).toBe(0);
	});
});

describe('toggleStageExpansion', () => {
	it('ajoute une clé absente', () => {
		const s = createCollapsedState();
		const next = toggleStageExpansion(s, 'qualification');
		expect(next.has('qualification')).toBe(true);
		expect(next.size).toBe(1);
	});

	it('retire une clé présente', () => {
		const s = new Set(['qualification', 'gagne']);
		const next = toggleStageExpansion(s, 'qualification');
		expect(next.has('qualification')).toBe(false);
		expect(next.has('gagne')).toBe(true);
		expect(next.size).toBe(1);
	});

	it('est immutable (input intact)', () => {
		const s = new Set(['qualification']);
		const next = toggleStageExpansion(s, 'gagne');
		expect(s.has('gagne')).toBe(false);
		expect(s.size).toBe(1);
		expect(next).not.toBe(s);
	});

	it('toggle alterne deux appels successifs', () => {
		const s = createCollapsedState();
		const a = toggleStageExpansion(s, 'qualification');
		const b = toggleStageExpansion(a, 'qualification');
		expect(b.has('qualification')).toBe(false);
		expect(b.size).toBe(0);
	});
});

describe('isStageExpanded', () => {
	it('true si clé présente', () => {
		const s = new Set(['qualification']);
		expect(isStageExpanded(s, 'qualification')).toBe(true);
	});

	it('false si clé absente', () => {
		const s = new Set(['gagne']);
		expect(isStageExpanded(s, 'qualification')).toBe(false);
	});
});

describe('expandAllStages', () => {
	it('retourne un Set avec toutes les clés des configs', () => {
		const s = expandAllStages(CONFIGS);
		expect(s.size).toBe(6);
		for (const cfg of CONFIGS) {
			expect(s.has(cfg.key)).toBe(true);
		}
	});
});

describe('buildAccordionStages', () => {
	it('retourne une entrée par config, dans le même ordre', () => {
		const stages = buildAccordionStages(OPPS, CONFIGS);
		expect(stages.map((s) => s.key)).toEqual([
			'identification',
			'qualification',
			'proposition',
			'negociation',
			'gagne',
			'perdu'
		]);
	});

	it('distribue les opps selon etape_pipeline', () => {
		const stages = buildAccordionStages(OPPS, CONFIGS);
		const qual = stages.find((s) => s.key === 'qualification')!;
		expect(qual.opportunites.map((o) => o.id)).toEqual(['2', '3']);
	});

	it('bucket par défaut = identification pour opp sans etape_pipeline', () => {
		const stages = buildAccordionStages(OPPS, CONFIGS);
		const ident = stages.find((s) => s.key === 'identification')!;
		expect(ident.opportunites.map((o) => o.id).sort()).toEqual(['1', '6']);
	});

	it('count = nombre d opps de l étape', () => {
		const stages = buildAccordionStages(OPPS, CONFIGS);
		expect(stages.find((s) => s.key === 'qualification')!.count).toBe(2);
		expect(stages.find((s) => s.key === 'negociation')!.count).toBe(0);
	});

	it('montantTotal = somme des montant_estime de l étape (ignore null)', () => {
		const stages = buildAccordionStages(OPPS, CONFIGS);
		expect(stages.find((s) => s.key === 'qualification')!.montantTotal).toBe(78_500);
		expect(stages.find((s) => s.key === 'proposition')!.montantTotal).toBe(0);
		expect(stages.find((s) => s.key === 'gagne')!.montantTotal).toBe(250_000);
	});

	it('étape sans opp → opportunites=[], count=0, montantTotal=0', () => {
		const stages = buildAccordionStages(OPPS, CONFIGS);
		const nego = stages.find((s) => s.key === 'negociation')!;
		expect(nego.opportunites).toEqual([]);
		expect(nego.count).toBe(0);
		expect(nego.montantTotal).toBe(0);
	});

	it('expose label + icon issus de la config', () => {
		const stages = buildAccordionStages(OPPS, CONFIGS);
		const gagne = stages.find((s) => s.key === 'gagne')!;
		expect(gagne.label).toBe('Gagné');
		expect(gagne.icon).toBe('emoji_events');
	});

	it('liste vide d opps → toutes étapes count=0', () => {
		const stages = buildAccordionStages([], CONFIGS);
		expect(stages.every((s) => s.count === 0 && s.montantTotal === 0)).toBe(true);
		expect(stages).toHaveLength(6);
	});
});

describe('formatStageCount', () => {
	it('singulier pour 0', () => {
		expect(formatStageCount(0)).toBe('0 opportunité');
	});

	it('singulier pour 1', () => {
		expect(formatStageCount(1)).toBe('1 opportunité');
	});

	it('pluriel à partir de 2', () => {
		expect(formatStageCount(2)).toBe('2 opportunités');
		expect(formatStageCount(42)).toBe('42 opportunités');
	});
});

describe('formatStageMontantTotal', () => {
	it('retourne null si 0', () => {
		expect(formatStageMontantTotal(0)).toBeNull();
	});

	it('format compact CHF < 100 000 (séparateur fr-CH apostrophe)', () => {
		expect(formatStageMontantTotal(28_500)).toBe("28'500 CHF");
	});

	it('format k CHF >= 100 000', () => {
		expect(formatStageMontantTotal(250_000)).toBe('250 k CHF');
	});
});
