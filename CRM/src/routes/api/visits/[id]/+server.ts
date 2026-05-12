import { json, type RequestEvent } from '@sveltejs/kit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function genericError(error: unknown, fallback: string, status = 500) {
	console.error('[visits]', error);
	return json({ error: fallback }, { status });
}

export const DELETE = async ({ params, locals }: RequestEvent) => {
	const { session, user } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });

	const id = params.id;
	if (!id || !UUID_RE.test(id)) {
		return json({ error: 'Identifiant invalide' }, { status: 400 });
	}

	// Ownership-aware (audit 360 V3b L-04) : modèle de rôles plat — tous les utilisateurs
	// authentifiés sont fondateurs FilmPro (allowlist hooks.server.ts), suppression mutuelle
	// autorisée par design (S127 Q2 Pascal). On trace quand un fondateur supprime la visite
	// d'un autre. À DURCIR avant ajout d'un 4e user non-fondateur — voir
	// memory/feedback_rls_multitenant_durcissement_si_4_users.md (audit 360 L-03/L-04).
	const { data: row, error: getErr } = await locals.supabase
		.from('prospect_visits')
		.select('id, user_id')
		.eq('id', id)
		.maybeSingle();
	if (getErr) return genericError(getErr, 'Erreur lecture visite');
	if (!row) return json({ error: 'Visite introuvable' }, { status: 404 });
	if (row.user_id && user && row.user_id !== user.id) {
		console.info(`[visits.delete] fondateur ${user.id} supprime visite de ${row.user_id} (id=${id})`);
	}

	const { error } = await locals.supabase.from('prospect_visits').delete().eq('id', id);
	if (error) return genericError(error, 'Erreur suppression visite');

	return json({ ok: true });
};
