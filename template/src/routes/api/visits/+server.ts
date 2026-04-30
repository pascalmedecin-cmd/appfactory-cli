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

// Géocode l'adresse parent via Nominatim (OSM, gratuit, pas de clé).
// Timeout 3s, graceful degradation : retourne null si échec.
async function geocodeAddress(parts: {
	adresse?: string | null;
	npa?: string | null;
	localite?: string | null;
}): Promise<{ lat: number; lng: number; resolved: string } | null> {
	const fragments = [parts.adresse, parts.npa, parts.localite].filter((s): s is string => !!s && s.trim() !== '');
	if (fragments.length === 0) return null;
	const query = `${fragments.join(', ')}, Switzerland`;

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 3000);

	try {
		const url = new URL('https://nominatim.openstreetmap.org/search');
		url.searchParams.set('q', query);
		url.searchParams.set('format', 'json');
		url.searchParams.set('limit', '1');
		url.searchParams.set('countrycodes', 'ch');

		const resp = await fetch(url, {
			headers: {
				'User-Agent': 'FilmPro-CRM/1.0 (contact@filmpro.ch)',
				Accept: 'application/json',
			},
			signal: controller.signal,
		});
		if (!resp.ok) return null;
		const data = (await resp.json()) as Array<{ lat: string; lon: string; display_name: string }>;
		if (!data || data.length === 0) return null;
		const lat = Number(data[0].lat);
		const lng = Number(data[0].lon);
		if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
		return { lat, lng, resolved: data[0].display_name };
	} catch {
		return null;
	} finally {
		clearTimeout(timeout);
	}
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
	let parent: { id: string; adresse: string | null; npa: string | null; localite: string | null } | null = null;
	if (owner.kind === 'lead') {
		const { data, error } = await locals.supabase
			.from('prospect_leads')
			.select('id, adresse, npa, localite')
			.eq('id', owner.id)
			.maybeSingle();
		if (error) return genericError(error, 'Erreur recherche lead');
		if (data) parent = { id: data.id, adresse: data.adresse, npa: data.npa, localite: data.localite };
	} else {
		const { data, error } = await locals.supabase
			.from('entreprises')
			.select('id, adresse_siege')
			.eq('id', owner.id)
			.maybeSingle();
		if (error) return genericError(error, 'Erreur recherche entreprise');
		if (data) parent = { id: data.id, adresse: data.adresse_siege, npa: null, localite: null };
	}
	if (!parent) return json({ error: 'Parent introuvable' }, { status: 404 });

	// Géocodage best-effort (Nominatim, 3s timeout, échec → null silencieux).
	const geocoded = await geocodeAddress({
		adresse: parent.adresse,
		npa: parent.npa,
		localite: parent.localite,
	});
	const distance_from_zefix_m =
		geocoded != null ? Math.round(haversineMeters(lat, lng, geocoded.lat, geocoded.lng) * 10) / 10 : null;
	const address_resolved = geocoded?.resolved ?? null;

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

	return json({ visit: row }, { status: 201 });
};
