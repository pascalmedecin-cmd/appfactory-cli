import { z } from 'zod';

export const ThemeEnum = z.enum([
	'films_solaires',
	'films_securite',
	'discretion_smartfilm',
	'batiment_renovation',
	'ia_outils',
	'reglementation',
	'autre'
]);

export const MaturityEnum = z.enum(['emergent', 'etabli', 'speculatif']);

export const GeoScopeEnum = z.enum(['suisse_romande', 'suisse', 'monde']);

export const ComplianceTagEnum = z.enum([
	'OK FilmPro',
	'Adjacent pertinent',
	'À surveiller',
	'Non exploitable'
]);

export const SegmentEnum = z.enum([
	'tertiaire',
	'residentiel',
	'commerces',
	'erp',
	'partenaires'
]);

export const ImpactAxisEnum = z.enum([
	'diagnostic',
	'go_nogo',
	'pricing',
	'sourcing',
	'capacite',
	'qualite',
	'organisation',
	'image'
]);

export const StatusEnum = z.enum(['published', 'draft', 'error']);

// Refuse les schemes non-HTTP(S) (protège contre javascript:, data:, etc.)
const HttpsUrl = z
	.string()
	.url()
	.max(500)
	.refine((u) => /^https?:\/\//i.test(u), { message: 'URL doit commencer par http(s)://' });

export const IntelligenceItemSchema = z.object({
	rank: z.number().int().min(1).max(10),
	title: z.string().min(10).max(200),
	summary: z.string().min(40).max(800),
	filmpro_relevance: z.string().min(20).max(300),
	maturity: MaturityEnum,
	theme: ThemeEnum,
	geo_scope: GeoScopeEnum,
	source: z.object({
		name: z.string().min(2).max(120),
		url: HttpsUrl,
		published_at: z.string().datetime()
	}),
	deep_dive: z.string().max(200).nullable(),
	image_url: HttpsUrl.nullable()
});

export const ImpactFilmproSchema = z.object({
	axis: ImpactAxisEnum,
	note: z.string().min(10).max(300)
});

export const SearchTermSchema = z.object({
	term: z.string().min(3).max(120),
	rationale: z.string().min(10).max(200),
	segment: SegmentEnum
});

export const IntelligenceEditionSchema = z.object({
	week_label: z.string().regex(/^\d{4}-W\d{2}$/, 'Format attendu : YYYY-Www'),

	generated_at: z.string().datetime(),
	compliance_tag: ComplianceTagEnum,
	executive_summary: z.string().min(80).max(600)
});

export const IntelligenceReportSchema = z.object({
	edition: IntelligenceEditionSchema,
	items: z.array(IntelligenceItemSchema).min(1).max(10),
	impacts_filmpro: z.array(ImpactFilmproSchema).min(1).max(3),
	search_terms: z.array(SearchTermSchema).min(8).max(15)
});

export type Theme = z.infer<typeof ThemeEnum>;
export type Maturity = z.infer<typeof MaturityEnum>;
export type GeoScope = z.infer<typeof GeoScopeEnum>;
export type ComplianceTag = z.infer<typeof ComplianceTagEnum>;
export type Segment = z.infer<typeof SegmentEnum>;
export type ImpactAxis = z.infer<typeof ImpactAxisEnum>;
export type IntelligenceItem = z.infer<typeof IntelligenceItemSchema>;
export type ImpactFilmpro = z.infer<typeof ImpactFilmproSchema>;
export type SearchTerm = z.infer<typeof SearchTermSchema>;
export type IntelligenceEdition = z.infer<typeof IntelligenceEditionSchema>;
export type IntelligenceReport = z.infer<typeof IntelligenceReportSchema>;
