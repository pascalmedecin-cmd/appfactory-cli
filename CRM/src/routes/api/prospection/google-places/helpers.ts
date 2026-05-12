/**
 * Helpers pour l'import depuis Google Places API (New) — Text Search.
 * Logique pure, testable sans I/O.
 *
 * Spec : notes/google-places-2026-05-12/spec.md
 * Doc Google : https://developers.google.com/maps/documentation/places/web-service/text-search
 *
 * Économie de quota : type d'activité dans une enum fermée (mappé aux `includedType`
 * Google) + canton requis (bornage géographique) + cap dur 20 résultats / requête.
 */

import { normalizeNFDTrim } from '$lib/utils/text-normalize';

/** Cantons romands cibles (mêmes que les autres sources prospection). */
const ALLOWED_CANTONS = ['GE', 'VD', 'VS', 'NE', 'FR', 'JU'] as const;
export type AllowedCanton = (typeof ALLOWED_CANTONS)[number];
const ALLOWED_CANTONS_SET = new Set<string>(ALLOWED_CANTONS);

const CANTON_NAMES: Record<AllowedCanton, string> = {
	GE: 'Genève',
	VD: 'Vaud',
	VS: 'Valais',
	NE: 'Neuchâtel',
	FR: 'Fribourg',
	JU: 'Jura',
};

/**
 * Types d'activité proposés à l'utilisateur, mappés aux `includedType` de la Table A
 * « Places API (New) » utilisables en Text Search. `includedType: null` → on omet le
 * paramètre et on force le mot-clé `keyword` dans la requête texte.
 *
 * Le `key` est ce que le client envoie ; il est validé contre cette liste (enum fermée).
 */
export const ACTIVITY_TYPES = [
	{ key: 'real_estate_agency', label: 'Régies immobilières', includedType: 'real_estate_agency', keyword: 'régie immobilière' },
	{ key: 'general_contractor', label: 'Entreprises générales / construction', includedType: 'general_contractor', keyword: 'entreprise générale construction' },
	{ key: 'electrician', label: 'Électriciens', includedType: 'electrician', keyword: 'électricien' },
	{ key: 'plumber', label: 'Sanitaire / chauffage', includedType: 'plumber', keyword: 'sanitaire chauffage' },
	{ key: 'roofing_contractor', label: 'Toiture / étanchéité', includedType: 'roofing_contractor', keyword: 'toiture étanchéité' },
	{ key: 'painter', label: 'Peinture / plâtrerie', includedType: 'painter', keyword: 'peinture plâtrerie' },
	{ key: 'architect', label: 'Architectes / bureaux d’études', includedType: null, keyword: 'architecte bureau d’études' },
	{ key: 'other', label: 'Autre (mot-clé libre)', includedType: null, keyword: null },
] as const;
export type ActivityTypeKey = (typeof ACTIVITY_TYPES)[number]['key'];
const ACTIVITY_TYPE_MAP = new Map(ACTIVITY_TYPES.map((a) => [a.key, a]));

/** Mots-vides légaux refusés comme mot-clé libre (mêmes que search.ch). */
const GENERIC_TERM_DENYLIST = new Set([
	'sa', 'sarl', 'sa rl', 'sasu', 'sarl', 'srl',
	'gmbh', 'ag', 'kg', 'ohg',
	'ltd', 'llc', 'inc',
	'societe', 'company', 'compagnie',
	'entreprise', 'firma',
]);

export function isGenericKeyword(s: string): boolean {
	return GENERIC_TERM_DENYLIST.has(normalizeNFDTrim(s));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type GooglePlacesImportInput = {
	activityType: ActivityTypeKey;
	/** Mot-clé complémentaire. Obligatoire si activityType === 'other'. null sinon possible. */
	keyword: string | null;
	canton: AllowedCanton;
	from_intelligence: string | null;
	from_term: string | null;
};

export type ValidationResult =
	| { valid: true; input: GooglePlacesImportInput }
	| { valid: false; error: string };

export function validateGooglePlacesImportInput(body: unknown): ValidationResult {
	if (!body || typeof body !== 'object') return { valid: false, error: 'Payload invalide.' };
	const b = body as Record<string, unknown>;

	const activityType = typeof b.activityType === 'string' ? b.activityType : '';
	if (!ACTIVITY_TYPE_MAP.has(activityType as ActivityTypeKey)) {
		return { valid: false, error: 'Type d’activité requis.' };
	}

	let keyword: string | null = null;
	if (typeof b.keyword === 'string') {
		const k = b.keyword.trim();
		if (k.length > 80) return { valid: false, error: 'Mot-clé trop long (max 80 caractères).' };
		if (k.length > 0) {
			if (k.length < 3) return { valid: false, error: 'Mot-clé trop court (au moins 3 caractères).' };
			if (isGenericKeyword(k)) {
				return { valid: false, error: 'Mot-clé trop générique (forme juridique seule).' };
			}
			keyword = k;
		}
	}
	if (activityType === 'other' && !keyword) {
		return { valid: false, error: 'Mot-clé requis pour le type « Autre » (au moins 3 caractères).' };
	}

	const canton = typeof b.canton === 'string' ? b.canton.toUpperCase() : '';
	if (!ALLOWED_CANTONS_SET.has(canton)) {
		return { valid: false, error: 'Canton requis (GE, VD, VS, NE, FR, JU).' };
	}

	const from_intelligence =
		typeof b.from_intelligence === 'string' && UUID_RE.test(b.from_intelligence) ? b.from_intelligence : null;
	const from_term =
		typeof b.from_term === 'string' && b.from_term.length > 0 ? b.from_term.slice(0, 200) : null;

	return {
		valid: true,
		input: { activityType: activityType as ActivityTypeKey, keyword, canton: canton as AllowedCanton, from_intelligence, from_term },
	};
}

/** Construit le `textQuery` Google : libellé métier (+ mot-clé) + nom du canton. */
export function buildTextQuery(input: { activityType: ActivityTypeKey; keyword: string | null; canton: AllowedCanton }): string {
	const meta = ACTIVITY_TYPE_MAP.get(input.activityType);
	const parts: string[] = [];
	if (meta?.keyword) parts.push(meta.keyword);
	if (input.keyword) parts.push(input.keyword);
	parts.push(CANTON_NAMES[input.canton]);
	parts.push('Suisse');
	return parts.filter(Boolean).join(' ');
}

/** `includedType` Google pour ce type d'activité, ou null (paramètre omis). */
export function includedTypeFor(activityType: ActivityTypeKey): string | null {
	return ACTIVITY_TYPE_MAP.get(activityType)?.includedType ?? null;
}

/**
 * Boîtes englobantes (WGS84) par canton : low = sud-ouest, high = nord-est.
 * Débordent légèrement sur les cantons voisins — on re-filtre ensuite sur
 * `administrative_area_level_1` côté parsing.
 */
const CANTON_RECTANGLES: Record<AllowedCanton, { low: { latitude: number; longitude: number }; high: { latitude: number; longitude: number } }> = {
	GE: { low: { latitude: 46.12, longitude: 5.95 }, high: { latitude: 46.37, longitude: 6.32 } },
	VD: { low: { latitude: 46.18, longitude: 6.05 }, high: { latitude: 47.00, longitude: 7.25 } },
	VS: { low: { latitude: 45.86, longitude: 6.77 }, high: { latitude: 46.65, longitude: 8.48 } },
	NE: { low: { latitude: 46.84, longitude: 6.43 }, high: { latitude: 47.16, longitude: 7.06 } },
	FR: { low: { latitude: 46.43, longitude: 6.74 }, high: { latitude: 47.02, longitude: 7.38 } },
	JU: { low: { latitude: 47.18, longitude: 6.85 }, high: { latitude: 47.50, longitude: 7.55 } },
};

export function cantonRectangle(canton: AllowedCanton) {
	return CANTON_RECTANGLES[canton];
}

// --- Parsing de la réponse Places API (New) ---

type RawAddressComponent = { longText?: string; shortText?: string; types?: string[] };
type RawPlace = {
	id?: string;
	displayName?: { text?: string };
	formattedAddress?: string;
	addressComponents?: RawAddressComponent[];
	types?: string[];
	location?: { latitude?: number; longitude?: number };
	businessStatus?: string;
	nationalPhoneNumber?: string;
	websiteUri?: string;
	googleMapsUri?: string;
};

export type GooglePlaceEntry = {
	placeId: string;
	name: string;
	adresse: string | null;
	npa: string | null;
	localite: string | null;
	canton: string | null;
	cantonInTargets: boolean;
	telephone: string | null;
	website: string | null;
	googleMapsUri: string | null;
	types: string[];
	formattedAddress: string | null;
};

function pickComponent(components: RawAddressComponent[], type: string): RawAddressComponent | undefined {
	return components.find((c) => Array.isArray(c.types) && c.types.includes(type));
}

/** Mappe `addressComponents` → {adresse, npa, localite, canton}. Champs absents = null. */
export function addressComponentsToFields(components: RawAddressComponent[] | undefined): {
	adresse: string | null;
	npa: string | null;
	localite: string | null;
	canton: string | null;
} {
	if (!Array.isArray(components)) return { adresse: null, npa: null, localite: null, canton: null };
	const route = pickComponent(components, 'route')?.longText ?? null;
	const streetNo = pickComponent(components, 'street_number')?.longText ?? null;
	const adresse = route ? (streetNo ? `${route} ${streetNo}` : route) : null;
	const npaRaw = pickComponent(components, 'postal_code')?.longText ?? null;
	const npa = npaRaw && /^\d{4}$/.test(npaRaw.trim()) ? npaRaw.trim() : null;
	const localite =
		pickComponent(components, 'locality')?.longText ??
		pickComponent(components, 'postal_town')?.longText ??
		null;
	const cantonRaw =
		pickComponent(components, 'administrative_area_level_1')?.shortText ??
		pickComponent(components, 'administrative_area_level_1')?.longText ??
		null;
	const canton = cantonRaw ? cantonRaw.trim().toUpperCase() : null;
	return { adresse, npa, localite, canton: canton && /^[A-Z]{2,}$/.test(canton) ? canton : null };
}

const HTTPS_RE = /^https?:\/\//i;

/**
 * Parse la réponse JSON de `places:searchText`. Ignore les établissements non opérationnels
 * et ceux sans `id`/`displayName`. Robuste aux champs absents.
 */
export function parsePlacesResponse(payload: unknown): GooglePlaceEntry[] {
	if (!payload || typeof payload !== 'object') return [];
	const places = (payload as { places?: unknown }).places;
	if (!Array.isArray(places)) return [];

	const out: GooglePlaceEntry[] = [];
	for (const raw of places as RawPlace[]) {
		if (!raw || typeof raw !== 'object') continue;
		const placeId = typeof raw.id === 'string' ? raw.id.trim() : '';
		const name = typeof raw.displayName?.text === 'string' ? raw.displayName.text.trim() : '';
		if (!placeId || name.length < 2) continue;
		if (raw.businessStatus && raw.businessStatus !== 'OPERATIONAL') continue;

		const addr = addressComponentsToFields(raw.addressComponents);
		const cantonInTargets = !!addr.canton && ALLOWED_CANTONS_SET.has(addr.canton);
		const website = typeof raw.websiteUri === 'string' && HTTPS_RE.test(raw.websiteUri.trim()) ? raw.websiteUri.trim() : null;
		const telephone = typeof raw.nationalPhoneNumber === 'string' && raw.nationalPhoneNumber.trim().length > 0 ? raw.nationalPhoneNumber.trim() : null;
		const googleMapsUri = typeof raw.googleMapsUri === 'string' && HTTPS_RE.test(raw.googleMapsUri.trim()) ? raw.googleMapsUri.trim() : null;
		const types = Array.isArray(raw.types) ? raw.types.filter((t): t is string => typeof t === 'string') : [];
		const formattedAddress = typeof raw.formattedAddress === 'string' && raw.formattedAddress.trim().length > 0 ? raw.formattedAddress.trim() : null;

		out.push({
			placeId,
			name,
			adresse: addr.adresse,
			npa: addr.npa,
			localite: addr.localite,
			canton: cantonInTargets ? addr.canton : null,
			cantonInTargets,
			telephone,
			website,
			googleMapsUri,
			types,
			formattedAddress,
		});
	}
	return out;
}

/** source_id déterministe pour dédup intra-source. Le place.id Google est stable. */
export function buildSourceId(placeId: string): string {
	return `pid:${placeId}`.slice(0, 80);
}

/** URL Maps canonique vers une fiche, à partir d'un place.id. */
export function placeMapsUrl(placeId: string): string {
	return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
}

const SECTEURS_KEYWORDS: Record<string, string[]> = {
	construction: ['construction', 'batiment', 'bau', 'genie civil', 'general contractor', 'entreprise generale'],
	architecture: ['architecte', 'architecture', 'architekt', 'bureau d etudes'],
	hvac: ['chauffage', 'ventilation', 'climatisation', 'hvac', 'heizung', 'sanitaire', 'plumber', 'plumbing'],
	electricite: ['electricite', 'elektro', 'electricien', 'electrician', 'electrical'],
	peinture: ['peinture', 'platrerie', 'painter', 'painting', 'maler'],
	renovation: ['renovation', 'transformation', 'umbau'],
	menuiserie: ['menuiserie', 'charpente', 'schreinerei', 'zimmerei', 'vitrerie', 'vitre', 'roofing', 'roofing contractor', 'toiture', 'etancheite', 'couvreur'],
	ingenieur: ['ingenieur', 'bureau technique'],
	regie: ['regie', 'facility', 'immobilier', 'verwaltung', 'real estate', 'real estate agency'],
};

/** Détecte un secteur métier depuis le nom + les `types` Google d'un place. */
export function detectSecteurFromPlace(entry: { name: string; types?: string[] }): string | null {
	const haystack = normalizeNFDTrim([entry.name, ...(entry.types ?? []).map((t) => t.replace(/_/g, ' '))].join(' '));
	for (const [secteur, kws] of Object.entries(SECTEURS_KEYWORDS)) {
		if (kws.some((kw) => haystack.includes(kw))) return secteur;
	}
	return null;
}
