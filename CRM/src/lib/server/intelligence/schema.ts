import { z } from 'zod';
import { normalizeStringToChip } from './chip-normalize';

export const CantonEnum = z.enum(['GE', 'VD', 'VS', 'NE', 'FR', 'JU']);

// Phase F : étendu à regbl. search_ch n'est pas un import (enrichissement par lead_id),
// donc absent du pont Veille auto-exécuté. Les 3 imports prospection auto-exécutables
// depuis Veille : simap (appels d'offres), zefix (entreprises), regbl (chantiers).
export const ChipKindEnum = z.enum(['simap', 'zefix', 'regbl']);

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

export const StatusEnum = z.enum(['published', 'draft', 'error', 'running']);

// Refuse les schemes non-HTTP(S) (protège contre javascript:, data:, etc.)
// Limite 2000 chars (RFC max effectif) : certains CMS/CDN ont URLs longues avec
// tracking ou query params. Bug observé S110 W17 : 2 candidats avec URL > 500.
const HttpsUrl = z
	.string()
	.url()
	.max(2000)
	.refine((u) => /^https?:\/\//i.test(u), { message: 'URL doit commencer par http(s)://' });

export const IntelligenceItemSchema = z.object({
	rank: z.number().int().min(1).max(15),
	title: z.string().min(10).max(200),
	// Limites élargies après run prod S112 (6/7 items dépassaient 800).
	// Le prompt continue à viser 600-900 mais Zod ne rejette plus jusqu'à 1500.
	summary: z.string().min(40).max(1500),
	filmpro_relevance: z.string().min(20).max(1200),
	maturity: MaturityEnum,
	// theme : string permissif (slug taxonomie veille_themes). La validation
	// runtime contre la liste des slugs autorisés est faite post-Zod par
	// run-generation.ts (lookup avec fallback gracieux sur 'autre' si inconnu).
	// ThemeEnum reste exporté pour rétrocompat lecture éditions antérieures
	// mais n'est plus utilisé pour valider le tool_use LLM.
	theme: z.string().min(1).max(64),
	geo_scope: GeoScopeEnum,
	source: z.object({
		name: z.string().min(2).max(120),
		url: HttpsUrl,
		// Accepte date seule (YYYY-MM-DD) ou datetime complet ; normalisée serveur.
		// Audit 360 M-18 : `.max()` AVANT `.regex()` — la partie `(\.\d+)?` du regex
		// est de longueur variable, on borne en amont.
		published_at: z
			.string()
			.max(40, 'Date trop longue')
			.regex(
				// Accepte aussi les offsets numériques ISO 8601 (+HH:MM / -HH:MM), pas
				// seulement Z : le modèle émet parfois des dates avec fuseau (ex.
				// 2026-06-19T10:00:00+02:00), valides mais autrefois droppées → elles
				// empilaient vers le seuil de garde anti-dérive. La date reste vérifiée
				// en aval (filterAndAnnotateItems via parseFlexibleDate + isWithinWindow).
				/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/,
				'Format attendu : YYYY-MM-DD ou ISO 8601 (Z ou offset +HH:MM)'
			)
			.transform((s) => (s.includes('T') ? s : `${s}T00:00:00Z`))
	}),
	deep_dive: z.string().max(800).nullable(),
	// Attribution commerciale par item (refonte /veille, remplace search_terms globaux).
	segment: SegmentEnum,
	actionability: ActionabilityEnum,
	// 0 à 4 chips structurés par item (Bloc 4). Union accepte legacy string pour rétro-compat
	// (items pré-Bloc 4 en DB). Chaque chip cliqué → auto-exécute prospection (SIMAP/Zefix).
	// Plancher `min(0)` (min(2)→min(1) le 2026-06-06, →min(0) le 2026-06-19) : les chips sont
	// une PRÉFÉRENCE produit, pas un invariant. Incident W25 (cron du 2026-06-19) : un bon
	// article RTS sans angle de prospection direct (0 chip) faisait échouer toute l'édition,
	// puis la coquille restante l'achevait. Un item éditorialement complet ne doit JAMAIS
	// être rejeté faute de chips (l'aval apply-signals + l'UI item/[slug] tolèrent déjà []).
	// Voir .product-architect/veille/resilience-validation-spec.md §3a.
	search_terms: z.array(SearchChipOrLegacySchema).max(4),
	// Anti-doublons intelligent (refonte LEAN S112) : true si l'item est une mise
	// à jour récente d'un sujet déjà couvert dans une édition antérieure (article
	// plus récent que le précédent). previous_url pointe vers l'item antérieur.
	is_update: z.boolean().optional(),
	previous_url: HttpsUrl.optional(),
	// Champs de vérification post-génération (ajoutés serveur, pas par le modèle).
	// Optionnels pour rétro-compat avec les éditions pré-Sprint 2.
	verification: z
		.object({
			url_ok: z.boolean(),
			url_reason: z.string().optional(),
			// Champs hérités (entity-verify, fetch-og-date, url_mutated) supprimés
			// au commit 2 de la refonte LEAN. Conservés optional pour rétro-compat
			// lecture des anciennes éditions (jsonb).
			entity_ok: z.boolean().nullable().optional(),
			unverified_entities: z.array(z.string()).optional().default([]),
			date_ok: z.boolean().optional(),
			date_source: z.enum(['og', 'llm', 'none']).optional(),
			url_mutated: z.boolean().optional()
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
	// Audit 360 M-18 : `.max()` en amont du regex (defense-in-depth, le regex est
	// déjà ancré donc fixe-longueur, mais on borne explicitement).
	week_label: z.string().max(12).regex(/^\d{4}-W\d{2}$/, 'Format attendu : YYYY-Www'),

	generated_at: z.string().datetime(),
	compliance_tag: ComplianceTagEnum,
	executive_summary: z.string().min(80).max(2000)
});

export const IntelligenceReportSchema = z.object({
	meta: IntelligenceEditionSchema,
	// optional + default : Anthropic strict-mode peut omettre les clés "required"
	// quand le modèle n'a rien à émettre (bug observé S112 : impacts_filmpro
	// undefined dans le payload alors que listé dans required côté schema JSON).
	items: z.array(IntelligenceItemSchema).min(0).max(15).optional().default([]),
	impacts_filmpro: z.array(ImpactFilmproSchema).min(0).max(3).optional().default([])
});

export type Canton = z.infer<typeof CantonEnum>;
export type ChipKind = z.infer<typeof ChipKindEnum>;
export type SearchChip = z.infer<typeof SearchChipSchema>;
/**
 * @deprecated Le champ `theme` accepte n'importe quel slug actif de la
 * table `veille_themes` (depuis S169). Cet alias reste exporté pour
 * rétrocompat des éditions antérieures, mais utilisez `string` côté code.
 */
export type Theme = z.infer<typeof ThemeEnum> | string;
export type Maturity = z.infer<typeof MaturityEnum>;
export type GeoScope = z.infer<typeof GeoScopeEnum>;
export type ComplianceTag = z.infer<typeof ComplianceTagEnum>;
export type Segment = z.infer<typeof SegmentEnum>;
export type Actionability = z.infer<typeof ActionabilityEnum>;
export type ImpactAxis = z.infer<typeof ImpactAxisEnum>;
export type IntelligenceItem = z.infer<typeof IntelligenceItemSchema>;
export type ImpactFilmpro = z.infer<typeof ImpactFilmproSchema>;
export type LegacySearchTerm = z.infer<typeof LegacySearchTermSchema>;
/** @deprecated : alias legacy, sera retiré en Phase 2 (refonte UI /veille). */
export type SearchTerm = LegacySearchTerm;
export type IntelligenceEdition = z.infer<typeof IntelligenceEditionSchema>;
export type IntelligenceReport = z.infer<typeof IntelligenceReportSchema>;
