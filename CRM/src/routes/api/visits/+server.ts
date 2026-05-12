import { json, type RequestEvent } from '@sveltejs/kit';
// Audit 360 M-53 : helpers de géocodage / distance / parsing extraits dans un module testable.
import {
	geocodeAddress,
	haversineMeters,
	parseOwner,
	parseOwnerFromBody,
	parseSwissAddress,
} from './geo-helpers';

function genericError(error: unknown, fallback: string, status = 500) {
	console.error('[visits]', error);
	return json({ error: fallback }, { status });
}

export const GET = async ({ url, locals }: RequestEvent) => {
	const { session } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });

	const owner = parseOwner(url);
	if (!owner) return json({ error: 'lead_id ou entreprise_id requis (UUID)' }, { status: 400 });

	let parent_address_raw: string | null = null;
	if (owner.kind === 'lead') {
		const { data, error: parentErr } = await locals.supabase
			.from('prospect_leads')
			.select('id, adresse, npa, localite, canton')
			.eq('id', owner.id)
			.maybeSingle();
		if (parentErr) return genericError(parentErr, 'Erreur recherche parent');
		if (!data) return json({ error: 'Parent introuvable' }, { status: 404 });
		const fragments = [data.adresse, [data.npa, data.localite].filter(Boolean).join(' ').trim() || null, data.canton]
			.filter((s): s is string => !!s && s.trim() !== '');
		parent_address_raw = fragments.length > 0 ? fragments.join(', ') : null;
	} else {
		const { data, error: parentErr } = await locals.supabase
			.from('entreprises')
			.select('id, adresse_siege, canton')
			.eq('id', owner.id)
			.maybeSingle();
		if (parentErr) return genericError(parentErr, 'Erreur recherche parent');
		if (!data) return json({ error: 'Parent introuvable' }, { status: 404 });
		const fragments = [data.adresse_siege, data.canton]
			.filter((s): s is string => !!s && s.trim() !== '');
		parent_address_raw = fragments.length > 0 ? fragments.join(', ') : null;
	}

	const col = owner.kind === 'lead' ? 'prospect_lead_id' : 'entreprise_id';
	const { data: rows, error } = await locals.supabase
		.from('prospect_visits')
		.select('id, visited_at, lat, lng, accuracy_m, address_resolved, distance_from_zefix_m, user_id')
		.eq(col, owner.id)
		.order('visited_at', { ascending: false });

	if (error) return genericError(error, 'Erreur lecture visites');

	return json({ visits: rows ?? [], parent_address_raw });
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
