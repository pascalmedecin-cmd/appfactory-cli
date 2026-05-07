import { json, type RequestEvent } from '@sveltejs/kit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function genericError(error: unknown, fallback: string, status = 500) {
	console.error('[visits]', error);
	return json({ error: fallback }, { status });
}

export const DELETE = async ({ params, locals }: RequestEvent) => {
	const { session } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });

	const id = params.id;
	if (!id || !UUID_RE.test(id)) {
		return json({ error: 'Identifiant invalide' }, { status: 400 });
	}

	// RISQUE OUVERT documenté (identique F1 photos delete) :
	// Tout fondateur authentifié peut supprimer toute visite. Acceptable tant
	// que 3 fondateurs symétriques. À durcir avant 4e user non-fondateur.
	const { error } = await locals.supabase.from('prospect_visits').delete().eq('id', id);
	if (error) return genericError(error, 'Erreur suppression visite');

	return json({ ok: true });
};
