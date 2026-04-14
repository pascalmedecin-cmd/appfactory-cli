import { describe, it, expect } from 'vitest';
import {
	IntelligenceReportSchema,
	IntelligenceItemSchema,
	SearchTermSchema,
	ThemeEnum,
	SegmentEnum,
	ComplianceTagEnum
} from './schema';

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
	image_url: null
};

const validSearchTerm = {
	term: 'appel d offres école Vaud vitrage 2026',
	rationale: 'Reprendre la requête SIMAP qui a remonté ce signal.',
	segment: 'erp' as const
};

const validReport = {
	edition: {
		week_label: '2026-W15',
		generated_at: '2026-04-10T08:00:00Z',
		compliance_tag: 'OK FilmPro' as const,
		executive_summary:
			'Semaine dominée par des signaux AO cantonaux et une avancée réglementaire sur l enveloppe du bâtiment en Valais.'
	},
	items: [validItem, { ...validItem, rank: 2, title: 'Deuxième signal pertinent' }],
	impacts_filmpro: [
		{ axis: 'diagnostic' as const, note: 'Renforcer la grille de diagnostic sur les ERP scolaires.' }
	],
	search_terms: Array.from({ length: 10 }, (_, i) => ({
		...validSearchTerm,
		term: `${validSearchTerm.term} ${i}`
	}))
};

describe('IntelligenceReportSchema', () => {
	it('accepte un rapport complet valide', () => {
		const r = IntelligenceReportSchema.safeParse(validReport);
		expect(r.success).toBe(true);
	});

	it('rejette week_label mal formaté', () => {
		const r = IntelligenceReportSchema.safeParse({
			...validReport,
			edition: { ...validReport.edition, week_label: '2026-15' }
		});
		expect(r.success).toBe(false);
	});

	it('rejette plus de 10 items', () => {
		const r = IntelligenceReportSchema.safeParse({
			...validReport,
			items: Array.from({ length: 11 }, (_, i) => ({ ...validItem, rank: i + 1 }))
		});
		expect(r.success).toBe(false);
	});

	it('accepte 0 item (semaine Non exploitable)', () => {
		const r = IntelligenceReportSchema.safeParse({ ...validReport, items: [] });
		expect(r.success).toBe(true);
	});

	it('rejette moins de 8 search_terms', () => {
		const r = IntelligenceReportSchema.safeParse({
			...validReport,
			search_terms: validReport.search_terms.slice(0, 7)
		});
		expect(r.success).toBe(false);
	});

	it('rejette plus de 15 search_terms', () => {
		const r = IntelligenceReportSchema.safeParse({
			...validReport,
			search_terms: Array.from({ length: 16 }, () => validSearchTerm)
		});
		expect(r.success).toBe(false);
	});

	it('rejette plus de 3 impacts_filmpro', () => {
		const r = IntelligenceReportSchema.safeParse({
			...validReport,
			impacts_filmpro: Array.from({ length: 4 }, () => ({
				axis: 'diagnostic' as const,
				note: 'Note suffisante pour passer la longueur minimale.'
			}))
		});
		expect(r.success).toBe(false);
	});

	it('rejette un compliance_tag inconnu', () => {
		const r = IntelligenceReportSchema.safeParse({
			...validReport,
			edition: { ...validReport.edition, compliance_tag: 'Inconnu' }
		});
		expect(r.success).toBe(false);
	});
});

describe('IntelligenceItemSchema', () => {
	it('accepte un item valide', () => {
		expect(IntelligenceItemSchema.safeParse(validItem).success).toBe(true);
	});

	it('rejette rank > 10', () => {
		expect(IntelligenceItemSchema.safeParse({ ...validItem, rank: 11 }).success).toBe(false);
	});

	it('rejette rank < 1', () => {
		expect(IntelligenceItemSchema.safeParse({ ...validItem, rank: 0 }).success).toBe(false);
	});

	it('rejette source.url non-URL', () => {
		expect(
			IntelligenceItemSchema.safeParse({
				...validItem,
				source: { ...validItem.source, url: 'pas-une-url' }
			}).success
		).toBe(false);
	});

	it('rejette published_at non-ISO', () => {
		expect(
			IntelligenceItemSchema.safeParse({
				...validItem,
				source: { ...validItem.source, published_at: '10/04/2026' }
			}).success
		).toBe(false);
	});

	it('accepte deep_dive et image_url null', () => {
		expect(
			IntelligenceItemSchema.safeParse({ ...validItem, deep_dive: null, image_url: null }).success
		).toBe(true);
	});
});

describe('SearchTermSchema', () => {
	it('accepte un terme valide', () => {
		expect(SearchTermSchema.safeParse(validSearchTerm).success).toBe(true);
	});

	it('rejette un segment hors enum', () => {
		expect(
			SearchTermSchema.safeParse({ ...validSearchTerm, segment: 'industriel' }).success
		).toBe(false);
	});

	it('rejette un terme trop court', () => {
		expect(SearchTermSchema.safeParse({ ...validSearchTerm, term: 'ab' }).success).toBe(false);
	});
});

describe('Enums', () => {
	it('SegmentEnum contient les 5 segments FilmPro', () => {
		const values = SegmentEnum.options;
		expect(values).toEqual(['tertiaire', 'residentiel', 'commerces', 'erp', 'partenaires']);
	});

	it('ThemeEnum contient les 7 thèmes', () => {
		expect(ThemeEnum.options.length).toBe(7);
	});

	it('ComplianceTagEnum contient les 4 tags', () => {
		expect(ComplianceTagEnum.options.length).toBe(4);
	});
});
