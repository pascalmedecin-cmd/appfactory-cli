import { describe, it, expect } from 'vitest';
import {
	IntelligenceReportSchema,
	IntelligenceItemSchema,
	LegacySearchTermSchema,
	ThemeEnum,
	SegmentEnum,
	ActionabilityEnum,
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
	segment: 'erp' as const,
	actionability: 'action_directe' as const,
	search_terms: [
		{ kind: 'simap' as const, canton: 'VD' as const, query: 'école rénovation vitrage', label: 'SIMAP VD · école rénovation vitrage' },
		{ kind: 'simap' as const, canton: 'VD' as const, query: 'Ville Lausanne bâtiment scolaire', label: 'SIMAP VD · Ville Lausanne bâtiment scolaire' },
		{ kind: 'zefix' as const, canton: 'VD' as const, query: 'Losinger Marazzi', label: 'Zefix VD · Losinger Marazzi' }
	]
};

const validLegacySearchTerm = {
	term: 'appel d offres école Vaud vitrage 2026',
	rationale: 'Reprendre la requête SIMAP qui a remonté ce signal.',
	segment: 'erp' as const
};

const validReport = {
	meta: {
		week_label: '2026-W15',
		generated_at: '2026-04-10T08:00:00Z',
		compliance_tag: 'OK FilmPro' as const,
		executive_summary:
			'Semaine dominée par des signaux AO cantonaux et une avancée réglementaire sur l enveloppe du bâtiment en Valais.'
	},
	items: [validItem, { ...validItem, rank: 2, title: 'Deuxième signal pertinent' }],
	impacts_filmpro: [
		{ axis: 'diagnostic' as const, note: 'Renforcer la grille de diagnostic sur les ERP scolaires.' }
	]
};

describe('IntelligenceReportSchema', () => {
	it('accepte un rapport complet valide', () => {
		const r = IntelligenceReportSchema.safeParse(validReport);
		expect(r.success).toBe(true);
	});

	it('rejette week_label mal formaté', () => {
		const r = IntelligenceReportSchema.safeParse({
			...validReport,
			meta: { ...validReport.meta, week_label: '2026-15' }
		});
		expect(r.success).toBe(false);
	});

	it('rejette plus de 15 items', () => {
		const r = IntelligenceReportSchema.safeParse({
			...validReport,
			items: Array.from({ length: 16 }, (_, i) => ({ ...validItem, rank: i + 1 }))
		});
		expect(r.success).toBe(false);
	});

	it('accepte 12 items (sur-génération autorisée)', () => {
		const r = IntelligenceReportSchema.safeParse({
			...validReport,
			items: Array.from({ length: 12 }, (_, i) => ({ ...validItem, rank: i + 1 }))
		});
		expect(r.success).toBe(true);
	});

	it('accepte 0 item (semaine Non exploitable)', () => {
		const r = IntelligenceReportSchema.safeParse({ ...validReport, items: [] });
		expect(r.success).toBe(true);
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
			meta: { ...validReport.meta, compliance_tag: 'Inconnu' }
		});
		expect(r.success).toBe(false);
	});

	it('ne demande plus de search_terms globaux au niveau racine', () => {
		// refonte /veille : terms par item, plus de liste globale
		const r = IntelligenceReportSchema.safeParse(validReport);
		expect(r.success).toBe(true);
	});
});

describe('IntelligenceItemSchema', () => {
	it('accepte un item valide', () => {
		expect(IntelligenceItemSchema.safeParse(validItem).success).toBe(true);
	});

	it('rejette rank > 15', () => {
		expect(IntelligenceItemSchema.safeParse({ ...validItem, rank: 16 }).success).toBe(false);
	});

	it('accepte rank 11..15 (sur-génération autorisée)', () => {
		expect(IntelligenceItemSchema.safeParse({ ...validItem, rank: 12 }).success).toBe(true);
		expect(IntelligenceItemSchema.safeParse({ ...validItem, rank: 15 }).success).toBe(true);
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

	it('accepte deep_dive null', () => {
		expect(IntelligenceItemSchema.safeParse({ ...validItem, deep_dive: null }).success).toBe(true);
	});

	it('rejette un segment hors enum', () => {
		expect(
			IntelligenceItemSchema.safeParse({ ...validItem, segment: 'industriel' }).success
		).toBe(false);
	});

	it('rejette une actionability hors enum', () => {
		expect(
			IntelligenceItemSchema.safeParse({ ...validItem, actionability: 'maintenant' }).success
		).toBe(false);
	});

	it('rejette moins de 2 search_terms', () => {
		expect(
			IntelligenceItemSchema.safeParse({
				...validItem,
				search_terms: [validItem.search_terms[0]]
			}).success
		).toBe(false);
	});

	it('rejette plus de 4 search_terms', () => {
		expect(
			IntelligenceItemSchema.safeParse({
				...validItem,
				search_terms: Array.from({ length: 5 }, (_, i) => ({
					kind: 'simap' as const,
					canton: 'VD' as const,
					query: `terme ${i}`,
					label: `SIMAP VD · terme ${i}`
				}))
			}).success
		).toBe(false);
	});

	it('rejette un chip avec canton hors enum', () => {
		expect(
			IntelligenceItemSchema.safeParse({
				...validItem,
				search_terms: [
					{ kind: 'simap', canton: 'ZH', query: 'test', label: 'SIMAP ZH · test' },
					validItem.search_terms[1]
				]
			}).success
		).toBe(false);
	});

	it('rejette un chip avec kind invalide', () => {
		expect(
			IntelligenceItemSchema.safeParse({
				...validItem,
				search_terms: [
					{ kind: 'sparql', canton: 'VD', query: 'test', label: 'SPARQL VD · test' },
					validItem.search_terms[1]
				]
			}).success
		).toBe(false);
	});

	it('rétro-compat : accepte legacy strings et les normalise en chips', () => {
		const result = IntelligenceItemSchema.safeParse({
			...validItem,
			search_terms: [
				'appel d offres école Vaud vitrage',
				'Ville Lausanne rénovation'
			]
		});
		expect(result.success).toBe(true);
		if (result.success) {
			const chips = result.data.search_terms;
			expect(chips).toHaveLength(2);
			expect(chips[0]).toMatchObject({ kind: 'simap', canton: 'VD' });
			expect(chips[0].label).toContain('SIMAP');
			expect(chips[1]).toMatchObject({ kind: 'simap', canton: 'VD' });
		}
	});

	it('rétro-compat : détecte kind zefix via indices raison sociale', () => {
		const result = IntelligenceItemSchema.safeParse({
			...validItem,
			search_terms: [
				'Losinger Marazzi SA Genève',
				'vitrage tertiaire'
			]
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.search_terms[0]).toMatchObject({ kind: 'zefix', canton: 'GE' });
		}
	});

	it('rejette un chip query trop court', () => {
		expect(
			IntelligenceItemSchema.safeParse({
				...validItem,
				search_terms: [
					{ kind: 'simap', canton: 'VD', query: 'x', label: 'SIMAP VD · x' },
					validItem.search_terms[1]
				]
			}).success
		).toBe(false);
	});
});

describe('LegacySearchTermSchema (rétro-compat anciennes éditions)', () => {
	it('accepte un terme legacy valide', () => {
		expect(LegacySearchTermSchema.safeParse(validLegacySearchTerm).success).toBe(true);
	});

	it('rejette un segment hors enum', () => {
		expect(
			LegacySearchTermSchema.safeParse({ ...validLegacySearchTerm, segment: 'industriel' }).success
		).toBe(false);
	});
});

describe('Enums', () => {
	it('SegmentEnum contient les 5 segments FilmPro', () => {
		const values = SegmentEnum.options;
		expect(values).toEqual(['tertiaire', 'residentiel', 'commerces', 'erp', 'partenaires']);
	});

	it('ActionabilityEnum contient les 3 niveaux', () => {
		expect(ActionabilityEnum.options).toEqual([
			'action_directe',
			'veille_active',
			'a_surveiller'
		]);
	});

	it('ThemeEnum contient les 7 thèmes', () => {
		expect(ThemeEnum.options.length).toBe(7);
	});

	it('ComplianceTagEnum contient les 4 tags', () => {
		expect(ComplianceTagEnum.options.length).toBe(4);
	});
});
