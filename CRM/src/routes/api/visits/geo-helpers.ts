/**
 * Helpers de géocodage / distance pour `/api/visits` (audit 360 M-53 — extraits du `+server.ts`
 * pour être testables unitairement : Haversine, parsing d'owner, parsing d'adresse suisse,
 * cascade de géocodage swisstopo).
 */

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Owner = { kind: 'lead' | 'entreprise'; id: string };

/** Owner depuis les query params (`?lead_id=` XOR `?entreprise_id=`). `null` si ambigu / absent / pas un UUID. */
export function parseOwner(url: URL): Owner | null {
	return resolveOwner(url.searchParams.get('lead_id'), url.searchParams.get('entreprise_id'));
}

/** Owner depuis le corps JSON d'un POST. Même règle. */
export function parseOwnerFromBody(body: Record<string, unknown>): Owner | null {
	const lead = typeof body.lead_id === 'string' ? body.lead_id : null;
	const ent = typeof body.entreprise_id === 'string' ? body.entreprise_id : null;
	return resolveOwner(lead, ent);
}

function resolveOwner(lead: string | null, ent: string | null): Owner | null {
	if (lead && ent) return null; // XOR : les deux fournis → ambigu
	if (lead && UUID_RE.test(lead)) return { kind: 'lead', id: lead };
	if (ent && UUID_RE.test(ent)) return { kind: 'entreprise', id: ent };
	return null;
}

/** Distance Haversine en mètres entre deux coords (lat/lng en degrés). */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 6371000;
	const toRad = (d: number) => (d * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const a =
		Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

/** Parse "Rue X 42, 1000 Lausanne" → { adresse, npa, localite }. Best-effort. */
export function parseSwissAddress(raw: string | null): {
	adresse: string | null;
	npa: string | null;
	localite: string | null;
} {
	if (!raw) return { adresse: null, npa: null, localite: null };
	const cleaned = raw.replace(/\s+/g, ' ').trim();
	const match = cleaned.match(/^(.+?)[,\s]+(\d{4})\s+([^\d].+)$/);
	if (match) {
		return {
			adresse: match[1].trim().replace(/[,\s]+$/, '') || null,
			npa: match[2],
			localite: match[3].trim(),
		};
	}
	return { adresse: cleaned, npa: null, localite: null };
}

export type GeoResult = { lat: number; lng: number; resolved: string };
export type GeoQueryFn = (query: string) => Promise<GeoResult | null>;

/**
 * Géocode une string via swisstopo geo.admin.ch SearchServer (CH-only, cadastre fédéral).
 * API officielle suisse, gratuite, sans clé, fair-use. Timeout 2.5s, `null` si échec.
 * Doc : https://api3.geo.admin.ch/services/sdiservices.html#search
 */
export async function swisstopoQuery(query: string): Promise<GeoResult | null> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 2500);
	try {
		const url = new URL('https://api3.geo.admin.ch/rest/services/api/SearchServer');
		url.searchParams.set('searchText', query);
		url.searchParams.set('type', 'locations');
		url.searchParams.set('limit', '1');
		url.searchParams.set('lang', 'fr');
		const resp = await fetch(url, {
			headers: { 'User-Agent': 'FilmPro-CRM/1.0 (contact@filmpro.ch)', Accept: 'application/json' },
			signal: controller.signal,
		});
		if (!resp.ok) return null;
		const data = (await resp.json()) as {
			results?: Array<{ attrs?: { lat?: number; lon?: number; label?: string } }>;
		};
		const first = data.results?.[0]?.attrs;
		if (!first || typeof first.lat !== 'number' || typeof first.lon !== 'number') return null;
		const resolved = (first.label ?? '').replace(/<\/?b>/g, '').trim();
		return { lat: first.lat, lng: first.lon, resolved: resolved || query };
	} catch {
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

/**
 * Géocode l'adresse parent via cascade : adresse complète → NPA+localité+canton → localité+canton.
 * Total timeout max ≈ 7.5s (3 tentatives × 2.5s), graceful degradation (`null` si tout échoue).
 * `queryFn` injectable pour les tests (par défaut `swisstopoQuery`).
 */
export async function geocodeAddress(
	parts: { adresse?: string | null; npa?: string | null; localite?: string | null; canton?: string | null },
	queryFn: GeoQueryFn = swisstopoQuery
): Promise<GeoResult | null> {
	const adresse = parts.adresse?.trim() || null;
	const npa = parts.npa?.trim() || null;
	const localite = parts.localite?.trim() || null;
	const canton = parts.canton?.trim() || null;

	if (adresse) {
		const fragments = [adresse, [npa, localite].filter(Boolean).join(' ').trim() || null, canton].filter(
			(s): s is string => !!s
		);
		const result = await queryFn(fragments.join(' '));
		if (result) return result;
	}
	if (npa && localite) {
		const result = await queryFn(`${npa} ${localite}${canton ? ' ' + canton : ''}`);
		if (result) return result;
	}
	if (localite) {
		const result = await queryFn(`${localite}${canton ? ' ' + canton : ''}`);
		if (result) return result;
	}
	return null;
}
