/**
 * Source UNIQUE des libellés humains (FR accentué) des enums du domaine Veille.
 *
 * Avant (2026-06-23) : chaque page /veille (+page, [id], item/[slug]) redéclarait
 * ses propres maps enum->libellé (duplication x3-x4). Risque : une map qui dérive
 * (slug custom non couvert), ou un libellé technique snake_case qui fuit à l'écran
 * (commentaire Pascal W25 sur `discretion_smartfilm` rendu brut). Ce module
 * centralise les libellés + styles partagés pour empêcher toute régression.
 *
 * INVARIANT : aucune valeur user-facing ne doit contenir d'underscore. Le fallback
 * de dernier recours `humanizeSlug` remplace les `_` par des espaces et capitalise,
 * de sorte qu'un slug inconnu donne « Smart Glass » plutôt que `smart_glass`.
 *
 * Le `theme` n'est PAS un enum figé : c'est un slug DB éditable via /veille/themes
 * (regex `^[a-z][a-z0-9_]*$`, donc snake_case garanti). Sa source d'affichage
 * correcte est le `label` de la table `veille_themes` ; `themeLabel(slug, labels)`
 * privilégie ce label, et ne retombe sur `humanizeSlug` qu'en dernier recours.
 *
 * NB : les emails (email-brief.ts / email-recap.ts) gardent volontairement leurs
 * propres libellés (copie email-spécifique : « À actionner », « International »),
 * et n'ont aucune fuite d'underscore. Ce module sert les pages web.
 */
import type {
	Actionability,
	Segment,
	GeoScope,
	Maturity,
	ImpactAxis,
	ChipKind,
	ComplianceTag
} from '$lib/server/intelligence/schema';

/**
 * Fallback ultime : humanise un slug snake_case inconnu (« smart_glass » ->
 * « Smart glass ») au lieu de recracher la valeur brute. Aligné sur le pattern
 * existant de signauxFormat.ts (formatTypeLabel). Garantit l'invariant « zéro
 * underscore user-facing » même pour une valeur hors map.
 */
export function humanizeSlug(value: string | null | undefined): string {
	if (!value) return '';
	return value.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

const ACTIONABILITY_LABELS: Record<Actionability, string> = {
	action_directe: 'Action directe',
	veille_active: 'Veille active',
	a_surveiller: 'À surveiller'
};

const SEGMENT_LABELS: Record<Segment, string> = {
	tertiaire: 'Tertiaire',
	residentiel: 'Résidentiel',
	commerces: 'Commerces',
	erp: 'ERP',
	partenaires: 'Partenaires'
};

const GEO_SCOPE_LABELS: Record<GeoScope, string> = {
	suisse_romande: 'Suisse romande',
	suisse: 'Suisse',
	monde: 'Monde'
};

// Variante courte pour les badges denses (page item) : Romandie / CH / Monde.
const GEO_SCOPE_SHORT_LABELS: Record<GeoScope, string> = {
	suisse_romande: 'Romandie',
	suisse: 'CH',
	monde: 'Monde'
};

const MATURITY_LABELS: Record<Maturity, string> = {
	emergent: 'Émergent',
	etabli: 'Établi',
	speculatif: 'Spéculatif'
};

const IMPACT_AXIS_LABELS: Record<ImpactAxis, string> = {
	diagnostic: 'Diagnostic',
	go_nogo: 'Go / No-go',
	pricing: 'Pricing',
	sourcing: 'Sourcing',
	capacite: 'Capacité',
	qualite: 'Qualité',
	organisation: 'Organisation',
	image: 'Image',
	reglementation: 'Réglementation'
};

const CHIP_KIND_LABELS: Record<ChipKind, string> = {
	simap: 'SIMAP',
	zefix: 'Zefix',
	regbl: 'RegBL'
};

export function actionabilityLabel(value: string | null | undefined): string {
	return ACTIONABILITY_LABELS[(value ?? '') as Actionability] ?? humanizeSlug(value);
}

export function segmentLabel(value: string | null | undefined): string {
	return SEGMENT_LABELS[(value ?? '') as Segment] ?? humanizeSlug(value);
}

export function geoScopeLabel(value: string | null | undefined): string {
	return GEO_SCOPE_LABELS[(value ?? '') as GeoScope] ?? humanizeSlug(value);
}

export function geoScopeShortLabel(value: string | null | undefined): string {
	return GEO_SCOPE_SHORT_LABELS[(value ?? '') as GeoScope] ?? humanizeSlug(value);
}

export function maturityLabel(value: string | null | undefined): string {
	return MATURITY_LABELS[(value ?? '') as Maturity] ?? humanizeSlug(value);
}

export function impactAxisLabel(value: string | null | undefined): string {
	return IMPACT_AXIS_LABELS[(value ?? '') as ImpactAxis] ?? humanizeSlug(value);
}

export function chipKindLabel(value: string | null | undefined): string {
	return CHIP_KIND_LABELS[(value ?? '') as ChipKind] ?? humanizeSlug(value);
}

// Icônes Material par kind de chip. Source UNIQUE (comme les libellés ci-dessus) :
// supprime la duplication entre /veille/[id] et /veille/item/[slug]. Repli 'search'
// pour un kind inconnu, jamais un crash.
const CHIP_KIND_ICONS: Record<ChipKind, string> = {
	simap: 'gavel',
	zefix: 'business',
	regbl: 'construction'
};

export function chipKindIcon(value: string | null | undefined): string {
	return CHIP_KIND_ICONS[(value ?? '') as ChipKind] ?? 'search';
}

// compliance_tag : les valeurs d'enum SONT déjà des libellés humains (« OK FilmPro »,
// « À surveiller »…). Pas de map nécessaire, mais on expose un helper pour homogénéiser
// les appels et garder le fallback humanisé si une valeur inconnue surgissait.
export function complianceTagLabel(value: string | null | undefined): string {
	return (value as ComplianceTag) ?? humanizeSlug(value);
}

/**
 * Libellé d'un thème. `theme` est un slug DB ; sa source d'affichage est le `label`
 * de la table veille_themes (passé en `labels`, slug -> label). Ordre de résolution :
 *   1. label DB si fourni et connu,
 *   2. humanizeSlug (jamais le slug brut avec underscores).
 * Ne JAMAIS afficher le slug tel quel.
 */
export function themeLabel(
	slug: string | null | undefined,
	labels?: Readonly<Record<string, string>> | null
): string {
	if (!slug) return '';
	const fromDb = labels?.[slug];
	if (fromDb && fromDb.trim().length > 0) return fromDb;
	return humanizeSlug(slug);
}

/**
 * Construit la map slug -> label à partir des thèmes actifs chargés côté serveur
 * (listActiveThemes). Sert d'argument `labels` à themeLabel().
 */
export function themeLabelMap(
	themes: ReadonlyArray<{ slug: string; label: string }> | null | undefined
): Record<string, string> {
	const map: Record<string, string> = {};
	for (const t of themes ?? []) map[t.slug] = t.label;
	return map;
}

// ---------- Styles partagés (Tailwind) ----------
// Dupliqués jusqu'ici dans +page.svelte ET item/[slug]/+page.svelte. Centralisés
// ici (donnée pure) avec fallback neutre pour toute valeur inconnue.

const ACTIONABILITY_STYLES: Record<Actionability, string> = {
	action_directe: 'bg-danger-light text-danger-deep border-danger/20',
	veille_active: 'bg-warning-light text-warning-deep border-warning/20',
	a_surveiller: 'bg-surface-alt text-text-muted border-border'
};

const SEGMENT_STYLES: Record<Segment, string> = {
	tertiaire: 'bg-prosp-import-bg text-prosp-import-deep border-prosp-import/30',
	residentiel: 'bg-prosp-qualify-bg text-prosp-qualify-deep border-prosp-qualify/30',
	commerces: 'bg-prosp-convert-bg text-prosp-convert-deep border-prosp-convert/30',
	erp: 'bg-prosp-enrich-bg text-prosp-enrich-deep border-prosp-enrich/30',
	partenaires: 'bg-primary-light text-primary border-primary'
};

const NEUTRAL_STYLE = 'bg-surface-alt text-text-muted border-border';

export function actionabilityStyle(value: string | null | undefined): string {
	return ACTIONABILITY_STYLES[(value ?? '') as Actionability] ?? NEUTRAL_STYLE;
}

export function segmentStyle(value: string | null | undefined): string {
	return SEGMENT_STYLES[(value ?? '') as Segment] ?? NEUTRAL_STYLE;
}
