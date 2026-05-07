import { json, type RequestEvent } from '@sveltejs/kit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUCKET = 'prospect_photos';

export const DELETE = async ({ params, locals }: RequestEvent) => {
	const { session } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });

	const id = params.id;
	if (!id || !UUID_RE.test(id)) {
		return json({ error: 'id invalide' }, { status: 400 });
	}

	const { data: row, error: getErr } = await locals.supabase
		.from('prospect_photos')
		.select('id, storage_path')
		.eq('id', id)
		.maybeSingle();

	if (getErr) {
		console.error('[photos.delete]', getErr);
		return json({ error: 'Erreur lecture photo' }, { status: 500 });
	}
	if (!row) return json({ error: 'Photo introuvable' }, { status: 404 });

	// RISQUE OUVERT documenté : DELETE par tout fondateur authentifié, sans vérification
	// d'ownership user. Décision design validée 2026-04-30 (S127, Q2 Pascal : tous voient
	// tout, symétrie 3 fondateurs FilmPro). À durcir avant ajout d'un 4e user non-fondateur.
	const { error: delDbErr } = await locals.supabase
		.from('prospect_photos')
		.delete()
		.eq('id', id);
	if (delDbErr) {
		console.error('[photos.delete]', delDbErr);
		return json({ error: 'Erreur suppression photo' }, { status: 500 });
	}

	const { error: delStErr } = await locals.supabase.storage.from(BUCKET).remove([row.storage_path]);
	if (delStErr) {
		console.warn(`[photos.delete] Storage orphelin ${row.storage_path}: ${delStErr.message}`);
	}

	return json({ ok: true });
};
