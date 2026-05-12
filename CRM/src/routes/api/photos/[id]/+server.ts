import { json, type RequestEvent } from '@sveltejs/kit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUCKET = 'prospect_photos';

export const DELETE = async ({ params, locals }: RequestEvent) => {
	const { session, user } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });

	const id = params.id;
	if (!id || !UUID_RE.test(id)) {
		return json({ error: 'id invalide' }, { status: 400 });
	}

	const { data: row, error: getErr } = await locals.supabase
		.from('prospect_photos')
		.select('id, storage_path, uploaded_by')
		.eq('id', id)
		.maybeSingle();

	if (getErr) {
		console.error('[photos.delete]', getErr);
		return json({ error: 'Erreur lecture photo' }, { status: 500 });
	}
	if (!row) return json({ error: 'Photo introuvable' }, { status: 404 });

	// Ownership-aware (audit 360 V3b L-04) : modèle de rôles plat — tous les utilisateurs
	// authentifiés sont fondateurs FilmPro (allowlist hooks.server.ts), donc la suppression
	// mutuelle est autorisée par design (S127 Q2 Pascal : tous voient/suppriment tout).
	// On trace toutefois quand un fondateur supprime la photo d'un autre. À DURCIR (refuser
	// si owner ≠ user et user non-admin) le jour où un 4e user non-fondateur est ajouté —
	// voir memory/feedback_rls_multitenant_durcissement_si_4_users.md (audit 360 L-03/L-04).
	if (row.uploaded_by && user && row.uploaded_by !== user.id) {
		console.info(`[photos.delete] fondateur ${user.id} supprime photo de ${row.uploaded_by} (id=${id})`);
	}
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
