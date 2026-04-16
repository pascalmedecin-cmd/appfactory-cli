import { z } from 'zod';
import { normalizeStringToChip } from './chip-normalize';

export const CantonEnum = z.enum(['GE', 'VD', 'VS', 'NE', 'FR', 'JU']);

export const ChipKindEnum = z.enum(['simap', 'zefix']);

// Chip structuré auto-exécutable (Bloc 4).
// Un chip = une recherche prospection qui peut partir immédiatement au clic.
export const SearchChipSchema = z.object({
	kind: ChipKindEnum,
	canton: CantonEnum,
	query: z.string().min(2).max(120),
	label: z.string().min(3).max(160)
});

// Accepte soit un chip structuré (nouveau format Bloc 4), soit une string libre
// (rétro-compat pré-Bloc 4 : normalise via heuristique canton+kind).
export const SearchChipOrLegacySchema = z.union([
	SearchChipSchema,
	z.string().min(3).max(120).transform((s) => normalizeStringToChip(s))
]);

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
	// Image générée via fal.ai (recraft V3) au pipeline cron quand l'og:image
	// n'est pas fiable et le fallback media_library pas pertinent.
	// URL publique vers media_library bucket (source='fal-ai').
	generated_image_url: HttpsUrl.nullable().optional(),
	// Attribution commerciale par item (refonte /veille, remplace search_terms globaux).
	segment: SegmentEnum,
	actionability: ActionabilityEnum,
	// 2 à 4 chips structurés par item (Bloc 4). Union accepte legacy string pour rétro-compat
	// (items pré-Bloc 4 en DB). Chaque chip cliqué → auto-exécute prospection (SIMAP/Zefix).
	search_terms: z.array(SearchChipOrLegacySchema).min(2).max(4),
	// Champs de verification post-generation (ajoutes serveur, pas par le modele).
	// Optionnels pour retro-compat avec les editions pre-Sprint 2.
	verification: z
		.object({
			url_ok: z.boolean(),
			url_reason: z.string().optional(),
			entity_ok: z.boolean().nullable(),
			unverified_entities: z.array(z.string()).default([]),
			// Sprint 3 P1 fraîcheur déterministe : date_ok=false → item hors fenêtre
			// temporelle de la semaine cible. date_source indique l'origine de la date.
			date_ok: z.boolean().optional(),
			date_source: z.enum(['og', 'llm', 'none']).optional(),
			// Bug URL doublée (session 60) : true si Phase 2 a émis une URL absente
			// des candidats Phase 1 filtrés (hallucination ou réécriture du chemin).
			url_mutated: z.boolean().optional()
		})
		.optional()
});

// Phase 1 (Bloc 2) : sortie LLM extraction/tri brute avant filtre programmatique.
// Format volontairement minimaliste : pas de rédaction éditoriale, juste les
// faits nécessaires au filtre (URL + date + hints de classement).
export const IntelligenceCandidateSchema = z.object({
	url: HttpsUrl,
	proposed_title: z.string().min(5).max(250),
	published_at: z
		.string()
		.regex(
			/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/,
			'Format attendu : YYYY-MM-DD ou YYYY-MM-DDTHH:MM:SSZ'
		),
	source_name: z.string().min(2).max(120),
	excerpt: z.string().min(20).max(600),
	theme: ThemeEnum,
	geo_scope: GeoScopeEnum,
	rationale: z.string().min(10).max(300)
});

export const IntelligenceCandidatesSchema = z.object({
	candidates: z.array(IntelligenceCandidateSchema).min(0).max(20)
});

export type IntelligenceCandidate = z.infer<typeof IntelligenceCandidateSchema>;

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

export type Canton = z.infer<typeof CantonEnum>;
export type ChipKind = z.infer<typeof ChipKindEnum>;
export type SearchChip = z.infer<typeof SearchChipSchema>;
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
