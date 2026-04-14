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

export const ActionabilityEnum = z.enum([
	'action_directe',
	'veille_active',
	'a_surveiller'
]);

export const ImpactAxisEnum = z.enum([
	'diagnostic',
	'go_nogo',
	'pricing',
	'sourcing',
	'capacite',
	'qualite',
	'organisation',
	'image',
	'reglementation'
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
	filmpro_relevance: z.string().min(20).max(600),
	maturity: MaturityEnum,
	theme: ThemeEnum,
	geo_scope: GeoScopeEnum,
	source: z.object({
		name: z.string().min(2).max(120),
		url: HttpsUrl,
		// Accepte date seule (YYYY-MM-DD) ou datetime complet ; normalisée serveur.
		published_at: z
			.string()
			.regex(
				/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/,
				'Format attendu : YYYY-MM-DD ou YYYY-MM-DDTHH:MM:SSZ'
			)
			.transform((s) => (s.includes('T') ? s : `${s}T00:00:00Z`))
	}),
	deep_dive: z.string().max(400).nullable(),
	image_url: HttpsUrl.nullable(),
	// Attribution commerciale par item (refonte /veille, remplace search_terms globaux).
	segment: SegmentEnum,
	actionability: ActionabilityEnum,
	// 2 à 4 termes de recherche par item, directement exploitables dans Zefix/SIMAP/search.ch.
	search_terms: z.array(z.string().min(3).max(120)).min(2).max(4),
	// Champs de verification post-generation (ajoutes serveur, pas par le modele).
	// Optionnels pour retro-compat avec les editions pre-Sprint 2.
	verification: z
		.object({
			url_ok: z.boolean(),
			url_reason: z.string().optional(),
			entity_ok: z.boolean().nullable(),
			unverified_entities: z.array(z.string()).default([])
		})
		.optional()
});

export const ImpactFilmproSchema = z.object({
	axis: ImpactAxisEnum,
	note: z.string().min(10).max(500)
});

// Legacy (rétro-compat lectures pré-refonte /veille) : anciennes éditions ont
// search_terms globaux { term, rationale, segment }. Non produit par le modèle depuis la refonte.
export const LegacySearchTermSchema = z.object({
	term: z.string().min(3).max(120),
	rationale: z.string().min(10).max(200),
	segment: SegmentEnum
});

export const IntelligenceEditionSchema = z.object({
	week_label: z.string().regex(/^\d{4}-W\d{2}$/, 'Format attendu : YYYY-Www'),

	generated_at: z.string().datetime(),
	compliance_tag: ComplianceTagEnum,
	executive_summary: z.string().min(80).max(1200)
});

export const IntelligenceReportSchema = z.object({
	meta: IntelligenceEditionSchema,
	items: z.array(IntelligenceItemSchema).min(0).max(10),
	impacts_filmpro: z.array(ImpactFilmproSchema).min(0).max(3)
});

export type Theme = z.infer<typeof ThemeEnum>;
export type Maturity = z.infer<typeof MaturityEnum>;
export type GeoScope = z.infer<typeof GeoScopeEnum>;
export type ComplianceTag = z.infer<typeof ComplianceTagEnum>;
export type Segment = z.infer<typeof SegmentEnum>;
export type Actionability = z.infer<typeof ActionabilityEnum>;
export type ImpactAxis = z.infer<typeof ImpactAxisEnum>;
export type IntelligenceItem = z.infer<typeof IntelligenceItemSchema>;
export type ImpactFilmpro = z.infer<typeof ImpactFilmproSchema>;
export type LegacySearchTerm = z.infer<typeof LegacySearchTermSchema>;
/** @deprecated — alias legacy, sera retiré en Phase 2 (refonte UI /veille). */
export type SearchTerm = LegacySearchTerm;
export type IntelligenceEdition = z.infer<typeof IntelligenceEditionSchema>;
export type IntelligenceReport = z.infer<typeof IntelligenceReportSchema>;
