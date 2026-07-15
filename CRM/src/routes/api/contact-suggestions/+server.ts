import { json, type RequestEvent } from '@sveltejs/kit';
import { validate, ContactSuggestionCreateSchema } from '$lib/schemas';

/**
 * V3 mobile terrain — file de validation des contacts croisés sur place (ADR-0003).
 * Un brouillon crée TOUJOURS une ligne `contact_suggestions` (statut en_attente),
 * jamais une ligne `contacts` directe. La validation/fusion se fait au desktop via
 * /api/contact-suggestions/[id]/resolve. Isole le risque qualité hors du référentiel.
 */

const SUGGESTION_COLS =
	'id, entreprise_id, visit_id, prenom, nom, role_fonction, telephone, email, notes, statut, created_at, resolved_at';

function genericError(error: unknown, fallback: string, status = 500) {
	console.error('[contact-suggestions]', error);
	return json({ error: fallback }, { status });
}

/** Normalise une chaîne optionnelle : vide/espaces → null (cohérent avec les CHECK DB). */
function nn(v: unknown): string | null {
	return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

export const POST = async ({ request, locals }: RequestEvent) => {
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) return json({ error: 'Non authentifié' }, { status: 401 });

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'JSON invalide' }, { status: 400 });
	}

	const parsed = validate(ContactSuggestionCreateSchema, body);
	if (!parsed.success) return json({ error: parsed.error }, { status: 400 });
	const d = parsed.data;

	// Vérifier l'existence de l'entreprise (anti-énumération + FK safe), pattern projet.
	const { data: ent, error: entErr } = await locals.supabase
		.from('entreprises')
		.select('id')
		.eq('id', d.entreprise_id)
		.eq('marque', locals.marque)
		.maybeSingle();
	if (entErr) return genericError(entErr, 'Erreur recherche entreprise');
	if (!ent) return json({ error: 'Entreprise introuvable' }, { status: 404 });

	const insertRow = {
		entreprise_id: d.entreprise_id,
		visit_id: d.visit_id ?? null,
		prenom: nn(d.prenom),
		nom: nn(d.nom),
		role_fonction: nn(d.role_fonction),
		telephone: nn(d.telephone),
		email: nn(d.email),
		notes: nn(d.notes),
		created_by: user.id,
	};

	const { data: row, error: insErr } = await locals.supabase
		.from('contact_suggestions')
		.insert(insertRow)
		.select(SUGGESTION_COLS)
		.single();

	if (insErr || !row) {
		const code = (insErr as { code?: string } | null)?.code;
		if (code === '23503') return json({ error: 'Entreprise ou visite introuvable' }, { status: 400 });
		if (code === '23514') return json({ error: 'Données invalides' }, { status: 400 });
		return genericError(insErr ?? new Error('Insert null'), 'Erreur enregistrement suggestion');
	}

	return json({ suggestion: row }, { status: 201 });
};

export const GET = async ({ url, locals }: RequestEvent) => {
	const { session } = await locals.safeGetSession();
	if (!session) return json({ error: 'Non authentifié' }, { status: 401 });

	const statutParam = url.searchParams.get('statut');
	const statut = ['en_attente', 'valide', 'rejete'].includes(statutParam ?? '') ? statutParam! : 'en_attente';

	const { data: rows, error } = await locals.supabase
		.from('contact_suggestions')
		.select(`${SUGGESTION_COLS}, entreprises(raison_sociale)`)
		.eq('statut', statut)
		.order('created_at', { ascending: false });
	if (error) return genericError(error, 'Erreur lecture suggestions');

	// Badge desktop = file active uniquement (toujours en_attente, indépendant du filtre).
	const { count, error: cErr } = await locals.supabase
		.from('contact_suggestions')
		.select('id', { count: 'exact', head: true })
		.eq('statut', 'en_attente');
	if (cErr) return genericError(cErr, 'Erreur comptage suggestions');

	return json({ suggestions: rows ?? [], count_en_attente: count ?? 0 });
};
