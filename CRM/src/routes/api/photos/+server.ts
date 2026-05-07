import { json, type RequestEvent } from '@sveltejs/kit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUCKET = 'prospect_photos';
const SIGN_TTL_SECONDS = 60 * 60; // 1h

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'heic'] as const;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB côté serveur (cohérent avec compression client)

// Magic bytes : signatures réelles, contre MIME spoofing.
function detectImageType(bytes: Uint8Array): 'jpeg' | 'png' | 'webp' | 'heic' | null {
	if (bytes.length < 12) return null;
	if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
	if (
		bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
		bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
	) return 'png';
	if (
		bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
		bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
	) return 'webp';
	// HEIC : ftyp box at offset 4
	if (
		bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
	) {
		const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
		if (brand === 'heic' || brand === 'heix' || brand === 'mif1' || brand === 'msf1') return 'heic';
	}
	return null;
}

function genericError(error: unknown, fallback: string, status = 500) {
	console.error('[photos]', error);
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

export const GET = async ({ url, locals }: RequestEvent) => {
	const { session } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });

	const owner = parseOwner(url);
	if (!owner) return json({ error: 'lead_id ou entreprise_id requis (UUID)' }, { status: 400 });

	// Vérifier l'existence du parent (anti-énumération + FK safe)
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
		.from('prospect_photos')
		.select('id, storage_path, caption, uploaded_at, size_bytes, mime_type')
		.eq(col, owner.id)
		.order('uploaded_at', { ascending: false });

	if (error) return genericError(error, 'Erreur lecture photos');

	const paths = (rows ?? []).map((r) => r.storage_path);
	const signed: Record<string, string> = {};
	if (paths.length > 0) {
		const { data: urls, error: signErr } = await locals.supabase.storage
			.from(BUCKET)
			.createSignedUrls(paths, SIGN_TTL_SECONDS);
		if (signErr) return genericError(signErr, 'Erreur génération URLs');
		for (const u of urls ?? []) {
			if (u.path && u.signedUrl) signed[u.path] = u.signedUrl;
		}
	}

	return json({
		photos: (rows ?? []).map((r) => ({ ...r, url: signed[r.storage_path] ?? null })),
	});
};

export const POST = async ({ request, url, locals }: RequestEvent) => {
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) return json({ error: 'Non authentifié' }, { status: 401 });

	const owner = parseOwner(url);
	if (!owner) return json({ error: 'lead_id ou entreprise_id requis (UUID)' }, { status: 400 });

	// Vérifier l'existence du parent (anti-énumération + FK safe)
	const parentTable = owner.kind === 'lead' ? 'prospect_leads' : 'entreprises';
	const { data: parent, error: parentErr } = await locals.supabase
		.from(parentTable)
		.select('id')
		.eq('id', owner.id)
		.maybeSingle();
	if (parentErr) return genericError(parentErr, 'Erreur recherche parent');
	if (!parent) return json({ error: 'Parent introuvable' }, { status: 404 });

	const form = await request.formData();
	const file = form.get('file');
	const caption = (form.get('caption') as string | null) ?? null;

	if (!(file instanceof File)) {
		return json({ error: 'Fichier manquant (champ "file")' }, { status: 400 });
	}
	if (!ALLOWED_MIME.includes(file.type)) {
		return json({ error: 'Type fichier non supporté' }, { status: 400 });
	}
	if (file.size > MAX_BYTES) {
		return json({ error: 'Fichier trop lourd (max 5 Mo)' }, { status: 413 });
	}

	// Validation magic bytes (anti MIME spoofing)
	const headerBuf = await file.slice(0, 16).arrayBuffer();
	const detected = detectImageType(new Uint8Array(headerBuf));
	if (!detected) {
		return json({ error: 'Le fichier n\'est pas une image valide' }, { status: 400 });
	}
	const expectedType =
		detected === 'jpeg' ? 'image/jpeg' :
		detected === 'png' ? 'image/png' :
		detected === 'webp' ? 'image/webp' :
		'image/heic';
	if (expectedType !== file.type) {
		return json({ error: 'Incohérence type/contenu fichier' }, { status: 400 });
	}

	// Limite 10 photos par owner (cohérence client/serveur).
	const col = owner.kind === 'lead' ? 'prospect_lead_id' : 'entreprise_id';
	const { count, error: countErr } = await locals.supabase
		.from('prospect_photos')
		.select('id', { count: 'exact', head: true })
		.eq(col, owner.id);
	if (countErr) return genericError(countErr, 'Erreur compte photos');
	if ((count ?? 0) >= 10) {
		return json({ error: 'Limite de 10 photos atteinte pour cet élément' }, { status: 409 });
	}

	// Whitelist extension stricte (basée sur magic bytes détecté, pas sur file.name)
	const safeExt = detected === 'jpeg' ? 'jpg' : detected;
	if (!ALLOWED_EXT.includes(safeExt)) {
		return json({ error: 'Extension non autorisée' }, { status: 400 });
	}
	const folder = owner.kind === 'lead' ? 'leads' : 'entreprises';
	const path = `${folder}/${owner.id}/${crypto.randomUUID()}.${safeExt}`;

	const { error: upErr } = await locals.supabase.storage
		.from(BUCKET)
		.upload(path, file, { contentType: file.type, upsert: false });
	if (upErr) return genericError(upErr, 'Upload échoué');

	const insertRow = {
		[col]: owner.id,
		storage_path: path,
		caption,
		uploaded_by: user.id,
		size_bytes: file.size,
		mime_type: file.type,
	};
	const { data: row, error: insErr } = await locals.supabase
		.from('prospect_photos')
		.insert(insertRow)
		.select('id, storage_path, caption, uploaded_at, size_bytes, mime_type')
		.single();

	if (insErr || !row) {
		// Cleanup storage si insert DB échoue
		const { error: cleanupErr } = await locals.supabase.storage.from(BUCKET).remove([path]);
		if (cleanupErr) {
			console.error('[photos] Cleanup orphelin échoué', { path, cleanupErr });
		}
		return genericError(insErr ?? new Error('Insert DB null'), 'Erreur enregistrement photo');
	}

	const { data: signed } = await locals.supabase.storage
		.from(BUCKET)
		.createSignedUrl(path, SIGN_TTL_SECONDS);

	return json({ photo: { ...row, url: signed?.signedUrl ?? null } }, { status: 201 });
};
