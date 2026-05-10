import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

/**
 * Audit 360 V2b H-06 : recherche bornée d'entreprises pour autocomplete frontend.
 *
 * Avant le fix : la page `/contacts` chargeait `SELECT id, raison_sociale,
 * site_web FROM entreprises ORDER BY raison_sociale` sans LIMIT au load,
 * puis filtrait côté client (~10K lignes possibles à terme = 500 KB payload,
 * 2-5s latence).
 *
 * Après le fix : ce endpoint accepte `?q=` (≥ 2 chars), exécute un ILIKE
 * prefix-bounded `q%` accéléré par index GIN trigram (migration 20260510_005),
 * et retourne max 20 résultats. Le frontend appelle ce endpoint au keystroke
 * (debounce ~250 ms) au lieu de pré-fetch full list.
 */

export type EntrepriseSearchResult = {
	id: string;
	raison_sociale: string;
	site_web: string | null;
};

const MIN_QUERY_LEN = 2;
const MAX_QUERY_LEN = 100;
const RESULT_LIMIT = 20;

// Caractères réservés ILIKE qui doivent être escapés pour ne pas être
// interprétés comme wildcards par l'utilisateur.
function escapeIlike(s: string): string {
	return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export const GET: RequestHandler = async ({ url, locals }) => {
	const q = (url.searchParams.get('q') ?? '').trim();

	if (q.length < MIN_QUERY_LEN) {
		return json({ results: [] satisfies EntrepriseSearchResult[] });
	}

	if (q.length > MAX_QUERY_LEN) {
		return json({ error: `Query trop longue (max ${MAX_QUERY_LEN})` }, { status: 400 });
	}

	const pattern = `${escapeIlike(q)}%`;

	const { data, error } = await locals.supabase
		.from('entreprises')
		.select('id, raison_sociale, site_web')
		.eq('statut_archive', false)
		.ilike('raison_sociale', pattern)
		.order('raison_sociale')
		.limit(RESULT_LIMIT);

	if (error) {
		console.error('[api/entreprises/search]', error.message);
		return json({ error: 'Erreur recherche entreprises' }, { status: 500 });
	}

	return json({ results: (data ?? []) satisfies EntrepriseSearchResult[] });
};
