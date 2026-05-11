import { json, type RequestEvent } from '@sveltejs/kit';
import {
	ALLOWED_MIME,
	MAX_PHOTO_BYTES,
	validatePhotoUpload
} from '$lib/server/photos/image-validate';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUCKET = 'prospect_photos';
const SIGN_TTL_SECONDS = 60 * 60; // 1h

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
		photos: (rows ?? []).map((r) => ({ ...r, url: signed[r.storage_path] ?? null }))
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
	if (file.size > MAX_PHOTO_BYTES) {
		return json({ error: 'Fichier trop lourd (max 5 Mo)' }, { status: 413 });
	}

	// Validation magic bytes + cohérence type/contenu + extension (anti MIME spoofing).
	const headerBuf = await file.slice(0, 16).arrayBuffer();
	const validated = validatePhotoUpload({
		type: file.type,
		size: file.size,
		headerBytes: new Uint8Array(headerBuf)
	});
	if (!validated.ok) {
		return json({ error: validated.error }, { status: validated.status });
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

	const folder = owner.kind === 'lead' ? 'leads' : 'entreprises';
	const path = `${folder}/${owner.id}/${crypto.randomUUID()}.${validated.ext}`;

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
		mime_type: file.type
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
