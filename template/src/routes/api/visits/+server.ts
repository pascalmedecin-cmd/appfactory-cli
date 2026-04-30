import { json, type RequestEvent } from '@sveltejs/kit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function genericError(error: unknown, fallback: string, status = 500) {
	console.error('[visits]', error);
	return json({ error: fallback }, { status });
}

type Owner = { kind: 'lead' | 'entreprise'; id: string };

function parseOwner(url: URL): Owner | null {
	const lead = url.searchParams.get('lead_id');
	const ent = url.searchParams.get('entreprise_id');
	if (lead && ent) return null;
	if (lead && UUID_RE.test(lead)) return { kind: 'lead', id: lead };
	if (ent && UUID_RE.test(ent)) return { kind: 'entreprise', id: ent };
	return null;
}

function parseOwnerFromBody(body: Record<string, unknown>): Owner | null {
	const lead = typeof body.lead_id === 'string' ? body.lead_id : null;
	const ent = typeof body.entreprise_id === 'string' ? body.entreprise_id : null;
	if (lead && ent) return null;
	if (lead && UUID_RE.test(lead)) return { kind: 'lead', id: lead };
	if (ent && UUID_RE.test(ent)) return { kind: 'entreprise', id: ent };
	return null;
}

// Distance Haversine en mètres entre deux coords (lat/lng en degrés).
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 6371000;
	const toRad = (d: number) => (d * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

// Géocode une string via swisstopo geo.admin.ch SearchServer (CH-only, source cadastre fédéral).
// API officielle suisse, gratuite, sans clé, fair-use. Timeout 2.5s, null si échec.
// Doc : https://api3.geo.admin.ch/services/sdiservices.html#search
async function swisstopoQuery(query: string): Promise<{ lat: number; lng: number; resolved: string } | null> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 2500);
	try {
		const url = new URL('https://api3.geo.admin.ch/rest/services/api/SearchServer');
		url.searchParams.set('searchText', query);
		url.searchParams.set('type', 'locations');
		url.searchParams.set('limit', '1');
		url.searchParams.set('lang', 'fr');
		const resp = await fetch(url, {
			headers: {
				'User-Agent': 'FilmPro-CRM/1.0 (contact@filmpro.ch)',
				Accept: 'application/json',
			},
			signal: controller.signal,
		});
		if (!resp.ok) return null;
		const data = (await resp.json()) as {
			results?: Array<{ attrs?: { lat?: number; lon?: number; label?: string } }>;
		};
		const first = data.results?.[0]?.attrs;
		if (!first || typeof first.lat !== 'number' || typeof first.lon !== 'number') return null;
		// Le label swisstopo embarque des balises <b>...</b> de mise en évidence, on les retire.
		const resolved = (first.label ?? '').replace(/<\/?b>/g, '').trim();
		return { lat: first.lat, lng: first.lon, resolved: resolved || query };
	} catch {
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

// Géocode l'adresse parent via swisstopo (CH-only, cadastre officiel).
// Stratégie cascade : adresse complète → fallback NPA+localité+canton → fallback localité+canton.
// Total timeout max ≈ 7.5s (3 tentatives × 2.5s), graceful degradation : null si tout échoue.
async function geocodeAddress(parts: {
	adresse?: string | null;
	npa?: string | null;
	localite?: string | null;
	canton?: string | null;
}): Promise<{ lat: number; lng: number; resolved: string } | null> {
	const adresse = parts.adresse?.trim() || null;
	const npa = parts.npa?.trim() || null;
	const localite = parts.localite?.trim() || null;
	const canton = parts.canton?.trim() || null;

	// Tentative 1 : adresse complète (si présente).
	if (adresse) {
		const fragments = [adresse, [npa, localite].filter(Boolean).join(' ').trim() || null, canton]
			.filter((s): s is string => !!s);
		const query = fragments.join(' ');
		const result = await swisstopoQuery(query);
		if (result) return result;
	}

	// Tentative 2 : NPA + localité + canton (sans rue précise).
	if (npa && localite) {
		const query = `${npa} ${localite}${canton ? ' ' + canton : ''}`;
		const result = await swisstopoQuery(query);
		if (result) return result;
	}

	// Tentative 3 : localité + canton (point d'ancrage approximatif au niveau ville).
	if (localite) {
		const query = `${localite}${canton ? ' ' + canton : ''}`;
		const result = await swisstopoQuery(query);
		if (result) return result;
	}

	return null;
}

// Parse "Rue X 42, 1000 Lausanne" → { street, npa, locality }. Best-effort.
function parseSwissAddress(raw: string | null): { adresse: string | null; npa: string | null; localite: string | null } {
	if (!raw) return { adresse: null, npa: null, localite: null };
	const cleaned = raw.replace(/\s+/g, ' ').trim();
	// Pattern : "..., 4digits Localité" ou "... 4digits Localité"
	const match = cleaned.match(/^(.+?)[,\s]+(\d{4})\s+([^\d].+)$/);
	if (match) {
		return {
			adresse: match[1].trim().replace(/[,\s]+$/, '') || null,
			npa: match[2],
			localite: match[3].trim(),
		};
	}
	// Pas de pattern NPA détecté : tout en adresse.
	return { adresse: cleaned, npa: null, localite: null };
}

export const GET = async ({ url, locals }: RequestEvent) => {
	const { session } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });

	const owner = parseOwner(url);
	if (!owner) return json({ error: 'lead_id ou entreprise_id requis (UUID)' }, { status: 400 });

	const parentTable = owner.kind === 'lead' ? 'prospect_leads' : 'entreprises';
	const { data: parent, error: parentErr } = await locals.supabase
		.from(parentTable)
		.select('id')
		.eq('id', owner.id)
		.maybeSingle();
	if (parentErr) return genericError(parentErr, 'Erreur recherche parent');
	if (!parent) return json({ error: 'Parent introuvable' }, { status: 404 });

	const col = owner.kind === 'lead' ? 'prospect_lead_id' : 'entreprise_id';
	const { data: rows, error } = await locals.supabase
		.from('prospect_visits')
		.select('id, visited_at, lat, lng, accuracy_m, address_resolved, distance_from_zefix_m, user_id')
		.eq(col, owner.id)
		.order('visited_at', { ascending: false });

	if (error) return genericError(error, 'Erreur lecture visites');

	return json({ visits: rows ?? [] });
};

export const POST = async ({ request, locals }: RequestEvent) => {
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) return json({ error: 'Non authentifié' }, { status: 401 });

	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		return json({ error: 'JSON invalide' }, { status: 400 });
	}

	const owner = parseOwnerFromBody(body);
	if (!owner) return json({ error: 'lead_id ou entreprise_id requis (UUID)' }, { status: 400 });

	const lat = Number(body.lat);
	const lng = Number(body.lng);
	if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
		return json({ error: 'lat invalide (-90..90)' }, { status: 400 });
	}
	if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
		return json({ error: 'lng invalide (-180..180)' }, { status: 400 });
	}
	const accuracyRaw = Number(body.accuracy_m);
	const accuracy_m = Number.isFinite(accuracyRaw) && accuracyRaw >= 0 && accuracyRaw < 100000 ? accuracyRaw : null;

	// Vérifier l'existence du parent + récupérer adresse pour géocodage.
	let parent: { id: string; adresse: string | null; npa: string | null; localite: string | null; canton: string | null } | null = null;
	if (owner.kind === 'lead') {
		const { data, error } = await locals.supabase
			.from('prospect_leads')
			.select('id, adresse, npa, localite, canton')
			.eq('id', owner.id)
			.maybeSingle();
		if (error) return genericError(error, 'Erreur recherche lead');
		if (data) parent = { id: data.id, adresse: data.adresse, npa: data.npa, localite: data.localite, canton: data.canton };
	} else {
		const { data, error } = await locals.supabase
			.from('entreprises')
			.select('id, adresse_siege, canton')
			.eq('id', owner.id)
			.maybeSingle();
		if (error) return genericError(error, 'Erreur recherche entreprise');
		if (data) {
			// adresse_siege legacy : champ unique style "Rue X 42, 1000 Lausanne". On parse.
			const parsed = parseSwissAddress(data.adresse_siege);
			parent = { id: data.id, adresse: parsed.adresse, npa: parsed.npa, localite: parsed.localite, canton: data.canton };
		}
	}
	if (!parent) return json({ error: 'Parent introuvable' }, { status: 404 });

	// Géocodage best-effort cascade (3 tentatives, 2.5s chacune, null si tout échoue).
	const geocoded = await geocodeAddress({
		adresse: parent.adresse,
		npa: parent.npa,
		localite: parent.localite,
		canton: parent.canton,
	});
	const distance_from_zefix_m =
		geocoded != null ? Math.round(haversineMeters(lat, lng, geocoded.lat, geocoded.lng) * 10) / 10 : null;
	const address_resolved = geocoded?.resolved ?? null;

	// Diagnostic non-sensible : permet de comprendre pourquoi address_resolved est null.
	const hasAnyAddress = !!(parent.adresse || parent.npa || parent.localite);
	const geocode_diag: string =
		geocoded != null
			? 'ok'
			: !hasAnyAddress
				? 'no_address_in_db'
				: 'geocoder_no_match';

	const col = owner.kind === 'lead' ? 'prospect_lead_id' : 'entreprise_id';
	const insertRow = {
		[col]: owner.id,
		user_id: user.id,
		lat,
		lng,
		accuracy_m,
		address_resolved,
		distance_from_zefix_m,
	};

	const { data: row, error: insErr } = await locals.supabase
		.from('prospect_visits')
		.insert(insertRow)
		.select('id, visited_at, lat, lng, accuracy_m, address_resolved, distance_from_zefix_m, user_id')
		.single();

	if (insErr || !row) return genericError(insErr ?? new Error('Insert null'), 'Erreur enregistrement visite');

	return json({ visit: row, geocode_diag }, { status: 201 });
};
